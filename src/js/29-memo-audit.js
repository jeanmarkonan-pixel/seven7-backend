/* ==================================================================
   SEVEN7 — MÉMO DE SYNTHÈSE D'AUDIT
   Destinataire : équipe d'audit. Document de travail structuré,
   alimenté par l'ensemble des onglets, avec projection de fin de mission.
   ================================================================== */

var MEMO_ETAT = null;
function memoCle(){
    var d = (typeof window !== 'undefined' && window.SEVEN7_DOSSIER_ID) ? window.SEVEN7_DOSSIER_ID : 'local';
    return 'seven7_memo_' + d;
}
function memoCharger(){
    if(MEMO_ETAT) return MEMO_ETAT;
    MEMO_ETAT = {entete:{}, ajustements:[], suspens:[]};
    try{
        var s = JSON.parse(localStorage.getItem(memoCle()) || 'null');
        if(s && typeof s === 'object'){
            MEMO_ETAT.entete = s.entete || {};
            MEMO_ETAT.ajustements = s.ajustements || [];
            MEMO_ETAT.suspens = s.suspens || [];
        }
    }catch(e){}
    return MEMO_ETAT;
}
function memoEnregistrer(){
    try{ localStorage.setItem(memoCle(), JSON.stringify(memoCharger())); }catch(e){}
}
function memoMajEntete(cle, valeur){
    var e = memoCharger();
    e.entete[cle] = valeur;
    memoEnregistrer();
}

/* ---------------- Diligences de référence par cycle ---------------- */
var MEMO_DILIGENCES = {
 IMM:['Rapprochement du fichier des immobilisations avec la balance',
      'Test des acquisitions de l’exercice sur pièces justificatives',
      'Recalcul des dotations et revue des durées d’amortissement',
      'Inspection physique par sondage et revue des cessions (VNC / prix)'],
 STK:['Assistance à l’inventaire physique de clôture',
      'Test de valorisation (CUMP ou FIFO) et revue des stocks à rotation lente',
      'Contrôle de séparation des exercices sur les achats et les ventes'],
 ACH:['Circularisation des fournisseurs et rapprochement des réponses',
      'Recherche de passifs non enregistrés après la clôture',
      'Revue des factures non parvenues (compte 408) et du cut-off achats',
      'Test de séparation des tâches sur le cycle achats-décaissements'],
 VTE:['Circularisation des clients et analyse des écarts',
      'Contrôle de séparation des exercices sur les ventes',
      'Revue de la balance âgée et du bien-fondé des dépréciations',
      'Rapprochement du chiffre d’affaires avec la TVA collectée déclarée'],
 PER:['Rapprochement des états de paie avec la comptabilité',
      'Contrôle des déclarations CNPS et ITS et de leur paiement effectif',
      'Revue des provisions congés payés et indemnité de retraite'],
 FIS:['Rapprochement de la TVA déclarée et de la TVA comptabilisée',
      'Contrôle du calcul de l’impôt sur le résultat et des acomptes versés',
      'Revue des redressements, pénalités et contentieux fiscaux en cours',
      'Contrôle des retenues à la source et de leur reversement'],
 TRE:['Circularisation bancaire (soldes, engagements, personnes habilitées)',
      'Revue des états de rapprochement bancaire de clôture',
      'Contrôle physique de la caisse et revue des mouvements inhabituels'],
 CAP:['Obtention des procès-verbaux d’assemblée et du registre des titres',
      'Tableau de variation des capitaux propres et affectation du résultat N-1',
      'Revue des échéanciers d’emprunts et du respect des covenants'],
 REG:['Apurement et justification des comptes d’attente et de transit',
      'Justification des comptes courants d’associés et de leur rémunération',
      'Revue des écarts de conversion et des charges constatées d’avance'],
 HAO:['Justification des opérations hors activités ordinaires',
      'Cohérence entre valeurs comptables de cession et prix de cession',
      'Traitement fiscal des plus et moins-values de cession'],
 AUT:['Revue analytique détaillée des charges et des produits',
      'Recherche des charges non récurrentes et des opérations inhabituelles']
};

