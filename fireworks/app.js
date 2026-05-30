/* ----------------------------------------------------
   NEON FLAME - FIREWORKS ENGINE & WEB AUDIO SYNTH
   ---------------------------------------------------- */

// ==========================================
// 1. Math Helpers & Physics Vector Class
// ==========================================
class Vector {
    constructor(x = 0, y = 0) {
        this.x = x;
        this.y = y;
    }

    add(v) {
        this.x += v.x;
        this.y += v.y;
        return this;
    }

    sub(v) {
        this.x -= v.x;
        this.y -= v.y;
        return this;
    }

    mult(n) {
        this.x *= n;
        this.y *= n;
        return this;
    }

    div(n) {
        this.x /= n;
        this.y /= n;
        return this;
    }

    copy() {
        return new Vector(this.x, this.y);
    }

    mag() {
        return Math.sqrt(this.x * this.x + this.y * this.y);
    }

    normalize() {
        const m = this.mag();
        if (m !== 0) this.div(m);
        return this;
    }

    setMag(len) {
        return this.normalize().mult(len);
    }
}

// Random float between min and max
const randomRange = (min, max) => Math.random() * (max - min) + min;
// Random integer between min and max
const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

// ==========================================
// 2. Synthesizer Sound Engine (Web Audio API)
// ==========================================
class SoundEngine {
    constructor() {
        this.ctx = null;
        this.enabled = true;
        this.volume = 0.6;
        this.masterGain = null;
    }

    init() {
        if (this.ctx) return;
        try {
            const AudioContextClass = window.AudioContext || window.webkitAudioContext;
            this.ctx = new AudioContextClass();
            this.masterGain = this.ctx.createGain();
            this.masterGain.gain.setValueAtTime(this.volume, this.ctx.currentTime);
            this.masterGain.connect(this.ctx.destination);
            console.log("Audio Context initialized successfully.");
        } catch (e) {
            console.warn("Web Audio API is not supported in this browser:", e);
        }
    }

    setVolume(vol) {
        this.volume = parseFloat(vol);
        if (this.masterGain && this.ctx) {
            this.masterGain.gain.setValueAtTime(this.volume, this.ctx.currentTime);
        }
    }

    toggle(state) {
        this.enabled = state;
        if (this.enabled) {
            this.init();
            if (this.ctx && this.ctx.state === 'suspended') {
                this.ctx.resume();
            }
        }
    }

    createNoiseBuffer() {
        if (!this.ctx) return null;
        const bufferSize = this.ctx.sampleRate * 1.5; // 1.5 seconds of noise
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }
        return buffer;
    }

    playLaunch() {
        if (!this.enabled || !this.ctx) return;
        if (this.ctx.state === 'suspended') this.ctx.resume();

        const now = this.ctx.currentTime;
        
        // Launch WHOOSH sound
        const osc = this.ctx.createOscillator();
        const filter = this.ctx.createBiquadFilter();
        const gain = this.ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(60, now);
        // Upward pitch sweep to simulate launch rocket acceleration
        osc.frequency.exponentialRampToValueAtTime(380, now + 0.6);

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(150, now);
        filter.frequency.exponentialRampToValueAtTime(1200, now + 0.5);

        gain.gain.setValueAtTime(0.01, now);
        gain.gain.linearRampToValueAtTime(0.4, now + 0.1);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.65);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterGain);

        osc.start(now);
        osc.stop(now + 0.7);
    }

    playExplosion(intensity = 1.0) {
        if (!this.enabled || !this.ctx) return;
        if (this.ctx.state === 'suspended') this.ctx.resume();

        const now = this.ctx.currentTime;
        const duration = randomRange(0.6, 1.2) * (0.8 + intensity * 0.2);

        // 1. Deep Bass BOOM (Sub-woofer element)
        const bassOsc = this.ctx.createOscillator();
        const bassGain = this.ctx.createGain();

        bassOsc.type = 'sine';
        bassOsc.frequency.setValueAtTime(130, now);
        // Exponential decay of boom pitch down to felt vibrations
        bassOsc.frequency.exponentialRampToValueAtTime(25, now + 0.4);

        bassGain.gain.setValueAtTime(0.8 * intensity, now);
        bassGain.gain.exponentialRampToValueAtTime(0.001, now + duration);

        bassOsc.connect(bassGain);
        bassGain.connect(this.masterGain);
        bassOsc.start(now);
        bassOsc.stop(now + duration);

        // 2. High-Frequency Impact Pop (Sharp cracker burst)
        const midOsc = this.ctx.createOscillator();
        const midGain = this.ctx.createGain();

        midOsc.type = 'triangle';
        midOsc.frequency.setValueAtTime(280, now);
        midOsc.frequency.exponentialRampToValueAtTime(80, now + 0.15);

        midGain.gain.setValueAtTime(0.5 * intensity, now);
        midGain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

        midOsc.connect(midGain);
        midGain.connect(this.masterGain);
        midOsc.start(now);
        midOsc.stop(now + 0.22);
    }

    playCrackle(count = 12) {
        if (!this.enabled || !this.ctx) return;
        
        const now = this.ctx.currentTime;
        const noiseBuffer = this.createNoiseBuffer();
        if (!noiseBuffer) return;

        // Play brief high-passed noise impulses simulating realistic willow sparkles
        for (let i = 0; i < count; i++) {
            const delay = randomRange(0.1, 0.65);
            const fireTime = now + delay;
            
            const noise = this.ctx.createBufferSource();
            noise.buffer = noiseBuffer;

            const filter = this.ctx.createBiquadFilter();
            filter.type = 'highpass';
            filter.frequency.setValueAtTime(randomRange(1500, 3500), fireTime);

            const gain = this.ctx.createGain();
            const volume = randomRange(0.12, 0.35);
            gain.gain.setValueAtTime(volume, fireTime);
            gain.gain.exponentialRampToValueAtTime(0.001, fireTime + randomRange(0.03, 0.08));

            noise.connect(filter);
            filter.connect(gain);
            gain.connect(this.masterGain);

            noise.start(fireTime);
            noise.stop(fireTime + 0.1);
        }
    }
}

