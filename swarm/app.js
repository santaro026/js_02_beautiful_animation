/**
 * Synaptic Swarm - Emergent Flocking Boids & Granular Brainwave Synthesizer
 * 
 * Technical Implementation:
 * 1. Craig Reynolds' Boid cognitive forces (Separation, Cohesion, Alignment).
 * 2. Permanent gravitational attractors (placed on click) and kinetic drag attractors.
 * 3. Synaptic proximity lines drawn between local agents using transparent overlays.
 * 4. Web Audio Swarm Purr (Low-frequency oscillator modulated by average flock kinetic velocities).
 * 5. Granular Brainwave Clicks (Ultra-short, high-frequency sine-wave drop pings representing synapse firings).
 */

class SwarmSimulation {
    constructor() {
        this.canvas = document.getElementById('swarmCanvas');
        this.ctx = this.canvas.getContext('2d');
        
        // Physics configurations
        this.boids = [];
        this.agentCount = 160;
        this.maxSpeed = 4.0;
        this.maxForce = 0.09;
        
        // Boid Rule Weights
        this.weights = { separation: 1.5, cohesion: 1.0, alignment: 1.0 };
        this.radii = { separation: 25, cohesion: 50, alignment: 50 };
        
        // Synapse range
        this.synapseDist = 75;
        this.theme = 'cyan';
        
        // Attractors list
        this.attractors = [];
        this.mouseAttractor = { x: null, y: null, active: false };
        
        // Diagnostics
        this.fps = 0;
        this.lastTime = performance.now();
        this.frames = 0;
        this.synapseCount = 0;
        
        // Audio Synth
        this.soundEngine = new SwarmSynthEngine();
        
        this.init();
    }

    init() {
        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());
        
        this.setupEventListeners();
        
        // Seed boid flock
        this.adjustFlockSize();
        
        // Start render loop
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
        // Click to add permanent gravitational core attractor
        this.canvas.addEventListener('mousedown', (e) => {
            if (e.target.closest('aside, header, button, select')) return;
            this.soundEngine.startEngine();
            
            // Left click adds permanent attractor
            if (e.button === 0) {
                this.attractors.push({ x: e.clientX, y: e.clientY, radius: 10, pulse: 0 });
                // Max 4 permanent attractors to keep space clean
                if (this.attractors.length > 4) {
                    this.attractors.shift();
                }
                this.soundEngine.triggerGranularPing(1200.0); // Bell click
            }
        });

        // Mouse hover drag attractor
        this.canvas.addEventListener('mousemove', (e) => {
            this.mouseAttractor.x = e.clientX;
            this.mouseAttractor.y = e.clientY;
            this.mouseAttractor.active = true;
        });

        this.canvas.addEventListener('mouseleave', () => {
            this.mouseAttractor.active = false;
        });

        // Mobile touch support
        this.canvas.addEventListener('touchstart', (e) => {
            if (e.target.closest('aside, header, button, select')) return;
            this.soundEngine.startEngine();
            const touch = e.touches[0];
            
            if (e.touches.length === 1) {
                // Spawn permanent core on mobile touch
                this.attractors.push({ x: touch.clientX, y: touch.clientY, radius: 10, pulse: 0 });
                if (this.attractors.length > 3) this.attractors.shift();
                
                this.mouseAttractor.x = touch.clientX;
                this.mouseAttractor.y = touch.clientY;
                this.mouseAttractor.active = true;
                this.soundEngine.triggerGranularPing(1000.0);
            }
        });

        this.canvas.addEventListener('touchmove', (e) => {
            const touch = e.touches[0];
            this.mouseAttractor.x = touch.clientX;
            this.mouseAttractor.y = touch.clientY;
            this.mouseAttractor.active = true;
        });

        this.canvas.addEventListener('touchend', () => {
            this.mouseAttractor.active = false;
        });

