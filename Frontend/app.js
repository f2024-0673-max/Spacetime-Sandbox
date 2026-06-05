/* ============================================================
   ANTI-GRAVITY SIMULATION — app.js
   ES6 Class-based architecture with Matter.js physics
   ============================================================ */

// Matter.js module aliases
const { Engine, Composite, Bodies, Body, Constraint, Events, Vector } = Matter;

// ============================================================
// 1. STARFIELD — Dynamic parallax background
// ============================================================

class StarField {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.stars = [];
    this.mouseX = 0;
    this.mouseY = 0;

    this._layers = [
      { count: 280, speed: 0.25, minR: 0.3, maxR: 1.0, minO: 0.2, maxO: 0.5 },
      { count: 120, speed: 0.7,  minR: 0.8, maxR: 1.8, minO: 0.3, maxO: 0.7 },
      { count: 40,  speed: 1.5,  minR: 1.4, maxR: 2.8, minO: 0.5, maxO: 1.0 },
    ];

    this._populate();
  }

  _populate() {
    this.stars = [];
    for (const layer of this._layers) {
      for (let i = 0; i < layer.count; i++) {
        this.stars.push({
          baseX: Math.random() * window.innerWidth,
          baseY: Math.random() * window.innerHeight,
          r: layer.minR + Math.random() * (layer.maxR - layer.minR),
          speed: layer.speed,
          opacity: layer.minO + Math.random() * (layer.maxO - layer.minO),
          twinkleRate: 0.4 + Math.random() * 2.5,
          twinklePhase: Math.random() * Math.PI * 2,
          hue: 200 + Math.random() * 40, // slight cool-blue variation
        });
      }
    }
  }

  resize() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
    this._populate();
  }

  setMouse(x, y) {
    this.mouseX = x;
    this.mouseY = y;
  }

  render(time) {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;
    ctx.clearRect(0, 0, w, h);

    const cx = w / 2;
    const cy = h / 2;
    const normX = (this.mouseX - cx) / cx; // -1 to 1
    const normY = (this.mouseY - cy) / cy;

    for (const s of this.stars) {
      const px = s.baseX + normX * s.speed * 35;
      const py = s.baseY + normY * s.speed * 35;
      const twinkle = 0.5 + 0.5 * Math.sin(time * 0.001 * s.twinkleRate + s.twinklePhase);
      const alpha = s.opacity * twinkle;

      // Main dot
      ctx.beginPath();
      ctx.arc(px, py, s.r, 0, Math.PI * 2);
      ctx.fillStyle = `hsla(${s.hue}, 60%, 85%, ${alpha})`;
      ctx.fill();

      // Soft glow on larger stars
      if (s.r > 1.8) {
        ctx.beginPath();
        ctx.arc(px, py, s.r * 3.5, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${s.hue}, 60%, 80%, ${alpha * 0.08})`;
        ctx.fill();
      }
    }
  }
}

// ============================================================
// 2. PARTICLE SYSTEM — Trails, explosions, vortex dust
// ============================================================

class ParticleSystem {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.particles = [];
  }

  resize() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  /**
   * Emit particles at (x, y).
   * @param {string} rgb - e.g. '0, 240, 255'
   */
  emit(x, y, rgb, count = 1, opts = {}) {
    for (let i = 0; i < count; i++) {
      this.particles.push({
        x,
        y,
        vx: (opts.vx || 0) + (Math.random() - 0.5) * (opts.spread || 2),
        vy: (opts.vy || 0) + (Math.random() - 0.5) * (opts.spread || 2),
        life: 1,
        decay: opts.decay || (0.008 + Math.random() * 0.018),
        size: opts.size || (1.5 + Math.random() * 2.5),
        rgb,
      });
    }
  }

  update() {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vx *= 0.97;
      p.vy *= 0.97;
      p.life -= p.decay;
      if (p.life <= 0) this.particles.splice(i, 1);
    }
  }

  render() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    ctx.globalCompositeOperation = 'lighter';
    for (const p of this.particles) {
      const a = Math.max(0, p.life) * 0.55;
      const r = p.size * Math.max(0.2, p.life);
      ctx.beginPath();
      ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${p.rgb}, ${a})`;
      ctx.fill();
    }
    ctx.globalCompositeOperation = 'source-over';
  }
}

