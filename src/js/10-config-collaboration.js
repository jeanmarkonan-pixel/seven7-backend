// >>>>>>>>>>>>>>>>>>> À REMPLIR (voir GUIDE_CONFIGURATION.md) <<<<<<<<<<<<<<<<<<<<
var FIREBASE_CONFIG = {
    apiKey: "AIzaSyA6aRwxUYc4L8vTHo4u5fREN66p4ehfeuA",
    authDomain: "seven7-audit.firebaseapp.com",
    projectId: "seven7-audit",
    storageBucket: "seven7-audit.firebasestorage.app",
    messagingSenderId: "447402032316",
    appId: "1:447402032316:web:b79faf737b9f15144764b9"
};
// >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

var TABS = [
    {id:'sommaire', label:'📋 Sommaire', phase:1},
    {id:'identification', label:'🏢 Fiche Identification', phase:1},
    {id:'planification', label:'📊 Planification', phase:1},
    {id:'programme', label:'📅 Programme Travail', phase:1},
    {id:'questionnaire', label:'✓ Questionnaire CI', phase:1},
    {id:'risques', label:'🎯 Cartographie Risques', phase:1},
    {id:'balance-n1', label:'📉 BALANCE N-1', phase:2},
    {id:'balance-n', label:'📈 BALANCE N', phase:2},
    {id:'gl-bilan', label:'📚 GL Bilan', phase:2},
    {id:'gl-gestion', label:'📚 GL Gestion', phase:2},
    {id:'selection-comptes', label:'🎯 Sélection Comptes à Auditer', phase:2},
    {id:'controle-gl-sondage', label:'🧪 Contrôle GL (Sondage)', phase:2},
    {id:'bilan', label:'⚖️ BILAN', phase:2},
    {id:'resultat', label:'💰 RESULTAT', phase:2},
    {id:'detection', label:'🔎 Détection Erreurs', phase:2},
    {id:'revue', label:'📊 Revue Analytique', phase:2},
    {id:'charges', label:'💸 CHARGES À CONTRÔLER', phase:2},
    {id:'ventes', label:'💵 VENTES À CONTRÔLER', phase:2},
    {id:'impots', label:'🏛️ IMPÔTS ET TAXES', phase:2},
    {id:'calendrier', label:'📆 Calendrier Fiscal', phase:2},
    {id:'referentiel', label:'📚 Référentiel Juridique & Fiscal', phase:2},
    {id:'pcg-syscohada', label:'📘 Plan Comptable PCG SYSCOHADA', phase:2},
    {id:'tiers-fourn', label:'🏭 BALANCE TIERS FOURN.', phase:2},
    {id:'tiers-clients', label:'👥 BALANCE TIERS CLIENTS', phase:2},
    {id:'circ-fourn', label:'📨 Circulariser Fourn.', phase:2},
    {id:'circ-clients', label:'📨 Circulariser Clients', phase:2},
    {id:'anorm-fourn', label:'⚠️ Anormaux Fourn.', phase:2},
    {id:'anorm-clients', label:'⚠️ Anormaux Clients', phase:2},
    {id:'indemnite-retraite', label:'👴 Indemnité de Retraite', phase:2},
    {id:'conges-payes', label:'🏖️ Provision Congés Payés', phase:2},
    {id:'recommandations', label:'✅ Suivi Recommandations', phase:3},
    {id:'synthese', label:'📝 Synthèse Rapport', phase:3},
    {id:'redaction', label:'📄 Rédaction Rapport', phase:3},
    {id:'messagerie', label:'💬 Messagerie', phase:3}
];
var ALWAYS_ALLOWED = ['sommaire', 'messagerie'];
// La messagerie a son propre système de synchronisation temps réel (conversations/messages
// Firestore, géré par le module SEVEN7_MSG_*) : elle ne doit JAMAIS passer par le système
// générique de synchronisation "brute" du HTML d'un onglet (scheduleSave/applyRemoteTab
// ci-dessous), sous peine d'écraser périodiquement l'interface d'un collaborateur par
// l'état figé de l'écran d'un autre (y compris ce qu'il est en train de taper).
var TAB_SYNC_EXCLUDED = ['messagerie'];

