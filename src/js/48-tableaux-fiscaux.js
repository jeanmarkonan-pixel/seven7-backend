/* ==================================================================
   SEVEN7 — TABLEAUX FISCAUX ET SOCIAUX MENSUELS (ONGLET l)

   Vient s'ajouter au tableau de rapprochement comptabilité/déclaré déjà
   présent dans l'onglet Impôts (IMPOTS_ROWS / recomputeImpots(), voir
   08-controles-audit.js) — celui-ci reste inchangé, il répond à une
   autre question (l'écart entre le compte et le déclaré).

   Structure alignée sur TABLEAU REVUE FISCALE ET SOCIALE.xlsx (fourni
   par le cabinet) : chaque tableau mensuel porte, sous les 12 mois, un
   pied à 4 lignes — TOTAL / Solde Initial / Règlement / Solde Final —
   qui suit la dette fiscale comme un compte : ce qui restait dû à
   l'ouverture, plus ce qui a été déclaré dans l'année, moins ce qui a
   été payé, égale ce qui reste dû (ou en crédit) à la clôture. Solde
   Final = Solde Initial + TOTAL − Règlement, colonne par colonne.

     tva              : MOIS, TVA_Collectee, TVA_Recuperable, TVA_Due, Credit_TVA
     impots_groupe_1  : MOIS, ITS, CE, TA, TFPC          (feuille "ITS(447)")
     impots_groupe_2  : MOIS, TSE, AIRSI, PPSI, BNC      (feuille "AUTRES IMPOTS MENSUELS")
     patente          : Tranche_1, Tranche_2, Declaration, Paiement, Comptabilite, Ecart
     cnps             : MOIS, RETRAITE, ACT, ASSM_PRES_F, CMU, CNPS
     cmu_isolee       : MOIS, CMU

   TVA_Due / Credit_TVA : solde mensuel = Collectée − Récupérable. Positif
   → TVA_Due, Credit_TVA à 0. Négatif → Credit_TVA (valeur absolue),
   TVA_Due à 0 — c'est le report de crédit, jamais les deux à la fois sur
   un même mois.

   Section « Crédit de TVA » (22/08, restructurée pour suivre fidèlement la
   feuille "TVA DUE-CREDIT TVA" du fichier) : tableau à 6 lignes (Totale
   déclaré / Totale récupéré / Solde = TD−TR / Solde Initial / Total
   Paiement / Solde Final = Solde Initial + Solde − Total Paiement),
   grisé et non saisissable si le SOLDE (indépendant du pied de la TVA
   mensuelle ci-dessus) est positif, ouvert à la saisie s'il est négatif.

   Feuille "ITS(6413,6414,6415)" du fichier : tableau à une seule ligne
   CE / TA / TFPC / TOTAL (calculé), distinct du suivi mensuel ITS(447)
   ci-dessus — les deux existent dans le fichier source, donc les deux
   sont reproduits ici (tf-its-annuel).

   IRVM et BIC (22/08) : les feuilles correspondantes du fichier fourni
   par le cabinet étaient vides (aucune colonne définie) — structure
   établie par recherche sur la pratique fiscale ivoirienne (DGI), pas
   recopiée d'un modèle existant :
     - IRVM (impôt sur le revenu des valeurs mobilières, retenue à la
       source sur dividendes/intérêts distribués, taux 15/10/2% selon le
       revenu) : versé TRIMESTRIELLEMENT, à rapprocher du compte 447
       (retenues à la source) sur la Balance Générale N.
     - BIC (impôt sur les bénéfices industriels et commerciaux) : versé
       en DEUX ACOMPTES provisionnels (20 juillet, 20 novembre, chacun
       1/3 de l'IS ou de l'IMF N-1) puis un solde de liquidation à la
       déclaration annuelle de résultat — à rapprocher du compte 4494
       (acomptes d'impôt sur les bénéfices) sur la Balance Générale N.
   ================================================================== */

var TF_MOIS = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];

var TF_TABLES = {
    impots_groupe_1: { id:'tf-groupe1', titre:'ITS(447)', cols:['ITS','CE','TA','TFPC'] },
    impots_groupe_2: { id:'tf-groupe2', titre:'Autres Impôts Mensuels', cols:['TSE','AIRSI','PPSI','BNC'] },
    cnps:            { id:'tf-cnps',    titre:'CNPS', cols:['RETRAITE','ACT','ASSM_PRES_F','CMU'], calc:'CNPS' },
    cmu_isolee:      { id:'tf-cmu',     titre:'CMU', cols:['CMU'] }
};

