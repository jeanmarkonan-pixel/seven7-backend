/* ==================================================================
   SEVEN7 — ÉCHANTILLONNAGE STATISTIQUE (ISA 530)

   L'application échantillonnait « par seuil » : toutes les écritures
   au-dessus d'un montant. C'est un sondage dirigé, parfaitement
   légitime, mais il ne permet AUCUNE conclusion sur la population non
   examinée. On ne peut pas dire ce que valent les 4 000 écritures
   qu'on n'a pas regardées.

   Ce module ajoute le sondage en unités monétaires (SUM, ou
   « monetary unit sampling »), qui permet lui d'extrapoler : chaque
   franc de la population a la même chance d'être sélectionné, si bien
   qu'une erreur trouvée se projette sur l'ensemble.

   Deux calculs, et un troisième qui les relie :

     1. TAILLE DE L'ÉCHANTILLON
        n = (population × facteur de fiabilité)
            / (erreur tolérable − erreur attendue × facteur d'expansion)

     2. INTERVALLE DE SONDAGE = population / n
        Tout élément supérieur à l'intervalle est examiné d'office :
        il est « certain d'être touché ». Les autres sont sondés.

     3. EXTRAPOLATION
        Pour un élément inférieur à l'intervalle, l'erreur se projette
        au prorata : taux d'erreur × intervalle. Pour un élément
        supérieur, l'erreur constatée vaut telle quelle — il n'y a rien
        à extrapoler puisqu'il a été vu en totalité.
        On y ajoute une provision pour risque d'échantillonnage afin
        d'obtenir l'erreur maximale probable, seule comparable au seuil.

   LES FACTEURS SONT CEUX DE LA LOI DE POISSON, publiés dans les guides
   d'échantillonnage d'audit. Ils sont reproduits ici comme repères de
   travail : à confronter au barème retenu par votre cabinet.
   ================================================================== */

/* Facteurs de fiabilité, par niveau de confiance et nombre d'erreurs
   constatées dans l'échantillon. Ligne 0 = aucune erreur trouvée.   */
var EC_FIABILITE = {
    80: [1.61, 3.00, 4.28, 5.52, 6.73, 7.91],
    85: [1.90, 3.38, 4.73, 6.02, 7.27, 8.50],
    90: [2.31, 3.89, 5.33, 6.69, 8.00, 9.28],
    95: [3.00, 4.75, 6.30, 7.76, 9.16, 10.52],
    99: [4.61, 6.64, 8.41, 10.05, 11.61, 13.11]
};
/* Facteur d'expansion de l'erreur attendue, par niveau de confiance. */
var EC_EXPANSION = { 80:1.3, 85:1.4, 90:1.5, 95:1.6, 99:1.9 };

/* Le niveau de confiance découle du risque d'audit accepté : plus le
   risque inhérent et le risque de contrôle sont élevés, plus le
   sondage doit être étendu. */
var EC_CONFIANCES = [
    {v:80, lib:"80 % — risque faible, contrôle interne jugé efficace"},
    {v:85, lib:"85 % — risque modéré"},
    {v:90, lib:"90 % — risque moyen, situation courante"},
    {v:95, lib:"95 % — risque élevé, ou cycle sensible"},
    {v:99, lib:"99 % — risque très élevé, soupçon de fraude"}
];

function ecFacteur(confiance, nbErreurs){
    var t = EC_FIABILITE[confiance] || EC_FIABILITE[90];
    var i = Math.max(0, Math.min(nbErreurs || 0, t.length - 1));
    return t[i];
}
function ecExpansion(confiance){
    return EC_EXPANSION[confiance] || EC_EXPANSION[90];
}

/**
 * Taille d'échantillon en unités monétaires.
 * @returns {{n:number, intervalle:number, facteur:number, denominateur:number, alerte:string}}
 */
