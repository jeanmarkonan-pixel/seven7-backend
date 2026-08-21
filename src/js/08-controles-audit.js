// ============================================================
// ÉTAPE 2 — MOTEUR DE CONTRÔLES D'AUDIT
// ============================================================
var seuils = { signif:0, faible:0, planif:0, totalActifN:0 };
var tiersData = { fourn: [], clients: [] };
var impotsDeclares = {}; // conserve les montants déclarés saisis manuellement

// Comptes de régularisation (amortissements, dépréciations, provisions) : sens créditeur normal
// même s'ils sont rattachés à une classe d'actif -> exclus des anomalies de sens "actif"
var PREFIXES_CONTRA_ACTIF = ['28','29','39','49','59','098','099'];

function classeCompte(compte){ return String(compte||'')[0]; }

// ---------- 1. DÉTECTION DES ERREURS ----------
function isContraActif(compte){
    for(var i=0;i<PREFIXES_CONTRA_ACTIF.length;i++){
        if(String(compte).indexOf(PREFIXES_CONTRA_ACTIF[i]) === 0) return true;
    }
    return false;
}

// ============================================================
// BLOC 0 — CONTRÔLE BLOQUANT DE CONTINUITÉ DES SOLDES
// (Solde de clôture N-1 doit être identique au solde d'ouverture N)
// Référence : Art. 23 AUDCIF — principe de permanence des comptes.
// Comparaison DIRECTE : la balance N possède désormais ses propres
// colonnes "Ouverture Débit / Ouverture Crédit" (balance à 6 colonnes).
// Aucune reconstitution : Solde ouverture N (od-oc) doit être
// strictement égal au Solde clôture N-1 (sd-sc), compte par compte.
// ============================================================
// Comptes de bilan SYSCOHADA/PCG = classes 1 à 5 (capitaux, immobilisations,
// stocks, tiers, financiers). Les classes 6 (charges) et 7 (produits) sont des
// comptes de gestion : ils sont soldés par la détermination du résultat à la
// clôture de l'exercice et repartent à 0 à l'ouverture de l'exercice suivant.
// Ils n'ont donc JAMAIS de report à nouveau et ne doivent pas entrer dans ce
// contrôle de continuité (classes 8/9 = comptes spéciaux/analytiques, idem exclues).
function isCompteDeBilan(compte){
    var c = classeCompte(compte);
    return c==='1'||c==='2'||c==='3'||c==='4'||c==='5';
}

function controlerContinuiteSoldes(tolerance){
    tolerance = tolerance || 1;
    var rowsN1 = (balanceData.n1 || []).filter(function(r){ return isCompteDeBilan(r.compte); });
    var rowsN = (balanceData.n || []).filter(function(r){ return isCompteDeBilan(r.compte); });

    var mapN1 = {};
    rowsN1.forEach(function(r){
        var c = String(r.compte||'').trim();
        if(!c) return;
        mapN1[c] = (mapN1[c]||0) + (r.sd - r.sc);
    });
    var mapNOuverture = {};
    var libelles = {};
    rowsN.forEach(function(r){
        var c = String(r.compte||'').trim();
        if(!c) return;
        libelles[c] = r.intitule;
        mapNOuverture[c] = (mapNOuverture[c]||0) + ((r.od||0) - (r.oc||0));
    });

    var tousComptes = {};
    Object.keys(mapN1).forEach(function(c){ tousComptes[c]=1; });
    Object.keys(mapNOuverture).forEach(function(c){ tousComptes[c]=1; });

    var anomalies = [];
    Object.keys(tousComptes).forEach(function(c){
        var soldeN1 = mapN1[c] || 0;
        var soldeOuvN = mapNOuverture.hasOwnProperty(c) ? mapNOuverture[c] : null;
        var intitule = libelles[c] || '';
        if(soldeOuvN === null){
            if(Math.abs(soldeN1) > tolerance){
                anomalies.push({compte:c, intitule:intitule, soldeN1:soldeN1, soldeOuvN:0, ecart:-soldeN1, type:'Compte disparu : présent en clôture N-1 mais absent de la balance N (aucune ligne d\'ouverture saisie).'});
            }
            return;
        }
        var ecart = soldeOuvN - soldeN1;
        if(Math.abs(ecart) > tolerance){
            var inversion = soldeN1 !== 0 && soldeOuvN !== 0 && ((soldeN1>0)!==(soldeOuvN>0));
            anomalies.push({compte:c, intitule:intitule, soldeN1:soldeN1, soldeOuvN:soldeOuvN, ecart:ecart, type: inversion ? 'INVERSION DE SENS entre la clôture N-1 et l\'ouverture N saisie.' : 'Écart entre le solde de clôture N-1 et le solde d\'ouverture N saisi.'});
        }
    });
    anomalies.sort(function(a,b){ return Math.abs(b.ecart)-Math.abs(a.ecart); });

    return { conforme: anomalies.length===0, anomalies: anomalies };
}

// ============================================================
// BLOC 0bis — COHÉRENCE DES INTITULÉS DE COMPTES
// Détecte : (a) des comptes de codes différents portant le même intitulé
// (risque de doublon / compte scindé par erreur), et (b) un même compte
// dont l'intitulé diffère entre N et N-1 (renommage, faute de saisie) ou
// au sein d'une même balance (deux lignes du même compte, intitulés différents).
// ============================================================
function detecterAnomaliesIntitules(){
    var rowsN = balanceData.n || [];
    var rowsN1 = balanceData.n1 || [];
    var anomalies = [];

    function intitulesMultiplesParCompte(rows, label){
        var map = {}; // compte -> Set d'intitulés rencontrés
        rows.forEach(function(r){
            var c = String(r.compte||'').trim();
            var lib = (r.intitule||'').trim();
            if(!c || !lib) return;
            map[c] = map[c] || {};
            map[c][lib] = true;
        });
        Object.keys(map).forEach(function(c){
            var libs = Object.keys(map[c]);
            if(libs.length > 1){
                anomalies.push({compte:c, intitule:libs.join(' / '), type:'Un même compte porte plusieurs intitulés différents dans la balance '+label+' : "'+libs.join('" vs "')+'".'});
            }
        });
    }
    intitulesMultiplesParCompte(rowsN, 'N');
    intitulesMultiplesParCompte(rowsN1, 'N-1');

    function comptesDifferentsMemeIntitule(rows, label){
        var map = {}; // intitule -> Set de comptes
        rows.forEach(function(r){
            var c = String(r.compte||'').trim();
            var lib = (r.intitule||'').trim();
            if(!c || !lib) return;
            map[lib] = map[lib] || {};
            map[lib][c] = true;
        });
        Object.keys(map).forEach(function(lib){
            var comptes = Object.keys(map[lib]);
            if(comptes.length > 1){
                anomalies.push({compte:comptes.join(' / '), intitule:lib, type:'Le même intitulé "'+lib+'" est utilisé par plusieurs comptes différents dans la balance '+label+' (vérifier qu\'il ne s\'agit pas d\'un compte scindé ou dupliqué par erreur).'});
            }
        });
    }
    comptesDifferentsMemeIntitule(rowsN, 'N');
    comptesDifferentsMemeIntitule(rowsN1, 'N-1');

    // Même compte, intitulé différent entre N et N-1 (comparaison croisée)
    var libN = {}, libN1 = {};
    rowsN.forEach(function(r){ var c=String(r.compte||'').trim(); if(c && r.intitule) libN[c]=(r.intitule||'').trim(); });
    rowsN1.forEach(function(r){ var c=String(r.compte||'').trim(); if(c && r.intitule) libN1[c]=(r.intitule||'').trim(); });
    Object.keys(libN).forEach(function(c){
        if(libN1.hasOwnProperty(c) && libN1[c] && libN[c] && libN1[c] !== libN[c]){
            anomalies.push({compte:c, intitule:libN[c]+' / '+libN1[c], type:'Intitulé différent pour le même compte entre N ("'+libN[c]+'") et N-1 ("'+libN1[c]+'").'});
        }
    });

    return anomalies;
}

