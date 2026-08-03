/* ==================================================================
   SEVEN7 — CONSTATATIONS D’AUDIT

   À ne pas confondre avec les FAITS MARQUANTS DE L’EXERCICE (module 36),
   qui sont les événements que l’ENTITÉ nous expose. Ici, ce sont les
   constatations issues de NOS propres contrôles.

   La constatation d’audit est ce qui, à lui seul, peut changer l'opinion. Il
   était jusqu'ici dispersé : une anomalie critique dans un onglet, un
   rapprochement en écart dans un autre, un risque coté élevé dans un
   troisième. Personne ne les voyait ensemble, et rien ne garantissait
   qu'aucun ne soit oublié au moment de conclure.

   Ce module les RASSEMBLE AUTOMATIQUEMENT à partir de ce que
   l'application calcule déjà : équilibres, cycles, contrôles croisés,
   qualité de la balance, seuils, cartographie des risques, diligences
   normatives. Rien n'est saisi deux fois.

   Trois degrés :
     BLOQUANT  — empêche de conclure en l'état
     MAJEUR    — affecte l'opinion ou le rapport
     SIGNALÉ   — à documenter, sans incidence présumée

   L'auditeur ajoute ses propres faits et commente chacun ; sa saisie
   n'est jamais écrasée par une régénération.
   ================================================================== */

var FM_DEGRES = { BLOQUANT:{o:1, cls:'status-danger'}, MAJEUR:{o:2, cls:'status-warning'}, 'SIGNALÉ':{o:3, cls:''} };

/** Ajoute un fait s'il est avéré. */
function fmAjouter(liste, degre, source, libelle, incidence){
    liste.push({ degre:degre, source:source, libelle:libelle, incidence:incidence || '' });
}

/* ---------- 1. Équilibres et intégrité de la balance ---------- */
function fmEquilibres(F){
    var rows = (typeof balanceData !== 'undefined' && balanceData.n) ? balanceData.n : [];
    if(!rows.length) return;

    function totaux(ex){
        var t = {md:0, mc:0, sd:0, sc:0};
        ((typeof balanceData !== 'undefined' && balanceData[ex]) || []).forEach(function(r){
            t.md += parseNum(r.md)||0; t.mc += parseNum(r.mc)||0;
            t.sd += parseNum(r.sd)||0; t.sc += parseNum(r.sc)||0;
        });
        return t;
    }
    ['n','n1'].forEach(function(ex){
        var lib = (ex === 'n') ? 'N' : 'N-1';
        var t = totaux(ex);
        if(!(t.sd || t.sc)) return;
        if(Math.abs(t.sd - t.sc) > 1)
            fmAjouter(F, 'BLOQUANT', 'Balance ' + lib,
                'Soldes déséquilibrés de ' + fmt(t.sd - t.sc) + ' (débit ' + fmt(t.sd) + ' / crédit ' + fmt(t.sc) + ')',
                "Les états financiers ne peuvent pas être établis sur une balance déséquilibrée.");
        if(Math.abs(t.md - t.mc) > 1)
            fmAjouter(F, ex === 'n' ? 'BLOQUANT' : 'MAJEUR', 'Balance ' + lib,
                'Mouvements déséquilibrés de ' + fmt(t.md - t.mc),
                ex === 'n' ? "Le tableau des flux de trésorerie est calculé sur ces mouvements."
                           : "Sans effet sur les soldes, mais un TFT calculé sur N-1 serait faux.");
    });

    try{
        var rN = liasseGetResultat('n');
        var aN = liasseGetActif('n'), pN = liasseGetPassif('n', rN.XI);
        var ecart = (aN.BZ.net || 0) - (pN.DZ.net || 0);
        if(Math.abs(ecart) > 1)
            fmAjouter(F, 'BLOQUANT', 'Bilan',
                'Actif et passif ne se rejoignent pas : écart de ' + fmt(ecart),
                "À résoudre avant toute conclusion.");
    }catch(e){}

    try{
        var T = liasseGetTFTColumn('n');
        if(Math.abs(T.ECART || 0) > 1)
            fmAjouter(F, 'MAJEUR', 'Tableau des flux',
                'Le TFT ne boucle pas : écart de ' + fmt(T.ECART),
                "ZA + ZG doit égaler ZH.");
    }catch(e){}
}

/* ---------- 2. Qualité de la donnée ---------- */
function fmQualite(F){
    try{
        var an = (typeof detecterAnomaliesIntitules === 'function') ? detecterAnomaliesIntitules() : [];
        if(an.length)
            fmAjouter(F, 'SIGNALÉ', 'Qualité de la balance',
                an.length + ' incohérence(s) d’intitulé de compte',
                "Doublons ou renommages : à lever avant exploitation des variations.");
        var nu = (typeof detecterNumerotationHeterogene === 'function') ? detecterNumerotationHeterogene() : [];
        if(nu.length)
            fmAjouter(F, 'MAJEUR', 'Qualité de la balance',
                nu.length + ' compte(s) numéroté(s) de deux façons (zéros de fin)',
                "Le rapprochement N / N-1 échoue et produit de faux comptes nouveaux et disparus.");
    }catch(e){}
}

