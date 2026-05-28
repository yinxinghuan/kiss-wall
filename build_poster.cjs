// Build the poster HTML for Kiss Wall.
//
// In-game lips are flat 2D emoji-style stamps (see assets/lips.tsx), but the
// POSTER uses photoreal 3D lipstick PNGs at public/lip-{1..6}.png for visual
// impact (one-shot illustration where the dramatic glossy lips read as
// "kiss-themed game" at a glance). Different aesthetics for different
// contexts — confirmed direction.
//
// PNGs are regenerated via gen_lips.py (wdabuliu API + rembg). They are
// committed to public/ so the deploy serves them too (poster URL references
// them at runtime through GH Pages).
//
// Run: node build_poster.cjs → writes public/_poster.html; vite serves it for
// chrome-devtools MCP to screenshot at 1024×1024.

const fs = require('fs');

const KISSES = [
  { x: 50, y: 22, r: 8,   s: 1.10, v: 1 },
  { x: 41, y: 30, r: -10, s: 0.95, v: 3 },
  { x: 59, y: 30, r: 6,   s: 1.00, v: 5 },
  { x: 50, y: 39, r: -4,  s: 1.12, v: 2 },
  { x: 41, y: 49, r: 12,  s: 0.92, v: 4 },
  { x: 59, y: 49, r: -8,  s: 0.97, v: 6 },
  { x: 50, y: 58, r: 5,   s: 1.05, v: 1 },
  { x: 41, y: 67, r: -12, s: 0.90, v: 3 },
  { x: 59, y: 67, r: 10,  s: 0.96, v: 2 },
  { x: 50, y: 75, r: -3,  s: 1.02, v: 5 },
];

const KISS_IMG = (k) => `
  <img class="kiss" src="lip-${k.v}.png"
       style="left:${k.x}%; top:${k.y}%; transform:translate(-50%,-50%) rotate(${k.r}deg) scale(${k.s});" />`;

const HTML = `<!doctype html><html><head><meta charset=utf-8>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@500;700&family=Montserrat:wght@600&family=Cormorant+Garamond:ital,wght@0,500;1,500;1,700&display=swap">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { background: #07070a; font-family: 'Inter', sans-serif; }
  .poster {
    width: 1024px; height: 1024px;
    position: relative;
    overflow: hidden;
    background: radial-gradient(ellipse at 50% 40%, #0d0d12 0%, #050507 78%);
  }
  .top { position: absolute; top: 64px; left: 0; right: 0; text-align: center; z-index: 3; }
  .brand-tag {
    font-family: 'Montserrat', sans-serif; font-weight: 600;
    font-size: 13px; letter-spacing: 0.46em;
    color: rgba(245, 177, 199, 0.65);
    text-transform: uppercase; margin-bottom: 14px;
  }
  .title {
    font-family: 'Cormorant Garamond', serif; font-style: italic;
    font-weight: 500; font-size: 92px; line-height: 0.96;
    color: #f5b1c7; letter-spacing: 0.005em;
    text-shadow: 0 0 24px rgba(245,177,199,0.16);
  }
  .pitch {
    font-family: 'Cormorant Garamond', serif; font-style: italic;
    font-weight: 500; font-size: 26px;
    color: rgba(240, 238, 219, 0.86); margin-top: 10px;
  }
  .stage {
    position: absolute; left: 50%; top: 56%;
    transform: translate(-50%, -50%);
    width: 560px; height: 720px;
  }
  .kiss {
    position: absolute; width: 150px; height: auto;
    transform-origin: 50% 50%;
    filter: drop-shadow(0 4px 6px rgba(0,0,0,0.7)) drop-shadow(0 0 22px rgba(245,177,199,0.18));
  }
  .epitaph {
    position: absolute; left: 12%; right: 12%; bottom: 56px;
    font-family: 'Cormorant Garamond', serif; font-style: italic;
    font-weight: 500; font-size: 28px; line-height: 1.3;
    color: #f5b1c7; text-align: center;
    text-shadow: 0 1px 2px rgba(0,0,0,0.7);
  }
  .emblem {
    position: absolute; right: 36px; bottom: 28px;
    width: 50px; height: auto; opacity: 0.5;
  }
</style>
</head>
<body>
  <div class="poster">
    <div class="top">
      <div class="brand-tag">AlterU · After Dark</div>
      <div class="title">Kiss<br/>Wall.</div>
      <div class="pitch">leave a kiss in the dark.</div>
    </div>

    <div class="stage">${KISSES.map(KISS_IMG).join('')}</div>

    <div class="epitaph">she came back forty-seven times</div>

    <svg class="emblem" viewBox="0 0 97.0667 222" xmlns="http://www.w3.org/2000/svg">
      <path d="M85.0468 68.6857C89.8931 68.3372 93.1601 70.8457 94.9883 75.1302C98.6203 83.5735 93.4398 86.9838 89.5821 93.3247C77.9259 112.479 79.5696 137.557 77.8107 158.582C75.9991 180.258 68.5583 210.583 46.3359 219.923C39.0406 222.988 28.5835 222.371 21.4632 219.012C-15.6796 200.926 7.19538 148.103 19.5915 121.264C23.4016 114.097 27.0469 106.783 31.9739 100.277C35.5577 95.5468 41.815 92.7229 47.065 96.8266C49.4531 98.6931 50.5612 102.683 49.6297 105.517C47.5796 111.752 43.1715 117.174 40.2032 123.016C31.2711 139.71 21.6362 161.576 22.2161 180.736C22.7145 185.729 24.5092 191.949 28.7759 195.162C35.784 200.439 43.3127 197.445 47.6794 190.771C53.3557 182.09 55.4449 172.866 56.4973 162.854C57.6501 152.683 57.591 142.863 58.1069 132.61C59.061 113.735 60.1607 91.9709 72.4792 76.4435C75.5759 72.5381 79.9722 69.2317 85.0468 68.6857Z" fill="#F5B1C7"/>
      <path d="M0.9778 43.8507C1.66381 43.0206 2.31973 42.329 3.03937 41.5413C5.31662 40.4695 12.7384 44.4894 18.9151 42.7177C28.9927 39.8249 38.2824 32.6224 47.9961 20.5881C51.419 16.3468 53.9412 11.9203 57.5971 7.88917C58.93 7.20648 58.3415 7.31748 59.3472 7.73996C59.4751 8.38569 59.7135 9.08634 59.0406 10.1179C43.7743 33.5145 38.8284 51.0487 49.9265 61.3953C51.6277 62.9839 54.427 64.5373 55.9992 66.4603L54.3007 68.9972C53.518 69.6665 53.2092 70.0958 52.532 69.9077C47.8591 68.6124 43.9165 67.3595 38.5515 67.406C28.2983 67.4898 19.0238 79.2193 9.98352 91.8257C7.91465 94.7105 4.31936 100.469 1.95892 102.692C0.317895 103.246 0.904134 103.355 0 102.646C0.208833 99.6478 4.75251 93.295 6.6601 89.9653C17.7953 70.5314 17.2515 55.3282 8.06088 49.1118C6.50746 48.067 1.52931 46.022 0.9778 43.8507Z" fill="#FFFFFF"/>
    </svg>
  </div>
</body></html>`;

const out = '/Users/yin/code/games/kiss-wall/public/_poster.html';
fs.writeFileSync(out, HTML);
console.log('written:', out, 'length:', HTML.length);
