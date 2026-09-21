const Database = require('./sqlite-compat');
const db = new Database(':memory:');

console.log('=== SYSTEM & NODE.JS TIMEZONE ===');
console.log('process.env.TZ before:', process.env.TZ);
console.log('Intl resolved timezone:', Intl.DateTimeFormat().resolvedOptions().timeZone);
console.log('Date now():', new Date().toString());
console.log('Date toISOString (UTC):', new Date().toISOString());

process.env.TZ = 'Asia/Kolkata';
console.log('\n=== AFTER SETTING process.env.TZ = "Asia/Kolkata" ===');
console.log('process.env.TZ:', process.env.TZ);
console.log('Intl resolved timezone:', Intl.DateTimeFormat().resolvedOptions().timeZone);
console.log('Date now():', new Date().toString());
console.log('Local string (IST):', new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }));

console.log('\n=== SQLITE TIME CHECKS ===');
const q = db.prepare("SELECT datetime('now') AS utc_time, date('now') AS utc_date, datetime('now', '+5 hours', '+30 minutes') AS ist_time, date('now', '+5 hours', '+30 minutes') AS ist_date").get();
console.log('SQLite UTC Time:', q.utc_time);
console.log('SQLite UTC Date:', q.utc_date);
console.log('SQLite IST Time (+5:30):', q.ist_time);
console.log('SQLite IST Date (+5:30):', q.ist_date);