// Comptes SYSCOHADA associés à chaque colonne, demandés explicitement par le
// cabinet pour (a) extraire automatiquement le Solde Initial (ouverture,
// OD/OC) et (b) rapprocher annuellement le déclaré au comptabilisé (mouvement
// créditeur MC, ou débiteur MD selon la nature du compte). Impôts Groupe 2 et
// CMU restent en saisie manuelle : le cabinet n'a pas donné de comptes pour
// TSE/AIRSI/PPSI/BNC ni pour la CMU isolée — mieux vaut rester manuel que de
// deviner un compte, sur un sujet de fiabilité comptable.
var TF_COMPTES = {
    tva:             { TVA_Collectee:{compte:'443', sens:'SC'}, TVA_Recuperable:{compte:'445', sens:'SD'} },
    impots_groupe_1: { ITS:{compte:'4471', sens:'SC'}, CE:{compte:'4472', sens:'SC'}, TA:{compte:'4473', sens:'SC'}, TFPC:{compte:'4474', sens:'SC'} },
    cnps:            { CNPS:{compte:['4311','4312'], sens:'SC'} }
};
function tfComptesArr(compte){ return Array.isArray(compte) ? compte : [compte]; }
// Solde d'ouverture d'un compte (ou d'une liste de comptes), orienté selon sa
// nature (SC : créditeur = OC-OD ; SD : débiteur = OD-OC).
function tfSoldeOuverture(compte, sens){
    var od = 0, oc = 0;
    tfComptesArr(compte).forEach(function(c){ od += OD('n', c); oc += OC('n', c); });
    return sens === 'SC' ? (oc - od) : (od - oc);
}
// Mouvement de l'exercice (comptabilisé), orienté selon la nature du compte —
// sert de référence "Comptabilité" au rapprochement annuel déclaré/comptabilisé.
function tfMouvement(compte, sens){
    var md = 0, mc = 0;
    tfComptesArr(compte).forEach(function(c){ md += MD('n', c); mc += MC('n', c); });
    return sens === 'SC' ? mc : md;
}
function tfSoldesAutoDe(cle){
    var conf = TF_COMPTES[cle];
    if(!conf) return null;
    var out = {};
    Object.keys(conf).forEach(function(col){ out[col] = tfSoldeOuverture(conf[col].compte, conf[col].sens); });
    return out;
}
// TVA_Due / Credit_TVA n'ont pas de compte propre (calculés à partir de
// 443-445) : leur Solde Initial se déduit du même solde net d'ouverture,
// ventilé due/crédit exactement comme tfRecalculerTVA() ventile le mensuel.
function tfSoldesAutoTVA(){
    var collecteeInit = tfSoldeOuverture('443', 'SC');
    var recuperableInit = tfSoldeOuverture('445', 'SD');
    var net = collecteeInit - recuperableInit;
    return {
        TVA_Collectee: collecteeInit,
        TVA_Recuperable: recuperableInit,
        TVA_Due: net > 0 ? net : 0,
        Credit_TVA: net < 0 ? -net : 0
    };
}

// Rapprochement MENSUEL (Phase 2, 22/08) : seul le Grand Livre porte des
// écritures datées dans l'app (la balance N/N-1 est annuelle) — on y lit le
// mouvement du mois pour comparer au montant déclaré du même mois, sans
// ajouter de colonnes : la cellule déclarée elle-même se surligne et porte
// l'écart en infobulle quand elle diverge du Grand Livre.
function tfMouvementMensuel(compte, sens, moisIndex){
    var rows = (typeof grandLivreData !== 'undefined') ? grandLivreData : [];
    var md = 0, mc = 0;
    tfComptesArr(compte).forEach(function(cpt){
        var digits = String(cpt).replace('*', '');
        for(var i = 0; i < rows.length; i++){
            var r = rows[i];
            if(String(r.compte || '').trim().indexOf(digits) !== 0) continue;
            var mois = parseInt(String(r.date || '').slice(5, 7), 10) - 1;
            if(mois !== moisIndex) continue;
            md += parseNum(r.debit);
            mc += parseNum(r.credit);
        }
    });
    return sens === 'SC' ? mc : md;
}
// Applique le surlignage + l'infobulle sur chaque cellule mensuelle déclarée
// dont le compte est connu (TF_COMPTES) ; rend la liste des écarts non nuls
// {colonne, moisIndex, ecart} pour le pont vers l'onglet s (anScannerFiscal).
function tfRecalculerRapprochementMensuel(tableId, comptaConf){
    var table = document.getElementById(tableId);
    if(!table || !comptaConf) return [];
    var ecarts = [];
    Array.prototype.slice.call(table.querySelectorAll('tr[data-tf-mois]')).forEach(function(tr){
        var moisIndex = parseInt(tr.getAttribute('data-tf-mois'), 10);
        Object.keys(comptaConf).forEach(function(c){
            var conf = comptaConf[c];
            var el = tr.querySelector('[data-tf-col="' + c + '"]');
            if(!el || el.tagName !== 'INPUT') return; // colonnes calculées (Due/Crédit) exclues
            var declare = parseNum(el.value);
            var compta = tfMouvementMensuel(conf.compte, conf.sens, moisIndex);
            var ecart = declare - compta;
            if(ecart !== 0){
                el.style.background = '#fff3cd';
                el.title = 'Grand Livre (compte ' + tfComptesArr(conf.compte).join('/') + ') : ' + fmt(compta) + ' — écart de ' + fmt(ecart);
                ecarts.push({ col:c, mois:moisIndex, ecart:ecart });
            } else {
                el.style.background = '';
                el.title = '';
            }
        });
    });
    return ecarts;
}

