/* ==================================================================
   SEVEN7 — REVUE ANALYTIQUE : DÉTAIL DES COMPTES PAR GRANDE MASSE

   La revue analytique s'arrêtait aux grandes masses : on voyait que
   l'actif circulant variait de 130 millions, sans voir quel compte
   portait la variation. Il fallait basculer sur Détection des erreurs
   pour le savoir, et le rapprochement se faisait de tête.

   Ce module descend d'un cran, sur le modèle du §5 de Détection des
   erreurs : sous chaque grande masse, les comptes qui la composent,
   avec leur solde N, N-1, la variation et son poids dans la variation
   de la masse.

   Le rattachement d'un compte à une masse passe par paramResolve —
   le MÊME mécanisme que la liasse. Le détail ne peut donc pas dériver
   des totaux qu'il explique : c'est ce que vérifient les tests.
   ================================================================== */

/* Chaque grande masse de l'onglet, et les postes de liasse qui la
   composent. Les clés reprennent les data-revue-key du tableau.      */
var RVD_MASSES = [
 {cle:'ai',  lib:"Total Actif Immobilisé",   cote:'actif',
  refs:['AD','AE','AF','AG','AH','AI','AJ','AK','AL','AM','AN','AP','AQ','AR','AS']},
 {cle:'ac',  lib:"Total Actif Circulant",    cote:'actif',
  refs:['BA','BB','BG','BH','BI','BJ']},
 {cle:'ta',  lib:"Total Trésorerie-Actif",   cote:'actif',
  refs:['BQ','BR','BS']},
 {cle:'cp',  lib:"Total Capitaux Propres",   cote:'passif',
  refs:['CA','CB','CD','CE','CF','CG','CH','CJ','CL','CM']},
 {cle:'df',  lib:"Total Dettes Financières", cote:'passif',
  refs:['DA','DB','DC']},
 {cle:'pc',  lib:"Total Passif Circulant",   cote:'passif',
  refs:['DH','DI','DJ','DK','DM','DN']}
];

var RVD_INDEX = null;
function rvdIndexRefs(){
    if(RVD_INDEX) return RVD_INDEX;
    RVD_INDEX = {};
    RVD_MASSES.forEach(function(m){
        m.refs.forEach(function(r){ RVD_INDEX[r] = m.cle; });
    });
    return RVD_INDEX;
}

/** Masse à laquelle un compte se rattache, via le moteur de la liasse.
 *  Les comptes d'amortissement et de dépréciation SONT retenus : leur
 *  solde créditeur vient en diminution, si bien que le total du détail
 *  donne la valeur NETTE, celle qu'affiche la grande masse. Les exclure
 *  aurait laissé un écart égal aux amortissements cumulés.            */
function rvdMasseDe(compte, sd, sc){
    try{
        var m = paramResolve(compte, sd, sc);
        if(!m) return null;
        return rvdIndexRefs()[m.ref] || null;
    }catch(e){ return null; }
}

/**
 * Détail d'une grande masse : un poste par compte, N, N-1 et variation.
 * Les comptes absents d'un exercice comptent pour zéro dans celui-ci.
 */
