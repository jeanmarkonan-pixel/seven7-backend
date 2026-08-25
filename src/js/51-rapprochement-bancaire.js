/* ==================================================================
   SEVEN7 — RAPPROCHEMENT BANCAIRE (Novembre / Décembre)

   Nouvel onglet, rattaché à la lettre j (Grand Livre) de l'arborescence
   a→u : sur le même modèle que 47-choix-opinion.js (panneau auto-installé,
   déclaré dans TABS, jamais dupliqué, bouton inséré dans le menu Phase 2
   juste après GL Gestion).

   Portée volontairement limitée aux deux derniers mois de l'exercice
   (novembre, décembre) — demande explicite du cabinet, pas une limite
   technique : RB_MOIS peut recevoir d'autres mois plus tard sans reprendre
   la structure.

   Pour chaque mois : import CSV du relevé bancaire (format générique
   Date;Libellé;Débit;Crédit, délimiteur auto-détecté — parsing autonome,
   volontairement dupliqué de 45-securite-import.js plutôt que réutilisé,
   car ce module charge AVANT lui dans build/manifeste.json), affiché en
   face des écritures du Grand Livre déjà importées (04-grand-livre.js)
   sur le(s) compte(s) banque configuré(s) (préfixe(s), ex. "52"), pour
   le même mois. L'auditeur pointe manuellement chaque ligne du relevé
   rapprochée ; une suggestion automatique (🔎) signale une écriture GL du
   même mois au même montant, mais ne pointe jamais elle-même — ce serait
   trop risqué sur un rapprochement dont la fiabilité dépend justement du
   contrôle humain.

   Sens des colonnes — piège classique du rapprochement bancaire : sur un
   relevé, "Crédit" = argent REÇU par le compte (encaissement), "Débit" =
   argent SORTI (décaissement) — c'est l'INVERSE des colonnes Débit/Crédit
   du compte 52 en comptabilité (où Débit = encaissement, l'actif augmente).
   Le mouvement net comparé est donc (Crédit relevé − Débit relevé) contre
   (Débit compta − Crédit compta), jamais colonne à colonne.

   Persistance : comme tout onglet de l'app, la sauvegarde Firestore capture
   le innerHTML entier du div#rapprochement-bancaire (voir doSaveTab dans
   10-config-collaboration.js) — les lignes importées et les cases "Pointé"
   cochées doivent donc exister comme lignes de table réelles (comme GL
   Bilan/Gestion), jamais comme simple variable JS en mémoire.
   ================================================================== */

var RB_MOIS = [
    { index: 10, id: 'nov', nom: 'Novembre' },
    { index: 11, id: 'dec', nom: 'Décembre' }
];

/* ---------- Parsing CSV autonome (voir note d'en-tête sur l'ordre de chargement) ---------- */
function rbDetecterDelimiteur(ligne){
    var candidats = [';', ',', '\t'];
    var meilleur = ';', max = -1;
    candidats.forEach(function(d){
        var n = ligne.split(d).length - 1;
        if(n > max){ max = n; meilleur = d; }
    });
    return meilleur;
}
function rbDecouperLigne(ligne, delim){
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
// Accepte AAAA-MM-JJ (natif <input type=date>) ou JJ/MM/AAAA — sinon chaîne vide (ligne signalée en rouge).
function rbNormaliserDate(s){
    // Cellule Excel de type date : SheetJS rend un objet Date (cellDates), qu'on
    // convertit sans passer par une chaîne localisée — donc sans ambiguïté jour/mois.
    // getMonth() est 0-indexé, d'où le +1.
    if(s instanceof Date && !isNaN(s.getTime())){
        return s.getFullYear() + '-'
             + String(s.getMonth() + 1).padStart(2, '0') + '-'
             + String(s.getDate()).padStart(2, '0');
    }
    s = String(s === undefined || s === null ? '' : s).trim();
    if(/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
    // Format européen JJ/MM/AAAA (celui des relevés bancaires ivoiriens) : le
    // premier groupe est le JOUR, le second le MOIS. Les inverser produisait des
    // dates fausses (05/11 lu comme 11 mai), ce qui faussait le mois retenu et la
    // fenêtre ±5 jours du pointage automatique.
    var m = s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})$/);
    if(m){
        var jour = parseInt(m[1], 10), mois = parseInt(m[2], 10);
        if(jour >= 1 && jour <= 31 && mois >= 1 && mois <= 12)
            return m[3] + '-' + m[2].padStart(2, '0') + '-' + m[1].padStart(2, '0');
    }
    return '';
}
function rbEnteteEstDonnee(champs){
    // Une ligne d'en-tête n'a ni date reconnaissable ni chiffre en 1re/3e colonne
    // (parseNum() ne distingue pas "0" d'un libellé non numérique — un simple
    // test de présence de chiffre suffit ici, où l'enjeu est juste d'ignorer
    // une éventuelle ligne de titres).
    // champs peut venir d'un CSV (chaînes) ou d'Excel (nombres, objets Date) :
    // on ramène la colonne montant en texte avant de chercher un chiffre.
    var montant = champs[2];
    montant = String(montant === undefined || montant === null ? '' : montant);
    return rbNormaliserDate(champs[0]) !== '' || /[0-9]/.test(montant);
}

