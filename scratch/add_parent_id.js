const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('database.sqlite');

db.run("ALTER TABLE categories ADD COLUMN parent_id INTEGER DEFAULT NULL", (err) => {
  if (err) console.log('ALTER result:', err.message);
  else console.log('Added parent_id column successfully!');
  
  // Also check if we have any child categories. If none, let's create a couple sample subcategories for demonstration!
  db.all("SELECT id, name, parent_id FROM categories WHERE parent_id IS NOT NULL", [], (err2, subcats) => {
    if (err2) {
      console.error(err2);
      db.close();
      return;
    }
    if (subcats.length === 0) {
      console.log('Adding sample subcategories for demonstration...');
      // Add subcategories under Dây điện (id 1)
      db.run("INSERT INTO categories (parent_id, name, slug, description, image, show_in_slider) VALUES (?, ?, ?, ?, ?, ?)",
        [1, 'Dây điện đơn dân dụng', 'day-dien-don-dan-dung', 'Dây điện đơn 1 lõi bọc nhựa PVC', '/images/hd/cat-day-dien.jpg', 0], (err3) => {
        if (!err3) console.log('Added Dây điện đơn dân dụng');
      });
      db.run("INSERT INTO categories (parent_id, name, slug, description, image, show_in_slider) VALUES (?, ?, ?, ?, ?, ?)",
        [1, 'Dây điện đôi mềm', 'day-dien-doi-mem', 'Dây điện đôi bọc cách điện tròn/dẹp', '/images/hd/cat-day-dien.jpg', 0], (err4) => {
        if (!err4) console.log('Added Dây điện đôi mềm');
      });
      // Add subcategory under Dây cáp điện (id 2)
      db.run("INSERT INTO categories (parent_id, name, slug, description, image, show_in_slider) VALUES (?, ?, ?, ?, ?, ?)",
        [2, 'Cáp điện hạ thế', 'cap-dien-ha-the', 'Cáp điện ngầm và cáp treo hạ thế', '/images/hd/cat-day-cap-dien.jpg', 0], (err5) => {
        if (!err5) console.log('Added Cáp điện hạ thế');
        db.close();
      });
    } else {
      console.log('Subcategories already exist:', subcats);
      db.close();
    }
  });
});