// ============================================================
// BLOC 0ter — NUMÉROTATION HÉTÉROGÈNE
// Un même compte écrit avec un nombre de zéros de fin différent
// donne deux numéros distincts. Les totaux de la liasse restent
// justes — le rattachement aux postes se fait par préfixe, qui
// capte les deux écritures — mais tout ce qui travaille compte par
// compte se trompe :
//   · le rapprochement N / N-1 échoue, produisant un faux « compte
//     nouveau » (T5) et un faux « compte disparu » (T7) ;
//   · la revue des variations (§5) compare des soldes sans rapport.
//
// Observé sur la balance N-1 de MTTCI : 6745000 / 67450000, et
// 647800000 / 64780000.
// ============================================================
function normaliserZerosFin(compte){
    var m = String(compte === undefined || compte === null ? '' : compte).trim().match(/^\d+/);
    if(!m) return null;
    var d = m[0].replace(/0+$/, '');
    return d === '' ? '0' : d;
}

function detecterNumerotationHeterogene(){
    var anomalies = [];
    var lib = {};
    ['n', 'n1'].forEach(function(ex){
        (balanceData[ex] || []).forEach(function(r){
            lib[String(r.compte || '').trim()] = (r.intitule || '').trim();
        });
    });

    // (a) collision au sein d'une même balance
    ['n', 'n1'].forEach(function(ex){
        var groupes = {};
        (balanceData[ex] || []).forEach(function(r){
            var k = normaliserZerosFin(r.compte);
            if(k === null) return;
            var c = String(r.compte || '').trim();
            (groupes[k] = groupes[k] || {})[c] = true;
        });
        Object.keys(groupes).forEach(function(k){
            var variantes = Object.keys(groupes[k]);
            if(variantes.length < 2) return;
            anomalies.push({
                compte: variantes.join(' / '),
                intitule: variantes.map(function(c){ return lib[c] || ''; }).join(' / '),
                type: 'Le même compte est écrit de deux façons dans la balance ' +
                      (ex === 'n' ? 'N' : 'N-1') + ' (zéros de fin différents) : leurs soldes sont ' +
                      'comptés séparément dans la revue des variations, alors que la liasse les ' +
                      'agrège. Harmoniser la numérotation à l’export.'
            });
        });
    });

    // (b) même compte, écriture différente entre N et N-1
    var parCleN = {}, parCleN1 = {};
    (balanceData.n  || []).forEach(function(r){ var k = normaliserZerosFin(r.compte); if(k !== null) (parCleN[k]  = parCleN[k]  || {})[String(r.compte).trim()] = true; });
    (balanceData.n1 || []).forEach(function(r){ var k = normaliserZerosFin(r.compte); if(k !== null) (parCleN1[k] = parCleN1[k] || {})[String(r.compte).trim()] = true; });
    Object.keys(parCleN).forEach(function(k){
        if(!parCleN1[k]) return;
        var enN = Object.keys(parCleN[k]), enN1 = Object.keys(parCleN1[k]);
        var communs = enN.filter(function(c){ return parCleN1[k][c]; });
        if(communs.length) return;   // au moins une écriture identique : rapprochement possible
        anomalies.push({
            compte: enN.join(' / ') + ' (N) vs ' + enN1.join(' / ') + ' (N-1)',
            intitule: (lib[enN[0]] || '') + ' / ' + (lib[enN1[0]] || ''),
            type: 'Le même compte est numéroté différemment en N et en N-1 (zéros de fin) : ' +
                  'le rapprochement échoue et produit un faux « compte nouveau » et un faux ' +
                  '« compte disparu ». Harmoniser la numérotation à l’export.'
        });
    });

    return anomalies;
}

// ============================================================
// BLOC 0quater — COMPTES NON RATTACHÉS À UN POSTE DE LIASSE
//
// paramResolve() ignore silencieusement tout compte qu'aucun poste ne
// revendique : son montant n'atteint ni le bilan, ni le résultat, ni
// le TFT. Le reste du moteur reste interne cohérent — détail et total
// continuent de s'accorder — mais le bilan ne recoupe plus la balance
// réelle, sans qu'aucun message ne le dise.
//
// Cas réel qui a révélé le trou : une balance 2025 dont le total
// actif ressortait à 2 662 152 560 contre un total passif de
// 2 728 121 651, écart de 65 969 091. Trois comptes hors référentiel
// en étaient la cause exacte — 239800 « installations en cours »
// (2 500 000), 606100/606110/606300/606800 « fournitures non
// stockables » sous une numérotation propre au client (864 660), et
// surtout 999999 « profits/pertes non distribués » (62 604 431), un
// compte de purge généré par le logiciel comptable du client, sans
// existence en SYSCOHADA. Les trois exclus expliquaient l'écart au
// franc près.
//
// Le principe reste la DÉTECTION, jamais la correction automatique :
// c'est à l'auditeur de dire à quel poste rattacher un compte que le
// référentiel ne connaît pas, pas à l'outil de le deviner.
// ============================================================
function detecterComptesNonRattaches(){
    var out = { n: [], n1: [] };
    ['n', 'n1'].forEach(function(ex){
        var vus = {};
        (balanceData[ex] || []).forEach(function(r){
            var c = String(r.compte || '').trim();
            if(!c || vus[c]) return;
            vus[c] = 1;
            if(paramResolve(r.compte, r.sd, r.sc)) return;   // rattaché : rien à signaler
            var solde = (parseNum(r.sd) || 0) - (parseNum(r.sc) || 0);
            if(Math.abs(solde) < 1) return;                  // compte soldé : sans incidence
            out[ex].push({ compte:c, intitule:(r.intitule || '').trim(), solde:solde });
        });
        out[ex].sort(function(a, b){ return Math.abs(b.solde) - Math.abs(a.solde); });
    });
    return out;
}

function renderComptesNonRattaches(){
    var det = detecterComptesNonRattaches();
    var banner = document.getElementById('detection-nonrattaches-banner');
    var table = document.getElementById('detection-nonrattaches-table');
    if(!banner || !table) return det.n.length === 0 && det.n1.length === 0;

    var total = det.n.length + det.n1.length;
    var sommeN  = det.n.reduce(function(s, r){ return s + Math.abs(r.solde); }, 0);
    var sommeN1 = det.n1.reduce(function(s, r){ return s + Math.abs(r.solde); }, 0);

    if(total === 0){
        banner.innerHTML = '<div class="alert" style="background:#d4edda;color:#155724;border:1px solid #27ae60;padding:10px;border-radius:6px;margin-bottom:10px;">✓ Tous les comptes des deux balances sont rattachés à un poste de la liasse.</div>';
        setHtml('detection-nonrattaches-table', '<tr><td colspan="4" style="text-align:center;color:#27ae60;">✓ Aucun compte orphelin</td></tr>');
        return true;
    }

    banner.innerHTML = '<div class="alert" style="background:#f8d7da;color:#721c24;border:1px solid #c0392b;padding:10px;border-radius:6px;margin-bottom:10px;">'
        + '⚠ BLOQUANT — ' + total + ' compte(s) au solde non nul ne correspondent à aucun poste de la liasse SYSCOHADA '
        + '(' + fmt(sommeN + sommeN1) + ' FCFA au total). Leur montant est absent du bilan, du résultat et du TFT : '
        + 'les totaux affichés ne recoupent PAS la balance réelle tant que ce point n\'est pas résolu. '
        + 'Rattachez chaque compte à son poste — plan comptable non standard, sous-compte trop spécifique, '
        + 'ou compte de purge généré par un autre logiciel.</div>';

    var html = '<tr><th>Exercice</th><th>Compte</th><th>Intitulé</th><th>Solde</th></tr>';
    ['n', 'n1'].forEach(function(ex){
        det[ex].forEach(function(r){
            html += '<tr><td>' + (ex === 'n' ? 'N' : 'N-1') + '</td><td>' + esc(r.compte) + '</td>'
                  + '<td>' + esc(r.intitule) + '</td><td class="number status-danger">' + fmt(r.solde) + '</td></tr>';
        });
    });
    setHtml('detection-nonrattaches-table', html);
    return false;
}

