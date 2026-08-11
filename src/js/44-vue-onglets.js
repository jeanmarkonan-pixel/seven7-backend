/* ==================================================================
   SEVEN7 — VUE RÉDUITE DES ONGLETS PAR CATÉGORIE (11/08/2026)

   48 onglets au total, dont 27 rien que pour la Phase 2 — trop pour un
   menu déroulant à plat. Ce module regroupe les boutons déjà présents
   dans chaque phase-dropdown par NATURE (les mêmes catégories que
   l'harmonisation de la navigation : import, calcul auto, contrôle
   auto, contrôle manuel, déclaratif, référence, diligences), avec un
   bouton pour choisir : vue complète (tout à plat, comportement
   d'origine, inchangé) ou vue réduite (catégories repliées, à déplier
   au clic). Préférence mémorisée par appareil (localStorage), pas par
   dossier — c'est un confort d'affichage, jamais une restriction
   d'accès (les permissions réelles restent myAllowedTabs()/showTab()).

   Chargé EN DERNIER (voir build/manifeste.json) : les onglets de
   diligences (33), Constatations (35) et Faits Marquants (36) s'insèrent
   eux-mêmes dans le DOM à leur propre chargement — ce module doit
   tourner APRÈS eux pour les regrouper aussi, pas seulement les
   onglets statiques d'app.html. Les écouteurs DOMContentLoaded se
   déclenchent dans leur ordre d'attachement (donc l'ordre des fichiers
   dans le manifeste), c'est ce qui garantit l'ordre ici.
   ================================================================== */

var VUE_ONGLETS_CATEGORIES = {
    // Phase 1
    sommaire:'connaissance', identification:'connaissance', 'faits-exercice':'connaissance',
    planification:'connaissance', programme:'connaissance', questionnaire:'connaissance', risques:'connaissance',
    acceptation:'diligences1', fraude:'diligences1', continuite:'diligences1',
    // Phase 2
    'balance-n1':'import', 'balance-n':'import', 'gl-bilan':'import', 'gl-gestion':'import',
    bilan:'calcul', resultat:'calcul',
    detection:'controle-auto', revue:'controle-auto',
    'selection-comptes':'controle-manuel', 'controle-gl-sondage':'controle-manuel', charges:'controle-manuel',
    'tiers-fourn':'controle-manuel', 'tiers-clients':'controle-manuel', 'circ-fourn':'controle-manuel',
    'circ-clients':'controle-manuel', 'anorm-fourn':'controle-manuel', 'anorm-clients':'controle-manuel',
    impots:'declaratif', calendrier:'declaratif', 'indemnite-retraite':'declaratif', 'conges-payes':'declaratif',
    'pcg-syscohada':'reference', referentiel:'reference',
    'parties-liees':'diligences2', ecritures:'diligences2', estimations:'diligences2', 'evenements-post':'diligences2',
    // Phase 3
    constatations:'constats', 'anomalies-non-corrigees':'constats',
    recommandations:'conclusion', synthese:'conclusion', redaction:'conclusion',
    affirmations:'diligences3', 'verifications-legales':'diligences3',
    'communication-gouvernance':'diligences3', 'revue-dossier':'diligences3'
};

var VUE_ONGLETS_INFO_CATEGORIE = {
    connaissance: { icone:'📝', libelle:'Prise de connaissance' },
    diligences1: { icone:'✅', libelle:'Diligences' },
    import: { icone:'📥', libelle:'Import' },
    calcul: { icone:'🧮', libelle:'Calcul auto' },
    'controle-auto': { icone:'🔎', libelle:'Contrôle auto' },
    'controle-manuel': { icone:'🧪', libelle:'Contrôle manuel' },
    declaratif: { icone:'🏛️', libelle:'Déclaratif' },
    reference: { icone:'📚', libelle:'Référence' },
    diligences2: { icone:'✅', libelle:'Diligences' },
    constats: { icone:'🔎', libelle:'Constats' },
    conclusion: { icone:'✅', libelle:'Conclusion' },
    diligences3: { icone:'📋', libelle:'Diligences de clôture' }
};

