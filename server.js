require("dotenv").config();
const express=require("express");
const cors=require("cors");
const helmet=require("helmet");
const bcrypt=require("bcryptjs");
const jwt=require("jsonwebtoken");
const cookieParser=require("cookie-parser");
const multer=require("multer");
const fs=require("fs");
const path=require("path");
const os=require("os");
const Database=require("./scripts/sqlite-compat");

const app=express();
const PORT=Number(process.env.PORT||5000);
const JWT_SECRET=process.env.JWT_SECRET;
if(!JWT_SECRET || JWT_SECRET.length < 32) {
  throw new Error("JWT_SECRET must be set to a random value of at least 32 characters.");
}
const FRONTEND_URL=process.env.FRONTEND_URL||"http://localhost:5000";

// Persistent application storage: keep business data and uploaded media outside the
// extracted project folder so future ZIP updates cannot accidentally create a new
// SQLite database or lose project media. A relative DB_FILE in .env is treated as
// the legacy location and is migrated automatically on first run. An absolute
// DB_FILE remains respected for advanced deployments.
const APP_DATA_ROOT=path.join(process.env.APPDATA||path.join(os.homedir(),"AppData","Roaming"),"LaxminarayanGroup");
const PERSISTENT_DATA_DIR=path.join(APP_DATA_ROOT,"data");
const PERSISTENT_UPLOAD_DIR=path.join(APP_DATA_ROOT,"uploads","projects");
const CONFIGURED_DB=process.env.DB_FILE||"./data/laxminarayan.db";
const LEGACY_DB_FILE=path.resolve(__dirname,CONFIGURED_DB);
const DB_FILE=path.isAbsolute(CONFIGURED_DB) ? CONFIGURED_DB : path.join(PERSISTENT_DATA_DIR,"laxminarayan.db");
const LEGACY_UPLOAD_DIR=path.join(__dirname,"uploads","projects");

function copyDirRecursive(src,dst){
  if(!fs.existsSync(src)) return;
  fs.mkdirSync(dst,{recursive:true});
  for(const entry of fs.readdirSync(src,{withFileTypes:true})){
    const from=path.join(src,entry.name), to=path.join(dst,entry.name);
    if(entry.isDirectory()) copyDirRecursive(from,to);
    else if(!fs.existsSync(to)) fs.copyFileSync(from,to);
  }
}
function findNewestLegacyDb(){
  const roots=[path.dirname(__dirname),path.dirname(path.dirname(__dirname))];
  const candidates=[];
  for(const root of roots){
    if(!fs.existsSync(root)) continue;
    for(const name of fs.readdirSync(root,{withFileTypes:true})){
      if(!name.isDirectory()) continue;
      const candidate=path.join(root,name.name,"data","laxminarayan.db");
      if(candidate===LEGACY_DB_FILE || candidate===DB_FILE || !fs.existsSync(candidate)) continue;
      try{candidates.push({path:candidate,mtime:fs.statSync(candidate).mtimeMs});}catch(_e){}
    }
  }
  candidates.sort((a,b)=>b.mtime-a.mtime);
  return candidates[0]?.path||null;
}
function initializePersistentStorage(){
  fs.mkdirSync(PERSISTENT_DATA_DIR,{recursive:true});
  fs.mkdirSync(PERSISTENT_UPLOAD_DIR,{recursive:true});
  // First prefer a database/media folder in this project. If this ZIP was
  // extracted beside an older Laxminarayan project, automatically import the
  // newest existing database once. Never overwrite the persistent store later.
  if(!fs.existsSync(DB_FILE)){
    const sourceDb=fs.existsSync(LEGACY_DB_FILE)?LEGACY_DB_FILE:findNewestLegacyDb();
    if(sourceDb){
      fs.copyFileSync(sourceDb,DB_FILE);
      for(const sidecar of [sourceDb+"-wal",sourceDb+"-shm"]){
        if(fs.existsSync(sidecar)) fs.copyFileSync(sidecar,DB_FILE+sidecar.slice(sourceDb.length));
      }
      console.log(`Imported existing database from ${sourceDb}`);
    }else{
      console.log(`No existing database found; creating a new persistent database at ${DB_FILE}`);
    }
  }
  if(!fs.existsSync(path.join(PERSISTENT_UPLOAD_DIR,".storage-initialized"))){
    let sourceUploads=fs.existsSync(LEGACY_UPLOAD_DIR)?LEGACY_UPLOAD_DIR:null;
    if(!sourceUploads){
      const dbSource=findNewestLegacyDb();
      if(dbSource){const sibling=path.dirname(path.dirname(dbSource)); const candidate=path.join(sibling,"uploads","projects"); if(fs.existsSync(candidate)) sourceUploads=candidate;}
    }
    if(sourceUploads) copyDirRecursive(sourceUploads,PERSISTENT_UPLOAD_DIR);
    fs.writeFileSync(path.join(PERSISTENT_UPLOAD_DIR,".storage-initialized"),new Date().toISOString());
    if(sourceUploads) console.log(`Imported existing project media from ${sourceUploads}`);
  }
}
initializePersistentStorage();

const PROJECT_UPLOAD_DIR=PERSISTENT_UPLOAD_DIR;
fs.mkdirSync(PROJECT_UPLOAD_DIR,{recursive:true});
const projectStorage=multer.diskStorage({
  destination:(req,file,cb)=>cb(null,PROJECT_UPLOAD_DIR),
  filename:(req,file,cb)=>{
    const ext=path.extname(file.originalname||"").toLowerCase();
    const base=path.basename(file.originalname||"media",ext).replace(/[^a-zA-Z0-9_-]+/g,"-").replace(/^-+|-+$/g,"").slice(0,60)||"media";
    cb(null,`${Date.now()}-${Math.random().toString(36).slice(2,10)}-${base}${ext}`);
  }
});
const ALLOWED_IMAGE_EXT=new Set([".jpg",".jpeg",".png",".webp",".gif",".avif",".heic",".heif",".tif",".tiff"]);
const ALLOWED_VIDEO_EXT=new Set([".mp4",".webm",".mov",".m4v",".ogv",".avi"]);
const IMAGE_MAX=250*1024*1024;
const VIDEO_MAX=2*1024*1024*1024;
const projectMediaUpload=multer({
  storage:projectStorage,
  limits:{fileSize:VIDEO_MAX,files:20},
  fileFilter:(req,file,cb)=>{
    const ext=path.extname(file.originalname||"").toLowerCase();
    if(ALLOWED_IMAGE_EXT.has(ext)||ALLOWED_VIDEO_EXT.has(ext)) return cb(null,true);
    cb(new Error("Supported media: JPG, JPEG, PNG, WEBP, GIF, AVIF, HEIC, HEIF, TIFF, MP4, WEBM, MOV, M4V, OGV or AVI"));
  }
});
function mediaTypeFor(file){
  const ext=path.extname(file.originalname||"").toLowerCase();
  return ALLOWED_VIDEO_EXT.has(ext) ? "video" : "image";
}
function safeMediaPath(filePath){
  if(!filePath || !filePath.startsWith("/uploads/projects/")) return null;
  const relative=filePath.replace(/^\/+/,"").replace(/^uploads[\\/]projects[\\/]?/,"");
  const full=path.resolve(PROJECT_UPLOAD_DIR,relative);
  return full.startsWith(PROJECT_UPLOAD_DIR+path.sep) ? full : null;
}
function deleteMediaFile(filePath){
  const full=safeMediaPath(filePath); if(full) try{fs.unlinkSync(full)}catch(_e){}
}
function projectRow(id){
  return db.prepare("SELECT id,name,category,description,image,location,price,amenities,status,created_at,updated_at FROM projects WHERE id=?").get(id);
}
function mediaRows(projectId){
  return db.prepare("SELECT id,project_id,media_type,mime_type,original_name,file_path,file_size,is_cover,created_at FROM project_media WHERE project_id=? ORDER BY is_cover DESC,id ASC").all(projectId);
}

const projectUpload=multer({storage:projectStorage,limits:{fileSize:250*1024*1024},fileFilter:(req,file,cb)=>{const ext=path.extname(file.originalname||"").toLowerCase();if(ALLOWED_IMAGE_EXT.has(ext))return cb(null,true);cb(new Error("Supported project images: JPG, JPEG, PNG, WEBP, GIF, AVIF, HEIC, HEIF or TIFF"));}});
const db=new Database(DB_FILE);
db.pragma("journal_mode=WAL");
db.pragma("foreign_keys=ON");
db.pragma("busy_timeout=5000");

db.exec(fs.readFileSync(path.join(__dirname,"schema.sql"),"utf8"));
function migrateLegacySchema(){
  const cols=(table)=>new Set(db.prepare(`PRAGMA table_info(${table})`).all().map(x=>x.name));
  let c=cols("users");
  if(!c.has("status")) db.exec("ALTER TABLE users ADD COLUMN status TEXT NOT NULL DEFAULT 'active'");
  if(!c.has("session_version")) db.exec("ALTER TABLE users ADD COLUMN session_version INTEGER NOT NULL DEFAULT 0");
  if(!c.has("updated_at")) { db.exec("ALTER TABLE users ADD COLUMN updated_at TEXT NOT NULL DEFAULT ''"); db.exec("UPDATE users SET updated_at=created_at WHERE updated_at=''"); }
  c=cols("enquiries");
  if(!c.has("user_id")) db.exec("ALTER TABLE enquiries ADD COLUMN user_id INTEGER");
  if(!c.has("project_id")) db.exec("ALTER TABLE enquiries ADD COLUMN project_id INTEGER");
  if(!c.has("enquiry_reference")) db.exec("ALTER TABLE enquiries ADD COLUMN enquiry_reference TEXT");
  if(!c.has("admin_response")) db.exec("ALTER TABLE enquiries ADD COLUMN admin_response TEXT NOT NULL DEFAULT ''");
  db.exec("CREATE UNIQUE INDEX IF NOT EXISTS idx_enquiries_reference_unique ON enquiries(enquiry_reference) WHERE enquiry_reference IS NOT NULL AND enquiry_reference <> ''");
  db.prepare("UPDATE enquiries SET enquiry_reference='ENQ-' || printf('%06d',id) WHERE enquiry_reference IS NULL OR enquiry_reference=''").run();
  db.exec("CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at)");
  db.exec("CREATE INDEX IF NOT EXISTS idx_enquiries_user_id ON enquiries(user_id)");
  db.exec("CREATE INDEX IF NOT EXISTS idx_enquiries_status ON enquiries(status)");
  db.exec("CREATE INDEX IF NOT EXISTS idx_enquiries_project_id ON enquiries(project_id)");
}
migrateLegacySchema();

