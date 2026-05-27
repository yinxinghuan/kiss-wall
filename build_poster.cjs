// Build the poster HTML by evaluating the template, then write it to
// public/_poster.html. The dev server serves it for chrome-devtools to
// screenshot at 1024×1024.

const fs = require('fs');
const path = require('path');

const KISSES = [
  { x: 50, y: 23, r: 12,  s: 1.05 },
  { x: 40, y: 33, r: -8,  s: 0.95 },
  { x: 60, y: 33, r: 6,   s: 1.00 },
  { x: 50, y: 45, r: -3,  s: 1.10 },
  { x: 40, y: 56, r: 10,  s: 0.92 },
  { x: 60, y: 56, r: -7,  s: 0.98 },
  { x: 50, y: 67, r: 4,   s: 1.03 },
  { x: 38, y: 76, r: -11, s: 0.90 },
  { x: 62, y: 76, r: 8,   s: 0.96 },
];

const KISS_SVG = (k) => `
  <svg class="kiss" viewBox="0 0 100 60" preserveAspectRatio="xMidYMid meet"
       style="left:${k.x}%; top:${k.y}%; transform:translate(-50%,-50%) rotate(${k.r}deg) scale(${k.s});">
    <g fill="#f5b1c7">
      <path d="M 50 16 C 44 6 34 6 26 10 C 14 16 8 26 14 32 Q 22 36 32 34 Q 42 33 50 33 Q 58 33 68 34 Q 78 36 86 32 C 92 26 86 16 74 10 C 66 6 56 6 50 16 Z"/>
      <path d="M 22 36 Q 18 42 22 48 Q 32 56 50 56 Q 68 56 78 48 Q 82 42 78 36 Q 70 34 50 34 Q 30 34 22 36 Z"/>
    </g>
  </svg>`;

const kissesHTML = KISSES.map(KISS_SVG).join('');