/* ---------- Import fichier (CSV ou Excel) ---------- */
// Injecte dans la table les lignes déjà ramenées au format canonique
// [date, libellé, débit, crédit], quelle que soit leur provenance (CSV ou Excel).
function rbInjecterLignes(moisIndex, lignes){
    var nb = 0;
    lignes.forEach(function(c){
        if(!c[0] && !c[1]) return;
        rbAjouterLigne(moisIndex, {
            date: rbNormaliserDate(c[0]),
            libelle: String(c[1] === undefined || c[1] === null ? '' : c[1]).trim(),
            debit: parseNum(c[2]),
            credit: parseNum(c[3]),
            pointe: false
        });
        nb++;
    });
    rbRecalculer(moisIndex);
    alert('✅ Import réussi : ' + nb + ' ligne(s) ajoutée(s) au relevé de ' + rbInfoMois(moisIndex).nom + '.');
}
function rbImporterReleve(input, moisIndex){
    var file = input.files && input.files[0];
    if(!file){ return; }
    var nom = file.name || '';
    var estExcel = /\.xlsx?$/i.test(nom);
    if(!/\.csv$/i.test(nom) && !estExcel){
        alert('Le fichier doit être un .csv ou un .xlsx / .xls.');
        input.value = '';
        return;
    }
    if(file.size > 5 * 1024 * 1024){
        alert('Fichier trop volumineux (' + (file.size/1024/1024).toFixed(1) + ' Mo) — 5 Mo maximum.');
        input.value = '';
        return;
    }
    if(estExcel) rbLireExcel(file, moisIndex);
    else rbLireCSV(file, moisIndex);
    input.value = '';
}
function rbLireCSV(file, moisIndex){
    var reader = new FileReader();
    reader.onload = function(){
        var texte = String(reader.result || '');
        reader = null;
        var lignesTexte = texte.split(/\r?\n/).filter(function(l){ return l.trim() !== ''; });
        texte = null;
        if(!lignesTexte.length){ alert('Fichier vide.'); return; }
        var delim = rbDetecterDelimiteur(lignesTexte[0]);
        var depart = rbEnteteEstDonnee(rbDecouperLigne(lignesTexte[0], delim)) ? 0 : 1;
        var lignes = [];
        for(var i = depart; i < lignesTexte.length; i++){
            lignes.push(rbDecouperLigne(lignesTexte[i], delim));
        }
        rbInjecterLignes(moisIndex, lignes);
    };
    reader.onerror = function(){ reader = null; alert('Lecture du fichier impossible.'); };
    reader.readAsText(file, 'UTF-8');
}
// Excel : lecture via SheetJS (chargé en différé depuis le CDN, voir src/app.html).
// La première feuille du classeur est lue, colonnes dans le même ordre que le CSV
// (Date, Libellé, Débit, Crédit).
// cellDates:true + raw:true : les cellules de type date reviennent en objets Date
// natifs, que rbNormaliserDate convertit sans ambiguïté. Surtout PAS raw:false, qui
// les rendrait en texte localisé (« 05/11/26 », voire au format américain selon le
// classeur) — une source d'inversion jour/mois silencieuse sur un rapprochement dont
// la fenêtre de pointage se compte en jours.
function rbLireExcel(file, moisIndex){
    if(typeof XLSX === 'undefined'){
        alert('La lecture des fichiers Excel n’est pas disponible pour l’instant (elle a besoin d’une connexion Internet au chargement de l’application).\n\nSolution immédiate : dans Excel, « Enregistrer sous » puis choisir le format CSV, et importer ce fichier CSV.');
        return;
    }
    var reader = new FileReader();
    reader.onload = function(){
        try{
            var classeur = XLSX.read(new Uint8Array(reader.result), { type:'array', cellDates:true });
            reader = null;
            var feuille = classeur.Sheets[classeur.SheetNames[0]];
            if(!feuille){ alert('Ce classeur Excel ne contient aucune feuille lisible.'); return; }
            var matrice = XLSX.utils.sheet_to_json(feuille, { header:1, raw:true, defval:'' });
            matrice = matrice.filter(function(l){
                return l.some(function(c){ return String(c === undefined || c === null ? '' : c).trim() !== ''; });
            });
            if(!matrice.length){ alert('Fichier vide.'); return; }
            // Ligne passée telle quelle (valeurs brutes, Date comprises) : la
            // convertir en texte ici rendrait une date illisible pour
            // rbNormaliserDate (« Wed Nov 05 2026 … »), et la 1re ligne de données
            // serait prise pour un en-tête, donc silencieusement ignorée.
            var depart = rbEnteteEstDonnee(matrice[0]) ? 0 : 1;
            rbInjecterLignes(moisIndex, matrice.slice(depart));
        }catch(e){
            reader = null;
            alert('Lecture du fichier Excel impossible : ' + e.message + '\n\nVous pouvez le réenregistrer au format CSV depuis Excel et réessayer.');
        }
    };
    reader.onerror = function(){ reader = null; alert('Lecture du fichier impossible.'); };
    reader.readAsArrayBuffer(file);
}
function rbInfoMois(moisIndex){
    return RB_MOIS.filter(function(m){ return m.index === moisIndex; })[0];
}

