/**
 * Quantum Chaos - 3D Attractor Simulator & FM Sonifier
 * 
 * Technical Implementation:
 * 1. 3D differential equations solved in real-time (Lorenz, Aizawa, Halvorsen, Thomas).
 * 2. 3D spatial camera projections (Rotation matrices, perspective scaling, and interactive drag-orbits).
 * 3. Strand braid particles tracking historical trajectories to paint gorgeous ribbon trails.
 * 4. FM Synthesis Sonification (Carrier oscillator + Modulator oscillator sweeping pitch based on 3D kinetic velocity).
 * 5. Spatialized topological crossings chimes (High frequency bell sweeps modulated by exponential decay).
 */

class ChaosSimulation {
    constructor() {
        this.canvas = document.getElementById('chaosCanvas');
        this.ctx = this.canvas.getContext('2d');
        
        // Equation Configuration
        this.equationType = 'lorenz';
        this.dt = 0.008; // Delta time step
        this.strandCount = 12; // Independent braids
        this.historyLength = 400; // Trail memory
        this.theme = 'cyan';
        this.autoSpin = true;
        
        // 3D Camera Controls
        this.zoom = 100;
        this.yaw = 0.4;
        this.pitch = 0.3;
        
        // Mouse/Drag State
        this.mouse = { isDragging: false, x: null, y: null };
        
        // Dynamic Strands Pool
        this.strands = [];
        
        // Diagnostics
        this.fps = 0;
        this.lastTime = performance.now();
        this.frames = 0;
        
        // FM Sonifier
        this.sonifier = new FMSonifierEngine();
        
        this.init();
    }

    init() {
        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());
        
        this.setupEventListeners();
        
        // Spawn active strands
        this.rebuildStrands();
        
        // Start Render Loop
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
        // Drag Orbit Events
        this.canvas.addEventListener('mousedown', (e) => {
            this.mouse.isDragging = true;
            this.mouse.x = e.clientX;
            this.mouse.y = e.clientY;
            this.autoSpin = false;
            document.getElementById('autoSpinToggle').checked = false;
            this.sonifier.startSonifier();
        });

        window.addEventListener('mousemove', (e) => {
            if (!this.mouse.isDragging) return;
            const dx = e.clientX - this.mouse.x;
            const dy = e.clientY - this.mouse.y;
            
            // Adjust camera orbit angles
            this.yaw += dx * 0.006;
            this.pitch += dy * 0.006;
            
            this.mouse.x = e.clientX;
            this.mouse.y = e.clientY;
        });

        window.addEventListener('mouseup', () => {
            this.mouse.isDragging = false;
        });

        // Touch Support for Mobile Orbit
        this.canvas.addEventListener('touchstart', (e) => {
            if (e.touches.length === 1) {
                this.mouse.isDragging = true;
                const touch = e.touches[0];
                this.mouse.x = touch.clientX;
                this.mouse.y = touch.clientY;
                this.autoSpin = false;
                document.getElementById('autoSpinToggle').checked = false;
                this.sonifier.startSonifier();
            }
        });

        window.addEventListener('touchmove', (e) => {
            if (!this.mouse.isDragging || e.touches.length !== 1) return;
            const touch = e.touches[0];
            const dx = touch.clientX - this.mouse.x;
            const dy = touch.clientY - this.mouse.y;
            
            this.yaw += dx * 0.008;
            this.pitch += dy * 0.008;
            
            this.mouse.x = touch.clientX;
            this.mouse.y = touch.clientY;
        });

        window.addEventListener('touchend', () => {
            this.mouse.isDragging = false;
        });

