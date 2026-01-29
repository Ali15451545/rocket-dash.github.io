const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
const shieldUi = document.getElementById('shield-ui');
const warpUi = document.getElementById('warp-ui');
const menuBox = document.querySelector('.pixel-box');
const resumeBtn = document.getElementById('resume-btn');
const backBtn = document.getElementById('back-btn');
const startBtn = document.getElementById('start-btn');
const skinBtn = document.getElementById('skin-btn');
const menuTitle = document.getElementById('menu-title');
const highScoreText = document.getElementById('high-score-text');
const hintText = document.getElementById('hint-text');

let width, height, rocket, pipes, stars, frame, score, state;
let bodyColor = '#ffffff', trail = [], lastShieldScore = 0, consecutivePassed = 0;
let hasShield = false, shieldActive = false, shieldTimer = 0;
let hasWarp = false, warpActive = false, warpTimer = 0;
let gameSpeed = 4, highScore = localStorage.getItem('rocketBest') || 0;
let lastPipeTop = 300, introRocket;

const languages = {
    en: { title: "ROCKET DASH", start: "START MISSION", resume: "RESUME", mainMenu: "MAIN MENU", skins: "SKINS", best: "BEST", hint: "TAP ANYWHERE TO JUMP", paused: "PAUSED", failed: "FAILED", shield: "🛡️ [Q] SHIELD", warp: "⚡ [E] WARP" },
    az: { title: "ROKET DASH", start: "MİSSİYAYA BAŞLA", resume: "DAVAM ET", mainMenu: "ANA MENYU", skins: "GÖRÜNÜŞLƏR", best: "REKORD", hint: "TULLANMAQ ÜÇÜN TOXUN", paused: "DAYANDIRILDI", failed: "MİSSİYA UĞURSUZ", shield: "🛡️ [Q] QALXAN", warp: "⚡ [E] ZAMAN" },
    tr: { title: "ROKET DASH", start: "GÖREVE BAŞLA", resume: "DEVAM ET", mainMenu: "ANA MENÜ", skins: "GÖRÜNÜMLER", best: "REKOR", hint: "ZIPLAMAK İÇİN DOKUN", paused: "DURDURULDU", failed: "GÖREV BAŞARISIZ", shield: "🛡️ [Q] KALKAN", warp: "⚡ [E] ZAMAN" }
};
let currentLang = 'en';

function setLanguage(lang) { currentLang = lang; updateLanguageUI(); }
function updateLanguageUI() {
    const l = languages[currentLang];
    startBtn.innerText = l.start; resumeBtn.innerText = l.resume; backBtn.innerText = l.mainMenu; skinBtn.innerText = l.skins;
    highScoreText.innerHTML = `${l.best}: <span id="high-score-val">${highScore}</span>`;
    hintText.innerText = l.hint; shieldUi.innerText = l.shield; warpUi.innerText = l.warp;
    if (state === 'PAUSED') menuTitle.innerText = l.paused; else if (state === 'GAMEOVER') menuTitle.innerText = l.failed; else menuTitle.innerText = l.title;
}

function init() {
    width = canvas.width = window.innerWidth; height = canvas.height = window.innerHeight;
    state = 'INTRO';
    rocket = { x: width * 0.15, y: height / 2, w: 60, h: 40, v: 0, gravity: 0.25, jump: -6.5, angle: 0 };
    pipes = []; stars = []; trail = []; frame = 0; score = 0; consecutivePassed = 0;
    gameSpeed = 4; lastPipeTop = height / 2;
    stars = Array.from({ length: 60 }, () => ({ x: Math.random() * width, y: Math.random() * height, v: Math.random() * 2 + 1, s: 2 }));
    introRocket = { x: -100, y: height + 100, angle: -Math.PI * 2, scale: 0.4, complete: false };
    updateLanguageUI();
}

function startNewGame() {
    score = 0; scoreEl.innerText = "0"; init(); state = 'PLAYING';
    menuBox.classList.remove('show-menu'); shieldUi.classList.add('hidden'); warpUi.classList.add('hidden');
    frame = -50;
}

function resumeGame() { state = 'PLAYING'; menuBox.classList.remove('show-menu'); }
function backToStart() { init(); menuBox.classList.remove('show-menu'); resumeBtn.classList.add('hidden'); backBtn.classList.add('hidden'); }