/* ---------- Table du relevé importé (une ligne = une écriture bancaire) ---------- */
function rbLigneHtml(row){
    row = row || { date:'', libelle:'', debit:'', credit:'', pointe:false };
    var oc = 'rbRecalculerDeCellule(this)';
    return '<td><input type="date" class="editable rb-date date-input" value="' + esc(row.date) + '" onchange="' + oc + '"></td>'
         + '<td><input type="text" class="editable rb-libelle" value="' + esc(row.libelle) + '" onchange="' + oc + '"></td>'
         + '<td><input type="number" class="editable rb-debit number" value="' + (row.debit || '') + '" onchange="' + oc + '"></td>'
         + '<td><input type="number" class="editable rb-credit number" value="' + (row.credit || '') + '" onchange="' + oc + '"></td>'
         + '<td style="text-align:center;"><input type="checkbox" class="rb-pointe"' + (row.pointe ? ' checked' : '') + ' onchange="' + oc + '"></td>'
         + '<td class="calculated rb-suggestion" style="font-size:11px;"></td>'
         + '<td><button class="btn btn-danger" onclick="rbSupprimerLigne(this)">✕</button></td>';
}
function rbAjouterLigne(moisIndex, row){
    var info = rbInfoMois(moisIndex);
    var table = document.getElementById('rb-table-' + info.id);
    if(!table) return;
    var tr = document.createElement('tr');
    tr.innerHTML = rbLigneHtml(row);
    table.appendChild(tr);
}
function rbSupprimerLigne(btn){
    var tr = btn.closest('tr');
    var table = tr.closest('table');
    tr.remove();
    var moisIndex = rbMoisDeTable(table);
    if(moisIndex !== null) rbRecalculer(moisIndex);
}
function rbMoisDeTable(table){
    if(!table) return null;
    for(var i = 0; i < RB_MOIS.length; i++){
        if(table.id === 'rb-table-' + RB_MOIS[i].id) return RB_MOIS[i].index;
    }
    return null;
}
function rbRecalculerDeCellule(el){
    var moisIndex = rbMoisDeTable(el.closest('table'));
    if(moisIndex !== null) rbRecalculer(moisIndex);
}

