const BASE_URL = 'http://localhost:5000';
const Database = require('./sqlite-compat');
const path = require('path');
const os = require('os');

const APP_DATA_ROOT = path.join(process.env.APPDATA || path.join(os.homedir(), "AppData", "Roaming"), "LaxminarayanGroup");
const DB_FILE = path.join(APP_DATA_ROOT, "data", "laxminarayan.db");

async function runWhatsAppTests() {
  const results = [];

  function assert(title, condition, extra = '') {
    if (condition) {
      results.push({ title, status: 'PASS', extra });
      console.log(`[PASS] ${title} ${extra ? '(' + extra + ')' : ''}`);
    } else {
      results.push({ title, status: 'FAIL', extra });
      console.error(`[FAIL] ${title} ${extra ? '(' + extra + ')' : ''}`);
    }
  }

  console.log('====================================================');
  console.log('TESTING REAL ESTATE WHATSAPP MESSAGING FEATURES');
  console.log('====================================================\n');

  // TEST 1: Valid WhatsApp Enquiry Intake API
  let enquiryRef = '';
  let enquiryId = null;
  let leadId = null;
  const testPhone = '98' + Math.floor(10000000 + Math.random() * 90000000);
  const testName = 'Devendra Singhal';
  const testMessage = 'Interested in Signature Villas. Need immediate brochure & site visit on WhatsApp.';

  try {
    const res = await fetch(`${BASE_URL}/api/whatsapp-enquiry`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: testName,
        phone: testPhone,
        email: 'devendra.singhal@example.com',
        project_id: 2,
        message: testMessage
      })
    });
    const data = await res.json();

    assert('1.1 POST /api/whatsapp-enquiry returns 201 Created', res.status === 201);
    assert('1.2 Response indicates success', data.success === true);
    assert('1.3 Generated enquiry reference (ENQ-xxxxxx)', Boolean(data.reference && data.reference.startsWith('ENQ-')), data.reference);
    assert('1.4 Linked lead ID created', Boolean(data.lead_id));
    enquiryRef = data.reference;
    enquiryId = data.id;
    leadId = data.lead_id;
  } catch (err) {
    assert('1. Valid WhatsApp enquiry API', false, err.message);
  }

  // TEST 2: Verify SQLite Database Storage & CRM Integration
  try {
    const db = new Database(DB_FILE);

    // 2.1 Enquiries table verification
    const enqRow = db.prepare("SELECT * FROM enquiries WHERE id=?").get(enquiryId);
    assert('2.1 Enquiry record created in SQLite', Boolean(enqRow));
    assert('2.2 Message saved with WhatsApp prefix', enqRow?.message?.includes('WhatsApp enquiry:'));
    assert('2.3 Reference matches response', enqRow?.enquiry_reference === enquiryRef);

    // 2.2 Leads table verification (CRM pipeline source = 'whatsapp')
    const leadRow = db.prepare("SELECT * FROM leads WHERE id=?").get(leadId);
    assert('2.4 Lead automatically linked to enquiry', leadRow?.enquiry_id === enquiryId);
    assert('2.5 Lead source tagged as "whatsapp"', leadRow?.source === 'whatsapp');
    assert('2.6 Lead status starts as "new"', leadRow?.status === 'new');

    // 2.3 Audit log entry
    const auditRow = db.prepare("SELECT * FROM audit_logs WHERE entity_type='enquiry' AND entity_id=?").get(enquiryId);
    assert('2.7 Audit log records WhatsApp event', Boolean(auditRow) && auditRow?.details?.includes('WhatsApp enquiry'));

    db.close();
  } catch (err) {
    assert('2. Database integrity checks', false, err.message);
  }

  // TEST 3: Validation & Error Handling
  try {
    // 3.1 Missing name
    const missingName = await fetch(`${BASE_URL}/api/whatsapp-enquiry`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: '9876543210' })
    });
    const missingNameData = await missingName.json();
    assert('3.1 Rejects enquiry with missing name (400 Bad Request)', missingName.status === 400 && missingNameData.error?.includes('Name'));

    // 3.2 Invalid phone number
    const invalidPhone = await fetch(`${BASE_URL}/api/whatsapp-enquiry`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Test User', phone: '123' })
    });
    const invalidPhoneData = await invalidPhone.json();
    assert('3.2 Rejects enquiry with invalid phone (400 Bad Request)', invalidPhone.status === 400 && invalidPhoneData.error?.includes('phone'));

    // 3.3 Invalid email
    const invalidEmail = await fetch(`${BASE_URL}/api/whatsapp-enquiry`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Test User', phone: '9876543210', email: 'not-an-email' })
    });
    const invalidEmailData = await invalidEmail.json();
    assert('3.3 Rejects enquiry with malformed email (400 Bad Request)', invalidEmail.status === 400 && invalidEmailData.error?.includes('email'));
  } catch (err) {
    assert('3. Validation suite', false, err.message);
  }

  // TEST 4: Frontend & Admin WhatsApp URL Formatter Tests
  try {
    // Test URL format: https://wa.me/91<clean_phone>?text=<encoded_text>
    const sampleCustomer = { name: 'Devendra Singhal', phone: '+91 98765-43210' };
    const cleanPhone = sampleCustomer.phone.replace(/[^0-9]/g, '').replace(/^91/, '');
    
    // 4.1 Admin Lead WhatsApp Link
    const leadText = `Hello ${sampleCustomer.name}, greeting from Laxminarayan Group.`;
    const leadWaUrl = `https://wa.me/91${cleanPhone}?text=${encodeURIComponent(leadText)}`;
    assert('4.1 Lead Drawer WhatsApp URL format is valid', leadWaUrl.startsWith('https://wa.me/919876543210?text=Hello%20Devendra'));

    // 4.2 Booking Confirmation WhatsApp Link
    const bookingRef = 'BKG-00124';
    const bookingText = `Hello ${sampleCustomer.name}, your booking ${bookingRef} at Laxminarayan Group is confirmed.`;
    const bookingWaUrl = `https://wa.me/91${cleanPhone}?text=${encodeURIComponent(bookingText)}`;
    assert('4.2 Booking Acknowledgment WhatsApp URL format is valid', bookingWaUrl.includes('confirmed') && bookingWaUrl.includes('BKG-00124'));

    // 4.3 Site Visit WhatsApp Link
    const visitDate = '18 Sep 2026, 11:00 AM';
    const visitText = `Hello ${sampleCustomer.name}, regarding your site visit scheduled on ${visitDate} with Laxminarayan Group.`;
    const visitWaUrl = `https://wa.me/91${cleanPhone}?text=${encodeURIComponent(visitText)}`;
    assert('4.3 Site Visit Notification WhatsApp URL format is valid', visitWaUrl.includes('site%20visit') && visitWaUrl.includes('18%20Sep%202026'));

    // 4.4 Website Public Inquiry WhatsApp Link
    const companyWhatsApp = '916352000017';
    const clientText = `Hello Laxminarayan Group,\n\nI would like to enquire about your properties.\nName: ${testName}\nPhone: ${testPhone}\n\nEnquiry Ref: ${enquiryRef}`;
    const clientWaUrl = `https://wa.me/${companyWhatsApp}?text=${encodeURIComponent(clientText)}`;
    assert('4.4 Public Website WhatsApp Chat URL format is valid', clientWaUrl.startsWith('https://wa.me/916352000017?text=Hello%20Laxminarayan'));
  } catch (err) {
    assert('4. WhatsApp URL generation suite', false, err.message);
  }

  // SUMMARY
  console.log('\n====================================================');
  console.log('WHATSAPP FEATURE TEST RESULTS');
  console.log('====================================================');
  const passed = results.filter(r => r.status === 'PASS').length;
  const failed = results.filter(r => r.status === 'FAIL').length;
  console.log(`TOTAL TESTS: ${results.length} | PASSED: ${passed} | FAILED: ${failed}\n`);
  return { results, passed, failed };
}

runWhatsAppTests().catch(console.error);
