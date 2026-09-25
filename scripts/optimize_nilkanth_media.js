const fs = require('fs');
const path = require('path');
const os = require('os');
const sharp = require('sharp');
const Database = require('./sqlite-compat');

const APP_DATA_ROOT = path.join(process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming'), 'LaxminarayanGroup');
const LOCAL_UPLOADS = path.join(__dirname, '..', 'uploads', 'projects');
const PERM_UPLOADS = path.join(APP_DATA_ROOT, 'uploads', 'projects');
const DB_FILE = path.join(APP_DATA_ROOT, 'data', 'laxminarayan.db');

fs.mkdirSync(LOCAL_UPLOADS, { recursive: true });
fs.mkdirSync(PERM_UPLOADS, { recursive: true });

const NILKANTH_DIR = path.join(__dirname, '..', 'uploads', 'nilkanth_villa');

const mediaMapping = [
  {
    rawFile: 'F_v_front view.jpg.jpeg',
    targetName: 'nilkanth_front_elevation.jpg',
    title: 'Front Architectural Elevation of Luxury Bungalow',
    isCover: 1
  },
  {
    rawFile: 'F_v_Bird View.jpg.jpeg',
    targetName: 'nilkanth_bird_eye_view.jpg',
    title: 'Master Aerial Bird-Eye View of Gated Villa Enclave',
    isCover: 0
  },
  {
    rawFile: 'F_v corner view day.jpg.jpeg',
    targetName: 'nilkanth_corner_view_day.jpg',
    title: 'Private Corner Bungalow with Landscaped Lawns',
    isCover: 0
  },
  {
    rawFile: 'F_v_Corner_Street View.jpg.jpeg',
    targetName: 'nilkanth_street_view.jpg',
    title: 'Tree-Lined Internal Concrete Avenue & Promenade',
    isCover: 0
  },
  {
    rawFile: 'F_v_gate view.jpg.jpeg',
    targetName: 'nilkanth_entrance_gate_day.jpg',
    title: 'Grand Security Entrance Gate & Boundary Boulevard',
    isCover: 0
  },
  {
    rawFile: 'F_v_ gate night.jpg.jpeg',
    targetName: 'nilkanth_entrance_gate_night.jpg',
    title: 'Evening Ambient Illumination of Entry Gate',
    isCover: 0
  },
  {
    rawFile: 'F_v_Gajebo View.jpg.jpeg',
    targetName: 'nilkanth_gazebo_pavilion.jpg',
    title: 'Designer Leisure Gazebo & Senior Citizen Sitting',
    isCover: 0
  },
  {
    rawFile: 'F_v_Garden View.jpg.jpeg',
    targetName: 'nilkanth_central_garden.jpg',
    title: 'Lush Green Central Park & Recreation Lawn',
    isCover: 0
  }
];

async function run() {
  console.log('--- OPTIMIZING NILKANTH VILLA 3D ARCHITECTURAL RENDERS ---');
  
  for (const item of mediaMapping) {
    const src = path.join(NILKANTH_DIR, item.rawFile);
    if (!fs.existsSync(src)) {
      console.warn(`File not found: ${src}`);
      continue;
    }

    const localDest = path.join(LOCAL_UPLOADS, item.targetName);
    const permDest = path.join(PERM_UPLOADS, item.targetName);

    console.log(`Processing: ${item.rawFile} -> ${item.targetName}...`);
    // Resize down to 2560px max width for ultra-sharp Retina clarity at 85% web quality
    await sharp(src)
      .resize({ width: 2560, withoutEnlargement: true })
      .jpeg({ quality: 85, progressive: true })
      .toFile(localDest);

    fs.copyFileSync(localDest, permDest);
    const sz = (fs.statSync(localDest).size / 1024).toFixed(0);
    console.log(`  ✓ Generated: ${item.targetName} (${sz} KB)`);
  }

  // Update Database project_media and cover
  const db = new Database(DB_FILE);
  db.pragma('journal_mode = WAL');

  // Clear previous placeholder media for Nilkanth Villa (project_id = 2)
  db.prepare("DELETE FROM project_media WHERE project_id = 2").run();

  for (const item of mediaMapping) {
    const localDest = path.join(LOCAL_UPLOADS, item.targetName);
    const fsize = fs.existsSync(localDest) ? fs.statSync(localDest).size : 0;
    const relPath = `/uploads/projects/${item.targetName}`;

    db.prepare(`
      INSERT INTO project_media (project_id, media_type, mime_type, original_name, file_path, file_size, is_cover)
      VALUES (2, 'image', 'image/jpeg', ?, ?, ?, ?)
    `).run(item.title, relPath, fsize, item.isCover);
  }

  // Update projects table cover image for Nilkanth Villa (ID 2)
  db.prepare(`
    UPDATE projects 
    SET image = '/uploads/projects/nilkanth_front_elevation.jpg',
        updated_at = CURRENT_TIMESTAMP
    WHERE id = 2
  `).run();

  console.log('\n✓ Updated project_media and cover image for Nilkanth Villa in database!');
}

run().catch(console.error);