        // UI Panel configs
        this.setupUIControls();
    }

    setupUIControls() {
        const settingsPanel = document.getElementById('settingsPanel');
        const toggleBtn = document.getElementById('toggleControlsBtn');
        const closeBtn = document.getElementById('closeSidebarBtn');
        
        toggleBtn.addEventListener('click', () => {
            settingsPanel.classList.toggle('active');
        });
        closeBtn.addEventListener('click', () => {
            settingsPanel.classList.remove('active');
        });

        // Overlay dismissal
        const overlay = document.getElementById('instructionOverlay');
        const dismissBtn = document.getElementById('dismissInstructionsBtn');
        dismissBtn.addEventListener('click', () => {
            overlay.classList.add('fade-out');
            this.soundEngine.initAudioContext();
        });

        // Mute / Sound toggle button
        const quickSoundBtn = document.getElementById('quickSoundBtn');
        const soundOn = quickSoundBtn.querySelector('.sound-on-icon');
        const soundOff = quickSoundBtn.querySelector('.sound-off-icon');
        
        quickSoundBtn.addEventListener('click', () => {
            const isActive = this.soundEngine.toggleMute();
            if (isActive) {
                soundOn.classList.remove('hidden');
                soundOff.classList.add('hidden');
                document.getElementById('soundToggle').checked = true;
            } else {
                soundOn.classList.add('hidden');
                soundOff.classList.remove('hidden');
                document.getElementById('soundToggle').checked = false;
            }
        });

        document.getElementById('soundToggle').addEventListener('change', (e) => {
            const isMuted = !e.target.checked;
            this.soundEngine.setMuted(isMuted);
            if (e.target.checked) {
                soundOn.classList.remove('hidden');
                soundOff.classList.add('hidden');
            } else {
                soundOn.classList.add('hidden');
                soundOff.classList.remove('hidden');
            }
        });

        // Master Volume
        const volumeSlider = document.getElementById('volumeSlider');
        volumeSlider.addEventListener('input', (e) => {
            const val = parseFloat(e.target.value);
            document.getElementById('volumeSliderVal').innerText = `${Math.round(val * 100)}%`;
            this.soundEngine.setVolume(val);
        });

        // Agent Swarm Size
        const countSlider = document.getElementById('agentCount');
        countSlider.addEventListener('input', (e) => {
            this.agentCount = parseInt(e.target.value);
            document.getElementById('agentCountVal').innerText = this.agentCount;
            this.adjustFlockSize();
        });

        // Max Velocity
        const speedSlider = document.getElementById('maxSpeed');
        speedSlider.addEventListener('input', (e) => {
            this.maxSpeed = parseFloat(e.target.value);
            document.getElementById('maxSpeedVal').innerText = this.maxSpeed.toFixed(1);
        });

        // Flocking Separation weight
        const sepSlider = document.getElementById('separationWeight');
        sepSlider.addEventListener('input', (e) => {
            this.weights.separation = parseFloat(e.target.value);
            document.getElementById('separationWeightVal').innerText = this.weights.separation.toFixed(1);
        });

        // Flocking Cohesion weight
        const cohSlider = document.getElementById('cohesionWeight');
        cohSlider.addEventListener('input', (e) => {
            this.weights.cohesion = parseFloat(e.target.value);
            document.getElementById('cohesionWeightVal').innerText = this.weights.cohesion.toFixed(1);
        });

        // Flocking Alignment weight
        const aliSlider = document.getElementById('alignmentWeight');
        aliSlider.addEventListener('input', (e) => {
            this.weights.alignment = parseFloat(e.target.value);
            document.getElementById('alignmentWeightVal').innerText = this.weights.alignment.toFixed(1);
        });

        // Synaptic range distance
        const distSlider = document.getElementById('synapseDist');
        distSlider.addEventListener('input', (e) => {
            this.synapseDist = parseInt(e.target.value);
            document.getElementById('synapseDistVal').innerText = `${this.synapseDist}px`;
        });

        // Theme selector
        const themeSelect = document.getElementById('colorTheme');
        themeSelect.addEventListener('change', (e) => {
            this.theme = e.target.value;
            this.boids.forEach(b => b.resetColor(this.theme));
        });

        // Presets selector
        const presetBtns = document.querySelectorAll('.preset-btn');
        presetBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                presetBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.loadPreset(btn.dataset.preset);
            });
        });
        
        presetBtns[0].classList.add('active');
    }

    loadPreset(presetName) {
        const d = {
            count: 160, speed: 4.0, sep: 1.5, coh: 1.0, ali: 1.0, dist: 75, theme: 'cyan'
        };

        if (presetName === 'tight-flock') {
            d.count = 200; d.speed = 3.5; d.sep = 1.8; d.coh = 1.4; d.ali = 1.4; d.dist = 70; d.theme = 'cyan';
        } else if (presetName === 'chaotic-swarm') {
            d.count = 240; d.speed = 6.2; d.sep = 2.5; d.coh = 0.3; d.ali = 0.4; d.dist = 55; d.theme = 'orange';
        } else if (presetName === 'slow-orbit') {
            d.count = 150; d.speed = 2.8; d.sep = 1.2; d.coh = 1.1; d.ali = 0.8; d.dist = 90; d.theme = 'violet';
        } else if (presetName === 'neural-net') {
            d.count = 100; d.speed = 1.6; d.sep = 0.6; d.coh = 1.8; d.ali = 0.5; d.dist = 110; d.theme = 'cyan';
        }

        // Apply
        this.agentCount = d.count;
        this.maxSpeed = d.speed;
        this.weights.separation = d.sep;
        this.weights.cohesion = d.coh;
        this.weights.alignment = d.ali;
        this.synapseDist = d.dist;
        this.theme = d.theme;

        // Sync values to UI
        document.getElementById('agentCount').value = d.count;
        document.getElementById('agentCountVal').innerText = d.count;

        document.getElementById('maxSpeed').value = d.speed;
        document.getElementById('maxSpeedVal').innerText = d.speed.toFixed(1);

        document.getElementById('separationWeight').value = d.sep;
        document.getElementById('separationWeightVal').innerText = d.sep.toFixed(1);

        document.getElementById('cohesionWeight').value = d.coh;
        document.getElementById('cohesionWeightVal').innerText = d.coh.toFixed(1);

        document.getElementById('alignmentWeight').value = d.ali;
        document.getElementById('alignmentWeightVal').innerText = d.ali.toFixed(1);

        document.getElementById('synapseDist').value = d.dist;
        document.getElementById('synapseDistVal').innerText = `${d.dist}px`;

        document.getElementById('colorTheme').value = d.theme;
        this.boids.forEach(b => b.resetColor(d.theme));

        this.adjustFlockSize();
        this.soundEngine.triggerGranularPing(800.0);
    }

    adjustFlockSize() {
        if (this.boids.length < this.agentCount) {
            const needed = this.agentCount - this.boids.length;
            for (let i = 0; i < needed; i++) {
                this.boids.push(new BoidAgent(this.theme));
            }
        } else if (this.boids.length > this.agentCount) {
            this.boids.splice(this.agentCount);
        }
        document.getElementById('agentsCount').innerText = this.boids.length;
    }

    animate() {
        // Semi-transparent clean to leave micro-trails
        this.ctx.fillStyle = 'rgba(2, 2, 5, 0.22)';
        this.ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);

        // Core dynamic arrays trackers
        this.synapseCount = 0;
        let totalSpeed = 0;

        // 1. Draw gravitational Core attractors
        this.drawAttractors();

        // 2. Resolve synapses connections (Pairwise distance networks)
        // Optimization: Standard double loop is fast enough in JS for N <= 400
        for (let i = 0; i < this.boids.length; i++) {
            const b1 = this.boids[i];
            
            for (let j = i + 1; j < this.boids.length; j++) {
                const b2 = this.boids[j];
                const dx = b1.x - b2.x;
                const dy = b1.y - b2.y;
                const dist = Math.hypot(dx, dy);

                if (dist < this.synapseDist) {
                    this.synapseCount++;
                    
                    // Draw transparent synapse connector line
                    const pct = 1.0 - dist / this.synapseDist;
                    const alpha = pct * 0.35;
                    
                    this.ctx.beginPath();
                    this.ctx.moveTo(b1.x, b1.y);
                    this.ctx.lineTo(b2.x, b2.y);
                    
                    // Create simple gradient between boids HSL colors
                    const grad = this.ctx.createLinearGradient(b1.x, b1.y, b2.x, b2.y);
                    grad.addColorStop(0, b1.color);
                    grad.addColorStop(1, b2.color);
                    
                    this.ctx.strokeStyle = grad;
                    this.ctx.globalAlpha = alpha;
                    this.ctx.lineWidth = 0.9;
                    this.ctx.stroke();
                }
            }
        }
        this.ctx.globalAlpha = 1.0;
        document.getElementById('synapsesCount').innerText = this.synapseCount;

        // 3. Update Boid Agent vectors
        this.boids.forEach(boid => {
            // Apply Reynold boids cognitive forces + Attractor pull
            boid.flock(this.boids, this.weights, this.radii, this.maxSpeed, this.maxForce);
            
            // Attractor physics core pull
            this.attractors.forEach(core => {
                const dx = core.x - boid.x;
                const dy = core.y - boid.y;
                const dist = Math.hypot(dx, dy);
                if (dist < 320) {
                    const force = (320 - dist) / 320;
                    boid.ax += (dx / dist) * force * 0.22;
                    boid.ay += (dy / dist) * force * 0.22;
                }
            });

            // Active mouse kinetic pull
            if (this.mouseAttractor.active && this.mouseAttractor.x !== null) {
                const dx = this.mouseAttractor.x - boid.x;
                const dy = this.mouseAttractor.y - boid.y;
                const dist = Math.hypot(dx, dy);
                if (dist < 200) {
                    const force = (200 - dist) / 200;
                    boid.ax += (dx / dist) * force * 0.16;
                    boid.ay += (dy / dist) * force * 0.16;
                }
            }

            boid.update(this.maxSpeed);
            boid.draw(this.ctx);

            totalSpeed += Math.hypot(boid.vx, boid.vy);
        });

        // 4. Trigger Web Audio Sweeps matching average velocity
        const avgSpeed = totalSpeed / this.boids.length;
        this.soundEngine.updateSynth(avgSpeed, this.synapseCount);

        // FPS compilation
        this.frames++;
        const now = performance.now();
        if (now >= this.lastTime + 1000) {
            this.fps = this.frames;
            this.frames = 0;
            this.lastTime = now;
            
            // Sync FPS UI element
            document.getElementById('fpsValue').innerText = this.fps;

            // Simple Auto-throttling if frames drop too low
            if (this.fps < 32 && this.agentCount > 60) {
                this.agentCount = Math.max(50, this.agentCount - 20);
                document.getElementById('agentCount').value = this.agentCount;
                document.getElementById('agentCountVal').innerText = this.agentCount;
                this.adjustFlockSize();
            }
        }

        requestAnimationFrame(() => this.animate());
    }

    drawAttractors() {
        this.ctx.save();
        this.attractors.forEach(core => {
            core.pulse += 0.05;
            const size = core.radius + Math.sin(core.pulse) * 3;
            
            // Draw dual glowing orbits
            this.ctx.beginPath();
            this.ctx.arc(core.x, core.y, size * 1.8, 0, Math.PI * 2);
            this.ctx.fillStyle = 'rgba(168, 85, 247, 0.05)';
            this.ctx.fill();

            this.ctx.beginPath();
            this.ctx.arc(core.x, core.y, size, 0, Math.PI * 2);
            this.ctx.fillStyle = '#a855f7';
            this.ctx.shadowBlur = 12;
            this.ctx.shadowColor = '#a855f7';
            this.ctx.fill();
        });
        
        // Active mouse indicator
        if (this.mouseAttractor.active && this.mouseAttractor.x !== null) {
            this.ctx.beginPath();
            this.ctx.arc(this.mouseAttractor.x, this.mouseAttractor.y, 6, 0, Math.PI * 2);
            this.ctx.fillStyle = 'rgba(6, 182, 212, 0.5)';
            this.ctx.shadowBlur = 8;
            this.ctx.shadowColor = '#06b6d4';
            this.ctx.fill();
        }
        this.ctx.restore();
    }
}