// ============================================================
// 3. CELESTIAL BODIES — OOP Hierarchy (mirrors C++ classes)
// ============================================================

class CelestialBody {
  constructor(name, radius, matterBody) {
    this.name = name;
    this.radius = radius;
    this.body = matterBody;   // Matter.js Body reference
    this.trail = [];
    this.maxTrail = 50;
  }

  get x()  { return this.body.position.x; }
  get y()  { return this.body.position.y; }
  get vx() { return this.body.velocity.x; }
  get vy() { return this.body.velocity.y; }

  /** RGB string for trail particles */
  trailRGB()  { return '100, 200, 255'; }

  update() {
    this.trail.push({ x: this.x, y: this.y });
    if (this.trail.length > this.maxTrail) this.trail.shift();
  }

  renderTrail(ctx) {
    const rgb = this.trailRGB();
    for (let i = 0; i < this.trail.length; i++) {
      const t = i / this.trail.length;
      const alpha = t * 0.35;
      const r = Math.max(0.5, t * this.radius * 0.4);
      ctx.beginPath();
      ctx.arc(this.trail[i].x, this.trail[i].y, r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${rgb}, ${alpha})`;
      ctx.fill();
    }
  }

  /** Override in subclass */
  render(ctx, time) {}

  getDetails() {
    return `${this.name} | Pos: (${this.x.toFixed(1)}, ${this.y.toFixed(1)})`;
  }
}

// ---- PLANET ----
class Planet extends CelestialBody {
  constructor(name, radius, matterBody) {
    super(name, radius, matterBody);
    this.hue = Math.floor(Math.random() * 360);
    this.ringAngle = Math.random() * Math.PI;
    this.hasRing = Math.random() > 0.5;
  }

  trailRGB() {
    // Convert HSL → approximate RGB for trail
    const h = this.hue, s = 0.7, l = 0.55;
    const c = (1 - Math.abs(2 * l - 1)) * s;
    const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
    const m = l - c / 2;
    let r, g, b;
    if (h < 60)       { r = c; g = x; b = 0; }
    else if (h < 120) { r = x; g = c; b = 0; }
    else if (h < 180) { r = 0; g = c; b = x; }
    else if (h < 240) { r = 0; g = x; b = c; }
    else if (h < 300) { r = x; g = 0; b = c; }
    else              { r = c; g = 0; b = x; }
    return `${Math.round((r + m) * 255)}, ${Math.round((g + m) * 255)}, ${Math.round((b + m) * 255)}`;
  }

  render(ctx, time) {
    const { x, y } = this;
    ctx.save();

    // Atmosphere glow
    const glow = ctx.createRadialGradient(x, y, this.radius * 0.4, x, y, this.radius * 2.8);
    glow.addColorStop(0, `hsla(${this.hue}, 80%, 60%, 0.20)`);
    glow.addColorStop(1, `hsla(${this.hue}, 80%, 60%, 0)`);
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(x, y, this.radius * 2.8, 0, Math.PI * 2);
    ctx.fill();

    // Planet sphere (lit from top-left)
    const sphere = ctx.createRadialGradient(
      x - this.radius * 0.3, y - this.radius * 0.3, this.radius * 0.05,
      x, y, this.radius
    );
    sphere.addColorStop(0, `hsl(${this.hue}, 50%, 75%)`);
    sphere.addColorStop(0.6, `hsl(${this.hue}, 65%, 45%)`);
    sphere.addColorStop(1, `hsl(${this.hue}, 80%, 18%)`);
    ctx.fillStyle = sphere;
    ctx.beginPath();
    ctx.arc(x, y, this.radius, 0, Math.PI * 2);
    ctx.fill();

    // Optional ring
    if (this.hasRing) {
      ctx.strokeStyle = `hsla(${this.hue}, 40%, 70%, 0.35)`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(x, y, this.radius * 1.8, this.radius * 0.35, this.ringAngle, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.restore();
  }
}

// ---- STAR ----
class Star extends CelestialBody {
  constructor(name, radius, matterBody, brightness) {
    super(name, radius, matterBody);
    this.brightness = brightness;
    this.phase = Math.random() * Math.PI * 2;
  }

  trailRGB() { return '255, 200, 60'; }

  render(ctx, time) {
    const { x, y } = this;
    const pulse = 1 + 0.12 * Math.sin(time * 0.003 + this.phase);
    const r = this.radius * pulse;

    ctx.save();

    // Outer corona
    const corona = ctx.createRadialGradient(x, y, r * 0.2, x, y, r * 4.5);
    corona.addColorStop(0, 'rgba(255, 230, 120, 0.35)');
    corona.addColorStop(0.4, 'rgba(255, 160, 50, 0.08)');
    corona.addColorStop(1, 'rgba(255, 100, 0, 0)');
    ctx.fillStyle = corona;
    ctx.beginPath();
    ctx.arc(x, y, r * 4.5, 0, Math.PI * 2);
    ctx.fill();

    // Star body
    const body = ctx.createRadialGradient(x, y, 0, x, y, r);
    body.addColorStop(0, '#fffef5');
    body.addColorStop(0.25, '#fff7d4');
    body.addColorStop(0.7, '#ffbb33');
    body.addColorStop(1, '#ff8800');
    ctx.fillStyle = body;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();

    // Cross rays
    ctx.globalAlpha = 0.18 * pulse;
    ctx.strokeStyle = '#ffe580';
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 4; i++) {
      const angle = (i * Math.PI / 4) + time * 0.0004;
      const len = r * 3.5;
      ctx.beginPath();
      ctx.moveTo(x + Math.cos(angle) * r * 0.6, y + Math.sin(angle) * r * 0.6);
      ctx.lineTo(x + Math.cos(angle) * len, y + Math.sin(angle) * len);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;

    ctx.restore();
  }
}

// ---- BLACK HOLE ----
class BlackHole extends CelestialBody {
  constructor(name, radius, matterBody, pullPower) {
    super(name, radius, matterBody);
    this.pullPower = pullPower;
  }

  trailRGB() { return '160, 60, 255'; }

  render(ctx, time) {
    const { x, y } = this;
    ctx.save();

    // Accretion disk rings
    for (let ring = 0; ring < 4; ring++) {
      const rr = this.radius * (1.8 + ring * 0.7);
      const rot = time * 0.002 * (1 + ring * 0.4) * (ring % 2 === 0 ? 1 : -1);
      ctx.beginPath();
      ctx.ellipse(x, y, rr, rr * 0.25, rot, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(180, 80, 255, ${0.35 - ring * 0.07})`;
      ctx.lineWidth = 2.5 - ring * 0.4;
      ctx.stroke();
    }

    // Distortion halo
    const halo = ctx.createRadialGradient(x, y, this.radius * 0.3, x, y, this.radius * 2);
    halo.addColorStop(0, 'rgba(0, 0, 0, 0.95)');
    halo.addColorStop(0.6, 'rgba(30, 0, 60, 0.4)');
    halo.addColorStop(1, 'rgba(100, 0, 200, 0)');
    ctx.fillStyle = halo;
    ctx.beginPath();
    ctx.arc(x, y, this.radius * 2, 0, Math.PI * 2);
    ctx.fill();

    // Event horizon core
    ctx.fillStyle = '#020008';
    ctx.beginPath();
    ctx.arc(x, y, this.radius, 0, Math.PI * 2);
    ctx.fill();

    // Edge glow
    ctx.shadowColor = '#9b30ff';
    ctx.shadowBlur = 25;
    ctx.strokeStyle = 'rgba(140, 40, 255, 0.55)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x, y, this.radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.shadowBlur = 0;

    ctx.restore();
  }
}