        // Mouse Wheel Zoom
        this.canvas.addEventListener('wheel', (e) => {
            e.preventDefault();
            this.zoom = Math.max(20, Math.min(400, this.zoom - e.deltaY * 0.1));
            document.getElementById('cameraZoom').value = this.zoom;
            document.getElementById('cameraZoomVal').innerText = `${Math.round(this.zoom)}%`;
        });

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
            this.sonifier.initAudioContext();
        });

        // Mute / Sound toggle
        const quickSoundBtn = document.getElementById('quickSoundBtn');
        const soundOn = quickSoundBtn.querySelector('.sound-on-icon');
        const soundOff = quickSoundBtn.querySelector('.sound-off-icon');
        
        quickSoundBtn.addEventListener('click', () => {
            const isActive = this.sonifier.toggleMute();
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
            this.sonifier.setMuted(isMuted);
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
            this.sonifier.setVolume(val);
        });

        // Time Step dt Slider
        const stepSlider = document.getElementById('timeStep');
        stepSlider.addEventListener('input', (e) => {
            this.dt = parseFloat(e.target.value);
            let display = 'Normal';
            if (this.dt > 0.025) display = 'Warp';
            else if (this.dt > 0.015) display = 'Fast';
            else if (this.dt < 0.005) display = 'Freeze';
            document.getElementById('timeStepVal').innerText = display;
        });

        // Braid Strands Count Slider
        const countSlider = document.getElementById('strandCount');
        countSlider.addEventListener('input', (e) => {
            this.strandCount = parseInt(e.target.value);
            document.getElementById('strandCountVal').innerText = this.strandCount;
            this.rebuildStrands();
        });

        // History Trail length Slider
        const histSlider = document.getElementById('historyLength');
        histSlider.addEventListener('input', (e) => {
            this.historyLength = parseInt(e.target.value);
            document.getElementById('historyLengthVal').innerText = this.historyLength;
            this.strands.forEach(s => s.adjustHistoryCapacity(this.historyLength));
        });

        // Holographic theme select
        const themeSelect = document.getElementById('colorTheme');
        themeSelect.addEventListener('change', (e) => {
            this.theme = e.target.value;
            this.strands.forEach(s => s.resetColors(this.theme));
        });

        // Auto Spin switch
        const spinToggle = document.getElementById('autoSpinToggle');
        spinToggle.addEventListener('change', (e) => {
            this.autoSpin = e.target.checked;
        });

        // Zoom Slider
        const zoomSlider = document.getElementById('cameraZoom');
        zoomSlider.addEventListener('input', (e) => {
            this.zoom = parseFloat(e.target.value);
            document.getElementById('cameraZoomVal').innerText = `${Math.round(this.zoom)}%`;
        });

        // Attractor Equations Select
        const attractorSelect = document.getElementById('attractorType');
        attractorSelect.addEventListener('change', (e) => {
            this.equationType = e.target.value;
            this.rebuildStrands();
            this.sonifier.triggerChime(); // Play pleasant sonic trigger when changing attractor systems
        });
    }

    rebuildStrands() {
        this.strands = [];
        
        // We set small spatial offsets on spawning, causing the braids to slowly diverge
        // in high-dimensional chaos space (butterfly divergence effect)
        for (let i = 0; i < this.strandCount; i++) {
            const offset = i * 0.00015;
            this.strands.push(new ChaosStrand(offset, this.equationType, this.theme, this.historyLength));
        }
        document.getElementById('strandsCount').innerText = this.strands.length;
    }

    animate() {
        // Apply auto-spin camera rotation
        if (this.autoSpin) {
            this.yaw += 0.0025;
        }

        // Draw deep cosmic math board
        this.ctx.fillStyle = '#020204';
        this.ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);

        // Core 3D Projection variables
        const centerX = window.innerWidth / 2;
        const centerY = window.innerHeight / 2;
        
        // Calculate appropriate scale scaling per attractor
        let modelScale = this.zoom * 3.5;
        if (this.equationType === 'aizawa') modelScale = this.zoom * 160.0;
        else if (this.equationType === 'halvorsen') modelScale = this.zoom * 22.0;
        else if (this.equationType === 'thomas') modelScale = this.zoom * 75.0;

        // Draw strands from furthest to nearest (simple Painter's algorithm approximation using canvas layers)
        // Update physics & project points
        let primaryStrandVelocity = 0;
        let didPrimaryCrossZero = false;

        this.strands.forEach((strand, index) => {
            // Update the differential maths
            const stepForce = strand.update(this.dt);

            // Let's track primary strand (strand 0) speed to drive the FM Synthesizer
            if (index === 0) {
                primaryStrandVelocity = stepForce.velocity;
                didPrimaryCrossZero = stepForce.crossedZero;
            }

            // Project 3D history points into 2D perspective screen points
            const projectedPoints = [];
            
            for (let i = 0; i < strand.history.length; i++) {
                const pt = strand.history[i];
                
                // Centering corrections
                let x = pt.x;
                let y = pt.y;
                let z = pt.z;

                if (this.equationType === 'lorenz') {
                    z = pt.z - 25.0; // Center Lorenz butterfly on Z
                } else if (this.equationType === 'aizawa') {
                    z = pt.z - 0.8; // Center Aizawa sphere
                } else if (this.equationType === 'halvorsen') {
                    x = pt.x + 1.6; y = pt.y + 1.6; z = pt.z + 1.6; // Center Halvorsen
                }

                // 3D Rotations (Yaw / Y-axis)
                const x1 = x * Math.cos(this.yaw) - z * Math.sin(this.yaw);
                const z1 = x * Math.sin(this.yaw) + z * Math.cos(this.yaw);
                
                // 3D Rotations (Pitch / X-axis)
                const y2 = y * Math.cos(this.pitch) - z1 * Math.sin(this.pitch);
                const z2 = y * Math.sin(this.pitch) + z1 * Math.cos(this.pitch);
                
                // Perspective divide projection
                const fov = 400; // Camera distance
                const depthScale = fov / (fov + z2);
                
                const screenX = centerX + x1 * modelScale * depthScale;
                const screenY = centerY + y2 * modelScale * depthScale;
                
                projectedPoints.push({ x: screenX, y: screenY, depth: z2 });
            }

            // Draw projected ribbon strands
            this.drawStrand(projectedPoints, strand);
        });

        // Trigger spatial FM sonifier values
        if (primaryStrandVelocity > 0) {
            this.sonifier.updateFMSynth(primaryStrandVelocity, didPrimaryCrossZero);
        }

        // FPS Calculations
        this.frames++;
        const now = performance.now();
        if (now >= this.lastTime + 1000) {
            this.fps = this.frames;
            this.frames = 0;
            this.lastTime = now;
            
            // Sync FPS UI element
            document.getElementById('fpsValue').innerText = this.fps;

            // Auto-throttling strands if frame rate chokes
            if (this.fps < 32 && this.strandCount > 4) {
                this.strandCount = Math.max(3, this.strandCount - 2);
                document.getElementById('strandCount').value = this.strandCount;
                document.getElementById('strandCountVal').innerText = this.strandCount;
                this.rebuildStrands();
            }
        }

        requestAnimationFrame(() => this.animate());
    }

    drawStrand(points, strand) {
        if (points.length < 2) return;

        // Draw historical ribbons by painting gradient segment lines
        this.ctx.save();
        this.ctx.lineCap = 'round';
        this.ctx.lineJoin = 'round';

        // Add soft glowing canvas effect
        this.ctx.shadowBlur = 6;
        this.ctx.shadowColor = strand.glowColor;

        for (let i = 1; i < points.length; i++) {
            const p1 = points[i - 1];
            const p2 = points[i];
            
            // Skip lines off-screen
            if (p1.x < 0 && p2.x < 0) continue;
            
            // Modulate width depending on perspective depth scale
            const baseWidth = 1.6;
            const strokeWidth = baseWidth * (400 / (400 + p1.depth));
            
            // Fading alpha towards history tail
            const alpha = (i / points.length) * 0.75;
            
            this.ctx.beginPath();
            this.ctx.moveTo(p1.x, p1.y);
            this.ctx.lineTo(p2.x, p2.y);
            
            this.ctx.strokeStyle = strand.color;
            this.ctx.globalAlpha = alpha;
            this.ctx.lineWidth = strokeWidth;
            this.ctx.stroke();
        }

        this.ctx.restore();
    }
}

