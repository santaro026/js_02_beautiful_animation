/**
 * Aurora Drift - Gaseous Plasma Fluid Dynamics & Solar Drone Synthesizer
 * 
 * Technical Implementation:
 * 1. Multi-frequency mathematical flow field (Vector field calculated analytically).
 * 2. High-performance particle physics with trail persistence, inertia, and custom HSL gradients.
 * 3. Web Audio API cosmic drone pad (Double detuned triangle synthesizers + Resonant low-pass filter).
 * 4. High-frequency solar wind sweep (Dynamic white noise filter modulation driven by cursor kinetic velocity).
 */

class AuroraSimulation {
    constructor() {
        this.canvas = document.getElementById('auroraCanvas');
        this.ctx = this.canvas.getContext('2d');
        
        // Physics Configurations
        this.particles = [];
        this.density = 1200;
        this.speedScale = 1.0;
        this.turbulence = 1.2;
        this.theme = 'emerald';
        this.trailPersistence = 0.04;
        this.glowBlur = 8;
        this.time = 0;
        
        // Mouse Coordinates & Kinematic Trackers
        this.mouse = { x: null, y: null, px: null, py: null, vx: 0, vy: 0, isDown: false };
        
        // Diagnostics
        this.fps = 0;
        this.lastTime = performance.now();
        this.frames = 0;
        
        // Sound Engine
        this.soundEngine = new CosmicDroneEngine();
        
        this.init();
    }

    init() {
        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());
        
        // Register Input Events
        this.setupEventListeners();
        
        // Initialize particle array
        this.adjustParticleCount();
        
