// 🐣 Tower Defense: Hawk too — A Tower Defense
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
let maxActiveEnemies = 2;
let eggCarried = false;
let eggCarrier = null;
let mainTowerCooldown = 0;
let gameEnded = false;


const grassSprite = new Image();
grassSprite.src = 'assets/environment/tile_grass.png';

const eggSprite = new Image();
eggSprite.src = 'assets/player/egg.png';

const towerSprite = new Image();
towerSprite.src = 'assets/defenses/tower_placeable.png';

const bulletSprite = new Image();
bulletSprite.src = 'assets/bullets/bullet.png';

const featherSprite = new Image();
featherSprite.src = 'assets/currency/feather.png';

const wallSprite = new Image();
wallSprite.src = 'assets/defenses/wall_placeable.png';

const bombSprite = new Image();
bombSprite.src = 'assets/defenses/bomb_placeable.png';

const mainTower = {
  x: canvas.width / 2,
  y: canvas.height / 2,
  angle: 0,
  sprite: new Image()
};
mainTower.sprite.src = 'assets/player/main_tower_aiming.png';


const eagleSprites = {
  scrawny: new Image(),
  buff: new Image(),
  fast: new Image()
};
eagleSprites.scrawny.src = 'assets/enemies/eagle_scrawny.png';
eagleSprites.buff.src = 'assets/enemies/eagle_buff.png';
eagleSprites.fast.src = 'assets/enemies/eagle_fast.png';



document.addEventListener('keydown', (e) => {
  if (e.key.toLowerCase() === 'f' && !gameEnded) {
    paused = !paused;
    document.getElementById('pauseMenu').style.display = paused ? 'block' : 'none';
  }
});

canvas.addEventListener('click', (e) => {
  if (gameEnded) return;

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

  if (selectedTool === 'remove') {
    for (let i = 0; i < towers.length; i++) {
      if (towers[i].x === gridX && towers[i].y === gridY) {
        towers.splice(i, 1);
        return;
      }
    }
    for (let i = 0; i < walls.length; i++) {
      if (walls[i].x === gridX && walls[i].y === gridY) {
        walls.splice(i, 1);
        return;
      }
    }
    return;
  }

  if (selectedTool === 'tower' && feathers >= 10) {
    towers.push({ x: gridX, y: gridY, hp: 1, cooldown: 5 });
    feathers -= 10;
  } else if (selectedTool === 'wall' && feathers >= 5) {
    walls.push({ x: gridX, y: gridY, hp: 3 });
    feathers -= 5;
  } else if (selectedTool === 'bomb' && feathers >= 15) {
    bombs.push({ x: gridX, y: gridY, timer: 1 });
    feathers -= 15;
  }
});

document.addEventListener('keydown', (e) => {
  if (gameEnded || paused) return;

  switch (e.key) {
    case '1':
      document.querySelector('input[value="tower"]').checked = true;
      selectedTool = 'tower';
      break;
    case '2':
      document.querySelector('input[value="wall"]').checked = true;
      selectedTool = 'wall';
      break;
    case '3':
      document.querySelector('input[value="bomb"]').checked = true;
      selectedTool = 'bomb';
      break;
    case '4':
      document.querySelector('input[value="remove"]').checked = true;
      selectedTool = 'remove';
      break;
    case ' ':
      e.preventDefault();
      shootOnlyToggle.checked = !shootOnlyToggle.checked;
      break;
  }
});

function spawnEnemy() {
  if (enemies.length >= maxActiveEnemies) return;

  const rand = Math.random();
  let type, hp, speed, color;

  if (gameTimer < 50) {
    type = 'scrawny'; hp = 2; speed = 1; color = '#00f';
  } else {
    if (rand < 0.6) {
      type = 'scrawny'; hp = 2; speed = 1; color = '#00f';
    } else if (rand < 0.85) {
      type = 'fast'; hp = 1; speed = 3; color = '#0ff';
    } else {
      type = 'buff'; hp = 5; speed = 0.75; color = '#800080';
    }
  }

  let edge = Math.floor(Math.random() * 4);
  let x, y;
  if (edge === 0) { x = Math.random() * canvas.width; y = -30; }
  else if (edge === 1) { x = canvas.width + 30; y = Math.random() * canvas.height; }
  else if (edge === 2) { x = Math.random() * canvas.width; y = canvas.height + 30; }
  else { x = -30; y = Math.random() * canvas.height; }

  enemies.push({ type, hp, speed, x, y, radius: 32, color, reachedEgg: false });
}