const synth = new SoundEngine();

// ==========================================
// 3. Cosmic Parallax Starfield Background
// ==========================================
class Starfield {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.stars = [];
        this.resize();
        this.initStars();
    }

    resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }

    initStars() {
        this.stars = [];
        const starCount = Math.floor((this.canvas.width * this.canvas.height) / 8000);
        for (let i = 0; i < starCount; i++) {
            this.stars.push({
                x: Math.random() * this.canvas.width,
                y: Math.random() * this.canvas.height,
                size: randomRange(0.5, 1.8),
                alpha: randomRange(0.1, 0.8),
                twinkleSpeed: randomRange(0.005, 0.02),
                color: this.getRandomStarColor()
            });
        }
    }

    getRandomStarColor() {
        const colors = [
            'rgba(173, 216, 230, ', // Light Blue
            'rgba(240, 248, 255, ', // White/Alice Blue
            'rgba(255, 240, 245, ', // Soft Lavender
            'rgba(255, 250, 205, ', // Lemon Chiffon
            'rgba(255, 182, 193, '  // Light Pink
        ];
        return colors[Math.floor(Math.random() * colors.length)];
    }

    draw() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Twinkle and Render Stars
        for (let star of this.stars) {
            star.alpha += star.twinkleSpeed;
            if (star.alpha > 0.95 || star.alpha < 0.1) {
                star.twinkleSpeed = -star.twinkleSpeed;
            }
            
            this.ctx.fillStyle = star.color + Math.max(0, star.alpha) + ')';
            this.ctx.beginPath();
            this.ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
            this.ctx.fill();
        }
    }
}

// ==========================================
// 4. Color Palettes Configuration
// ==========================================
const Palettes = {
    cyberpunk: [
        { h: 325, s: 100, l: 55 }, // Hot Magenta
        { h: 180, s: 100, l: 50 }, // Electric Cyan
        { h: 280, s: 100, l: 60 }, // Electric Violet
        { h: 55, s: 100, l: 50 }   // Acid Yellow
    ],
    golden: [
        { h: 42, s: 100, l: 55 },  // Premium Gold
        { h: 35, s: 80, l: 65 },   // Champagne
        { h: 28, s: 70, l: 45 },   // Bronze
        { h: 48, s: 100, l: 65 }   // Bright Amber
    ],
    pastel: [
        { h: 260, s: 85, l: 78 },  // Soft Lavender
        { h: 18, s: 95, l: 75 },   // Soft Peach
        { h: 155, s: 75, l: 72 },  // Pale Mint
        { h: 340, s: 90, l: 78 }   // Light Rose pink
    ],
    'fire-ice': [
        { h: 10, s: 100, l: 50 },  // Blazing Crimson
        { h: 198, s: 100, l: 50 }, // Glacier Ice Blue
        { h: 35, s: 100, l: 52 },  // Bright Orange
        { h: 205, s: 100, l: 60 }  // Cyan Ice
    ],
    emerald: [
        { h: 145, s: 100, l: 50 }, // Deep Emerald
        { h: 165, s: 95, l: 45 },  // Teal Aurora
        { h: 120, s: 85, l: 60 },  // Lime Glow
        { h: 190, s: 100, l: 45 }  // Ocean turquoise
    ],
    rainbow: [
        { h: 0, s: 100, l: 55 },   // Red
        { h: 35, s: 100, l: 55 },  // Orange
        { h: 60, s: 100, l: 50 },  // Yellow
        { h: 130, s: 95, l: 52 },  // Green
        { h: 210, s: 100, l: 55 }, // Blue
        { h: 275, s: 100, l: 55 }  // Purple
    ]
};

// Retrieve a random HSL color from the chosen theme
function getThemeColor(themeName) {
    const palette = Palettes[themeName] || Palettes['rainbow'];
    const col = palette[Math.floor(Math.random() * palette.length)];
    return { ...col }; // Return cloned object
}