/* ---------------- Analyse de risque par cycle ---------------- */
function memoAnalyseCycles(){
    var rows   = (typeof balanceData !== 'undefined' && balanceData.n)  ? balanceData.n  : [];
    var rowsN1 = (typeof balanceData !== 'undefined' && balanceData.n1) ? balanceData.n1 : [];
    if(!rows.length) return [];
    var seuil = Math.max((typeof seuils !== 'undefined' && seuils.faible) || 0, 1);
    var mapN1 = {}, mapN = {};
    rowsN1.forEach(function(r){ mapN1[cycKey(r.compte)] = r; });
    rows.forEach(function(r){ mapN[cycKey(r.compte)] = r; });

    var totalMasse = 0;
    rows.forEach(function(r){ totalMasse += Math.abs(cycSolde(r)); });
    var com = (typeof cycComLoad === 'function') ? cycComLoad() : {};

    var out = [];
    CYCLES.forEach(function(c){
        var lst = rows.filter(function(r){ return cycleOf(r.compte) === c.id; });
        if(!lst.length) return;
        var sN = 0, sN1 = 0, masse = 0;
        lst.forEach(function(r){ sN += cycSolde(r); masse += Math.abs(cycSolde(r)); });
        rowsN1.forEach(function(r){ if(cycleOf(r.compte) === c.id) sN1 += cycSolde(r); });

        var crit = 0, maj = 0, comptesAno = 0, commentes = 0;
        lst.forEach(function(r){
            var anos = cycTestsCompte(r, mapN1[cycKey(r.compte)], seuil, c.id, mapN);
            if(anos.length){
                comptesAno++;
                if(com[cycKey(r.compte)]) commentes++;
            }
            anos.forEach(function(a){ if(a.g === 'CRITIQUE') crit++; else if(a.g === 'MAJEUR') maj++; });
        });

        var variation = sN - sN1;
        var pct = sN1 !== 0 ? (variation / Math.abs(sN1)) * 100 : (sN !== 0 ? 100 : 0);
        var poids = totalMasse ? (masse / totalMasse) * 100 : 0;
        var score = 3 * crit + maj + (poids >= 20 ? 2 : (poids >= 10 ? 1 : 0)) +
                    (Math.abs(pct) >= 50 ? 2 : (Math.abs(pct) >= 20 ? 1 : 0));
        var risque = score >= 5 ? 'ÉLEVÉ' : (score >= 2 ? 'MOYEN' : 'FAIBLE');
        var avancement = comptesAno === 0 ? 100 : Math.min(100, Math.round((commentes / comptesAno) * 100));

        out.push({id:c.id, nom:c.nom, ico:c.ico, comptes:lst.length, sN:sN, sN1:sN1,
                  variation:variation, pct:pct, poids:poids, crit:crit, maj:maj,
                  score:score, risque:risque, avancement:avancement, comptesAno:comptesAno});
    });
    out.sort(function(a, b){ return b.score - a.score; });
    return out;
}

