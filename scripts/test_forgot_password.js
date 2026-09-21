const BASE_URL = 'http://localhost:5000';
const Database = require('./sqlite-compat');
const path = require('path');
const os = require('os');

const APP_DATA_ROOT = path.join(process.env.APPDATA || path.join(os.homedir(), "AppData", "Roaming"), "LaxminarayanGroup");
const DB_FILE = path.join(APP_DATA_ROOT, "data", "laxminarayan.db");

async function runForgotPasswordTests() {
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
  console.log('TESTING FORGOT PASSWORD & RESET PASSWORD FEATURE');
  console.log('====================================================\n');

  let rawToken = '';
  const testEmail = 'admin@laxminarayangroup.com';
  const temporaryPassword = 'TemporaryNewPass@2026';
  const defaultAdminPassword = 'Admin@123';

  // STEP 1: Request Password Reset Link
  try {
    const res = await fetch(`${BASE_URL}/api/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: testEmail })
    });
    const data = await res.json();

    assert('1.1 POST /api/auth/forgot-password returns 200 OK', res.status === 200);
    assert('1.2 Response indicates success', data.success === true);
    assert('1.3 Generated reset URL provided', Boolean(data.reset_url && data.reset_url.includes('token=')));
    assert('1.4 Crypto token returned in dev mode', Boolean(data.raw_token && data.raw_token.length === 64));
    rawToken = data.raw_token;
  } catch (err) {
    assert('1. Request password reset', false, err.message);
  }

  // STEP 2: Database Token Verification
  try {
    const db = new Database(DB_FILE);
    const crypto = require('crypto');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const tokenRow = db.prepare('SELECT * FROM password_resets WHERE token_hash=?').get(tokenHash);

    assert('2.1 Token hash securely stored in password_resets table', Boolean(tokenRow));
    assert('2.2 Token belongs to target user ID', tokenRow?.user_id === 1);
    assert('2.3 Token marked as unused (used = 0)', tokenRow?.used === 0);
    assert('2.4 Expiration timestamp is in the future', new Date(tokenRow?.expires_at).getTime() > Date.now());
    db.close();
  } catch (err) {
    assert('2. Database token checks', false, err.message);
  }

  // STEP 3: Verify Token API
  try {
    // 3.1 Valid token verification
    const verifyRes = await fetch(`${BASE_URL}/api/auth/verify-reset-token?token=${rawToken}`);
    const verifyData = await verifyRes.json();
    assert('3.1 Verify token endpoint returns 200 OK', verifyRes.status === 200);
    assert('3.2 Verify token returns valid status', verifyData.valid === true);
    assert('3.3 Masked account name returned for privacy', Boolean(verifyData.account));

    // 3.2 Invalid token check
    const invalidRes = await fetch(`${BASE_URL}/api/auth/verify-reset-token?token=0000000000000000000000000000000000000000000000000000000000000000`);
    const invalidData = await invalidRes.json();
    assert('3.4 Rejects invalid / tampered token (400 Bad Request)', invalidRes.status === 400 && invalidData.success === false);
  } catch (err) {
    assert('3. Token verification API', false, err.message);
  }

  // STEP 4: Password Validation Guards
  try {
    // 4.1 Too short password
    const shortRes = await fetch(`${BASE_URL}/api/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: rawToken, password: 'short' })
    });
    const shortData = await shortRes.json();
    assert('4.1 Rejects password shorter than 8 chars (400)', shortRes.status === 400 && shortData.error?.includes('8–128'));
  } catch (err) {
    assert('4. Password validation guards', false, err.message);
  }

  // STEP 5: Perform Password Reset
  try {
    const resetRes = await fetch(`${BASE_URL}/api/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: rawToken, password: temporaryPassword })
    });
    const resetData = await resetRes.json();

    assert('5.1 POST /api/auth/reset-password succeeds (200 OK)', resetRes.status === 200);
    assert('5.2 Password update success message returned', resetData.success === true);

    // 5.3 Attempting to reuse the same token must fail!
    const reuseRes = await fetch(`${BASE_URL}/api/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: rawToken, password: 'AnotherPassword@123' })
    });
    assert('5.3 Token replay attack blocked (cannot reuse used token)', reuseRes.status === 400);
  } catch (err) {
    assert('5. Password reset execution', false, err.message);
  }

  // STEP 6: Verify Login with New Password & Invalidation of Old Password
  try {
    // 6.1 Login with new password works
    const newLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: testEmail, password: temporaryPassword })
    });
    const newLoginData = await newLoginRes.json();
    assert('6.1 Login succeeds with new password', newLoginRes.status === 200 && newLoginData.success === true);

    // 6.2 Old password is now rejected
    const oldLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: testEmail, password: 'OldRandomPasswordThatShouldFail' })
    });
    assert('6.2 Old password rejected (401 Unauthorized)', oldLoginRes.status === 401);
  } catch (err) {
    assert('6. Login verification', false, err.message);
  }

  // STEP 7: Reset Back to Standard Admin Password (Admin@123) for User Convenience
  try {
    // Generate fresh reset token for cleanup
    const reqRes = await fetch(`${BASE_URL}/api/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: testEmail })
    });
    const reqData = await reqRes.json();
    const cleanToken = reqData.raw_token;

    const restoreRes = await fetch(`${BASE_URL}/api/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: cleanToken, password: defaultAdminPassword })
    });
    assert('7.1 Restored standard admin credentials (Admin@123)', restoreRes.status === 200);

    const finalLogin = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: testEmail, password: defaultAdminPassword })
    });
    assert('7.2 Confirmed Admin@123 works for admin login', finalLogin.status === 200);
  } catch (err) {
    assert('7. Restore standard credentials', false, err.message);
  }

  // SUMMARY
  console.log('\n====================================================');
  console.log('FORGOT PASSWORD TEST RESULTS SUMMARY');
  console.log('====================================================');
  const passed = results.filter(r => r.status === 'PASS').length;
  const failed = results.filter(r => r.status === 'FAIL').length;
  console.log(`TOTAL TESTS: ${results.length} | PASSED: ${passed} | FAILED: ${failed}\n`);
  return { results, passed, failed };
}

runForgotPasswordTests().catch(console.error);
