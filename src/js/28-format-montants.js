/* ==================================================================
   SEVEN7 — FORMATAGE UNIFIÉ DE TOUS LES MONTANTS SAISIS
   Les champs de montant étaient des <input type="number"> affichant la
   valeur brute (450000) : sans séparateur, avec les flèches du
   navigateur, le nombre était tronqué visuellement dans les colonnes
   étroites. Ils sont convertis en champs texte formatés « 450 000 ».
   La relecture passe par parseNum, qui accepte tous les formats.
   ================================================================== */

/* Formatage d'une valeur destinée à un champ de saisie */
function fmtSaisie(v){
    if(v === undefined || v === null) return '';
    var brut = String(v).trim();
    if(brut === '') return '';
    var n = parseNum(brut);
    if(n === 0 && !/[0-9]/.test(brut)) return '';
    return n.toLocaleString('fr-FR', {maximumFractionDigits:2});
}
/* Valeur brute pour l'édition (séparateur décimal point, sans milliers) */
function brutSaisie(v){
    if(v === undefined || v === null || String(v).trim() === '') return '';
    var n = parseNum(v);
    return String(n);
}

/* Un champ est-il un champ de MONTANT ?
   Sont exclus : notations (min/max), durées en mois, nombres de jours,
   taux et pourcentages — qui ne doivent pas recevoir de séparateur.   */
function estChampMontant(inp){
    if(!inp || inp.tagName !== 'INPUT') return false;
    if(inp.getAttribute('data-fmt') === 'non') return false;
    var t = (inp.getAttribute('type') || '').toLowerCase();
    if(t !== 'number' && inp.getAttribute('data-montant') !== '1') return false;
    if(inp.hasAttribute('max')) return false;
    if(inp.classList && (inp.classList.contains('nbjours') || inp.classList.contains('pct'))) return false;
    var step = inp.getAttribute('step');
    if(step && parseNum(step) > 0 && parseNum(step) < 1) return false;
    var id = (inp.id || '') + ' ' + (inp.className || '');
    if(/pct|taux|pourcent|percent|seuil-var|rev-seuil/i.test(id)) return false;
    return true;
}

/* Conversion en champ texte formaté */
function convertirChampMontant(inp){
    if(inp.getAttribute('data-montant') === '1') return;
    inp.setAttribute('data-montant', '1');
    inp.setAttribute('type', 'text');
    inp.setAttribute('inputmode', 'decimal');
    inp.classList.add('montant-fmt');
    if(!inp.matches(':focus')) inp.value = fmtSaisie(inp.value);
}

/* Balayage : convertit tous les champs de montant présents dans le DOM */
function formaterTousLesMontants(racine){
    var scope = racine || document;
    var champs;
    try{ champs = scope.querySelectorAll('input[type="number"]'); }catch(e){ return; }
    for(var i = 0; i < champs.length; i++){
        if(estChampMontant(champs[i])) convertirChampMontant(champs[i]);
    }
    /* Reformatage des champs déjà convertis dont la valeur a été réécrite par le code */
    var deja = scope.querySelectorAll('input[data-montant="1"]');
    for(var j = 0; j < deja.length; j++){
        var el = deja[j];
        if(el === document.activeElement) continue;
        var f = fmtSaisie(el.value);
        if(el.value !== f) el.value = f;
    }
}

/* Suspension globale du balayage automatique. Un gros import par lots
   (Grand Livre : plusieurs milliers de lignes, chaque lot posé dans un
   macrotask séparé) déclenche l'observateur ci-dessous à répétition —
   or formaterTousLesMontants(document) rescanne TOUT le document à chaque
   passe (querySelectorAll sur des dizaines de milliers de champs), ce qui
   dégénère en O(n²) et fige l'écran (« la page ne répond plus »), en plus
   des deux causes déjà corrigées le 26/08 (rAF en arrière-plan, course
   avec l'auto-sauvegarde). L'importateur suspend donc ce balayage pour la
   durée du traitement, puis relance un seul passage ciblé sur son tableau.
   Même principe que window.SEVEN7_PAUSE_AUTOSAVE (10-config-collaboration). */
var formatMontantsEnPause = false;
if(typeof window !== 'undefined'){
    window.SEVEN7_PAUSE_FORMAT_MONTANTS = function(pause){ formatMontantsEnPause = !!pause; };
}

/* Édition : valeur brute au focus, valeur formatée à la sortie */
function initFormatageMontants(){
    if(window.__SEVEN7_FMT_INIT) return;
    window.__SEVEN7_FMT_INIT = true;

    document.addEventListener('focusin', function(e){
        var el = e.target;
        if(el && el.getAttribute && el.getAttribute('data-montant') === '1'){
            el.value = brutSaisie(el.value);
            if(el.select) try{ el.select(); }catch(x){}
        }
    }, true);

    document.addEventListener('focusout', function(e){
        var el = e.target;
        if(el && el.getAttribute && el.getAttribute('data-montant') === '1'){
            el.value = fmtSaisie(el.value);
        }
    }, true);

    formaterTousLesMontants(document);

    /* Les lignes de balance, de grand livre et de circularisation sont
       ajoutées dynamiquement : on convertit les champs au fil de l'eau. */
    if(typeof MutationObserver === 'function'){
        var enAttente = false;
        var obs = new MutationObserver(function(){
            if(enAttente || formatMontantsEnPause) return;
            enAttente = true;
            setTimeout(function(){
                enAttente = false;
                if(!formatMontantsEnPause) formaterTousLesMontants(document);
            }, 120);
        });
        try{ obs.observe(document.body, {childList:true, subtree:true}); }catch(e){}
    }
}
if(typeof document !== 'undefined'){
    if(document.readyState === 'loading'){
        document.addEventListener('DOMContentLoaded', initFormatageMontants);
    } else {
        setTimeout(initFormatageMontants, 0);
    }
}

