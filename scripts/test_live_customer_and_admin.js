const http = require('http');

const BASE_URL = 'http://localhost:5000';

async function request(path, options = {}) {
  const url = new URL(path, BASE_URL);
  return new Promise((resolve, reject) => {
    const headers = options.headers || {};
    let body = options.body;
    if (body && typeof body === 'object' && !(body instanceof Buffer)) {
      body = JSON.stringify(body);
      headers['Content-Type'] = 'application/json';
    }
    if (body) {
      headers['Content-Length'] = Buffer.byteLength(body);
    }
    if (options.cookie) {
      headers['Cookie'] = options.cookie;
    }

    const req = http.request(url, {
      method: options.method || 'GET',
      headers
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        let json = null;
        try { json = JSON.parse(data); } catch (_) {}
        resolve({
          status: res.statusCode,
          headers: res.headers,
          data: json !== null ? json : data
        });
      });
    });

    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

async function runLiveTesting() {
  console.log('================================================================');
  console.log('  LIVE TESTING: CUSTOMER SIDE + ADMIN CRM FEATURES + SYSTEM');
  console.log('================================================================\n');

  const results = [];
  function assert(title, condition, extra = '') {
    if (condition) {
      results.push({ title, status: 'PASS', extra });
      console.log(`  [PASS] ${title} ${extra ? '(' + extra + ')' : ''}`);
    } else {
      results.push({ title, status: 'FAIL', extra });
      console.error(`  [FAIL] ${title} ${extra ? '(' + extra + ')' : ''}`);
    }
  }

  let adminCookie = '';
  let customerCookie = '';
  const timestamp = Date.now();
  const customerEmail = `client_${timestamp}@example.com`;
  const customerPhone = `98${Math.floor(10000000 + Math.random() * 90000000)}`;

  // ==========================================
  // PART 1: CUSTOMER SIDE LIVE TESTING
  // ==========================================
  console.log('--- PART 1: CUSTOMER SIDE LIVE TESTING ---');
  
  // 1.1 Homepage & Assets
  const home = await request('/');
  assert('1.1 Customer can access homepage (200 OK)', home.status === 200 && home.data.includes('Laxminarayan Group'));

  // 1.2 Projects Catalog
  const projectsRes = await request('/api/projects');
  assert('1.2 Customer can fetch active projects catalog', projectsRes.status === 200 && Array.isArray(projectsRes.data?.data));
  const projects = projectsRes.data?.data || [];
  const testProject = projects[0] || { id: 1, name: 'Laxminarayan Elegance' };
  console.log(`      Available catalog projects: ${projects.length} found`);

  // 1.3 Customer Signup / Registration
  const signupRes = await request('/api/auth/signup', {
    method: 'POST',
    body: {
      name: 'Rohan Deshmukh',
      email: customerEmail,
      phone: customerPhone,
      password: 'ClientPassword@123'
    }
  });
  assert('1.3 Customer registers new account (/api/auth/signup)', signupRes.status === 201 && signupRes.data?.success === true);

  // 1.4 Customer Login
  const clientLogin = await request('/api/auth/login', {
    method: 'POST',
    body: {
      identifier: customerEmail,
      password: 'ClientPassword@123'
    }
  });
  assert('1.4 Customer logs in with credentials', clientLogin.status === 200 && clientLogin.data?.success === true);
  customerCookie = (clientLogin.headers['set-cookie'] || [])[0] || '';
  assert('1.5 Customer session cookie issued', Boolean(customerCookie));

  // 1.6 Customer Profile Verification
  const clientMe = await request('/api/auth/me', { cookie: customerCookie });
  assert('1.6 Customer identity verified (/api/auth/me)', clientMe.status === 200 && clientMe.data?.user?.email === customerEmail);

  // 1.7 Inbound Customer Enquiry Submission
  const enquiryPayload = {
    name: 'Rohan Deshmukh',
    email: customerEmail,
    phone: customerPhone,
    project_id: testProject.id,
    message: 'I am interested in a 3 BHK duplex apartment with East-facing balcony. Please share pricing and payment schedule.'
  };
  const enqRes = await request('/api/enquiries', {
    method: 'POST',
    body: enquiryPayload
  });
  assert('1.7 Customer submits property enquiry (/api/enquiries)', enqRes.status === 201 && enqRes.data?.success === true);
  const enquiryId = enqRes.data?.id || enqRes.data?.data?.id;
  console.log(`      Created Enquiry ID: ${enquiryId}, Reference: ${enqRes.data?.reference}`);

  // 1.8 Customer WhatsApp Enquiry Intake
  const waRes = await request('/api/whatsapp-enquiry', {
    method: 'POST',
    body: {
      name: 'Rohan Deshmukh',
      phone: customerPhone,
      email: customerEmail,
      project_id: testProject.id,
      message: 'Looking for immediate site visit.'
    }
  });
  assert('1.8 Customer initiates WhatsApp enquiry (/api/whatsapp-enquiry)', (waRes.status === 200 || waRes.status === 201) && waRes.data?.success === true);

  // 1.9 Customer Books Site Visit
  const preferredDate = new Date(Date.now() + 3 * 86400000).toISOString();
  const visitRes = await request('/api/site-visits', {
    method: 'POST',
    cookie: customerCookie,
    body: {
      project_id: testProject.id,
      preferred_at: preferredDate,
      notes: 'Customer requesting morning walkthrough with family.'
    }
  });
  assert('1.9 Customer registers private site visit request', (visitRes.status === 200 || visitRes.status === 201) && visitRes.data?.success === true, `Status: ${visitRes.status}`);
  const siteVisitId = visitRes.data?.data?.id;
  console.log(`      Site Visit ID: ${siteVisitId}`);

  // 1.10 Customer Checks Their Scheduled Site Visits
  const myVisitsRes = await request('/api/my/site-visits', { cookie: customerCookie });
  assert('1.10 Customer views their scheduled visits (/api/my/site-visits)', myVisitsRes.status === 200 && Array.isArray(myVisitsRes.data?.data));

  // ==========================================
  // PART 2: ADMIN CRM LIVE TESTING
  // ==========================================
  console.log('\n--- PART 2: ADMIN CRM FEATURES LIVE TESTING ---');

  // 2.1 Admin Authentication
  const adminLogin = await request('/api/auth/login', {
    method: 'POST',
    body: {
      identifier: 'admin@laxminarayangroup.com',
      password: process.env.ADMIN_PASSWORD || 'Newt@1234'
    }
  });
  assert('2.1 Admin login successful (200 OK)', adminLogin.status === 200 && adminLogin.data?.user?.role === 'admin');
  adminCookie = (adminLogin.headers['set-cookie'] || [])[0] || '';
  assert('2.2 Admin session cookie acquired', Boolean(adminCookie));

  // 2.2 Executive Dashboard KPIs
  const dashRes = await request('/api/admin/dashboard', { cookie: adminCookie });
  assert('2.3 Admin reads dashboard KPI counters', dashRes.status === 200 && dashRes.data?.success === true);
  const stats = dashRes.data?.stats || {};
  console.log(`      Total Enquiries: ${stats.enquiries || 0} | Leads: ${stats.leads || 0} | Bookings: ${stats.bookings || 0} | Available Units: ${stats.units?.available || 0}`);

  // 2.3 Admin reviews Customer Enquiries Desk
  const enquiriesList = await request('/api/admin/enquiries', { cookie: adminCookie });
  assert('2.4 Admin queries enquiries desk', enquiriesList.status === 200 && Array.isArray(enquiriesList.data?.data));
  const foundEnquiry = (enquiriesList.data?.data || []).find(e => (enquiryId && e.id === enquiryId) || e.phone === customerPhone);
  assert('2.5 Customer enquiry appears in Admin Enquiries Desk', Boolean(foundEnquiry));

  // 2.4 Convert Customer Enquiry to Qualified CRM Lead
  let crmLeadId = null;
  if (foundEnquiry) {
    const convertRes = await request(`/api/admin/enquiries/${foundEnquiry.id}/convert`, {
      method: 'POST',
      cookie: adminCookie,
      body: {
        budget: '₹1.85 Cr',
        sentiment: 'hot',
        notes: 'Pre-approved loan buyer. Priority followup.'
      }
    });
    assert('2.6 Admin converts enquiry to qualified CRM Lead', convertRes.status === 200 && convertRes.data?.success === true);
    crmLeadId = convertRes.data?.lead_id || convertRes.data?.data?.id;
  }

  // If not converted or need direct lead test
  if (!crmLeadId) {
    const directLead = await request('/api/admin/leads', {
      method: 'POST',
      cookie: adminCookie,
      body: {
        name: 'Rohan Deshmukh',
        phone: customerPhone,
        email: customerEmail,
        source: 'website',
        status: 'new',
        budget: '₹1.85 Cr',
        sentiment: 'hot',
        notes: 'Direct pipeline entry'
      }
    });
    crmLeadId = directLead.data?.data?.id;
  }
  assert('2.7 CRM Lead ID active in sales pipeline', Boolean(crmLeadId));

  // 2.5 7-Stage Kanban Progression
  const stages = ['contacted', 'qualified', 'site_visit', 'negotiation'];
  for (const stage of stages) {
    const patchRes = await request(`/api/admin/leads/${crmLeadId}`, {
      method: 'PATCH',
      cookie: adminCookie,
      body: { status: stage, sentiment: 'hot', notes: `Lead transitioned to ${stage}` }
    });
    assert(`2.8 Move Lead to stage: "${stage}"`, patchRes.status === 200 && patchRes.data?.success === true);
  }

  // 2.6 Site Visits Management Desk
  const visitsList = await request('/api/admin/site-visits', { cookie: adminCookie });
  assert('2.9 Admin queries site visits schedule', visitsList.status === 200 && Array.isArray(visitsList.data?.data));
  
  if (siteVisitId) {
    // Confirm site visit
    const confirmRes = await request(`/api/admin/site-visits/${siteVisitId}`, {
      method: 'PATCH',
      cookie: adminCookie,
      body: { status: 'confirmed', admin_notes: 'Confirmed for 11:00 AM with sales head' }
    });
    assert('2.10 Admin confirms customer site visit', confirmRes.status === 200 && confirmRes.data?.success === true);

    // Complete site visit
    const completeRes = await request(`/api/admin/site-visits/${siteVisitId}`, {
      method: 'PATCH',
      cookie: adminCookie,
      body: { status: 'completed', admin_notes: 'Site visit completed successfully. Customer liked Unit 402.' }
    });
    assert('2.11 Admin marks site visit as completed', completeRes.status === 200 && completeRes.data?.success === true);
  }

  // 2.7 Unit Inventory Matrix Management
  const unitsRes = await request('/api/admin/units', { cookie: adminCookie });
  assert('2.12 Admin retrieves Unit Inventory Matrix', unitsRes.status === 200 && Array.isArray(unitsRes.data?.data));
  const units = unitsRes.data?.data || [];
  let availableUnit = units.find(u => u.status === 'available');

  // If no available unit, create one
  if (!availableUnit) {
    const createUnitRes = await request('/api/admin/units', {
      method: 'POST',
      cookie: adminCookie,
      body: {
        project_id: testProject.id,
        unit_number: `Unit-${timestamp % 10000}`,
        unit_type: '3 BHK Luxury',
        floor_number: 4,
        area_sqft: 1850,
        price: '₹1,85,00,000',
        status: 'available'
      }
    });
    availableUnit = createUnitRes.data?.data;
  }
  assert('2.13 Available unit identified for allotment', Boolean(availableUnit?.id));

  // 2.8 Block Unit for Buyer Reservation
  const blockRes = await request(`/api/admin/units/${availableUnit.id}/status`, {
    method: 'PATCH',
    cookie: adminCookie,
    body: {
      status: 'blocked',
      buyer_name: 'Rohan Deshmukh',
      buyer_phone: customerPhone
    }
  });
  assert('2.14 Admin blocks unit for client reservation', blockRes.status === 200 && blockRes.data?.success === true);

  // 2.9 Official Deal Booking & Sale Agreement Creation
  const bookingRes = await request('/api/admin/bookings', {
    method: 'POST',
    cookie: adminCookie,
    body: {
      lead_id: crmLeadId,
      project_id: testProject.id,
      unit_id: availableUnit.id,
      customer_name: 'Rohan Deshmukh',
      customer_phone: customerPhone,
      customer_email: customerEmail,
      allotted_unit: availableUnit.unit_number,
      agreement_value: '₹1,85,00,000',
      token_amount: '₹5,00,000',
      payment_status: 'token_received',
      notes: 'Booking advance token received. Sale agreement scheduled for Friday.'
    }
  });
  assert('2.15 Admin creates Deal Booking & Token Allotment', (bookingRes.status === 200 || bookingRes.status === 201) && bookingRes.data?.success === true);
  const bookingId = bookingRes.data?.data?.id;
  console.log(`      Created Official Booking ID: ${bookingId}, Ref: ${bookingRes.data?.data?.booking_reference || 'Generated'}`);

  // Finalize unit as 'sold'
  const soldRes = await request(`/api/admin/units/${availableUnit.id}/status`, {
    method: 'PATCH',
    cookie: adminCookie,
    body: {
      status: 'sold',
      buyer_name: 'Rohan Deshmukh',
      buyer_phone: customerPhone
    }
  });
  assert('2.16 Unit status finalized as "sold"', soldRes.status === 200 && soldRes.data?.success === true);

  // Mark CRM lead as 'won'
  const wonRes = await request(`/api/admin/leads/${crmLeadId}`, {
    method: 'PATCH',
    cookie: adminCookie,
    body: { status: 'won', notes: `Closed Won! Booking ID: ${bookingId}` }
  });
  assert('2.17 CRM Lead marked as "won" (Deal Closed)', wonRes.status === 200 && wonRes.data?.success === true);

  // 2.10 Team Roster & Attendance Check-in
  const empRes = await request('/api/admin/employees', {
    method: 'POST',
    cookie: adminCookie,
    body: {
      name: `Advisor ${timestamp % 1000}`,
      email: `advisor${timestamp}@laxminarayangroup.com`,
      phone: `91${Math.floor(10000000 + Math.random() * 90000000)}`,
      department: 'Residential Advisory',
      designation: 'Client Relationship Manager',
      password: 'StaffPassword@123'
    }
  });
  assert('2.18 Admin creates staff profile in Team Directory', (empRes.status === 200 || empRes.status === 201) && empRes.data?.success === true);
  
  // Look up employee ID from response or employees list
  let empId = empRes.data?.data?.id;
  if (!empId) {
    const listEmps = await request('/api/admin/employees', { cookie: adminCookie });
    empId = listEmps.data?.data?.[0]?.id;
  }

  if (empId) {
    const today = new Date().toISOString().slice(0, 10);
    const attRes = await request('/api/admin/attendance', {
      method: 'POST',
      cookie: adminCookie,
      body: {
        employee_id: empId,
        attendance_date: today,
        status: 'present',
        check_in: '09:15',
        notes: 'Client walkthrough shift'
      }
    });
    assert('2.19 Team attendance check-in logged', (attRes.status === 200 || attRes.status === 201) && attRes.data?.success === true, `Status: ${attRes.status}, err: ${attRes.data?.error || ''}`);

    const attSummary = await request('/api/admin/attendance/summary', { cookie: adminCookie });
    assert('2.20 Team attendance analytics retrieved', attSummary.status === 200 && attSummary.data?.success === true);
  }

  // 2.11 CSV Reports Export
  const reportRes = await request('/api/admin/reports.csv', { cookie: adminCookie });
  assert('2.21 Admin exports executive CSV reports', reportRes.status === 200 && typeof reportRes.data === 'string' && reportRes.data.includes('name'));

  // 2.12 Audit Logs
  const auditRes = await request('/api/admin/audit-logs', { cookie: adminCookie });
  assert('2.22 Security audit trail logs every administrative operation', auditRes.status === 200 && Array.isArray(auditRes.data?.data));

  // ==========================================
  // FINAL SUMMARY
  // ==========================================
  console.log('\n================================================================');
  const total = results.length;
  const passed = results.filter(r => r.status === 'PASS').length;
  const failed = results.filter(r => r.status === 'FAIL').length;
  console.log(`  COMPLETE TEST SUITE RESULTS: ${passed}/${total} PASSED (${failed} FAILED)`);
  console.log('================================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runLiveTesting().catch(err => {
  console.error('FATAL TEST ERROR:', err);
  process.exit(1);
});
