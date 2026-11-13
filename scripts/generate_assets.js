const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, '..', 'public', 'images');
if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir, { recursive: true });
}

// 1. cat-day-dien.svg (Cuộn dây điện 3 màu đỏ, vàng, xanh)
const svgCatDayDien = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 240" width="100%" height="100%">
  <defs>
    <filter id="shadow" x="-10%" y="-10%" width="120%" height="130%">
      <feDropShadow dx="0" dy="8" stdDeviation="8" flood-opacity="0.15"/>
    </filter>
    <linearGradient id="gradBlue" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#3b82f6"/>
      <stop offset="50%" stop-color="#1d4ed8"/>
      <stop offset="100%" stop-color="#1e3a8a"/>
    </linearGradient>
    <linearGradient id="gradRed" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#ef4444"/>
      <stop offset="50%" stop-color="#dc2626"/>
      <stop offset="100%" stop-color="#991b1b"/>
    </linearGradient>
    <linearGradient id="gradYellow" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#fbbf24"/>
      <stop offset="50%" stop-color="#f59e0b"/>
      <stop offset="100%" stop-color="#d97706"/>
    </linearGradient>
    <linearGradient id="copper" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#fcd34d"/>
      <stop offset="40%" stop-color="#f59e0b"/>
      <stop offset="100%" stop-color="#b45309"/>
    </linearGradient>
  </defs>

  <!-- Blue Coil (Bottom) -->
  <g filter="url(#shadow)" transform="translate(15, 60)">
    <ellipse cx="135" cy="95" rx="110" ry="50" fill="url(#gradBlue)"/>
    <ellipse cx="135" cy="90" rx="105" ry="47" fill="#2563eb"/>
    <ellipse cx="135" cy="88" rx="55" ry="24" fill="#f8fafc"/>
    <ellipse cx="135" cy="92" rx="52" ry="22" fill="#1e3a8a"/>
  </g>

  <!-- Red Coil (Middle) -->
  <g filter="url(#shadow)" transform="translate(15, 30)">
    <ellipse cx="135" cy="85" rx="105" ry="47" fill="url(#gradRed)"/>
    <ellipse cx="135" cy="80" rx="100" ry="44" fill="#ef4444"/>
    <ellipse cx="135" cy="78" rx="52" ry="22" fill="#f8fafc"/>
    <ellipse cx="135" cy="82" rx="50" ry="20" fill="#991b1b"/>
  </g>

  <!-- Yellow Coil (Top) -->
  <g filter="url(#shadow)" transform="translate(15, 0)">
    <ellipse cx="135" cy="75" rx="100" ry="45" fill="url(#gradYellow)"/>
    <ellipse cx="135" cy="70" rx="95" ry="42" fill="#fde047"/>
    <ellipse cx="135" cy="68" rx="50" ry="21" fill="#f8fafc"/>
    <ellipse cx="135" cy="72" rx="47" ry="19" fill="#b45309"/>
  </g>

  <!-- Binding Straps -->
  <rect x="140" y="60" width="16" height="105" rx="3" fill="#ffffff" opacity="0.85" filter="url(#shadow)"/>
  <rect x="60" y="80" width="16" height="90" rx="3" fill="#ffffff" opacity="0.85" transform="rotate(-25 60 80)"/>
  <rect x="220" y="80" width="16" height="90" rx="3" fill="#ffffff" opacity="0.85" transform="rotate(25 220 80)"/>

  <!-- Exposed Wire Tip with Copper Core -->
  <path d="M 230 110 C 255 100 270 120 280 115" stroke="url(#gradYellow)" stroke-width="14" stroke-linecap="round" fill="none" filter="url(#shadow)"/>
  <circle cx="280" cy="115" r="5" fill="url(#copper)"/>
