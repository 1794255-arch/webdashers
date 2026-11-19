const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const menu = document.getElementById('menu');
const complete = document.getElementById('complete');
const percentText = document.getElementById('percent');
const progress = document.getElementById('progress');

let width = 0;
let height = 0;
let ground = 0;
let scale = 1;
let playing = false;
let completeShown = false;
let distance = 0;
let speed = 330;
let lastTime = 0;
let particles = [];
let cameraShake = 0;
let hue = 195;

const player = { x: 150, y: 0, size: 38, vy: 0, angle: 0, grounded: false, trail: [] };

const levelLength = 7600;
const obstacles = [];
const pads = [];
const portals = [];

// Original level layout. All artwork and code are newly created for this remake.
for (let i = 0; i < 20; i++) {
  const x = 900 + i * 310;
  obstacles.push({ type: 'spike', x, y: 0, w: 42, h: 48 });
  obstacles.push({ type: 'spike', x: x + 46, y: 0, w: 42, h: 48 });
}

[1480, 2380, 4200, 5650, 6700].forEach((x, i) => {
  obstacles.push({ type: 'block', x, y: 0, w: 75, h: i % 2 ? 75 : 115 });
});

[1250, 2050, 3350, 4550, 6100].forEach((x, i) => pads.push({ x, y: 0, w: 58, h: 14, power: i % 2 ? -760 : -690 }));
portals.push({ x: 3650, y: 0, w: 44, h: 150, kind: 'speed' });

function resize() {
  width = innerWidth;
  height = innerHeight;
  scale = Math.min(width / 1280, height / 720);
  ground = height * .75;
  canvas.width = width * devicePixelRatio;
  canvas.height = height * devicePixelRatio;
  ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
  player.size = Math.max(28, Math.min(42, 38 * scale));
  if (!playing) player.y = ground - player.size;
}

function reset() {
  distance = 0;
  speed = 330;
  cameraShake = 0;
  particles = [];
  completeShown = false;
  player.y = ground - player.size;
  player.vy = 0;
  player.angle = 0;
  player.grounded = true;
  player.trail = [];
  lastTime = performance.now();
}

function start() {
  reset();
  playing = true;
  menu.classList.add('hidden');
  complete.classList.add('hidden');
}

function die() {
  cameraShake = 14;
  burst(player.x + player.size / 2, player.y + player.size / 2, '#ff4f78', 28);
  setTimeout(reset, 280);
}

function jump() {
  if (!playing) return;
  if (player.grounded) {
    player.vy = -760 * scale;
    player.grounded = false;
  }
}

function burst(x, y, color, amount) {
  for (let i = 0; i < amount; i++) {
    const a = Math.random() * Math.PI * 2;
    const s = 100 + Math.random() * 260;
    particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 0.5 + Math.random() * .5, color, size: 3 + Math.random() * 8 });
  }
}

function rectsOverlap(ax, ay, aw, ah, bx, by, bw, bh) {
  return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
}

function update(dt) {
  hue = (hue + dt * 35) % 360;
  if (cameraShake > 0) cameraShake *= .82;

  for (const p of particles) {
    p.life -= dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vy += 700 * dt;
  }
  particles = particles.filter(p => p.life > 0);

  if (!playing) return;

  distance += speed * dt;
  if (distance > levelLength) {
    playing = false;
    completeShown = true;
    complete.classList.remove('hidden');
    document.getElementById('finalPercent').textContent = '100%';
  }

  player.vy += 1800 * dt * scale;
  player.y += player.vy * dt;

  if (player.y + player.size >= ground) {
    player.y = ground - player.size;
    player.vy = 0;
    player.grounded = true;
  }

  if (!player.grounded) player.angle += 5 * dt;
  else player.angle = Math.round(player.angle / (Math.PI / 2)) * (Math.PI / 2);

  player.trail.unshift({ x: player.x - distance, y: player.y, angle: player.angle });
  if (player.trail.length > 10) player.trail.pop();

  const px = player.x;
  const py = player.y;

  for (const o of obstacles) {
    const sx = o.x - distance;
    if (o.type === 'block') {
      const sy = ground - o.h * scale;
      if (rectsOverlap(px + 5, py + 5, player.size - 10, player.size - 10, sx, sy, o.w * scale, o.h * scale)) {
        die();
        return;
      }
    } else {
      const sy = ground - o.h * scale;
      const inset = 8 * scale;
      if (rectsOverlap(px + 7, py + 7, player.size - 14, player.size - 8, sx + inset, sy + 10 * scale, o.w * scale - inset * 2, o.h * scale - 10 * scale)) {
        die();
        return;
      }
    }
  }

  for (const pad of pads) {
    const sx = pad.x - distance;
    const sy = ground - pad.h * scale;
    if (rectsOverlap(px, py + 4, player.size, player.size - 4, sx, sy, pad.w * scale, pad.h * scale) && player.vy >= 0) {
      player.vy = pad.power * scale;
      player.grounded = false;
      burst(player.x + player.size / 2, ground - 5, '#78ffff', 12);
    }
  }

  for (const portal of portals) {
    const sx = portal.x - distance;
    if (rectsOverlap(px, py, player.size, player.size, sx, ground - portal.h * scale, portal.w * scale, portal.h * scale)) speed = 470;
  }

  const pct = Math.min(100, Math.floor(distance / levelLength * 100));
  percentText.textContent = pct + '%';
  progress.style.width = pct + '%';
}