function updateGame() {
  if (gameEnded) return;

  gameTimer += 1 / 60;
  if (gameTimer >= 600) {
    document.getElementById('gameOverMessage').innerText = "The egg has hatched! You win!";
    document.getElementById('gameOverMenu').style.display = 'block';
    gameEnded = true;
    return;
  }

  if (gameTimer >= 60) maxActiveEnemies = 5;
  if (gameTimer >= 120) maxActiveEnemies = 9;
  if (gameTimer >= 300) maxActiveEnemies = 10;

  if (mainTowerCooldown > 0) mainTowerCooldown -= 1 / 60;

  enemySpawnCooldown -= 1 / 60;
  if (enemySpawnCooldown <= 0) {
    spawnEnemy();
    enemySpawnCooldown = Math.max(0.5, 1.5 - gameTimer / 300);
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

    for (let w of walls) {
      const wx = w.x * TILE_SIZE + TILE_SIZE / 2;
      const wy = w.y * TILE_SIZE + TILE_SIZE / 2;
      if (Math.hypot(e.x - wx, e.y - wy) < TILE_SIZE / 2) {
        w.hp -= 0.01;
        if (w.hp <= 0) walls.splice(walls.indexOf(w), 1);
        return true;
      }
    }

    for (let t of towers) {
      const tx = t.x * TILE_SIZE + TILE_SIZE / 2;
      const ty = t.y * TILE_SIZE + TILE_SIZE / 2;
      if (Math.hypot(e.x - tx, e.y - ty) < TILE_SIZE / 2) {
        t.hp -= 0.01;
        if (t.hp <= 0) towers.splice(towers.indexOf(t), 1);
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
        document.getElementById('gameOverMessage').innerText = "An eagle escaped with the egg!";
        document.getElementById('gameOverMenu').style.display = 'block';
        gameEnded = true;
        return false;
      }
      return true;
    }

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
        mainTower.angle = Math.atan2(dy, dx);
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
      if (Math.hypot(b.x - e.x, b.y - e.y) < 32) {
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

  // Draw grass tiles as background
  for (let i = 0; i < GRID_WIDTH; i++) {
    for (let j = 0; j < GRID_HEIGHT; j++) {
      ctx.drawImage(grassSprite, i * TILE_SIZE, j * TILE_SIZE, TILE_SIZE, TILE_SIZE);
    }
  }

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
    ctx.drawImage(eggSprite, eggX * TILE_SIZE, eggY * TILE_SIZE, TILE_SIZE, TILE_SIZE);
  }

  towers.forEach(t => {
    ctx.drawImage(towerSprite, t.x * TILE_SIZE, t.y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
  });

  walls.forEach(w => {
    ctx.drawImage(wallSprite, w.x * TILE_SIZE, w.y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
  });

  bombs.forEach(b => {
    ctx.drawImage(bombSprite, b.x * TILE_SIZE, b.y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
  });

  enemies.forEach(e => {
    let sprite;
if (e.type === 'scrawny') sprite = eagleSprites.scrawny;
else if (e.type === 'buff') sprite = eagleSprites.buff;
else if (e.type === 'fast') sprite = eagleSprites.fast;

ctx.drawImage(sprite, e.x - TILE_SIZE / 2, e.y - TILE_SIZE / 2, TILE_SIZE, TILE_SIZE);

  });

  bullets.forEach(b => {
    ctx.drawImage(bulletSprite, b.x - 9.5, b.y - 9.5, 64, 64);
  });
  
  ctx.font = '20px sans-serif';
  ctx.fillText(`Feathers: ${feathers}`, 10, 20);
  ctx.fillText(`Time: ${Math.floor(gameTimer)}s`, 10, 45);

  drawRotatedImage(mainTower.sprite, mainTower.x, mainTower.y, mainTower.angle);

}

function drawRotatedImage(img, x, y, angle) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.drawImage(img, -32, -32, 64, 64); // center the 64x64 image
  ctx.restore();
}


function gameLoop() {
  if (!paused && !gameEnded) {
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


