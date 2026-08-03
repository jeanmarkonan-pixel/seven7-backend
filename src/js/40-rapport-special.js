/* ==================================================================
   SEVEN7 — RAPPORT SPÉCIAL SUR LES CONVENTIONS RÉGLEMENTÉES

   Obligation propre au commissaire aux comptes en zone OHADA
   (AUSCGIE art. 438 et suivants) : un rapport DISTINCT du rapport
   général, présenté à la même assemblée que celle qui statue sur les
   comptes. Son absence est une carence de la mission.

   L'application le recensait dans les diligences sans le produire.

   Trois principes que le texte doit respecter, et que ce module rend
   littéraux :

   1. Le commissaire aux comptes NE SE PRONONCE PAS sur l'utilité ni
      le bien-fondé des conventions. Il en communique les
      caractéristiques et les modalités essentielles. C'est à
      l'assemblée d'apprécier.
   2. Il n'a PAS À RECHERCHER l'existence d'autres conventions : il
      rapporte celles dont il a été avisé ou qu'il a découvertes.
   3. L'absence de convention se DIT — un rapport muet ne vaut pas
      déclaration d'absence.

   ATTENTION : les articles cités sont des repères de travail. Ils
   doivent être confrontés à la version en vigueur de l'Acte uniforme
   avant usage en mission.
   ================================================================== */

/* Rubriques du rapport, dans l'ordre où elles s'y présentent. */
var CONV_RUBRIQUES = [
 {code:'AUT_EX',  lib:"Conventions autorisées et conclues au cours de l'exercice",
  intro:"Nous vous informons qu'il nous a été donné avis des conventions suivantes, "
      + "autorisées au cours de l'exercice écoulé.",
  vide:"Nous vous informons qu'il ne nous a été donné avis d'aucune convention autorisée "
      + "et conclue au cours de l'exercice écoulé."},

 {code:'AUT_POST', lib:"Conventions autorisées et conclues depuis la clôture",
  intro:"Nous vous informons qu'il nous a été donné avis des conventions suivantes, "
      + "autorisées et conclues depuis la clôture de l'exercice.",
  vide:''},

 {code:'POURSUIV', lib:"Conventions approuvées au cours d'exercices antérieurs dont l'exécution s'est poursuivie",
  intro:"L'exécution des conventions suivantes, approuvées au cours d'exercices antérieurs, "
      + "s'est poursuivie au cours de l'exercice écoulé.",
  vide:''},

 {code:'NON_AUT',  lib:"Conventions non autorisées préalablement",
  intro:"Nous vous présentons les conventions suivantes, conclues sans autorisation préalable "
      + "de l'organe compétent. Il vous appartient d'apprécier les conséquences de cette absence "
      + "d'autorisation, notamment au regard de la responsabilité de leurs auteurs.",
  vide:'', alerte:true},

 {code:'INTERDIT', lib:"Conventions interdites",
  intro:"Nous avons relevé les opérations suivantes, que l'Acte uniforme interdit — notamment "
      + "les emprunts contractés auprès de la société par ses dirigeants, les découverts qui leur "
      + "sont consentis, et les cautions ou avals donnés par la société en garantie de leurs "
      + "engagements envers des tiers.",
  vide:'', alerte:true}
];

function convRubrique(code){
    for(var i = 0; i < CONV_RUBRIQUES.length; i++)
        if(CONV_RUBRIQUES[i].code === code) return CONV_RUBRIQUES[i];
    return CONV_RUBRIQUES[0];
}

/* ------------------------------------------------------------------
   Saisie des conventions
   ------------------------------------------------------------------ */
function convLigneHtml(){
    var oc = 'onchange="updateStatus(\'redaction\')"';
    var opts = CONV_RUBRIQUES.map(function(r){
        return '<option value="' + esc(r.code) + '">' + esc(r.lib) + '</option>';
    }).join('');
    return '<tr>'
        + '<td><select class="cv-rub" ' + oc + '>' + opts + '</select></td>'
        + '<td><input type="text" class="cv-personne" data-fmt="non" placeholder="M. X, administrateur" ' + oc + '></td>'
        + '<td><input type="text" class="cv-nature" data-fmt="non" placeholder="Bail commercial" ' + oc + '></td>'
        + '<td><textarea class="cv-modalites" rows="2" placeholder="Loyer mensuel, durée, conditions" ' + oc + '></textarea></td>'
        + '<td><input type="text" class="cv-montant" data-montant="1" ' + oc + '></td>'
        + '<td><input type="text" class="cv-autorisation" data-fmt="non" placeholder="CA du 12/03/2025" ' + oc + '></td>'
        + '<td><button type="button" class="btn btn-danger" onclick="deleteRow(this)">✕</button></td>'
        + '</tr>';
}