function rvdDetail(cle){
    var rowsN  = (typeof balanceData !== 'undefined' && balanceData.n)  ? balanceData.n  : [];
    var rowsN1 = (typeof balanceData !== 'undefined' && balanceData.n1) ? balanceData.n1 : [];
    var acc = {};

    /* Un compte dont le sens s'inverse d'un exercice à l'autre change de
       masse : un compte d'État créditeur en N-1 (passif circulant) et
       débiteur en N (actif circulant) apparaît dans les deux, chacune ne
       portant que le montant qui lui revient. C'est ce qui permet aux deux
       masses de recouper. On le signale, sans quoi la variation lue dans
       chaque masse paraîtrait aberrante.                                */
    function ajouter(r, champ, autre){
        var sd = parseNum(r.sd) || 0, sc = parseNum(r.sc) || 0;
        var masse = rvdMasseDe(r.compte, sd, sc);
        var k = cycKey(r.compte);
        if(masse !== cle){
            if(masse) autre[k] = masse;   /* mémorisé pour détecter la bascule */
            return;
        }
        if(!acc[k]) acc[k] = { compte:k, intitule:(r.intitule || '').trim(), n:0, n1:0, poste:'' };
        if(!acc[k].intitule && r.intitule) acc[k].intitule = String(r.intitule).trim();
        acc[k][champ] += sd - sc;
        if(!acc[k].poste){
            try{ var m = paramResolve(r.compte, sd, sc); if(m) acc[k].poste = m.ref; }catch(e){}
        }
    }
    var ailleursN = {}, ailleursN1 = {};
    rowsN.forEach(function(r){ ajouter(r, 'n', ailleursN); });
    rowsN1.forEach(function(r){ ajouter(r, 'n1', ailleursN1); });

    var out = [];
    for(var k in acc) if(Object.prototype.hasOwnProperty.call(acc, k)){
        var a = acc[k];
        a.variation = a.n - a.n1;
        a.pct = a.n1 !== 0 ? (a.variation / Math.abs(a.n1)) * 100 : (a.n !== 0 ? 100 : 0);
        a.bascule = (ailleursN1[k] && !a.n1) ? ailleursN1[k]
                  : ((ailleursN[k] && !a.n) ? ailleursN[k] : '');
        out.push(a);
    }

    /* Le résultat net n'est pas un compte de balance : il est calculé.
       Sans cette ligne, le détail des capitaux propres manquerait le
       résultat de l'exercice et ne recouperait pas la grande masse. */
    if(cle === 'cp'){
        var rN = 0, rN1 = 0;
        try{ rN  = liasseGetResultat('n').XI  || 0; }catch(e){}
        try{ rN1 = liasseGetResultat('n1').XI || 0; }catch(e){}
        if(rN || rN1){
            /* Les capitaux propres se lisent en solde créditeur : un bénéfice
               augmente la masse, on l'inscrit donc au même signe que les
               autres lignes de ce détail (sd − sc, donc négatif au passif). */
            out.push({
                compte:'—', intitule:"Résultat net de l'exercice (calculé, poste CJ)",
                poste:'CJ', calcule:true,
                n:-rN, n1:-rN1, variation:-(rN - rN1),
                pct: rN1 !== 0 ? ((rN - rN1) / Math.abs(rN1)) * 100 : (rN !== 0 ? 100 : 0)
            });
        }
    }
    /* Le compte qui explique le plus de la variation vient en tête. */
    out.sort(function(x, y){ return Math.abs(y.variation) - Math.abs(x.variation); });

    /* Poids calculé APRÈS l'ajout de la ligne de résultat, sans quoi les
       capitaux propres totaliseraient un poids inférieur à 100 %. */
    var totVar = out.reduce(function(s, a){ return s + Math.abs(a.variation); }, 0);
    out.forEach(function(a){ a.poids = totVar ? (Math.abs(a.variation) / totVar) * 100 : 0; });
    return out;
}

/** Totaux du détail, pour contrôler qu'il recoupe bien la grande masse. */
function rvdTotaux(cle){
    var d = rvdDetail(cle), t = { n:0, n1:0 };
    d.forEach(function(a){ t.n += a.n; t.n1 += a.n1; });
    t.variation = t.n - t.n1;
    t.comptes = d.length;
    return t;
}

/* ------------------------------------------------------------------
   RENDU
   ------------------------------------------------------------------ */
function rvdSeuilPct(){
    var el = document.getElementById('rvd-seuil-pct');
    var v = el ? parseNum(el.value, true) : 0;
    return v > 0 ? v : 15;
}
function rvdSeuilMontant(){
    var el = document.getElementById('rvd-seuil-montant');
    return el ? (parseNum(el.value) || 0) : 0;
}