function tfCol(nom){
    return nom.replace(/_/g, ' ');
}

/* ---------- Pied commun : TOTAL / Solde Initial / Règlement / Solde Final ----------
   Générique à tout tableau mensuel, quelle que soit sa liste de colonnes — TVA
   comprise, qui a deux colonnes calculées (Due, Crédit) au lieu d'une seule.
   soldesAuto (22/08) : {colonne: valeur} pour les colonnes dont le Solde Initial
   est extrait automatiquement de la balance d'ouverture (compte associé, voir
   TF_COMPTES) — rendu en lecture seule au lieu d'un champ de saisie, demande
   explicite du cabinet ("ne doit plus être saisie manuellement").
   compta (22/08) : {colonne: {compte, sens}} ajoute deux lignes Comptabilité /
   Écart, rapprochement annuel déclaré/comptabilisé avec alerte si écart ≠ 0. */
function tfRendrePied(cols, soldesAuto, compta){
    soldesAuto = soldesAuto || {};
    var td = function(attrs, contenu){ return '<td' + attrs + '>' + contenu + '</td>'; };
    var ligne = function(libelle, piedCle, editable, cls){
        var cells = cols.map(function(c){
            if(piedCle === 'si' && soldesAuto.hasOwnProperty(c)){
                return td(' class="calculated number" data-tf-pied="si" data-tf-col="' + c + '"'
                    + ' title="Extrait automatiquement de la balance d\'ouverture"', fmt(soldesAuto[c]));
            }
            // Les attributs data-tf-pied/data-tf-col ne vont QUE sur l'<input>, jamais
            // aussi sur le <td> qui l'enveloppe : un sélecteur qui les cible matchait
            // sinon le <td> en premier (ordre du document), jamais l'input lui-même.
            return editable
                ? td('', '<input type="number" class="editable number" data-tf-pied="'+piedCle+'" data-tf-col="'+c+'" onchange="tfRecalculerPied(this.closest(\'table\').id)">')
                : td(' class="calculated number" data-tf-pied="'+piedCle+'" data-tf-col="'+c+'"', '0');
        }).join('');
        return '<tr' + (cls ? ' class="'+cls+'"' : '') + '><td>' + libelle + '</td>' + cells + '</tr>';
    };
    var html = ligne('TOTAL', 'total', false, 'total-row')
         + ligne('Solde Initial', 'si', true)
         + ligne('Règlement', 'reg', true)
         + ligne('Solde Final', 'sf', false, 'total-row');
    if(compta){
        var cellsCompta = cols.map(function(c){
            return compta[c] ? td(' class="calculated number" data-tf-compta="montant" data-tf-col="'+c+'"', '0') : td('', '');
        }).join('');
        var cellsEcart = cols.map(function(c){
            return compta[c] ? td(' class="calculated number" data-tf-compta="ecart" data-tf-col="'+c+'"', '0') : td('', '');
        }).join('');
        html += '<tr><td>Comptabilité</td>' + cellsCompta + '</tr>';
        html += '<tr><td>Écart</td>' + cellsEcart + '</tr>';
    }
    return html;
}
// Recalcule TOTAL (somme des 12 lignes de mois) et Solde Final (Solde Initial +
// TOTAL − Règlement) pour chaque colonne suivie d'un tableau donné par son id.
function tfRecalculerPied(tableId){
    var table = document.getElementById(tableId);
    if(!table) return;
    var lignesMois = Array.prototype.slice.call(table.querySelectorAll('tr[data-tf-mois]'));
    var colonnes = {};
    table.querySelectorAll('[data-tf-pied="total"]').forEach(function(el){ colonnes[el.getAttribute('data-tf-col')] = true; });
    Object.keys(colonnes).forEach(function(c){
        var total = 0;
        lignesMois.forEach(function(tr){
            var el = tr.querySelector('[data-tf-col="' + c + '"]');
            if(!el) return;
            total += parseNum(el.value !== undefined && el.tagName === 'INPUT' ? el.value : el.textContent);
        });
        var totalEl = table.querySelector('[data-tf-pied="total"][data-tf-col="' + c + '"]');
        if(totalEl) totalEl.textContent = fmt(total);
        // Solde Initial : lecture double (champ saisi à la main OU cellule
        // calculée en lecture seule quand le compte associé est connu, voir
        // soldesAuto ci-dessus) — même principe que la lecture du mois.
        var siEl = table.querySelector('[data-tf-pied="si"][data-tf-col="' + c + '"]');
        var si = siEl ? parseNum(siEl.tagName === 'INPUT' ? siEl.value : siEl.textContent) : 0;
        var reg = parseNum((table.querySelector('[data-tf-pied="reg"][data-tf-col="' + c + '"]') || {}).value);
        var sfEl = table.querySelector('[data-tf-pied="sf"][data-tf-col="' + c + '"]');
        if(sfEl) sfEl.textContent = fmt(si + total - reg);
    });
}
// Rapprochement annuel Comptabilité/Écart (voir compta dans tfRendrePied) :
// Comptabilité = mouvement de l'exercice sur le(s) compte(s) associé(s) ;
// Écart = déclaré (TOTAL du pied) − Comptabilité ; alerte visuelle si ≠ 0.
// Rend {colonne: écart} pour les ponts (ex: onglet s, voir 49-centralisation-anomalies.js).
function tfRecalculerCompta(tableId, comptaConf){
    var table = document.getElementById(tableId);
    if(!table || !comptaConf) return {};
    var ecarts = {};
    Object.keys(comptaConf).forEach(function(c){
        var conf = comptaConf[c];
        var totalEl = table.querySelector('[data-tf-pied="total"][data-tf-col="' + c + '"]');
        var declare = totalEl ? parseNum(totalEl.textContent) : 0;
        var compta = tfMouvement(conf.compte, conf.sens);
        var ecart = declare - compta;
        ecarts[c] = ecart;
        var comptaEl = table.querySelector('[data-tf-compta="montant"][data-tf-col="' + c + '"]');
        if(comptaEl) comptaEl.textContent = fmt(compta);
        var ecartEl = table.querySelector('[data-tf-compta="ecart"][data-tf-col="' + c + '"]');
        if(ecartEl){
            ecartEl.textContent = fmt(ecart) + (ecart !== 0 ? ' 🟠' : '');
            ecartEl.style.background = ecart !== 0 ? '#fff3cd' : '';
            ecartEl.style.color = ecart !== 0 ? '#856404' : '';
        }
    });
    return ecarts;
}

