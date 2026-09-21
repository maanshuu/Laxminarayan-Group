fetch('http://localhost:5000/api/projects')
  .then(r => r.json())
  .then(p => {
    function esc(s) {
      return String(s ?? '').replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[m]));
    }
    function projectCard(p) {
      const image = p.image || (p.id === 1 ? '/uploads/projects/ds208_bird_eye_view.jpg' : 'assets/hero-villa.png');
      const title = p.name || 'Real Estate Project';
      const category = p.category || 'RESIDENTIAL';
      const price = p.price || 'Price on Request';
      const location = p.location || 'Gujarat, India';
      const link = `project-detail.html?id=${p.id}`;
      const badge = p.badge || 'UNDER CONSTRUCTION';
      const rera = p.rera_number ? `RERA: ${p.rera_number}` : 'RERA REGISTERED';
      const city = p.city || 'Gujarat';

      return `<a class="homy-card project-card-item" href="${link}" data-id="${p.id}" data-category="${esc(category)}" data-city="${esc(city)}">
        <div class="homy-card-pic" style="background-image:url('${String(image).replace(/'/g, "%27")}')"></div>
        <div class="homy-card-overlay"></div>
        <div class="homy-card-top">
          <div style="display:flex; flex-direction:column; gap:6px; align-items:flex-start;">
            <span class="homy-card-tag">${esc(category)}</span>
            <span class="homy-card-micro-badge">${esc(badge)}</span>
          </div>
          <span class="homy-card-price">${esc(price)}</span>
        </div>
        <div class="homy-card-bottom">
          <div class="homy-card-location">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>
            ${esc(location)}
          </div>
          <h4>${esc(title)}</h4>
          <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px;">
            <div class="homy-card-action">
              <span>Explore Property</span>
              <span class="arrow">→</span>
            </div>
            <span style="font-size:11px; color:rgba(255,255,255,0.7); font-weight:600; letter-spacing:0.5px; background:rgba(0,0,0,0.4); padding:4px 10px; border-radius:12px; border:1px solid rgba(255,255,255,0.15);">
              ✓ ${esc(rera)}
            </span>
          </div>
        </div>
      </a>`;
    }

    const allLoadedProjects = (p.data || []).filter(x => x.status === 'active' || x.status === undefined);
    console.log('Loaded projects count:', allLoadedProjects.length);
    const html = allLoadedProjects.map(x => projectCard(x)).join('\n');
    console.log('HTML length:', html.length);
    console.log('Sample:', html.substring(0, 300));
  })
  .catch(err => console.error(err));
