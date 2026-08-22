/* ==================================================================
   SEVEN7 — MOTEUR JS — ÉTAPE 1
   Reproduit fidèlement la logique du classeur Excel source (REDK2026) :
   BALANCE N / N-1 -> BILAN -> RESULTAT (mapping de comptes SYSCOHADA)
   ================================================================== */

// ⚙️ PERSONNALISATION PAR CABINET CLIENT ⚙️
// Si cette application est déployée pour un autre cabinet que SEVEN7 (usage commercial /
// marque blanche), changez uniquement la valeur ci-dessous : c'est le seul endroit à modifier.
// Le logo (monogramme "S7") et le nom "SEVEN7" dans l'en-tête principal de l'outil restent
// inchangés (ils désignent l'éditeur du logiciel) ; seul le nom affiché sous le logo sur
// l'écran de connexion change, pour refléter le cabinet titulaire de ce dossier.
var NOM_CABINET_CLIENT = "SEVEN7 AUDIT";
document.addEventListener('DOMContentLoaded', function(){
    var el = document.getElementById('lock-screen-cabinet-name');
    if(el) el.textContent = NOM_CABINET_CLIENT;
});

// ---------- Empilement fixe #collab-bar / .header / zone de travail ----------
// #collab-bar (paramètres de connexion) doit toujours s'afficher au-dessus de .header
// (logo/titre), lui-même au-dessus de la zone de travail. Les deux bandeaux sont en
// position:sticky ; comme la hauteur de #collab-bar varie (masqué par défaut, replié sur
// plusieurs lignes en petit écran), .header et #phaseNav ne peuvent pas se caler sur une
// valeur figée en CSS : on mesure la hauteur réelle des bandeaux et on la republie dans
// deux variables CSS (--collab-bar-h, --top-total-h) à chaque changement.
function ajusterOffsetsEntete(){
    var barre = document.getElementById('collab-bar');
    var entete = document.querySelector('.header');
    if(!barre || !entete) return;
    var hBarre = barre.offsetHeight;
    var hEntete = entete.offsetHeight;
    document.documentElement.style.setProperty('--collab-bar-h', hBarre + 'px');
    document.documentElement.style.setProperty('--top-total-h', (hBarre + hEntete) + 'px');
}
document.addEventListener('DOMContentLoaded', function(){
    ajusterOffsetsEntete();
    if(typeof ResizeObserver !== 'undefined'){
        var barre = document.getElementById('collab-bar');
        var entete = document.querySelector('.header');
        var ro = new ResizeObserver(ajusterOffsetsEntete);
        if(barre) ro.observe(barre);
        if(entete) ro.observe(entete);
    }
    window.addEventListener('resize', ajusterOffsetsEntete);
});

// ---------- Verrouillage : mot de passe propre à chaque dossier ----------
var LOCK_MODE = 'create'; // 'create' ou 'join', déterminé au chargement