/* ---------- Tableaux mensuels génériques (impots_groupe_1/2, cnps, cmu_isolee) ---------- */
function tfRendreTableGenerique(cle){
    var def = TF_TABLES[cle];
    var colsPied = def.cols.concat(def.calc ? [def.calc] : []);
    var entetes = '<th style="width:14%;">Mois</th>' + def.cols.map(function(c){ return '<th>' + esc(tfCol(c)) + '</th>'; }).join('')
        + (def.calc ? '<th>' + esc(tfCol(def.calc)) + '</th>' : '');
    var lignes = TF_MOIS.map(function(mois, i){
        var champs = def.cols.map(function(c){
            return '<td><input type="number" class="editable number" data-tf-col="' + c + '"'
                 + ' onchange="tfRecalculerLigne(\'' + cle + '\', this)"></td>';
        }).join('');
        return '<tr data-tf-mois="' + i + '"><td>' + esc(mois) + '</td>' + champs
             + (def.calc ? '<td class="calculated number" data-tf-col="' + def.calc + '">0</td>' : '')
             + '</tr>';
    }).join('');
    return '<div class="scroll-table"><table id="' + def.id + '"><tr>' + entetes + '</tr>' + lignes
         + tfRendrePied(colsPied, tfSoldesAutoDe(cle), TF_COMPTES[cle]) + '</table></div>';
}
function tfRecalculerLigne(cle, input){
    var def = TF_TABLES[cle];
    if(def.calc){
        var tr = input.closest('tr');
        var total = 0;
        def.cols.forEach(function(c){
            var el = tr.querySelector('[data-tf-col="' + c + '"]');
            total += parseNum(el ? el.value : 0);
        });
        var calcEl = tr.querySelector('[data-tf-col="' + def.calc + '"]');
        if(calcEl) calcEl.textContent = fmt(total);
    }
    tfRecalculerPied(def.id);
    tfRecalculerCompta(def.id, TF_COMPTES[cle]);
    tfRecalculerRapprochementMensuel(def.id, TF_COMPTES[cle]);
}

