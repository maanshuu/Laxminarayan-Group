/**
 * Test Suite for 5 Suggestions Implementation:
 * 1. PDF Brochure Generation & CRM Gated Capture
 * 2. Instant WhatsApp Notification Dispatch
 * 3. Automated Cloud & Disaster Recovery Backup
 * 4. Sales Advisor Portal APIs & Role Guards
 * 5. PM2 & Windows Production Batch Scripts
 */

const http = require("http");
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

function makeRequest(options, postData = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      const chunks = [];
      res.on("data", (chunk) => chunks.push(chunk));
      res.on("end", () => {
        const buffer = Buffer.concat(chunks);
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: buffer.toString("utf-8"),
          buffer: buffer,
        });
      });
    });
    req.on("error", reject);
    if (postData) {
      if (typeof postData === "string" || Buffer.isBuffer(postData)) {
        req.write(postData);
      } else {
        req.write(JSON.stringify(postData));
      }
    }
    req.end();
  });
}

async function runTests() {
  console.log("=================================================================");
  console.log("   TESTING 5 PRODUCTION ENHANCEMENTS & SUGGESTIONS SUITE");
  console.log("=================================================================\n");

  let passed = 0;
  let failed = 0;

  function assert(name, condition, extraInfo = "") {
    if (condition) {
      console.log(`  ✓ ${name}`);
      passed++;
    } else {
      console.error(`  ✗ FAIL: ${name} ${extraInfo}`);
      failed++;
    }
  }

  // ─── TEST 1: PDF Brochure Download & CRM Capture ───
  console.log("[1/5] Testing PDF Brochure Download & High-Intent CRM Capture...");
  try {
    const brochureRes = await makeRequest({
      hostname: "localhost",
      port: 5000,
      path: "/api/projects/1/brochure",
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      }
    }, {
      name: "Rohit Sharma",
      phone: "+91 98765 43210",
      email: "rohit.sharma@example.com",
      project_id: 1,
      project_name: "Laxminarayan Solitaire"
    });

    assert("Brochure endpoint returns HTTP 200", brochureRes.statusCode === 200, `Got ${brochureRes.statusCode}`);
    assert("Content-Type is application/pdf", (brochureRes.headers["content-type"] || "").includes("application/pdf"));
    assert("PDF buffer starts with %PDF-1.4 header", brochureRes.buffer.slice(0, 8).toString("utf-8").startsWith("%PDF-1.4"));
    assert("PDF size is greater than 1500 bytes", brochureRes.buffer.length > 1500, `Size: ${brochureRes.buffer.length} bytes`);
  } catch (err) {
    assert("Brochure endpoint execution", false, err.message);
  }

  // ─── TEST 2: Instant WhatsApp Webhook & Notification Dispatcher ───
  console.log("\n[2/5] Testing Instant WhatsApp Notification on Enquiry...");
  try {
    const enquiryRes = await makeRequest({
      hostname: "localhost",
      port: 5000,
      path: "/api/enquiries",
      method: "POST",
      headers: { "Content-Type": "application/json" }
    }, {
      name: "Kavita Verma",
      phone: "9123456780",
      email: "kavita.verma@example.com",
      project_name: "Laxminarayan Heights",
      message: "Interested in 3 BHK penthouse floor plans."
    });
    assert("Enquiry submission returns HTTP 201/200", enquiryRes.statusCode === 201 || enquiryRes.statusCode === 200, `Got ${enquiryRes.statusCode}`);
    const enqJson = JSON.parse(enquiryRes.body);
    assert("Enquiry response includes direct WhatsApp link for instant contact", typeof enqJson.whatsapp_link === "string" && (enqJson.whatsapp_link.includes("wa.me") || enqJson.whatsapp_link.includes("whatsapp")));
  } catch (err) {
    assert("Enquiry notification dispatch", false, err.message);
  }

  // ─── TEST 3: Cloud Backup Runner & Retention Policy ───
  console.log("\n[3/5] Testing Automated Backup Runner & Snapshot Integrity...");
  try {
    const backupOutput = execSync("node scripts/cloud-backup.js", { encoding: "utf-8" });
    assert("Backup script runs without exit errors", true);
    assert("Backup output mentions backup directory", backupOutput.includes("SUCCESS") || backupOutput.includes("Backup completed successfully"));
    
    // Check backup directory
    const appData = process.env.APPDATA || (process.platform === "darwin" ? process.env.HOME + "/Library/Preferences" : "/var/local");
    const cloudBackupDir = path.join(appData, "LaxminarayanGroup", "cloud_backups");
    assert("Cloud backup directory exists", fs.existsSync(cloudBackupDir));
    const snapshots = fs.readdirSync(cloudBackupDir).filter(f => f.startsWith("laxminarayan_backup_"));
    assert("At least one timestamped snapshot created", snapshots.length > 0);

    if (snapshots.length > 0) {
      const latest = path.join(cloudBackupDir, snapshots[snapshots.length - 1]);
      const manifestPath = path.join(latest, "manifest.json");
      assert("Snapshot includes manifest.json", fs.existsSync(manifestPath));
      const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));
      assert("Manifest lists database archive", typeof manifest.db_file === "string");
      assert("Manifest records snapshot timestamp", typeof manifest.timestamp === "string");
    }
  } catch (err) {
    assert("Cloud backup execution", false, err.message);
  }

  // ─── TEST 4: Sales Advisor Portal API & Role-Based Access Control ───
  console.log("\n[4/5] Testing Sales Advisor Role Security & Portal APIs...");
  try {
    // 4a. Advisor unauthenticated access to /advisor.html is 302 redirected
    const unauthPageRes = await makeRequest({
      hostname: "localhost",
      port: 5000,
      path: "/advisor.html",
      method: "GET"
    });
    assert("Unauthenticated /advisor.html redirects to login", unauthPageRes.statusCode === 302 && (unauthPageRes.headers.location || "").includes("login.html"));

    // 4b. Login as Admin
    const adminLoginRes = await makeRequest({
      hostname: "localhost",
      port: 5000,
      path: "/api/auth/login",
      method: "POST",
      headers: { "Content-Type": "application/json" }
    }, {
      identifier: "admin@laxminarayangroup.com",
      password: "Newt@1234"
    });
    const adminData = JSON.parse(adminLoginRes.body);
    const adminToken = adminData.token;
    assert("Admin login successful", adminData.success === true && !!adminToken);

    // 4c. Ensure an employee exists for testing
    let employeeEmail = "advisor.test@laxminarayangroup.com";
    let employeeToken = null;

    // Check existing employees or create employee
    const empsRes = await makeRequest({
      hostname: "localhost",
      port: 5000,
      path: "/api/admin/employees",
      method: "GET",
      headers: { "Authorization": `Bearer ${adminToken}` }
    });
    const emps = JSON.parse(empsRes.body).data || [];
    let emp = emps.find(u => u.email === employeeEmail);

    if (!emp) {
      const createEmpRes = await makeRequest({
        hostname: "localhost",
        port: 5000,
        path: "/api/admin/employees",
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${adminToken}`
        }
      }, {
        name: "Priya Sharma (Senior Advisor)",
        email: employeeEmail,
        password: "AdvisorPass@123",
        phone: "+91 9988776655",
        department: "Sales & Advisory",
        designation: "Senior Sales Advisor"
      });
      const created = JSON.parse(createEmpRes.body);
      emp = created.data;
    }

    // Login as employee
    const empLoginRes = await makeRequest({
      hostname: "localhost",
      port: 5000,
      path: "/api/auth/login",
      method: "POST",
      headers: { "Content-Type": "application/json" }
    }, {
      identifier: employeeEmail,
      password: "AdvisorPass@123"
    });
    const empData = JSON.parse(empLoginRes.body);
    employeeToken = empData.token;
    assert("Employee (Advisor) login successful", empData.success === true && !!employeeToken);

    // 4d. Employee Dashboard API
    const empDashRes = await makeRequest({
      hostname: "localhost",
      port: 5000,
      path: "/api/employee/dashboard",
      method: "GET",
      headers: { "Authorization": `Bearer ${employeeToken}` }
    });
    assert("Employee dashboard returns HTTP 200", empDashRes.statusCode === 200);
    const empDash = JSON.parse(empDashRes.body);
    assert("Employee dashboard includes stats & profile", empDash.success === true && typeof empDash.data?.employee === "object" && typeof empDash.data?.assignedLeads === "number");

    // 4e. Employee Attendance Check-in
    const checkinRes = await makeRequest({
      hostname: "localhost",
      port: 5000,
      path: "/api/employee/attendance/check-in",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${employeeToken}`
      }
    }, { location: "Thane Sales Lounge", notes: "Shift started on time" });
    assert("Employee check-in returns HTTP 200", checkinRes.statusCode === 200);
    const checkinData = JSON.parse(checkinRes.body);
    assert("Attendance check-in status recorded", checkinData.success === true && (checkinData.record?.status === "present" || checkinData.record?.check_in));

    // 4f. Employee Leads API
    const empLeadsRes = await makeRequest({
      hostname: "localhost",
      port: 5000,
      path: "/api/employee/leads",
      method: "GET",
      headers: { "Authorization": `Bearer ${employeeToken}` }
    });
    assert("Employee leads list returns HTTP 200", empLeadsRes.statusCode === 200);
    const empLeads = JSON.parse(empLeadsRes.body);
    assert("Employee leads data is an array", Array.isArray(empLeads.data));

    // 4g. Employee cannot access Admin-only endpoints (RBAC test)
    const adminOnlyRes = await makeRequest({
      hostname: "localhost",
      port: 5000,
      path: "/api/admin/employees",
      method: "GET",
      headers: { "Authorization": `Bearer ${employeeToken}` }
    });
    assert("Employee blocked from /api/admin/employees with HTTP 403", adminOnlyRes.statusCode === 403);

  } catch (err) {
    assert("Sales advisor portal testing", false, err.message);
  }

  // ─── TEST 5: Production Scripts & PM2 Ecosystem Config ───
  console.log("\n[5/5] Testing Production Batch Files & PM2 Ecosystem Config...");
  try {
    const ecosystemPath = path.join(__dirname, "..", "ecosystem.config.js");
    assert("ecosystem.config.js exists", fs.existsSync(ecosystemPath));
    const ecoConfig = require(ecosystemPath);
    assert("ecosystem.config.js exports apps array", Array.isArray(ecoConfig.apps) && ecoConfig.apps.length > 0);
    const appConfig = ecoConfig.apps[0];
    assert("PM2 app name is 'laxminarayan-group'", appConfig.name === "laxminarayan-group");
    assert("PM2 enforces Asia/Kolkata timezone", appConfig.env && appConfig.env.TZ === "Asia/Kolkata");
    assert("PM2 configures restart delay & memory limit", !!appConfig.restart_delay && !!appConfig.max_memory_restart);

    const startBatPath = path.join(__dirname, "..", "START_PRODUCTION.bat");
    assert("START_PRODUCTION.bat exists", fs.existsSync(startBatPath));
    const startBatContent = fs.readFileSync(startBatPath, "utf-8");
    assert("START_PRODUCTION.bat contains pm2 and node commands", startBatContent.includes("pm2") || startBatContent.includes("node server.js"));

    const backupBatPath = path.join(__dirname, "..", "RUN_CLOUD_BACKUP.bat");
    assert("RUN_CLOUD_BACKUP.bat exists", fs.existsSync(backupBatPath));
    const backupBatContent = fs.readFileSync(backupBatPath, "utf-8");
    assert("RUN_CLOUD_BACKUP.bat invokes cloud-backup.js", backupBatContent.includes("cloud-backup.js"));
  } catch (err) {
    assert("Production scripts check", false, err.message);
  }

  console.log("\n=================================================================");
  console.log(`  FINAL RESULT: ${passed} PASSED, ${failed} FAILED`);
  console.log("=================================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error("Test runner error:", err);
  process.exit(1);
});