/**
 * Blueprint representing a single autonomous Boid agent
 */
class BoidAgent {
    constructor(theme) {
        this.x = Math.random() * window.innerWidth;
        this.y = Math.random() * window.innerHeight;
        
        // Random starting velocities
        const angle = Math.random() * Math.PI * 2.0;
        const speed = Math.random() * 2.0 + 1.0;
        this.vx = Math.cos(angle) * speed;
        this.vy = Math.sin(angle) * speed;
        
        // Accelerations
        this.ax = 0;
        this.ay = 0;
        
        this.resetColor(theme);
    }

    resetColor(theme) {
        this.theme = theme;
        let h, s, l;

        if (theme === 'cyan') {
            h = 185 + Math.random() * 20; // Neural Cyan / Teal
            s = 95; l = 46;
        } else if (theme === 'violet') {
            h = 265 + Math.random() * 35; // Amethyst Purples
            s = 90; l = 48;
        } else if (theme === 'orange') {
            h = 15 + Math.random() * 25; // Warm solar oranges
            s = 95; l = 45;
        } else { // Multi spectrum shifting
            h = Math.random() * 360;
            s = 95; l = 50;
        }

        this.color = `hsl(${h}, ${s}%, ${l}%)`;
    }

    update(maxSpeed) {
        // Velocities add acceleration
        this.vx += this.ax;
        this.vy += this.ay;
        
        // Limit velocity to maxSpeed
        const speed = Math.hypot(this.vx, this.vy);
        if (speed > maxSpeed) {
            this.vx = (this.vx / speed) * maxSpeed;
            this.vy = (this.vy / speed) * maxSpeed;
        }

        // Apply position update
        this.x += this.vx;
        this.y += this.vy;

        // Clear acceleration step
        this.ax = 0;
        this.ay = 0;

        // Screen boundary wrap
        const buffer = 10;
        if (this.x < -buffer) this.x = window.innerWidth + buffer;
        if (this.x > window.innerWidth + buffer) this.x = -buffer;
        if (this.y < -buffer) this.y = window.innerHeight + buffer;
        if (this.y > window.innerHeight + buffer) this.y = -buffer;
    }