/* ---------- TVA (calcul du solde mensuel, report de crédit) ---------- */
function tfRendreTVA(){
    var lignes = TF_MOIS.map(function(mois, i){
        return '<tr data-tf-mois="' + i + '">'
            + '<td>' + esc(mois) + '</td>'
            + '<td><input type="number" class="editable number" data-tf-col="TVA_Collectee" onchange="tfRecalculerTVA()"></td>'
            + '<td><input type="number" class="editable number" data-tf-col="TVA_Recuperable" onchange="tfRecalculerTVA()"></td>'
            + '<td class="calculated number" data-tf-col="TVA_Due">0</td>'
            + '<td class="calculated number" data-tf-col="Credit_TVA">0</td>'
            + '</tr>';
    }).join('');
    return '<div class="scroll-table"><table id="tf-tva"><tr><th style="width:14%;">Mois</th>'
        + '<th>TVA collectée</th><th>TVA récupérable</th><th>TVA due</th><th>Crédit de TVA</th></tr>'
        + lignes + tfRendrePied(['TVA_Collectee','TVA_Recuperable','TVA_Due','Credit_TVA'], tfSoldesAutoTVA()) + '</table></div>';
}
function tfRecalculerTVA(){
    var table = document.getElementById('tf-tva');
    if(!table) return;
    var soldeAnnuel = 0;
    Array.prototype.slice.call(table.querySelectorAll('tr[data-tf-mois]')).forEach(function(tr){
        var collectee = parseNum((tr.querySelector('[data-tf-col="TVA_Collectee"]') || {}).value);
        var recuperable = parseNum((tr.querySelector('[data-tf-col="TVA_Recuperable"]') || {}).value);
        var solde = collectee - recuperable;
        soldeAnnuel += solde;
        var due = solde > 0 ? solde : 0;
        var credit = solde < 0 ? -solde : 0;
        var dueEl = tr.querySelector('[data-tf-col="TVA_Due"]');
        var creditEl = tr.querySelector('[data-tf-col="Credit_TVA"]');
        if(dueEl) dueEl.textContent = fmt(due);
        if(creditEl) creditEl.textContent = fmt(credit);
    });
    tfRecalculerPied('tf-tva');
    tfRecalculerRapprochementMensuel('tf-tva', TF_COMPTES.tva);
}

/* ---------- Crédit de TVA (feuille "TVA DUE-CREDIT TVA", 6 lignes, saisie
   indépendante du suivi mensuel ci-dessus — c'est le résumé annuel déclaré) ---------- */
