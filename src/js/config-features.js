/* ==================================================================
   FEATURES — POINT DE CONTRÔLE UNIQUE DES DRAPEAUX DE FONCTIONNALITÉ

   Fermeture contrôlée du module Liasse (11/08/2026) : voir
   CHANGELOG_FERMETURE_LIASSE.md. Aucune autre partie du code ne doit
   dupliquer cette condition — tout point qui a besoin de savoir si la
   liasse est ouverte appelle liasseModuleActif(dossierId), ici.

   Ordre de priorité (§2.2 du prompt de fermeture) :
     1. config_globale/features (Firestore), si le document existe —
        permet d'ouvrir à distance, sans redéploiement ;
     2. sinon, les valeurs par défaut ci-dessous.

   firestore.rules applique le MÊME principe côté serveur (voir
   liasseAccessible() dans firestore.rules) : ce fichier ne fait que
   refléter, côté interface, ce que le serveur imposera de toute façon.
   Un masquage ici sans la barrière côté règles ne serait qu'un
   affichage trompeur (§12, déjà établi ailleurs dans ce projet).
   ================================================================== */

var FEATURES = {
    LIASSE_ENABLED: false,
    LIASSE_WAITLIST_ENABLED: true,
    LIASSE_TARGET_LABEL: 'Exercice 2027',
};

// Liste blanche par défaut si Firestore ne la précise pas — vide : la
// liste réelle des testeurs vit dans config_globale/features.liasse_beta_dossiers,
// jamais codée en dur ici (même principe que /plans pour les paliers).
var LIASSE_BETA_DOSSIERS_PAR_DEFAUT = [];

var _configGlobaleFeatures = null;
var _configGlobaleFeaturesPromise = null;

// Charge config_globale/features UNE fois (mise en cache), à appeler dès
// qu'un dossier s'ouvre (voir 10-config-collaboration.js). Les lectures
// synchrones de liasseModuleActif() ci-dessous s'appuient sur ce cache :
// tant qu'il n'a pas résolu, elles retombent sur FEATURES (fermé par
// défaut), jamais sur une supposition d'ouverture.
function chargerConfigGlobaleFeatures(db){
    if(_configGlobaleFeaturesPromise) return _configGlobaleFeaturesPromise;
    if(!db){ return Promise.resolve(null); }
    _configGlobaleFeaturesPromise = db.collection('config_globale').doc('features').get()
        .then(function(doc){
            _configGlobaleFeatures = doc.exists ? (doc.data() || {}) : null;
            return _configGlobaleFeatures;
        })
        .catch(function(){ _configGlobaleFeatures = null; return null; });
    return _configGlobaleFeaturesPromise;
}

function liasseBetaDossiers(){
    return (_configGlobaleFeatures && Array.isArray(_configGlobaleFeatures.liasse_beta_dossiers))
        ? _configGlobaleFeatures.liasse_beta_dossiers
        : LIASSE_BETA_DOSSIERS_PAR_DEFAUT;
}

function liasseModuleActif(dossierId){
    if(dossierId && liasseBetaDossiers().indexOf(dossierId) !== -1) return true;
    if(_configGlobaleFeatures && typeof _configGlobaleFeatures.LIASSE_ENABLED === 'boolean'){
        return _configGlobaleFeatures.LIASSE_ENABLED;
    }
    return FEATURES.LIASSE_ENABLED;
}

// ---------- §3.1 : badge « Bientôt disponible » sur l'onglet LIASSE ----------
function appliquerBadgeLiasseFermee(dossierId){
    var btn = document.getElementById('btn-interface-liasse');
    var badge = document.getElementById('btn-interface-liasse-badge');
    if(!btn || !badge) return;
    var ferme = !liasseModuleActif(dossierId);
    btn.classList.toggle('liasse-fermee', ferme);
    badge.style.display = ferme ? 'inline-block' : 'none';
}

// ---------- §3.3 : formulaire de liste d'attente ----------
function ouvrirFormulaireAttenteLiasse(participerValidation){
    var form = document.getElementById('liasse-waitlist-form');
    if(!form) return;
    form.style.display = 'block';
    var cb = document.getElementById('lw-validation');
    if(cb) cb.checked = !!participerValidation;
    form.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function soumettreAttenteLiasse(){
    var erreurEl = document.getElementById('liasse-waitlist-erreur');
    var succesEl = document.getElementById('liasse-waitlist-succes');
    erreurEl.style.display = 'none'; succesEl.style.display = 'none';

    var val = function(id){ var el = document.getElementById(id); return el ? el.value.trim() : ''; };
    var cabinet = val('lw-cabinet'), contact = val('lw-contact'), email = val('lw-email');
    if(!cabinet || !contact || !email){
        erreurEl.textContent = "Merci de renseigner au moins le nom du cabinet, le contact et l'adresse électronique.";
        erreurEl.style.display = 'block';
        return;
    }
    if(!window.SEVEN7_DB){
        erreurEl.textContent = 'Connexion à un dossier requise avant de vous inscrire.';
        erreurEl.style.display = 'block';
        return;
    }
    var participation = document.getElementById('lw-validation');
    // Enregistrement en V1, sans envoi de courriel automatique (§3.3) :
    // le message de confirmation à l'écran EST la confirmation.
    window.SEVEN7_DB.collection('liasse_waitlist').add({
        nomCabinet: cabinet,
        contact: contact,
        fonction: val('lw-fonction'),
        email: email,
        telephone: val('lw-telephone'),
        nombreDossiersParExercice: val('lw-nb-dossiers') ? Number(val('lw-nb-dossiers')) : null,
        participerValidation: !!(participation && participation.checked),
        dossierOrigine: window.SEVEN7_DOSSIER_ID || null,
        planSouscrit: window.SEVEN7_PLAN_CABINET || null,
        horodatage: firebase.firestore.FieldValue.serverTimestamp(),
    }).then(function(){
        succesEl.textContent = "✅ Inscription enregistrée. Nous vous préviendrons dès l'ouverture du module.";
        succesEl.style.display = 'block';
        document.getElementById('liasse-waitlist-form').querySelectorAll('input').forEach(function(el){
            if(el.type === 'checkbox') el.checked = false; else el.value = '';
        });
    }).catch(function(err){
        erreurEl.textContent = "Impossible d'enregistrer votre inscription : " + (err && err.message ? err.message : err);
        erreurEl.style.display = 'block';
    });
}