// ==========================================
// 5. Firework Spark (Particle) Class
// ==========================================
class Particle {
    constructor(x, y, color, speed, angle, type = 'classic', opt = {}) {
        this.pos = new Vector(x, y);
        this.prevPos = this.pos.copy();
        
        // Calculate physics velocity
        this.vel = new Vector(Math.cos(angle), Math.sin(angle)).mult(speed);
        
        this.color = color; // HSL object: {h, s, l}
        this.alpha = 1;
        this.size = randomRange(1.2, 2.6);
        
        // Custom fade rates depending on particle types
        this.decay = randomRange(0.007, 0.015);
        this.friction = 0.96;
        this.gravity = opt.gravity !== undefined ? opt.gravity : 0.12;
        this.wind = opt.wind !== undefined ? opt.wind : 0.0;
        
        this.sparkle = Math.random() > 0.4;
        this.twinkleFreq = randomRange(4, 12);
        
        this.type = type;
        this.lifeCount = 0;
        
        // Willow cascade configurations
        if (this.type === 'willow') {
            this.friction = 0.985; // Less resistance to glide
            this.decay = randomRange(0.005, 0.01); // Lasts longer
            this.gravity = this.gravity * 0.75; // Drifts slower
        }
        
        // Splitting crossettes configurations
        if (this.type === 'crossette') {
            this.decay = randomRange(0.016, 0.024); // Dies faster, then splits
            this.friction = 0.95;
            this.hasSplit = false;
        }
    }

    update() {
        this.prevPos = this.pos.copy();
        
        // Physics update
        this.vel.x += this.wind;
        this.vel.y += this.gravity;
        this.vel.mult(this.friction);
        
        this.pos.add(this.vel);
        
        // Decay
        this.alpha -= this.decay;
        this.lifeCount++;
        
        // Subtle color shifting over lifespan (makes firework feel highly dynamic)
        this.color.h = (this.color.h + 0.3) % 360;
        if (this.type === 'willow') {
            // Gold decay shift
            this.color.l = Math.max(20, this.color.l - 0.15);
        }
    }

    draw(ctx) {
        if (this.alpha <= 0) return;

        ctx.save();
        
        // Sparkle / Twinkle calculation
        let drawAlpha = this.alpha;
        if (this.sparkle) {
            const flicker = Math.sin(this.lifeCount * this.twinkleFreq) * 0.4 + 0.6;
            drawAlpha *= flicker;
        }
        
        ctx.strokeStyle = `hsla(${this.color.h}, ${this.color.s}%, ${this.color.l}%, ${drawAlpha})`;
        ctx.lineWidth = this.size;
        ctx.lineCap = 'round';
        
        // Motion trail vector
        ctx.beginPath();
        ctx.moveTo(this.prevPos.x, this.prevPos.y);
        ctx.lineTo(this.pos.x, this.pos.y);
        ctx.stroke();
        
        // Add core glow for visual richness
        if (this.alpha > 0.5) {
            ctx.strokeStyle = `hsla(${this.color.h}, 100%, 95%, ${drawAlpha * 0.5})`;
            ctx.lineWidth = this.size * 0.4;
            ctx.beginPath();
            ctx.moveTo(this.prevPos.x, this.prevPos.y);
            ctx.lineTo(this.pos.x, this.pos.y);
            ctx.stroke();
        }
        
        ctx.restore();
    }
}

// ==========================================
// 6. Interactive Cursor Stardust Sparkle
// ==========================================
class Stardust {
    constructor(x, y) {
        this.pos = new Vector(x, y);
        this.vel = new Vector(randomRange(-1.5, 1.5), randomRange(-0.8, 1.8));
        this.color = { h: randomRange(170, 290), s: 100, l: 65 }; // Teal-pink magic gradient
        this.alpha = 1.0;
        this.decay = randomRange(0.015, 0.03);
        this.size = randomRange(1.0, 2.2);
    }

    update() {
        this.vel.y += 0.04; // Gravity drift
        this.vel.mult(0.97);
        this.pos.add(this.vel);
        this.alpha -= this.decay;
    }

    draw(ctx) {
        if (this.alpha <= 0) return;
        ctx.beginPath();
        ctx.fillStyle = `hsla(${this.color.h}, ${this.color.s}%, ${this.color.l}%, ${this.alpha})`;
        ctx.arc(this.pos.x, this.pos.y, this.size, 0, Math.PI * 2);
        ctx.fill();
    }
}

// ==========================================
// 7. Firework Rocket (Ascending Phase)
// ==========================================
class Firework {
    constructor(startX, startY, targetX, targetY, theme, type, opt = {}) {
        this.pos = new Vector(startX, startY);
        this.target = new Vector(targetX, targetY);
        this.theme = theme;
        this.type = type;
        
        // Visual configs
        this.density = opt.density || 150;
        this.gravity = opt.gravity !== undefined ? opt.gravity : 0.12;
        this.wind = opt.wind !== undefined ? opt.wind : 0.0;
        this.speed = opt.speed || 12;

        // Path calculation
        const pathVector = this.target.copy().sub(this.pos);
        const distance = pathVector.mag();
        
        // Velocity vector to peak exactly at the coordinates
        this.vel = pathVector.setMag(this.speed);
        
        // Sparks trailing behind ascending rocket
        this.rocketTrail = [];
        this.exploded = false;
        
        this.hue = randomInt(0, 360);
        this.trailTimer = 0;
        
        // Play synthesizer whoosh launch sound
        synth.playLaunch();
    }