function rvdRendre(){
    var zone = document.getElementById('revue-detail');
    if(!zone) return;
    var rows = (typeof balanceData !== 'undefined' && balanceData.n) ? balanceData.n : [];
    if(!rows.length){
        zone.innerHTML = '<div class="alert alert-info">Chargez la balance N pour obtenir le '
                       + 'détail des comptes composant chaque grande masse.</div>';
        return;
    }
    var sPct = rvdSeuilPct(), sMont = rvdSeuilMontant();
    var html = '';

    RVD_MASSES.forEach(function(m){
        var d = rvdDetail(m.cle);
        if(!d.length) return;
        var t = rvdTotaux(m.cle);
        var retenus = d.filter(function(a){
            return Math.abs(a.pct) >= sPct || (sMont > 0 && Math.abs(a.variation) >= sMont);
        });

        html += '<h4 style="margin:18px 0 6px;">' + esc(m.lib)
             + ' <span style="font-weight:normal; font-size:12px; color:#666;">— '
             + t.comptes + ' compte(s), variation totale ' + fmt(t.variation)
             + ' · ' + retenus.length + ' au-delà des seuils</span></h4>';
        html += '<div class="scroll-table"><table>'
             + '<tr><th style="width:11%;">Compte</th><th>Intitulé</th><th style="width:6%;">Poste</th>'
             + '<th style="width:13%;">N</th><th style="width:13%;">N-1</th>'
             + '<th style="width:13%;">Variation</th><th style="width:8%;">%</th>'
             + '<th style="width:9%;">Poids</th><th style="width:8%;">Alerte</th></tr>';

        d.forEach(function(a){
            var alerte = Math.abs(a.pct) >= sPct || (sMont > 0 && Math.abs(a.variation) >= sMont);
            var libMasse = function(c){
                for(var i = 0; i < RVD_MASSES.length; i++)
                    if(RVD_MASSES[i].cle === c) return RVD_MASSES[i].lib;
                return c;
            };
            html += '<tr' + (alerte ? ' class="risk-high"' : '') + '>'
                 + '<td>' + esc(a.compte) + '</td>'
                 + '<td style="font-size:11px;">' + esc(a.intitule)
                 + (a.bascule ? '<br><span style="color:#b8860b;" title="Le sens du solde s’inverse d’un exercice à l’autre : '
                     + 'le montant de l’autre exercice figure dans « ' + esc(libMasse(a.bascule)) + ' ». '
                     + 'La variation lue ici ne porte donc que sur un seul exercice.">'
                     + '⇄ bascule depuis ' + esc(libMasse(a.bascule)) + '</span>' : '')
                 + '</td>'
                 + '<td style="font-size:11px;">' + esc(a.poste) + '</td>'
                 + '<td class="number">' + fmt(a.n) + '</td>'
                 + '<td class="number">' + fmt(a.n1) + '</td>'
                 + '<td class="number">' + fmt(a.variation) + '</td>'
                 + '<td class="number">' + a.pct.toFixed(1) + '%</td>'
                 + '<td class="number">' + a.poids.toFixed(0) + '%</td>'
                 + '<td>' + (alerte ? '⚠' : '') + '</td></tr>';
        });
        /* Ligne de contrôle : le détail doit recouper la grande masse. */
        html += '<tr class="total-row"><td colspan="3"><strong>Total du détail</strong></td>'
             + '<td class="number">' + fmt(t.n) + '</td><td class="number">' + fmt(t.n1) + '</td>'
             + '<td class="number">' + fmt(t.variation) + '</td><td colspan="3"></td></tr>';
        html += '</table></div>';
    });

    zone.innerHTML = html || '<div class="alert alert-info">Aucun compte rattaché aux grandes masses.</div>';
}

/** Insère le bloc sous le tableau des grandes masses. */
function rvdInstaller(){
    if(document.getElementById('revue-detail')) return;
    var table = document.getElementById('revue-bilan-table');
    if(!table) return;
    var apres = table.parentNode;                     /* le div.scroll-table */
    var bloc = document.createElement('div');
    bloc.innerHTML =
      '<h3 style="margin-top:22px;">Bilan — Détail des comptes par grande masse</h3>'
    + '<div class="alert alert-info">Descend d’un cran sous les grandes masses : quel compte '
    + 'porte la variation, et pour quelle part. Le rattachement passe par le même moteur que '
    + 'la liasse, si bien que le total du détail recoupe la masse qu’il explique.</div>'
    + '<div class="form-row">'
    + '<div class="form-group" style="max-width:220px;"><label>Seuil de variation (%)</label>'
    + '<input type="number" id="rvd-seuil-pct" class="pct" value="15" onchange="rvdRendre()"></div>'
    + '<div class="form-group" style="max-width:260px;"><label>Seuil de variation (montant)</label>'
    + '<input type="text" id="rvd-seuil-montant" data-montant="1" value="0" onchange="rvdRendre()"></div>'
    + '<div class="form-group" style="align-self:flex-end;">'
    + '<button type="button" class="btn btn-primary" onclick="rvdRendre()">🔎 Détailler</button></div>'
    + '</div>'
    + '<div id="revue-detail"></div>';
    apres.parentNode.insertBefore(bloc, apres.nextSibling);
}

try{
    if(typeof document !== 'undefined'){
        if(document.readyState === 'loading')
            document.addEventListener('DOMContentLoaded', rvdInstaller);
        else
            rvdInstaller();
    }
}catch(e){}
