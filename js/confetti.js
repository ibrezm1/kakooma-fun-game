/**
 * Confetti & Particle Effects Engine
 * Renders celebratory particle bursts and confetti on canvas
 */
class ConfettiEngine {
  constructor() {
    this.canvas = null;
    this.ctx = null;
    this.particles = [];
    this.animId = null;
    this.isActive = false;
    this.initCanvas();
  }

  initCanvas() {
    this.canvas = document.createElement('canvas');
    this.canvas.id = 'fx-canvas';
    this.canvas.style.position = 'fixed';
    this.canvas.style.top = '0';
    this.canvas.style.left = '0';
    this.canvas.style.width = '100vw';
    this.canvas.style.height = '100vh';
    this.canvas.style.pointerEvents = 'none';
    this.canvas.style.zIndex = '9999';
    document.body.appendChild(this.canvas);
    this.ctx = this.canvas.getContext('2d');
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  resize() {
    if (!this.canvas) return;
    this.canvas.width = window.innerWidth * window.devicePixelRatio;
    this.canvas.height = window.innerHeight * window.devicePixelRatio;
    if (this.ctx) {
      this.ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    }
  }

  // Small particle burst at specific DOM element (e.g. clicked winning number)
  burstAt(element, count = 28) {
    if (!element) return;
    const rect = element.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const colors = ['#f59e0b', '#10b981', '#3b82f6', '#ec4899', '#8b5cf6', '#06b6d4'];

    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 2.5 + Math.random() * 5.5;
      this.particles.push({
        x: centerX,
        y: centerY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 1.5,
        size: 5 + Math.random() * 6,
        color: colors[Math.floor(Math.random() * colors.length)],
        alpha: 1,
        decay: 0.015 + Math.random() * 0.02,
        gravity: 0.12,
        rotation: Math.random() * 360,
        spin: (Math.random() - 0.5) * 12,
        shape: Math.random() > 0.4 ? 'circle' : 'star'
      });
    }

    if (!this.isActive) {
      this.loop();
    }
  }

  // Massive full-screen confetti explosion for final puzzle completion
  startMegaCelebration(durationMs = 4500) {
    const colors = ['#f59e0b', '#10b981', '#3b82f6', '#ec4899', '#8b5cf6', '#06b6d4', '#e11d48', '#fbbf24'];
    const w = window.innerWidth;
    const h = window.innerHeight;

    // Cannon bursts from bottom corners and top center
    const spawnCannon = (startX, startY, angleBase, spread, count = 60) => {
      for (let i = 0; i < count; i++) {
        const angle = angleBase + (Math.random() - 0.5) * spread;
        const speed = 9 + Math.random() * 14;
        this.particles.push({
          x: startX,
          y: startY,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          size: 7 + Math.random() * 9,
          widthRatio: 0.3 + Math.random() * 0.7,
          color: colors[Math.floor(Math.random() * colors.length)],
          alpha: 1,
          decay: 0.005 + Math.random() * 0.008,
          gravity: 0.22,
          rotation: Math.random() * 360,
          spin: (Math.random() - 0.5) * 18,
          shape: Math.random() > 0.3 ? 'rect' : 'circle'
        });
      }
    };

    spawnCannon(w * 0.15, h * 0.9, -Math.PI / 3, 0.6, 70);
    spawnCannon(w * 0.85, h * 0.9, -2 * Math.PI / 3, 0.6, 70);
    spawnCannon(w * 0.5, h * 0.4, -Math.PI / 2, Math.PI, 80);

    // Continuous shower for 2.5 seconds
    const interval = setInterval(() => {
      spawnCannon(Math.random() * w, -20, Math.PI / 2, 0.8, 15);
    }, 180);

    setTimeout(() => {
      clearInterval(interval);
    }, durationMs - 1500);

    if (!this.isActive) {
      this.loop();
    }
  }

  loop() {
    this.isActive = true;
    const ctx = this.ctx;
    const w = window.innerWidth;
    const h = window.innerHeight;

    ctx.clearRect(0, 0, w, h);

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += p.gravity;
      p.vx *= 0.985;
      p.rotation += p.spin;
      p.alpha -= p.decay;

      if (p.alpha <= 0 || p.y > h + 50) {
        this.particles.splice(i, 1);
        continue;
      }

      ctx.save();
      ctx.globalAlpha = Math.max(0, p.alpha);
      ctx.translate(p.x, p.y);
      ctx.rotate((p.rotation * Math.PI) / 180);
      ctx.fillStyle = p.color;

      if (p.shape === 'circle') {
        ctx.beginPath();
        ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.shape === 'star') {
        this.drawStar(ctx, 0, 0, 5, p.size / 2, p.size / 4);
      } else {
        // Confetti ribbon rectangle
        ctx.fillRect(-p.size / 2, -p.size * (p.widthRatio || 0.4) / 2, p.size, p.size * (p.widthRatio || 0.4));
      }

      ctx.restore();
    }

    if (this.particles.length > 0) {
      this.animId = requestAnimationFrame(() => this.loop());
    } else {
      this.isActive = false;
      ctx.clearRect(0, 0, w, h);
    }
  }

  drawStar(ctx, cx, cy, spikes, outerRadius, innerRadius) {
    let rot = (Math.PI / 2) * 3;
    let x = cx;
    let y = cy;
    const step = Math.PI / spikes;

    ctx.beginPath();
    ctx.moveTo(cx, cy - outerRadius);
    for (let i = 0; i < spikes; i++) {
      x = cx + Math.cos(rot) * outerRadius;
      y = cy + Math.sin(rot) * outerRadius;
      ctx.lineTo(x, y);
      rot += step;

      x = cx + Math.cos(rot) * innerRadius;
      y = cy + Math.sin(rot) * innerRadius;
      ctx.lineTo(x, y);
      rot += step;
    }
    ctx.lineTo(cx, cy - outerRadius);
    ctx.closePath();
    ctx.fill();
  }
}

window.confettiEngine = new ConfettiEngine();
