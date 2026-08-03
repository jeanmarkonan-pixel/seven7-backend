/* ==================================================================
   SEVEN7 — RAPPORT GÉNÉRAL DU COMMISSAIRE AUX COMPTES

   Le livrable final de la mission ne se fabriquait pas : l'onglet
   Rédaction offrait des feuilles blanches. Ce module produit le
   rapport dans sa structure normative, alimenté par ce que le dossier
   contient déjà — identification, liasse, constatations, continuité,
   vérifications spécifiques.

   Structure retenue (ISA 700 et suivantes, transposées à la pratique
   OHADA) :

     1. Titre et destinataire
     2. Opinion
     3. Fondement de l'opinion
     4. Incertitude significative liée à la continuité — si applicable
     5. Observation — si applicable
     6. Responsabilités de la direction et de la gouvernance
     7. Responsabilités du commissaire aux comptes
     8. Vérifications spécifiques
     9. Lieu, date, signature

   LE TEXTE PRODUIT EST UN PROJET. Il porte la plume du cabinet, pas
   celle de l'outil : chaque paragraphe est modifiable, et l'opinion
   reste un choix de l'auditeur, jamais une déduction automatique.
   ================================================================== */

var RAP_OPINIONS = [
 {code:'CERT',   lib:"Certification sans réserve",
  titre:"Opinion",
  phrase:"certifions que les états financiers de synthèse annuels sont réguliers et sincères et donnent une image fidèle du résultat des opérations de l'exercice écoulé ainsi que de la situation financière et du patrimoine de la société à la fin de cet exercice, conformément aux règles et méthodes du Système comptable OHADA."},
 {code:'RESERVE',lib:"Certification avec réserve",
  titre:"Opinion avec réserve",
  phrase:"certifions que, sous la réserve décrite dans la section « Fondement de l'opinion avec réserve », les états financiers de synthèse annuels sont réguliers et sincères et donnent une image fidèle du résultat des opérations de l'exercice écoulé ainsi que de la situation financière et du patrimoine de la société à la fin de cet exercice, conformément aux règles et méthodes du Système comptable OHADA."},
 {code:'REFUS',  lib:"Refus de certifier (opinion défavorable)",
  titre:"Opinion défavorable",
  phrase:"sommes d'avis qu'en raison de l'importance des faits exposés dans la section « Fondement de l'opinion défavorable », les états financiers de synthèse annuels ne sont pas réguliers et sincères et ne donnent pas une image fidèle du résultat des opérations de l'exercice écoulé ni de la situation financière et du patrimoine de la société à la fin de cet exercice."},
 {code:'IMPOSS', lib:"Impossibilité d'exprimer une opinion",
  titre:"Impossibilité d'exprimer une opinion",
  phrase:"ne sommes pas en mesure d'exprimer une opinion sur les états financiers de synthèse annuels. En raison de l'importance des faits exposés dans la section « Fondement de l'impossibilité d'exprimer une opinion », nous n'avons pas pu obtenir d'éléments probants suffisants et appropriés pour fonder une opinion."}
];

function rapOpinion(code){
    for(var i = 0; i < RAP_OPINIONS.length; i++)
        if(RAP_OPINIONS[i].code === code) return RAP_OPINIONS[i];
    return RAP_OPINIONS[0];
}

/* ------------------------------------------------------------------
   Collecte des données déjà présentes dans le dossier
   ------------------------------------------------------------------ */
function rapVal(id){
    var el = document.getElementById(id);
    return el ? String(el.value || '').trim() : '';
}
function rapDateFr(iso){
    if(!iso) return '';
    var p = String(iso).split('-');
    return p.length === 3 ? p[2] + '/' + p[1] + '/' + p[0] : String(iso);
}

function rapDonnees(){
    var d = {
        raison:   rapVal('fi-raison')   || '[Raison sociale]',
        forme:    rapVal('fi-forme'),
        rccm:     rapVal('fi-rccm'),
        siege:    rapVal('fi-siege'),
        capital:  rapVal('fi-capital'),
        exercice: rapVal('fi-exercice'),
        cloture:  rapDateFr(rapVal('fi-cloture')),
        totalBilan:null, resultat:null, ca:null
    };
    try{
        var A = liasseGetActif('n'), R = liasseGetResultat('n');
        d.totalBilan = A && A.BZ ? A.BZ.net : null;
        d.resultat   = R ? R.XI : null;
        d.ca         = R ? R.XB : null;
    }catch(e){}
    return d;
}

/* Les constatations bloquantes et majeures nourrissent le fondement de
   l'opinion : ce sont elles qui justifient une réserve. */