function renderContinuite(){
    var result = controlerContinuiteSoldes();
    var banner = document.getElementById('detection-continuite-banner');
    var blocsSuivants = document.getElementById('detection-blocs-suivants');
    var html = '<tr><th>Compte</th><th>Intitulé</th><th>Solde clôture N-1</th><th>Solde ouverture N (saisi)</th><th>Écart</th><th>Anomalie</th></tr>';

    if(result.conforme){
        banner.innerHTML = '<div class="alert" style="background:#d4edda;color:#155724;border:1px solid #27ae60;padding:10px;border-radius:6px;margin-bottom:10px;">✓ CONTINUITÉ CONFORME (comptes de bilan, classes 1 à 5) — Les soldes d\'ouverture N correspondent exactement aux soldes de clôture N-1. Les comptes de gestion (classes 6 et 7) sont exclus de ce contrôle car ils n\'ont pas de report à nouveau. Les contrôles ci-dessous peuvent être exploités.</div>';
        html += '<tr><td colspan="6" style="text-align:center;color:#27ae60;">✓ Aucune anomalie de continuité détectée</td></tr>';
        if(blocsSuivants) blocsSuivants.style.display = '';
    } else {
        banner.innerHTML = '<div class="alert" style="background:#f8d7da;color:#721c24;border:1px solid #c0392b;padding:10px;border-radius:6px;margin-bottom:10px;">⚠ BLOQUANT — '+result.anomalies.length+' anomalie(s) de continuité détectée(s) sur les comptes de bilan (classes 1 à 5 uniquement — les classes 6/7 sont hors périmètre). CORRIGER LES À-NOUVEAUX AVANT TOUTE AUTRE ANALYSE : les contrôles d\'équilibre, anomalies de sens et variations ci-dessous sont désactivés tant que ce point n\'est pas résolu, car ils partiraient d\'une base faussée.</div>';
        result.anomalies.forEach(function(a){
            html += '<tr><td>'+esc(a.compte)+'</td><td>'+esc(a.intitule)+'</td><td class="number">'+fmt(a.soldeN1)+'</td><td class="number">'+fmt(a.soldeOuvN)+'</td><td class="number status-danger">'+fmt(a.ecart)+'</td><td class="status-danger">'+esc(a.type)+'</td></tr>';
        });
        if(blocsSuivants) blocsSuivants.style.display = 'none';
    }
    setHtml('detection-continuite-table', html);

    // Contrôle de cohérence des intitulés (indépendant du blocage de continuité,
    // car il porte sur la qualité des données, pas sur l'équilibre des soldes)
    var anomIntitules = detecterAnomaliesIntitules().concat(detecterNumerotationHeterogene());
    var htmlInt = '<tr><th>Compte(s)</th><th>Intitulé(s)</th><th>Anomalie</th></tr>';
    if(anomIntitules.length===0){
        htmlInt += '<tr><td colspan="3" style="text-align:center;color:#27ae60;">✓ Aucune incohérence d\'intitulé ni de numérotation détectée</td></tr>';
    } else {
        anomIntitules.forEach(function(a){
            htmlInt += '<tr><td>'+esc(a.compte)+'</td><td>'+esc(a.intitule)+'</td><td class="status-danger">'+esc(a.type)+'</td></tr>';
        });
    }
    setHtml('detection-intitules-table', htmlInt);

    return result.conforme;
}

function runDetection(){
    var continuiteOk = renderContinuite();
    var rattachesOk = renderComptesNonRattaches();
    try{ runCycles(); }catch(e){ console.error('runCycles', e); }
    try{ runCyclesVariations(); }catch(e){ console.error('runCyclesVariations', e); }
    if(!continuiteOk) return; // BLOQUANT : on n'exécute pas les contrôles suivants tant que la continuité n'est pas résolue
    if(!rattachesOk) return;  // BLOQUANT : un bilan calculé sur des comptes orphelins ne recoupe pas la balance

    var rows = balanceData.n || [];
    var rowsN1 = balanceData.n1 || [];

    // --- Bloc 1 : contrôles d'équilibre ---
    var totMd=0, totMc=0, totSd=0, totSc=0;
    rows.forEach(function(r){ totMd+=r.md; totMc+=r.mc; totSd+=r.sd; totSc+=r.sc; });
    var eqMouv = Math.abs(totMd-totMc) < 1;
    var eqSoldes = Math.abs(totSd-totSc) < 1;
    var actifN = computeBilanActif('n');
    var passifN = computeBilanPassif('n', computeResultat('n').XI);
    var eqBilan = Math.abs(actifN.total - passifN.total) < 1;

    var htmlEq = '<tr><th>Contrôle</th><th>Résultat</th><th>Statut</th></tr>';
    htmlEq += '<tr><td>Équilibre des mouvements (Débit = Crédit) — Balance N</td><td class="number">'+fmt(totMd)+' / '+fmt(totMc)+'</td><td class="'+(eqMouv?'status-ok':'status-danger')+'">'+(eqMouv?'✓ Équilibré':'⚠ Déséquilibré ('+fmt(totMd-totMc)+')')+'</td></tr>';
    htmlEq += '<tr><td>Équilibre des soldes (SD = SC) — Balance N</td><td class="number">'+fmt(totSd)+' / '+fmt(totSc)+'</td><td class="'+(eqSoldes?'status-ok':'status-danger')+'">'+(eqSoldes?'✓ Équilibré':'⚠ Déséquilibré ('+fmt(totSd-totSc)+')')+'</td></tr>';
    htmlEq += '<tr><td>Équilibre du Bilan (Actif = Passif)</td><td class="number">'+fmt(actifN.total)+' / '+fmt(passifN.total)+'</td><td class="'+(eqBilan?'status-ok':'status-danger')+'">'+(eqBilan?'✓ Équilibré':'⚠ Déséquilibré ('+fmt(actifN.total-passifN.total)+')')+'</td></tr>';
    setHtml('detection-equilibre-table', htmlEq);
    var statutGlobal = (eqMouv && eqSoldes && eqBilan);
    setText('det-statut-global', statutGlobal ? 'CONFORME' : 'À REVOIR');

    // --- Bloc 2 : anomalies de sens ---
    var seuilAnomalie = Math.max(seuils.faible, 1);
    setText('det-seuil-anomalie', fmt(seuilAnomalie));
    var anomalies = [];
    rows.forEach(function(r){
        var c = classeCompte(r.compte);
        var anomalie = '';
        if(isContraActif(r.compte)) return; // comptes de régularisation exclus
        if((c==='2'||c==='3'||c==='5') && r.sc > seuilAnomalie && r.sd <= r.sc){
            anomalie = 'Compte normalement débiteur (classe '+c+') présentant un solde créditeur';
        } else if(c==='6' && r.sc > seuilAnomalie && r.sd <= r.sc){
            anomalie = 'Compte de charge présentant un solde créditeur anormal';
        } else if(c==='7' && r.sd > seuilAnomalie && r.sc <= r.sd){
            anomalie = 'Compte de produit présentant un solde débiteur anormal';
        } else if(c==='1' && r.sd > seuilAnomalie && r.sc <= r.sd && String(r.compte).indexOf('19')!==0){
            anomalie = 'Compte de capitaux propres présentant un solde débiteur anormal';
        } else if(c==='8'){
            var attenduHAO = expectedSensPCG(r.compte);
            if(attenduHAO === 'D' && r.sc > seuilAnomalie && r.sd <= r.sc){
                anomalie = 'Compte de charge HAO présentant un solde créditeur anormal';
            } else if(attenduHAO === 'C' && r.sd > seuilAnomalie && r.sc <= r.sd){
                anomalie = 'Compte de produit HAO présentant un solde débiteur anormal';
            }
        }
        if(anomalie){ anomalies.push({compte:r.compte, intitule:r.intitule, sd:r.sd, sc:r.sc, anomalie:anomalie}); }
    });
    var htmlSens = '<tr><th>Compte</th><th>Intitulé</th><th>SD</th><th>SC</th><th>Anomalie détectée</th></tr>';
    if(anomalies.length===0){ htmlSens += '<tr><td colspan="5" style="text-align:center;color:#27ae60;">✓ Aucune anomalie de sens détectée au-dessus du seuil</td></tr>'; }
    anomalies.forEach(function(a){
        htmlSens += '<tr><td>'+esc(a.compte)+'</td><td>'+esc(a.intitule)+'</td><td class="number">'+fmt(a.sd)+'</td><td class="number">'+fmt(a.sc)+'</td><td class="status-danger">'+esc(a.anomalie)+'</td></tr>';
    });
    setHtml('detection-sens-table', htmlSens);
    setText('det-nb-sens', anomalies.length);

    // --- Bloc 3 : variations anormales N / N-1 ---
    var seuilVarPct = parseNum(document.getElementById('det-seuil-var').value) || 20;
    var mapN1 = {};
    rowsN1.forEach(function(r){ mapN1[String(r.compte).trim()] = r; });
    var variations = [];
    rows.forEach(function(r){
        var soldeN = r.sd - r.sc;
        var r1 = mapN1[String(r.compte).trim()];
        var soldeN1 = r1 ? (r1.sd - r1.sc) : 0;
        var variation = soldeN - soldeN1;
        if(Math.abs(variation) < seuils.faible) return; // ignorer les petites variations
        var pct = soldeN1 !== 0 ? (variation/Math.abs(soldeN1))*100 : (soldeN !== 0 ? 100 : 0);
        if(Math.abs(pct) >= seuilVarPct){
            variations.push({compte:r.compte, intitule:r.intitule, soldeN:soldeN, soldeN1:soldeN1, variation:variation, pct:pct});
        }
    });
    variations.sort(function(a,b){ return Math.abs(b.variation)-Math.abs(a.variation); });
    var htmlVar = '<tr><th>Compte</th><th>Intitulé</th><th>Solde N</th><th>Solde N-1</th><th>Variation</th><th>Variation %</th></tr>';
    if(variations.length===0){ htmlVar += '<tr><td colspan="6" style="text-align:center;color:#27ae60;">✓ Aucune variation anormale au-dessus du seuil</td></tr>'; }
    variations.forEach(function(v){
        htmlVar += '<tr><td>'+esc(v.compte)+'</td><td>'+esc(v.intitule)+'</td><td class="number">'+fmt(v.soldeN)+'</td><td class="number">'+fmt(v.soldeN1)+'</td><td class="number status-danger">'+fmt(v.variation)+'</td><td class="number status-danger">'+v.pct.toFixed(1)+'%</td></tr>';
    });
    setHtml('detection-variation-table', htmlVar);
    setText('det-nb-var', variations.length);

    var badge = document.getElementById('status-detection');
    if(badge){ badge.textContent = statutGlobal && anomalies.length===0 && variations.length===0 ? 'OK' : (anomalies.length+variations.length)+' point(s)'; badge.className = statutGlobal && anomalies.length===0 && variations.length===0 ? 'badge badge-success' : 'badge badge-warning'; }
}