function tfRendreCreditTVA(){
    var champ = function(id, libelle, calcule){
        return '<tr><td>' + libelle + '</td><td>'
            + (calcule
                ? '<span id="' + id + '" class="calculated number">0</span>'
                : '<input type="number" class="editable number" id="' + id + '" onchange="tfRecalculerCreditTVA()">')
            + '</td></tr>';
    };
    return '<div class="scroll-table"><table id="tf-credit-tva" style="max-width:480px;">'
        + champ('tf-ctva-declare', 'Totale déclaré', false)
        + champ('tf-ctva-recupere', 'Totale récupéré', false)
        + champ('tf-ctva-solde', 'Solde (Totale déclaré − Totale récupéré)', true)
        + champ('tf-ctva-si', 'Solde Initial (ouverture balance N, débit ou crédit)', false)
        + champ('tf-ctva-paiement', 'Total Paiement', false)
        + champ('tf-ctva-sf', 'Solde Final', true)
        + '</table></div>';
}
function tfRecalculerCreditTVA(){
    var declare = parseNum((document.getElementById('tf-ctva-declare') || {}).value);
    var recupere = parseNum((document.getElementById('tf-ctva-recupere') || {}).value);
    var si = parseNum((document.getElementById('tf-ctva-si') || {}).value);
    var paiement = parseNum((document.getElementById('tf-ctva-paiement') || {}).value);
    var solde = declare - recupere;
    var soldeEl = document.getElementById('tf-ctva-solde');
    if(soldeEl) soldeEl.textContent = fmt(solde);
    var sfEl = document.getElementById('tf-ctva-sf');
    if(sfEl) sfEl.textContent = fmt(si + solde - paiement);
    tfAppliquerCreditTVA(solde);
}
// Positif ou nul : l'entité est in fine redevable de TVA — Solde Initial / Total
// Paiement / Solde Final n'ont pas lieu d'être renseignés, ils sont grisés.
// Négatif : crédit à reporter, la suite du tableau s'ouvre à la saisie.
function tfAppliquerCreditTVA(solde){
    var section = document.getElementById('tf-credit-tva-section');
    var info = document.getElementById('tf-credit-tva-info');
    if(!section) return;
    var enCredit = solde < 0;
    section.classList.toggle('tf-section-grisee', !enCredit);
    ['tf-ctva-si', 'tf-ctva-paiement'].forEach(function(id){
        var el = document.getElementById(id);
        if(el) el.disabled = !enCredit;
    });
    if(info){
        info.textContent = enCredit
            ? 'Solde négatif (' + fmt(solde) + ') : l’entité est en position de crédit de TVA à reporter.'
            : 'Solde positif ou nul (' + fmt(solde) + ') : rien à reporter, section non applicable.';
    }
}

/* ---------- ITS annuel (feuille "ITS(6413,6414,6415)", ligne unique,
   distincte du suivi mensuel ITS(447) ci-dessus) ---------- */
function tfRendreITSAnnuel(){
    var cols = ['CE', 'TA', 'TFPC'];
    return '<div class="scroll-table"><table id="tf-its-annuel"><tr><th>CE</th><th>TA</th><th>TFPC</th><th>TOTAL</th></tr><tr>'
        + cols.map(function(c){
            return '<td><input type="number" class="editable number" data-tf-col="' + c + '" onchange="tfRecalculerITSAnnuel()"></td>';
        }).join('')
        + '<td class="calculated number" data-tf-col="TOTAL">0</td>'
        + '</tr></table></div>';
}
function tfRecalculerITSAnnuel(){
    var table = document.getElementById('tf-its-annuel');
    if(!table) return;
    var total = 0;
    ['CE', 'TA', 'TFPC'].forEach(function(c){
        total += parseNum((table.querySelector('[data-tf-col="' + c + '"]') || {}).value);
    });
    var el = table.querySelector('[data-tf-col="TOTAL"]');
    if(el) el.textContent = fmt(total);
}

/* ---------- IRVM : retenue trimestrielle sur dividendes/intérêts distribués,
   à rapprocher du compte 447 sur la Balance Générale N (voir recherche DGI
   en tête de fichier — feuille source vide, structure non recopiée). ---------- */
var TF_IRVM_PERIODES = ['1er trimestre', '2e trimestre', '3e trimestre', '4e trimestre'];
function tfRendreIRVM(){
    var lignes = TF_IRVM_PERIODES.map(function(periode, i){
        return '<tr data-tf-mois="' + i + '">'
            + '<td>' + esc(periode) + '</td>'
            + '<td><input type="number" class="editable number" data-tf-col="Base" onchange="tfRecalculerIRVM()"></td>'
            + '<td class="calculated number" data-tf-col="IRVM">0</td>'
            + '</tr>';
    }).join('');
    return '<div class="form-group" style="max-width:220px;"><label>Taux IRVM applicable (%)</label>'
        + '<input type="number" id="tf-irvm-taux" class="editable number" value="15" onchange="tfRecalculerIRVM()"></div>'
        + '<div class="scroll-table"><table id="tf-irvm"><tr><th style="width:22%;">Période</th>'
        + '<th>Base imposable (dividendes/intérêts distribués)</th><th>IRVM dû</th></tr>'
        + lignes + tfRendrePied(['Base', 'IRVM']) + '</table></div>';
}
function tfRecalculerIRVM(){
    var table = document.getElementById('tf-irvm');
    if(!table) return;
    var taux = parseNum((document.getElementById('tf-irvm-taux') || {}).value) || 0;
    Array.prototype.slice.call(table.querySelectorAll('tr[data-tf-mois]')).forEach(function(tr){
        var base = parseNum((tr.querySelector('[data-tf-col="Base"]') || {}).value);
        var el = tr.querySelector('[data-tf-col="IRVM"]');
        if(el) el.textContent = fmt(base * taux / 100);
    });
    tfRecalculerPied('tf-irvm');
}