    /**
     * Reynolds Boids algorithm rules solver
     */
    flock(boids, weights, radii, maxSpeed, maxForce) {
        let sepForceX = 0, sepForceY = 0, sepCount = 0;
        let cohPosX = 0, cohPosY = 0, cohCount = 0;
        let aliVelX = 0, aliVelY = 0, aliCount = 0;

        boids.forEach(other => {
            if (other === this) return;

            const dx = this.x - other.x;
            const dy = this.y - other.y;
            const dist = Math.hypot(dx, dy);

            // Rule 1: Separation (Keep distance)
            if (dist > 0 && dist < radii.separation) {
                // Vector pointing away from neighbor, inversely proportional to distance
                sepForceX += dx / dist;
                sepForceY += dy / dist;
                sepCount++;
            }

            // Rule 2: Cohesion (Group together)
            if (dist > 0 && dist < radii.cohesion) {
                cohPosX += other.x;
                cohPosY += other.y;
                cohCount++;
            }

            // Rule 3: Alignment (Match velocity heading)
            if (dist > 0 && dist < radii.alignment) {
                aliVelX += other.vx;
                aliVelY += other.vy;
                aliCount++;
            }
        });

        // Compile Separation Force
        if (sepCount > 0) {
            sepForceX /= sepCount;
            sepForceY /= sepCount;
            // Steering vector = Desired velocity - Current velocity
            const sepD = Math.hypot(sepForceX, sepForceY);
            if (sepD > 0) {
                sepForceX = (sepForceX / sepD) * maxSpeed - this.vx;
                sepForceY = (sepForceY / sepD) * maxSpeed - this.vy;
                // Limit force
                const sepF = Math.hypot(sepForceX, sepForceY);
                if (sepF > maxForce) {
                    sepForceX = (sepForceX / sepF) * maxForce;
                    sepForceY = (sepForceY / sepF) * maxForce;
                }
            }
        }

        // Compile Cohesion Force
        let cohForceX = 0, cohForceY = 0;
        if (cohCount > 0) {
            cohPosX /= cohCount;
            cohPosY /= cohCount;
            // Vector pointing to center of mass
            const steerX = cohPosX - this.x;
            const steerY = cohPosY - this.y;
            const steerD = Math.hypot(steerX, steerY);
            if (steerD > 0) {
                cohForceX = (steerX / steerD) * maxSpeed - this.vx;
                cohForceY = (steerY / steerD) * maxSpeed - this.vy;
                const cohF = Math.hypot(cohForceX, cohForceY);
                if (cohF > maxForce) {
                    cohForceX = (cohForceX / cohF) * maxForce;
                    cohForceY = (cohForceY / cohF) * maxForce;
                }
            }
        }

        // Compile Alignment Force
        let aliForceX = 0, aliForceY = 0;
        if (aliCount > 0) {
            aliVelX /= aliCount;
            aliVelY /= aliCount;
            const aliD = Math.hypot(aliVelX, aliVelY);
            if (aliD > 0) {
                aliForceX = (aliVelX / aliD) * maxSpeed - this.vx;
                aliForceY = (aliVelY / aliD) * maxSpeed - this.vy;
                const aliF = Math.hypot(aliForceX, aliForceY);
                if (aliF > maxForce) {
                    aliForceX = (aliForceX / aliF) * maxForce;
                    aliForceY = (aliForceY / aliF) * maxForce;
                }
            }
        }

        // Apply force accumulations multiplied by cognitive weights
        this.ax += sepForceX * weights.separation;
        this.ay += sepForceY * weights.separation;
        
        this.ax += cohForceX * weights.cohesion;
        this.ay += cohForceY * weights.cohesion;
        
        this.ax += aliForceX * weights.alignment;
        this.ay += aliForceY * weights.alignment;
    }

