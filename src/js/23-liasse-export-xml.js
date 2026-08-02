// ============================================================
// EXPORT XML EDI — TELEDECLARATION DGI (e-impôts) — Côte d'Ivoire
// Reproduit le schéma XML officiel "EDI_Mappage" (informations /
// champsTableauxFixes / champsTableauxVariables) et les codes de champs
// exacts du modèle Excel DGI (format NO_<TABLEAU>_<CODE_LIGNE>_<POSITION_COLONNE>)
// pour les 4 états déjà calculés automatiquement par l'application :
// BILAN ACTIF, BILAN PASSIF, COMPTE DE RESULTAT et TFT.
// Les Notes annexes (1 à 39) et les Fiches R1-R4 ne sont pas encore
// couvertes par cet export : elles utilisent d'autres codes de champs
// (souvent positionnels) qui nécessiteraient une saisie structurée
// supplémentaire, absente de l'application à ce stade.
// ============================================================

function liasseXmlEsc(v){
    return String(v===undefined||v===null?'':v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}
// Montants en Francs CFA : arrondi à l'unité, comme le reste de l'application (liasseFmt).
function liasseXmlNum(n){
    n = Math.round(n || 0);
    if(Object.is(n, -0)) n = 0;
    return String(n);
}

function liasseCollecterChampsFixesXML(){
    var champs = [];

    // ---- ACTIF : colonnes 1=BRUT, 2=AMORT/DEPREC., 3=NET, 4=NET (N-1) ----
    var aN = liasseGetActif('n'), aN1 = liasseGetActif('n1');
    (LIASSE_DATA.actifLines || []).forEach(function(l){
        var n = aN[l.ref] || {brut:0, amort:0, net:0};
        var n1 = aN1[l.ref] || {brut:0, amort:0, net:0};
        champs.push(['NO_ACTIF_'+l.ref+'_1', liasseXmlNum(n.brut)]);
        champs.push(['NO_ACTIF_'+l.ref+'_2', liasseXmlNum(n.amort)]);
        champs.push(['NO_ACTIF_'+l.ref+'_3', liasseXmlNum(n.net)]);
        champs.push(['NO_ACTIF_'+l.ref+'_4', liasseXmlNum(n1.net)]);
    });

    // ---- PASSIF : colonnes 1=NET, 2=NET (N-1) ----
    var rN = liasseGetResultat('n'), rN1 = liasseGetResultat('n1');
    var pN = liasseGetPassif('n', rN.XI), pN1 = liasseGetPassif('n1', rN1.XI);
    (LIASSE_DATA.passifLines || []).forEach(function(l){
        var n = pN[l.ref] || {net:0};
        var n1 = pN1[l.ref] || {net:0};
        champs.push(['NO_PASSIF_'+l.ref+'_1', liasseXmlNum(n.net)]);
        champs.push(['NO_PASSIF_'+l.ref+'_2', liasseXmlNum(n1.net)]);
    });

    // ---- RESULTAT : colonnes 1=EXERCICE N, 2=EXERCICE N-1 ----
    (LIASSE_DATA.resultatLines || []).forEach(function(l){
        champs.push(['NO_RESULTAT_'+l.ref+'_1', liasseXmlNum(rN[l.ref])]);
        champs.push(['NO_RESULTAT_'+l.ref+'_2', liasseXmlNum(rN1[l.ref])]);
    });

    // ---- TFT : colonnes 1=EXERCICE N, 2=EXERCICE N-1 ----
    var T = liasseGetTFT();
    (typeof TFT_LINES !== 'undefined' ? TFT_LINES : []).filter(function(l){ return !!l.ref; }).forEach(function(l){
        champs.push(['NO_TFT_'+l.ref+'_1', liasseXmlNum(T.n[l.ref])]);
        champs.push(['NO_TFT_'+l.ref+'_2', liasseXmlNum(T.n1[l.ref])]);
    });

    return champs;
}

function liasseSetXmlStatus(msg, kind){
    var el = document.getElementById('liasse-xml-status');
    if(!el) return;
    el.textContent = msg;
    el.className = 'liasse-xml-status' + (kind ? ' ' + kind : '');
}

function liasseGenererXML(){
    var ncc = val('fi-nif');
    var exercice = val('fi-exercice');

    if(!ncc){
        liasseSetXmlStatus('⚠ Merci de renseigner le N° d\'identification fiscale (NIF/NCC) dans la Fiche Identification avant de générer le XML.', 'status-danger');
        return;
    }
    if(!exercice){
        liasseSetXmlStatus('⚠ Merci de renseigner l\'exercice audité dans la Fiche Identification avant de générer le XML.', 'status-danger');
        return;
    }
    var nccClean = ncc.replace(/\s+/g,'').toUpperCase();
    if(!/^\d{7}[A-Z]$/.test(nccClean)){
        liasseSetXmlStatus('⚠ Le NCC doit respecter le format 1234567A (7 chiffres + 1 lettre), sans espace. Valeur saisie : "'+ncc+'".', 'status-danger');
        return;
    }
    var exerciceClean = String(exercice).replace(/\s+/g,'');

    var champs = liasseCollecterChampsFixesXML();

    var xml = '<?xml version="1.0" encoding="UTF-8"?>\n<EDI>\n  <informations>\n'+
        '    <type>NO</type>\n    <ncc>'+liasseXmlEsc(nccClean)+'</ncc>\n    <exercice>'+liasseXmlEsc(exerciceClean)+'</exercice>\n'+
        '  </informations>\n  <champsTableauxFixes>\n'+
        champs.map(function(c){ return '    <champTableauFixe><code>'+c[0]+'</code><valeur>'+c[1]+'</valeur></champTableauFixe>'; }).join('\n')+
        '\n  </champsTableauxFixes>\n  <champsTableauxVariables>\n  </champsTableauxVariables>\n</EDI>\n';

    var now = new Date();
    var pad = function(n){ return ('0'+n).slice(-2); };
    var horodatage = pad(now.getDate())+pad(now.getMonth()+1)+now.getFullYear()+'-'+pad(now.getHours())+pad(now.getMinutes())+pad(now.getSeconds());
    var nomFichier = 'NO-'+exerciceClean+'-'+nccClean+'-'+horodatage+'.xml';

    var blob = new Blob([xml], {type:'application/xml;charset=utf-8'});
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url; a.download = nomFichier;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(function(){ URL.revokeObjectURL(url); }, 4000);

    liasseSetXmlStatus('✅ Fichier généré : '+nomFichier+' — '+champs.length+' champs (BILAN ACTIF/PASSIF, RESULTAT, TFT). Notes annexes non incluses.', 'status-ok');
}

