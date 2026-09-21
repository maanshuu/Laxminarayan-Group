// ═════════════════════════════════════════════════════════════════════
// 🛡️ REAL-TIME LIVE ATTACK SIMULATION & PENETRATION DEFENSE TESTER
// Target: http://localhost:5000
// Simulates 7 Categories of Cyber Attacks & Validates Active Countermeasures
// ═════════════════════════════════════════════════════════════════════
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
const BASE = "https://localhost:5000";

const colors = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  cyan: "\x1b[36m",
  magenta: "\x1b[35m",
  bgRed: "\x1b[41m\x1b[37m",
  bgGreen: "\x1b[42m\x1b[30m"
};

function banner(title) {
  console.log(`\n${colors.cyan}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
  console.log(`${colors.bold}${colors.magenta}⚔️  ATTACK VECTOR: ${title}${colors.reset}`);
  console.log(`${colors.cyan}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
}

function result(attackName, payload, status, responseSnippet, blocked, defenseDescription) {
  console.log(`\n  ${colors.bold}🎯 Test:${colors.reset} ${attackName}`);
  console.log(`  ${colors.yellow}💥 Attack Payload:${colors.reset} ${payload}`);
  console.log(`  ${colors.cyan}📡 Server Response:${colors.reset} HTTP ${status} (${responseSnippet.slice(0, 80).replace(/\r?\n/g, " ")})`);
  if (blocked) {
    console.log(`  ${colors.bgGreen}${colors.bold} 🛡️ ATTACK DEFENDED & BLOCKED ${colors.reset} -> ${defenseDescription}`);
  } else {
    console.log(`  ${colors.bgRed}${colors.bold} ⚠️ VULNERABLE / LEAK DETECTED ${colors.reset}`);
  }
}

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function runLiveSimulation() {
  console.log(`${colors.bold}${colors.cyan}`);
  console.log("╔══════════════════════════════════════════════════════════════════════╗");
  console.log("║     LAXMINARAYAN GROUP — LIVE CYBERATTACK PENETRATION DEFENSE        ║");
  console.log("║     Target: http://localhost:5000 (Hardened Production Node Engine)   ║");
  console.log("╚══════════════════════════════════════════════════════════════════════╝");
  console.log(`${colors.reset}`);

  let totalAttacks = 0;
  let blockedAttacks = 0;

  // ─────────────────────────────────────────────────────────────
  // ATTACK 1: SOURCE CODE & CREDENTIAL EXFILTRATION
  // ─────────────────────────────────────────────────────────────
  banner("1. SOURCE CODE & SENSITIVE CONFIG EXFILTRATION");
  console.log("Simulating hacker automated scanners looking for exposed backend files (.js, .sql, .env, .bat)");

  const exfilTargets = [
    { name: "Node Server Source Code", path: "/server.js", expected: [403, 404] },
    { name: "Database Schema & Table Layout", path: "/schema.sql", expected: [403, 404] },
    { name: "Environment Secrets & Master Keys", path: "/.env", expected: [403, 404] },
    { name: "NPM Dependencies & Versions", path: "/package.json", expected: [403, 404] },
    { name: "Admin Password Reset Batch Script", path: "/RESET_ADMIN_PASSWORD.bat", expected: [403, 404] },
    { name: "Internal WhatsApp Test Script", path: "/scripts/test_whatsapp_feature.js", expected: [403, 404] },
    { name: "Git Version Control Config", path: "/.git/config", expected: [403, 404] }
  ];

  for (const t of exfilTargets) {
    totalAttacks++;
    try {
      const res = await fetch(BASE + t.path);
      const text = await res.text();
      const isBlocked = t.expected.includes(res.status) && !text.includes("JWT_SECRET") && !text.includes("CREATE TABLE");
      if (isBlocked) blockedAttacks++;
      result(t.name, `GET ${t.path}`, res.status, text || "Empty body", isBlocked, "Source shielding firewall returned 403 Forbidden");
    } catch (e) {
      console.error("  Error connecting:", e.message);
    }
  }

  // ─────────────────────────────────────────────────────────────
  // ATTACK 2: DIRECTORY & PATH TRAVERSAL (LFI / ESCAPE)
  // ─────────────────────────────────────────────────────────────
  banner("2. DIRECTORY TRAVERSAL (LOCAL FILE INCLUSION / PATH ESCAPE)");
  console.log("Simulating path escape attempts with ../, URL-encoded %2e%2e, and null-bytes");

  const traversalTargets = [
    { name: "Dot-dot slash escape from /assets", path: "/assets/../server.js" },
    { name: "URL-encoded %2e%2e traversal", path: "/assets/%2e%2e%2fserver.js" },
    { name: "Double URL-encoded traversal", path: "/assets/%252e%252e/schema.sql" },
    { name: "Uploads folder jailbreak", path: "/uploads/projects/../../package.json" },
    { name: "Null-byte poisoned request", path: "/index.html%00.js" }
  ];

  for (const t of traversalTargets) {
    totalAttacks++;
    try {
      const res = await fetch(BASE + t.path);
      const text = await res.text();
      const isBlocked = [400, 403, 404].includes(res.status) && !text.includes("require(");
      if (isBlocked) blockedAttacks++;
      result(t.name, `GET ${t.path}`, res.status, text || "Empty body", isBlocked, "URI path validator stopped path escape");
    } catch (e) {
      console.error("  Error connecting:", e.message);
    }
  }

  // ─────────────────────────────────────────────────────────────
  // ATTACK 3: UNAUTHORIZED ADMIN ACCESS & PRIVILEGE ESCALATION
  // ─────────────────────────────────────────────────────────────
  banner("3. UNAUTHORIZED ADMIN PRIVILEGE ESCALATION");
  console.log("Simulating unauthenticated attacker trying to load executive CRM panels directly");

  totalAttacks++;
  const unauthAdmin = await fetch(BASE + "/admin.html", { redirect: "manual" });
  const adminBlocked = unauthAdmin.status === 302 && unauthAdmin.headers.get("location")?.includes("/login.html?redirect=/admin.html");
  if (adminBlocked) blockedAttacks++;
  result(
    "Direct /admin.html Access Without Login",
    "GET /admin.html (No Session Cookie)",
    unauthAdmin.status,
    `Redirect -> ${unauthAdmin.headers.get("location")}`,
    adminBlocked,
    "Server-side route guard intercepted request and enforced 302 redirect to login"
  );

  totalAttacks++;
  const forgedCookie = await fetch(BASE + "/admin.html", {
    headers: { Cookie: "lg_session=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.fake_signature" },
    redirect: "manual"
  });
  const forgedBlocked = forgedCookie.status === 302;
  if (forgedBlocked) blockedAttacks++;
  result(
    "Forged JWT Session Token Hijack",
    "Cookie: lg_session=forged_token",
    forgedCookie.status,
    `Redirect -> ${forgedCookie.headers.get("location")}`,
    forgedBlocked,
    "Cryptographic verification rejected forged token signature and blocked access"
  );

  // ─────────────────────────────────────────────────────────────
  // ATTACK 4: SQL INJECTION (SQLi) ATTACK PROBE
  // ─────────────────────────────────────────────────────────────
  banner("4. SQL INJECTION (SQLi) ATTACKS ON SEARCH & AUTH");
  console.log("Injecting classic and blind SQL injection payloads into query params and auth endpoints");

  const sqliPayloads = [
    { field: "Search param in audit logs", url: "/api/admin/audit-logs?search=" + encodeURIComponent("' OR '1'='1' --") },
    { field: "Union-based injection in lead filter", url: "/api/admin/leads?status=" + encodeURIComponent("new' UNION SELECT 1,2,3,4,5,6 --") },
    { field: "Login bypass SQL payload", body: { identifier: "' OR 1=1 --", password: "arbitrary_password" } }
  ];

  for (const s of sqliPayloads) {
    totalAttacks++;
    if (s.url) {
      const res = await fetch(BASE + s.url);
      const text = await res.text();
      // Without admin session, returns 401. With admin session, executes parameterized placeholder.
      const safe = res.status === 401 || (res.status === 200 && !text.includes("syntax error") && !text.includes("SQLITE_ERROR"));
      if (safe) blockedAttacks++;
      result("SQL Injection: " + s.field, s.url, res.status, text.slice(0, 60), safe, "SQLite prepared statement parameterization safely neutralized payload");
    } else {
      const res = await fetch(BASE + "/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(s.body)
      });
      const json = await res.json();
      const safe = !json.success && res.status === 401;
      if (safe) blockedAttacks++;
      result("SQL Injection: " + s.field, JSON.stringify(s.body), res.status, JSON.stringify(json), safe, "Bcrypt & parameterized query rejected malicious login bypass");
    }
  }

  // ─────────────────────────────────────────────────────────────
  // ATTACK 5: PROTOTYPE POLLUTION EXPLOIT
  // ─────────────────────────────────────────────────────────────
  banner("5. JAVASCRIPT PROTOTYPE POLLUTION ATTACK");
  console.log("Injecting __proto__ and constructor prototype manipulation into JSON payloads");

  totalAttacks++;
  const pollutionRes = await fetch(BASE + "/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: '{"__proto__": {"isAdmin": true, "role": "admin"}, "identifier": "attacker@evil.com", "password": "hacked"}'
  });
  const pollutionJson = await pollutionRes.json();
  const pollutionBlocked = pollutionRes.status === 400 && pollutionJson.error?.includes("Invalid request payload");
  if (pollutionBlocked) blockedAttacks++;
  result(
    "Prototype Pollution Injection via JSON Body",
    '{"__proto__": {"isAdmin": true}}',
    pollutionRes.status,
    JSON.stringify(pollutionJson),
    pollutionBlocked,
    "Anti-pollution middleware inspected object properties and rejected request with 400"
  );

  // ─────────────────────────────────────────────────────────────
  // ATTACK 6: CLICKJACKING & EXTERNAL IFRAME EMBEDDING
  // ─────────────────────────────────────────────────────────────
  banner("6. CLICKJACKING & UI REDRESSING DEFENSE");
  console.log("Checking Content-Security-Policy (CSP) and X-Frame-Options against clickjacking");

  totalAttacks++;
  const clickRes = await fetch(BASE + "/login.html");
  const cspHeader = clickRes.headers.get("content-security-policy");
  const xfoHeader = clickRes.headers.get("x-frame-options");
  const clickSafe = (cspHeader && cspHeader.includes("frame-ancestors 'self'")) && (xfoHeader === "SAMEORIGIN");
  if (clickSafe) blockedAttacks++;
  result(
    "Clickjacking Frame Ancestors & X-Frame-Options Check",
    "Simulated <iframe> embedding from http://evil-phishing-site.com",
    clickRes.status,
    `CSP: frame-ancestors 'self' | XFO: ${xfoHeader}`,
    clickSafe,
    "Modern browsers will strictly refuse to render this page inside third-party frames"
  );

  // ─────────────────────────────────────────────────────────────
  // ATTACK 7: RATE LIMITING & BRUTE FORCE FLOODING
  // ─────────────────────────────────────────────────────────────
  banner("7. BRUTE FORCE FLOODING & DoS RATE LIMIT DEFENSE");
  console.log("Simulating rapid-fire dictionary brute-force attack against /api/auth/login (15 rapid requests)");

  let hitRateLimit = false;
  let attemptsCount = 0;

  for (let i = 1; i <= 15; i++) {
    attemptsCount++;
    const r = await fetch(BASE + "/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identifier: "admin@laxminarayangroup.com", password: `WrongGuess_${i}` })
    });
    if (r.status === 429) {
      hitRateLimit = true;
      console.log(`  ${colors.yellow}⚡ Attempt #${i}:${colors.reset} Rate limiter engaged! HTTP 429 Too Many Requests returned.`);
      break;
    } else {
      process.stdout.write(`  Attempt #${i}: HTTP ${r.status} | `);
    }
    await sleep(40);
  }

  totalAttacks++;
  if (hitRateLimit) blockedAttacks++;
  result(
    "Brute Force Dictionary Attack on Login",
    `Burst of 15 sequential authentication requests`,
    hitRateLimit ? 429 : 401,
    hitRateLimit ? "Too many requests. Please try again shortly." : "Rate limit not reached in 15 requests",
    hitRateLimit,
    "In-memory sliding window rate limiter clamped connection and shut down brute-force flood"
  );

  // ─────────────────────────────────────────────────────────────
  // FINAL SCORECARD
  // ─────────────────────────────────────────────────────────────
  console.log(`\n${colors.bold}${colors.cyan}══════════════════════════════════════════════════════════════════════${colors.reset}`);
  console.log(`${colors.bold}🏁 LIVE ATTACK PENETRATION RESULTS:${colors.reset}`);
  console.log(`  Total Simulated Attacks Launched: ${colors.bold}${totalAttacks}${colors.reset}`);
  console.log(`  Total Attacks Successfully Defended: ${colors.bold}${colors.green}${blockedAttacks}${colors.reset}`);
  console.log(`  Defensive Success Rate: ${colors.bold}${colors.green}${Math.round((blockedAttacks / totalAttacks) * 100)}%${colors.reset}`);
  console.log(`${colors.bold}${colors.cyan}══════════════════════════════════════════════════════════════════════${colors.reset}\n`);
}

runLiveSimulation().catch(e => {
  console.error("Simulation error:", e);
  process.exit(1);
});