    draw(ctx) {
        // Draw鳥 boid triangle shape oriented along velocity heading vector
        const angle = Math.atan2(this.vy, this.vx);
        
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(angle);
        
        ctx.beginPath();
        ctx.moveTo(7, 0); // Nose tip
        ctx.lineTo(-6, -4); // Wing left
        ctx.lineTo(-3, 0); // Center tail
        ctx.lineTo(-6, 4); // Wing right
        ctx.closePath();
        
        ctx.fillStyle = this.color;
        ctx.fill();
        ctx.restore();
    }
}

/**
 * Web Audio API Collective Swarm Purr and Neural click mallet synthesizer
 */
class SwarmSynthEngine {
    constructor() {
        this.ctx = null;
        this.isMuted = false;
        
        // Purr Drone Nodes
        this.purrOsc1 = null;
        this.purrOsc2 = null;
        this.purrFilter = null;
        this.purrGain = null;
        
        // Granular scheduler trackers
        this.lastPingTime = 0;
        this.prevSynapses = 0;
        this.isRunning = false;
    }

    initAudioContext() {
        if (this.ctx) return;
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        this.ctx = new AudioContext();
    }

    startEngine() {
        this.initAudioContext();
        if (this.isRunning || this.isMuted) return;

        if (this.ctx.state === 'suspended') {
            this.ctx.resume();
        }

        // Swarm purr: Double detuned triangle oscillators routing into resonant low-pass filter
        this.purrGain = this.ctx.createGain();
        this.purrGain.gain.setValueAtTime(0.001, this.ctx.currentTime);
        this.purrGain.gain.linearRampToValueAtTime(parseFloat(document.getElementById('volumeSlider').value) * 0.45, this.ctx.currentTime + 1.5);

        this.purrFilter = this.ctx.createBiquadFilter();
        this.purrFilter.type = 'lowpass';
        this.purrFilter.frequency.setValueAtTime(140, this.ctx.currentTime);
        this.purrFilter.Q.setValueAtTime(4.0, this.ctx.currentTime);

        // Osc 1: Triangle deep purr at 65Hz (C2)
        this.purrOsc1 = this.ctx.createOscillator();
        this.purrOsc1.type = 'triangle';
        this.purrOsc1.frequency.setValueAtTime(65.41, this.ctx.currentTime);

        // Osc 2: Detuned slightly to add organic beating/chorus
        this.purrOsc2 = this.ctx.createOscillator();
        this.purrOsc2.type = 'triangle';
        this.purrOsc2.frequency.setValueAtTime(67.41, this.ctx.currentTime);

        // Connections
        this.purrOsc1.connect(this.purrFilter);
        this.purrOsc2.connect(this.purrFilter);
        this.purrFilter.connect(this.purrGain);
        this.purrGain.connect(this.ctx.destination);

        // Start purrs
        this.purrOsc1.start();
        this.purrOsc2.start();

        this.isRunning = true;
    }

