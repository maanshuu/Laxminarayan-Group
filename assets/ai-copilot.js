/**
 * Laxminarayan Group — Enterprise AI Real Estate Copilot UI
 * Interactive WhatsApp Pitch Drafter for Admins & Sales Advisors
 */

(function () {
  'use strict';

  if (window.__LNG_AI_COPILOT_INITIALIZED__) return;
  window.__LNG_AI_COPILOT_INITIALIZED__ = true;

  let currentLead = null;
  let currentPitchText = '';

  function injectStyles() {
    if (document.getElementById('lng-ai-copilot-styles')) return;
    const style = document.createElement('style');
    style.id = 'lng-ai-copilot-styles';
    style.textContent = `
      .lng-ai-backdrop {
        position: fixed;
        inset: 0;
        background: rgba(11, 21, 40, 0.75);
        backdrop-filter: blur(8px);
        -webkit-backdrop-filter: blur(8px);
        z-index: 100000;
        display: none;
        align-items: center;
        justify-content: center;
        padding: 16px;
        animation: lngAiFadeIn 0.2s ease-out forwards;
      }
      .lng-ai-backdrop.open {
        display: flex;
      }
      @keyframes lngAiFadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }
      .lng-ai-modal {
        background: #ffffff;
        width: 100%;
        max-width: 620px;
        max-height: 92vh;
        border-radius: 16px;
        box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.35), 0 0 0 1px rgba(2, 132, 199, 0.15);
        overflow: hidden;
        display: flex;
        flex-direction: column;
        animation: lngAiSlideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Plus Jakarta Sans", sans-serif;
      }
      @keyframes lngAiSlideUp {
        from { opacity: 0; transform: translateY(16px) scale(0.97); }
        to { opacity: 1; transform: translateY(0) scale(1); }
      }
      .lng-ai-header {
        background: linear-gradient(135deg, #0b1528 0%, #0369a1 100%);
        color: #ffffff;
        padding: 18px 24px;
        display: flex;
        align-items: center;
        justify-content: space-between;
      }
      .lng-ai-title {
        margin: 0;
        font-size: 17px;
        font-weight: 700;
        display: flex;
        align-items: center;
        gap: 8px;
        letter-spacing: -0.2px;
      }
      .lng-ai-badge {
        font-size: 11px;
        background: rgba(212, 175, 55, 0.25);
        border: 1px solid rgba(212, 175, 55, 0.5);
        color: #fde047;
        padding: 2px 8px;
        border-radius: 9999px;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }
      .lng-ai-close {
        background: rgba(255, 255, 255, 0.12);
        border: none;
        color: #ffffff;
        width: 32px;
        height: 32px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 16px;
        cursor: pointer;
        transition: background 0.15s, transform 0.15s;
      }
      .lng-ai-close:hover {
        background: rgba(255, 255, 255, 0.25);
        transform: scale(1.05);
      }
      .lng-ai-body {
        padding: 20px 24px;
        overflow-y: auto;
        flex: 1;
      }
      .lng-ai-lead-info {
        background: #f8fafc;
        border: 1px solid #e2e8f0;
        border-radius: 10px;
        padding: 12px 14px;
        margin-bottom: 16px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        flex-wrap: wrap;
        gap: 8px;
      }
      .lng-ai-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 12px;
        margin-bottom: 14px;
      }
      @media (max-width: 520px) {
        .lng-ai-grid { grid-template-columns: 1fr; }
      }
      .lng-ai-field label {
        display: block;
        font-size: 11.5px;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.4px;
        color: #475569;
        margin-bottom: 5px;
      }
      .lng-ai-field select, .lng-ai-field input {
        width: 100%;
        padding: 9px 12px;
        border: 1px solid #cbd5e1;
        border-radius: 8px;
        font-size: 13px;
        background: #ffffff;
        color: #0f172a;
        box-sizing: border-box;
      }
      .lng-ai-field select:focus, .lng-ai-field input:focus {
        border-color: #0284c7;
        outline: none;
        box-shadow: 0 0 0 3px rgba(2, 132, 199, 0.15);
      }
      .lng-ai-gen-btn {
        width: 100%;
        background: linear-gradient(135deg, #0284c7 0%, #0369a1 100%);
        color: #ffffff;
        border: none;
        border-radius: 10px;
        padding: 11px 16px;
        font-size: 13.5px;
        font-weight: 700;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        box-shadow: 0 4px 12px rgba(2, 132, 199, 0.35);
        transition: transform 0.15s, box-shadow 0.15s;
        margin-top: 4px;
        margin-bottom: 16px;
      }
      .lng-ai-gen-btn:hover {
        transform: translateY(-1px);
        box-shadow: 0 6px 16px rgba(2, 132, 199, 0.45);
      }
      .lng-ai-gen-btn:disabled {
        opacity: 0.65;
        cursor: not-allowed;
        transform: none;
      }
      .lng-ai-pitch-wrap {
        border: 1px solid #e2e8f0;
        border-radius: 12px;
        background: #fafaf9;
        padding: 12px;
        margin-bottom: 14px;
      }
      .lng-ai-pitch-head {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 8px;
        font-size: 11.5px;
        font-weight: 700;
        color: #64748b;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }
      .lng-ai-textarea {
        width: 100%;
        min-height: 140px;
        border: 1px solid #cbd5e1;
        border-radius: 8px;
        padding: 12px;
        font-size: 13px;
        line-height: 1.5;
        font-family: inherit;
        background: #ffffff;
        color: #0f172a;
        resize: vertical;
        box-sizing: border-box;
      }
      .lng-ai-textarea:focus {
        border-color: #0284c7;
        outline: none;
        box-shadow: 0 0 0 3px rgba(2, 132, 199, 0.15);
      }
      .lng-ai-footer {
        background: #f8fafc;
        border-top: 1px solid #e2e8f0;
        padding: 14px 24px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        flex-wrap: wrap;
        gap: 10px;
      }
      .lng-ai-wa-btn {
        background: #25D366;
        color: #ffffff;
        border: none;
        border-radius: 9999px;
        padding: 9px 18px;
        font-size: 13px;
        font-weight: 700;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        gap: 6px;
        text-decoration: none;
        box-shadow: 0 4px 12px rgba(37, 211, 102, 0.35);
        transition: transform 0.15s, box-shadow 0.15s;
      }
      .lng-ai-wa-btn:hover {
        transform: translateY(-1px);
        box-shadow: 0 6px 16px rgba(37, 211, 102, 0.45);
      }
      .lng-ai-sec-btn {
        background: #ffffff;
        border: 1px solid #cbd5e1;
        color: #334155;
        border-radius: 8px;
        padding: 8px 14px;
        font-size: 12.5px;
        font-weight: 600;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        gap: 6px;
        transition: background 0.15s;
      }
      .lng-ai-sec-btn:hover {
        background: #f1f5f9;
        color: #0f172a;
      }
    `;
    document.head.appendChild(style);
  }

  function createModalHtml() {
    if (document.getElementById('lngAiPitchBackdrop')) return;
    injectStyles();

    const backdrop = document.createElement('div');
    backdrop.id = 'lngAiPitchBackdrop';
    backdrop.className = 'lng-ai-backdrop';

    backdrop.innerHTML = `
      <div class="lng-ai-modal" onclick="event.stopPropagation()">
        <div class="lng-ai-header">
          <h3 class="lng-ai-title">
            <span>✨ AI Real Estate Copilot</span>
            <span class="lng-ai-badge">WhatsApp Pitch</span>
          </h3>
          <button class="lng-ai-close" id="lngAiCloseBtn" title="Close">&times;</button>
        </div>
        <div class="lng-ai-body">
          <div class="lng-ai-lead-info">
            <div>
              <div style="font-size:11px; text-transform:uppercase; color:#64748b; font-weight:700;">Prospective Buyer</div>
              <strong id="lngAiLeadName" style="font-size:14.5px; color:#0f172a;">—</strong>
            </div>
            <div>
              <div style="font-size:11px; text-transform:uppercase; color:#64748b; font-weight:700;">Project Interest</div>
              <strong id="lngAiLeadProject" style="font-size:14.5px; color:#0284c7;">—</strong>
            </div>
            <div>
              <div style="font-size:11px; text-transform:uppercase; color:#64748b; font-weight:700;">Buyer Sentiment</div>
              <span id="lngAiLeadSentiment" style="font-size:12px; font-weight:700; color:#b45309;">Warm</span>
            </div>
          </div>

          <div class="lng-ai-grid">
            <div class="lng-ai-field">
              <label for="lngAiTone">Pitch Objective</label>
              <select id="lngAiTone">
                <option value="site_visit">📅 Site Visit & Sample Tour</option>
                <option value="highlights">🏢 Project Highlights & Layouts</option>
                <option value="payment">💰 Pricing & Payment Plan Quote</option>
                <option value="reengage">🤝 Gentle Re-engagement / Check-in</option>
              </select>
            </div>
            <div class="lng-ai-field">
              <label for="lngAiLang">Pitch Language</label>
              <select id="lngAiLang">
                <option value="english">🇬🇧 English (Executive & Courteous)</option>
                <option value="gujarati">🇮🇳 Gujarati (ગુજરાતી - સ્થાનિક સ્નેહપૂર્ણ)</option>
                <option value="hindi">🇮🇳 Hindi (हिन्दी - आदरणीय एवं आकर्षक)</option>
              </select>
            </div>
          </div>

          <div class="lng-ai-field" style="margin-bottom:12px;">
            <label for="lngAiCustom">Special Instruction / Custom Context (Optional)</label>
            <input type="text" id="lngAiCustom" placeholder="e.g. Invite for Sunday high-tea, mention 3 BHK sample villa...">
          </div>

          <button type="button" class="lng-ai-gen-btn" id="lngAiGenBtn">
            <span>✨ Generate AI WhatsApp Pitch</span>
          </button>

          <div class="lng-ai-pitch-wrap">
            <div class="lng-ai-pitch-head">
              <span>Personalized WhatsApp Pitch (Ready to Send)</span>
              <span id="lngAiWordCount" style="font-size:11px; font-weight:600; text-transform:none;"></span>
            </div>
            <textarea id="lngAiPitchOutput" class="lng-ai-textarea" placeholder="Click 'Generate AI WhatsApp Pitch' above to draft an executive real estate message tailored to this client..."></textarea>
          </div>
        </div>
        <div class="lng-ai-footer">
          <div style="display:flex; gap:8px;">
            <button type="button" class="lng-ai-sec-btn" id="lngAiCopyBtn">📋 Copy Pitch</button>
            <button type="button" class="lng-ai-sec-btn" id="lngAiSaveNoteBtn">📝 Save to CRM Notes</button>
          </div>
          <a id="lngAiSendWaBtn" href="#" target="_blank" class="lng-ai-wa-btn">
            <span>💬 Send on WhatsApp</span>
          </a>
        </div>
      </div>
    `;

    document.body.appendChild(backdrop);

    backdrop.onclick = closeAiPitchModal;
    document.getElementById('lngAiCloseBtn').onclick = closeAiPitchModal;
    document.getElementById('lngAiGenBtn').onclick = generatePitch;
    document.getElementById('lngAiCopyBtn').onclick = copyPitch;
    document.getElementById('lngAiSaveNoteBtn').onclick = savePitchToNotes;

    document.getElementById('lngAiPitchOutput').addEventListener('input', e => {
      currentPitchText = e.target.value;
      updateWaLink();
      updateWordCount();
    });
  }

  function openAiPitchModal(leadOrId) {
    createModalHtml();

    let lead = null;
    if (typeof leadOrId === 'object' && leadOrId !== null) {
      lead = leadOrId;
    } else if (typeof leadOrId === 'number' || typeof leadOrId === 'string') {
      const id = Number(leadOrId);
      const stateLeads = (window.state && Array.isArray(window.state.leads)) ? window.state.leads : [];
      lead = stateLeads.find(l => Number(l.id) === id) || { id };
    }

    if (!lead || !lead.id) {
      if (typeof window.toast === 'function') window.toast('No enquiry selected for AI Copilot');
      return;
    }

    currentLead = lead;
    currentPitchText = '';

    document.getElementById('lngAiLeadName').textContent = lead.name || 'Valued Buyer';
    document.getElementById('lngAiLeadProject').textContent = lead.project_name || 'General Portfolio';
    document.getElementById('lngAiLeadSentiment').textContent = (lead.sentiment || 'warm').toUpperCase();
    document.getElementById('lngAiPitchOutput').value = '';
    document.getElementById('lngAiWordCount').textContent = '';
    document.getElementById('lngAiCustom').value = '';

    updateWaLink();

    const backdrop = document.getElementById('lngAiPitchBackdrop');
    backdrop.classList.add('open');

    // Automatically trigger initial generation
    generatePitch();
  }
  window.openAiPitchModal = openAiPitchModal;

  function closeAiPitchModal() {
    const backdrop = document.getElementById('lngAiPitchBackdrop');
    if (backdrop) backdrop.classList.remove('open');
  }
  window.closeAiPitchModal = closeAiPitchModal;

  async function generatePitch() {
    if (!currentLead || !currentLead.id) return;

    const btn = document.getElementById('lngAiGenBtn');
    const out = document.getElementById('lngAiPitchOutput');
    const tone = document.getElementById('lngAiTone').value;
    const language = document.getElementById('lngAiLang').value;
    const customPrompt = document.getElementById('lngAiCustom').value.trim();

    btn.disabled = true;
    btn.innerHTML = `<span>⏳ Crafting bespoke pitch...</span>`;
    out.value = 'Thinking and crafting luxury real estate follow-up pitch...';

    try {
      const res = await fetch('/api/ai/draft-pitch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          lead_id: currentLead.id,
          tone,
          language,
          custom_prompt: customPrompt
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to draft pitch');
      }

      currentPitchText = data.pitch || '';
      out.value = currentPitchText;
      updateWaLink();
      updateWordCount();

      if (typeof window.toast === 'function') {
        window.toast(`✨ ${language.toUpperCase()} pitch generated!`);
      }
    } catch (err) {
      out.value = `Unable to generate: ${err.message}. Please try again.`;
      if (typeof window.toast === 'function') window.toast(err.message);
    } finally {
      btn.disabled = false;
      btn.innerHTML = `<span>✨ Generate AI WhatsApp Pitch</span>`;
    }
  }

  function updateWaLink() {
    const waBtn = document.getElementById('lngAiSendWaBtn');
    if (!waBtn) return;
    const rawPhone = currentLead?.phone || '';
    const cleanPhone = String(rawPhone).replace(/[^0-9]/g, '');

    if (cleanPhone && cleanPhone.length >= 10 && currentPitchText) {
      waBtn.href = `https://wa.me/91${cleanPhone.slice(-10)}?text=${encodeURIComponent(currentPitchText)}`;
      waBtn.style.pointerEvents = 'auto';
      waBtn.style.opacity = '1';
    } else {
      waBtn.href = '#';
      waBtn.style.pointerEvents = 'none';
      waBtn.style.opacity = '0.5';
    }
  }

  function updateWordCount() {
    const wcEl = document.getElementById('lngAiWordCount');
    if (!wcEl) return;
    const text = (currentPitchText || '').trim();
    if (!text) {
      wcEl.textContent = '';
      return;
    }
    const words = text.split(/\s+/).length;
    wcEl.textContent = `${words} words`;
  }

  function copyPitch() {
    if (!currentPitchText) {
      if (typeof window.toast === 'function') window.toast('No pitch to copy yet');
      return;
    }
    navigator.clipboard.writeText(currentPitchText).then(() => {
      if (typeof window.toast === 'function') window.toast('📋 Pitch copied to clipboard!');
    }).catch(() => {
      const out = document.getElementById('lngAiPitchOutput');
      out.select();
      document.execCommand('copy');
      if (typeof window.toast === 'function') window.toast('📋 Copied to clipboard!');
    });
  }

  async function savePitchToNotes() {
    if (!currentLead || !currentLead.id || !currentPitchText) {
      if (typeof window.toast === 'function') window.toast('No pitch text to save');
      return;
    }

    const saveBtn = document.getElementById('lngAiSaveNoteBtn');
    saveBtn.disabled = true;
    saveBtn.textContent = 'Saving...';

    try {
      const res = await fetch('/api/ai/save-pitch-note', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          lead_id: currentLead.id,
          summary: currentPitchText
        })
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Failed to save note');

      if (typeof window.toast === 'function') {
        window.toast('✅ AI pitch logged to CRM follow-up notes!');
      }

      // Refresh lead drawer or workspace if available
      if (typeof window.loadLeads === 'function') window.loadLeads();
      if (typeof window.loadPortal === 'function') window.loadPortal();

      // If drawer notes field is open in admin
      const drawerNotes = document.getElementById('drawerNotes');
      if (drawerNotes) {
        drawerNotes.value = (drawerNotes.value ? (drawerNotes.value + '\n\n') : '') + `[✨ AI WhatsApp Follow-up]:\n${currentPitchText}`;
      }
    } catch (err) {
      if (typeof window.toast === 'function') window.toast(err.message);
    } finally {
      saveBtn.disabled = false;
      saveBtn.textContent = '📝 Save to CRM Notes';
    }
  }

})();
