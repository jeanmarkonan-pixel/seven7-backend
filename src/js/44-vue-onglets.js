/* ==================================================================
   SEVEN7 — ARBORESCENCE a→u, VUE REGROUPÉE PAR ÉTAPE (21/08/2026)

   43 onglets (hors Messagerie, épinglée à part) — trop pour un menu
   déroulant à plat. Ce module les regroupe par ÉTAPE DE MISSION, dans
   l'ordre a→u défini pour le cabinet : chaque lettre correspond à un
   groupe dépliable, dans son ordre — pas à l'ordre d'apparition dans
   le DOM ni à l'ordre historique de création du code.

   CHOIX D'ARCHITECTURE : regroupement de NAVIGATION uniquement. Chaque
   onglet garde son identifiant d'origine, sa sauvegarde Firestore par
   onglet (data-tab) et tout son code de calcul intacts — aucune fusion
   de panneaux ni de synchronisation. Une lettre qui réunit plusieurs
   onglets historiques (ex. e. Balance générale = balance-n1 + balance-n)
   affiche donc plusieurs boutons distincts sous un même en-tête repliable,
   pas un panneau unique. C'est délibérément le choix le moins risqué sur
   une application en production : fusionner réellement les panneaux
   aurait supposé réécrire des dizaines de références croisées et la
   synchronisation par onglet, pour un app déjà utilisé par des clients.

   Quelques onglets n'avaient pas de lettre explicite dans l'arborescence
   d'origine ; ils ont reçu un rattachement par défaut, documenté ici :
     - questionnaire (renommé Risque du CI), continuite → c (Évaluation des
       risques). risque-inherent y a été ajouté (28/08) ; fraude retiré.
     - programme                              → d (Planification)
     - revue, detection                       → h (États financiers : les
       contrôles automatiques qui suivent le calcul du bilan/résultat)
     - calendrier                             → l (fiscal/social)
     - anorm-fourn, anorm-clients              → f (Balance tiers : ce sont
       déjà les écarts qu'affiche cette balance)
     - anomalies-non-corrigees (ISA 450)       → s (Traitement de la réponse
       à la note de synthèse, avec le test des écritures)
     - affirmations (lettre d'affirmation)     → t (juste avant le choix de
       l'opinion, dont elle est un élément probant)
     - recommandations, revue-dossier          → u (Rapport)
     - referentiel, pcg-syscohada              → matériel de consultation,
       hors séquence a→u (groupe « Références » à part, en fin de liste)

   ecritures et parties-liees sont passés de la phase 2 à la phase 3
   dans 33-diligences-normatives.js pour que leurs boutons vivent dans
   le même phase-dropdown que le reste de leur lettre (s et p) — seul le
   champ phase a changé, jamais l'identifiant ni les données.

   Chargé EN DERNIER (voir build/manifeste.json) : les onglets ajoutés
   par injection (32, 33, 36, 47…) s'insèrent eux-mêmes dans le DOM à
   leur propre chargement — ce module doit tourner APRÈS eux pour les
   regrouper aussi, pas seulement les onglets statiques d'app.html. Les
   écouteurs DOMContentLoaded se déclenchent dans leur ordre d'attachement
   (donc l'ordre des fichiers dans le manifeste), c'est ce qui garantit
   l'ordre ici.
   ================================================================== */

var VUE_ONGLETS_CATEGORIES = {
    identification:'a',
    'faits-exercice':'b',
    questionnaire:'c', 'risque-inherent':'c', risques:'c', continuite:'c',
    planification:'d', programme:'d',
    'balance-n1':'e', 'balance-n':'e',
    'tiers-fourn':'f', 'tiers-clients':'f', 'anorm-fourn':'f', 'anorm-clients':'f',
    'circ-fourn':'g', 'circ-clients':'g',
    bilan:'h', resultat:'h', revue:'h', detection:'h',
    'selection-comptes':'i',
    'gl-bilan':'j', 'gl-gestion':'j',
    'controle-gl-sondage':'k',
    impots:'l', calendrier:'l',
    'indemnite-retraite':'m', 'conges-payes':'m',
    estimations:'n',
    'evenements-post':'o',
    'verifications-legales':'p', 'parties-liees':'p',
    'communication-gouvernance':'q',
    synthese:'r',
    ecritures:'s', 'anomalies-non-corrigees':'s',
    'choix-opinion':'t', affirmations:'t',
    redaction:'u', recommandations:'u', 'revue-dossier':'u',
    referentiel:'ref', 'pcg-syscohada':'ref'
};

