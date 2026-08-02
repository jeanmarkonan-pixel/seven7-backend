(function(){
    'use strict';
    var db = null, dossierId = null, myName = null, myKey = null, isAdmin = false;
    var contacts = [];
    var conversations = {};
    var activeContact = null, activeConvId = null;
    var unsubConvs = null, unsubBroadcast = null, unsubMessages = null;
    var initialized = false;

    function safeKeyLocal(name){ return String(name || '').replace(/[.\/#$\[\]]/g, '_').trim(); }
    function myKeyValue(){ return isAdmin ? 'admin' : safeKeyLocal(myName); }
    function directConvId(a, b){ var p = [a, b].sort(); return 'dm__' + p[0] + '__' + p[1]; }
    function convsCol(){ return db.collection('seven7_dossiers').doc(dossierId).collection('conversations'); }
    function convRef(id){ return convsCol().doc(id); }
    // Ce module tourne dans sa propre IIFE, sans accès direct aux compteurs internes du
    // script principal : on relaie donc vers les fonctions exposées sur window plutôt que
    // de dupliquer un second compteur (qui recréerait un point chaud séparé).
    function trackReads(n){ if(typeof window.SEVEN7_TRACK_READS === 'function') window.SEVEN7_TRACK_READS(n); }
    function trackWrites(n){ if(typeof window.SEVEN7_TRACK_WRITES === 'function') window.SEVEN7_TRACK_WRITES(n); }

    function buildContacts(){
        var list = [];
        var adminName = window.SEVEN7_ADMIN_NAME;
        var access = window.SEVEN7_ACCESS || {};
        if(adminName && !(isAdmin)){
            list.push({ key: 'admin', name: adminName, isAdmin: true });
        }
        Object.keys(access).forEach(function(k){
            if(k === myKey) return;
            var entry = access[k] || {};
            list.push({ key: k, name: entry.displayName || k, isAdmin: false });
        });
        return list;
    }

    window.SEVEN7_MSG_INIT = function(){
        db = window.SEVEN7_DB;
        dossierId = window.SEVEN7_DOSSIER_ID;
        myName = window.SEVEN7_MY_NAME;
        isAdmin = window.SEVEN7_IS_ADMIN;
        if(!db || !dossierId || !myName) return;
        myKey = myKeyValue();
        if(initialized) return;
        initialized = true;
        contacts = buildContacts();
        renderList();
        listenConversations();
    };

    window.SEVEN7_MSG_REFRESH_CONTACTS = function(){
        if(!window.SEVEN7_MY_NAME || !db) return;
        myName = window.SEVEN7_MY_NAME;
        isAdmin = window.SEVEN7_IS_ADMIN;
        myKey = myKeyValue();
        contacts = buildContacts();
        renderList();
        if(activeContact) renderThreadHead();
    };

    function listenConversations(){
        if(unsubConvs) unsubConvs();
        unsubConvs = convsCol().where('participantKeys', 'array-contains', myKey)
            .onSnapshot(function(snap){
                trackReads(Math.max(1, snap.docChanges().length));
                snap.forEach(function(doc){ conversations[doc.id] = Object.assign({ id: doc.id }, doc.data()); });
                renderList();
            }, function(err){ console.error('Messagerie: erreur écoute conversations', err); });
        if(unsubBroadcast) unsubBroadcast();
        unsubBroadcast = convRef('broadcast_team').onSnapshot(function(doc){
            trackReads(1);
            if(doc.exists) conversations.broadcast_team = Object.assign({ id: 'broadcast_team' }, doc.data());
            renderList();
        }, function(err){ console.error('Messagerie: erreur canal équipe', err); });
    }

    function isUnread(conv){
        if(!conv || !conv.lastMessage || conv.lastMessage.senderKey === myKey) return false;
        var lastAt = conv.lastMessageAt && conv.lastMessageAt.toMillis ? conv.lastMessageAt.toMillis() : 0;
        var myRead = conv.lastRead && conv.lastRead[myKey] && conv.lastRead[myKey].toMillis ? conv.lastRead[myKey].toMillis() : 0;
        return lastAt > myRead;
    }

    function allListItems(){
        return [{ key: '__team__', name: 'Équipe du dossier', broadcast: true }].concat(contacts);
    }

    function updateTabBadge(){
        var badge = document.getElementById('msg-tab-badge');
        if(!badge) return;
        var count = 0;
        allListItems().forEach(function(item){
            var id = item.broadcast ? 'broadcast_team' : directConvId(myKey, item.key);
            if(isUnread(conversations[id])) count++;
        });
        badge.style.display = count > 0 ? 'inline-block' : 'none';
        badge.textContent = count;
    }

    function renderList(){
        var el = document.getElementById('msgItems');
        if(!el) return;
        el.innerHTML = '';
        allListItems().forEach(function(item){
            var id = item.broadcast ? 'broadcast_team' : directConvId(myKey, item.key);
            var conv = conversations[id];
            var preview = conv && conv.lastMessage
                ? (conv.lastMessage.senderKey === myKey ? 'Vous : ' : '') + conv.lastMessage.text
                : (item.broadcast ? 'Diffusion de l\'administrateur' : 'Aucun message');
            var unread = isUnread(conv);
            var btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'msg-item' + (activeConvId === id ? ' active' : '');
            btn.onclick = (function(it){ return function(){ selectContact(it); }; })(item);
            btn.innerHTML =
                '<div class="msg-avatar" style="background:' + (item.broadcast ? '#8e44ad' : (item.isAdmin ? '#e67e22' : '#2980b9')) + ';">'
                    + (item.broadcast ? '👥' : esc(item.name.slice(0, 2).toUpperCase())) + '</div>'
                + '<div class="msg-item-body">'
                    + '<div class="msg-item-top"><p class="name">' + esc(item.name)
                        + (item.isAdmin ? ' <span class="msg-role-chip msg-role-admin">Admin</span>' : '') + '</p></div>'
                    + '<p class="msg-preview">' + esc(preview) + '</p>'
                + '</div>'
                + (unread ? '<span class="msg-unread-dot">●</span>' : '');
            el.appendChild(btn);
        });
        updateTabBadge();
    }

    function renderThreadHead(){
        var head = document.getElementById('msgThreadHead');
        if(!head || !activeContact) return;
        head.innerHTML =
            '<div class="msg-avatar" style="background:' + (activeContact.broadcast ? '#8e44ad' : (activeContact.isAdmin ? '#e67e22' : '#2980b9')) + ';">'
                + (activeContact.broadcast ? '👥' : esc(activeContact.name.slice(0, 2).toUpperCase())) + '</div>'
            + '<div><p class="thread-head-name">' + esc(activeContact.name) + '</p>'
            + '<p class="thread-head-sub">' + (activeContact.broadcast
                ? (isAdmin ? 'Diffusion à toute l\'équipe du dossier' : 'Canal de diffusion — lecture seule')
                : 'Message direct') + '</p></div>';
    }

    function fmtTime(ts){
        if(!ts || !ts.toDate) return '…';
        var d = ts.toDate();
        var today = new Date();
        var sameDay = d.toDateString() === today.toDateString();
        var hm = d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
        return sameDay ? hm : d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }) + ' ' + hm;
    }

    function renderThreadBody(msgs, convId){
        var body = document.getElementById('msgThreadBody');
        if(!body || convId !== activeConvId) return;
        if(msgs.length === 0){
            body.innerHTML = '<p style="padding:16px;color:#999;font-size:12px;">Aucun message pour l\'instant. Écrivez le premier !</p>';
            return;
        }
        var html = '<div class="thread-day-sep">Fil de discussion</div>';
        msgs.forEach(function(m){
            var mine = m.senderKey === myKey;
            html += '<div class="msg-bubble-row ' + (mine ? 'from-me' : 'from-them') + '">'
                + '<div class="msg-bubble">'
                    + (m.linkedTaskId ? '<span class="msg-bubble-flag">🔗 Lié à une tâche</span><br>' : '')
                    + (!mine && activeContact && activeContact.broadcast ? '<span class="msg-bubble-flag msg-broadcast-flag">📣 Diffusion — ' + esc(m.senderName) + '</span><br>' : '')
                    + esc(m.text)
                + '</div>'
                + '<div class="msg-bubble-meta">' + fmtTime(m.sentAt) + '</div>'
                + (!mine ? '<button type="button" class="msg-task-btn" onclick="SEVEN7_MSG_toggleTask(\'' + convId + '\',\'' + m.id + '\',' + (!!m.linkedTaskId) + ')">'
                    + (m.linkedTaskId ? '✕ Retirer le lien tâche' : '+ Lier à une tâche') + '</button>' : '')
                + '</div>';
        });
        body.innerHTML = html;
        body.scrollTop = body.scrollHeight;
    }

    function listenMessages(convId){
        if(unsubMessages) unsubMessages();
        var body = document.getElementById('msgThreadBody');
        if(body) body.innerHTML = '<p style="padding:16px;color:#999;font-size:12px;">Chargement…</p>';
        unsubMessages = convRef(convId).collection('messages').orderBy('sentAt', 'asc').limit(300)
            .onSnapshot(function(snap){
                trackReads(Math.max(1, snap.docChanges().length));
                var msgs = [];
                snap.forEach(function(doc){ msgs.push(Object.assign({ id: doc.id }, doc.data())); });
                renderThreadBody(msgs, convId);
            }, function(err){
                if(body) body.innerHTML = '<p style="padding:16px;color:#e74c3c;font-size:12px;">Erreur de chargement : ' + esc(err.message) + '</p>';
            });
    }

    function markRead(convId){
        if(!conversations[convId]) return;
        var upd = {};
        upd['lastRead.' + myKey] = firebase.firestore.FieldValue.serverTimestamp();
        convRef(convId).set(upd, { merge: true }).then(function(){ trackWrites(1); }).catch(function(){});
    }

    function selectContact(item){
        activeContact = item;
        activeConvId = item.broadcast ? 'broadcast_team' : directConvId(myKey, item.key);
        renderList();
        renderThreadHead();
        listenMessages(activeConvId);
        var inputRow = document.getElementById('msgThreadInput');
        if(inputRow) inputRow.style.display = (item.broadcast && !isAdmin) ? 'none' : 'flex';
        markRead(activeConvId);
    }

    window.SEVEN7_MSG_send = function(){
        var input = document.getElementById('msgInputField');
        if(!input || !activeContact || !db) return;
        var text = input.value.trim();
        if(!text) return;
        if(activeContact.broadcast && !isAdmin){
            alert('Seul l\'administrateur principal peut envoyer un message à toute l\'équipe.');
            return;
        }
        var convId = activeConvId;
        var ref = convRef(convId);
        var msgData = {
            senderKey: myKey,
            senderName: myName,
            text: text,
            sentAt: firebase.firestore.FieldValue.serverTimestamp(),
            linkedTaskId: null
        };
        var convUpdate = {
            type: activeContact.broadcast ? 'broadcast' : 'direct',
            dossierId: dossierId,
            lastMessage: { text: text, senderKey: myKey, senderName: myName }
        };
        convUpdate.lastMessageAt = firebase.firestore.FieldValue.serverTimestamp();
        convUpdate['lastRead.' + myKey] = firebase.firestore.FieldValue.serverTimestamp();
        if(!activeContact.broadcast){
            convUpdate.participantKeys = [myKey, activeContact.key];
        }
        input.disabled = true;
        ref.set(convUpdate, { merge: true })
            .then(function(){ return ref.collection('messages').add(msgData); })
            .then(function(){ trackWrites(2); input.value = ''; input.disabled = false; input.focus(); })
            .catch(function(err){ input.disabled = false; alert('Erreur d\'envoi : ' + err.message); });
    };

    window.SEVEN7_MSG_toggleTask = function(convId, msgId, currentlyLinked){
        convRef(convId).collection('messages').doc(msgId).update({
            linkedTaskId: currentlyLinked ? null : true
        }).then(function(){ trackWrites(1); }).catch(function(err){ alert('Erreur : ' + err.message); });
    };

    // Repli si ce script se charge alors que la session est déjà ouverte.
    if(window.SEVEN7_DB && window.SEVEN7_DOSSIER_ID && window.SEVEN7_MY_NAME) window.SEVEN7_MSG_INIT();
})();