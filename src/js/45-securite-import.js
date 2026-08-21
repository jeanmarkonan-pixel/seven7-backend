/* ==================================================================
   SEVEN7 — IMPORT SÉCURISÉ DES CSV (BALANCES ET GRAND LIVRE)

   Tout se passe dans le navigateur : il n'y a pas de serveur Node qui
   reçoit ces fichiers (voir 10-config-collaboration.js, Firebase est
   appelé directement côté client). « Nettoyage mémoire » signifie donc
   ici : ne jamais conserver le texte brut du fichier au-delà de son
   traitement, et laisser le champ <input type="file"> revenir à vide
   après import.

   Deux points servis ici :
   - validation du fichier (extension/MIME .csv, 5 Mo maximum) ;
   - mapping des colonnes par en-tête (regex), sans imposer d'ordre
     fixe, avec repli sur l'ordre historique si aucun en-tête n'est
     reconnu (fichier "brut", sans ligne de titres) ;
   - filtre des comptes de centralisation (1 à 3 chiffres) — ne
     s'applique qu'à l'import fichier, pas au collage historique, qui
     reste inchangé par ailleurs.
   ================================================================== */

var SEC_CSV_MAX_OCTETS = 5 * 1024 * 1024;
var SEC_CSV_MIME_ACCEPTES = ['text/csv', 'application/vnd.ms-excel', 'application/csv', 'text/plain', ''];

function secValiderFichierCSV(file){
    if(!file) return { ok:false, erreur:'Aucun fichier sélectionné.' };
    if(!/\.csv$/i.test(file.name || ''))
        return { ok:false, erreur:'Le fichier doit avoir l’extension .csv.' };
    if(file.type && SEC_CSV_MIME_ACCEPTES.indexOf(file.type) === -1)
        return { ok:false, erreur:'Type de fichier non reconnu comme CSV (' + file.type + ').' };
    if(file.size > SEC_CSV_MAX_OCTETS)
        return { ok:false, erreur:'Fichier trop volumineux (' + (file.size/1024/1024).toFixed(1) + ' Mo) — 5 Mo maximum.' };
    return { ok:true };
}

// Lit le fichier puis appelle onTexte(texte) une seule fois ; ne garde aucune
// référence au FileReader ni au texte au-delà de l'appel.
function secLireFichierTexte(file, onTexte, onErreur){
    var reader = new FileReader();
    reader.onload = function(){
        var texte = String(reader.result || '');
        reader = null;
        onTexte(texte);
        texte = null;
    };
    reader.onerror = function(){
        reader = null;
        var msg = 'Lecture du fichier impossible.';
        if(onErreur) onErreur(msg); else secToast('⚠ ' + msg);
    };
    reader.readAsText(file, 'UTF-8');
}

/* ---------- Comptes de centralisation ---------- */
// Un compte à 1, 2 ou 3 chiffres est une masse ou une centralisation
// (ex: "4", "40", "401"), pas une écriture de détail : on l'écarte.
function secEstCompteCentralisation(compte){
    var chiffres = String(compte || '').replace(/\D/g, '');
    return chiffres.length > 0 && chiffres.length <= 3;
}

/* ---------- Délimiteur et découpage CSV (gère les champs entre guillemets) ---------- */
function secDetecterDelimiteur(ligne){
    var candidats = [';', ',', '\t'];
    var meilleur = ';', max = -1;
    candidats.forEach(function(d){
        var n = ligne.split(d).length - 1;
        if(n > max){ max = n; meilleur = d; }
    });
    return meilleur;
}
function secDecouperLigneCSV(ligne, delim){
    var champs = [], cur = '', enGuillemets = false;
    for(var i = 0; i < ligne.length; i++){
        var c = ligne[i];
        if(enGuillemets){
            if(c === '"'){
                if(ligne[i+1] === '"'){ cur += '"'; i++; }
                else enGuillemets = false;
            } else cur += c;
        } else {
            if(c === '"') enGuillemets = true;
            else if(c === delim){ champs.push(cur); cur = ''; }
            else cur += c;
        }
    }
    champs.push(cur);
    return champs;
}