var VUE_ONGLETS_CLE = 'seven7_vue_onglets_mode'; // 'complete' | 'reduite'

// Ne regroupe qu'une seule fois : les boutons sont RE-parentés (déplacés dans
// des .onglet-groupe), pas dupliqués — un second passage n'aurait rien à faire
// mais ne doit surtout pas re-scanner des boutons déjà déplacés dans un groupe.
function vueOngletsGrouperPhase(dropdown){
    if(dropdown.dataset.groupe === '1') return;
    var boutons = Array.prototype.slice.call(dropdown.querySelectorAll(':scope > .tab-btn'));
    if(!boutons.length) return;
    var groupesParCle = {};
    var ordreGroupes = [];
    boutons.forEach(function(btn){
        var m = (btn.getAttribute('onclick') || '').match(/showTab\('([^']+)'\)/);
        var tabId = m ? m[1] : null;
        var cle = tabId && VUE_ONGLETS_CATEGORIES[tabId];
        if(!cle){ return; } // onglet non catégorisé (ne devrait pas arriver) : laissé tel quel, hors groupe
        if(!groupesParCle[cle]){
            groupesParCle[cle] = [];
            ordreGroupes.push(cle);
        }
        groupesParCle[cle].push(btn);
    });
    ordreGroupes.forEach(function(cle){
        var info = VUE_ONGLETS_INFO_CATEGORIE[cle] || { icone:'📁', libelle:cle };
        var items = groupesParCle[cle];
        var groupe = document.createElement('div');
        groupe.className = 'onglet-groupe';
        groupe.setAttribute('data-cat', cle);

        var entete = document.createElement('button');
        entete.type = 'button';
        entete.className = 'onglet-groupe-entete';
        entete.innerHTML = '<span class="onglet-groupe-chevron">▸</span> ' + info.icone + ' ' + info.libelle
            + ' <span class="onglet-groupe-compte">(' + items.length + ')</span>';
        entete.onclick = function(e){
            e.stopPropagation();
            groupe.classList.toggle('ouvert');
        };
        groupe.appendChild(entete);

        items.forEach(function(btn){ groupe.appendChild(btn); }); // déplace (pas de clonage)
        dropdown.appendChild(groupe);
    });
    dropdown.dataset.groupe = '1';
}

function vueOngletsAppliquer(mode){
    var nav = document.getElementById('phaseNav');
    if(nav) nav.classList.toggle('vue-reduite', mode === 'reduite');
    document.querySelectorAll('.phase-dropdown').forEach(function(dropdown){
        if(mode === 'reduite') vueOngletsGrouperPhase(dropdown);
    });
    var btn = document.getElementById('vue-onglets-toggle');
    if(btn) btn.textContent = mode === 'reduite' ? '☰ Vue complète' : '▤ Vue réduite par catégorie';
    try{ localStorage.setItem(VUE_ONGLETS_CLE, mode); }catch(e){}
}

window.vueOngletsBasculer = function(){
    var actuel = (document.getElementById('phaseNav') || {}).classList;
    var enReduite = actuel && actuel.contains('vue-reduite');
    vueOngletsAppliquer(enReduite ? 'complete' : 'reduite');
};

function vueOngletsInit(){
    var nav = document.getElementById('phaseNav');
    if(!nav) return;
    var bar = nav.parentElement;
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.id = 'vue-onglets-toggle';
    btn.className = 'vue-onglets-toggle-btn';
    btn.onclick = window.vueOngletsBasculer;
    if(bar) bar.insertBefore(btn, nav.nextSibling);

    var prefere = 'complete';
    try{ prefere = localStorage.getItem(VUE_ONGLETS_CLE) || 'complete'; }catch(e){}
    vueOngletsAppliquer(prefere);
}

try{
    if(typeof document !== 'undefined'){
        if(document.readyState === 'loading')
            document.addEventListener('DOMContentLoaded', vueOngletsInit);
        else
            vueOngletsInit();
    }
}catch(e){}
