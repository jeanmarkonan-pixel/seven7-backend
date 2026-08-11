/* ==================================================================
   SEVEN7 — INSTALLATION MOBILE ET MISE À JOUR

   Deux besoins que le seul déploiement ne couvre pas :

   1. L'application doit s'INSTALLER sur le téléphone du collaborateur,
      avec son icône et son écran de démarrage, plutôt que d'être un
      onglet perdu dans le navigateur.

   2. Une version corrigée doit ATTEINDRE ce téléphone. Un outil
      d'audit qui tourne sur un moteur comptable périmé produit des
      états faux sans que personne s'en aperçoive : c'est le risque
      le plus sérieux d'une application installée.

   Le service worker travaille en réseau d'abord ; ce module prévient
   l'utilisateur dès qu'une version plus récente est prête, et lui
   laisse la main pour recharger — jamais en pleine saisie sans
   l'avertir.
   ================================================================== */

/* Bandeau discret, en bas d'écran, qui n'occulte rien. */
function pwaBandeau(texte, libelleAction, action){
    var id = 'pwa-bandeau';
    var vieux = document.getElementById(id);
    if(vieux) vieux.remove();

    var d = document.createElement('div');
    d.id = id;
    d.style.cssText = 'position:fixed; left:12px; right:12px; bottom:12px; z-index:9999;'
        + 'background:#1B2A4A; color:#fff; padding:12px 14px; border-radius:8px;'
        + 'box-shadow:0 4px 18px rgba(0,0,0,.3); font-size:13px; display:flex;'
        + 'align-items:center; gap:12px; flex-wrap:wrap; max-width:640px; margin:0 auto;';
    var t = document.createElement('span');
    t.style.cssText = 'flex:1; min-width:180px;';
    t.textContent = texte;
    d.appendChild(t);

    if(action){
        var b = document.createElement('button');
        b.type = 'button';
        b.textContent = libelleAction;
        b.style.cssText = 'background:#B8975A; color:#fff; border:none; padding:8px 14px;'
            + 'border-radius:6px; font-weight:600; cursor:pointer; font-size:13px;';
        b.onclick = function(){ d.remove(); action(); };
        d.appendChild(b);
    }
    var f = document.createElement('button');
    f.type = 'button';
    f.textContent = '✕';
    f.setAttribute('aria-label', 'Fermer');
    f.style.cssText = 'background:transparent; color:#cfd8e8; border:none; cursor:pointer;'
        + 'font-size:16px; padding:4px 6px;';
    f.onclick = function(){ d.remove(); };
    d.appendChild(f);

    document.body.appendChild(d);
    return d;
}

/* ---------- Mise à jour ---------- */
function pwaEnregistrerSW(){
    if(!('serviceWorker' in navigator)) return;
    /* Le protocole file:// ne supporte pas les service workers : inutile
       de tenter, et inutile d'inquiéter avec une erreur en console. */
    if(location.protocol !== 'https:' && location.hostname !== 'localhost') return;

    navigator.serviceWorker.register('sw.js').then(function(reg){
        /* Une version plus récente est téléchargée et attend son tour. */
        reg.addEventListener('updatefound', function(){
            var nouveau = reg.installing;
            if(!nouveau) return;
            nouveau.addEventListener('statechange', function(){
                if(nouveau.state === 'installed' && navigator.serviceWorker.controller){
                    pwaBandeau(
                        "Une version plus récente de SEVEN7 est prête. "
                      + "Rechargez pour en bénéficier — vos saisies en cours sont conservées.",
                        "Recharger",
                        function(){
                            try{ nouveau.postMessage('SEVEN7_ACTIVER_MAINTENANT'); }catch(e){}
                            location.reload();
                        });
                }
            });
        });
        /* Vérification à chaque ouverture, puis toutes les heures pour
           les postes qui restent ouverts plusieurs jours. Insuffisant à lui
           seul : un onglet ou une PWA mise en arrière-plan voit ses timers
           gelés ou fortement ralentis par le navigateur/l'OS (mobile
           surtout), donc setInterval seul peut ne jamais se déclencher tant
           que l'utilisateur n'a pas explicitement fermé puis rouvert
           l'application — une nouvelle version déployée reste alors
           invisible, sans bandeau, potentiellement pendant des jours. On
           revérifie donc aussi explicitement à chaque retour au premier
           plan (visibilitychange), qui se déclenche de façon fiable côté
           navigateur/PWA quand l'utilisateur revient sur l'app. */
        try{ reg.update(); }catch(e){}
        setInterval(function(){ try{ reg.update(); }catch(e){} }, 3600000);
        document.addEventListener('visibilitychange', function(){
            if(document.visibilityState === 'visible'){ try{ reg.update(); }catch(e){} }
        });
    }).catch(function(){ /* l'application fonctionne sans */ });

    /* Le service worker a pris la main : on recharge une seule fois. */
    var recharge = false;
    navigator.serviceWorker.addEventListener('controllerchange', function(){
        if(recharge) return;
        recharge = true;
    });
}

/* ---------- Installation ---------- */
var PWA_INVITE = null;

function pwaProposerInstallation(){
    window.addEventListener('beforeinstallprompt', function(e){
        e.preventDefault();
        PWA_INVITE = e;
        var vu = null;
        try{ vu = localStorage.getItem('seven7_pwa_refus'); }catch(err){}
        if(vu) return;
        pwaBandeau(
            "Installez SEVEN7 sur votre appareil : accès direct, plein écran, "
          + "et vos dossiers restent consultables hors connexion.",
            "Installer",
            function(){
                if(!PWA_INVITE) return;
                PWA_INVITE.prompt();
                PWA_INVITE.userChoice.then(function(r){
                    if(r && r.outcome !== 'accepted'){
                        try{ localStorage.setItem('seven7_pwa_refus', '1'); }catch(err){}
                    }
                    PWA_INVITE = null;
                });
            });
    });
}

/** L'application tourne-t-elle en mode installé ? */
function pwaEstInstallee(){
    try{
        return window.matchMedia('(display-mode: standalone)').matches
            || window.navigator.standalone === true;
    }catch(e){ return false; }
}

/* ---------- Lisibilité des tableaux sur petit écran ----------
   Une bonne partie des tableaux dépassent la largeur d'un téléphone.
   Sans conteneur défilant, leurs dernières colonnes — souvent la
   conclusion et le bouton de suppression — deviennent inatteignables.
   On enveloppe donc ceux qui ne le sont pas déjà.                    */
function pwaEnvelopperTableaux(){
    var tables = document.querySelectorAll('.tab-content table');
    var n = 0;
    for(var i = 0; i < tables.length; i++){
        var t = tables[i];
        if(t.closest('.scroll-table') || t.closest('.scroll-x')) continue;
        var box = document.createElement('div');
        box.className = 'scroll-x';
        t.parentNode.insertBefore(box, t);
        box.appendChild(t);
        n++;
    }
    return n;
}

function pwaInstaller(){
    try{ pwaEnregistrerSW(); }catch(e){}
    try{ pwaProposerInstallation(); }catch(e){}
    try{ pwaEnvelopperTableaux(); }catch(e){}
}

try{
    if(typeof document !== 'undefined' && typeof window !== 'undefined'){
        if(document.readyState === 'loading')
            document.addEventListener('DOMContentLoaded', pwaInstaller);
        else
            pwaInstaller();
    }
}catch(e){}
