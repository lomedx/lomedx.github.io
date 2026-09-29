// ═══════════════════════════════════════════════════════════
// Secure Troubleshoot Modal — v3.1
// Zero console output in production
// ═══════════════════════════════════════════════════════════

(function () {
  'use strict';

  // ═══════════════════════════════════════════════════════════
  // Secure Logger — بديل آمن عن console
  // ═══════════════════════════════════════════════════════════

  const Logger = (() => {
    const isDev = (() => {
      try {
        if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') return true;
        if (location.hostname.endsWith('.local')) return true;
        if (location.protocol === 'file:') return true;
        return false;
      } catch {
        return false;
      }
    })();

    const queue = [];
    const MAX_QUEUE = 50;

    async function sendToServer(event) {
      if (isDev) return;
      try {
        await fetch('/api/_log', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            event: event.type,
            id: event.id,
            ts: event.timestamp,
          }),
          keepalive: true,
        });
      } catch {}
    }

    function flush() {
      if (!queue.length) return;
      const events = queue.splice(0, queue.length);
      events.forEach(sendToServer);
    }

    setInterval(flush, 30000);
    window.addEventListener('pagehide', flush, { once: true });

    return {
      debug(message, data) {
        if (!isDev) return;
        try { console.debug(message, data); } catch {}
      },
      info(message, data) {
        if (!isDev) return;
        try { console.info(message, data); } catch {}
      },
      warn(message, data) {
        if (!isDev) return;
        try { console.warn(message, data); } catch {}
      },
      error(message, data) {
        if (!isDev) return;
        try { console.error(message, data); } catch {}
      },
      event(type, payload = {}) {
        const event = {
          type,
          id: payload.id || null,
          timestamp: Date.now(),
        };

        if (queue.length < MAX_QUEUE) {
          queue.push(event);
        }

        if (isDev) {
          try { console.info(`[Event] ${type}`, payload); } catch {}
        } else {
          sendToServer(event);
        }
      },
    };
  })();

  // ═══════════════════════════════════════════════════════════
  // Utilities
  // ═══════════════════════════════════════════════════════════

  function escapeHTML(str) {
    return String(str ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function generateErrorId() {
    if (window.crypto?.getRandomValues) {
      const arr = new Uint8Array(6);
      crypto.getRandomValues(arr);
      return 'ERR-' + Array.from(arr, b => b.toString(36).padStart(2, '0'))
        .join('')
        .toUpperCase()
        .slice(0, 8);
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
  // ISSUES MAP
  // ═══════════════════════════════════════════════════════════

  const ISSUES = {
    support: {
      title: 'مركز الدعم والمساعدة',
      icon: 'fa-headset',
      color: '#2563EB',
      severity: 'info',
      reason: 'إذا واجهتك أي صعوبة في استخدام الموقع، أو لم يعمل أي زر بشكل صحيح، أو لديك استفسار، نحن هنا لمساعدتك.',
      solution: 'يمكنك نسخ رقم المرجع أدناه وإرساله لفريق الدعم عبر زر "تواصل مع الدعم الفني"، أو تصفح الحلول السريعة.',
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
      severity: 'high',
      reason: 'تعذر الوصول إلى خوادمنا. غالباً السبب هو ضعف شبكة الإنترنت أو بيانات الهاتف لديك.',
      solution: 'تأكد من وجود إشارة إنترنت قوية، أو جرب شبكة أخرى، ثم أعد المحاولة.',
      commonCauses: [
        'انقطاع الإنترنت من مزود الخدمة (Wi-Fi أو بيانات الهاتف).',
        'تطبيق VPN أو Proxy يعمل في الخلفية ويمنع الاتصال.',
        'إعدادات الوقت والتاريخ في جهازك غير دقيقة (تسبب فشل شهادات الأمان).',
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
      severity: 'medium',
      reason: 'قمت بإرسال الطلب عدة مرات في وقت قصير، فتم إيقافك مؤقتاً لمنع السبام.',
      solution: 'انتظر انتهاء العدّاد التنازلي أدناه قبل المحاولة مرة أخرى.',
      commonCauses: [
        'النقر على زر الإرسال عدة مرات متتالية.',
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
      severity: 'medium',
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
      severity: 'high',
      reason: 'لم يتمكن النظام من التأكد أنك لست روبوت، ربما بسبب إضافة مانع الإعلانات.',
      solution: 'أوقف مانع الإعلانات على موقعنا، أو حدّث الصفحة.',
      commonCauses: [
        'استخدام إضافات مانع الإعلانات (AdBlocker).',
        'تصفح الإنترنت في وضع التصفح الخفي أحياناً يمنع تشغيل السكربتات الأمنية.',
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
      severity: 'medium',
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
      severity: 'high',
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
      severity: 'info',
      reason: 'هذه الأداة تتطلب تسجيل الدخول. ربما انتهت جلستك.',
      solution: 'سجّل الدخول من جديد ثم أعد المحاولة.',
      commonCauses: [
        'انتهاء صلاحية جلسة تسجيل الدخول للموقع.',
        'محاولة الوصول لصفحة أو أداة محمية دون تسجيل دخول.',
      ],
      quickFixes: [
        { icon: 'fa-right-to-bracket', text: 'تسجيل الدخول', action: 'login' },
      ],
    },
    permission: {
      title: 'صلاحيات غير كافية',
      icon: 'fa-lock',
      color: '#EF4444',
      severity: 'high',
      reason: 'حسابك الحالي لا يملك الصلاحيات المطلوبة.',
      solution: 'تواصل مع مدير النظام أو استخدم حساباً آخر.',
      commonCauses: [
        'محاولة طبيب الدخول لصفحة خاصة بالمدير، والعكس.',
      ],
      quickFixes: [],
    },
    not_found: {
      title: 'العنصر غير موجود',
      icon: 'fa-magnifying-glass',
      color: '#F59E0B',
      severity: 'medium',
      reason: 'العنصر الذي تبحث عنه ربما حُذف أو نُقل.',
      solution: 'تحقق من الرابط أو ارجع للصفحة الرئيسية.',
      commonCauses: [
        'الرابط الذي ضغطت عليه قديم أو تم تعديله.',
        'تم حذف العنصر (طبيب/مقال) من النظام.',
      ],
      quickFixes: [
        { icon: 'fa-home', text: 'العودة للرئيسية', action: 'home' },
      ],
    },
    unknown: {
      title: 'حدث خطأ غير متوقع',
      icon: 'fa-circle-question',
      color: '#EF4444',
      severity: 'high',
      reason: 'حدث خطأ غير معروف، لكن يمكنك تجربة الحلول أدناه.',
      solution: 'جرب تحديث الصفحة أو إعادة المحاولة. إذا استمرت المشكلة، تواصل مع الدعم.',
      commonCauses: [
        'تضارب مؤقت في ذاكرة المتصفح (Cache).',
        'استخدام إضافة (Extension) تمنع عمل بعض السكربتات.',
      ],
      quickFixes: [
        { icon: 'fa-sync', text: 'تحديث الصفحة', action: 'reload' },
        { icon: 'fa-redo', text: 'أعد المحاولة', action: 'retry' },
      ],
    },
  };

  // ═══════════════════════════════════════════════════════════
  // Context Collector
  // ═══════════════════════════════════════════════════════════

  function collectSafeContext() {
    const ctx = {
      online: navigator.onLine,
      connectionType: navigator.connection?.effectiveType || '',
      language: navigator.language || '',
      screenSize: `${screen.width}×${screen.height}`,
      viewport: `${innerWidth}×${innerHeight}`,
      localTime: new Date().toLocaleString('ar-SY'),
    };
    return ctx;
  }

  // ═══════════════════════════════════════════════════════════
  // Connection Test
  // ═══════════════════════════════════════════════════════════

  async function testServerConnection() {
    const testUrl = location.pathname === '/' ? '/favicon.ico' : location.pathname.split('?')[0];

    const start = performance.now();
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 5000);

      await fetch(testUrl, {
        method: 'HEAD',
        cache: 'no-store',
        signal: controller.signal,
      });
      clearTimeout(timer);

      const time = Math.round(performance.now() - start);
      return { ok: true, time };
    } catch {
      const time = Math.round(performance.now() - start);
      return { ok: false, time };
    }
  }

  // ═══════════════════════════════════════════════════════════
  // Main Function
  // ═══════════════════════════════════════════════════════════

  window.openTroubleshootModal = (toolName = 'غير محددة', issueType = 'unknown', details = {}) => {
    if (!ISSUES[issueType]) {
      issueType = 'unknown';
    }

    const issue = ISSUES[issueType];
    const errorId = generateErrorId();
    const safeToolName = escapeHTML(toolName);
    const context = collectSafeContext();

    Logger.event('troubleshoot_shown', {
      id: errorId,
    });

    if (!window.__errorHistory) window.__errorHistory = [];
    window.__errorHistory.push({
      id: errorId,
      tool: toolName,
      issue: issueType,
      time: Date.now(),
    });
    if (window.__errorHistory.length > 10) window.__errorHistory.shift();

    // ── Failed fields ──
    let failedFieldsHTML = '';
    if (issueType === 'validation' && Array.isArray(details.fields) && details.fields.length) {
      failedFieldsHTML = `
        <div class="bg-amber-50/70 p-4 rounded-xl text-right border border-amber-200">
          <div class="text-xs font-bold text-amber-700 mb-2 flex items-center gap-2">
            <i class="fas fa-list-check"></i>
            <span>حقول تحتاج مراجعة (${details.fields.length}):</span>
          </div>
          <ul class="space-y-1.5">
            ${details.fields.map(f => `
              <li class="text-sm text-gray-700 flex items-start gap-2">
                <i class="fas fa-times-circle text-red-500 mt-0.5 text-xs shrink-0"></i>
                <span><strong>${escapeHTML(f.name)}:</strong> ${escapeHTML(f.error)}</span>
              </li>
            `).join('')}
          </ul>
        </div>
      `;
    }

    // ── Countdown ──
    let countdownHTML = '';
    if (issueType === 'rate_limit' && details.retryAfter) {
      countdownHTML = `
        <div class="bg-yellow-50 border-2 border-yellow-200 rounded-xl p-4 text-center">
          <p class="text-xs text-yellow-700 mb-2 font-bold">⏱️ يمكنك المحاولة بعد:</p>
          <div class="text-3xl font-black text-yellow-600 countdown-display tabular-nums"
               data-countdown="${details.retryAfter}">${formatTime(details.retryAfter)}</div>
        </div>
      `;
    }

    // ── Common Causes ──
    let commonCausesHTML = '';
    if (issue.commonCauses && issue.commonCauses.length > 0) {
        commonCausesHTML = `
            <div class="bg-orange-50/50 p-4 rounded-xl text-right border border-orange-100">
                <div class="text-xs font-bold text-orange-600 mb-2 flex items-center gap-2">
                    <i class="fas fa-magnifying-glass" aria-hidden="true"></i>
                    <span>أسباب شائعة لهذه المشكلة:</span>
                </div>
                <ul class="space-y-1.5">
                    ${issue.commonCauses.map(cause => `
                        <li class="text-sm text-gray-700 flex items-start gap-2">
                            <i class="fas fa-circle text-[6px] text-orange-500 mt-2 shrink-0"></i>
                            <span>${escapeHTML(cause)}</span>
                        </li>
                    `).join('')}
                </ul>
            </div>
        `;
    }

    // ── Quick Fixes ──
    const quickFixesHTML = (issue.quickFixes || []).map((fix, i) => {
      const actionAttr = fix.action ? `data-ctrl-action="${fix.action}"` : '';
      const isPrimary = i === 0;
      const btnClass = isPrimary
        ? 'bg-blue-500 text-white hover:bg-blue-600'
        : 'bg-gray-100 text-gray-700 hover:bg-gray-200';
      return `
        <button type="button" ${actionAttr}
                class="w-full py-2.5 px-4 rounded-xl font-bold text-xs transition-colors flex items-center justify-center gap-2 ${btnClass}">
          <i class="fas ${fix.icon}"></i>
          <span>${escapeHTML(fix.text)}</span>
        </button>
      `;
    }).join('');

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

    const supportDetailsHTML = Object.entries(supportDetails).map(([k, v]) => `
      <div class="flex gap-2 py-1 border-b border-gray-100 last:border-0">
        <span class="text-gray-500 font-semibold shrink-0 min-w-[100px]">${escapeHTML(k)}:</span>
        <span class="text-gray-700 break-all text-[11px]">${escapeHTML(v)}</span>
      </div>
    `).join('');

    // ═══════════════════════════════════════════════════════════
    // Final HTML
    // ═══════════════════════════════════════════════════════════

    const html = `
      <div class="text-center py-4 flex flex-col gap-3" role="alert" aria-live="polite">

        <div class="w-16 h-16 mx-auto rounded-full flex items-center justify-center mb-1"
             style="background: ${issue.color}15; border: 1.5px solid ${issue.color}30">
          <i class="fas ${issue.icon} text-3xl" style="color: ${issue.color}" aria-hidden="true"></i>
        </div>
        
        <h3 class="text-xl font-black text-gray-800" style="font-family: 'Noto Kufi Arabic'">
          ${escapeHTML(issue.title)}
        </h3>

        <div class="flex items-center justify-center gap-2 flex-wrap">
          <span class="text-xs text-gray-500 bg-gray-50 px-3 py-1 rounded-full border border-gray-100">
            <i class="fas fa-toolbox ml-1"></i>
            ${safeToolName}
          </span>
          <button type="button" 
                  data-ctrl-action="copy-id"
                  data-error-id="${errorId}"
                  title="اضغط للنسخ"
                  class="text-[10px] text-gray-500 bg-gray-50 hover:bg-gray-100 px-2 py-1 rounded-full border border-gray-100 font-mono transition-colors cursor-pointer">
            <i class="fas fa-fingerprint ml-1"></i>
            ${errorId}
          </button>
        </div>

        ${countdownHTML}
        ${failedFieldsHTML}

        <div class="bg-red-50/50 p-4 rounded-xl text-right border border-red-100">
          <div class="text-xs font-bold text-red-600 mb-1 flex items-center gap-2">
            <i class="fas fa-bug" aria-hidden="true"></i>
            <span>السبب المحتمل:</span>
          </div>
          <p class="text-sm text-gray-700 leading-relaxed">${escapeHTML(issue.reason)}</p>
        </div>

        ${commonCausesHTML}

        <div class="bg-green-50/50 p-4 rounded-xl text-right border border-green-100">
          <div class="text-xs font-bold text-green-600 mb-1 flex items-center gap-2">
            <i class="fas fa-lightbulb" aria-hidden="true"></i>
            <span>كيف تحل المشكلة؟</span>
          </div>
          <p class="text-sm text-gray-700 leading-relaxed">${escapeHTML(issue.solution)}</p>
        </div>

        ${quickFixesHTML ? `
        <div class="flex flex-col gap-2 mt-1">
            <div class="text-xs font-bold text-gray-500 mb-1 flex items-center gap-2">
                <i class="fas fa-bolt"></i> حلول سريعة:
            </div>
            ${quickFixesHTML}
        </div>` : ''}

        <div class="connection-result hidden bg-gray-50 rounded-xl p-3 border border-gray-100 text-right"></div>

        <details class="text-right bg-gray-50 rounded-xl border border-gray-100 overflow-hidden">
          <summary class="cursor-pointer px-4 py-3 text-xs font-bold text-gray-600 hover:text-gray-800 select-none flex items-center justify-between">
            <span><i class="fas fa-headset ml-1"></i> معلومات للدعم الفني</span>
            <i class="fas fa-chevron-down text-[10px] transition-transform details-arrow"></i>
          </summary>
          <div class="px-4 pb-3 text-[11px] text-gray-700">
            ${supportDetailsHTML}
            <p class="text-[10px] text-gray-400 mt-2 pt-2 border-t border-gray-100">
              <i class="fas fa-info-circle ml-1"></i>
              أرسل رقم المعرّف فقط عند التواصل مع الدعم
            </p>
          </div>
        </details>

        <div class="flex flex-col gap-2 mt-2">
          <button type="button" 
                  data-ctrl-action="copy"
                  class="w-full py-3 rounded-xl bg-gray-800 text-white font-bold text-sm hover:bg-gray-900 transition-colors">
            <i class="fas fa-copy ml-1" aria-hidden="true"></i>
            نسخ رقم المعرّف
          </button>
          
          <button type="button" 
                  data-ctrl-action="close"
                  class="w-full py-3 rounded-xl bg-gray-100 text-gray-700 font-bold text-sm hover:bg-gray-200 transition-colors">
            <i class="fas fa-arrow-rotate-left ml-1" aria-hidden="true"></i>
            العودة
          </button>
        </div>

        <div class="text-center mt-1">
          <button type="button" 
                  data-ctrl-action="support" 
                  class="text-xs text-blue-500 hover:underline inline-flex items-center gap-1 cursor-pointer bg-transparent border-none">
            <i class="fas fa-headset"></i>
            لم تحل المشكلة؟ تواصل مع الدعم الفني
          </button>
        </div>

      </div>
    `;

    if (typeof window.openCtrlPanel === 'function') {
      window.openCtrlPanel('مركز حل المشكلات', html, issue.color);
    } else {
      alert('عذراً، حدث خطأ في عرض المساعدة.');
      return;
    }

    if (issueType === 'rate_limit' && details.retryAfter) {
      startCountdown(details.retryAfter);
    }

    window.__currentTroubleshoot = {
      errorId,
      toolName,
      issueType,
      issue,
      details,
      context,
    };
  };

  // ═══════════════════════════════════════════════════════════
  // Countdown
  // ═══════════════════════════════════════════════════════════

  function startCountdown(seconds) {
    if (window.__countdownInterval) {
      clearInterval(window.__countdownInterval);
    }

    const el = document.querySelector('.countdown-display');
    if (!el) return;

    let remaining = seconds;
    const retryBtns = document.querySelectorAll('[data-ctrl-action="retry"]');
    retryBtns.forEach(b => b.disabled = true);

    window.__countdownInterval = setInterval(() => {
      remaining--;
      el.textContent = formatTime(Math.max(0, remaining));

      if (remaining <= 0) {
        clearInterval(window.__countdownInterval);
        window.__countdownInterval = null;
        el.textContent = '✅ يمكنك المحاولة الآن';
        el.classList.add('text-green-600');
        retryBtns.forEach(b => b.disabled = false);
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
    } catch {
      return false;
    }
  }

  // ═══════════════════════════════════════════════════════════
  // Retry System
  // ═══════════════════════════════════════════════════════════

  window.registerRetry = (fn) => {
    window.__retryFunction = fn;
  };

  window.retryLastAction = async () => {
    if (typeof window.__retryFunction === 'function') {
      try {
        await window.__retryFunction();
      } catch {
        window.showToast?.('فشلت المحاولة مرة أخرى', 'error');
      }
    } else {
      window.showToast?.('لا توجد عملية لإعادة المحاولة', 'info');
    }
  };

  // ═══════════════════════════════════════════════════════════
  // Delegated Actions
  // ═══════════════════════════════════════════════════════════

  if (!window.__ctrlPanelBound) {
    window.__ctrlPanelBound = true;

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
        const resultBox = document.querySelector('.connection-result');
        if (!resultBox) return;

        resultBox.classList.remove('hidden');
        resultBox.innerHTML = `
          <div class="text-xs text-gray-500 flex items-center gap-2">
            <i class="fas fa-spinner fa-spin"></i>
            <span>جارٍ اختبار الاتصال...</span>
          </div>
        `;

        const result = await testServerConnection();
        const icon = result.ok ? 'fa-circle-check' : 'fa-circle-xmark';
        const color = result.ok ? 'text-green-600' : 'text-red-600';
        const status = result.ok 
          ? `✅ الاتصال سليم (${result.time}ms)` 
          : `❌ تعذّر الاتصال (${result.time}ms)`;

        resultBox.innerHTML = `
          <div class="flex items-center gap-2 text-xs ${color} font-bold">
            <i class="fas ${icon}"></i>
            <span>${status}</span>
          </div>
        `;

        window.showToast?.(
          result.ok ? '✅ الاتصال بالخادم سليم' : '⚠️ مشاكل في الاتصال',
          result.ok ? 'success' : 'error'
        );
        return;
      }

      if (action === 'copy-id') {
        e.preventDefault();
        const id = btn.dataset.errorId;
        const ok = await copyToClipboard(id);
        window.showToast?.(ok ? 'تم نسخ المعرّف' : 'تعذّر النسخ', ok ? 'success' : 'error');
        return;
      }

      if (action === 'copy') {
        e.preventDefault();
        const id = window.__currentTroubleshoot?.errorId;
        if (!id) {
          window.showToast?.('تعذّر النسخ', 'error');
          return;
        }
        const text = `مرجع الخطأ: ${id}`;
        const ok = await copyToClipboard(text);
        window.showToast?.(
          ok ? '✅ تم نسخ رقم المعرّف' : '❌ تعذّر النسخ',
          ok ? 'success' : 'error'
        );
        return;
      }

      if (action === 'support') {
        e.preventDefault();
        window.closeCtrlPanel?.();
        // فتح نافذة التواصل مباشرة بدلاً من تحويله لرابط
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

    // Toggle arrow
    document.addEventListener('toggle', (e) => {
      if (e.target.tagName === 'DETAILS') {
        const arrow = e.target.querySelector('.details-arrow');
        if (arrow) {
          arrow.style.transform = e.target.open ? 'rotate(180deg)' : '';
        }
      }
    }, true);
  }

  // ═══════════════════════════════════════════════════════════
  // Public API
  // ═══════════════════════════════════════════════════════════

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

    if (status === 401 || status === 403) {
      window.openTroubleshootModal(toolName, status === 401 ? 'auth' : 'permission');
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
