import { supabaseUrl, supabaseKey } from './supabase.js';

(function() {
    'use strict';

    const CONFIG = {
        functionUrl: `${supabaseUrl}/functions/v1/ai-assistant`,
        anonKey: supabaseKey,
        maxHistory: 8,
    };

    const FEATURES = {
        'medicine-finder': { icon: '💊', title: 'باحث الأدوية', sub: 'استعلم عن توفر الدواء ضمن الصيدليات', route: '/medicine-finder' },
        'book-doctor': { icon: '📅', title: 'حجز موعد طبي', sub: 'نسق زيارتك مع نخبة الأطباء', route: '/' },
        'blood-bank': { icon: '🩸', title: 'بنك الدم الإقليمي', sub: 'سجل تبرع أو اطلب فصيلة طارئة', route: '/blood-bank' },
        'health-file': { icon: '📁', title: 'الملف الصحي المشفر', sub: 'سجلك الطبي المؤمن برمز QR', route: '/health-file' },
        'first-aid': { icon: '🚑', title: 'دليل الإسعافات الأولية', sub: 'إرشادات منهجية للحالات الحرجة', route: '/first-aid' },
        'burn-calculator': { icon: '🔥', title: 'حاسبة الحروق', sub: 'التعامل الإسعافي السريع مع الإصابات', route: '/burn-calculator' },
        'pregnancy-calc': { icon: '🤰', title: 'حاسبة الحمل والولادة', sub: 'متابعة المراحل الأسبوعية للجنين', route: '/pregnancy-calc' },
        'dose-calc': { icon: '💉', title: 'حاسبة الجرعات الآمنة', sub: 'حسابات دقيقة للأطفال حسب الوزن', route: '/dose-calc' },
        'vaccine-scheduler': { icon: '🗓️', title: 'جدول اللقاحات', sub: 'البرنامج الوطني لتطعيم الأطفال', route: '/vaccine-scheduler' },
        'health-calc': { icon: '⚖️', title: 'مؤشرات الجسم (BMI)', sub: 'حساب السعرات ومؤشر الكتلة', route: '/health-calc' },
        'water-calc': { icon: '💧', title: 'معدل الترطيب اليومي', sub: 'حساب احتياج الجسم للماء', route: '/water-calc' },
        'med-renewal': { icon: '🔄', title: 'تنبيهات تجديد الدواء', sub: 'متى تنفد عبوة دوائك الحالية؟', route: '/med-renewal-calc' },
        'med-symbols': { icon: '🧪', title: 'دليل الروشتات والتحاليل', sub: 'تفسير الرموز الطبية المخبرية', route: '/med-symbols' },
        'chronic-nutrition': { icon: '🥗', title: 'تغذية الأمراض المزمنة', sub: 'أنظمة غذائية مصممة خصيصاً', route: '/chronic-nutrition' },
        'pre-visit': { icon: '📋', title: 'استعداد زيارة الطبيب', sub: 'أسئلة ونقاط لطرحها بالعيادة', route: '/pre-visit-guide' },
        'pre-test': { icon: '🔬', title: 'تعليمات ما قبل التحاليل', sub: 'ضوابط الصيام والتحضير المخبري', route: '/pre-test-guide' },
        'food-interactions': { icon: '⚠️', title: 'التداخلات الدوائية والغذائية', sub: 'أدوية لا تتوافق مع أطعمة معينة', route: '/food-interactions' },
        'patient-reminder': { icon: '⏰', title: 'المنظم العلاجي الذكي', sub: 'مواعيد الأدوية والتذكيرات اليومية', route: '/patient-reminder' },
        'seasonal-diseases': { icon: '🌡️', title: 'رصد الأمراض الموسمية', sub: 'حالة الطقس الصحي في القلمون', route: '/seasonal-diseases' },
        'medical-map': { icon: '🗺️', title: 'الخريطة الطبية التفاعلية', sub: 'تحديد المرافق الصحية القريبة', route: '/medical-map' },
        'medicine-donation': { icon: '🩺', title: 'بنك الأجهزة والمستلزمات', sub: 'تكافل تداول الأدوات الطبية', route: '/medicine-donation' },
        'raheba-radar': { icon: '📡', title: 'الرادار الصحي الموضعي', sub: 'مؤشرات الصحة العامة بالمنطقة', route: '/raheba-radar' },
        'ask-doctor': { icon: '👨‍⚕️', title: 'الاستشارة الطبية المباشرة', sub: 'توجيه استفسارك لطبيب مختص', route: '/ask-doctor' },
        'blog': { icon: '📰', title: 'المدونة الطبية الموثوقة', sub: 'مقالات وأبحاث طبية محكّمة', route: '/blog' },
        'events-first-aid': { icon: '🎉', title: 'إسعافات التجمعات والمناسبات', sub: 'التعامل مع الطوارئ العارضة', route: '/events-first-aid' }
    };

    const ICONS = {
        copy: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>',
        edit: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>',
        regen: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><path d="M1 4v6h6M23 20v-6h-6"/><path d="M20.49 9A9 9 0 005.64 5.64L1 10M23 14l-4.64 4.36A9 9 0 013.51 15"/></svg>',
        send: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" width="18" height="18"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/></svg>',
        stop: '<svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16"><rect x="6" y="6" width="12" height="12" rx="2"/></svg>'
    };

    let messageHistory = [];
    let isSending = false;
    let currentAbortController = null;
    let recognition = null;
    let isListening = false;
    let voiceOriginalInput = '';
    let refs = {};
    let isBuilt = false;

    function formatText(t) {
        if (!t) return '';
        return t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
            .replace(/^• /gm, '<span class="lomi-bullet">• </span>');
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
        const f = FEATURES[id]; if (!f) return '';
        return `<a href="${f.route}" class="lomi-feature-card">
            <div class="lomi-fc-icon">${f.icon}</div>
            <div class="lomi-fc-content">
                <div class="lomi-fc-title">${f.title}</div>
                <div class="lomi-fc-sub">${f.sub}</div>
            </div>
            <div class="lomi-fc-arrow">←</div>
        </a>`;
    }

    // ═══ بناء الواجهة ═══
    function buildUI() {
        if (isBuilt) return;

        const overlay = document.createElement('div');
        overlay.className = 'lomi-overlay';
        overlay.id = 'lomiOverlay';
        overlay.innerHTML = `
            <div class="lomi-app-container">
                <header class="lomi-header">
                    <div class="lomi-header-avatar">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12h4l2-7 4 14 2-7h6"/></svg>
                    </div>
                    <div class="lomi-header-details">
                        <div class="lomi-header-title">لومي الذكي</div>
                        <div class="lomi-header-status">
                            <span class="lomi-status-dot" id="lomiStatusDot"></span>
                            <span id="lomiStatusText">متصل بالمنصة الطبية</span>
                        </div>
                    </div>
                    <div class="lomi-header-actions">
                        <button class="lomi-h-btn" id="lomiNewChatBtn" title="محادثة جديدة">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><path d="M12 5v14M5 12h14"/></svg>
                        </button>
                        <button class="lomi-h-btn" id="lomiCloseBtn" title="إغلاق">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><path d="M18 6L6 18M6 6l12 12"/></svg>
                        </button>
                    </div>
                </header>

                <div class="lomi-chat-body" id="lomiMessagesContainer"></div>

                <div class="lomi-chips-row" id="lomiChipsRow">
                    <button class="lomi-chip" data-q="أبحث عن دواء متوفر"><span>💊</span> باحث الأدوية</button>
                    <button class="lomi-chip" data-q="كيف أحسب جرعة الدواء لطفلي؟"><span>💉</span> حاسبة الجرعات</button>
                    <button class="lomi-chip" data-q="أريد حجز موعد عاجل مع طبيب"><span>📅</span> حجز موعد</button>
                    <button class="lomi-chip" data-q="ما هي الإسعافات الأولية للحروق؟"><span>🔥</span> حاسبة الحروق</button>
                    <button class="lomi-chip" data-q="أعاني من أعراض صحية مقلقة"><span>🩺</span> استشارة أعراض</button>
                </div>

                <div class="lomi-input-footer">
                    <div class="lomi-textarea-wrapper">
                        <textarea id="lomiTextarea" class="lomi-textarea" placeholder="اطرح استفسارك الطبي أو اطلب الخدمة..." rows="1" maxlength="1000"></textarea>
                    </div>
                    <button class="lomi-action-icon-btn lomi-mic-btn" id="lomiVoiceBtn" title="إدخال صوتي">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><path d="M12 2a3 3 0 00-3 3v7a3 3 0 006 0V5a3 3 0 00-3-3z"/><path d="M19 10v2a7 7 0 01-14 0v-2M12 19v3"/></svg>
                    </button>
                    <button class="lomi-action-icon-btn lomi-send-btn" id="lomiSendBtn" disabled title="إرسال">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" width="18" height="18"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/></svg>
                    </button>
                </div>

                <footer class="lomi-legal-footer">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M9 12l2 2 4-4"/></svg>
                    <span>للتوعية الصحية — <strong>لا يُغني عن الفحص السريري واستشارة الطبيب</strong></span>
                </footer>
            </div>
        `;
        document.body.appendChild(overlay);

        refs = {
            overlay,
            messages: document.getElementById('lomiMessagesContainer'),
            textarea: document.getElementById('lomiTextarea'),
            sendBtn: document.getElementById('lomiSendBtn'),
            voiceBtn: document.getElementById('lomiVoiceBtn'),
            statusText: document.getElementById('lomiStatusText'),
            statusDot: document.getElementById('lomiStatusDot'),
            closeBtn: document.getElementById('lomiCloseBtn'),
            newChatBtn: document.getElementById('lomiNewChatBtn'),
            chipsRow: document.getElementById('lomiChipsRow')
        };

        bindEvents();
        initSpeechRecognition();
        isBuilt = true;
    }

    // ═══ الأحداث ═══
    function bindEvents() {
        refs.closeBtn.addEventListener('click', window.closeLomi);
        refs.overlay.addEventListener('click', (e) => { if (e.target === refs.overlay) window.closeLomi(); });

        refs.newChatBtn.addEventListener('click', () => {
            if (isSending) return;
            messageHistory = [];
            refs.messages.innerHTML = '';
            renderWelcomeMessage();
        });

        refs.textarea.addEventListener('input', () => {
            refs.textarea.style.height = 'auto';
            refs.textarea.style.height = Math.min(refs.textarea.scrollHeight, 120) + 'px';
            refs.sendBtn.disabled = !refs.textarea.value.trim() && !isSending;
        });

        refs.textarea.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                if (!isSending && refs.textarea.value.trim()) sendMessage(refs.textarea.value);
            }
        });

        refs.sendBtn.addEventListener('click', () => {
            if (isSending) {
                if (currentAbortController) currentAbortController.abort();
            } else {
                const text = refs.textarea.value.trim();
                if (text) sendMessage(text);
            }
        });

        refs.chipsRow.querySelectorAll('.lomi-chip').forEach(chip => {
            chip.addEventListener('click', () => sendMessage(chip.dataset.q));
        });

        refs.messages.addEventListener('click', (e) => {
            const btn = e.target.closest('.lomi-tool-btn');
            if (btn) handleMessageAction(btn.dataset.action, btn.closest('.lomi-msg').dataset.id);
        });
    }

    // ═══ منطق الرسائل ═══
    function renderWelcomeMessage() {
        const entry = createAssistantMsgNode('');
        entry.bubble.innerHTML = formatText(`أهلاً بك في منصة **LomedX** الطبية المتقدمة 👋\n\nأنا **لومي**، مساعدك الطبي الذكي لربطك بالخدمات الصحية.\n\nيمكنك سؤالِي عن:\n• توفر الأدوية ضمن الصيدليات المناوبة\n• حساب جرعات الأطفال أو متابعة الحمل\n• الاستعلام عن المواعيد والتحاليل الطبية\n\nكيف يمكنني مساعدتك اليوم؟`);
        messageHistory.push(entry);
    }

    function createUserMsgNode(text) {
        const id = 'msg_' + Date.now();
        const el = document.createElement('div');
        el.className = 'lomi-msg user';
        el.dataset.id = id;
        el.innerHTML = `
            <div class="lomi-bubble">${formatText(text)}</div>
            <div class="lomi-msg-tools">
                <button class="lomi-tool-btn" data-action="edit" title="تعديل">${ICONS.edit}</button>
                <button class="lomi-tool-btn" data-action="copy" title="نسخ">${ICONS.copy}</button>
            </div>
        `;
        refs.messages.appendChild(el);
        refs.messages.scrollTop = refs.messages.scrollHeight;
        return { id, role: 'user', content: text, node: el };
    }

    function createAssistantMsgNode(text = '') {
        const id = 'msg_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
        const el = document.createElement('div');
        el.className = 'lomi-msg assistant';
        el.dataset.id = id;
        el.innerHTML = `
            <div class="lomi-bubble">${formatText(text)}</div>
            <div class="lomi-msg-tools">
                <button class="lomi-tool-btn" data-action="copy" title="نسخ">${ICONS.copy}</button>
                <button class="lomi-tool-btn" data-action="regen" title="إعادة توليد">${ICONS.regen}</button>
            </div>
        `;
        refs.messages.appendChild(el);
        refs.messages.scrollTop = refs.messages.scrollHeight;
        return { id, role: 'assistant', content: text, node: el, bubble: el.querySelector('.lomi-bubble') };
    }

    function finalizeAssistantResponse(entry, fullText) {
        const { cleanText, features } = extractFeatures(fullText);
        entry.content = cleanText;
        entry.bubble.innerHTML = formatText(cleanText);
        if (features.length > 0) {
            const grid = document.createElement('div');
            grid.className = 'lomi-features-grid';
            grid.innerHTML = features.map(buildFeatureButton).join('');
            entry.node.insertBefore(grid, entry.node.querySelector('.lomi-msg-tools'));
        }
        refs.messages.scrollTop = refs.messages.scrollHeight;
    }

    function handleMessageAction(action, msgId) {
        const index = messageHistory.findIndex(m => m.id === msgId);
        if (index === -1) return;
        const msg = messageHistory[index];

        if (action === 'copy') { navigator.clipboard.writeText(msg.content); return; }
        if (action === 'edit' && msg.role === 'user') {
            messageHistory.splice(index).forEach(m => m.node.remove());
            refs.textarea.value = msg.content;
            refs.textarea.style.height = 'auto';
            refs.textarea.style.height = Math.min(refs.textarea.scrollHeight, 120) + 'px';
            refs.sendBtn.disabled = false;
            refs.textarea.focus();
        }
        if (action === 'regen' && msg.role === 'assistant') {
            let uIdx = index - 1;
            while (uIdx >= 0 && messageHistory[uIdx].role !== 'user') uIdx--;
            if (uIdx >= 0) {
                const userText = messageHistory[uIdx].content;
                messageHistory.splice(uIdx).forEach(m => m.node.remove());
                sendMessage(userText);
            }
        }
    }

    // ═══ الإرسال ═══
    async function sendMessage(text) {
        if (!text.trim() || isSending) return;

        refs.textarea.value = '';
        refs.textarea.style.height = '48px';
        refs.sendBtn.disabled = true;
        isSending = true;
        refs.sendBtn.innerHTML = ICONS.stop;
        refs.sendBtn.classList.add('stop');
        refs.statusText.textContent = 'جاري التحليل...';
        refs.statusDot.classList.add('busy');

        const userEntry = createUserMsgNode(text);
        messageHistory.push(userEntry);

        const typingEl = document.createElement('div');
        typingEl.className = 'lomi-msg assistant';
        typingEl.id = 'lomiTypingIndicator';
        typingEl.innerHTML = `<div class="lomi-typing-indicator"><span></span><span></span><span></span><span class="lomi-typing-label">لومي يكتب...</span></div>`;
        refs.messages.appendChild(typingEl);
        refs.messages.scrollTop = refs.messages.scrollHeight;

        let assistantEntry = null, accumulatedText = '';
        currentAbortController = new AbortController();

        try {
            const response = await fetch(CONFIG.functionUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${CONFIG.anonKey}` },
                signal: currentAbortController.signal,
                body: JSON.stringify({
                    message: text,
                    history: messageHistory.map(m => ({ role: m.role, content: m.content })).slice(-CONFIG.maxHistory),
                    fingerprint: 'web-client'
                })
            });

            if (!response.ok) throw new Error('فشل الاتصال');
            const reader = response.body.getReader(); const decoder = new TextDecoder(); let buffer = '';

            while (true) {
                const { done, value } = await reader.read(); if (done) break;
                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n'); buffer = lines.pop() || '';

                for (const line of lines) {
                    if (!line.startsWith('data:')) continue;
                    const jsonStr = line.slice(5).trim();
                    if (!jsonStr || jsonStr === '[DONE]') continue;

                    try {
                        const parsed = JSON.parse(jsonStr);
                        const chunk = parsed.candidates?.[0]?.content?.parts?.[0]?.text;
                        if (chunk) {
                            if (!assistantEntry) {
                                typingEl.remove();
                                assistantEntry = createAssistantMsgNode('');
                                messageHistory.push(assistantEntry);
                            }
                            accumulatedText += chunk;
                            assistantEntry.bubble.textContent = extractFeatures(accumulatedText).cleanText;
                            refs.messages.scrollTop = refs.messages.scrollHeight;
                        }
                    } catch (err) {}
                }
            }
            typingEl.remove();
            if (assistantEntry) finalizeAssistantResponse(assistantEntry, accumulatedText);
            refs.statusText.textContent = 'متصل';
            refs.statusDot.classList.remove('busy');
        } catch (error) {
            typingEl.remove();
            if (error.name !== 'AbortError') {
                const errEntry = createAssistantMsgNode('عذراً، حدث خطأ أثناء معالجة استفسارك. يرجى التحقق من اتصالك والمحاولة مرة أخرى.');
                messageHistory.push(errEntry);
                refs.statusText.textContent = 'خطأ في الاتصال';
            }
        } finally {
            isSending = false;
            refs.sendBtn.innerHTML = ICONS.send;
            refs.sendBtn.classList.remove('stop');
            refs.sendBtn.disabled = !refs.textarea.value.trim();
            refs.statusDot.classList.remove('busy');
        }
    }

    // ═══ الصوت ═══
    function initSpeechRecognition() {
        const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRec) {
            if (refs.voiceBtn) refs.voiceBtn.style.display = 'none';
            return;
        }
        recognition = new SpeechRec();
        recognition.lang = 'ar-SA';
        recognition.interimResults = true;

        recognition.onstart = () => {
            isListening = true;
            voiceOriginalInput = refs.textarea.value;
            refs.statusText.textContent = 'جاري الاستماع...';
            refs.statusDot.classList.add('busy');
            refs.voiceBtn.classList.add('listening');
        };

        recognition.onresult = (e) => {
            let interim = '', final = '';
            for (let i = e.resultIndex; i < e.results.length; ++i) {
                if (e.results[i].isFinal) final += e.results[i][0].transcript;
                else interim += e.results[i][0].transcript;
            }
            if (final) voiceOriginalInput += final;
            refs.textarea.value = voiceOriginalInput + interim;
            refs.sendBtn.disabled = false;
        };

        recognition.onerror = (e) => {
            if (e.error === 'not-allowed') alert('يرجى السماح بالوصول إلى الميكروفون من إعدادات المتصفح.');
        };

        recognition.onend = () => {
            isListening = false;
            refs.statusText.textContent = 'متصل';
            refs.statusDot.classList.remove('busy');
            refs.voiceBtn.classList.remove('listening');
        };

        refs.voiceBtn.addEventListener('click', () => {
            if (!recognition) return;
            if (isListening) recognition.stop();
            else { try { recognition.start(); } catch (err) {} }
        });
    }

    // ═══ الدوال العامة ═══
    window.openLomi = function() {
        buildUI();
        refs.overlay.classList.add('active');
        document.body.style.overflow = 'hidden';
        if (messageHistory.length === 0) renderWelcomeMessage();
        setTimeout(() => refs.textarea?.focus(), 350);
    };

    window.closeLomi = function() {
        if (!isBuilt) return;
        refs.overlay.classList.remove('active');
        document.body.style.overflow = '';
        if (isSending && currentAbortController) currentAbortController.abort();
    };
})();