    update() {
        if (this.exploded) return true;

        this.pos.add(this.vel);
        
        // Add drag to slow down slightly towards the apex
        this.vel.mult(0.982);
        
        // Accumulate trailing ascent sparks
        this.trailTimer++;
        if (this.trailTimer % 2 === 0) {
            this.rocketTrail.push({
                pos: this.pos.copy(),
                alpha: 0.9,
                decay: randomRange(0.04, 0.08),
                size: randomRange(1.0, 2.0),
                color: { h: (this.hue + this.trailTimer) % 360, s: 95, l: 60 }
            });
        }

        // Limit trail array sizes
        if (this.rocketTrail.length > 25) {
            this.rocketTrail.shift();
        }

        // Update trail particles
        for (let pt of this.rocketTrail) {
            pt.alpha -= pt.decay;
        }

        // Check if rocket has reached peak (declining speed or near target height)
        if (this.vel.mag() < 1.5 || this.pos.y <= this.target.y || this.vel.y >= 0) {
            this.exploded = true;
            return true;
        }
        
        return false;
    }

    draw(ctx) {
        if (this.exploded) return;

        // Draw ascending trailing smoke
        for (let pt of this.rocketTrail) {
            if (pt.alpha <= 0) continue;
            ctx.beginPath();
            ctx.fillStyle = `hsla(${pt.color.h}, ${pt.color.s}%, ${pt.color.l}%, ${pt.alpha})`;
            ctx.arc(pt.pos.x, pt.pos.y, pt.size, 0, Math.PI * 2);
            ctx.fill();
        }

        // Rocket core head (bright flare)
        ctx.beginPath();
        ctx.fillStyle = `rgba(255, 255, 255, 0.95)`;
        ctx.shadowColor = `hsla(${this.hue}, 100%, 65%, 0.8)`;
        ctx.shadowBlur = 10;
        ctx.arc(this.pos.x, this.pos.y, 2.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0; // Reset canvas shadows to prevent performance hit
    }

    // Detonate and create beautiful shape matrices
    explode(particlesArray) {
        // Trigger synth explosion sound
        const intensity = this.density / 200; // Harder blast with larger density
        synth.playExplosion(intensity);

        const colorBase = getThemeColor(this.theme);
        
        let typeToUse = this.type;
        if (typeToUse === 'random') {
            const types = ['classic', 'ring', 'double', 'heart', 'star', 'willow', 'crossette'];
            typeToUse = types[Math.floor(Math.random() * types.length)];
        }

        const angleStep = (Math.PI * 2) / this.density;

        switch (typeToUse) {
            case 'ring':
                // Single clean expanding shell
                for (let i = 0; i < this.density; i++) {
                    const angle = i * angleStep;
                    const speed = randomRange(5.5, 6.5);
                    const color = { ...colorBase };
                    particlesArray.push(new Particle(this.pos.x, this.pos.y, color, speed, angle, 'ring', {
                        gravity: this.gravity,
                        wind: this.wind
                    }));
                }
                break;

            case 'double':
                // Inner and outer distinct shells for dramatic depth
                for (let i = 0; i < this.density; i++) {
                    const angle = i * angleStep;
                    const isOuter = i % 2 === 0;
                    const speed = isOuter ? randomRange(7.0, 8.0) : randomRange(4.0, 4.8);
                    
                    // Distinct hue for inner ring to stand out
                    const color = { ...colorBase };
                    if (!isOuter) {
                        color.h = (color.h + 60) % 360;
                    }
                    
                    particlesArray.push(new Particle(this.pos.x, this.pos.y, color, speed, angle, 'double', {
                        gravity: this.gravity,
                        wind: this.wind
                    }));
                }
                break;

            case 'heart':
                // Cardiod formula: x = 16 * sin^3(t), y = 13 * cos(t) - 5 * cos(2t) - 2 * cos(3t) - cos(4t)
                for (let i = 0; i < this.density; i++) {
                    const angle = i * angleStep;
                    // Formula maps starting at Y pointing up
                    const t = angle - Math.PI / 2;
                    
                    const xFactor = 16 * Math.pow(Math.sin(t), 3);
                    const yFactor = -(13 * Math.cos(t) - 5 * Math.cos(2*t) - 2 * Math.cos(3*t) - Math.cos(4*t)); // Invert Y for screen coords
                    
                    // Create trajectory vector
                    const heartVec = new Vector(xFactor, yFactor);
                    const speed = heartVec.mag() * 0.4;
                    const particleAngle = Math.atan2(heartVec.y, heartVec.x);
                    
                    particlesArray.push(new Particle(this.pos.x, this.pos.y, { ...colorBase }, speed, particleAngle, 'heart', {
                        gravity: this.gravity * 0.6, // Low gravity so shape doesn't warp quickly
                        wind: this.wind
                    }));
                }
                break;

            case 'star':
                // Star shapes using math polar scaling
                const arms = 5;
                const innerRadius = 2.5;
                const outerRadius = 7.0;
                
                for (let i = 0; i < this.density; i++) {
                    const angle = i * angleStep;
                    
                    // Standard polar interpolation to draw 5 sharp edges
                    const armAngle = (Math.PI * 2) / arms;
                    const relAngle = angle % armAngle;
                    const halfArm = armAngle / 2;
                    const factor = Math.abs(relAngle - halfArm) / halfArm;
                    const speed = innerRadius + (outerRadius - innerRadius) * (1 - factor);
                    
                    particlesArray.push(new Particle(this.pos.x, this.pos.y, { ...colorBase }, speed, angle, 'star', {
                        gravity: this.gravity * 0.65, // Let star layout drop slowly
                        wind: this.wind
                    }));
                }
                break;

            case 'willow':
                // Golden glittering weeping willow cascades
                const willowColor = { h: 40, s: 95, l: 60 }; // Beautiful warm bronze gold
                for (let i = 0; i < this.density; i++) {
                    const angle = Math.random() * Math.PI * 2;
                    const speed = randomRange(1.5, 6.0); // Broad range of speeds creates soft waterfall
                    particlesArray.push(new Particle(this.pos.x, this.pos.y, { ...willowColor }, speed, angle, 'willow', {
                        gravity: this.gravity * 0.8,
                        wind: this.wind
                    }));
                }
                // Play extra synthetic crackling sound
                synth.playCrackle(Math.floor(this.density * 0.1));
                break;

            case 'crossette':
                // Fast particles that break into crosses
                for (let i = 0; i < this.density; i++) {
                    const angle = i * angleStep;
                    const speed = randomRange(5.5, 7.5);
                    particlesArray.push(new Particle(this.pos.x, this.pos.y, { ...colorBase }, speed, angle, 'crossette', {
                        gravity: this.gravity,
                        wind: this.wind
                    }));
                }
                break;

            case 'classic':
            default:
                // Traditional spherical blast
                for (let i = 0; i < this.density; i++) {
                    const angle = Math.random() * Math.PI * 2;
                    const speed = randomRange(2.0, 8.5);
                    particlesArray.push(new Particle(this.pos.x, this.pos.y, { ...colorBase }, speed, angle, 'classic', {
                        gravity: this.gravity,
                        wind: this.wind
                    }));
                }
                break;
        }
    }
}

// ==========================================
// 8. Main Application Controller
// ==========================================
class ShowcaseController {
    constructor() {
        this.canvas = document.getElementById('fireworksCanvas');
        this.ctx = this.canvas.getContext('2d');
        
        this.rockets = [];
        this.particles = [];
        this.stardust = [];
        
        this.starfield = new Starfield('starsCanvas');
        
        // Physics and show states
        this.autoLaunch = true;
        this.launchInterval = 800; // ms
        this.lastLaunchTime = 0;
        
        // Element settings
        this.activeTheme = 'rainbow';
        this.activeType = 'random';
        this.activeDensity = 150;
        this.activeTrail = 0.12;
        this.activeGravity = 0.12;
        this.activeWind = 0.0;
        this.activeSpeed = 12;
        
        // Cursor tracking
        this.mousePos = new Vector();
        this.isMouseDown = false;
        
        // FPS trackers
        this.lastFpsUpdate = 0;
        this.fpsFrameCount = 0;
        this.currentFps = 60;
        
        // Launch Show Choreographer
        this.currentShowIndex = 0;
        this.showTimer = null;
        
        this.resize();
        this.bindEvents();
        this.setupDefaults();
        
        // Launch initial welcome sequence
        setTimeout(() => this.launchInitialShow(), 1500);
    }

    resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        this.starfield.resize();
        this.starfield.initStars();
    }

    setupDefaults() {
        // Force volume sync
        const vol = document.getElementById('volumeSlider').value;
        synth.setVolume(vol);
        
        const soundChecked = document.getElementById('soundToggle').checked;
        synth.toggle(soundChecked);
    }

    bindEvents() {
        window.addEventListener('resize', () => this.resize());

        // Mouse detonate events
        this.canvas.addEventListener('mousedown', (e) => {
            synth.init(); // Initialize synthetic context on interaction
            this.isMouseDown = true;
            this.mousePos.x = e.clientX;
            this.mousePos.y = e.clientY;
            
            // Detonate target
            this.launchTargetFirework(e.clientX, e.clientY);
        });

        this.canvas.addEventListener('mousemove', (e) => {
            this.mousePos.x = e.clientX;
            this.mousePos.y = e.clientY;
            
            if (this.isMouseDown) {
                // Generate magical tracking stardust
                for (let i = 0; i < 3; i++) {
                    this.stardust.push(new Stardust(e.clientX, e.clientY));
                }
            }
        });

        window.addEventListener('mouseup', () => {
            this.isMouseDown = false;
        });

        // Touch support for mobiles
        this.canvas.addEventListener('touchstart', (e) => {
            synth.init();
            this.isMouseDown = true;
            const touch = e.touches[0];
            this.mousePos.x = touch.clientX;
            this.mousePos.y = touch.clientY;
            this.launchTargetFirework(touch.clientX, touch.clientY);
        });

        this.canvas.addEventListener('touchmove', (e) => {
            const touch = e.touches[0];
            this.mousePos.x = touch.clientX;
            this.mousePos.y = touch.clientY;
            if (this.isMouseDown) {
                for (let i = 0; i < 2; i++) {
                    this.stardust.push(new Stardust(touch.clientX, touch.clientY));
                }
            }
        });

        window.addEventListener('touchend', () => {
            this.isMouseDown = false;
        });

        // Bind all UI Configuration Controllers
        this.bindSliders();
        this.bindPresets();
        
        // Collapsible controllers
        const sidebar = document.getElementById('settingsPanel');
        const toggleBtn = document.getElementById('toggleControlsBtn');
        const closeBtn = document.getElementById('closeSidebarBtn');

        toggleBtn.addEventListener('click', () => {
            sidebar.classList.toggle('active');
        });

        closeBtn.addEventListener('click', () => {
            sidebar.classList.remove('active');
        });

        // Instructions overlay controls
        const overlay = document.getElementById('instructionOverlay');
        const dismissBtn = document.getElementById('dismissInstructionsBtn');
        
        dismissBtn.addEventListener('click', () => {
            synth.init(); // Awake audio context
            overlay.classList.add('fade-out');
        });

        // Quick Sound toggle
        const quickSoundBtn = document.getElementById('quickSoundBtn');
        const soundToggle = document.getElementById('soundToggle');
        const soundOnIcon = quickSoundBtn.querySelector('.sound-on-icon');
        const soundOffIcon = quickSoundBtn.querySelector('.sound-off-icon');

        const updateSoundUI = (enabled) => {
            if (enabled) {
                soundOnIcon.classList.remove('hidden');
                soundOffIcon.classList.add('hidden');
                soundToggle.checked = true;
            } else {
                soundOnIcon.classList.add('hidden');
                soundOffIcon.classList.remove('hidden');
                soundToggle.checked = false;
            }
        };

        quickSoundBtn.addEventListener('click', () => {
            const state = !synth.enabled;
            synth.toggle(state);
            updateSoundUI(state);
        });

        soundToggle.addEventListener('change', (e) => {
            const state = e.target.checked;
            synth.toggle(state);
            updateSoundUI(state);
        });
    }

