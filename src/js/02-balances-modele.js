// ============================================================
// MODÈLE DE DONNÉES DES BALANCES
// ============================================================
var balanceData = { n: [], n1: [] };
// Le Grand Livre est désormais séparé en deux tableaux distincts (perf + clarté) :
// GL Bilan (classes 1 à 5) et GL Gestion (classes 6 à 8). grandLivreData reste
// disponible comme vue fusionnée en lecture seule, pour tout le code existant
// (Contrôle GL par sondage, échantillons Charges/Ventes, seuils par compte...)
// qui raisonne sur "l'ensemble du Grand Livre" sans se soucier de la répartition.
var grandLivreBilanData = [];
var grandLivreGestionData = [];
Object.defineProperty(window, 'grandLivreData', {
    get: function(){ return grandLivreBilanData.concat(grandLivreGestionData); },
    configurable: true
});

// ============================================================
// CONCLUSION DE L'AUDITEUR PAR ECRITURE CONTROLEE
// (Charges à contrôler / Ventes à contrôler / Contrôle GL par sondage)
// ============================================================
// Stocké par une clé stable dérivée de l'écriture, car les tableaux
// sont entièrement régénérés à chaque saisie du Grand Livre : on
// "récupère" donc systématiquement les valeurs saisies dans le DOM
// avant de reconstruire le tableau, pour ne jamais perdre une conclusion.
var conclusionsEcritures = {};
function glRowKey(r){
    var montant = (r.montant !== undefined && r.montant !== null) ? r.montant : ((r.debit||0) - (r.credit||0));
    return [r.compte, r.date, r.ref, r.libelle, montant].join('|');
}
function scrapeConclusions(tableId){
    var tbl = document.getElementById(tableId);
    if(!tbl) return;
    tbl.querySelectorAll('select.conclusion-select').forEach(function(sel){
        var k = sel.getAttribute('data-key');
        if(!k) return;
        if(!conclusionsEcritures[k]) conclusionsEcritures[k] = {};
        conclusionsEcritures[k].statut = sel.value;
    });
    tbl.querySelectorAll('input.conclusion-comment').forEach(function(inp){
        var k = inp.getAttribute('data-key');
        if(!k) return;
        if(!conclusionsEcritures[k]) conclusionsEcritures[k] = {};
        conclusionsEcritures[k].commentaire = inp.value;
    });
}
function conclusionOptionsHtml(selected){
    var opts = [['', '⏳ À statuer'], ['Conforme', '✅ Conforme'], ['Anomalie', '❌ Anomalie'], ['A_documenter', '📝 À documenter']];
    return opts.map(function(o){ return '<option value="'+o[0]+'"'+(o[0]===selected?' selected':'')+'>'+o[1]+'</option>'; }).join('');
}
function renderConclusionCells(key){
    var stored = conclusionsEcritures[key] || {};
    var statut = stored.statut || '';
    var commentaire = stored.commentaire || '';
    return '<td><select class="conclusion-select" data-key="'+esc(key)+'" style="width:100%; font-size:11px; padding:2px;">'+conclusionOptionsHtml(statut)+'</select></td>'+
        '<td><input type="text" class="conclusion-comment" data-key="'+esc(key)+'" value="'+esc(commentaire)+'" placeholder="Observation..." style="width:130px; font-size:11px; padding:2px;"></td>';
}

