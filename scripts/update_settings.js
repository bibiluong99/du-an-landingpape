const { query, run } = require('../db');

async function updateSettings() {
  const rows = await query("SELECT * FROM settings");
  console.log('Current settings:', rows);

  const newSettings = {
    company_name: 'Công ty TNHH Điện Việt',
    company_slogan: 'Kết nối giá trị - Thắp sáng tương lai',
    phone: '1800 1234',
    email: 'hotro@dienviet.vn',
    address: 'Số 123 Nguyễn Văn Cừ, Hà Nội',
    about_title: 'Công ty TNHH Điện Việt',
    about_history: 'Với hơn 10 năm kinh nghiệm trong lĩnh vực thiết bị điện, Điện Việt cam kết mang đến cho khách hàng những sản phẩm chất lượng, giải pháp tối ưu và dịch vụ chuyên nghiệp nhất.',
    maps_embed: 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3724.09796030901!2d105.8679!3d21.0326!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3135abd4512b!2zMTIzIE5ndXnhu4VuIFbEg24gQ-G7qywgTG9uZyBCacOqbiwgSMOgIE7hu5lp!5e0!3m2!1svi!2svn!4v1710000000000!5m2!1svi!2svn'
  };

  for (const [k, v] of Object.entries(newSettings)) {
    const existing = await query("SELECT id FROM settings WHERE key = ?", [k]);
    if (existing.length > 0) {
      await run("UPDATE settings SET value = ? WHERE key = ?", [v, k]);
    } else {
      await run("INSERT INTO settings (key, value) VALUES (?, ?)", [k, v]);
    }
  }
  console.log('✔ Updated settings successfully');
  process.exit(0);
}

updateSettings();