/* ---------- 3. Cycles : anomalies critiques et contrôles croisés ---------- */
function fmCycles(F){
    if(typeof CYCLES === 'undefined' || typeof cycTestsCompte !== 'function') return;
    var rows   = (typeof balanceData !== 'undefined' && balanceData.n)  ? balanceData.n  : [];
    var rowsN1 = (typeof balanceData !== 'undefined' && balanceData.n1) ? balanceData.n1 : [];
    if(!rows.length) return;

    var seuil = Math.max((typeof seuils !== 'undefined' && seuils.faible) || 0, 1);
    var mapN1 = {}, mapN = {};
    rowsN1.forEach(function(r){ mapN1[cycKey(r.compte)] = r; });
    rows.forEach(function(r){ mapN[cycKey(r.compte)] = r; });

    CYCLES.forEach(function(c){
        var lst = rows.filter(function(r){ return cycleOf(r.compte) === c.id; });
        if(!lst.length) return;
        var crit = 0, maj = 0;
        lst.forEach(function(r){
            cycTestsCompte(r, mapN1[cycKey(r.compte)], seuil, c.id, mapN).forEach(function(a){
                if(a.g === 'CRITIQUE') crit++; else if(a.g === 'MAJEUR') maj++;
            });
        });
        if(crit)
            fmAjouter(F, 'BLOQUANT', c.ico + ' ' + c.nom,
                crit + ' anomalie(s) critique(s) relevée(s) sur les comptes du cycle',
                "Rupture de continuité, incohérence arithmétique ou situation impossible.");
        else if(maj >= 3)
            fmAjouter(F, 'MAJEUR', c.ico + ' ' + c.nom,
                maj + ' anomalie(s) majeure(s) relevée(s)',
                "Reclassements ou sens de solde anormaux à traiter.");

        /* rapprochements croisés bloquants du cycle */
        try{
            (cycControlesGlobaux(c.id) || []).forEach(function(x){
                if(x.info) return;
                var e = (x.a || 0) - (x.b || 0);
                if(Math.abs(e) > 1)
                    fmAjouter(F, 'MAJEUR', c.ico + ' ' + c.nom,
                        'Rapprochement en écart de ' + fmt(e) + ' — ' + x.lib, x.note || '');
            });
        }catch(e){}
    });
}

/* ---------- 4. Risques cotés élevés ---------- */
function fmRisques(F){
    var table = document.getElementById('table-risques');
    if(!table) return;
    var eleves = [];
    for(var i = 1; i < table.rows.length; i++){
        var c = table.rows[i].cells;
        if(!c || c.length < 8) continue;
        var niveau = (c[7].textContent || '').trim();
        var lib = c[2] && c[2].querySelector('input') ? c[2].querySelector('input').value : '';
        if(niveau === 'Élevé' && lib) eleves.push(lib);
    }
    if(eleves.length)
        fmAjouter(F, 'MAJEUR', 'Cartographie des risques',
            eleves.length + ' risque(s) coté(s) élevé(s)',
            eleves.slice(0, 3).join(' · ') + (eleves.length > 3 ? ' …' : ''));
}

/* ---------- 5. Diligences normatives restées sans réponse ou négatives ---------- */
function fmDiligences(F){
    if(typeof DILIGENCES === 'undefined') return;
    DILIGENCES.forEach(function(d){
        var p = document.getElementById(d.id);
        if(!p) return;
        var sels = p.querySelectorAll('select');
        var non = 0, vides = 0;
        for(var i = 0; i < sels.length; i++){
            var v = sels[i].value;
            if(v === 'Non') non++;
            else if(!v) vides++;
        }
        if(non)
            fmAjouter(F, 'MAJEUR', d.ico + ' ' + d.titre,
                non + ' diligence(s) répondue(s) « Non »',
                d.norme + " — justifier ou mettre en œuvre.");
        if(sels.length && vides === sels.length)
            fmAjouter(F, 'SIGNALÉ', d.ico + ' ' + d.titre,
                'Section non renseignée',
                d.norme + " — le dossier ne démontre pas la diligence.");
    });
}

/* ---------- Assemblage ---------- */
function fmCollecter(){
    var F = [];
    try{ fmEquilibres(F); }catch(e){}
    try{ fmQualite(F); }catch(e){}
    try{ fmCycles(F); }catch(e){}
    try{ fmRisques(F); }catch(e){}
    try{ fmDiligences(F); }catch(e){}
    F.sort(function(a, b){
        return (FM_DEGRES[a.degre] || {o:9}).o - (FM_DEGRES[b.degre] || {o:9}).o;
    });
    return F;
}