function drawBackground() {
  const gradient = ctx.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, `hsl(${hue}, 75%, 22%)`);
  gradient.addColorStop(.75, `hsl(${(hue + 35) % 360}, 82%, 10%)`);
  gradient.addColorStop(1, '#050516');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  ctx.save();
  ctx.globalAlpha = .22;
  ctx.strokeStyle = `hsl(${hue}, 100%, 65%)`;
  ctx.lineWidth = 2;
  for (let y = ground - 260; y < ground; y += 32) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }
  for (let x = -(distance * .15 % 70); x < width; x += 70) {
    ctx.beginPath();
    ctx.moveTo(x, ground - 260);
    ctx.lineTo(x - 130, ground);
    ctx.stroke();
  }
  ctx.restore();

  ctx.fillStyle = '#090918';
  ctx.fillRect(0, ground, width, height - ground);
  ctx.fillStyle = `hsl(${hue}, 85%, 58%)`;
  ctx.fillRect(0, ground - 5, width, 5);
}

function drawObstacle(o) {
  const sx = o.x - distance;
  if (sx < -100 || sx > width + 100) return;

  if (o.type === 'block') {
    const sy = ground - o.h * scale;
    ctx.save();
    ctx.shadowColor = '#ff4bd8';
    ctx.shadowBlur = 12;
    ctx.fillStyle = '#b72cbb';
    ctx.fillRect(sx, sy, o.w * scale, o.h * scale);
    ctx.strokeStyle = '#f89cff';
    ctx.lineWidth = 4;
    ctx.strokeRect(sx + 2, sy + 2, o.w * scale - 4, o.h * scale - 4);
    ctx.restore();
  } else {
    const sw = o.w * scale;
    const sh = o.h * scale;
    const sy = ground;
    ctx.save();
    ctx.shadowColor = '#ff426f';
    ctx.shadowBlur = 14;
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.lineTo(sx + sw / 2, sy - sh);
    ctx.lineTo(sx + sw, sy);
    ctx.closePath();
    ctx.fillStyle = '#ef315c';
    ctx.fill();
    ctx.strokeStyle = '#ff9eb4';
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.restore();
  }
}

function draw() {
  ctx.save();
  if (cameraShake > .5) ctx.translate((Math.random() - .5) * cameraShake, (Math.random() - .5) * cameraShake);
  drawBackground();

  for (const pad of pads) {
    const sx = pad.x - distance;
    if (sx > -80 && sx < width + 80) {
      ctx.fillStyle = '#50f4ff';
      ctx.shadowColor = '#50f4ff';
      ctx.shadowBlur = 16;
      ctx.fillRect(sx, ground - pad.h * scale, pad.w * scale, pad.h * scale);
      ctx.shadowBlur = 0;
    }
  }

  for (const portal of portals) {
    const sx = portal.x - distance;
    if (sx > -100 && sx < width + 100) {
      ctx.save();
      ctx.translate(sx + portal.w * scale / 2, ground - portal.h * scale / 2);
      ctx.strokeStyle = '#70fff1';
      ctx.shadowColor = '#70fff1';
      ctx.shadowBlur = 20;
      ctx.lineWidth = 9;
      ctx.beginPath();
      ctx.ellipse(0, 0, portal.w * scale * .45, portal.h * scale * .48, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  }

  obstacles.forEach(drawObstacle);

  for (let i = player.trail.length - 1; i >= 0; i--) {
    const t = player.trail[i];
    const alpha = (1 - i / player.trail.length) * .25;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(t.x + distance + player.size / 2, t.y + player.size / 2);
    ctx.fillStyle = '#57fff2';
    ctx.fillRect(-player.size / 2, -player.size / 2, player.size, player.size);
    ctx.restore();
  }

  ctx.save();
  ctx.translate(player.x + player.size / 2, player.y + player.size / 2);
  ctx.rotate(player.angle);
  ctx.shadowColor = '#57fff2';
  ctx.shadowBlur = 18;
  ctx.fillStyle = '#57fff2';
  ctx.fillRect(-player.size / 2, -player.size / 2, player.size, player.size);
  ctx.strokeStyle = 'white';
  ctx.lineWidth = 4;
  ctx.strokeRect(-player.size / 2, -player.size / 2, player.size, player.size);
  ctx.fillStyle = '#10344c';
  ctx.fillRect(-player.size * .28, -player.size * .12, player.size * .18, player.size * .18);
  ctx.fillRect(player.size * .10, -player.size * .12, player.size * .18, player.size * .18);
  ctx.restore();

  for (const p of particles) {
    ctx.globalAlpha = Math.min(1, p.life * 2);
    ctx.fillStyle = p.color;
    ctx.fillRect(p.x, p.y, p.size, p.size);
  }
  ctx.globalAlpha = 1;
  ctx.restore();
}

function frame(time) {
  const dt = Math.min(.032, (time - lastTime) / 1000 || 0);
  lastTime = time;
  update(dt);
  draw();
  requestAnimationFrame(frame);
}

addEventListener('resize', resize);
addEventListener('keydown', e => {
  if (e.code === 'Space' || e.code === 'ArrowUp') {
    e.preventEvent?.();
    e.preventDefault();
    jump();
  }
});
canvas.addEventListener('pointerdown', jump);
menu.addEventListener('pointerdown', e => e.stopPropagation());
document.getElementById('playButton').addEventListener('click', start);
document.getElementById('againButton').addEventListener('click', start);

resize();
reset();
requestAnimationFrame(frame);