function slugify(s){
    return (s || '').toUpperCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/[^A-Z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'DOSSIER';
}
function randomSuffix(){
    return Math.random().toString(36).slice(2, 7).toUpperCase();
}
function switchLockMode(mode){
    LOCK_MODE = mode;
    document.getElementById('lock-mode-join').style.display = mode === 'join' ? 'block' : 'none';
    document.getElementById('lock-mode-create').style.display = mode === 'create' ? 'block' : 'none';
}
function setLockBusy(busy){
    var btn = document.querySelector('#lock-screen .btn-primary');
    if(btn){ btn.disabled = busy; btn.textContent = busy ? '⏳ Vérification…' : '🔓 Déverrouiller'; }
}
function showLockError(msg){
    var erreur = document.getElementById('lock-error');
    erreur.textContent = msg;
    erreur.style.display = 'block';
}

// ---------- Avatars au choix ----------
// Chaque collaborateur choisit son propre avatar (émoji) lors de sa connexion, à la place
// d'une icône générique unique. Le choix est mémorisé sur cet appareil (localStorage) et
// enregistré dans le dossier (Firestore) pour que les autres collaborateurs le voient aussi
// (bande de présence, bandeau collaborateur, panneau admin).
var AVATAR_CHOICES = ['🧑','👩','👨','🧔','👱','👴','👵','👩\u200d🦱','👨\u200d🦱','👩🏾','👨🏿','🧕','👳','🧑\u200d💻','👩\u200d💼','👨\u200d💼'];
var DEFAULT_AVATAR = '🧑';
var selectedAvatar = DEFAULT_AVATAR;

function selectAvatar(emoji){
    selectedAvatar = emoji;
    localStorage.setItem('seven7_avatar', emoji);
    renderAvatarPicker();
}

function renderAvatarPicker(){
    var wrap = document.getElementById('avatar-picker');
    if(!wrap) return;
    wrap.innerHTML = AVATAR_CHOICES.map(function(emoji){
        var cls = 'avatar-option' + (emoji === selectedAvatar ? ' selected' : '');
        return '<button type="button" class="' + cls + '" onclick="selectAvatar(\'' + emoji + '\')" title="Choisir cet avatar">' + emoji + '</button>';
    }).join('');
}

// Renvoie l'avatar à afficher pour une personne donnée d'après les données du dossier
// (l'administrateur principal stocke son avatar dans data.adminAvatar, les collaborateurs
// dans data.access[safeKey].avatar). Repli sur l'avatar par défaut pour les anciens dossiers
// créés avant l'introduction des avatars au choix.
function avatarFor(data, nom, key){
    if(!data) return DEFAULT_AVATAR;
    if(data.admin === nom) return data.adminAvatar || DEFAULT_AVATAR;
    var entry = data.access && data.access[key];
    return (entry && entry.avatar) || DEFAULT_AVATAR;
}

function verifierMotDePasse(){
    var erreur = document.getElementById('lock-error');
    erreur.style.display = 'none';
    var nom = document.getElementById('lock-collab-name').value.trim();

    if(LOCK_MODE === 'join'){
        var dossier = document.getElementById('lock-collab-dossier').value.trim();
        var pass = document.getElementById('lock-dossier-password').value;
        if(!nom || !dossier || !pass){
            showLockError('Merci de renseigner votre prénom et le mot de passe du dossier.');
            return;
        }
        setLockBusy(true);
        collabJoin(nom, dossier, pass, false, null, null, selectedAvatar).then(function(){
            document.getElementById('lock-screen').style.display = 'none';
            document.getElementById('collab-bar').style.display = 'flex';
        }).catch(function(err){
            showLockError(err && err.message ? err.message : 'Erreur de connexion.');
        }).then(function(){ setLockBusy(false); });
    } else {
        var codeCabinet = document.getElementById('lock-collab-code-cabinet').value.trim().toUpperCase();
        var cabinetName = document.getElementById('lock-collab-cabinet-name').value.trim();
        var label = document.getElementById('lock-collab-dossier-label').value.trim();
        var pass1 = document.getElementById('lock-new-password').value;
        var pass2 = document.getElementById('lock-new-password-confirm').value;
        if(!nom || !codeCabinet || !cabinetName || !label || !pass1){
            showLockError('Merci de renseigner votre prénom, votre code cabinet, le nom de votre cabinet, le nom du dossier, et un mot de passe.');
            return;
        }
        if(pass1.length < 6){
            showLockError('Le mot de passe doit contenir au moins 6 caractères.');
            return;
        }
        if(pass1 !== pass2){
            showLockError('Les deux mots de passe ne correspondent pas.');
            return;
        }
        var dossier = slugify(label) + '-' + randomSuffix();
        setLockBusy(true);
        collabJoin(nom, dossier, pass1, true, cabinetName, codeCabinet, selectedAvatar).then(function(){
            document.getElementById('lock-screen').style.display = 'none';
            document.getElementById('collab-bar').style.display = 'flex';
        }).catch(function(err){
            showLockError(err && err.message ? err.message : 'Erreur de création du dossier.');
        }).then(function(){ setLockBusy(false); });
    }
}

function copyInviteLink(){
    var url = window.location.origin + window.location.pathname + '?dossier=' + encodeURIComponent(localStorage.getItem('seven7_dossier') || '');
    var finish = function(){
        var toast = document.getElementById('collab-invite-toast');
        toast.style.display = 'block';
        setTimeout(function(){ toast.style.display = 'none'; }, 2500);
    };
    if(navigator.clipboard && navigator.clipboard.writeText){
        navigator.clipboard.writeText(url).then(finish).catch(function(){ prompt('Copiez ce lien :', url); });
    } else {
        prompt('Copiez ce lien :', url);
    }
}

// ---------- Navigation onglets ----------
var _tabContentEls = null, _tabBtnEls = null;
// ---------- Sidebar : 3 accordéons de phase, un ouvert à la fois ----------
// La sidebar reste affichée en permanence (elle a remplacé le menu déroulant
// horizontal) : contrairement à un popup, elle ne doit jamais se refermer au
// clic sur un onglet ou en dehors d'elle — seul togglePhaseMenu() (clic sur
// l'en-tête d'une phase) ou la restauration au chargement changent la phase
// ouverte. L'état est mémorisé par appareil (localStorage), pas par dossier :
// c'est un confort d'affichage, jamais une restriction d'accès.
var PHASE_OUVERTE_CLE = 'seven7_phase_ouverte';
function closeAllPhaseMenus(){
    document.querySelectorAll('.phase-group.open').forEach(function(g){ g.classList.remove('open'); });
}
function ouvrirPhaseGroup(group){
    if(!group || group.classList.contains('open')) return;
    closeAllPhaseMenus();
    group.classList.add('open');
    var m = /phase-group-(\d)/.exec(group.className);
    if(m){ try{ localStorage.setItem(PHASE_OUVERTE_CLE, m[1]); }catch(e){} }
}
function togglePhaseMenu(n){
    var group = document.querySelector('.phase-group-' + n);
    if(!group) return;
    if(group.classList.contains('open')){
        closeAllPhaseMenus();
        try{ localStorage.removeItem(PHASE_OUVERTE_CLE); }catch(e){}
    } else {
        ouvrirPhaseGroup(group);
    }
}
function restaurerPhaseOuverte(){
    var n = '1';
    try{ n = localStorage.getItem(PHASE_OUVERTE_CLE) || '1'; }catch(e){}
    ouvrirPhaseGroup(document.querySelector('.phase-group-' + n));
}
try{
    if(typeof document !== 'undefined'){
        if(document.readyState === 'loading')
            document.addEventListener('DOMContentLoaded', restaurerPhaseOuverte);
        else
            restaurerPhaseOuverte();
    }
}catch(e){}

function showTab(id){
    // Les boutons/panneaux d'onglets sont statiques (jamais recréés après le chargement initial) :
    // on met donc en cache leurs listes au lieu de rescanner tout le DOM à chaque clic, ce qui
    // était coûteux avec des onglets volumineux (Grand Livre, Balance) toujours présents dans la page.
    if(!_tabContentEls) _tabContentEls = Array.prototype.slice.call(document.querySelectorAll('.tab-content'));
    if(!_tabBtnEls) _tabBtnEls = Array.prototype.slice.call(document.querySelectorAll('.tab-btn'));
    _tabContentEls.forEach(function(el){ el.classList.remove('active'); });
    _tabBtnEls.forEach(function(el){ el.classList.remove('active'); });
    document.getElementById(id).classList.add('active');
    var btn = _tabBtnEls.find(function(b){ return b.getAttribute('onclick') === "showTab('"+id+"')"; });
    if(btn) btn.classList.add('active');
    if(id === 'controle-gl-sondage'){
        syncComptesAuditManuelFromDom();
        if(typeof refreshNouveauCompteOptions === 'function') refreshNouveauCompteOptions();
    }
    // Troisième filet de sécurité pour les tableaux fiscaux (voir
    // tfInstallerSecurise, 48-tableaux-fiscaux.js) : les deux tentatives
    // automatiques (DOMContentLoaded, 'load') peuvent échouer sur une
    // connexion instable en tout début de chargement — un clic sur l'onglet
    // arrive forcément après, à un moment où la page tourne déjà. Idempotent :
    // ne fait rien si la section existe déjà.
    if(id === 'impots' && typeof tfInstallerSecurise === 'function') tfInstallerSecurise();
    // Met à jour la barre "onglet courant" et le surlignage du menu de phase concerné
    document.querySelectorAll('.phase-group').forEach(function(g){ g.classList.remove('has-active'); });
    if(btn){
        var group = btn.closest('.phase-group');
        if(group){ group.classList.add('has-active'); ouvrirPhaseGroup(group); }
        var bar = document.getElementById('currentTabBar');
        if(bar) bar.textContent = btn.textContent;
    }
    // Emmène directement le contenu de l'onglet cliqué à l'écran : sans ça, sur
    // petit écran (sidebar empilée au-dessus, voir #phaseNav en @media max-width:900px)
    // ou avec un menu de phase déplié, le panneau activé reste hors champ et l'auditeur
    // doit défiler à l'aveugle pour le trouver. scroll-margin-top (voir .tab-content.active)
    // tient compte du bandeau fixe pour ne pas masquer le haut du panneau.
    var panneau = document.getElementById(id);
    if(panneau && typeof panneau.scrollIntoView === 'function')
        panneau.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ---------- PCG SYSCOHADA révisé : recherche/filtre ----------
function filterPCG(query){
    var q = (query || '').trim().toLowerCase();
    var classes = document.querySelectorAll('#pcg-syscohada .pcg-class');
    var anyVisible = false;
    classes.forEach(function(details){
        var rows = details.querySelectorAll('tr.pcg-row');
        var groupRows = details.querySelectorAll('tr.pcg-group-row');
        var classHasMatch = false;
        if(!q){
            rows.forEach(function(r){ r.style.display = ''; });
            groupRows.forEach(function(g){ g.style.display = ''; });
            details.style.display = '';
            details.open = false;
            classHasMatch = true;
        } else {
            rows.forEach(function(r){
                var match = (r.getAttribute('data-search') || '').indexOf(q) !== -1;
                r.style.display = match ? '' : 'none';
                if(match) classHasMatch = true;
            });
            groupRows.forEach(function(g){ g.style.display = classHasMatch ? '' : 'none'; });
            details.style.display = classHasMatch ? '' : 'none';
            if(classHasMatch) details.open = true;
        }
        if(classHasMatch) anyVisible = true;
    });
    var noResult = document.getElementById('pcg-no-result');
    if(noResult) noResult.style.display = (q && !anyVisible) ? '' : 'none';
}

// ---------- Utilitaires génériques CRUD ----------
function deleteRow(btn){
    var tr = btn.closest('tr');
    var table = tr.closest('table');
    tr.remove();
    if(table){
        if(table.id === 'table-balance-n' || table.id === 'table-balance-n1'){
            recomputeBalanceFromTable(table.id === 'table-balance-n' ? 'n' : 'n1');
        } else if(table.id === 'table-gl-bilan'){
            recomputeGLTable('bilan');
        } else if(table.id === 'table-gl-gestion'){
            recomputeGLTable('gestion');
        } else if(table.id === 'table-tiers-fourn'){
            recomputeTiersFromTable('fourn');
        } else if(table.id === 'table-tiers-clients'){
            recomputeTiersFromTable('clients');
        } else if(table.id === 'table-indemnite-retraite'){
            recomputeIndemniteRetraite();
        } else if(table.id === 'table-conges-payes'){
            recomputeCongesPayes();
        }
    }
}

function cellFor(type){
    switch(type){
        case 'text': return '<input type="text" onchange="updateStatus(currentTabOf(this))">';
        case 'textarea': return '<textarea onchange="updateStatus(currentTabOf(this))"></textarea>';
        case 'date': return '<input type="date" class="date-input" onchange="updateStatus(currentTabOf(this))">';
        case 'number': return '<input type="number" onchange="updateStatus(currentTabOf(this))">';
        case 'number-heures': return '<input type="number" class="heures" onchange="calcTotalHeures()">';
        case 'number-readonly': return '<input type="number" readonly class="calculated nbjours">';
        case 'date-deb': return '<input type="date" class="date-input datedeb" onchange="calcJours(this)">';
        case 'date-fin': return '<input type="date" class="date-input datefin" onchange="calcJours(this)">';
        case 'select': return '<select onchange="updateStatus(currentTabOf(this))"><option></option><option>Oui</option><option>Non</option></select>';
        case 'select-oni': return '<select onchange="updateStatus(currentTabOf(this))"><option></option><option>Oui</option><option>Non</option><option>Partiel</option><option>N/A</option></select>';
        case 'select-statut': return '<select onchange="updateStatus(currentTabOf(this))"><option>Non démarré</option><option>En cours</option><option>Terminé</option><option>À revoir</option></select>';
        case 'select-statut2': return '<select onchange="updateStatus(currentTabOf(this))"><option>Non commencé</option><option>En cours</option><option>Terminé</option></select>';
        case 'number15': return '<input type="number" min="1" max="5" onchange="updateStatus(currentTabOf(this))">';
        case 'number15-risk': return '<input type="number" min="1" max="5" value="1" onchange="calcRisk(this)">';
        case 'calculated': return '<td class="calculated">0</td>';
        default: return '<input type="text">';
    }
}
function currentTabOf(el){
    var card = el.closest('[data-tab]');
    return card ? card.getAttribute('data-tab') : '';
}

function addRow(tableId, colTypes){
    var table = document.getElementById(tableId);
    var tr = document.createElement('tr');
    colTypes.forEach(function(t){
        if(t === 'calculated'){
            var td = document.createElement('td');
            td.className = 'calculated';
            // classList.add('') lève une DOMException (jeton vide interdit) : ne l'ajouter
            // que pour table-risques, seule table où cette classe a un rôle (inutilisée
            // ailleurs — vérifié, voir grep sur "risk-x").
            if(tableId === 'table-risques') td.classList.add('risk-x');
            td.textContent = '0';
            tr.appendChild(td);
        } else {
            var td = document.createElement('td');
            td.innerHTML = cellFor(t);
            tr.appendChild(td);
        }
    });
    var tdBtn = document.createElement('td');
    tdBtn.innerHTML = '<button class="btn btn-danger" onclick="deleteRow(this)">✕</button>';
    tr.appendChild(tdBtn);
    table.appendChild(tr);
    // Fix risques table: 2 calculated cells need risk-score/risk-level classes
    // (table-risque-inherent partage exactement la même structure de colonnes)
    if(tableId === 'table-risques' || tableId === 'table-risque-inherent'){
        var calcCells = tr.querySelectorAll('td.calculated');
        if(calcCells[0]) calcCells[0].classList.add('risk-score');
        if(calcCells[1]) calcCells[1].classList.add('risk-level');
    }
    // Retire la ligne "aucune donnée" dès la première saisie manuelle (table-risque-inherent
    // n'a pas de génération automatique qui s'en charge, contrairement à table-risques/risqGenerer()).
    if(tableId === 'table-risque-inherent'){
        var videRI = document.getElementById('risque-inherent-vide');
        if(videRI) videRI.remove();
    }
}

function addDocumentRow(){
    var table = document.getElementById('table-doc');
    var html = '<tr>'
        + '<td><input type="text" placeholder="Nom du document" onchange="updateStatus(\'identification\')"></td>'
        + '<td><select onchange="updateStatus(\'identification\')"><option></option><option>Oui</option><option>Non</option></select></td>'
        + '<td><input type="date" class="date-input" onchange="updateStatus(\'identification\')"></td>'
        + '<td><input type="text" onchange="updateStatus(\'identification\')"></td>'
        + '<td><input type="url" class="doc-lien" placeholder="https://drive.google.com/..." style="width:150px;" onchange="updateStatus(\'identification\')"> '
        + '<input type="file" accept="image/*" capture="environment" class="doc-scan-input" style="display:none;" onchange="scannerDocument(this)"> '
        + '<button type="button" class="btn btn-primary" style="padding:3px 8px; margin:0;" onclick="var u=this.parentElement.querySelector(\'.doc-lien\').value; if(u) window.open(u,\'_blank\'); else alert(\'Collez un lien ou scannez un document.\');">📄</button> '
        + '<button type="button" class="btn btn-primary" style="padding:3px 8px; margin:0;" title="Scanner avec l\'appareil photo" onclick="this.parentElement.querySelector(\'.doc-scan-input\').click();">📷</button></td>'
        + '<td><button class="btn btn-danger" onclick="deleteRow(this)">✕</button></td>'
        + '</tr>';

    table.insertAdjacentHTML('beforeend', html);
    updateStatus('identification');
}
// Capture d'un document via l'appareil photo (mobile) ou le sélecteur de fichier (desktop), pour la
// Documentation Permanente. La photo est compressée côté navigateur (redimensionnée, JPEG) puis
// archivée directement dans le champ "Lien" de la ligne, exactement comme un lien Google Drive :
// le bouton 📄 l'ouvre dans un nouvel onglet. Aucune configuration Firebase Storage n'est nécessaire.
// ⚠️ Limite pratique : chaque photo est stockée directement dans les données du dossier (Firestore),
// dont le poids total est plafonné (~1 Mo par onglet). Quelques photos par dossier restent sans
// problème ; pour un grand nombre de documents scannés, mieux vaut continuer à utiliser un lien Drive.
function scannerDocument(inputEl){
    var file = inputEl.files && inputEl.files[0];
    if(!file) return;
    var td = inputEl.closest('td');
    var lienInput = td ? td.querySelector('.doc-lien') : null;
    var reader = new FileReader();
    reader.onload = function(e){
        var img = new Image();
        img.onload = function(){
            var MAX_DIM = 1600;
            var scale = Math.min(1, MAX_DIM / Math.max(img.width, img.height));
            var canvas = document.createElement('canvas');
            canvas.width = Math.max(1, Math.round(img.width * scale));
            canvas.height = Math.max(1, Math.round(img.height * scale));
            var ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            var dataUrl = canvas.toDataURL('image/jpeg', 0.72);
            if(lienInput){
                lienInput.type = 'text'; // un data URL (photo archivée) n'est pas un <input type="url"> valide
                lienInput.value = dataUrl;
                lienInput.style.color = '#27ae60';
                lienInput.title = 'Document scanné et archivé (photo intégrée)';
            }
            if(typeof updateStatus === 'function') updateStatus('identification');
            inputEl.value = ''; // permet de rescanner un nouveau document depuis le même bouton
        };
        img.onerror = function(){ alert('Impossible de lire cette photo. Réessayez.'); };
        img.src = e.target.result;
    };
    reader.onerror = function(){ alert('Erreur de lecture du fichier.'); };
    reader.readAsDataURL(file);
}

function addProgrammeRow(){
    var table = document.getElementById('table-programme');
    var tr = document.createElement('tr');
    tr.innerHTML =
        '<td><input type="text" onchange="updateStatus(\'programme\')" placeholder="Cycle"></td>' +
        '<td><textarea onchange="updateStatus(\'programme\')" placeholder="Procédure / étape de travail"></textarea></td>' +
        '<td><textarea onchange="updateStatus(\'programme\')" placeholder="Documents requis"></textarea></td>' +
        '<td><input type="text" onchange="updateStatus(\'programme\')"></td>' +
        '<td><input type="date" onchange="updateStatus(\'programme\')"></td>' +
        '<td><select onchange="updateStatus(\'programme\')"><option>Non commencé</option><option>En cours</option><option>Terminé</option><option>À revoir</option></select></td>' +
        '<td><textarea onchange="updateStatus(\'programme\')"></textarea></td>' +
        '<td><button class="btn btn-danger" onclick="deleteRow(this)">✕</button></td>';
    table.appendChild(tr);
}

// ---------- Rédaction de rapport (export Word) ----------
function activeRapportPage(){
    var sel = document.getElementById('rap-page-select');
    var key = sel ? sel.value : 'admin';
    return document.getElementById('rap-page-' + key) || document.getElementById('rap-page-admin');
}
function ensureRapportPage(key, label){
    var existing = document.getElementById('rap-page-' + key);
    if(existing) return existing;
    var container = document.getElementById('rapport-pages-container');
    var div = document.createElement('div');
    div.id = 'rap-page-' + key;
    div.className = 'rap-page';
    div.setAttribute('data-page-key', key);
    div.setAttribute('data-page-label', label);
    div.setAttribute('contenteditable', 'true');
    div.style.cssText = "display:none; background:#fff; border:1px solid #ddd; border-top:none; min-height:900px; padding:60px 70px; font-family:'Times New Roman', Times, serif; font-size:14px; line-height:1.6; color:#222; box-shadow: 0 2px 8px rgba(0,0,0,0.06);";
    div.innerHTML = '<h1 style="text-align:center; font-size:22px;">RAPPORT D\'AUDIT</h1><p style="text-align:center; color:#888; font-size:12px;">Feuille — ' + esc(label) + '</p><p><br></p>';
    container.appendChild(div);
    return div;
}
function switchRapportPage(){
    var sel = document.getElementById('rap-page-select');
    if(!sel) return;
    var key = sel.value;
    var label = sel.options[sel.selectedIndex] ? sel.options[sel.selectedIndex].text : key;
    document.querySelectorAll('.rap-page').forEach(function(p){ p.style.display = 'none'; });
    var page = ensureRapportPage(key, label);
    page.style.display = 'block';
    updateStatus('redaction');
}
function refreshRedactionPageList(){
    var sel = document.getElementById('rap-page-select');
    if(!sel) return;
    var currentVal = sel.value;
    var adminName = window.SEVEN7_ADMIN_NAME || 'Administrateur';
    var access = window.SEVEN7_ACCESS || {};
    var options = [{key:'admin', label:'Administrateur principal (' + adminName + ')'}];
    Object.keys(access).forEach(function(k){
        var entry = access[k];
        options.push({key:k, label: (entry && entry.displayName) ? entry.displayName : k});
    });
    sel.innerHTML = options.map(function(o){ return '<option value="'+esc(o.key)+'">'+esc(o.label)+'</option>'; }).join('');
    // Sélection par défaut : sa propre feuille si connue, sinon on garde la sélection précédente si toujours valide
    var myKey = window.SEVEN7_IS_ADMIN ? 'admin' : (window.SEVEN7_MY_KEY || 'admin');
    var stillValid = options.some(function(o){ return o.key === currentVal; });
    sel.value = stillValid ? currentVal : (options.some(function(o){return o.key===myKey;}) ? myKey : 'admin');
    switchRapportPage();
}
function exporterRapportWord(){
    var page = activeRapportPage();
    var contenu = page.innerHTML;
    var nomFichier = (document.getElementById('rap-nom-fichier').value || 'Rapport_Audit').trim();
    if(!nomFichier) nomFichier = 'Rapport_Audit';
    var html = '<!DOCTYPE html>' +
        '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">' +
        '<head><meta charset="utf-8"><title>' + nomFichier + '</title>' +
        '<style>body{font-family:"Times New Roman",Times,serif; font-size:14px; line-height:1.6; color:#222;} h1{text-align:center; font-size:22px;} @page{margin:2.5cm;}</style>' +
        '</head><body>' + contenu + '</body></html>';
    var blob = new Blob(['\ufeff', html], { type: 'application/msword' });
    var link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = nomFichier + '.doc';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}
function viderRapport(){
    if(confirm('Voulez-vous vraiment vider cette feuille du rapport ?')){
        var page = activeRapportPage();
        var label = page.getAttribute('data-page-label') || '';
        page.innerHTML = '<h1 style="text-align:center; font-size:22px;">RAPPORT D\'AUDIT</h1><p style="text-align:center; color:#888; font-size:12px;">Feuille — ' + esc(label) + '</p><p><br></p>';
        updateStatus('redaction');
    }
}

// ---------- Cartographie des risques (et table-risque-inherent, même structure) ----------
function calcRisk(input){
    var tr = input.closest('tr');
    var nums = tr.querySelectorAll('input[type="number"]');
    var p = parseNum(nums[0].value) || 0;
    var i = parseNum(nums[1].value) || 0;
    var score = p * i;
    var scoreCell = tr.querySelector('.risk-score');
    var levelCell = tr.querySelector('.risk-level');
    scoreCell.textContent = score;
    var level = score >= 15 ? 'Élevé' : (score >= 8 ? 'Moyen' : 'Faible');
    levelCell.textContent = level;
    tr.classList.remove('risk-high','risk-medium','risk-low');
    tr.classList.add(level === 'Élevé' ? 'risk-high' : (level === 'Moyen' ? 'risk-medium' : 'risk-low'));
    // L'id de l'onglet suit celui de la table (table-risques → risques,
    // table-risque-inherent → risque-inherent) : évite de marquer à tort le
    // statut de Cartographie des risques depuis Risque Inhérent, ou l'inverse.
    var table = tr.closest('table');
    var ongletId = table && table.id ? table.id.replace(/^table-/, '') : 'risques';
    updateStatus(ongletId);
}

// ---------- Planification : budget d'heures & calendrier ----------
function calcTotalHeures(){
    var total = 0;
    document.querySelectorAll('#table-ressources .heures').forEach(function(inp){ total += parseNum(inp.value) || 0; });
    document.getElementById('total-heures').textContent = total.toLocaleString('fr-FR');
    updateStatus('planification');
}
function calcJours(input){
    var tr = input.closest('tr');
    var deb = tr.querySelector('.datedeb').value;
    var fin = tr.querySelector('.datefin').value;
    var out = tr.querySelector('.nbjours');
    if(deb && fin){
        var d1 = new Date(deb), d2 = new Date(fin);
        var diff = Math.round((d2 - d1) / (1000*60*60*24));
        out.value = diff >= 0 ? diff : '';
    } else {
        out.value = '';
    }
    updateStatus('planification');
}

// ---------- Statuts des onglets (Sommaire) ----------
function updateStatus(tabId){
    if(!tabId) return;
    var card = document.querySelector('[data-tab="'+tabId+'"]');
    var badge = document.getElementById('status-'+tabId);
    if(!card || !badge) return;
    var filled = false;
    card.querySelectorAll('input[type="text"], input[type="number"], input[type="date"], textarea').forEach(function(el){
        if(el.value && el.value.trim() !== '') filled = true;
    });
    card.querySelectorAll('select').forEach(function(el){
        if(el.value && el.value.trim() !== '') filled = true;
    });
    if(filled){
        badge.textContent = 'En cours / Rempli';
        badge.className = 'badge badge-success';
    }
}