        // Kickstart Render loop
        this.animate();
    }

    resizeCanvas() {
        const dpr = window.devicePixelRatio || 1;
        this.canvas.width = window.innerWidth * dpr;
        this.canvas.height = window.innerHeight * dpr;
        this.ctx.scale(dpr, dpr);
        
        this.canvas.style.width = `${window.innerWidth}px`;
        this.canvas.style.height = `${window.innerHeight}px`;
    }

    setupEventListeners() {
        const handleStart = (x, y) => {
            this.mouse.x = x;
            this.mouse.y = y;
            this.mouse.px = x;
            this.mouse.py = y;
            this.mouse.isDown = true;
            this.soundEngine.startDrone();
        };

        const handleMove = (x, y) => {
            this.mouse.x = x;
            this.mouse.y = y;
            if (this.mouse.px !== null && this.mouse.py !== null) {
                // Calculate kinetic velocities
                this.mouse.vx = x - this.mouse.px;
                this.mouse.vy = y - this.mouse.py;
                
                // Map mouse coordinates and velocity sweeps to the synthesizer
                this.soundEngine.updateParameters(x, y, this.mouse.vx, this.mouse.vy);
            }
            this.mouse.px = x;
            this.mouse.py = y;
        };

        const handleEnd = () => {
            this.mouse.isDown = false;
            this.mouse.vx = 0;
            this.mouse.vy = 0;
            this.soundEngine.fadeWind();
        };

        // Desktop Events
        window.addEventListener('mousedown', (e) => {
            if (e.target.closest('aside, header, button, select')) return;
            // Auto close mobile menu if clicking on canvas
            if (window.innerWidth <= 1024) {
                const sidebar = document.getElementById('settingsPanel');
                sidebar.classList.remove('active');
            }
            handleStart(e.clientX, e.clientY);
        });
        window.addEventListener('mousemove', (e) => {
            handleMove(e.clientX, e.clientY);
        });
        window.addEventListener('mouseup', handleEnd);

        // Mobile Touch Events
        window.addEventListener('touchstart', (e) => {
            if (e.target.closest('aside, header, button, select')) return;
            // Auto close mobile menu if clicking on canvas
            if (window.innerWidth <= 1024) {
                const sidebar = document.getElementById('settingsPanel');
                sidebar.classList.remove('active');
            }
            const touch = e.touches[0];
            handleStart(touch.clientX, touch.clientY);
        });
        window.addEventListener('touchmove', (e) => {
            const touch = e.touches[0];
            handleMove(touch.clientX, touch.clientY);
        });
        window.addEventListener('touchend', handleEnd);

        // UI Panel Configurations
        this.setupUIControls();
    }

    setupUIControls() {
        // Toggle Sidebar
        const settingsPanel = document.getElementById('settingsPanel');
        const toggleBtn = document.getElementById('toggleControlsBtn');
        const closeBtn = document.getElementById('closeSidebarBtn');
        
        toggleBtn.addEventListener('click', () => {
            settingsPanel.classList.toggle('active');
        });
        closeBtn.addEventListener('click', () => {
            settingsPanel.classList.remove('active');
        });

        // Instructions overlay dismissal
        const overlay = document.getElementById('instructionOverlay');
        const dismissBtn = document.getElementById('dismissInstructionsBtn');
        dismissBtn.addEventListener('click', () => {
            overlay.classList.add('fade-out');
            // Safely initialize audio context
            this.soundEngine.initAudioContext();
        });

        // Toggle sound btn
        const quickSoundBtn = document.getElementById('quickSoundBtn');
        const soundToggle = document.getElementById('soundToggle');
        const soundOn = quickSoundBtn.querySelector('.sound-on-icon');
        const soundOff = quickSoundBtn.querySelector('.sound-off-icon');
        
        const updateSoundUI = (enabled) => {
            if (enabled) {
                soundOn.classList.remove('hidden');
                soundOff.classList.add('hidden');
                soundToggle.checked = true;
            } else {
                soundOn.classList.add('hidden');
                soundOff.classList.remove('hidden');
                soundToggle.checked = false;
            }
        };

        quickSoundBtn.addEventListener('click', () => {
            const isActive = this.soundEngine.toggleMute();
            updateSoundUI(isActive);
        });

        // Sidebar Sound Toggle
        soundToggle.addEventListener('change', (e) => {
            const isMuted = !e.target.checked;
            this.soundEngine.setMuted(isMuted);
            updateSoundUI(!isMuted);
        });

        // Master Volume
        const volumeSlider = document.getElementById('volumeSlider');
        volumeSlider.addEventListener('input', (e) => {
            const val = parseFloat(e.target.value);
            document.getElementById('volumeSliderVal').innerText = `${Math.round(val * 100)}%`;
            this.soundEngine.setVolume(val);
        });

        // Particle Density Slider
        const densitySlider = document.getElementById('particleDensity');
        densitySlider.addEventListener('input', (e) => {
            this.density = parseInt(e.target.value);
            document.getElementById('particleDensityVal').innerText = this.density;
            this.adjustParticleCount();
        });

        // Flow Speed Slider
        const speedSlider = document.getElementById('flowSpeed');
        speedSlider.addEventListener('input', (e) => {
            this.speedScale = parseFloat(e.target.value);
            let display = 'Normal';
            if (this.speedScale > 1.8) display = 'Tempest';
            else if (this.speedScale > 1.3) display = 'Rapid';
            else if (this.speedScale < 0.5) display = 'Languid';
            document.getElementById('flowSpeedVal').innerText = display;
        });

        // Turbulence Slider
        const turbSlider = document.getElementById('turbulence');
        turbSlider.addEventListener('input', (e) => {
            this.turbulence = parseFloat(e.target.value);
            let display = 'Medium';
            if (this.turbulence > 2.2) display = 'Chaotic';
            else if (this.turbulence > 1.5) display = 'Swirling';
            else if (this.turbulence < 0.6) display = 'Laminar';
            document.getElementById('turbulenceVal').innerText = display;
        });

        // Trail Persistence Slider
        const trailSlider = document.getElementById('trailPersistence');
        trailSlider.addEventListener('input', (e) => {
            this.trailPersistence = parseFloat(e.target.value);
            let display = 'Long';
            if (this.trailPersistence > 0.08) display = 'Short';
            else if (this.trailPersistence < 0.02) display = 'Infinite';
            document.getElementById('trailPersistenceVal').innerText = display;
        });

        // Blur & Glow Slider
        const glowSlider = document.getElementById('glowIntensity');
        glowSlider.addEventListener('input', (e) => {
            this.glowBlur = parseInt(e.target.value);
            let display = 'High';
            if (this.glowBlur > 11) display = 'Super';
            else if (this.glowBlur === 0) display = 'None';
            else if (this.glowBlur < 4) display = 'Low';
            document.getElementById('glowIntensityVal').innerText = display;
        });

        // Color theme dropdown
        const themeSelect = document.getElementById('colorTheme');
        themeSelect.addEventListener('change', (e) => {
            this.theme = e.target.value;
            this.particles.forEach(p => p.resetColor(this.theme));
        });

        // Presets buttons
        const presetBtns = document.querySelectorAll('.preset-btn');
        presetBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                presetBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.loadPreset(btn.dataset.preset);
            });
        });
        
        // Make emerald initially active
        presetBtns[0].classList.add('active');
    }

    loadPreset(presetName) {
        const syncUIElement = (id, val) => {
            const el = document.getElementById(id);
            if (el) {
                el.value = val;
                el.dispatchEvent(new Event('input'));
                el.dispatchEvent(new Event('change'));
            }
        };

        let densityVal, speedVal, turbVal, persistenceVal, glowVal, themeVal;

        if (presetName === 'borealis') {
            densityVal = 1400; speedVal = 0.8; turbVal = 1.2; persistenceVal = 0.04; glowVal = 8; themeVal = 'emerald';
        } else if (presetName === 'solar-wind') {
            densityVal = 2000; speedVal = 1.7; turbVal = 2.2; persistenceVal = 0.05; glowVal = 10; themeVal = 'solar';
        } else if (presetName === 'cosmic-storm') {
            densityVal = 2400; speedVal = 2.2; turbVal = 2.8; persistenceVal = 0.03; glowVal = 12; themeVal = 'cosmic';
        } else if (presetName === 'violet-dream') {
            densityVal = 900; speedVal = 0.5; turbVal = 0.7; persistenceVal = 0.015; glowVal = 6; themeVal = 'violet';
        } else {
            densityVal = 1200; speedVal = 1.0; turbVal = 1.2; persistenceVal = 0.04; glowVal = 8; themeVal = 'emerald';
        }

        // Apply sliders via syncUIElement which dispatches 'input' and 'change' events
        syncUIElement('particleDensity', densityVal);
        syncUIElement('flowSpeed', speedVal);
        syncUIElement('turbulence', turbVal);
        syncUIElement('trailPersistence', persistenceVal);
        syncUIElement('glowIntensity', glowVal);
        syncUIElement('colorTheme', themeVal);
    }

    adjustParticleCount() {
        if (this.particles.length < this.density) {
            const needed = this.density - this.particles.length;
            for (let i = 0; i < needed; i++) {
                this.particles.push(new AuroraParticle(this.theme));
            }
        } else if (this.particles.length > this.density) {
            this.particles.splice(this.density);
        }
        document.getElementById('nodesCount').innerText = this.particles.length;
    }

    /**
     * Solves the continuous fluid velocity fields analytically
     * at point (x, y) at time (t).
     */
    getFlowVector(x, y) {
        // Multi-frequency trigonometric waves driving organic fluid eddies
        const freqX = 0.0035 * this.turbulence;
        const freqY = 0.0028 * this.turbulence;
        const timeScale = this.time * 0.0025;

        // Base wave octaves
        let angle = Math.sin(x * freqX + timeScale) * Math.cos(y * freqY - timeScale) * Math.PI * 2.0;
        
        // High frequency ripple octaves
        angle += Math.cos(x * freqX * 2.3 + timeScale * 1.5) * Math.sin(y * freqY * 1.8 - timeScale * 1.1) * Math.PI * 0.5;

        // Resolve velocities
        const vx = Math.cos(angle) * this.speedScale;
        const vy = Math.sin(angle) * this.speedScale;

        return { x: vx, y: vy };
    }

    animate() {
        // Step time forwards
        this.time += 1;

        // Clear canvas with trail persistence (Creates glowing ribbons)
        this.ctx.save();
        this.ctx.fillStyle = `rgba(3, 2, 7, ${this.trailPersistence})`;
        this.ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);
        this.ctx.restore();

        // Canvas ambient glow
        if (this.glowBlur > 0) {
            this.ctx.shadowBlur = this.glowBlur;
            this.ctx.shadowColor = this.getCurrentThemeGlow();
        } else {
            this.ctx.shadowBlur = 0;
        }

        // Draw and update active particles
        this.particles.forEach(p => {
            // Get vector force at particle's exact location
            const force = this.getFlowVector(p.x, p.y);
            
            // Add custom drag/acceleration
            p.vx = p.vx * 0.95 + force.x * 0.05;
            p.vy = p.vy * 0.95 + force.y * 0.05;

            // Apply interactive mouse kinetics
            if (this.mouse.isDown && this.mouse.x !== null) {
                const dx = p.x - this.mouse.x;
                const dy = p.y - this.mouse.y;
                const dist = Math.hypot(dx, dy);
                
                if (dist < 200) {
                    // Pull in / push along drag vector
                    const pullFactor = (200 - dist) / 200;
                    p.vx += this.mouse.vx * pullFactor * 0.08;
                    p.vy += this.mouse.vy * pullFactor * 0.08;
                }
            }

            p.update();
            p.draw(this.ctx);
        });

        // Performance FPS check
        this.frames++;
        const now = performance.now();
        if (now >= this.lastTime + 1000) {
            this.fps = this.frames;
            this.frames = 0;
            this.lastTime = now;
            
            // Sync FPS UI element
            document.getElementById('fpsValue').innerText = this.fps;

            // Simple Auto-throttling if frames drop too low
            if (this.fps < 32 && this.density > 400) {
                this.density = Math.max(300, this.density - 150);
                document.getElementById('particleDensity').value = this.density;
                document.getElementById('particleDensityVal').innerText = this.density;
                this.adjustParticleCount();
            }
        }

        requestAnimationFrame(() => this.animate());
    }

    getCurrentThemeGlow() {
        switch(this.theme) {
            case 'emerald': return '#00f5d4';
            case 'solar': return '#ff5a00';
            case 'cosmic': return '#00bbf9';
            case 'violet': return '#9d4edd';
            default: return '#00f5d4';
        }
    }
}

