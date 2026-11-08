/* ═══════════════════════════════════════════════════════════════
   🤖 LOMI AI — ملف مستقل (Module)
   يعتمد على supabase.js الموجود في المشروع
   ═══════════════════════════════════════════════════════════════ */
import { supabaseUrl, supabaseKey } from './supabase.js';

(function() {
  'use strict';

  // ═══ الإعدادات ═══
  const CONFIG = {
    functionUrl: `${supabaseUrl}/functions/v1/ai-assistant`,
    anonKey: supabaseKey,
    maxHistory: 8,
    fingerprint: null,
  };

  // ═══ خريطة الميزات الـ25 ═══
  const FEATURES = {
    'medicine-finder':   { icon: '💊', title: 'باحث الأدوية',         sub: 'ابحث عن دوائك',          handler: 'openMedicineFinder' },
    'book-doctor':       { icon: '📅', title: 'حجز موعد',             sub: 'احجز مع طبيب',           handler: 'redirectToDoctorsSearch' },
    'blood-bank':        { icon: '🩸', title: 'بنك الدم',             sub: 'تبرّع أو اطلب دماً',     handler: 'openBloodBank' },
    'health-file':       { icon: '📁', title: 'الملف الصحي',          sub: 'سجلك الطبي',              handler: 'openHealthFile' },
    'first-aid':         { icon: '🚑', title: 'الإسعافات الأولية',    sub: 'دليل الطوارئ',            handler: 'openFirstAid' },
    'burn-calculator':   { icon: '🔥', title: 'حاسبة الحروق',         sub: 'إسعافات الحروق',          handler: 'openBurnCalculator' },
    'pregnancy-calc':    { icon: '🤰', title: 'حاسبة الحمل',          sub: 'موعد الولادة',            handler: 'openPregnancyCalc' },
    'dose-calc':         { icon: '💉', title: 'حاسبة الجرعات',        sub: 'جرعات الأطفال',           handler: 'openDoseCalc' },
    'vaccine-scheduler': { icon: '🗓️', title: 'جدول اللقاحات',        sub: 'تطعيم طفلك',              handler: 'openVaccineScheduler' },
    'health-calc':       { icon: '⚖️', title: 'حاسبة الصحة',          sub: 'BMI والسعرات',            handler: 'openHealthCalc' },
    'water-calc':        { icon: '💧', title: 'حاسبة الماء',          sub: 'احتياجك اليومي',          handler: 'openWaterCalc' },
    'med-renewal':       { icon: '🔄', title: 'تجديد الدواء',         sub: 'متى ينفد دواؤك',          handler: 'openMedRenewalCalc' },
    'med-symbols':       { icon: '🧪', title: 'رموز التحاليل',        sub: 'فهم الروشتات',            handler: 'openMedSymbols' },
    'chronic-nutrition': { icon: '🥗', title: 'تغذية الأمراض',        sub: 'نظام غذائي',              handler: 'openChronicNutrition' },
    'pre-visit':         { icon: '📋', title: 'قبل زيارة الطبيب',     sub: 'جهّز نفسك',               handler: 'openPreVisitGuide' },
    'pre-test':          { icon: '🔬', title: 'قبل التحاليل',         sub: 'تعليمات الصيام',          handler: 'openPreTestGuide' },
    'food-interactions': { icon: '⚠️', title: 'تعارضات الأدوية',      sub: 'أدوية والطعام',           handler: 'openFoodInteractions' },
    'patient-reminder':  { icon: '⏰', title: 'دفتر التذكير',         sub: 'مواعيد الأدوية',          handler: 'openPatientReminder' },
    'seasonal-diseases': { icon: '🌡️', title: 'الأمراض الموسمية',    sub: 'دليل القلمون',            handler: 'openSeasonalDiseases' },
    'medical-map':       { icon: '🗺️', title: 'الخريطة الطبية',       sub: 'أقرب منشأة',              handler: 'openMedicalMap' },
    'medicine-donation': { icon: '🩺', title: 'الأجهزة الطبية',       sub: 'تبادل الأجهزة',           handler: 'openMedicineDonation' },
    'raheba-radar':      { icon: '📡', title: 'الرادار الصحي',        sub: 'رصد الأمراض',             handler: 'openRahebaRadar' },
    'ask-doctor':        { icon: '👨‍⚕️', title: 'اسأل طبيب',           sub: 'استشارة مجانية',          handler: 'openAskDoctor' },
    'blog':              { icon: '📰', title: 'المدونة الطبية',       sub: 'مقالات موثوقة',           handler: 'openMedicalBlog' },
    'events-first-aid':  { icon: '🎉', title: 'إسعافات المناسبات',    sub: 'حوادث التجمعات',          handler: 'openEventsFirstAid' }
  };

  // ═══ تنسيق النص (Markdown-lite) ═══
  function formatText(text) {
    if (!text) return '';
    return String(text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\*\*(.+?)\*\*/g, '<strong style="color:#0E7C5F;font-weight:800;">$1</strong>')
      .replace(/^• /gm, '<span style="color:#10B981;font-weight:700;">• </span>');
  }

  // ═══ حذف علامات [OPEN:xxx] كاملة أو جزئية (أثناء البث) ═══
  function stripFeatures(text) {
    return String(text)
      .replace(/\[OPEN:[\w-]*\]?/g, '')
      .replace(/\[OPEN:[^\]]*$/g, '')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  // ═══ استخراج الميزات من الرد النهائي ═══
  function extractFeatures(text) {
    const regex = /\[OPEN:([\w-]+)\]/g;
    const features = [];
    let match;
    while ((match = regex.exec(text)) !== null) {
      if (FEATURES[match[1]] && !features.includes(match[1])) {
        features.push(match[1]);
      }
    }
    return { cleanText: stripFeatures(text), features };
  }

  // ═══ توليد fingerprint (بدون مكتبات) ═══
  function generateFingerprint() {
    try {
      const stored = localStorage.getItem('lomi_fp');
      if (stored) return stored;
      const nav = window.navigator || {};
      const scr = window.screen || {};
      const data = [
        nav.userAgent || '',
        nav.language || '',
        nav.platform || '',
        nav.hardwareConcurrency || '',
        scr.width + 'x' + scr.height,
        new Date().getTimezoneOffset()
      ].join('|');
      let hash = 2166136261;
      for (let i = 0; i < data.length; i++) {
        hash ^= data.charCodeAt(i);
        hash = Math.imul(hash, 16777619);
      }
      const fp = 'fp_' + (hash >>> 0).toString(16);
      localStorage.setItem('lomi_fp', fp);
      return fp;
    } catch (e) {
      return 'fp_fallback';
    }
  }

  // ═══ الحالة ═══
  let history = [];
  let isOpen = false;
  let isSending = false;
  let abortController = null;

  const messagesEl = () => document.getElementById('lomiMessages');

  // ═══ بناء الواجهة ═══
  function buildUI() {
    // زر عائم
    const btn = document.createElement('button');
    btn.className = 'lomi-fab';
    btn.id = 'lomiFab';
    btn.title = 'اسأل لومي';
    btn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12h4l2-7 4 14 2-7h6"/></svg>`;
    document.body.appendChild(btn);

    // نافذة المساعد
    const win = document.createElement('div');
    win.className = 'lomi-window';
    win.id = 'lomiWindow';
    win.innerHTML = `
      <div class="lomi-header">
        <div class="lomi-avatar">🤖</div>
        <div class="lomi-header-info">
          <div class="lomi-title">لومي</div>
          <div class="lomi-subtitle"><span class="lomi-dot"></span>متصل الآن</div>
        </div>
        <button class="lomi-close" id="lomiClose" aria-label="إغلاق">✕</button>
      </div>
      <div class="lomi-messages" id="lomiMessages"></div>
      <div class="lomi-input-area">
        <textarea class="lomi-input" id="lomiInput" placeholder="اكتب سؤالك..." rows="1" maxlength="1000"></textarea>
        <button class="lomi-send" id="lomiSend" disabled aria-label="إرسال">➤</button>
      </div>
      <div class="lomi-footer">⚕️ للتوعية فقط — للطوارئ: 110</div>
    `;
    document.body.appendChild(win);
  }

  // ═══ إضافة رسالة ═══
  function addMessage(role, text) {
    const msg = document.createElement('div');
    msg.className = `lomi-msg ${role}`;
    const bubble = document.createElement('div');
    bubble.className = 'lomi-bubble';
    bubble.innerHTML = formatText(text);
    msg.appendChild(bubble);
    messagesEl().appendChild(msg);
    messagesEl().scrollTop = messagesEl().scrollHeight;
    return bubble;
  }

  // ═══ إضافة أزرار الميزات ═══
  function addFeatureButtons(bubble, featureIds) {
    const wrap = document.createElement('div');
    wrap.className = 'lomi-features';
    featureIds.forEach(id => {
      const f = FEATURES[id];
      if (!f) return;
      const btn = document.createElement('button');
      btn.className = 'lomi-feature-btn';
      btn.innerHTML = `
        <span class="lomi-feature-icon">${f.icon}</span>
        <span class="lomi-feature-text">
          <span class="lomi-feature-title">${f.title}</span>
          <span class="lomi-feature-sub">${f.sub}</span>
        </span>
        <span class="lomi-feature-arrow">←</span>
      `;
      btn.onclick = () => {
        closeAssistant();
        setTimeout(() => {
          if (typeof window[f.handler] === 'function') {
            try { window[f.handler](); }
            catch (e) { console.error('[Lomi] خطأ في التنفيذ:', e); }
          } else {
            console.warn(`[Lomi] الدالة "${f.handler}" غير موجودة`);
          }
        }, 300);
      };
      wrap.appendChild(btn);
    });
    bubble.parentElement.appendChild(wrap);
  }

  // ═══ إرسال الرسالة ═══
  async function sendMessage(text) {
    if (!text?.trim() || isSending) return;

    const input = document.getElementById('lomiInput');
    const sendBtn = document.getElementById('lomiSend');

    text = text.trim();
    input.value = '';
    input.style.height = 'auto';
    sendBtn.disabled = true;
    isSending = true;

    addMessage('user', text);

    // مؤشر الكتابة
    const typing = document.createElement('div');
    typing.className = 'lomi-msg assistant';
    typing.id = 'lomiTyping';
    typing.innerHTML = '<div class="lomi-typing"><span></span><span></span><span></span></div>';
    messagesEl().appendChild(typing);
    messagesEl().scrollTop = messagesEl().scrollHeight;

    let assistantBubble = null;
    let accumulated = '';

    abortController = new AbortController();

    try {
      const context = {
        currentRoute: window.location.pathname,
        currentCity: window.currentCity || 'الرحيبة',
      };

      const res = await fetch(CONFIG.functionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${CONFIG.anonKey}`,
        },
        signal: abortController.signal,
        body: JSON.stringify({
          message: text,
          history: history.slice(-8),
          context,
          fingerprint: CONFIG.fingerprint,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.response || err.error || 'فشل الاتصال');
      }

      // ═══ قراءة البث ═══
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.startsWith('data:')) continue;
          const data = line.slice(5).trim();
          if (!data || data === '[DONE]') continue;

          try {
            const parsed = JSON.parse(data);
            const chunk = parsed.candidates?.[0]?.content?.parts?.[0]?.text;
            if (chunk) {
              if (!assistantBubble) {
                document.getElementById('lomiTyping')?.remove();
                assistantBubble = addMessage('assistant', '');
              }
              accumulated += chunk;
              assistantBubble.innerHTML = formatText(stripFeatures(accumulated));
              messagesEl().scrollTop = messagesEl().scrollHeight;
            }
          } catch (e) { /* تجاهل الأسطر غير المكتملة */ }
        }
      }

      document.getElementById('lomiTyping')?.remove();

      if (assistantBubble) {
        const { cleanText, features } = extractFeatures(accumulated);
        assistantBubble.innerHTML = formatText(cleanText);

        if (features.length > 0) {
          addFeatureButtons(assistantBubble, features);
        }

        history.push({ role: 'user', content: text });
        history.push({ role: 'assistant', content: cleanText });
        if (history.length > CONFIG.maxHistory * 2) {
          history = history.slice(-CONFIG.maxHistory * 2);
        }
      }

    } catch (err) {
      document.getElementById('lomiTyping')?.remove();
      if (err.name !== 'AbortError') {
        addMessage('assistant', '🚨 ' + (err.message || 'حدث خطأ. حاول مجدداً.'));
      }
    } finally {
      isSending = false;
      abortController = null;
      sendBtn.disabled = !input.value.trim();
      input.focus();
    }
  }

  // ═══ فتح/إغلاق المساعد ═══
  function openAssistant() {
    isOpen = true;
    document.getElementById('lomiWindow').classList.add('open');
    document.getElementById('lomiFab').classList.add('hidden');

    if (messagesEl().children.length === 0) {
      addMessage('assistant', `أهلاً بك في **منصة LomedX** 👋

أنا **لومي**، مساعدك الطبي الذكي.

جرّب:
• "أبحث عن دواء"
• "حاسبة جرعة طفلي"
• "أريد أحجز موعد"

⚕️ للتوعية فقط — للطوارئ: 110`);
    }
    setTimeout(() => document.getElementById('lomiInput')?.focus(), 200);
  }

  function closeAssistant() {
    isOpen = false;
    document.getElementById('lomiWindow').classList.remove('open');
    document.getElementById('lomiFab').classList.remove('hidden');
  }

  // ═══ التهيئة ═══
  function init() {
    CONFIG.fingerprint = generateFingerprint();
    buildUI();

    document.getElementById('lomiFab').addEventListener('click', openAssistant);
    document.getElementById('lomiClose').addEventListener('click', closeAssistant);

    const input = document.getElementById('lomiInput');
    const sendBtn = document.getElementById('lomiSend');

    input.addEventListener('input', () => {
      input.style.height = 'auto';
      input.style.height = Math.min(input.scrollHeight, 100) + 'px';
      sendBtn.disabled = !input.value.trim() || isSending;
    });

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        if (!isSending) sendMessage(input.value);
      }
    });

    sendBtn.addEventListener('click', () => sendMessage(input.value));

    // إيقاف التوليد بـ Esc
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && isSending && abortController) {
        abortController.abort();
      }
      if (e.key === 'Escape' && isOpen) {
        closeAssistant();
      }
    });
  }

  // ═══ تشغيل بعد تحميل الصفحة ═══
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
