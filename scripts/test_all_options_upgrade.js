const http = require('http');

function makeRequest(options, postData = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = [];
      res.on('data', chunk => data.push(chunk));
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: Buffer.concat(data)
        });
      });
    });
    req.on('error', reject);
    if (postData) {
      req.write(postData);
    }
    req.end();
  });
}

async function runTests() {
  console.log('=== TESTING ALL OPTIONS UPGRADE (A, B, C, D) ===\n');
  let passed = 0;
  let total = 0;

  function assert(name, condition, extra = '') {
    total++;
    if (condition) {
      passed++;
      console.log(`✓ [PASS] ${name} ${extra}`);
    } else {
      console.error(`✗ [FAIL] ${name} ${extra}`);
    }
  }

  // 1. Test Gzip Compression
  try {
    const res = await makeRequest({
      hostname: 'localhost',
      port: 5000,
      path: '/',
      method: 'GET',
      headers: { 'Accept-Encoding': 'gzip' }
    });
    assert('Option D: Gzip compression active on HTTP responses', 
      res.headers['content-encoding'] === 'gzip', 
      `Header: ${res.headers['content-encoding']}`);
  } catch (e) {
    assert('Option D: Gzip compression active', false, e.message);
  }

  // 2. Test 7-Day Asset Cache-Control and ETag
  try {
    const res = await makeRequest({
      hostname: 'localhost',
      port: 5000,
      path: '/assets/hero-villa.png',
      method: 'GET'
    });
    const cc = res.headers['cache-control'] || '';
    const etag = res.headers['etag'] || '';
    assert('Option D: 7-day browser caching headers on /assets', 
      cc.includes('max-age=604800') && etag.length > 0, 
      `Cache-Control: ${cc}, ETag: ${etag}`);
  } catch (e) {
    assert('Option D: 7-day browser caching headers', false, e.message);
  }

  // 3. Test Dynamic OpenGraph Injection on /project-detail.html?id=1
  try {
    const res = await makeRequest({
      hostname: 'localhost',
      port: 5000,
      path: '/project-detail.html?id=1',
      method: 'GET'
    });
    const html = res.body.toString('utf-8');
    const hasOgTitle = html.includes('property="og:title"');
    const hasOgImage = html.includes('property="og:image"');
    const hasOgUrl = html.includes('property="og:url"');
    assert('Option D: Server-side Dynamic OpenGraph injection for project links', 
      hasOgTitle && hasOgImage && hasOgUrl, 
      `Found og:title, og:image, og:url tags`);
  } catch (e) {
    assert('Option D: Dynamic OpenGraph injection', false, e.message);
  }

  // 4. Test Honeypot Anti-Spam (Legitimate Submission)
  try {
    const legitPayload = JSON.stringify({
      name: 'Legit Test Buyer',
      phone: '+91 9876543210',
      email: 'buyer@example.com',
      message: 'Interested in 3BHK flat',
      hp_confirm_field: ''
    });
    const res = await makeRequest({
      hostname: 'localhost',
      port: 5000,
      path: '/api/enquiries',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(legitPayload)
      }
    }, legitPayload);
    const json = JSON.parse(res.body.toString('utf-8'));
    assert('Option D: Legitimate enquiry submission (empty honeypot) succeeds', 
      res.statusCode === 201 && json.success === true, 
      `Status: ${res.statusCode}, Success: ${json.success}`);
  } catch (e) {
    assert('Option D: Legitimate enquiry submission', false, e.message);
  }

  // 5. Test Honeypot Anti-Spam (Bot Submission silently dropped)
  try {
    const botPayload = JSON.stringify({
      name: 'Spam Bot 3000',
      phone: '0000000000',
      email: 'spam@bot.ru',
      message: 'Buy cheap crypto now',
      hp_confirm_field: 'http://spam-link.ru' // filled honeypot!
    });
    const res = await makeRequest({
      hostname: 'localhost',
      port: 5000,
      path: '/api/enquiries',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(botPayload)
      }
    }, botPayload);
    const json = JSON.parse(res.body.toString('utf-8'));
    assert('Option D: Honeypot bot submission silently absorbed (200 OK without DB write)', 
      res.statusCode === 200 && json.success === true && !json.id && !json.whatsapp_link, 
      `Status: ${res.statusCode}, DB Record created: ${Boolean(json.id)}`);
  } catch (e) {
    assert('Option D: Honeypot bot submission', false, e.message);
  }

  // 6. Test project-detail.html contents for Floor Plans, Proximity Radar, Mobile Sticky Bar
  try {
    const fs = require('fs');
    const path = require('path');
    const detailHtml = fs.readFileSync(path.join(__dirname, '../project-detail.html'), 'utf-8');
    
    assert('Option A: Interactive Floor Plans panel (#floorplansPanel)', 
      detailHtml.includes('id="floorplansPanel"') && detailHtml.includes('switchFloorPlan'), 
      'Includes floor plans panel and switchFloorPlan script');

    assert('Option A: Architectural Blueprint Zoom Modal (#blueprintModal)', 
      detailHtml.includes('id="blueprintModal"') && detailHtml.includes('openBlueprintModal'), 
      'Includes modal and zoom handler');

    assert('Option B: Proximity Radar & Commute times panel (#locationRadarPanel)', 
      detailHtml.includes('id="locationRadarPanel"') && detailHtml.includes('proximity-card'), 
      'Includes location radar with proximity cards');

    assert('Option C: Mobile Sticky Bottom Bar (#mobileStickyBar)', 
      detailHtml.includes('id="mobileStickyBar"') && detailHtml.includes('mobile-sticky-bar'), 
      'Includes sticky booking & WhatsApp bar');
  } catch (e) {
    assert('Options A, B, C file check', false, e.message);
  }

  // 7. Test project-category.html skeleton wireframes
  try {
    const fs = require('fs');
    const path = require('path');
    const catHtml = fs.readFileSync(path.join(__dirname, '../project-category.html'), 'utf-8');
    assert('Option C: Skeleton Shimmer Placeholders on category catalog', 
      catHtml.includes('skeleton-card') && catHtml.includes('skeleton-pic'), 
      'Includes skeleton-card and shimmer styles');
  } catch (e) {
    assert('Option C: Skeleton check', false, e.message);
  }

  console.log(`\nRESULTS: ${passed}/${total} assertions passed (${Math.round(passed/total*100)}%).`);
  if (passed === total) {
    console.log('ALL NEW FEATURES FULLY VERIFIED AND INTEGRATED!');
    process.exit(0);
  } else {
    process.exit(1);
  }
}

runTests();
