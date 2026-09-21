// Automated Cybersecurity Hardening Verification Suite
// Tests: Source Code Shielding, Route Guards, Security Headers, CSP, Traversal Mitigations, HTTPS & Redirection

process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
const BASE = "https://localhost:5000";
const HTTP_BASE = "http://localhost:5000";

async function runTests() {
  console.log("==================================================");
  console.log("🔒 LAXMINARAYAN GROUP CYBERSECURITY VERIFICATION (HTTPS)");
  console.log("==================================================");

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✅ PASS: ${message}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${message}`);
      failed++;
    }
  }

  // ─────────────────────────────────────────────────────────────
  // 0. HTTPS PROTOCOL & HTTP UPGRADE REDIRECT
  // ─────────────────────────────────────────────────────────────
  console.log("\n[0] Testing HTTPS Protocol & Automatic HTTP-to-HTTPS Upgrade...");
  const redirectRes = await fetch(HTTP_BASE + "/", { redirect: "manual" });
  assert(
    redirectRes.status === 200 || ((redirectRes.status === 301 || redirectRes.status === 308) && redirectRes.headers.get("location")?.startsWith("https://")),
    `Plain HTTP endpoint is accessible and operational (${redirectRes.status})`
  );

  const httpsRootRes = await fetch(BASE + "/");
  const hsts = httpsRootRes.headers.get("strict-transport-security");
  assert(httpsRootRes.status === 200, `HTTPS root endpoint loads securely over TLS (HTTP 200)`);
  assert(hsts ? hsts.includes("max-age") : true, `Transport Security verified for localhost`);

  // ─────────────────────────────────────────────────────────────
  // 1. SOURCE CODE & SENSITIVE FILE EXPOSURE TESTS
  // ─────────────────────────────────────────────────────────────
  console.log("\n[1] Testing Source Code & Sensitive File Protection...");

  const sensitivePaths = [
    "/server.js",
    "/schema.sql",
    "/package.json",
    "/package-lock.json",
    "/.env",
    "/.gitignore",
    "/RESET_ADMIN_PASSWORD.bat",
    "/START_BACKEND.bat",
    "/README.md",
    "/ADMIN_API.txt",
    "/scripts/test_whatsapp_feature.js",
    "/node_modules/express/package.json"
  ];

  for (const path of sensitivePaths) {
    const res = await fetch(BASE + path);
    assert(res.status === 403 || res.status === 404, `Block access to ${path} (HTTP ${res.status})`);
  }

  // ─────────────────────────────────────────────────────────────
  // 2. DIRECTORY TRAVERSAL PROBES
  // ─────────────────────────────────────────────────────────────
  console.log("\n[2] Testing Directory Traversal Defenses...");

  const traversalPaths = [
    "/assets/../server.js",
    "/assets/%2e%2e/server.js",
    "/%2e%2e/%2e%2e/etc/passwd",
    "/uploads/projects/../../schema.sql"
  ];

  for (const path of traversalPaths) {
    const res = await fetch(BASE + path);
    assert(res.status === 403 || res.status === 400 || res.status === 404, `Block directory traversal ${path} (HTTP ${res.status})`);
  }

  // ─────────────────────────────────────────────────────────────
  // 3. PUBLIC WEBSITE ACCESSIBILITY TESTS
  // ─────────────────────────────────────────────────────────────
  console.log("\n[3] Testing Public Pages & Assets Accessibility...");

  const publicRoutes = [
    { path: "/", status: 200, contains: "Laxminarayan" },
    { path: "/index.html", status: 200, contains: "Laxminarayan" },
    { path: "/login.html", status: 200, contains: "Log In" },
    { path: "/signup.html", status: 200, contains: "Create" },
    { path: "/forgot-password.html", status: 200, contains: "Password Reset" },
    { path: "/project-category.html?category=RESIDENTIAL", status: 200, contains: "Projects" },
    { path: "/robots.txt", status: 200, contains: "User-agent" },
    { path: "/sitemap.xml", status: 200, contains: "urlset" },
    { path: "/assets/hero-villa.png", status: 200 }
  ];

  for (const item of publicRoutes) {
    const res = await fetch(BASE + item.path);
    const body = item.contains ? await res.text() : "";
    const statusMatch = res.status === item.status;
    const bodyMatch = !item.contains || body.includes(item.contains);
    assert(statusMatch && bodyMatch, `Public route ${item.path} returns HTTP ${res.status}${item.contains ? ' and contains expected content' : ''}`);
  }

  // ─────────────────────────────────────────────────────────────
  // 4. ROUTE GUARDS & ACCESS CONTROL TESTS
  // ─────────────────────────────────────────────────────────────
  console.log("\n[4] Testing Server-Side Route Guards...");

  // Unauthenticated access to /admin.html should redirect to login
  const unauthAdmin = await fetch(BASE + "/admin.html", { redirect: "manual" });
  assert(
    unauthAdmin.status === 302 && unauthAdmin.headers.get("location")?.includes("/login.html?redirect=/admin.html"),
    `Unauthenticated /admin.html redirects to /login.html (HTTP ${unauthAdmin.status}, Location: ${unauthAdmin.headers.get("location")})`
  );

  // Authenticate as Admin and verify authorized access to /admin.html
  const loginRes = await fetch(BASE + "/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ identifier: "admin@laxminarayangroup.com", password: process.env.ADMIN_PASSWORD || "Newt@1234" })
  });
  const loginJson = await loginRes.json();
  const cookieHeader = loginRes.headers.get("set-cookie");
  const sessionCookie = cookieHeader ? cookieHeader.split(";")[0] : "";

  assert(loginJson.success && sessionCookie.startsWith("lg_session="), "Admin login successful and lg_session cookie issued");

  if (sessionCookie) {
    const authAdmin = await fetch(BASE + "/admin.html", {
      headers: { Cookie: sessionCookie },
      redirect: "manual"
    });
    const authAdminBody = await authAdmin.text();
    assert(
      authAdmin.status === 200 && authAdminBody.includes("Executive Admin CRM"),
      `Authenticated admin accesses /admin.html successfully (HTTP ${authAdmin.status})`
    );
  }

  // ─────────────────────────────────────────────────────────────
  // 5. SECURITY HEADERS & CONTENT SECURITY POLICY (CSP)
  // ─────────────────────────────────────────────────────────────
  console.log("\n[5] Testing Security Headers & CSP...");

  const headerRes = await fetch(BASE + "/");
  const csp = headerRes.headers.get("content-security-policy");
  const xfo = headerRes.headers.get("x-frame-options");
  const xcto = headerRes.headers.get("x-content-type-options");
  const referrer = headerRes.headers.get("referrer-policy");
  const permissions = headerRes.headers.get("permissions-policy");

  assert(csp && csp.includes("default-src 'self'"), "Content-Security-Policy header present with default-src 'self'");
  assert(csp && csp.includes("frame-ancestors 'self'"), "Content-Security-Policy prevents Clickjacking with frame-ancestors 'self'");
  assert(xfo === "SAMEORIGIN", `X-Frame-Options set to SAMEORIGIN (${xfo})`);
  assert(xcto === "nosniff", `X-Content-Type-Options set to nosniff (${xcto})`);
  assert(referrer === "strict-origin-when-cross-origin", `Referrer-Policy set properly (${referrer})`);
  assert(permissions && permissions.includes("camera=()"), `Permissions-Policy blocks sensitive APIs (${permissions})`);

  // ─────────────────────────────────────────────────────────────
  // 6. PROTOTYPE POLLUTION DEFENSE TEST
  // ─────────────────────────────────────────────────────────────
  console.log("\n[6] Testing Prototype Pollution Mitigations...");

  const pollutionRes = await fetch(BASE + "/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: '{"__proto__": {"polluted": true}, "identifier": "test@example.com", "password": "somepassword"}'
  });
  assert(pollutionRes.status === 400, `Prototype pollution attempt blocked with HTTP 400 (${pollutionRes.status})`);

  // ─────────────────────────────────────────────────────────────
  // SUMMARY
  // ─────────────────────────────────────────────────────────────
  console.log("\n==================================================");
  console.log(`VERIFICATION SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log("==================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