var VUE_ONGLETS_ORDRE = ['a','b','c','d','e','f','g','h','i','j','k','l','m','n','o','p','q','r','s','t','u','ref'];

var VUE_ONGLETS_INFO_CATEGORIE = {
    a: { icone:'🏢', libelle:'a. Fiche d’identification' },
    b: { icone:'📌', libelle:'b. Faits marquants' },
    c: { icone:'🎯', libelle:'c. Évaluation des risques' },
    d: { icone:'📊', libelle:'d. Planification' },
    e: { icone:'📥', libelle:'e. Balance générale' },
    f: { icone:'🧪', libelle:'f. Balance tiers' },
    g: { icone:'📨', libelle:'g. Tiers à circulariser' },
    h: { icone:'⚖️', libelle:'h. États financiers' },
    i: { icone:'🎯', libelle:'i. Comptes à auditer' },
    j: { icone:'📚', libelle:'j. Grand livre' },
    k: { icone:'🧪', libelle:'k. Grand livre sondage' },
    l: { icone:'🏛️', libelle:'l. Revue fiscale & sociale / Impôts et taxes' },
    m: { icone:'👴', libelle:'m. Analyses des provisions' },
    n: { icone:'📐', libelle:'n. Estimations comptables' },
    o: { icone:'📅', libelle:'o. Événements postérieurs' },
    p: { icone:'⚖️', libelle:'p. Vérifications spéci. & obligations' },
    q: { icone:'📣', libelle:'q. Communication à la gouvernance' },
    r: { icone:'📝', libelle:'r. Note de synthèse' },
    s: { icone:'🔎', libelle:'s. Traitement de la réponse à la note de synthèse' },
    t: { icone:'⚖️', libelle:'t. Choix de l’opinion à opérer' },
    u: { icone:'📄', libelle:'u. Rapport' },
    ref: { icone:'📚', libelle:'Références' }
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
    boutons.forEach(function(btn){
        var m = (btn.getAttribute('onclick') || '').match(/showTab\('([^']+)'\)/);
        var tabId = m ? m[1] : null;
        var cle = tabId && VUE_ONGLETS_CATEGORIES[tabId];
        if(!cle){ return; } // onglet non catégorisé (ne devrait pas arriver) : laissé tel quel, hors groupe
        if(!groupesParCle[cle]) groupesParCle[cle] = [];
        groupesParCle[cle].push(btn);
    });
    // Ordre canonique a→u (pas l'ordre d'apparition dans le DOM) : seules les lettres
    // réellement présentes dans CE phase-dropdown sont retenues, dans cet ordre.
    var ordreGroupes = VUE_ONGLETS_ORDRE.filter(function(cle){ return groupesParCle[cle]; });
    ordreGroupes.forEach(function(cle){
        var info = VUE_ONGLETS_INFO_CATEGORIE[cle] || { icone:'📁', libelle:cle };
        var items = groupesParCle[cle];
        var groupe = document.createElement('div');
        // Ouverte par défaut : ouvrir une phase doit montrer ses onglets directement,
        // pas exiger un second clic par catégorie. Le repli reste possible (bascule au
        // clic sur l'en-tête) pour l'auditeur qui veut alléger l'affichage lui-même.
        groupe.className = 'onglet-groupe ouvert';
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
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.id = 'vue-onglets-toggle';
    btn.className = 'vue-onglets-toggle-btn';
    btn.onclick = window.vueOngletsBasculer;
    // Dans la sidebar (pas à côté d'elle) : premier élément, au-dessus des 3 accordéons.
    nav.insertBefore(btn, nav.firstChild);

    // Vue regroupée a→u par défaut : c'est désormais l'arborescence de référence du
    // cabinet. La préférence par appareil (localStorage) reste prioritaire si un
    // auditeur a explicitement choisi la vue complète à plat.
    var prefere = 'reduite';
    try{ prefere = localStorage.getItem(VUE_ONGLETS_CLE) || 'reduite'; }catch(e){}
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