</svg>`;

// 2. cat-day-cap-dien.svg (Dây cáp điện công nghiệp lõi đồng)
const svgCatDayCap = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 240" width="100%" height="100%">
  <defs>
    <filter id="shadowCap" x="-10%" y="-10%" width="120%" height="130%">
      <feDropShadow dx="0" dy="8" stdDeviation="8" flood-opacity="0.2"/>
    </filter>
    <linearGradient id="blackSheath" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#475569"/>
      <stop offset="30%" stop-color="#1e293b"/>
      <stop offset="100%" stop-color="#0f172a"/>
    </linearGradient>
    <linearGradient id="copperGlow" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#f59e0b"/>
      <stop offset="40%" stop-color="#d97706"/>
      <stop offset="70%" stop-color="#fcd34d"/>
      <stop offset="100%" stop-color="#92400e"/>
    </linearGradient>
  </defs>

  <!-- Heavy Outer Cable Sheath (Black Cylindrical Cable) -->
  <g filter="url(#shadowCap)">
    <path d="M 120 50 L 250 140 C 265 150 265 175 245 188 L 115 98 Z" fill="url(#blackSheath)"/>
    <ellipse cx="115" cy="74" rx="25" ry="38" transform="rotate(-40 115 74)" fill="#0f172a" stroke="#64748b" stroke-width="2"/>
    <ellipse cx="115" cy="74" rx="21" ry="34" transform="rotate(-40 115 74)" fill="#334155"/>
  </g>

  <!-- 4 Colored Inner Core Cables protruding -->
  <path d="M 105 55 L 75 35" stroke="#2563eb" stroke-width="22" stroke-linecap="round"/>
  <path d="M 90 75 L 55 55" stroke="#dc2626" stroke-width="22" stroke-linecap="round"/>
  <path d="M 125 75 L 85 50" stroke="#f59e0b" stroke-width="22" stroke-linecap="round"/>
  <path d="M 115 95 L 75 70" stroke="#16a34a" stroke-width="22" stroke-linecap="round"/>

  <!-- Exposed Multi-strand Copper Conductor Bundles -->
  <g filter="url(#shadowCap)">
    <path d="M 75 35 L 45 15" stroke="url(#copperGlow)" stroke-width="16" stroke-linecap="round"/>
    <path d="M 55 55 L 25 35" stroke="url(#copperGlow)" stroke-width="16" stroke-linecap="round"/>
    <path d="M 85 50 L 55 30" stroke="url(#copperGlow)" stroke-width="16" stroke-linecap="round"/>
    <path d="M 75 70 L 45 50" stroke="url(#copperGlow)" stroke-width="16" stroke-linecap="round"/>
    <circle cx="45" cy="15" r="8" fill="#fbbf24"/>
    <circle cx="25" cy="35" r="8" fill="#fbbf24"/>
    <circle cx="55" cy="30" r="8" fill="#fbbf24"/>
    <circle cx="45" cy="50" r="8" fill="#fbbf24"/>
  </g>
</svg>`;

// 3. cat-thiet-bi-dien.svg / prod-aptomat-63a.svg (Aptomat 2P trắng)
const svgCatAptomat = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 240" width="100%" height="100%">
  <defs>
    <filter id="mcbShadow" x="-10%" y="-10%" width="120%" height="130%">
      <feDropShadow dx="0" dy="10" stdDeviation="10" flood-opacity="0.15"/>
    </filter>
    <linearGradient id="whiteBody" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#ffffff"/>
      <stop offset="60%" stop-color="#f8fafc"/>
      <stop offset="100%" stop-color="#e2e8f0"/>
    </linearGradient>
    <linearGradient id="toggleGrad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#ef4444"/>
      <stop offset="50%" stop-color="#dc2626"/>
      <stop offset="100%" stop-color="#991b1b"/>
    </linearGradient>
  </defs>

  <g filter="url(#mcbShadow)" transform="translate(75, 20)">
    <rect x="0" y="0" width="150" height="200" rx="12" fill="url(#whiteBody)" stroke="#cbd5e1" stroke-width="2"/>
    <line x1="75" y1="0" x2="75" y2="200" stroke="#cbd5e1" stroke-width="2"/>

    <circle cx="37" cy="25" r="14" fill="#f1f5f9" stroke="#94a3b8" stroke-width="2"/>
    <circle cx="113" cy="25" r="14" fill="#f1f5f9" stroke="#94a3b8" stroke-width="2"/>
    <rect x="30" y="23" width="14" height="4" fill="#64748b" rx="2"/>
    <rect x="106" y="23" width="14" height="4" fill="#64748b" rx="2"/>

    <rect x="25" y="70" width="100" height="60" rx="8" fill="#e2e8f0" stroke="#cbd5e1" stroke-width="1.5"/>
    <rect x="35" y="80" width="80" height="35" rx="6" fill="url(#toggleGrad)" filter="url(#mcbShadow)"/>
    <rect x="40" y="85" width="70" height="8" rx="4" fill="#f87171" opacity="0.7"/>
    <text x="75" y="103" fill="#ffffff" font-family="Arial, sans-serif" font-size="10" font-weight="bold" text-anchor="middle">I • ON</text>

    <rect x="30" y="140" width="15" height="10" rx="2" fill="#ef4444" stroke="#cbd5e1" stroke-width="1"/>
    <rect x="105" y="140" width="15" height="10" rx="2" fill="#ef4444" stroke="#cbd5e1" stroke-width="1"/>

    <text x="75" y="152" fill="#0f172a" font-family="Arial, sans-serif" font-size="12" font-weight="900" text-anchor="middle">C63</text>
    <text x="75" y="165" fill="#64748b" font-family="Arial, sans-serif" font-size="8" font-weight="bold" text-anchor="middle">400V~ 6000A</text>
    <text x="75" y="175" fill="#dc2626" font-family="Arial, sans-serif" font-size="8" font-weight="bold" text-anchor="middle">ĐIỆN VIỆT</text>

    <circle cx="37" cy="182" r="12" fill="#f1f5f9" stroke="#94a3b8" stroke-width="2"/>
    <circle cx="113" cy="182" r="12" fill="#f1f5f9" stroke="#94a3b8" stroke-width="2"/>
    <rect x="31" y="180" width="12" height="4" fill="#64748b" rx="2"/>
    <rect x="107" y="180" width="12" height="4" fill="#64748b" rx="2"/>
  </g>