    updateSynth(avgSpeed, currentSynapses) {
        if (!this.isRunning || this.isMuted) return;

        // 1. Modulate Swarm Purr filter frequency based on speed
        // As they move faster, the purr opens up its cutoff, sounding alive
        const speedFactor = Math.min(2.0, avgSpeed / 3.0);
        const cutoff = 90 + speedFactor * 220; // 90Hz to 310Hz
        this.purrFilter.frequency.setTargetAtTime(cutoff, this.ctx.currentTime, 0.2);

        // Slight detune shift when speed changes
        this.purrOsc1.frequency.setTargetAtTime(65.41 + speedFactor * 3.0, this.ctx.currentTime, 0.3);
        this.purrOsc2.frequency.setTargetAtTime(67.41 - speedFactor * 3.0, this.ctx.currentTime, 0.3);

        // 2. Play granular bubble click if new synapse connection is added
        // Throttled to max 12 clicks per second to sound beautiful and pleasant
        if (currentSynapses > this.prevSynapses && currentSynapses % 4 === 0) {
            const now = this.ctx.currentTime;
            if (now > this.lastPingTime + 0.08) {
                // Select chime frequency corresponding to network density
                const densityFactor = Math.min(1.0, currentSynapses / 1200);
                const chimeHz = 500.0 + densityFactor * 900.0; // Sweeps 500Hz to 1400Hz
                
                this.triggerGranularPing(chimeHz);
                this.lastPingTime = now;
            }
        }
        
        this.prevSynapses = currentSynapses;
    }