/* ---------- Rendu ---------- */
function fmLigneHtml(f, auto){
    var oc = "onchange=\"updateStatus('constatations')\"";
    var cls = (FM_DEGRES[f.degre] || {}).cls || '';
    return '<tr>'
        + '<td class="' + cls + '" style="font-weight:600; font-size:11px;">' + esc(f.degre) + '</td>'
        + '<td style="font-size:11px;">' + esc(f.source) + '</td>'
        + '<td><input type="text" data-fmt="non" value="' + esc(f.libelle) + '" ' + oc + '></td>'
        + '<td><input type="text" data-fmt="non" value="' + esc(f.incidence) + '" ' + oc + '></td>'
        + '<td><textarea rows="2" ' + oc + '></textarea></td>'
        + '<td><select ' + oc + '><option></option><option>À traiter</option><option>En cours</option>'
        + '<option>Résolu</option><option>Sans suite</option></select></td>'
        + '<td style="font-size:10px; color:#888;">' + (auto ? 'auto' : 'saisi') + '</td>'
        + '<td><button class="btn btn-danger" onclick="deleteRow(this)">✕</button></td>'
        + '</tr>';
}

function fmGenerer(ajouter){
    var table = document.getElementById('table-constatations');
    if(!table) return;
    var faits = fmCollecter();

    if(!ajouter){
        /* On ne retire que les lignes produites automatiquement : la saisie
           de l'auditeur et ses faits propres survivent à une régénération. */
        for(var i = table.rows.length - 1; i >= 1; i--){
            var c = table.rows[i].cells;
            if(c[6] && c[6].textContent.trim() === 'auto') table.deleteRow(i);
        }
    }
    table.insertAdjacentHTML('beforeend', faits.map(function(f){ return fmLigneHtml(f, true); }).join(''));

    var n = { BLOQUANT:0, MAJEUR:0, 'SIGNALÉ':0 };
    faits.forEach(function(f){ n[f.degre] = (n[f.degre] || 0) + 1; });
    var info = document.getElementById('fm-info');
    if(info){
        info.innerHTML = faits.length
            ? '<strong>' + n.BLOQUANT + '</strong> bloquant(s) · <strong>' + n.MAJEUR
              + '</strong> majeur(s) · ' + n['SIGNALÉ'] + ' signalé(s).'
              + (n.BLOQUANT ? ' <span class="status-danger">Un fait bloquant empêche de conclure en l’état.</span>' : '')
            : 'Aucune constatation détectée. Chargez les balances et renseignez les diligences, puis relancez.';
    }
    if(typeof updateStatus === 'function') updateStatus('constatations');
}

/* ---------- Installation de l'onglet ---------- */
function fmInstaller(){
    /* La déclaration dans TABS ne dépend pas du DOM : sans elle, l'onglet
       ne serait jamais sauvegardé, et la saisie serait perdue. */
    if(typeof TABS !== 'undefined' && !TABS.some(function(t){ return t.id === 'constatations'; }))
        TABS.push({ id:'constatations', label:'🔎 Constatations d’audit', phase:3 });

    var hote = (document.querySelector('.tab-content') || {}).parentNode;
    if(!hote) return;

    if(!document.getElementById('constatations')){
        var d = document.createElement('div');
        d.id = 'constatations';
        d.className = 'tab-content';
        d.innerHTML =
          '<div class="card" data-tab="constatations">'
        + '<h2>🔎 CONSTATATIONS D’AUDIT</h2>'
        + '<div class="alert alert-info">Rassemblés automatiquement depuis les équilibres, '
        + 'les cycles, la qualité de la balance, la cartographie des risques et les diligences '
        + 'normatives. <strong>BLOQUANT</strong> empêche de conclure · <strong>MAJEUR</strong> '
        + 'affecte l’opinion · <strong>SIGNALÉ</strong> est à documenter.</div>'
        + '<button type="button" class="btn btn-primary" onclick="fmGenerer()">⚙️ Rassembler les constatations</button> '
        + '<button type="button" class="btn" onclick="fmGenerer(true)">➕ Ajouter sans effacer</button>'
        + '<p id="fm-info" style="font-size:12px; color:#666; margin:10px 0 14px;"></p>'
        + '<table id="table-constatations">'
        + '<tr><th style="width:8%;">Degré</th><th style="width:14%;">Source</th><th style="width:26%;">Fait</th>'
        + '<th style="width:20%;">Incidence</th><th style="width:18%;">Commentaire de l’auditeur</th>'
        + '<th style="width:9%;">Suite</th><th style="width:5%;">Origine</th><th></th></tr>'
        + '</table>'
        + '<button class="btn btn-primary" style="margin-top:10px;" onclick="addRow(\'table-constatations\', [\'text\',\'text\',\'text\',\'text\',\'text\',\'text\',\'text\'])">+ Ajouter un fait</button>'
        + '</div>';
        hote.appendChild(d);
    }

    var menu = document.getElementById('phase-dropdown-3');
    if(menu && !menu.querySelector('[data-fm]')){
        var b = document.createElement('button');
        b.className = 'tab-btn phase3';
        b.setAttribute('data-fm', '1');
        b.setAttribute('onclick', "showTab('constatations')");
        b.textContent = '🔎 Constatations d’audit';
        menu.insertBefore(b, menu.firstChild);
    }
}

try{
    if(typeof document !== 'undefined'){
        if(document.readyState === 'loading')
            document.addEventListener('DOMContentLoaded', fmInstaller);
        else
            fmInstaller();
    }
}catch(e){}