/* ---------- Comptes GL rapprochés (préfixes, ex. "52" ou "521,522") ---------- */
function rbComptesConfigures(){
    var input = document.getElementById('rb-comptes-banque');
    var brut = input ? input.value : '52';
    return String(brut || '52').split(/[,\s]+/).filter(function(s){ return s !== ''; });
}
// Écritures GL du mois pour ces comptes — même logique de préfixe que tfMouvementMensuel (48-tableaux-fiscaux.js).
function rbEcrituresGL(moisIndex, prefixes){
    var rows = (typeof grandLivreData !== 'undefined') ? grandLivreData : [];
    var out = [];
    for(var i = 0; i < rows.length; i++){
        var r = rows[i];
        var compte = String(r.compte || '').trim();
        var correspond = prefixes.some(function(p){ return compte.indexOf(p) === 0; });
        if(!correspond) continue;
        var mois = parseInt(String(r.date || '').slice(5, 7), 10) - 1;
        if(mois !== moisIndex) continue;
        out.push(r);
    }
    return out;
}

/* ---------- Recalcul d'un mois : totaux, écart, table GL en regard, suggestions ---------- */
function rbRecalculer(moisIndex){
    var info = rbInfoMois(moisIndex);
    var table = document.getElementById('rb-table-' + info.id);
    if(!table) return;
    var prefixes = rbComptesConfigures();
    var ecrituresGL = rbEcrituresGL(moisIndex, prefixes);

    var totDebitReleve = 0, totCreditReleve = 0, nbPointe = 0, nbNonPointe = 0, montantNonPointe = 0;
    var trs = Array.prototype.slice.call(table.querySelectorAll('tr'));
    trs.forEach(function(tr){
        var debit = parseNum(tr.querySelector('.rb-debit').value);
        var credit = parseNum(tr.querySelector('.rb-credit').value);
        var pointe = tr.querySelector('.rb-pointe').checked;
        totDebitReleve += debit;
        totCreditReleve += credit;
        if(pointe) nbPointe++;
        else { nbNonPointe++; montantNonPointe += (credit - debit); }

        // Suggestion : une écriture GL du même mois, même compte configuré, montant identique
        // (à l'inversion de sens près — voir note d'en-tête). Indicative uniquement : ne pointe rien.
        var cible = credit > 0 ? credit : debit;
        var sensGL = credit > 0 ? 'debit' : 'credit'; // crédit relevé (encaissement) ↔ débit compta, et inversement
        var trouve = cible > 0 && ecrituresGL.some(function(r){ return Math.abs(parseNum(r[sensGL]) - cible) < 0.5; });
        var cellSugg = tr.querySelector('.rb-suggestion');
        cellSugg.textContent = trouve ? '🔎 écriture GL correspondante' : '';
    });

    var totDebitGL = 0, totCreditGL = 0;
    ecrituresGL.forEach(function(r){ totDebitGL += parseNum(r.debit); totCreditGL += parseNum(r.credit); });

    var mouvementReleve = totCreditReleve - totDebitReleve;   // variation du solde selon la banque
    var mouvementCompta = totDebitGL - totCreditGL;           // variation du solde selon la comptabilité
    var ecart = mouvementReleve - mouvementCompta;

    setText2('rb-tot-debit-releve-' + info.id, fmt(totDebitReleve));
    setText2('rb-tot-credit-releve-' + info.id, fmt(totCreditReleve));
    setText2('rb-tot-debit-gl-' + info.id, fmt(totDebitGL));
    setText2('rb-tot-credit-gl-' + info.id, fmt(totCreditGL));
    setText2('rb-mouvement-releve-' + info.id, fmt(mouvementReleve));
    setText2('rb-mouvement-compta-' + info.id, fmt(mouvementCompta));
    var elEcart = document.getElementById('rb-ecart-' + info.id);
    if(elEcart){
        elEcart.textContent = fmt(ecart);
        elEcart.style.color = Math.abs(ecart) < 0.5 ? '#27ae60' : '#e74c3c';
        elEcart.style.fontWeight = '700';
    }
    setText2('rb-nb-pointe-' + info.id, nbPointe);
    setText2('rb-nb-non-pointe-' + info.id, nbNonPointe);
    setText2('rb-montant-non-pointe-' + info.id, fmt(montantNonPointe));

    // Table GL en regard : simple reflet en lecture seule des écritures déjà importées ailleurs
    // (04-grand-livre.js) — rebâtie à chaque recalcul, jamais la source de vérité elle-même.
    var tableGL = document.getElementById('rb-table-gl-' + info.id);
    if(tableGL){
        tableGL.innerHTML = ecrituresGL.length
            ? ecrituresGL.map(function(r){
                return '<tr><td>' + esc(r.compte) + '</td><td>' + esc(r.date) + '</td><td>' + esc(r.libelle) + '</td>'
                     + '<td class="number">' + (r.debit ? fmt(r.debit) : '') + '</td>'
                     + '<td class="number">' + (r.credit ? fmt(r.credit) : '') + '</td></tr>';
            }).join('')
            : '<tr><td colspan="5" style="text-align:center; color:#999;">Aucune écriture Grand Livre sur ce(s) compte(s) pour ' + info.nom.toLowerCase() + '.</td></tr>';
    }
}
// Pointage automatique : pour chaque ligne du relevé pas encore pointée, cherche une
// écriture GL du même compte/mois, montant identique (à l'inversion de sens près — voir
// note d'en-tête) et datée à ±5 jours au maximum, la plus proche en date. Une écriture GL
// n'est utilisée qu'une seule fois (retirée de la course dès qu'elle sert), pour ne pas
// pointer deux lignes de relevé sur une même écriture comptable. Ne fait QUE cocher la
// case Pointé — jamais de suppression ni de modification des montants : l'auditeur garde
// la main pour décocher une correspondance qu'il juge fausse avant de conclure.
function rbPointageAuto(moisIndex){
    var info = rbInfoMois(moisIndex);
    var table = document.getElementById('rb-table-' + info.id);
    if(!table) return;
    var prefixes = rbComptesConfigures();
    var ecrituresGL = rbEcrituresGL(moisIndex, prefixes);
    var utilisees = [];
    var nb = 0;
    Array.prototype.slice.call(table.querySelectorAll('tr')).forEach(function(tr){
        var caseAPointer = tr.querySelector('.rb-pointe');
        if(caseAPointer.checked) return;
        var debit = parseNum(tr.querySelector('.rb-debit').value);
        var credit = parseNum(tr.querySelector('.rb-credit').value);
        var dateStr = tr.querySelector('.rb-date').value;
        var cible = credit > 0 ? credit : debit;
        var sensGL = credit > 0 ? 'debit' : 'credit'; // crédit relevé ↔ débit compta, et inversement
        if(cible <= 0 || !dateStr) return;
        var dateBq = new Date(dateStr).getTime();
        if(isNaN(dateBq)) return;
        var meilleur = -1, meilleurEcart = Infinity;
        ecrituresGL.forEach(function(r, idx){
            if(utilisees.indexOf(idx) !== -1) return;
            if(Math.abs(parseNum(r[sensGL]) - cible) >= 0.5) return;
            var dateGL = new Date(r.date).getTime();
            if(isNaN(dateGL)) return;
            var ecartJours = Math.abs(dateBq - dateGL) / 86400000;
            if(ecartJours <= 5 && ecartJours < meilleurEcart){ meilleur = idx; meilleurEcart = ecartJours; }
        });
        if(meilleur !== -1){
            utilisees.push(meilleur);
            caseAPointer.checked = true;
            nb++;
        }
    });
    rbRecalculer(moisIndex);
    alert('🤖 Pointage automatique — ' + info.nom + ' : ' + nb + ' ligne(s) pointée(s) (montant identique, ±5 jours). Vérifiez chaque correspondance avant de conclure.');
}
function setText2(id, val){
    var el = document.getElementById(id);
    if(el) el.textContent = val;
}
// Recalcule les deux mois — appelé quand le champ "Comptes banque" change (affecte les deux tables GL).
function rbRecalculerTout(){
    RB_MOIS.forEach(function(m){ rbRecalculer(m.index); });
}

