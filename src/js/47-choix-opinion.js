/* ==================================================================
   SEVEN7 — CHOIX DE L'OPINION À OPÉRER (ISA 700 · 705 · 706)

   Onglet t de l'arborescence a→u : n'existait nulle part avant ce
   chantier — le choix de l'opinion se faisait directement dans la
   liste déroulante de l'onglet Rapport (rap-opinion, 38-rapport-general.js),
   sans étape de raisonnement documentée. Ce module ajoute cette étape
   en amont, sur le modèle des diligences normatives (32/33/36) :
   panneau auto-installé, déclaré dans TABS, jamais dupliqué.

   Volontairement autonome : il documente le raisonnement de l'auditeur
   (conditions réunies, opinion retenue, justification) sans piloter le
   select rap-opinion de l'onglet Rapport, pour ne rien coupler à un
   mécanisme qui vit dans un autre fichier. L'auditeur reporte lui-même
   sa conclusion dans le Rapport — un rapprochement automatique entre
   les deux pourra être ajouté plus tard sans reprendre cet onglet.
   ================================================================== */

var CO_TYPES = [
    { id:'SANS_RESERVE', ico:'✅', titre:'Opinion sans réserve (non modifiée)',
      condition:"Les états financiers donnent, dans tous leurs aspects significatifs, une image fidèle conforme au référentiel SYSCOHADA — aucune anomalie significative non corrigée, aucune limitation des travaux." },
    { id:'AVEC_RESERVE', ico:'⚠️', titre:'Opinion avec réserve',
      condition:"Une anomalie significative existe mais n'est pas généralisée, ou les éléments probants obtenus sont insuffisants sur un point significatif mais non généralisé — l'effet possible est circonscrit." },
    { id:'DEFAVORABLE', ico:'🛑', titre:'Opinion défavorable',
      condition:"Une ou plusieurs anomalies, prises individuellement ou collectivement, sont à la fois significatives ET généralisées aux états financiers." },
    { id:'IMPOSSIBILITE', ico:'❓', titre:"Impossibilité d'exprimer une opinion",
      condition:"L'auditeur n'a pas pu obtenir des éléments probants suffisants et appropriés, et l'effet possible des anomalies non détectées serait à la fois significatif ET généralisé." }
];

function coRendreTypes(){
    return CO_TYPES.map(function(t){
        return '<tr><td>' + t.ico + ' <strong>' + esc(t.titre) + '</strong></td>'
             + '<td style="font-size:12px;">' + esc(t.condition) + '</td></tr>';
    }).join('');
}

function coInstaller(){
    if(typeof TABS !== 'undefined' && !TABS.some(function(t){ return t.id === 'choix-opinion'; }))
        TABS.push({ id:'choix-opinion', label:'⚖️ Choix de l’Opinion à Opérer', phase:3 });

    var hote = (document.querySelector('.tab-content') || {}).parentNode;
    if(!hote) return;

    if(!document.getElementById('choix-opinion')){
        var d = document.createElement('div');
        d.id = 'choix-opinion';
        d.className = 'tab-content';
        d.innerHTML =
          '<div class="card" data-tab="choix-opinion">'
        + '<h2>⚖️ CHOIX DE L’OPINION À OPÉRER</h2>'
        + '<div class="alert alert-info">Cet onglet documente le <strong>raisonnement</strong> qui mène à '
        + 'l’opinion — les quatre types possibles (ISA 700 · 705 · 706) et leurs conditions déclenchantes. '
        + 'La conclusion retenue ici doit être reportée dans la liste déroulante de l’onglet <strong>Rapport</strong>, '
        + 'qui produit le texte définitif.</div>'
        + '<div class="scroll-table"><table><tr><th style="width:30%;">Type d’opinion</th><th>Condition qui la déclenche</th></tr>'
        + coRendreTypes() + '</table></div>'
        + '<div class="form-group" style="margin-top:18px;"><label>Anomalies significatives non corrigées, généralisées ou non ? (s’appuyer sur la Note de synthèse et le Traitement de la réponse à la note de synthèse)</label>'
        + '<textarea id="co-analyse" rows="4" onchange="updateStatus(\'choix-opinion\')"></textarea></div>'
        + '<div class="form-row">'
        + '<div class="form-group" style="max-width:340px;"><label>Opinion retenue</label>'
        + '<select id="co-opinion-retenue" onchange="updateStatus(\'choix-opinion\')">'
        + '<option value="">— à sélectionner —</option>'
        + CO_TYPES.map(function(t){ return '<option value="' + t.id + '">' + t.ico + ' ' + esc(t.titre) + '</option>'; }).join('')
        + '</select></div>'
        + '</div>'
        + '<div class="form-group"><label>Justification (à reporter dans le fondement de l’opinion, onglet Rapport)</label>'
        + '<textarea id="co-justification" rows="4" onchange="updateStatus(\'choix-opinion\')"></textarea></div>'
        + '</div>';
        hote.appendChild(d);
    }

    var menu = document.getElementById('phase-dropdown-3');
    if(menu && !menu.querySelector('[data-co]')){
        var b = document.createElement('button');
        b.className = 'tab-btn phase3';
        b.setAttribute('data-co', '1');
        b.setAttribute('onclick', "showTab('choix-opinion')");
        b.textContent = '⚖️ Choix de l’Opinion à Opérer';
        var avant = menu.querySelector("[onclick*=\"'redaction'\"]");
        if(avant) menu.insertBefore(b, avant); else menu.appendChild(b);
    }
}

try{
    if(typeof document !== 'undefined'){
        if(document.readyState === 'loading')
            document.addEventListener('DOMContentLoaded', coInstaller);
        else
            coInstaller();
    }
}catch(e){}