// ============================================================
// 4. INTERACTIVE TITLE — Physics-based letter scattering
// ============================================================

class InteractiveTitle {
  constructor(world) {
    this.world = world;
    this.text = 'ANTI-GRAVITY';
    this.letters = [];
    this.fontSize = 60;
    this.ready = false;
    this.subtitleY = 0;
  }

  async init(w, h) {
    await document.fonts.ready;

    this.fontSize = Math.min(w * 0.058, 76);
    const bodyRadius = this.fontSize * 0.35;

    // Measure letter widths
    const offscreen = document.createElement('canvas').getContext('2d');
    offscreen.font = `900 ${this.fontSize}px Orbitron`;
    const widths = [...this.text].map(c => offscreen.measureText(c).width);
    const spacing = this.fontSize * 0.08;
    const totalW = widths.reduce((a, b) => a + b, 0) + spacing * (this.text.length - 1);
    const startX = (w - totalW) / 2;
    const originY = Math.min(h * 0.1, 100);

    let cx = startX;
    for (let i = 0; i < this.text.length; i++) {
      const charW = widths[i];
      const posX = cx + charW / 2;
      const posY = originY;

      const body = Bodies.circle(posX, posY, bodyRadius, {
        restitution: 0.4,
        friction: 0.1,
        frictionAir: 0.06,
        collisionFilter: { group: -1, category: 0x0002, mask: 0 },
      });

      const constraint = Constraint.create({
        pointA: { x: posX, y: posY },
        bodyB: body,
        stiffness: 0.015,
        damping: 0.12,
        length: 0,
      });

      Composite.add(this.world, [body, constraint]);

      this.letters.push({
        char: this.text[i],
        body,
        constraint,
        origX: posX,
        origY: posY,
      });

      cx += charW + spacing;
    }

    this.subtitleY = originY + this.fontSize * 0.7;
    this.ready = true;
  }