/* ---------- Rendu d'un bloc mensuel ---------- */
function rbBlocImportHtml(info){
    return '<div class="form-row rb-bloc-import" style="align-items:center; margin-bottom:10px;">'
        + '<div class="form-group" style="margin:0;"><label>📥 Importer le relevé bancaire de ' + esc(info.nom) + ' (CSV ou Excel)</label>'
        + '<input type="file" accept=".csv,.xlsx,.xls" onchange="rbImporterReleve(this, ' + info.index + ')"></div>'
        + '<button type="button" class="btn btn-primary" style="margin-left:10px;" onclick="rbAjouterLigne(' + info.index + ', null); rbRecalculer(' + info.index + ')">+ Ajouter une ligne</button>'
        + '<button type="button" class="btn btn-primary" style="margin-left:10px; background:#8e44ad;" onclick="rbPointageAuto(' + info.index + ')">🤖 Pointage automatique (±5 jours)</button>'
        + '</div>';
}
function rbRendreMois(info){
    return rbBlocImportHtml(info)
        + '<div class="scroll-table">'
        + '<table><thead><tr><th>Date</th><th>Libellé</th><th>Débit (sortie)</th><th>Crédit (entrée)</th><th>Pointé</th><th>Suggestion</th><th></th></tr></thead>'
        + '<tbody id="rb-table-' + info.id + '"></tbody></table></div>'
        + '<div style="margin-top:10px; font-size:12px; display:flex; flex-wrap:wrap; gap:18px;">'
        + '<span>Total Débit relevé : <strong id="rb-tot-debit-releve-' + info.id + '">0</strong></span>'
        + '<span>Total Crédit relevé : <strong id="rb-tot-credit-releve-' + info.id + '">0</strong></span>'
        + '<span>Mouvement net relevé : <strong id="rb-mouvement-releve-' + info.id + '">0</strong></span>'
        + '<span>Mouvement net compta (GL) : <strong id="rb-mouvement-compta-' + info.id + '">0</strong></span>'
        + '<span>Écart : <strong id="rb-ecart-' + info.id + '">0</strong></span>'
        + '</div>'
        + '<div style="margin-top:4px; font-size:12px; color:#666;">'
        + 'Lignes pointées : <strong id="rb-nb-pointe-' + info.id + '">0</strong> · '
        + 'Non pointées : <strong id="rb-nb-non-pointe-' + info.id + '">0</strong> '
        + '(montant net en suspens : <strong id="rb-montant-non-pointe-' + info.id + '">0</strong>)'
        + '</div>'
        + '<div class="card" style="background:#f6f8fa; margin-top:14px;">'
        + '<h4 style="margin-top:0;">Écritures Grand Livre — compte(s) banque, ' + esc(info.nom.toLowerCase()) + '</h4>'
        + '<div class="scroll-table"><table><thead><tr><th>Compte</th><th>Date</th><th>Libellé</th><th>Débit</th><th>Crédit</th></tr></thead>'
        + '<tbody id="rb-table-gl-' + info.id + '"></tbody></table></div>'
        + '<p style="font-size:11px; color:#999; margin:6px 0 0;">Total Débit GL : <span id="rb-tot-debit-gl-' + info.id + '">0</span> — '
        + 'Total Crédit GL : <span id="rb-tot-credit-gl-' + info.id + '">0</span></p>'
        + '</div>';
}