// ---------- 2. REVUE ANALYTIQUE ----------
function revueRow(lib, n, n1, seuilPct){
    var variation = n - n1;
    var pct = n1 !== 0 ? (variation/Math.abs(n1))*100 : (n!==0?100:0);
    var alerte = Math.abs(pct) >= seuilPct;
    return '<tr'+(alerte?' class="risk-high"':'')+'><td>'+esc(lib)+'</td><td class="number">'+fmt(n)+'</td><td class="number">'+fmt(n1)+'</td><td class="number">'+fmt(variation)+'</td><td class="number">'+pct.toFixed(1)+'%</td><td>'+(alerte?'⚠ À examiner':'')+'</td></tr>';
}

function fillRevueRow(tr, lib, n, n1, seuilPct){
    var variation = n - n1;
    var pct = n1 !== 0 ? (variation/Math.abs(n1))*100 : (n!==0?100:0);
    var alerte = Math.abs(pct) >= seuilPct;
    tr.classList.toggle('risk-high', alerte);
    var setCell = function(cls, val){ var el = tr.querySelector('.'+cls); if(el) el.textContent = val; };
    setCell('rv-n', fmt(n));
    setCell('rv-n1', fmt(n1));
    setCell('rv-var', fmt(variation));
    setCell('rv-pct', pct.toFixed(1)+'%');
    setCell('rv-alerte', alerte ? '⚠ À examiner' : '');
}
function revueCustomRowHTML(){
    return '<tr data-revue-custom="1">'
        + '<td><input type="text" placeholder="Rubrique" onchange="runRevueAnalytique()"></td>'
        + '<td><input type="number" class="rv-custom-n" onchange="runRevueAnalytique()"></td>'
        + '<td><input type="number" class="rv-custom-n1" onchange="runRevueAnalytique()"></td>'
        + '<td class="number rv-var"></td><td class="number rv-pct"></td><td class="rv-alerte"></td>'
        + '<td><button class="btn btn-danger" onclick="deleteRow(this); runRevueAnalytique();">✕</button></td>'
        + '</tr>';
}
function addRevueBilanRow(){
    var table = document.getElementById('revue-bilan-table');
    table.insertAdjacentHTML('beforeend', revueCustomRowHTML());
    runRevueAnalytique();
}

function runRevueAnalytique(){
    var seuilPct = parseNum(document.getElementById('rev-seuil').value) || 15;
    var actifN = computeBilanActif('n'), actifN1 = computeBilanActif('n1');
    var rN = computeResultat('n'), rN1 = computeResultat('n1');
    var passifN = computeBilanPassif('n', rN.XI), passifN1 = computeBilanPassif('n1', rN1.XI);

    function findLine(obj, poste){ var l = obj.lines.find(function(x){return x.poste===poste;}); return l ? l.net : 0; }

    var BILAN_VALUES = {
        ai: [findLine(actifN,'TOTAL ACTIF IMMOBILISÉ'), findLine(actifN1,'TOTAL ACTIF IMMOBILISÉ')],
        ac: [findLine(actifN,'TOTAL ACTIF CIRCULANT'), findLine(actifN1,'TOTAL ACTIF CIRCULANT')],
        ta: [findLine(actifN,'TOTAL TRÉSORERIE-ACTIF'), findLine(actifN1,'TOTAL TRÉSORERIE-ACTIF')],
        totalactif: [actifN.total, actifN1.total],
        cp: [findLine(passifN,'TOTAL CAPITAUX PROPRES'), findLine(passifN1,'TOTAL CAPITAUX PROPRES')],
        df: [findLine(passifN,'TOTAL DETTES FINANCIÈRES'), findLine(passifN1,'TOTAL DETTES FINANCIÈRES')],
        pc: [findLine(passifN,'TOTAL PASSIF CIRCULANT'), findLine(passifN1,'TOTAL PASSIF CIRCULANT')]
    };
    var bilanTable = document.getElementById('revue-bilan-table');
    Array.prototype.slice.call(bilanTable.rows).slice(1).forEach(function(tr){
        var key = tr.getAttribute('data-revue-key');
        if(key && BILAN_VALUES[key]){
            fillRevueRow(tr, '', BILAN_VALUES[key][0], BILAN_VALUES[key][1], seuilPct);
        } else if(tr.getAttribute('data-revue-custom')){
            var nEl = tr.querySelector('.rv-custom-n');
            var n1El = tr.querySelector('.rv-custom-n1');
            fillRevueRow(tr, '', parseNum(nEl?nEl.value:0), parseNum(n1El?n1El.value:0), seuilPct);
        }
    });

    var htmlR = '<tr><th>Rubrique</th><th>N</th><th>N-1</th><th>Variation</th><th>Variation %</th><th>Alerte</th></tr>';
    htmlR += revueRow('Chiffre d\'affaires (mémo)', rN.CA, rN1.CA, seuilPct);
    htmlR += revueRow('Marge commerciale', rN.XA, rN1.XA, seuilPct);
    htmlR += revueRow('Valeur ajoutée', rN.XC, rN1.XC, seuilPct);
    htmlR += revueRow('Excédent Brut d\'Exploitation (EBE)', rN.XD, rN1.XD, seuilPct);
    htmlR += revueRow('Résultat d\'exploitation', rN.XE, rN1.XE, seuilPct);
    htmlR += revueRow('Résultat financier', rN.XF, rN1.XF, seuilPct);
    htmlR += revueRow('Résultat net de l\'exercice', rN.XI, rN1.XI, seuilPct);
    setHtml('revue-resultat-table', htmlR);

    var pc = findLine(passifN,'TOTAL PASSIF CIRCULANT');
    var tp = findLine(passifN,'TOTAL TRÉSORERIE-PASSIF');
    var ac = findLine(actifN,'TOTAL ACTIF CIRCULANT');
    var ta = findLine(actifN,'TOTAL TRÉSORERIE-ACTIF');
    var liquidite = (pc+tp) !== 0 ? (ac+ta)/(pc+tp) : 0;
    var autonomie = passifN.total !== 0 ? (findLine(passifN,'TOTAL CAPITAUX PROPRES')/passifN.total)*100 : 0;
    var margeNette = rN.CA !== 0 ? (rN.XI/rN.CA)*100 : 0;
    setText('rev-ratio-liquidite', liquidite.toFixed(2));
    setText('rev-ratio-autonomie', autonomie.toFixed(1)+'%');
    setText('rev-ratio-marge', margeNette.toFixed(1)+'%');

    var badge = document.getElementById('status-revue');
    if(badge){ badge.textContent = 'Auto'; badge.className='badge badge-success'; }
}