/**
 * Blueprint managing a single 3D vector point history
 */
class ChaosStrand {
    constructor(spatialOffset, type, theme, historyCapacity) {
        this.offset = spatialOffset;
        this.type = type;
        this.historyCapacity = historyCapacity;
        this.history = [];
        
        // Initial spawning positions
        this.resetPosition();
        this.resetColors(theme);
    }

    resetPosition() {
        this.history = [];
        
        if (this.type === 'lorenz') {
            // Standard Lorenz start
            this.x = 0.1 + this.offset;
            this.y = 0.0;
            this.z = 0.0;
        } else if (this.type === 'aizawa') {
            // Aizawa starts near origin
            this.x = 0.1 + this.offset;
            this.y = 0.0;
            this.z = 0.0;
        } else if (this.type === 'halvorsen') {
            this.x = -1.48 + this.offset;
            this.y = 0.0;
            this.z = 0.0;
        } else if (this.type === 'thomas') {
            this.x = 0.5 + this.offset;
            this.y = 0.0;
            this.z = 0.0;
        }
        
        // Fill initial array point
        this.history.push({ x: this.x, y: this.y, z: this.z });
    }

    resetColors(theme) {
        this.theme = theme;
        let h, s, l;

        if (theme === 'cyan') {
            h = 180 + Math.random() * 20; // Neon Cyber Cyan
            s = 95; l = 50;
            this.glowColor = '#00f0ff';
        } else if (theme === 'rose') {
            h = 325 + Math.random() * 25; // Neon Pink / Rose
            s = 95; l = 52;
            this.glowColor = '#ff007f';
        } else if (theme === 'gold') {
            h = 42 + Math.random() * 15; // Golden Dynasty
            s = 90; l = 50;
            this.glowColor = '#ffd700';
        } else if (theme === 'acid') {
            h = 85 + Math.random() * 25; // Toxic Neon Green
            s = 95; l = 48;
            this.glowColor = '#82ff00';
        } else { // Multi spectral rainbow cycle
            h = Math.random() * 360;
            s = 95; l = 50;
            this.glowColor = `hsl(${h}, 90%, 50%)`;
        }

        this.color = `hsl(${h}, ${s}%, ${l}%)`;
    }

