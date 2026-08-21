/* ==================================================================
   SEVEN7 — TABLEAUX FISCAUX ET SOCIAUX MENSUELS (ONGLET l)

   Vient s'ajouter au tableau de rapprochement comptabilité/déclaré déjà
   présent dans l'onglet Impôts (IMPOTS_ROWS / recomputeImpots(), voir
   08-controles-audit.js) — celui-ci reste inchangé, il répond à une
   autre question (l'écart entre le compte et le déclaré).

   Structure alignée sur TABLEAU REVUE FISCALE ET SOCIALE.xlsx (fourni
   par le cabinet) : chaque tableau mensuel porte, sous les 12 mois, un
   pied à 4 lignes — TOTAL / Solde Initial / Règlement / Solde Final —
   qui suit la dette fiscale comme un compte : ce qui restait dû à
   l'ouverture, plus ce qui a été déclaré dans l'année, moins ce qui a
   été payé, égale ce qui reste dû (ou en crédit) à la clôture. Solde
   Final = Solde Initial + TOTAL − Règlement, colonne par colonne.

     tva              : MOIS, TVA_Collectee, TVA_Recuperable, TVA_Due, Credit_TVA
     impots_groupe_1  : MOIS, ITS, CE, TA, TFPC
     impots_groupe_2  : MOIS, TSE, AIRSI, PPSI, BNC
     patente          : Tranche_1, Tranche_2, Declaration, Paiement, Comptabilite, Ecart
     cnps             : MOIS, RETRAITE, ACT, ASSM_PRES_F, CMU, CNPS
     cmu_isolee       : MOIS, CMU

   TVA_Due / Credit_TVA : solde mensuel = Collectée − Récupérable. Positif
   → TVA_Due, Credit_TVA à 0. Négatif → Credit_TVA (valeur absolue),
   TVA_Due à 0 — c'est le report de crédit, jamais les deux à la fois sur
   un même mois.

   Onglet « Crédit de TVA » : ici, une section à l'intérieur du même
   panneau (pas un onglet séparé dans TABS — rien dans l'arborescence
   a→u ne l'annonce comme tel). Grisée et non saisissable si le solde
   ANNUEL cumulé (Collectée − Récupérable, indépendant du pied Solde
   Initial/Final ci-dessus) est positif ; ouverte à la saisie s'il est
   négatif.
   ================================================================== */

var TF_MOIS = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];

var TF_TABLES = {
    impots_groupe_1: { id:'tf-groupe1', titre:'Impôts — Groupe 1', cols:['ITS','CE','TA','TFPC'] },
    impots_groupe_2: { id:'tf-groupe2', titre:'Impôts — Groupe 2', cols:['TSE','AIRSI','PPSI','BNC'] },
    cnps:            { id:'tf-cnps',    titre:'CNPS', cols:['RETRAITE','ACT','ASSM_PRES_F','CMU'], calc:'CNPS' },
    cmu_isolee:      { id:'tf-cmu',     titre:'CMU (travailleurs isolés)', cols:['CMU'] }
};

function tfCol(nom){
    return nom.replace(/_/g, ' ');
}

/* ---------- Pied commun : TOTAL / Solde Initial / Règlement / Solde Final ----------
   Générique à tout tableau mensuel, quelle que soit sa liste de colonnes — TVA
   comprise, qui a deux colonnes calculées (Due, Crédit) au lieu d'une seule. */
function tfRendrePied(cols){
    var td = function(attrs, contenu){ return '<td' + attrs + '>' + contenu + '</td>'; };
    var ligne = function(libelle, piedCle, editable, cls){
        var cells = cols.map(function(c){
            return editable
                ? td(' data-tf-pied="'+piedCle+'" data-tf-col="'+c+'"',
                     '<input type="number" class="editable number" data-tf-pied="'+piedCle+'" data-tf-col="'+c+'" onchange="tfRecalculerPied(this.closest(\'table\').id)">')
                : td(' class="calculated number" data-tf-pied="'+piedCle+'" data-tf-col="'+c+'"', '0');
        }).join('');
        return '<tr' + (cls ? ' class="'+cls+'"' : '') + '><td>' + libelle + '</td>' + cells + '</tr>';
    };
    return ligne('TOTAL', 'total', false, 'total-row')
         + ligne('Solde Initial', 'si', true)
         + ligne('Règlement', 'reg', true)
         + ligne('Solde Final', 'sf', false, 'total-row');
}
// Recalcule TOTAL (somme des 12 lignes de mois) et Solde Final (Solde Initial +
// TOTAL − Règlement) pour chaque colonne suivie d'un tableau donné par son id.
function tfRecalculerPied(tableId){
    var table = document.getElementById(tableId);
    if(!table) return;
    var lignesMois = Array.prototype.slice.call(table.querySelectorAll('tr[data-tf-mois]'));
    var colonnes = {};
    table.querySelectorAll('[data-tf-pied="total"]').forEach(function(el){ colonnes[el.getAttribute('data-tf-col')] = true; });
    Object.keys(colonnes).forEach(function(c){
        var total = 0;
        lignesMois.forEach(function(tr){
            var el = tr.querySelector('[data-tf-col="' + c + '"]');
            if(!el) return;
            total += parseNum(el.value !== undefined && el.tagName === 'INPUT' ? el.value : el.textContent);
        });
        var totalEl = table.querySelector('[data-tf-pied="total"][data-tf-col="' + c + '"]');
        if(totalEl) totalEl.textContent = fmt(total);
        var si = parseNum((table.querySelector('[data-tf-pied="si"][data-tf-col="' + c + '"]') || {}).value);
        var reg = parseNum((table.querySelector('[data-tf-pied="reg"][data-tf-col="' + c + '"]') || {}).value);
        var sfEl = table.querySelector('[data-tf-pied="sf"][data-tf-col="' + c + '"]');
        if(sfEl) sfEl.textContent = fmt(si + total - reg);
    });
}

