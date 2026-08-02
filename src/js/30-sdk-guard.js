/* ==================================================================
   SEVEN7 — CONTRÔLE DE CHARGEMENT DU SDK FIREBASE
   Le SDK est chargé depuis www.gstatic.com. Lorsqu'il n'arrive pas
   (absence de connexion, pare-feu, antivirus interceptant le HTTPS,
   extension de blocage), l'application échouait sur « firebase is not
   defined » sans indiquer la cause. Ce module diagnostique la
   situation et l'expose clairement.
   ================================================================== */

function sdkFirebasePresent(){
    return (typeof firebase !== 'undefined') && !!firebase &&
           (typeof firebase.initializeApp === 'function');
}

function sdkFirebaseDetail(){
    var manquants = [];
    if(typeof firebase === 'undefined' || !firebase){
        manquants.push('firebase-app-compat.js', 'firebase-auth-compat.js', 'firebase-firestore-compat.js');
    } else {
        if(typeof firebase.initializeApp !== 'function') manquants.push('firebase-app-compat.js');
        if(typeof firebase.auth !== 'function') manquants.push('firebase-auth-compat.js');
        if(typeof firebase.firestore !== 'function') manquants.push('firebase-firestore-compat.js');
    }
    return manquants;
}

function sdkAfficherBandeau(){
    if(document.getElementById('sdk-bandeau')) return;
    var manquants = sdkFirebaseDetail();
    var d = document.createElement('div');
    d.id = 'sdk-bandeau';
    d.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:99999;background:#7a1f1f;color:#fff;'+
        'padding:14px 18px;font-family:system-ui,Arial,sans-serif;font-size:13px;line-height:1.6;'+
        'box-shadow:0 2px 10px rgba(0,0,0,.3);';
    d.innerHTML =
        '<b>\u26a0 Le SDK Firebase n\u2019a pas pu \u00eatre charg\u00e9 \u2014 la connexion au dossier est impossible.</b><br>'+
        'Scripts non charg\u00e9s\u00a0: <code style="background:rgba(255,255,255,.15);padding:1px 5px;border-radius:3px;">'+
        (manquants.join('</code>, <code style="background:rgba(255,255,255,.15);padding:1px 5px;border-radius:3px;">') || 'ind\u00e9termin\u00e9') + '</code><br>'+
        'Ils proviennent de <b>www.gstatic.com</b>. V\u00e9rifiez\u00a0: connexion Internet active&nbsp;\u2022&nbsp;acc\u00e8s \u00e0 gstatic.com non bloqu\u00e9 '+
        'par le pare-feu, l\u2019antivirus ou une extension de navigateur&nbsp;\u2022&nbsp;page ouverte en HTTPS ou en local, pas depuis une archive compress\u00e9e.'+
        '<div style="margin-top:10px;">'+
        '<button onclick="location.reload()" style="background:#fff;color:#7a1f1f;border:none;padding:6px 14px;'+
        'border-radius:3px;font-weight:700;cursor:pointer;margin-right:8px;">Recharger la page</button>'+
        '<button onclick="document.getElementById(\'sdk-bandeau\').remove();document.body.style.paddingTop=\'\';" '+
        'style="background:transparent;color:#fff;border:1px solid rgba(255,255,255,.6);padding:6px 14px;'+
        'border-radius:3px;cursor:pointer;">Masquer</button>'+
        '<span style="margin-left:12px;opacity:.85;">Les onglets de calcul (balances, liasse, cycles) restent utilisables hors connexion.</span>'+
        '</div>';
    document.body.appendChild(d);
    document.body.style.paddingTop = (d.offsetHeight || 96) + 'px';
}

/* Appelée avant toute utilisation du SDK. Renvoie false et signale
   au lieu de laisser remonter « firebase is not defined ».          */
function sdkVerifierFirebase(){
    if(sdkFirebasePresent()) return true;
    try{ sdkAfficherBandeau(); }catch(e){}
    return false;
}

/* Les balises <script src> du SDK sont plus haut dans la page : on
   laisse au navigateur le temps de les exécuter avant de conclure.  */
if(typeof document !== 'undefined'){
    var sdkControle = function(){
        var essais = 0;
        var tick = function(){
            if(sdkFirebasePresent()) return;
            if(++essais >= 12){ try{ sdkAfficherBandeau(); }catch(e){} return; }
            setTimeout(tick, 500);
        };
        setTimeout(tick, 800);
    };
    try{
        if(document.readyState === 'complete') sdkControle();
        else if(typeof window !== 'undefined' && window.addEventListener) window.addEventListener('load', sdkControle);
        else sdkControle();
    }catch(e){}
}