/* ---------- BIC : deux acomptes provisionnels (20 juillet, 20 novembre,
   chacun 1/3 de l'IS/IMF N-1) puis solde de liquidation à la déclaration
   annuelle, à rapprocher du compte 4494 sur la Balance Générale N (voir
   recherche DGI en tête de fichier — feuille source vide). ---------- */
var TF_BIC_LIGNES = ['1er acompte (20 juillet)', '2e acompte (20 novembre)', 'Solde de liquidation (déclaration annuelle)'];
function tfRendreBIC(){
    var lignes = TF_BIC_LIGNES.map(function(libelle, i){
        return '<tr data-tf-mois="' + i + '">'
            + '<td>' + esc(libelle) + '</td>'
            + '<td><input type="number" class="editable number" data-tf-col="Montant" onchange="tfRecalculerPied(\'tf-bic\')"></td>'
            + '</tr>';
    }).join('');
    return '<div class="scroll-table"><table id="tf-bic"><tr><th style="width:55%;">Échéance</th>'
        + '<th>Montant versé</th></tr>'
        + lignes + tfRendrePied(['Montant']) + '</table></div>';
}

/* ---------- Patente (structure annuelle, pas mensuelle) ----------
   Comptabilite (22/08) : n'est plus saisie à la main, extraite automatiquement
   du débit du compte 6412 (Patentes, charge) — demande explicite du cabinet.
   Écart = Déclaration − Comptabilité (idem, formule imposée par le cabinet ;
   remplace l'ancien recoupement comptabilisé/tranches payées). */
function tfRendrePatente(){
    return '<div class="form-row">'
        + ['Tranche_1','Tranche_2','Declaration','Paiement'].map(function(c){
            return '<div class="form-group" style="max-width:200px;"><label>' + esc(tfCol(c)) + '</label>'
                 + '<input type="number" class="editable number" id="tf-patente-' + c + '" onchange="tfRecalculerPatente()"></div>';
        }).join('')
        + '<div class="form-group" style="max-width:200px;"><label>Comptabilité (compte 6412)</label>'
        + '<span id="tf-patente-Comptabilite" class="calculated number">0</span></div>'
        + '<div class="form-group" style="max-width:200px;"><label>Écart</label>'
        + '<span id="tf-patente-Ecart" class="calculated number">0</span></div>'
        + '</div>';
}
function tfRecalculerPatente(){
    var comptabilise = SD('n', '6412') - SC('n', '6412');
    var comptaEl = document.getElementById('tf-patente-Comptabilite');
    if(comptaEl) comptaEl.textContent = fmt(comptabilise);
    var declaration = parseNum((document.getElementById('tf-patente-Declaration') || {}).value);
    var ecart = declaration - comptabilise;
    var el = document.getElementById('tf-patente-Ecart');
    if(el){
        el.textContent = fmt(ecart) + (ecart !== 0 ? ' 🟠' : '');
        el.style.background = ecart !== 0 ? '#fff3cd' : '';
        el.style.color = ecart !== 0 ? '#856404' : '';
    }
}
// Utilisé par le moteur de centralisation des anomalies (onglet s) : rend
// l'écart de patente courant, 0 si rien n'est encore saisi.
function tfEcartPatente(){
    var declaration = parseNum((document.getElementById('tf-patente-Declaration') || {}).value);
    return declaration - (SD('n', '6412') - SC('n', '6412'));
}

