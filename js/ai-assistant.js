import { supabaseUrl, supabaseKey } from './supabase.js';

(function() {
    'use strict';

    // ═══ الإعدادات ══
    const CONFIG = {
        functionUrl: `${supabaseUrl}/functions/v1/ai-assistant`,
        anonKey: supabaseKey,
        maxHistory: 8,
    };

    // ═══ الميزات الـ25 ═══
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
        'seasonal-diseases': { icon: '🌡️', title: 'الأمراض الموسمية', sub: 'دليل القلمون الموسمي', route: '/seasonal-diseases' },
        'medical-map': { icon: '🗺️', title: 'الخريطة الطبية', sub: 'أقرب منشأة طبية لك', route: '/medical-map' },
        'medicine-donation': { icon: '🩺', title: 'الأجهزة الطبية', sub: 'تبادل الأجهزة والمستلزمات', route: '/medicine-donation' },
        'raheba-radar': { icon: '📡', title: 'الرادار الصحي', sub: 'رصد الأمراض في منطقتك', route: '/raheba-radar' },
        'ask-doctor': { icon: '👨‍⚕️', title: 'اسأل طبيب', sub: 'استشارة طبية مجانية', route: '/ask-doctor' },
        'blog': { icon: '📰', title: 'المدونة الطبية', sub: 'مقالات موثوقة', route: '/blog' },
        'events-first-aid': { icon: '🎉', title: 'إسعافات المناسبات', sub: 'حوادث الأفراح والتجمعات', route: '/events-first-aid' }
    };

    // ═══ الحالة ═══
    let messageHistory = [];
    let isSending = false;
    let currentAbortController = null;
    let recognition = null;
    let isListening = false;
    let voiceOriginalInput = '';
    let refs = {};

    const ICONS = {
        copy: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>',
        edit: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>',
        resend: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><path d="M23 4v6h-6M1 20v-6h6"/><path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/></svg>',
        regen: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><path d="M1 4v6h6M23 20v-6h-6"/><path d="M20.49 9A9 9 0 005.64 5.64L1 10M23 14l-4.64 4.36A9 9 0 013.51 15"/></svg>',
        send: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" width="20" height="20"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/></svg>',
        stop: '<svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20"><rect x="6" y="6" width="12" height="12" rx="2"/></svg>',
        mic: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20"><path d="M12 2a3 3 0 00-3 3v7a3 3 0 006 0V5a3 3 0 00-3-3z"/><path d="M19 10v2a7 7 0 01-14 0v-2M12 19v3"/></svg>',
        plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><path d="M12 5v14M5 12h14"/></svg>',
        close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><path d="M18 6L6 18M6 6l12 12"/></svg>',
        shield: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M9 12l2 2 4-4"/></svg>'
    };

    function formatText(t) { return t.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>').replace(/^• /gm,'<span style="color:var(--brand-600);font-weight:700;">• </span>'); }
    
    function extractFeatures(text) {
        const regex = /\[OPEN:([\w-]+)\]/g; const features = []; let match;
        while ((match = regex.exec(text)) !== null) { if (FEATURES[match[1]] && !features.includes(match[1])) features.push(match[1]); }
        return { cleanText: text.replace(regex, '').trim(), features };
    }

    function buildFeatureButton(id) {
        const f = FEATURES[id]; if (!f) return '';
        return `<a href="${f.route}" class="lomi-feature-btn">
            <div class="lomi-feature-btn-icon">${f.icon}</div>
            <div class="lomi-feature-btn-text"><div class="lomi-feature-btn-title">${f.title}</div><div class="lomi-feature-btn-sub">${f.sub}</div></div>
        </a>`;
    }

    function showToast(msg) { 
        // استبدل alert البسيط بتوست أنيق إن أردت لاحقاً
        console.log(msg); 
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
                    <div class="lomi-avatar-wrap"><div class="lomi-avatar"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12h4l2-7 4 14 2-7h6"/></svg></div></div>
                    <div class="lomi-header-info"><div class="lomi-header-title">لومي</div><div class="lomi-header-status"><span class="lomi-status-dot" id="lomiStatusDot"></span><span id="lomiStatusText">متصل بمنصة LomedX</span></div></div>
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
                    <button class="lomi-voice-btn" id="lomiVoiceBtn">${ICONS.mic}</button>
                    <button class="lomi-send-btn" id="lomiSendBtn" disabled>${ICONS.send}</button>
                </div>
                <footer class="lomi-disclaimer">${ICONS.shield}<span>للتوعية الصحية فقط — <strong>لا يغني عن استشارة الطبيب</strong></span></footer>
            </div>
        `;
        document.body.appendChild(overlay);

        refs = {
            messages: document.getElementById('lomiMessages'),
            input: document.getElementById('lomiInput'),
            sendBtn: document.getElementById('lomiSendBtn'),
            voiceBtn: document.getElementById('lomiVoiceBtn'),
            statusText: document.getElementById('lomiStatusText'),
            statusDot: document.getElementById('lomiStatusDot'),
            chips: document.getElementById('lomiChips'),
            charCounter: document.getElementById('lomiCharCounter'),
            clearBtn: document.getElementById('lomiClearBtn'),
            closeBtn: document.getElementById('lomiCloseBtn')
        };

        bindEvents();
        initVoice();
        showWelcome();
    }

    // ═══ الأحداث ═══
    function bindEvents() {
        document.getElementById('lomiCloseBtn').addEventListener('click', () => window.closeLomi());
        document.getElementById('lomiOverlay').addEventListener('click', (e) => { if (e.target.id === 'lomiOverlay') window.closeLomi(); });
        
        document.getElementById('lomiClearBtn').addEventListener('click', () => {
            if (isSending) return;
            messageHistory = []; refs.messages.innerHTML = ''; showWelcome();
        });

        refs.input.addEventListener('input', () => {
            refs.input.style.height = 'auto'; refs.input.style.height = Math.min(refs.input.scrollHeight, 130) + 'px';
            refs.sendBtn.disabled = !refs.input.value.trim() || isSending;
        });

        refs.input.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); if (!isSending) sendMessage(refs.input.value); } });
        refs.sendBtn.addEventListener('click', () => { isSending ? stopGeneration() : sendMessage(refs.input.value); });
        refs.voiceBtn.addEventListener('click', toggleVoice);
        refs.chips.querySelectorAll('.lomi-chip').forEach(c => c.addEventListener('click', () => sendMessage(c.dataset.q)));

        refs.messages.addEventListener('click', (e) => {
            const b = e.target.closest('.lomi-action-btn');
            if (b) handleMessageAction(b.dataset.action, b.closest('.lomi-msg').dataset.id);
        });
    }

    // ═══ منطق الرسائل ═══
    function showWelcome() {
        const el = createAssistantMessage('');
        el.bubble.innerHTML = formatText(`أهلاً بك في **منصة LomedX** 👋\n\nأنا **لومي**، مساعدك الطبي الذكي.\n\nجرّب أن تكتب:\n• "أبحث عن دواء"\n• "حاسبة جرعة طفلي"\n\n⚕️ للتوعية فقط — للطوارئ: 110`);
        messageHistory.push(el);
    }

    function createUserMessage(text) {
        const id = 'm_' + Date.now();
        const el = document.createElement('div'); el.className = 'lomi-msg user'; el.dataset.id = id;
        el.innerHTML = `<div class="lomi-bubble">${formatText(text)}</div><div class="lomi-msg-actions"><button class="lomi-action-btn" data-action="edit">${ICONS.edit}</button><button class="lomi-action-btn" data-action="copy">${ICONS.copy}</button></div>`;
        refs.messages.appendChild(el); refs.messages.scrollTop = refs.messages.scrollHeight;
        return { id, role: 'user', content: text, element: el };
    }

    function createAssistantMessage(text = '') {
        const id = 'm_' + Date.now() + Math.random();
        const el = document.createElement('div'); el.className = 'lomi-msg assistant'; el.dataset.id = id;
        el.innerHTML = `<div class="lomi-msg-row"><div class="lomi-bubble"></div></div>`;
        refs.messages.appendChild(el);
        return { id, role: 'assistant', content: text, element: el, bubble: el.querySelector('.lomi-bubble') };
    }

    function renderAssistantFinal(entry, fullText) {
        const { cleanText, features } = extractFeatures(fullText);
        entry.content = cleanText;
        entry.bubble.innerHTML = formatText(cleanText);
        if (features.length > 0) {
            const a = document.createElement('div'); a.className = 'lomi-feature-actions'; a.innerHTML = features.map(buildFeatureButton).join(''); entry.element.appendChild(a);
        }
        const acts = document.createElement('div'); acts.className = 'lomi-msg-actions';
        acts.innerHTML = `<button class="lomi-action-btn" data-action="copy">${ICONS.copy}</button><button class="lomi-action-btn" data-action="regen">${ICONS.regen}</button>`;
        entry.element.querySelector('.lomi-msg-row').appendChild(acts);
        refs.messages.scrollTop = refs.messages.scrollHeight;
    }

    function handleMessageAction(action, msgId) {
        const idx = messageHistory.findIndex(m => m.id === msgId); if (idx === -1) return;
        const msg = messageHistory[idx];
        if (action === 'copy') { navigator.clipboard.writeText(msg.content); return; }
        if (action === 'edit' && msg.role === 'user') {
            messageHistory.splice(idx).forEach(m => m.element.remove());
            refs.input.value = msg.content; refs.sendBtn.disabled = false; refs.input.focus();
        }
        if (action === 'regen' && msg.role === 'assistant') {
            let uIdx = idx - 1; while(uIdx >= 0 && messageHistory[uIdx].role !== 'user') uIdx--;
            if (uIdx >= 0) { const t = messageHistory[uIdx].content; messageHistory.splice(uIdx).forEach(m => m.element.remove()); sendMessage(t); }
        }
    }

    // ═══ الإرسال ═══
    async function sendMessage(text) {
        if (!text?.trim() || isSending) return;
        refs.input.value = ''; refs.input.style.height = '48px'; refs.sendBtn.disabled = true; isSending = true; refs.sendBtn.innerHTML = ICONS.stop; refs.sendBtn.classList.add('stop');
        refs.statusText.textContent = 'يكتب...'; refs.statusDot.classList.add('busy');

        const userEntry = createUserMessage(text); messageHistory.push(userEntry);
        const typing = document.createElement('div'); typing.className = 'lomi-msg assistant'; typing.id = 'lomiTyping';
        typing.innerHTML = `<div class="lomi-typing"><span></span><span></span><span></span><span style="font-size:12px; color:#64748B; margin-right:6px;">يكتب</span></div>`;
        refs.messages.appendChild(typing); refs.messages.scrollTop = refs.messages.scrollHeight;

        let assistantEntry = null, accumulated = ''; currentAbortController = new AbortController();

        try {
            const res = await fetch(CONFIG.functionUrl, {
                method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${CONFIG.anonKey}` },
                signal: currentAbortController.signal,
                body: JSON.stringify({ 
                    message: text, 
                    history: messageHistory.map(m=>({role:m.role,content:m.content})).slice(-8),
                    fingerprint: 'web' 
                })
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
                    } catch(e) {}
                }
            }
            typing.remove(); if (assistantEntry) renderAssistantFinal(assistantEntry, accumulated);
            refs.statusText.textContent = 'متصل'; refs.statusDot.classList.remove('busy');
        } catch (err) {
            typing.remove(); if (err.name !== 'AbortError') refs.statusText.textContent = 'خطأ';
        } finally {
            isSending = false; refs.sendBtn.innerHTML = ICONS.send; refs.sendBtn.classList.remove('stop'); refs.sendBtn.disabled = !refs.input.value.trim(); refs.statusDot.classList.remove('busy');
        }
    }

    function stopGeneration() { if (currentAbortController) currentAbortController.abort(); }

    // ═══ الصوت (تم إصلاحه) ═══
    function initVoice() {
        const SR = window.SpeechRecognition || window.webkitSpeechRecognition; 
        
        if (!SR) { 
            // إخفاء الزر إذا كان المتصفح لا يدعم الإدخال الصوتي
            if (refs.voiceBtn) refs.voiceBtn.style.display = 'none'; 
            return; 
        }
        
        recognition = new SR(); 
        recognition.lang = 'ar-SA'; 
        recognition.interimResults = true;
        
        // عند بدء الاستماع
        recognition.onstart = () => { 
            isListening = true; 
            voiceOriginalInput = refs.input.value; 
            refs.statusText.textContent = 'يستمع...'; 
            refs.statusDot.classList.add('busy');
            // تحويل لون الزر للأحمر ليوضح للمستخدم أنه يستمع الآن
            refs.voiceBtn.style.color = '#DC2626';
            refs.voiceBtn.style.background = '#FEE2E2';
        };
        
        // أثناء الاستماع وتحويل الصوت لنص
        recognition.onresult = (e) => {
            let interim = '', final = '';
            for (let i = e.resultIndex; i < e.results.length; i++) { 
                if (e.results[i].isFinal) final += e.results[i][0].transcript; 
                else interim += e.results[i][0].transcript; 
            }
            if (final) voiceOriginalInput += final; 
            refs.input.value = voiceOriginalInput + interim; 
            refs.sendBtn.disabled = false;
        };
        
        // عند حدوث خطأ (مثل عدم إعطاء إذن المايك)
        recognition.onerror = (e) => {
            if (e.error === 'not-allowed') {
                alert('الرجاء السماح للمتصفح باستخدام الميكروفون من إعدادات الموقع.');
            } else if (e.error === 'no-speech') {
                console.log('لم يتم التقاط أي صوت.');
            }
        };

        // عند انتهاء الاستماع
        recognition.onend = () => { 
            isListening = false; 
            refs.statusText.textContent = 'متصل'; 
            refs.statusDot.classList.remove('busy');
            // إعادة الزر للونه الطبيعي
            refs.voiceBtn.style.color = '';
            refs.voiceBtn.style.background = '';
        };
    }
    
    function toggleVoice() { 
        if (!recognition) return; 
        if (isListening) {
            recognition.stop(); 
        } else {
            try {
                recognition.start();
            } catch(e) {
                alert('تعذر تشغيل الميكروفون. قد يكون مستخدماً من تطبيق آخر.');
            }
        }
    }

    // ═══ الدوال العامة للفتح والإغلاق ═══
    window.openLomi = function() {
        buildUI();
        document.getElementById('lomiOverlay').classList.add('active');
        document.body.style.overflow = 'hidden'; // منع تمرير الخلفية
        setTimeout(() => refs.input?.focus(), 300);
    };

    window.closeLomi = function() {
        const overlay = document.getElementById('lomiOverlay');
        if (overlay) overlay.classList.remove('active');
        document.body.style.overflow = '';
        if (isSending) stopGeneration();
    };
})();