/* ---------------- Chiffres clés et seuils ---------------- */
function memoRendreChiffres(){
    var el = document.getElementById('memo-chiffres');
    if(!el) return;
    var rN, rN1, aN, aN1, tft = null;
    try{
        rN = liasseGetResultat('n'); rN1 = liasseGetResultat('n1');
        aN = liasseGetActif('n');    aN1 = liasseGetActif('n1');
        tft = liasseGetTFTColumn('n');
    }catch(e){
        el.innerHTML = '<div class="alert alert-info">Importez les balances N et N-1 pour alimenter le mémo.</div>';
        return;
    }
    function ligne(lib, n, n1){
        var v = n - n1, p = n1 !== 0 ? (v / Math.abs(n1)) * 100 : (n !== 0 ? 100 : 0);
        return '<tr><td>'+lib+'</td><td class="number">'+fmt(n)+'</td><td class="number">'+fmt(n1)+'</td>'+
               '<td class="number">'+fmt(v)+'</td><td class="number">'+p.toFixed(1)+'%</td></tr>';
    }
    var h = '<table><tr><th>Agrégat</th><th>Exercice N</th><th>Exercice N-1</th><th>Variation</th><th>%</th></tr>';
    h += ligne('Total du bilan', (aN.BZ||{}).net || 0, (aN1.BZ||{}).net || 0);
    h += ligne('Chiffre d’affaires (XB)', rN.XB, rN1.XB);
    h += ligne('Valeur ajoutée (XC)', rN.XC, rN1.XC);
    h += ligne('Excédent brut d’exploitation (XD)', rN.XD, rN1.XD);
    h += ligne('Résultat d’exploitation (XE)', rN.XE, rN1.XE);
    h += ligne('Résultat net (XI)', rN.XI, rN1.XI);
    h += ligne('Trésorerie nette de clôture', (aN.BT||{}).net || 0, (aN1.BT||{}).net || 0);
    if(tft){
        h += '<tr><td>Variation de trésorerie de la période (ZG du TFT)</td>'+
             '<td class="number">'+fmt(tft.ZG)+'</td>'+
             '<td colspan="3" style="font-size:11px;color:#666;">Bouclage du tableau des flux sur la balance</td></tr>';
    }
    h += '</table>';

    var sg = (typeof seuils !== 'undefined') ? seuils : {signif:0, faible:0, planif:0};
    h += '<table style="margin-top:10px;"><tr><th>Seuils retenus pour la mission</th><th>Montant</th><th>Usage</th></tr>'+
         '<tr><td>Seuil de signification</td><td class="number">'+fmt(sg.signif)+'</td>'+
         '<td>Appréciation du caractère significatif des anomalies non ajustées</td></tr>'+
         '<tr><td>Seuil de planification</td><td class="number">'+fmt(sg.planif)+'</td>'+
         '<td>Étendue des sondages et sélection des éléments à contrôler</td></tr>'+
         '<tr><td>Seuil de remontée des anomalies</td><td class="number">'+fmt(sg.faible)+'</td>'+
         '<td>Consignation des écarts dans la feuille d’ajustements</td></tr></table>';
    el.innerHTML = h;
}

/* ---------------- Cartographie des risques par cycle ---------------- */
function memoRendreCycles(){
    var el = document.getElementById('memo-cycles');
    if(!el) return;
    var an = memoAnalyseCycles();
    if(!an.length){
        el.innerHTML = '<div class="alert alert-info">Importez la balance N pour établir la cartographie des risques par cycle.</div>';
        return;
    }
    var cls = {'ÉLEVÉ':'status-danger', 'MOYEN':'status-warning', 'FAIBLE':'status-ok'};
    var h = '<table><tr><th>Cycle</th><th>Poids</th><th>Solde N</th><th>Variation</th><th>%</th>'+
            '<th>Crit.</th><th>Maj.</th><th>Risque</th><th>Diligences prioritaires</th></tr>';
    an.forEach(function(c){
        var nb = c.risque === 'ÉLEVÉ' ? 4 : (c.risque === 'MOYEN' ? 2 : 1);
        var dil = (MEMO_DILIGENCES[c.id] || []).slice(0, nb);
        h += '<tr><td><b>'+c.ico+' '+esc(c.nom)+'</b></td>'+
             '<td class="number">'+c.poids.toFixed(1)+'%</td>'+
             '<td class="number">'+fmt(c.sN)+'</td><td class="number">'+fmt(c.variation)+'</td>'+
             '<td class="number">'+c.pct.toFixed(1)+'%</td>'+
             '<td class="number'+(c.crit?' status-danger':'')+'">'+c.crit+'</td>'+
             '<td class="number'+(c.maj?' status-warning':'')+'">'+c.maj+'</td>'+
             '<td class="'+cls[c.risque]+'"><b>'+c.risque+'</b></td>'+
             '<td style="font-size:11px;">'+dil.map(function(d){ return '• '+esc(d); }).join('<br>')+'</td></tr>';
    });
    h += '</table><p class="memo-note">Le niveau de risque combine les anomalies relevées par l’analyse par cycle, '+
         'le poids du cycle dans la masse de la balance et l’ampleur de la variation N-1&nbsp;→&nbsp;N. '+
         'Les diligences proposées ne dispensent pas du jugement professionnel.</p>';
    el.innerHTML = h;
}