    bindSliders() {
        // Sync sliders with memory and display texts
        const autoToggle = document.getElementById('autoLaunchToggle');
        autoToggle.addEventListener('change', (e) => {
            this.autoLaunch = e.target.checked;
        });

        const intervalSlider = document.getElementById('launchInterval');
        const intervalVal = document.getElementById('launchIntervalVal');
        intervalSlider.addEventListener('input', (e) => {
            this.launchInterval = parseInt(e.target.value);
            intervalVal.textContent = `${this.launchInterval}ms`;
        });

        const fireworkType = document.getElementById('fireworkType');
        fireworkType.addEventListener('change', (e) => {
            this.activeType = e.target.value;
        });

        const colorTheme = document.getElementById('colorTheme');
        colorTheme.addEventListener('change', (e) => {
            this.activeTheme = e.target.value;
        });

        const densitySlider = document.getElementById('particleDensity');
        const densityVal = document.getElementById('particleDensityVal');
        densitySlider.addEventListener('input', (e) => {
            this.activeDensity = parseInt(e.target.value);
            densityVal.textContent = this.activeDensity;
        });

        const trailSlider = document.getElementById('trailLength');
        const trailVal = document.getElementById('trailLengthVal');
        trailSlider.addEventListener('input', (e) => {
            this.activeTrail = parseFloat(e.target.value);
            let speedText = 'Medium';
            if (this.activeTrail < 0.08) speedText = 'Long Sparks';
            if (this.activeTrail > 0.20) speedText = 'Short Sparks';
            trailVal.textContent = speedText;
        });

        const gravitySlider = document.getElementById('gravitySlider');
        const gravityVal = document.getElementById('gravitySliderVal');
        gravitySlider.addEventListener('input', (e) => {
            this.activeGravity = parseFloat(e.target.value);
            gravityVal.textContent = this.activeGravity.toFixed(2);
        });

        const windSlider = document.getElementById('windSlider');
        const windVal = document.getElementById('windSliderVal');
        windSlider.addEventListener('input', (e) => {
            this.activeWind = parseFloat(e.target.value);
            let windText = 'Calm';
            if (this.activeWind < -0.05) windText = '← Strong West';
            else if (this.activeWind < -0.01) windText = '← Light Breeze';
            else if (this.activeWind > 0.05) windText = 'Strong East →';
            else if (this.activeWind > 0.01) windText = 'Light Breeze →';
            windVal.textContent = windText;
        });

        const speedSlider = document.getElementById('rocketSpeed');
        const speedVal = document.getElementById('rocketSpeedVal');
        speedSlider.addEventListener('input', (e) => {
            this.activeSpeed = parseFloat(e.target.value);
            let speedText = 'Medium';
            if (this.activeSpeed < 10) speedText = 'Low Sky';
            if (this.activeSpeed > 15) speedText = 'Stratospheric';
            speedVal.textContent = speedText;
        });

        const volumeSlider = document.getElementById('volumeSlider');
        const volumeVal = document.getElementById('volumeSliderVal');
        volumeSlider.addEventListener('input', (e) => {
            const vol = parseFloat(e.target.value);
            synth.setVolume(vol);
            volumeVal.textContent = `${Math.round(vol * 100)}%`;
        });
    }

