/**
 * Laxminarayan Group — Media & Floor Plan Importer
 * Usage: node scripts/import_media.js <projectId> <sourceDirectoryOrFilePath>
 * Example:
 *   node scripts/import_media.js 1 "C:\Users\LENOVO\Downloads\DS208_Photos"
 *   node scripts/import_media.js 2 "C:\Users\LENOVO\Downloads\Nilkanth_Villa_Plans"
 */

const fs = require('fs');
const path = require('path');
const Database = require('./sqlite-compat');
require('dotenv').config();

const APP_DATA_ROOT = path.join(process.env.APPDATA || path.join(require('os').homedir(), 'AppData', 'Roaming'), 'LaxminarayanGroup');
const db = new Database(path.join(APP_DATA_ROOT, 'data', 'laxminarayan.db'));
const uploadDir = path.join(__dirname, '..', 'uploads', 'projects');

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const projectId = Number(process.argv[2]);
const sourcePath = process.argv[3];

if (!projectId || !sourcePath) {
  console.log('Usage: node scripts/import_media.js <projectId> <sourceDirectoryOrFilePath>');
  console.log('Example: node scripts/import_media.js 1 "C:\\path\\to\\ds208_folder"');
  process.exit(1);
}

const project = db.prepare("SELECT id, name FROM projects WHERE id = ?").get(projectId);
if (!project) {
  console.error(`Project ID ${projectId} not found in database.`);
  process.exit(1);
}

console.log(`Importing media for: ${project.name} (ID: ${project.id})`);

let filesToImport = [];
if (fs.statSync(sourcePath).isDirectory()) {
  const allFiles = fs.readdirSync(sourcePath);
  filesToImport = allFiles.map(f => path.join(sourcePath, f)).filter(f => fs.statSync(f).isFile());
} else {
  filesToImport = [sourcePath];
}

const validExts = ['.jpg', '.jpeg', '.png', '.webp', '.svg', '.mp4', '.mov', '.pdf'];

let importedCount = 0;
for (const src of filesToImport) {
  const ext = path.extname(src).toLowerCase();
  if (!validExts.includes(ext)) {
    console.log(`Skipping non-media file: ${path.basename(src)}`);
    continue;
  }

  const origName = path.basename(src);
  const targetFileName = `p${projectId}_${Date.now()}_${Math.floor(Math.random() * 10000)}${ext}`;
  const targetPath = path.join(uploadDir, targetFileName);

  fs.copyFileSync(src, targetPath);
  const relPath = `/uploads/projects/${targetFileName}`;
  const stat = fs.statSync(targetPath);
  const mediaType = ['.mp4', '.mov'].includes(ext) ? 'video' : 'image';

  // Check if cover exists
  const hasCover = db.prepare("SELECT COUNT(*) c FROM project_media WHERE project_id = ? AND is_cover = 1").get(projectId).c > 0;
  const isCover = !hasCover && mediaType === 'image' ? 1 : 0;

  db.prepare(`
    INSERT INTO project_media (project_id, media_type, mime_type, original_name, file_path, file_size, is_cover)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(projectId, mediaType, `image/${ext.replace('.', '')}`, origName, relPath, stat.size, isCover);

  if (isCover) {
    db.prepare("UPDATE projects SET image = ? WHERE id = ?").run(relPath, projectId);
    console.log(`★ Set as Project Cover Image: ${origName}`);
  }

  console.log(`✓ Imported: ${origName} -> ${relPath}`);
  importedCount++;
}

console.log(`\nSuccessfully imported ${importedCount} media items for ${project.name}!`);