/* ---------------- Feuille d'ajustements ---------------- */
function memoAjoutAjustement(){
    memoCharger().ajustements.push({lib:'', cycle:'', debit:'', credit:'', montant:0, resultat:0, statut:'Non ajusté'});
    memoEnregistrer(); memoRendreAjustements(); memoRendrePrevisionnel();
}
function memoMajAjustement(i, champ, valeur){
    var e = memoCharger();
    if(!e.ajustements[i]) return;
    e.ajustements[i][champ] = (champ === 'montant' || champ === 'resultat') ? parseNum(valeur) : valeur;
    memoEnregistrer();
    if(champ !== 'lib' && champ !== 'debit' && champ !== 'credit') memoRendreAjustements();
    memoRendrePrevisionnel();
}
function memoSupprAjustement(i){
    memoCharger().ajustements.splice(i, 1);
    memoEnregistrer(); memoRendreAjustements(); memoRendrePrevisionnel();
}
function memoRendreAjustements(){
    var el = document.getElementById('memo-ajustements');
    if(!el) return;
    var e = memoCharger();
    var opts = ['Non ajusté', 'Ajusté par le client', 'Refusé par le client', 'À documenter'];
    var h = '<table><tr><th style="width:34px;">#</th><th>Libellé de l’ajustement</th><th style="width:120px;">Cycle</th>'+
            '<th style="width:95px;">Cpte débit</th><th style="width:95px;">Cpte crédit</th>'+
            '<th style="width:120px;">Montant</th><th style="width:130px;">Impact résultat (±)</th>'+
            '<th style="width:150px;">Statut</th><th style="width:40px;"></th></tr>';
    if(!e.ajustements.length){
        h += '<tr><td colspan="9" style="text-align:center;color:#888;">Aucun ajustement consigné. '+
             'Tout écart dépassant le seuil de remontée doit figurer ici.</td></tr>';
    }
    e.ajustements.forEach(function(a, i){
        var selCycle = '<select onchange="memoMajAjustement('+i+',\'cycle\',this.value)"><option value="">—</option>'+
            CYCLES.map(function(c){ return '<option value="'+c.id+'"'+(a.cycle===c.id?' selected':'')+'>'+esc(c.nom)+'</option>'; }).join('')+'</select>';
        var selStatut = '<select onchange="memoMajAjustement('+i+',\'statut\',this.value)">'+
            opts.map(function(o){ return '<option'+(a.statut===o?' selected':'')+'>'+o+'</option>'; }).join('')+'</select>';
        h += '<tr><td>'+(i+1)+'</td>'+
             '<td><input type="text" value="'+esc(a.lib)+'" onchange="memoMajAjustement('+i+',\'lib\',this.value)"></td>'+
             '<td>'+selCycle+'</td>'+
             '<td><input type="text" value="'+esc(a.debit)+'" onchange="memoMajAjustement('+i+',\'debit\',this.value)"></td>'+
             '<td><input type="text" value="'+esc(a.credit)+'" onchange="memoMajAjustement('+i+',\'credit\',this.value)"></td>'+
             '<td><input type="text" inputmode="decimal" data-montant="1" class="montant-fmt" value="'+fmtSaisie(a.montant||'')+'" onchange="memoMajAjustement('+i+',\'montant\',this.value)"></td>'+
             '<td><input type="text" inputmode="decimal" data-montant="1" class="montant-fmt" value="'+fmtSaisie(a.resultat||'')+'" onchange="memoMajAjustement('+i+',\'resultat\',this.value)"></td>'+
             '<td>'+selStatut+'</td>'+
             '<td><button class="btn btn-danger" onclick="memoSupprAjustement('+i+')">✕</button></td></tr>';
    });
    var nonAj = 0, aj = 0;
    e.ajustements.forEach(function(a){
        if(a.statut === 'Ajusté par le client') aj += parseNum(a.resultat);
        else nonAj += parseNum(a.resultat);
    });
    h += '<tr class="cyc-soustotal"><td colspan="6"><b>Incidence cumulée sur le résultat</b></td>'+
         '<td class="number"><b>'+fmt(aj + nonAj)+'</b></td><td colspan="2"></td></tr></table>';

    var sg = (typeof seuils !== 'undefined') ? seuils : {signif:0};
    var depasse = sg.signif > 0 && Math.abs(nonAj) >= sg.signif;
    h += '<table style="margin-top:8px;"><tr><th>Incidence</th><th>Montant</th><th>Appréciation</th></tr>'+
         '<tr><td>Ajustements acceptés et comptabilisés</td><td class="number">'+fmt(aj)+'</td>'+
         '<td>Sans incidence sur l’opinion</td></tr>'+
         '<tr><td>Anomalies non ajustées cumulées</td><td class="number">'+fmt(nonAj)+'</td>'+
         '<td class="'+(depasse?'status-danger':'status-ok')+'">'+
         (sg.signif > 0
            ? (depasse ? '⚠ Dépasse le seuil de signification de '+fmt(sg.signif)+' : une réserve doit être envisagée'
                       : '✔ Inférieur au seuil de signification de '+fmt(sg.signif))
            : 'Renseignez le seuil de signification dans l’onglet Planification')+
         '</td></tr></table>';
    el.innerHTML = h;
}

