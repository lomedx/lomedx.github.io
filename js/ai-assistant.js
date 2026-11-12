import { supabaseUrl, supabaseKey } from './supabase.js';

(function () {
    'use strict';

    /* ═══════════════════════════════════════════════════════════
       1. الإعدادات والثوابت
       ═══════════════════════════════════════════════════════════ */
    const CONFIG = {
        functionUrl: `${supabaseUrl}/functions/v1/ai-assistant`,
        anonKey: supabaseKey,
        maxHistory: 8,
        maxMessageLength: 1000,
        historyLimit: 50,
        domLimit: 30,
        maxBufferSize: 100 * 1024,
        duplicateWindowMs: 3000,
        cacheTtl: 24 * 60 * 60 * 1000,
        cacheMaxEntries: 50,
        singleResultAutoOpenMs: 1200
    };

    const STORAGE_KEYS = {
        conversations: 'lomi_conversations',
        cache: 'lomi_response_cache',
        unsentInput: 'lomi_unsent_input',
        userCity: 'lomedx_user_city'
    };

    /* ═══════════════════════════════════════════════════════════
       2. الحالة العامة
       ═══════════════════════════════════════════════════════════ */
    let messageHistory = [];
    let isSending = false;
    let currentAbortController = null;
    let refs = {};
    let currentConversationId = null;
    let lastAnalyticsId = null;
    let lastSentMessages = [];

    const activeTimeouts = new Set();

    /* ═══════════════════════════════════════════════════════════
       3. الميزات (Features Map)
       ═══════════════════════════════════════════════════════════ */
    const FEATURES = {
        'medicine-finder': { icon: '💊', title: 'باحث الأدوية', sub: 'ابحث عن دوائك في صيدليات مدينتك', route: '/medicine-finder' },
        'book-doctor': { icon: '📅', title: 'حجز موعد', sub: 'احجز مع طبيب متخصص', handler: 'redirectToDoctorsSearch' },
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
        'events-first-aid': { icon: '🎉', title: 'إسعافات المناسبات', sub: 'حوادث الأفراح والتجمعات', route: '/events-first-aid' },
        'add-facility': { icon: '🏥', title: 'أضف منشأتك', sub: 'سجل مجاناً في المنصة', route: '/add-facility' },
        'contact': { icon: '📞', title: 'تواصل معنا', sub: 'الدعم الفني والاستفسارات', route: '/contact' },
        'social-facebook': { icon: '📘', title: 'فيسبوك', sub: 'تابعنا على فيسبوك', url: 'https://www.facebook.com/share/1GLT1xyBPA/' },
        'social-instagram': { icon: '📸', title: 'إنستغرام', sub: 'تابعنا على إنستغرام', url: 'https://www.instagram.com/lomed_x' },
        'join-doctor': { icon: '👨‍⚕️', title: 'اشتراك طبيب', sub: 'ارتقِ بعيادتك (ميزات متقدمة)', handler: 'join-doctor' },
        'join-pharmacy': { icon: '💊', title: 'اشتراك صيدلية', sub: 'حوّل صيدليتك لرقمية', handler: 'join-pharmacy' }
    };

    /* ═══════════════════════════════════════════════════════════
       4. الأيقونات (SVG)
       ═══════════════════════════════════════════════════════════ */
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

    /* ═══════════════════════════════════════════════════════════
       5. أدوات مساعدة (Utilities)
       ═══════════════════════════════════════════════════════════ */
    function escapeHtml(t) {
        return String(t || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function formatText(t) {
        return String(t || '')
            .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
            .replace(/^• /gm, '<span style="color:var(--brand-600);font-weight:700;">• </span>');
    }

    function normalizeArabic(str) {
        if (!str) return '';
        return String(str).toLowerCase()
            .replace(/[أإآ]/g, 'ا')
            .replace(/ى/g, 'ي')
            .replace(/ة/g, 'ه')
            .replace(/[\u064B-\u065F]/g, '')
            .replace(/[^\w\s\u0600-\u06FF]/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
    }

    function normalizeForCache(str) {
        return String(str || '').toLowerCase().trim().replace(/\s+/g, ' ');
    }

    function safeSetTimeout(callback, delay) {
        const id = setTimeout(() => {
            activeTimeouts.delete(id);
            try { callback(); } catch (e) {}
        }, delay);
        activeTimeouts.add(id);
        return id;
    }

    function clearAllTimeouts() {
        activeTimeouts.forEach(id => clearTimeout(id));
        activeTimeouts.clear();
    }

    function showLomiToast(message, isError = false) {
        const existing = document.getElementById('lomiToast');
        if (existing) existing.remove();

        const toast = document.createElement('div');
        toast.id = 'lomiToast';
        toast.style.cssText = `
            position: fixed; bottom: 100px; left: 50%; transform: translateX(-50%);
            background: ${isError ? '#DC2626' : '#059669'}; color: white;
            padding: 10px 20px; border-radius: 12px; font-size: 13px;
            z-index: 9999999; font-weight: 600; box-shadow: 0 8px 24px rgba(0,0,0,0.2);
            font-family: 'IBM Plex Sans Arabic', sans-serif; direction: rtl;
            pointer-events: none; opacity: 0; transition: opacity 0.2s;
        `;
        toast.textContent = message;
        document.body.appendChild(toast);
        requestAnimationFrame(() => { toast.style.opacity = '1'; });

        safeSetTimeout(() => {
            toast.style.opacity = '0';
            safeSetTimeout(() => toast.remove(), 300);
        }, 2000);
    }

    function showLomiError(message) {
        const entry = createAssistantMessage('');
        entry.bubble.innerHTML = `<div style="display:flex;gap:10px;align-items:flex-start;">
            <span style="font-size:20px;flex-shrink:0;">⚠️</span>
            <div style="color:#991B1B;">${escapeHtml(message)}</div>
        </div>`;
        entry.bubble.style.background = '#FEF2F2';
        entry.bubble.style.borderColor = '#FCA5A5';
        pushMessage(entry);
        scrollToBottom();
    }

    function scrollToBottom() {
        if (refs.messages) refs.messages.scrollTop = refs.messages.scrollHeight;
    }

    /* ═══════════════════════════════════════════════════════════
       6. البحث في الكيانات
       ═══════════════════════════════════════════════════════════ */
    function searchEntities(type, query) {
        let data = window.allData;
        if (!data) {
            try { data = JSON.parse(localStorage.getItem('cached_listings') || '[]'); }
            catch { data = []; }
        }
        if (!Array.isArray(data) || data.length === 0) return [];

        const qNorm = normalizeArabic(query);
        const qWords = qNorm.split(' ').filter(w => w.length > 1);

        const typeMap = {
            doctor: ['doctor'], pharmacy: ['pharmacy'], lab: ['lab'],
            center: ['center', 'clinic'], hospital: ['hospital'],
            all: ['doctor', 'pharmacy', 'lab', 'center', 'hospital']
        };
        const types = typeMap[type] || [type];

        const synonyms = {
            'فيزياء': ['فيزيائي', 'طبيعي', 'علاج طبيعي', 'rehab'],
            'فيزيائي': ['فيزياء', 'طبيعي', 'علاج طبيعي'],
            'اسنان': ['أسنان', 'سن', 'فم', 'dentist'],
            'قلب': ['قلبية', 'قلبي', 'اوعية'],
            'عيون': ['عين', 'بصر', 'رؤية'],
            'جلد': ['جلدية', 'بشرة'],
            'اطفال': ['طفل', 'حديثي الولادة', 'pediatric'],
            'نسا': ['نسائية', 'توليد', 'حمل']
        };

        let expandedWords = [...qWords];
        qWords.forEach(w => {
            if (synonyms[w]) expandedWords.push(...synonyms[w].map(normalizeArabic));
        });

        return data.filter(item => {
            if (!types.includes(item.type)) return false;
            const targetStr = normalizeArabic(
                `${item.name || ''} ${item.specialty || ''} ${item.address || item.clinic || ''} ${item.services || ''} ${item.tests || ''}`
            );
            if (targetStr.includes(qNorm)) return true;
            let matchCount = 0;
            qWords.forEach(w => {
                if (expandedWords.some(ew => targetStr.includes(ew))) matchCount++;
            });
            return matchCount >= Math.ceil(qWords.length / 2) && matchCount > 0;
        }).sort((a, b) => {
            const aStr = normalizeArabic(`${a.name} ${a.specialty}`);
            const bStr = normalizeArabic(`${b.name} ${b.specialty}`);
            return (bStr.includes(qNorm) ? 1 : 0) - (aStr.includes(qNorm) ? 1 : 0);
        });
    }

    function buildEntityCard(item) {
        const icons = { doctor: '👨‍⚕️', pharmacy: '💊', lab: '🧪', center: '🏥', hospital: '🏨' };
        const labels = { doctor: 'طبيب', pharmacy: 'صيدلية', lab: 'مخبر', center: 'مركز', hospital: 'مشفى' };

        const avatarHTML = item.image
            ? `<img src="${escapeHtml(item.image)}" class="lomi-entity-avatar" onerror="this.outerHTML='<div class=\\'lomi-entity-avatar-fallback\\'>${icons[item.type] || '📍'}</div>'">`
            : `<div class="lomi-entity-avatar-fallback">${icons[item.type] || '📍'}</div>`;

        let statusBadge = '';
        if (['pharmacy', 'doctor', 'clinic'].includes(item.type) && item.isopen !== undefined && item.isopen !== null) {
            statusBadge = item.isopen === true
                ? `<span class="lomi-entity-status open"><span class="dot"></span>مفتوح</span>`
                : `<span class="lomi-entity-status closed"><span class="dot"></span>مغلق</span>`;
        }

        return `<button class="lomi-entity-card" onclick="window.lomiOpenEntity('${escapeHtml(item.id)}')">
            ${avatarHTML}
            <div class="lomi-entity-body">
                <div class="lomi-entity-name">${escapeHtml(item.name)}</div>
                <div class="lomi-entity-meta">
                    <span class="lomi-entity-badge">${escapeHtml(labels[item.type] || 'طبي')}</span>
                    <span>${escapeHtml(item.specialty || item.address || item.clinic || '')}</span>
                    ${statusBadge}
                </div>
                ${item.rating ? `<div class="lomi-entity-rating">⭐ ${escapeHtml(item.rating)}</div>` : ''}
            </div>
            <div class="lomi-entity-action">عرض ←</div>
        </button>`;
    }

    function buildEntityResultsHTML(type, query) {
        const results = searchEntities(type, query);

        if (results.length === 0) {
            return `<div class="lomi-entity-results">
                <div class="lomi-entity-empty">🔍 لم أجد نتائج مطابقة لـ "<strong>${escapeHtml(query)}</strong>"<br><small>جرب بكلمة أخرى أو تصفح القائمة</small></div>
            </div>`;
        }

        if (results.length === 1) {
            safeSetTimeout(() => {
                const overlay = document.getElementById('lomiOverlay');
                if (!overlay?.classList.contains('active')) return;
                if (isSending) return;
                const lastMsg = messageHistory[messageHistory.length - 1];
                if (lastMsg?.role !== 'assistant') return;
                window.lomiOpenEntity(results[0].id);
            }, CONFIG.singleResultAutoOpenMs);

            return `<div class="lomi-entity-results">
                <div class="lomi-entity-loading">⏳ جاري فتح: <strong>${escapeHtml(results[0].name)}</strong>...</div>
            </div>`;
        }

        const initialItems = results.slice(0, 3);
        const remainingItems = results.slice(3);
        let html = `<div class="lomi-entity-results"><div class="lomi-entity-header">وجدت ${results.length} نتائج مطابقة:</div>`;
        html += initialItems.map(buildEntityCard).join('');

        if (remainingItems.length > 0) {
            const containerId = 'lomi_more_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);
            html += `<div id="${containerId}" style="display:none;">${remainingItems.map(buildEntityCard).join('')}</div>`;
            html += `<button class="lomi-show-more-btn" onclick="document.getElementById('${containerId}').style.display='block'; this.remove();">
                <span>عرض ${remainingItems.length} نتيجة أخرى</span>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M6 9l6 6 6-6"/></svg>
            </button>`;
        }
        html += `</div>`;
        return html;
    }

    /* ═══════════════════════════════════════════════════════════
       7. Handlers
       ═══════════════════════════════════════════════════════════ */
    window.lomiOpenEntity = function (id) {
        if (!id) return;
        window.closeLomi();
        safeSetTimeout(() => {
            try {
                if (typeof window.handleCardClick === 'function') {
                    window.handleCardClick({ stopPropagation: () => {} }, id);
                    return;
                }
                if (typeof window.openModal === 'function') {
                    window.openModal(id);
                }
            } catch (e) {}
        }, 300);
    };

    window.lomiRunHandler = function (handlerName) {
        window.closeLomi();
        safeSetTimeout(() => {
            try {
                if (handlerName === 'join-doctor' && typeof window.openJoinSubscription === 'function') {
                    window.openJoinSubscription('doctor');
                } else if (handlerName === 'join-pharmacy' && typeof window.openJoinSubscription === 'function') {
                    window.openJoinSubscription('pharmacy');
                } else if (typeof window[handlerName] === 'function') {
                    window[handlerName]();
                }
            } catch (e) {}
        }, 300);
    };

    /* ═══════════════════════════════════════════════════════════
       8. Features Rendering
       ═══════════════════════════════════════════════════════════ */
    function buildFeatureButton(id) {
        const f = FEATURES[id];
        if (!f) return '';

        if (f.url) {
            return `<a href="${escapeHtml(f.url)}" target="_blank" rel="noopener noreferrer" class="lomi-feature-btn" onclick="setTimeout(() => window.closeLomi(), 50)">
                <div class="lomi-feature-btn-icon">${f.icon}</div>
                <div class="lomi-feature-btn-text">
                    <div class="lomi-feature-btn-title">${escapeHtml(f.title)}</div>
                    <div class="lomi-feature-btn-sub">${escapeHtml(f.sub)}</div>
                </div>
                <div class="lomi-feature-btn-arrow"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3"/></svg></div>
            </a>`;
        }

        if (f.handler) {
            return `<button class="lomi-feature-btn" onclick="window.lomiRunHandler('${escapeHtml(f.handler)}')">
                <div class="lomi-feature-btn-icon">${f.icon}</div>
                <div class="lomi-feature-btn-text">
                    <div class="lomi-feature-btn-title">${escapeHtml(f.title)}</div>
                    <div class="lomi-feature-btn-sub">${escapeHtml(f.sub)}</div>
                </div>
                <div class="lomi-feature-btn-arrow"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><path d="M19 12H5M12 19l-7-7 7-7"/></svg></div>
            </button>`;
        }

        return `<a href="${escapeHtml(f.route)}" class="lomi-feature-btn" onclick="setTimeout(() => window.closeLomi(), 50)">
            <div class="lomi-feature-btn-icon">${f.icon}</div>
            <div class="lomi-feature-btn-text">
                <div class="lomi-feature-btn-title">${escapeHtml(f.title)}</div>
                <div class="lomi-feature-btn-sub">${escapeHtml(f.sub)}</div>
            </div>
            <div class="lomi-feature-btn-arrow"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><path d="M19 12H5M12 19l-7-7 7-7"/></svg></div>
        </a>`;
    }

    /* ═══════════════════════════════════════════════════════════
       9. Cache Engine
       ═══════════════════════════════════════════════════════════ */
    function getCacheKey(text, city) {
        const route = window.location.pathname;
        const device = window.innerWidth < 768 ? 'mobile' : 'desktop';
        return `${normalizeForCache(text)}|${city || ''}|${route}|${device}`;
    }

    function getCachedResponse(text, city) {
        try {
            const cache = JSON.parse(localStorage.getItem(STORAGE_KEYS.cache) || '{}');
            const entry = cache[getCacheKey(text, city)];
            if (entry && (Date.now() - entry.timestamp) < CONFIG.cacheTtl) {
                return entry.response;
            }
        } catch (e) {}
        return null;
    }

    function setCachedResponse(text, city, response) {
        try {
            const cache = JSON.parse(localStorage.getItem(STORAGE_KEYS.cache) || '{}');
            cache[getCacheKey(text, city)] = { response, timestamp: Date.now() };

            const keys = Object.keys(cache);
            if (keys.length > CONFIG.cacheMaxEntries) {
                keys.sort((a, b) => cache[a].timestamp - cache[b].timestamp)
                    .slice(0, 15)
                    .forEach(k => delete cache[k]);
            }
            localStorage.setItem(STORAGE_KEYS.cache, JSON.stringify(cache));
        } catch (e) {
            if (e.name === 'QuotaExceededError') {
                try { localStorage.removeItem(STORAGE_KEYS.cache); } catch {}
            }
        }
    }

    /* ═══════════════════════════════════════════════════════════
       10. Analytics
       ═══════════════════════════════════════════════════════════ */
    async function submitRating(rating, container) {
        if (!container) return;
        container.querySelectorAll('.rating-btn').forEach(b => b.disabled = true);
        const btn = container.querySelector(`[data-rating="${rating}"]`);
        if (btn) btn.classList.add('active');
        if (!lastAnalyticsId) return;
        try {
            await fetch(`${CONFIG.functionUrl}/rate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${CONFIG.anonKey}` },
                body: JSON.stringify({ analytics_id: lastAnalyticsId, rating })
            });
        } catch (e) {}
    }

    /* ═══════════════════════════════════════════════════════════
       11. City Helper
       ═══════════════════════════════════════════════════════════ */
    function getCurrentCity() {
        try {
            const saved = localStorage.getItem(STORAGE_KEYS.userCity);
            if (saved) return saved;
        } catch {}

        const btn = document.getElementById('currentCityText');
        if (btn) {
            const t = btn.innerText.trim();
            if (t && t !== 'كل المدن') return t;
        }
        const menuBtn = document.getElementById('menuCurrentCityText');
        if (menuBtn) {
            const t = menuBtn.innerText.trim();
            if (t && t !== 'كل المدن') return t;
        }
        return 'كل المدن';
    }

    /* ═══════════════════════════════════════════════════════════
       12. Conversations Management
       ═══════════════════════════════════════════════════════════ */
    function loadConversations() {
        try { return JSON.parse(localStorage.getItem(STORAGE_KEYS.conversations) || '[]'); }
        catch { return []; }
    }

    function saveConversations(list) {
        try { localStorage.setItem(STORAGE_KEYS.conversations, JSON.stringify(list)); }
        catch (e) {}
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
        const toSave = messageHistory
            .filter(m => m.content && String(m.content).trim())
            .map(m => ({ role: m.role, content: m.content }));
        if (toSave.length === 0) return;

        const list = loadConversations();
        const now = Date.now();

        if (currentConversationId) {
            const idx = list.findIndex(c => c.id === currentConversationId);
            if (idx !== -1) {
                list[idx].messages = toSave;
                list[idx].updatedAt = now;
                list[idx].title = getConversationTitle(toSave);
            }
        } else {
            currentConversationId = generateId();
            list.unshift({
                id: currentConversationId,
                title: getConversationTitle(toSave),
                messages: toSave,
                createdAt: now,
                updatedAt: now
            });
        }

        if (list.length > 50) list.length = 50;
        saveConversations(list);
    }

    function startNewConversation() {
        if (isSending) {
            showLomiToast('انتظر انتهاء الرد الحالي أو أوقفه أولاً', true);
            return;
        }
        if (currentAbortController) stopGeneration();

        saveCurrentConversation();
        currentConversationId = null;
        messageHistory = [];
        if (refs.messages) refs.messages.innerHTML = '';
        showWelcome();
        closeHistoryPanel();
    }

    function loadConversation(id) {
        if (isSending) {
            showLomiToast('انتظر انتهاء الرد الحالي', true);
            return;
        }
        const conv = loadConversations().find(c => c.id === id);
        if (!conv) return;

        currentConversationId = id;
        messageHistory = [];
        if (refs.messages) refs.messages.innerHTML = '';

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

        scrollToBottom();
        closeHistoryPanel();
    }

    function deleteConversation(id, e) {
        if (e) e.stopPropagation();

        if (currentConversationId === id && isSending) {
            showLomiToast('المحادثة قيد التوليد. أوقفها أولاً', true);
            return;
        }

        const list = loadConversations().filter(c => c.id !== id);
        saveConversations(list);

        if (currentConversationId === id) {
            currentConversationId = null;
            messageHistory = [];
            if (refs.messages) refs.messages.innerHTML = '';
            showWelcome();
        }
        renderHistoryList();
    }

    function openHistoryPanel() {
        renderHistoryList();
        const panel = document.getElementById('lomiHistoryPanel');
        if (panel) panel.classList.add('open');
    }

    function closeHistoryPanel() {
        const panel = document.getElementById('lomiHistoryPanel');
        if (panel) panel.classList.remove('open');
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
            const timeStr = date.toLocaleDateString('ar-SA', { day: 'numeric', month: 'short' }) + ' • ' +
                date.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' });
            const isActive = c.id === currentConversationId ? 'active' : '';
            return `<div class="lomi-history-item ${isActive}" data-id="${c.id}">
                <div class="lomi-history-item-icon">💬</div>
                <div class="lomi-history-item-body">
                    <div class="lomi-history-item-title">${escapeHtml(c.title)}</div>
                    <div class="lomi-history-item-meta"><span>${escapeHtml(timeStr)}</span></div>
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

    /* ═══════════════════════════════════════════════════════════
       13. UI Building
       ═══════════════════════════════════════════════════════════ */
    function buildUI() {
        const existing = document.getElementById('lomiOverlay');
        if (existing) {
            if (refs.messages && document.body.contains(refs.messages)) return;
            existing.remove();
            refs = {};
        }

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
                    <button class="lomi-chip" data-q="أريد طبيب جراحة عامة"><span>👨‍⚕️</span> جراحة</button>
                    <button class="lomi-chip" data-q="أبحث عن دواء"><span>💊</span> دواء</button>
                    <button class="lomi-chip" data-q="كيف أشترك في المنصة؟"><span>⭐</span> اشتراك</button>
                    <button class="lomi-chip" data-q="أريد طبيب أسنان"><span>🦷</span> أسنان</button>
                </div>
                <div class="lomi-input-area">
                    <div class="lomi-input-wrap">
                        <textarea id="lomiInput" class="lomi-input" placeholder="اكتب سؤالك الطبي..." rows="1" maxlength="1000"></textarea>
                        <div class="lomi-char-counter" id="lomiCharCounter">0 / 1000</div>
                    </div>
                    <button class="lomi-send-btn" id="lomiSendBtn" disabled>${ICONS.send}</button>
                </div>
                <footer class="lomi-disclaimer">
                    ${ICONS.shield}
                    <span>للتوعية الصحية فقط — <strong>لا يغني عن استشارة الطبيب</strong></span>
                </footer>
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
            </div>`;
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
    }

    function bindEvents() {
        document.getElementById('lomiCloseBtn').addEventListener('click', () => window.closeLomi());
        document.getElementById('lomiOverlay').addEventListener('click', (e) => {
            if (e.target.id === 'lomiOverlay') window.closeLomi();
        });
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

        refs.input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                if (!isSending) sendMessage(refs.input.value);
            }
        });

        refs.sendBtn.addEventListener('click', () => {
            if (isSending) stopGeneration();
            else sendMessage(refs.input.value);
        });

        refs.chips.querySelectorAll('.lomi-chip').forEach(c => {
            c.addEventListener('click', () => sendMessage(c.dataset.q));
        });

        refs.messages.addEventListener('click', (e) => {
            const b = e.target.closest('.lomi-action-btn');
            if (b && b.dataset.action) {
                handleMessageAction(b.dataset.action, b.closest('.lomi-msg')?.dataset.id);
            }
        });
    }

    /* ═══════════════════════════════════════════════════════════
       14. Messages Management
       ═══════════════════════════════════════════════════════════ */
    function pushMessage(entry) {
        messageHistory.push(entry);

        if (messageHistory.length > CONFIG.historyLimit) {
            const removed = messageHistory.splice(0, messageHistory.length - CONFIG.historyLimit);
            removed.forEach(m => m.element?.remove());
        }

        if (refs.messages) {
            const visible = refs.messages.querySelectorAll('.lomi-msg');
            if (visible.length > CONFIG.domLimit) {
                const toRemove = visible.length - CONFIG.domLimit;
                for (let i = 0; i < toRemove; i++) visible[i].remove();

                if (!refs.messages.querySelector('.lomi-truncated-notice')) {
                    const notice = document.createElement('div');
                    notice.className = 'lomi-truncated-notice';
                    notice.innerHTML = '<span>📜 تم طي الرسائل الأقدم</span>';
                    refs.messages.insertBefore(notice, refs.messages.firstChild);
                }
            }
        }
    }

    function showWelcome() {
        const el = createAssistantMessage('');
        const hour = new Date().getHours();
        const city = getCurrentCity();

        let smartSuggestion = '';
        if (hour >= 22 || hour < 6) {
            smartSuggestion = `🌙 <strong>صيدليات المناوبة الليلة</strong> في ${escapeHtml(city)} جاهزة. اسألني: "أريد صيدلية مناوبة"`;
        } else if (hour >= 6 && hour < 12) {
            smartSuggestion = `☀️ <strong>صباح الخير!</strong> هل تريد حجز موعد اليوم؟ اسألني: "أريد حجز موعد"`;
        } else if (hour >= 12 && hour < 17) {
            smartSuggestion = `💊 <strong>وقت الغداء</strong> — هل تحتاج حاسبة جرعات لطفلك؟`;
        } else {
            smartSuggestion = `👨‍⚕️ <strong>مساء الخير</strong> — هل تريد استشارة طبية سريعة؟ اسألني: "أريد اسأل طبيب"`;
        }

        el.bubble.innerHTML = formatText(
            `أهلاً وسهلاً فيك في **منصة LomedX** يا غالي! 🌹\n\nأنا **Lomi**، مساعدك الطبي الذكي.\n\n${smartSuggestion}\n`
        );
        pushMessage(el);
    }

    function createUserMessage(text) {
        const id = 'm_' + Date.now() + Math.random().toString(36).slice(2, 6);
        const el = document.createElement('div');
        el.className = 'lomi-msg user';
        el.dataset.id = id;
        el.innerHTML = `
            <div class="lomi-bubble">${formatText(text)}</div>
            <div class="lomi-msg-actions">
                <button class="lomi-action-btn" data-action="edit">${ICONS.edit}</button>
                <button class="lomi-action-btn" data-action="copy">${ICONS.copy}</button>
            </div>`;
        refs.messages.appendChild(el);
        scrollToBottom();
        return { id, role: 'user', content: text, element: el };
    }

    function createAssistantMessage(text = '') {
        const id = 'm_' + Date.now() + Math.random().toString(36).slice(2, 6);
        const el = document.createElement('div');
        el.className = 'lomi-msg assistant';
        el.dataset.id = id;
        el.innerHTML = `<div class="lomi-msg-row"><div class="lomi-bubble"></div></div>`;
        refs.messages.appendChild(el);
        return {
            id,
            role: 'assistant',
            content: text,
            element: el,
            bubble: el.querySelector('.lomi-bubble')
        };
    }

    function renderAssistantFinal(entry, fullText) {
        let textWithEntities = fullText;
        const features = [];

        textWithEntities = textWithEntities.replace(/\[OPEN:([\w-]+)\]/g, (match, id) => {
            if (FEATURES[id] && !features.includes(id)) features.push(id);
            return '';
        });

        const placeholders = [];
        textWithEntities = textWithEntities.replace(/\[FIND:(doctor|pharmacy|lab|center|hospital|all):([^\]]+)\]/g, (match, type, query) => {
            const html = buildEntityResultsHTML(type, query);
            const placeholder = `__ENT_${placeholders.length}__`;
            placeholders.push(html);
            return placeholder;
        });

        textWithEntities = textWithEntities.replace(/\[BLOG:([^\]]+)\]/g, (match, query) => {
            const html = `<div class="lomi-entity-results">
                <a href="/blog?search=${encodeURIComponent(query.trim())}" class="lomi-feature-btn" onclick="setTimeout(() => window.closeLomi(), 50)">
                    <div class="lomi-feature-btn-icon">📰</div>
                    <div class="lomi-feature-btn-text">
                        <div class="lomi-feature-btn-title">ابحث في المدونة: ${escapeHtml(query.trim())}</div>
                    </div>
                    <div class="lomi-feature-btn-arrow">←</div>
                </a>
            </div>`;
            const placeholder = `__ENT_${placeholders.length}__`;
            placeholders.push(html);
            return placeholder;
        });

        let finalHTML = formatText(textWithEntities);
        placeholders.forEach((html, index) => {
            finalHTML = finalHTML.replace(`__ENT_${index}__`, html);
        });

        entry.content = finalHTML;
        entry.bubble.innerHTML = finalHTML;

        if (features.length > 0) {
            const a = document.createElement('div');
            a.className = 'lomi-feature-actions';
            a.innerHTML = features.map(buildFeatureButton).join('');
            entry.element.appendChild(a);
        }

        const acts = document.createElement('div');
        acts.className = 'lomi-msg-actions';
        acts.innerHTML = `
            <button class="lomi-action-btn" data-action="copy">${ICONS.copy}</button>
            <button class="lomi-action-btn" data-action="regen">${ICONS.regen}</button>
            <button class="lomi-action-btn rating-btn" data-rating="1" title="مفيد">👍</button>
            <button class="lomi-action-btn rating-btn" data-rating="-1" title="غير مفيد">👎</button>`;
        entry.element.querySelector('.lomi-msg-row').appendChild(acts);

        acts.querySelectorAll('.rating-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                submitRating(parseInt(btn.dataset.rating), acts);
            });
        });

        scrollToBottom();
    }

    function handleMessageAction(action, msgId) {
        if (!msgId) return;
        const idx = messageHistory.findIndex(m => m.id === msgId);
        if (idx === -1) return;

        const msg = messageHistory[idx];

        if (action === 'copy') {
            const tmp = document.createElement('div');
            tmp.innerHTML = msg.content;
            const textToCopy = tmp.textContent;
            if (navigator.clipboard && window.isSecureContext) {
                navigator.clipboard.writeText(textToCopy)
                    .then(() => showLomiToast('✅ تم النسخ'))
                    .catch(() => showLomiToast('❌ فشل النسخ', true));
            } else {
                try {
                    const ta = document.createElement('textarea');
                    ta.value = textToCopy;
                    ta.style.cssText = 'position:fixed;top:0;left:0;width:2em;height:2em;opacity:0;';
                    document.body.appendChild(ta);
                    ta.select();
                    document.execCommand('copy');
                    document.body.removeChild(ta);
                    showLomiToast('✅ تم النسخ');
                } catch {
                    showLomiToast('❌ فشل النسخ', true);
                }
            }
            return;
        }

        if (action === 'edit' && msg.role === 'user') {
            if (isSending) {
                showLomiToast('انتظر حتى ينتهي الرد الحالي', true);
                return;
            }
            const removed = messageHistory.splice(idx);
            removed.forEach(m => m.element?.remove());

            refs.input.value = msg.content;
            refs.sendBtn.disabled = false;
            refs.input.focus();
            refs.input.style.height = 'auto';
            refs.input.style.height = Math.min(refs.input.scrollHeight, 130) + 'px';
            return;
        }

        if (action === 'regen' && msg.role === 'assistant') {
            if (isSending) return;

            let uIdx = idx - 1;
            while (uIdx >= 0 && messageHistory[uIdx].role !== 'user') uIdx--;

            if (uIdx >= 0) {
                const t = messageHistory[uIdx].content;
                const removed = messageHistory.splice(uIdx);
                removed.forEach(m => m.element?.remove());
                sendMessage(t);
            }
            return;
        }
    }

    /* ═══════════════════════════════════════════════════════════
       15. Send Message (Main Flow)
       ═══════════════════════════════════════════════════════════ */
    async function sendMessage(text) {
        const cleanText = (text || '').trim();

        if (!cleanText) return;
        if (isSending) return;

        if (cleanText.length > CONFIG.maxMessageLength) {
            showLomiError(`الرسالة طويلة جداً. الحد الأقصى ${CONFIG.maxMessageLength} حرف.`);
            return;
        }

        const now = Date.now();
        lastSentMessages = lastSentMessages.filter(m => now - m.time < CONFIG.duplicateWindowMs);
        if (lastSentMessages.some(m => m.text === cleanText)) return;
        lastSentMessages.push({ text: cleanText, time: now });

        if (!navigator.onLine) {
            showLomiError('لا يوجد اتصال بالإنترنت. تحقق من الشبكة وحاول مجدداً.');
            return;
        }

        refs.input.value = '';
        refs.input.style.height = '48px';
        refs.sendBtn.disabled = true;
        isSending = true;
        refs.sendBtn.innerHTML = ICONS.stop;
        refs.sendBtn.classList.add('stop');
        refs.statusText.textContent = 'يكتب...';
        refs.statusDot.classList.add('busy');
        refs.charCounter.classList.remove('show');

        const userEntry = createUserMessage(cleanText);
        pushMessage(userEntry);

        const currentCity = getCurrentCity();

        const cached = getCachedResponse(cleanText, currentCity);
        if (cached) {
            const cachedEntry = createAssistantMessage('');
            pushMessage(cachedEntry);
            renderAssistantFinal(cachedEntry, cached);
            isSending = false;
            refs.sendBtn.innerHTML = ICONS.send;
            refs.sendBtn.classList.remove('stop');
            refs.sendBtn.disabled = !refs.input.value.trim();
            refs.statusText.textContent = 'متصل ⚡';
            refs.statusDot.classList.remove('busy');
            return;
        }

        const typing = document.createElement('div');
        typing.className = 'lomi-msg assistant';
        typing.id = 'lomiTyping';
        typing.innerHTML = `<div class="lomi-typing"><span></span><span></span><span></span></div>`;
        refs.messages.appendChild(typing);
        scrollToBottom();

        let assistantEntry = null;
        let accumulated = '';
        currentAbortController = new AbortController();

        try {
            const res = await fetch(CONFIG.functionUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${CONFIG.anonKey}`
                },
                signal: currentAbortController.signal,
                body: JSON.stringify({
                    message: cleanText,
                    history: messageHistory
                        .map(m => ({ role: m.role, content: m.content }))
                        .slice(-CONFIG.maxHistory),
                    fingerprint: 'web',
                    context: {
                        currentRoute: window.location.pathname,
                        currentCity: currentCity
                    }
                })
            });

            if (!res.ok) throw new Error('فشل الاتصال');

            lastAnalyticsId = res.headers.get('X-Analytics-Id') || null;

            const reader = res.body.getReader();
            const decoder = new TextDecoder();
            let buffer = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });

                if (buffer.length > CONFIG.maxBufferSize) {
                    buffer = '';
                    continue;
                }

                const lines = buffer.split('\n');
                buffer = lines.pop() || '';

                for (const line of lines) {
                    if (!line.startsWith('data:')) continue;
                    const d = line.slice(5).trim();
                    if (!d || d === '[DONE]') continue;

                    try {
                        const p = JSON.parse(d);

                        if (p.error) {
                            typing.remove();
                            showLomiError(p.error.message || 'حدث خطأ في معالجة طلبك. يرجى المحاولة لاحقاً.');
                            return;
                        }

                        if (p.promptFeedback?.blockReason) {
                            typing.remove();
                            const err = createAssistantMessage(
                                '⚠️ عذراً، لا يمكنني الرد على هذا الطلب.<br>يرجى إعادة صياغة سؤالك بأسلوب طبي ولائق.'
                            );
                            pushMessage(err);
                            return;
                        }

                        const chunk = p.candidates?.[0]?.content?.parts?.[0]?.text;
                        if (chunk) {
                            if (!assistantEntry) {
                                typing.remove();
                                assistantEntry = createAssistantMessage('');
                                pushMessage(assistantEntry);
                            }
                            accumulated += chunk;
                            const tempText = accumulated
                                .replace(/\[OPEN:[\w-]+\]/g, '')
                                .replace(/\[FIND:[\w-]+:[^\]]+\]/g, '')
                                .replace(/\[BLOG:[^\]]+\]/g, '');
                            assistantEntry.bubble.textContent = tempText;
                            scrollToBottom();
                        }
                    } catch (parseErr) {
                        // تجاهل chunk تالف
                    }
                }
            }

            typing.remove();

            if (assistantEntry) {
                renderAssistantFinal(assistantEntry, accumulated);
                saveCurrentConversation();
                setCachedResponse(cleanText, currentCity, accumulated);
            }

            refs.statusText.textContent = 'متصل';
            refs.statusDot.classList.remove('busy');

        } catch (err) {
            typing.remove();

            if (err.name === 'AbortError') {
                if (assistantEntry) {
                    const stopNote = createAssistantMessage('');
                    stopNote.bubble.innerHTML = '<span style="color:var(--ink-500);font-style:italic;">⏹️ تم إيقاف التوليد</span>';
                    pushMessage(stopNote);
                }
            } else {
                refs.statusText.textContent = 'خطأ في الاتصال';
                showLomiError('تعذر الاتصال بالخادم. تحقق من الإنترنت وحاول مجدداً.');
            }
        } finally {
            isSending = false;
            currentAbortController = null;
            document.getElementById('lomiTyping')?.remove();

            if (refs.sendBtn) {
                refs.sendBtn.innerHTML = ICONS.send;
                refs.sendBtn.classList.remove('stop');
                refs.sendBtn.disabled = !refs.input?.value.trim();
            }
            if (refs.statusDot) refs.statusDot.classList.remove('busy');
            if (refs.statusText && refs.statusText.textContent === 'يكتب...') {
                refs.statusText.textContent = 'متصل';
            }
        }
    }

    /* ═══════════════════════════════════════════════════════════
       16. Stop Generation
       ═══════════════════════════════════════════════════════════ */
    function stopGeneration() {
        if (currentAbortController) {
            try { currentAbortController.abort(); } catch (e) {}
            currentAbortController = null;
        }

        document.getElementById('lomiTyping')?.remove();

        isSending = false;
        if (refs.sendBtn) {
            refs.sendBtn.innerHTML = ICONS.send;
            refs.sendBtn.classList.remove('stop');
            refs.sendBtn.disabled = !refs.input?.value.trim();
        }
        if (refs.statusText) refs.statusText.textContent = 'متصل';
        if (refs.statusDot) refs.statusDot.classList.remove('busy');
    }

        /* ═══════════════════════════════════════════════════════════
       17. Public API
       ═══════════════════════════════════════════════════════════ */

    //  دالة منفصلة ومستقلة للتعامل مع لوحة المفاتيح
    function handleKeyboard() {
        const app = document.querySelector('.lomi-app');
        if (app && window.visualViewport) {
            app.style.height = `${window.visualViewport.height}px`;
        }
    }

    window.openLomi = function () {
        buildUI();

        const overlay = document.getElementById('lomiOverlay');
        if (!overlay) return;

        overlay.classList.add('active');
        document.body.style.overflow = 'hidden';

        if (currentConversationId && messageHistory.length === 0) {
            loadConversation(currentConversationId);
        } else if (messageHistory.length === 0) {
            showWelcome();
        }

        try {
            const unsentInput = localStorage.getItem(STORAGE_KEYS.unsentInput);
            if (unsentInput && refs.input) {
                refs.input.value = unsentInput;
                refs.sendBtn.disabled = false;
                refs.input.style.height = 'auto';
                refs.input.style.height = Math.min(refs.input.scrollHeight, 130) + 'px';
                localStorage.removeItem(STORAGE_KEYS.unsentInput);
            }
        } catch {}

        //  تفعيل مراقبة لوحة المفاتيح
        if (window.visualViewport) {
            window.visualViewport.addEventListener('resize', handleKeyboard);
        }

        //  منع القفز عند التركيز
        setTimeout(() => {
            if (refs.input) {
                refs.input.focus({ preventScroll: true });
            }
        }, 300);
    };

    window.closeLomi = function () {
        try {
            if (refs.input?.value.trim()) {
                localStorage.setItem(STORAGE_KEYS.unsentInput, refs.input.value);
            }
        } catch {}

        const overlay = document.getElementById('lomiOverlay');
        if (overlay) overlay.classList.remove('active');
        
        //  إعادة الصفحة لطبيعتها
        document.body.style.overflow = '';
        
        // ✅ إيقاف مراقبة لوحة المفاتيح
        if (window.visualViewport) {
            window.visualViewport.removeEventListener('resize', handleKeyboard);
        }

        if (isSending) stopGeneration();
        clearAllTimeouts();
        saveCurrentConversation();
    };

})();

        const overlay = document.getElementById('lomiOverlay');
        if (overlay) overlay.classList.remove('active');
        document.body.style.overflow = '';

        if (isSending) stopGeneration();
        clearAllTimeouts();
        saveCurrentConversation();
    };

})();