function convAjouter(){
    var t = document.getElementById('table-conventions');
    if(t) t.insertAdjacentHTML('beforeend', convLigneHtml());
}

/** Lit le tableau et rend les conventions groupées par rubrique. */
function convCollecter(){
    var t = document.getElementById('table-conventions');
    var out = {};
    CONV_RUBRIQUES.forEach(function(r){ out[r.code] = []; });
    if(!t) return out;
    for(var i = 1; i < t.rows.length; i++){
        var tr = t.rows[i];
        var lire = function(cls){
            var el = tr.querySelector('.' + cls);
            return el ? String(el.value || '').trim() : '';
        };
        var c = {
            rubrique: lire('cv-rub') || 'AUT_EX',
            personne: lire('cv-personne'),
            nature:   lire('cv-nature'),
            modalites:lire('cv-modalites'),
            montant:  lire('cv-montant'),
            autorisation: lire('cv-autorisation')
        };
        /* une ligne entièrement vide n'est pas une convention */
        if(!c.personne && !c.nature && !c.modalites && !c.montant) continue;
        (out[c.rubrique] = out[c.rubrique] || []).push(c);
    }
    return out;
}

/* ------------------------------------------------------------------
   Génération du texte
   ------------------------------------------------------------------ */
function convGenerer(){
    var d = (typeof rapDonnees === 'function') ? rapDonnees() : { raison:'[Raison sociale]', cloture:'' };
    var groupes = convCollecter();
    var t = [];

    t.push("RAPPORT SPÉCIAL DU COMMISSAIRE AUX COMPTES");
    t.push("SUR LES CONVENTIONS RÉGLEMENTÉES");
    t.push("Exercice clos le " + (d.cloture || '[date de clôture]'));
    t.push("");
    t.push("Aux actionnaires de " + d.raison
         + (d.forme ? ', ' + d.forme : '')
         + (d.capital ? ' au capital de ' + fmt(parseNum(d.capital)) + ' FCFA' : ''));
    t.push("");

    /* Rappel de la portée de la mission — c'est ce qui distingue ce
       rapport d'un avis sur l'opportunité des conventions. */
    t.push("En notre qualité de commissaire aux comptes de votre société, nous vous présentons "
         + "notre rapport sur les conventions réglementées.");
    t.push("Il nous appartient de vous communiquer, sur la base des informations qui nous ont été "
         + "données, les caractéristiques et les modalités essentielles des conventions dont nous "
         + "avons été avisés ou que nous aurions découvertes à l'occasion de notre mission, "
         + "SANS AVOIR À NOUS PRONONCER SUR LEUR UTILITÉ ET LEUR BIEN-FONDÉ ni à rechercher "
         + "l'existence d'autres conventions. Il vous appartient d'apprécier l'intérêt qui "
         + "s'attachait à la conclusion de ces conventions en vue de leur approbation.");
    t.push("");

    var total = 0;
    CONV_RUBRIQUES.forEach(function(r){
        var liste = groupes[r.code] || [];
        total += liste.length;
        /* Les rubriques sans convention ne s'impriment que si l'absence
           doit être déclarée — c'est le cas des conventions de l'exercice. */
        if(!liste.length && !r.vide) return;

        t.push(r.lib.toUpperCase());
        if(!liste.length){ t.push(r.vide); t.push(""); return; }

        t.push(r.intro);
        t.push("");
        liste.forEach(function(c, k){
            t.push("  " + (k + 1) + ". " + (c.nature || "[Nature et objet de la convention]"));
            t.push("     Personne concernée : " + (c.personne || "[à préciser]"));
            if(c.autorisation) t.push("     Autorisation : " + c.autorisation);
            else if(r.code === 'AUT_EX' || r.code === 'AUT_POST')
                t.push("     Autorisation : [organe et date à préciser]");
            if(c.modalites) t.push("     Modalités essentielles : " + c.modalites);
            if(c.montant)
                t.push("     Montant comptabilisé au titre de l'exercice : "
                     + fmt(parseNum(c.montant)) + " FCFA");
            t.push("");
        });
    });

    if(total === 0){
        t.push("Nous vous informons par ailleurs qu'il ne nous a été donné avis d'aucune autre "
             + "convention entrant dans le champ des dispositions de l'Acte uniforme relatif au "
             + "droit des sociétés commerciales et du groupement d'intérêt économique.");
        t.push("");
    }

    t.push("Fait à " + ((typeof rapVal === 'function' && rapVal('rap-lieu')) || '[Lieu]')
         + ", le " + ((typeof rapVal === 'function' && rapDateFr(rapVal('rap-date'))) || '[date du rapport]'));
    t.push("");
    t.push((typeof rapVal === 'function' && rapVal('rap-cabinet')) || "[Cabinet]");
    t.push((typeof rapVal === 'function' && rapVal('rap-signataire')) || "[Nom du commissaire aux comptes]");
    t.push("Commissaire aux comptes");

    return t.join('\n');
}