    triggerGranularPing(frequency) {
        if (this.isMuted) return;
        this.initAudioContext();
        if (this.ctx.state === 'suspended') this.ctx.resume();

        // Synthesize ultra-short mallet bell click
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        
        osc.type = 'sine';
        osc.frequency.setValueAtTime(frequency, this.ctx.currentTime);
        
        // Decay envelope is incredibly fast (attack instant, decays under 0.04s)
        gain.gain.setValueAtTime(0.001, this.ctx.currentTime);
        const masterVol = parseFloat(document.getElementById('volumeSlider').value);
        gain.gain.linearRampToValueAtTime(masterVol * 0.18, this.ctx.currentTime + 0.002);
        gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + 0.05);

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(frequency, this.ctx.currentTime);
        filter.Q.setValueAtTime(8.0, this.ctx.currentTime);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start();
        osc.stop(this.ctx.currentTime + 0.08);
    }

    setVolume(volume) {
        if (!this.isRunning || this.isMuted) return;
        this.purrGain.gain.setTargetAtTime(volume * 0.45, this.ctx.currentTime, 0.1);
    }

    toggleMute() {
        this.isMuted = !this.isMuted;
        if (this.isMuted) {
            this.stopEngine();
        } else {
            this.startEngine();
        }
        return !this.isMuted;
    }

    setMuted(muted) {
        this.isMuted = muted;
        if (muted) {
            this.stopEngine();
        } else {
            this.startEngine();
        }
    }

    stopEngine() {
        if (!this.isRunning) return;
        try {
            this.purrOsc1.stop();
            this.purrOsc2.stop();
        } catch(e) {}
        this.isRunning = false;
    }
}

// Instantiate and launch the simulation
const simulation = new SwarmSimulation();
