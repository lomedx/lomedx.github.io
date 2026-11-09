import { supabaseUrl, supabaseKey } from './supabase.js';

(function() {
    'use strict';

    const CONFIG = {
        functionUrl: `${supabaseUrl}/functions/v1/ai-assistant`,
        anonKey: supabaseKey,
        maxHistory: 8,
    };

    const FEATURES = {
        'medicine-finder': { icon: '💊', title: 'باحث الأدوية', sub: 'ابحث عن دوائك في صيدليات مدينتك', route: '/medicine-finder' },
        'book-doctor': { icon: '📅', title: 'حجز موعد', sub: 'احجز مع طبيب متخصص', route: '/' },
        'blood-bank': { icon: '🩸', title: 'بنك الدم', sub: 'تبرّع أو اطلب دماً', route: '/blood-bank' },
        'health-file': { icon: '📁', title: 'الملف الصحي', sub: 'سجلك الطبي المشفر بـ QR', route: '/health-file' },
        'first-aid': { icon: '🚑', title: 'الإسعافات الأولية', sub: 'دليل شامل للطوارئ', route: '/first-aid' },
        'burn-calculator': { icon: '🔥', title: 'حاسبة الحروق', sub: 'إسعافات الحروق خطوة بخطوة', route: '/burn-calculator' },
        'pregnancy-calc': { icon: '🤰', title: 'حاسبة الحمل', sub: 'موعد الولادة وتطور الجنين', route: '/pregnancy-calc' },
        'dose-calc': { icon: '💉', title: 'حاسبة الجرعات', sub: 'جرعات آمنة للأطفال', route: '/dose-calc' },
        'vaccine-scheduler': { icon: '🗓️', title: 'جدول اللقاحات', sub: 'مواعيد تطعيم طفلك', route: '/vaccine-scheduler' },
        'health-calc': { icon: '⚖️', title: 'حاسبة الصحة', sub: 'BMI والسعرات اليومية', route: '/health-calc' },
        'water-calc': { icon: '💧', title: 'حاسبة الماء', sub: 'احتياجك اليومي من الماء', route: '/water-calc' },
        'med-renewal': { icon: '🔄', title: 'تجديد الدواء', sub: 'متى ينفد دواؤك؟', route: '/med-renewal-calc' },
        'med-symbols': { icon: '🧪', title: 'رموز التحاليل', sub: 'فهم مصطلحات الروشتات', route: '/med-symbols' },
        'chronic-nutrition': { icon: '🥗', title: 'تغذية الأمراض المزمنة', sub: 'نظام غذائي حسب مرضك', route: '/chronic-nutrition' },
        'pre-visit': { icon: '📋', title: 'قبل زيارة الطبيب', sub: 'جهّز نفسك للاستشارة', route: '/pre-visit-guide' },
        'pre-test': { icon: '🔬', title: 'قبل التحاليل', sub: 'تعليمات الصيام والتحضير', route: '/pre-test-guide' },
        'food-interactions': { icon: '⚠️', title: 'تعارضات الأدوية', sub: 'أدوية لا تُخلط مع طعام', route: '/food-interactions' },
        'patient-reminder': { icon: '⏰', title: 'دفتر التذكير', sub: 'تذكيرات الأدوية والمواعيد', route: '/patient-reminder' },
        'seasonal-diseases': { icon: '🌡️', title: 'الأمراض الموسمية', sub: 'دليل الأمراض الموسمية', route: '/seasonal-diseases' },
        'medical-map': { icon: '🗺️', title: 'الخريطة الطبية', sub: 'أقرب منشأة طبية لك', route: '/medical-map' },
        'medicine-donation': { icon: '🩺', title: 'الأجهزة الطبية', sub: 'تبادل الأجهزة والمستلزمات', route: '/medicine-donation' },
        'raheba-radar': { icon: '📡', title: 'الرادار الصحي', sub: 'رصد الأمراض في منطقتك', route: '/raheba-radar' },
        'ask-doctor': { icon: '👨‍⚕️', title: 'اسأل طبيب', sub: 'استشارة طبية مجانية', route: '/ask-doctor' },
        'blog': { icon: '📰', title: 'المدونة الطبية', sub: 'مقالات موثوقة', route: '/blog' },
        'events-first-aid': { icon: '🎉', title: 'إسعافات المناسبات', sub: 'حوادث الأفراح والتجمعات', route: '/events-first-aid' }
    };

    let messageHistory = [];
    let isSending = false;
    let currentAbortController = null;
    let refs = {};
    let currentConversationId = null;
    const STORAGE_KEY = 'lomi_conversations';

    const ICONS = {
        copy: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>',
        edit: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>',
        regen: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><path d="M1 4v6h6M23 20v-6h-6"/><path d="M20.49 9A9 9 0 005.64 5.64L1 10M23 14l-4.64 4.36A9 9 0 013.51 15"/></svg>',
        send: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" width="20" height="20"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/></svg>',
        stop: '<svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20"><rect x="6" y="6" width="12" height="12" rx="2"/></svg>',
        plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><path d="M12 5v14M5 12h14"/></svg>',
        close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><path d="M18 6L6 18M6 6l12 12"/></svg>',
        shield: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M9 12l2 2 4-4"/></svg>',
        history: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><path d="M12 8v4l3 3"/><circle cx="12" cy="12" r="9"/></svg>',
        trash: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/></svg>'
    };

    function formatText(t) {
        return t.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
                .replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>')
                .replace(/^• /gm,'<span style="color:var(--brand-600);font-weight:700;">• </span>');
    }

    function extractFeatures(text) {
        const regex = /\[OPEN:([\w-]+)\]/g;
        const features = [];
        let match;
        while ((match = regex.exec(text)) !== null) {
            if (FEATURES[match[1]] && !features.includes(match[1])) features.push(match[1]);
        }
        return { cleanText: text.replace(regex, '').trim(), features };
    }

    function buildFeatureButton(id) {
        const f = FEATURES[id];
        if (!f) return '';
        return `<a href="${f.route}" class="lomi-feature-btn" onclick="window.closeLomi()">
            <div class="lomi-feature-btn-icon">${f.icon}</div>
            <div class="lomi-feature-btn-text">
                <div class="lomi-feature-btn-title">${f.title}</div>
                <div class="lomi-feature-btn-sub">${f.sub}</div>
            </div>
            <div class="lomi-feature-btn-arrow">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
            </div>
        </a>`;
    }

    // ═══ إدارة المحادثات ═══
    function loadConversations() {
        try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); } catch { return []; }
    }

    function saveConversations(list) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    }

    function generateId() {
        return 'c_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);
    }

    function getConversationTitle(messages) {
        const firstUser = messages.find(m => m.role === 'user');
        if (!firstUser) return 'محادثة جديدة';
        const t = firstUser.content.trim();
        return t.length > 40 ? t.slice(0, 40) + '…' : t;
    }

    function saveCurrentConversation() {
        const messagesToSave = messageHistory
            .filter(m => m.content && m.content.trim())
            .map(m => ({ role: m.role, content: m.content }));

        if (messagesToSave.length === 0) return;

        const list = loadConversations();
        const now = Date.now();

        if (currentConversationId) {
            const idx = list.findIndex(c => c.id === currentConversationId);
            if (idx !== -1) {
                list[idx].messages = messagesToSave;
                list[idx].updatedAt = now;
                list[idx].title = getConversationTitle(messagesToSave);
            }
        } else {
            currentConversationId = generateId();
            list.unshift({
                id: currentConversationId,
                title: getConversationTitle(messagesToSave),
                messages: messagesToSave,
                createdAt: now,
                updatedAt: now
            });
        }
        if (list.length > 50) list.length = 50;
        saveConversations(list);
    }

    function startNewConversation() {
        if (isSending) return;
        saveCurrentConversation();
        currentConversationId = null;
        messageHistory = [];
        refs.messages.innerHTML = '';
        showWelcome();
        closeHistoryPanel();
    }

    function loadConversation(id) {
        if (isSending) return;
        const list = loadConversations();
        const conv = list.find(c => c.id === id);
        if (!conv) return;

        currentConversationId = id;
        messageHistory = [];
        refs.messages.innerHTML = '';

        conv.messages.forEach(m => {
            if (m.role === 'user') {
                const entry = createUserMessage(m.content);
                messageHistory.push(entry);
            } else {
                const entry = createAssistantMessage(m.content);
                entry.bubble.innerHTML = formatText(m.content);
                const acts = document.createElement('div');
                acts.className = 'lomi-msg-actions';
                acts.innerHTML = `<button class="lomi-action-btn" data-action="copy">${ICONS.copy}</button><button class="lomi-action-btn" data-action="regen">${ICONS.regen}</button>`;
                entry.element.querySelector('.lomi-msg-row').appendChild(acts);
                messageHistory.push(entry);
            }
        });
        refs.messages.scrollTop = refs.messages.scrollHeight;
        closeHistoryPanel();
    }

    function deleteConversation(id, e) {
        e.stopPropagation();
        const list = loadConversations().filter(c => c.id !== id);
        saveConversations(list);
        if (currentConversationId === id) {
            currentConversationId = null;
            messageHistory = [];
            refs.messages.innerHTML = '';
            showWelcome();
        }
        renderHistoryList();
    }

    function openHistoryPanel() {
        renderHistoryList();
        document.getElementById('lomiHistoryPanel')?.classList.add('open');
    }

    function closeHistoryPanel() {
        document.getElementById('lomiHistoryPanel')?.classList.remove('open');
    }

    function renderHistoryList() {
        const listEl = document.getElementById('lomiHistoryList');
        if (!listEl) return;

        const list = loadConversations();

        if (list.length === 0) {
            listEl.innerHTML = `<div class="lomi-history-empty"><span>💬</span><div>لا توجد محادثات سابقة</div></div>`;
            return;
        }

        listEl.innerHTML = list.map(c => {
            const date = new Date(c.updatedAt);
            const timeStr = date.toLocaleDateString('ar-SA', { day: 'numeric', month: 'short' }) + ' • ' + date.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' });
            const msgCount = c.messages.length;
            const isActive = c.id === currentConversationId ? 'active' : '';
            return `
                <div class="lomi-history-item ${isActive}" data-id="${c.id}">
                    <div class="lomi-history-item-icon">💬</div>
                    <div class="lomi-history-item-body">
                        <div class="lomi-history-item-title">${c.title}</div>
                        <div class="lomi-history-item-meta"><span>${timeStr}</span><span>${msgCount} رسالة</span></div>
                    </div>
                    <button class="lomi-history-item-delete" data-delete="${c.id}" title="حذف">${ICONS.trash}</button>
                </div>`;
        }).join('');

        listEl.querySelectorAll('.lomi-history-item').forEach(item => {
            item.addEventListener('click', () => loadConversation(item.dataset.id));
        });
        listEl.querySelectorAll('[data-delete]').forEach(btn => {
            btn.addEventListener('click', (e) => deleteConversation(btn.dataset.delete, e));
        });
    }

    // ═══ بناء الواجهة ═══
    function buildUI() {
        if (document.getElementById('lomiOverlay')) return;
        const overlay = document.createElement('div');
        overlay.className = 'lomi-overlay';
        overlay.id = 'lomiOverlay';
        overlay.innerHTML = `
            <div class="lomi-app">
                <header class="lomi-header">
                    <div class="lomi-avatar-wrap">
                        <div class="lomi-avatar">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12h4l2-7 4 14 2-7h6"/></svg>
                        </div>
                    </div>
                    <div class="lomi-header-info">
                        <div class="lomi-header-title">Lomi</div>
                        <div class="lomi-header-status">
                            <span class="lomi-status-dot" id="lomiStatusDot"></span>
                            <span id="lomiStatusText">متصل بمنصة LomedX</span>
                        </div>
                    </div>
                    <button class="lomi-header-btn" id="lomiHistoryBtn" title="سجل المحادثات">${ICONS.history}</button>
                    <button class="lomi-header-btn" id="lomiClearBtn" title="محادثة جديدة">${ICONS.plus}</button>
                    <button class="lomi-header-btn" id="lomiCloseBtn" title="إغلاق">${ICONS.close}</button>
                </header>
                <div class="lomi-messages" id="lomiMessages"></div>
                <div class="lomi-chips" id="lomiChips">
                    <button class="lomi-chip" data-q="أبحث عن دواء"><span>💊</span> دواء</button>
                    <button class="lomi-chip" data-q="أريد حجز موعد مع طبيب"><span>📅</span> حجز</button>
                    <button class="lomi-chip" data-q="حاسبة جرعة طفلي"><span>💉</span> جرعات</button>
                    <button class="lomi-chip" data-q="ألم في الصدر مع تعرق"><span>🆘</span> طوارئ</button>
                    <button class="lomi-chip" data-q="عندي صداع خفيف"><span>🤯</span> صداع</button>
                </div>
                <div class="lomi-input-area">
                    <div class="lomi-input-wrap">
                        <textarea id="lomiInput" class="lomi-input" placeholder="اكتب سؤالك الطبي..." rows="1" maxlength="1000"></textarea>
                        <div class="lomi-char-counter" id="lomiCharCounter">0 / 1000</div>
                    </div>
                    <button class="lomi-send-btn" id="lomiSendBtn" disabled>${ICONS.send}</button>
                </div>
                <footer class="lomi-disclaimer">${ICONS.shield}<span>للتوعية الصحية فقط — <strong>لا يغني عن استشارة الطبيب</strong></span></footer>
                
                <div class="lomi-history-panel" id="lomiHistoryPanel">
                    <div class="lomi-history-header">
                        <div class="lomi-history-title">سجل المحادثات</div>
                        <button class="lomi-history-close" id="lomiHistoryCloseBtn">${ICONS.close}</button>
                    </div>
                    <div class="lomi-history-list" id="lomiHistoryList"></div>
                    <div class="lomi-history-footer">
                        <button class="lomi-history-new-btn" id="lomiHistoryNewBtn">${ICONS.plus} محادثة جديدة</button>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);

        refs = {
            messages: document.getElementById('lomiMessages'),
            input: document.getElementById('lomiInput'),
            sendBtn: document.getElementById('lomiSendBtn'),
            statusText: document.getElementById('lomiStatusText'),
            statusDot: document.getElementById('lomiStatusDot'),
            chips: document.getElementById('lomiChips'),
            charCounter: document.getElementById('lomiCharCounter'),
            clearBtn: document.getElementById('lomiClearBtn'),
            closeBtn: document.getElementById('lomiCloseBtn')
        };
        bindEvents();
        showWelcome();
    }

    // ═══ الأحداث ═══
    function bindEvents() {
        document.getElementById('lomiCloseBtn').addEventListener('click', () => window.closeLomi());
        document.getElementById('lomiOverlay').addEventListener('click', (e) => { if (e.target.id === 'lomiOverlay') window.closeLomi(); });
        document.getElementById('lomiClearBtn').addEventListener('click', startNewConversation);
        document.getElementById('lomiHistoryBtn').addEventListener('click', openHistoryPanel);
        document.getElementById('lomiHistoryCloseBtn').addEventListener('click', closeHistoryPanel);
        document.getElementById('lomiHistoryNewBtn').addEventListener('click', startNewConversation);

        refs.input.addEventListener('input', () => {
            refs.input.style.height = 'auto';
            refs.input.style.height = Math.min(refs.input.scrollHeight, 130) + 'px';
            refs.sendBtn.disabled = !refs.input.value.trim() || isSending;
            const len = refs.input.value.length;
            refs.charCounter.textContent = `${len} / 1000`;
            refs.charCounter.classList.toggle('show', len > 0);
        });

        refs.input.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); if (!isSending) sendMessage(refs.input.value); } });
        refs.sendBtn.addEventListener('click', () => { isSending ? stopGeneration() : sendMessage(refs.input.value); });
        refs.chips.querySelectorAll('.lomi-chip').forEach(c => c.addEventListener('click', () => sendMessage(c.dataset.q)));
        refs.messages.addEventListener('click', (e) => {
            const b = e.target.closest('.lomi-action-btn');
            if (b) handleMessageAction(b.dataset.action, b.closest('.lomi-msg').dataset.id);
        });
    }

    function showWelcome() {
        const el = createAssistantMessage('');
        el.bubble.innerHTML = formatText(`أهلاً بك في **منصة LomedX** 👋\n\nأنا **Lomi**، مساعدك الطبي الذكي.\n\nجرّب أن تكتب:\n• "أبحث عن دواء"\n• "حاسبة جرعة طفلي"\n\n للتوعية فقط`);
        messageHistory.push(el);
    }

    function createUserMessage(text) {
        const id = 'm_' + Date.now();
        const el = document.createElement('div');
        el.className = 'lomi-msg user';
        el.dataset.id = id;
        el.innerHTML = `<div class="lomi-bubble">${formatText(text)}</div><div class="lomi-msg-actions"><button class="lomi-action-btn" data-action="edit">${ICONS.edit}</button><button class="lomi-action-btn" data-action="copy">${ICONS.copy}</button></div>`;
        refs.messages.appendChild(el);
        refs.messages.scrollTop = refs.messages.scrollHeight;
        return { id, role: 'user', content: text, element: el };
    }

    function createAssistantMessage(text = '') {
        const id = 'm_' + Date.now() + Math.random();
        const el = document.createElement('div');
        el.className = 'lomi-msg assistant';
        el.dataset.id = id;
        el.innerHTML = `<div class="lomi-msg-row"><div class="lomi-bubble"></div></div>`;
        refs.messages.appendChild(el);
        return { id, role: 'assistant', content: text, element: el, bubble: el.querySelector('.lomi-bubble') };
    }

    function renderAssistantFinal(entry, fullText) {
        const { cleanText, features } = extractFeatures(fullText);
        entry.content = cleanText;
        entry.bubble.innerHTML = formatText(cleanText);
        if (features.length > 0) {
            const a = document.createElement('div');
            a.className = 'lomi-feature-actions';
            a.innerHTML = features.map(buildFeatureButton).join('');
            entry.element.appendChild(a);
        }
        const acts = document.createElement('div');
        acts.className = 'lomi-msg-actions';
        acts.innerHTML = `<button class="lomi-action-btn" data-action="copy">${ICONS.copy}</button><button class="lomi-action-btn" data-action="regen">${ICONS.regen}</button>`;
        entry.element.querySelector('.lomi-msg-row').appendChild(acts);
        refs.messages.scrollTop = refs.messages.scrollHeight;
    }

    function handleMessageAction(action, msgId) {
        const idx = messageHistory.findIndex(m => m.id === msgId);
        if (idx === -1) return;
        const msg = messageHistory[idx];
        if (action === 'copy') { navigator.clipboard.writeText(msg.content); return; }
        if (action === 'edit' && msg.role === 'user') {
            messageHistory.splice(idx).forEach(m => m.element.remove());
            refs.input.value = msg.content; refs.sendBtn.disabled = false; refs.input.focus();
        }
        if (action === 'regen' && msg.role === 'assistant') {
            let uIdx = idx - 1;
            while (uIdx >= 0 && messageHistory[uIdx].role !== 'user') uIdx--;
            if (uIdx >= 0) { const t = messageHistory[uIdx].content; messageHistory.splice(uIdx).forEach(m => m.element.remove()); sendMessage(t); }
        }
    }

    async function sendMessage(text) {
        if (!text?.trim() || isSending) return;
        refs.input.value = ''; refs.input.style.height = '48px'; refs.sendBtn.disabled = true;
        isSending = true; refs.sendBtn.innerHTML = ICONS.stop; refs.sendBtn.classList.add('stop');
        refs.statusText.textContent = 'يكتب...'; refs.statusDot.classList.add('busy'); refs.charCounter.classList.remove('show');

        const userEntry = createUserMessage(text);
        messageHistory.push(userEntry);
        const typing = document.createElement('div');
        typing.className = 'lomi-msg assistant'; typing.id = 'lomiTyping';
        
        // النقاط الثلاث فقط بدون كلمة يكتب
        typing.innerHTML = `<div class="lomi-typing"><span></span><span></span><span></span></div>`;
        
        refs.messages.appendChild(typing); refs.messages.scrollTop = refs.messages.scrollHeight;

        let assistantEntry = null; let accumulated = '';
        currentAbortController = new AbortController();

        try {
            const res = await fetch(CONFIG.functionUrl, {
                method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${CONFIG.anonKey}` },
                signal: currentAbortController.signal,
                body: JSON.stringify({ message: text, history: messageHistory.map(m => ({ role: m.role, content: m.content })).slice(-8), fingerprint: 'web' })
            });
            if (!res.ok) throw new Error('فشل الاتصال');
            const reader = res.body.getReader(); const decoder = new TextDecoder(); let buffer = '';
            while (true) {
                const { done, value } = await reader.read(); if (done) break;
                buffer += decoder.decode(value, { stream: true }); const lines = buffer.split('\n'); buffer = lines.pop() || '';
                for (const line of lines) {
                    if (!line.startsWith('data:')) continue; const d = line.slice(5).trim(); if (!d || d === '[DONE]') continue;
                    try {
                        const p = JSON.parse(d); const chunk = p.candidates?.[0]?.content?.parts?.[0]?.text;
                        if (chunk) {
                            if (!assistantEntry) { typing.remove(); assistantEntry = createAssistantMessage(''); messageHistory.push(assistantEntry); }
                            accumulated += chunk; assistantEntry.bubble.textContent = extractFeatures(accumulated).cleanText; refs.messages.scrollTop = refs.messages.scrollHeight;
                        }
                    } catch (e) {}
                }
            }
            typing.remove();
            if (assistantEntry) { renderAssistantFinal(assistantEntry, accumulated); saveCurrentConversation(); }
            refs.statusText.textContent = 'متصل'; refs.statusDot.classList.remove('busy');
        } catch (err) {
            typing.remove(); if (err.name !== 'AbortError') refs.statusText.textContent = 'خطأ في الاتصال';
        } finally {
            isSending = false; refs.sendBtn.innerHTML = ICONS.send; refs.sendBtn.classList.remove('stop'); refs.sendBtn.disabled = !refs.input.value.trim(); refs.statusDot.classList.remove('busy');
        }
    }

    function stopGeneration() { if (currentAbortController) currentAbortController.abort(); }

    window.openLomi = function() { buildUI(); document.getElementById('lomiOverlay').classList.add('active'); document.body.style.overflow = 'hidden'; setTimeout(() => refs.input?.focus(), 300); };
    window.closeLomi = function() { const overlay = document.getElementById('lomiOverlay'); if (overlay) overlay.classList.remove('active'); document.body.style.overflow = ''; if (isSending) stopGeneration(); saveCurrentConversation(); };
})();