  scatter(mouseX, mouseY) {
    if (!this.ready) return;
    const radius = 220;
    const force = 0.12;

    for (const L of this.letters) {
      const dx = L.body.position.x - mouseX;
      const dy = L.body.position.y - mouseY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < radius && dist > 1) {
        const strength = ((radius - dist) / radius) * force;
        Body.applyForce(L.body, L.body.position, {
          x: (dx / dist) * strength,
          y: (dy / dist) * strength,
        });
      }
    }
  }

  render(ctx, theme) {
    if (!this.ready) return;

    ctx.font = `900 ${this.fontSize}px Orbitron`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    for (const L of this.letters) {
      ctx.save();
      ctx.translate(L.body.position.x, L.body.position.y);
      ctx.rotate(L.body.angle);

      // Outer glow pass
      ctx.shadowColor = theme.glowColor;
      ctx.shadowBlur = 35;
      ctx.fillStyle = theme.titleFill;
      ctx.fillText(L.char, 0, 0);

      // Bright core pass
      ctx.shadowBlur = 12;
      ctx.fillText(L.char, 0, 0);

      ctx.restore();
    }

    // Subtitle
    ctx.font = '400 ' + Math.max(11, this.fontSize * 0.16) + 'px Rajdhani';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.shadowBlur = 0;
    ctx.fillStyle = theme.subtitleFill;
    // subtitle is rendered via HTML; skip canvas to avoid overlap
  }
}

// ============================================================
// 5. UI MANAGER — Control panel event wiring
// ============================================================

class UIManager {
  constructor(sim) {
    this.sim = sim;
    this._wire();
  }

