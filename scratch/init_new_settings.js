const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('database.sqlite');

const defaultSettings = [
  { key: 'working_hours', value: 'Thứ 2 - Thứ 7: 8h00 - 17h30\nChủ nhật: 8h00 - 12h00' },
  { key: 'about_why_choose', value: '100% sản phẩm chính hãng • Giao hàng toàn quốc nhanh chóng • Hỗ trợ kỹ thuật 24/7 • Giá cả cạnh tranh • Đổi trả linh hoạt' }
];

db.serialize(() => {
  defaultSettings.forEach(s => {
    db.run(
      'INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)',
      [s.key, s.value],
      (err) => {
        if (!err) console.log(`Setting initialized: ${s.key}`);
      }
    );
  });
  db.all('SELECT key, value FROM settings WHERE key IN ("working_hours", "about_why_choose")', (err, rows) => {
    console.log('Current settings:', rows);
    db.close();
  });
});