function migrateProductionSchema(){
  const cols=(table)=>new Set(db.prepare(`PRAGMA table_info(${table})`).all().map(x=>x.name));
  let pc=cols("projects");
  if(!pc.has("location")) db.exec("ALTER TABLE projects ADD COLUMN location TEXT NOT NULL DEFAULT ''");
  if(!pc.has("price")) db.exec("ALTER TABLE projects ADD COLUMN price TEXT NOT NULL DEFAULT ''");
  if(!pc.has("amenities")) db.exec("ALTER TABLE projects ADD COLUMN amenities TEXT NOT NULL DEFAULT ''");
  let c=cols("leads");
  if(!c.has("user_id")) db.exec("ALTER TABLE leads ADD COLUMN user_id INTEGER");
  if(!c.has("name")) db.exec("ALTER TABLE leads ADD COLUMN name TEXT NOT NULL DEFAULT ''");
  if(!c.has("phone")) db.exec("ALTER TABLE leads ADD COLUMN phone TEXT NOT NULL DEFAULT ''");
  if(!c.has("email")) db.exec("ALTER TABLE leads ADD COLUMN email TEXT NOT NULL DEFAULT ''");
  if(!c.has("source")) db.exec("ALTER TABLE leads ADD COLUMN source TEXT NOT NULL DEFAULT 'website'");
  if(!c.has("status")) db.exec("ALTER TABLE leads ADD COLUMN status TEXT NOT NULL DEFAULT 'new'");
  if(!c.has("notes")) db.exec("ALTER TABLE leads ADD COLUMN notes TEXT NOT NULL DEFAULT ''");
  if(!c.has("project_id")) db.exec("ALTER TABLE leads ADD COLUMN project_id INTEGER");
  if(!c.has("enquiry_id")) db.exec("ALTER TABLE leads ADD COLUMN enquiry_id INTEGER");
  if(!c.has("assigned_employee_id")) db.exec("ALTER TABLE leads ADD COLUMN assigned_employee_id INTEGER");
  if(!c.has("follow_up_at")) db.exec("ALTER TABLE leads ADD COLUMN follow_up_at TEXT");
  if(!c.has("lost_reason")) db.exec("ALTER TABLE leads ADD COLUMN lost_reason TEXT NOT NULL DEFAULT ''");
  if(!c.has("created_at")) { db.exec("ALTER TABLE leads ADD COLUMN created_at TEXT NOT NULL DEFAULT ''"); db.prepare("UPDATE leads SET created_at=CURRENT_TIMESTAMP WHERE created_at=''").run(); }
  if(!c.has("updated_at")) { db.exec("ALTER TABLE leads ADD COLUMN updated_at TEXT NOT NULL DEFAULT ''"); db.prepare("UPDATE leads SET updated_at=created_at WHERE updated_at=''").run(); }
  db.exec("CREATE INDEX IF NOT EXISTS idx_leads_project_id ON leads(project_id)");
  db.exec("CREATE INDEX IF NOT EXISTS idx_leads_employee_id ON leads(assigned_employee_id)");
  db.exec("CREATE INDEX IF NOT EXISTS idx_leads_follow_up ON leads(follow_up_at)");
  db.exec(`CREATE TABLE IF NOT EXISTS site_visits (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    project_id INTEGER,
    enquiry_id INTEGER,
    name TEXT NOT NULL,
    phone TEXT NOT NULL DEFAULT '',
    email TEXT NOT NULL DEFAULT '',
    preferred_at TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'requested',
    notes TEXT NOT NULL DEFAULT '',
    admin_notes TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE SET NULL,
    FOREIGN KEY(enquiry_id) REFERENCES enquiries(id) ON DELETE SET NULL
  );
  CREATE INDEX IF NOT EXISTS idx_site_visits_status ON site_visits(status);
  CREATE INDEX IF NOT EXISTS idx_site_visits_project ON site_visits(project_id);
  CREATE INDEX IF NOT EXISTS idx_site_visits_date ON site_visits(preferred_at);`);
  db.exec(`CREATE TABLE IF NOT EXISTS audit_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id INTEGER,
    details TEXT NOT NULL DEFAULT '',
    ip_address TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE SET NULL
  );
  CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at);
  CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_logs(entity_type,entity_id);`);

  // Complete migrations for tables that may already exist in an older CRM build.
  c=cols("employees");
  if(!c.has("user_id")) db.exec("ALTER TABLE employees ADD COLUMN user_id INTEGER");
  if(!c.has("employee_code")) db.exec("ALTER TABLE employees ADD COLUMN employee_code TEXT NOT NULL DEFAULT ''");
  if(!c.has("department")) db.exec("ALTER TABLE employees ADD COLUMN department TEXT NOT NULL DEFAULT ''");
  if(!c.has("designation")) db.exec("ALTER TABLE employees ADD COLUMN designation TEXT NOT NULL DEFAULT ''");
  if(!c.has("status")) db.exec("ALTER TABLE employees ADD COLUMN status TEXT NOT NULL DEFAULT 'active'");
  if(!c.has("joined_at")) db.exec("ALTER TABLE employees ADD COLUMN joined_at TEXT");
  if(!c.has("created_at")) db.exec("ALTER TABLE employees ADD COLUMN created_at TEXT NOT NULL DEFAULT ''");
  if(!c.has("updated_at")) db.exec("ALTER TABLE employees ADD COLUMN updated_at TEXT NOT NULL DEFAULT ''");
  const blankEmployees=db.prepare("SELECT id FROM employees WHERE employee_code='' ORDER BY id").all();
  for(const e of blankEmployees){ db.prepare("UPDATE employees SET employee_code=? WHERE id=?").run(`EMP-${String(e.id).padStart(4,'0')}`,e.id); }
  c=cols("site_visits");
  if(!c.has("user_id")) db.exec("ALTER TABLE site_visits ADD COLUMN user_id INTEGER");
  if(!c.has("project_id")) db.exec("ALTER TABLE site_visits ADD COLUMN project_id INTEGER");
  if(!c.has("enquiry_id")) db.exec("ALTER TABLE site_visits ADD COLUMN enquiry_id INTEGER");
  if(!c.has("name")) db.exec("ALTER TABLE site_visits ADD COLUMN name TEXT NOT NULL DEFAULT ''");
  if(!c.has("phone")) db.exec("ALTER TABLE site_visits ADD COLUMN phone TEXT NOT NULL DEFAULT ''");
  if(!c.has("email")) db.exec("ALTER TABLE site_visits ADD COLUMN email TEXT NOT NULL DEFAULT ''");
  if(!c.has("preferred_at")) db.exec("ALTER TABLE site_visits ADD COLUMN preferred_at TEXT NOT NULL DEFAULT ''");
  if(!c.has("status")) db.exec("ALTER TABLE site_visits ADD COLUMN status TEXT NOT NULL DEFAULT 'requested'");
  if(!c.has("notes")) db.exec("ALTER TABLE site_visits ADD COLUMN notes TEXT NOT NULL DEFAULT ''");
  if(!c.has("admin_notes")) db.exec("ALTER TABLE site_visits ADD COLUMN admin_notes TEXT NOT NULL DEFAULT ''");
  if(!c.has("created_at")) db.exec("ALTER TABLE site_visits ADD COLUMN created_at TEXT NOT NULL DEFAULT ''");
  if(!c.has("updated_at")) db.exec("ALTER TABLE site_visits ADD COLUMN updated_at TEXT NOT NULL DEFAULT ''");
  db.exec(`CREATE TABLE IF NOT EXISTS employee_attendance (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    employee_id INTEGER NOT NULL,
    attendance_date TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'present',
    check_in TEXT,
    check_out TEXT,
    notes TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(employee_id,attendance_date),
    FOREIGN KEY(employee_id) REFERENCES employees(id) ON DELETE CASCADE
  );
  CREATE INDEX IF NOT EXISTS idx_attendance_date ON employee_attendance(attendance_date);
  CREATE INDEX IF NOT EXISTS idx_attendance_employee ON employee_attendance(employee_id);`);

  c=cols("audit_logs");
  if(!c.has("user_id")) db.exec("ALTER TABLE audit_logs ADD COLUMN user_id INTEGER");
  if(!c.has("action")) db.exec("ALTER TABLE audit_logs ADD COLUMN action TEXT NOT NULL DEFAULT 'unknown'");
  if(!c.has("entity_type")) db.exec("ALTER TABLE audit_logs ADD COLUMN entity_type TEXT NOT NULL DEFAULT 'unknown'");
  if(!c.has("entity_id")) db.exec("ALTER TABLE audit_logs ADD COLUMN entity_id INTEGER");
  if(!c.has("details")) db.exec("ALTER TABLE audit_logs ADD COLUMN details TEXT NOT NULL DEFAULT ''");
  if(!c.has("ip_address")) db.exec("ALTER TABLE audit_logs ADD COLUMN ip_address TEXT NOT NULL DEFAULT ''");
  if(!c.has("created_at")) db.exec("ALTER TABLE audit_logs ADD COLUMN created_at TEXT NOT NULL DEFAULT ''");

  // Enterprise PropTech: Project Unit Inventory Matrix (Towers / Flats / Villas / Plots)
  db.exec(`CREATE TABLE IF NOT EXISTS project_units (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL,
    unit_number TEXT NOT NULL,
    unit_type TEXT NOT NULL DEFAULT '3 BHK',
    floor_number INTEGER DEFAULT 1,
    area_sqft INTEGER NOT NULL DEFAULT 1200,
    price TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'available' CHECK(status IN ('available','blocked','sold')),
    buyer_name TEXT NOT NULL DEFAULT '',
    buyer_phone TEXT NOT NULL DEFAULT '',
    notes TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE CASCADE
  );
  CREATE INDEX IF NOT EXISTS idx_units_project_id ON project_units(project_id);
  CREATE INDEX IF NOT EXISTS idx_units_status ON project_units(status);`);

  c=cols("leads");
  if(!c.has("budget")) db.exec("ALTER TABLE leads ADD COLUMN budget TEXT NOT NULL DEFAULT ''");
  if(!c.has("sentiment")) db.exec("ALTER TABLE leads ADD COLUMN sentiment TEXT NOT NULL DEFAULT 'warm'");
  if(!c.has("unit_id")) db.exec("ALTER TABLE leads ADD COLUMN unit_id INTEGER");

  c=cols("bookings");
  if(!c.has("unit_id")) db.exec("ALTER TABLE bookings ADD COLUMN unit_id INTEGER");
  if(!c.has("lead_id")) db.exec("ALTER TABLE bookings ADD COLUMN lead_id INTEGER");
  if(!c.has("customer_name")) db.exec("ALTER TABLE bookings ADD COLUMN customer_name TEXT NOT NULL DEFAULT ''");
  if(!c.has("customer_phone")) db.exec("ALTER TABLE bookings ADD COLUMN customer_phone TEXT NOT NULL DEFAULT ''");
  if(!c.has("customer_email")) db.exec("ALTER TABLE bookings ADD COLUMN customer_email TEXT NOT NULL DEFAULT ''");
  if(!c.has("allotted_unit")) db.exec("ALTER TABLE bookings ADD COLUMN allotted_unit TEXT NOT NULL DEFAULT ''");
  if(!c.has("agreement_value")) db.exec("ALTER TABLE bookings ADD COLUMN agreement_value TEXT NOT NULL DEFAULT ''");
  if(!c.has("token_amount")) db.exec("ALTER TABLE bookings ADD COLUMN token_amount TEXT NOT NULL DEFAULT ''");
  if(!c.has("payment_status")) db.exec("ALTER TABLE bookings ADD COLUMN payment_status TEXT NOT NULL DEFAULT 'token_received'");
}
migrateProductionSchema();

function seedSampleProjectUnits(){
  try{
    const unitCount=db.prepare("SELECT COUNT(*) c FROM project_units").get().c;
    if(unitCount>0) return;
    const projects=db.prepare("SELECT id,name,category FROM projects LIMIT 12").all();
    if(!projects.length) return;
    const insert=db.prepare(`INSERT INTO project_units(project_id,unit_number,unit_type,floor_number,area_sqft,price,status,buyer_name,buyer_phone,notes)
      VALUES(?,?,?,?,?,?,?,?,?,?)`);
    const tx=db.transaction(()=>{
      for(const p of projects){
        const cat=(p.category||'').toUpperCase();
        if(cat==="RESIDENTIAL" || p.name.toLowerCase().includes("villa") || p.name.toLowerCase().includes("heights")){
          insert.run(p.id,"Unit 101","3 BHK Luxury",1,1850,"₹85,00,000","available","","","Garden facing with private deck");
          insert.run(p.id,"Unit 102","3 BHK Luxury",1,1850,"₹85,00,000","blocked","Rajesh Sharma","9876543210","Token advance paid, agreement in progress");
          insert.run(p.id,"Unit 201","4 BHK Penthouse",2,2600,"₹1,35,00,000","available","","","Corner penthouse with expansive terrace");
          insert.run(p.id,"Unit 202","2 BHK Premium",2,1250,"₹62,00,000","sold","Anita Desai","9823456789","Sold & booked, handover scheduled");
        }else if(cat==="COMMERCIAL"){
          insert.run(p.id,"Office 301","Executive Suite",3,980,"₹72,00,000","available","","","Road facing premium glass facade office");
          insert.run(p.id,"Shop G-04","Retail Showroom",0,1450,"₹1,15,00,000","blocked","Vikas Patel","9898012345","Retail showroom token held");
          insert.run(p.id,"Office 402","Corporate Workspace",4,1700,"₹1,10,00,000","available","","","Double height ceiling with parking slots");
        }else{
          insert.run(p.id,"Plot #12","Industrial Plot",1,5000,"₹95,00,000","available","","","Heavy power & water connection infrastructure");
          insert.run(p.id,"Shed B-1","Industrial Warehouse",1,7500,"₹1,50,00,000","sold","Metro Logistics","9712345678","Long-term industrial facility lease/sale");
        }
      }
    });
    tx();
    console.log("Seeded initial real estate project inventory units");
  }catch(e){console.error("Unit seeding warning:",e.message);}
}
seedSampleProjectUnits();

// Backfill one CRM lead for every existing enquiry that does not already have one.
// This keeps older databases compatible with the production CRM upgrade.
function backfillEnquiryLeads(){
  const rows=db.prepare(`SELECT e.id,e.user_id,e.project_id,e.name,e.phone,e.email,e.status,e.message,e.created_at
    FROM enquiries e LEFT JOIN leads l ON l.enquiry_id=e.id WHERE l.id IS NULL ORDER BY e.id`).all();
  if(!rows.length) return;
  const insert=db.prepare(`INSERT INTO leads(user_id,name,phone,email,source,status,notes,project_id,enquiry_id,created_at,updated_at)
    VALUES(?,?,?,?,?,?,?,?,?,?,?)`);
  const tx=db.transaction(items=>{for(const e of items){
    const status=e.status==='closed'?'lost':(e.status==='contacted'?'contacted':'new');
    insert.run(e.user_id,e.name,e.phone||'',e.email||'','website enquiry',status,e.message||'',e.project_id||null,e.id,e.created_at||new Date().toISOString(),e.created_at||new Date().toISOString());
  }});
  tx(rows);
}
backfillEnquiryLeads();
db.exec("CREATE INDEX IF NOT EXISTS idx_leads_enquiry_id ON leads(enquiry_id)");

db.exec(`CREATE TABLE IF NOT EXISTS project_media (
 id INTEGER PRIMARY KEY AUTOINCREMENT, project_id INTEGER NOT NULL, media_type TEXT NOT NULL CHECK(media_type IN ('image','video')), mime_type TEXT NOT NULL DEFAULT '', original_name TEXT NOT NULL, file_path TEXT NOT NULL, file_size INTEGER NOT NULL DEFAULT 0, is_cover INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL DEFAULT (datetime('now')), FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE CASCADE
); CREATE INDEX IF NOT EXISTS idx_project_media_project_id ON project_media(project_id);`);
(function migrateProjectMedia(){
 const cols=new Set(db.prepare("PRAGMA table_info(project_media)").all().map(x=>x.name));
 if(!cols.has("mime_type")) db.exec("ALTER TABLE project_media ADD COLUMN mime_type TEXT NOT NULL DEFAULT ''");
 if(!cols.has("original_name")) db.exec("ALTER TABLE project_media ADD COLUMN original_name TEXT NOT NULL DEFAULT ''");
 if(!cols.has("file_path")) db.exec("ALTER TABLE project_media ADD COLUMN file_path TEXT NOT NULL DEFAULT ''");
 if(!cols.has("file_size")) db.exec("ALTER TABLE project_media ADD COLUMN file_size INTEGER NOT NULL DEFAULT 0");
 if(!cols.has("is_cover")) db.exec("ALTER TABLE project_media ADD COLUMN is_cover INTEGER NOT NULL DEFAULT 0");
 if(!cols.has("created_at")) db.exec("ALTER TABLE project_media ADD COLUMN created_at TEXT NOT NULL DEFAULT ''");
})();
function projectRow(id){return db.prepare("SELECT id,name,category,description,image,location,price,amenities,status,created_at,updated_at FROM projects WHERE id=?").get(id);}
function mediaRows(projectId){return db.prepare("SELECT id,project_id,media_type,mime_type,original_name,file_path,file_size,is_cover,created_at FROM project_media WHERE project_id=? ORDER BY is_cover DESC,id ASC").all(projectId);}
function safeMediaPath(filePath){if(!filePath||!filePath.startsWith("/uploads/projects/"))return null;const relative=filePath.replace(/^\/+/,"").replace(/^uploads[\\/]projects[\\/]?/,"");const full=path.resolve(PROJECT_UPLOAD_DIR,relative);return full.startsWith(PROJECT_UPLOAD_DIR+path.sep)?full:null;}
function deleteMediaFile(filePath){const full=safeMediaPath(filePath);if(full)try{fs.unlinkSync(full)}catch(_e){}}