  _wire() {
    // Anti-gravity toggle
    const toggleBtn = document.getElementById('toggle-ag');
    toggleBtn.addEventListener('click', () => {
      const on = toggleBtn.getAttribute('aria-pressed') === 'true';
      toggleBtn.setAttribute('aria-pressed', String(!on));
      toggleBtn.classList.toggle('active', !on);
      toggleBtn.querySelector('.toggle-text').textContent = on ? 'OFF' : 'ON';
      this.sim.toggleAntiGravity();
    });

    // Gravity slider
    const gravSlider = document.getElementById('slider-gravity');
    const gravVal    = document.getElementById('val-gravity');
    gravSlider.addEventListener('input', () => {
      this.sim.gravityStrength = +gravSlider.value;
      gravVal.textContent = gravSlider.value;
    });

    // Trail slider
    const trailSlider = document.getElementById('slider-trail');
    const trailVal    = document.getElementById('val-trail');
    trailSlider.addEventListener('input', () => {
      this.sim.trailDensity = +trailSlider.value;
      trailVal.textContent = trailSlider.value;
    });

    // Spawn buttons
    document.getElementById('btn-planet').addEventListener('click', () => this.sim.spawnBody('planet'));
    document.getElementById('btn-star').addEventListener('click', () => this.sim.spawnBody('star'));
    document.getElementById('btn-blackhole').addEventListener('click', () => this.sim.spawnBody('blackhole'));

    // Supernova
    document.getElementById('btn-supernova').addEventListener('click', () => this.sim.triggerSupernova());
  }
}

// ============================================================
// 6. SIMULATION — Main orchestrator
// ============================================================

class Simulation {
  constructor() {
    // Canvas refs
    this.starCanvas    = document.getElementById('starfield-canvas');
    this.mainCanvas    = document.getElementById('main-canvas');
    this.particleCanvas = document.getElementById('particle-canvas');
    this.mainCtx       = this.mainCanvas.getContext('2d');

    // Subsystems
    this.starField      = new StarField(this.starCanvas);
    this.particleSystem = new ParticleSystem(this.particleCanvas);

    // Matter.js engine
    this.engine = Engine.create({ gravity: { x: 0, y: 0.25 } });

    // Title
    this.title = new InteractiveTitle(this.engine.world);

    // Celestial bodies list
    this.celestialBodies = [];

    // Walls
    this.walls = [];

    // Interaction state
    this.mouseX = 0;
    this.mouseY = 0;
    this.mouseDown = false;
    this.rightDown = false;
    this.antiGravity = false;
    this.gravityStrength = 50;
    this.trailDensity = 65;
    this.supernovaFlash = 0;

    // Theme
    this.normalTheme = {
      titleFill:    '#00f0ff',
      glowColor:    'rgba(0, 240, 255, 0.75)',
      subtitleFill: 'rgba(180, 200, 255, 0.4)',
      accent:       '0, 240, 255',
      vortex:       '0, 200, 255',
    };
    this.antiTheme = {
      titleFill:    '#ff6b35',
      glowColor:    'rgba(255, 107, 53, 0.75)',
      subtitleFill: 'rgba(255, 170, 120, 0.4)',
      accent:       '255, 107, 53',
      vortex:       '255, 80, 40',
    };
    this.theme = this.normalTheme;

    // FPS tracking
    this._fpsTick = 0;
    this._fpsTime = 0;
    this._lastTime = 0;

    this._init();
  }

  async _init() {
    this._resize();
    window.addEventListener('resize', () => this._resize());
    this._createWalls();
    await this.title.init(this.mainCanvas.width, this.mainCanvas.height);

    // Seed default bodies
    this.spawnBody('star',   this.mainCanvas.width * 0.45, this.mainCanvas.height * 0.45);
    this.spawnBody('planet', this.mainCanvas.width * 0.3,  this.mainCanvas.height * 0.35);

    this._bindEvents();
    this.ui = new UIManager(this);

    // Start loop
    this._lastTime = performance.now();
    requestAnimationFrame(t => this._loop(t));
  }

  // ---- Resize ----
  _resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.mainCanvas.width  = w;
    this.mainCanvas.height = h;
    this.starField.resize();
    this.particleSystem.resize();