// ============================================================
// 📷 SCAN FACTURE — capture photo + comparaison au solde de l'écriture
// Utilisé dans les tableaux « Charges à contrôler » / « Ventes à contrôler ».
// Les données (photo + montant) sont conservées dans facturesEcritures,
// indexées par la même clé stable que les conclusions (glRowKey), car les
// tableaux sont entièrement régénérés à chaque saisie du Grand Livre.
//
// Deux modes cohabitent :
//  1) SAISIE MANUELLE (toujours disponible, aucune configuration requise) :
//     l'utilisateur photographie la facture puis tape le montant lu dessus ;
//     l'appli compare automatiquement ce montant à celui de l'écriture.
//  2) LECTURE AUTOMATIQUE PAR IA (optionnelle) : si SCAN_FACTURE_WORKER_URL
//     est configuré (voir scan-facture-worker/DEPLOIEMENT.md), le bouton
//     "🔍 Lire avec IA" préremplit le montant automatiquement — il reste
//     modifiable manuellement ensuite. Tant que le Worker n'est pas
//     déployé, ce bouton affiche simplement un message explicatif au lieu
//     de planter, donc rien à retirer du code pour repasser en manuel.
// ============================================================
// >>>>>>>>>>>>>>>>>>> À REMPLIR après déploiement du Worker (voir DEPLOIEMENT.md) <<<<<<<<<<<<<<<<<<<<
// URL du Cloudflare Worker qui sert de proxy sécurisé vers l'API Anthropic
// (la clé API n'est JAMAIS présente dans ce fichier HTML).
// Tant que cette URL n'est pas renseignée, l'appli fonctionne en saisie manuelle uniquement.
var SCAN_FACTURE_WORKER_URL = "https://scan-facture.VOTRE-SOUS-DOMAINE.workers.dev";
// >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
var facturesEcritures = {};
function factKeyHash(key){
    var h = 0;
    for(var i=0;i<key.length;i++){ h = (h*31 + key.charCodeAt(i)) >>> 0; }
    return 'fact'+h.toString(36)+key.length;
}
function iaConfiguree(){
    return !!SCAN_FACTURE_WORKER_URL && SCAN_FACTURE_WORKER_URL.indexOf('VOTRE-SOUS-DOMAINE') === -1;
}
function renderFactureCell(key, montantEcriture){
    var id = factKeyHash(key);
    return '<td id="'+id+'" style="min-width:130px;">'+renderFactureCellInner(key, montantEcriture)+'</td>';
}
function renderFactureCellInner(key, montantEcriture){
    var stored = facturesEcritures[key] || {};
    var inputId = 'inp_'+factKeyHash(key);
    var montId = 'mont_'+factKeyHash(key);
    var keyAttr = esc(key).replace(/'/g,"&#39;");
    var html = '<input type="file" accept="image/*" capture="environment" id="'+inputId+'" style="display:none;" onchange="onFactureSelected(this, \''+keyAttr+'\', '+montantEcriture+')">';
    if(stored.image){
        html += '<div style="display:flex; flex-direction:column; gap:2px; align-items:flex-start;">';
        html += '<img src="'+stored.image+'" style="width:44px; height:44px; object-fit:cover; border-radius:4px; cursor:pointer; border:1px solid #ccc;" onclick="document.getElementById(\''+inputId+'\').click()" title="Cliquer pour remplacer la photo">';
        html += '<input type="number" id="'+montId+'" placeholder="Montant facture" value="'+((stored.montant!==undefined && stored.montant!==null) ? stored.montant : '')+'" style="width:105px; font-size:10.5px; padding:2px;" onchange="onMontantFactureChange(this, \''+keyAttr+'\', '+montantEcriture+')">';
        if(stored.scanning){
            html += '<span style="font-size:10px; color:#888;">⏳ Lecture IA…</span>';
        } else if(stored.error){
            html += '<span style="font-size:9.5px; color:#c0392b;">⚠️ '+esc(stored.error)+'</span>';
        }
        html += '<button type="button" class="btn btn-primary" style="font-size:9px; padding:1px 4px; margin:0;" onclick="analyserAvecIA(\''+keyAttr+'\','+montantEcriture+')" title="'+(iaConfiguree()?'Lire automatiquement le montant via IA':'Configurer le Worker pour activer la lecture IA — voir DEPLOIEMENT.md')+'">🔍 Lire avec IA</button>';
        if(stored.montant !== undefined && stored.montant !== null && stored.montant !== ''){
            var ecart = Math.abs(stored.montant - montantEcriture);
            var tolerance = Math.max(1, Math.abs(montantEcriture) * 0.01);
            var ok = ecart <= tolerance;
            html += '<span style="font-size:10px; font-weight:700; color:'+(ok?'#27ae60':'#c0392b')+';">'+(ok?'✅ Conforme':'❌ Écart '+fmt(ecart))+'</span>';
        }
        html += '<button type="button" class="btn btn-danger" style="font-size:9px; padding:1px 4px; margin:0;" onclick="removeFacture(\''+keyAttr+'\','+montantEcriture+')">✕ Retirer</button>';
        html += '</div>';
    } else {
        html += '<button type="button" class="btn btn-primary" style="font-size:11px; padding:3px 6px; margin:0;" onclick="document.getElementById(\''+inputId+'\').click()">📷 Scanner</button>';
    }
    return html;
}
function updateFactureCellDom(key, montantEcriture){
    var el = document.getElementById(factKeyHash(key));
    if(el) el.innerHTML = renderFactureCellInner(key, montantEcriture);
}
function onFactureSelected(input, key, montantEcriture){
    var file = input.files && input.files[0];
    if(!file) return;
    var reader = new FileReader();
    reader.onload = function(e){
        var prev = facturesEcritures[key] || {};
        facturesEcritures[key] = { image: e.target.result, montant: prev.montant, mimeType: file.type || 'image/jpeg' };
        updateFactureCellDom(key, montantEcriture);
    };
    reader.readAsDataURL(file);
}
function onMontantFactureChange(input, key, montantEcriture){
    var stored = facturesEcritures[key] || {};
    stored.montant = input.value === '' ? null : parseNum(input.value);
    stored.error = null;
    facturesEcritures[key] = stored;
    updateFactureCellDom(key, montantEcriture);
}
function removeFacture(key, montantEcriture){
    delete facturesEcritures[key];
    updateFactureCellDom(key, montantEcriture);
}
// Lecture automatique optionnelle via le Cloudflare Worker (voir scan-facture-worker/DEPLOIEMENT.md).
// Tant que SCAN_FACTURE_WORKER_URL n'est pas configuré, affiche un message explicatif
// et n'empêche jamais la saisie manuelle du montant.
async function analyserAvecIA(key, montantEcriture){
    var stored = facturesEcritures[key];
    if(!stored || !stored.image) return;
    if(!iaConfiguree()){
        stored.error = "Lecture IA non configurée — saisissez le montant manuellement (voir scan-facture-worker/DEPLOIEMENT.md)";
        facturesEcritures[key] = stored;
        updateFactureCellDom(key, montantEcriture);
        return;
    }
    stored.scanning = true; stored.error = null;
    facturesEcritures[key] = stored;
    updateFactureCellDom(key, montantEcriture);
    try{
        var base64 = stored.image.split(',')[1];
        var response = await fetch(SCAN_FACTURE_WORKER_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ imageBase64: base64, mimeType: stored.mimeType || 'image/jpeg' })
        });
        if(!response.ok){ throw new Error('Erreur serveur ('+response.status+')'); }
        var parsed = await response.json();
        stored.scanning = false;
        if(parsed.montant === null || parsed.montant === undefined){
            stored.error = "Montant illisible sur la facture — saisissez-le manuellement";
        } else {
            stored.montant = parseNum(parsed.montant);
            stored.error = null;
        }
        stored.fournisseur = parsed.fournisseur || '';
        stored.dateFacture = parsed.dateFacture || '';
    } catch(err){
        stored.scanning = false;
        stored.error = "Analyse IA indisponible — saisissez le montant manuellement";
    }
    facturesEcritures[key] = stored;
    updateFactureCellDom(key, montantEcriture);
}

