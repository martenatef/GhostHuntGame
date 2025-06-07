const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
ctx.imageSmoothingEnabled = false;

// تعيين حجم الكانفاس بحسب حجم النافذة
function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
resizeCanvas();

window.addEventListener('resize', () => {
  resizeCanvas();
  resetLevel();
});

canvas.style.cursor = 'default'; // اظهار مؤشر الماوس

const background = new Image();
background.src = '/static/background.jpg';

class Ghost {
  constructor(imageSrc, x, y, health = 100, baseSpeed = 0.8) {
    this.image = new Image();
    this.image.src = imageSrc;
    this.isLoaded = false;
    this.image.onload = () => { this.isLoaded = true; };
    this.x = x;
    this.y = y;
    this.health = health;
    this.maxHealth = health;
    this.width = 100;
    this.height = 100;
    this.baseSpeed = baseSpeed;
    this.vx = (Math.random() * 2 - 1) * this.baseSpeed;
    this.vy = (Math.random() * 2 - 1) * this.baseSpeed;
    this.isFlashing = false;
    this.flashTimer = 0;
    this.flashDuration = 200;
  }
  draw() {
    if (!this.isLoaded || this.health <= 0) return;
    ctx.filter = this.isFlashing ? 'brightness(200%)' : 'none';
    ctx.drawImage(this.image, this.x, this.y, this.width, this.height);
    ctx.filter = 'none';

    const barHeight = 6;
    const healthRatio = this.health / this.maxHealth;
    ctx.fillStyle = 'red';
    ctx.fillRect(this.x, this.y - barHeight - 4, this.width, barHeight);
    ctx.fillStyle = 'limegreen';
    ctx.fillRect(this.x, this.y - barHeight - 4, this.width * healthRatio, barHeight);
    ctx.strokeStyle = 'black';
    ctx.strokeRect(this.x, this.y - barHeight - 4, this.width, barHeight);
  }
  update(deltaTime) {
    if (this.health <= 0) return;
    if (this.isFlashing) {
      this.flashTimer += deltaTime;
      if (this.flashTimer >= this.flashDuration) {
        this.isFlashing = false;
        this.flashTimer = 0;
      }
    }
    this.x += this.vx;
    this.y += this.vy;
    if (this.x <= 0 || this.x + this.width >= canvas.width) {
      this.vx *= -1;
      this.x = Math.max(0, Math.min(this.x, canvas.width - this.width));
    }
    if (this.y <= 0 || this.y + this.height >= canvas.height) {
      this.vy *= -1;
      this.y = Math.max(0, Math.min(this.y, canvas.height - this.height));
    }
  }
  isClicked(mx, my) {
    return this.health > 0 && mx >= this.x && mx <= this.x + this.width && my >= this.y && my <= this.y + this.height;
  }
  takeDamage(dmg) {
    this.health -= dmg;
    if (this.health < 0) this.health = 0;
    this.isFlashing = true;
    this.flashTimer = 0;
  }
}

class PowerUp {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.size = 150;
    this.isActive = true;
    this.image = new Image();
    this.image.src = '/static/powerup.png';
    this.isLoaded = false;
    this.image.onload = () => { this.isLoaded = true; };
  }
  draw() {
    if (!this.isActive || !this.isLoaded) return;
    ctx.drawImage(this.image, this.x - this.size / 2, this.y - this.size / 2, this.size, this.size);
  }
  isClicked(mx, my) {
    return this.isActive && mx >= this.x - this.size / 2 && mx <= this.x + this.size / 2 && my >= this.y - this.size / 2 && my <= this.y + this.size / 2;
  }
  activate() {
    this.isActive = false;
  }
}

let ghosts = [];
let powerUps = [];
let level = 1;
let timeLeft = 60;
const ghostImageSrc = '/static/ghost.png';
const ghost2ImageSrc = '/static/ghost2.png';  // الشبح الجديد
const bossImageSrc = '/static/boss_ghost.png';
let timerId;
let isGameOver = false;
let gameOverMessage = '';
let slowEffectActive = false;
let slowEffectTimer = 0;
const slowEffectDuration = 5000;

const hitSound = new Howl({ src: ['/static/sounds/hit.mp3'], volume: 0.7 });
const pickupSound = new Howl({ src: ['/static/sounds/powerup.mp3'], volume: 0.7 });
const bgMusic = new Howl({ src: ['/static/sounds/bg_music.mp3'], loop: true, volume: 0.4 });

function createGhosts(count) {
  ghosts = [];
  // الأشباح العادية
  for (let i = 0; i < count; i++) {
    const x = Math.random() * (canvas.width - 45);
    const y = Math.random() * (canvas.height - 45);
    ghosts.push(new Ghost(ghostImageSrc, x, y));
  }

  // الأشباح الجديدة حسب المستوى
  let newGhostCount = 0;
  if (level === 1) newGhostCount = 1;
  else if (level === 2 || level === 3) newGhostCount = 2;
  else if (level === 4 || level === 5) newGhostCount = 3;

  for (let i = 0; i < newGhostCount; i++) {
    const x = Math.random() * (canvas.width - 45);
    const y = Math.random() * (canvas.height - 45);
    ghosts.push(new Ghost(ghost2ImageSrc, x, y, 200));  // هيل 200 للشبح الجديد
  }
}