/* ---------- Mapping des colonnes par en-tête, sans ordre fixe ---------- */
function secNormaliserEntete(s){
    var t = String(s || '').toUpperCase()
        .replace(/[ÀÂÄÁ]/g, 'A').replace(/[ÈÉÊË]/g, 'E').replace(/[ÌÍÎÏ]/g, 'I')
        .replace(/[ÒÓÔÖ]/g, 'O').replace(/[ÙÚÛÜ]/g, 'U').replace(/Ç/g, 'C');
    return t.replace(/[^A-Z0-9]/g, '');
}
var SEC_CHAMPS_BALANCE = [
    ['intitule',        /INTITULE|LIBELLECOMPTE|NOMCOMPTE/],
    ['ouvertureDebit',  /OUVERTURE.*DEBIT|^OD$/],
    ['ouvertureCredit', /OUVERTURE.*CREDIT|^OC$/],
    ['mouvementDebit',  /MOUVEMENT.*DEBIT|MVT.*DEBIT|^MD$/],
    ['mouvementCredit', /MOUVEMENT.*CREDIT|MVT.*CREDIT|^MC$/],
    ['soldeDebiteur',   /SOLDE.*DEBIT/],
    ['soldeCrediteur',  /SOLDE.*CREDIT/],
    ['compte',          /^N?COMPTE$|NUMCOMPTE|NUMERO/]
];
var SEC_CHAMPS_GL = [
    ['intitule', /INTITULE|NOMCOMPTE/],
    ['libelle',  /LIBELLE|DESCRIPTION|OPERATION/],
    ['date',     /^DATE/],
    ['ref',      /REF|FACTURE|PIECE/],
    ['debit',    /^DEBIT$|MONTANTDEBIT/],
    ['credit',   /^CREDIT$|MONTANTCREDIT/],
    ['compte',   /^N?COMPTE$|NUMCOMPTE|NUMERO/]
];
// Un en-tête ne peut alimenter qu'un seul champ : premier motif prioritaire
// qui matche gagne la colonne, retirée de la course pour les suivants.
function secMapperEntetes(definitions, celluleEntetes){
    var normalisees = celluleEntetes.map(secNormaliserEntete);
    var mappe = {}, dejaPris = {};
    definitions.forEach(function(def){
        var clef = def[0], regex = def[1];
        for(var i = 0; i < normalisees.length; i++){
            if(dejaPris[i]) continue;
            if(regex.test(normalisees[i])){ mappe[clef] = i; dejaPris[i] = true; break; }
        }
    });
    return mappe;
}

/* ---------- Toast de confirmation ---------- */
function secToast(message){
    var el = document.getElementById('sec-toast');
    if(!el){
        el = document.createElement('div');
        el.id = 'sec-toast';
        el.style.cssText = 'position:fixed;bottom:20px;right:20px;background:#2c3e50;color:#fff;'
            + 'padding:12px 18px;border-radius:8px;font-size:13px;z-index:9999;max-width:340px;'
            + 'box-shadow:0 4px 14px rgba(0,0,0,.25);transition:opacity .3s;';
        document.body.appendChild(el);
    }
    el.textContent = message;
    el.style.display = 'block';
    el.style.opacity = '1';
    clearTimeout(el._timer);
    el._timer = setTimeout(function(){
        el.style.opacity = '0';
        setTimeout(function(){ el.style.display = 'none'; }, 300);
    }, 4000);
}