/* Lecture d'un montant quel que soit son format d'origine.
   Gere : "385 982 204" (espaces, y compris insecables et fines), "385.982.204"
   et "385,982,204" (separateurs de milliers), "385982204,50" et "385982204.50"
   (decimales), "385.982.204,50" et "385,982,204.50" (formats complets),
   "(1 234 567)" et "1 234 567-" (negatifs comptables), les suffixes de devise.
   Regle de levee d'ambiguite : lorsque les deux separateurs sont presents, le
   dernier rencontre est le separateur decimal ; lorsqu'un seul est present et
   qu'il est repete, c'est un separateur de milliers ; lorsqu'il est unique et
   suivi d'exactement trois chiffres, c'est un separateur de milliers, sauf si
   l'appelant demande une lecture decimale stricte (taux et pourcentages).      */
function parseNum(v, strictDecimal){
    if(v === undefined || v === null) return 0;
    if(typeof v === 'number') return isFinite(v) ? v : 0;
    var s = String(v).trim();
    if(s === '') return 0;
    var negatif = /^\(.*\)$/.test(s) || /^\s*-/.test(s) || /-\s*$/.test(s);
    s = s.replace(/[\s\u00a0\u202f\u2009]/g, '').replace(/[^0-9,.]/g, '');
    if(s === '') return 0;
    var posV = s.lastIndexOf(','), posP = s.lastIndexOf('.'), dec = -1;
    if(posV > -1 && posP > -1){
        dec = Math.max(posV, posP);
    } else if(posV > -1 || posP > -1){
        var pos = Math.max(posV, posP);
        var car = s.charAt(pos);
        var occurrences = s.split(car).length - 1;
        var chiffresApres = s.length - pos - 1;
        if(occurrences > 1) dec = -1;
        else if(chiffresApres === 3 && !strictDecimal) dec = -1;
        else dec = pos;
    }
    var entiere = (dec > -1 ? s.substring(0, dec) : s).replace(/[.,]/g, '');
    var decimale = (dec > -1 ? s.substring(dec + 1) : '').replace(/[.,]/g, '');
    var n = parseFloat((entiere || '0') + (decimale ? '.' + decimale : ''));
    if(isNaN(n)) return 0;
    return negatif ? -Math.abs(n) : n;
}
function fmt(n){
    n = Math.round((n||0) * 100) / 100;
    return n.toLocaleString('fr-FR', {maximumFractionDigits:2});
}

// Somme type SUMIFS sur balanceData[ex], prefixe de type "20*" ou "6031*"
function sumif(ex, prefix, field){
    var digits = prefix.replace('*','');
    var rows = balanceData[ex] || [];
    var total = 0;
    for(var i=0;i<rows.length;i++){
        var c = String(rows[i].compte || '').trim();
        if(c.indexOf(digits) === 0){
            total += (rows[i][field] || 0);
        }
    }
    return total;
}
function SD(ex,p){ return sumif(ex,p,'sd'); }
function SC(ex,p){ return sumif(ex,p,'sc'); }
