/* ==================================================================
   SEVEN7 — ÉCHANTILLON CHARGES & VENTES : UN SEUL ONGLET

   Les onglets « Charges à contrôler » et « Ventes à contrôler »
   portaient exactement les mêmes colonnes, les mêmes seuils et le même
   mécanisme de scan de facture : seule la nature d'écriture changeait.
   Ils sont réunis sous un seul onglet, avec un sélecteur de nature.

   L'IDENTIFIANT « ventes » EST CONSERVÉ sur le bloc désormais interne.
   C'est délibéré : la sauvegarde par onglet restaure le contenu en
   cherchant l'élément par son identifiant, et les conclusions saisies
   sur les écritures de vente vivent dans ce HTML. Le supprimer aurait
   fait perdre leur travail aux dossiers déjà ouverts.
   ================================================================== */

/** Affiche l'une des deux natures et mémorise le choix. */
function echAfficher(nature){
    var estVente = (nature === 'Vente');
    var bc = document.getElementById('charges-bloc');
    var bv = document.getElementById('ventes');
    if(bc) bc.style.display = estVente ? 'none' : '';
    if(bv) bv.style.display = estVente ? '' : 'none';

    var btc = document.getElementById('ech-btn-charge');
    var btv = document.getElementById('ech-btn-vente');
    if(btc) btc.className = estVente ? 'btn' : 'btn btn-primary';
    if(btv) btv.className = estVente ? 'btn btn-primary' : 'btn';

    try{ localStorage.setItem('seven7_ech_nature', nature); }catch(e){}
}

function echInstaller(){
    if(!document.getElementById('charges-bloc')) return;
    var choix = 'Charge';
    try{ choix = localStorage.getItem('seven7_ech_nature') || 'Charge'; }catch(e){}
    echAfficher(choix);
}

try{
    if(typeof document !== 'undefined'){
        if(document.readyState === 'loading')
            document.addEventListener('DOMContentLoaded', echInstaller);
        else
            echInstaller();
    }
}catch(e){}
