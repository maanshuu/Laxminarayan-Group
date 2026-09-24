/**
 * Laxminarayan Group — Official Real Estate Cost Sheet & Quotation Generator
 * Generates verified, Indian developer-compliant buyer quotations with:
 * - Agreement / Base Value (Rate x Area)
 * - Development & Infrastructure Charges (Clubhouse, Electrification, Legal)
 * - Statutory Taxes (GST, Stamp Duty 4.9%, Registration 1%)
 * - 7-Stage Construction-Linked Payment (CLP) Schedule
 * - 1-Click WhatsApp Quotation Share & Print/PDF Export
 */

(function() {
  'use strict';

  function formatINR(val) {
    const num = Math.round(Number(val) || 0);
    return '₹ ' + num.toLocaleString('en-IN');
  }

  function numberToWordsINR(num) {
    if (!num || isNaN(num)) return '';
    const a = ['', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ', 'Ten ', 'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ', 'Seventeen ', 'Eighteen ', 'Nineteen '];
    const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

    function inWords(n) {
      if (n < 20) return a[n];
      const digit = n % 10;
      return b[Math.floor(n / 10)] + (digit ? ' ' + a[digit] : '');
    }

    let n = Math.round(num);
    let str = '';
    const crore = Math.floor(n / 10000000);
    n %= 10000000;
    const lakh = Math.floor(n / 100000);
    n %= 100000;
    const thousand = Math.floor(n / 1000);
    n %= 1000;
    const hundred = Math.floor(n / 100);
    n %= 100;

    if (crore > 0) str += inWords(crore) + ' Crore ';
    if (lakh > 0) str += inWords(lakh) + ' Lakh ';
    if (thousand > 0) str += inWords(thousand) + ' Thousand ';
    if (hundred > 0) str += inWords(hundred) + ' Hundred ';
    if (n > 0) str += (str !== '' ? 'and ' : '') + inWords(n);
    return (str.trim() + ' Rupees Only');
  }

  const STAGES = [
    { label: 'Booking Token / Earnest Advance', pct: 10 },
    { label: 'On Agreement & Plinth Completion', pct: 20 }
  ];

  function ensureModalDOM() {
    if (document.getElementById('costSheetModal')) return;

    const modalHTML = `
      <div id="costSheetModal" class="cs-backdrop" style="display:none; position:fixed; inset:0; background:rgba(15,23,42,0.7); backdrop-filter:blur(5px); z-index:9999; overflow-y:auto; padding:20px; font-family:'Plus Jakarta Sans',sans-serif;">
        <div class="cs-container" style="max-width:860px; margin:20px auto; background:#ffffff; border-radius:16px; box-shadow:0 25px 50px -12px rgba(0,0,0,0.25); overflow:hidden; border:1px solid #e2e8f0;">
          
          <!-- MODAL TOOLBAR (Hidden in Print) -->
          <div class="cs-no-print" style="padding:14px 24px; background:#0f172a; color:#fff; display:flex; justify-content:space-between; align-items:center;">
            <div style="display:flex; align-items:center; gap:10px;">
              <img src="assets/logo-mark.png" alt="LG" style="height:22px; width:auto; object-fit:contain;">
              <span style="font-weight:800; letter-spacing:1px; font-size:13px; color:#38bdf8;">LAXMINARAYAN GROUP</span>
              <span style="color:#64748b;">•</span>
              <span style="font-size:13px; font-weight:600; color:#f8fafc;">Official Buyer Cost Sheet & Quotation</span>
            </div>
            <div style="display:flex; align-items:center; gap:8px;">
              <button id="csBtnWhatsApp" style="background:#16a34a; color:#fff; border:none; padding:7px 14px; border-radius:6px; font-size:12px; font-weight:700; cursor:pointer; display:inline-flex; align-items:center; gap:6px;">
                💬 Share on WhatsApp
              </button>
              <button id="csBtnPrint" style="background:#0284c7; color:#fff; border:none; padding:7px 14px; border-radius:6px; font-size:12px; font-weight:700; cursor:pointer; display:inline-flex; align-items:center; gap:6px;">
                🖨️ Print / Save PDF
              </button>
              <button id="csBtnClose" style="background:transparent; color:#94a3b8; border:1px solid #334155; padding:5px 12px; border-radius:6px; font-size:14px; cursor:pointer; font-weight:700; margin-left:8px;">
                ✕
              </button>
            </div>
          </div>

          <!-- PRINTABLE OFFICIAL COST SHEET DOCUMENT -->
          <div id="csPrintArea" style="padding:32px 40px; color:#0f172a; background:#fff;">
            
            <!-- HEADER -->
            <div style="display:flex; justify-content:space-between; align-items:flex-start; border-bottom:2px solid #0284c7; padding-bottom:18px; margin-bottom:24px;">
              <div style="display:flex; align-items:center; gap:16px;">
                <img src="assets/logo-mark.png" alt="Laxminarayan Logo" style="height:54px; width:auto; object-fit:contain;">
                <div>
                  <div style="font-size:24px; font-weight:800; color:#0f172a; letter-spacing:-0.5px; font-family:'Playfair Display',serif;">LAXMINARAYAN GROUP</div>
                  <div style="font-size:11px; font-weight:700; letter-spacing:1.5px; color:#0284c7; text-transform:uppercase; margin-top:2px;">Architectural Excellence & Luxury Development</div>
                  <div style="font-size:12px; color:#64748b; margin-top:4px;">Registered Office: 5, Ground floor, Madhav Evenue, odhav circle, Ahmedabad</div>
                </div>
              </div>
              <div style="text-align:right;">
                <span style="display:inline-block; background:#e0f2fe; color:#0369a1; padding:4px 12px; border-radius:9999px; font-size:11px; font-weight:800; letter-spacing:0.5px; text-transform:uppercase;">OFFICIAL QUOTATION</span>
                <div style="font-size:11px; color:#64748b; margin-top:6px;">Ref: <b id="csDocRef">LG-EST-001</b></div>
                <div style="font-size:11px; color:#64748b;">Date: <b id="csDocDate">Today</b></div>
              </div>
            </div>

            <!-- BUYER & PROPERTY DETAILS GRID (Inputs during edit, clean text during print) -->
            <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:10px; padding:18px; margin-bottom:24px;">
              <div style="display:grid; grid-template-columns:repeat(3, 1fr); gap:16px;">
                <div>
                  <label style="font-size:10px; font-weight:800; color:#64748b; text-transform:uppercase; display:block; margin-bottom:4px;">Prospective Buyer</label>
                  <input id="csClientName" class="cs-input" placeholder="e.g. Rajesh Sharma" style="width:100%; font-size:13px; font-weight:700; padding:6px 10px; border:1px solid #cbd5e1; border-radius:6px; box-sizing:border-box;">
                </div>
                <div>
                  <label style="font-size:10px; font-weight:800; color:#64748b; text-transform:uppercase; display:block; margin-bottom:4px;">Contact Phone</label>
                  <input id="csClientPhone" class="cs-input" placeholder="e.g. 9876543210" style="width:100%; font-size:13px; font-weight:600; padding:6px 10px; border:1px solid #cbd5e1; border-radius:6px; box-sizing:border-box;">
                </div>
                <div>
                  <label style="font-size:10px; font-weight:800; color:#64748b; text-transform:uppercase; display:block; margin-bottom:4px;">Construction Site</label>
                  <select id="csProjectSelect" class="cs-input" style="width:100%; font-size:13px; font-weight:700; padding:6px 10px; border:1px solid #cbd5e1; border-radius:6px; box-sizing:border-box;">
                    <option value="DS 208 (Developed by Akshar Group)">DS 208 (Developed by Akshar Group)</option>
                    <option value="Nilkanth Villa">Nilkanth Villa</option>
                  </select>
                </div>
                <div>
                  <label style="font-size:10px; font-weight:800; color:#64748b; text-transform:uppercase; display:block; margin-bottom:4px;">Unit / Flat / Villa No.</label>
                  <input id="csUnitNumber" class="cs-input" placeholder="e.g. Tower A - 402" value="Tower A - 402" style="width:100%; font-size:13px; font-weight:700; padding:6px 10px; border:1px solid #cbd5e1; border-radius:6px; box-sizing:border-box;">
                </div>
                <div>
                  <label style="font-size:10px; font-weight:800; color:#64748b; text-transform:uppercase; display:block; margin-bottom:4px;">Area (Sq. Ft.)</label>
                  <input id="csAreaSqft" type="number" class="cs-input" value="1450" style="width:100%; font-size:13px; font-weight:700; padding:6px 10px; border:1px solid #cbd5e1; border-radius:6px; box-sizing:border-box;">
                </div>
                <div>
                  <label style="font-size:10px; font-weight:800; color:#64748b; text-transform:uppercase; display:block; margin-bottom:4px;">Base Rate (₹ / Sq. Ft.)</label>
                  <input id="csBaseRate" type="number" class="cs-input" value="4200" style="width:100%; font-size:13px; font-weight:700; padding:6px 10px; border:1px solid #cbd5e1; border-radius:6px; box-sizing:border-box;">
                </div>
              </div>
            </div>

            <!-- PAYMENT SCHEDULE SECTION (FORMERLY PART B, NOW PART A) -->
            <div style="margin-bottom:28px;">
              <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
                <div style="font-size:13px; font-weight:800; text-transform:uppercase; letter-spacing:1px; color:#0284c7;">Part A: Construction-Linked Payment (CLP) Schedule</div>
                <div style="font-size:12px; color:#64748b;">Basic Cost: <b id="csValAgreement" style="color:#0f172a; font-size:13px;">₹ 0</b> <span id="csBasisAgreement" style="font-size:11px; color:#94a3b8;"></span></div>
              </div>
              <table style="width:100%; border-collapse:collapse; font-size:12.5px;">
                <thead>
                  <tr style="background:#f1f5f9; border-bottom:1px solid #cbd5e1;">
                    <th style="padding:10px 14px; text-align:left; font-weight:700; color:#475569;">#</th>
                    <th style="padding:10px 14px; text-align:left; font-weight:700; color:#475569;">Construction Milestone</th>
                    <th style="padding:10px 14px; text-align:center; font-weight:700; color:#475569;">Installment (%)</th>
                    <th style="padding:10px 14px; text-align:right; font-weight:700; color:#475569;">Stage Amount (₹)</th>
                  </tr>
                </thead>
                <tbody id="csScheduleRows"></tbody>
              </table>
            </div>

            <!-- TERMS & SIGNATURE BLOCK -->
            <div style="border-top:1px solid #e2e8f0; padding-top:18px; display:flex; justify-content:space-between; align-items:flex-end; font-size:11px; color:#64748b;">
              <div style="max-width:440px;">
                <b>Notes & Terms:</b>
                <ol style="margin-left:16px; margin-top:4px; line-height:1.4;">
                  <li>Cheques / RTGS payable to <b>"Laxminarayan Group Project Escrow Account"</b>.</li>
                  <li>Stamp duty & registration fees are subject to government tariff rules at the time of legal registry.</li>
                  <li>Quotation is valid for 15 days from issue date.</li>
                </ol>
              </div>
              <div style="text-align:center;">
                <div style="width:160px; border-bottom:1px dashed #94a3b8; height:45px; margin-bottom:6px;"></div>
                <div style="font-weight:700; color:#0f172a;">Authorized Sales Signatory</div>
                <div style="font-size:10px; color:#94a3b8;">Laxminarayan Group</div>
              </div>
            </div>

          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);

    // Attach listeners
    document.getElementById('csBtnClose').onclick = closeCostSheetModal;
    document.getElementById('csBtnPrint').onclick = () => window.print();
    document.getElementById('csBtnWhatsApp').onclick = shareCostSheetWhatsApp;

    ['csClientName', 'csClientPhone', 'csUnitNumber', 'csAreaSqft', 'csBaseRate', 'csProjectSelect'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.addEventListener('input', recalcCostSheet);
    });
  }

  function recalcCostSheet() {
    const area = Number(document.getElementById('csAreaSqft')?.value) || 0;
    const rate = Number(document.getElementById('csBaseRate')?.value) || 0;
    const agreementVal = area * rate;

    const basisEl = document.getElementById('csBasisAgreement');
    if (basisEl) basisEl.textContent = `(${area.toLocaleString('en-IN')} sq.ft @ ₹${rate.toLocaleString('en-IN')}/sq.ft)`;
    const valEl = document.getElementById('csValAgreement');
    if (valEl) valEl.textContent = formatINR(agreementVal);

    // Milestones (Part A with 1 and 2)
    const rows = STAGES.map((s, idx) => {
      const stageAmt = Math.round((agreementVal * s.pct) / 100);
      return `
        <tr style="border-bottom:1px solid #f1f5f9;">
          <td style="padding:10px 14px; font-weight:700; color:#64748b;">${idx + 1}</td>
          <td style="padding:10px 14px; font-weight:600; color:#0f172a;">${s.label}</td>
          <td style="padding:10px 14px; text-align:center; font-weight:700; color:#0284c7;">${s.pct}%</td>
          <td style="padding:10px 14px; text-align:right; font-weight:700; color:#0f172a;">${formatINR(stageAmt)}</td>
        </tr>
      `;
    }).join('');

    const tbody = document.getElementById('csScheduleRows');
    if (tbody) tbody.innerHTML = rows;
  }

  function shareCostSheetWhatsApp() {
    const clientName = document.getElementById('csClientName')?.value || 'Sir/Madam';
    const clientPhone = (document.getElementById('csClientPhone')?.value || '').replace(/[^0-9]/g, '');
    const project = document.getElementById('csProjectSelect')?.value || '';
    const unit = document.getElementById('csUnitNumber')?.value || '';
    const area = Number(document.getElementById('csAreaSqft')?.value) || 0;
    const rate = Number(document.getElementById('csBaseRate')?.value) || 0;
    const agreementVal = area * rate;

    const stage1Amt = formatINR(Math.round((agreementVal * 10) / 100));
    const stage2Amt = formatINR(Math.round((agreementVal * 20) / 100));

    const text = `Greetings ${clientName} from *Laxminarayan Group*,\n\nHere is your official requested quotation for *${project}*:\n` +
      `🏢 *Unit:* ${unit} (${area} Sq. Ft.)\n` +
      `💰 *Basic Consideration:* ${formatINR(agreementVal)}\n\n` +
      `📅 *Part A: Construction-Linked Payment (CLP) Schedule:*\n` +
      `1. Booking Token / Earnest Advance (10%): ${stage1Amt}\n` +
      `2. On Agreement & Plinth Completion (20%): ${stage2Amt}\n\n` +
      `Would you like to schedule a personal site visit to view the sample unit this week?`;

    const clean = clientPhone.length >= 10 ? clientPhone.slice(-10) : '';
    const url = clean ? `https://wa.me/91${clean}?text=${encodeURIComponent(text)}` : `https://wa.me/?text=${encodeURIComponent(text)}`;
  }

  window.openCostSheetModal = function(opts = {}) {
    ensureModalDOM();
    const modal = document.getElementById('costSheetModal');
    if (opts.clientName) document.getElementById('csClientName').value = opts.clientName;
    if (opts.clientPhone) document.getElementById('csClientPhone').value = opts.clientPhone;
    if (opts.unitNumber) document.getElementById('csUnitNumber').value = opts.unitNumber;
    if (opts.areaSqft) document.getElementById('csAreaSqft').value = opts.areaSqft;
    if (opts.baseRate) document.getElementById('csBaseRate').value = opts.baseRate;
    if (opts.projectName) {
      const sel = document.getElementById('csProjectSelect');
      for (let i = 0; i < sel.options.length; i++) {
        if (sel.options[i].text.toLowerCase().includes(opts.projectName.toLowerCase())) {
          sel.selectedIndex = i;
          break;
        }
      }
    }

    const now = new Date();
    document.getElementById('csDocRef').textContent = 'LG-EST-' + Math.floor(1000 + Math.random() * 9000);
    document.getElementById('csDocDate').textContent = now.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

    recalcCostSheet();
    modal.style.display = 'block';
  };

  window.closeCostSheetModal = function() {
    const modal = document.getElementById('costSheetModal');
    if (modal) modal.style.display = 'none';
  };

  // Inject print CSS
  const printStyle = document.createElement('style');
  printStyle.textContent = `
    @media print {
      body * { visibility: hidden !important; }
      #costSheetModal, #csPrintArea, #csPrintArea * { visibility: visible !important; }
      #costSheetModal { position: absolute !important; left: 0 !important; top: 0 !important; width: 100% !important; background: transparent !important; padding: 0 !important; }
      .cs-no-print { display: none !important; }
      .cs-input { border: none !important; padding: 0 !important; background: transparent !important; }
    }
  `;
  document.head.appendChild(printStyle);

})();
