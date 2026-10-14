/**
 * Laxminarayan Group - Executive Command Palette (Ctrl + K)
 * Universal Spotlight Search, Dynamic Project & Unit Locator, and Quick Actions
 */
(function() {
  'use strict';

  let isOpen = false;
  let selectedIndex = 0;
  let currentResults = [];
  let dynamicProjects = [];
  let dynamicUnits = [];

  function isAdvisor() {
    return window.location.pathname.includes('advisor.html') || !!document.getElementById('advisorName');
  }

  function isAdmin() {
    return window.location.pathname.includes('admin.html') || !!document.getElementById('heroOpenLeads');
  }

  // Preload and keep projects / inventory synced
  async function syncDynamicData() {
    try {
      const pEndpoint = isAdmin() ? '/api/admin/projects' : '/api/projects';
      const pRes = await fetch(pEndpoint, { credentials: 'include' });
      const pJson = await pRes.json();
      if (pJson && pJson.success && Array.isArray(pJson.data)) {
        dynamicProjects = pJson.data;
      } else if (Array.isArray(pJson)) {
        dynamicProjects = pJson;
      }

      if (isAdmin()) {
        const uRes = await fetch('/api/admin/units', { credentials: 'include' });
        const uJson = await uRes.json();
        if (uJson && uJson.success && Array.isArray(uJson.data)) {
          dynamicUnits = uJson.data;
        }
      }
    } catch (_e) {
      // Non-blocking fallback to in-memory state
    }
  }

  // Inject palette DOM structure if missing
  function initDOM() {
    if (document.getElementById('cmdPaletteBackdrop')) return;

    const backdrop = document.createElement('div');
    backdrop.id = 'cmdPaletteBackdrop';
    backdrop.innerHTML = `
      <div id="cmdPaletteModal" role="dialog" aria-modal="true" aria-label="Command Palette">
        <div class="cmd-search-wrap">
          <div class="cmd-search-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
          </div>
          <input id="cmdPaletteInput" class="cmd-search-input" type="text" placeholder="Search projects (e.g. The Neer, DS 208), clients, units, or actions..." autocomplete="off" spellcheck="false">
          <span class="cmd-esc-badge" id="cmdPaletteCloseBtn">ESC</span>
        </div>
        <div id="cmdPaletteResults" class="cmd-results-list"></div>
        <div class="cmd-footer">
          <div class="cmd-footer-keys">
            <span class="cmd-footer-key"><kbd>↑</kbd><kbd>↓</kbd> Navigate</span>
            <span class="cmd-footer-key"><kbd>↵</kbd> Select</span>
            <span class="cmd-footer-key"><kbd>esc</kbd> Close</span>
          </div>
          <span id="cmdPaletteCount" style="color:#C5A059; font-weight:600;">Laxminarayan Command Bar</span>
        </div>
      </div>
    `;

    document.body.appendChild(backdrop);

    // Click outside to close
    backdrop.addEventListener('click', e => {
      if (e.target === backdrop) closeCommandPalette();
    });

    document.getElementById('cmdPaletteCloseBtn').addEventListener('click', closeCommandPalette);

    const input = document.getElementById('cmdPaletteInput');
    input.addEventListener('input', () => {
      renderSearch(input.value.trim());
    });

    syncDynamicData();
  }

  // Gather searchable items
  function getItems() {
    const items = [];

    // ─── 1. QUICK ACTIONS ───
    if (isAdvisor()) {
      items.push({
        type: 'action',
        category: 'Quick Actions',
        icon: '⚡',
        title: 'Record Site Walk-In Visitor',
        sub: 'Register a new customer currently present at the sales office',
        badge: 'Action',
        run: () => { if (typeof window.openWalkInModal === 'function') window.openWalkInModal(); }
      });
      items.push({
        type: 'action',
        category: 'Quick Actions',
        icon: '📍',
        title: 'Mark GPS Attendance Check-In / Out',
        sub: 'Verify site geofence and record daily attendance',
        badge: 'Action',
        run: () => {
          const btn = document.getElementById('btnCheckIn');
          if (btn && !btn.disabled) btn.click();
          else if (typeof window.performAttendanceCheckIn === 'function') window.performAttendanceCheckIn();
        }
      });
      items.push({
        type: 'action',
        category: 'Quick Actions',
        icon: '📄',
        title: 'Generate Buyer Cost Sheet (Quote)',
        sub: 'Calculate unit price, development charges, and generate luxury PDF/WhatsApp quote',
        badge: 'Calculator',
        run: () => { if (typeof window.openCostSheetModal === 'function') window.openCostSheetModal(); }
      });
      items.push({
        type: 'action',
        category: 'Quick Actions',
        icon: '📅',
        title: "View Today's Scheduled Follow-Ups",
        sub: 'Filter pipeline to client appointments scheduled for today',
        badge: 'Filter',
        run: () => { if (typeof window.filterAdvisorLeads === 'function') window.filterAdvisorLeads('today'); }
      });
      items.push({
        type: 'action',
        category: 'Quick Actions',
        icon: '⚠️',
        title: 'View Overdue Follow-Ups',
        sub: 'Show pending client interactions that need immediate attention',
        badge: 'Filter',
        run: () => { if (typeof window.filterAdvisorLeads === 'function') window.filterAdvisorLeads('overdue'); }
      });
      items.push({
        type: 'action',
        category: 'Quick Actions',
        icon: '🔥',
        title: 'Filter Hot Prospective Buyers',
        sub: 'High probability deals ready for site visit or token booking',
        badge: 'Filter',
        run: () => {
          const sel = document.getElementById('advisorPriorityFilter');
          if (sel) { sel.value = 'hot'; if (typeof window.onAdvisorPriorityChange === 'function') window.onAdvisorPriorityChange(); }
        }
      });
      items.push({
        type: 'action',
        category: 'Quick Actions',
        icon: '✨',
        title: '✨ AI WhatsApp Pitch Drafter',
        sub: 'Draft high-converting follow-up pitch in English, Gujarati, or Hindi',
        badge: 'AI Copilot',
        run: () => {
          const firstLead = (window.state?.leads && window.state.leads[0]) || { id: 1, name: 'Valued Client' };
          if (typeof window.openAiPitchModal === 'function') window.openAiPitchModal(firstLead);
        }
      });
    }

    if (isAdmin()) {
      items.push({
        type: 'action',
        category: 'Quick Actions',
        icon: '✨',
        title: '✨ AI WhatsApp Pitch Drafter',
        sub: 'Draft high-converting follow-up pitch in English, Gujarati, or Hindi',
        badge: 'AI Copilot',
        run: () => {
          const firstLead = (window.state?.leads && window.state.leads[0]) || { id: 1, name: 'Valued Client' };
          if (typeof window.openAiPitchModal === 'function') window.openAiPitchModal(firstLead);
        }
      });
      items.push({
        type: 'action',
        category: 'Quick Actions',
        icon: '⚡',
        title: '+ Add New Customer Enquiry',
        sub: 'Create a new CRM lead from phone, walk-in, or portal',
        badge: 'Lead',
        run: () => {
          if (typeof window.openLeadModal === 'function') window.openLeadModal();
          else if (typeof window.showView === 'function') {
            window.showView('overview');
            document.getElementById('enquiryNameInline')?.focus();
          }
        }
      });
      items.push({
        type: 'action',
        category: 'Quick Actions',
        icon: '📄',
        title: 'Generate Buyer Cost Sheet',
        sub: 'Calculate floor rates and share WhatsApp / PDF cost estimate',
        badge: 'Quote',
        run: () => { if (typeof window.openCostSheetModal === 'function') window.openCostSheetModal(); }
      });
      items.push({
        type: 'action',
        category: 'Quick Actions',
        icon: '📥',
        title: 'Download Database Backup (.db)',
        sub: 'Export complete portable SQLite database snapshot',
        badge: 'Backup',
        run: () => {
          const btn = document.querySelector('a[href*="/api/admin/backup/download"]');
          if (btn) btn.click();
          else window.location.href = '/api/admin/backup/download';
        }
      });
      items.push({
        type: 'action',
        category: 'Quick Actions',
        icon: '⚡',
        title: 'Email & WhatsApp Diagnostics',
        sub: 'Test live SMTP relay credentials and Meta WhatsApp webhook',
        badge: 'Diagnostic',
        run: () => { if (typeof window.openIntegrationModal === 'function') window.openIntegrationModal(); }
      });

      // Navigation Views
      const views = [
        { id: 'overview', title: 'Executive Overview', icon: '📊' },
        { id: 'leadsView', title: 'Enquiries & Leads Pipeline', icon: '👤' },
        { id: 'unitsView', title: 'Units & Inventory Matrix', icon: '🏢' },
        { id: 'bookingsView', title: 'Bookings & Financial Closures', icon: '🤝' },
        { id: 'visitsView', title: 'Site Visits Radar', icon: '📍' },
        { id: 'projectsView', title: 'Projects Portfolio', icon: '🏗️' },
        { id: 'teamView', title: 'Team & Staff Management', icon: '👥' },
        { id: 'attendanceView', title: 'Staff Attendance & Geofencing', icon: '📅' },
        { id: 'customersView', title: 'Customer Directory', icon: '📇' },
        { id: 'reportsView', title: 'Analytics & Export Reports', icon: '📈' },
        { id: 'auditView', title: 'Security Audit & Activity Logs', icon: '📜' }
      ];

      views.forEach(v => {
        items.push({
          type: 'nav',
          category: 'Portal Navigation',
          icon: v.icon,
          title: `Jump to ${v.title}`,
          sub: `Switch active view to ${v.id}`,
          badge: 'View',
          run: () => {
            if (typeof window.showView === 'function') {
              const isOverview = v.id === 'overview';
              window.showView(v.id, { scroll: !isOverview });
              if (isOverview) {
                window.scrollTo({ top: 0, behavior: 'smooth' });
              } else if (typeof window.smoothScrollToWorkspace === 'function') {
                window.smoothScrollToWorkspace();
              }
            }
          }
        });
      });
    }

    // ─── 2. ALL REAL PROJECTS (DYNAMIC - NEVER HARDCODED) ───
    const projectsMap = new Map();

    // Ingest from state.projects (Live in Admin & Advisor)
    const stateProjects = (window.state && Array.isArray(window.state.projects)) ? window.state.projects : [];
    stateProjects.forEach(p => {
      if (p && (p.name || p.id)) projectsMap.set(String(p.id || p.name), p);
    });

    // Ingest from dynamic fetched cache
    dynamicProjects.forEach(p => {
      if (p && (p.name || p.id)) {
        const key = String(p.id || p.name);
        if (!projectsMap.has(key)) projectsMap.set(key, p);
      }
    });

    // Render every real project into searchable items
    projectsMap.forEach(p => {
      const pName = String(p.name || '').trim();
      if (!pName) return;

      const cat = String(p.category || 'RESIDENTIAL & COMMERCIAL').trim();
      const loc = p.location ? ` • ${p.location}` : '';
      const desc = p.description ? (p.description.slice(0, 95) + '...') : `${cat}${loc}`;
      const isVilla = cat.toLowerCase().includes('villa');

      items.push({
        type: 'project',
        category: 'Projects',
        icon: isVilla ? '🏡' : '🏢',
        title: pName,
        sub: desc,
        badge: cat.toUpperCase(),
        searchTerms: `${pName} ${cat} ${p.location || ''} ${p.description || ''} ${p.price || ''} ${p.id || ''}`,
        run: () => {
          if (isAdmin() && typeof window.showView === 'function') {
            window.showView('projectsView', { scroll: true });
            setTimeout(() => {
              if (typeof window.smoothScrollToWorkspace === 'function') {
                window.smoothScrollToWorkspace();
              }
              const pSearch = document.getElementById('projectSearch');
              if (pSearch) {
                pSearch.value = pName;
                pSearch.dispatchEvent(new Event('input'));
              }
            }, 70);
          } else if (isAdvisor()) {
            if (typeof window.filterAdvisorLeads === 'function') {
              const pSel = document.getElementById('advisorSearchInput');
              if (pSel) {
                pSel.value = pName;
                pSel.dispatchEvent(new Event('input'));
              }
            }
            if (p.id === 1 || pName.toLowerCase().includes('ds 208')) {
              window.open('/detail-ds208.html', '_blank');
            } else if (p.id === 2 || pName.toLowerCase().includes('nilkanth')) {
              window.open('/detail-nilkanth.html', '_blank');
            } else {
              window.open(`/project-detail.html?id=${p.id}`, '_blank');
            }
          }
        }
      });
    });

    // ─── 3. CLIENT LEADS & ENQUIRIES ───
    const leadsSource = (window.state && Array.isArray(window.state.leads))
      ? window.state.leads
      : (window.data?.leads || window.leads || []);

    if (Array.isArray(leadsSource)) {
      leadsSource.slice(0, 100).forEach(l => {
        items.push({
          type: 'lead',
          category: 'Clients & Enquiries',
          icon: '👤',
          title: `${l.name || 'Valued Client'} · #${l.id}`,
          sub: `${l.project_name || 'General Project'} • Stage: ${l.status || 'new'} ${l.sentiment ? '• ' + l.sentiment.toUpperCase() : ''}`,
          badge: l.sentiment || l.status || 'Lead',
          searchTerms: `${l.name || ''} ${l.phone || ''} ${l.project_name || ''} ${l.status || ''} #${l.id}`,
          run: () => {
            if (isAdvisor() && typeof window.openEditModal === 'function') {
              window.openEditModal(l.id);
            } else if (isAdmin()) {
              if (typeof window.openDrawer === 'function') {
                window.openDrawer(l);
              } else if (typeof window.showView === 'function') {
                window.showView('leadsView', { scroll: true });
                setTimeout(() => {
                  if (typeof window.smoothScrollToWorkspace === 'function') {
                    window.smoothScrollToWorkspace();
                  }
                }, 70);
              }
            }
          }
        });
      });
    }

    // ─── 4. PROJECT UNITS & INVENTORY ───
    const unitsSource = (window.state && Array.isArray(window.state.units) && window.state.units.length)
      ? window.state.units
      : dynamicUnits;

    if (Array.isArray(unitsSource)) {
      unitsSource.slice(0, 50).forEach(u => {
        const uNum = u.unit_number || u.unit || `Unit #${u.id}`;
        items.push({
          type: 'unit',
          category: 'Project Units',
          icon: '🚪',
          title: `${uNum} (${u.project_name || 'Residences'})`,
          sub: `${u.type || u.unit_type || 'Luxury Unit'} • ${u.area_sqft || u.area || ''} sq.ft • Status: ${(u.status || 'available').toUpperCase()}`,
          badge: (u.status || 'available').toUpperCase(),
          searchTerms: `${uNum} ${u.project_name || ''} ${u.type || ''} ${u.status || ''}`,
          run: () => {
            if (isAdmin() && typeof window.showView === 'function') {
              window.showView('unitsView', { scroll: true });
              setTimeout(() => {
                if (typeof window.smoothScrollToWorkspace === 'function') {
                  window.smoothScrollToWorkspace();
                }
              }, 70);
            }
          }
        });
      });
    }

    return items;
  }

  // Render search results
  function renderSearch(query) {
    const listEl = document.getElementById('cmdPaletteResults');
    const countEl = document.getElementById('cmdPaletteCount');
    if (!listEl) return;

    const allItems = getItems();
    let filtered = allItems;

    if (query) {
      const q = query.toLowerCase();
      filtered = allItems.filter(item => {
        const titleMatch = (item.title || '').toLowerCase().includes(q);
        const subMatch = (item.sub || '').toLowerCase().includes(q);
        const catMatch = (item.category || '').toLowerCase().includes(q);
        const termsMatch = (item.searchTerms || '').toLowerCase().includes(q);
        return titleMatch || subMatch || catMatch || termsMatch;
      });
    }

    currentResults = filtered;
    selectedIndex = 0;

    if (filtered.length === 0) {
      listEl.innerHTML = `
        <div class="cmd-empty">
          <span>🔍</span>
          No matches found for "<strong>${escapeHtml(query)}</strong>".<br>
          Try searching for a project name, client name, unit (e.g. 302), or action.
        </div>
      `;
      countEl.textContent = '0 results';
      return;
    }

    countEl.textContent = `${filtered.length} item${filtered.length === 1 ? '' : 's'}`;

    // Group items by category
    const grouped = {};
    filtered.forEach((item, idx) => {
      if (!grouped[item.category]) grouped[item.category] = [];
      grouped[item.category].push({ item, idx });
    });

    let html = '';
    for (const cat in grouped) {
      html += `<div class="cmd-section-title">${escapeHtml(cat)}</div>`;
      grouped[cat].forEach(({ item, idx }) => {
        const isSel = idx === selectedIndex;
        html += `
          <div class="cmd-item ${isSel ? 'selected' : ''}" data-index="${idx}">
            <div class="cmd-item-left">
              <div class="cmd-item-icon">${item.icon || '⚡'}</div>
              <div class="cmd-item-text">
                <div class="cmd-item-title">${highlightMatch(item.title, query)}</div>
                <div class="cmd-item-sub">${escapeHtml(item.sub || '')}</div>
              </div>
            </div>
            <div class="cmd-item-right">
              ${item.badge ? `<span class="cmd-item-badge">${escapeHtml(item.badge)}</span>` : ''}
              <span class="cmd-enter-hint">↵ Enter</span>
            </div>
          </div>
        `;
      });
    }

    listEl.innerHTML = html;

    // Attach click listeners
    listEl.querySelectorAll('.cmd-item').forEach(el => {
      el.addEventListener('click', () => {
        const idx = parseInt(el.getAttribute('data-index'), 10);
        executeItem(idx);
      });
    });
  }

  function updateSelection() {
    const listEl = document.getElementById('cmdPaletteResults');
    if (!listEl) return;
    const items = listEl.querySelectorAll('.cmd-item');
    items.forEach((el, idx) => {
      if (idx === selectedIndex) {
        el.classList.add('selected');
        el.scrollIntoView({ block: 'nearest' });
      } else {
        el.classList.remove('selected');
      }
    });
  }

  function executeItem(index) {
    const item = currentResults[index];
    if (item && typeof item.run === 'function') {
      closeCommandPalette();
      try {
        item.run();
      } catch (err) {
        console.error('[CommandPalette] Execution note:', err);
      }
    }
  }

  function highlightMatch(text, query) {
    if (!query) return escapeHtml(text);
    const safeText = escapeHtml(text);
    const safeQuery = escapeHtml(query);
    const regex = new RegExp(`(${safeQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    return safeText.replace(regex, '<span style="color:#FFDF80; font-weight:700;">$1</span>');
  }

  function escapeHtml(str) {
    return String(str || '').replace(/[&<>"']/g, m => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    })[m]);
  }

  // Global Open / Close
  window.openCommandPalette = function() {
    initDOM();
    syncDynamicData();
    const backdrop = document.getElementById('cmdPaletteBackdrop');
    const input = document.getElementById('cmdPaletteInput');
    if (!backdrop || !input) return;

    isOpen = true;
    backdrop.classList.add('active');
    input.value = '';
    renderSearch('');
    setTimeout(() => input.focus(), 50);
  };

  window.closeCommandPalette = function() {
    const backdrop = document.getElementById('cmdPaletteBackdrop');
    if (backdrop) backdrop.classList.remove('active');
    isOpen = false;
  };

  window.toggleCommandPalette = function() {
    if (isOpen) closeCommandPalette();
    else openCommandPalette();
  };

  // Global Keyboard Shortcuts
  window.addEventListener('keydown', e => {
    // Ctrl + K or Cmd + K
    if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K')) {
      e.preventDefault();
      toggleCommandPalette();
      return;
    }

    if (!isOpen) return;

    if (e.key === 'Escape') {
      e.preventDefault();
      closeCommandPalette();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (currentResults.length > 0) {
        selectedIndex = (selectedIndex + 1) % currentResults.length;
        updateSelection();
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (currentResults.length > 0) {
        selectedIndex = (selectedIndex - 1 + currentResults.length) % currentResults.length;
        updateSelection();
      }
    } else if (e.key === 'Enter') {
      e.preventDefault();
      executeItem(selectedIndex);
    }
  });

  // Auto initialize DOM on DOMContentLoaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initDOM);
  } else {
    initDOM();
  }
})();