function rapConstatations(){
    try{
        if(typeof fmCollecter !== 'function') return { bloquants:[], majeurs:[] };
        var c = fmCollecter();
        return {
            bloquants: c.filter(function(x){ return x.degre === 'BLOQUANT'; }),
            majeurs:   c.filter(function(x){ return x.degre === 'MAJEUR'; })
        };
    }catch(e){ return { bloquants:[], majeurs:[] }; }
}

/* ------------------------------------------------------------------
   Génération du texte
   ------------------------------------------------------------------ */
function rapGenerer(){
    var d = rapDonnees();
    var op = rapOpinion(rapVal('rap-opinion') || 'CERT');
    var cst = rapConstatations();
    var continuite = document.getElementById('rap-continuite') && document.getElementById('rap-continuite').checked;
    var observation = rapVal('rap-observation');
    var enTete = d.raison + (d.forme ? ', ' + d.forme : '')
               + (d.capital ? ' au capital de ' + fmt(parseNum(d.capital)) + ' FCFA' : '');

    var t = [];
    t.push("RAPPORT GÉNÉRAL DU COMMISSAIRE AUX COMPTES");
    t.push("SUR LES ÉTATS FINANCIERS DE SYNTHÈSE ANNUELS");
    t.push("Exercice clos le " + (d.cloture || '[date de clôture]'));
    t.push("");
    t.push("Aux actionnaires de " + enTete);
    if(d.siege) t.push("Siège social : " + d.siege.replace(/\s*\n\s*/g, ', '));
    if(d.rccm)  t.push("RCCM : " + d.rccm);
    t.push("");

    /* 1. Opinion */
    t.push(op.titre.toUpperCase());
    t.push("En exécution de la mission qui nous a été confiée par votre assemblée générale, "
         + "nous avons effectué l'audit des états financiers de synthèse annuels de la société "
         + d.raison + ", relatifs à l'exercice clos le " + (d.cloture || '[date]') + ", "
         + "tels qu'ils sont joints au présent rapport.");
    if(d.totalBilan !== null)
        t.push("Ces états financiers font apparaître un total du bilan de " + fmt(d.totalBilan) + " FCFA"
             + (d.resultat !== null
                ? " et un résultat net de l'exercice de " + fmt(d.resultat) + " FCFA"
                  + (d.resultat < 0 ? " (perte)" : " (bénéfice)")
                : "") + ".");
    t.push("Nous " + op.phrase);
    t.push("");

    /* 2. Fondement */
    t.push("FONDEMENT DE L'" + op.titre.toUpperCase().replace(/^OPINION/, 'OPINION'));
    if(op.code !== 'CERT'){
        t.push("[Exposer ici, de façon claire et chiffrée, les faits qui fondent " +
               (op.code === 'IMPOSS' ? "l'impossibilité d'exprimer une opinion" : "la modification de l'opinion")
             + ", et leur incidence sur les états financiers.]");
        if(cst.bloquants.length){
            t.push("Éléments relevés au cours de nos travaux et à examiner pour cette section :");
            cst.bloquants.forEach(function(x){
                t.push("  — [" + x.source + "] " + x.libelle + (x.incidence ? " — " + x.incidence : ""));
            });
        }
    }
    t.push("Nous avons effectué notre audit selon les normes d'audit applicables. "
         + "Les responsabilités qui nous incombent en vertu de ces normes sont décrites dans la section "
         + "« Responsabilités du commissaire aux comptes relatives à l'audit des états financiers » du présent rapport.");
    t.push("Nous sommes indépendants de la société conformément aux règles de déontologie applicables "
         + "à notre profession, et nous nous sommes acquittés des autres responsabilités éthiques qui "
         + "nous incombent. Nous estimons que les éléments probants que nous avons obtenus sont "
         + (op.code === 'IMPOSS' ? "insuffisants" : "suffisants et appropriés")
         + " pour fonder notre opinion.");
    t.push("");

    /* 3. Continuité */
    if(continuite){
        t.push("INCERTITUDE SIGNIFICATIVE LIÉE À LA CONTINUITÉ D'EXPLOITATION");
        t.push("Nous attirons l'attention sur la note de l'annexe qui expose les événements ou "
             + "conditions indiquant l'existence d'une incertitude significative susceptible de jeter "
             + "un doute important sur la capacité de la société à poursuivre son exploitation. "
             + "Notre opinion n'est pas modifiée à l'égard de ce point.");
        t.push("[Préciser les faits : capitaux propres, trésorerie prévisionnelle, soutien des associés, "
             + "procédure d'alerte engagée le cas échéant.]");
        t.push("");
    }

    /* 4. Observation */
    if(observation){
        t.push("OBSERVATION");
        t.push("Sans remettre en cause l'opinion exprimée ci-dessus, nous attirons votre attention sur "
             + "le point suivant : " + observation);
        t.push("");
    }

    /* 5. Responsabilités de la direction */
    t.push("RESPONSABILITÉS DE LA DIRECTION ET DES PERSONNES CONSTITUANT LE GOUVERNEMENT D'ENTREPRISE");
    t.push("Il appartient à la direction d'établir des états financiers de synthèse annuels réguliers "
         + "et sincères, donnant une image fidèle, conformément aux règles et méthodes du Système "
         + "comptable OHADA, ainsi que de mettre en place le contrôle interne qu'elle estime nécessaire "
         + "à leur établissement, exempt d'anomalies significatives résultant de fraudes ou d'erreurs.");
    t.push("Lors de l'établissement des états financiers, il incombe à la direction d'apprécier la "
         + "capacité de la société à poursuivre son exploitation, de présenter dans ces états, le cas "
         + "échéant, les informations relatives à la continuité d'exploitation et d'appliquer la "
         + "convention comptable de continuité d'exploitation, sauf s'il est prévu de liquider la "
         + "société ou de cesser son activité.");
    t.push("");

    /* 6. Responsabilités du commissaire aux comptes */
    t.push("RESPONSABILITÉS DU COMMISSAIRE AUX COMPTES RELATIVES À L'AUDIT DES ÉTATS FINANCIERS");
    t.push("Notre objectif est d'obtenir l'assurance raisonnable que les états financiers pris dans "
         + "leur ensemble ne comportent pas d'anomalies significatives, que celles-ci proviennent de "
         + "fraudes ou résultent d'erreurs, et de délivrer un rapport contenant notre opinion. "
         + "L'assurance raisonnable correspond à un niveau élevé d'assurance, sans toutefois garantir "
         + "qu'un audit réalisé conformément aux normes applicables permet de détecter systématiquement "
         + "toute anomalie significative.");
    t.push("Dans le cadre d'un audit, nous exerçons notre jugement professionnel et faisons preuve "
         + "d'esprit critique. En outre :");
    t.push("  — nous identifions et évaluons les risques que les états financiers comportent des "
         + "anomalies significatives, définissons et mettons en œuvre des procédures d'audit en réponse "
         + "à ces risques, et réunissons des éléments probants suffisants et appropriés pour fonder "
         + "notre opinion ;");
    t.push("  — nous prenons connaissance du contrôle interne pertinent pour l'audit afin de définir "
         + "des procédures appropriées aux circonstances, et non dans le but d'exprimer une opinion sur "
         + "son efficacité ;");
    t.push("  — nous apprécions le caractère approprié des méthodes comptables retenues et le caractère "
         + "raisonnable des estimations comptables faites par la direction, ainsi que des informations "
         + "les concernant fournies dans les états financiers ;");
    t.push("  — nous tirons une conclusion quant au caractère approprié de l'utilisation par la "
         + "direction de la convention comptable de continuité d'exploitation ;");
    t.push("  — nous évaluons la présentation d'ensemble, la structure et le contenu des états "
         + "financiers, et apprécions si ces états reflètent les opérations et événements sous-jacents "
         + "d'une manière propre à donner une image fidèle.");
    t.push("");

    /* 7. Vérifications spécifiques */
    t.push("VÉRIFICATIONS SPÉCIFIQUES");
    t.push("Nous avons également procédé, conformément aux dispositions de l'Acte uniforme relatif au "
         + "droit des sociétés commerciales et du groupement d'intérêt économique, aux vérifications "
         + "spécifiques prévues par la loi.");
    t.push("Nous n'avons pas d'observation à formuler sur la sincérité et la concordance avec les états "
         + "financiers de synthèse annuels des informations données dans le rapport de gestion et dans "
         + "les documents adressés aux actionnaires sur la situation financière et les états financiers.");
    t.push("[Mentionner ici, le cas échéant, les irrégularités relevées : égalité entre associés, "
         + "conventions réglementées non autorisées, réserve légale, délais légaux.]");
    t.push("");

    /* 8. Signature */
    t.push("Fait à " + (rapVal('rap-lieu') || '[Lieu]') + ", le " + (rapDateFr(rapVal('rap-date')) || '[date du rapport]'));
    t.push("");
    t.push(rapVal('rap-cabinet') || "[Cabinet]");
    t.push(rapVal('rap-signataire') || "[Nom du commissaire aux comptes]");
    t.push("Commissaire aux comptes");

    return t.join('\n');
}