/* ---------------- Points en suspens ---------------- */
function memoAjoutSuspens(){
    memoCharger().suspens.push({point:'', cycle:'', responsable:'', echeance:'', statut:'Ouvert'});
    memoEnregistrer(); memoRendreSuspens(); memoRendrePrevisionnel();
}
function memoMajSuspens(i, champ, valeur){
    var e = memoCharger();
    if(!e.suspens[i]) return;
    e.suspens[i][champ] = valeur;
    memoEnregistrer();
    if(champ === 'statut'){ memoRendreSuspens(); }
    memoRendrePrevisionnel();
}
function memoSupprSuspens(i){
    memoCharger().suspens.splice(i, 1);
    memoEnregistrer(); memoRendreSuspens(); memoRendrePrevisionnel();
}
function memoRendreSuspens(){
    var el = document.getElementById('memo-suspens');
    if(!el) return;
    var e = memoCharger();
    var st = ['Ouvert', 'Relancé', 'Reçu — à exploiter', 'Clos'];
    var h = '<table><tr><th style="width:34px;">#</th><th>Point en suspens ou document attendu</th>'+
            '<th style="width:120px;">Cycle</th><th style="width:150px;">Responsable</th>'+
            '<th style="width:150px;">Échéance</th><th style="width:160px;">Statut</th><th style="width:40px;"></th></tr>';
    if(!e.suspens.length){
        h += '<tr><td colspan="7" style="text-align:center;color:#888;">Aucun point en suspens. '+
             'Ce tableau pilote les demandes adressées à la direction.</td></tr>';
    }
    e.suspens.forEach(function(s, i){
        var selCycle = '<select onchange="memoMajSuspens('+i+',\'cycle\',this.value)"><option value="">—</option>'+
            CYCLES.map(function(c){ return '<option value="'+c.id+'"'+(s.cycle===c.id?' selected':'')+'>'+esc(c.nom)+'</option>'; }).join('')+'</select>';
        var selStatut = '<select onchange="memoMajSuspens('+i+',\'statut\',this.value)">'+
            st.map(function(o){ return '<option'+(s.statut===o?' selected':'')+'>'+o+'</option>'; }).join('')+'</select>';
        h += '<tr'+(s.statut === 'Clos' ? ' style="opacity:.55;"' : '')+'><td>'+(i+1)+'</td>'+
             '<td><input type="text" value="'+esc(s.point)+'" onchange="memoMajSuspens('+i+',\'point\',this.value)"></td>'+
             '<td>'+selCycle+'</td>'+
             '<td><input type="text" value="'+esc(s.responsable)+'" onchange="memoMajSuspens('+i+',\'responsable\',this.value)"></td>'+
             '<td><input type="date" value="'+esc(s.echeance)+'" onchange="memoMajSuspens('+i+',\'echeance\',this.value)"></td>'+
             '<td>'+selStatut+'</td>'+
             '<td><button class="btn btn-danger" onclick="memoSupprSuspens('+i+')">✕</button></td></tr>';
    });
    h += '</table>';
    el.innerHTML = h;
}

