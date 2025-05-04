const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const TILE_SIZE = 64;
const GRID_WIDTH = 20;
const GRID_HEIGHT = 20;

let selectedTool = 'tower';
document.querySelectorAll('input[name="tool"]').forEach(radio => {
  radio.addEventListener('change', e => selectedTool = e.target.value);
});
const shootOnlyToggle = document.getElementById('shootOnlyToggle');

let eggX = 9.5, eggY = 9.5;
let towers = [], walls = [], bombs = [], enemies = [], bullets = [];
let feathers = 30, paused = false, gameTimer = 0;
let enemySpawnCooldown = 0;
let maxActiveEnemies = 5;
let eggCarried = false;
let eggCarrier = null;
let mainTowerCooldown = 0;

document.addEventListener('keydown', (e) => {
  if (e.key.toLowerCase() === 'f') {
    paused = !paused;
    document.getElementById('pauseMenu').style.display = paused ? 'block' : 'none';
  }
});

canvas.addEventListener('click', (e) => {
  const rect = canvas.getBoundingClientRect();
  const mouseX = e.clientX - rect.left;
  const mouseY = e.clientY - rect.top;
  const gridX = Math.floor(mouseX / TILE_SIZE);
  const gridY = Math.floor(mouseY / TILE_SIZE);

  if (shootOnlyToggle.checked) {
    if (mainTowerCooldown <= 0) {
      const tx = eggX * TILE_SIZE + TILE_SIZE / 2;
      const ty = eggY * TILE_SIZE + TILE_SIZE / 2;
      const dx = mouseX - tx;
      const dy = mouseY - ty;
      bullets.push({ x: tx, y: ty, dx: dx / 300, dy: dy / 300 });
      mainTowerCooldown = 1;
    }
    return;
  }

  if (selectedTool === 'tower' && feathers >= 10) {
    towers.push({ x: gridX, y: gridY, hp: 1, cooldown: 5 });
    feathers -= 10;
  } else if (selectedTool === 'wall' && feathers >= 5) {
    walls.push({ x: gridX, y: gridY, hp: 3, cooldown: 2 });
    feathers -= 5;
  } else if (selectedTool === 'bomb' && feathers >= 15) {
    bombs.push({ x: gridX, y: gridY, timer: 1, cooldown: 15 });
    feathers -= 15;
  }
});

function spawnEnemy() {
  if (enemies.length >= maxActiveEnemies) return;

  const rand = Math.random();
  let type, hp, speed, color;

  if (rand < 0.6) { // 60% chance
    type = 'scrawny';
    hp = 2;
    speed = 1;
    color = '#00f';
  } else if (rand < 0.85) { // 25% chance
    type = 'fast';
    hp = 1;
    speed = 3;
    color = '#0ff';
  } else { // 15% chance
    type = 'buff';
    hp = 5;
    speed = 0.75;
    color = '#800080';
  }

  let edge = Math.floor(Math.random() * 4);
  let x, y;
  if (edge === 0) { // top
    x = Math.random() * canvas.width;
    y = -30;
  } else if (edge === 1) { // right
    x = canvas.width + 30;
    y = Math.random() * canvas.height;
  } else if (edge === 2) { // bottom
    x = Math.random() * canvas.width;
    y = canvas.height + 30;
  } else { // left
    x = -30;
    y = Math.random() * canvas.height;
  }

  enemies.push({ type, hp, speed, x, y, radius: 32, color, reachedEgg: false });
}