    adjustHistoryCapacity(newCapacity) {
        this.historyCapacity = newCapacity;
        if (this.history.length > this.historyCapacity) {
            this.history.splice(0, this.history.length - this.historyCapacity);
        }
    }

    /**
     * Updates the 3D differential equations using Euler Integration
     */
    update(dt) {
        let dx = 0, dy = 0, dz = 0;
        const prevX = this.x;

        if (this.type === 'lorenz') {
            // Lorenz Attractor Differential Constants
            const sigma = 10.0;
            const rho = 28.0;
            const beta = 8.0 / 3.0;

            dx = sigma * (this.y - this.x);
            dy = this.x * (rho - this.z) - this.y;
            dz = this.x * this.y - beta * this.z;

        } else if (this.type === 'aizawa') {
            // Aizawa Attractor Differential Constants
            const a = 0.95, b = 0.7, c = 0.6, d = 3.5, e = 0.25, f = 0.1;

            dx = (this.z - b) * this.x - d * this.y;
            dy = d * this.x + (this.z - b) * this.y;
            dz = c + a * this.z - (Math.pow(this.z, 3) / 3.0) - (Math.pow(this.x, 2) + Math.pow(this.y, 2)) * (1.0 + e * this.z) + f * this.z * Math.pow(this.x, 3);

        } else if (this.type === 'halvorsen') {
            // Halvorsen Attractor Differential Constants
            const a = 1.4;

            dx = -a * this.x - 4.0 * this.y - 4.0 * this.z - Math.pow(this.y, 2);
            dy = -a * this.y - 4.0 * this.z - 4.0 * this.x - Math.pow(this.z, 2);
            dz = -a * this.z - 4.0 * this.x - 4.0 * this.y - Math.pow(this.x, 2);

        } else if (this.type === 'thomas') {
            // Thomas Attractor Differential Constants
            const b = 0.2081;

            dx = Math.sin(this.y) - b * this.x;
            dy = Math.sin(this.z) - b * this.y;
            dz = Math.sin(this.x) - b * this.z;
        }

        // Apply Euler step
        this.x += dx * dt;
        this.y += dy * dt;
        this.z += dz * dt;

        // Record history coordinate
        this.history.push({ x: this.x, y: this.y, z: this.z });
        
        // Truncate history trail to length bounds
        if (this.history.length > this.historyCapacity) {
            this.history.shift();
        }

        // Return velocity magnitude to drive the sound synth
        const velocity = Math.hypot(dx, dy, dz);
        
        // Topological crossing indicator (checks if coordinate crosses zero boundaries)
        const crossedZero = (prevX < 0 && this.x >= 0) || (prevX > 0 && this.x <= 0);

        return { velocity, crossedZero };
    }
}

/**
 * Web Audio API FM Attractor Sonification and Bell Crossing Chime Engine
 */
class FMSonifierEngine {
    constructor() {
        this.ctx = null;
        this.isMuted = false;
        
        // FM Synthesis chain
        this.carrier = null;
        this.modulator = null;
        this.modGain = null;
        this.carrierGain = null;
        
        this.isRunning = false;
    }

    initAudioContext() {
        if (this.ctx) return;
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        this.ctx = new AudioContext();
    }