</svg>`;

// 4. cat-o-cam-cong-tac.svg (Ổ cắm 3 chấu & công tắc)
const svgCatOCam = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 240" width="100%" height="100%">
  <defs>
    <filter id="plateShadow" x="-10%" y="-10%" width="120%" height="130%">
      <feDropShadow dx="0" dy="8" stdDeviation="10" flood-opacity="0.15"/>
    </filter>
    <linearGradient id="plateGrad" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#ffffff"/>
      <stop offset="100%" stop-color="#f1f5f9"/>
    </linearGradient>
  </defs>

  <g filter="url(#plateShadow)" transform="translate(60, 30)">
    <rect x="0" y="0" width="180" height="180" rx="20" fill="url(#plateGrad)" stroke="#e2e8f0" stroke-width="3"/>
    <rect x="8" y="8" width="164" height="164" rx="14" fill="none" stroke="#cbd5e1" stroke-width="1"/>

    <g transform="translate(25, 30)">
      <rect x="0" y="0" width="55" height="120" rx="8" fill="#ffffff" stroke="#cbd5e1" stroke-width="2" filter="url(#plateShadow)"/>
      <line x1="5" y1="60" x2="50" y2="60" stroke="#e2e8f0" stroke-width="2"/>
      <circle cx="27" cy="25" r="3.5" fill="#ef4444"/>
    </g>

    <g transform="translate(100, 30)">
      <rect x="0" y="0" width="55" height="120" rx="8" fill="#ffffff" stroke="#cbd5e1" stroke-width="2"/>
      <circle cx="27" cy="45" r="4" fill="#334155"/>
      <rect x="14" y="75" width="8" height="16" rx="2" fill="#dc2626"/>
      <rect x="33" y="75" width="8" height="16" rx="2" fill="#dc2626"/>
    </g>

    <text x="90" y="170" fill="#94a3b8" font-family="Arial, sans-serif" font-size="8" font-weight="bold" text-anchor="middle">ĐIỆN VIỆT 16A 250V~</text>
  </g>
</svg>`;