/* ---------- Tableaux mensuels génériques (impots_groupe_1/2, cnps, cmu_isolee) ---------- */
function tfRendreTableGenerique(cle){
    var def = TF_TABLES[cle];
    var colsPied = def.cols.concat(def.calc ? [def.calc] : []);
    var entetes = '<th style="width:14%;">Mois</th>' + def.cols.map(function(c){ return '<th>' + esc(tfCol(c)) + '</th>'; }).join('')
        + (def.calc ? '<th>' + esc(tfCol(def.calc)) + '</th>' : '');
    var lignes = TF_MOIS.map(function(mois, i){
        var champs = def.cols.map(function(c){
            return '<td><input type="number" class="editable number" data-tf-col="' + c + '"'
                 + ' onchange="tfRecalculerLigne(\'' + cle + '\', this)"></td>';
        }).join('');
        return '<tr data-tf-mois="' + i + '"><td>' + esc(mois) + '</td>' + champs
             + (def.calc ? '<td class="calculated number" data-tf-col="' + def.calc + '">0</td>' : '')
             + '</tr>';
    }).join('');
    return '<div class="scroll-table"><table id="' + def.id + '"><tr>' + entetes + '</tr>' + lignes
         + tfRendrePied(colsPied) + '</table></div>';
}
function tfRecalculerLigne(cle, input){
    var def = TF_TABLES[cle];
    if(def.calc){
        var tr = input.closest('tr');
        var total = 0;
        def.cols.forEach(function(c){
            var el = tr.querySelector('[data-tf-col="' + c + '"]');
            total += parseNum(el ? el.value : 0);
        });
        var calcEl = tr.querySelector('[data-tf-col="' + def.calc + '"]');
        if(calcEl) calcEl.textContent = fmt(total);
    }
    tfRecalculerPied(def.id);
}

/* ---------- TVA (calcul du solde mensuel, report de crédit) ---------- */
function tfRendreTVA(){
    var lignes = TF_MOIS.map(function(mois, i){
        return '<tr data-tf-mois="' + i + '">'
            + '<td>' + esc(mois) + '</td>'
            + '<td><input type="number" class="editable number" data-tf-col="TVA_Collectee" onchange="tfRecalculerTVA()"></td>'
            + '<td><input type="number" class="editable number" data-tf-col="TVA_Recuperable" onchange="tfRecalculerTVA()"></td>'
            + '<td class="calculated number" data-tf-col="TVA_Due">0</td>'
            + '<td class="calculated number" data-tf-col="Credit_TVA">0</td>'
            + '</tr>';
    }).join('');
    return '<div class="scroll-table"><table id="tf-tva"><tr><th style="width:14%;">Mois</th>'
        + '<th>TVA collectée</th><th>TVA récupérable</th><th>TVA due</th><th>Crédit de TVA</th></tr>'
        + lignes + tfRendrePied(['TVA_Collectee','TVA_Recuperable','TVA_Due','Credit_TVA']) + '</table></div>';
}
function tfRecalculerTVA(){
    var table = document.getElementById('tf-tva');
    if(!table) return;
    var soldeAnnuel = 0;
    Array.prototype.slice.call(table.querySelectorAll('tr[data-tf-mois]')).forEach(function(tr){
        var collectee = parseNum((tr.querySelector('[data-tf-col="TVA_Collectee"]') || {}).value);
        var recuperable = parseNum((tr.querySelector('[data-tf-col="TVA_Recuperable"]') || {}).value);
        var solde = collectee - recuperable;
        soldeAnnuel += solde;
        var due = solde > 0 ? solde : 0;
        var credit = solde < 0 ? -solde : 0;
        var dueEl = tr.querySelector('[data-tf-col="TVA_Due"]');
        var creditEl = tr.querySelector('[data-tf-col="Credit_TVA"]');
        if(dueEl) dueEl.textContent = fmt(due);
        if(creditEl) creditEl.textContent = fmt(credit);
    });
    tfRecalculerPied('tf-tva');
    tfAppliquerCreditTVA(soldeAnnuel);
}
// Positif : l'entité est in fine redevable de TVA sur l'année — la section
// Crédit de TVA n'a pas lieu d'être renseignée, elle est grisée. Négatif :
// crédit à reporter, la section s'ouvre à la saisie.
function tfAppliquerCreditTVA(soldeAnnuel){
    var section = document.getElementById('tf-credit-tva-section');
    var champ = document.getElementById('tf-credit-tva-montant');
    var info = document.getElementById('tf-credit-tva-info');
    if(!section) return;
    var enCredit = soldeAnnuel < 0;
    section.classList.toggle('tf-section-grisee', !enCredit);
    if(champ) champ.disabled = !enCredit;
    if(info){
        info.textContent = enCredit
            ? 'Solde annuel négatif (' + fmt(soldeAnnuel) + ') : l’entité est en position de crédit de TVA à reporter.'
            : 'Solde annuel positif ou nul (' + fmt(soldeAnnuel) + ') : rien à reporter, section non applicable.';
    }
}