function rbInstaller(){
    if(typeof TABS !== 'undefined' && !TABS.some(function(t){ return t.id === 'rapprochement-bancaire'; }))
        TABS.push({ id:'rapprochement-bancaire', label:'🏦 Rapprochement Bancaire', phase:2 });

    var hote = (document.querySelector('.tab-content') || {}).parentNode;
    if(!hote) return;

    if(!document.getElementById('rapprochement-bancaire')){
        var d = document.createElement('div');
        d.id = 'rapprochement-bancaire';
        d.className = 'tab-content';
        d.innerHTML =
          '<div class="card" data-tab="rapprochement-bancaire">'
        + '<h2>🏦 RAPPROCHEMENT BANCAIRE — Novembre / Décembre</h2>'
        + '<div class="alert alert-info">Importez le relevé bancaire de chaque mois — fichier <strong>CSV</strong> '
        + '(délimiteur détecté automatiquement) ou <strong>Excel</strong> (.xlsx/.xls, première feuille lue), '
        + 'colonnes dans l\'ordre Date, Libellé, Débit, Crédit — puis pointez chaque ligne déjà comptabilisée. Sur un relevé, '
        + '<strong>Crédit</strong> = argent reçu (encaissement) et <strong>Débit</strong> = argent sorti (décaissement) — '
        + 'c\'est l\'inverse des colonnes Débit/Crédit du compte banque en comptabilité, dont c\'est déjà tenu compte '
        + 'dans le calcul de l\'écart ci-dessous. Le tableau Grand Livre affiché en regard reflète les écritures déjà '
        + 'importées dans l\'onglet <strong>Grand Livre</strong> (j) — il n\'est pas ressaisi ici.</div>'
        + '<div class="form-group" style="max-width:340px;"><label>Compte(s) banque (préfixes SYSCOHADA, séparés par une virgule)</label>'
        + '<input type="text" id="rb-comptes-banque" value="52" onchange="rbRecalculerTout()"></div>'
        + RB_MOIS.map(function(info){
            return tfSection(info.nom, rbRendreMois(info), 'rb-sec-' + info.id);
        }).join('')
        + '</div>';
        hote.appendChild(d);
    }

    var menu = document.getElementById('phase-dropdown-2');
    if(menu && !menu.querySelector('[data-rb]')){
        var b = document.createElement('button');
        b.className = 'tab-btn phase2';
        b.setAttribute('data-rb', '1');
        b.setAttribute('onclick', "showTab('rapprochement-bancaire')");
        b.textContent = '🏦 Rapprochement Bancaire';
        var apres = menu.querySelector('[onclick*="\'gl-gestion\'"]');
        if(apres && apres.nextSibling) menu.insertBefore(b, apres.nextSibling);
        else if(apres) menu.appendChild(b);
        else menu.appendChild(b);
    }

    RB_MOIS.forEach(function(m){ rbRecalculer(m.index); });
    rbAssurerBoutonsImport();
    rbObserverSync();
}