// 5. cat-phu-kien-dien.svg (Đầu cosse, phụ kiện điện nhiều màu)
const svgCatPhuKien = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 240" width="100%" height="100%">
  <defs>
    <filter id="pkShadow" x="-10%" y="-10%" width="120%" height="130%">
      <feDropShadow dx="0" dy="6" stdDeviation="6" flood-opacity="0.2"/>
    </filter>
  </defs>

  <g filter="url(#pkShadow)" transform="translate(50, 40) rotate(-15)">
    <rect x="0" y="40" width="30" height="70" rx="6" fill="#ef4444"/>
    <path d="M -5 10 L 35 10 L 35 40 L -5 40 Z" fill="#cbd5e1" stroke="#94a3b8" stroke-width="1.5"/>
    <path d="M 5 0 C 5 15 25 15 25 0 L 25 -10 L 5 -10 Z" fill="#cbd5e1"/>
  </g>

  <g filter="url(#pkShadow)" transform="translate(140, 50)">
    <rect x="0" y="40" width="30" height="70" rx="6" fill="#2563eb"/>
    <path d="M 5 40 L 5 20 L 25 20 L 25 40 Z" fill="#cbd5e1"/>
    <circle cx="15" cy="0" r="18" fill="#cbd5e1" stroke="#94a3b8" stroke-width="1.5"/>
    <circle cx="15" cy="0" r="8" fill="#ffffff"/>
  </g>

  <g filter="url(#pkShadow)" transform="translate(220, 60) rotate(15)">
    <rect x="0" y="40" width="30" height="70" rx="6" fill="#f59e0b"/>
    <rect x="8" y="-15" width="14" height="55" rx="3" fill="#cbd5e1" stroke="#94a3b8" stroke-width="1.5"/>
  </g>

  <g filter="url(#pkShadow)" transform="translate(80, 150)">
    <polygon points="15,0 0,40 30,40" fill="#f97316"/>
    <polygon points="65,0 50,40 80,40" fill="#ef4444"/>
    <polygon points="115,0 100,40 130,40" fill="#3b82f6"/>
  </g>
</svg>`;

// 6. cat-den-chieu-sang.svg (Đèn LED âm trần tròn)
const svgCatDen = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 240" width="100%" height="100%">
  <defs>
    <filter id="ledGlow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="8" stdDeviation="12" flood-color="#fef08a" flood-opacity="0.5"/>
      <feDropShadow dx="0" dy="6" stdDeviation="8" flood-opacity="0.15"/>
    </filter>
    <radialGradient id="lensGlow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#ffffff"/>
      <stop offset="75%" stop-color="#fefce8"/>
      <stop offset="100%" stop-color="#fef08a"/>
    </radialGradient>
    <linearGradient id="aluBezel" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#ffffff"/>
      <stop offset="50%" stop-color="#f1f5f9"/>
      <stop offset="100%" stop-color="#cbd5e1"/>
    </linearGradient>
  </defs>

  <g filter="url(#ledGlow)" transform="translate(150, 120)">
    <path d="M -105 -20 L -125 -40 L -115 -45" stroke="#f97316" stroke-width="6" stroke-linecap="round" fill="none"/>
    <path d="M 105 -20 L 125 -40 L 115 -45" stroke="#f97316" stroke-width="6" stroke-linecap="round" fill="none"/>

    <circle cx="0" cy="0" r="95" fill="url(#aluBezel)" stroke="#e2e8f0" stroke-width="3"/>
    <circle cx="0" cy="0" r="82" fill="#ffffff" stroke="#cbd5e1" stroke-width="1.5"/>
    <circle cx="0" cy="0" r="75" fill="url(#lensGlow)"/>
    <circle cx="0" cy="0" r="68" fill="none" stroke="#ffffff" stroke-width="2" opacity="0.8"/>
    <text x="0" y="5" fill="#a16207" font-family="Arial, sans-serif" font-size="10" font-weight="bold" text-anchor="middle" opacity="0.7">ĐIỆN VIỆT 9W</text>
  </g>
</svg>`;