// ---------- Seuils de planification modifiables ----------
// Seuls "signif" (seuil de signification global) reste librement surchargeable.
// "faible" et "planif" sont désormais calculés automatiquement à partir de taux (%) ajustables.
var seuilsOverride = { signif:null };
var SEUIL_PCT_SUGGERE = { bilan:4, ca:1, exploitation:5, capitaux:2, immobilise:3 };
function onSeuilAgregatChange(){
    var sel = document.getElementById('pl-seuil-agregat');
    var pctInput = document.getElementById('pl-seuil-pct');
    if(sel && pctInput && SEUIL_PCT_SUGGERE[sel.value] !== undefined){
        pctInput.value = SEUIL_PCT_SUGGERE[sel.value];
    }
    updateAllCalculations();
}
function setSeuilOverride(key, input){
    var v = parseNum(input.value);
    seuilsOverride[key] = v;
    seuils[key] = v;
    applyDerivedControls();
}
function resetSeuil(key){
    seuilsOverride[key] = null;
    updateAllCalculations();
}
function applyDerivedControls(){
    // Recalcule uniquement les contrôles qui dépendent des seuils, sans re-générer le Bilan/Résultat
    runDetection();
    recomputeImpots();
    computeAnormaux();
}

// ---------- 5. IMPÔTS ET TAXES ----------
var IMPOTS_ROWS = [
    {key:'tva-due', lib:"TVA due / facturée", comptes:"443*", fn:function(){ return SC('n','443')-SD('n','443'); }},
    {key:'tva-ded', lib:"TVA déductible / récupérable", comptes:"445*", fn:function(){ return SD('n','445')-SC('n','445'); }},
    {key:'is', lib:"Impôt sur les Bénéfices (IS)", comptes:"89* (résultat)", fn:function(){ return computeResultat('n').RS; }},
    {key:'cnps', lib:"Charges sociales (CNPS)", comptes:"431*", fn:function(){ return SC('n','431')-SD('n','431'); }},
    {key:'its', lib:"Impôt sur salaires (ITS/IGR)", comptes:"447*", fn:function(){ return SC('n','447')-SD('n','447'); }},
    {key:'patente', lib:"Patente et impôts et taxes divers", comptes:"64* hors 647", fn:function(){ return computeResultat('n').RI; }}
];
var IMPOTS_ROWS_MAP = {};
IMPOTS_ROWS.forEach(function(r){ IMPOTS_ROWS_MAP[r.key] = r; });

function impotRowHTML(){
    return '<tr data-impot-custom="1">'
        + '<td><input type="text" placeholder="Nature de l\'impôt" onchange="recomputeImpots()"></td>'
        + '<td><input type="text" placeholder="ex: 445" class="impot-comptes" onchange="recomputeImpots()"></td>'
        + '<td><select class="impot-sens" onchange="recomputeImpots()"><option value="sc-sd">Créditeur net (SC-SD)</option><option value="sd-sc">Débiteur net (SD-SC)</option></select></td>'
        + '<td class="calculated number impot-comptabilise">0</td>'
        + '<td><input type="number" class="editable number impot-declare" onchange="recomputeImpots()"></td>'
        + '<td class="calculated number impot-ecart"></td>'
        + '<td class="impot-statut"></td>'
        + '<td><button class="btn btn-danger" onclick="deleteRow(this); recomputeImpots();">✕</button></td>'
        + '</tr>';
}
function addImpotRow(){
    var table = document.getElementById('impots-table');
    table.insertAdjacentHTML('beforeend', impotRowHTML());
    recomputeImpots();
}
function recomputeImpots(){
    var table = document.getElementById('impots-table');
    if(!table) return;
    Array.prototype.slice.call(table.rows).slice(1).forEach(function(tr){
        var key = tr.getAttribute('data-impot-key');
        var comptabilise;
        if(key){
            var def = IMPOTS_ROWS_MAP[key];
            comptabilise = def ? def.fn() : 0;
        } else {
            var comptesEl = tr.querySelector('.impot-comptes');
            var sensEl = tr.querySelector('.impot-sens');
            var compte = comptesEl ? comptesEl.value.trim().replace(/[^0-9]/g,'') : '';
            var sens = sensEl ? sensEl.value : 'sc-sd';
            comptabilise = compte ? (sens === 'sd-sc' ? (SD('n',compte)-SC('n',compte)) : (SC('n',compte)-SD('n',compte))) : 0;
        }
        var declareEl = tr.querySelector('.impot-declare');
        var declareVal = declareEl ? declareEl.value : '';
        var declareNum = parseNum(declareVal);
        var ecart = declareVal === '' ? null : (comptabilise - declareNum);
        var compEl = tr.querySelector('.impot-comptabilise');
        if(compEl) compEl.textContent = fmt(comptabilise);
        var ecartEl = tr.querySelector('.impot-ecart');
        if(ecartEl) ecartEl.textContent = ecart===null ? '' : fmt(ecart);
        var statutEl = tr.querySelector('.impot-statut');
        if(statutEl){
            if(declareVal===''){ statutEl.innerHTML = '<span style="color:#888;">En attente de saisie</span>'; }
            else if(Math.abs(ecart) < Math.max(seuils.faible,1)){ statutEl.innerHTML = '<span class="status-ok">✓ Cohérent</span>'; }
            else { statutEl.innerHTML = '<span class="status-danger">⚠ À justifier</span>'; }
        }
    });
    var badge = document.getElementById('status-impots');
    if(badge){ badge.textContent = 'Auto'; badge.className='badge badge-success'; }
}