/* ------------------------------------------------------------------
   Interface
   ------------------------------------------------------------------ */
function rapAfficher(){
    var zone = document.getElementById('rap-texte');
    if(zone) zone.value = rapGenerer();
    var info = document.getElementById('rap-info');
    if(info){
        var c = rapConstatations();
        info.innerHTML = c.bloquants.length
            ? '<strong style="color:#c0392b;">' + c.bloquants.length + ' constatation(s) bloquante(s)</strong> '
              + 'au dossier : à examiner avant de retenir une certification sans réserve.'
            : 'Aucune constatation bloquante au dossier. Le choix de l’opinion vous appartient.';
    }
}

function rapExporterWord(){
    var texte = (document.getElementById('rap-texte') || {}).value || '';
    var html = '<html xmlns:w="urn:schemas-microsoft-com:office:word"><head><meta charset="utf-8">'
             + '<style>body{font-family:"Times New Roman",serif;font-size:12pt;line-height:1.5;}'
             + 'p{margin:0 0 10pt;text-align:justify;} .t{font-weight:bold;text-align:center;}'
             + '.s{font-weight:bold;margin-top:16pt;}</style></head><body>';
    texte.split('\n').forEach(function(l, i){
        var cl = i < 3 ? 't' : (/^[A-ZÉÈÀÇ' ,]{12,}$/.test(l.trim()) ? 's' : '');
        html += '<p' + (cl ? ' class="' + cl + '"' : '') + '>' + esc(l).replace(/^ +/, function(m){
            return new Array(m.length + 1).join('&nbsp;');
        }) + '</p>';
    });
    html += '</body></html>';
    var nom = (rapVal('rap-nom') || 'Rapport_general') + '.doc';
    var a = document.createElement('a');
    a.href = 'data:application/msword;charset=utf-8,' + encodeURIComponent(html);
    a.download = nom;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
}

function rapInstaller(){
    if(document.getElementById('rap-texte')) return;
    var panneau = document.getElementById('redaction');
    if(!panneau) return;
    var carte = document.createElement('div');
    carte.className = 'card';
    carte.setAttribute('data-tab', 'redaction');
    var opts = RAP_OPINIONS.map(function(o){
        return '<option value="' + esc(o.code) + '">' + esc(o.lib) + '</option>';
    }).join('');
    carte.innerHTML =
      '<h2>⚖️ RAPPORT GÉNÉRAL — projet</h2>'
    + '<div class="alert alert-info">Le texte est produit à partir de la Fiche d’identification, de la '
    + 'liasse et des Constatations d’audit, dans la structure des normes. <strong>C’est un projet : '
    + 'l’opinion reste votre choix, jamais une déduction de l’outil</strong>, et chaque paragraphe est '
    + 'modifiable avant export.</div>'
    + '<div class="form-row">'
    + '<div class="form-group" style="max-width:320px;"><label>Opinion retenue</label>'
    + '<select id="rap-opinion" onchange="rapAfficher()">' + opts + '</select></div>'
    + '<div class="form-group" style="max-width:200px;"><label>Lieu</label>'
    + '<input type="text" id="rap-lieu" data-fmt="non" onchange="rapAfficher()"></div>'
    + '<div class="form-group" style="max-width:200px;"><label>Date du rapport</label>'
    + '<input type="date" class="date-input" id="rap-date" onchange="rapAfficher()"></div>'
    + '</div>'
    + '<div class="form-row">'
    + '<div class="form-group" style="max-width:320px;"><label>Cabinet</label>'
    + '<input type="text" id="rap-cabinet" data-fmt="non" onchange="rapAfficher()"></div>'
    + '<div class="form-group" style="max-width:320px;"><label>Signataire</label>'
    + '<input type="text" id="rap-signataire" data-fmt="non" onchange="rapAfficher()"></div>'
    + '<div class="form-group" style="max-width:240px;"><label>Nom du fichier</label>'
    + '<input type="text" id="rap-nom" data-fmt="non" value="Rapport_general"></div>'
    + '</div>'
    + '<div class="form-group"><label>'
    + '<input type="checkbox" id="rap-continuite" onchange="rapAfficher()"> '
    + 'Incertitude significative liée à la continuité d’exploitation</label></div>'
    + '<div class="form-group"><label>Observation à porter au rapport (facultatif)</label>'
    + '<textarea id="rap-observation" rows="2" onchange="rapAfficher()"></textarea></div>'
    + '<p id="rap-info" style="font-size:12px; color:#666;"></p>'
    + '<button type="button" class="btn btn-primary" onclick="rapAfficher()">📝 Générer le projet</button> '
    + '<button type="button" class="btn btn-export" onclick="rapExporterWord()">📤 Exporter en Word</button>'
    + '<div class="form-group" style="margin-top:12px;"><label>Projet de rapport — modifiable</label>'
    + '<textarea id="rap-texte" rows="30" style="font-family:Georgia,serif; font-size:13px; line-height:1.55;"></textarea></div>';
    panneau.insertBefore(carte, panneau.firstChild);
}

try{
    if(typeof document !== 'undefined'){
        if(document.readyState === 'loading')
            document.addEventListener('DOMContentLoaded', rapInstaller);
        else
            rapInstaller();
    }
}catch(e){}