app.disable("x-powered-by");
app.use(helmet({contentSecurityPolicy:false}));
app.use(cors({origin:FRONTEND_URL==="*" ? true : FRONTEND_URL.split(",").map(x=>x.trim()),credentials:true}));
app.use(express.json({limit:"1mb"}));
app.use(express.urlencoded({extended:false}));
app.use(cookieParser());
app.use((req,res,next)=>{
  if(req.path.startsWith("/api/") || req.path==="/admin.html" || req.path==="/dashboard.html" || req.path==="/project-category.html") {
    res.set("Cache-Control","no-store, no-cache, must-revalidate, proxy-revalidate");
    res.set("Pragma","no-cache");
    res.set("Expires","0");
  }
  next();
});

function clean(v,max=5000){return String(v??"").trim().slice(0,max)}
function validEmail(v){return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)}
function validPhone(v){return /^[0-9+()\-\s]{7,20}$/.test(v)}
function passwordOk(v){return typeof v==="string" && v.length>=8 && v.length<=128}
function publicUser(u){return {id:u.id,name:u.name,email:u.email||"",phone:u.phone||"",role:u.role,status:u.status,created_at:u.created_at}}

// Lightweight in-process rate limiting for a single-site deployment. It protects the
// highest-risk public endpoints without adding a dependency or touching the persistent DB.
const rateBuckets=new Map();
function rateLimit(max,windowMs){
  return (req,res,next)=>{
    const key=(req.ip||req.socket.remoteAddress||"unknown")+"|"+req.path;
    const now=Date.now(); let b=rateBuckets.get(key);
    if(!b||now-b.start>=windowMs)b={start:now,count:0};
    b.count++; rateBuckets.set(key,b);
    if(rateBuckets.size>5000 && Math.random()<0.05){for(const [k,v] of rateBuckets)if(now-v.start>windowMs)rateBuckets.delete(k)}
    if(b.count>max)return res.status(429).json({success:false,error:"Too many requests. Please try again shortly."});
    next();
  };
}
function audit(req,action,type,id,details=""){
  try{db.prepare("INSERT INTO audit_logs(user_id,action,entity_type,entity_id,details,ip_address) VALUES(?,?,?,?,?,?)").run(req.user?.id||null,action,type,id,clean(details,2000),clean(req.ip||"",100));}catch(_e){}
}
function signIn(res,user){
 const token=jwt.sign({id:user.id,role:user.role,sv:Number(user.session_version||0)},JWT_SECRET,{expiresIn:"7d"});
 res.cookie("lg_session",token,{httpOnly:true,secure:process.env.NODE_ENV==="production",sameSite:"lax",maxAge:7*24*60*60*1000,path:"/"});
}
function auth(req,res,next){
 const bearer=(req.headers.authorization||"").startsWith("Bearer ") ? req.headers.authorization.slice(7) : null;
 const token=req.cookies.lg_session || bearer;
 if(!token)return res.status(401).json({success:false,error:"Please log in"});
 try{
  req.user=jwt.verify(token,JWT_SECRET);
  const sessionUser=db.prepare("SELECT status,session_version FROM users WHERE id=?").get(req.user.id);
  if(!sessionUser || sessionUser.status!=="active") return res.status(401).json({success:false,error:"Please log in"});
  if(Number(req.user.sv||0)!==Number(sessionUser.session_version||0)) return res.status(401).json({success:false,error:"Session ended. Please log in again"});
  next();
 }
 catch(e){return res.status(401).json({success:false,error:"Session expired. Please log in again"})}
}
function admin(req,res,next){auth(req,res,()=>{
 const u=db.prepare("SELECT status,role FROM users WHERE id=?").get(req.user.id);
 if(!u || u.status!=="active")return res.status(403).json({success:false,error:"Account is not active"});
 if(u.role!=="admin")return res.status(403).json({success:false,error:"Admin access required"});
 next();
})}
function currentUser(id){return db.prepare("SELECT id,name,email,phone,role,status,created_at FROM users WHERE id=?").get(id)}
function rndRef(){return Math.floor(100+Math.random()*900)}

function seed(){
 const projects=[
  ["Signature Homes","RESIDENTIAL","Thoughtfully planned homes for contemporary families.","assets/signature-homes.jpg"],
  ["Signature Villas","RESIDENTIAL","Premium villas designed around privacy, comfort and modern family living.","assets/signature-villas.jpg"],
  ["Signature Residency","RESIDENTIAL","Contemporary residences with practical layouts, amenities and refined finishes.","assets/signature-residency.jpg"],
  ["Signature Townhomes","RESIDENTIAL","Elegant townhomes combining community living with generous private spaces.","assets/signature-townhomes.jpg"],
  ["Prime Spaces","COMMERCIAL","Strategic commercial spaces built for opportunity.","assets/commercial-properties.jpg"],
  ["Prime Business Hub","COMMERCIAL","Modern offices planned for growing teams, visibility and everyday convenience.","assets/commercial-properties.jpg"],
  ["Prime Corporate Plaza","COMMERCIAL","Premium commercial addresses designed for established businesses and professional services.","assets/commercial-properties.jpg"],
  ["Prime Retail Avenue","COMMERCIAL","High-visibility retail spaces planned for customer access and business growth.","assets/commercial-properties.jpg"],
  ["Future Landmarks","DEVELOPMENT","Planned developments with a long-term perspective.","assets/residential-properties.jpg"],
  ["Future Landmark City","DEVELOPMENT","A thoughtfully planned mixed-use destination designed for long-term value.","assets/residential-properties.jpg"],
  ["Horizon Heights","DEVELOPMENT","A modern community concept balancing architecture, open space and connectivity.","assets/residential-properties.jpg"],
  ["Greenfield Enclave","DEVELOPMENT","A future-ready development vision focused on quality infrastructure and liveability.","assets/residential-properties.jpg"],
  ["Industrial Properties","INDUSTRIAL","Purpose-built industrial spaces for manufacturing, logistics and business expansion.","assets/industrial-properties.jpg"],
  ["Laxminarayan Industrial Park","INDUSTRIAL","Flexible industrial units with practical access, loading and operational planning.","assets/industrial-properties.jpg"],
  ["Logistics & Warehouse Hub","INDUSTRIAL","Efficient warehouse and logistics facilities designed for modern supply chains.","assets/industrial-properties.jpg"],
  ["Manufacturing Estate","INDUSTRIAL","Strategic industrial plots and facilities planned for scalable manufacturing operations.","assets/industrial-properties.jpg"]
 ];
 const ins=db.prepare("INSERT INTO projects(name,category,description,image) VALUES(?,?,?,?)");
 const addMany=db.transaction(items=>{for(const x of items){if(!db.prepare("SELECT id FROM projects WHERE name=?").get(x[0])) ins.run(...x)}});
 addMany(projects);
 if(db.prepare("SELECT COUNT(*) c FROM leaders").get().c===0){
  const ins=db.prepare("INSERT INTO leaders(name,designation,initials,image) VALUES(?,?,?,?)");
  [["Roshan Sabhaya","FOUNDER & DIRECTOR","RS",""],["Mehul Mistry","FOUNDER & DIRECTOR","MM",""],["Swaraj Jikadara","FOUNDER & DIRECTOR","SJ",""]].forEach(x=>ins.run(...x));
 }
 const email=clean(process.env.ADMIN_EMAIL,160).toLowerCase(), password=process.env.ADMIN_PASSWORD;
 if(email && password && passwordOk(password) && !db.prepare("SELECT id FROM users WHERE email=?").get(email)){
  const hash=bcrypt.hashSync(password,12);
  db.prepare("INSERT INTO users(name,email,phone,password_hash,role,status) VALUES(?,?,?,?,?,?)").run("Laxminarayan Admin",email,"",hash,"admin","active");
 }
}
seed();

// Safety backup: keep rolling SQLite backups outside the project folder. This protects
// users/projects/enquiries even if a future code update is damaged.
async function createRollingBackup(){
  try{
    const backupDir=path.join(APP_DATA_ROOT,"backups");
    fs.mkdirSync(backupDir,{recursive:true});
    const stamp=new Date().toISOString().replace(/[:.]/g,"-");
    const destination=path.join(backupDir,`laxminarayan-${stamp}.db`);
    if(typeof db.backup==="function") await db.backup(destination);
    else fs.copyFileSync(DB_FILE,destination);
    const files=fs.readdirSync(backupDir).filter(f=>f.endsWith(".db")).sort().reverse();
    for(const old of files.slice(14)) try{fs.unlinkSync(path.join(backupDir,old));}catch(_e){}
    console.log(`Database backup: ${destination}`);
  }catch(err){ console.error("Database backup warning:",err.message); }
}
createRollingBackup();


app.get("/api/projects/:id",auth,(req,res)=>{
  const id=Number(req.params.id); if(!Number.isInteger(id)||id<1)return res.status(400).json({success:false,error:"Invalid project id"});
  const p=db.prepare("SELECT id,name,category,description,image,location,price,amenities,status,created_at,updated_at FROM projects WHERE id=? AND status='active'").get(id);
  if(!p)return res.status(404).json({success:false,error:"Project not found"});
  res.json({success:true,data:p,media:mediaRows(id)});
});

app.get("/api/my/site-visits",auth,(req,res)=>{
  const rows=db.prepare("SELECT v.*,p.name AS project_name FROM site_visits v LEFT JOIN projects p ON p.id=v.project_id WHERE v.user_id=? ORDER BY v.id DESC").all(req.user.id);
  res.json({success:true,data:rows});
});
app.post("/api/site-visits",auth,rateLimit(8,10*60*1000),(req,res)=>{
  const projectId=Number(req.body.project_id); const preferred=clean(req.body.preferred_at,40); const notes=clean(req.body.notes,2000);
  if(!Number.isInteger(projectId)||projectId<1)return res.status(400).json({success:false,error:"Select a project"});
  if(!preferred)return res.status(400).json({success:false,error:"Choose a preferred date and time"});
  const project=db.prepare("SELECT id,name FROM projects WHERE id=? AND status='active'").get(projectId); if(!project)return res.status(404).json({success:false,error:"Project not found"});
  const u=currentUser(req.user.id); if(!u)return res.status(401).json({success:false,error:"Please log in"});
  const dt=new Date(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(preferred)?preferred+":00+05:30":preferred); if(Number.isNaN(dt.getTime()))return res.status(400).json({success:false,error:"Invalid date and time"});
  if(dt.getTime()<Date.now()+30*60*1000)return res.status(400).json({success:false,error:"Choose a future time at least 30 minutes from now"});
  const enquiry=db.prepare("SELECT id FROM enquiries WHERE user_id=? AND project_id=? ORDER BY id DESC LIMIT 1").get(req.user.id,projectId);
  const r=db.prepare("INSERT INTO site_visits(user_id,project_id,enquiry_id,name,phone,email,preferred_at,status,notes) VALUES(?,?,?,?,?,?,?,?,?)").run(req.user.id,projectId,enquiry?.id||null,u.name,u.phone||"",u.email||"",dt.toISOString(),"requested",notes);
  audit(req,"create","site_visit",r.lastInsertRowid,project.name);
  res.status(201).json({success:true,data:db.prepare("SELECT v.*,p.name AS project_name FROM site_visits v LEFT JOIN projects p ON p.id=v.project_id WHERE v.id=?").get(r.lastInsertRowid)});
});