/* ---------- Patente (structure annuelle, pas mensuelle) ---------- */
function tfRendrePatente(){
    return '<div class="form-row">'
        + ['Tranche_1','Tranche_2','Declaration','Paiement','Comptabilite'].map(function(c){
            return '<div class="form-group" style="max-width:200px;"><label>' + esc(tfCol(c)) + '</label>'
                 + '<input type="number" class="editable number" id="tf-patente-' + c + '" onchange="tfRecalculerPatente()"></div>';
        }).join('')
        + '<div class="form-group" style="max-width:200px;"><label>Écart</label>'
        + '<input type="text" id="tf-patente-Ecart" class="calculated number" readonly></div>'
        + '</div>';
}
// Écart = ce qui est comptabilisé moins ce qui a réellement été payé (les deux
// tranches) — recoupement patrimonial simple, source pour le moteur d'anomalies.
function tfRecalculerPatente(){
    var comptabilise = parseNum((document.getElementById('tf-patente-Comptabilite') || {}).value);
    var t1 = parseNum((document.getElementById('tf-patente-Tranche_1') || {}).value);
    var t2 = parseNum((document.getElementById('tf-patente-Tranche_2') || {}).value);
    var ecart = comptabilise - (t1 + t2);
    var el = document.getElementById('tf-patente-Ecart');
    if(el) el.value = fmt(ecart);
}
// Utilisé par le moteur de centralisation des anomalies (onglet s) : rend
// l'écart de patente courant, 0 si rien n'est encore saisi.
function tfEcartPatente(){
    var el = document.getElementById('tf-patente-Ecart');
    return el ? parseNum(el.value) : 0;
}

/* ---------- Installation ---------- */
function tfInstaller(){
    if(document.getElementById('tf-tva')) return;
    var panneau = document.getElementById('impots');
    if(!panneau) return;
    var carte = document.createElement('div');
    carte.className = 'card';
    carte.setAttribute('data-tab', 'impots');
    carte.innerHTML =
      '<h2>📅 SUIVI MENSUEL DES DÉCLARATIONS (TVA, IMPÔTS, CNPS)</h2>'
    + '<div class="alert alert-info">Suivi déclaratif mois par mois, distinct du rapprochement comptes/déclaré '
    + 'ci-dessus. Chaque tableau porte un pied Total / Solde Initial / Règlement / Solde Final qui suit la dette '
    + 'fiscale comme un compte. La TVA due et le crédit de TVA se calculent automatiquement à partir des montants saisis.</div>'
    + '<h3>TVA</h3>' + tfRendreTVA()
    + '<div id="tf-credit-tva-section" class="card" style="background:#f6f8fa; margin-top:14px;">'
    + '<h3>Crédit de TVA</h3>'
    + '<p id="tf-credit-tva-info" style="font-size:12px; color:#666; margin-bottom:8px;"></p>'
    + '<div class="form-group" style="max-width:260px;"><label>Crédit de TVA à reporter (FCFA)</label>'
    + '<input type="number" id="tf-credit-tva-montant" class="editable number" onchange="updateStatus(\'impots\')"></div>'
    + '</div>'
    + '<h3 style="margin-top:22px;">Impôts — Groupe 1 (ITS, CE, TA, TFPC)</h3>' + tfRendreTableGenerique('impots_groupe_1')
    + '<h3 style="margin-top:22px;">Impôts — Groupe 2 (TSE, AIRSI, PPSI, BNC)</h3>' + tfRendreTableGenerique('impots_groupe_2')
    + '<h3 style="margin-top:22px;">CNPS</h3>' + tfRendreTableGenerique('cnps')
    + '<h3 style="margin-top:22px;">CMU — travailleurs isolés</h3>' + tfRendreTableGenerique('cmu_isolee')
    + '<h3 style="margin-top:22px;">Patente</h3>' + tfRendrePatente();
    panneau.appendChild(carte);
    tfRecalculerTVA();
    tfRecalculerPied('tf-groupe1');
    tfRecalculerPied('tf-groupe2');
    tfRecalculerPied('tf-cnps');
    tfRecalculerPied('tf-cmu');
}

try{
    if(typeof document !== 'undefined'){
        if(document.readyState === 'loading')
            document.addEventListener('DOMContentLoaded', tfInstaller);
        else
            tfInstaller();
    }
}catch(e){}
