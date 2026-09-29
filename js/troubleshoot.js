// ═══════════════════════════════════════════════════════════
// Secure Troubleshoot Modal — v3.3 (Production Ready)
// Zero console output in production | No conflicts
// ═══════════════════════════════════════════════════════════

(function () {
  'use strict';

  // ═══════════════════════════════════════════════════════════
  // Internal State (module-scoped, not on window)
  // ═══════════════════════════════════════════════════════════
  const state = {
    current: null,      // آخر troubleshoot معروض
    countdown: null,    // مؤقت العدّاد
    retry: null,        // دالة إعادة المحاولة
    lastEventTs: 0,     // آخر وقت إرسال حدث
    bound: false,       // هل رُبطت مستمعات الأحداث؟
  };

  const EVENT_THROTTLE = 2000;
  const FLUSH_INTERVAL = 30000;

  // ═══════════════════════════════════════════════════════════
  // Secure Logger
  // ═══════════════════════════════════════════════════════════
  const Logger = (() => {
    const isDev = (() => {
      try {
        if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') return true;
        if (location.hostname.endsWith('.local')) return true;
        if (location.protocol === 'file:') return true;
        return false;
      } catch { return false; }
    })();

    const queue = [];
    const MAX_QUEUE = 50;
    let flushTimer = null;

    async function sendToServer(event) {
      if (isDev) return;
      try {
        await fetch('/api/_log', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ event: event.type, id: event.id, ts: event.timestamp }),
          keepalive: true,
        });
      } catch {}
    }

    function flush() {
      if (!queue.length) return;
      const events = queue.splice(0, queue.length);
      events.forEach(sendToServer);
    }

    function scheduleFlush() {
      if (flushTimer) return;
      flushTimer = setTimeout(() => {
        flush();
        flushTimer = null;
        if (queue.length) scheduleFlush();
      }, FLUSH_INTERVAL);
    }

    window.addEventListener('pagehide', flush, { once: true });

    return {
      event(type, payload = {}) {
        const event = { type, id: payload.id || null, timestamp: Date.now() };
        if (queue.length < MAX_QUEUE) queue.push(event);
        if (isDev) { try { console.info(`[Event] ${type}`, payload); } catch {} }
        if (!isDev) { sendToServer(event); }
        scheduleFlush();
      },
    };
  })();

  // ═══════════════════════════════════════════════════════════
  // Utilities
  // ═══════════════════════════════════════════════════════════
  function escapeHTML(str) {
    return String(str ?? '')
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function generateErrorId() {
    if (window.crypto?.getRandomValues) {
      const arr = new Uint8Array(6);
      crypto.getRandomValues(arr);
      return 'ERR-' + Array.from(arr, b => b.toString(36).padStart(2, '0'))
        .join('').toUpperCase().slice(0, 8);
    }
    const ts = Date.now().toString(36).toUpperCase().slice(-6);
    const rand = Math.random().toString(36).slice(2, 5).toUpperCase();
    return `ERR-${ts}-${rand}`;
  }

  function formatTime(seconds) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }

  // ═══════════════════════════════════════════════════════════
  // ISSUES MAP (كامل — 11 نوع)
  // ═══════════════════════════════════════════════════════════
  const ISSUES = {
    support: {
      title: 'مركز الدعم والمساعدة',
      icon: 'fa-headset',
      color: '#2563EB',
      reason: 'إذا واجهتك أي صعوبة في استخدام الموقع، أو لم يعمل أي زر بشكل صحيح، أو لديك استفسار، نحن هنا لمساعدتك.',
      solution: 'يمكنك نسخ رقم المرجع أدناه وإرساله لفريق الدعم، أو تصفح الحلول السريعة.',
      commonCauses: [],
      quickFixes: [
        { icon: 'fa-headset', text: 'تواصل مع الدعم الفني', action: 'support' },
        { icon: 'fa-house', text: 'العودة للرئيسية', action: 'home' },
      ],
    },
    network: {
      title: 'مشكلة في الاتصال',
      icon: 'fa-wifi',
      color: '#EF4444',
      reason: 'تعذر الوصول إلى خوادمنا. غالباً السبب هو ضعف شبكة الإنترنت أو بيانات الهاتف لديك.',
      solution: 'تأكد من وجود إشارة إنترنت قوية، أو جرب شبكة أخرى، ثم أعد المحاولة.',
      commonCauses: [
        'انقطاع الإنترنت من مزود الخدمة (Wi-Fi أو بيانات الهاتف).',
        'تطبيق VPN أو Proxy يعمل في الخلفية ويمنع الاتصال.',
        'إعدادات الوقت والتاريخ في جهازك غير دقيقة.',
      ],
      quickFixes: [
        { icon: 'fa-sync', text: 'أعد تحميل الصفحة', action: 'reload' },
        { icon: 'fa-wifi', text: 'اختبار الاتصال', action: 'test-connection' },
        { icon: 'fa-mobile-screen', text: 'جرب بيانات الهاتف بدل الواي فاي' },
        { icon: 'fa-shield-halved', text: 'أوقف VPN إن كنت تستخدمه' },
      ],
    },
    rate_limit: {
      title: 'محاولات كثيرة جداً',
      icon: 'fa-hourglass-half',
      color: '#F59E0B',
      reason: 'قمت بإرسال الطلب عدة مرات في وقت قصير، فتم إيقافك مؤقتاً لمنع السبام.',
      solution: 'انتظر انتهاء العدّاد التنازلي أدناه قبل المحاولة مرة أخرى.',
      commonCauses: [
        'النقر المتكرر على زر الإرسال دون انتظار الرد.',
        'تحديث الصفحة بشكل متكرر بعد إرسال طلب.',
      ],
      quickFixes: [
        { icon: 'fa-clock', text: 'انتظر انتهاء العدّاد' },
        { icon: 'fa-ban', text: 'لا تعد النقر بشكل متكرر' },
      ],
    },
    validation: {
      title: 'بيانات غير مكتملة',
      icon: 'fa-triangle-exclamation',
      color: '#F59E0B',
      reason: 'بعض الحقول الإلزامية فارغة أو تحتوي على بيانات غير صحيحة.',
      solution: 'راجع الحقول المُشار إليها أدناه، صحّح البيانات، ثم أعد الإرسال.',
      commonCauses: [
        'حقول مطلوبة (*) تُركت فارغة.',
        'صيغة رقم الهاتف غير صحيحة (يجب أن يبدأ بـ 09 ويتكون من 10 أرقام).',
      ],
      quickFixes: [],
    },
    cloudflare: {
      title: 'فشل التحقق الأمني',
      icon: 'fa-shield-virus',
      color: '#EF4444',
      reason: 'لم يتمكن النظام من التأكد أنك لست روبوت، ربما بسبب إضافة مانع الإعلانات.',
      solution: 'أوقف مانع الإعلانات على موقعنا، أو حدّث الصفحة.',
      commonCauses: [
        'استخدام إضافات مانع الإعلانات (AdBlocker).',
        'وضع التصفح الخفي يمنع تشغيل السكربتات الأمنية.',
      ],
      quickFixes: [
        { icon: 'fa-shield-halved', text: 'أوقف AdBlocker لهذا الموقع' },
        { icon: 'fa-sync', text: 'أعد تحميل الصفحة', action: 'reload' },
      ],
    },
    timeout: {
      title: 'انتهت مهلة الطلب',
      icon: 'fa-clock',
      color: '#F59E0B',
      reason: 'الخادم لم يستجب خلال الوقت المحدد.',
      solution: 'حاول مرة أخرى بعد لحظات. إذا تكررت المشكلة، تحقق من سرعة الإنترنت.',
      commonCauses: [
        'بطء شديد في اتصال الإنترنت لديك.',
        'ضغط مؤقت على خوادم الموقع.',
      ],
      quickFixes: [
        { icon: 'fa-redo', text: 'أعد المحاولة', action: 'retry' },
      ],
    },
    server: {
      title: 'حدث خطأ مؤقت',
      icon: 'fa-server',
      color: '#EF4444',
      reason: 'حدث خطأ داخلي مؤقت في النظام.',
      solution: 'أعد المحاولة بعد دقيقة. إذا استمرت المشكلة، تواصل مع الدعم.',
      commonCauses: [
        'الخادم يمر بفترة صيانة مجدولة أو تحديث.',
        'ضغط كبير جداً من عدد المستخدمين المتصلين حالياً.',
      ],
      quickFixes: [
        { icon: 'fa-redo', text: 'أعد المحاولة', action: 'retry' },
        { icon: 'fa-clock', text: 'انتظر دقيقة' },
      ],
    },
    auth: {
      title: 'تحتاج لتسجيل الدخول',
      icon: 'fa-user-lock',
      color: '#3B82F6',
      reason: 'هذه الأداة تتطلب تسجيل الدخول. ربما انتهت جلستك.',
      solution: 'سجّل الدخول من جديد ثم أعد المحاولة.',
      commonCauses: [
        'انتهاء صلاحية الجلسة بعد فترة من عدم الاستخدام.',
        'تسجيل الخروج من تبويب آخر.',
      ],
      quickFixes: [
        { icon: 'fa-right-to-bracket', text: 'تسجيل الدخول', action: 'login' },
      ],
    },
    permission: {
      title: 'صلاحيات غير كافية',
      icon: 'fa-lock',
      color: '#EF4444',
      reason: 'حسابك الحالي لا يملك الصلاحيات المطلوبة لتنفيذ هذه العملية.',
      solution: 'تواصل مع مدير النظام أو استخدم حساباً آخر.',
      commonCauses: [
        'حسابك بدور "مستخدم" لا يملك حق التعديل.',
        'محاولة الوصول لمورد لا يخصك.',
      ],
      quickFixes: [],
    },
    not_found: {
      title: 'العنصر غير موجود',
      icon: 'fa-magnifying-glass',
      color: '#F59E0B',
      reason: 'العنصر الذي تبحث عنه ربما حُذف أو نُقل.',
      solution: 'تحقق من الرابط أو ارجع للصفحة الرئيسية.',
      commonCauses: [
        'استخدام رابط قديم أو محفوظ.',
        'حذف العنصر من قبل مسؤول آخر.',
      ],
      quickFixes: [
        { icon: 'fa-home', text: 'العودة للرئيسية', action: 'home' },
      ],
    },
    unknown: {
      title: 'حدث خطأ غير متوقع',
      icon: 'fa-circle-question',
      color: '#EF4444',
      reason: 'حدث خطأ غير معروف، لكن يمكنك تجربة الحلول أدناه.',
      solution: 'جرب تحديث الصفحة أو إعادة المحاولة. إذا استمرت المشكلة، تواصل مع الدعم.',
      commonCauses: [
        'تضارب مؤقت في ذاكرة المتصفح (Cache).',
        'استخدام إضافة تمنع عمل بعض السكربتات.',
      ],
      quickFixes: [
        { icon: 'fa-sync', text: 'تحديث الصفحة', action: 'reload' },
        { icon: 'fa-redo', text: 'أعد المحاولة', action: 'retry' },
      ],
    },
  };

  // ═══════════════════════════════════════════════════════════
  // Connection Test
  // ═══════════════════════════════════════════════════════════
  async function testServerConnection() {
    const testUrl = location.pathname === '/' ? '/favicon.ico' : location.pathname.split('?')[0];
    const start = performance.now();
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 5000);
      await fetch(testUrl, { method: 'HEAD', cache: 'no-store', signal: controller.signal });
      clearTimeout(timer);
      return { ok: true, time: Math.round(performance.now() - start) };
    } catch {
      return { ok: false, time: Math.round(performance.now() - start) };
    }
  }

  // ═══════════════════════════════════════════════════════════
  // Fallback Panel (لو لم تكن openCtrlPanel متوفرة)
  // ═══════════════════════════════════════════════════════════
  function showFallbackPanel(html) {
    const existing = document.getElementById('tsFallbackPanel');
    if (existing) existing.remove();

    const wrap = document.createElement('div');
    wrap.id = 'tsFallbackPanel';
    wrap.className = 'ts-fallback-overlay';
    wrap.setAttribute('role', 'dialog');
    wrap.setAttribute('aria-modal', 'true');

    const panel = document.createElement('div');
    panel.className = 'ts-fallback-panel';
    panel.innerHTML = html;

    const closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.className = 'ts-fallback-close';
    closeBtn.setAttribute('aria-label', 'إغلاق');
    closeBtn.innerHTML = '<i class="fas fa-times"></i>';
    closeBtn.onclick = () => wrap.remove();

    panel.appendChild(closeBtn);
    wrap.appendChild(panel);
    document.body.appendChild(wrap);

    // إغلاق عند النقر على الخلفية
    wrap.addEventListener('click', (e) => {
      if (e.target === wrap) wrap.remove();
    });

    // إغلاق بـ ESC
    const escHandler = (e) => {
      if (e.key === 'Escape') {
        wrap.remove();
        document.removeEventListener('keydown', escHandler);
      }
    };
    document.addEventListener('keydown', escHandler);
  }

  // ═══════════════════════════════════════════════════════════
  // Countdown
  // ═══════════════════════════════════════════════════════════
  function startCountdown(seconds) {
    if (state.countdown) clearInterval(state.countdown);

    const el = document.querySelector('.countdown-display');
    if (!el) return;

    let remaining = seconds;
    document.querySelectorAll('[data-ctrl-action="retry"]').forEach(b => b.disabled = true);

    state.countdown = setInterval(() => {
      remaining--;
      el.textContent = formatTime(Math.max(0, remaining));

      if (remaining <= 0) {
        clearInterval(state.countdown);
        state.countdown = null;
        el.textContent = '✅ يمكنك المحاولة الآن';
        el.classList.add('is-ready');
        document.querySelectorAll('[data-ctrl-action="retry"]').forEach(b => b.disabled = false);
      }
    }, 1000);
  }

  // ═══════════════════════════════════════════════════════════
  // Copy to Clipboard
  // ═══════════════════════════════════════════════════════════
  async function copyToClipboard(text) {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        return true;
      }
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(ta);
      return ok;
    } catch { return false; }
  }

  // ═══════════════════════════════════════════════════════════
  // Main Function — openTroubleshootModal
  // ═══════════════════════════════════════════════════════════
  window.openTroubleshootModal = (toolName = 'غير محددة', issueType = 'unknown', details = {}) => {
    if (!ISSUES[issueType]) issueType = 'unknown';

    const issue = ISSUES[issueType];
    const errorId = generateErrorId();
    const safeToolName = escapeHTML(toolName);
    const context = {
      online: navigator.onLine,
      localTime: new Date().toLocaleString('ar-SY'),
      connectionType: navigator.connection?.effectiveType || '',
    };

    // ── Debounce للحدث ──
    const now = Date.now();
    if (now - state.lastEventTs > EVENT_THROTTLE) {
      Logger.event('troubleshoot_shown', { id: errorId });
      state.lastEventTs = now;
    }

    // ── Header ──
    const headerHTML = `
      <div class="ts-header">
        <div class="ts-icon-wrap" style="color: ${issue.color}">
          <div class="ts-icon-bg" style="background: ${issue.color}"></div>
          <div class="ts-icon-ring"></div>
          <div class="ts-icon-main" style="background: linear-gradient(135deg, ${issue.color} 0%, ${issue.color}cc 100%)">
            <i class="fas ${issue.icon}" aria-hidden="true"></i>
          </div>
        </div>
        <h3 class="ts-title">${escapeHTML(issue.title)}</h3>
        <div class="ts-badges">
          <span class="ts-badge">
            <i class="fas fa-toolbox" aria-hidden="true"></i>
            ${safeToolName}
          </span>
          <button type="button" 
                  class="ts-badge ts-badge--id"
                  data-ctrl-action="copy-id"
                  data-error-id="${errorId}"
                  title="اضغط للنسخ">
            <i class="fas fa-fingerprint" aria-hidden="true"></i>
            ${errorId}
          </button>
        </div>
      </div>
    `;

    // ── Countdown ──
    let countdownHTML = '';
    if (issueType === 'rate_limit' && details.retryAfter) {
      countdownHTML = `
        <div class="ts-countdown">
          <div class="ts-countdown-label">
            <i class="fas fa-hourglass-half" aria-hidden="true"></i>
            يمكنك المحاولة بعد
          </div>
          <div class="ts-countdown-value countdown-display"
               data-countdown="${details.retryAfter}">${formatTime(details.retryAfter)}</div>
        </div>
      `;
    }

    // ── Failed Fields ──
    let failedFieldsHTML = '';
    if (issueType === 'validation' && Array.isArray(details.fields) && details.fields.length) {
      failedFieldsHTML = `
        <div class="ts-section ts-section--validation">
          <div class="ts-section-title">
            <i class="fas fa-list-check" aria-hidden="true"></i>
            <span>حقول تحتاج مراجعة (${details.fields.length})</span>
          </div>
          <ul class="ts-list">
            ${details.fields.map(f => `
              <li class="ts-list-item">
                <i class="fas fa-circle-xmark" aria-hidden="true"></i>
                <span>
                  <strong>${escapeHTML(f.name)}:</strong>
                  ${escapeHTML(f.error)}
                </span>
              </li>
            `).join('')}
          </ul>
        </div>
      `;
    }

    // ── Reason ──
    const reasonHTML = `
      <div class="ts-section ts-section--reason">
        <div class="ts-section-title">
          <i class="fas fa-bug" aria-hidden="true"></i>
          <span>السبب المحتمل</span>
        </div>
        <p class="ts-section-body">${escapeHTML(issue.reason)}</p>
      </div>
    `;

    // ── Common Causes ──
    let commonCausesHTML = '';
    if (issue.commonCauses?.length) {
      commonCausesHTML = `
        <div class="ts-section ts-section--causes">
          <div class="ts-section-title">
            <i class="fas fa-magnifying-glass" aria-hidden="true"></i>
            <span>أسباب شائعة لهذه المشكلة</span>
          </div>
          <ul class="ts-list ts-list--causes">
            ${issue.commonCauses.map(cause => `
              <li class="ts-list-item ts-list-item--cause">
                <i class="fas fa-circle" aria-hidden="true"></i>
                <span>${escapeHTML(cause)}</span>
              </li>
            `).join('')}
          </ul>
        </div>
      `;
    }

    // ── Solution ──
    const solutionHTML = `
      <div class="ts-section ts-section--solution">
        <div class="ts-section-title">
          <i class="fas fa-lightbulb" aria-hidden="true"></i>
          <span>كيف تحل المشكلة؟</span>
        </div>
        <p class="ts-section-body">${escapeHTML(issue.solution)}</p>
      </div>
    `;

    // ── Quick Fixes ──
    let quickFixesHTML = '';
    if (issue.quickFixes?.length) {
      quickFixesHTML = `
        <div class="ts-quickfixes">
          <div class="ts-quickfixes-title">
            <i class="fas fa-bolt" aria-hidden="true"></i>
            <span>حلول سريعة</span>
          </div>
          <div class="ts-quickfixes-grid">
            ${issue.quickFixes.map((fix, i) => {
              const actionAttr = fix.action ? `data-ctrl-action="${fix.action}"` : '';
              const isPrimary = i === 0 && fix.action;
              return `
                <button type="button" ${actionAttr}
                        class="ts-quickfix ${isPrimary ? 'ts-quickfix--primary' : ''}">
                  <span class="ts-quickfix-icon">
                    <i class="fas ${fix.icon}" aria-hidden="true"></i>
                  </span>
                  <span class="ts-quickfix-text">${escapeHTML(fix.text)}</span>
                  ${fix.action ? '<i class="fas fa-arrow-left ts-quickfix-arrow" aria-hidden="true"></i>' : ''}
                </button>
              `;
            }).join('')}
          </div>
        </div>
      `;
    }

    // ── Support Details ──
    const supportDetails = {
      'معرّف الخطأ': errorId,
      'الأداة': toolName,
      'نوع المشكلة': issue.title,
      'التوقيت': context.localTime,
      'حالة الإنترنت': context.online ? '✅ متصل' : '❌ غير متصل',
    };
    if (context.connectionType) {
      supportDetails['نوع الاتصال'] = context.connectionType.toUpperCase();
    }

    const supportDetailsHTML = `
      <details class="ts-details">
        <summary class="ts-details-summary">
          <span><i class="fas fa-headset" aria-hidden="true"></i> معلومات للدعم الفني</span>
          <i class="fas fa-chevron-down ts-details-arrow" aria-hidden="true"></i>
        </summary>
        <div class="ts-details-content">
          ${Object.entries(supportDetails).map(([k, v]) => `
            <div class="ts-details-row">
              <span class="ts-details-key">${escapeHTML(k)}</span>
              <span class="ts-details-value">${escapeHTML(v)}</span>
            </div>
          `).join('')}
          <div class="ts-details-note">
            <i class="fas fa-info-circle" aria-hidden="true"></i>
            <span>أرسل رقم المرجع فقط عند التواصل مع الدعم</span>
          </div>
        </div>
      </details>
    `;

    // ── Connection Result placeholder ──
    const connectionResultHTML = `<div class="ts-connection-result hidden"></div>`;

    // ── Actions ──
    const actionsHTML = `
      <div class="ts-actions">
        <button type="button" 
                data-ctrl-action="copy"
                class="ts-btn ts-btn--primary">
          <i class="fas fa-copy" aria-hidden="true"></i>
          <span>نسخ رقم المرجع</span>
        </button>
        <button type="button" 
                data-ctrl-action="close"
                class="ts-btn ts-btn--secondary">
          <i class="fas fa-arrow-rotate-left" aria-hidden="true"></i>
          <span>العودة</span>
        </button>
      </div>
    `;

    // ── Support Link ──
    const supportLinkHTML = `
      <button type="button" 
              data-ctrl-action="support" 
              class="ts-support-link">
        <i class="fas fa-headset" aria-hidden="true"></i>
        <span>لم تحل المشكلة؟ تواصل مع الدعم الفني</span>
      </button>
    `;

    // ── Final HTML ──
    const html = `
      <div class="ts-panel" role="alert" aria-live="polite">
        ${headerHTML}
        ${countdownHTML}
        ${failedFieldsHTML}
        ${reasonHTML}
        ${commonCausesHTML}
        ${solutionHTML}
        ${quickFixesHTML}
        ${connectionResultHTML}
        ${supportDetailsHTML}
        ${actionsHTML}
        ${supportLinkHTML}
      </div>
    `;

    // ── Open Panel ──
    if (typeof window.openCtrlPanel === 'function') {
      window.openCtrlPanel('مركز حل المشكلات', html, issue.color);
    } else {
      showFallbackPanel(html);
    }

    // ── Countdown ──
    if (issueType === 'rate_limit' && details.retryAfter) {
      startCountdown(details.retryAfter);
    }

    // ── Store state ──
    state.current = { errorId, toolName, issueType, issue, details, context };
  };

  // ═══════════════════════════════════════════════════════════
  // Delegated Actions
  // ═══════════════════════════════════════════════════════════
  if (!state.bound) {
    state.bound = true;

    document.addEventListener('click', async (e) => {
      const btn = e.target.closest('[data-ctrl-action]');
      if (!btn) return;

      const action = btn.dataset.ctrlAction;

      if (action === 'close') {
        e.preventDefault();
        window.closeCtrlPanel?.();
        return;
      }

      if (action === 'retry') {
        e.preventDefault();
        window.closeCtrlPanel?.();
        setTimeout(() => window.retryLastAction?.(), 300);
        return;
      }

      if (action === 'reload') {
        e.preventDefault();
        window.closeCtrlPanel?.();
        setTimeout(() => location.reload(), 200);
        return;
      }

      if (action === 'home') {
        e.preventDefault();
        window.closeCtrlPanel?.();
        setTimeout(() => { location.href = '/'; }, 200);
        return;
      }

      if (action === 'login') {
        e.preventDefault();
        window.closeCtrlPanel?.();
        setTimeout(() => { location.href = '/login'; }, 200);
        return;
      }

      if (action === 'test-connection') {
        e.preventDefault();
        const resultBox = document.querySelector('.ts-connection-result');
        if (!resultBox) return;

        resultBox.classList.remove('hidden');
        resultBox.innerHTML = `
          <div class="ts-connection-status ts-connection-status--loading">
            <i class="fas fa-spinner fa-spin" aria-hidden="true"></i>
            <span>جارٍ اختبار الاتصال...</span>
          </div>
        `;

        const result = await testServerConnection();
        const isOk = result.ok;
        const statusClass = isOk ? 'ts-connection-status--ok' : 'ts-connection-status--fail';
        const icon = isOk ? 'fa-circle-check' : 'fa-circle-xmark';
        const label = isOk ? 'الاتصال سليم' : 'تعذّر الاتصال';

        resultBox.innerHTML = `
          <div class="ts-connection-status ${statusClass}">
            <i class="fas ${icon}" aria-hidden="true"></i>
            <span>${label}</span>
            <span class="ts-connection-time">${result.time}ms</span>
          </div>
        `;

        window.showToast?.(
          isOk ? '✅ الاتصال بالخادم سليم' : '⚠️ مشاكل في الاتصال',
          isOk ? 'success' : 'error'
        );
        return;
      }

      if (action === 'copy-id') {
        e.preventDefault();
        const ok = await copyToClipboard(btn.dataset.errorId);
        window.showToast?.(ok ? 'تم نسخ المعرّف' : 'تعذّر النسخ', ok ? 'success' : 'error');
        return;
      }

      if (action === 'copy') {
        e.preventDefault();
        const id = state.current?.errorId;
        if (!id) {
          window.showToast?.('تعذّر النسخ', 'error');
          return;
        }
        const ok = await copyToClipboard(`مرجع الخطأ: ${id}`);
        window.showToast?.(
          ok ? '✅ تم نسخ رقم المعرّف' : '❌ تعذّر النسخ',
          ok ? 'success' : 'error'
        );
        return;
      }

      if (action === 'support') {
        e.preventDefault();
        window.closeCtrlPanel?.();
        setTimeout(() => {
          if (typeof window.openContactModal === 'function') {
            window.openContactModal();
          } else {
            location.href = '/contact';
          }
        }, 300);
        return;
      }
    });
  }

  // ═══════════════════════════════════════════════════════════
  // Public API
  // ═══════════════════════════════════════════════════════════
  window.registerRetry = (fn) => {
    state.retry = fn;
  };

  window.retryLastAction = async () => {
    if (typeof state.retry === 'function') {
      try {
        await state.retry();
      } catch {
        window.showToast?.('فشلت المحاولة مرة أخرى', 'error');
      }
    } else {
      window.showToast?.('لا توجد عملية لإعادة المحاولة', 'info');
    }
  };

  window.reportIssue = (toolName, issueType, error) => {
    Logger.event('issue_reported', {
      tool: toolName,
      type: issueType,
      hasError: !!error,
    });
    window.openTroubleshootModal(toolName, issueType);
  };

  window.handleHttpError = (toolName, response, extraDetails = {}) => {
    const status = response?.status;

    if (!navigator.onLine) {
      window.openTroubleshootModal(toolName, 'network');
      return;
    }
    if (status === 401) {
      window.openTroubleshootModal(toolName, 'auth');
      return;
    }
    if (status === 403) {
      window.openTroubleshootModal(toolName, 'permission');
      return;
    }
    if (status === 404) {
      window.openTroubleshootModal(toolName, 'not_found');
      return;
    }
    if (status === 429) {
      const retryAfter = parseInt(response.headers?.get?.('Retry-After')) || 60;
      window.openTroubleshootModal(toolName, 'rate_limit', { retryAfter, ...extraDetails });
      return;
    }
    if (status === 422 || status === 400) {
      window.openTroubleshootModal(toolName, 'validation', extraDetails);
      return;
    }
    if (status === 408 || status === 504) {
      window.openTroubleshootModal(toolName, 'timeout');
      return;
    }
    if (status >= 500) {
      window.openTroubleshootModal(toolName, 'server');
      return;
    }
    window.openTroubleshootModal(toolName, 'unknown', extraDetails);
  };

  window.handleFetchError = (toolName, error) => {
    Logger.event('fetch_error', {
      tool: toolName,
      name: error?.name || 'Unknown',
    });

    if (!navigator.onLine) {
      window.openTroubleshootModal(toolName, 'network');
      return;
    }
    if (error.name === 'AbortError' || error.name === 'TimeoutError') {
      window.openTroubleshootModal(toolName, 'timeout');
      return;
    }
    if (error.message?.includes('Failed to fetch') || error.message?.includes('NetworkError')) {
      window.openTroubleshootModal(toolName, 'network');
      return;
    }
    window.openTroubleshootModal(toolName, 'unknown');
  };

})();