    startSonifier() {
        this.initAudioContext();
        if (this.isRunning || this.isMuted) return;

        if (this.ctx.state === 'suspended') {
            this.ctx.resume();
        }

        // Create standard FM synthesis nodes
        // Modulator -> ModulatorGain -> Carrier.frequency -> CarrierGain -> Output
        this.carrierGain = this.ctx.createGain();
        this.carrierGain.gain.setValueAtTime(0.001, this.ctx.currentTime);
        this.carrierGain.gain.linearRampToValueAtTime(parseFloat(document.getElementById('volumeSlider').value) * 0.35, this.ctx.currentTime + 1.0);

        this.carrier = this.ctx.createOscillator();
        this.carrier.type = 'sine';
        this.carrier.frequency.setValueAtTime(220, this.ctx.currentTime); // Standard A3 pitch

        this.modulator = this.ctx.createOscillator();
        this.modulator.type = 'sine';
        this.modulator.frequency.setValueAtTime(311.13, this.ctx.currentTime); // Inharmonic ratio for chaotic sidebands

        this.modGain = this.ctx.createGain();
        this.modGain.gain.setValueAtTime(140, this.ctx.currentTime); // Modulation index depth

        // Main Resonant low pass filter to cut harsh FM frequencies
        this.filter = this.ctx.createBiquadFilter();
        this.filter.type = 'lowpass';
        this.filter.frequency.setValueAtTime(800, this.ctx.currentTime);
        this.filter.Q.setValueAtTime(3.0, this.ctx.currentTime);

        // Connections
        this.modulator.connect(this.modGain);
        this.modGain.connect(this.carrier.frequency);
        this.carrier.connect(this.filter);
        this.filter.connect(this.carrierGain);
        this.carrierGain.connect(this.ctx.destination);

        // Start Oscillators
        this.carrier.start();
        this.modulator.start();

        this.isRunning = true;
    }

    updateFMSynth(velocity, crossedZero) {
        if (!this.isRunning || this.isMuted) return;

        // Map velocity speed directly to Carrier synth frequency
        // Glides pitch up as equations accelerate into attraction zones
        const baseHz = 160.0;
        const speedFactor = Math.min(2.5, velocity * 0.05);
        const pitch = baseHz + speedFactor * 480.0; // Dynamic pitch sweeps
        
        this.carrier.frequency.setTargetAtTime(pitch, this.ctx.currentTime, 0.15);
        
        // Modulator frequency tracks harmonic multiples (Ratio 1.5 for sweet fifths)
        this.modulator.frequency.setTargetAtTime(pitch * 1.414, this.ctx.currentTime, 0.15);

        // Modulation index tracks speed: accelerates FM brightness
        const modIndex = 80 + speedFactor * 320;
        this.modGain.gain.setTargetAtTime(modIndex, this.ctx.currentTime, 0.1);

        // If orbit crosses boundary, trigger chime
        if (crossedZero) {
            this.triggerChime();
        }
    }

    triggerChime() {
        if (this.isMuted) return;
        this.initAudioContext();
        if (this.ctx.state === 'suspended') this.ctx.resume();

        // Instantiate isolated synthesizer chime on-demand
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        
        osc.type = 'triangle';
        
        // Select high pitch pentatonic bell chime tones (A5, C6, D6, E6, G6)
        const chimePitches = [880.0, 1046.5, 1174.66, 1318.51, 1567.98];
        const pitch = chimePitches[Math.floor(Math.random() * chimePitches.length)];
        
        osc.frequency.setValueAtTime(pitch, this.ctx.currentTime);
        
        // Create an exponential decay volume envelope (attack is instant, decays over 1.2s)
        gain.gain.setValueAtTime(0.001, this.ctx.currentTime);
        const masterVol = parseFloat(document.getElementById('volumeSlider').value);
        gain.gain.linearRampToValueAtTime(masterVol * 0.38, this.ctx.currentTime + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + 1.4);

        // Connect to spatial reverb-simulated Biquad filter
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'highpass';
        filter.frequency.setValueAtTime(400, this.ctx.currentTime);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start();
        osc.stop(this.ctx.currentTime + 1.5);
    }

    setVolume(volume) {
        if (!this.isRunning || this.isMuted) return;
        this.carrierGain.gain.setTargetAtTime(volume * 0.35, this.ctx.currentTime, 0.1);
    }

    toggleMute() {
        this.isMuted = !this.isMuted;
        if (this.isMuted) {
            this.stopSonifier();
        } else {
            this.startSonifier();
        }
        return !this.isMuted;
    }

    setMuted(muted) {
        this.isMuted = muted;
        if (muted) {
            this.stopSonifier();
        } else {
            this.startSonifier();
        }
    }

    stopSonifier() {
        if (!this.isRunning) return;
        try {
            this.carrier.stop();
            this.modulator.stop();
        } catch(e) {}
        this.isRunning = false;
    }
}

// Instantiate and launch the simulation
const simulation = new ChaosSimulation();
