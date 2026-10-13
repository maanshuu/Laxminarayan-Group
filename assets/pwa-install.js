/**
 * Laxminarayan Group - PWA Installation & Service Worker Manager
 * Provides non-intrusive luxury install prompts and registers the service worker.
 */
(function() {
  'use strict';

  // 1. Register Service Worker
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js', { scope: '/' })
        .then(reg => {
          // Check for background updates
          reg.addEventListener('updatefound', () => {
            const installing = reg.installing;
            if (installing) {
              installing.addEventListener('statechange', () => {
                if (installing.state === 'installed' && navigator.serviceWorker.controller) {
                  console.log('[PWA] New version available. Refresh to update.');
                }
              });
            }
          });
        })
        .catch(err => {
          console.warn('[PWA] Service Worker registration note:', err);
        });
    });
  }

  // 2. Install Prompt Management
  let deferredPrompt = null;
  const DISMISS_KEY = 'lng_pwa_install_dismissed_at';
  const DISMISS_DURATION_MS = 3 * 24 * 60 * 60 * 1000; // 3 days

  const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
                       window.navigator.standalone === true;

  if (isStandalone) {
    // Already running as an installed PWA
    return;
  }

  // Inject luxury install banner into DOM
  function createInstallBanner() {
    if (document.getElementById('lng-pwa-banner')) return;

    const banner = document.createElement('div');
    banner.id = 'lng-pwa-banner';
    banner.style.cssText = `
      position: fixed;
      bottom: 24px;
      right: 24px;
      z-index: 99999;
      max-width: 360px;
      width: calc(100% - 48px);
      background: rgba(11, 21, 40, 0.94);
      border: 1px solid rgba(197, 160, 89, 0.35);
      border-radius: 16px;
      box-shadow: 0 16px 40px rgba(0, 0, 0, 0.6), 0 0 15px rgba(197, 160, 89, 0.15);
      backdrop-filter: blur(14px);
      -webkit-backdrop-filter: blur(14px);
      padding: 16px;
      display: flex;
      align-items: center;
      gap: 14px;
      color: #E2E8F0;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      animation: lngSlideUp 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    `;

    banner.innerHTML = `
      <style>
        @keyframes lngSlideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        #lng-pwa-banner .install-btn {
          background: linear-gradient(135deg, #D4AF37 0%, #C5A059 100%);
          color: #0B1528;
          border: none;
          padding: 8px 14px;
          border-radius: 8px;
          font-weight: 700;
          font-size: 13px;
          cursor: pointer;
          white-space: nowrap;
          transition: transform 0.15s ease, box-shadow 0.15s ease;
        }
        #lng-pwa-banner .install-btn:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(197, 160, 89, 0.4);
        }
        #lng-pwa-banner .close-btn {
          background: none;
          border: none;
          color: #94A3B8;
          font-size: 18px;
          cursor: pointer;
          padding: 4px;
          line-height: 1;
        }
        #lng-pwa-banner .close-btn:hover {
          color: #FFF;
        }
      </style>
      <img src="/assets/icons/icon-96x96.png" alt="Laxminarayan" style="width: 44px; height: 44px; border-radius: 10px; border: 1px solid rgba(197,160,89,0.3); flex-shrink: 0;">
      <div style="flex: 1; min-width: 0;">
        <div style="font-size: 14px; font-weight: 700; color: #FFF; margin-bottom: 2px;">Install App</div>
        <div style="font-size: 12px; color: #94A3B8; line-height: 1.3;">Add to Home Screen for fast, 1-tap portal access.</div>
      </div>
      <div style="display: flex; align-items: center; gap: 8px; flex-shrink: 0;">
        <button class="install-btn" id="lng-pwa-install-trigger">Install</button>
        <button class="close-btn" id="lng-pwa-dismiss" title="Dismiss">&times;</button>
      </div>
    `;

    document.body.appendChild(banner);

    document.getElementById('lng-pwa-install-trigger').addEventListener('click', async () => {
      if (deferredPrompt) {
        deferredPrompt.prompt();
        const choice = await deferredPrompt.userChoice;
        if (choice.outcome === 'accepted') {
          console.log('[PWA] User accepted install prompt');
        }
        deferredPrompt = null;
        banner.remove();
      } else {
        // iOS or fallback
        showIosInstructions();
      }
    });

    document.getElementById('lng-pwa-dismiss').addEventListener('click', () => {
      localStorage.setItem(DISMISS_KEY, Date.now().toString());
      banner.style.animation = 'lngSlideUp 0.25s reverse forwards';
      setTimeout(() => banner.remove(), 250);
    });
  }

  function showIosInstructions() {
    alert("To install on iOS:\n1. Tap the Share button (square with arrow ⎋) at the bottom of Safari.\n2. Scroll down and tap 'Add to Home Screen' ➕.");
  }

  // Check if dismissed recently
  function isDismissedRecently() {
    const lastDismissed = localStorage.getItem(DISMISS_KEY);
    if (!lastDismissed) return false;
    return (Date.now() - parseInt(lastDismissed, 10)) < DISMISS_DURATION_MS;
  }

  // Listen for browser install availability
  window.addEventListener('beforeinstallprompt', e => {
    e.preventDefault();
    deferredPrompt = e;

    if (!isDismissedRecently()) {
      // Delay showing banner by 3 seconds so page loads smoothly first
      setTimeout(() => {
        createInstallBanner();
      }, 3000);
    }
  });

  // Global helper for manual "Install App" buttons
  window.promptPwaInstall = function() {
    if (deferredPrompt) {
      deferredPrompt.prompt();
    } else {
      const isIos = /iPhone|iPad|iPod/.test(navigator.userAgent);
      if (isIos) {
        showIosInstructions();
      } else {
        alert("To install on your device, tap your browser's menu (⋮) and select 'Install app' or 'Add to Home Screen'.");
      }
    }
  };
})();
