const db = require('../db');

console.log('--- Current Categories ---');
db.all("SELECT id, name, image FROM categories", [], (err, rows) => {
    if (err) console.error(err);
    else console.log(rows);
});

console.log('--- Current Products ---');
db.all("SELECT id, name, price, original_price, image, is_bestseller FROM products", [], (err, rows) => {
    if (err) console.error(err);
    else console.log(rows);
});

console.log('--- Current Blogs ---');
db.all("SELECT id, title, image, created_at FROM blogs", [], (err, rows) => {
    if (err) console.error(err);
    else console.log(rows);
});