/* ---------- Import fichier : Balances ---------- */
function secImporterBalanceFichier(input, ex){
    var file = input.files && input.files[0];
    var validation = secValiderFichierCSV(file);
    if(!validation.ok){ secToast('⚠ ' + validation.erreur); input.value = ''; return; }
    secLireFichierTexte(file, function(texte){
        var lignesBrutes = texte.split(/\r?\n/).filter(function(l){ return l.trim() !== ''; });
        texte = null;
        if(!lignesBrutes.length){ secToast('⚠ Fichier vide.'); return; }
        var delim = secDetecterDelimiteur(lignesBrutes[0]);
        var mappe = secMapperEntetes(SEC_CHAMPS_BALANCE, secDecouperLigneCSV(lignesBrutes[0], delim));
        var depart = 0, ordre;
        if(mappe.compte !== undefined){ ordre = mappe; depart = 1; }
        else ordre = { compte:0, intitule:1, ouvertureDebit:2, ouvertureCredit:3, mouvementDebit:4, mouvementCredit:5, soldeDebiteur:6, soldeCrediteur:7 };

        var lignesCanon = [], nettoyees = 0;
        for(var i = depart; i < lignesBrutes.length; i++){
            var c = secDecouperLigneCSV(lignesBrutes[i], delim);
            var compte = (c[ordre.compte] || '').trim();
            if(!compte) continue;
            if(secEstCompteCentralisation(compte)){ nettoyees++; continue; }
            lignesCanon.push([
                compte, (c[ordre.intitule] || '').trim(),
                c[ordre.ouvertureDebit] || '', c[ordre.ouvertureCredit] || '',
                c[ordre.mouvementDebit] || '', c[ordre.mouvementCredit] || '',
                c[ordre.soldeDebiteur] || '', c[ordre.soldeCrediteur] || ''
            ].join('\t'));
        }
        balanceInsererLignes(ex, lignesCanon);
        secToast('✅ Import réussi. ' + lignesCanon.length + ' ligne(s) importée(s)'
            + (nettoyees ? ', ' + nettoyees + ' ligne(s) de centralisation ont été nettoyées.' : '.'));
    }, function(msg){ secToast('⚠ ' + msg); });
    input.value = '';
}

/* ---------- Import fichier : Grand Livre (Bilan / Gestion) ---------- */
function secImporterGLFichier(input, kind){
    var file = input.files && input.files[0];
    var validation = secValiderFichierCSV(file);
    if(!validation.ok){ secToast('⚠ ' + validation.erreur); input.value = ''; return; }
    secLireFichierTexte(file, function(texte){
        var lignesBrutes = texte.split(/\r?\n/).filter(function(l){ return l.trim() !== ''; });
        texte = null;
        if(!lignesBrutes.length){ secToast('⚠ Fichier vide.'); return; }
        var delim = secDetecterDelimiteur(lignesBrutes[0]);
        var mappe = secMapperEntetes(SEC_CHAMPS_GL, secDecouperLigneCSV(lignesBrutes[0], delim));
        var depart = 0, ordre;
        if(mappe.compte !== undefined){ ordre = mappe; depart = 1; }
        else ordre = { compte:0, intitule:1, date:2, ref:3, libelle:4, debit:5, credit:6 };

        var lignesCanon = [], nettoyees = 0;
        for(var i = depart; i < lignesBrutes.length; i++){
            var c = secDecouperLigneCSV(lignesBrutes[i], delim);
            var compte = (c[ordre.compte] || '').trim();
            if(!compte) continue;
            if(secEstCompteCentralisation(compte)){ nettoyees++; continue; }
            lignesCanon.push([
                compte, (c[ordre.intitule] || '').trim(), (c[ordre.date] || '').trim(),
                (c[ordre.ref] || '').trim(), (c[ordre.libelle] || '').trim(),
                c[ordre.debit] || '', c[ordre.credit] || ''
            ].join('\t'));
        }
        importGLLinesChunked(kind, lignesCanon);
        secToast('✅ Import réussi. ' + lignesCanon.length + ' ligne(s) importée(s)'
            + (nettoyees ? ', ' + nettoyees + ' ligne(s) de centralisation ont été nettoyées.' : '.'));
    }, function(msg){ secToast('⚠ ' + msg); });
    input.value = '';
}