/**
 * Blueprint representing a single luminous gaseous particle
 */
class AuroraParticle {
    constructor(theme) {
        this.reset(true);
        this.resetColor(theme);
    }

    reset(initFully = false) {
        this.x = Math.random() * window.innerWidth;
        this.y = initFully ? Math.random() * window.innerHeight : (Math.random() > 0.5 ? -10 : window.innerHeight + 10);
        
        this.vx = (Math.random() - 0.5) * 0.5;
        this.vy = (Math.random() - 0.5) * 0.5;
        
        // Ribbon thickness
        this.radius = Math.random() * 2.8 + 0.6;
        
        // Fade parameters
        this.alpha = 0;
        this.maxAlpha = Math.random() * 0.65 + 0.2;
        this.fadeSpeed = Math.random() * 0.02 + 0.005;
        this.fadingIn = true;
        this.age = 0;
        this.maxAge = Math.random() * 400 + 200;
    }

    resetColor(theme) {
        this.theme = theme;
        // Construct standard HSL palettes to get beautifully balanced color variants
        let h, s, l;
        if (theme === 'emerald') {
            h = Math.random() > 0.5 ? 160 + Math.random() * 40 : 120 + Math.random() * 30; // Emerald greens
            s = Math.random() * 20 + 80;
            l = Math.random() * 20 + 45;
        } else if (theme === 'solar') {
            h = 12 + Math.random() * 25; // Warm solar oranges & reds
            s = Math.random() * 20 + 80;
            l = Math.random() * 20 + 45;
        } else if (theme === 'cosmic') {
            h = 190 + Math.random() * 35; // Neon blues and teals
            s = Math.random() * 15 + 85;
            l = Math.random() * 15 + 45;
        } else if (theme === 'violet') {
            h = 265 + Math.random() * 45; // Cosmic purples and magentas
            s = Math.random() * 20 + 80;
            l = Math.random() * 20 + 45;
        } else { // Rainbow spectrum shifting
            h = Math.random() * 360;
            s = 90;
            l = 55;
        }
        this.color = `hsl(${h}, ${s}%, ${l}%)`;
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.age++;

        // Edge boundary reset
        if (this.x < -20 || this.x > window.innerWidth + 20 || this.y < -20 || this.y > window.innerHeight + 20 || this.age > this.maxAge) {
            this.reset(false);
            return;
        }

        // Alpha fade modulation
        if (this.fadingIn) {
            this.alpha += this.fadeSpeed;
            if (this.alpha >= this.maxAlpha) {
                this.alpha = this.maxAlpha;
                this.fadingIn = false;
            }
        } else if (this.age > this.maxAge - 80) {
            this.alpha -= this.fadeSpeed * 1.5;
            if (this.alpha < 0) this.alpha = 0;
        }
    }

