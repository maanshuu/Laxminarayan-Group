const fs = require('fs');
const path = require('path');
const http = require('http');

const ROOT = path.resolve(__dirname, '..');
const BASE_URL = 'http://localhost:5000';

const HTML_FILES = [
  'index.html',
  'properties.html',
  'project-category.html',
  'project-detail.html',
  'login.html',
  'signup.html',
  'forgot-password.html',
  'dashboard.html',
  'advisor.html',
  'admin.html',
  'units-demo.html'
];

async function checkUrl(urlPath) {
  return new Promise((resolve) => {
    const url = new URL(urlPath, BASE_URL);
    const req = http.request(url, { method: 'GET' }, (res) => {
      resolve({ status: res.statusCode, path: urlPath });
    });
    req.on('error', (err) => resolve({ status: 500, error: err.message, path: urlPath }));
    req.setTimeout(3000, () => {
      req.destroy();
      resolve({ status: 408, path: urlPath });
    });
    req.end();
  });
}

async function runAudit() {
  console.log('================================================================');
  console.log('   WHOLE WEBSITE COMPREHENSIVE AUDIT & BUG DETECTION');
  console.log('================================================================\n');

  const issues = [];
  const checkedLinks = new Set();
  const checkedAssets = new Set();

  for (const file of HTML_FILES) {
    const fullPath = path.join(ROOT, file);
    if (!fs.existsSync(fullPath)) {
      issues.push({ file, type: 'MISSING_FILE', message: `HTML file ${file} does not exist.` });
      continue;
    }

    console.log(`Auditing: ${file}...`);
    const content = fs.readFileSync(fullPath, 'utf8');

    // Extract scripts separately so template literals inside JS are not parsed as static HTML
    const scripts = [];
    const htmlWithoutScripts = content.replace(/<script(?![^>]*src=)([^>]*)>([\s\S]*?)<\/script>/gi, (m, attrs, code) => {
      scripts.push({ attrs, code });
      return '<!-- SCRIPT REMOVED FOR HTML AUDIT -->';
    });

    // 1. Check Image Sources in static HTML
    const imgRegex = /<img[^>]+src=["']([^"']+)["']/gi;
    let match;
    while ((match = imgRegex.exec(htmlWithoutScripts)) !== null) {
      const src = match[1].trim();
      if (!src || src.startsWith('data:') || src.startsWith('http://') || src.startsWith('https://') || src.startsWith('//') || src.includes('${')) {
        continue;
      }
      const cleanSrc = src.split('?')[0].split('#')[0];
      if (!checkedAssets.has(cleanSrc)) {
        checkedAssets.add(cleanSrc);
        const assetPath = path.join(ROOT, cleanSrc.replace(/^\//, ''));
        if (!fs.existsSync(assetPath)) {
          // Check if served dynamically or in AppData
          const serverCheck = await checkUrl('/' + cleanSrc.replace(/^\//, ''));
          if (serverCheck.status !== 200) {
            issues.push({ file, type: 'BROKEN_IMAGE', target: src, status: serverCheck.status });
            console.error(`  [BROKEN IMAGE] in ${file}: "${src}" (HTTP ${serverCheck.status})`);
          }
        }
      }
    }

    // 2. Check CSS url(...) assets in static HTML/CSS
    const cssUrlRegex = /url\(["']?([^"')]+)["']?\)/gi;
    while ((match = cssUrlRegex.exec(htmlWithoutScripts)) !== null) {
      const u = match[1].trim();
      if (!u || u.startsWith('data:') || u.startsWith('http://') || u.startsWith('https://') || u.startsWith('//') || u.includes('${')) {
        continue;
      }
      const cleanU = u.split('?')[0].split('#')[0];
      if (!checkedAssets.has(cleanU)) {
        checkedAssets.add(cleanU);
        const assetPath = path.join(ROOT, cleanU.replace(/^\//, ''));
        if (!fs.existsSync(assetPath)) {
          const serverCheck = await checkUrl('/' + cleanU.replace(/^\//, ''));
          if (serverCheck.status !== 200) {
            issues.push({ file, type: 'BROKEN_CSS_ASSET', target: u, status: serverCheck.status });
            console.error(`  [BROKEN CSS ASSET] in ${file}: "${u}" (HTTP ${serverCheck.status})`);
          }
        }
      }
    }

    // 3. Check Anchor Hrefs in static HTML
    const aRegex = /<a[^>]+href=["']([^"']+)["']/gi;
    while ((match = aRegex.exec(htmlWithoutScripts)) !== null) {
      const href = match[1].trim();
      if (!href || href.startsWith('#') || href.startsWith('javascript:') || href.startsWith('mailto:') || href.startsWith('tel:') || href.startsWith('https://wa.me') || href.includes('${')) {
        continue;
      }
      if (href.startsWith('http://') || href.startsWith('https://') || href.startsWith('//')) {
        continue; // external links
      }

      const cleanHref = href.split('?')[0].split('#')[0];
      if (cleanHref && !checkedLinks.has(cleanHref)) {
        checkedLinks.add(cleanHref);
        const check = await checkUrl(cleanHref.startsWith('/') ? cleanHref : '/' + cleanHref);
        // If it's a protected admin endpoint, 401 is expected behavior
        const isAuthExpected = cleanHref.startsWith('/api/admin/') && check.status === 401;
        if (!isAuthExpected && check.status !== 200 && check.status !== 302 && check.status !== 304) {
          issues.push({ file, type: 'BROKEN_LINK', target: href, status: check.status });
          console.error(`  [BROKEN LINK] in ${file}: "${href}" -> HTTP ${check.status}`);
        }
      }
    }

    // 4. Check script syntax and JSON-LD validity
    let sIdx = 0;
    for (const s of scripts) {
      sIdx++;
      const code = s.code.trim();
      if (!code) continue;
      if (s.attrs.includes('application/ld+json')) {
        try {
          JSON.parse(code);
        } catch (err) {
          issues.push({ file, type: 'JSON_LD_SYNTAX_ERROR', scriptIndex: sIdx, error: err.message });
          console.error(`  [JSON-LD SYNTAX ERROR] in ${file} script #${sIdx}: ${err.message}`);
        }
      } else {
        try {
          new Function(code);
        } catch (err) {
          issues.push({ file, type: 'JS_SYNTAX_ERROR', scriptIndex: sIdx, error: err.message });
          console.error(`  [JS SYNTAX ERROR] in ${file} script #${sIdx}: ${err.message}`);
        }
      }
    }
  }

  // 5. Test Live Server Status for each main page
  console.log('\nTesting HTTP response codes for all main pages:');
  for (const file of HTML_FILES) {
    const res = await checkUrl('/' + file);
    const ok = res.status === 200 || res.status === 302;
    console.log(`  /${file} -> HTTP ${res.status} ${ok ? '✓' : '✗'}`);
    if (!ok) {
      issues.push({ file, type: 'PAGE_HTTP_ERROR', status: res.status });
    }
  }

  console.log('\n================================================================');
  if (issues.length === 0) {
    console.log('  AUDIT COMPLETE: 0 BUGS OR BROKEN LINKS FOUND! EVERYTHING CLEAN!');
  } else {
    console.log(`  AUDIT COMPLETE: ${issues.length} ISSUE(S) DETECTED!`);
    console.log(JSON.stringify(issues, null, 2));
  }
  console.log('================================================================');
}

runAudit().catch(err => {
  console.error('Audit fatal error:', err);
  process.exit(1);
});