function convAfficher(){
    var z = document.getElementById('conv-texte');
    if(z) z.value = convGenerer();
    var info = document.getElementById('conv-info');
    if(info){
        var g = convCollecter();
        var nb = 0, alertes = 0;
        CONV_RUBRIQUES.forEach(function(r){
            var n = (g[r.code] || []).length;
            nb += n;
            if(r.alerte) alertes += n;
        });
        info.innerHTML = nb === 0
            ? "Aucune convention saisie : le rapport déclarera expressément cette absence."
            : nb + " convention(s) saisie(s)"
              + (alertes ? ' — dont <strong style="color:#c0392b;">' + alertes
                 + ' non autorisée(s) ou interdite(s)</strong>, à signaler à l’assemblée.' : '.');
    }
}

function convExporterWord(){
    var texte = (document.getElementById('conv-texte') || {}).value || '';
    var html = '<html xmlns:w="urn:schemas-microsoft-com:office:word"><head><meta charset="utf-8">'
             + '<style>body{font-family:"Times New Roman",serif;font-size:12pt;line-height:1.5;}'
             + 'p{margin:0 0 10pt;text-align:justify;} .t{font-weight:bold;text-align:center;}'
             + '.s{font-weight:bold;margin-top:16pt;}</style></head><body>';
    texte.split('\n').forEach(function(l, i){
        var cl = i < 3 ? 't' : (/^[A-ZÉÈÀÇ' ,’-]{12,}$/.test(l.trim()) ? 's' : '');
        html += '<p' + (cl ? ' class="' + cl + '"' : '') + '>'
              + esc(l).replace(/^ +/, function(m){ return new Array(m.length + 1).join('&nbsp;'); })
              + '</p>';
    });
    html += '</body></html>';
    var a = document.createElement('a');
    a.href = 'data:application/msword;charset=utf-8,' + encodeURIComponent(html);
    a.download = 'Rapport_special_conventions.doc';
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
}

function convInstaller(){
    if(document.getElementById('conv-texte')) return;
    var panneau = document.getElementById('redaction');
    if(!panneau) return;
    var carte = document.createElement('div');
    carte.className = 'card';
    carte.setAttribute('data-tab', 'redaction');
    carte.innerHTML =
      '<h2>🤝 RAPPORT SPÉCIAL — conventions réglementées</h2>'
    + '<div class="alert alert-info">Rapport <strong>distinct du rapport général</strong>, présenté à '
    + 'la même assemblée (AUSCGIE art. 438 et suivants). Le commissaire aux comptes y communique les '
    + 'caractéristiques des conventions <strong>sans se prononcer sur leur utilité ni leur '
    + 'bien-fondé</strong> : c’est à l’assemblée d’apprécier. L’absence de convention doit être '
    + 'déclarée expressément — un rapport muet ne vaut pas déclaration.</div>'
    + '<div class="scroll-table"><table id="table-conventions">'
    + '<tr><th style="width:20%;">Rubrique</th><th style="width:15%;">Personne concernée et qualité</th>'
    + '<th style="width:15%;">Nature et objet</th><th style="width:23%;">Modalités essentielles</th>'
    + '<th style="width:12%;">Montant de l’exercice</th><th style="width:13%;">Autorisation</th><th></th></tr>'
    + '</table></div>'
    + '<button type="button" class="btn" onclick="convAjouter()">+ Ajouter une convention</button> '
    + '<button type="button" class="btn btn-primary" onclick="convAfficher()">📝 Générer le rapport spécial</button> '
    + '<button type="button" class="btn btn-export" onclick="convExporterWord()">📤 Exporter en Word</button>'
    + '<p id="conv-info" style="font-size:12px; color:#666;"></p>'
    + '<div class="form-group" style="margin-top:10px;"><label>Projet de rapport spécial — modifiable</label>'
    + '<textarea id="conv-texte" rows="24" style="font-family:Georgia,serif; font-size:13px; line-height:1.55;"></textarea></div>';
    panneau.appendChild(carte);
}

try{
    if(typeof document !== 'undefined'){
        if(document.readyState === 'loading')
            document.addEventListener('DOMContentLoaded', convInstaller);
        else
            convInstaller();
    }
}catch(e){}