// Filet de sécurité — bug réel constaté (25/08) : un dossier qui a déjà été ouvert une
// fois AVANT l'ajout du bouton d'import a sauvegardé, dans Firestore, un onglet sans ce
// bouton (voir doSaveTab : c'est tout le innerHTML de l'onglet qui est sauvegardé, pas
// seulement les valeurs saisies). Au chargement suivant, rbInstaller() construit d'abord
// le panneau à jour, mais la synchronisation temps réel (applyRemoteTab, 10-config-
// collaboration.js) écrase ensuite div#rapprochement-bancaire.innerHTML avec cette version
// ancienne dès que le document Firestore de cet onglet arrive (quelques dizaines à
// quelques centaines de ms après le chargement) — d'où le bouton qui « apparaît puis
// disparaît ». Plutôt que de modifier ce mécanisme de synchronisation générique (partagé
// par tous les onglets), on répare chirurgicalement : si une section n'a plus son bloc
// d'import après un remplacement du DOM, on le réinjecte, sans toucher aux lignes déjà
// importées ni au reste du contenu restauré.
function rbAssurerBoutonsImport(){
    RB_MOIS.forEach(function(info){
        var contenu = document.getElementById('rb-sec-' + info.id);
        if(!contenu || contenu.querySelector('.rb-bloc-import')) return;
        var tmp = document.createElement('div');
        tmp.innerHTML = rbBlocImportHtml(info);
        contenu.insertBefore(tmp.firstChild, contenu.firstChild);
    });
}
function rbObserverSync(){
    var div = document.getElementById('rapprochement-bancaire');
    if(!div || typeof MutationObserver === 'undefined') return;
    var mo = new MutationObserver(function(){ rbAssurerBoutonsImport(); });
    mo.observe(div, { childList:true });
}

try{
    if(typeof document !== 'undefined'){
        if(document.readyState === 'loading')
            document.addEventListener('DOMContentLoaded', rbInstaller);
        else
            rbInstaller();
    }
}catch(e){}
