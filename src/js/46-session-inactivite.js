/* ==================================================================
   SEVEN7 — DÉCONNEXION AUTOMATIQUE APRÈS 30 MINUTES D'INACTIVITÉ

   Réutilise logoutDossierSilencieux() (10-config-collaboration.js),
   qui sauvegarde le dossier avant de recharger l'écran de sélection —
   sans le confirm() bloquant de la déconnexion manuelle, qui n'a pas
   de sens ici : personne n'est là pour y répondre.

   N'agit que s'il existe une session collaborative active (un dossier
   ouvert) : sur l'écran de verrouillage, il n'y a rien à protéger.
   ================================================================== */

var SESSION_INACTIVITE_MS = 30 * 60 * 1000;
var _sessionInactiviteTimer = null;

function sessionInactiviteDeclencher(){
    var lockScreen = document.getElementById('lock-screen');
    var sessionActive = lockScreen && lockScreen.style.display === 'none';
    if(sessionActive && typeof window.logoutDossierSilencieux === 'function'){
        window.logoutDossierSilencieux();
    }
}

function sessionInactiviteReinitialiser(){
    clearTimeout(_sessionInactiviteTimer);
    _sessionInactiviteTimer = setTimeout(sessionInactiviteDeclencher, SESSION_INACTIVITE_MS);
    // Un vrai navigateur n'a pas unref() (id numérique) : ce garde ne change rien en
    // production. Sous Node/jsdom (tests, harnais sans navigateur), il évite qu'un
    // minuteur de 30 minutes retienne le process ouvert jusqu'à son échéance.
    if(_sessionInactiviteTimer && typeof _sessionInactiviteTimer.unref === 'function')
        _sessionInactiviteTimer.unref();
}

function sessionInactiviteInstaller(){
    ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'click'].forEach(function(evt){
        document.addEventListener(evt, sessionInactiviteReinitialiser, { passive: true });
    });
    sessionInactiviteReinitialiser();
}

try{
    if(typeof document !== 'undefined'){
        if(document.readyState === 'loading')
            document.addEventListener('DOMContentLoaded', sessionInactiviteInstaller);
        else
            sessionInactiviteInstaller();
    }
}catch(e){}