// ---------------- Production CRM administration ----------------
app.post("/api/admin/leads",admin,(req,res)=>{
  const name=clean(req.body.name,120),phone=clean(req.body.phone,30),email=clean(req.body.email,160).toLowerCase();
  const source=clean(req.body.source,80)||"admin",status=clean(req.body.status,30)||"new",notes=clean(req.body.notes,4000);
  const projectId=req.body.project_id?Number(req.body.project_id):null;
  const userId=req.body.user_id?Number(req.body.user_id):null;
  const employeeId=req.body.assigned_employee_id?Number(req.body.assigned_employee_id):null;
  const follow=clean(req.body.follow_up_at,50)||null;
  const allowed=["new","contacted","qualified","site_visit","negotiation","won","lost"];
  if(name.length<2)return res.status(400).json({success:false,error:"Enter the lead name"});
  if(phone && !validPhone(phone))return res.status(400).json({success:false,error:"Enter a valid phone number"});
  if(email && !validEmail(email))return res.status(400).json({success:false,error:"Enter a valid email"});
  if(!allowed.includes(status))return res.status(400).json({success:false,error:"Invalid lead status"});
  if(projectId!==null && (!Number.isInteger(projectId)||!db.prepare("SELECT id FROM projects WHERE id=?").get(projectId)))return res.status(400).json({success:false,error:"Invalid project"});
  if(userId!==null && (!Number.isInteger(userId)||!db.prepare("SELECT id FROM users WHERE id=? AND role='customer'").get(userId)))return res.status(400).json({success:false,error:"Invalid customer"});
  if(employeeId!==null && (!Number.isInteger(employeeId)||!db.prepare("SELECT id FROM employees WHERE id=? AND status='active'").get(employeeId)))return res.status(400).json({success:false,error:"Invalid team member"});
  const budget=clean(req.body.budget,80);
  const sentiment=clean(req.body.sentiment,20)||"warm";
  const unitId=req.body.unit_id?Number(req.body.unit_id):null;
  const r=db.prepare(`INSERT INTO leads(user_id,name,phone,email,source,status,notes,project_id,assigned_employee_id,follow_up_at,budget,sentiment,unit_id) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(userId,name,phone,email,source,status,notes,projectId,employeeId,follow,budget,sentiment,unitId);
  audit(req,"create","lead",r.lastInsertRowid,`${name} · ${source}`);
  res.status(201).json({success:true,data:db.prepare("SELECT * FROM leads WHERE id=?").get(r.lastInsertRowid)});
});
app.delete("/api/admin/leads/:id",admin,(req,res)=>{
  const id=Number(req.params.id), existing=db.prepare("SELECT * FROM leads WHERE id=?").get(id);
  if(!existing)return res.status(404).json({success:false,error:"Lead not found"});
  db.prepare("DELETE FROM leads WHERE id=?").run(id);
  audit(req,"delete","lead",id,`Lead archived/deleted: ${existing.name}`);
  res.json({success:true});
});
app.get("/api/admin/site-visits",admin,(req,res)=>{
  const status=clean(req.query.status,30);
  const sql=`SELECT v.*,p.name AS project_name FROM site_visits v LEFT JOIN projects p ON p.id=v.project_id ${status?"WHERE v.status=?":""} ORDER BY datetime(v.preferred_at) ASC`;
  res.json({success:true,data:(status?db.prepare(sql).all(status):db.prepare(sql).all())});
});
app.post("/api/admin/site-visits",admin,(req,res)=>{
  const name=clean(req.body.name,120),phone=clean(req.body.phone,30),email=clean(req.body.email,160).toLowerCase();
  const preferred=clean(req.body.preferred_at,50),status=clean(req.body.status,30)||"requested",notes=clean(req.body.notes,2000),adminNotes=clean(req.body.admin_notes,3000);
  const projectId=req.body.project_id?Number(req.body.project_id):null,userId=req.body.user_id?Number(req.body.user_id):null,enquiryId=req.body.enquiry_id?Number(req.body.enquiry_id):null;
  if(name.length<2)return res.status(400).json({success:false,error:"Enter the customer name"});
  if(phone && !validPhone(phone))return res.status(400).json({success:false,error:"Enter a valid phone number"});
  if(email && !validEmail(email))return res.status(400).json({success:false,error:"Enter a valid email"});
  if(!preferred)return res.status(400).json({success:false,error:"Choose a date and time"});
  if(!["requested","confirmed","completed","cancelled"].includes(status))return res.status(400).json({success:false,error:"Invalid site visit status"});
  const dt=new Date(/^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}$/.test(preferred)?preferred+":00+05:30":preferred);
  if(Number.isNaN(dt.getTime()))return res.status(400).json({success:false,error:"Invalid date and time"});
  if(projectId!==null && (!Number.isInteger(projectId)||!db.prepare("SELECT id FROM projects WHERE id=?").get(projectId)))return res.status(400).json({success:false,error:"Invalid project"});
  if(userId!==null && (!Number.isInteger(userId)||!db.prepare("SELECT id FROM users WHERE id=?").get(userId)))return res.status(400).json({success:false,error:"Invalid customer"});
  if(enquiryId!==null && (!Number.isInteger(enquiryId)||!db.prepare("SELECT id FROM enquiries WHERE id=?").get(enquiryId)))return res.status(400).json({success:false,error:"Invalid enquiry"});
  const r=db.prepare(`INSERT INTO site_visits(user_id,project_id,enquiry_id,name,phone,email,preferred_at,status,notes,admin_notes) VALUES(?,?,?,?,?,?,?,?,?,?)`).run(userId,projectId,enquiryId,name,phone,email,dt.toISOString(),status,notes,adminNotes);
  audit(req,"create","site_visit",r.lastInsertRowid,`${name} · ${preferred}`);
  res.status(201).json({success:true,data:db.prepare("SELECT * FROM site_visits WHERE id=?").get(r.lastInsertRowid)});
});
app.put("/api/admin/site-visits/:id",admin,(req,res)=>{
  const id=Number(req.params.id), existing=db.prepare("SELECT * FROM site_visits WHERE id=?").get(id);
  if(!existing)return res.status(404).json({success:false,error:"Site visit not found"});
  const name=clean(req.body.name,120),phone=clean(req.body.phone,30),email=clean(req.body.email,160).toLowerCase(),preferred=clean(req.body.preferred_at,50);
  const status=clean(req.body.status,30)||existing.status,notes=clean(req.body.notes,2000),adminNotes=clean(req.body.admin_notes,3000);
  const projectId=req.body.project_id?Number(req.body.project_id):null,userId=req.body.user_id?Number(req.body.user_id):null;
  if(name.length<2)return res.status(400).json({success:false,error:"Enter the customer name"});
  if(phone && !validPhone(phone))return res.status(400).json({success:false,error:"Enter a valid phone number"});
  if(email && !validEmail(email))return res.status(400).json({success:false,error:"Enter a valid email"});
  if(!preferred)return res.status(400).json({success:false,error:"Choose a date and time"});
  if(!["requested","confirmed","completed","cancelled"].includes(status))return res.status(400).json({success:false,error:"Invalid site visit status"});
  const dt=new Date(/^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}$/.test(preferred)?preferred+":00+05:30":preferred);
  if(Number.isNaN(dt.getTime()))return res.status(400).json({success:false,error:"Invalid date and time"});
  if(projectId!==null && (!Number.isInteger(projectId)||!db.prepare("SELECT id FROM projects WHERE id=?").get(projectId)))return res.status(400).json({success:false,error:"Invalid project"});
  if(userId!==null && (!Number.isInteger(userId)||!db.prepare("SELECT id FROM users WHERE id=?").get(userId)))return res.status(400).json({success:false,error:"Invalid customer"});
  db.prepare("UPDATE site_visits SET user_id=?,project_id=?,name=?,phone=?,email=?,preferred_at=?,status=?,notes=?,admin_notes=?,updated_at=CURRENT_TIMESTAMP WHERE id=?").run(userId,projectId,name,phone,email,dt.toISOString(),status,notes,adminNotes,id);
  audit(req,"update","site_visit",id,`${name} · Status ${status}`); res.json({success:true});
});
app.delete("/api/admin/site-visits/:id",admin,(req,res)=>{
  const id=Number(req.params.id), existing=db.prepare("SELECT * FROM site_visits WHERE id=?").get(id);
  if(!existing)return res.status(404).json({success:false,error:"Site visit not found"});
  db.prepare("DELETE FROM site_visits WHERE id=?").run(id); audit(req,"delete","site_visit",id,"Site visit deleted"); res.json({success:true});
});

app.get("/api/admin/leads",admin,(req,res)=>{
  const rows=db.prepare(`SELECT l.*,p.name AS project_name,pu.unit_number,e.employee_code,eu.name AS employee_name
    FROM leads l
    LEFT JOIN projects p ON p.id=l.project_id
    LEFT JOIN project_units pu ON pu.id=l.unit_id
    LEFT JOIN employees e ON e.id=l.assigned_employee_id
    LEFT JOIN users eu ON eu.id=e.user_id ORDER BY l.id DESC`).all();
  res.json({success:true,data:rows});
});
app.patch("/api/admin/leads/:id",admin,(req,res)=>{
  const id=Number(req.params.id), existing=db.prepare("SELECT * FROM leads WHERE id=?").get(id); if(!existing)return res.status(404).json({success:false,error:"Lead not found"});
  const allowed=["new","contacted","qualified","site_visit","negotiation","won","lost"];
  const status=clean(req.body.status,30)||existing.status; if(!allowed.includes(status))return res.status(400).json({success:false,error:"Invalid lead status"});
  const employeeId=Object.prototype.hasOwnProperty.call(req.body,"assigned_employee_id")?(req.body.assigned_employee_id===null||req.body.assigned_employee_id===""?null:Number(req.body.assigned_employee_id)):existing.assigned_employee_id;
  if(employeeId!==null && (!Number.isInteger(employeeId)||!db.prepare("SELECT id FROM employees WHERE id=? AND status='active'").get(employeeId)))return res.status(400).json({success:false,error:"Invalid team member"});
  const follow=Object.prototype.hasOwnProperty.call(req.body,"follow_up_at")?(clean(req.body.follow_up_at,50)||null):existing.follow_up_at;
  const notes=Object.prototype.hasOwnProperty.call(req.body,"notes")?clean(req.body.notes,4000):(existing.notes||"");
  const lost=Object.prototype.hasOwnProperty.call(req.body,"lost_reason")?clean(req.body.lost_reason,1000):(existing.lost_reason||"");
  const budget=Object.prototype.hasOwnProperty.call(req.body,"budget")?clean(req.body.budget,80):(existing.budget||"");
  const sentiment=Object.prototype.hasOwnProperty.call(req.body,"sentiment")?clean(req.body.sentiment,20):(existing.sentiment||"warm");
  const unitId=Object.prototype.hasOwnProperty.call(req.body,"unit_id")?(req.body.unit_id===null||req.body.unit_id===""?null:Number(req.body.unit_id)):existing.unit_id;
  const name=clean(req.body.name,120)||existing.name;
  const phone=clean(req.body.phone,30)||existing.phone;
  const email=clean(req.body.email,160)||existing.email;
  const projectId=Object.prototype.hasOwnProperty.call(req.body,"project_id")?(req.body.project_id===null||req.body.project_id===""?null:Number(req.body.project_id)):existing.project_id;
  db.prepare("UPDATE leads SET status=?,assigned_employee_id=?,follow_up_at=?,notes=?,lost_reason=?,budget=?,sentiment=?,unit_id=?,name=?,phone=?,email=?,project_id=?,updated_at=CURRENT_TIMESTAMP WHERE id=?")
    .run(status,employeeId,follow||null,notes,lost,budget,sentiment,unitId,name,phone,email,projectId,id);
  audit(req,"update","lead",id,`Status ${status} · Sentiment: ${sentiment}`);
  res.json({success:true,data:db.prepare("SELECT * FROM leads WHERE id=?").get(id)});
});

// Convert an enquiry directly to a qualified lead
app.post("/api/admin/enquiries/:id/convert",admin,(req,res)=>{
  const id=Number(req.params.id);
  const enq=db.prepare("SELECT * FROM enquiries WHERE id=?").get(id);
  if(!enq) return res.status(404).json({success:false,error:"Enquiry not found"});
  let lead=db.prepare("SELECT * FROM leads WHERE enquiry_id=?").get(id);
  if(!lead){
    const r=db.prepare(`INSERT INTO leads(user_id,name,phone,email,source,status,notes,project_id,enquiry_id,created_at,updated_at)
      VALUES(?,?,?,?,?,?,?,?,?,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)`).run(enq.user_id,enq.name,enq.phone||'',enq.email||'','website enquiry','qualified',enq.message||'',enq.project_id||null,id);
    lead=db.prepare("SELECT * FROM leads WHERE id=?").get(r.lastInsertRowid);
  }else{
    db.prepare("UPDATE leads SET status='qualified',updated_at=CURRENT_TIMESTAMP WHERE id=?").run(lead.id);
    lead.status='qualified';
  }
  db.prepare("UPDATE enquiries SET status='contacted' WHERE id=?").run(id);
  audit(req,"convert","enquiry",id,`Converted to qualified lead #${lead.id}`);
  res.json({success:true,data:lead});
});

// ---------------- Enterprise PropTech: Project Unit Inventory ----------------
app.get("/api/admin/units",admin,(req,res)=>{
  const projectId=req.query.project_id?Number(req.query.project_id):null;
  const status=clean(req.query.status,20);
  const search=clean(req.query.search,100).toLowerCase();
  let sql=`SELECT u.*,p.name AS project_name,p.category AS project_category FROM project_units u LEFT JOIN projects p ON p.id=u.project_id WHERE 1=1`;
  const params=[];
  if(projectId){ sql+=` AND u.project_id=?`; params.push(projectId); }
  if(status){ sql+=` AND u.status=?`; params.push(status); }
  if(search){ sql+=` AND (LOWER(u.unit_number) LIKE ? OR LOWER(u.buyer_name) LIKE ? OR LOWER(p.name) LIKE ?)`; params.push(`%${search}%`,`%${search}%`,`%${search}%`); }
  sql+=` ORDER BY u.project_id ASC, u.floor_number ASC, u.unit_number ASC`;
  const units=db.prepare(sql).all(...params);
  res.json({success:true,data:units});
});

app.post("/api/admin/units",admin,(req,res)=>{
  const projectId=Number(req.body.project_id);
  const unitNumber=clean(req.body.unit_number,50);
  const unitType=clean(req.body.unit_type,50)||"3 BHK";
  const floorNumber=Number(req.body.floor_number)||1;
  const areaSqft=Number(req.body.area_sqft)||1200;
  const price=clean(req.body.price,100);
  const status=clean(req.body.status,20)||"available";
  const buyerName=clean(req.body.buyer_name,120);
  const buyerPhone=clean(req.body.buyer_phone,30);
  const notes=clean(req.body.notes,1000);
  if(!unitNumber) return res.status(400).json({success:false,error:"Unit number is required"});
  if(!projectId||!db.prepare("SELECT id FROM projects WHERE id=?").get(projectId)) return res.status(400).json({success:false,error:"Invalid project"});
  if(!["available","blocked","sold"].includes(status)) return res.status(400).json({success:false,error:"Invalid status"});
  const r=db.prepare(`INSERT INTO project_units(project_id,unit_number,unit_type,floor_number,area_sqft,price,status,buyer_name,buyer_phone,notes)
    VALUES(?,?,?,?,?,?,?,?,?,?)`).run(projectId,unitNumber,unitType,floorNumber,areaSqft,price,status,buyerName,buyerPhone,notes);
  audit(req,"create","unit",r.lastInsertRowid,`${unitNumber} · Status: ${status}`);
  res.status(201).json({success:true,data:db.prepare("SELECT u.*,p.name AS project_name FROM project_units u LEFT JOIN projects p ON p.id=u.project_id WHERE u.id=?").get(r.lastInsertRowid)});
});

app.put("/api/admin/units/:id",admin,(req,res)=>{
  const id=Number(req.params.id);
  const existing=db.prepare("SELECT * FROM project_units WHERE id=?").get(id);
  if(!existing) return res.status(404).json({success:false,error:"Unit not found"});
  const unitNumber=clean(req.body.unit_number,50)||existing.unit_number;
  const unitType=clean(req.body.unit_type,50)||existing.unit_type;
  const floorNumber=Number(req.body.floor_number)||existing.floor_number;
  const areaSqft=Number(req.body.area_sqft)||existing.area_sqft;
  const price=clean(req.body.price,100)||existing.price;
  const status=clean(req.body.status,20)||existing.status;
  const buyerName=clean(req.body.buyer_name,120);
  const buyerPhone=clean(req.body.buyer_phone,30);
  const notes=clean(req.body.notes,1000);
  if(!["available","blocked","sold"].includes(status)) return res.status(400).json({success:false,error:"Invalid status"});
  db.prepare(`UPDATE project_units SET unit_number=?,unit_type=?,floor_number=?,area_sqft=?,price=?,status=?,buyer_name=?,buyer_phone=?,notes=?,updated_at=CURRENT_TIMESTAMP WHERE id=?`)
    .run(unitNumber,unitType,floorNumber,areaSqft,price,status,buyerName,buyerPhone,notes,id);
  audit(req,"update","unit",id,`${unitNumber} · Status ${status}`);
  res.json({success:true,data:db.prepare("SELECT u.*,p.name AS project_name FROM project_units u LEFT JOIN projects p ON p.id=u.project_id WHERE u.id=?").get(id)});
});

app.patch("/api/admin/units/:id/status",admin,(req,res)=>{
  const id=Number(req.params.id);
  const existing=db.prepare("SELECT * FROM project_units WHERE id=?").get(id);
  if(!existing) return res.status(404).json({success:false,error:"Unit not found"});
  const status=clean(req.body.status,20);
  if(!["available","blocked","sold"].includes(status)) return res.status(400).json({success:false,error:"Invalid status"});
  const buyerName=clean(req.body.buyer_name,120)||(status==='available'?'':existing.buyer_name);
  const buyerPhone=clean(req.body.buyer_phone,30)||(status==='available'?'':existing.buyer_phone);
  db.prepare(`UPDATE project_units SET status=?,buyer_name=?,buyer_phone=?,updated_at=CURRENT_TIMESTAMP WHERE id=?`).run(status,buyerName,buyerPhone,id);
  audit(req,"update","unit",id,`Status changed to ${status}`);
  res.json({success:true,data:db.prepare("SELECT u.*,p.name AS project_name FROM project_units u LEFT JOIN projects p ON p.id=u.project_id WHERE u.id=?").get(id)});
});

app.delete("/api/admin/units/:id",admin,(req,res)=>{
  const id=Number(req.params.id);
  const existing=db.prepare("SELECT * FROM project_units WHERE id=?").get(id);
  if(!existing) return res.status(404).json({success:false,error:"Unit not found"});
  db.prepare("DELETE FROM project_units WHERE id=?").run(id);
  audit(req,"delete","unit",id,`Deleted unit ${existing.unit_number}`);
  res.json({success:true});
});

// ---------------- Enterprise PropTech: Bookings & Deal Closures ----------------
app.get("/api/admin/bookings",admin,(req,res)=>{
  const rows=db.prepare(`SELECT b.*,p.name AS project_name,pu.unit_number,pu.unit_type,u.name AS user_name,u.email AS user_email
    FROM bookings b
    LEFT JOIN projects p ON p.id=b.project_id
    LEFT JOIN project_units pu ON pu.id=b.unit_id
    LEFT JOIN users u ON u.id=b.user_id
    ORDER BY b.id DESC`).all();
  res.json({success:true,data:rows});
});

app.post("/api/admin/bookings",admin,(req,res)=>{
  const projectId=Number(req.body.project_id);
  const unitId=req.body.unit_id?Number(req.body.unit_id):null;
  const leadId=req.body.lead_id?Number(req.body.lead_id):null;
  const userId=req.body.user_id?Number(req.body.user_id):null;
  const customerName=clean(req.body.customer_name,120);
  const customerPhone=clean(req.body.customer_phone,30);
  const customerEmail=clean(req.body.customer_email,160).toLowerCase();
  const allottedUnit=clean(req.body.allotted_unit,100);
  const agreementValue=clean(req.body.agreement_value,100);
  const tokenAmount=clean(req.body.token_amount,100);
  const paymentStatus=clean(req.body.payment_status,50)||"token_received";
  const status=clean(req.body.status,30)||"confirmed";
  const notes=clean(req.body.notes,2000);
  if(!customerName) return res.status(400).json({success:false,error:"Customer name is required"});
  if(!projectId||!db.prepare("SELECT id FROM projects WHERE id=?").get(projectId)) return res.status(400).json({success:false,error:"Select a valid project"});
  const bookingRef='BKG-'+Date.now().toString().slice(-6)+'-'+Math.floor(100+Math.random()*900);
  const tx=db.transaction(()=>{
    const r=db.prepare(`INSERT INTO bookings(user_id,project_id,unit_id,lead_id,booking_reference,customer_name,customer_phone,customer_email,allotted_unit,agreement_value,token_amount,payment_status,status,notes)
      VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(userId,projectId,unitId,leadId,bookingRef,customerName,customerPhone,customerEmail,allottedUnit,agreementValue,tokenAmount,paymentStatus,status,notes);
    if(unitId){
      db.prepare("UPDATE project_units SET status='sold',buyer_name=?,buyer_phone=?,updated_at=CURRENT_TIMESTAMP WHERE id=?").run(customerName,customerPhone,unitId);
    }
    if(leadId){
      db.prepare("UPDATE leads SET status='won',updated_at=CURRENT_TIMESTAMP WHERE id=?").run(leadId);
    }
    return r.lastInsertRowid;
  });
  const bookingId=tx();
  audit(req,"create","booking",bookingId,`${bookingRef} · ${customerName} · ${allottedUnit}`);
  res.status(201).json({success:true,data:db.prepare("SELECT b.*,p.name AS project_name FROM bookings b LEFT JOIN projects p ON p.id=b.project_id WHERE b.id=?").get(bookingId)});
});

app.put("/api/admin/bookings/:id",admin,(req,res)=>{
  const id=Number(req.params.id);
  const existing=db.prepare("SELECT * FROM bookings WHERE id=?").get(id);
  if(!existing) return res.status(404).json({success:false,error:"Booking not found"});
  const customerName=clean(req.body.customer_name,120)||existing.customer_name;
  const customerPhone=clean(req.body.customer_phone,30)||existing.customer_phone;
  const customerEmail=clean(req.body.customer_email,160)||existing.customer_email;
  const allottedUnit=clean(req.body.allotted_unit,100)||existing.allotted_unit;
  const agreementValue=clean(req.body.agreement_value,100)||existing.agreement_value;
  const tokenAmount=clean(req.body.token_amount,100)||existing.token_amount;
  const paymentStatus=clean(req.body.payment_status,50)||existing.payment_status;
  const status=clean(req.body.status,30)||existing.status;
  const notes=clean(req.body.notes,2000);
  db.prepare(`UPDATE bookings SET customer_name=?,customer_phone=?,customer_email=?,allotted_unit=?,agreement_value=?,token_amount=?,payment_status=?,status=?,notes=?,updated_at=CURRENT_TIMESTAMP WHERE id=?`)
    .run(customerName,customerPhone,customerEmail,allottedUnit,agreementValue,tokenAmount,paymentStatus,status,notes,id);
  audit(req,"update","booking",id,`${existing.booking_reference} updated`);
  res.json({success:true,data:db.prepare("SELECT * FROM bookings WHERE id=?").get(id)});
});

app.delete("/api/admin/bookings/:id",admin,(req,res)=>{
  const id=Number(req.params.id);
  const existing=db.prepare("SELECT * FROM bookings WHERE id=?").get(id);
  if(!existing) return res.status(404).json({success:false,error:"Booking not found"});
  db.prepare("DELETE FROM bookings WHERE id=?").run(id);
  if(existing.unit_id){
    db.prepare("UPDATE project_units SET status='available',buyer_name='',buyer_phone='',updated_at=CURRENT_TIMESTAMP WHERE id=?").run(existing.unit_id);
  }
  audit(req,"delete","booking",id,`Cancelled booking ${existing.booking_reference}`);
  res.json({success:true});
});


app.patch("/api/admin/site-visits/:id",admin,(req,res)=>{
  const id=Number(req.params.id);
  const existing=db.prepare("SELECT * FROM site_visits WHERE id=?").get(id);
  if(!existing)return res.status(404).json({success:false,error:"Site visit not found"});
  const allowed=["requested","confirmed","completed","cancelled"];
  const status=Object.prototype.hasOwnProperty.call(req.body,"status") ? clean(req.body.status,30) : existing.status;
  if(!allowed.includes(status))return res.status(400).json({success:false,error:"Invalid site visit status"});
  const notes=Object.prototype.hasOwnProperty.call(req.body,"admin_notes") ? clean(req.body.admin_notes,3000) : existing.admin_notes||"";
  db.prepare("UPDATE site_visits SET status=?,admin_notes=?,updated_at=CURRENT_TIMESTAMP WHERE id=?").run(status,notes,id);
  const saved=db.prepare("SELECT v.*,p.name AS project_name FROM site_visits v LEFT JOIN projects p ON p.id=v.project_id WHERE v.id=?").get(id);
  audit(req,"update","site_visit",id,`Status ${status}`);
  res.json({success:true,data:saved});
});

app.get("/api/admin/employees",admin,(req,res)=>res.json({success:true,data:db.prepare(`SELECT e.*,u.name,u.email,u.phone,u.status AS user_status FROM employees e LEFT JOIN users u ON u.id=e.user_id ORDER BY e.id DESC`).all()}));
app.post("/api/admin/employees",admin,(req,res)=>{
  const name=clean(req.body.name,120),email=clean(req.body.email,160).toLowerCase(),phone=clean(req.body.phone,30),department=clean(req.body.department,100),designation=clean(req.body.designation,120),password=String(req.body.password||"");
  if(name.length<2||!validEmail(email)||!passwordOk(password))return res.status(400).json({success:false,error:"Enter name, valid email and a password of 8–128 characters"});
  if(db.prepare("SELECT id FROM users WHERE email=?").get(email))return res.status(409).json({success:false,error:"An account with this email already exists"});
  const tx=db.transaction(()=>{const u=db.prepare("INSERT INTO users(name,email,phone,password_hash,role,status) VALUES(?,?,?,?,?,?)").run(name,email,phone,bcrypt.hashSync(password,12),"employee","active"); const code=`EMP-${String(u.lastInsertRowid).padStart(4,"0")}`; const e=db.prepare("INSERT INTO employees(user_id,employee_code,department,designation,joined_at) VALUES(?,?,?,?,CURRENT_TIMESTAMP)").run(u.lastInsertRowid,code,department,designation); return e.lastInsertRowid;});
  const id=tx(); audit(req,"create","employee",id,name); res.status(201).json({success:true,data:db.prepare(`SELECT e.*,u.name,u.email,u.phone,u.status AS user_status FROM employees e LEFT JOIN users u ON u.id=e.user_id WHERE e.id=?`).get(id)});
});
app.put("/api/admin/employees/:id",admin,(req,res)=>{
  const id=Number(req.params.id), row=db.prepare("SELECT e.*,u.id AS user_id FROM employees e JOIN users u ON u.id=e.user_id WHERE e.id=?").get(id);
  if(!row)return res.status(404).json({success:false,error:"Team member not found"});
  const name=clean(req.body.name,120),email=clean(req.body.email,160).toLowerCase(),phone=clean(req.body.phone,30),department=clean(req.body.department,100),designation=clean(req.body.designation,120);
  if(name.length<2||!validEmail(email))return res.status(400).json({success:false,error:"Enter name and a valid email"});
  const dup=db.prepare("SELECT id FROM users WHERE email=? AND id<>?").get(email,row.user_id); if(dup)return res.status(409).json({success:false,error:"Another account already uses this email"});
  db.transaction(()=>{db.prepare("UPDATE users SET name=?,email=?,phone=?,updated_at=CURRENT_TIMESTAMP WHERE id=?").run(name,email,phone,row.user_id);db.prepare("UPDATE employees SET department=?,designation=?,updated_at=CURRENT_TIMESTAMP WHERE id=?").run(department,designation,id)})();
  audit(req,"update","employee",id,name); res.json({success:true});
});
app.post("/api/admin/employees/:id/reset-password",admin,(req,res)=>{
  const id=Number(req.params.id), row=db.prepare("SELECT user_id FROM employees WHERE id=?").get(id), password=String(req.body.password||"");
  if(!row)return res.status(404).json({success:false,error:"Team member not found"});
  if(!passwordOk(password))return res.status(400).json({success:false,error:"Password must be 8–128 characters"});
  db.prepare("UPDATE users SET password_hash=?,session_version=session_version+1,updated_at=CURRENT_TIMESTAMP WHERE id=?").run(bcrypt.hashSync(password,12),row.user_id);
  audit(req,"reset_password","employee",id,"Team member password reset"); res.json({success:true});
});
app.delete("/api/admin/employees/:id",admin,(req,res)=>{
  const id=Number(req.params.id), row=db.prepare("SELECT e.user_id,u.name FROM employees e JOIN users u ON u.id=e.user_id WHERE e.id=?").get(id);
  if(!row)return res.status(404).json({success:false,error:"Team member not found"});
  const assigned=db.prepare("SELECT COUNT(*) c FROM leads WHERE assigned_employee_id=?").get(id).c;
  if(assigned)return res.status(409).json({success:false,error:"This team member has assigned leads. Reassign those leads before deletion, or deactivate the account."});
  db.transaction(()=>{db.prepare("DELETE FROM employees WHERE id=?").run(id);db.prepare("DELETE FROM users WHERE id=? AND role='employee'").run(row.user_id)})();
  audit(req,"delete","employee",id,`Employee deleted: ${row.name}`); res.json({success:true});
});

app.patch("/api/admin/employees/:id/status",admin,(req,res)=>{
  const id=Number(req.params.id), status=clean(req.body.status,20); if(!["active","inactive"].includes(status))return res.status(400).json({success:false,error:"Invalid status"});
  const e=db.prepare("SELECT user_id FROM employees WHERE id=?").get(id); if(!e)return res.status(404).json({success:false,error:"Team member not found"});
  db.transaction(()=>{db.prepare("UPDATE employees SET status=?,updated_at=CURRENT_TIMESTAMP WHERE id=?").run(status,id);db.prepare("UPDATE users SET status=?,session_version=session_version+1,updated_at=CURRENT_TIMESTAMP WHERE id=?").run(status==="active"?"active":"suspended",e.user_id)})(); audit(req,"update","employee",id,`Status ${status}`); res.json({success:true});
});

app.get("/api/admin/attendance",admin,(req,res)=>{
 const date=clean(req.query.date,10)||new Date().toISOString().slice(0,10);
 const rows=db.prepare(`SELECT e.id,e.employee_code,e.department,e.designation,e.status AS employee_status,u.name,u.email,u.phone,
   a.id attendance_id,a.attendance_date,a.status attendance_status,a.check_in,a.check_out,a.notes
   FROM employees e JOIN users u ON u.id=e.user_id LEFT JOIN employee_attendance a ON a.employee_id=e.id AND a.attendance_date=?
   ORDER BY CASE WHEN e.status='active' THEN 0 ELSE 1 END,e.id DESC`).all(date);
 res.json({success:true,data:rows,date});
});
app.post("/api/admin/attendance",admin,(req,res)=>{
 const employeeId=Number(req.body.employee_id),date=clean(req.body.attendance_date,10),status=clean(req.body.status,20),checkIn=clean(req.body.check_in,30)||null,checkOut=clean(req.body.check_out,30)||null,notes=clean(req.body.notes,1000);
 if(!Number.isInteger(employeeId)||!db.prepare("SELECT id FROM employees WHERE id=?").get(employeeId))return res.status(400).json({success:false,error:"Valid employee is required"});
 if(!/^\d{4}-\d{2}-\d{2}$/.test(date))return res.status(400).json({success:false,error:"Valid attendance date is required"});
 if(!["present","absent","leave","half_day"].includes(status))return res.status(400).json({success:false,error:"Invalid attendance status"});
 const existing=db.prepare("SELECT id FROM employee_attendance WHERE employee_id=? AND attendance_date=?").get(employeeId,date);
 if(existing){db.prepare("UPDATE employee_attendance SET status=?,check_in=?,check_out=?,notes=?,updated_at=CURRENT_TIMESTAMP WHERE id=?").run(status,checkIn,checkOut,notes,existing.id);audit(req,"update","attendance",existing.id,`${date} · ${status}`);return res.json({success:true,id:existing.id});}
 const r=db.prepare("INSERT INTO employee_attendance(employee_id,attendance_date,status,check_in,check_out,notes) VALUES(?,?,?,?,?,?)").run(employeeId,date,status,checkIn,checkOut,notes);
 audit(req,"create","attendance",r.lastInsertRowid,`${date} · ${status}`);res.status(201).json({success:true,id:Number(r.lastInsertRowid)});
});
app.delete("/api/admin/attendance/:id",admin,(req,res)=>{const id=Number(req.params.id);if(!db.prepare("SELECT id FROM employee_attendance WHERE id=?").get(id))return res.status(404).json({success:false,error:"Attendance record not found"});db.prepare("DELETE FROM employee_attendance WHERE id=?").run(id);audit(req,"delete","attendance",id,"Attendance record deleted");res.json({success:true});});
app.get("/api/admin/attendance/summary",admin,(req,res)=>{
 const date=clean(req.query.date,10)||new Date().toISOString().slice(0,10);
 const total=db.prepare("SELECT COUNT(*) c FROM employees WHERE status='active'").get().c;
 const counts=db.prepare("SELECT status,COUNT(*) c FROM employee_attendance WHERE attendance_date=? GROUP BY status").all(date);
 const map=Object.fromEntries(counts.map(x=>[x.status,Number(x.c)]));
 res.json({success:true,data:{date,total,recorded:counts.reduce((n,x)=>n+Number(x.c),0),present:map.present||0,absent:map.absent||0,leave:map.leave||0,half_day:map.half_day||0}});
});

app.get("/api/admin/audit-logs",admin,(req,res)=>{
 const search=clean(req.query.search,120),entity=clean(req.query.entity,40);
 const clauses=[],params=[]; if(entity){clauses.push("a.entity_type=?");params.push(entity)}
 if(search){clauses.push("(a.action LIKE ? OR a.entity_type LIKE ? OR a.details LIKE ? OR u.name LIKE ? OR u.email LIKE ?)");const q=`%${search}%`;params.push(q,q,q,q,q)}
 const where=clauses.length?"WHERE "+clauses.join(" AND "):"";
 const rows=db.prepare(`SELECT a.*,u.name AS user_name,u.email AS user_email FROM audit_logs a LEFT JOIN users u ON u.id=a.user_id ${where} ORDER BY a.id DESC LIMIT 250`).all(...params);
 res.json({success:true,data:rows});
});

app.get("/api/admin/reports.csv",admin,(req,res)=>{
  const rows=db.prepare(`SELECT l.id,l.name,l.phone,l.email,l.source,l.status,l.notes,p.name project_name,eu.name employee_name,l.follow_up_at,l.created_at,l.updated_at FROM leads l LEFT JOIN projects p ON p.id=l.project_id LEFT JOIN employees e ON e.id=l.assigned_employee_id LEFT JOIN users eu ON eu.id=e.user_id ORDER BY l.id DESC`).all();
  const cols=["id","name","phone","email","source","status","notes","project_name","employee_name","follow_up_at","created_at","updated_at"];
  const csv=[cols.join(","),...rows.map(r=>cols.map(k=>`"${String(r[k]??"").replace(/"/g,'""')}"`).join(","))].join("\\r\\n");
  res.set("Content-Type","text/csv; charset=utf-8");res.set("Content-Disposition","attachment; filename=laxminarayan-crm-leads.csv");res.send(csv);
});

app.get("/api/admin/report",admin,(req,res)=>{
 const start=clean(req.query.start,10),end=clean(req.query.end,10);
 const where=start&&end?"WHERE date(created_at) BETWEEN ? AND ?":start?"WHERE date(created_at)>=?":end?"WHERE date(created_at)<=?":"";
 const params=start&&end?[start,end]:start?[start]:end?[end]:[];
 const totalLeads=db.prepare(`SELECT COUNT(*) c FROM leads ${where}`).get(...params).c;
 const wonWhere=where?`${where} AND status='won'`:`WHERE status='won'`;
 const won=db.prepare(`SELECT COUNT(*) c FROM leads ${wonWhere}`).get(...params).c;
 const byStatus=db.prepare(`SELECT status,COUNT(*) count FROM leads ${where} GROUP BY status ORDER BY count DESC`).all(...params);
 const byProject=db.prepare(`SELECT COALESCE(p.name,'General') project_name,COUNT(l.id) count FROM leads l LEFT JOIN projects p ON p.id=l.project_id ${where.replaceAll('created_at','l.created_at')} GROUP BY l.project_id ORDER BY count DESC LIMIT 12`).all(...params);
 const monthly=db.prepare(`SELECT substr(created_at,1,7) month,COUNT(*) count FROM leads WHERE created_at>=date('now','-11 months') ${start?"AND date(created_at)>=?":""} ${end?"AND date(created_at)<=?":""} GROUP BY substr(created_at,1,7) ORDER BY month`).all(...(start&&end?[start,end]:start?[start]:end?[end]:[]));
 const visits=db.prepare("SELECT status,COUNT(*) count FROM site_visits GROUP BY status").all();
 res.json({success:true,data:{totalLeads,won,conversionRate:totalLeads?Math.round(won*1000/totalLeads)/10:0,byStatus,byProject,monthly,visits,start:start||null,end:end||null}});
});

app.get("/api/health",(req,res)=>res.json({success:true,service:"Laxminarayan Group",time:new Date().toISOString()}));

app.post("/api/auth/signup",rateLimit(8,15*60*1000),(req,res)=>{
 const name=clean(req.body.name,120), email=clean(req.body.email,160).toLowerCase(), phone=clean(req.body.phone,30), password=String(req.body.password||"");
 if(name.length<2)return res.status(400).json({success:false,error:"Enter your full name"});
 if(!email && !phone)return res.status(400).json({success:false,error:"Enter an email or phone number"});
 if(email&&!validEmail(email))return res.status(400).json({success:false,error:"Enter a valid email"});
 if(phone&&!validPhone(phone))return res.status(400).json({success:false,error:"Enter a valid phone number"});
 if(!passwordOk(password))return res.status(400).json({success:false,error:"Password must be 8–128 characters"});
 try{
  if(email && db.prepare("SELECT id FROM users WHERE email=?").get(email))return res.status(409).json({success:false,error:"An account with this email already exists"});
  if(phone && db.prepare("SELECT id FROM users WHERE phone=? AND phone<>''").get(phone))return res.status(409).json({success:false,error:"An account with this phone number already exists"});
  const hash=bcrypt.hashSync(password,12);
  const r=db.prepare("INSERT INTO users(name,email,phone,password_hash) VALUES(?,?,?,?)").run(name,email,phone,hash);
  const u=currentUser(r.lastInsertRowid);
  signIn(res,u);
  res.status(201).json({success:true,user:publicUser(u)});
 }catch(e){console.error(e);res.status(500).json({success:false,error:"Could not create account"})}
});

app.post("/api/auth/login",rateLimit(12,15*60*1000),(req,res)=>{
 const identifier=clean(req.body.identifier||req.body.email,160);
 const password=String(req.body.password||"");
 const u=db.prepare("SELECT * FROM users WHERE email=? OR (phone<>'' AND phone=?)").get(identifier.toLowerCase(),identifier);
 if(!u||!bcrypt.compareSync(password,u.password_hash))return res.status(401).json({success:false,error:"Incorrect email/phone or password"});
 if(u.status!=="active")return res.status(403).json({success:false,error:"This account is suspended. Please contact support."});
 signIn(res,u);
 res.json({success:true,user:publicUser(u)});
});

app.get("/api/auth/logout",(req,res)=>{
  const token=req.cookies.lg_session;
  if(token){
    try{
      const decoded=jwt.verify(token,JWT_SECRET);
      db.prepare("UPDATE users SET session_version=COALESCE(session_version,0)+1, updated_at=CURRENT_TIMESTAMP WHERE id=?").run(decoded.id);
    }catch(e){}
  }
  res.clearCookie("lg_session",{httpOnly:true,secure:process.env.NODE_ENV==="production",sameSite:"lax",path:"/"});
  res.set("Cache-Control","no-store");
  res.redirect("/login.html?logged_out=1");
});
app.post("/api/auth/logout",(req,res)=>{
  // Server-side invalidation: increment the user's session version so the current JWT
  // is rejected even if a browser retains the cookie. Then expire the cookie.
  const token=req.cookies.lg_session;
  if(token){
    try{
      const decoded=jwt.verify(token,JWT_SECRET);
      db.prepare("UPDATE users SET session_version=COALESCE(session_version,0)+1, updated_at=? WHERE id=?").run(new Date().toISOString(),decoded.id);
    }catch(e){}
  }
  res.clearCookie("lg_session",{httpOnly:true,secure:process.env.NODE_ENV==="production",sameSite:"lax",path:"/"});
  res.set("Cache-Control","no-store, no-cache, must-revalidate, proxy-revalidate");
  res.set("Pragma","no-cache");
  res.set("Expires","0");
  res.status(200).json({success:true});
});

app.get("/api/auth/me",auth,(req,res)=>{
 const u=currentUser(req.user.id);
 if(!u)return res.status(404).json({success:false,error:"User not found"});
 if(u.status!=="active")return res.status(403).json({success:false,error:"Account is suspended"});
 res.json({success:true,user:publicUser(u)});
});

app.get("/api/site",(req,res)=>res.json({success:true,company:{name:"Laxminarayan Group",tagline:"CONSTRUCTION • DEVELOPMENT • TRUST",phone:"6352000017",email:"msinfraprojects2021@gmail.com"},founders:db.prepare("SELECT id,name,designation,initials,image FROM leaders ORDER BY id").all()}));
app.get("/api/projects",(req,res)=>res.json({success:true,data:db.prepare("SELECT id,name,category,description,image,location,price,amenities FROM projects WHERE status='active' ORDER BY id").all()}));
app.get("/api/projects/category/:category",auth,(req,res)=>{
 const category=clean(req.params.category,60).toUpperCase();
 if(!category)return res.status(400).json({success:false,error:"Project category is required"});
 const data=db.prepare("SELECT id,name,category,description,image,location,price,amenities FROM projects WHERE status='active' AND category=? ORDER BY id").all(category);
 if(!data.length){
   const exists=db.prepare("SELECT 1 FROM projects WHERE category=? LIMIT 1").get(category);
   if(!exists)return res.status(404).json({success:false,error:"Project category not found"});
 }
 res.json({success:true,data});
});
app.get("/api/leaders",(req,res)=>res.json({success:true,data:db.prepare("SELECT id,name,designation,initials,image FROM leaders ORDER BY id").all()}));

function createEnquiry({userId,projectId=null,name,phone,email,message}){
 // Guard foreign keys against stale browser sessions and legacy/deleted project IDs.
 if(userId!=null && !db.prepare("SELECT id FROM users WHERE id=?").get(Number(userId))) userId=null;
 if(projectId!=null && !db.prepare("SELECT id FROM projects WHERE id=?").get(Number(projectId))) projectId=null;
 const insert=db.prepare("INSERT INTO enquiries(user_id,project_id,name,phone,email,message,enquiry_reference) VALUES(?,?,?,?,?,?,NULL)");
 const updateRef=db.prepare("UPDATE enquiries SET enquiry_reference=? WHERE id=?");
 const tx=db.transaction(()=>{
  const r=insert.run(userId,projectId,name,phone,email,message);
  const ref=`ENQ-${String(r.lastInsertRowid).padStart(6,"0")}`;
  updateRef.run(ref,r.lastInsertRowid);
  const lead=db.prepare(`INSERT INTO leads(user_id,name,phone,email,source,status,notes,project_id,enquiry_id) VALUES(?,?,?,?,?,?,?,?,?)`)
    .run(userId,name,phone,email,'website enquiry','new',message,projectId,r.lastInsertRowid);
  return {id:Number(r.lastInsertRowid),reference:ref,lead_id:Number(lead.lastInsertRowid)};
 });
 return tx();
}
app.post("/api/enquiries",rateLimit(10,10*60*1000),(req,res)=>{
 const name=clean(req.body.name,120),phone=clean(req.body.phone,30),email=clean(req.body.email,160).toLowerCase(),message=clean(req.body.message,3000);
 if(!name)return res.status(400).json({success:false,error:"Name is required"});
 if(!validPhone(phone))return res.status(400).json({success:false,error:"Valid phone number is required"});
 if(email&&!validEmail(email))return res.status(400).json({success:false,error:"Invalid email"});
 let userId=null; try{
  const token=req.cookies.lg_session;
  if(token){
   const decoded=jwt.verify(token,JWT_SECRET);
   const u=db.prepare("SELECT id,status FROM users WHERE id=?").get(decoded.id);
   if(u && u.status==="active") userId=u.id;
  }
 }catch(e){}
 const created=createEnquiry({userId,name,phone,email,message});
 res.status(201).json({success:true,message:"Enquiry submitted successfully",...created});
});
app.post("/api/whatsapp-enquiry",rateLimit(10,10*60*1000),(req,res)=>{
 const name=clean(req.body.name,120),phone=clean(req.body.phone,30),email=clean(req.body.email,160).toLowerCase(),message=clean(req.body.message,3000),projectId=req.body.project_id?Number(req.body.project_id):null;
 if(!name)return res.status(400).json({success:false,error:"Name is required"});
 if(!validPhone(phone))return res.status(400).json({success:false,error:"Valid phone number is required"});
 if(email&&!validEmail(email))return res.status(400).json({success:false,error:"Invalid email"});
 let userId=null; try{const token=req.cookies.lg_session;if(token){const decoded=jwt.verify(token,JWT_SECRET);const u=db.prepare("SELECT id,status FROM users WHERE id=?").get(decoded.id);if(u&&u.status==="active")userId=u.id;}}catch(e){}
 const safeProject=Number.isInteger(projectId)&&projectId>0&&db.prepare("SELECT id FROM projects WHERE id=?").get(projectId)?projectId:null;
 const created=createEnquiry({userId,projectId:safeProject,name,phone,email,message:`WhatsApp enquiry: ${message||"Customer requested a WhatsApp conversation."}`});
 db.prepare("UPDATE leads SET source=? WHERE enquiry_id=?").run("whatsapp",created.id);
 audit(req,"create","enquiry",created.id,`WhatsApp enquiry · ${name}`);
 res.status(201).json({success:true,...created});
});

app.post("/api/projects/:id/interest",auth,(req,res)=>{
 const projectId=Number(req.params.id);
 if(!Number.isInteger(projectId)||projectId<1)return res.status(400).json({success:false,error:"Invalid project"});
 const project=db.prepare("SELECT id,name,category,description,image FROM projects WHERE id=? AND status='active'").get(projectId);
 if(!project)return res.status(404).json({success:false,error:"Project not found"});
 const user=currentUser(req.user.id);
 if(!user)return res.status(404).json({success:false,error:"User not found"});
 const existing=db.prepare("SELECT id,enquiry_reference,status,admin_response FROM enquiries WHERE user_id=? AND project_id=? AND status IN ('new','contacted') ORDER BY id DESC LIMIT 1").get(req.user.id,projectId);
 if(existing){return res.json({success:true,already_registered:true,message:"Your interest in this project is already registered.",project:{id:project.id,name:project.name,category:project.category},enquiry:existing});}
 const created=createEnquiry({
  userId:user.id,projectId:project.id,name:user.name,phone:user.phone||"",email:user.email||"",
  message:`Interested in project: ${project.name}`
 });
 const enquiry=db.prepare("SELECT id,enquiry_reference,status,admin_response,created_at FROM enquiries WHERE id=?").get(created.id);
 res.status(201).json({success:true,already_registered:false,message:"Your interest has been sent to our team.",project:{id:project.id,name:project.name,category:project.category},enquiry});
});
app.get("/api/my/enquiries",auth,(req,res)=>res.json({success:true,data:db.prepare("SELECT e.id,e.enquiry_reference,e.project_id,p.name AS project_name,e.name,e.phone,e.email,e.message,e.status,e.admin_response,e.created_at FROM enquiries e LEFT JOIN projects p ON p.id=e.project_id WHERE e.user_id=? ORDER BY e.id DESC").all(req.user.id)}));

app.get("/api/admin/dashboard",admin,(req,res)=>{
 const today=new Date().toISOString().slice(0,10);
 const att=db.prepare("SELECT status,COUNT(*) c FROM employee_attendance WHERE attendance_date=? GROUP BY status").all(today);
 const amap=Object.fromEntries(att.map(x=>[x.status,Number(x.c)]));
 const recent=db.prepare(`SELECT a.action,a.entity_type,a.entity_id,a.details,a.created_at,u.name user_name FROM audit_logs a LEFT JOIN users u ON u.id=a.user_id ORDER BY a.id DESC LIMIT 6`).all();
 const unitStats=db.prepare("SELECT status,COUNT(*) c FROM project_units GROUP BY status").all();
 const umap=Object.fromEntries(unitStats.map(x=>[x.status,Number(x.c)]));
 const totalUnits=db.prepare("SELECT COUNT(*) c FROM project_units").get().c;
 const bookingCount=db.prepare("SELECT COUNT(*) c FROM bookings").get().c;
 const followUpsToday=db.prepare("SELECT COUNT(*) c FROM leads WHERE date(follow_up_at)=date('now') AND status NOT IN ('won','lost')").get().c;
 const overdueLeads=db.prepare("SELECT COUNT(*) c FROM leads WHERE date(follow_up_at)<date('now') AND status NOT IN ('won','lost')").get().c;
 res.json({success:true,stats:{
 users:db.prepare("SELECT COUNT(*) c FROM users WHERE role='customer'").get().c,
 enquiries:db.prepare("SELECT COUNT(*) c FROM enquiries").get().c,
 newEnquiries:db.prepare("SELECT COUNT(*) c FROM enquiries WHERE status='new'").get().c,
 projects:db.prepare("SELECT COUNT(*) c FROM projects WHERE status='active'").get().c,
 leads:db.prepare("SELECT COUNT(*) c FROM leads").get().c,
 openLeads:db.prepare("SELECT COUNT(*) c FROM leads WHERE status NOT IN ('won','lost')").get().c,
 visits:db.prepare("SELECT COUNT(*) c FROM site_visits").get().c,
 employees:db.prepare("SELECT COUNT(*) c FROM employees WHERE status='active'").get().c,
 attendance:{total:db.prepare("SELECT COUNT(*) c FROM employees WHERE status='active'").get().c,present:amap.present||0,absent:amap.absent||0,leave:amap.leave||0,half_day:amap.half_day||0},
 units:{total:totalUnits,available:umap.available||0,blocked:umap.blocked||0,sold:umap.sold||0},
 bookings:bookingCount,
 followUpsToday,
 overdueLeads,
 recent
}});
});
app.get("/api/admin/users",admin,(req,res)=>res.json({success:true,data:db.prepare("SELECT id,name,email,phone,role,status,created_at FROM users ORDER BY id DESC").all()}));
app.get("/api/admin/users/:id",admin,(req,res)=>{
  const id=Number(req.params.id), user=db.prepare("SELECT id,name,email,phone,role,status,created_at,updated_at FROM users WHERE id=?").get(id);
  if(!user)return res.status(404).json({success:false,error:"Customer not found"});
  const enquiries=db.prepare(`SELECT e.id,e.enquiry_reference,e.status,e.message,e.admin_response,e.created_at,p.name project_name FROM enquiries e LEFT JOIN projects p ON p.id=e.project_id WHERE e.user_id=? ORDER BY e.id DESC`).all(id);
  const leads=db.prepare(`SELECT l.*,p.name project_name,e.name employee_name FROM leads l LEFT JOIN projects p ON p.id=l.project_id LEFT JOIN employees em ON em.id=l.assigned_employee_id LEFT JOIN users e ON e.id=em.user_id WHERE l.user_id=? ORDER BY l.id DESC`).all(id);
  const visits=db.prepare(`SELECT v.*,p.name project_name FROM site_visits v LEFT JOIN projects p ON p.id=v.project_id WHERE v.user_id=? ORDER BY v.id DESC`).all(id);
  res.json({success:true,data:{user,enquiries,leads,visits}});
});
app.put("/api/admin/users/:id",admin,(req,res)=>{
  const id=Number(req.params.id), existing=db.prepare("SELECT * FROM users WHERE id=?").get(id);
  if(!existing)return res.status(404).json({success:false,error:"Customer not found"});
  if(existing.role!=='customer')return res.status(400).json({success:false,error:"Only customer profiles can be edited here"});
  const name=clean(req.body.name,120),email=clean(req.body.email,160).toLowerCase(),phone=clean(req.body.phone,30);
  if(name.length<2)return res.status(400).json({success:false,error:"Enter the customer name"});
  if(email && !validEmail(email))return res.status(400).json({success:false,error:"Enter a valid email"});
  if(phone && !validPhone(phone))return res.status(400).json({success:false,error:"Enter a valid phone number"});
  if(email && db.prepare("SELECT id FROM users WHERE email=? AND id<>?").get(email,id))return res.status(409).json({success:false,error:"Another account already uses this email"});
  if(phone && db.prepare("SELECT id FROM users WHERE phone=? AND id<>?").get(phone,id))return res.status(409).json({success:false,error:"Another account already uses this phone number"});
  db.prepare("UPDATE users SET name=?,email=?,phone=?,updated_at=CURRENT_TIMESTAMP WHERE id=?").run(name,email,phone,id); audit(req,"update","customer",id,name); res.json({success:true});
});
app.delete("/api/admin/users/:id",admin,(req,res)=>{
  const id=Number(req.params.id), existing=db.prepare("SELECT id,name,role FROM users WHERE id=?").get(id);
  if(!existing)return res.status(404).json({success:false,error:"Customer not found"});
  if(existing.role!=='customer')return res.status(400).json({success:false,error:"Only customer accounts can be deleted"});
  db.prepare("DELETE FROM users WHERE id=?").run(id); audit(req,"delete","customer",id,`Customer deleted: ${existing.name}`); res.json({success:true});
});

app.patch("/api/admin/users/:id/status",admin,(req,res)=>{
 const status=clean(req.body.status,20);
 if(!["active","suspended"].includes(status))return res.status(400).json({success:false,error:"Invalid status"});
 const id=Number(req.params.id);
 const target=db.prepare("SELECT id,role FROM users WHERE id=?").get(id);
 if(!target)return res.status(404).json({success:false,error:"User not found"});
 if(target.id===req.user.id && status==="suspended")return res.status(400).json({success:false,error:"You cannot suspend your own admin account"});
 db.prepare("UPDATE users SET status=?,session_version=session_version+1,updated_at=CURRENT_TIMESTAMP WHERE id=?").run(status,id);
 audit(req,"update","customer",id,`Status ${status}`);
 res.json({success:true});
});
app.post("/api/admin/enquiries",admin,(req,res)=>{
  const name=clean(req.body.name,120),phone=clean(req.body.phone,30),email=clean(req.body.email,160).toLowerCase(),message=clean(req.body.message,3000),status=clean(req.body.status,30)||"new";
  const projectId=req.body.project_id?Number(req.body.project_id):null,userId=req.body.user_id?Number(req.body.user_id):null;
  if(name.length<2)return res.status(400).json({success:false,error:"Enter the customer name"});
  if(!validPhone(phone))return res.status(400).json({success:false,error:"Enter a valid phone number"});
  if(email&&!validEmail(email))return res.status(400).json({success:false,error:"Enter a valid email"});
  if(!["new","contacted","closed"].includes(status))return res.status(400).json({success:false,error:"Invalid enquiry status"});
  if(projectId!==null && (!Number.isInteger(projectId)||!db.prepare("SELECT id FROM projects WHERE id=?").get(projectId)))return res.status(400).json({success:false,error:"Invalid project"});
  if(userId!==null && (!Number.isInteger(userId)||!db.prepare("SELECT id FROM users WHERE id=? AND role='customer'").get(userId)))return res.status(400).json({success:false,error:"Invalid customer"});
  const created=createEnquiry({userId,projectId,name,phone,email,message});
  if(status!=="new"){
    db.prepare("UPDATE enquiries SET status=? WHERE id=?").run(status,created.id);
    db.prepare("UPDATE leads SET status=? ,updated_at=CURRENT_TIMESTAMP WHERE enquiry_id=?").run(status==='closed'?'lost':'contacted',created.id);
  }
  audit(req,"create","enquiry",created.id,`${created.reference} · ${name}`);
  res.status(201).json({success:true,data:db.prepare("SELECT * FROM enquiries WHERE id=?").get(created.id)});
});
app.get("/api/admin/enquiries",admin,(req,res)=>res.json({success:true,data:db.prepare("SELECT e.*,u.role,p.name AS project_name,p.category AS project_category FROM enquiries e LEFT JOIN users u ON u.id=e.user_id LEFT JOIN projects p ON p.id=e.project_id ORDER BY e.id DESC").all()}));
app.put("/api/admin/enquiries/:id",admin,(req,res)=>{
 const id=Number(req.params.id), existing=db.prepare("SELECT * FROM enquiries WHERE id=?").get(id);
 if(!existing)return res.status(404).json({success:false,error:"Enquiry not found"});
 const name=clean(req.body.name,120),phone=clean(req.body.phone,30),email=clean(req.body.email,160).toLowerCase();
 const message=clean(req.body.message,3000),status=clean(req.body.status,30)||existing.status,adminResponse=clean(req.body.admin_response,5000);
 const projectId=req.body.project_id?Number(req.body.project_id):null,userId=req.body.user_id?Number(req.body.user_id):null;
 if(name.length<2)return res.status(400).json({success:false,error:"Enter the customer name"});
 if(!validPhone(phone))return res.status(400).json({success:false,error:"Enter a valid phone number"});
 if(email&&!validEmail(email))return res.status(400).json({success:false,error:"Enter a valid email"});
 if(!["new","contacted","closed"].includes(status))return res.status(400).json({success:false,error:"Invalid enquiry status"});
 if(projectId!==null && (!Number.isInteger(projectId)||!db.prepare("SELECT id FROM projects WHERE id=?").get(projectId)))return res.status(400).json({success:false,error:"Invalid project"});
 if(userId!==null && (!Number.isInteger(userId)||!db.prepare("SELECT id FROM users WHERE id=? AND role='customer'").get(userId)))return res.status(400).json({success:false,error:"Invalid customer account"});
 db.prepare("UPDATE enquiries SET user_id=?,project_id=?,name=?,phone=?,email=?,message=?,status=?,admin_response=? WHERE id=?").run(userId,projectId,name,phone,email,message,status,adminResponse,id);
 audit(req,"update","enquiry",id,`${existing.enquiry_reference||'ENQ-'+id} · ${name}`);
 const updated=db.prepare("SELECT * FROM enquiries WHERE id=?").get(id);
 res.json({success:true,data:updated});
});

app.patch("/api/admin/enquiries/:id",admin,(req,res)=>{
 const status=clean(req.body.status,30),allowed=["new","contacted","closed"];
 if(!allowed.includes(status))return res.status(400).json({success:false,error:"Invalid status"});
 const id=Number(req.params.id);
 if(!Number.isInteger(id)||id<1)return res.status(400).json({success:false,error:"Invalid enquiry id"});
 const adminResponse=clean(req.body.admin_response,5000);
 const r=db.prepare("UPDATE enquiries SET status=?, admin_response=? WHERE id=?").run(status,adminResponse,id);
 if(!r.changes)return res.status(404).json({success:false,error:"Enquiry not found"});
 const updated=db.prepare("SELECT id,enquiry_reference,status,admin_response FROM enquiries WHERE id=?").get(id);
 audit(req,"update","enquiry",id,`Status ${status}`);
 // Keep the linked CRM lead aligned with enquiry closure/contact state where applicable.
 db.prepare("UPDATE leads SET status=CASE WHEN ?='closed' THEN 'lost' WHEN ?='contacted' AND status='new' THEN 'contacted' ELSE status END,updated_at=CURRENT_TIMESTAMP WHERE enquiry_id=?").run(status,status,id);
 res.json({success:true,data:updated});
});
app.get("/api/admin/projects",admin,(req,res)=>{
  const projects=db.prepare("SELECT id,name,category,description,image,location,price,amenities,status,created_at,updated_at FROM projects ORDER BY id DESC").all();
  const countStmt=db.prepare("SELECT COUNT(*) c FROM project_media WHERE project_id=?");
  const coverStmt=db.prepare("SELECT file_path FROM project_media WHERE project_id=? AND media_type='image' ORDER BY is_cover DESC,id ASC LIMIT 1");
  for(const x of projects){x.media_count=countStmt.get(x.id).c;const cover=coverStmt.get(x.id);if(cover?.file_path)x.image=cover.file_path;}
  res.json({success:true,data:projects});
});

app.post("/api/admin/projects",admin,projectUpload.single("image_file"),(req,res)=>{
 try{
  const name=clean(req.body.name,160), category=clean(req.body.category,40), description=clean(req.body.description,5000), location=clean(req.body.location,300), price=clean(req.body.price,200), amenities=clean(req.body.amenities,2000), status=clean(req.body.status,20)||"active";
  let image=clean(req.body.image,1000);
  if(req.file) image="/uploads/projects/"+req.file.filename;
  if(name.length<2)return res.status(400).json({success:false,error:"Enter a project name"});
  if(!["RESIDENTIAL","COMMERCIAL","DEVELOPMENT","INDUSTRIAL"].includes(category))return res.status(400).json({success:false,error:"Select a valid category"});
  if(!["active","inactive"].includes(status))return res.status(400).json({success:false,error:"Invalid status"});
  const info=db.prepare("INSERT INTO projects(name,category,description,image,location,price,amenities,status,created_at,updated_at) VALUES(?,?,?,?,?,?,?, ?,datetime('now'),datetime('now'))").run(name,category,description,image,location,price,amenities,status);
  audit(req,"create","project",info.lastInsertRowid,name);
  res.json({success:true,data:db.prepare("SELECT id,name,category,description,image,location,price,amenities,status,created_at,updated_at FROM projects WHERE id=?").get(info.lastInsertRowid)});
 }catch(e){
  if(req.file)try{fs.unlinkSync(req.file.path)}catch(_e){}
  throw e;
 }
});
app.put("/api/admin/projects/:id",admin,projectUpload.single("image_file"),(req,res)=>{
 try{
  const id=Number(req.params.id), existing=db.prepare("SELECT * FROM projects WHERE id=?").get(id);
  if(!existing)return res.status(404).json({success:false,error:"Project not found"});
  const name=clean(req.body.name,160), category=clean(req.body.category,40), description=clean(req.body.description,5000), location=clean(req.body.location,300), price=clean(req.body.price,200), amenities=clean(req.body.amenities,2000), status=clean(req.body.status,20)||"active";
  let image=clean(req.body.image,1000);
  if(req.file) image="/uploads/projects/"+req.file.filename;
  else if(!image) image=existing.image||"";
  if(name.length<2)return res.status(400).json({success:false,error:"Enter a project name"});
  if(!["RESIDENTIAL","COMMERCIAL","DEVELOPMENT","INDUSTRIAL"].includes(category))return res.status(400).json({success:false,error:"Select a valid category"});
  if(!["active","inactive"].includes(status))return res.status(400).json({success:false,error:"Invalid status"});
  db.prepare("UPDATE projects SET name=?,category=?,description=?,image=?,location=?,price=?,amenities=?,status=?,updated_at=datetime('now') WHERE id=?").run(name,category,description,image,location,price,amenities,status,id);
  if(req.file && existing.image && existing.image.startsWith("/uploads/projects/")) deleteMediaFile(existing.image);
  audit(req,"update","project",id,name);
  res.json({success:true,data:db.prepare("SELECT id,name,category,description,image,location,price,amenities,status,created_at,updated_at FROM projects WHERE id=?").get(id)});
 }catch(e){
  if(req.file)try{fs.unlinkSync(req.file.path)}catch(_e){}
  throw e;
 }
});
app.get("/api/projects/:id/media",auth,(req,res)=>{
  const id=Number(req.params.id); if(!Number.isInteger(id)||id<1)return res.status(400).json({success:false,error:"Invalid project id"});
  const project=db.prepare("SELECT id,name,status FROM projects WHERE id=?").get(id); if(!project)return res.status(404).json({success:false,error:"Project not found"});
  res.json({success:true,project,data:mediaRows(id)});
});

app.post("/api/admin/projects/:id/media",admin,(req,res,next)=>{
  projectMediaUpload.array("media",20)(req,res,async err=>{
    if(err)return next(err);
    const id=Number(req.params.id),project=projectRow(id);
    if(!project){for(const f of req.files||[])deleteMediaFile("/uploads/projects/"+path.basename(f.path));return res.status(404).json({success:false,error:"Project not found"});}
    const files=req.files||[]; if(!files.length)return res.status(400).json({success:false,error:"Choose at least one photo or video"});
    const accepted=[]; const rejected=[];
    for(const f of files){
      const type=mediaTypeFor(f);
      const max=type==="image"?IMAGE_MAX:VIDEO_MAX;
      if(f.size>max){rejected.push(`${f.originalname}: exceeds ${type==="image"?"250 MB":"2 GB"}`);deleteMediaFile("/uploads/projects/"+path.basename(f.path));continue;}
      const rel="/uploads/projects/"+path.basename(f.path);
      const r=db.prepare("INSERT INTO project_media(project_id,media_type,mime_type,original_name,file_path,file_size,is_cover) VALUES(?,?,?,?,?,?,0)").run(id,type,f.mimetype||"",clean(f.originalname,500),rel,f.size);
      accepted.push(db.prepare("SELECT id,project_id,media_type,mime_type,original_name,file_path,file_size,is_cover,created_at FROM project_media WHERE id=?").get(r.lastInsertRowid));
    }
    if(accepted.length && db.prepare("SELECT COUNT(*) c FROM project_media WHERE project_id=? AND is_cover=1").get(id).c===0){
      const firstImage=accepted.find(x=>x.media_type==="image");
      if(firstImage){db.prepare("UPDATE project_media SET is_cover=1 WHERE id=?").run(firstImage.id);firstImage.is_cover=1;}
    }
    audit(req,"upload","project_media",id,`${accepted.length} uploaded${rejected.length?`; ${rejected.length} rejected`:""}`);
    res.json({success:true,data:accepted,rejected});
  });
});

app.patch("/api/admin/projects/:projectId/media/:mediaId/cover",admin,(req,res)=>{
  const projectId=Number(req.params.projectId),mediaId=Number(req.params.mediaId);
  const media=db.prepare("SELECT * FROM project_media WHERE id=? AND project_id=?").get(mediaId,projectId);
  if(!media)return res.status(404).json({success:false,error:"Media not found"});
  if(media.media_type!=="image")return res.status(400).json({success:false,error:"Only images can be the cover image"});
  const tx=db.transaction(()=>{db.prepare("UPDATE project_media SET is_cover=0 WHERE project_id=?").run(projectId);db.prepare("UPDATE project_media SET is_cover=1 WHERE id=?").run(mediaId);db.prepare("UPDATE projects SET image=?,updated_at=datetime('now') WHERE id=?").run(media.file_path,projectId);});
  tx(); audit(req,"update","project_media",mediaId,"Cover image changed"); res.json({success:true,data:mediaRows(projectId)});
});

app.delete("/api/admin/projects/:projectId/media/:mediaId",admin,(req,res)=>{
  const projectId=Number(req.params.projectId),mediaId=Number(req.params.mediaId);
  const media=db.prepare("SELECT * FROM project_media WHERE id=? AND project_id=?").get(mediaId,projectId);
  if(!media)return res.status(404).json({success:false,error:"Media not found"});
  db.prepare("DELETE FROM project_media WHERE id=?").run(mediaId);deleteMediaFile(media.file_path);
  if(media.is_cover){
    const next=db.prepare("SELECT id,file_path FROM project_media WHERE project_id=? AND media_type='image' ORDER BY id ASC LIMIT 1").get(projectId);
    if(next){db.prepare("UPDATE project_media SET is_cover=1 WHERE id=?").run(next.id);db.prepare("UPDATE projects SET image=?,updated_at=datetime('now') WHERE id=?").run(next.file_path,projectId);}
    else db.prepare("UPDATE projects SET image='',updated_at=datetime('now') WHERE id=?").run(projectId);
  }
  audit(req,"delete","project_media",mediaId,"Project media deleted");
  res.json({success:true,data:mediaRows(projectId)});
});

app.patch("/api/admin/projects/:id/status",admin,(req,res)=>{
 const id=Number(req.params.id), status=clean(req.body.status,20);
 if(!["active","inactive"].includes(status))return res.status(400).json({success:false,error:"Invalid status"});
 const info=db.prepare("UPDATE projects SET status=?,updated_at=datetime('now') WHERE id=?").run(status,id);
 if(!info.changes)return res.status(404).json({success:false,error:"Project not found"});
 audit(req,"update","project",id,`Status ${status}`);
 res.json({success:true,data:db.prepare("SELECT id,name,category,description,image,location,price,amenities,status,created_at,updated_at FROM projects WHERE id=?").get(id)});
});
app.get("/api/admin/projects/:id/media",admin,(req,res)=>{
  const id=Number(req.params.id); if(!Number.isInteger(id)||id<1)return res.status(400).json({success:false,error:"Invalid project id"});
  const project=projectRow(id); if(!project)return res.status(404).json({success:false,error:"Project not found"});
  res.json({success:true,project,data:mediaRows(id)});
});


app.delete("/api/admin/projects/:id",admin,(req,res)=>{
 const id=Number(req.params.id), existing=db.prepare("SELECT image FROM projects WHERE id=?").get(id);
 if(!existing)return res.status(404).json({success:false,error:"Project not found"});
 const media=db.prepare("SELECT file_path FROM project_media WHERE project_id=?").all(id);
 db.prepare("DELETE FROM projects WHERE id=?").run(id);
 for(const m of media) deleteMediaFile(m.file_path);
 if(existing.image && existing.image.startsWith("/uploads/projects/")) deleteMediaFile(existing.image);
 audit(req,"delete","project",id,"Project permanently deleted");
 res.json({success:true});
});


app.use(express.static(__dirname));
app.use("/uploads/projects",express.static(PROJECT_UPLOAD_DIR,{maxAge:"7d",fallthrough:false}));
// index.html is served automatically for the site root by express.static.
// No catch-all route is needed; this avoids Express/path-to-regexp wildcard issues.
app.use((err,req,res,next)=>{
  if(err instanceof multer.MulterError) return res.status(400).json({success:false,error:err.code==="LIMIT_FILE_SIZE"?"File is too large. Images are limited to 250 MB and videos to 2 GB.":err.message});
  if(err && err.message && err.message.includes("Only JPG, PNG, WEBP or GIF")) return res.status(400).json({success:false,error:err.message});
  console.error(err);res.status(500).json({success:false,error:"Internal server error"});
});
app.listen(PORT,"0.0.0.0",()=>console.log(`Laxminarayan Group running at http://localhost:${PORT}`));