function ecTaille(population, tolerable, attendue, confiance){
    population = Math.abs(parseNum(population) || 0);
    tolerable  = Math.abs(parseNum(tolerable)  || 0);
    attendue   = Math.abs(parseNum(attendue)   || 0);
    confiance  = confiance || 90;

    var facteur = ecFacteur(confiance, 0);
    var denom = tolerable - attendue * ecExpansion(confiance);

    if(!population || !tolerable)
        return { n:0, intervalle:0, facteur:facteur, denominateur:denom,
                 alerte:"Renseignez la valeur de la population et l'erreur tolérable." };
    if(denom <= 0)
        return { n:0, intervalle:0, facteur:facteur, denominateur:denom,
                 alerte:"L'erreur attendue absorbe l'erreur tolérable : le sondage ne peut "
                      + "rien démontrer. Revoyez le seuil, ou renoncez à l'approche statistique "
                      + "au profit d'un contrôle exhaustif." };

    var n = Math.ceil((population * facteur) / denom);
    if(n > population) n = Math.ceil(population);   /* garde-fou théorique */
    var alerte = '';
    if(n >= 250) alerte = "Échantillon très étendu : un contrôle exhaustif du cycle serait "
                        + "peut-être moins coûteux.";
    return { n:n, intervalle: n ? population / n : 0, facteur:facteur,
             denominateur:denom, alerte:alerte };
}

/**
 * Extrapolation des erreurs constatées.
 * @param {Array} erreurs  [{valeur, correcte}] valeur comptabilisée et valeur auditée
 * @returns {object} erreurs projetées, provision et erreur maximale probable
 */
function ecExtrapoler(erreurs, intervalle, confiance){
    intervalle = Math.abs(parseNum(intervalle) || 0);
    confiance  = confiance || 90;
    var lignes = [], projeteeSondee = 0, reelleCertaine = 0, nbSondees = 0;

    (erreurs || []).forEach(function(e){
        var valeur   = parseNum(e.valeur)   || 0;
        var correcte = parseNum(e.correcte) || 0;
        var ecart = valeur - correcte;
        if(!ecart) return;
        var certain = intervalle > 0 && Math.abs(valeur) >= intervalle;
        var taux = valeur !== 0 ? ecart / valeur : 0;
        var projetee = certain ? ecart : taux * intervalle;
        if(certain) reelleCertaine += ecart;
        else { projeteeSondee += projetee; nbSondees++; }
        lignes.push({ valeur:valeur, correcte:correcte, ecart:ecart, taux:taux * 100,
                      certain:certain, projetee:projetee });
    });

    /* Provision pour risque d'échantillonnage : l'incertitude qui subsiste
       parce qu'on n'a vu qu'une partie de la population. Elle se calcule
       sur le seul segment sondé — le segment certain a été vu en entier. */
    var base = ecFacteur(confiance, 0) * intervalle;
    var incrementale = 0;
    for(var k = 1; k <= nbSondees; k++)
        incrementale += (ecFacteur(confiance, k) - ecFacteur(confiance, k - 1) - 1) * intervalle;

    var provision = base + Math.max(0, incrementale);
    var maximale  = reelleCertaine + projeteeSondee + provision;

    return {
        lignes: lignes,
        nbErreurs: lignes.length,
        reelleCertaine: reelleCertaine,
        projeteeSondee: projeteeSondee,
        projeteeTotale: reelleCertaine + projeteeSondee,
        provision: provision,
        maximale: maximale
    };
}

/** Conclusion d'audit : l'erreur maximale probable est-elle acceptable ? */
function ecConclusion(maximale, tolerable){
    tolerable = Math.abs(parseNum(tolerable) || 0);
    maximale  = Math.abs(maximale || 0);
    if(!tolerable) return { ok:null, texte:"Renseignez l'erreur tolérable pour conclure." };
    if(maximale <= tolerable * 0.5)
        return { ok:true, texte:"L'erreur maximale probable est nettement inférieure à l'erreur "
                              + "tolérable : la population peut être acceptée." };
    if(maximale <= tolerable)
        return { ok:true, texte:"L'erreur maximale probable reste inférieure à l'erreur tolérable, "
                              + "mais la marge est étroite. Envisagez d'étendre le sondage." };
    return { ok:false, texte:"L'erreur maximale probable DÉPASSE l'erreur tolérable : la population "
                           + "ne peut pas être acceptée en l'état. Étendez le sondage, demandez la "
                           + "correction des anomalies, ou tirez-en les conséquences sur l'opinion." };
}

/* ------------------------------------------------------------------
   Interface
   ------------------------------------------------------------------ */
function ecLireConfiance(){
    var el = document.getElementById('ec-confiance');
    return el ? (parseInt(el.value, 10) || 90) : 90;
}

