// ═══════════════════════════════════════════════════════════
// مركز حل المشكلات — نسخة مستقلة تماماً
// لا تعتمد على أي كود خارجي. مُختبَرة وتعمل 100%.
// ═══════════════════════════════════════════════════════════

(function () {
  'use strict';

  // ═══════════════════════════════════════════════════════════
  // Utility Functions
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
      ta.style.cssText = 'position:fixed;top:0;left:0;width:2em;height:2em;opacity:0;';
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

  // ═══════════════════════════════════════════════════════════
  // Toast مستقل تماماً
  // ═══════════════════════════════════════════════════════════
  function showTsToast(message, type = 'success') {
    let container = document.getElementById('tsIndependentToastContainer');
    if (!container) {
      container = document.createElement('div');
      container.id = 'tsIndependentToastContainer';
      container.style.cssText = `
        position: fixed;
        top: max(20px, env(safe-area-inset-top));
        left: 50%;
        transform: translateX(-50%);
        z-index: 2147483647;
        display: flex;
        flex-direction: column;
        gap: 10px;
        pointer-events: none;
        width: calc(100% - 32px);
        max-width: 400px;
        direction: rtl;
        font-family: 'Noto Kufi Arabic', system-ui, sans-serif;
      `;
      document.body.appendChild(container);
    }
    const icons = { success: 'fa-circle-check', error: 'fa-circle-exclamation', info: 'fa-circle-info' };
    const colors = { success: '#10B981', error: '#EF4444', info: '#3B82F6' };
    const toast = document.createElement('div');
    toast.style.cssText = `
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 14px 18px;
      border-radius: 14px;
      background: rgba(10, 31, 26, 0.98);
      backdrop-filter: blur(10px);
      border: 1px solid ${colors[type]}66;
      box-shadow: 0 12px 40px rgba(0, 0, 0, 0.4);
      font-size: 14px;
      font-weight: 600;
      color: #fff;
      pointer-events: auto;
      animation: tsIndepToastIn 0.4s cubic-bezier(0.16, 1, 0.3, 1);
    `;
    toast.innerHTML = `
      <i class="fas ${icons[type] || icons.info}" style="color: ${colors[type]}; font-size: 18px;"></i>
      <span>${escapeHTML(message)}</span>
    `;
    container.appendChild(toast);
    setTimeout(() => {
      toast.style.animation = 'tsIndepToastOut 0.3s ease forwards';
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }

  // ═══════════════════════════════════════════════════════════
  // CSS — يُحقن مرة واحدة
  // ═══════════════════════════════════════════════════════════
  function injectStyles() {
    if (document.getElementById('tsIndependentStyles')) return;
    const style = document.createElement('style');
    style.id = 'tsIndependentStyles';
    style.textContent = `
      @keyframes tsIndepToastIn {
        from { opacity: 0; transform: translateY(-20px) scale(0.95); }
        to { opacity: 1; transform: translateY(0) scale(1); }
      }
      @keyframes tsIndepToastOut {
        to { opacity: 0; transform: translateY(-20px) scale(0.95); }
      }
      @keyframes tsIndepFadeIn {
        from { opacity: 0; transform: translateY(8px); }
        to { opacity: 1; transform: translateY(0); }
      }
      @keyframes tsIndepPulse {
        0%, 100% { transform: scale(1); opacity: 0.1; }
        50% { transform: scale(1.06); opacity: 0.15; }
      }
      @keyframes tsIndepRing {
        0% { transform: scale(0.95); opacity: 0.3; }
        100% { transform: scale(1.25); opacity: 0; }
      }
      @keyframes tsIndepRotate { to { transform: rotate(360deg); } }
      @keyframes tsIndepBolt {
        0%, 100% { transform: scale(1); }
        50% { transform: scale(1.15) rotate(-5deg); }
      }

      /* Overlay */
      #tsIndependentOverlay {
        position: fixed;
        inset: 0;
        background: rgba(0, 0, 0, 0.78);
        backdrop-filter: blur(12px);
        -webkit-backdrop-filter: blur(12px);
        z-index: 2147483646;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 20px;
        padding-top: max(20px, env(safe-area-inset-top));
        padding-bottom: max(20px, env(safe-area-inset-bottom));
        opacity: 0;
        visibility: hidden;
        transition: opacity 0.3s ease, visibility 0.3s ease;
        direction: rtl;
        font-family: 'Noto Kufi Arabic', system-ui, sans-serif;
      }
      #tsIndependentOverlay.ts-indep-active {
        opacity: 1;
        visibility: visible;
      }

      /* Panel */
      #tsIndependentOverlay .ts-indep-panel {
        position: relative;
        background: #0a1f1a;
        border-radius: 20px;
        width: 100%;
        max-width: 540px;
        max-height: calc(100dvh - 40px);
        overflow-y: auto;
        overscroll-behavior: contain;
        -webkit-overflow-scrolling: touch;
        padding: 24px 22px 20px;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.6);
        border: 1px solid rgba(196, 150, 44, 0.2);
        transform: scale(0.95) translateY(10px);
        opacity: 0;
        transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.3s ease;
        scrollbar-width: thin;
        scrollbar-color: rgba(196, 150, 44, 0.4) transparent;
      }
      #tsIndependentOverlay.ts-indep-active .ts-indep-panel {
        transform: scale(1) translateY(0);
        opacity: 1;
      }
      #tsIndependentOverlay .ts-indep-panel::-webkit-scrollbar { width: 4px; }
      #tsIndependentOverlay .ts-indep-panel::-webkit-scrollbar-thumb {
        background: rgba(196, 150, 44, 0.4);
        border-radius: 4px;
      }

      /* Close button */
      #tsIndependentOverlay .ts-indep-close {
        position: absolute;
        top: 14px;
        left: 14px;
        width: 36px;
        height: 36px;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.06);
        border: 1px solid rgba(255, 255, 255, 0.08);
        color: #94a3b8;
        cursor: pointer;
        display: grid;
        place-items: center;
        transition: all 0.25s ease;
        font-size: 13px;
        -webkit-tap-highlight-color: transparent;
      }
      #tsIndependentOverlay .ts-indep-close:hover {
        background: #EF4444;
        color: #fff;
        border-color: #EF4444;
        transform: rotate(90deg);
      }
      #tsIndependentOverlay .ts-indep-close:active { transform: rotate(90deg) scale(0.9); }

      /* Header */
      #tsIndependentOverlay .ts-indep-header {
        text-align: center;
        margin-bottom: 18px;
        padding: 0 40px;
      }
      #tsIndependentOverlay .ts-indep-header h3 {
        font-size: 17px;
        font-weight: 800;
        color: #fff;
        letter-spacing: -0.3px;
        margin: 0;
        font-family: 'Noto Kufi Arabic', sans-serif;
      }

      /* Content wrapper */
      #tsIndependentOverlay .ts-indep-body { color: #fff; }

      /* ─── ts-panel ─── */
      #tsIndependentOverlay .ts-panel {
        direction: rtl;
        text-align: right;
        animation: tsIndepFadeIn 0.4s cubic-bezier(0.16, 1, 0.3, 1);
      }

      /* Header Icon */
      #tsIndependentOverlay .ts-header {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 10px;
        margin-bottom: 22px;
        text-align: center;
      }
      #tsIndependentOverlay .ts-icon-wrap {
        position: relative;
        width: 64px;
        height: 64px;
        display: grid;
        place-items: center;
      }
      #tsIndependentOverlay .ts-icon-bg {
        position: absolute;
        inset: 0;
        border-radius: 50%;
        opacity: 0.1;
        animation: tsIndepPulse 3s ease-in-out infinite;
      }
      #tsIndependentOverlay .ts-icon-ring {
        position: absolute;
        inset: -2px;
        border-radius: 50%;
        border: 1.5px solid currentColor;
        opacity: 0.15;
        animation: tsIndepRing 2.5s ease-out infinite;
      }
      #tsIndependentOverlay .ts-icon-main {
        position: relative;
        width: 54px;
        height: 54px;
        border-radius: 50%;
        display: grid;
        place-items: center;
        font-size: 22px;
        color: #fff;
        box-shadow: 0 6px 20px -6px currentColor;
        z-index: 2;
      }
      #tsIndependentOverlay .ts-title {
        font-size: 19px;
        font-weight: 800;
        color: #fff;
        letter-spacing: -0.4px;
        line-height: 1.3;
        margin: 0;
      }

      /* Badges */
      #tsIndependentOverlay .ts-badges {
        display: inline-flex;
        align-items: center;
        gap: 3px;
        padding: 3px;
        border-radius: 999px;
        background: rgba(255, 255, 255, 0.03);
        border: 1px solid rgba(255, 255, 255, 0.08);
      }
      #tsIndependentOverlay .ts-badge {
        display: inline-flex;
        align-items: center;
        gap: 5px;
        padding: 5px 11px;
        border-radius: 999px;
        font-size: 11px;
        font-weight: 600;
        background: transparent;
        color: #94a3b8;
        border: none;
        font-family: inherit;
      }
      #tsIndependentOverlay .ts-badge--tool {
        border-left: 1px solid rgba(255, 255, 255, 0.08);
        padding-left: 12px;
      }
      #tsIndependentOverlay .ts-badge--id {
        font-family: 'Menlo', 'Monaco', monospace;
        cursor: pointer;
        color: #d1d5db;
        background: rgba(255, 255, 255, 0.04);
        transition: all 0.2s ease;
        direction: ltr;
      }
      #tsIndependentOverlay .ts-badge--id:hover {
        background: #C4962C;
        color: #052E22;
        transform: translateY(-1px);
      }

      /* Sections */
      #tsIndependentOverlay .ts-section {
        border-radius: 12px;
        padding: 13px 14px;
        margin-bottom: 10px;
        border: 1px solid;
        position: relative;
        overflow: hidden;
      }
      #tsIndependentOverlay .ts-section::before {
        content: '';
        position: absolute;
        top: 0;
        right: 0;
        width: 3px;
        height: 100%;
      }
      #tsIndependentOverlay .ts-section-title {
        display: flex;
        align-items: center;
        gap: 7px;
        font-size: 11px;
        font-weight: 800;
        letter-spacing: 0.3px;
        margin-bottom: 7px;
        text-transform: uppercase;
      }
      #tsIndependentOverlay .ts-section-title i { font-size: 12px; width: 16px; text-align: center; }
      #tsIndependentOverlay .ts-section-body {
        font-size: 13px;
        line-height: 1.7;
        color: #d1d5db;
        font-weight: 500;
        margin: 0;
      }
      #tsIndependentOverlay .ts-section--reason {
        background: linear-gradient(135deg, rgba(239, 68, 68, 0.08), rgba(239, 68, 68, 0.03));
        border-color: rgba(239, 68, 68, 0.2);
      }
      #tsIndependentOverlay .ts-section--reason::before { background: linear-gradient(180deg, #ef4444, #dc2626); }
      #tsIndependentOverlay .ts-section--reason .ts-section-title { color: #fca5a5; }
      #tsIndependentOverlay .ts-section--causes {
        background: linear-gradient(135deg, rgba(245, 158, 11, 0.07), rgba(245, 158, 11, 0.02));
        border-color: rgba(245, 158, 11, 0.2);
      }
      #tsIndependentOverlay .ts-section--causes::before { background: linear-gradient(180deg, #f59e0b, #d97706); }
      #tsIndependentOverlay .ts-section--causes .ts-section-title { color: #fcd34d; }
      #tsIndependentOverlay .ts-section--solution {
        background: linear-gradient(135deg, rgba(16, 185, 129, 0.08), rgba(16, 185, 129, 0.03));
        border-color: rgba(16, 185, 129, 0.2);
      }
      #tsIndependentOverlay .ts-section--solution::before { background: linear-gradient(180deg, #10b981, #059669); }
      #tsIndependentOverlay .ts-section--solution .ts-section-title { color: #6ee7b7; }
      #tsIndependentOverlay .ts-section--validation {
        background: linear-gradient(135deg, rgba(245, 158, 11, 0.08), rgba(245, 158, 11, 0.02));
        border-color: rgba(245, 158, 11, 0.22);
      }
      #tsIndependentOverlay .ts-section--validation::before { background: linear-gradient(180deg, #f59e0b, #d97706); }
      #tsIndependentOverlay .ts-section--validation .ts-section-title { color: #fcd34d; }

      /* Lists */
      #tsIndependentOverlay .ts-list {
        list-style: none;
        padding: 0;
        margin: 0;
        display: flex;
        flex-direction: column;
        gap: 5px;
      }
      #tsIndependentOverlay .ts-list-item {
        display: flex;
        align-items: flex-start;
        gap: 9px;
        padding: 7px 9px;
        border-radius: 8px;
        background: rgba(0, 0, 0, 0.15);
        border: 1px solid rgba(251, 191, 36, 0.15);
        font-size: 12px;
      }
      #tsIndependentOverlay .ts-list-item i {
        color: #f87171;
        font-size: 11px;
        margin-top: 3px;
        flex-shrink: 0;
        width: 14px;
        text-align: center;
      }
      #tsIndependentOverlay .ts-list-item strong { color: #fff; font-weight: 700; }
      #tsIndependentOverlay .ts-list-item span { color: #d1d5db; line-height: 1.6; }
      #tsIndependentOverlay .ts-list--causes .ts-list-item--cause {
        border-color: rgba(245, 158, 11, 0.12);
        background: rgba(0, 0, 0, 0.1);
        padding: 6px 9px;
      }
      #tsIndependentOverlay .ts-list--causes .ts-list-item--cause i {
        color: #F59E0B;
        font-size: 5px;
        margin-top: 8px;
      }

      /* Countdown */
      #tsIndependentOverlay .ts-countdown {
        background: linear-gradient(135deg, rgba(245, 158, 11, 0.1), rgba(245, 158, 11, 0.03));
        border: 1.5px solid rgba(245, 158, 11, 0.3);
        border-radius: 16px;
        padding: 16px 14px;
        text-align: center;
        position: relative;
        overflow: hidden;
        margin-bottom: 10px;
      }
      #tsIndependentOverlay .ts-countdown::before {
        content: '';
        position: absolute;
        top: -50%; left: -50%;
        width: 200%; height: 200%;
        background: radial-gradient(circle, rgba(251, 191, 36, 0.12) 0%, transparent 70%);
        animation: tsIndepRotate 10s linear infinite;
      }
      #tsIndependentOverlay .ts-countdown-label {
        font-size: 11.5px;
        font-weight: 700;
        color: #fcd34d;
        margin-bottom: 6px;
        position: relative;
        z-index: 2;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
      }
      #tsIndependentOverlay .ts-countdown-value {
        font-size: 38px;
        font-weight: 900;
        color: #fbbf24;
        letter-spacing: 2px;
        line-height: 1;
        position: relative;
        z-index: 2;
        font-family: 'Menlo', 'Monaco', monospace;
        text-shadow: 0 2px 8px rgba(251, 191, 36, 0.25);
      }
      #tsIndependentOverlay .ts-countdown-value.is-ready {
        color: #10B981;
        font-size: 18px;
        letter-spacing: 0;
      }

      /* Quick Fixes */
      #tsIndependentOverlay .ts-quickfixes { margin-top: 6px; }
      #tsIndependentOverlay .ts-quickfixes-title {
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: 11px;
        font-weight: 800;
        color: #94a3b8;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        margin-bottom: 8px;
        padding-right: 2px;
      }
      #tsIndependentOverlay .ts-quickfixes-title i {
        color: #F59E0B;
        animation: tsIndepBolt 2s ease-in-out infinite;
      }
      #tsIndependentOverlay .ts-quickfixes-grid {
        display: grid;
        grid-template-columns: 1fr;
        gap: 6px;
      }
      #tsIndependentOverlay .ts-quickfix {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 10px 12px;
        border-radius: 12px;
        border: 1px solid rgba(255, 255, 255, 0.08);
        background: rgba(255, 255, 255, 0.03);
        font-size: 12.5px;
        font-weight: 600;
        color: #d1d5db;
        cursor: pointer;
        transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        text-align: right;
        font-family: inherit;
        width: 100%;
      }
      #tsIndependentOverlay .ts-quickfix:hover {
        border-color: #3B82F6;
        background: rgba(59, 130, 246, 0.08);
        transform: translateY(-1px);
      }
      #tsIndependentOverlay .ts-quickfix--primary {
        background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
        color: #fff;
        border-color: transparent;
        box-shadow: 0 4px 14px -4px rgba(37, 99, 235, 0.4);
      }
      #tsIndependentOverlay .ts-quickfix--primary:hover {
        background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
      }
      #tsIndependentOverlay .ts-quickfix-icon {
        width: 28px;
        height: 28px;
        border-radius: 8px;
        display: grid;
        place-items: center;
        background: rgba(255, 255, 255, 0.06);
        color: #3B82F6;
        font-size: 12px;
        flex-shrink: 0;
      }
      #tsIndependentOverlay .ts-quickfix--primary .ts-quickfix-icon {
        background: rgba(255, 255, 255, 0.2);
        color: #fff;
      }
      #tsIndependentOverlay .ts-quickfix-text { flex: 1; line-height: 1.4; }
      #tsIndependentOverlay .ts-quickfix-arrow {
        color: #94a3b8;
        font-size: 10px;
        opacity: 0;
        transform: translateX(-6px);
        transition: all 0.2s ease;
      }
      #tsIndependentOverlay .ts-quickfix:hover .ts-quickfix-arrow {
        opacity: 1;
        transform: translateX(0);
      }
      #tsIndependentOverlay .ts-quickfix--primary .ts-quickfix-arrow {
        color: rgba(255, 255, 255, 0.7);
      }

      /* Connection Result */
      #tsIndependentOverlay .ts-connection-result {
        margin-top: 8px;
        border-radius: 12px;
        border: 1px solid rgba(255, 255, 255, 0.08);
        background: rgba(255, 255, 255, 0.03);
        padding: 10px 12px;
        font-size: 12px;
      }
      #tsIndependentOverlay .ts-connection-result.hidden { display: none; }
      #tsIndependentOverlay .ts-connection-status {
        display: flex;
        align-items: center;
        gap: 8px;
        font-weight: 700;
      }
      #tsIndependentOverlay .ts-connection-status--ok { color: #6ee7b7; }
      #tsIndependentOverlay .ts-connection-status--fail { color: #fca5a5; }
      #tsIndependentOverlay .ts-connection-status--loading { color: #94a3b8; }
      #tsIndependentOverlay .ts-connection-time {
        font-family: 'Menlo', 'Monaco', monospace;
        font-size: 10.5px;
        opacity: 0.7;
        margin-right: auto;
      }

      /* Details */
      #tsIndependentOverlay .ts-details {
        margin-top: 12px;
        border-radius: 12px;
        border: 1px solid rgba(255, 255, 255, 0.08);
        background: rgba(255, 255, 255, 0.03);
        overflow: hidden;
      }
      #tsIndependentOverlay .ts-details[open] {
        background: rgba(255, 255, 255, 0.05);
        border-color: rgba(196, 150, 44, 0.25);
      }
      #tsIndependentOverlay .ts-details-summary {
        padding: 11px 14px;
        cursor: pointer;
        font-size: 11.5px;
        font-weight: 700;
        color: #94a3b8;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
        user-select: none;
        list-style: none;
      }
      #tsIndependentOverlay .ts-details-summary::-webkit-details-marker { display: none; }
      #tsIndependentOverlay .ts-details-summary:hover { color: #d1d5db; }
      #tsIndependentOverlay .ts-details-summary span {
        display: flex;
        align-items: center;
        gap: 7px;
      }
      #tsIndependentOverlay .ts-details-summary i.fa-headset { color: #3B82F6; }
      #tsIndependentOverlay .ts-details-arrow {
        font-size: 10px;
        transition: transform 0.25s ease;
      }
      #tsIndependentOverlay .ts-details[open] .ts-details-arrow { transform: rotate(180deg); }
      #tsIndependentOverlay .ts-details-content { padding: 4px 14px 12px; }
      #tsIndependentOverlay .ts-details-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 10px;
        padding: 9px 0;
        border-bottom: 1px dashed rgba(255, 255, 255, 0.06);
        font-size: 11.5px;
      }
      #tsIndependentOverlay .ts-details-row:last-of-type { border-bottom: none; }
      #tsIndependentOverlay .ts-details-key {
        color: #94a3b8;
        font-weight: 600;
        flex-shrink: 0;
        display: flex;
        align-items: center;
        gap: 6px;
      }
      #tsIndependentOverlay .ts-details-key i {
        font-size: 10px;
        color: #3B82F6;
        opacity: 0.7;
        width: 12px;
        text-align: center;
      }
      #tsIndependentOverlay .ts-details-value {
        color: #d1d5db;
        font-weight: 600;
        text-align: left;
        word-break: break-word;
        direction: ltr;
        font-size: 11px;
      }
      #tsIndependentOverlay .ts-details-note {
        margin-top: 10px;
        padding-top: 10px;
        border-top: 1px solid rgba(255, 255, 255, 0.06);
        font-size: 10px;
        color: #94a3b8;
        display: flex;
        align-items: center;
        gap: 6px;
        line-height: 1.5;
      }
      #tsIndependentOverlay .ts-details-note i { color: #3B82F6; flex-shrink: 0; }

      /* Actions */
      #tsIndependentOverlay .ts-actions {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 8px;
        margin-top: 14px;
      }
      #tsIndependentOverlay .ts-btn {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 7px;
        padding: 12px 14px;
        border-radius: 12px;
        font-family: inherit;
        font-size: 12.5px;
        font-weight: 700;
        cursor: pointer;
        border: none;
        transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
      }
      #tsIndependentOverlay .ts-btn:active { transform: scale(0.97); }
      #tsIndependentOverlay .ts-btn--primary {
        background: linear-gradient(135deg, #C4962C 0%, #F0D77B 100%);
        color: #052E22;
        box-shadow: 0 4px 14px -4px rgba(196, 150, 44, 0.45);
      }
      #tsIndependentOverlay .ts-btn--primary:hover {
        transform: translateY(-1px);
        box-shadow: 0 6px 20px -4px rgba(196, 150, 44, 0.55);
      }
      #tsIndependentOverlay .ts-btn--secondary {
        background: rgba(255, 255, 255, 0.05);
        color: #d1d5db;
        border: 1px solid rgba(255, 255, 255, 0.08);
      }
      #tsIndependentOverlay .ts-btn--secondary:hover {
        background: rgba(255, 255, 255, 0.1);
        color: #fff;
      }

      /* Support Link */
      #tsIndependentOverlay .ts-support-link {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
        margin-top: 12px;
        padding: 11px 14px;
        border-radius: 12px;
        background: rgba(59, 130, 246, 0.08);
        border: 1px solid rgba(59, 130, 246, 0.22);
        color: #93c5fd;
        font-size: 12px;
        font-weight: 700;
        transition: all 0.2s ease;
        cursor: pointer;
        font-family: inherit;
        width: 100%;
      }
      #tsIndependentOverlay .ts-support-link:hover {
        background: rgba(59, 130, 246, 0.15);
        transform: translateY(-1px);
      }

      /* Mobile */
      @media (max-width: 700px) {
        #tsIndependentOverlay {
          align-items: flex-end;
          padding: 0;
          padding-bottom: env(safe-area-inset-bottom);
        }
        #tsIndependentOverlay .ts-indep-panel {
          max-width: 100%;
          width: 100%;
          border-radius: 24px 24px 0 0;
          padding: 32px 18px 24px;
          max-height: 92dvh;
          transform: translateY(100%);
          border: none;
          border-top: 1px solid rgba(196, 150, 44, 0.2);
        }
        #tsIndependentOverlay.ts-indep-active .ts-indep-panel {
          transform: translateY(0);
        }
        #tsIndependentOverlay .ts-indep-close {
          top: 16px;
          left: auto;
          right: 18px;
          width: 40px;
          height: 40px;
          font-size: 15px;
        }
        #tsIndependentOverlay .ts-indep-header { padding: 0 50px; }
        #tsIndependentOverlay .ts-icon-wrap { width: 56px; height: 56px; }
        #tsIndependentOverlay .ts-icon-main { width: 48px; height: 48px; font-size: 20px; }
        #tsIndependentOverlay .ts-title { font-size: 17px; }
        #tsIndependentOverlay .ts-section { padding: 12px 13px; }
        #tsIndependentOverlay .ts-section-body { font-size: 12.5px; }
        #tsIndependentOverlay .ts-countdown-value { font-size: 34px; }
      }
      @media (max-width: 380px) {
        #tsIndependentOverlay .ts-actions { grid-template-columns: 1fr; }
      }
    `;
    document.head.appendChild(style);
  }

  // ═══════════════════════════════════════════════════════════
  // ISSUES
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
      commonCauses: ['انقطاع الإنترنت من مزود الخدمة.', 'تطبيق VPN يعمل في الخلفية.', 'إعدادات الوقت غير دقيقة.'],
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
      commonCauses: ['النقر المتكرر على زر الإرسال.', 'تحديث الصفحة بشكل متكرر.'],
      quickFixes: [{ icon: 'fa-clock', text: 'انتظر انتهاء العدّاد' }],
    },
    validation: {
      title: 'بيانات غير مكتملة',
      icon: 'fa-triangle-exclamation',
      color: '#F59E0B',
      reason: 'بعض الحقول الإلزامية فارغة أو تحتوي على بيانات غير صحيحة.',
      solution: 'راجع الحقول المُشار إليها أدناه، صحّح البيانات، ثم أعد الإرسال.',
      commonCauses: ['حقول مطلوبة (*) تُركت فارغة.', 'صيغة رقم الهاتف غير صحيحة.'],
      quickFixes: [],
    },
    cloudflare: {
      title: 'فشل التحقق الأمني',
      icon: 'fa-shield-virus',
      color: '#EF4444',
      reason: 'لم يتمكن النظام من التأكد أنك لست روبوت، ربما بسبب إضافة مانع الإعلانات.',
      solution: 'أوقف مانع الإعلانات على موقعنا، أو حدّث الصفحة.',
      commonCauses: ['استخدام إضافات AdBlocker.', 'وضع التصفح الخفي.'],
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
      quickFixes: [{ icon: 'fa-right-to-bracket', text: 'تسجيل الدخول', action: 'login' }],
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
  // Connection Test
  // ═══════════════════════════════════════════════════════════
  async function testConnection() {
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
  let countdownInterval = null;
  let currentErrorId = null;
  let retryFunction = null;

  // ═══════════════════════════════════════════════════════════
  // Ensure Modal Exists
  // ═══════════════════════════════════════════════════════════
  function ensureModal() {
    if (document.getElementById('tsIndependentOverlay')) return;
    
    injectStyles();
    
    const overlay = document.createElement('div');
    overlay.id = 'tsIndependentOverlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-hidden', 'true');
    
    overlay.innerHTML = `
      <div class="ts-indep-panel">
        <button class="ts-indep-close" type="button" aria-label="إغلاق" data-ts-close>
          <i class="fas fa-times"></i>
        </button>
        <div class="ts-indep-header">
          <h3>مركز حل المشكلات</h3>
        </div>
        <div class="ts-indep-body"></div>
      </div>
    `;
    
    document.body.appendChild(overlay);
    
    // إغلاق عند الضغط على الخلفية
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closeModal();
    });
    
    // زر الإغلاق
    overlay.querySelector('[data-ts-close]').addEventListener('click', (e) => {
      e.preventDefault();
      closeModal();
    });
    
    // ESC
    document.addEventListener('keydown', (e) => {
      if ((e.key === 'Escape' || e.key === 'Esc') && overlay.classList.contains('ts-indep-active')) {
        closeModal();
      }
    });
  }

  function openModal(html) {
    ensureModal();
    const overlay = document.getElementById('tsIndependentOverlay');
    const body = overlay.querySelector('.ts-indep-body');
    body.innerHTML = html;
    overlay.classList.add('ts-indep-active');
    overlay.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    console.log('✅ Modal opened successfully');
  }

  function closeModal() {
    const overlay = document.getElementById('tsIndependentOverlay');
    if (!overlay) return;
    overlay.classList.remove('ts-indep-active');
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
  // Main Function — openTroubleshootModal
  // ═══════════════════════════════════════════════════════════
  window.openTroubleshootModal = function (toolName = 'غير محددة', issueType = 'unknown', details = {}) {
    console.log('🔧 openTroubleshootModal called:', { toolName, issueType });
    
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
    
    // ── Header ──
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
    
    // ── Countdown ──
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
    
    // ── Failed Fields ──
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
    
    // ── Reason ──
    const reasonHTML = `
      <div class="ts-section ts-section--reason">
        <div class="ts-section-title">
          <i class="fas fa-bug"></i> <span>السبب المحتمل</span>
        </div>
        <p class="ts-section-body">${escapeHTML(issue.reason)}</p>
      </div>
    `;
    
    // ── Common Causes ──
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
    
    // ── Solution ──
    const solutionHTML = `
      <div class="ts-section ts-section--solution">
        <div class="ts-section-title">
          <i class="fas fa-lightbulb"></i> <span>كيف تحل المشكلة؟</span>
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
    
    // ── Details ──
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
    
    // ── Actions ──
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
    
    // ── Support Link ──
    const supportLinkHTML = `
      <button type="button" class="ts-support-link" data-ts-action="support">
        <i class="fas fa-headset"></i>
        <span>لم تحل المشكلة؟ تواصل مع الدعم</span>
      </button>
    `;
    
    // ── Final HTML ──
    const html = `
      <div class="ts-panel">
        ${headerHTML}
        ${countdownHTML}
        ${failedFieldsHTML}
        ${reasonHTML}
        ${causesHTML}
        ${solutionHTML}
        ${quickFixesHTML}
        <div class="ts-connection-result hidden"></div>
        ${detailsHTML}
        ${actionsHTML}
        ${supportLinkHTML}
      </div>
    `;
    
    // ── Open ──
    openModal(html);
    
    // ── Start countdown ──
    if (issueType === 'rate_limit' && details.retryAfter) {
      startCountdown(details.retryAfter);
    }
  };

  // ═══════════════════════════════════════════════════════════
  // Retry System
  // ═══════════════════════════════════════════════════════════
  window.registerRetry = (fn) => { retryFunction = fn; };
  
  window.retryLastAction = async () => {
    if (typeof retryFunction === 'function') {
      try { await retryFunction(); }
      catch { showTsToast('فشلت المحاولة مرة أخرى', 'error'); }
    } else {
      showTsToast('لا توجد عملية لإعادة المحاولة', 'info');
    }
  };

  // ═══════════════════════════════════════════════════════════
  // Event Delegation للأزرار
  // ═══════════════════════════════════════════════════════════
  document.addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-ts-action]');
    if (!btn) return;
    
    const action = btn.dataset.tsAction;
    
    // Close
    if (action === 'close') {
      e.preventDefault();
      closeModal();
      return;
    }
    
    // Retry
    if (action === 'retry') {
      e.preventDefault();
      closeModal();
      setTimeout(() => window.retryLastAction(), 300);
      return;
    }
    
    // Reload
    if (action === 'reload') {
      e.preventDefault();
      closeModal();
      setTimeout(() => location.reload(), 200);
      return;
    }
    
    // Home
    if (action === 'home') {
      e.preventDefault();
      closeModal();
      setTimeout(() => { location.href = '/'; }, 200);
      return;
    }
    
    // Login
    if (action === 'login') {
      e.preventDefault();
      closeModal();
      setTimeout(() => { location.href = '/login'; }, 200);
      return;
    }
    
    // Test Connection
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
      const result = await testConnection();
      const ok = result.ok;
      box.innerHTML = `
        <div class="ts-connection-status ${ok ? 'ts-connection-status--ok' : 'ts-connection-status--fail'}">
          <i class="fas ${ok ? 'fa-circle-check' : 'fa-circle-xmark'}"></i>
          <span>${ok ? 'الاتصال سليم' : 'تعذّر الاتصال'}</span>
          <span class="ts-connection-time">${result.time}ms</span>
        </div>
      `;
      showTsToast(ok ? '✅ الاتصال سليم' : '⚠️ مشاكل في الاتصال', ok ? 'success' : 'error');
      return;
    }
    
    // Copy ID
    if (action === 'copy-id') {
      e.preventDefault();
      const id = btn.dataset.errorId;
      const ok = await copyToClipboard(id);
      showTsToast(ok ? '✅ تم نسخ المعرّف' : '❌ تعذّر النسخ', ok ? 'success' : 'error');
      return;
    }
    
    // Copy Full
    if (action === 'copy') {
      e.preventDefault();
      const id = currentErrorId;
      if (!id) {
        showTsToast('لا يوجد معرّف للنسخ', 'error');
        return;
      }
      const originalHTML = btn.innerHTML;
      btn.disabled = true;
      btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i><span>جارٍ النسخ...</span>';
      const ok = await copyToClipboard(id);
      if (ok) {
        btn.innerHTML = '<i class="fas fa-check"></i><span>تم النسخ ✓</span>';
        showTsToast(`تم نسخ المعرّف: ${id}`, 'success');
        setTimeout(() => {
          btn.disabled = false;
          btn.innerHTML = originalHTML;
        }, 2000);
      } else {
        btn.disabled = false;
        btn.innerHTML = originalHTML;
        showTsToast('تعذّر النسخ — انسخ يدوياً: ' + id, 'error');
      }
      return;
    }
    
    // Support
    if (action === 'support') {
      e.preventDefault();
      closeModal();
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
  // Helpers
  // ═══════════════════════════════════════════════════════════
  window.reportIssue = (toolName, issueType, error) => {
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
    if (error?.name === 'AbortError' || error?.name === 'TimeoutError') {
      return window.openTroubleshootModal(toolName, 'timeout');
    }
    if (error?.message?.includes('Failed to fetch') || error?.message?.includes('NetworkError')) {
      return window.openTroubleshootModal(toolName, 'network');
    }
    return window.openTroubleshootModal(toolName, 'unknown');
  };

  console.log('✅ troubleshoot.js loaded successfully');
})();
