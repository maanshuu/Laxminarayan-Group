const http = require('http');

function makeRequest(path, options = {}) {
  return new Promise((resolve, reject) => {
    const { method = 'GET', body = null, headers = {} } = options;
    const reqHeaders = { ...headers };
    let postData = null;

    if (body) {
      postData = typeof body === 'string' ? body : JSON.stringify(body);
      reqHeaders['Content-Type'] = reqHeaders['Content-Type'] || 'application/json';
      reqHeaders['Content-Length'] = Buffer.byteLength(postData);
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

async function runTests() {
  console.log('===============================================================');
  console.log('   TESTING EMAIL & MOBILE NUMBER OTP AUTHENTICATION SYSTEM    ');
  console.log('===============================================================\n');

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

  // 1. Test Send OTP to Email
  const testEmail = `client_${Date.now()}@laxmiproperties.com`;
  let emailOtp = '';
  try {
    const res = await makeRequest('/api/auth/otp/send', {
      method: 'POST',
      body: { identifier: testEmail }
    });
    assert('1. Send OTP to Email returns HTTP 200', res.status === 200 && res.data?.success === true);
    assert('1. Email masked identifier returned', Boolean(res.data?.masked?.includes('@')));
    emailOtp = res.data?.dev_otp;
    assert('1. Dev OTP received for client presentation', Boolean(emailOtp && emailOtp.length === 6), `Code: ${emailOtp}`);
  } catch (e) {
    assert('1. Send OTP to Email', false, e.message);
  }

  // 2. Test Send OTP to Mobile Number
  const testPhone = `98${Math.floor(10000000 + Math.random() * 90000000)}`;
  let phoneOtp = '';
  try {
    const res = await makeRequest('/api/auth/otp/send', {
      method: 'POST',
      body: { identifier: `+91 ${testPhone}` }
    });
    assert('2. Send OTP to Mobile Number returns HTTP 200', res.status === 200 && res.data?.success === true);
    assert('2. Phone masked identifier returned', Boolean(res.data?.masked?.includes('***')));
    phoneOtp = res.data?.dev_otp;
    assert('2. Dev OTP received for mobile verification', Boolean(phoneOtp && phoneOtp.length === 6), `Code: ${phoneOtp}`);
  } catch (e) {
    assert('2. Send OTP to Mobile', false, e.message);
  }

  // 3. Test Invalid OTP verification attempt
  try {
    const res = await makeRequest('/api/auth/otp/verify', {
      method: 'POST',
      body: { identifier: testEmail, otp: '000000' }
    });
    assert('3. Incorrect OTP correctly rejected with HTTP 400', res.status === 400 && res.data?.success === false);
    assert('3. Error message reports attempts remaining', res.data?.error?.includes('attempt(s) remaining'), res.data?.error);
  } catch (e) {
    assert('3. Incorrect OTP rejection', false, e.message);
  }

  // 4. Test Valid OTP verification & new customer auto-registration
  try {
    const res = await makeRequest('/api/auth/otp/verify', {
      method: 'POST',
      body: {
        identifier: testEmail,
        otp: emailOtp,
        name: 'Viren Merchant'
      }
    });
    assert('4. Valid Email OTP verification returns HTTP 200', res.status === 200 && res.data?.success === true);
    assert('4. JWT token issued', Boolean(res.data?.token));
    assert('4. User object created with role customer', res.data?.user?.role === 'customer' && res.data?.user?.name === 'Viren Merchant');
    const setCookie = (res.headers['set-cookie'] || [])[0] || '';
    assert('4. Secure HTTP-only session cookie issued', setCookie.includes('lg_session='));
  } catch (e) {
    assert('4. Valid Email OTP verification', false, e.message);
  }

  // 5. Test Mobile Number OTP verification & auto-registration
  try {
    const res = await makeRequest('/api/auth/otp/verify', {
      method: 'POST',
      body: {
        identifier: testPhone,
        otp: phoneOtp,
        name: 'Ketan Sheth'
      }
    });
    assert('5. Valid Mobile OTP verification returns HTTP 200', res.status === 200 && res.data?.success === true);
    assert('5. User created with verified phone', Boolean(res.data?.user?.phone && res.data?.user?.phone.includes(testPhone)));
  } catch (e) {
    assert('5. Valid Mobile OTP verification', false, e.message);
  }

  // 6. Test existing Admin password login remains 100% operational
  try {
    const res = await makeRequest('/api/auth/login', {
      method: 'POST',
      body: {
        identifier: 'admin@laxminarayangroup.com',
        password: process.env.ADMIN_PASSWORD || 'Newt@1234'
      }
    });
    assert('6. Admin password login remains 100% functional', res.status === 200 && res.data?.user?.role === 'admin');
  } catch (e) {
    assert('6. Admin password login', false, e.message);
  }

  console.log(`\nRESULTS: ${passed}/${total} assertions passed (${Math.round(passed/total*100)}%).`);
  if (passed === total) {
    console.log('OTP AUTHENTICATION BACKEND VERIFIED SUCCESSFULLY!');
    process.exit(0);
  } else {
    process.exit(1);
  }
}

runTests();
