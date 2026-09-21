/**
 * Laxminarayan Group — Multi-Channel Lead Source Attribution Tracker
 * Automatically detects whether incoming traffic and enquiries originate from:
 * - Instagram (Bio links, Story swipe-ups, IG Ads, in-app browser referrer)
 * - Facebook (Posts, Boosted campaigns, FB Ads, referrer)
 * - WhatsApp (Direct chat, broadcast links, wa.me shares)
 * - Google Search / Ads
 * - Website Direct / Organic
 */
(function() {
  'use strict';

  function detectChannel() {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const utmSource = (urlParams.get('utm_source') || urlParams.get('source') || urlParams.get('ref') || '').toLowerCase().trim();
      const referrer = (document.referrer || '').toLowerCase().trim();

      // 1. Explicit UTM / Query parameter detection (Highest priority)
      if (utmSource) {
        if (utmSource.includes('insta') || utmSource === 'ig') return 'instagram';
        if (utmSource.includes('fb') || utmSource.includes('facebook')) return 'facebook';
        if (utmSource.includes('wa') || utmSource.includes('whatsapp')) return 'whatsapp';
        if (utmSource.includes('google') || utmSource.includes('gads')) return 'google';
        if (utmSource.includes('linkedin')) return 'linkedin';
        if (utmSource.includes('twitter') || utmSource === 'x') return 'twitter';
        if (utmSource.includes('youtube')) return 'youtube';
        return utmSource;
      }

      // 2. Browser Referrer detection (When user taps link in social app)
      if (referrer) {
        const refHost = (() => {
          try { return new URL(referrer).hostname; } catch(_) { return referrer; }
        })();

        if (refHost.includes('instagram.com')) return 'instagram';
        if (refHost.includes('facebook.com') || refHost.includes('fb.me') || refHost.includes('fb.com')) return 'facebook';
        if (refHost.includes('whatsapp.com') || refHost.includes('wa.me')) return 'whatsapp';
        if (refHost.includes('google.com') || refHost.includes('google.co')) return 'google';
        if (refHost.includes('linkedin.com')) return 'linkedin';
        if (refHost.includes('t.co') || refHost.includes('twitter.com') || refHost.includes('x.com')) return 'twitter';
        if (refHost.includes('youtube.com') || refHost.includes('youtu.be')) return 'youtube';
      }

      // 3. Fallback to existing session or website direct
      const existing = sessionStorage.getItem('lg_lead_source');
      if (existing) return existing;

      return 'website';
    } catch (_) {
      return 'website';
    }
  }

  // Determine source on load and persist in sessionStorage
  const currentChannel = detectChannel();
  try {
    sessionStorage.setItem('lg_lead_source', currentChannel);
    if (!localStorage.getItem('lg_first_touch_source')) {
      localStorage.setItem('lg_first_touch_source', currentChannel);
    }
  } catch (_) {}

  // Expose global attribution helper
  window.getLeadSource = function() {
    try {
      return sessionStorage.getItem('lg_lead_source') || currentChannel || 'website';
    } catch (_) {
      return 'website';
    }
  };

  window.getAttributionMetadata = function() {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      return {
        source: window.getLeadSource(),
        utm_source: urlParams.get('utm_source') || '',
        utm_medium: urlParams.get('utm_medium') || '',
        utm_campaign: urlParams.get('utm_campaign') || '',
        referrer: document.referrer || ''
      };
    } catch (_) {
      return { source: 'website' };
    }
  };

  // Authentic Official Brand Emoticons / Vector Icons
  const BRAND_ICONS = {
    whatsapp: (size = 14) => `<img src="assets/whatsapp.svg" width="${size}" height="${size}" alt="WhatsApp" style="vertical-align:-2px; display:inline-block; flex-shrink:0;">`,
    
    instagram: (size = 14) => `<img src="assets/instagram.svg" width="${size}" height="${size}" alt="Instagram" style="vertical-align:-2px; border-radius:3px; display:inline-block; flex-shrink:0;">`,
    
    facebook: (size = 14) => `<img src="assets/facebook.svg" width="${size}" height="${size}" alt="Facebook" style="vertical-align:-2px; display:inline-block; flex-shrink:0;">`,
    
    google: (size = 14) => `<img src="assets/google.svg" width="${size}" height="${size}" alt="Google" style="vertical-align:-2px; display:inline-block; flex-shrink:0;">`,
    
    website: (size = 14) => `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="#475569" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px; flex-shrink:0;"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>`,
    
    brochure: (size = 14) => `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="#0284c7" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px; flex-shrink:0;"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>`,
    
    admin: (size = 14) => `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="#92400e" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px; flex-shrink:0;"><rect x="4" y="2" width="16" height="20" rx="2"/><line x1="9" y1="22" x2="9" y2="22.01"/><line x1="15" y1="22" x2="15" y2="22.01"/><line x1="9" y1="6" x2="9" y2="6.01"/><line x1="15" y1="6" x2="15" y2="6.01"/><line x1="9" y1="10" x2="9" y2="10.01"/><line x1="15" y1="10" x2="15" y2="10.01"/><line x1="9" y1="14" x2="9" y2="14.01"/><line x1="15" y1="14" x2="15" y2="14.01"/></svg>`
  };

  window.getChannelIcon = function(source, size = 13) {
    const raw = String(source || 'website').toLowerCase().trim();
    if (raw.includes('whatsapp') || raw === 'wa') return BRAND_ICONS.whatsapp(size);
    if (raw.includes('instagram') || raw === 'ig') return BRAND_ICONS.instagram(size);
    if (raw.includes('facebook') || raw === 'fb') return BRAND_ICONS.facebook(size);
    if (raw.includes('google') || raw.includes('search') || raw.includes('gads')) return BRAND_ICONS.google(size);
    if (raw.includes('brochure')) return BRAND_ICONS.brochure(size);
    if (raw === 'admin' || raw.includes('walk-in') || raw.includes('phone') || raw.includes('manual')) return BRAND_ICONS.admin(size);
    return BRAND_ICONS.website(size);
  };

  /**
   * Generates a sleek, color-coded HTML pill badge with authentic brand logos
   * for any source value across Admin and Advisor dashboards.
   */
  window.renderSourceBadge = function(source) {
    const raw = String(source || 'website').toLowerCase().trim();
    
    if (raw.includes('instagram') || raw === 'ig') {
      return `<span class="source-badge badge-instagram" style="display:inline-flex; align-items:center; gap:6px; background:linear-gradient(135deg, #fdf2f8 0%, #fce7f3 100%); color:#be185d; border:1px solid #fbcfe8; padding:3px 9px; border-radius:9999px; font-size:11px; font-weight:700; letter-spacing:0.3px;">${BRAND_ICONS.instagram(13)}<span>Instagram</span></span>`;
    }
    if (raw.includes('facebook') || raw === 'fb') {
      return `<span class="source-badge badge-facebook" style="display:inline-flex; align-items:center; gap:6px; background:#eff6ff; color:#1d4ed8; border:1px solid #bfdbfe; padding:3px 9px; border-radius:9999px; font-size:11px; font-weight:700; letter-spacing:0.3px;">${BRAND_ICONS.facebook(13)}<span>Facebook</span></span>`;
    }
    if (raw.includes('whatsapp') || raw === 'wa') {
      return `<span class="source-badge badge-whatsapp" style="display:inline-flex; align-items:center; gap:6px; background:#f0fdf4; color:#15803d; border:1px solid #bbf7d0; padding:3px 9px; border-radius:9999px; font-size:11px; font-weight:700; letter-spacing:0.3px;">${BRAND_ICONS.whatsapp(13)}<span>WhatsApp</span></span>`;
    }
    if (raw.includes('google') || raw.includes('search') || raw.includes('gads')) {
      return `<span class="source-badge badge-google" style="display:inline-flex; align-items:center; gap:6px; background:#fef2f2; color:#b91c1c; border:1px solid #fecaca; padding:3px 9px; border-radius:9999px; font-size:11px; font-weight:700; letter-spacing:0.3px;">${BRAND_ICONS.google(13)}<span>Google</span></span>`;
    }
    if (raw.includes('brochure')) {
      return `<span class="source-badge badge-brochure" style="display:inline-flex; align-items:center; gap:6px; background:#e0f2fe; color:#0369a1; border:1px solid #bae6fd; padding:3px 9px; border-radius:9999px; font-size:11px; font-weight:700; letter-spacing:0.3px;">${BRAND_ICONS.brochure(13)}<span>Brochure</span></span>`;
    }
    if (raw.includes('walk-in') || raw === 'walkin') {
      return `<span class="source-badge badge-walkin" style="display:inline-flex; align-items:center; gap:6px; background:#fef3c7; color:#92400e; border:1px solid #fde68a; padding:3px 9px; border-radius:9999px; font-size:11px; font-weight:700; letter-spacing:0.3px;">${BRAND_ICONS.admin(13)}<span>Site Walk-In</span></span>`;
    }
    if (raw === 'admin' || raw.includes('phone') || raw.includes('manual')) {
      return `<span class="source-badge badge-admin" style="display:inline-flex; align-items:center; gap:6px; background:#fef3c7; color:#92400e; border:1px solid #fde68a; padding:3px 9px; border-radius:9999px; font-size:11px; font-weight:700; letter-spacing:0.3px;">${BRAND_ICONS.admin(13)}<span>Direct Staff</span></span>`;
    }
    return `<span class="source-badge badge-website" style="display:inline-flex; align-items:center; gap:6px; background:#f1f5f9; color:#475569; border:1px solid #e2e8f0; padding:3px 9px; border-radius:9999px; font-size:11px; font-weight:700; letter-spacing:0.3px;">${BRAND_ICONS.website(13)}<span>Website</span></span>`;
  };
})();