    draw(ctx) {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.globalAlpha = this.alpha;
        ctx.fill();
    }
}

/**
 * Web Audio API Atmospheric Drone Synthesizer and Solar Wind Engine
 */
class CosmicDroneEngine {
    constructor() {
        this.ctx = null;
        this.isMuted = false;
        
        // Audio node references
        this.osc1 = null;
        this.osc2 = null;
        this.filter = null;
        this.masterGain = null;
        this.windGain = null;
        
        // Solar wind noise source nodes
        this.noiseFilter = null;
        this.noiseNode = null;
        
        this.isRunning = false;
        this.baseFreq = 55; // Deep A1 frequency
    }

    initAudioContext() {
        if (this.ctx) return;
        
        // Standard Web Audio Context
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        this.ctx = new AudioContext();
    }

    startDrone() {
        this.initAudioContext();
        if (this.isRunning || this.isMuted) return;

        // Resume if suspended by browser security policy
        if (this.ctx.state === 'suspended') {
            this.ctx.resume();
        }

        // Create Nodes
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.setValueAtTime(0.001, this.ctx.currentTime);
        // Fade in volume cleanly
        this.masterGain.gain.linearRampToValueAtTime(parseFloat(document.getElementById('volumeSlider').value), this.ctx.currentTime + 2.5);

        // Core low pass filter (Creates sweeping warmth)
        this.filter = this.ctx.createBiquadFilter();
        this.filter.type = 'lowpass';
        this.filter.frequency.setValueAtTime(250, this.ctx.currentTime);
        this.filter.Q.setValueAtTime(6, this.ctx.currentTime);

        // Oscillator 1: Sine at A1
        this.osc1 = this.ctx.createOscillator();
        this.osc1.type = 'sawtooth';
        this.osc1.frequency.setValueAtTime(this.baseFreq, this.ctx.currentTime);

        // Oscillator 2: Slightly detuned triangle at A1 + 3Hz
        this.osc2 = this.ctx.createOscillator();
        this.osc2.type = 'sawtooth';
        this.osc2.frequency.setValueAtTime(this.baseFreq + 2.8, this.ctx.currentTime);

        // Sub Oscillator for deep base weight
        this.subOsc = this.ctx.createOscillator();
        this.subOsc.type = 'sine';
        this.subOsc.frequency.setValueAtTime(this.baseFreq / 2.0, this.ctx.currentTime);
        const subGain = this.ctx.createGain();
        subGain.gain.setValueAtTime(0.35, this.ctx.currentTime);

        // Create Solar wind White Noise Generator
        this.noiseGain = this.ctx.createGain();
        this.noiseGain.gain.setValueAtTime(0, this.ctx.currentTime);

        this.noiseFilter = this.ctx.createBiquadFilter();
        this.noiseFilter.type = 'bandpass';
        this.noiseFilter.frequency.setValueAtTime(800, this.ctx.currentTime);
        this.noiseFilter.Q.setValueAtTime(3.5, this.ctx.currentTime);

        this.createWhiteNoiseSource();

        // Connect synthesis chain
        this.osc1.connect(this.filter);
        this.osc2.connect(this.filter);
        this.subOsc.connect(subGain);
        
        subGain.connect(this.masterGain);
        this.filter.connect(this.masterGain);

        this.noiseNode.connect(this.noiseFilter);
        this.noiseFilter.connect(this.noiseGain);
        this.noiseGain.connect(this.masterGain);

        this.masterGain.connect(this.ctx.destination);

        // Start Oscillators
        this.osc1.start();
        this.osc2.start();
        this.subOsc.start();
        this.noiseNode.start();

        this.isRunning = true;
    }