function updateGame() {
  gameTimer += 1 / 60;
  if (gameTimer > 600) return;

  // Increase max enemies after 1 minute
  if (gameTimer >= 60 && maxActiveEnemies < 8) {
    maxActiveEnemies = 8;
  }

  if (gameTimer >= 120 && maxActiveEnemies < 9) {
    maxActiveEnemies = 9;
  }

  if (gameTimer >= 300 && maxActiveEnemies < 10) {
    maxActiveEnemies = 10;
  }

  if (mainTowerCooldown > 0) mainTowerCooldown -= 1 / 60;

  enemySpawnCooldown -= 1 / 60;
  if (enemySpawnCooldown <= 0) {
    spawnEnemy();
    enemySpawnCooldown = 1.0;
  }

  bombs = bombs.filter(b => {
    b.timer -= 1 / 60;
    if (b.timer <= 0) {
      enemies = enemies.filter(e => {
        const dx = e.x - (b.x * TILE_SIZE + TILE_SIZE / 2);
        const dy = e.y - (b.y * TILE_SIZE + TILE_SIZE / 2);
        return Math.sqrt(dx * dx + dy * dy) > TILE_SIZE * 1.5;
      });
      return false;
    }
    return true;
  });

  enemies = enemies.filter(e => {
    let centerX = eggX * TILE_SIZE + TILE_SIZE / 2;
    let centerY = eggY * TILE_SIZE + TILE_SIZE / 2;

    const dx = centerX - e.x;
    const dy = centerY - e.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    // Wall collision
    for (let w of walls) {
      const wx = w.x * TILE_SIZE + TILE_SIZE / 2;
      const wy = w.y * TILE_SIZE + TILE_SIZE / 2;
      const wDist = Math.hypot(e.x - wx, e.y - wy);
      if (wDist < TILE_SIZE / 2) {
        w.hp -= 0.01;
        if (w.hp <= 0) {
          walls.splice(walls.indexOf(w), 1);
        }
        return true;
      }
    }

    for (let w of towers) {
      const wx = w.x * TILE_SIZE + TILE_SIZE / 2;
      const wy = w.y * TILE_SIZE + TILE_SIZE / 2;
      const wDist = Math.hypot(e.x - wx, e.y - wy);
      if (wDist < TILE_SIZE / 2) {
        w.hp -= 0.01;
        if (w.hp <= 0) {
          towers.splice(towers.indexOf(w), 1);
        }
        return true;
      }
    }

    if (!eggCarried && dist < TILE_SIZE / 2) {
      eggCarried = true;
      eggCarrier = e;
      e.reachedEgg = true;
    }

    if (e.reachedEgg) {
      const fleeDx = e.x - centerX;
      const fleeDy = e.y - centerY;
      const fleeDist = Math.sqrt(fleeDx * fleeDx + fleeDy * fleeDy);
      e.x += fleeDx / fleeDist * e.speed;
      e.y += fleeDy / fleeDist * e.speed;

      if (eggCarried && e === eggCarrier && (e.x < -50 || e.x > canvas.width + 50 || e.y < -50 || e.y > canvas.height + 50)) {
        alert("An eagle escaped with the egg!");
        location.reload();
        return false;
      }

      return true;
    }

    // Move towards center
    e.x += dx / dist * e.speed;
    e.y += dy / dist * e.speed;

    return true;
  });

  for (let t of towers) {
    t.cooldown -= 1 / 60;
    if (t.cooldown <= 0) {
      const tx = t.x * TILE_SIZE + TILE_SIZE / 2;
      const ty = t.y * TILE_SIZE + TILE_SIZE / 2;
      for (let e of enemies) {
        const dx = e.x - tx;
        const dy = e.y - ty;
        if (Math.sqrt(dx * dx + dy * dy) < 200) {
          bullets.push({ x: tx, y: ty, dx: dx / 20, dy: dy / 20 });
          t.cooldown = 1.5;
          break;
        }
      }
    }
  }

  bullets = bullets.filter(b => {
    b.x += b.dx * 10;
    b.y += b.dy * 10;
    for (let i = 0; i < enemies.length; i++) {
      const e = enemies[i];
      const dx = b.x - e.x;
      const dy = b.y - e.y;
      if (Math.sqrt(dx * dx + dy * dy) < 32) {
        e.hp--;
        if (e.hp <= 0) {
          if (eggCarried && e === eggCarrier) {
            eggCarried = false;
            eggCarrier = null;
          }
          enemies.splice(i, 1);
          feathers += 2;
        }
        return false;
      }
    }
    return true;
  });
}

function drawGame() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.strokeStyle = '#444';
  for (let i = 0; i <= GRID_WIDTH; i++) {
    ctx.beginPath();
    ctx.moveTo(i * TILE_SIZE, 0);
    ctx.lineTo(i * TILE_SIZE, canvas.height);
    ctx.stroke();
  }
  for (let i = 0; i <= GRID_HEIGHT; i++) {
    ctx.beginPath();
    ctx.moveTo(0, i * TILE_SIZE);
    ctx.lineTo(canvas.width, i * TILE_SIZE);
    ctx.stroke();
  }

  if (!eggCarried) {
    ctx.fillStyle = 'yellow';
    ctx.beginPath();
    ctx.arc(eggX * TILE_SIZE + TILE_SIZE / 2, eggY * TILE_SIZE + TILE_SIZE / 2, 20, 0, Math.PI * 2);
    ctx.fill();
  }

  towers.forEach(t => {
    ctx.fillStyle = 'blue';
    ctx.fillRect(t.x * TILE_SIZE, t.y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
  });

  walls.forEach(w => {
    ctx.fillStyle = 'gray';
    ctx.fillRect(w.x * TILE_SIZE, w.y * TILE_SIZE, TILE_SIZE, TILESIZE);
  });

  bombs.forEach(b => {
    ctx.fillStyle = 'black';
    ctx.beginPath();
    ctx.arc(b.x * TILE_SIZE + TILE_SIZE / 2, b.y * TILE_SIZE + TILE_SIZE / 2, 10, 0, Math.PI * 2);
    ctx.fill();
  });

  enemies.forEach(e => {
    ctx.fillStyle = e.color;
    ctx.beginPath();
    ctx.arc(e.x, e.y, e.radius, 0, Math.PI * 2);
    ctx.fill();
  });

  ctx.fillStyle = 'white';
  bullets.forEach(b => {
    ctx.beginPath();
    ctx.arc(b.x, b.y, 3, 0, Math.PI * 2);
    ctx.fill();
  });

  ctx.fillStyle = 'white';
  ctx.font = '20px sans-serif';
  ctx.fillText(`Feathers: ${feathers}`, 10, 20);
  ctx.fillText(`Time: ${Math.floor(gameTimer)}s`, 10, 45);
}

function gameLoop() {
  if (!paused) {
    updateGame();
    drawGame();
  }
  requestAnimationFrame(gameLoop);
}

function resumeGame() {
  paused = false;
  document.getElementById('pauseMenu').style.display = 'none';
}

function restartGame() {
  location.reload();
}

gameLoop();
