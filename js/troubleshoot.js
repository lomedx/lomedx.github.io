// ═══════════════════════════════════════════════════════════
// Troubleshoot Modal — Standalone Reference
// مركز حل المشكلات — 12 نوع خطأ شامل
// ═══════════════════════════════════════════════════════════

(function () {
  'use strict';

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
      const arr = new Uint8Array(4);
      crypto.getRandomValues(arr);
      return 'ERR-' + Array.from(arr, b => b.toString(16).padStart(2, '0'))
        .join('').toUpperCase();
    }
    return 'ERR-' + Date.now().toString(36).toUpperCase().slice(-8);
  }

  function formatTime(seconds) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }

  async function copyToClipboard(text) {
    if (!text) return false;
    if (navigator.clipboard && window.isSecureContext) {
      try { await navigator.clipboard.writeText(text); return true; } catch (e) {}
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
      } else { ta.select(); }
      const ok = document.execCommand('copy');
      document.body.removeChild(ta);
      return ok;
    } catch (e) { return false; }
  }

  function showToast(message, type = 'success') {
    let container = document.getElementById('toastContainer');
    // إذا لم يجد الحاوية، يقوم بإنشائها تلقائياً لضمان عمل الإشعارات
    if (!container) {
      container = document.createElement('div');
      container.id = 'toastContainer';
      container.className = 'toast-container';
      container.style.cssText = 'position:fixed; top:20px; left:50%; transform:translateX(-50%); z-index:100000; display:flex; flex-direction:column; gap:10px; pointer-events:none; width:calc(100% - 32px); max-width:400px;';
      document.body.appendChild(container);
    }
    
    const icons = {
      success: 'fa-circle-check',
      error: 'fa-circle-exclamation',
      info: 'fa-circle-info',
    };
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.setAttribute('role', 'status');
    toast.innerHTML = `
      <i class="fas ${icons[type] || icons.info}" aria-hidden="true"></i>
      <span>${escapeHTML(message)}</span>
    `;
    container.appendChild(toast);
    setTimeout(() => {
      toast.classList.add('hiding');
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }

  // ═══════════════════════════════════════════════════════════
  // ISSUES MAP — 12 نوع خطأ شامل
  // ═══════════════════════════════════════════════════════════
  const ISSUES = {
    // 1. مشكلة الشبكة
    network: {
      title: 'مشكلة في الاتصال بالإنترنت',
      icon: 'fa-wifi',
      color: '#EF4444',
      reason: 'تعذر الوصول إلى خوادمنا. غالباً السبب هو ضعف شبكة الإنترنت، أو بيانات الهاتف لديك، أو أن المتصفح يمنع الاتصال.',
      solution: 'تأكد من وجود إشارة إنترنت قوية، أعد تشغيل الاتصال، أو جرب استخدام شبكة أخرى وحاول مرة أخرى.',
      commonCauses: [
        'انقطاع الإنترنت من مزود الخدمة.',
        'ضعف إشارة Wi-Fi أو بيانات الهاتف.',
        'تطبيق VPN أو Proxy يعمل في الخلفية.',
        'إعدادات الوقت والتاريخ في الجهاز غير دقيقة.',
        'جدار الحماية أو مضاد الفيروسات يحجب الاتصال.',
      ],
      quickFixes: [
        { icon: 'fa-sync', text: 'أعد تحميل الصفحة', action: 'reload' },
        { icon: 'fa-wifi', text: 'اختبار الاتصال', action: 'test-connection' },
        { icon: 'fa-mobile-screen', text: 'جرب بيانات الهاتف بدل الواي فاي' },
        { icon: 'fa-shield-halved', text: 'أوقف VPN إن كنت تستخدمه' },
        { icon: 'fa-clock', text: 'تحقق من وقت وتاريخ الجهاز' },
      ],
    },

    // 2. كثرة المحاولات
    rate_limit: {
      title: 'محاولات كثيرة جداً',
      icon: 'fa-hourglass-half',
      color: '#F59E0B',
      reason: 'لقد قمت بإرسال هذا الطلب عدة مرات في وقت قصير جداً. نظام الحماية الخاص بنا قام بإيقافك مؤقتاً لمنع السبام.',
      solution: 'يرجى الانتظار لمدة دقيقة إلى دقيقتين قبل المحاولة مرة أخرى لضمان عدم انشغال خوادمنا.',
      commonCauses: [
        'النقر المتكرر على زر الإرسال.',
        'تحديث الصفحة بشكل متكرر بعد إرسال طلب.',
        'فتح عدة تبويبات وإرسال نفس الطلب.',
        'استخدام أداة آلية (Bot) أو سكربت.',
      ],
      quickFixes: [
        { icon: 'fa-clock', text: 'انتظر انتهاء العدّاد التنازلي' },
        { icon: 'fa-ban', text: 'لا تعد النقر بشكل متكرر' },
        { icon: 'fa-hand', text: 'أرسل الطلب مرة واحدة فقط' },
      ],
    },

    // 3. بيانات ناقصة
    validation: {
      title: 'بيانات غير مكتملة أو غير صحيحة',
      icon: 'fa-triangle-exclamation',
      color: '#F59E0B',
      reason: 'بعض الحقول الإلزامية فارغة أو تحتوي على بيانات غير صحيحة (مثل رقم هاتف بدون 09 في البداية).',
      solution: 'راجع الحقول ذات العلامة (*) وتأكد من إدخال البيانات بشكل صحيح، ثم اضغط إرسال مرة أخرى.',
      commonCauses: [
        'حقول مطلوبة (*) تُركت فارغة.',
        'رقم الهاتف لا يبدأ بـ 09 أو يحتوي على حروف.',
        'البريد الإلكتروني بصيغة خاطئة.',
        'نص قصير جداً (أقل من الحد الأدنى).',
        'نص طويل جداً (أكثر من الحد الأقصى).',
      ],
      quickFixes: [
        { icon: 'fa-arrow-rotate-left', text: 'العودة وإصلاح الحقول', action: 'close' },
      ],
    },

    // 4. فشل التحقق الأمني
    cloudflare: {
      title: 'فشل التحقق الأمني',
      icon: 'fa-shield-virus',
      color: '#EF4444',
      reason: 'لم يتمكن نظام الحماية من التأكد أنك لست روبوت (Bot)، ربما لأنك تستخدم إضافة مانع الإعلانات (AdBlocker) قوية.',
      solution: 'قم بإيقاف إضافة مانع الإعلانات على موقعنا، أو قم بتحديث الصفحة لإعادة تحميل نظام التحقق الأمني (Turnstile).',
      commonCauses: [
        'استخدام إضافات AdBlocker (uBlock, AdBlock Plus).',
        'وضع التصفح الخفي (Incognito).',
        'متصفح قديم لا يدعم JavaScript.',
        'VPN يغير عنوان IP بشكل متكرر.',
      ],
      quickFixes: [
        { icon: 'fa-shield-halved', text: 'أوقف AdBlocker لهذا الموقع' },
        { icon: 'fa-sync', text: 'أعد تحميل الصفحة', action: 'reload' },
        { icon: 'fa-user-secret', text: 'أغلق وضع التصفح الخفي' },
      ],
    },

    // 5. انتهاء المهلة
    timeout: {
      title: 'انتهت مهلة الطلب',
      icon: 'fa-clock',
      color: '#F59E0B',
      reason: 'الخادم لم يستجب خلال الوقت المحدد، ربما بسبب بطء الاتصال أو انشغال الخادم.',
      solution: 'حاول مرة أخرى بعد لحظات. إذا تكررت المشكلة، تحقق من سرعة الإنترنت أو انتظر قليلاً.',
      commonCauses: [
        'بطء شديد في اتصال الإنترنت.',
        'ضغط مؤقت على خوادم الموقع.',
        'رفع ملف كبير جداً.',
        'الطلب يحتاج معالجة طويلة.',
        'شبكة Wi-Fi غير مستقرة.',
      ],
      quickFixes: [
        { icon: 'fa-redo', text: 'أعد المحاولة', action: 'retry' },
        { icon: 'fa-gauge-high', text: 'اختبار سرعة الإنترنت', action: 'test-connection' },
        { icon: 'fa-clock', text: 'انتظر لحظات قبل المحاولة' },
      ],
    },

    // 6. خطأ في الخادم
    server: {
      title: 'خطأ مؤقت في الخادم',
      icon: 'fa-server',
      color: '#EF4444',
      reason: 'حدث خطأ داخلي مؤقت في النظام. لا ذنب لك — هذه مشكلتنا وسنحلها.',
      solution: 'أعد المحاولة بعد دقيقة. إذا استمرت المشكلة، تواصل مع الدعم مع رقم الخطأ أدناه.',
      commonCauses: [
        'صيانة مجدولة على الخادم.',
        'ضغط كبير من عدد المستخدمين المتصلين.',
        'خطأ برمجي داخلي.',
        'تعطل مؤقت في قاعدة البيانات.',
      ],
      quickFixes: [
        { icon: 'fa-redo', text: 'أعد المحاولة الآن', action: 'retry' },
        { icon: 'fa-clock', text: 'انتظر دقيقة قبل المحاولة' },
        { icon: 'fa-headset', text: 'تواصل مع الدعم', action: 'support' },
      ],
    },

    // 7. يحتاج تسجيل دخول
    auth: {
      title: 'تحتاج لتسجيل الدخول',
      icon: 'fa-user-lock',
      color: '#3B82F6',
      reason: 'هذه الأداة تتطلب تسجيل الدخول. ربما انتهت جلستك أو لم تسجل الدخول بعد.',
      solution: 'سجّل الدخول من جديد ثم أعد المحاولة. إذا نسيت كلمة المرور، استخدم خيار استعادة الحساب.',
      commonCauses: [
        'انتهاء صلاحية الجلسة بعد فترة من عدم الاستخدام.',
        'تسجيل الخروج من تبويب آخر.',
        'تغيير كلمة المرور من جهاز آخر.',
        'حذف ملفات تعريف الارتباط (Cookies).',
      ],
      quickFixes: [
        { icon: 'fa-right-to-bracket', text: 'تسجيل الدخول', action: 'login' },
        { icon: 'fa-key', text: 'نسيت كلمة المرور؟', action: 'forgot-password' },
      ],
    },

    // 8. صلاحيات غير كافية
    permission: {
      title: 'صلاحيات غير كافية',
      icon: 'fa-lock',
      color: '#EF4444',
      reason: 'حسابك الحالي لا يملك الصلاحيات المطلوبة لتنفيذ هذه العملية.',
      solution: 'تواصل مع مدير النظام لمنحك الصلاحيات، أو استخدم حساباً آخر يملك الصلاحيات.',
      commonCauses: [
        'حسابك بدور "مستخدم" لا يملك حق التعديل.',
        'محاولة الوصول لمورد لا يخصك.',
        'حسابك موقوف مؤقتاً.',
        'تحتاج ترقية الحساب لمستوى أعلى.',
      ],
      quickFixes: [
        { icon: 'fa-headset', text: 'تواصل مع الدعم', action: 'support' },
        { icon: 'fa-arrow-right-arrow-left', text: 'التبديل لحساب آخر' },
      ],
    },

    // 9. العنصر غير موجود
    not_found: {
      title: 'العنصر غير موجود',
      icon: 'fa-magnifying-glass',
      color: '#F59E0B',
      reason: 'العنصر الذي تبحث عنه ربما حُذف أو تم نقله أو أن الرابط قديم.',
      solution: 'تحقق من الرابط أو ارجع للصفحة الرئيسية وابحث يدوياً.',
      commonCauses: [
        'استخدام رابط قديم أو محفوظ.',
        'حذف العنصر من قبل مسؤول.',
        'تغيير مسار الصفحة.',
        'خطأ مطبعي في الرابط.',
      ],
      quickFixes: [
        { icon: 'fa-home', text: 'العودة للرئيسية', action: 'home' },
        { icon: 'fa-search', text: 'البحث يدوياً' },
        { icon: 'fa-undo', text: 'العودة للصفحة السابقة', action: 'back' },
      ],
    },

    // 10. صيانة
    maintenance: {
      title: 'الموقع تحت الصيانة',
      icon: 'fa-screwdriver-wrench',
      color: '#8B5CF6',
      reason: 'نقوم حالياً بإجراء تحديثات وتحسينات على الموقع لتحسين الخدمة.',
      solution: 'يرجى العودة بعد 10-15 دقيقة. نعتذر عن الإزعاج.',
      commonCauses: [
        'صيانة مجدولة معلنة مسبقاً.',
        'تحديث أمني عاجل.',
        'ترقية البنية التحتية للخوادم.',
        'إصلاح خطأ حرج.',
      ],
      quickFixes: [
        { icon: 'fa-clock', text: 'انتظر 10-15 دقيقة' },
        { icon: 'fa-bell', text: 'تابع صفحتنا للإشعارات' },
        { icon: 'fa-headset', text: 'تواصل مع الدعم', action: 'support' },
      ],
    },

    // 11. غير معروف
    unknown: {
      title: 'حدث خطأ غير متوقع',
      icon: 'fa-circle-question',
      color: '#EF4444',
      reason: 'لا نعرف بالضبط ما الذي حدث، لكن هذه ليست النهاية! المشكلة قد تكون مؤقتة.',
      solution: 'حاول تحديث الصفحة أو إعادة المحاولة. إذا استمرت المشكلة، تواصل مع الدعم مع رقم الخطأ.',
      commonCauses: [
        'تضارب مؤقت في ذاكرة المتصفح (Cache).',
        'استخدام إضافة (Extension) تمنع عمل بعض السكربتات.',
        'متصفح قديم لا يدعم ميزات حديثة.',
        'تعارض بين إضافات المتصفح.',
      ],
      quickFixes: [
        { icon: 'fa-sync', text: 'تحديث الصفحة', action: 'reload' },
        { icon: 'fa-redo', text: 'أعد المحاولة', action: 'retry' },
        { icon: 'fa-broom', text: 'مسح ذاكرة المتصفح' },
        { icon: 'fa-headset', text: 'تواصل مع الدعم', action: 'support' },
      ],
    },

    // 12. الدعم
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
        { icon: 'fa-circle-question', text: 'الأسئلة الشائعة' },
      ],
    },
  };

  // ═══════════════════════════════════════════════════════════
  // Connection Test
  // ═══════════════════════════════════════════════════════════
  async function testServerConnection() {
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
  // State
  // ═══════════════════════════════════════════════════════════
  let currentErrorId = null;
  let countdownInterval = null;
  let retryFunction = null;

  // ═══════════════════════════════════════════════════════════
  // Modal Management
  // ═══════════════════════════════════════════════════════════
  function ensureModal() {
    if (document.getElementById('tsModalOverlay')) return;
    const overlay = document.createElement('div');
    overlay.id = 'tsModalOverlay';
    overlay.className = 'ts-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-hidden', 'true');
    overlay.innerHTML = `
      <div class="ts-panel-wrapper" role="document">
        <div class="ts-handle" aria-hidden="true"></div>
        <button class="ts-close" type="button" aria-label="إغلاق" data-ts-close>
          <i class="fas fa-times"></i>
        </button>
        <div class="ts-panel-header">
          <h3>مركز حل المشكلات</h3>
        </div>
        <div class="ts-panel-body"></div>
      </div>
    `;
    document.body.appendChild(overlay);
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closeModal();
    });
    overlay.querySelector('[data-ts-close]').addEventListener('click', (e) => {
      e.preventDefault();
      closeModal();
    });
    document.addEventListener('keydown', (e) => {
      if ((e.key === 'Escape' || e.key === 'Esc') && overlay.classList.contains('active')) {
        closeModal();
      }
    });
  }

  function openModal(html) {
    ensureModal();
    const overlay = document.getElementById('tsModalOverlay');
    const body = overlay.querySelector('.ts-panel-body');
    body.innerHTML = html;
    overlay.classList.add('active');
    overlay.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  }

  function closeModal() {
    const overlay = document.getElementById('tsModalOverlay');
    if (!overlay) return;
    overlay.classList.remove('active');
    overlay.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    if (countdownInterval) {
      clearInterval(countdownInterval);
      countdownInterval = null;
    }
  }

  // ═══════════════════════════════════════════════════════════
  // Countdown
  // ═══════════════════════════════════════════════════════════
  function startCountdown(seconds) {
    if (countdownInterval) clearInterval(countdownInterval);
    const el = document.querySelector('[data-countdown]');
    if (!el) return;
    let remaining = seconds;
    const retryBtns = document.querySelectorAll('[data-ts-action="retry"]');
    retryBtns.forEach(b => b.disabled = true);
    countdownInterval = setInterval(() => {
      remaining--;
      el.textContent = formatTime(Math.max(0, remaining));
      if (remaining <= 0) {
        clearInterval(countdownInterval);
        countdownInterval = null;
        el.textContent = '✅ يمكنك المحاولة الآن';
        el.classList.add('is-ready');
        retryBtns.forEach(b => b.disabled = false);
      }
    }, 1000);
  }

  // ═══════════════════════════════════════════════════════════
  // Main Function
  // ═══════════════════════════════════════════════════════════
  function openTroubleshootModal(toolName = 'غير محددة', issueType = 'unknown', details = {}) {
    if (!ISSUES[issueType]) issueType = 'unknown';
    const issue = ISSUES[issueType];
    const errorId = generateErrorId();
    const safeToolName = escapeHTML(toolName);
    const isOnline = navigator.onLine;
    const localTime = new Date().toLocaleString('ar-SY', {
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit',
    });
    currentErrorId = errorId;

    // Header
    const headerHTML = `
      <div class="ts-header">
        <div class="ts-icon-wrap" style="color: ${issue.color}">
          <div class="ts-icon-bg" style="background: ${issue.color}"></div>
          <div class="ts-icon-ring"></div>
          <div class="ts-icon-main" style="background: linear-gradient(135deg, ${issue.color} 0%, ${issue.color}cc 100%)">
            <i class="fas ${issue.icon}"></i>
          </div>
        </div>
        <h3 class="ts-title">${escapeHTML(issue.title)}</h3>
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

    // Countdown
    let countdownHTML = '';
    if (issueType === 'rate_limit' && details.retryAfter) {
      countdownHTML = `
        <div class="ts-countdown">
          <div class="ts-countdown-label">
            <i class="fas fa-hourglass-half"></i> يمكنك المحاولة بعد
          </div>
          <div class="ts-countdown-value" data-countdown="${details.retryAfter}">
            ${formatTime(details.retryAfter)}
          </div>
        </div>
      `;
    }

    // Failed Fields
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
                <span><strong>${escapeHTML(f.name)}:</strong> ${escapeHTML(f.error)}</span>
              </li>
            `).join('')}
          </ul>
        </div>
      `;
    }

    // Reason
    const reasonHTML = `
      <div class="ts-section ts-section--reason">
        <div class="ts-section-title">
          <i class="fas fa-bug"></i> <span>السبب المحتمل</span>
        </div>
        <p class="ts-section-body">${escapeHTML(issue.reason)}</p>
      </div>
    `;

    // Common Causes
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
                <span>${escapeHTML(c)}</span>
              </li>
            `).join('')}
          </ul>
        </div>
      `;
    }

    // Solution
    const solutionHTML = `
      <div class="ts-section ts-section--solution">
        <div class="ts-section-title">
          <i class="fas fa-lightbulb"></i> <span>كيف تحل المشكلة؟</span>
        </div>
        <p class="ts-section-body">${escapeHTML(issue.solution)}</p>
      </div>
    `;

    // Quick Fixes
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
                  <span class="ts-quickfix-text">${escapeHTML(fix.text)}</span>
                  ${fix.action ? '<i class="fas fa-arrow-left ts-quickfix-arrow"></i>' : ''}
                </button>
              `;
            }).join('')}
          </div>
        </div>
      `;
    }

    // Support Details
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
                <i class="fas ${d.icon}"></i> ${escapeHTML(d.key)}
              </span>
              <span class="ts-details-value">${escapeHTML(d.value)}</span>
            </div>
          `).join('')}
          <div class="ts-details-note">
            <i class="fas fa-info-circle"></i>
            <span>أرسل رقم المرجع فقط عند التواصل مع الدعم</span>
          </div>
        </div>
      </details>
    `;

    // Actions
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

    // Support Link
    const supportLinkHTML = `
      <button type="button" class="ts-support-link" data-ts-action="support">
        <i class="fas fa-headset"></i>
        <span>لم تحل المشكلة؟ تواصل مع الدعم</span>
      </button>
    `;

    const connectionResultHTML = `<div class="ts-connection-result hidden"></div>`;

    // Final
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

    openModal(html);

    if (issueType === 'rate_limit' && details.retryAfter) {
      startCountdown(details.retryAfter);
    }
  }

  // ═══════════════════════════════════════════════════════════
  // Retry
  // ═══════════════════════════════════════════════════════════
  function registerRetry(fn) { retryFunction = fn; }

  async function retryLastAction() {
    if (typeof retryFunction === 'function') {
      try { await retryFunction(); }
      catch { showToast('فشلت المحاولة مرة أخرى', 'error'); }
    } else {
      showToast('لا توجد عملية لإعادة المحاولة', 'info');
    }
  }

  // ═══════════════════════════════════════════════════════════
  // Event Delegation
  // ═══════════════════════════════════════════════════════════
  document.addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-ts-action]');
    if (!btn) return;
    const action = btn.dataset.tsAction;

    if (action === 'close') {
      e.preventDefault(); closeModal(); return;
    }
    if (action === 'retry') {
      e.preventDefault(); closeModal();
      setTimeout(retryLastAction, 300); return;
    }
    if (action === 'reload') {
      e.preventDefault(); closeModal();
      setTimeout(() => location.reload(), 200); return;
    }
    if (action === 'home') {
      e.preventDefault(); closeModal();
      setTimeout(() => { location.href = '/'; }, 200); return;
    }
    if (action === 'back') {
      e.preventDefault(); closeModal();
      setTimeout(() => history.back(), 200); return;
    }
    if (action === 'login') {
      e.preventDefault(); closeModal();
      setTimeout(() => { location.href = '/login'; }, 200); return;
    }
    if (action === 'forgot-password') {
      e.preventDefault(); closeModal();
      setTimeout(() => { location.href = '/forgot-password'; }, 200); return;
    }
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
      const result = await testServerConnection();
      const ok = result.ok;
      box.innerHTML = `
        <div class="ts-connection-status ${ok ? 'ts-connection-status--ok' : 'ts-connection-status--fail'}">
          <i class="fas ${ok ? 'fa-circle-check' : 'fa-circle-xmark'}"></i>
          <span>${ok ? 'الاتصال سليم' : 'تعذّر الاتصال'}</span>
          <span class="ts-connection-time">${result.time}ms</span>
        </div>
      `;
      showToast(ok ? '✅ الاتصال سليم' : '⚠️ مشاكل في الاتصال', ok ? 'success' : 'error');
      return;
    }
    if (action === 'copy-id') {
      e.preventDefault();
      const ok = await copyToClipboard(btn.dataset.errorId);
      showToast(ok ? '✅ تم نسخ المعرّف' : '❌ تعذّر النسخ', ok ? 'success' : 'error');
      return;
    }
    if (action === 'copy') {
      e.preventDefault();
      const id = currentErrorId;
      if (!id) { showToast('لا يوجد معرّف', 'error'); return; }
      const originalHTML = btn.innerHTML;
      btn.disabled = true;
      btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i><span>جارٍ النسخ...</span>';
      const ok = await copyToClipboard(id);
      if (ok) {
        btn.innerHTML = '<i class="fas fa-check"></i><span>تم النسخ ✓</span>';
        showToast(`تم نسخ: ${id}`, 'success');
        setTimeout(() => {
          btn.disabled = false;
          btn.innerHTML = originalHTML;
        }, 2000);
      } else {
        btn.disabled = false;
        btn.innerHTML = originalHTML;
        showToast('انسخ يدوياً: ' + id, 'error');
      }
      return;
    }
    if (action === 'support') {
      e.preventDefault(); closeModal();
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

  // ═══════════════════════════════════════════════════════════
  // Public API
  // ═══════════════════════════════════════════════════════════
  window.openTroubleshootModal = openTroubleshootModal;
  window.closeTroubleshootModal = closeModal;
  window.registerRetry = registerRetry;
  window.retryLastAction = retryLastAction;

  // Helpers للاستخدام من أي مكان
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
    if (status === 503) return window.openTroubleshootModal(toolName, 'maintenance');
    if (status >= 500) return window.openTroubleshootModal(toolName, 'server');
    return window.openTroubleshootModal(toolName, 'unknown', extraDetails);
  };

  window.handleFetchError = (toolName, error) => {
    if (!navigator.onLine) return window.openTroubleshootModal(toolName, 'network');
    if (error?.name === 'AbortError' || error?.name === 'TimeoutError') {
      return window.openTroubleshootModal(toolName, 'timeout');
    }
    if (error?.message?.includes('Failed to fetch') || error?.message?.includes('NetworkError')) {
      return window.openTroubleshootModal(toolName, 'network');
    }
    return window.openTroubleshootModal(toolName, 'unknown');
  };
})();