    createWhiteNoiseSource() {
        const bufferSize = 2 * this.ctx.sampleRate;
        const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const output = noiseBuffer.getChannelData(0);
        
        // Fill buffer with random noise values between -1 and 1
        for (let i = 0; i < bufferSize; i++) {
            output[i] = Math.random() * 2 - 1;
        }

        this.noiseNode = this.ctx.createBufferSource();
        this.noiseNode.buffer = noiseBuffer;
        this.noiseNode.loop = true;
    }

    updateParameters(mouseX, mouseY, vx, vy) {
        if (!this.isRunning || this.isMuted) return;

        // Map mouse X position to filter cutoff frequency (from 150Hz up to 2500Hz)
        const pctX = mouseX / window.innerWidth;
        const cutoff = 150 + Math.pow(pctX, 2) * 2300;
        this.filter.frequency.setTargetAtTime(cutoff, this.ctx.currentTime, 0.2);

        // Map mouse Y position to oscillator pitch detuning (creates beautiful shifting tension)
        const pctY = mouseY / window.innerHeight;
        const pitchBend = (pctY - 0.5) * 4.0; // Detune by +/- 2 Hz
        this.osc1.frequency.setTargetAtTime(this.baseFreq + pitchBend, this.ctx.currentTime, 0.3);
        this.osc2.frequency.setTargetAtTime(this.baseFreq + 2.8 - pitchBend, this.ctx.currentTime, 0.3);

        // Map mouse velocity magnitude to Solar Wind sweeps
        const velocity = Math.hypot(vx, vy);
        const windVolume = Math.min(0.28, velocity * 0.0075);
        this.noiseGain.gain.setTargetAtTime(windVolume, this.ctx.currentTime, 0.15);

        // Slide noise filter matching the sweep speed
        const windFreq = 500 + Math.min(3000, velocity * 12);
        this.noiseFilter.frequency.setTargetAtTime(windFreq, this.ctx.currentTime, 0.25);
    }

    fadeWind() {
        if (!this.isRunning || this.isMuted) return;
        this.noiseGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.8);
    }

    setVolume(volume) {
        if (!this.isRunning || this.isMuted) return;
        this.masterGain.gain.setTargetAtTime(volume, this.ctx.currentTime, 0.1);
    }

    toggleMute() {
        this.isMuted = !this.isMuted;
        if (this.isMuted) {
            this.stopDrone();
        } else {
            this.startDrone();
        }
        return !this.isMuted;
    }

    setMuted(muted) {
        this.isMuted = muted;
        if (muted) {
            this.stopDrone();
        } else {
            this.startDrone();
        }
    }

    stopDrone() {
        if (!this.isRunning) return;
        
        try {
            this.osc1.stop();
            this.osc2.stop();
            this.subOsc.stop();
            this.noiseNode.stop();
        } catch(e) {}

        this.isRunning = false;
    }
}

// Instantiate and launch the simulation
const simulation = new AuroraSimulation();