const HTML = `<!doctype html><html><head><meta charset=utf-8>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@500;700&family=Montserrat:wght@600&family=Cormorant+Garamond:ital,wght@0,500;1,500;1,700&display=swap">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { background: #07070a; font-family: 'Inter', sans-serif; }
  .poster {
    width: 1024px; height: 1024px;
    position: relative;
    overflow: hidden;
    background: radial-gradient(ellipse at 50% 30%, #11111a 0%, #07070a 78%);
  }
  .stele {
    position: absolute;
    left: 50%;
    top: 56%;
    transform: translate(-50%, -50%);
    width: 560px;
    aspect-ratio: 2 / 3;
    border-radius: 22px;
    overflow: hidden;
    box-shadow:
      0 32px 80px rgba(0,0,0,0.7),
      0 0 0 1px rgba(245,177,199,0.06),
      inset 0 0 60px rgba(0,0,0,0.6);
  }
  .stele svg.bg { position: absolute; inset: 0; width: 100%; height: 100%; }
  .stele .kisses { position: absolute; inset: 0; }
  .kiss {
    position: absolute;
    width: 130px;
    height: 78px;
    transform-origin: 50% 50%;
    filter: drop-shadow(0 2px 2px rgba(0,0,0,0.5));
  }
  .epitaph {
    position: absolute;
    left: 8%; right: 8%; bottom: 8%;
    font-family: 'Cormorant Garamond', serif;
    font-style: italic;
    font-weight: 500;
    font-size: 28px;
    line-height: 1.32;
    color: #f5b1c7;
    text-align: center;
    letter-spacing: 0.01em;
    text-shadow: 0 1px 2px rgba(0,0,0,0.7);
  }
  .top {
    position: absolute;
    top: 56px;
    left: 0; right: 0;
    text-align: center;
    z-index: 3;
  }
  .brand-tag {
    font-family: 'Montserrat', sans-serif;
    font-weight: 600;
    font-size: 13px;
    letter-spacing: 0.46em;
    color: rgba(245, 177, 199, 0.7);
    text-transform: uppercase;
    margin-bottom: 14px;
  }
  .title {
    font-family: 'Cormorant Garamond', serif;
    font-style: italic;
    font-weight: 500;
    font-size: 94px;
    line-height: 0.94;
    color: #f5b1c7;
    letter-spacing: 0.005em;
    text-shadow: 0 0 24px rgba(245,177,199,0.18);
  }
  .pitch {
    font-family: 'Cormorant Garamond', serif;
    font-style: italic;
    font-weight: 500;
    font-size: 24px;
    color: rgba(240, 238, 219, 0.85);
    margin-top: 10px;
  }
  .emblem {
    position: absolute;
    right: 36px; bottom: 28px;
    width: 56px; height: auto;
    opacity: 0.5;
  }
</style>
</head>
<body>
  <div class="poster">
    <div class="top">
      <div class="brand-tag">AlterU · After Dark</div>
      <div class="title">Kiss<br/>Wall.</div>
      <div class="pitch">leave a mark.</div>
    </div>

    <div class="stele">
      <svg class="bg" viewBox="0 0 200 300" preserveAspectRatio="none">
        <defs>
          <linearGradient id="sheen" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stop-color="#1a1a1f"/>
            <stop offset="0.45" stop-color="#0e0e12"/>
            <stop offset="1" stop-color="#050507"/>
          </linearGradient>
          <linearGradient id="side" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stop-color="rgba(255,255,255,0.08)"/>
            <stop offset="0.18" stop-color="rgba(255,255,255,0.0)"/>
            <stop offset="0.82" stop-color="rgba(255,255,255,0.0)"/>
            <stop offset="1" stop-color="rgba(0,0,0,0.35)"/>
          </linearGradient>
          <radialGradient id="brush" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stop-color="rgba(255,255,255,0.62)"/>
            <stop offset="55%" stop-color="rgba(255,255,255,0.22)"/>
            <stop offset="100%" stop-color="rgba(255,255,255,0)"/>
          </radialGradient>
          <mask id="reveal" maskUnits="userSpaceOnUse">
            <rect width="200" height="300" fill="black"/>
            <circle cx="100" cy="70"  r="34" fill="url(#brush)"/>
            <circle cx="78"  cy="100" r="34" fill="url(#brush)"/>
            <circle cx="122" cy="100" r="34" fill="url(#brush)"/>
            <circle cx="100" cy="140" r="34" fill="url(#brush)"/>
            <circle cx="78"  cy="170" r="34" fill="url(#brush)"/>
            <circle cx="122" cy="170" r="34" fill="url(#brush)"/>
            <circle cx="100" cy="200" r="34" fill="url(#brush)"/>
            <circle cx="78"  cy="230" r="34" fill="url(#brush)"/>
            <circle cx="122" cy="230" r="34" fill="url(#brush)"/>
          </mask>
        </defs>
        <rect x="0" y="0" width="200" height="300" rx="10" ry="10" fill="url(#sheen)"/>
        <rect x="0" y="0" width="200" height="300" rx="10" ry="10" fill="url(#side)"/>
        <g mask="url(#reveal)" fill="#f0eedb">
          <path d="M 100 30 Q 70 30 60 56 Q 50 78 60 96 Q 50 108 56 124 Q 64 138 80 138 Q 76 152 92 156 Q 100 160 108 156 Q 122 152 120 138 Q 138 138 144 122 Q 150 108 142 94 Q 152 78 140 56 Q 130 30 100 30 Z"/>
          <path d="M 78 138 Q 70 152 80 162 Q 88 156 92 144 Z"/>
          <path d="M 122 138 Q 130 152 120 162 Q 112 156 108 144 Z"/>
          <path d="M 96 158 L 96 278 L 104 278 L 104 158 Z"/>
          <path d="M 96 200 Q 60 196 50 220 Q 70 230 96 218 Z"/>
          <path d="M 104 240 Q 140 236 150 260 Q 130 270 104 258 Z"/>
        </g>
        <line x1="20" y1="262" x2="180" y2="262" stroke="rgba(245,177,199,0.18)" stroke-width="0.5"/>
      </svg>

      <div class="kisses">${kissesHTML}</div>

      <div class="epitaph">she came back forty-seven times</div>
    </div>

    <svg class="emblem" viewBox="0 0 97.0667 222" xmlns="http://www.w3.org/2000/svg">
      <path d="M85.0468 68.6857C89.8931 68.3372 93.1601 70.8457 94.9883 75.1302C98.6203 83.5735 93.4398 86.9838 89.5821 93.3247C77.9259 112.479 79.5696 137.557 77.8107 158.582C75.9991 180.258 68.5583 210.583 46.3359 219.923C39.0406 222.988 28.5835 222.371 21.4632 219.012C-15.6796 200.926 7.19538 148.103 19.5915 121.264C23.4016 114.097 27.0469 106.783 31.9739 100.277C35.5577 95.5468 41.815 92.7229 47.065 96.8266C49.4531 98.6931 50.5612 102.683 49.6297 105.517C47.5796 111.752 43.1715 117.174 40.2032 123.016C31.2711 139.71 21.6362 161.576 22.2161 180.736C22.7145 185.729 24.5092 191.949 28.7759 195.162C35.784 200.439 43.3127 197.445 47.6794 190.771C53.3557 182.09 55.4449 172.866 56.4973 162.854C57.6501 152.683 57.591 142.863 58.1069 132.61C59.061 113.735 60.1607 91.9709 72.4792 76.4435C75.5759 72.5381 79.9722 69.2317 85.0468 68.6857Z" fill="#F5B1C7"/>
      <path d="M0.9778 43.8507C1.66381 43.0206 2.31973 42.329 3.03937 41.5413C5.31662 40.4695 12.7384 44.4894 18.9151 42.7177C28.9927 39.8249 38.2824 32.6224 47.9961 20.5881C51.419 16.3468 53.9412 11.9203 57.5971 7.88917C58.93 7.20648 58.3415 7.31748 59.3472 7.73996C59.4751 8.38569 59.7135 9.08634 59.0406 10.1179C43.7743 33.5145 38.8284 51.0487 49.9265 61.3953C51.6277 62.9839 54.427 64.5373 55.9992 66.4603L54.3007 68.9972C53.518 69.6665 53.2092 70.0958 52.532 69.9077C47.8591 68.6124 43.9165 67.3595 38.5515 67.406C28.2983 67.4898 19.0238 79.2193 9.98352 91.8257C7.91465 94.7105 4.31936 100.469 1.95892 102.692C0.317895 103.246 0.904134 103.355 0 102.646C0.208833 99.6478 4.75251 93.295 6.6601 89.9653C17.7953 70.5314 17.2515 55.3282 8.06088 49.1118C6.50746 48.067 1.52931 46.022 0.9778 43.8507Z" fill="#FFFFFF"/>
    </svg>
  </div>
</body></html>`;

const out = '/Users/yin/code/games/kiss-wall/public/_poster.html';
fs.writeFileSync(out, HTML);
console.log('written:', out, 'length:', HTML.length);
