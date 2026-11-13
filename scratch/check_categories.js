const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('database.sqlite');

db.all("PRAGMA table_info(categories)", [], (err, rows) => {
  if (err) console.error(err);
  else console.log('Categories columns:', rows);
  
  db.all("SELECT id, name, parent_id FROM categories LIMIT 10", [], (err2, cats) => {
    if (err2) console.log('parent_id column might not exist yet:', err2.message);
    else console.log('Sample categories:', cats);
    db.close();
  });
});