// ---------- 7 & 8. BALANCE TIERS FOURNISSEURS / CLIENTS ----------
function tiersRowHtml(type, row){
    row = row || {compte:'', intitule:'', sd:'', sc:''};
    return '<td><input type="text" class="editable" value="'+esc(row.compte)+'" onchange="recomputeTiersFromTable(\''+type+'\')"></td>'+
           '<td><input type="text" class="editable" value="'+esc(row.intitule)+'" onchange="recomputeTiersFromTable(\''+type+'\')"></td>'+
           '<td><input type="number" class="editable number" value="'+(row.sd||'')+'" onchange="recomputeTiersFromTable(\''+type+'\')"></td>'+
           '<td><input type="number" class="editable number" value="'+(row.sc||'')+'" onchange="recomputeTiersFromTable(\''+type+'\')"></td>'+
           '<td><button class="btn btn-danger" onclick="deleteRow(this)">✕</button></td>';
}
function renderTiersTable(type){
    var table = document.getElementById('table-tiers-'+type);
    var html = '<tr><th>N° Compte</th><th>Intitulé du tiers</th><th>Solde Débiteur (SD)</th><th>Solde Créditeur (SC)</th><th></th></tr>';
    (tiersData[type]||[]).forEach(function(row){
        html += '<tr>'+tiersRowHtml(type, row)+'</tr>';
    });
    table.innerHTML = html;
}
function addTiersRow(type){
    var table = document.getElementById('table-tiers-'+type);
    var tr = document.createElement('tr');
    tr.innerHTML = tiersRowHtml(type, null);
    table.appendChild(tr);
}
function recomputeTiersFromTable(type){
    var table = document.getElementById('table-tiers-'+type);
    var rows = [];
    var trs = table.querySelectorAll('tr');
    for(var i=1;i<trs.length;i++){
        var inputs = trs[i].querySelectorAll('input');
        if(inputs.length < 4) continue;
        var compte = inputs[0].value.trim();
        if(compte === '' && inputs[1].value.trim()==='') continue;
        rows.push({ compte: compte, intitule: inputs[1].value, sd: parseNum(inputs[2].value), sc: parseNum(inputs[3].value) });
    }
    tiersData[type] = rows;
    updateTiersStats(type);
    computeAnormaux();
    refreshCircSeuilCalc(type);
}
function updateTiersStats(type){
    var rows = tiersData[type]||[];
    var totSd=0, totSc=0;
    rows.forEach(function(r){ totSd+=r.sd; totSc+=r.sc; });
    if(type==='fourn'){
        setText('tf-nb', rows.length); setText('tf-total-sc', fmt(totSc)); setText('tf-total-sd', fmt(totSd));
        var badge = document.getElementById('status-tiers-fourn');
        if(badge && rows.length){ badge.textContent = rows.length+' tiers'; badge.className='badge badge-success'; }
    } else {
        setText('tc-nb', rows.length); setText('tc-total-sd', fmt(totSd)); setText('tc-total-sc', fmt(totSc));
        var badge2 = document.getElementById('status-tiers-clients');
        if(badge2 && rows.length){ badge2.textContent = rows.length+' tiers'; badge2.className='badge badge-success'; }
    }
}
function extraireTiers(type){
    var prefix = type === 'fourn' ? '40' : '41';
    var rows = (balanceData.n||[]).filter(function(r){ return String(r.compte||'').indexOf(prefix) === 0; });
    if(rows.length === 0){
        alert('Aucun compte '+prefix+'* trouvé dans la Balance N. Vérifiez que la Balance N est bien saisie.');
        return;
    }
    var map = {};
    (tiersData[type]||[]).forEach(function(r){ map[r.compte] = r; });
    rows.forEach(function(r){
        map[r.compte] = { compte: r.compte, intitule: r.intitule, sd: r.sd, sc: r.sc };
    });
    tiersData[type] = Object.keys(map).map(function(k){ return map[k]; });
    renderTiersTable(type);
    updateTiersStats(type);
    computeAnormaux();
    appliquerSeuilPctCirc(type);
}
function clearTiers(type){
    if(!confirm('Vider entièrement la balance tiers '+(type==='fourn'?'Fournisseurs':'Clients')+' ?')) return;
    tiersData[type] = [];
    renderTiersTable(type);
    updateTiersStats(type);
    computeAnormaux();
    refreshCircSeuilCalc(type);
}
function pasteTiers(type){
    var ta = document.getElementById('paste-tiers-'+type);
    var text = ta.value;
    if(!text.trim()) return;
    var lines = text.split(/\r?\n/).filter(function(l){ return l.trim() !== ''; });
    var map = {};
    (tiersData[type]||[]).forEach(function(r){ map[r.compte] = r; });
    lines.forEach(function(line){
        var parts = line.split('\t');
        if(parts.length < 2) parts = line.split(/ {2,}/);
        var compte = (parts[0]||'').trim();
        if(compte === '') return;
        map[compte] = { compte: compte, intitule: (parts[1]||'').trim(), sd: parseNum(parts[2]), sc: parseNum(parts[3]) };
    });
    tiersData[type] = Object.keys(map).map(function(k){ return map[k]; });
    ta.value = '';
    renderTiersTable(type);
    updateTiersStats(type);
    computeAnormaux();
    appliquerSeuilPctCirc(type);
}

