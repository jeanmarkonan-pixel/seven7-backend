/* Généré par build/version.mjs — ne pas modifier à la main.
   Régénérer avec `npm run estampiller`, puis `npm run build`. */
var SEVEN7_VERSION = {
    version: "2.9.0",
    commit:  "0274ca5",
    date:    "2026-08-08",
    propre:  true
};

/* Rend l'estampille lisible : "v2.9.0 · bc32dcb · 2026-08-03".
   Un dépôt qui portait des modifications non committées au moment de
   l'estampillage est signalé, pour qu'un livrable bricolé ne puisse pas
   se faire passer pour une version propre. */
function seven7VersionTexte(){
    var v = SEVEN7_VERSION;
    return 'v' + v.version + ' · ' + v.commit + (v.propre ? '' : '+modifié') + ' · ' + v.date;
}

function seven7AfficherVersion(){
    var texte = seven7VersionTexte();
    var ids = ['seven7-version', 'seven7-version-lock'];
    for(var i = 0; i < ids.length; i++){
        var el = document.getElementById(ids[i]);
        if(el) el.textContent = texte;
    }
}

/* Auto-branchement : ce module est le premier du bundle, le DOM n'existe
   pas encore quand il s'évalue. On attend donc le chargement, sans
   dépendre de l'orchestrateur d'initialisation du reste du code. */
try{
    if(typeof document !== 'undefined'){
        if(document.readyState === 'loading')
            document.addEventListener('DOMContentLoaded', seven7AfficherVersion);
        else
            seven7AfficherVersion();
    }
}catch(e){}