function createBoss() {
  ghosts = [];
  const x = canvas.width / 2 - 60;
  const y = canvas.height / 2 - 60;
  ghosts.push(new Ghost(bossImageSrc, x, y, 500, 0.5));

  const numExtraGhosts = 10;
  for (let i = 0; i < numExtraGhosts; i++) {
    const x = Math.random() * (canvas.width - 45);
    const y = Math.random() * (canvas.height - 45);
    ghosts.push(new Ghost(ghostImageSrc, x, y));
  }
}

function createPowerUps(count) {
  powerUps = [];
  for (let i = 0; i < count; i++) {
    const x = Math.random() * (canvas.width - 30) + 15;
    const y = Math.random() * (canvas.height - 30) + 15;
    powerUps.push(new PowerUp(x, y));
  }
}

function drawLevel() {
  ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
  ctx.fillRect(10, 10, 220, 110);
  ctx.font = '24px Segoe UI';
  ctx.fillStyle = 'white';
  ctx.shadowColor = 'black';
  ctx.shadowBlur = 7;
  const aliveGhostsCount = ghosts.filter(g => g.health > 0).length;
  ctx.fillText(`Level: ${level}`, 20, 40);
  ctx.fillText(`Time Left: ${timeLeft}s`, 20, 70);
  ctx.fillText(`Ghosts Left: ${aliveGhostsCount}`, 20, 100);
  ctx.shadowBlur = 0;
}

function startTimer() {
  timeLeft = 60 + (level - 1) * 15;
  if (timerId) clearInterval(timerId);
  timerId = setInterval(() => {
    timeLeft--;
    if (timeLeft <= 0) {
      clearInterval(timerId);
      isGameOver = true;
      gameOverMessage = 'Time is up! You lost.';
    }
  }, 1000);
}

function resetLevel() {
  if (level < 5) {
    createGhosts(5 * level);
    createPowerUps(1);
  } else {
    createBoss();
    createPowerUps(1);
  }
  startTimer();
}

function drawGameOver() {
  ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = 'white';
  ctx.font = '48px Segoe UI';
  ctx.textAlign = 'center';
  ctx.fillText(gameOverMessage, canvas.width / 2, canvas.height / 2 - 30);
  ctx.font = '24px Segoe UI';
  ctx.fillText('Click to restart', canvas.width / 2, canvas.height / 2 + 30);
}

canvas.addEventListener('click', (e) => {
  if (isGameOver) { resetGame(); return; }
  const rect = canvas.getBoundingClientRect();
  const mouseX = e.clientX - rect.left;
  const mouseY = e.clientY - rect.top;
  powerUps.forEach(powerUp => {
    if (powerUp.isClicked(mouseX, mouseY)) {
      powerUp.activate();
      slowEffectActive = true;
      slowEffectTimer = 0;
      pickupSound.play();
    }
  });
  ghosts.forEach(ghost => {
    if (ghost.isClicked(mouseX, mouseY)) {
      ghost.takeDamage(10);
      hitSound.play();
    }
  });
});

function updateGhosts(deltaTime) {
  ghosts.forEach(ghost => {
    if (slowEffectActive) {
      ghost.x += ghost.vx * 0.5;
      ghost.y += ghost.vy * 0.5;
    } else {
      ghost.update(deltaTime);
    }
  });
}

function resetGame() {
  level = 1;
  isGameOver = false;
  slowEffectActive = false;
  slowEffectTimer = 0;
  resetLevel();
  startTimer();
}

let lastTime = 0;
function gameLoop(timestamp = 0) {
  const deltaTime = timestamp - lastTime;
  lastTime = timestamp;

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(background, 0, 0, canvas.width, canvas.height);
  drawLevel();

  if (isGameOver) {
    drawGameOver();
    return;
  }

  if (slowEffectActive) {
    slowEffectTimer += deltaTime;
    if (slowEffectTimer >= slowEffectDuration) {
      slowEffectActive = false;
    }
  }

  updateGhosts(deltaTime);
  ghosts.forEach(g => g.draw());
  powerUps.forEach(pu => pu.draw());

  // فحص انتهاء المستوى
  if (ghosts.every(g => g.health <= 0)) {
    level++;
    if (level > 5) {
      isGameOver = true;
      gameOverMessage = 'Congratulations! You won!';
      return;
    }
    resetLevel();
  }

  requestAnimationFrame(gameLoop);
}

// بداية اللعبة بعد تحميل الخلفية
background.onload = () => {
  resetLevel();
  bgMusic.play();
  requestAnimationFrame(gameLoop);
};