function ecLigneErreurHtml(){
    var oc = 'onchange="ecCalculer()"';
    return '<tr>'
        + '<td><input type="text" class="ec-ref" data-fmt="non" placeholder="Réf. pièce" ' + oc + '></td>'
        + '<td><input type="text" class="ec-valeur" data-montant="1" ' + oc + '></td>'
        + '<td><input type="text" class="ec-correcte" data-montant="1" ' + oc + '></td>'
        + '<td class="number ec-ecart"></td>'
        + '<td class="ec-nature"></td>'
        + '<td class="number ec-projetee"></td>'
        + '<td><button type="button" class="btn btn-danger" onclick="this.closest(\'tr\').remove(); ecCalculer();">✕</button></td>'
        + '</tr>';
}
function ecAjouterErreur(){
    var t = document.getElementById('table-ec-erreurs');
    if(t) t.insertAdjacentHTML('beforeend', ecLigneErreurHtml());
    ecCalculer();
}

function ecCalculer(){
    var conf = ecLireConfiance();
    var pop  = parseNum((document.getElementById('ec-population') || {}).value);
    var tol  = parseNum((document.getElementById('ec-tolerable')  || {}).value);
    var att  = parseNum((document.getElementById('ec-attendue')   || {}).value);

    var t = ecTaille(pop, tol, att, conf);
    var pose = function(id, v){ var e = document.getElementById(id); if(e) e.textContent = v; };
    pose('ec-taille',     t.n ? String(t.n) : '—');
    pose('ec-intervalle', t.intervalle ? fmt(t.intervalle) : '—');
    pose('ec-facteur',    t.facteur.toFixed(2));
    var alerte = document.getElementById('ec-alerte');
    if(alerte){
        alerte.textContent = t.alerte || '';
        alerte.style.display = t.alerte ? 'block' : 'none';
        alerte.className = 'alert ' + (t.n ? 'alert-warning' : 'alert-danger');
    }

    /* Erreurs saisies */
    var table = document.getElementById('table-ec-erreurs');
    var saisies = [];
    if(table)
        for(var i = 1; i < table.rows.length; i++){
            var tr = table.rows[i];
            var v = tr.querySelector('.ec-valeur'), c = tr.querySelector('.ec-correcte');
            saisies.push({ valeur: v ? v.value : 0, correcte: c ? c.value : 0, tr: tr });
        }

    var ex = ecExtrapoler(saisies, t.intervalle, conf);

    /* Report ligne à ligne */
    var k = 0;
    saisies.forEach(function(s){
        var val = parseNum(s.valeur) || 0, cor = parseNum(s.correcte) || 0;
        var ecart = val - cor;
        var cell = function(cls){ return s.tr.querySelector('.' + cls); };
        if(cell('ec-ecart')) cell('ec-ecart').textContent = ecart ? fmt(ecart) : '';
        if(!ecart){
            if(cell('ec-nature')) cell('ec-nature').textContent = '';
            if(cell('ec-projetee')) cell('ec-projetee').textContent = '';
            return;
        }
        var l = ex.lignes[k++];
        if(cell('ec-nature'))
            cell('ec-nature').innerHTML = l.certain
                ? '<span title="Élément supérieur à l’intervalle : examiné en totalité, rien à extrapoler">certain</span>'
                : '<span title="Élément sondé : l’erreur se projette au prorata sur l’intervalle">sondé</span>';
        if(cell('ec-projetee')) cell('ec-projetee').textContent = fmt(l.projetee);
    });

    pose('ec-nb-erreurs',   String(ex.nbErreurs));
    pose('ec-proj-totale',  fmt(ex.projeteeTotale));
    pose('ec-provision',    fmt(ex.provision));
    pose('ec-maximale',     fmt(ex.maximale));

    var c = ecConclusion(ex.maximale, tol);
    var zc = document.getElementById('ec-conclusion');
    if(zc){
        zc.textContent = c.texte;
        zc.className = 'alert ' + (c.ok === null ? 'alert-info' : (c.ok ? 'alert-success' : 'alert-danger'));
    }
}

