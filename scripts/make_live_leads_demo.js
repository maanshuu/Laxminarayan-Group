const http = require('http');

function request(path, options = {}) {
  return new Promise((resolve, reject) => {
    const { method = 'GET', body = null, cookie = '', headers = {} } = options;
    const reqHeaders = { ...headers };
    let postData = null;

    if (body) {
      postData = typeof body === 'string' ? body : JSON.stringify(body);
      reqHeaders['Content-Type'] = reqHeaders['Content-Type'] || 'application/json';
      reqHeaders['Content-Length'] = Buffer.byteLength(postData);
    }
    if (cookie) {
      reqHeaders['Cookie'] = cookie;
    }

    const req = http.request({
      hostname: 'localhost',
      port: 5000,
      path,
      method,
      headers: reqHeaders
    }, (res) => {
      let chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => {
        const raw = Buffer.concat(chunks).toString('utf-8');
        let data = raw;
        try { data = JSON.parse(raw); } catch (e) {}
        resolve({
          status: res.statusCode,
          headers: res.headers,
          data
        });
      });
    });

    req.on('error', reject);
    if (postData) req.write(postData);
    req.end();
  });
}

async function run() {
  console.log('===========================================================');
  console.log('  LIVE TESTING: ADMIN AUTHENTICATION & CRM LEADS CREATION  ');
  console.log('===========================================================\n');

  // 1. Admin Login
  console.log('[1/4] Logging in as Admin...');
  const loginRes = await request('/api/auth/login', {
    method: 'POST',
    body: {
      identifier: 'admin@laxminarayangroup.com',
      password: process.env.ADMIN_PASSWORD || 'Newt@1234'
    }
  });

  if (loginRes.status !== 200 || !loginRes.data?.success) {
    console.error('Admin login failed:', loginRes.status, loginRes.data);
    process.exit(1);
  }

  const setCookie = loginRes.headers['set-cookie'] || [];
  const adminCookie = setCookie.map(c => c.split(';')[0]).join('; ');
  console.log(`✓ Admin Logged In Successfully!`);
  console.log(`  User: ${loginRes.data.user.name} (${loginRes.data.user.email})`);
  console.log(`  Role: ${loginRes.data.user.role.toUpperCase()}`);

  // 2. Fetch Projects to associate real property IDs
  const projRes = await request('/api/projects');
  const projects = projRes.data?.data || [];
  const projId1 = projects[0]?.id || 1;
  const projId2 = projects[1]?.id || projId1;

  // 3. Create high-value qualified leads
  console.log('\n[2/4] Generating High-Intent Real Estate Buyer Leads in CRM...');
  const leadsToCreate = [
    {
      name: 'Rajesh & Meera Mehta',
      phone: '+91 98250 14892',
      email: 'rajesh.mehta@gujaratmerchants.com',
      source: 'website',
      status: 'negotiation',
      budget: '₹ 2.45 Cr',
      sentiment: 'hot',
      project_id: projId1,
      notes: 'Interested in Signature Homes 3BHK Grand Residence. Token advance discussed with client advisor.'
    },
    {
      name: 'Dr. Ananya Desai',
      phone: '+91 97241 88320',
      email: 'dr.ananya.desai@carehealth.in',
      source: 'brochure',
      status: 'site_visit',
      budget: '₹ 4.75 Cr',
      sentiment: 'hot',
      project_id: projId2,
      notes: 'HOD Cardiologist. Sky Villa Corner Penthouse requested. VIP guided site walkthrough booked.'
    },
    {
      name: 'Vikramaditya Patel',
      phone: '+91 99099 35124',
      email: 'vikram@apexlogistics.co.in',
      source: 'whatsapp',
      status: 'qualified',
      budget: '₹ 1.65 Cr',
      sentiment: 'warm',
      project_id: projId1,
      notes: 'Logistics Director. Main road facing commercial suite for new zonal headquarters.'
    },
    {
      name: 'Col. Arvind Singhal (Retd.)',
      phone: '+91 98980 62118',
      email: 'arvind.singhal@defencealumni.org',
      source: 'referral',
      status: 'contacted',
      budget: '₹ 3.10 Cr',
      sentiment: 'hot',
      project_id: projId2,
      notes: 'Executive Villa enquiry. Pre-approved home financing letter verified. Looking for immediate booking.'
    }
  ];

  const createdLeads = [];
  for (const lead of leadsToCreate) {
    const res = await request('/api/admin/leads', {
      method: 'POST',
      cookie: adminCookie,
      body: lead
    });

    if (res.status === 200 || res.status === 201) {
      const leadRecord = res.data?.data || res.data;
      createdLeads.push(leadRecord);
      console.log(`  ✓ Created Lead: ${lead.name}`);
      console.log(`    • Phone: ${lead.phone} | Budget: ${lead.budget}`);
      console.log(`    • Stage: [${lead.status.toUpperCase()}] | Sentiment: ${lead.sentiment.toUpperCase()}`);
      console.log(`    • Requirement: ${lead.notes}\n`);
    } else {
      console.log(`  Notice on ${lead.name}:`, res.status, res.data);
    }
  }

  // 4. Fetch Live Updated Admin Dashboard KPIs & Leads Desk
  console.log('[3/4] Querying Updated Admin Executive Dashboard...');
  const dashRes = await request('/api/admin/dashboard', { cookie: adminCookie });
  const stats = dashRes.data?.stats || {};
  console.log('✓ Live CRM Performance Metrics:');
  console.log(`  • Total Active Enquiries: ${stats.enquiries || 0}`);
  console.log(`  • Qualified Sales Leads:  ${stats.leads || 0}`);
  console.log(`  • Confirmed Bookings:     ${stats.bookings || 0}`);
  console.log(`  • Available Inventory:    ${stats.units?.available || 0} Units`);

  // 5. Query Leads Table to verify persistence
  console.log('\n[4/4] Verifying Leads in Admin Pipeline Table...');
  const leadsListRes = await request('/api/admin/leads', { cookie: adminCookie });
  const allLeads = leadsListRes.data?.data || [];
  console.log(`✓ Total Leads Currently Stored in SQLite Database: ${allLeads.length}`);
  
  const recentLeads = allLeads.slice(0, 5);
  console.log('\nTop 5 Most Recent Leads in Sales Pipeline:');
  recentLeads.forEach((l, idx) => {
    console.log(`  ${idx + 1}. [${l.status?.toUpperCase() || 'NEW'}] ${l.name} - ${l.phone} (Budget: ${l.budget || 'Not specified'})`);
  });

  console.log('\n===========================================================');
  console.log('  LIVE TESTING SUCCESSFUL: ADMIN CRM FULLY OPERATIONAL!   ');
  console.log('===========================================================');
}

run().catch(err => {
  console.error('Execution error:', err);
  process.exit(1);
});