// 7. prod-day-cadivi.svg (Dây Cadivi 2.5mm vàng)
const svgProdCadivi = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 240" width="100%" height="100%">
  <defs>
    <filter id="pShadow" x="-10%" y="-10%" width="120%" height="130%">
      <feDropShadow dx="0" dy="8" stdDeviation="8" flood-opacity="0.18"/>
    </filter>
    <linearGradient id="cadiviYellow" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#fef08a"/>
      <stop offset="40%" stop-color="#eab308"/>
      <stop offset="100%" stop-color="#a16207"/>
    </linearGradient>
    <linearGradient id="pureCopper" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#f59e0b"/>
      <stop offset="50%" stop-color="#d97706"/>
      <stop offset="100%" stop-color="#b45309"/>
    </linearGradient>
  </defs>

  <g filter="url(#pShadow)" transform="translate(150, 115)">
    <ellipse cx="0" cy="0" rx="110" ry="60" fill="url(#cadiviYellow)"/>
    <ellipse cx="0" cy="-5" rx="106" ry="56" fill="#fde047"/>
    <ellipse cx="0" cy="-5" rx="52" ry="28" fill="#ffffff"/>
    <ellipse cx="0" cy="0" rx="50" ry="26" fill="#ca8a04"/>

    <rect x="-55" y="-45" width="16" height="75" rx="3" fill="#ffffff" opacity="0.9" transform="rotate(-20 -55 -45)" filter="url(#pShadow)"/>
    <rect x="45" y="-50" width="16" height="75" rx="3" fill="#ffffff" opacity="0.9" transform="rotate(20 45 -50)" filter="url(#pShadow)"/>
    <rect x="-8" y="-55" width="16" height="105" rx="3" fill="#ffffff" opacity="0.95" filter="url(#pShadow)"/>

    <rect x="-35" y="-10" width="70" height="30" rx="5" fill="#dc2626" filter="url(#pShadow)"/>
    <text x="0" y="6" fill="#ffffff" font-family="Arial, sans-serif" font-size="10" font-weight="900" text-anchor="middle">CADIVI 2.5</text>
    <text x="0" y="15" fill="#fef08a" font-family="Arial, sans-serif" font-size="6" font-weight="bold" text-anchor="middle">100M • CU/PVC</text>

    <path d="M 80 20 C 110 30 120 10 135 15" stroke="url(#cadiviYellow)" stroke-width="14" stroke-linecap="round" fill="none" filter="url(#pShadow)"/>
    <circle cx="135" cy="15" r="5" fill="url(#pureCopper)"/>
  </g>
</svg>`;

// 8. prod-cap-cvv.svg (Cáp điện CVV 3x1.5mm đen)
const svgProdCvv = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 240" width="100%" height="100%">
  <defs>
    <filter id="cvvShadow" x="-10%" y="-10%" width="120%" height="130%">
      <feDropShadow dx="0" dy="8" stdDeviation="8" flood-opacity="0.25"/>
    </filter>
    <linearGradient id="cvvBlack" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#64748b"/>
      <stop offset="35%" stop-color="#1e293b"/>
      <stop offset="100%" stop-color="#090d16"/>
    </linearGradient>
  </defs>

  <g filter="url(#cvvShadow)" transform="translate(150, 115)">
    <ellipse cx="0" cy="0" rx="112" ry="62" fill="url(#cvvBlack)"/>
    <ellipse cx="0" cy="-6" rx="108" ry="58" fill="#334155"/>
    <ellipse cx="0" cy="-6" rx="54" ry="28" fill="#ffffff"/>
    <ellipse cx="0" cy="0" rx="52" ry="26" fill="#0f172a"/>

    <rect x="-8" y="-58" width="18" height="110" rx="3" fill="#fbbf24" filter="url(#cvvShadow)"/>
    <text x="1" y="-3" fill="#0f172a" font-family="Arial, sans-serif" font-size="7" font-weight="900" text-anchor="middle" transform="rotate(90 1 -3)">CVV 3x1.5mm</text>

    <path d="M 85 25 C 110 35 125 15 135 20" stroke="url(#cvvBlack)" stroke-width="18" stroke-linecap="round" fill="none" filter="url(#cvvShadow)"/>
    <circle cx="133" cy="18" r="3.5" fill="#ef4444"/>
    <circle cx="138" cy="22" r="3.5" fill="#f59e0b"/>
    <circle cx="133" cy="26" r="3.5" fill="#3b82f6"/>
  </g>
</svg>`;