/* ---------------- Synthèse prévisionnelle ---------------- */
function memoRendrePrevisionnel(){
    var el = document.getElementById('memo-previsionnel');
    if(!el) return;
    var e = memoCharger();
    var an = memoAnalyseCycles();
    if(!an.length){
        el.innerHTML = '<div class="alert alert-info">La projection de fin de mission s’alimente des balances et de l’analyse par cycle.</div>';
        return;
    }
    var avancementGlobal = Math.round(an.reduce(function(s, c){ return s + c.avancement; }, 0) / an.length);
    var eleves = an.filter(function(c){ return c.risque === 'ÉLEVÉ'; });
    var suspensOuverts = e.suspens.filter(function(s){ return s.statut !== 'Clos'; });
    var aujourdhui = new Date(new Date().toDateString());
    var enRetard = suspensOuverts.filter(function(s){ return s.echeance && new Date(s.echeance) < aujourdhui; });
    var nonAj = 0;
    e.ajustements.forEach(function(a){ if(a.statut !== 'Ajusté par le client') nonAj += parseNum(a.resultat); });
    var sg = (typeof seuils !== 'undefined') ? seuils : {signif:0};

    var chargeRestante = 0;
    an.forEach(function(c){
        var base = c.risque === 'ÉLEVÉ' ? 2 : (c.risque === 'MOYEN' ? 1 : 0.5);
        chargeRestante += base * (1 - c.avancement / 100);
    });
    chargeRestante = Math.round(chargeRestante * 2) / 2;

    var h = '<div class="memo-kpi">'+
        '<div class="memo-kpi-box"><span>'+avancementGlobal+'%</span><small>Avancement estimé</small></div>'+
        '<div class="memo-kpi-box"><span>'+eleves.length+'</span><small>Cycles à risque élevé</small></div>'+
        '<div class="memo-kpi-box"><span>'+suspensOuverts.length+'</span><small>Suspens ouverts</small></div>'+
        '<div class="memo-kpi-box"><span>'+chargeRestante+' j</span><small>Charge restante estimée</small></div>'+
        '</div>';

    h += '<table><tr><th>Cycle</th><th>Risque</th><th>Comptes en anomalie</th><th>Avancement</th><th>État projeté</th></tr>';
    an.forEach(function(c){
        var etat = c.comptesAno === 0 ? 'Aucune anomalie — revue analytique à documenter'
                 : (c.avancement >= 100 ? 'Anomalies toutes justifiées — documentation à archiver'
                 : (c.avancement > 0 ? 'En cours — anomalies partiellement justifiées'
                                     : 'Non démarré — aucune anomalie encore justifiée'));
        h += '<tr><td>'+c.ico+' '+esc(c.nom)+'</td>'+
             '<td class="'+(c.risque==='ÉLEVÉ'?'status-danger':(c.risque==='MOYEN'?'status-warning':'status-ok'))+'">'+c.risque+'</td>'+
             '<td class="number">'+c.comptesAno+'</td>'+
             '<td><div class="memo-bar"><i style="width:'+c.avancement+'%;"></i></div><small>'+c.avancement+'%</small></td>'+
             '<td style="font-size:11px;">'+etat+'</td></tr>';
    });
    h += '</table>';

    var alertes = [];
    if(sg.signif > 0 && Math.abs(nonAj) >= sg.signif){
        alertes.push('Les anomalies non ajustées cumulées atteignent '+fmt(nonAj)+' FCFA, au-delà du seuil de signification de '+fmt(sg.signif)+' FCFA. En l’état, une opinion avec réserve serait justifiée.');
    }
    if(eleves.length){
        alertes.push('Cycles concentrant le risque, à boucler en priorité : '+eleves.map(function(c){ return c.nom; }).join(', ')+'.');
    }
    if(enRetard.length){
        alertes.push(enRetard.length+' point(s) en suspens ont dépassé leur échéance : relance de la direction à effectuer sans délai.');
    } else if(suspensOuverts.length){
        alertes.push(suspensOuverts.length+' point(s) en suspens restent ouverts : leur dénouement conditionne la levée des limitations éventuelles.');
    }
    if(!alertes.length){
        alertes.push('Aucun élément ne fait obstacle à ce stade à une opinion sans réserve, sous réserve de l’achèvement des diligences restantes et de l’obtention de la lettre d’affirmation.');
    }
    h += '<div class="memo-alertes"><b>Trajectoire d’opinion à la date du mémo</b><ul>'+
         alertes.map(function(a){ return '<li>'+esc(a)+'</li>'; }).join('')+'</ul></div>';
    h += '<p class="memo-note">L’avancement est estimé à partir de la part des comptes en anomalie ayant reçu un commentaire dans la revue des variations par cycle. '+
         'La charge restante est indicative : 2 jours par cycle à risque élevé, 1 jour à risque moyen, une demi-journée sinon, pondérés par l’avancement.</p>';
    el.innerHTML = h;
}