    // Rebuild walls
    if (this.walls.length) {
      Composite.remove(this.engine.world, this.walls);
    }
    this._createWalls();
  }

  _createWalls() {
    const w = this.mainCanvas.width;
    const h = this.mainCanvas.height;
    const t = 60;
    const opts = { isStatic: true, restitution: 0.5, friction: 0.05,
                   collisionFilter: { category: 0x0004, mask: 0xFFFF },
                   render: { visible: false } };

    this.walls = [
      Bodies.rectangle(w / 2, -t / 2, w + t * 2, t, opts),       // top
      Bodies.rectangle(w / 2, h + t / 2, w + t * 2, t, opts),    // bottom
      Bodies.rectangle(-t / 2, h / 2, t, h + t * 2, opts),       // left
      Bodies.rectangle(w + t / 2, h / 2, t, h + t * 2, opts),    // right
    ];
    Composite.add(this.engine.world, this.walls);
  }

  // ---- Events ----
  _bindEvents() {
    const mc = this.mainCanvas;

    mc.addEventListener('mousemove', e => {
      this.mouseX = e.clientX;
      this.mouseY = e.clientY;
      this.starField.setMouse(e.clientX, e.clientY);
      this.title.scatter(e.clientX, e.clientY);
    });

    mc.addEventListener('mousedown', e => {
      if (e.button === 0) this.mouseDown = true;
      if (e.button === 2) this.rightDown = true;
    });

    mc.addEventListener('mouseup', e => {
      if (e.button === 0) this.mouseDown = false;
      if (e.button === 2) this.rightDown = false;
    });

    mc.addEventListener('mouseleave', () => {
      this.mouseDown = false;
      this.rightDown = false;
    });

    mc.addEventListener('contextmenu', e => e.preventDefault());

    // Touch support
    mc.addEventListener('touchstart', e => {
      const t = e.touches[0];
      this.mouseX = t.clientX;
      this.mouseY = t.clientY;
      this.mouseDown = true;
    }, { passive: true });

    mc.addEventListener('touchmove', e => {
      const t = e.touches[0];
      this.mouseX = t.clientX;
      this.mouseY = t.clientY;
      this.starField.setMouse(t.clientX, t.clientY);
      this.title.scatter(t.clientX, t.clientY);
    }, { passive: true });

    mc.addEventListener('touchend', () => { this.mouseDown = false; });
  }

  // ---- Spawn Body ----
  spawnBody(type, px, py) {
    const w = this.mainCanvas.width;
    const h = this.mainCanvas.height;
    const x = px ?? (w * 0.15 + Math.random() * w * 0.5);
    const y = py ?? (h * 0.2  + Math.random() * h * 0.4);

    let radius, mass, mBody, celestial;
    const bodyOpts = {
      restitution: 0.55,
      friction: 0.01,
      frictionAir: 0.0008,
      collisionFilter: { category: 0x0001, mask: 0x0001 | 0x0004 },
    };

    switch (type) {
      case 'planet': {
        radius = 10 + Math.random() * 12;
        mass = radius * 1.5;
        mBody = Bodies.circle(x, y, radius, { ...bodyOpts, mass });
        Body.setVelocity(mBody, { x: (Math.random() - 0.5) * 6, y: (Math.random() - 0.5) * 6 });
        Composite.add(this.engine.world, mBody);
        celestial = new Planet('Planet', radius, mBody);
        break;
      }
      case 'star': {
        radius = 18 + Math.random() * 14;
        mass = radius * 4;
        mBody = Bodies.circle(x, y, radius, { ...bodyOpts, mass, frictionAir: 0.0015 });
        Body.setVelocity(mBody, { x: (Math.random() - 0.5) * 4, y: (Math.random() - 0.5) * 4 });
        Composite.add(this.engine.world, mBody);
        celestial = new Star('Star', radius, mBody, 100);
        break;
      }
      case 'blackhole': {
        radius = 15 + Math.random() * 10;
        mass = radius * 8;
        mBody = Bodies.circle(x, y, radius, { ...bodyOpts, mass, frictionAir: 0.0005 });
        Body.setVelocity(mBody, { x: (Math.random() - 0.5) * 5, y: (Math.random() - 0.5) * 5 });
        Composite.add(this.engine.world, mBody);
        celestial = new BlackHole('Black Hole', radius, mBody, 10);
        break;
      }
    }

    if (celestial) {
      this.celestialBodies.push(celestial);

      // Spawn burst
      const rgb = celestial.trailRGB();
      this.particleSystem.emit(x, y, rgb, 25, { spread: 8, decay: 0.02, size: 3 });

      this._updateStats();
    }
  }

  // ---- Mouse Gravity / Repulsion ----
  _applyMouseForces() {
    const strength = (this.gravityStrength / 50) * 0.004;

    for (const cb of this.celestialBodies) {
      const dx = this.mouseX - cb.x;
      const dy = this.mouseY - cb.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 15) continue;

      if (this.mouseDown) {
        // Gravitational pull
        const f = strength * cb.body.mass / Math.max(dist, 40);
        Body.applyForce(cb.body, cb.body.position, {
          x: (dx / dist) * f,
          y: (dy / dist) * f,
        });
      }

      if (this.rightDown) {
        // Repulsive push
        const f = strength * 1.5 * cb.body.mass / Math.max(dist, 40);
        Body.applyForce(cb.body, cb.body.position, {
          x: -(dx / dist) * f,
          y: -(dy / dist) * f,
        });
      }
    }
  }

  // ---- Anti-Gravity Toggle ----
  toggleAntiGravity() {
    this.antiGravity = !this.antiGravity;

    if (this.antiGravity) {
      this.engine.gravity.y = -0.45;
      this.theme = this.antiTheme;
      document.body.classList.add('anti-gravity-mode');
      document.getElementById('stat-engine').textContent = 'ANTI-G';
    } else {
      this.engine.gravity.y = 0.25;
      this.theme = this.normalTheme;
      document.body.classList.remove('anti-gravity-mode');
      document.getElementById('stat-engine').textContent = 'GRAVITY';
    }

    // Dramatic FX
    this._flashGrid();
    this._shake();

    // Burst all bodies
    for (const cb of this.celestialBodies) {
      Body.applyForce(cb.body, cb.body.position, {
        x: (Math.random() - 0.5) * 0.4,
        y: this.antiGravity ? -0.35 : 0.3,
      });
      // Particle burst
      this.particleSystem.emit(cb.x, cb.y, cb.trailRGB(), 15, { spread: 6, decay: 0.015 });
    }
  }

  // ---- Supernova ----
  triggerSupernova() {
    if (this.celestialBodies.length === 0) return;

    // Massive particle explosion
    for (const cb of this.celestialBodies) {
      const rgb = cb.trailRGB();
      this.particleSystem.emit(cb.x, cb.y, rgb, 60, {
        spread: 14,
        decay: 0.008,
        size: 4 + Math.random() * 3,
      });
      this.particleSystem.emit(cb.x, cb.y, '255, 255, 200', 30, {
        spread: 10,
        decay: 0.012,
        size: 2,
      });
      Composite.remove(this.engine.world, cb.body);
    }

    this.celestialBodies = [];
    this.supernovaFlash = 1;
    this._shake();
    this._flashScreen();
    this._updateStats();
  }

  // ---- FX Helpers ----
  _flashGrid() {
    const el = document.getElementById('neon-grid');
    el.classList.remove('flash');
    void el.offsetWidth;
    el.classList.add('flash');
  }

  _flashScreen() {
    const el = document.getElementById('flash-overlay');
    el.classList.remove('active');
    void el.offsetWidth;
    el.classList.add('active');
  }

  _shake() {
    document.body.classList.remove('shake');
    void document.body.offsetWidth;
    document.body.classList.add('shake');
    setTimeout(() => document.body.classList.remove('shake'), 550);
  }

  _updateStats() {
    document.getElementById('stat-bodies').textContent = this.celestialBodies.length;
  }

  // ---- Gravity Well Render ----
  _renderGravityWell(ctx, time) {
    const { mouseX: mx, mouseY: my } = this;
    const isRepulse = this.rightDown;
    const rgb = isRepulse ? '255, 60, 80' : this.theme.vortex;
    const rotation = time * (isRepulse ? -0.004 : 0.003);

    ctx.save();
    ctx.globalAlpha = 0.7;

    // Spiral arcs
    for (let i = 0; i < 4; i++) {
      const r = 22 + i * 22 + Math.sin(time * 0.006 + i * 1.2) * 8;
      const a = 0.35 - i * 0.07;
      ctx.beginPath();
      ctx.arc(mx, my, r, rotation + i * 0.6, rotation + i * 0.6 + Math.PI * 1.4);
      ctx.strokeStyle = `rgba(${rgb}, ${a})`;
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    // Center glow
    const g = ctx.createRadialGradient(mx, my, 0, mx, my, 35);
    g.addColorStop(0, `rgba(${rgb}, 0.5)`);
    g.addColorStop(1, `rgba(${rgb}, 0)`);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(mx, my, 35, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  // ---- Main Loop ----
  _loop(time) {
    const dt = time - this._lastTime;
    this._lastTime = time;

    // FPS counter
    this._fpsTick++;
    this._fpsTime += dt;
    if (this._fpsTime >= 1000) {
      document.getElementById('stat-fps').textContent = this._fpsTick;
      this._fpsTick = 0;
      this._fpsTime = 0;
    }

    // Physics
    this._applyMouseForces();
    Engine.update(this.engine, Math.min(dt, 32));

    // Update celestial bodies
    for (const cb of this.celestialBodies) {
      cb.update();

      // Emit trail particles based on speed
      const speed = Math.sqrt(cb.vx * cb.vx + cb.vy * cb.vy);
      if (speed > 0.6 && Math.random() < this.trailDensity / 100) {
        this.particleSystem.emit(cb.x, cb.y, cb.trailRGB(), 1, {
          vx: -cb.vx * 0.08,
          vy: -cb.vy * 0.08,
          size: 1 + Math.random() * 1.5,
        });
      }
    }

    // Vortex particles
    if (this.mouseDown || this.rightDown) {
      for (let i = 0; i < 2; i++) {
        const angle = Math.random() * Math.PI * 2;
        const dist = 25 + Math.random() * 45;
        const dirMult = this.rightDown ? 1 : -1;
        this.particleSystem.emit(
          this.mouseX + Math.cos(angle) * dist,
          this.mouseY + Math.sin(angle) * dist,
          this.rightDown ? '255, 60, 80' : this.theme.vortex,
          1,
          { vx: dirMult * Math.cos(angle) * 1.8, vy: dirMult * Math.sin(angle) * 1.8, size: 1.2 }
        );
      }
    }

    this.particleSystem.update();

    // === RENDER ===

    // 1) Starfield
    this.starField.render(time);

    // 2) Main canvas
    const ctx = this.mainCtx;
    ctx.clearRect(0, 0, this.mainCanvas.width, this.mainCanvas.height);

    // Gravity well indicator
    if (this.mouseDown || this.rightDown) {
      this._renderGravityWell(ctx, time);
    }

    // Body trails
    for (const cb of this.celestialBodies) {
      cb.renderTrail(ctx);
    }

    // Bodies
    for (const cb of this.celestialBodies) {
      cb.render(ctx, time);
    }

    // Title
    this.title.render(ctx, this.theme);

    // Supernova white flash
    if (this.supernovaFlash > 0) {
      ctx.fillStyle = `rgba(255, 255, 230, ${this.supernovaFlash * 0.7})`;
      ctx.fillRect(0, 0, this.mainCanvas.width, this.mainCanvas.height);
      this.supernovaFlash -= 0.018;
    }

    // 3) Particle overlay
    this.particleSystem.render();

    requestAnimationFrame(t => this._loop(t));
  }
}

// ============================================================
// 7. INITIALIZATION
// ============================================================

window.addEventListener('DOMContentLoaded', () => {
  const sim = new Simulation();
  // Expose for debugging
  window.__sim = sim;
});