function drawRocket(x, y, angle, scale = 1) {
    ctx.save(); ctx.translate(x, y); ctx.scale(scale, scale); ctx.rotate(angle);
    ctx.fillStyle = "#d00"; ctx.fillRect(-25, -20, 15, 10); ctx.fillRect(-25, 10, 15, 10);
    ctx.fillStyle = bodyColor; ctx.beginPath(); ctx.ellipse(0, 0, 25, 12, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillRect(-15, -12, 15, 24); ctx.fillStyle = "#333"; ctx.beginPath(); ctx.arc(5, 0, 8, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#8df"; ctx.beginPath(); ctx.arc(5, 0, 6, 0, Math.PI * 2); ctx.fill();
    if (state === 'PLAYING' && frame % 4 < 2) { ctx.fillStyle = "#f90"; ctx.fillRect(-35, -6, 15, 12); }
    if (shieldActive) { ctx.beginPath(); ctx.arc(0, 0, 42, 0, Math.PI * 2); ctx.strokeStyle = "#0ff"; ctx.lineWidth = 3; ctx.stroke(); }
    ctx.restore();
}

function update() {
    stars.forEach(s => { let sS = warpActive ? s.v * 0.4 : s.v; s.x -= sS; if (s.x < 0) s.x = width; });
    if (state === 'INTRO') {
        let tx = width * 0.15 + 30, ty = height / 2;
        introRocket.x += (tx - introRocket.x) * 0.04; introRocket.y += (ty - introRocket.y) * 0.04;
        introRocket.angle += 0.1; introRocket.scale += (1 - introRocket.scale) * 0.04;
        if (Math.abs(tx - introRocket.x) < 2) { state = 'MENU'; menuBox.classList.add('show-menu'); }
    }
    if (state === 'PLAYING') {
        let cG = warpActive ? rocket.gravity * 0.4 : rocket.gravity; rocket.v += cG; rocket.y += rocket.v;
        rocket.angle = Math.min(Math.PI / 4, Math.max(-Math.PI / 6, rocket.v * 0.1));
        if (score > 0 && score % 10 === 0 && score !== lastShieldScore && !shieldActive) { hasShield = true; lastShieldScore = score; shieldUi.classList.remove('hidden'); }
        if (shieldActive) { shieldTimer--; if (shieldTimer <= 0) shieldActive = false; }
        if (warpActive) { warpTimer--; if (warpTimer <= 0) warpActive = false; }
        if (frame > 0 && frame % 100 === 0) {
            let gap = 190; let minT = Math.max(100, lastPipeTop - 150); let maxT = Math.min(height - gap - 100, lastPipeTop + 150);
            let top = Math.random() * (maxT - minT) + minT; lastPipeTop = top; pipes.push({ x: width, top, gap, passed: false });
        }
        let cS = warpActive ? gameSpeed * 0.4 : gameSpeed;
        pipes.forEach((p, i) => {
            p.x -= cS;
            if (rocket.x < p.x + 60 && rocket.x + 50 > p.x && (rocket.y < p.top || rocket.y + 30 > p.top + p.gap)) {
                if (!shieldActive) { state = 'GAMEOVER'; if (score > highScore) localStorage.setItem('rocketBest', score); updateLanguageUI(); resumeBtn.classList.add('hidden'); backBtn.classList.remove('hidden'); menuBox.classList.add('show-menu'); }
            }
            if (!p.passed && p.x < rocket.x) { p.passed = true; score++; scoreEl.innerText = score; consecutivePassed++; if (consecutivePassed >= 5 && !hasWarp) { hasWarp = true; warpUi.classList.remove('hidden'); } }
            if (p.x < -80) pipes.splice(i, 1);
        });
        frame++;
    }
}

function draw() {
    ctx.fillStyle = warpActive ? "#010a15" : "#020208"; ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = "#fff"; stars.forEach(s => ctx.fillRect(s.x, s.y, s.s, s.s));
    pipes.forEach(p => { ctx.fillStyle = warpActive ? "#08f" : "#0c4"; ctx.fillRect(p.x, 0, 60, p.top); ctx.fillRect(p.x, p.top + p.gap, 60, height); ctx.strokeStyle = "#000"; ctx.lineWidth = 3; ctx.strokeRect(p.x, 0, 60, p.top); ctx.strokeRect(p.x, p.top + p.gap, 60, height); });
    if (state === 'INTRO') drawRocket(introRocket.x, introRocket.y, introRocket.angle, introRocket.scale);
    else if (state === 'PLAYING') drawRocket(rocket.x + 30, rocket.y + 20, rocket.angle);
    else drawRocket(width * 0.15 + 30, height / 2, 0);
    update(); requestAnimationFrame(draw);
}

const handleAction = (e) => {
    if (e && e.type === 'keydown' && e.code !== 'Space') return;
    if (e) e.preventDefault();
    if (state === 'PLAYING') {
        // Warp Drive aktiv olanda tullanma gücü 40% azalır
        let jumpPower = warpActive ? rocket.jump * 0.6 : rocket.jump;
        rocket.v = jumpPower;
    }
};

window.addEventListener('keydown', (e) => {
    if (e.code === 'Space') handleAction(e);
    if (e.code === 'KeyQ' && hasShield) { shieldActive = true; hasShield = false; shieldTimer = 180; shieldUi.classList.add('hidden'); }
    if (e.code === 'KeyE' && hasWarp) { warpActive = true; hasWarp = false; warpTimer = 180; consecutivePassed = 0; warpUi.classList.add('hidden'); }
    if (e.code === 'Escape') { if (state === 'PLAYING') { state = 'PAUSED'; updateLanguageUI(); resumeBtn.classList.remove('hidden'); backBtn.classList.remove('hidden'); menuBox.classList.add('show-menu'); } else if (state === 'PAUSED') resumeGame(); }
});
canvas.addEventListener('touchstart', handleAction, { passive: false });
canvas.addEventListener('mousedown', (e) => { if (e.button === 0 && state === 'PLAYING') handleAction(e); });
function setSkin(c) { bodyColor = c; }
function toggleSkins() { document.getElementById('skin-panel').classList.toggle('hidden'); }
init(); draw();