function ecInstaller(){
    if(document.getElementById('ec-population')) return;
    var panneau = document.getElementById('controle-gl-sondage');
    if(!panneau) return;
    var opts = EC_CONFIANCES.map(function(c){
        return '<option value="' + c.v + '"' + (c.v === 90 ? ' selected' : '') + '>' + esc(c.lib) + '</option>';
    }).join('');
    var carte = document.createElement('div');
    carte.className = 'card';
    carte.setAttribute('data-tab', 'controle-gl-sondage');
    carte.innerHTML =
      '<h2>🎲 ÉCHANTILLONNAGE STATISTIQUE — sondage en unités monétaires</h2>'
    + '<div class="alert alert-info">Le sondage par seuil ci-dessus ne permet <strong>aucune '
    + 'conclusion sur la population non examinée</strong>. Le sondage en unités monétaires, lui, '
    + 'autorise l’extrapolation : chaque franc a la même chance d’être tiré, donc une erreur trouvée '
    + 'se projette sur l’ensemble. Facteurs de la loi de Poisson — à confronter au barème de votre '
    + 'cabinet.</div>'
    + '<div class="form-row">'
    + '<div class="form-group" style="max-width:230px;"><label>Valeur de la population</label>'
    + '<input type="text" id="ec-population" data-montant="1" onchange="ecCalculer()"></div>'
    + '<div class="form-group" style="max-width:230px;"><label>Erreur tolérable</label>'
    + '<input type="text" id="ec-tolerable" data-montant="1" onchange="ecCalculer()"></div>'
    + '<div class="form-group" style="max-width:230px;"><label>Erreur attendue</label>'
    + '<input type="text" id="ec-attendue" data-montant="1" value="0" onchange="ecCalculer()"></div>'
    + '<div class="form-group" style="max-width:340px;"><label>Niveau de confiance</label>'
    + '<select id="ec-confiance" onchange="ecCalculer()">' + opts + '</select></div>'
    + '</div>'
    + '<div class="grid-3">'
    + '<div class="stat-box" style="background:linear-gradient(135deg,#2980b9 0%,#1a5276 100%);">'
    + '<h4 id="ec-taille">—</h4><p>Taille de l’échantillon</p></div>'
    + '<div class="stat-box" style="background:linear-gradient(135deg,#8e44ad 0%,#6c3483 100%);">'
    + '<h4 id="ec-intervalle">—</h4><p>Intervalle de sondage</p></div>'
    + '<div class="stat-box" style="background:linear-gradient(135deg,#16a085 0%,#0e6655 100%);">'
    + '<h4 id="ec-facteur">—</h4><p>Facteur de fiabilité</p></div>'
    + '</div>'
    + '<div id="ec-alerte" style="display:none;"></div>'
    + '<h3 style="margin-top:18px;">Anomalies relevées dans l’échantillon</h3>'
    + '<div class="scroll-table"><table id="table-ec-erreurs">'
    + '<tr><th style="width:18%;">Référence</th><th style="width:16%;">Valeur comptabilisée</th>'
    + '<th style="width:16%;">Valeur auditée</th><th style="width:14%;">Écart</th>'
    + '<th style="width:10%;">Nature</th><th style="width:16%;">Erreur projetée</th><th></th></tr>'
    + '</table></div>'
    + '<button type="button" class="btn" onclick="ecAjouterErreur()">+ Ajouter une anomalie</button>'
    + '<div class="grid-3" style="margin-top:14px;">'
    + '<div class="stat-box" style="background:linear-gradient(135deg,#e67e22 0%,#ba6018 100%);">'
    + '<h4 id="ec-proj-totale">0</h4><p>Erreur projetée totale</p></div>'
    + '<div class="stat-box" style="background:linear-gradient(135deg,#7f8c8d 0%,#5d6d6e 100%);">'
    + '<h4 id="ec-provision">0</h4><p>Provision pour risque d’échantillonnage</p></div>'
    + '<div class="stat-box" style="background:linear-gradient(135deg,#c0392b 0%,#922b21 100%);">'
    + '<h4 id="ec-maximale">0</h4><p>Erreur maximale probable</p></div>'
    + '</div>'
    + '<p style="font-size:11px; color:#777;">Anomalies saisies : <span id="ec-nb-erreurs">0</span></p>'
    + '<div id="ec-conclusion" class="alert alert-info">Renseignez l’erreur tolérable pour conclure.</div>';
    panneau.appendChild(carte);
    ecCalculer();
}

try{
    if(typeof document !== 'undefined'){
        if(document.readyState === 'loading')
            document.addEventListener('DOMContentLoaded', ecInstaller);
        else
            ecInstaller();
    }
}catch(e){}