/* ---------------- Orchestration ---------------- */
function memoRendreEntete(){
    var e = memoCharger();
    ['de','a','objet','date','reference','diffusion'].forEach(function(k){
        var el = document.getElementById('memo-'+k);
        if(el && !el.value && e.entete[k]) el.value = e.entete[k];
    });
}
function memoRafraichir(){
    memoCharger();
    memoRendreEntete();
    memoRendreChiffres();
    memoRendreCycles();
    memoRendreAjustements();
    memoRendreSuspens();
    memoRendrePrevisionnel();
}
function memoPreRemplirEntete(){
    var e = memoCharger();
    var raison = (typeof val === 'function') ? val('fi-raison') : '';
    var cloture = (typeof val === 'function') ? val('fi-cloture') : '';
    var moi = (typeof window !== 'undefined' && window.SEVEN7_MY_NAME) ? window.SEVEN7_MY_NAME : '';
    var maj = {
        de: moi || 'Chef de mission',
        a: 'Équipe d’audit et associé signataire',
        objet: 'Mémo de synthèse — audit des états financiers'+(raison ? ' de '+raison : '')+(cloture ? ', exercice clos le '+cloture : ''),
        date: new Date().toISOString().substring(0, 10),
        reference: ((typeof window !== 'undefined' && window.SEVEN7_DOSSIER_ID) || 'DOSSIER')+' / MEMO-SYNTH',
        diffusion: 'Document de travail — diffusion interne au cabinet'
    };
    Object.keys(maj).forEach(function(k){
        var el = document.getElementById('memo-'+k);
        if(el && !el.value){ el.value = maj[k]; e.entete[k] = maj[k]; }
    });
    memoEnregistrer();
}
function memoGenerer(){
    if(typeof updateAllCalculations === 'function') updateAllCalculations();
    memoPreRemplirEntete();
    if(typeof genererSynthese === 'function') genererSynthese();
    memoRafraichir();
    if(typeof updateStatus === 'function') updateStatus('synthese');
}

/* ---------------- Export Word ---------------- */
function memoExporterWord(){
    var page = document.getElementById('memo-page');
    if(!page) return;
    var clone = page.cloneNode(true);
    Array.prototype.forEach.call(clone.querySelectorAll('input, textarea, select'), function(el){
        var v = '';
        if(el.tagName === 'SELECT'){ v = el.options[el.selectedIndex] ? el.options[el.selectedIndex].text : ''; }
        else { v = el.value || ''; }
        var span = document.createElement('span');
        span.innerHTML = esc(v).replace(/\n/g, '<br>') || '&nbsp;';
        el.parentNode.replaceChild(span, el);
    });
    Array.prototype.forEach.call(clone.querySelectorAll('button'), function(b){ b.parentNode.removeChild(b); });
    var style = 'body{font-family:"Times New Roman",serif;font-size:11pt;} '+
        'table{border-collapse:collapse;width:100%;font-size:9pt;margin:6px 0;} '+
        'th,td{border:1px solid #999;padding:4px 6px;vertical-align:top;} '+
        'th{background:#1B2A4A;color:#fff;text-align:left;} '+
        'h3{color:#1B2A4A;border-bottom:1px solid #B8975A;padding-bottom:3px;margin-top:18px;} '+
        '.number{text-align:right;} .memo-note{font-size:8pt;color:#555;font-style:italic;}';
    var html = '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word">'+
        '<head><meta charset="utf-8"><style>'+style+'</style></head><body>'+clone.innerHTML+'</body></html>';
    var a = document.createElement('a');
    a.href = 'data:application/msword;charset=utf-8,'+encodeURIComponent('\uFEFF'+html);
    a.download = 'SEVEN7_Memo_de_synthese.doc';
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
}