// ---------- INDEMNITE DE RETRAITE ----------
function indemniteRowHTML(nom, nbAnnee, sAnnuel){
    return '<tr>'
        + '<td><input type="text" value="'+(nom||'').replace(/"/g,'&quot;')+'" onchange="recomputeIndemniteRetraite()"></td>'
        + '<td><input type="number" step="0.01" value="'+(nbAnnee||0)+'" onchange="recomputeIndemniteRetraite()"></td>'
        + '<td><input type="number" value="'+(sAnnuel||0)+'" onchange="recomputeIndemniteRetraite()"></td>'
        + '<td class="calculated ir-smm">0</td>'
        + '<td class="calculated ir-t1">0</td>'
        + '<td class="calculated ir-t2">0</td>'
        + '<td class="calculated ir-t3">0</td>'
        + '<td class="calculated ir-total"><strong>0</strong></td>'
        + '<td><button class="btn btn-danger" onclick="deleteRow(this)">✕</button></td>'
        + '</tr>';
}
function addIndemniteRow(){
    var table = document.getElementById('table-indemnite-retraite');
    table.insertAdjacentHTML('beforeend', indemniteRowHTML('', '', ''));
    recomputeIndemniteRetraite();
}
function clearIndemniteRetraite(){
    if(!confirm('Vider entièrement le tableau Indemnité de Retraite ?')) return;
    var table = document.getElementById('table-indemnite-retraite');
    Array.prototype.slice.call(table.rows).slice(1).forEach(function(r){ r.remove(); });
    recomputeIndemniteRetraite();
}
function pasteIndemniteRetraite(){
    var ta = document.getElementById('paste-indemnite');
    var text = ta.value;
    if(!text.trim()) return;
    var table = document.getElementById('table-indemnite-retraite');
    var lines = text.split(/\r?\n/).filter(function(l){ return l.trim() !== ''; });
    lines.forEach(function(line){
        var parts = line.split('\t');
        if(parts.length < 2) parts = line.split(/ {2,}/);
        var nom = (parts[0]||'').trim();
        if(nom === '') return;
        table.insertAdjacentHTML('beforeend', indemniteRowHTML(nom, parseNum(parts[1]), parseNum(parts[2])));
    });
    ta.value = '';
    recomputeIndemniteRetraite();
}
function recomputeIndemniteRetraite(){
    var table = document.getElementById('table-indemnite-retraite');
    if(!table) return;
    var t1 = parseNum(document.getElementById('ir-taux1').value) / 100;
    var t2 = parseNum(document.getElementById('ir-taux2').value) / 100;
    var t3 = parseNum(document.getElementById('ir-taux3').value) / 100;
    var totalGeneral = 0;
    Array.prototype.slice.call(table.rows).slice(1).forEach(function(tr){
        var inputs = tr.querySelectorAll('input');
        var nbAnnee = parseNum(inputs[1].value);
        var sAnnuel = parseNum(inputs[2].value);
        var smm = sAnnuel / 12;
        var trancheA = nbAnnee >= 5 ? 5*smm*t1 : (nbAnnee > 1 ? nbAnnee*smm*t1 : 0);
        var trancheB = nbAnnee >= 10 ? 5*smm*t2 : (nbAnnee > 5 ? (nbAnnee-5)*smm*t2 : 0);
        var trancheC = nbAnnee > 10 ? (nbAnnee-10)*smm*t3 : 0;
        var total = trancheA + trancheB + trancheC;
        totalGeneral += total;
        tr.querySelector('.ir-smm').textContent = fmt(smm);
        tr.querySelector('.ir-t1').textContent = fmt(trancheA);
        tr.querySelector('.ir-t2').textContent = fmt(trancheB);
        tr.querySelector('.ir-t3').textContent = fmt(trancheC);
        tr.querySelector('.ir-total').innerHTML = '<strong>'+fmt(total)+'</strong>';
    });
    document.getElementById('ir-total-general').textContent = fmt(totalGeneral);
    var precedente = parseNum(document.getElementById('ir-indemnite-precedente').value);
    document.getElementById('ir-ecart').textContent = fmt(totalGeneral - precedente);

    var compteEl = document.getElementById('ir-compte-balance');
    var compte = compteEl ? compteEl.value.trim().replace(/[^0-9]/g,'') : '';
    var balanceN = compte ? (SC('n',compte)-SD('n',compte)) : 0;
    var ecartBalance = totalGeneral - balanceN;
    setText('ir-balance-n', fmt(balanceN));
    var ecartEl = document.getElementById('ir-ecart-balance');
    if(ecartEl){ ecartEl.textContent = fmt(ecartBalance); ecartEl.style.color = Math.abs(ecartBalance) > Math.max(seuils.faible,1) ? '#c0392b' : '#1e8449'; }
    var card = document.getElementById('ir-ecart-balance-card');
    if(card) card.style.background = Math.abs(ecartBalance) > Math.max(seuils.faible,1) ? '#fdecea' : '#eafaf1';

    updateStatus('indemnite-retraite');
}

// ---------- PROVISION POUR CONGES PAYES ----------
function congesRowHTML(nom, nbMois, sAnnuel, nonNational){
    return '<tr>'
        + '<td class="cp-numero"></td>'
        + '<td><input type="text" value="'+(nom||'').replace(/"/g,'&quot;')+'" onchange="recomputeCongesPayes()"></td>'
        + '<td><input type="number" step="0.01" min="0" max="12" value="'+(nbMois||0)+'" onchange="recomputeCongesPayes()"></td>'
        + '<td><input type="number" value="'+(sAnnuel||0)+'" onchange="recomputeCongesPayes()"></td>'
        + '<td style="text-align:center;"><input type="checkbox" '+(nonNational?'checked':'')+' onchange="recomputeCongesPayes()"></td>'
        + '<td class="calculated cp-smm">0</td>'
        + '<td class="calculated cp-njrs">0</td>'
        + '<td class="calculated cp-prov"><strong>0</strong></td>'
        + '<td class="calculated cp-its">0</td>'
        + '<td class="calculated cp-cnps">0</td>'
        + '<td><button class="btn btn-danger" onclick="deleteRow(this)">✕</button></td>'
        + '</tr>';
}
function addCongesRow(){
    var table = document.getElementById('table-conges-payes');
    table.insertAdjacentHTML('beforeend', congesRowHTML('', '', '', false));
    recomputeCongesPayes();
}
function clearCongesPayes(){
    if(!confirm('Vider entièrement le tableau Provision Congés Payés ?')) return;
    var table = document.getElementById('table-conges-payes');
    Array.prototype.slice.call(table.rows).slice(1).forEach(function(r){ r.remove(); });
    recomputeCongesPayes();
}
function pasteCongesPayes(){
    var ta = document.getElementById('paste-conges');
    var text = ta.value;
    if(!text.trim()) return;
    var table = document.getElementById('table-conges-payes');
    var lines = text.split(/\r?\n/).filter(function(l){ return l.trim() !== ''; });
    lines.forEach(function(line){
        var parts = line.split('\t');
        if(parts.length < 2) parts = line.split(/ {2,}/);
        var nom = (parts[0]||'').trim();
        if(nom === '') return;
        table.insertAdjacentHTML('beforeend', congesRowHTML(nom, parseNum(parts[1]), parseNum(parts[2]), false));
    });
    ta.value = '';
    recomputeCongesPayes();
}
function recomputeCongesPayes(){
    var table = document.getElementById('table-conges-payes');
    if(!table) return;
    var coeff = parseNum(document.getElementById('cp-coeff-jours').value);
    var tauxIts = parseNum(document.getElementById('cp-taux-its').value) / 100;
    var tauxCnps1 = parseNum(document.getElementById('cp-taux-cnps1').value) / 100;
    var tauxCnps2 = parseNum(document.getElementById('cp-taux-cnps2').value) / 100;
    var totalProv = 0, totalIts = 0, totalCnps = 0;
    var nnProv = 0, nnIts = 0, nnCnps = 0;
    var n = 0;
    Array.prototype.slice.call(table.rows).slice(1).forEach(function(tr){
        n++;
        tr.querySelector('.cp-numero').textContent = n;
        var inputs = tr.querySelectorAll('input[type="text"], input[type="number"]');
        var nbMois = parseNum(inputs[1].value);
        var sAnnuel = parseNum(inputs[2].value);
        var nonNational = tr.querySelector('input[type="checkbox"]').checked;
        var smm = sAnnuel / 12;
        var njrs = coeff * nbMois;
        var prov = njrs * smm / 30;
        var its = prov * tauxIts;
        var cnps = prov * tauxCnps1 + prov * tauxCnps2;
        totalProv += prov; totalIts += its; totalCnps += cnps;
        if(nonNational){ nnProv += prov; nnIts += its; nnCnps += cnps; }
        tr.querySelector('.cp-smm').textContent = fmt(smm);
        tr.querySelector('.cp-njrs').textContent = fmt(njrs);
        tr.querySelector('.cp-prov').innerHTML = '<strong>'+fmt(prov)+'</strong>';
        tr.querySelector('.cp-its').textContent = fmt(its);
        tr.querySelector('.cp-cnps').textContent = fmt(cnps);
    });
    document.getElementById('cp-total-prov').textContent = fmt(totalProv);
    document.getElementById('cp-total-its').textContent = fmt(totalIts);
    document.getElementById('cp-total-cnps').textContent = fmt(totalCnps);

    var natProvision = totalProv - nnProv;
    var natFiscale = totalIts - nnIts;
    var natSociale = totalCnps - nnCnps;
    var natTotal = natProvision + natFiscale + natSociale;
    document.getElementById('cp-nat-provision').textContent = fmt(natProvision);
    document.getElementById('cp-nat-fiscale').textContent = fmt(natFiscale);
    document.getElementById('cp-nat-sociale').textContent = fmt(natSociale);
    document.getElementById('cp-nat-total').innerHTML = '<strong>'+fmt(natTotal)+'</strong>';

    var nnTotal = nnProv + nnIts + nnCnps;
    document.getElementById('cp-nn-provision').textContent = fmt(nnProv);
    document.getElementById('cp-nn-fiscale').textContent = fmt(nnIts);
    document.getElementById('cp-nn-sociale').textContent = fmt(nnCnps);
    document.getElementById('cp-nn-total').innerHTML = '<strong>'+fmt(nnTotal)+'</strong>';

    document.getElementById('cp-total-general').textContent = fmt(natTotal + nnTotal);

    var compteEl = document.getElementById('cp-compte-balance');
    var compte = compteEl ? compteEl.value.trim().replace(/[^0-9]/g,'') : '';
    var balanceN = compte ? (SC('n',compte)-SD('n',compte)) : 0;
    var ecartBalance = totalProv - balanceN;
    setText('cp-balance-n', fmt(balanceN));
    var ecartEl = document.getElementById('cp-ecart-balance');
    if(ecartEl){ ecartEl.textContent = fmt(ecartBalance); ecartEl.style.color = Math.abs(ecartBalance) > Math.max(seuils.faible,1) ? '#c0392b' : '#1e8449'; }
    var card = document.getElementById('cp-ecart-balance-card');
    if(card) card.style.background = Math.abs(ecartBalance) > Math.max(seuils.faible,1) ? '#fdecea' : '#eafaf1';

    updateStatus('conges-payes');
}

// ---------- EXPORT / IMPORT CSV (génériques) ----------
function exportTableCSV(tableId, filename, headers){
    var table = document.getElementById(tableId);
    if(!table) return;
    var rows = Array.prototype.slice.call(table.rows).slice(1); // on ignore la ligne d'en-tête HTML, on utilise 'headers'
    var lines = [headers.map(function(h){ return '"'+String(h).replace(/"/g,'""')+'"'; }).join(',')];
    rows.forEach(function(tr){
        var cells = Array.prototype.slice.call(tr.cells).map(function(td){
            var val;
            var input = td.querySelector('input,select,textarea');
            if(input){
                if(input.type === 'checkbox') val = input.checked ? 'OUI' : 'NON';
                else val = input.value;
            } else if(td.querySelector('button')){
                val = '';
            } else {
                val = td.textContent.trim();
            }
            return '"'+String(val).replace(/"/g,'""')+'"';
        });
        lines.push(cells.join(','));
    });
    var csv = '\uFEFF' + lines.join('\r\n');
    var blob = new Blob([csv], {type:'text/csv;charset=utf-8;'});
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
}
function parseCSVLine(line){
    var result = [], cur = '', inQuotes = false;
    for(var i=0;i<line.length;i++){
        var c = line[i];
        if(inQuotes){
            if(c === '"'){ if(line[i+1] === '"'){ cur += '"'; i++; } else { inQuotes = false; } }
            else cur += c;
        } else {
            if(c === '"') inQuotes = true;
            else if(c === ','){ result.push(cur); cur = ''; }
            else cur += c;
        }
    }
    result.push(cur);
    return result;
}
function importIndemniteCSV(fileInput){
    var file = fileInput.files[0];
    if(!file) return;
    var reader = new FileReader();
    reader.onload = function(e){
        var lines = String(e.target.result).split(/\r?\n/).filter(function(l){ return l.trim() !== ''; });
        var table = document.getElementById('table-indemnite-retraite');
        lines.slice(1).forEach(function(line){
            var f = parseCSVLine(line);
            if(!f[0]) return;
            table.insertAdjacentHTML('beforeend', indemniteRowHTML(f[0], parseNum(f[1]), parseNum(f[2])));
        });
        recomputeIndemniteRetraite();
        fileInput.value = '';
    };
    reader.readAsText(file, 'UTF-8');
}
function importCongesCSV(fileInput){
    var file = fileInput.files[0];
    if(!file) return;
    var reader = new FileReader();
    reader.onload = function(e){
        var lines = String(e.target.result).split(/\r?\n/).filter(function(l){ return l.trim() !== ''; });
        var table = document.getElementById('table-conges-payes');
        lines.slice(1).forEach(function(line){
            var f = parseCSVLine(line);
            if(!f[1]) return;
            var nonNational = (f[4]||'').toUpperCase().trim() === 'OUI';
            table.insertAdjacentHTML('beforeend', congesRowHTML(f[1], parseNum(f[2]), parseNum(f[3]), nonNational));
        });
        recomputeCongesPayes();
        fileInput.value = '';
    };
    reader.readAsText(file, 'UTF-8');
}


// ---------- 9 & 10. CIRCULARISATION ----------
// Solde total du compte racine (40 - Fournisseurs / 41 - Clients), somme des soldes individuels
// de la Balance Tiers déjà extraite/saisie (tiersData), dans le sens normal du compte.
function getSoldeTotalTiers(type){
    var rows = tiersData[type]||[];
    var tot = 0;
    rows.forEach(function(r){ tot += type==='fourn' ? ((r.sc||0)-(r.sd||0)) : ((r.sd||0)-(r.sc||0)); });
    return tot;
}
// Recalcule et affiche le solde total du compte racine et le seuil calculé (% × solde total),
// comme établi dans le Contrôle GL (Sondage) — à appeler chaque fois que la Balance Tiers change.
function refreshCircSeuilCalc(type){
    var solde = getSoldeTotalTiers(type);
    var pctInput = document.getElementById('circ-pct-'+type);
    var pct = pctInput ? parseNum(pctInput.value, true) : 0;
    var seuilCalc = (pct/100) * solde;
    setText('circ-solde-total-'+type, fmt(solde));
    setText('circ-seuil-calc-'+type, fmt(seuilCalc));
    return seuilCalc;
}
// Reporte le seuil calculé (%) dans le champ "Seuil de sélection retenu (FCFA)" puis régénère la sélection.
function appliquerSeuilPctCirc(type){
    var seuilCalc = refreshCircSeuilCalc(type);
    var seuilInput = document.getElementById('circ-seuil-'+type);
    if(seuilInput) seuilInput.value = Math.round(seuilCalc);
    genererCirc(type);
}
function genererCirc(type){
    var seuilInput = document.getElementById('circ-seuil-'+type);
    var seuil = parseNum(seuilInput.value);
    if(!seuil){ seuil = seuils.faible; seuilInput.value = Math.round(seuil); }
    var table = document.getElementById('table-circ-'+type);
    var existants = {};
    table.querySelectorAll('tr').forEach(function(tr, idx){
        if(idx===0) return;
        var td0 = tr.querySelector('td');
        if(td0) existants[td0.textContent.trim()] = true;
    });
    var selection = (tiersData[type]||[]).filter(function(r){
        var solde = type==='fourn' ? (r.sc - r.sd) : (r.sd - r.sc);
        return Math.abs(solde) >= seuil;
    });
    selection.forEach(function(r){
        if(existants[r.compte]) return;
        var solde = type==='fourn' ? (r.sc - r.sd) : (r.sd - r.sc);
        var tr = document.createElement('tr');
        tr.innerHTML = '<td>'+esc(r.compte)+'</td><td>'+esc(r.intitule)+'</td><td class="number">'+fmt(solde)+'</td>'+
            '<td><input type="date" class="date-input" onchange="updateStatus(\'circ-'+type+'\')"></td>'+
            '<td><input type="date" class="date-input" onchange="updateStatus(\'circ-'+type+'\')"></td>'+
            '<td><select onchange="updateStatus(\'circ-'+type+'\')"><option>À envoyer</option><option>Envoyée</option><option>Réponse reçue conforme</option><option>Réponse reçue avec écart</option><option>Sans réponse</option></select></td>'+
            '<td><textarea onchange="updateStatus(\'circ-'+type+'\')"></textarea></td>'+
            '<td><button class="btn btn-danger" onclick="deleteRow(this)">✕</button></td>';
        table.appendChild(tr);
    });
    var badge = document.getElementById('status-circ-'+type);
    var nbRows = table.querySelectorAll('tr').length - 1;
    if(badge){ badge.textContent = nbRows+' sélectionné(s)'; badge.className = nbRows ? 'badge badge-success' : 'badge badge-danger'; }
}

// ---------- 11 & 12. ANORMAUX FOURNISSEURS / CLIENTS ----------
function computeAnormaux(){
    var seuilAnomalie = Math.max(seuils.faible*0.1, 1);
    var fournAnorm = (tiersData.fourn||[]).filter(function(r){ return r.sd > seuilAnomalie; });
    var htmlF = '<tr><th>Compte</th><th>Intitulé</th><th>Solde Débiteur anormal</th></tr>';
    if(fournAnorm.length===0){ htmlF += '<tr><td colspan="3" style="text-align:center;color:#27ae60;">✓ Aucun fournisseur anormalement débiteur</td></tr>'; }
    fournAnorm.forEach(function(r){ htmlF += '<tr><td>'+esc(r.compte)+'</td><td>'+esc(r.intitule)+'</td><td class="number status-danger">'+fmt(r.sd)+'</td></tr>'; });
    setHtml('anorm-fourn-table', htmlF);
    setText('af-nb', fournAnorm.length);
    var badgeF = document.getElementById('status-anorm-fourn');
    if(badgeF){ badgeF.textContent = fournAnorm.length ? fournAnorm.length+' détecté(s)' : 'Aucun'; badgeF.className = fournAnorm.length ? 'badge badge-danger' : 'badge badge-success'; }

    var clientsAnorm = (tiersData.clients||[]).filter(function(r){ return r.sc > seuilAnomalie; });
    var htmlC = '<tr><th>Compte</th><th>Intitulé</th><th>Solde Créditeur anormal</th></tr>';
    if(clientsAnorm.length===0){ htmlC += '<tr><td colspan="3" style="text-align:center;color:#27ae60;">✓ Aucun client anormalement créditeur</td></tr>'; }
    clientsAnorm.forEach(function(r){ htmlC += '<tr><td>'+esc(r.compte)+'</td><td>'+esc(r.intitule)+'</td><td class="number status-danger">'+fmt(r.sc)+'</td></tr>'; });
    setHtml('anorm-clients-table', htmlC);
    setText('ac-nb', clientsAnorm.length);
    var badgeC = document.getElementById('status-anorm-clients');
    if(badgeC){ badgeC.textContent = clientsAnorm.length ? clientsAnorm.length+' détecté(s)' : 'Aucun'; badgeC.className = clientsAnorm.length ? 'badge badge-danger' : 'badge badge-success'; }
}

function setHtml(id, html){ var el = document.getElementById(id); if(el) el.innerHTML = html; }