(function(){
    // ---------- Compression/décompression asynchrones (Web Worker) ----------
    // La compression/décompression LZString sur un gros onglet (Grand Livre, Balance
    // avec plusieurs milliers de lignes) est un calcul coûteux : l'exécuter en plein sur
    // le thread principal gèle l'interface pendant plusieurs secondes ("la page ne répond
    // plus"). On le déporte donc systématiquement dans un Web Worker dédié (qui charge sa
    // propre copie de lz-string et ne partage jamais le thread avec l'UI). En cas
    // d'indisponibilité du Worker (navigateur très ancien, script bloqué), on retombe sur
    // un calcul synchrone pour ne jamais bloquer complètement l'utilisateur.
    var _compWorker = null, _compWorkerFailed = false, _compReqId = 0, _compPending = {};
    function getCompressionWorker(){
        if(_compWorker) return _compWorker;
        if(_compWorkerFailed || typeof Worker === 'undefined') return null;
        try {
            var workerSrc = "importScripts('https://cdnjs.cloudflare.com/ajax/libs/lz-string/1.5.0/lz-string.min.js');" +
                "self.onmessage = function(e){" +
                "  var msg = e.data, result;" +
                "  try {" +
                "    result = (msg.action === 'compress') ? LZString.compressToUTF16(msg.text) : LZString.decompressFromUTF16(msg.text);" +
                "    self.postMessage({ id: msg.id, ok: true, result: result });" +
                "  } catch(err){ self.postMessage({ id: msg.id, ok: false, error: String(err && err.message || err) }); }" +
                "};";
            var blob = new Blob([workerSrc], { type: 'application/javascript' });
            _compWorker = new Worker(URL.createObjectURL(blob));
            _compWorker.onmessage = function(e){
                var msg = e.data;
                var pending = _compPending[msg.id];
                if(!pending) return;
                delete _compPending[msg.id];
                if(msg.ok) pending.resolve(msg.result); else pending.reject(new Error(msg.error));
            };
            _compWorker.onerror = function(){
                // Le Worker n'a pas pu démarrer (ex: CDN inaccessible) : on désactive
                // définitivement pour ne plus tenter, et on repasse en mode synchrone.
                _compWorkerFailed = true;
                _compWorker = null;
            };
        } catch(e){ _compWorkerFailed = true; _compWorker = null; }
        return _compWorker;
    }
    function runInWorker(action, text){
        var worker = getCompressionWorker();
        if(!worker){
            // Repli synchrone : au moins l'application continue de fonctionner.
            var sync = (typeof LZString !== 'undefined')
                ? (action === 'compress' ? LZString.compressToUTF16(text) : LZString.decompressFromUTF16(text))
                : text;
            return Promise.resolve(sync);
        }
        return new Promise(function(resolve, reject){
            var id = ++_compReqId;
            _compPending[id] = { resolve: resolve, reject: reject };
            try { worker.postMessage({ id: id, action: action, text: text }); }
            catch(e){ delete _compPending[id]; reject(e); }
        });
    }
    // Compresse en arrière-plan ; ne bloque jamais le thread principal.
    function compressAsync(text){
        if(typeof LZString === 'undefined') return Promise.resolve(text);
        return runInWorker('compress', text);
    }
    // Décompresse en arrière-plan ; reproduit le repli "texte inchangé si résultat vide/null"
    // du code d'origine, pour un comportement strictement identique.
    function decompressAsync(text){
        if(typeof LZString === 'undefined') return Promise.resolve(text);
        return runInWorker('decompress', text).then(function(result){
            return (result !== null && result !== undefined && result !== '') ? result : text;
        }).catch(function(){ return text; });
    }

    var db = null;
    var sessionId = Math.random().toString(36).slice(2) + Date.now();
    var dossierId = null;
    var myName = null;
    var mySafeKey = null;
    var isAdmin = false;
    var permData = { admin: null, access: {} };
    var applyingRemote = {};
    var saveTimers = {};
    var configReady = FIREBASE_CONFIG.apiKey && FIREBASE_CONFIG.apiKey.indexOf('COLLEZ_') !== 0;
    var originalShowTab = window.showTab;

    // ---------- Phase 5 : session « pont » (dossier ouvert via un cabinet) ----------
    // Un membre de cabinet qui ouvre un dossier lié (cabinetOuvrirDossierPonte, plus
    // bas) n'est PAS authentifié comme le dossier (contrairement à collabJoin) : son
    // rôle vient de son document membre, pas d'un nom auto-déclaré comparé à
    // permData.admin. pontActif distingue les deux mondes partout où isAdmin/myName
    // sont déjà utilisés, sans dupliquer ces fonctions.
    var pontActif = false;
    var pontRole = null; // 'ADMIN' | 'COLLABORATEUR'
    var pontCabinetCode = null;
    var pontDossierNouveauId = null;
    var pontPlanCabinet = null; // 'STARTER' | 'PRO' | 'CABINET'
    function pontOngletLiasseVerrouille(tabId){
        // Même règle que ongletLiasseVerrouille() côté firestore.rules — ceci n'est
        // qu'un MASQUAGE d'interface (§12 : jamais une mesure de sécurité en soi), la
        // vraie barrière étant déjà dans firestore.rules (voir accesPontEcriture).
        return pontActif && pontRole === 'COLLABORATEUR'
            && String(tabId).indexOf('liasse-') === 0 && tabId !== 'liasse-parametres';
    }

    // Restriction par PALIER (10/08/2026, décision utilisateur) : reflète
    // ongletReserveParPalier() côté firestore.rules — un masquage d'interface
    // (§12), pas la barrière réelle. Concerne TOUS les rôles, admin compris,
    // contrairement à pontOngletLiasseVerrouille ci-dessus (restriction par
    // rôle, pas par palier).
    var PONT_ONGLETS_RESERVES_PALIER = {
        detection: ['PRO', 'CABINET'], revue: ['PRO', 'CABINET'],
        impots: ['PRO', 'CABINET'], calendrier: ['PRO', 'CABINET'],
    };
    function pontOngletReserveParPalier(tabId){
        if(!pontActif) return false;
        if(String(tabId).indexOf('liasse-') === 0) return pontPlanCabinet !== 'CABINET';
        var requis = PONT_ONGLETS_RESERVES_PALIER[tabId];
        if(!requis) return false;
        return requis.indexOf(pontPlanCabinet) === -1;
    }

    function setStatus(txt){
        var el = document.getElementById('collab-status');
        if(el) el.textContent = txt;
    }

    function safeKey(name){
        return name.replace(/[.\/#$\[\]]/g, '_').trim();
    }

    function collabInitFirebase(){
        if(typeof sdkVerifierFirebase === 'function' && !sdkVerifierFirebase()){
            setStatus('\u26a0\ufe0f SDK Firebase non charg\u00e9 depuis www.gstatic.com \u2014 voir le bandeau en haut de la page.');
            return false;
        }
        if(!configReady){
            setStatus('⚠️ Configuration Firebase manquante — voir GUIDE_CONFIGURATION.md');
            return false;
        }
        if(!db){
            firebase.initializeApp(FIREBASE_CONFIG);
            db = firebase.firestore();
        }
        return true;
    }

    // ---------- Récupération anticipée du nom de cabinet (avant saisie du mot de passe) ----------
    // Permet d'afficher le bon nom de cabinet sur l'écran de connexion dès l'ouverture du lien
    // d'invitation, y compris sur un ordinateur partagé ayant déjà servi pour un AUTRE cabinet
    // (évite d'afficher par erreur le nom du cabinet précédent resté en mémoire locale).
    // Lit uniquement le document PUBLIC dédié (seven7_dossiers_public), qui ne contient que le
    // nom du cabinet — jamais le dossier confidentiel lui-même, qui reste inaccessible tant que
    // le mot de passe n'a pas été vérifié via Firebase Authentication.
    window.prefetchCabinetBranding = function(dossier){
        if(!dossier || !collabInitFirebase()) return;
        db.collection('seven7_dossiers_public').doc(dossier).get().then(function(doc){
            var brandEl = document.getElementById('lock-screen-cabinet-name');
            if(!brandEl) return;
            var data = doc.exists ? doc.data() : null;
            if(data && data.cabinetName){
                brandEl.textContent = data.cabinetName;
                localStorage.setItem('seven7_cabinet_name', data.cabinetName);
            } else {
                brandEl.textContent = NOM_CABINET_CLIENT; // dossier ancien sans nom de cabinet enregistré, ou lien invalide : valeur par défaut
            }
        }).catch(function(){ /* échec silencieux : l'écran garde le nom déjà affiché (localStorage ou valeur par défaut) */ });
    };

    // ---------- Isolation par dossier via Firebase Authentication ----------
    // Chaque dossier possède désormais son PROPRE compte Firebase Auth (email synthétique,
    // jamais utilisé pour envoyer de vrais emails ; mot de passe = mot de passe du dossier).
    // Firebase Auth vérifie le mot de passe côté serveur (hachage géré par Google) : le mot de
    // passe en clair ne transite plus jamais par Firestore, et les règles Firestore n'autorisent
    // la lecture/écriture d'un dossier qu'au compte Auth qui lui correspond exactement — ce qui
    // rend l'accès entre cabinets/dossiers réellement étanche, y compris via les outils de
    // développement du navigateur.
    function dossierAuthEmail(dossier){
        return 'dossier-' + String(dossier).toLowerCase() + '@seven7-audit.local';
    }

    // Même mécanisme que dossierAuthEmail, mais pour le compte Auth "cabinet" (tableau de
    // bord listant tous les dossiers d'un cabinet). Ce compte est provisionné manuellement
    // par SEVEN7 dans la console Firebase au moment de l'onboarding du cabinet — jamais créé
    // en libre-service depuis ce code, pour éviter qu'un tiers connaissant juste le code
    // cabinet (qui n'est pas un secret fort) ne s'approprie ce compte avant le vrai admin.
    function cabinetAuthEmail(codeCabinet){
        return 'cabinet-' + String(codeCabinet).toLowerCase() + '@seven7-audit.local';
    }

    // ---------- Rejoindre le dossier ----------
    // ---------- Indicateur visuel : dossiers utilisés / plafond du cabinet ----------
    // Lecture publique (voir firestore.rules : seven7_cabinets ne contient aucune donnée
    // confidentielle), donc affichable même si l'appel a lieu juste après la connexion.
    var SEUIL_ILLIMITE = 9999; // au-delà, on affiche "Illimité" plutôt qu'un chiffre
    function updateCabinetQuotaDisplay(cabinetId){
        var el = document.getElementById('collab-cabinet-quota');
        if(!el) return;
        if(!cabinetId){ el.style.display = 'none'; return; }
        db.collection('seven7_cabinets').doc(cabinetId).get().then(function(doc){
            if(!doc.exists){ el.style.display = 'none'; return; }
            var cab = doc.data() || {};
            var plafond = typeof cab.plafondDossiers === 'number' ? cab.plafondDossiers : 0;
            var utilises = typeof cab.dossiersCreesAnnee === 'number' ? cab.dossiersCreesAnnee : 0;
            var reste = plafond - utilises;
            var texte;
            if(plafond >= SEUIL_ILLIMITE){
                texte = '🏢 ' + utilises + ' dossiers cette année (illimité)';
            } else {
                texte = '🏢 ' + utilises + '/' + plafond + ' dossiers cette année';
            }
            var couleur = plafond >= SEUIL_ILLIMITE ? '#2ecc71' : (reste <= 0 ? '#e74c3c' : (reste <= 2 ? '#f39c12' : '#2ecc71'));
            el.innerHTML = texte;
            el.style.borderLeft = '3px solid ' + couleur;
            el.style.display = 'inline-block';
        }).catch(function(){ el.style.display = 'none'; });
    }

    window.collabJoin = function(nom, dossier, password, isCreate, cabinetName, codeCabinet, avatar){
        return new Promise(function(resolve, reject){
            if(!collabInitFirebase()){ reject(new Error('Configuration Firebase manquante.')); return; }
            var email = dossierAuthEmail(dossier);
            var auth = firebase.auth();
            var docRef = db.collection('seven7_dossiers').doc(dossier);
            var cabinetRef = codeCabinet ? db.collection('seven7_cabinets').doc(codeCabinet) : null;

            function finalize(data){
                localStorage.setItem('seven7_name', nom);
                localStorage.setItem('seven7_dossier', dossier);
                if(data.cabinetName){
                    localStorage.setItem('seven7_cabinet_name', data.cabinetName);
                    var brandEl = document.getElementById('lock-screen-cabinet-name');
                    if(brandEl) brandEl.textContent = data.cabinetName;
                }
                // Mémorise ce dossier dans la liste des dossiers récents (sans mot de passe) afin
                // de pouvoir y revenir facilement depuis l'écran de connexion, même après avoir
                // rejoint un ou plusieurs autres dossiers entre-temps.
                if(typeof saveRecentDossier === 'function') saveRecentDossier(dossier, data.cabinetName || null, nom);
                updateCabinetQuotaDisplay(data.cabinetId);
                myName = nom;
                mySafeKey = safeKey(nom);
                dossierId = dossier;
                document.getElementById('collab-who').textContent = avatarFor(data, nom, mySafeKey) + ' ' + nom;
                document.getElementById('collab-dossier-label').textContent = '📁 ' + dossier;
                setStatus('🟢 Connecté');
                permData = data;
                listenPermissions();
                listenTabs();
                startPresenceTracking();
                window.SEVEN7_DB = db;
                window.SEVEN7_DOSSIER_ID = dossierId;
                if(typeof window.SEVEN7_MSG_INIT === 'function') window.SEVEN7_MSG_INIT();
                // Fermeture contrôlée du module liasse (11/08/2026) : charge
                // config_globale/features une fois (mise en cache dans
                // config-features.js), puis met à jour le badge de l'onglet.
                if(typeof chargerConfigGlobaleFeatures === 'function'){
                    chargerConfigGlobaleFeatures(db).then(function(){
                        if(typeof appliquerBadgeLiasseFermee === 'function') appliquerBadgeLiasseFermee(dossierId);
                    });
                }
                resolve(data);
            }

            // Une fois authentifié avec succès sur le compte Auth du dossier, on peut lire le
            // document (les règles Firestore l'autorisent car request.auth.uid == authUid).
            // Rattrapage silencieux pour les dossiers créés avant l'existence du tableau de
            // bord cabinet : leur miroir public (seven7_dossiers_public) n'a pas encore
            // cabinetId/admin, donc ils n'apparaîtraient jamais dans la liste du cabinet. On
            // les complète une seule fois, à la prochaine connexion — jamais en masse
            // (impossible côté client, faute d'un accès légitime aux comptes Auth des autres
            // dossiers), et jamais deux fois grâce au marqueur publicMirrorSynced posé sur le
            // dossier lui-même (donc aucun coût récurrent pour les dossiers déjà à jour).
            function syncPublicMirrorOnce(dossier, data){
                db.collection('seven7_dossiers_public').doc(dossier).set({
                    cabinetId: data.cabinetId,
                    admin: data.admin || null
                }, { merge: true }).then(function(){
                    trackWrites(1);
                    return db.collection('seven7_dossiers').doc(dossier).update({ publicMirrorSynced: true });
                }).then(function(){ trackWrites(1); }).catch(function(){ /* on retentera à la prochaine connexion */ });
            }
            function joinExistingAfterAuth(){
                docRef.get().then(function(doc){
                    if(!doc.exists){
                        reject(new Error("Ce dossier est introuvable. Vérifiez votre lien d'invitation auprès de votre administrateur."));
                        return;
                    }
                    var data = doc.data() || {};
                    if(data.cabinetId && !data.publicMirrorSynced){
                        syncPublicMirrorOnce(dossier, data);
                    }
                    var key = safeKey(nom);
                    var isAdminUser = data.admin === nom;
                    var hasAccess = data.access && Object.prototype.hasOwnProperty.call(data.access, key);
                    if(!isAdminUser && !hasAccess){
                        var upd = {};
                        upd['access.' + key] = { displayName: nom, tabs: [], avatar: avatar || DEFAULT_AVATAR };
                        docRef.update(upd).then(function(){
                            data.access = data.access || {};
                            data.access[key] = { displayName: nom, tabs: [], avatar: avatar || DEFAULT_AVATAR };
                            finalize(data);
                        }).catch(reject);
                        return;
                    }
                    // Personne déjà connue du dossier : si elle a changé d'avatar depuis sa
                    // dernière connexion, on met à jour l'avatar mémorisé pour ce dossier afin
                    // que les autres collaborateurs voient bien son choix actuel.
                    if(avatar && isAdminUser && data.adminAvatar !== avatar){
                        docRef.update({ adminAvatar: avatar }).then(function(){
                            data.adminAvatar = avatar;
                            finalize(data);
                        }).catch(function(){ finalize(data); });
                        return;
                    }
                    if(avatar && hasAccess && data.access[key].avatar !== avatar){
                        var updAvatar = {};
                        updAvatar['access.' + key + '.avatar'] = avatar;
                        docRef.update(updAvatar).then(function(){
                            data.access[key].avatar = avatar;
                            finalize(data);
                        }).catch(function(){ finalize(data); });
                        return;
                    }
                    finalize(data);
                }).catch(reject);
            }

            if(isCreate){
                if(!cabinetRef){
                    reject(new Error("Code cabinet manquant. Contactez SEVEN7 pour obtenir votre code d'abonnement."));
                    return;
                }

                function creerDossierEtIncrementer(){
                    auth.createUserWithEmailAndPassword(email, password).then(function(cred){
                        return docRef.set({
                            admin: nom,
                            adminAvatar: avatar || DEFAULT_AVATAR,
                            access: {},
                            authUid: cred.user.uid,
                            cabinetName: cabinetName || null,
                            cabinetId: codeCabinet
                        }).then(function(){
                            // Document public séparé (nom du cabinet uniquement) pour l'écran de connexion.
                            // On y ajoute aussi cabinetId/admin/date de création : c'est ce miroir, et lui
                            // seul, que le compte Auth "cabinet" est autorisé à interroger en liste (voir
                            // firestore.rules) pour construire le tableau de bord "tous mes dossiers".
                            return db.collection('seven7_dossiers_public').doc(dossier).set({
                                cabinetName: cabinetName || null,
                                cabinetId: codeCabinet || null,
                                admin: nom,
                                createdAt: firebase.firestore.FieldValue.serverTimestamp()
                            });
                        }).then(function(){
                            // Marque ce dossier comme déjà synchronisé avec son miroir public : évite de
                            // re-vérifier/ré-écrire ce miroir à chaque connexion future (voir joinExistingAfterAuth,
                            // qui ne fait ce travail qu'une seule fois, et seulement pour les dossiers plus anciens
                            // créés avant l'existence du tableau de bord cabinet).
                            return docRef.update({ publicMirrorSynced: true });
                        }).then(function(){
                            // Incrémente le compteur du cabinet. Les règles Firestore refusent cette
                            // écriture si elle dépasserait le plafond du palier — c'est donc bien le
                            // serveur, et non ce code client, qui fait respecter la limite en dernier
                            // ressort.
                            return cabinetRef.update({
                                dossiersCreesAnnee: firebase.firestore.FieldValue.increment(1)
                            });
                        });
                    }).then(function(){
                        finalize({ admin: nom, adminAvatar: avatar || DEFAULT_AVATAR, access: {}, cabinetName: cabinetName || null, cabinetId: codeCabinet });
                    }).catch(function(err){
                        if(err && err.code === 'auth/email-already-in-use'){
                            reject(new Error("Cet identifiant de dossier existe déjà, réessayez."));
                        } else if(err && err.code === 'auth/weak-password'){
                            reject(new Error("Le mot de passe doit contenir au moins 6 caractères."));
                        } else if(err && err.code === 'permission-denied'){
                            reject(new Error("Plafond de dossiers atteint pour votre palier cette année. Contactez SEVEN7 pour changer de palier."));
                        } else {
                            reject(err);
                        }
                    });
                }

                // Vérification côté client d'abord (message clair et rapide) ; la règle
                // Firestore ci-dessous refait la même vérification côté serveur au moment de
                // l'incrément, donc un contournement du code client ne suffit pas à dépasser
                // le plafond réel.
                cabinetRef.get().then(function(cabDoc){
                    if(!cabDoc.exists){
                        reject(new Error("Code cabinet inconnu. Vérifiez le code communiqué par SEVEN7."));
                        return;
                    }
                    var cab = cabDoc.data() || {};
                    var plafond = typeof cab.plafondDossiers === 'number' ? cab.plafondDossiers : 0;
                    var utilises = typeof cab.dossiersCreesAnnee === 'number' ? cab.dossiersCreesAnnee : 0;
                    if(utilises >= plafond){
                        reject(new Error("Plafond de " + plafond + " dossiers atteint pour cette année (palier " + (cab.palier || '?') + "). Contactez SEVEN7 pour changer de palier."));
                        return;
                    }
                    creerDossierEtIncrementer();
                }).catch(function(err){
                    reject(new Error("Impossible de vérifier le code cabinet. " + (err && err.message ? err.message : '')));
                });
                return;
            }

            // ---------- Rejoindre un dossier existant ----------
            auth.signInWithEmailAndPassword(email, password).then(function(){
                joinExistingAfterAuth();
            }).catch(function(err){
                var code = err && err.code;
                if(code === 'auth/wrong-password' || code === 'auth/invalid-credential'){
                    reject(new Error("Mot de passe incorrect pour ce dossier."));
                    return;
                }
                if(code !== 'auth/user-not-found' && code !== 'auth/invalid-email'){
                    reject(err);
                    return;
                }
                // Aucun compte Firebase Auth pour ce dossier : soit le dossier n'existe pas du tout,
                // soit c'est un dossier ANCIEN (créé avant cette mise à jour de sécurité), encore
                // protégé par un mot de passe en clair côté Firestore, qu'il faut migrer.
                // La règle Firestore de migration n'accepte l'écriture que si le mot de passe soumis
                // correspond exactement à celui déjà stocké : c'est donc elle qui fait office de
                // vérification, sans jamais exposer le mot de passe existant au client.
                auth.createUserWithEmailAndPassword(email, password).then(function(cred){
                    docRef.update({ password: password, authUid: cred.user.uid }).then(function(){
                        // Nettoyage : le mot de passe en clair n'est plus nécessaire une fois migré.
                        docRef.update({ password: firebase.firestore.FieldValue.delete() }).catch(function(){});
                        joinExistingAfterAuth();
                    }).catch(function(){
                        // Mot de passe incorrect (règle de migration refusée) ou dossier inexistant :
                        // on supprime le compte Auth créé par erreur pour ne pas laisser de compte orphelin.
                        cred.user.delete().catch(function(){});
                        reject(new Error("Mot de passe incorrect pour ce dossier (ou dossier introuvable)."));
                    });
                }).catch(function(createErr){
                    if(createErr && createErr.code === 'auth/email-already-in-use'){
                        // Un compte existe déjà pour ce dossier mais avec un mot de passe différent.
                        reject(new Error("Mot de passe incorrect pour ce dossier."));
                    } else {
                        reject(createErr);
                    }
                });
            });
        });
    };

    // ---------- 🏢 Tableau de bord cabinet (Option B : liste seulement, jamais le contenu) ----------
    // Le compte Auth "cabinet" (cabinet-{code}@seven7-audit.local) est provisionné manuellement
    // par SEVEN7 dans la console Firebase — voir le commentaire sur cabinetAuthEmail(). Ce compte
    // ne peut lire QUE seven7_dossiers_public en liste (voir firestore.rules) : jamais le contenu
    // réel d'un dossier, qui reste protégé par son propre mot de passe.
    window.openCabinetDashboard = function(){
        document.getElementById('cabinet-dashboard-overlay').style.display = 'flex';
        document.getElementById('cabinet-dash-login').style.display = 'block';
        document.getElementById('cabinet-dash-list').style.display = 'none';
        document.getElementById('cabinet-dash-error').style.display = 'none';
        document.getElementById('cabinet-dash-code').value = '';
        document.getElementById('cabinet-dash-password').value = '';
        ['cabinet-collab-code', 'cabinet-collab-email', 'cabinet-collab-password'].forEach(function(id){
            var el = document.getElementById(id);
            if(el) el.value = '';
        });
        var errEl = document.getElementById('cabinet-dash-error');
        if(errEl) errEl.style.color = '#c0392b'; // annule un éventuel message vert de réinitialisation
        var nouveauModeleEl = document.getElementById('cabinet-dash-nouveau-modele');
        if(nouveauModeleEl){ nouveauModeleEl.style.display = 'none'; nouveauModeleEl.innerHTML = ''; }
        cabinetSwitchMode('admin');
    };

    window.closeCabinetDashboard = function(){
        document.getElementById('cabinet-dashboard-overlay').style.display = 'none';
        // On se déconnecte du compte cabinet pour ne pas laisser cette session Auth active
        // par-dessus une future connexion à un dossier précis.
        if(collabInitFirebase()) firebase.auth().signOut().catch(function(){});
    };

    window.cabinetDashboardLogin = function(){
        var errEl = document.getElementById('cabinet-dash-error');
        errEl.style.display = 'none';
        var code = document.getElementById('cabinet-dash-code').value.trim().toUpperCase();
        var pass = document.getElementById('cabinet-dash-password').value;
        if(!code || !pass){
            errEl.textContent = 'Merci de renseigner le code cabinet et le mot de passe.';
            errEl.style.display = 'block';
            return;
        }
        if(!collabInitFirebase()){
            errEl.textContent = 'Configuration Firebase manquante.';
            errEl.style.display = 'block';
            return;
        }
        var btn = document.querySelector('#cabinet-dash-login .btn-primary');
        if(btn){ btn.disabled = true; btn.textContent = '⏳ Vérification…'; }
        var uidConnecte = null;
        firebase.auth().signInWithEmailAndPassword(cabinetAuthEmail(code), pass).then(function(cred){
            uidConnecte = cred.user.uid;
            // Nouveau modèle (phase 2/3) : ce même compte Auth est aussi celui de
            // l'administrateur du cabinet dans cabinets/{code}/membres/{uid}, s'il a
            // été migré. Les deux mondes coexistent : un cabinet pas encore migré
            // n'a simplement pas ce document, et la suite se comporte à l'identique
            // qu'avant (liste des dossiers de l'ancien modèle uniquement).
            return db.collection('cabinets').doc(code).collection('membres').doc(uidConnecte).get();
        }).then(function(membreDoc){
            trackReads(1);
            renderNouveauModeleCabinet(membreDoc.exists ? membreDoc.data() : null, code);
            return db.collection('seven7_dossiers_public').where('cabinetId', '==', code).get();
        }).then(function(snap){
            trackReads(Math.max(1, snap.size));
            renderCabinetDashboardList(snap, code);
        }).catch(function(err){
            var msg = 'Connexion refusée.';
            if(err && (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential')){
                msg = 'Mot de passe cabinet incorrect.';
            } else if(err && (err.code === 'auth/user-not-found' || err.code === 'auth/invalid-email')){
                msg = "Code cabinet inconnu, ou tableau de bord pas encore activé pour ce cabinet. Contactez SEVEN7.";
            }
            errEl.textContent = msg;
            errEl.style.display = 'block';
        }).then(function(){
            if(btn){ btn.disabled = false; btn.textContent = '🔓 Voir mes dossiers'; }
        });
    };

    // ---------- Connexion COLLABORATEUR par e-mail nominatif (§4) --------------
    // L'administrateur entre par CODE CABINET (ci-dessus), les collaborateurs par
    // leur e-mail personnel : eux ont une vraie adresse, connue d'eux seuls, et
    // peuvent donc réinitialiser leur mot de passe sans passer par SEVEN7.
    //
    // Le code cabinet est demandé EN PLUS de l'e-mail : Firestore ne permet pas de
    // retrouver à quel cabinet appartient un uid sans parcourir tous les cabinets
    // (ce qu'aucune règle ne peut autoriser sans ouvrir la lecture croisée que le
    // §6 interdit). Le demander explicitement est le prix, assumé, de l'isolation
    // stricte entre cabinets.
    //
    // Le rôle n'est JAMAIS déduit de cet écran : il est relu dans le document
    // membre, et seules les règles Firestore l'appliquent réellement.
    window.cabinetSwitchMode = function(mode){
        var admin = document.getElementById('cabinet-mode-admin');
        var collab = document.getElementById('cabinet-mode-collab');
        var ongletAdmin = document.getElementById('cabinet-onglet-admin');
        var ongletCollab = document.getElementById('cabinet-onglet-collab');
        var errEl = document.getElementById('cabinet-dash-error');
        if(errEl) errEl.style.display = 'none';
        var estAdmin = (mode !== 'collab');
        if(admin) admin.style.display = estAdmin ? 'block' : 'none';
        if(collab) collab.style.display = estAdmin ? 'none' : 'block';
        if(ongletAdmin) ongletAdmin.className = estAdmin ? 'btn btn-primary' : 'btn';
        if(ongletCollab) ongletCollab.className = estAdmin ? 'btn' : 'btn btn-primary';
    };

    window.cabinetCollaborateurLogin = function(){
        var errEl = document.getElementById('cabinet-dash-error');
        errEl.style.display = 'none';
        var code = document.getElementById('cabinet-collab-code').value.trim().toUpperCase();
        var email = document.getElementById('cabinet-collab-email').value.trim();
        var pass = document.getElementById('cabinet-collab-password').value;
        if(!code || !email || !pass){
            errEl.textContent = 'Merci de renseigner le code cabinet, votre e-mail et votre mot de passe.';
            errEl.style.display = 'block';
            return;
        }
        if(!collabInitFirebase()){
            errEl.textContent = 'Configuration Firebase manquante.';
            errEl.style.display = 'block';
            return;
        }
        var btn = document.querySelector('#cabinet-mode-collab .btn-primary');
        if(btn){ btn.disabled = true; btn.textContent = '⏳ Vérification…'; }
        var uidConnecte = null;
        firebase.auth().signInWithEmailAndPassword(email, pass).then(function(cred){
            uidConnecte = cred.user.uid;
            return db.collection('cabinets').doc(code).collection('membres').doc(uidConnecte).get();
        }).then(function(membreDoc){
            trackReads(1);
            // Authentifié mais pas membre de CE cabinet : on referme la session
            // plutôt que de laisser une session Auth ouverte sans habilitation.
            if(!membreDoc.exists){
                return firebase.auth().signOut().catch(function(){}).then(function(){
                    throw { code: 'seven7/non-membre' };
                });
            }
            var membre = membreDoc.data() || {};
            if(membre.actif === false){
                return firebase.auth().signOut().catch(function(){}).then(function(){
                    throw { code: 'seven7/compte-desactive' };
                });
            }
            renderNouveauModeleCabinet(membre, code);
            renderDossiersAffectes(membre, code);
        }).catch(function(err){
            var msg = 'Connexion refusée.';
            if(err && (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential')){
                msg = 'E-mail ou mot de passe incorrect.';
            } else if(err && err.code === 'auth/user-not-found'){
                msg = "Aucun compte pour cette adresse. Demandez à l'administrateur de votre cabinet de vous créer un accès.";
            } else if(err && err.code === 'auth/invalid-email'){
                msg = "Cette adresse e-mail n'est pas valide.";
            } else if(err && err.code === 'auth/too-many-requests'){
                msg = 'Trop de tentatives. Réessayez dans quelques minutes.';
            } else if(err && err.code === 'seven7/non-membre'){
                msg = "Votre compte n'appartient pas au cabinet « " + code + " ». Vérifiez le code cabinet saisi.";
            } else if(err && err.code === 'seven7/compte-desactive'){
                msg = "Votre accès a été désactivé par l'administrateur de votre cabinet.";
            }
            errEl.textContent = msg;
            errEl.style.display = 'block';
        }).then(function(){
            if(btn){ btn.disabled = false; btn.textContent = '🔓 Accéder à mes dossiers'; }
        });
    };

    window.cabinetCollabResetPassword = function(){
        var errEl = document.getElementById('cabinet-dash-error');
        var email = document.getElementById('cabinet-collab-email').value.trim();
        if(!email){
            errEl.textContent = "Saisissez d'abord votre adresse e-mail, puis relancez la réinitialisation.";
            errEl.style.display = 'block';
            return;
        }
        if(!collabInitFirebase()) return;
        firebase.auth().sendPasswordResetEmail(email).then(function(){
            errEl.style.color = '#1e7a4c';
            errEl.textContent = 'Un e-mail de réinitialisation vous a été envoyé. Pensez à vérifier vos indésirables.';
            errEl.style.display = 'block';
        }).catch(function(){
            // Message volontairement identique en cas de succès comme d'échec :
            // révéler qu'une adresse est inconnue permettrait d'énumérer les
            // comptes du cabinet.
            errEl.style.color = '#1e7a4c';
            errEl.textContent = 'Un e-mail de réinitialisation vous a été envoyé. Pensez à vérifier vos indésirables.';
            errEl.style.display = 'block';
        });
    };

    // Liste des dossiers du NOUVEAU modèle réellement affectés au membre. Un
    // collaborateur ne voit que dossiersAffectes ; un admin voit tout le cabinet.
    // Les règles Firestore appliquent exactement la même restriction : ce qui est
    // affiché ici n'est jamais ce qui autorise l'accès.
    function renderDossiersAffectes(membre, code){
        document.getElementById('cabinet-dash-login').style.display = 'none';
        var listEl = document.getElementById('cabinet-dash-list');
        var contentEl = document.getElementById('cabinet-dash-list-content');
        listEl.style.display = 'block';
        contentEl.innerHTML = '<p style="font-size:12px; color:#888;">Chargement de vos dossiers…</p>';

        var affectes = (membre && membre.dossiersAffectes) ? membre.dossiersAffectes : [];
        if(membre && membre.role !== 'ADMIN' && !affectes.length){
            contentEl.innerHTML = '<p style="font-size:12px; color:#888;">Aucun dossier ne vous est affecté pour le moment. '
                + "Demandez à l'administrateur principal de votre cabinet de vous en affecter.</p>";
            return;
        }

        var ref = db.collection('cabinets').doc(code).collection('dossiers');
        var lecture = (membre.role === 'ADMIN')
            ? ref.get()
            : Promise.all(affectes.map(function(id){ return ref.doc(id).get(); }))
                .then(function(docs){ return { forEach: function(cb){ docs.filter(function(d){ return d.exists; }).forEach(cb); } }; });

        lecture.then(function(snap){
            var rows = [];
            snap.forEach(function(doc){
                var d = doc.data() || {};
                rows.push({
                    id: doc.id, intitule: d.intitule || doc.id, client: d.clientAudite || '',
                    exercice: d.exercice || '', statut: d.statut || '',
                    dossierAncienId: typeof d.dossierAncienId === 'string' ? d.dossierAncienId : null,
                });
            });
            trackReads(Math.max(1, rows.length));
            if(!rows.length){
                contentEl.innerHTML = '<p style="font-size:12px; color:#888;">Aucun dossier dans cet espace cabinet pour le moment.</p>';
                return;
            }
            rows.sort(function(a, b){ return String(a.intitule).localeCompare(String(b.intitule)); });
            var esc = function(s){ return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/'/g,'&#39;'); };
            var role = (membre && membre.role) || 'COLLABORATEUR';
            var nomAffiche = (membre && membre.nom) || (role === 'ADMIN' ? 'Administrateur' : 'Collaborateur');
            contentEl.innerHTML = '<p style="font-size:11px; color:#888; margin-bottom:10px;">' + rows.length + ' dossier(s) accessible(s).</p>'
                + rows.map(function(r){
                    var ouvrable = !!r.dossierAncienId;
                    var attrs = ouvrable
                        ? 'onclick="cabinetOuvrirDossierPonte(\'' + esc(r.dossierAncienId) + '\', \'' + esc(r.id) + '\', \'' + esc(code) + '\', \'' + esc(role) + '\', \'' + esc(r.intitule) + '\', \'' + esc(nomAffiche) + '\')" style="cursor:pointer; border:1px solid #eee; border-radius:6px; padding:8px 10px; margin-bottom:6px; text-align:left;"'
                        : 'style="border:1px dashed #ddd; border-radius:6px; padding:8px 10px; margin-bottom:6px; text-align:left; opacity:.7;"';
                    return '<div ' + attrs + '>'
                        + '<div style="font-weight:600; font-size:13px; color:#1B2A4A;">📁 ' + esc(r.intitule) + '</div>'
                        + '<div style="font-size:11px; color:#888;">' + esc(r.client) + (r.exercice ? ' · exercice ' + esc(r.exercice) : '') + (r.statut ? ' · ' + esc(r.statut) : '') + '</div>'
                        + (ouvrable ? '' : '<div style="font-size:10px; color:#c0392b; margin-top:2px;">Contenu non encore lié — voir « Lier un dossier existant ».</div>')
                        + '</div>';
                }).join('');
        }).catch(function(err){
            contentEl.innerHTML = '<p style="font-size:12px; color:#c0392b;">Impossible de charger vos dossiers : '
                + String(err && err.message ? err.message : err).replace(/</g,'&lt;') + '</p>';
        });
    }

    // ---------- Phase 5 : ouvrir un dossier lié via le pont ----------
    //
    // À la différence de collabJoin, aucune (ré)authentification n'a lieu ici : le
    // membre du cabinet ouvre le dossier SOUS SA PROPRE session Firebase Auth déjà
    // active. C'est exactement ce que permettent les règles ajoutées en phase 5
    // (accesPontLecture / accesPontEcriture) — sans elles, cette fonction échouerait
    // à chaque lecture, comme le confirment tests/pont-dossiers.test.js.
    //
    // Reproduit ce que fait finalize() dans collabJoin (permissions, onglets,
    // présence, messagerie), sans les parties propres à l'ancien modèle qui n'ont
    // pas de sens ici : pas d'inscription dans permData.access (identité = UID
    // Firebase, pas un nom auto-déclaré), pas de synchronisation du miroir public
    // (réservée aux dossiers ouverts par leur propre compte Auth).
    window.cabinetOuvrirDossierPonte = function(dossierAncienId, dossierNouveauId, code, role, intitule, nomAffiche){
        if(!firebase.auth().currentUser){
            alert('Session cabinet expirée — reconnectez-vous.');
            return;
        }
        document.getElementById('cabinet-dashboard-overlay').style.display = 'none';

        pontActif = true;
        pontRole = role === 'ADMIN' ? 'ADMIN' : 'COLLABORATEUR';
        pontCabinetCode = code;
        pontDossierNouveauId = dossierNouveauId;

        myName = nomAffiche || (pontRole === 'ADMIN' ? 'Administrateur' : 'Collaborateur');
        mySafeKey = safeKey(myName);
        dossierId = dossierAncienId;
        isAdmin = (pontRole === 'ADMIN');

        localStorage.setItem('seven7_name', myName);
        localStorage.setItem('seven7_dossier', dossierId);

        document.getElementById('lock-screen').style.display = 'none';
        document.getElementById('collab-bar').style.display = 'flex';
        document.getElementById('collab-who').textContent = '🏢 ' + myName + (isAdmin ? ' (Administrateur cabinet)' : ' (Collaborateur cabinet)');
        document.getElementById('collab-dossier-label').textContent = '📁 ' + (intitule || dossierId);
        setStatus('🟢 Connecté (via ' + code + ')');

        window.SEVEN7_DB = db;
        window.SEVEN7_DOSSIER_ID = dossierId;
        // Le palier gouverne quels onglets sont seulement AFFICHÉS (myAllowedTabs)
        // dès l'ouverture — il faut donc le connaître AVANT listenPermissions
        // (qui déclenche applyAccessControl, lequel s'appuie dessus), pas après.
        db.collection('cabinets').doc(code).get().then(function(cabDoc){
            trackReads(1);
            pontPlanCabinet = (cabDoc.exists && cabDoc.data().plan) || null;
            window.SEVEN7_PLAN_CABINET = pontPlanCabinet;
        }).catch(function(){ pontPlanCabinet = null; }).then(function(){
            listenPermissions();
            listenTabs();
            startPresenceTracking();
            if(typeof window.SEVEN7_MSG_INIT === 'function') window.SEVEN7_MSG_INIT();
            if(typeof appliquerVerrouLiassePont === 'function') appliquerVerrouLiassePont();
            if(typeof rafraichirBlocPalierSommaire === 'function') rafraichirBlocPalierSommaire();
            // Fermeture contrôlée du module liasse (11/08/2026) : même
            // mécanisme que collabJoin (voir finalize() plus haut), pour
            // qu'une session pont voie aussi le badge « Bientôt disponible ».
            if(typeof chargerConfigGlobaleFeatures === 'function'){
                chargerConfigGlobaleFeatures(db).then(function(){
                    if(typeof appliquerBadgeLiasseFermee === 'function') appliquerBadgeLiasseFermee(dossierId);
                });
            }
        });
    };

    // ---------- Nouveau modèle (phase 3) : bandeau membre/rôle/quota -----------
    // N'affiche rien si membre === null (cabinet pas encore migré, ou compte
    // Auth cabinet sans document membre) : l'écran garde alors exactement son
    // comportement d'avant cette phase, ancien modèle seul.
    function renderNouveauModeleCabinet(membre, code){
        var el = document.getElementById('cabinet-dash-nouveau-modele');
        if(!el) return;
        if(!membre){ el.style.display = 'none'; el.innerHTML = ''; return; }
        var roleLabel = membre.role === 'ADMIN' ? 'Administrateur principal' : 'Collaborateur';
        var nomHtml = String(membre.nom || '').replace(/&/g,'&amp;').replace(/</g,'&lt;');
        var codeAttr = String(code).replace(/'/g, "\\'");
        // E2/§5 : le bouton n'existe même pas dans le DOM pour un collaborateur —
        // le masquage n'étant qu'un confort (§5), la vraie barrière est dans
        // firestore.rules (estAdmin(code) sur /membres). Ceci évite seulement
        // un aller-retour réseau inutile qui échouerait de toute façon.
        var boutonEquipe = membre.role === 'ADMIN'
            ? '<button type="button" class="btn" style="width:100%; margin-top:8px; font-size:12px;" onclick="cabinetOuvrirGestionEquipe(\'' + codeAttr + '\')">👥 Gérer l\'équipe</button>'
            : '';
        el.style.display = 'block';
        el.innerHTML = '<div style="background:#F5EFE2; border:1px solid #B8975A; border-radius:6px; padding:10px 12px; margin-bottom:12px; text-align:left;">' +
            '<div style="font-weight:700; font-size:12.5px; color:#1B2A4A;">🏢 Espace cabinet — nouveau modèle</div>' +
            '<div style="font-size:12px; color:#555; margin-top:4px;">' + nomHtml + ' · <strong>' + roleLabel + '</strong></div>' +
            '<div id="cabinet-dash-quota-nouveau" style="font-size:11px; color:#888; margin-top:4px;">Chargement du quota…</div>' +
            boutonEquipe +
            '</div>';
        db.collection('cabinets').doc(code).get().then(function(cabDoc){
            trackReads(1);
            var quotaEl = document.getElementById('cabinet-dash-quota-nouveau');
            if(!quotaEl || !cabDoc.exists) return;
            var c = cabDoc.data();
            var plafond = typeof c.quotaDossiers === 'number' ? c.quotaDossiers : 0;
            var utilises = typeof c.dossiersUtilises === 'number' ? c.dossiersUtilises : 0;
            var libellePlan = c.plan || '?';
            quotaEl.textContent = (plafond >= SEUIL_ILLIMITE ? (utilises + ' dossier(s) — illimité') : (utilises + ' / ' + plafond + ' dossiers'))
                + ' — plan ' + libellePlan
                + (c.statut !== 'ACTIF' ? ' — ⚠ ' + c.statut : '');
        }).catch(function(){ /* affichage dégradé : le rôle reste visible sans le quota */ });
    }

    // ---------- Phase 4 : gestion de l'équipe (créer, désactiver, affecter) ----
    //
    // Créer un compte Auth pour un collaborateur DEPUIS un compte déjà connecté
    // (l'admin) pose un piège classique : firebase.auth().createUserWithEmailAndPassword()
    // sur l'app PRINCIPALE reconnecte automatiquement le navigateur sur le
    // compte fraîchement créé, déconnectant l'admin au passage. Sans Cloud
    // Function pour créer le compte côté serveur (§4, §12 du cahier des
    // charges — aucune Cloud Function sans prévenir), la parade standard est
    // une SECONDE app Firebase, isolée, dont la session ne touche jamais celle
    // de l'app principale : c'est elle qui crée le compte, puis se ferme.
    var cabinetEquipeCode = null;

    window.cabinetOuvrirGestionEquipe = function(code){
        cabinetEquipeCode = code;
        document.getElementById('cabinet-equipe-overlay').style.display = 'block';
        document.getElementById('cabinet-equipe-erreur').style.display = 'none';
        document.getElementById('cabinet-equipe-succes').style.display = 'none';
        cabinetRafraichirEquipe();
    };

    window.closeCabinetEquipe = function(){
        document.getElementById('cabinet-equipe-overlay').style.display = 'none';
    };

    function cabinetRafraichirEquipe(){
        var listeEl = document.getElementById('cabinet-equipe-liste');
        listeEl.innerHTML = '<p style="font-size:12px; color:#888;">Chargement de l\'équipe…</p>';
        var code = cabinetEquipeCode;
        Promise.all([
            db.collection('cabinets').doc(code).collection('membres').get(),
            db.collection('cabinets').doc(code).collection('dossiers').get(),
        ]).then(function(res){
            var membresSnap = res[0], dossiersSnap = res[1];
            trackReads(membresSnap.size + dossiersSnap.size);
            var dossiers = [];
            dossiersSnap.forEach(function(d){ dossiers.push({ id: d.id, intitule: (d.data() || {}).intitule || d.id }); });
            dossiers.sort(function(a, b){ return String(a.intitule).localeCompare(String(b.intitule)); });

            var membres = [];
            membresSnap.forEach(function(d){ membres.push(Object.assign({ uid: d.id }, d.data())); });
            membres.sort(function(a, b){
                if(a.role !== b.role) return a.role === 'ADMIN' ? -1 : 1;
                return String(a.nom || '').localeCompare(String(b.nom || ''));
            });

            if(!membres.length){
                listeEl.innerHTML = '<p style="font-size:12px; color:#888;">Aucun membre trouvé.</p>';
                return;
            }
            var esc = function(s){ return String(s == null ? '' : s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/'/g,'&#39;'); };
            listeEl.innerHTML = membres.map(function(m){
                var soi = (m.uid === firebase.auth().currentUser.uid);
                var affectes = Array.isArray(m.dossiersAffectes) ? m.dossiersAffectes : [];
                var roleTag = m.role === 'ADMIN'
                    ? '<span style="background:#1B2A4A; color:#fff; font-size:10px; padding:2px 6px; border-radius:3px;">ADMIN</span>'
                    : '<span style="background:#eee; color:#555; font-size:10px; padding:2px 6px; border-radius:3px;">COLLABORATEUR</span>';
                var actifTag = m.actif === false
                    ? '<span style="color:#c0392b; font-size:11px;">● désactivé</span>'
                    : '<span style="color:#1e7a4c; font-size:11px;">● actif</span>';
                var toggleBtn = soi ? ''
                    : '<button type="button" class="btn" style="font-size:11px; padding:3px 8px; margin-left:6px;" '
                    + 'onclick="cabinetToggleMembreActif(\'' + esc(m.uid) + '\', ' + (m.actif === false ? 'true' : 'false') + ')">'
                    + (m.actif === false ? 'Réactiver' : 'Désactiver') + '</button>';

                var dossiersHtml = (m.role === 'ADMIN')
                    ? '<div style="font-size:11px; color:#888; margin-top:6px;">Accède à tous les dossiers du cabinet.</div>'
                    : '<div style="margin-top:6px;">'
                    + dossiers.map(function(dos){
                        var checked = affectes.indexOf(dos.id) !== -1 ? 'checked' : '';
                        return '<label style="display:block; font-size:11px; color:#555; margin-bottom:2px;">'
                            + '<input type="checkbox" class="cabinet-equipe-dossier-case" data-uid="' + esc(m.uid) + '" data-dossier="' + esc(dos.id) + '" ' + checked + '> '
                            + esc(dos.intitule) + '</label>';
                    }).join('')
                    + (dossiers.length ? '<button type="button" class="btn btn-primary" style="font-size:11px; padding:4px 10px; margin-top:4px;" onclick="cabinetSauvegarderAffectations(\'' + esc(m.uid) + '\')">Enregistrer les dossiers affectés</button>'
                                       : '<div style="font-size:11px; color:#888;">Aucun dossier dans ce cabinet pour le moment.</div>')
                    + '</div>';

                return '<div style="border:1px solid #eee; border-radius:6px; padding:10px; margin-bottom:8px; text-align:left;">'
                    + '<div style="display:flex; justify-content:space-between; align-items:center;">'
                    + '<div><strong style="font-size:13px; color:#1B2A4A;">' + esc(m.nom) + '</strong> ' + roleTag + (soi ? ' <span style="font-size:10px; color:#888;">(vous)</span>' : '') + '</div>'
                    + '<div>' + actifTag + toggleBtn + '</div>'
                    + '</div>'
                    + '<div style="font-size:11px; color:#888; margin-top:2px;">' + esc(m.email) + '</div>'
                    + dossiersHtml
                    + '</div>';
            }).join('');
        }).catch(function(err){
            listeEl.innerHTML = '<p style="font-size:12px; color:#c0392b;">Impossible de charger l\'équipe : ' + String(err && err.message ? err.message : err).replace(/</g,'&lt;') + '</p>';
        });
    }

    window.cabinetToggleMembreActif = function(uid, nouvelEtat){
        var erreurEl = document.getElementById('cabinet-equipe-erreur');
        erreurEl.style.display = 'none';
        db.collection('cabinets').doc(cabinetEquipeCode).collection('membres').doc(uid)
            .update({ actif: nouvelEtat })
            .then(function(){ cabinetRafraichirEquipe(); })
            .catch(function(err){
                erreurEl.textContent = 'Impossible de modifier ce membre : ' + (err && err.message ? err.message : err);
                erreurEl.style.display = 'block';
            });
    };

    window.cabinetSauvegarderAffectations = function(uid){
        var erreurEl = document.getElementById('cabinet-equipe-erreur');
        var succesEl = document.getElementById('cabinet-equipe-succes');
        erreurEl.style.display = 'none'; succesEl.style.display = 'none';
        var cases = document.querySelectorAll('.cabinet-equipe-dossier-case[data-uid="' + uid.replace(/"/g,'') + '"]');
        var dossiersAffectes = [];
        cases.forEach(function(c){ if(c.checked) dossiersAffectes.push(c.getAttribute('data-dossier')); });
        db.collection('cabinets').doc(cabinetEquipeCode).collection('membres').doc(uid)
            .update({ dossiersAffectes: dossiersAffectes })
            .then(function(){
                succesEl.textContent = '✅ Dossiers affectés mis à jour (' + dossiersAffectes.length + ').';
                succesEl.style.display = 'block';
            })
            .catch(function(err){
                erreurEl.textContent = 'Impossible d\'enregistrer : ' + (err && err.message ? err.message : err);
                erreurEl.style.display = 'block';
            });
    };

    // Crée le compte Auth du collaborateur via une app Firebase secondaire
    // (jamais l'app principale — voir la note en tête de section), puis écrit
    // son document membre via l'app PRINCIPALE : c'est elle qui porte la
    // session admin, donc c'est elle que firestore.rules verra pour estAdmin().
    window.cabinetCreerCollaborateur = function(){
        var erreurEl = document.getElementById('cabinet-equipe-erreur');
        var succesEl = document.getElementById('cabinet-equipe-succes');
        erreurEl.style.display = 'none'; succesEl.style.display = 'none';

        var nom = document.getElementById('cabinet-equipe-nom').value.trim();
        var email = document.getElementById('cabinet-equipe-email').value.trim();
        var motDePasse = document.getElementById('cabinet-equipe-motdepasse').value;

        if(!nom || !email || !motDePasse){
            erreurEl.textContent = 'Merci de renseigner le nom, l\'e-mail et le mot de passe provisoire.';
            erreurEl.style.display = 'block';
            return;
        }
        if(motDePasse.length < 6){
            erreurEl.textContent = 'Le mot de passe doit compter au moins 6 caractères (minimum imposé par Firebase Authentication).';
            erreurEl.style.display = 'block';
            return;
        }

        var btn = document.getElementById('cabinet-equipe-creer-btn');
        btn.disabled = true; btn.textContent = '⏳ Création…';

        var nomAppSecondaire = 'seven7-equipe-' + Date.now();
        var appSecondaire = firebase.initializeApp(FIREBASE_CONFIG, nomAppSecondaire);
        var authSecondaire = appSecondaire.auth();

        authSecondaire.createUserWithEmailAndPassword(email, motDePasse).then(function(cred){
            var nouvelUid = cred.user.uid;
            // La session de l'app secondaire est refermée et l'app supprimée
            // AVANT d'écrire dans Firestore : elle a servi à créer le compte,
            // rien de plus — la garder ouverte ne ferait que consommer de la
            // mémoire, et ne doit jamais être confondue avec la session admin.
            return authSecondaire.signOut().catch(function(){}).then(function(){
                return appSecondaire.delete().catch(function(){});
            }).then(function(){
                return db.collection('cabinets').doc(cabinetEquipeCode).collection('membres').doc(nouvelUid).set({
                    uid: nouvelUid, nom: nom, email: email,
                    role: 'COLLABORATEUR', actif: true, dossiersAffectes: [],
                    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                });
            });
        }).then(function(){
            succesEl.textContent = '✅ Compte créé pour ' + nom + '. Communiquez-lui son e-mail et son mot de passe provisoire séparément.';
            succesEl.style.display = 'block';
            document.getElementById('cabinet-equipe-nom').value = '';
            document.getElementById('cabinet-equipe-email').value = '';
            document.getElementById('cabinet-equipe-motdepasse').value = '';
            cabinetRafraichirEquipe();
        }).catch(function(err){
            var msg = (err && err.code === 'auth/email-already-in-use')
                ? 'Cette adresse e-mail a déjà un compte Firebase — utilisez-en une autre, ou contactez SEVEN7 si ce collaborateur devrait déjà appartenir à un cabinet.'
                : 'Impossible de créer ce compte : ' + (err && err.message ? err.message : err);
            erreurEl.textContent = msg;
            erreurEl.style.display = 'block';
            // Nettoyage best-effort si l'app secondaire existe encore (échec
            // survenu après la création Auth mais avant l'écriture Firestore).
            try { appSecondaire.delete().catch(function(){}); } catch(e){}
        }).then(function(){
            btn.disabled = false; btn.textContent = 'Créer le compte';
        });
    };

    // ---------- Phase 5 : lier un dossier ancien existant à un cabinet ----------
    //
    // Ordre imposé par firestore.rules (voir la règle sur seven7_dossiers) :
    // la fiche cabinets/{code}/dossiers/{id} doit déjà exister et pointer vers
    // CE dossier (dossierAncienId) AVANT que le lien seven7_dossiers puisse
    // s'écrire — sinon un admin outillé pourrait lier des dossiers sans jamais
    // consommer de quota (E4). Donc : créer la fiche + incrémenter le quota
    // D'ABORD, poser le lien ENSUITE.
    //
    // Conséquence assumée : si le lien final échoue (mot de passe erroné une
    // fois arrivé jusque-là, ou dossier déjà migré vers l'authentification —
    // voir la note ci-dessous), la fiche est supprimée (autorisé, estAdmin)
    // mais le compteur dossiersUtilises ne peut PAS être décrémenté : la
    // règle sur cabinets/{code} n'autorise qu'un incrément de +1, jamais une
    // baisse (aucune Cloud Function pour le faire côté serveur). C'est
    // pourquoi un contrôle préalable, gratuit et fiable, est fait AVANT toute
    // écriture Firestore : une connexion Firebase Auth d'essai (app
    // secondaire, jamais l'app principale — même précaution que pour la
    // création de collaborateur) vérifie le mot de passe sans toucher au
    // quota. Ce contrôle ne peut cependant pas prédire un second échec
    // possible et distinct : un dossier déjà migré vers l'authentification
    // moderne n'a plus de champ "password" en base (supprimé automatiquement
    // à sa première connexion post-migration, voir collabJoin plus haut) —
    // la règle de liaison, qui compare ce champ, refuse alors la dernière
    // étape même avec le bon mot de passe. Ce cas est signalé clairement à
    // l'admin plutôt que masqué.
    window.cabinetLierDossierExistant = function(){
        var erreurEl = document.getElementById('cabinet-liaison-erreur');
        var succesEl = document.getElementById('cabinet-liaison-succes');
        erreurEl.style.display = 'none'; succesEl.style.display = 'none';

        var dossierId = document.getElementById('cabinet-liaison-dossier').value.trim();
        var motDePasse = document.getElementById('cabinet-liaison-motdepasse').value;
        var intitule = document.getElementById('cabinet-liaison-intitule').value.trim();
        var code = cabinetEquipeCode;

        if(!dossierId || !motDePasse || !intitule){
            erreurEl.textContent = "Merci de renseigner l'identifiant du dossier, son mot de passe et l'intitulé.";
            erreurEl.style.display = 'block';
            return;
        }

        var btn = document.getElementById('cabinet-liaison-btn');
        btn.disabled = true; btn.textContent = '⏳ Vérification…';

        var nomAppSecondaire = 'seven7-liaison-' + Date.now();
        var appSecondaire = firebase.initializeApp(FIREBASE_CONFIG, nomAppSecondaire);
        var authSecondaire = appSecondaire.auth();

        function nettoyerAppSecondaire(){
            return authSecondaire.signOut().catch(function(){}).then(function(){
                return appSecondaire.delete().catch(function(){});
            });
        }

        authSecondaire.signInWithEmailAndPassword(dossierAuthEmail(dossierId), motDePasse).then(function(){
            return nettoyerAppSecondaire();
        }).then(function(){
            btn.textContent = '⏳ Vérification du quota…';
            return db.collection('cabinets').doc(code).get();
        }).then(function(cabDoc){
            if(!cabDoc.exists) throw { code: 'seven7/cabinet-introuvable' };
            var c = cabDoc.data() || {};
            var plafond = typeof c.quotaDossiers === 'number' ? c.quotaDossiers : 0;
            var utilises = typeof c.dossiersUtilises === 'number' ? c.dossiersUtilises : 0;
            if(utilises >= plafond) throw { code: 'seven7/quota-atteint', plafond: plafond };

            btn.textContent = '⏳ Liaison en cours…';
            var nouveauRef = db.collection('cabinets').doc(code).collection('dossiers').doc();
            return nouveauRef.set({
                intitule: intitule,
                creePar: firebase.auth().currentUser.uid,
                statut: 'EN_COURS',
                liasseVerrouillee: true,
                numeroSequence: utilises + 1,
                dossierAncienId: dossierId,
            }).then(function(){
                return db.collection('cabinets').doc(code).update({
                    dossiersUtilises: firebase.firestore.FieldValue.increment(1)
                });
            }).then(function(){
                return db.collection('seven7_dossiers').doc(dossierId).update({
                    cabinetCode: code, dossierNouveauId: nouveauRef.id, password: motDePasse,
                });
            }).catch(function(errLiaison){
                // Rollback de la fiche (quota non récupérable, voir commentaire
                // ci-dessus) : mieux vaut une fiche orpheline supprimée qu'une
                // fiche fantôme qui prétend être liée sans vraiment l'être.
                return nouveauRef.delete().catch(function(){}).then(function(){
                    throw { code: 'seven7/dossier-deja-migre' };
                });
            });
        }).then(function(){
            succesEl.textContent = '✅ Dossier « ' + intitule + ' » lié au cabinet.';
            succesEl.style.display = 'block';
            document.getElementById('cabinet-liaison-dossier').value = '';
            document.getElementById('cabinet-liaison-motdepasse').value = '';
            document.getElementById('cabinet-liaison-intitule').value = '';
            cabinetRafraichirEquipe();
        }).catch(function(err){
            var msg;
            if(err && (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found')){
                msg = "Identifiant ou mot de passe de dossier incorrect.";
            } else if(err && err.code === 'seven7/cabinet-introuvable'){
                msg = "Cabinet introuvable.";
            } else if(err && err.code === 'seven7/quota-atteint'){
                msg = 'Plafond de ' + err.plafond + ' dossier(s) atteint pour votre palier. Passez à un palier supérieur pour lier ce dossier.';
            } else if(err && err.code === 'seven7/dossier-deja-migre'){
                msg = "Le mot de passe est correct, mais ce dossier a déjà migré vers l'authentification moderne et ne peut plus être lié automatiquement par ce moyen. Contactez SEVEN7.";
            } else {
                msg = 'Impossible de lier ce dossier : ' + (err && err.message ? err.message : err);
            }
            erreurEl.textContent = msg;
            erreurEl.style.display = 'block';
            try { appSecondaire.delete().catch(function(){}); } catch(e){}
        }).then(function(){
            btn.disabled = false; btn.textContent = 'Lier ce dossier';
        });
    };

    // ---------- E5 : comparaison des paliers d'abonnement ----------
    // Lit /plans en direct (lecture publique, voir firestore.rules) : rien
    // n'est codé en dur ici, une évolution tarifaire ne touche que les
    // documents Firestore, jamais ce fichier (§3, §11 du cahier des charges).
    var LIBELLES_FONCTIONNALITES = {
        cycle_audit_complet: "Cycle d'audit complet (34 onglets)",
        liasse_syscohada: 'Liasse SYSCOHADA de base',
        export_pdf: 'Export PDF',
        revue_analytique_avancee: 'Revue analytique avancée',
        detection_erreurs: "Détection d'erreurs",
        export_excel: 'Export Excel',
        module_liasse_fiscale: 'Module liasse fiscale complet (18 onglets, e-impôts)',
        multi_exercices: 'Archivage multi-exercices',
        tableau_bord_supervision: 'Tableau de bord de supervision',
        support_prioritaire: 'Support prioritaire',
    };

    window.cabinetOuvrirComparaisonPaliers = function(){
        document.getElementById('paliers-comparaison-overlay').style.display = 'block';
        var contentEl = document.getElementById('paliers-comparaison-contenu');
        contentEl.innerHTML = '<p style="color:#888;">Chargement…</p>';
        if(!db){
            contentEl.innerHTML = '<p style="color:#c0392b;">Connectez-vous d\'abord à un cabinet ou un dossier.</p>';
            return;
        }
        db.collection('plans').get().then(function(snap){
            trackReads(snap.size);
            var plans = [];
            snap.forEach(function(d){ plans.push(d.data()); });
            plans.sort(function(a, b){ return (a.ordre || 0) - (b.ordre || 0); });
            if(!plans.length){
                contentEl.innerHTML = '<p style="color:#c0392b;">Aucun palier configuré pour le moment. Contactez SEVEN7.</p>';
                return;
            }
            var esc = function(s){ return String(s == null ? '' : s).replace(/&/g,'&amp;').replace(/</g,'&lt;'); };
            var toutesFonctionnalites = [];
            plans.forEach(function(p){ (p.fonctionnalites || []).forEach(function(f){ if(toutesFonctionnalites.indexOf(f) === -1) toutesFonctionnalites.push(f); }); });
            var illimite = function(q){ return typeof q === 'number' && q >= SEUIL_ILLIMITE; };
            var html = '<div style="overflow-x:auto;"><table style="width:100%; border-collapse:collapse; font-size:12.5px;">'
                + '<tr><th style="text-align:left; padding:8px; border-bottom:2px solid #1B2A4A;"></th>'
                + plans.map(function(p){
                    var estActuel = pontActif && pontPlanCabinet === p.id;
                    return '<th style="padding:8px; border-bottom:2px solid #1B2A4A; text-align:center;' + (estActuel ? ' background:#F5EFE2;' : '') + '">'
                        + esc(p.libelle) + (estActuel ? '<div style="font-size:10px; color:#B8975A; font-weight:700;">PALIER ACTUEL</div>' : '')
                        + '</th>';
                }).join('') + '</tr>'
                + '<tr><td style="padding:8px; border-bottom:1px solid #eee; font-weight:600;">Dossiers</td>'
                + plans.map(function(p){ return '<td style="padding:8px; border-bottom:1px solid #eee; text-align:center;">' + (illimite(p.quotaDossiers) ? 'Illimité' : (p.quotaDossiers || 0)) + '</td>'; }).join('')
                + '</tr>'
                + '<tr><td style="padding:8px; border-bottom:1px solid #eee; font-weight:600;">Collaborateurs</td>'
                + plans.map(function(p){ return '<td style="padding:8px; border-bottom:1px solid #eee; text-align:center;">' + (illimite(p.quotaCollaborateurs) ? 'Illimité' : (p.quotaCollaborateurs || 0)) + '</td>'; }).join('')
                + '</tr>'
                + toutesFonctionnalites.map(function(f){
                    // Fermeture contrôlée du module liasse (11/08/2026) : la
                    // ligne reste dans la grille (argument de valeur future,
                    // §5.1 du prompt de fermeture), mais annonce « Bientôt »
                    // plutôt qu'un ✅ trompeur tant que le module est fermé —
                    // même pour un palier qui l'inclut normalement.
                    var fermeeGlobalement = (f === 'module_liasse_fiscale')
                        && typeof liasseModuleActif === 'function' && !liasseModuleActif(window.SEVEN7_DOSSIER_ID || null);
                    return '<tr><td style="padding:8px; border-bottom:1px solid #f2f2f2;">' + esc(LIBELLES_FONCTIONNALITES[f] || f) + '</td>'
                        + plans.map(function(p){
                            var inclus = (p.fonctionnalites || []).indexOf(f) !== -1;
                            var contenu = !inclus ? '—' : (fermeeGlobalement ? '🔒 Bientôt' : '✅');
                            return '<td style="padding:8px; border-bottom:1px solid #f2f2f2; text-align:center;' + (fermeeGlobalement && inclus ? ' color:#B8975A; font-weight:600;' : '') + '">' + contenu + '</td>';
                        }).join('') + '</tr>';
                }).join('')
                + '</table></div>'
                + '<p style="font-size:11px; color:#888; margin-top:14px;">📞 Pour changer de palier, contactez SEVEN7 — le changement est appliqué par notre équipe, jamais en libre-service.</p>';
            contentEl.innerHTML = html;
        }).catch(function(err){
            contentEl.innerHTML = '<p style="color:#c0392b;">Impossible de charger les paliers : ' + String(err && err.message ? err.message : err).replace(/</g,'&lt;') + '</p>';
        });
    };

    window.closeComparaisonPaliers = function(){
        document.getElementById('paliers-comparaison-overlay').style.display = 'none';
    };

    // ---------- Bloc palier dans l'onglet Sommaire (masquage, §12) ----------
    function rafraichirBlocPalierSommaire(){
        var el = document.getElementById('sommaire-palier-cabinet');
        if(!el) return;
        if(!pontActif){ el.style.display = 'none'; el.innerHTML = ''; return; }
        var esc = function(s){ return String(s == null ? '' : s).replace(/&/g,'&amp;').replace(/</g,'&lt;'); };
        var ongletsVerrouilles = [];
        Object.keys(PONT_ONGLETS_RESERVES_PALIER).forEach(function(id){
            if(pontOngletReserveParPalier(id)){
                var t = TABS.filter(function(x){ return x.id === id; })[0];
                ongletsVerrouilles.push(t ? t.label : id);
            }
        });
        if(pontOngletReserveParPalier('liasse-actif')) ongletsVerrouilles.push('LIASSE — États Financiers');
        el.style.display = 'block';
        el.innerHTML = '<div class="alert alert-info" style="text-align:left;">'
            + '<strong>💼 Palier du cabinet : ' + esc(pontPlanCabinet || '?') + '</strong>'
            + (ongletsVerrouilles.length
                ? '<div style="font-size:12px; margin-top:6px;">🔒 Réservés à un palier supérieur : ' + esc(ongletsVerrouilles.join(', ')) + '</div>'
                : '<div style="font-size:12px; margin-top:6px; color:#1e7a4c;">✅ Toutes les fonctionnalités de ce palier sont accessibles.</div>')
            + '<button type="button" class="btn" style="margin-top:8px; font-size:11px; padding:4px 10px;" onclick="cabinetOuvrirComparaisonPaliers()">Comparer les paliers</button>'
            + '</div>';
    }

    function renderCabinetDashboardList(snap, code){
        document.getElementById('cabinet-dash-login').style.display = 'none';
        var listEl = document.getElementById('cabinet-dash-list');
        var contentEl = document.getElementById('cabinet-dash-list-content');
        listEl.style.display = 'block';
        var rows = [];
        snap.forEach(function(doc){
            var d = doc.data() || {};
            rows.push({ id: doc.id, admin: d.admin || '(inconnu)', createdAt: d.createdAt });
        });
        rows.sort(function(a, b){ return a.id.localeCompare(b.id); });
        if(!rows.length){
            contentEl.innerHTML = '<p style="font-size:12px; color:#888;">Aucun dossier trouvé pour le code cabinet "' + code + '". Les dossiers créés avant l\'activation de ce tableau de bord y apparaîtront automatiquement dès leur prochaine connexion individuelle.</p>';
            return;
        }
        contentEl.innerHTML = '<p style="font-size:11px; color:#888; margin-bottom:10px;">' + rows.length + ' dossier(s) — cliquez sur un dossier pour préparer sa connexion (son mot de passe propre reste requis).</p>' +
            rows.map(function(r){
                var dateStr = (r.createdAt && r.createdAt.toDate) ? r.createdAt.toDate().toLocaleDateString('fr-FR') : 'date inconnue';
                var idEsc = r.id.replace(/'/g, "\\'");
                var idHtml = r.id.replace(/&/g,'&amp;').replace(/</g,'&lt;');
                var adminHtml = String(r.admin).replace(/&/g,'&amp;').replace(/</g,'&lt;');
                return '<div onclick="chooseCabinetDossier(\'' + idEsc + '\')" style="cursor:pointer; border:1px solid #eee; border-radius:6px; padding:8px 10px; margin-bottom:6px; text-align:left;">' +
                    '<div style="font-weight:600; font-size:13px; color:#1B2A4A;">📁 ' + idHtml + '</div>' +
                    '<div style="font-size:11px; color:#888;">Admin : ' + adminHtml + ' · Créé le ' + dateStr + '</div>' +
                    '</div>';
            }).join('');
    }

    // Referme le tableau de bord cabinet et prépare l'écran de connexion habituel sur le
    // dossier choisi — le mot de passe DE CE DOSSIER reste indispensable pour l'ouvrir : le
    // compte cabinet ne fait que faciliter la recherche, jamais l'accès au contenu.
    window.chooseCabinetDossier = function(dossierId){
        firebase.auth().signOut().catch(function(){});
        document.getElementById('cabinet-dashboard-overlay').style.display = 'none';
        switchLockMode('join');
        var el = document.getElementById('lock-collab-dossier');
        if(el){
            el.removeAttribute('readonly');
            el.style.background = '#fff';
            el.style.color = '#2c3e50';
            el.value = dossierId;
        }
        var toggle = document.getElementById('lock-manual-toggle');
        if(toggle) toggle.textContent = '↩️ Revenir à la sélection automatique';
        var passEl = document.getElementById('lock-dossier-password');
        if(passEl){ passEl.value = ''; passEl.focus(); }
    };

    window.collabChangePassword = function(){
        if(!isAdmin) return;
        var p1 = prompt("Nouveau mot de passe pour ce dossier (6 caractères minimum) :");
        if(p1 === null) return;
        if(p1.length < 6){ alert('Le mot de passe doit contenir au moins 6 caractères.'); return; }
        var p2 = prompt("Confirmez le nouveau mot de passe :");
        if(p1 !== p2){ alert('Les deux mots de passe ne correspondent pas.'); return; }
        var user = firebase.auth().currentUser;
        if(!user){ alert("Erreur : session non authentifiée."); return; }
        function doUpdate(){
            return user.updatePassword(p1).then(function(){
                alert('Mot de passe du dossier mis à jour. Pensez à le communiquer à vos collaborateurs actuels.');
            });
        }
        doUpdate().catch(function(e){
            if(e && e.code === 'auth/requires-recent-login'){
                var oldPass = prompt("Pour confirmer ce changement, ressaisissez l'ANCIEN mot de passe du dossier :");
                if(oldPass === null) return;
                var cred = firebase.auth.EmailAuthProvider.credential(user.email, oldPass);
                user.reauthenticateWithCredential(cred).then(doUpdate).catch(function(e2){
                    alert('Erreur : ' + (e2 && e2.message ? e2.message : e2));
                });
                return;
            }
            alert('Erreur : ' + (e && e.message ? e.message : e));
        });
    };

    function listenPermissions(){
        db.collection('seven7_dossiers').doc(dossierId).onSnapshot(function(doc){
            trackReads(1);
            if(!doc.exists) return;
            permData = doc.data() || { admin: null, access: {} };
            // Session pont : le rôle vient du document membre du cabinet (déjà lu à
            // l'ouverture), jamais d'un nom auto-déclaré comparé à permData.admin —
            // ce champ décrit le PROPRIÉTAIRE HISTORIQUE du dossier, une notion sans
            // rapport avec le rôle cabinet de la personne qui le consulte via le pont.
            isAdmin = pontActif ? (pontRole === 'ADMIN') : (permData.admin === myName);
            applyAccessControl();
        }, function(err){
            setStatus('❌ Erreur permissions : ' + err.message);
        });
    }

    function myAllowedTabs(){
        // Session pont : E3 (rôle) ne verrouille QUE la liasse pour un
        // collaborateur (pontOngletLiasseVerrouille) — le cycle d'audit reste
        // ouvert à tous les rôles. La restriction par PALIER, elle, s'applique
        // à TOUS les rôles, admin compris — d'où le filtre après le "return
        // tout" de isAdmin, pas avant.
        if(pontActif){
            return TABS.map(function(t){ return t.id; })
                .filter(function(id){ return !pontOngletReserveParPalier(id); });
        }
        if(isAdmin) return TABS.map(function(t){ return t.id; });
        var entry = permData.access && permData.access[mySafeKey];
        var allowed = (entry && entry.tabs) ? entry.tabs.slice() : [];
        ALWAYS_ALLOWED.forEach(function(t){ if(allowed.indexOf(t) === -1) allowed.push(t); });
        return allowed;
    }

    function applyAccessControl(){
        var allowed = myAllowedTabs();
        document.querySelectorAll('.tab-btn').forEach(function(btn){
            var m = (btn.getAttribute('onclick') || '').match(/showTab\('([^']+)'\)/);
            if(!m) return;
            var tabId = m[1];
            if(allowed.indexOf(tabId) === -1){
                btn.classList.add('tab-locked');
                btn.title = '🔒 Accès non autorisé — contactez l\'administrateur principal';
            } else {
                btn.classList.remove('tab-locked');
                btn.title = '';
            }
        });
        // Si l'onglet actif vient d'être verrouillé, revenir au sommaire
        var activeTab = document.querySelector('.tab-content.active');
        if(activeTab && allowed.indexOf(activeTab.id) === -1){
            originalShowTab('sommaire');
            alert('Votre accès à cet onglet a été retiré par l\'administrateur.');
        }
        // Session pont : ces boutons pilotent la gestion ANCIEN modèle (inviter par
        // nom, changer le mot de passe partagé du dossier) — sans rapport avec la
        // gestion d'équipe du cabinet (déjà accessible depuis « Gérer l'équipe »),
        // donc masqués plutôt que trompeurs. archive/export restent utiles à
        // l'admin cabinet, comme pour l'ancien modèle.
        document.getElementById('collab-admin-btn').style.display = (isAdmin && !pontActif) ? 'inline-block' : 'none';
        document.getElementById('collab-invite-btn').style.display = (isAdmin && !pontActif) ? 'inline-block' : 'none';
        document.getElementById('collab-password-btn').style.display = (isAdmin && !pontActif) ? 'inline-block' : 'none';
        document.getElementById('collab-archive-btn').style.display = isAdmin ? 'inline-block' : 'none';
        document.getElementById('collab-export-btn').style.display = isAdmin ? 'inline-block' : 'none';
        document.getElementById('collab-who').textContent = pontActif
            ? '🏢 ' + myName + (isAdmin ? ' (Administrateur cabinet)' : ' (Collaborateur cabinet)')
            : avatarFor(permData, myName, mySafeKey) + ' ' + myName + (isAdmin ? ' (Administrateur)' : '');
        if(isAdmin) renderAdminPanel();

        if(pontActif && typeof appliquerVerrouLiassePont === 'function') appliquerVerrouLiassePont();
        window.SEVEN7_ADMIN_NAME = permData.admin;
        window.SEVEN7_ACCESS = permData.access || {};
        window.SEVEN7_MY_KEY = mySafeKey;
        window.SEVEN7_MY_NAME = myName;
        window.SEVEN7_IS_ADMIN = isAdmin;
        if(typeof window.SEVEN7_MSG_REFRESH_CONTACTS === 'function') window.SEVEN7_MSG_REFRESH_CONTACTS();
        if(typeof refreshRedactionPageList === 'function') refreshRedactionPageList();
    }

    // ---------- Navigation protégée ----------
    window.showTab = function(id){
        var allowed = myAllowedTabs();
        if(allowed.indexOf(id) === -1){
            alert('🔒 Accès non autorisé à cet onglet.\nContactez l\'administrateur principal pour qu\'il vous y donne accès (bouton "⚙️ Gérer l\'équipe").');
            return;
        }
        originalShowTab(id);
        // Affiche la jauge de capacité à partir de la dernière taille connue (calculée lors du dernier
        // enregistrement réel), au lieu de recompresser tout l'onglet à chaque clic — ce recalcul
        // était la principale cause de lenteur perçue lors de la navigation entre onglets volumineux.
        updateGauge(id, lastKnownGaugeBytes[id] || 0);
        updatePresence(id);
        renderPresence();
    };

    // ---------- Présence collaborative en temps réel (qui regarde quel onglet) ----------
    // Objectif : éviter les écrasements silencieux quand plusieurs personnes travaillent
    // sur le même onglet en même temps, en affichant qui est présent où.
    var presenceTimer = null;
    var presenceUnsub = null;
    var presenceByTab = {}; // { tabId: [ {name, sessionId, ts}, ... ] }
    var PRESENCE_STALE_MS = 45000; // au-delà, on considère la présence obsolète (onglet fermé sans nettoyage)

    function updatePresence(tabId){
        if(!db || !dossierId || !myName) return;
        db.collection('seven7_dossiers').doc(dossierId).collection('presence').doc(sessionId).set({
            tabId: tabId,
            userName: myName,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        }).then(function(){ trackWrites(1); }).catch(function(){ /* la présence est secondaire : on ignore les erreurs réseau ponctuelles */ });
    }

    function startPresenceTracking(){
        var currentTab = document.querySelector('.tab-content.active');
        updatePresence(currentTab ? currentTab.id : 'sommaire');
        clearInterval(presenceTimer);
        presenceTimer = setInterval(function(){
            var t = document.querySelector('.tab-content.active');
            updatePresence(t ? t.id : 'sommaire');
        }, 20000);
        // Le coût réel grandit avec le nombre de sessions SIMULTANÉMENT connectées, pas
        // avec le nombre de dossiers stockés. Un onglet de navigateur laissé ouvert en
        // arrière-plan (collaborateur parti travailler ailleurs sans se déconnecter)
        // continuait pourtant à écrire un battement de présence toutes les 20s pour rien.
        // On met donc ce battement en pause tant que l'onglet n'est pas visible, et on le
        // relance immédiatement au retour — sans rien changer au ressenti temps réel pour
        // les collaborateurs réellement actifs.
        document.removeEventListener('visibilitychange', handlePresenceVisibilityChange);
        document.addEventListener('visibilitychange', handlePresenceVisibilityChange);
        if(presenceUnsub) presenceUnsub();
        presenceUnsub = db.collection('seven7_dossiers').doc(dossierId).collection('presence')
            .onSnapshot(function(snap){
                // Aligné sur la facturation réelle de Firestore pour un listener de
                // collection : seuls les documents changés sont comptés après le premier
                // instantané, pas la totalité de la collection à chaque mise à jour.
                trackReads(Math.max(1, snap.docChanges().length));
                var now = Date.now();
                var byTab = {};
                snap.forEach(function(doc){
                    if(doc.id === sessionId) return; // on ne s'affiche pas soi-même
                    var d = doc.data();
                    var ts = d.updatedAt && d.updatedAt.toMillis ? d.updatedAt.toMillis() : now; // écriture en attente : on la considère fraîche
                    if(now - ts > PRESENCE_STALE_MS) return; // présence obsolète (onglet fermé sans déconnexion propre)
                    if(!byTab[d.tabId]) byTab[d.tabId] = [];
                    byTab[d.tabId].push({ name: d.userName, sessionId: doc.id });
                });
                presenceByTab = byTab;
                renderPresence();
            }, function(){ /* lecture non critique : on ignore les erreurs ici */ });
    }
    function handlePresenceVisibilityChange(){
        if(!db || !dossierId) return;
        if(document.hidden){
            clearInterval(presenceTimer);
            presenceTimer = null;
        } else if(!presenceTimer){
            var t = document.querySelector('.tab-content.active');
            updatePresence(t ? t.id : 'sommaire'); // rafraîchit tout de suite au retour, sans attendre jusqu'à 20s
            presenceTimer = setInterval(function(){
                var tt = document.querySelector('.tab-content.active');
                updatePresence(tt ? tt.id : 'sommaire');
            }, 20000);
        }
    }

    function stopPresenceTracking(){
        clearInterval(presenceTimer);
        if(presenceUnsub){ presenceUnsub(); presenceUnsub = null; }
        if(db && dossierId){
            db.collection('seven7_dossiers').doc(dossierId).collection('presence').doc(sessionId).delete().catch(function(){});
        }
    }

    function renderPresence(){
        // 1. Petit badge sur chaque bouton d'onglet listant qui d'autre y travaille
        document.querySelectorAll('.tab-btn').forEach(function(btn){
            var m = (btn.getAttribute('onclick') || '').match(/showTab\('([^']+)'\)/);
            if(!m) return;
            var tabId = m[1];
            var existing = btn.querySelector('.presence-badge');
            if(existing) existing.remove();
            var occupants = presenceByTab[tabId];
            if(occupants && occupants.length){
                var span = document.createElement('span');
                span.className = 'presence-badge';
                span.title = occupants.map(function(o){ return o.name; }).join(', ') + ' — actuellement sur cet onglet';
                span.textContent = '🟢' + (occupants.length > 1 ? occupants.length : '');
                btn.appendChild(span);
            }
        });
        // 2. Bandeau d'alerte visible en haut de l'onglet actif si quelqu'un d'autre y est aussi
        var activeTab = document.querySelector('.tab-content.active');
        var oldAlert = document.getElementById('presence-alert-current-tab');
        if(oldAlert) oldAlert.remove();
        if(activeTab){
            var occupants = presenceByTab[activeTab.id];
            if(occupants && occupants.length){
                var card = activeTab.querySelector('.card');
                if(card){
                    var div = document.createElement('div');
                    div.id = 'presence-alert-current-tab';
                    div.className = 'alert alert-warning';
                    div.style.marginBottom = '12px';
                    var names = occupants.map(function(o){ return o.name; }).join(', ');
                    div.innerHTML = '🟢 <strong>' + esc(names) + '</strong> ' + (occupants.length > 1 ? 'travaillent' : 'travaille') + ' actuellement sur ce même onglet. Coordonnez-vous pour éviter que l\'un de vous n\'écrase la saisie de l\'autre (la dernière sauvegarde enregistrée l\'emporte).';
                    card.insertBefore(div, card.firstChild.nextSibling);
                }
            }
        }
    }

    // ---------- Historique des travaux ----------
    window.openHistoryPanel = function(){
        document.getElementById('history-modal').style.display = 'block';
        var list = document.getElementById('history-list');
        list.innerHTML = '<p style="color:#888;">Chargement…</p>';
        if(!db || !dossierId) return;
        db.collection('seven7_dossiers').doc(dossierId).collection('historique')
            .orderBy('timestamp', 'desc').limit(100).get().then(function(snapshot){
                trackReads(Math.max(1, snapshot.size));
                if(snapshot.empty){
                    list.innerHTML = '<p style="color:#888;">Aucun historique pour l\'instant.</p>';
                    return;
                }
                var html = '';
                snapshot.forEach(function(doc){
                    var d = doc.data();
                    var when = d.timestamp && d.timestamp.toDate ? d.timestamp.toDate().toLocaleString('fr-FR') : '—';
                    html += '<div style="border-bottom:1px dashed #ddd; padding:7px 0;">🕒 <strong>'+when+'</strong> — '
                        + esc(d.tabLabel || d.tabId) + ' modifié par <strong>' + esc(d.userName || '?') + '</strong></div>';
                });
                list.innerHTML = html;
            }).catch(function(err){
                list.innerHTML = '<p style="color:#c0392b;">Erreur de chargement : ' + esc(err.message) + '</p>';
            });
    };
    window.closeHistoryPanel = function(){
        document.getElementById('history-modal').style.display = 'none';
    };

    // ---------- Archivage des exercices ----------
    window.openArchiveCreatePrompt = function(){
        if(!isAdmin || !db || !dossierId) return;
        var label = prompt("Nom de l'exercice à archiver (ex: Exercice 2025, Clôture 31/12/2025) :");
        if(!label || !label.trim()) return;
        label = label.trim();
        if(!confirm('Archiver l\'état actuel de TOUS les onglets sous le nom "' + label + '" ?\n\nCeci crée une photo figée, consultable plus tard. Le travail en cours n\'est pas modifié.')) return;

        var archiveId = slugify(label) + '-' + Date.now();
        setStatus('📦 Archivage en cours…');
        var archiveRef = db.collection('seven7_dossiers').doc(dossierId).collection('archives').doc(archiveId);
        var archiveTabsCol = archiveRef.collection('tabs');
        archiveRef.set({
            label: label,
            archivedBy: myName,
            archivedAt: firebase.firestore.FieldValue.serverTimestamp()
        }).then(function(){
            var writes = TABS.map(function(t){
                var div = document.getElementById(t.id);
                if(!div) return Promise.resolve();
                var htmlClone = div.innerHTML;
                return compressAsync(htmlClone).then(function(payload){
                    return writeTabPayload(archiveTabsCol, t.id, payload, {});
                });
            });
            return Promise.all(writes);
        }).then(function(){
            trackWrites(1); // document d'archive lui-même (les onglets sont déjà comptés par writeTabPayload)
            setStatus('🟢 Exercice archivé : ' + label);
            alert('Exercice archivé avec succès : "' + label + '". Consultez-le à tout moment via "🗄️ Exercices archivés".');
        }).catch(function(e){
            setStatus('❌ Erreur d\'archivage : ' + e.message);
            alert('Erreur lors de l\'archivage : ' + e.message);
        });
    };

    window.openArchivesPanel = function(){
        document.getElementById('archives-modal').style.display = 'block';
        var list = document.getElementById('archives-list');
        list.innerHTML = '<p style="color:#888;">Chargement…</p>';
        if(!db || !dossierId) return;
        db.collection('seven7_dossiers').doc(dossierId).collection('archives')
            .orderBy('archivedAt', 'desc').get().then(function(snapshot){
                trackReads(Math.max(1, snapshot.size));
                if(snapshot.empty){
                    list.innerHTML = '<p style="color:#888;">Aucun exercice archivé pour l\'instant.</p>';
                    return;
                }
                var html = '';
                snapshot.forEach(function(doc){
                    var d = doc.data();
                    var when = d.archivedAt && d.archivedAt.toDate ? d.archivedAt.toDate().toLocaleString('fr-FR') : '—';
                    html += '<div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px dashed #ddd; padding:10px 0;">'
                        + '<div><strong>' + esc(d.label) + '</strong><br><span style="font-size:11px; color:#888;">Archivé par ' + esc(d.archivedBy||'?') + ' — ' + when + '</span></div>'
                        + '<div style="display:flex; gap:6px;">'
                        + '<button class="btn btn-primary" style="margin:0;" onclick="openArchiveViewer(\'' + doc.id + '\', \'' + esc(d.label).replace(/'/g,"\\'") + '\')">👁️ Consulter</button>'
                        + (isAdmin ? '<button class="btn btn-danger" style="margin:0;" onclick="deleteArchive(\'' + doc.id + '\', \'' + esc(d.label).replace(/'/g,"\\'") + '\')">🗑️</button>' : '')
                        + '</div></div>';
                });
                list.innerHTML = html;
            }).catch(function(err){
                list.innerHTML = '<p style="color:#c0392b;">Erreur de chargement : ' + esc(err.message) + '</p>';
            });
    };
    window.closeArchivesPanel = function(){
        document.getElementById('archives-modal').style.display = 'none';
    };
    window.deleteArchive = function(archiveId, label){
        if(!isAdmin) return;
        if(!confirm('Supprimer définitivement l\'exercice archivé "' + label + '" ? Cette action est irréversible.')) return;
        var archiveRef = db.collection('seven7_dossiers').doc(dossierId).collection('archives').doc(archiveId);
        archiveRef.collection('tabs').get().then(function(snapshot){
            trackReads(Math.max(1, snapshot.size));
            var deletes = [];
            // Les morceaux (chunks) d'un onglet volumineux sont des documents FRÈRES dans cette même
            // collection "tabs" (voir chunkDocId) : ils apparaissent donc déjà dans ce snapshot et
            // sont supprimés ici comme n'importe quel autre document, sans passer par une sous-collection.
            snapshot.forEach(function(doc){
                deletes.push(doc.ref.delete());
            });
            return Promise.all(deletes);
        }).then(function(){
            trackWrites(1); // suppressions comptées globalement comme des écritures pour simplifier l'estimation
            return archiveRef.delete();
        }).then(function(){
            openArchivesPanel();
        }).catch(function(e){ alert('Erreur : ' + e.message); });
    };

    var currentArchiveId = null;
    window.openArchiveViewer = function(archiveId, label){
        currentArchiveId = archiveId;
        document.getElementById('archive-viewer-label').textContent = label;
        var sel = document.getElementById('archive-viewer-tab-select');
        sel.innerHTML = TABS.map(function(t){ return '<option value="'+t.id+'">'+esc(t.label)+'</option>'; }).join('');
        document.getElementById('archive-viewer-modal').style.display = 'flex';
        loadArchivedTab();
    };
    window.closeArchiveViewer = function(){
        document.getElementById('archive-viewer-modal').style.display = 'none';
        currentArchiveId = null;
    };
    window.loadArchivedTab = function(){
        if(!currentArchiveId) return;
        var tabId = document.getElementById('archive-viewer-tab-select').value;
        var content = document.getElementById('archive-viewer-content');
        content.innerHTML = '<p style="color:#888;">Chargement…</p>';
        var archiveTabsCol = db.collection('seven7_dossiers').doc(dossierId).collection('archives').doc(currentArchiveId)
            .collection('tabs');
        archiveTabsCol.doc(tabId).get().then(function(doc){
                trackReads(1);
                if(!doc.exists){
                    content.innerHTML = '<p style="color:#888;">Aucune donnée archivée pour cet onglet (il n\'existait peut-être pas encore à cette date).</p>';
                    return;
                }
                var data = doc.data();
                return loadTabPayload(archiveTabsCol, tabId, data).then(function(html){
                return data.compressed ? decompressAsync(html) : html;
            }).then(function(html){
                var wrapper = document.createElement('div');
                wrapper.innerHTML = html;
                wrapper.querySelectorAll('input, select, textarea').forEach(function(el){ el.setAttribute('disabled','disabled'); });
                wrapper.querySelectorAll('button').forEach(function(el){ el.style.display = 'none'; });
                wrapper.style.background = '#fff';
                wrapper.style.padding = '16px';
                wrapper.style.borderRadius = '6px';
                content.innerHTML = '';
                content.appendChild(wrapper);
            });
        }).catch(function(err){
            content.innerHTML = '<p style="color:#c0392b;">Erreur : ' + esc(err.message) + '</p>';
        });
    };

    // ---------- Panneau d'administration ----------
    window.openAdminPanel = function(){
        if(!isAdmin) return;
        renderAdminPanel();
        var cabinetInput = document.getElementById('admin-cabinet-name');
        if(cabinetInput) cabinetInput.value = (permData && permData.cabinetName) || '';
        var statusEl = document.getElementById('admin-cabinet-name-status');
        if(statusEl) statusEl.textContent = '';
        document.getElementById('admin-modal').style.display = 'block';
    };
    window.closeAdminPanel = function(){
        document.getElementById('admin-modal').style.display = 'none';
    };
    window.adminSaveCabinetName = function(){
        if(!isAdmin || !db || !dossierId) return;
        var input = document.getElementById('admin-cabinet-name');
        var statusEl = document.getElementById('admin-cabinet-name-status');
        var nom = input.value.trim();
        if(!nom){
            if(statusEl){ statusEl.textContent = '⚠️ Le nom du cabinet ne peut pas être vide.'; statusEl.style.color = '#c0392b'; }
            return;
        }
        if(statusEl){ statusEl.textContent = '💾 Enregistrement…'; statusEl.style.color = '#888'; }
        db.collection('seven7_dossiers').doc(dossierId).update({ cabinetName: nom }).then(function(){
            trackWrites(1);
            return db.collection('seven7_dossiers_public').doc(dossierId).set({ cabinetName: nom }, { merge: true });
        }).then(function(){
            permData.cabinetName = nom;
            localStorage.setItem('seven7_cabinet_name', nom);
            if(statusEl){ statusEl.textContent = '✅ Nom du cabinet mis à jour.'; statusEl.style.color = '#27ae60'; }
        }).catch(function(e){
            if(statusEl){ statusEl.textContent = '❌ Erreur : ' + e.message; statusEl.style.color = '#c0392b'; }
        });
    };
    window.adminAddCollaborator = function(){
        var input = document.getElementById('admin-new-collab');
        var nom = input.value.trim();
        if(!nom) return;
        var key = safeKey(nom);
        var upd = {};
        upd['access.' + key] = { displayName: nom, tabs: [] };
        db.collection('seven7_dossiers').doc(dossierId).update(upd).then(function(){
            input.value = '';
        }).catch(function(e){ alert('Erreur : ' + e.message); });
    };
    window.adminToggleTab = function(key, tabId, checked){
        var entry = (permData.access && permData.access[key]) || { tabs: [] };
        var tabs = entry.tabs ? entry.tabs.slice() : [];
        var idx = tabs.indexOf(tabId);
        if(checked && idx === -1) tabs.push(tabId);
        if(!checked && idx !== -1) tabs.splice(idx, 1);
        var upd = {};
        upd['access.' + key + '.tabs'] = tabs;
        db.collection('seven7_dossiers').doc(dossierId).update(upd).catch(function(e){ alert('Erreur : ' + e.message); });
    };
    window.adminSetAllPhase = function(key, phase, checked){
        var entry = (permData.access && permData.access[key]) || { tabs: [] };
        var tabs = entry.tabs ? entry.tabs.slice() : [];
        TABS.filter(function(t){ return t.phase === phase; }).forEach(function(t){
            var idx = tabs.indexOf(t.id);
            if(checked && idx === -1) tabs.push(t.id);
            if(!checked && idx !== -1) tabs.splice(idx, 1);
        });
        var upd = {};
        upd['access.' + key + '.tabs'] = tabs;
        db.collection('seven7_dossiers').doc(dossierId).update(upd).catch(function(e){ alert('Erreur : ' + e.message); });
    };

    function renderAdminPanel(){
        var list = document.getElementById('admin-collab-list');
        if(!list) return;
        var access = permData.access || {};
        var keys = Object.keys(access);
        if(keys.length === 0){
            list.innerHTML = '<p style="color:#888; font-size:12px;">Aucun collaborateur pour l\'instant. Ajoutez-en un ci-dessus, ou attendez qu\'il se connecte avec le mot de passe.</p>';
            return;
        }
        var html = '';
        keys.forEach(function(key){
            var entry = access[key];
            var tabs = entry.tabs || [];
            var name = entry.displayName || key;
            var avatar = entry.avatar || DEFAULT_AVATAR;
            html += '<div class="admin-collab-card"><h4>' + avatar + ' ' + esc(name) + '</h4>';
            [1,2,3].forEach(function(phase){
                var phaseTabs = TABS.filter(function(t){ return t.phase === phase; });
                var allChecked = phaseTabs.every(function(t){ return tabs.indexOf(t.id) !== -1; });
                html += '<div class="admin-phase-group"><div class="phase-title">Phase ' + phase + ' '
                     + '<label class="admin-tab-checkbox"><input type="checkbox" ' + (allChecked ? 'checked' : '') + ' onchange="adminSetAllPhase(\'' + key + '\',' + phase + ',this.checked)"> Tout cocher</label></div>';
                phaseTabs.forEach(function(t){
                    if(ALWAYS_ALLOWED.indexOf(t.id) !== -1) return;
                    var checked = tabs.indexOf(t.id) !== -1;
                    html += '<label class="admin-tab-checkbox"><input type="checkbox" ' + (checked ? 'checked' : '') + ' onchange="adminToggleTab(\'' + key + '\',\'' + t.id + '\',this.checked)"> ' + t.label + '</label>';
                });
                html += '</div>';
            });
            html += '</div>';
        });
        list.innerHTML = html;
    }

    // ---------- Synchronisation PAR ONGLET ----------
    function freezeDynamicValues(container){
        // Un seul parcours du DOM au lieu de trois (input / select / textarea séparément) :
        // réduit sensiblement le temps de "gel" avant sauvegarde sur les gros onglets
        // (Grand Livre / Balance N avec plusieurs centaines ou milliers de lignes).
        var els = container.querySelectorAll('input, select, textarea');
        for(var i=0; i<els.length; i++){
            var el = els[i];
            var tag = el.tagName;
            if(tag === 'SELECT'){
                var opts = el.options;
                for(var j=0; j<opts.length; j++){
                    if(opts[j].selected) opts[j].setAttribute('selected', 'selected'); else opts[j].removeAttribute('selected');
                }
            } else if(tag === 'TEXTAREA'){
                el.textContent = el.value;
            } else if(el.type === 'checkbox' || el.type === 'radio'){
                if(el.checked) el.setAttribute('checked', 'checked'); else el.removeAttribute('checked');
            } else {
                el.setAttribute('value', el.value);
            }
        }
    }

    // Chaque document Firestore est plafonné à ~1 Mo. On découpe donc automatiquement les onglets
    // volumineux en plusieurs morceaux (sous-collection "chunks") au lieu de les bloquer à ~950 Ko
    // comme auparavant. CHUNK_CHAR_SIZE reste sous la limite par document (marge de sécurité incluse) ;
    // MAX_CHUNKS est un plafond de bon sens (au-delà, il faut vraiment alléger l'onglet).
    var CHUNK_CHAR_SIZE = 400000; // ≈ 800 Ko en UTF-16 par morceau
    var MAX_CHUNKS = 40;          // ≈ 32 Mo compressés au total par onglet
    var CAPACITE_MAX_OCTETS = CHUNK_CHAR_SIZE * 2 * MAX_CHUNKS;
    function updateGauge(tabId, bytes){
        var el = document.getElementById('collab-gauge');
        if(!el) return;
        var pct = Math.min(100, Math.round((bytes / CAPACITE_MAX_OCTETS) * 100));
        var couleur = pct >= 85 ? '#e74c3c' : (pct >= 60 ? '#f39c12' : '#2ecc71');
        var tabInfo = TABS.filter(function(t){ return t.id === tabId; })[0];
        var label = tabInfo ? tabInfo.label.replace(/^[^\s]+\s/, '') : tabId;
        el.innerHTML = '📦 ' + label + ' : <span style="color:'+couleur+'; font-weight:700;">'+pct+'%</span> ('+Math.round(bytes/1024)+' Ko / '+Math.round(CAPACITE_MAX_OCTETS/1024)+' Ko)';
    }
    function estimateTabSize(tabId){
        var div = document.getElementById(tabId);
        if(!div) return 0;
        var html = div.innerHTML;
        var payload = (typeof LZString !== 'undefined') ? LZString.compressToUTF16(html) : html;
        return payload.length * 2;
    }

    var lastKnownGaugeBytes = {}; // cache : évite de recompresser tout l'onglet à chaque changement d'onglet (coûteux sur les gros onglets)

    // ---------- 📊 Estimation d'utilisation Firestore (quota gratuit Spark) ----------
    // Firebase ne permet pas d'interroger les quotas officiels depuis une appli cliente
    // (ça nécessite un accès administrateur côté serveur). On comptabilise donc ici,
    // de façon honnête et approximative, les lectures/écritures Firestore réellement
    // effectuées par l'appli, entre tous les collaborateurs.
    //
    // ⚠️ CORRECTIF POINT CHAUD (multi-cabinets) : auparavant, TOUTES les sessions de TOUS
    // les cabinets incrémentaient un seul et même document 'seven7_usage_stats/{jour}'.
    // Avec des dizaines de sessions actives en parallèle (10 cabinets et +), ce document
    // unique devient un goulot d'étranglement en écriture (Firestore recommande fortement
    // d'éviter les compteurs à haute fréquence sur un document unique). On répartit donc
    // désormais le compteur sur une sous-collection, UN document par cabinet :
    //   seven7_usage_stats/{jour}/cabinets/{cabinetId}
    // Chaque cabinet n'écrit plus que sur SON propre document : la contention disparaît,
    // même avec de nombreux cabinets actifs simultanément. Le panneau "Utilisation" fait
    // ensuite la somme de tous les documents du jour pour afficher un total global.
    // ⚙️ PLAN FIREBASE ACTUEL — à changer manuellement le jour où vous passez sur Blaze
    // (Firebase Console → Firestore → en bas de page / Utilisation → "Modifier le plan").
    // Ce n'est pas détectable automatiquement depuis le code client (il n'existe pas d'API
    // publique pour ça), d'où ce simple interrupteur à actionner vous-même.
    //   'spark' : les plafonds ci-dessous sont de VRAIS plafonds durs — au-delà, Firestore
    //             peut refuser des lectures/écritures jusqu'au lendemain (minuit UTC).
    //             Le panneau affiche donc un avertissement de blocage.
    //   'blaze' : les mêmes seuils quotidiens restent inclus gratuitement chaque jour, mais
    //             au-delà ce n'est plus bloquant, juste facturé au-delà (quelques centimes).
    //             Le panneau affiche alors un coût estimé au lieu d'un avertissement.
    var FIREBASE_PLAN = 'spark'; // 'spark' ou 'blaze'
    var USAGE_LIMITS = { reads: 50000, writes: 20000 }; // forfait gratuit quotidien, identique sur Spark et Blaze
    var BLAZE_PRICING = { costPer100kReads: 0.06, costPer100kWrites: 0.18 }; // $ US, au-delà du forfait gratuit
    var pendingReadsDelta = 0, pendingWritesDelta = 0, usageFlushTimer = null, usageUnsub = null;
    function pad2(n){ return n < 10 ? '0'+n : ''+n; }
    function todayUsageKey(){
        var d = new Date();
        return d.getUTCFullYear() + '-' + pad2(d.getUTCMonth()+1) + '-' + pad2(d.getUTCDate());
    }
    // Clé de répartition du compteur : un document par cabinet (permData.cabinetId).
    // Pour un dossier antérieur à l'introduction du champ cabinetId (donc sans cabinetId
    // connu), on retombe sur un identifiant par dossier — ça reste réparti, jamais un
    // document unique partagé par toute l'installation.
    function usageShardKey(){
        var raw = (permData && permData.cabinetId) ? permData.cabinetId : ('dossier_' + (dossierId || 'inconnu'));
        return safeKey(String(raw)) || 'inconnu';
    }
    function usageShardCol(){
        return db.collection('seven7_usage_stats').doc(todayUsageKey()).collection('cabinets');
    }
    function trackReads(n){ if(!n) return; pendingReadsDelta += n; scheduleUsageFlush(); }
    function trackWrites(n){ if(!n) return; pendingWritesDelta += n; scheduleUsageFlush(); }
    // Exposées pour que le module de messagerie (IIFE séparée, plus bas dans le fichier)
    // alimente le MÊME compteur d'usage au lieu d'être invisible dans l'estimation.
    window.SEVEN7_TRACK_READS = trackReads;
    window.SEVEN7_TRACK_WRITES = trackWrites;
    function scheduleUsageFlush(){
        if(usageFlushTimer) return;
        usageFlushTimer = setTimeout(flushUsage, 15000);
    }
    function flushUsage(){
        usageFlushTimer = null;
        if(!db){ return; }
        var r = pendingReadsDelta, w = pendingWritesDelta;
        if(r === 0 && w === 0) return;
        pendingReadsDelta = 0; pendingWritesDelta = 0;
        // Cette écriture de comptage n'est volontairement pas comptabilisée elle-même,
        // pour ne pas fausser le compteur en boucle.
        usageShardCol().doc(usageShardKey()).set({
            reads: firebase.firestore.FieldValue.increment(r),
            writes: firebase.firestore.FieldValue.increment(w),
            cabinetId: (permData && permData.cabinetId) || null,
            cabinetName: (permData && permData.cabinetName) || null,
            lastUpdate: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true }).catch(function(){
            // Échec réseau ponctuel : on remet les deltas en attente pour ne pas perdre le comptage
            pendingReadsDelta += r; pendingWritesDelta += w;
        });
    }
    function renderUsagePanel(data){
        var reads = (data && data.reads) || 0;
        var writes = (data && data.writes) || 0;
        var pctReads = Math.min(100, (reads / USAGE_LIMITS.reads) * 100);
        var pctWrites = Math.min(100, (writes / USAGE_LIMITS.writes) * 100);
        var isSpark = FIREBASE_PLAN !== 'blaze';
        // Sur Spark, dépasser le forfait est un vrai risque de blocage → rouge dès que ça
        // grimpe. Sur Blaze, dépasser le forfait gratuit n'est plus bloquant, juste payant
        // → on utilise une couleur neutre (bleu) plutôt qu'une couleur d'alerte.
        function colorFor(p){
            if(isSpark) return p > 80 ? '#e74c3c' : (p > 50 ? '#f39c12' : '#27ae60');
            return p >= 100 ? '#2980b9' : (p > 50 ? '#f39c12' : '#27ae60');
        }
        var el = document.getElementById('usage-panel-content');
        if(!el) return;
        var intro, warning = '', costLine = '';
        if(isSpark){
            intro = 'Estimation interne des lectures/écritures Firestore effectuées aujourd\'hui par SEVEN7 (tous collaborateurs confondus), comparée au forfait gratuit du plan <strong>Spark</strong>. C\'est une <strong>approximation</strong> calculée par l\'appli elle-même — pas un chiffre de facturation officiel.';
            if(pctReads >= 100 || pctWrites >= 100){
                warning = '<p style="font-size:12px; background:#fdecea; color:#c0392b; border:1px solid #f5c6cb; border-radius:6px; padding:8px 10px; margin:0 0 10px;">⚠️ Le forfait gratuit quotidien est atteint. Sur le plan Spark, Firestore peut désormais refuser certaines lectures/écritures jusqu\'à demain (minuit UTC). Passez au plan <strong>Blaze</strong> (pay-as-you-go, quelques centimes) pour lever cette limite sans changer votre code.</p>';
            }
        } else {
            intro = 'Estimation interne des lectures/écritures Firestore effectuées aujourd\'hui par SEVEN7 (tous collaborateurs confondus). Vous êtes sur le plan <strong>Blaze</strong> : le forfait gratuit quotidien ci-dessous reste inclus chaque jour, et le dépasser n\'est plus bloquant — juste facturé au-delà, comme estimé plus bas. C\'est une <strong>approximation</strong> calculée par l\'appli elle-même — pas un chiffre de facturation officiel (elle ne compte ni le stockage, ni la bande passante, ni les suppressions).';
            var extraReads = Math.max(0, reads - USAGE_LIMITS.reads);
            var extraWrites = Math.max(0, writes - USAGE_LIMITS.writes);
            var estCost = (extraReads / 100000) * BLAZE_PRICING.costPer100kReads + (extraWrites / 100000) * BLAZE_PRICING.costPer100kWrites;
            if(estCost > 0){
                costLine = '<p style="font-size:12px; background:#eaf2fb; color:#1a5276; border:1px solid #cfe0f0; border-radius:6px; padding:8px 10px; margin:0 0 10px;">💰 Coût Firestore estimé aujourd\'hui, au-delà du forfait gratuit : environ <strong>$' + estCost.toFixed(3) + '</strong>.</p>';
            }
        }
        el.innerHTML =
            '<p style="font-size:12px; color:#666; margin:0 0 10px;">' + intro + '</p>' +
            warning + costLine +
            '<div style="margin-bottom:12px;"><div style="display:flex; justify-content:space-between; font-size:12px; margin-bottom:3px;"><span>📖 Lectures</span><span>'+reads.toLocaleString('fr-FR')+' / '+USAGE_LIMITS.reads.toLocaleString('fr-FR')+'</span></div>' +
            '<div style="background:#eee; border-radius:6px; height:10px; overflow:hidden;"><div style="width:'+pctReads.toFixed(1)+'%; background:'+colorFor(pctReads)+'; height:100%;"></div></div></div>' +
            '<div><div style="display:flex; justify-content:space-between; font-size:12px; margin-bottom:3px;"><span>✏️ Écritures</span><span>'+writes.toLocaleString('fr-FR')+' / '+USAGE_LIMITS.writes.toLocaleString('fr-FR')+'</span></div>' +
            '<div style="background:#eee; border-radius:6px; height:10px; overflow:hidden;"><div style="width:'+pctWrites.toFixed(1)+'%; background:'+colorFor(pctWrites)+'; height:100%;"></div></div></div>';
    }
    window.openUsagePanel = function(){
        document.getElementById('usage-panel-overlay').style.display = 'flex';
        if(usageUnsub) usageUnsub();
        if(db){
            // Le compteur n'est plus un document unique : on écoute toute la sous-collection
            // du jour (un document par cabinet actif) et on additionne côté client.
            usageUnsub = usageShardCol().onSnapshot(function(snap){
                var total = { reads: 0, writes: 0 };
                snap.forEach(function(doc){
                    var d = doc.data() || {};
                    total.reads += d.reads || 0;
                    total.writes += d.writes || 0;
                });
                renderUsagePanel(total);
            }, function(){ renderUsagePanel(null); });
        }
    };
    window.closeUsagePanel = function(){
        document.getElementById('usage-panel-overlay').style.display = 'none';
        if(usageUnsub){ usageUnsub(); usageUnsub = null; }
    };

    function doSaveTab(tabId){
        return new Promise(function(resolve){
            var div = document.getElementById(tabId);
            if(!div){ resolve(); return; }
            freezeDynamicValues(div);
            var html = div.innerHTML;
            setStatus('💾 Enregistrement…');
            // Compression déportée dans un Web Worker : sur un gros onglet (Grand Livre,
            // Balance), ce calcul ne gèle plus jamais le thread principal / l'écran.
            compressAsync(html).then(function(payload){
                var approxBytes = payload.length * 2; // UTF-16 : 2 octets par caractère
                lastKnownGaugeBytes[tabId] = approxBytes;
                updateGauge(tabId, approxBytes);
                var liveTabsCol = db.collection('seven7_dossiers').doc(dossierId).collection('tabs');
                return writeTabPayload(liveTabsCol, tabId, payload, {
                    lastEditedBy: myName,
                    lastEditedAt: firebase.firestore.FieldValue.serverTimestamp(),
                    lastSession: sessionId
                });
            }).then(function(){
                setStatus('🟢 Enregistré');
                var tabInfo = TABS.filter(function(t){ return t.id === tabId; })[0];
                db.collection('seven7_dossiers').doc(dossierId).collection('historique').add({
                    tabId: tabId,
                    tabLabel: tabInfo ? tabInfo.label : tabId,
                    userName: myName,
                    timestamp: firebase.firestore.FieldValue.serverTimestamp()
                }).then(function(){ trackWrites(1); }).catch(function(){ /* l'historique est secondaire, on ignore les erreurs ici */ });
                resolve();
            }).catch(function(e){
                setStatus('❌ Erreur de sauvegarde : ' + e.message);
                resolve(); // on ne bloque jamais la déconnexion sur une erreur réseau ponctuelle
            });
        });
    }
    function scheduleSave(tabId, immediate){
        if(TAB_SYNC_EXCLUDED.indexOf(tabId) !== -1) return;
        if(applyingRemote[tabId] || !db || !dossierId) return;
        // E3, masquage d'interface (§12 : la vraie barrière est déjà dans
        // firestore.rules — accesPontEcriture refuserait ce même appel côté
        // serveur). Évite juste un aller-retour réseau inutile qui échouerait de
        // toute façon, et un message d'erreur brut plutôt qu'un statut clair.
        if(pontOngletReserveParPalier(tabId)){
            setStatus('🔒 Onglet réservé — palier insuffisant pour ce cabinet');
            return;
        }
        if(pontOngletLiasseVerrouille(tabId)){
            setStatus('🔒 Lecture seule — la liasse est réservée à l\'administrateur du cabinet');
            return;
        }
        clearTimeout(saveTimers[tabId]);
        saveTimers[tabId] = setTimeout(function(){
            // On profite d'un moment d'inactivité du thread principal pour faire le travail
            // coûteux (compression), afin de ne pas bloquer la frappe ou la navigation.
            if(typeof requestIdleCallback === 'function' && !immediate){
                requestIdleCallback(function(){ doSaveTab(tabId); }, { timeout: 2000 });
            } else {
                doSaveTab(tabId);
            }
        }, immediate ? 0 : 1200);
    }

    // ---------- 5. Changer de dossier / Déconnexion (avec sauvegarde préalable) ----------
    window.logoutDossier = function(){
        if(!dossierId || !db){
            // Aucune session collaborative active : retour direct à l'écran de sélection
            document.getElementById('lock-screen').style.display = 'flex';
            document.getElementById('collab-bar').style.display = 'none';
            return;
        }
        if(!confirm('Sauvegarder le travail en cours et revenir à l\'écran de sélection de dossier ?\n\nVous pourrez rouvrir ce dossier plus tard exactement où vous vous êtes arrêté(e).')) return;
        setStatus('💾 Sauvegarde en cours avant déconnexion…');
        // Flush immédiat : annule les sauvegardes différées et enregistre tous les onglets maintenant
        var promises = TABS.filter(function(t){ return TAB_SYNC_EXCLUDED.indexOf(t.id) === -1; }).map(function(t){
            clearTimeout(saveTimers[t.id]);
            if(applyingRemote[t.id]) return Promise.resolve();
            return doSaveTab(t.id);
        });
        Promise.all(promises).then(function(){
            stopPresenceTracking();
            clearTimeout(usageFlushTimer);
            flushUsage();
            // Nettoie l'URL (retire ?dossier=...) pour ne pas rejoindre automatiquement le même dossier
            var cleanUrl = window.location.origin + window.location.pathname;
            window.history.replaceState({}, '', cleanUrl);
            // Recharge l'application dans un état propre : l'utilisateur retrouve l'écran de sélection de dossier.
            // Le dossier quitté reste intégralement sauvegardé côté Firestore et pourra être rouvert plus tard.
            window.location.reload();
        });
    };

    // Les règles Firestore de l'app couvrent uniquement /seven7_dossiers/{dossier}/tabs/{tabId}
    // (un document, avec {tabId} en joker) — elles ne couvrent PAS une sous-collection
    // /tabs/{tabId}/chunks/{n}, qui n'a jamais de règle propre et serait donc refusée par
    // défaut. Comme il est explicitement demandé de ne pas toucher aux règles, chaque
    // "morceau" d'un onglet volumineux est stocké comme un document FRÈRE dans la même
    // collection "tabs" (id : tabId + "__chunk_" + n), qui est donc couvert par la même
    // règle générique que le document maître de l'onglet.
    function chunkDocId(tabId, n){ return tabId + '__chunk_' + n; }

    function loadTabPayload(tabsCollectionRef, tabId, data){
        if(!data.chunked) return Promise.resolve(data.html);
        // Onglet découpé en plusieurs morceaux : on les récupère (documents frères, IDs connus
        // via chunkCount) et on les réassemble dans l'ordre.
        var chunkCount = data.chunkCount || 0;
        var gets = [];
        for(var i=0;i<chunkCount;i++){ gets.push(tabsCollectionRef.doc(chunkDocId(tabId, i)).get()); }
        return Promise.all(gets).then(function(docs){
            trackReads(Math.max(1, docs.length));
            var parts = docs.map(function(d){ return (d.exists && d.data().part) || ''; });
            return parts.join('');
        });
    }
    // Écrit le contenu (compressé) d'un onglet dans une collection "tabs" donnée (dossier courant ou
    // archive d'exercice), en le découpant automatiquement en plusieurs documents FRÈRES (pas une
    // sous-collection — voir chunkDocId ci-dessus) si nécessaire.
    // extraFields : champs additionnels à fusionner dans le document "maître" de l'onglet (ex: lastEditedBy).
    function writeTabPayload(tabsCollectionRef, tabId, payload, extraFields){
        var tabRef = tabsCollectionRef.doc(tabId);
        var nbChunks = Math.max(1, Math.ceil(payload.length / CHUNK_CHAR_SIZE));
        var base = Object.assign({ compressed: !!(typeof LZString !== 'undefined') }, extraFields || {});
        if(nbChunks > MAX_CHUNKS){
            return Promise.reject(new Error('Onglet trop volumineux (' + Math.round(payload.length*2/1024) + ' Ko compressés, max ~' + Math.round(CAPACITE_MAX_OCTETS/1024) + ' Ko).'));
        }
        // On relit d'abord le document maître pour savoir combien de "morceaux" existaient
        // auparavant (au cas où l'onglet aurait rétréci), afin de supprimer les morceaux devenus
        // orphelins — sinon ils resteraient pour toujours dans Firestore.
        return tabRef.get().then(function(oldDoc){
            var oldData = oldDoc.exists ? oldDoc.data() : {};
            var oldChunkCount = (oldData.chunked && oldData.chunkCount) ? oldData.chunkCount : 0;
            trackReads(1);
            if(nbChunks === 1){
                var batchSingle = db.batch();
                batchSingle.set(tabRef, Object.assign({ html: payload, chunked: false }, base));
                for(var k=0;k<oldChunkCount;k++){ batchSingle.delete(tabsCollectionRef.doc(chunkDocId(tabId, k))); }
                return batchSingle.commit().then(function(){ trackWrites(1 + oldChunkCount); });
            }
            var batch = db.batch();
            for(var i=0;i<nbChunks;i++){
                var part = payload.substr(i*CHUNK_CHAR_SIZE, CHUNK_CHAR_SIZE);
                batch.set(tabsCollectionRef.doc(chunkDocId(tabId, i)), { part: part });
            }
            for(var j=nbChunks;j<oldChunkCount;j++){
                batch.delete(tabsCollectionRef.doc(chunkDocId(tabId, j)));
            }
            batch.set(tabRef, Object.assign({ html: null, chunked: true, chunkCount: nbChunks }, base));
            return batch.commit().then(function(){ trackWrites(nbChunks + Math.max(0, oldChunkCount - nbChunks) + 1); });
        });
    }
    function applyRemoteTab(tabId, data){
        if(TAB_SYNC_EXCLUDED.indexOf(tabId) !== -1) return;
        var div = document.getElementById(tabId);
        if(!div) return;
        var liveTabsCol = db.collection('seven7_dossiers').doc(dossierId).collection('tabs');
        var activeId = null;
        loadTabPayload(liveTabsCol, tabId, data).then(function(html){
            activeId = (document.activeElement && div.contains(document.activeElement)) ? document.activeElement.id : null;
            return data.compressed ? decompressAsync(html) : html;
        }).then(function(html){
            applyingRemote[tabId] = true;
            div.innerHTML = html;
            applyingRemote[tabId] = false;
            if(activeId){
                var el = document.getElementById(activeId);
                if(el) el.focus();
            }
            // Onglets Balance N / N-1 : la liasse (Actif/Passif/Résultat) ne lit jamais le DOM,
            // elle lit exclusivement la variable balanceData['n']/['n1']. Après un chargement
            // distant (ouverture du dossier ou mise à jour par un collègue), le DOM est à jour
            // mais balanceData ne l'est pas tant qu'on ne rappelle pas explicitement sa
            // reconstruction — recomputeBalanceFromTable s'en charge et rafraîchit la liasse.
            if((tabId === 'balance-n' || tabId === 'balance-n1') && typeof recomputeBalanceFromTable === 'function'){
                recomputeBalanceFromTable(tabId === 'balance-n1' ? 'n1' : 'n');
            } else if(typeof updateAllCalculations === 'function') updateAllCalculations();
            var when = data.lastEditedAt && data.lastEditedAt.toDate ? data.lastEditedAt.toDate().toLocaleTimeString() : '';
            setStatus('🟢 Onglet mis à jour par ' + (data.lastEditedBy || '?') + (when ? (' à ' + when) : ''));
        }).catch(function(e){
            applyingRemote[tabId] = false;
            setStatus('❌ Erreur de chargement de l\'onglet : ' + e.message);
        });
    }

    function listenTabs(){
        db.collection('seven7_dossiers').doc(dossierId).collection('tabs').onSnapshot(function(snapshot){
            trackReads(Math.max(1, snapshot.docChanges().length));
            snapshot.docChanges().forEach(function(change){
                if(change.type === 'removed') return;
                if(TAB_SYNC_EXCLUDED.indexOf(change.doc.id) !== -1) return;
                var data = change.doc.data();
                if(data.lastSession !== sessionId){
                    applyRemoteTab(change.doc.id, data);
                }
            });
        }, function(err){
            setStatus('❌ Erreur de synchronisation : ' + err.message);
        });
        setStatus('🟢 Synchronisé');
    }

    // ---------- Export / portabilité des données du dossier ----------
    // Permet à tout moment au Cabinet de récupérer l'intégralité du contenu de son dossier dans un
    // fichier autonome (HTML), lisible dans n'importe quel navigateur et imprimable en PDF, sans
    // dépendre de SEVEN7 AUDIT ni de Firebase. Répond à l'engagement de réversibilité/portabilité
    // des données (le Client n'est jamais "prisonnier" de l'outil).
    function sanitizeForExport(html){
        var wrapper = document.createElement('div');
        wrapper.innerHTML = (html && html.length) ? html : '<p style="color:#999; font-style:italic;">(Onglet non renseigné)</p>';
        wrapper.querySelectorAll('input, select, textarea').forEach(function(el){ el.setAttribute('disabled', 'disabled'); });
        wrapper.querySelectorAll('button').forEach(function(el){ el.style.display = 'none'; });
        wrapper.querySelectorAll('[onclick]').forEach(function(el){ el.removeAttribute('onclick'); });
        return wrapper.innerHTML;
    }

    function buildAndDownloadExport(tabHtmlById){
        var cabinet = (permData && permData.cabinetName) || NOM_CABINET_CLIENT;
        var dateStr = new Date().toLocaleString('fr-FR');
        var toc = '', body = '';
        TABS.forEach(function(t){
            if(TAB_SYNC_EXCLUDED.indexOf(t.id) !== -1) return;
            toc += '<li><a href="#export-' + esc(t.id) + '">' + esc(t.label) + '</a></li>';
            body += '<div class="export-section" id="export-' + esc(t.id) + '">' +
                        '<h2>' + esc(t.label) + '</h2>' +
                        '<div class="export-content">' + sanitizeForExport(tabHtmlById[t.id]) + '</div>' +
                    '</div>';
        });
        var html = '<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8"><title>Export ' + esc(dossierId) + '</title><style>' +
            'body{font-family:Arial,Helvetica,sans-serif;color:#222;margin:0;padding:0;}' +
            '.export-header{background:#1B2A4A;color:#fff;padding:24px 32px;}' +
            '.export-header h1{margin:0 0 4px;font-size:22px;}' +
            '.export-header p{margin:2px 0;font-size:13px;color:#cbd3e6;}' +
            '.export-toc{padding:18px 32px;background:#f5f6f8;border-bottom:1px solid #ddd;}' +
            '.export-toc h2{font-size:15px;margin:0 0 8px;color:#1B2A4A;}' +
            '.export-toc ul{columns:2;-webkit-columns:2;font-size:12px;list-style:none;padding:0;margin:0;}' +
            '.export-toc li{margin-bottom:4px;} .export-toc a{color:#12324a;text-decoration:none;}' +
            '.export-section{padding:24px 32px;border-bottom:2px solid #eee;}' +
            '.export-section h2{color:#1B2A4A;border-bottom:2px solid #B8860B;padding-bottom:6px;font-size:17px;}' +
            'table{border-collapse:collapse;width:100%;margin:8px 0;font-size:12px;}' +
            'table td, table th{border:1px solid #ccc;padding:4px 6px;}' +
            'input,select,textarea{background:#f4f4f4;border:1px solid #ccc;}' +
            '@media print{.export-section{page-break-after:always;} .export-toc{display:none;}}' +
            '</style></head><body>' +
            '<div class="export-header"><h1>' + esc(cabinet) + '</h1>' +
            '<p>Dossier : ' + esc(dossierId) + '</p>' +
            '<p>Export généré le ' + esc(dateStr) + ' — SEVEN7 AUDIT</p></div>' +
            '<div class="export-toc"><h2>Sommaire</h2><ul>' + toc + '</ul></div>' +
            body + '</body></html>';
        var blob = new Blob([html], { type: 'text/html;charset=utf-8' });
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = 'Export_' + dossierId + '_' + new Date().toISOString().slice(0, 10) + '.html';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(function(){ URL.revokeObjectURL(url); }, 5000);
        setStatus('✅ Export du dossier téléchargé.');
    }

    window.exportDossierData = function(){
        if(!isAdmin){ alert("Seul l'administrateur du dossier peut exporter l'ensemble des données."); return; }
        if(!db || !dossierId) return;
        setStatus('⏳ Préparation de l\'export…');
        var liveTabsCol = db.collection('seven7_dossiers').doc(dossierId).collection('tabs');
        liveTabsCol.get().then(function(snapshot){
            trackReads(Math.max(1, snapshot.size));
            var tabHtmlById = {};
            var pending = [];
            snapshot.forEach(function(doc){
                if(doc.id.indexOf('__chunk_') !== -1) return; // fragment interne d'un onglet volumineux, pas un onglet
                var data = doc.data() || {};
                var p = loadTabPayload(liveTabsCol, doc.id, data).then(function(html){
                    html = html || '';
                    return data.compressed ? decompressAsync(html) : html;
                }).then(function(html){
                    tabHtmlById[doc.id] = html;
                });
                pending.push(p);
            });
            return Promise.all(pending).then(function(){ buildAndDownloadExport(tabHtmlById); });
        }).catch(function(e){
            setStatus('❌ Erreur export');
            alert("Erreur lors de la préparation de l'export : " + e.message);
        });
    };

    function tabIdFromNode(node){
        var el = node;
        while(el && el !== document.body){
            if(el.classList && el.classList.contains('tab-content')) {
                return TAB_SYNC_EXCLUDED.indexOf(el.id) !== -1 ? null : el.id;
            }
            el = el.parentNode;
        }
        return null;
    }

    document.addEventListener('input', function(e){
        var tabId = tabIdFromNode(e.target);
        if(tabId) scheduleSave(tabId, false);
    }, true);

    document.addEventListener('click', function(e){
        var tabId = tabIdFromNode(e.target);
        if(tabId) setTimeout(function(){ scheduleSave(tabId, false); }, 60);
    });

    // ---------- Phase 5 : masquage visuel de la liasse verrouillée (pont) ----------
    // §12 : un masquage d'interface n'est jamais une mesure de sécurité — la vraie
    // barrière est scheduleSave() ci-dessus (bloque l'appel) + firestore.rules
    // (accesPontEcriture, bloquerait de toute façon un appel direct). Ceci ne sert
    // qu'à éviter à un collaborateur de taper dans le vide en pensant enregistrer.
    //
    // Un MutationObserver plutôt qu'un enrobage de liasseShowTab() : ce fichier se
    // charge AVANT 31-moteur-unifie.js (qui définit liasseShowTab), donc
    // window.liasseShowTab n'existe pas encore au moment où ce module s'évalue —
    // l'enrober comme window.showTab (même fichier, déjà chargé) échouerait
    // silencieusement. L'observer, lui, réagit quel que soit l'ordre de chargement,
    // sans toucher au fichier du moteur de calcul (§12).
    function appliquerVerrouLiassePont(){
        document.querySelectorAll('.liasse-panel').forEach(function(panel){
            var actif = panel.classList.contains('active');
            // Palier d'abord : si le cabinet n'a pas souscrit au module du tout,
            // ce verrou-là prime sur E3 (verrouRole) — pas la peine de dire
            // « réservé à l'admin » à un admin dont le palier ne l'inclut pas.
            var verrouPalier = actif && pontOngletReserveParPalier(panel.id);
            var verrouRole = actif && !verrouPalier && pontOngletLiasseVerrouille(panel.id);
            var overlay = panel.querySelector('.pont-liasse-verrou');
            if(verrouPalier || verrouRole){
                if(!overlay){
                    if(getComputedStyle(panel).position === 'static') panel.style.position = 'relative';
                    overlay = document.createElement('div');
                    overlay.className = 'pont-liasse-verrou';
                    overlay.style.cssText = 'position:absolute; inset:0; z-index:5000; background:rgba(255,255,255,0.55); cursor:not-allowed;';
                    overlay.innerHTML = '<div class="pont-liasse-verrou-texte" style="position:sticky; top:12px; margin:12px auto; max-width:420px; background:#1B2A4A; color:#fff; padding:8px 16px; border-radius:6px; font-size:12px; text-align:center; box-shadow:0 2px 8px rgba(0,0,0,.25);"></div>';
                    panel.appendChild(overlay);
                }
                overlay.querySelector('.pont-liasse-verrou-texte').textContent = verrouPalier
                    ? '🔒 Module réservé au palier CABINET — contactez SEVEN7 pour changer de palier'
                    : "🔒 Lecture seule — la liasse est réservée à l'administrateur du cabinet";
            } else if(overlay){
                overlay.remove();
            }
        });
        // Bouton « LIASSE — États Financiers » de la barre d'interfaces : masqué
        // pour toute la session si le palier du cabinet n'inclut pas le module
        // du tout (STARTER/PRO), quel que soit le rôle — cohérent avec la
        // décision « masquer la liasse également pour PRO » (10/08/2026).
        var btnInterfaceLiasse = document.getElementById('btn-interface-liasse');
        if(btnInterfaceLiasse){
            btnInterfaceLiasse.style.display = (pontActif && pontPlanCabinet !== 'CABINET') ? 'none' : '';
        }
        // Bouton hors des panneaux (barre commune à tous les onglets liasse) :
        // masqué une seule fois pour toute la session pont, pas par onglet.
        // Purement client (génère un fichier téléchargé, aucune écriture
        // Firestore) — mais l'export de la liasse reste un acte réservé à
        // l'administrateur selon la matrice des droits (§5), donc masqué ici
        // au même titre que la saisie, jamais laissé « juste en lecture ».
        // Le palier prime aussi ici : un admin STARTER/PRO n'y a pas accès non plus.
        var btnExport = document.querySelector('.liasse-btn-export-xml');
        if(btnExport){
            var verrouExport = pontActif && (pontRole === 'COLLABORATEUR' || pontPlanCabinet !== 'CABINET');
            btnExport.disabled = verrouExport;
            btnExport.style.opacity = verrouExport ? '0.5' : '';
            btnExport.style.cursor = verrouExport ? 'not-allowed' : '';
            btnExport.title = verrouExport ? "🔒 Réservé à l'administrateur d'un cabinet au palier CABINET" : '';
        }
    }
    new MutationObserver(function(){ if(pontActif) appliquerVerrouLiassePont(); })
        .observe(document.documentElement, { attributes: true, attributeFilter: ['class'], subtree: true });

    window.addEventListener('beforeunload', function(){
        // Best-effort : supprime la trace de présence pour ne pas laisser un badge "fantôme"
        // affiché aux autres collaborateurs après fermeture de l'onglet/navigateur.
        if(db && dossierId){
            db.collection('seven7_dossiers').doc(dossierId).collection('presence').doc(sessionId).delete().catch(function(){});
        }
    });
})();