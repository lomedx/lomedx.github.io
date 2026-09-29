// ═══════════════════════════════════════════════════════════
// Secure Troubleshoot Modal — v6.0 (Apple Style UI)
// ═══════════════════════════════════════════════════════════

(function () {
  'use strict';

  // === Utilities ===
  function escapeHTML(str) {
    return String(str ?? '')
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function generateErrorId() {
    if (window.crypto?.getRandomValues) {
      const arr = new Uint8Array(6); crypto.getRandomValues(arr);
      return 'ERR-' + Array.from(arr, b => b.toString(36).padStart(2, '0')).join('').toUpperCase().slice(0, 8);
    }
    return `ERR-${Date.now().toString(36).toUpperCase().slice(-6)}-${Math.random().toString(36).slice(2, 5).toUpperCase()}`;
  }

  function formatTime(seconds) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }

  // === ISSUES MAP ===
  const ISSUES = {
    support: {
      title: 'مركز الدعم والمساعدة', icon: 'fa-headset', color: '#2563EB',
      reason: 'إذا واجهتك أي صعوبة في استخدام الموقع، أو لم يعمل أي زر بشكل صحيح، نحن هنا لمساعدتك.',
      solution: 'يمكنك نسخ رقم المرجع أدناه وإرساله لفريق الدعم عبر زر "تواصل مع الدعم الفني".',
      commonCauses: [], 
      quickFixes: [{ icon: 'fa-headset', text: 'تواصل مع الدعم', action: 'support' }, { icon: 'fa-house', text: 'الرئيسية', action: 'home' }]
    },
    network: {
      title: 'مشكلة في الاتصال', icon: 'fa-wifi', color: '#EF4444',
      reason: 'تعذر الوصول إلى خوادمنا. غالباً السبب هو ضعف شبكة الإنترنت لديك.',
      solution: 'تأكد من وجود إشارة إنترنت قوية، أو جرب شبكة أخرى، ثم أعد المحاولة.',
      commonCauses: ['انقطاع الإنترنت من مزود الخدمة.', 'تطبيق VPN يعمل في الخلفية ويمنع الاتصال.', 'إعدادات الوقت والتاريخ غير دقيقة.'],
      quickFixes: [{ icon: 'fa-sync', text: 'تحديث الصفحة', action: 'reload' }, { icon: 'fa-wifi', text: 'اختبار الاتصال', action: 'test-connection' }]
    },
    unknown: {
      title: 'خطأ غير متوقع', icon: 'fa-circle-exclamation', color: '#EF4444',
      reason: 'حدث خطأ غير معروف، لكن يمكنك تجربة الحلول أدناه.',
      solution: 'جرب تحديث الصفحة أو إعادة المحاولة. إذا استمرت، تواصل مع الدعم.',
      commonCauses: ['تضارب مؤقت في ذاكرة المتصفح (Cache).', 'إضافة (Extension) تمنع عمل السكربتات.'],
      quickFixes: [{ icon: 'fa-sync', text: 'تحديث الصفحة', action: 'reload' }, { icon: 'fa-redo', text: 'إعادة المحاولة', action: 'retry' }]
    }
  };

  // === Connection Test ===
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

  // === Main Function ===
  window.openTroubleshootModal = (toolName = 'غير محددة', issueType = 'unknown', details = {}) => {
    const issue = ISSUES[issueType] || ISSUES.unknown;
    const errorId = generateErrorId();
    const safeToolName = escapeHTML(toolName);
    const context = { online: navigator.onLine, localTime: new Date().toLocaleString('ar-SY'), connectionType: navigator.connection?.effectiveType || 'N/A' };
    
    // Build Support Details
    const supportDetailsHTML = `
      <div class="ts-details-row"><span class="ts-details-key"><i class="fas fa-fingerprint"></i> رقم المرجع</span><span class="ts-details-val">${errorId}</span></div>
      <div class="ts-details-row"><span class="ts-details-key"><i class="fas fa-toolbox"></i> الأداة</span><span class="ts-details-val">${safeToolName}</span></div>
      <div class="ts-details-row"><span class="ts-details-key"><i class="fas fa-clock"></i> التوقيت</span><span class="ts-details-val">${context.localTime}</span></div>
      <div class="ts-details-row"><span class="ts-details-key"><i class="fas fa-signal"></i> الإنترنت</span><span class="ts-details-val">${context.online ? '✅ متصل' : '❌ غير متصل'}</span></div>
    `;

    // Build Quick Fixes
    const fixesHTML = issue.quickFixes?.length ? `
      <div class="ts-quickfixes">
        <div class="ts-quickfixes-title"><i class="fas fa-bolt"></i> حلول سريعة:</div>
        <div class="ts-quickfixes-grid">
          ${issue.quickFixes.map((f, i) => `<button class="ts-quickfix ${i === 0 ? 'ts-quickfix--primary' : ''}" data-ctrl-action="${f.action || ''}"><span class="ts-quickfix-icon"><i class="fas ${f.icon}"></i></span><span class="ts-quickfix-text">${escapeHTML(f.text)}</span><i class="fas fa-arrow-left ts-quickfix-arrow"></i></button>`).join('')}
        </div>
      </div>` : '';

    // Build Final HTML
    const html = `
      <div class="ts-panel">
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
            <span class="ts-badge ts-badge--tool"><i class="fas fa-toolbox"></i> ${safeToolName}</span>
            <button class="ts-badge ts-badge--id" data-ctrl-action="copy-id" data-error-id="${errorId}"><i class="fas fa-fingerprint"></i> ${errorId}</button>
          </div>
        </div>

        <div class="ts-section ts-section--reason">
          <div class="ts-section-title"><i class="fas fa-bug"></i> السبب المحتمل:</div>
          <p class="ts-section-body">${escapeHTML(issue.reason)}</p>
        </div>

        <div class="ts-section ts-section--causes">
          <div class="ts-section-title"><i class="fas fa-magnifying-glass"></i> أسباب شائعة:</div>
          <ul class="ts-list ts-list--causes">
            ${issue.commonCauses.map(c => `<li class="ts-list-item ts-list-item--cause"><i class="fas fa-circle"></i> <span>${escapeHTML(c)}</span></li>`).join('')}
          </ul>
        </div>

        <div class="ts-section ts-section--solution">
          <div class="ts-section-title"><i class="fas fa-lightbulb"></i> كيف تحل المشكلة؟</div>
          <p class="ts-section-body">${escapeHTML(issue.solution)}</p>
        </div>

        ${fixesHTML}

        <div class="ts-connection-result hidden"></div>

        <details class="ts-details">
          <summary class="ts-details-summary"><span><i class="fas fa-headset"></i> معلومات للدعم الفني</span> <i class="fas fa-chevron-down ts-details-arrow"></i></summary>
          <div class="ts-details-content">
            ${supportDetailsHTML}
            <div class="ts-details-note"><i class="fas fa-info-circle"></i> أرسل رقم المعرّف فقط عند التواصل مع الدعم</div>
          </div>
        </details>

        <div class="ts-actions">
          <button class="ts-btn ts-btn--primary" data-ctrl-action="copy"><i class="fas fa-copy"></i> نسخ المرجع</button>
          <button class="ts-btn ts-btn--secondary" data-ctrl-action="close"><i class="fas fa-times"></i> إغلاق</button>
        </div>

        <button class="ts-support-link" data-ctrl-action="support"><i class="fas fa-headset"></i> لم تحل المشكلة؟ تواصل مع الدعم</button>
      </div>
    `;

    // Use the app.js openCtrlPanel function
    if (typeof window.openCtrlPanel === 'function') {
      window.openCtrlPanel('مركز حل المشكلات', html, issue.color);
    } else {
      alert('عذراً، حدث خطأ في عرض المساعدة.');
      return;
    }

    window.__currentTroubleshoot = { errorId, toolName, issueType, details };
  };

  // === Clipboard Fix ===
  async function copyText(text) {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
        return true;
      }
    } catch (e) {}
    try {
      const ta = document.createElement('textarea');
      ta.value = text; ta.style.position = 'fixed'; ta.style.top = '-9999px'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.focus(); ta.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(ta);
      return ok;
    } catch (e) { return false; }
  }

  // === Event Delegation ===
  if (!window.__tsBound) {
    window.__tsBound = true;

    document.addEventListener('click', async (e) => {
      const btn = e.target.closest('[data-ctrl-action]');
      if (!btn) return;
      const action = btn.dataset.ctrlAction;

      if (action === 'close') { window.closeCtrlPanel?.(); } 
      else if (action === 'reload') { window.closeCtrlPanel?.(); setTimeout(() => location.reload(), 200); } 
      else if (action === 'home') { window.closeCtrlPanel?.(); setTimeout(() => location.href = '/', 200); } 
      else if (action === 'retry') { window.closeCtrlPanel?.(); setTimeout(() => window.retryLastAction?.(), 300); } 
      else if (action === 'support') {
        window.closeCtrlPanel?.();
        setTimeout(() => {
          if (typeof window.openContactModal === 'function') window.openContactModal();
          else location.href = '/contact';
        }, 300);
      } 
      else if (action === 'test-connection') {
        const resultBox = document.querySelector('.ts-connection-result');
        if (!resultBox) return;
        resultBox.classList.remove('hidden');
        resultBox.innerHTML = `<div class="ts-connection-status ts-connection-status--loading"><i class="fas fa-spinner fa-spin"></i> جارٍ اختبار الاتصال...</div>`;
        const result = await testServerConnection();
        const icon = result.ok ? 'fa-circle-check' : 'fa-circle-xmark';
        const color = result.ok ? 'ts-connection-status--ok' : 'ts-connection-status--fail';
        const status = result.ok ? `الاتصال سليم (${result.time}ms)` : `تعذّر الاتصال (${result.time}ms)`;
        resultBox.innerHTML = `<div class="ts-connection-status ${color}"><i class="fas ${icon}"></i> ${status}</div>`;
        window.showToast?.(result.ok ? '✅ الاتصال سليم' : '⚠️ مشاكل بالاتصال', result.ok ? 'success' : 'error');
      } 
      else if (action === 'copy' || action === 'copy-id') {
        const id = action === 'copy-id' ? btn.dataset.errorId : window.__currentTroubleshoot?.errorId;
        if (!id) return;
        const ok = await copyText(`مرجع الخطأ: ${id}`);
        if (typeof window.showToast === 'function') {
          window.showToast(ok ? '✅ تم نسخ المرجع' : '❌ تعذر النسخ', ok ? 'success' : 'error');
        } else {
          alert(ok ? 'تم النسخ بنجاح' : 'تعذر النسخ');
        }
      }
    });

    document.addEventListener('toggle', (e) => {
      if (e.target.tagName === 'DETAILS') {
        const arrow = e.target.querySelector('.ts-details-arrow');
        if (arrow) arrow.style.transform = e.target.open ? 'rotate(180deg)' : '';
      }
    }, true);
  }

  // === Helpers API ===
  window.registerRetry = (fn) => { window.__retryFunction = fn; };
  window.retryLastAction = async () => {
    if (typeof window.__retryFunction === 'function') {
      try { await window.__retryFunction(); } catch { window.showToast?.('فشلت المحاولة', 'error'); }
    } else { window.showToast?.('لا توجد عملية', 'info'); }
  };

  window.handleFetchError = (toolName, error) => {
    if (!navigator.onLine) return window.openTroubleshootModal(toolName, 'network');
    if (error.name === 'AbortError' || error.name === 'TimeoutError') return window.openTroubleshootModal(toolName, 'unknown');
    if (error.message?.includes('Failed to fetch')) return window.openTroubleshootModal(toolName, 'network');
    window.openTroubleshootModal(toolName, 'unknown');
  };

})();