/* ---------- Installation ---------- */
function tfInstaller(){
    if(document.getElementById('tf-tva')) return;
    var panneau = document.getElementById('impots');
    if(!panneau) return;
    var carte = document.createElement('div');
    carte.className = 'card';
    carte.setAttribute('data-tab', 'impots');
    carte.innerHTML =
      '<h2>📅 SUIVI MENSUEL DES DÉCLARATIONS (TVA, IMPÔTS, CNPS)</h2>'
    + '<div class="alert alert-info">Suivi déclaratif mois par mois, distinct du rapprochement comptes/déclaré '
    + 'ci-dessus. Chaque tableau porte un pied Total / Solde Initial / Règlement / Solde Final qui suit la dette '
    + 'fiscale comme un compte. La TVA due et le crédit de TVA se calculent automatiquement à partir des montants saisis. '
    + 'Quand le compte SYSCOHADA associé est connu (TVA, ITS/CE/TA/TFPC, Patente, CNPS), le Solde Initial est extrait '
    + 'automatiquement de la balance d\'ouverture, et une ligne Comptabilité/Écart compare le déclaré au comptabilisé '
    + '(alerte 🟠 si écart ≠ 0).</div>'
    + '<h3>TVA</h3>' + tfRendreTVA()
    + '<div id="tf-credit-tva-section" class="card" style="background:#f6f8fa; margin-top:14px;">'
    + '<h3>Crédit de TVA</h3>'
    + '<p id="tf-credit-tva-info" style="font-size:12px; color:#666; margin-bottom:8px;"></p>'
    + tfRendreCreditTVA()
    + '</div>'
    + '<h3 style="margin-top:22px;">ITS(447)</h3>' + tfRendreTableGenerique('impots_groupe_1')
    + '<h3 style="margin-top:22px;">ITS(6413,6414,6415)</h3>' + tfRendreITSAnnuel()
    + '<h3 style="margin-top:22px;">Autres Impôts Mensuels</h3>' + tfRendreTableGenerique('impots_groupe_2')
    + '<h3 style="margin-top:22px;">PATENTE(64;44)</h3>' + tfRendrePatente()
    + '<h3 style="margin-top:22px;">CNPS</h3>' + tfRendreTableGenerique('cnps')
    + '<h3 style="margin-top:22px;">CMU</h3>' + tfRendreTableGenerique('cmu_isolee')
    + '<h3 style="margin-top:22px;">IRVM</h3>'
    + '<div class="alert alert-info" style="font-size:12px;">Retenue trimestrielle sur dividendes/intérêts '
    + 'distribués — à rapprocher du compte 447 sur la Balance Générale N.</div>' + tfRendreIRVM()
    + '<h3 style="margin-top:22px;">BIC</h3>'
    + '<div class="alert alert-info" style="font-size:12px;">Deux acomptes provisionnels puis solde de liquidation '
    + '— à rapprocher du compte 4494 sur la Balance Générale N.</div>' + tfRendreBIC();
    panneau.appendChild(carte);
    tfRecalculerTVA();
    tfRecalculerCreditTVA();
    tfRecalculerPied('tf-groupe1');
    tfRecalculerCompta('tf-groupe1', TF_COMPTES.impots_groupe_1);
    tfRecalculerRapprochementMensuel('tf-groupe1', TF_COMPTES.impots_groupe_1);
    tfRecalculerITSAnnuel();
    tfRecalculerPied('tf-groupe2');
    tfRecalculerPatente();
    tfRecalculerPied('tf-cnps');
    tfRecalculerCompta('tf-cnps', TF_COMPTES.cnps);
    tfRecalculerPied('tf-cmu');
    tfRecalculerIRVM();
    tfRecalculerPied('tf-bic');
}

// Bug réel constaté en production (22/08) : sur certains chargements, l'appel
// automatique à tfInstaller() échouait silencieusement (l'erreur était avalée
// par un try/catch vide) et la section « Suivi mensuel des déclarations »
// n'apparaissait jamais — alors qu'un appel manuel de tfInstaller() depuis la
// console, plus tard, réussissait à chaque fois (tfInstaller() est idempotent,
// sa toute première ligne vérifie si tf-tva existe déjà). Plutôt que de
// deviner la cause exacte du mauvais ordre de chargement, on se protège des
// deux façons : l'erreur est désormais loguée au lieu d'être avalée, et une
// deuxième tentative a lieu à 'load' (après DOMContentLoaded, quand toutes
// les ressources ont fini de charger) au cas où la première échouerait encore.
function tfInstallerSecurise(){
    try{
        tfInstaller();
    }catch(e){
        console.error('SEVEN7 — l’installation des tableaux fiscaux (onglet Impôts) a échoué, nouvelle tentative au prochain chargement :', e);
    }
}
try{
    if(typeof document !== 'undefined'){
        if(document.readyState === 'loading')
            document.addEventListener('DOMContentLoaded', tfInstallerSecurise);
        else
            tfInstallerSecurise();
        window.addEventListener('load', tfInstallerSecurise);
    }
}catch(e){}