// 9. prod-day-ls.svg (Dây điện LS 1.5mm đỏ)
const svgProdLs = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 240" width="100%" height="100%">
  <defs>
    <filter id="lsShadow" x="-10%" y="-10%" width="120%" height="130%">
      <feDropShadow dx="0" dy="8" stdDeviation="8" flood-opacity="0.2"/>
    </filter>
    <linearGradient id="lsRed" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#f87171"/>
      <stop offset="40%" stop-color="#dc2626"/>
      <stop offset="100%" stop-color="#7f1d1d"/>
    </linearGradient>
  </defs>

  <g filter="url(#lsShadow)" transform="translate(150, 115)">
    <ellipse cx="0" cy="0" rx="108" ry="58" fill="url(#lsRed)"/>
    <ellipse cx="0" cy="-5" rx="104" ry="54" fill="#ef4444"/>
    <ellipse cx="0" cy="-5" rx="50" ry="26" fill="#ffffff"/>
    <ellipse cx="0" cy="0" rx="48" ry="24" fill="#991b1b"/>

    <rect x="-8" y="-55" width="16" height="105" rx="3" fill="#ffffff" opacity="0.95" filter="url(#lsShadow)"/>
    <rect x="-30" y="-8" width="60" height="26" rx="5" fill="#0f172a" filter="url(#lsShadow)"/>
    <text x="0" y="6" fill="#ffffff" font-family="Arial, sans-serif" font-size="9" font-weight="900" text-anchor="middle">LS VINA 1.5</text>
    <text x="0" y="14" fill="#f87171" font-family="Arial, sans-serif" font-size="5.5" font-weight="bold" text-anchor="middle">100M • 450/750V</text>

    <path d="M 80 20 C 110 30 120 10 135 15" stroke="url(#lsRed)" stroke-width="12" stroke-linecap="round" fill="none" filter="url(#lsShadow)"/>
    <circle cx="135" cy="15" r="4.5" fill="#f59e0b"/>
  </g>
</svg>`;

// 10. prod-mang-cap.svg (Máng cáp điện 40x60 trắng)
const svgProdMangCap = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 240" width="100%" height="100%">
  <defs>
    <filter id="trunkShadow" x="-10%" y="-10%" width="120%" height="130%">
      <feDropShadow dx="0" dy="8" stdDeviation="8" flood-opacity="0.15"/>
    </filter>
    <linearGradient id="pvcWhite" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#ffffff"/>
      <stop offset="70%" stop-color="#f8fafc"/>
      <stop offset="100%" stop-color="#cbd5e1"/>
    </linearGradient>
  </defs>

  <g filter="url(#trunkShadow)" transform="translate(50, 45) rotate(-20)">
    <path d="M 0 60 L 180 60 L 180 130 L 0 130 Z" fill="url(#pvcWhite)" stroke="#94a3b8" stroke-width="2"/>
    <path d="M 0 60 L -30 90 L -30 160 L 0 130 Z" fill="#94a3b8"/>
    <path d="M -25 95 L -5 75 L -5 125 L -25 145 Z" fill="#334155"/>
    
    <path d="M 20 45 L 200 45 L 200 65 L 20 65 Z" fill="#ffffff" stroke="#cbd5e1" stroke-width="2" filter="url(#trunkShadow)"/>
    <path d="M -10 75 L 20 45 L 20 65 L -10 95 Z" fill="#cbd5e1"/>
    
    <text x="100" y="105" fill="#64748b" font-family="Arial, sans-serif" font-size="10" font-weight="bold">ĐIỆN VIỆT 40x60 PVC</text>
  </g>
</svg>`;

fs.writeFileSync(path.join(dir, 'cat-day-dien.svg'), svgCatDayDien);
fs.writeFileSync(path.join(dir, 'cat-day-cap-dien.svg'), svgCatDayCap);
fs.writeFileSync(path.join(dir, 'cat-thiet-bi-dien.svg'), svgCatAptomat);
fs.writeFileSync(path.join(dir, 'cat-o-cam-cong-tac.svg'), svgCatOCam);
fs.writeFileSync(path.join(dir, 'cat-phu-kien-dien.svg'), svgCatPhuKien);
fs.writeFileSync(path.join(dir, 'cat-den-chieu-sang.svg'), svgCatDen);

fs.writeFileSync(path.join(dir, 'prod-day-cadivi.svg'), svgProdCadivi);
fs.writeFileSync(path.join(dir, 'prod-cap-cvv.svg'), svgProdCvv);
fs.writeFileSync(path.join(dir, 'prod-aptomat-63a.svg'), svgCatAptomat);
fs.writeFileSync(path.join(dir, 'prod-day-ls.svg'), svgProdLs);
fs.writeFileSync(path.join(dir, 'prod-mang-cap.svg'), svgProdMangCap);

console.log('All 10 SVG product & category assets created successfully!');

