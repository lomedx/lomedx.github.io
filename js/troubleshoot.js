// ═══════════════════════════════════════════════════════════
// Troubleshoot Modal — LomedX Integrated
// يتكامل تلقائياً مع openCtrlPanel + showToast من app.js
// ═══════════════════════════════════════════════════════════

(function () {
  'use strict';

  // ═══════════════════════════════════════════════════════════
  // Utilities
  // ═══════════════════════════════════════════════════════════
  function tsEscape(str) {
    return String(str ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function tsGenerateErrorId() {
    if (window.crypto?.getRandomValues) {
      const arr = new Uint8Array(4);
      crypto.getRandomValues(arr);
      return 'ERR-' + Array.from(arr, b => b.toString(16).padStart(2, '0'))
        .join('').toUpperCase();
    }
    return 'ERR-' + Date.now().toString(36).toUpperCase().slice(-8);
  }

  function tsFormatTime(seconds) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }

  // ═══════════════════════════════════════════════════════════
  // Clipboard — نسخة مضمونة (تعمل على كل البيئات)
  // ═══════════════════════════════════════════════════════════
  async function tsCopyToClipboard(text) {
    if (!text) return false;

    if (navigator.clipboard && window.isSecureContext) {
      try {
        await navigator.clipboard.writeText(text);
        return true;
      } catch (e) {}
    }

    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.cssText = 'position:fixed;top:0;left:0;width:2em;height:2em;padding:0;border:none;outline:none;box-shadow:none;background:transparent;opacity:0;';
      document.body.appendChild(ta);

      if (navigator.userAgent.match(/ipad|iphone/i)) {
        const range = document.createRange();
        range.selectNodeContents(ta);
        const sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
        ta.setSelectionRange(0, text.length);
      } else {
        ta.select();
      }

      const ok = document.execCommand('copy');
      document.body.removeChild(ta);
      return ok;
    } catch (e) {
      return false;
    }
  }

  // ═══════════════════════════════════════════════════════════
  // ISSUES MAP
  // ═══════════════════════════════════════════════════════════
  const TS_ISSUES = {
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
        'انقطاع الإنترنت من مزود الخدمة.',
        'تطبيق VPN أو Proxy يعمل في الخلفية.',
        'إعدادات الوقت والتاريخ غير دقيقة.',
      ],
      quickFixes: [
        { icon: 'fa-sync', text: 'أعد تحميل الصفحة', action: 'reload' },
        { icon: 'fa-wifi', text: 'اختبار الاتصال', action: 'test-connection' },
        { icon: 'fa-mobile-screen', text: 'جرب بيانات الهاتف' },
        { icon: 'fa-shield-halved', text: 'أوقف VPN' },
      ],
    },
    rate_limit: {
      title: 'محاولات كثيرة جداً',
      icon: 'fa-hourglass-half',
      color: '#F59E0B',
      reason: 'قمت بإرسال الطلب عدة مرات في وقت قصير، فتم إيقافك مؤقتاً لمنع السبام.',
      solution: 'انتظر انتهاء العدّاد التنازلي أدناه قبل المحاولة مرة أخرى.',
      commonCauses: [
        'النقر المتكرر على زر الإرسال.',
        'تحديث الصفحة بشكل متكرر.',
      ],
      quickFixes: [
        { icon: 'fa-clock', text: 'انتظر انتهاء العدّاد' },
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
        'صيغة رقم الهاتف غير صحيحة (يجب أن يبدأ بـ 09).',
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
        'استخدام إضافات AdBlocker.',
        'وضع التصفح الخفي.',
      ],
      quickFixes: [
        { icon: 'fa-shield-halved', text: 'أوقف AdBlocker' },
        { icon: 'fa-sync', text: 'أعد تحميل الصفحة', action: 'reload' },
      ],
    },
    timeout: {
      title: 'انتهت مهلة الطلب',
      icon: 'fa-clock',
      color: '#F59E0B',
      reason: 'الخادم لم يستجب خلال الوقت المحدد.',
      solution: 'حاول مرة أخرى بعد لحظات. إذا تكررت المشكلة، تحقق من سرعة الإنترنت.',
      commonCauses: ['بطء شديد في الإنترنت.', 'ضغط مؤقت على الخادم.'],
      quickFixes: [{ icon: 'fa-redo', text: 'أعد المحاولة', action: 'retry' }],
    },
    server: {
      title: 'حدث خطأ مؤقت',
      icon: 'fa-server',
      color: '#EF4444',
      reason: 'حدث خطأ داخلي مؤقت في النظام.',
      solution: 'أعد المحاولة بعد دقيقة. إذا استمرت المشكلة، تواصل مع الدعم.',
      commonCauses: ['صيانة مجدولة على الخادم.', 'ضغط كبير من المستخدمين.'],
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
      commonCauses: ['انتهاء صلاحية الجلسة.', 'تسجيل الخروج من تبويب آخر.'],
      quickFixes: [],
    },
    permission: {
      title: 'صلاحيات غير كافية',
      icon: 'fa-lock',
      color: '#EF4444',
      reason: 'حسابك الحالي لا يملك الصلاحيات المطلوبة.',
      solution: 'تواصل مع مدير النظام أو استخدم حساباً آخر.',
      commonCauses: ['دور حسابك محدود.', 'محاولة الوصول لمورد لا يخصك.'],
      quickFixes: [],
    },
    not_found: {
      title: 'العنصر غير موجود',
      icon: 'fa-magnifying-glass',
      color: '#F59E0B',
      reason: 'العنصر الذي تبحث عنه ربما حُذف أو نُقل.',
      solution: 'تحقق من الرابط أو ارجع للصفحة الرئيسية.',
      commonCauses: ['رابط قديم أو محفوظ.', 'حذف العنصر من قبل مسؤول.'],
      quickFixes: [{ icon: 'fa-home', text: 'العودة للرئيسية', action: 'home' }],
    },
    unknown: {
      title: 'حدث خطأ غير متوقع',
      icon: 'fa-circle-question',
      color: '#EF4444',
      reason: 'حدث خطأ غير معروف، لكن يمكنك تجربة الحلول أدناه.',
      solution: 'جرب تحديث الصفحة أو إعادة المحاولة.',
      commonCauses: ['تضارب في ذاكرة المتصفح.', 'إضافة تمنع السكربتات.'],
      quickFixes: [
        { icon: 'fa-sync', text: 'تحديث الصفحة', action: 'reload' },
        { icon: 'fa-redo', text: 'أعد المحاولة', action: 'retry' },
      ],
    },
  };

  // ═══════════════════════════════════════════════════════════
  // State
  // ═══════════════════════════════════════════════════════════
  const tsState = {
    current: null,
    countdown: null,
    retry: null,
    bound: false,
  };

  // ═══════════════════════════════════════════════════════════
  // Connection Test
  // ═══════════════════════════════════════════════════════════
  async function tsTestConnection() {
    const url = location.pathname === '/' ? '/favicon.ico' : location.pathname.split('?')[0];
    const start = performance.now();
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 5000);
      await fetch(url, { method: 'HEAD', cache: 'no-store', signal: controller.signal });
      clearTimeout(timer);
      return { ok: true, time: Math.round(performance.now() - start) };
    } catch {
      return { ok: false, time: Math.round(performance.now() - start) };
    }
  }

  // ═══════════════════════════════════════════════════════════
  // Countdown
  // ═══════════════════════════════════════════════════════════
  function tsStartCountdown(seconds) {
    if (tsState.countdown) clearInterval(tsState.countdown);

    const el = document.querySelector('.ts-countdown-value[data-countdown]');
    if (!el) return;

    let remaining = seconds;
    const retryBtns = document.querySelectorAll('[data-ts-action="retry"]');
    retryBtns.forEach(b => b.disabled = true);

    tsState.countdown = setInterval(() => {
      remaining--;
      el.textContent = tsFormatTime(Math.max(0, remaining));

      if (remaining <= 0) {
        clearInterval(tsState.countdown);
        tsState.countdown = null;
        el.textContent = '✅ يمكنك المحاولة الآن';
        el.classList.add('is-ready');
        retryBtns.forEach(b => b.disabled = false);
      }
    }, 1000);
  }

  // ═══════════════════════════════════════════════════════════
  // Main Function
  // ═══════════════════════════════════════════════════════════
  window.openTroubleshootModal = function (toolName = 'غير محددة', issueType = 'unknown', details = {}) {
    if (!TS_ISSUES[issueType]) issueType = 'unknown';

    const issue = TS_ISSUES[issueType];
    const errorId = tsGenerateErrorId();
    const safeToolName = tsEscape(toolName);
    const isOnline = navigator.onLine;
    const localTime = new Date().toLocaleString('ar-SY', {
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit',
    });

    // ─── Header ───
    const headerHTML = `
      <div class="ts-header">
        <div class="ts-icon-wrap" style="color: ${issue.color}">
          <div class="ts-icon-bg" style="background: ${issue.color}"></div>
          <div class="ts-icon-ring"></div>
          <div class="ts-icon-main" style="background: linear-gradient(135deg, ${issue.color} 0%, ${issue.color}cc 100%)">
            <i class="fas ${issue.icon}"></i>
          </div>
        </div>
        <h3 class="ts-title">${tsEscape(issue.title)}</h3>
        <div class="ts-badges">
          <span class="ts-badge ts-badge--tool">
            <i class="fas fa-toolbox"></i> ${safeToolName}
          </span>
          <button type="button" class="ts-badge ts-badge--id"
                  data-ts-action="copy-id" data-error-id="${errorId}"
                  title="اضغط للنسخ">
            <i class="fas fa-fingerprint"></i> ${errorId}
          </button>
        </div>
      </div>
    `;

    // ─── Countdown ───
    let countdownHTML = '';
    if (issueType === 'rate_limit' && details.retryAfter) {
      countdownHTML = `
        <div class="ts-countdown">
          <div class="ts-countdown-label">
            <i class="fas fa-hourglass-half"></i> يمكنك المحاولة بعد
          </div>
          <div class="ts-countdown-value" data-countdown="${details.retryAfter}">
            ${tsFormatTime(details.retryAfter)}
          </div>
        </div>
      `;
    }

    // ─── Failed Fields ───
    let failedFieldsHTML = '';
    if (issueType === 'validation' && Array.isArray(details.fields) && details.fields.length) {
      failedFieldsHTML = `
        <div class="ts-section ts-section--validation">
          <div class="ts-section-title">
            <i class="fas fa-list-check"></i>
            <span>حقول تحتاج مراجعة (${details.fields.length})</span>
          </div>
          <ul class="ts-list">
            ${details.fields.map(f => `
              <li class="ts-list-item">
                <i class="fas fa-circle-xmark"></i>
                <span><strong>${tsEscape(f.name)}:</strong> ${tsEscape(f.error)}</span>
              </li>
            `).join('')}
          </ul>
        </div>
      `;
    }

    // ─── Reason ───
    const reasonHTML = `
      <div class="ts-section ts-section--reason">
        <div class="ts-section-title">
          <i class="fas fa-bug"></i> <span>السبب المحتمل</span>
        </div>
        <p class="ts-section-body">${tsEscape(issue.reason)}</p>
      </div>
    `;

    // ─── Common Causes ───
    let causesHTML = '';
    if (issue.commonCauses?.length) {
      causesHTML = `
        <div class="ts-section ts-section--causes">
          <div class="ts-section-title">
            <i class="fas fa-magnifying-glass"></i> <span>أسباب شائعة</span>
          </div>
          <ul class="ts-list ts-list--causes">
            ${issue.commonCauses.map(c => `
              <li class="ts-list-item ts-list-item--cause">
                <i class="fas fa-circle"></i>
                <span>${tsEscape(c)}</span>
              </li>
            `).join('')}
          </ul>
        </div>
      `;
    }

    // ─── Solution ───
    const solutionHTML = `
      <div class="ts-section ts-section--solution">
        <div class="ts-section-title">
          <i class="fas fa-lightbulb"></i> <span>كيف تحل المشكلة؟</span>
        </div>
        <p class="ts-section-body">${tsEscape(issue.solution)}</p>
      </div>
    `;

    // ─── Quick Fixes ───
    let quickFixesHTML = '';
    if (issue.quickFixes?.length) {
      quickFixesHTML = `
        <div class="ts-quickfixes">
          <div class="ts-quickfixes-title">
            <i class="fas fa-bolt"></i> <span>حلول سريعة</span>
          </div>
          <div class="ts-quickfixes-grid">
            ${issue.quickFixes.map((fix, i) => {
              const actionAttr = fix.action ? `data-ts-action="${fix.action}"` : '';
              const isPrimary = i === 0 && fix.action;
              return `
                <button type="button" ${actionAttr}
                        class="ts-quickfix ${isPrimary ? 'ts-quickfix--primary' : ''}">
                  <span class="ts-quickfix-icon"><i class="fas ${fix.icon}"></i></span>
                  <span class="ts-quickfix-text">${tsEscape(fix.text)}</span>
                  ${fix.action ? '<i class="fas fa-arrow-left ts-quickfix-arrow"></i>' : ''}
                </button>
              `;
            }).join('')}
          </div>
        </div>
      `;
    }

    // ─── Support Details ───
    const supportDetails = [
      { key: 'معرّف الخطأ', value: errorId, icon: 'fa-fingerprint' },
      { key: 'الأداة', value: toolName, icon: 'fa-toolbox' },
      { key: 'نوع المشكلة', value: issue.title, icon: 'fa-tag' },
      { key: 'التوقيت', value: localTime, icon: 'fa-clock' },
      { key: 'حالة الإنترنت', value: isOnline ? 'متصل' : 'غير متصل', icon: isOnline ? 'fa-circle-check' : 'fa-circle-xmark' },
    ];

    const detailsHTML = `
      <details class="ts-details">
        <summary class="ts-details-summary">
          <span><i class="fas fa-headset"></i> معلومات للدعم الفني</span>
          <i class="fas fa-chevron-down ts-details-arrow"></i>
        </summary>
        <div class="ts-details-content">
          ${supportDetails.map(d => `
            <div class="ts-details-row">
              <span class="ts-details-key">
                <i class="fas ${d.icon}"></i> ${tsEscape(d.key)}
              </span>
              <span class="ts-details-value">${tsEscape(d.value)}</span>
            </div>
          `).join('')}
          <div class="ts-details-note">
            <i class="fas fa-info-circle"></i>
            <span>أرسل رقم المرجع فقط عند التواصل مع الدعم</span>
          </div>
        </div>
      </details>
    `;

    const connectionResultHTML = `<div class="ts-connection-result hidden"></div>`;

    const actionsHTML = `
      <div class="ts-actions">
        <button type="button" class="ts-btn ts-btn--primary" data-ts-action="copy">
          <i class="fas fa-copy"></i> <span>نسخ رقم المرجع</span>
        </button>
        <button type="button" class="ts-btn ts-btn--secondary" data-ts-action="close">
          <i class="fas fa-arrow-rotate-left"></i> <span>العودة</span>
        </button>
      </div>
    `;

    const supportLinkHTML = `
      <button type="button" class="ts-support-link" data-ts-action="support">
        <i class="fas fa-headset"></i>
        <span>لم تحل المشكلة؟ تواصل مع الدعم</span>
      </button>
    `;

    // ─── Final HTML ───
    const html = `
      <div class="ts-panel">
        ${headerHTML}
        ${countdownHTML}
        ${failedFieldsHTML}
        ${reasonHTML}
        ${causesHTML}
        ${solutionHTML}
        ${quickFixesHTML}
        ${connectionResultHTML}
        ${detailsHTML}
        ${actionsHTML}
        ${supportLinkHTML}
      </div>
    `;

    // ─── Open via openCtrlPanel ───
    if (typeof window.openCtrlPanel === 'function') {
      window.openCtrlPanel('مركز حل المشكلات', html, issue.color);
    } else {
      if (typeof window.showToast === 'function') {
        window.showToast('عذراً، حدث خطأ في عرض المساعدة.', 'error');
      }
      return;
    }

    if (issueType === 'rate_limit' && details.retryAfter) {
      tsStartCountdown(details.retryAfter);
    }

    tsState.current = { errorId, toolName, issueType, issue, details };
  };

  // ═══════════════════════════════════════════════════════════
  // Delegated Actions
  // ═══════════════════════════════════════════════════════════
  if (!tsState.bound) {
    tsState.bound = true;

    document.addEventListener('click', async (e) => {
      const btn = e.target.closest('[data-ts-action]');
      if (!btn) return;

      const action = btn.dataset.tsAction;

      // ─── Close ───
      if (action === 'close') {
        e.preventDefault();
        if (typeof window.closeCtrlPanel === 'function') window.closeCtrlPanel();
        return;
      }

      // ─── Retry ───
      if (action === 'retry') {
        e.preventDefault();
        if (typeof window.closeCtrlPanel === 'function') window.closeCtrlPanel();
        setTimeout(() => {
          if (typeof tsState.retry === 'function') tsState.retry();
          else if (typeof window.showToast === 'function') window.showToast('لا توجد عملية لإعادة المحاولة', 'info');
        }, 300);
        return;
      }

      // ─── Reload ───
      if (action === 'reload') {
        e.preventDefault();
        if (typeof window.closeCtrlPanel === 'function') window.closeCtrlPanel();
        setTimeout(() => location.reload(), 200);
        return;
      }

      // ─── Home ───
      if (action === 'home') {
        e.preventDefault();
        if (typeof window.closeCtrlPanel === 'function') window.closeCtrlPanel();
        setTimeout(() => { location.href = '/'; }, 200);
        return;
      }

      // ─── Test Connection ───
      if (action === 'test-connection') {
        e.preventDefault();
        const box = document.querySelector('.ts-connection-result');
        if (!box) return;

        box.classList.remove('hidden');
        box.innerHTML = `
          <div class="ts-connection-status ts-connection-status--loading">
            <i class="fas fa-spinner fa-spin"></i>
            <span>جارٍ اختبار الاتصال...</span>
          </div>
        `;

        const result = await tsTestConnection();
        const ok = result.ok;
        box.innerHTML = `
          <div class="ts-connection-status ${ok ? 'ts-connection-status--ok' : 'ts-connection-status--fail'}">
            <i class="fas ${ok ? 'fa-circle-check' : 'fa-circle-xmark'}"></i>
            <span>${ok ? 'الاتصال سليم' : 'تعذّر الاتصال'}</span>
            <span class="ts-connection-time">${result.time}ms</span>
          </div>
        `;

        if (typeof window.showToast === 'function') {
          window.showToast(ok ? '✅ الاتصال بالخادم سليم' : '⚠️ مشاكل في الاتصال', ok ? 'success' : 'error');
        }
        return;
      }

      // ─── Copy ID (badge) ───
      if (action === 'copy-id') {
        e.preventDefault();
        const id = btn.dataset.errorId;
        const ok = await tsCopyToClipboard(id);
        if (typeof window.showToast === 'function') {
          window.showToast(ok ? '✅ تم نسخ المعرّف' : '❌ تعذّر النسخ', ok ? 'success' : 'error');
        }
        return;
      }

      // ─── Copy full reference ───
      if (action === 'copy') {
        e.preventDefault();
        const id = tsState.current?.errorId;
        if (!id) {
          if (typeof window.showToast === 'function') window.showToast('لا يوجد معرّف للنسخ', 'error');
          return;
        }

        const originalHTML = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> <span>جارٍ النسخ...</span>';

        const ok = await tsCopyToClipboard(id);

        if (ok) {
          btn.innerHTML = '<i class="fas fa-check"></i> <span>تم النسخ ✓</span>';
          if (typeof window.showToast === 'function') window.showToast(`تم نسخ المعرّف: ${id}`, 'success');
          setTimeout(() => {
            btn.disabled = false;
            btn.innerHTML = originalHTML;
          }, 2000);
        } else {
          btn.disabled = false;
          btn.innerHTML = originalHTML;
          if (typeof window.showToast === 'function') window.showToast('تعذّر النسخ — انسخ يدوياً: ' + id, 'error');
        }
        return;
      }

      // ─── Support ───
      if (action === 'support') {
        e.preventDefault();
        if (typeof window.closeCtrlPanel === 'function') window.closeCtrlPanel();
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
  // Public API — Helpers
  // ═══════════════════════════════════════════════════════════
  window.registerRetry = (fn) => { tsState.retry = fn; };

  window.retryLastAction = async () => {
    if (typeof tsState.retry === 'function') {
      try { await tsState.retry(); }
      catch { if (typeof window.showToast === 'function') window.showToast('فشلت المحاولة مرة أخرى', 'error'); }
    } else if (typeof window.showToast === 'function') {
      window.showToast('لا توجد عملية لإعادة المحاولة', 'info');
    }
  };

  window.reportIssue = (toolName, issueType) => {
    window.openTroubleshootModal(toolName, issueType);
  };

  window.handleHttpError = (toolName, response, extraDetails = {}) => {
    const status = response?.status;
    if (!navigator.onLine) return window.openTroubleshootModal(toolName, 'network');
    if (status === 401) return window.openTroubleshootModal(toolName, 'auth');
    if (status === 403) return window.openTroubleshootModal(toolName, 'permission');
    if (status === 404) return window.openTroubleshootModal(toolName, 'not_found');
    if (status === 429) {
      const retryAfter = parseInt(response.headers?.get?.('Retry-After')) || 60;
      return window.openTroubleshootModal(toolName, 'rate_limit', { retryAfter, ...extraDetails });
    }
    if (status === 422 || status === 400) return window.openTroubleshootModal(toolName, 'validation', extraDetails);
    if (status === 408 || status === 504) return window.openTroubleshootModal(toolName, 'timeout');
    if (status >= 500) return window.openTroubleshootModal(toolName, 'server');
    return window.openTroubleshootModal(toolName, 'unknown', extraDetails);
  };

  window.handleFetchError = (toolName, error) => {
    if (!navigator.onLine) return window.openTroubleshootModal(toolName, 'network');
    if (error?.name === 'AbortError' || error?.name === 'TimeoutError') return window.openTroubleshootModal(toolName, 'timeout');
    if (error?.message?.includes('Failed to fetch') || error?.message?.includes('NetworkError')) return window.openTroubleshootModal(toolName, 'network');
    return window.openTroubleshootModal(toolName, 'unknown');
  };

})();