    bindPresets() {
        const presets = document.querySelectorAll('.preset-btn');
        presets.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const target = e.currentTarget;
                presets.forEach(b => b.classList.remove('active'));
                target.classList.add('active');
                
                const presetKey = target.getAttribute('data-preset');
                this.loadPreset(presetKey);
            });
        });
    }

    loadPreset(key) {
        clearInterval(this.showTimer); // Cancel current show timer
        
        const syncUIElement = (id, val, textId = null, text = null) => {
            const el = document.getElementById(id);
            if (el) {
                el.value = val;
                // Dispatch event to update internal ShowcaseController variables
                el.dispatchEvent(new Event('input'));
                el.dispatchEvent(new Event('change'));
            }
            if (textId && text) {
                document.getElementById(textId).textContent = text;
            }
        };

        switch (key) {
            case 'grand-finale':
                syncUIElement('autoLaunchToggle', true);
                this.autoLaunch = true;
                document.getElementById('autoLaunchToggle').checked = true;
                
                syncUIElement('launchInterval', 300, 'launchIntervalVal', '300ms');
                syncUIElement('fireworkType', 'random');
                syncUIElement('colorTheme', 'rainbow');
                syncUIElement('particleDensity', 180, 'particleDensityVal', '180');
                syncUIElement('trailLength', 0.15, 'trailLengthVal', 'Medium');
                syncUIElement('gravitySlider', 0.10, 'gravitySliderVal', '0.10');
                syncUIElement('windSlider', 0.0, 'windSliderVal', 'Calm');
                syncUIElement('rocketSpeed', 14, 'rocketSpeedVal', 'Stratospheric');
                
                // Active rapid sequence triggers
                this.runGrandFinaleChoreography();
                break;

            case 'neon-storm':
                syncUIElement('autoLaunchToggle', true);
                this.autoLaunch = true;
                document.getElementById('autoLaunchToggle').checked = true;

                syncUIElement('launchInterval', 600, 'launchIntervalVal', '600ms');
                syncUIElement('fireworkType', 'double');
                syncUIElement('colorTheme', 'cyberpunk');
                syncUIElement('particleDensity', 240, 'particleDensityVal', '240');
                syncUIElement('trailLength', 0.08, 'trailLengthVal', 'Long Sparks');
                syncUIElement('gravitySlider', 0.14, 'gravitySliderVal', '0.14');
                syncUIElement('windSlider', 0.06, 'windSliderVal', 'Strong East →');
                syncUIElement('rocketSpeed', 13, 'rocketSpeedVal', 'Medium');
                break;

            case 'golden-willow':
                syncUIElement('autoLaunchToggle', true);
                this.autoLaunch = true;
                document.getElementById('autoLaunchToggle').checked = true;

                syncUIElement('launchInterval', 1200, 'launchIntervalVal', '1200ms');
                syncUIElement('fireworkType', 'willow');
                syncUIElement('colorTheme', 'golden');
                syncUIElement('particleDensity', 300, 'particleDensityVal', '300');
                syncUIElement('trailLength', 0.06, 'trailLengthVal', 'Long Sparks');
                syncUIElement('gravitySlider', 0.08, 'gravitySliderVal', '0.08');
                syncUIElement('windSlider', -0.02, 'windSliderVal', '← Light Breeze');
                syncUIElement('rocketSpeed', 15.5, 'rocketSpeedVal', 'Stratospheric');
                break;

            case 'heart-symphony':
                syncUIElement('autoLaunchToggle', true);
                this.autoLaunch = true;
                document.getElementById('autoLaunchToggle').checked = true;

                syncUIElement('launchInterval', 1500, 'launchIntervalVal', '1500ms');
                syncUIElement('fireworkType', 'heart');
                syncUIElement('colorTheme', 'pastel');
                syncUIElement('particleDensity', 160, 'particleDensityVal', '160');
                syncUIElement('trailLength', 0.18, 'trailLengthVal', 'Short Sparks');
                syncUIElement('gravitySlider', 0.06, 'gravitySliderVal', '0.06');
                syncUIElement('windSlider', 0.0, 'windSliderVal', 'Calm');
                syncUIElement('rocketSpeed', 11, 'rocketSpeedVal', 'Medium');
                break;
        }
    }

    runGrandFinaleChoreography() {
        let count = 0;
        this.showTimer = setInterval(() => {
            if (!this.autoLaunch) {
                clearInterval(this.showTimer);
                return;
            }
            
            // Launch simultaneous rockets at random horizontal intervals
            const launchX = randomRange(this.canvas.width * 0.15, this.canvas.width * 0.85);
            const targetX = launchX + randomRange(-80, 80);
            const targetY = randomRange(this.canvas.height * 0.15, this.canvas.height * 0.5);
            
            // Randomize types rapidly for grand finale visual chaos
            const finalTypes = ['double', 'willow', 'crossette', 'star', 'ring'];
            const randomPresetType = finalTypes[Math.floor(Math.random() * finalTypes.length)];
            
            this.rockets.push(new Firework(
                launchX, 
                this.canvas.height, 
                targetX, 
                targetY, 
                this.activeTheme, 
                randomPresetType, 
                {
                    density: this.activeDensity,
                    gravity: this.activeGravity,
                    wind: this.activeWind,
                    speed: this.activeSpeed
                }
            ));
            
            count++;
            if (count > 25) { // Slow down sequence back to automatic interval loops after 25 rapid iterations
                clearInterval(this.showTimer);
                // Return active class to default
                const grandBtn = document.querySelector('[data-preset="grand-finale"]');
                if (grandBtn) grandBtn.classList.remove('active');
            }
        }, 220);
    }

    launchInitialShow() {
        // Launches a beautiful visual welcome pattern of 3 aligned fireworks in succession
        const centerX = this.canvas.width / 2;
        
        setTimeout(() => {
            this.rockets.push(new Firework(centerX - 250, this.canvas.height, centerX - 200, this.canvas.height * 0.35, 'cyberpunk', 'ring', { density: 150 }));
        }, 200);

        setTimeout(() => {
            this.rockets.push(new Firework(centerX + 250, this.canvas.height, centerX + 200, this.canvas.height * 0.35, 'emerald', 'ring', { density: 150 }));
        }, 600);

        setTimeout(() => {
            this.rockets.push(new Firework(centerX, this.canvas.height, centerX, this.canvas.height * 0.25, 'golden', 'willow', { density: 250 }));
        }, 1200);
    }

    launchTargetFirework(x, y) {
        // User interactive launch (targets specific coordinates clicked)
        const startX = x + randomRange(-40, 40); // Launch slightly offset
        const targetX = x;
        const targetY = y;
        
        this.rockets.push(new Firework(
            startX, 
            this.canvas.height, 
            targetX, 
            targetY, 
            this.activeTheme, 
            this.activeType, 
            {
                density: this.activeDensity,
                gravity: this.activeGravity,
                wind: this.activeWind,
                speed: this.activeSpeed
            }
        ));
    }

    updateFPS(timestamp) {
        if (!this.lastFpsUpdate) {
            this.lastFpsUpdate = timestamp;
            return;
        }
        
        this.fpsFrameCount++;
        const delta = timestamp - this.lastFpsUpdate;
        
        if (delta >= 1000) {
            this.currentFps = Math.round((this.fpsFrameCount * 1000) / delta);
            document.getElementById('fpsValue').textContent = this.currentFps;
            
            // High particle performance throttle: if FPS drops below 35, dynamically lower density temporarily to preserve frame smoothness
            if (this.currentFps < 35 && this.activeDensity > 80) {
                this.activeDensity = Math.max(60, this.activeDensity - 20);
                const densitySlider = document.getElementById('particleDensity');
                if (densitySlider) {
                    densitySlider.value = this.activeDensity;
                    document.getElementById('particleDensityVal').textContent = this.activeDensity + ' (Throttled)';
                }
            }
            
            this.fpsFrameCount = 0;
            this.lastFpsUpdate = timestamp;
        }
    }

    loop(timestamp) {
        this.updateFPS(timestamp);

        // Clear canvas with trail alpha transparency (controls firework trail lengths)
        this.ctx.fillStyle = `rgba(3, 3, 8, ${this.activeTrail})`;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw parallax starfield
        this.starfield.draw();

        // 1. Auto launch logic
        if (this.autoLaunch) {
            const now = Date.now();
            if (now - this.lastLaunchTime > this.launchInterval) {
                const launchX = randomRange(this.canvas.width * 0.15, this.canvas.width * 0.85);
                const targetX = launchX + randomRange(-100, 100);
                const targetY = randomRange(this.canvas.height * 0.1, this.canvas.height * 0.55);
                
                this.rockets.push(new Firework(
                    launchX, 
                    this.canvas.height, 
                    targetX, 
                    targetY, 
                    this.activeTheme, 
                    this.activeType, 
                    {
                        density: this.activeDensity,
                        gravity: this.activeGravity,
                        wind: this.activeWind,
                        speed: this.activeSpeed
                    }
                ));
                
                this.lastLaunchTime = now;
            }
        }

        // 2. Rockets (Ascent Update & Draw)
        for (let i = this.rockets.length - 1; i >= 0; i--) {
            const rkt = this.rockets[i];
            const shouldExplode = rkt.update();
            rkt.draw(this.ctx);
            
            if (shouldExplode) {
                rkt.explode(this.particles);
                this.rockets.splice(i, 1);
            }
        }

        // 3. Particles (Explosion Update & Draw)
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const pt = this.particles[i];
            pt.update();
            pt.draw(this.ctx);
            
            // Split crossette particles upon their trigger time
            if (pt.type === 'crossette' && pt.alpha < 0.45 && !pt.hasSplit && pt.alpha > 0.3) {
                pt.hasSplit = true;
                const splitColors = { ...pt.color };
                
                // Explode in a perfect cross patterns
                const crossDirections = 4;
                for (let k = 0; k < crossDirections; k++) {
                    const splitAngle = (k * Math.PI) / 2 + randomRange(-0.1, 0.1);
                    const splitSpeed = randomRange(1.8, 2.5);
                    this.particles.push(new Particle(pt.pos.x, pt.pos.y, splitColors, splitSpeed, splitAngle, 'classic', {
                        gravity: this.activeGravity * 0.7,
                        wind: this.activeWind
                    }));
                }
            }

            if (pt.alpha <= 0) {
                this.particles.splice(i, 1);
            }
        }

        // 4. Cursor Stardust particles
        for (let i = this.stardust.length - 1; i >= 0; i--) {
            const sd = this.stardust[i];
            sd.update();
            sd.draw(this.ctx);
            if (sd.alpha <= 0) {
                this.stardust.splice(i, 1);
            }
        }

        // 5. Update floating diagnostics
        document.getElementById('sparksCount').textContent = this.particles.length;
        document.getElementById('rocketsCount').textContent = this.rockets.length;

        // Recursive animation frame
        requestAnimationFrame((t) => this.loop(t));
    }
}

// ==========================================
// 9. Document Bootstrapping
// ==========================================
window.addEventListener('DOMContentLoaded', () => {
    const app = new ShowcaseController();
    requestAnimationFrame((t) => app.loop(t));
});
