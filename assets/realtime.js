/**
 * Laxminarayan Group — Enterprise Real-Time Sync & Live Event Dispatcher
 * Powered by Server-Sent Events (SSE) & Web Audio Synthesizer
 * 
 * Features:
 *  1. Zero-latency event streaming from /api/stream/events
 *  2. Synthesized luxury audio chime for new VIP enquiries
 *  3. Interactive floating notification card with instant drawer jump
 *  4. Automated background workspace refresh (No F5 required)
 *  5. Resilient auto-reconnect with exponential backoff & offline detection
 */

(function () {
  'use strict';

  // Prevent multiple initializations
  if (window.__LNG_REALTIME_INITIALIZED__) return;
  window.__LNG_REALTIME_INITIALIZED__ = true;

  let eventSource = null;
  let reconnectTimer = null;
  let reconnectAttempts = 0;
  let audioCtx = null;

  // ─── 1. AUDIO SYNTHESIZER (LUXURY EXECUTIVE CHIME) ───
  function unlockAudio() {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      if (!audioCtx) audioCtx = new AudioCtx();
      if (audioCtx.state === 'suspended') audioCtx.resume();
    } catch (_) {}
  }
  window.addEventListener('click', unlockAudio, { once: true, passive: true });
  window.addEventListener('keydown', unlockAudio, { once: true, passive: true });
  window.addEventListener('touchstart', unlockAudio, { once: true, passive: true });

  function playLuxuryChime() {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      if (!audioCtx) audioCtx = new AudioCtx();
      if (audioCtx.state === 'suspended') {
        audioCtx.resume().catch(() => {});
      }
      const now = audioCtx.currentTime;

      // Note 1: 587.33 Hz (D5)
      const osc1 = audioCtx.createOscillator();
      const gain1 = audioCtx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(587.33, now);
      gain1.gain.setValueAtTime(0.001, now);
      gain1.gain.exponentialRampToValueAtTime(0.12, now + 0.02);
      gain1.gain.exponentialRampToValueAtTime(0.0001, now + 0.42);
      osc1.connect(gain1);
      gain1.connect(audioCtx.destination);
      osc1.start(now);
      osc1.stop(now + 0.43);

      // Note 2: 880.00 Hz (A5)
      const osc2 = audioCtx.createOscillator();
      const gain2 = audioCtx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(880.00, now + 0.10);
      gain2.gain.setValueAtTime(0.001, now + 0.10);
      gain2.gain.exponentialRampToValueAtTime(0.15, now + 0.13);
      gain2.gain.exponentialRampToValueAtTime(0.0001, now + 0.75);
      osc2.connect(gain2);
      gain2.connect(audioCtx.destination);
      osc2.start(now + 0.10);
      osc2.stop(now + 0.76);
    } catch (e) {
      // Audio autoplay policy might defer sound until user clicks
    }
  }

  // ─── 2. FLOATING REAL-TIME UI NOTIFICATION ───
  function injectStyles() {
    if (document.getElementById('lng-realtime-styles')) return;
    const style = document.createElement('style');
    style.id = 'lng-realtime-styles';
    style.textContent = `
      .lng-rt-container {
        position: fixed;
        top: 24px;
        right: 24px;
        z-index: 999999;
        display: flex;
        flex-direction: column;
        gap: 12px;
        pointer-events: none;
        max-width: 380px;
        width: calc(100% - 48px);
      }
      .lng-rt-card {
        pointer-events: auto;
        background: rgba(11, 21, 40, 0.94);
        backdrop-filter: blur(14px);
        -webkit-backdrop-filter: blur(14px);
        border: 1px solid rgba(212, 175, 55, 0.4);
        box-shadow: 0 20px 40px -10px rgba(0, 0, 0, 0.5), 0 0 20px rgba(2, 132, 199, 0.25);
        border-radius: 14px;
        padding: 16px 18px 14px;
        color: #f8fafc;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Plus Jakarta Sans", sans-serif;
        animation: lngRtSlideIn 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        position: relative;
        overflow: hidden;
      }
      .lng-rt-card.hide {
        animation: lngRtSlideOut 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
      }
      @keyframes lngRtSlideIn {
        from { opacity: 0; transform: translateY(-16px) scale(0.96); }
        to { opacity: 1; transform: translateY(0) scale(1); }
      }
      @keyframes lngRtSlideOut {
        from { opacity: 1; transform: translateY(0) scale(1); }
        to { opacity: 0; transform: translateY(-12px) scale(0.95); }
      }
      .lng-rt-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 8px;
      }
      .lng-rt-badge {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        background: linear-gradient(135deg, rgba(2, 132, 199, 0.25), rgba(212, 175, 55, 0.2));
        border: 1px solid rgba(2, 132, 199, 0.4);
        color: #38bdf8;
        font-size: 11px;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.6px;
        padding: 3px 8px;
        border-radius: 6px;
      }
      .lng-rt-dot {
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background: #10b981;
        box-shadow: 0 0 8px #10b981;
        animation: lngRtPulse 1.5s infinite;
      }
      @keyframes lngRtPulse {
        0%, 100% { opacity: 1; transform: scale(1); }
        50% { opacity: 0.4; transform: scale(1.3); }
      }
      .lng-rt-close {
        background: none;
        border: none;
        color: #94a3b8;
        font-size: 18px;
        line-height: 1;
        cursor: pointer;
        padding: 2px 6px;
        border-radius: 4px;
        transition: color 0.15s, background 0.15s;
      }
      .lng-rt-close:hover {
        color: #ffffff;
        background: rgba(255, 255, 255, 0.1);
      }
      .lng-rt-name {
        font-size: 15px;
        font-weight: 700;
        color: #ffffff;
        margin-bottom: 3px;
        line-height: 1.25;
      }
      .lng-rt-sub {
        font-size: 12px;
        color: #cbd5e1;
        line-height: 1.4;
        margin-bottom: 12px;
      }
      .lng-rt-actions {
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .lng-rt-btn {
        flex: 1;
        background: linear-gradient(135deg, #0284c7 0%, #0369a1 100%);
        color: #ffffff;
        border: none;
        border-radius: 8px;
        padding: 7px 12px;
        font-size: 12px;
        font-weight: 600;
        cursor: pointer;
        text-align: center;
        transition: transform 0.15s, box-shadow 0.15s;
        box-shadow: 0 2px 8px rgba(2, 132, 199, 0.4);
      }
      .lng-rt-btn:hover {
        transform: translateY(-1px);
        box-shadow: 0 4px 12px rgba(2, 132, 199, 0.6);
      }
      .lng-rt-btn-sec {
        background: rgba(255, 255, 255, 0.08);
        color: #cbd5e1;
        border: 1px solid rgba(255, 255, 255, 0.12);
        box-shadow: none;
      }
      .lng-rt-btn-sec:hover {
        background: rgba(255, 255, 255, 0.15);
        color: #ffffff;
        box-shadow: none;
      }
      .lng-rt-progress {
        position: absolute;
        bottom: 0;
        left: 0;
        height: 2px;
        background: linear-gradient(90deg, #0284c7, #d4af37);
        width: 100%;
        animation: lngRtProgress 6.5s linear forwards;
      }
      @keyframes lngRtProgress {
        from { width: 100%; }
        to { width: 0%; }
      }
    `;
    document.head.appendChild(style);
  }

  function getContainer() {
    let container = document.getElementById('lng-realtime-container');
    if (!container) {
      injectStyles();
      container = document.createElement('div');
      container.id = 'lng-realtime-container';
      container.className = 'lng-rt-container';
      document.body.appendChild(container);
    }
    return container;
  }

  function showLeadNotification(lead) {
    const container = getContainer();
    const card = document.createElement('div');
    card.className = 'lng-rt-card';

    const pName = lead.project_name || 'General Portfolio';
    const src = (lead.source || 'website').toUpperCase().replace(/_/g, ' ');
    const clientName = lead.name || 'New Client';

    card.innerHTML = `
      <div class="lng-rt-header">
        <span class="lng-rt-badge"><span class="lng-rt-dot"></span> LIVE ENQUIRY • ${escapeHtml(src)}</span>
        <button class="lng-rt-close" title="Dismiss">&times;</button>
      </div>
      <div class="lng-rt-name">${escapeHtml(clientName)}</div>
      <div class="lng-rt-sub">Interested in <strong>${escapeHtml(pName)}</strong></div>
      <div class="lng-rt-actions">
        <button class="lng-rt-btn lng-rt-action-view">View Enquiry</button>
        <button class="lng-rt-btn lng-rt-btn-sec lng-rt-action-close">Dismiss</button>
      </div>
      <div class="lng-rt-progress"></div>
    `;

    const close = () => {
      card.classList.add('hide');
      setTimeout(() => card.remove(), 320);
    };

    card.querySelector('.lng-rt-close').onclick = close;
    card.querySelector('.lng-rt-action-close').onclick = close;

    card.querySelector('.lng-rt-action-view').onclick = () => {
      close();
      handleViewLeadClick(lead);
    };

    container.prepend(card);

    // Auto dismiss after 6.5s
    setTimeout(() => {
      if (card.isConnected) close();
    }, 6500);
  }

  function escapeHtml(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function handleViewLeadClick(lead) {
    // 1. If on Admin Portal
    if (typeof window.showView === 'function') {
      window.showView('leadsView', { scroll: true });
      setTimeout(() => {
        if (typeof window.smoothScrollToWorkspace === 'function') {
          window.smoothScrollToWorkspace();
        }
        if (typeof window.openDrawer === 'function') {
          window.openDrawer(lead);
        } else {
          const s = document.getElementById('leadFilterSearch');
          if (s) {
            s.value = lead.name;
            s.dispatchEvent(new Event('input'));
          }
        }
      }, 100);
      return;
    }

    // 2. If on Advisor Portal
    if (typeof window.openEditModal === 'function') {
      window.openEditModal(lead.id);
      return;
    }
  }

  // ─── 3. BACKGROUND WORKSPACE AUTO-REFRESH ───
  function triggerWorkspaceRefresh(eventData) {
    // Advisor Portal
    if (typeof window.loadPortal === 'function') {
      window.loadPortal().catch(() => {});
    }
    if (typeof window.loadAdvisorLeads === 'function') {
      window.loadAdvisorLeads().catch(() => {});
    }

    // Admin Portal
    if (typeof window.loadLeads === 'function') {
      window.loadLeads().catch(() => {});
    }
    if (typeof window.load === 'function') {
      window.load().catch(() => {});
    }
    if (typeof window.loadAttendance === 'function' && document.getElementById('attendanceView')?.classList.contains('active')) {
      window.loadAttendance().catch(() => {});
    }
  }

  // ─── 4. SSE CONNECTION & EVENT ROUTING ───
  function connect() {
    if (eventSource) {
      try { eventSource.close(); } catch (_) {}
      eventSource = null;
    }

    // Connect to SSE stream
    eventSource = new EventSource('/api/stream/events');

    eventSource.onopen = function () {
      reconnectAttempts = 0;
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
      }
    };

    eventSource.onmessage = function (e) {
      try {
        const payload = JSON.parse(e.data);
        if (!payload || !payload.type) return;

        if (payload.type === 'connected') {
          // Connected successfully
          return;
        }

        if (payload.type === 'new_lead') {
          playLuxuryChime();
          showLeadNotification(payload.data || {});
          triggerWorkspaceRefresh(payload.data);
        } else if (payload.type === 'lead_updated') {
          triggerWorkspaceRefresh(payload.data);
        } else if (payload.type === 'attendance_punch') {
          if (typeof window.loadAttendance === 'function') {
            window.loadAttendance().catch(() => {});
          }
          if (typeof window.toast === 'function' && payload.data) {
            const d = payload.data;
            const actionText = d.action === 'check_out' ? 'checked out' : 'punched in';
            window.toast(`📍 ${d.employee_name || 'Team member'} ${actionText} (${d.site || 'Site'})`);
          }
        }
      } catch (err) {
        console.debug('[Realtime SSE Parse]', err);
      }
    };

    eventSource.onerror = function () {
      try { eventSource.close(); } catch (_) {}
      eventSource = null;

      // Exponential backoff reconnect: 3s, 6s, 12s, max 20s
      const delay = Math.min(20000, (Math.pow(2, reconnectAttempts) * 1500) + Math.random() * 1000);
      reconnectAttempts++;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      reconnectTimer = setTimeout(connect, delay);
    };
  }

  // Auto-reconnect when device comes back online
  window.addEventListener('online', () => {
    reconnectAttempts = 0;
    connect();
  });

  // Start connection
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', connect);
  } else {
    connect();
  }

})();
