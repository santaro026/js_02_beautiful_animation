# Aetheria: Cosmic Animation Lab

Aetheria is a premium, high-performance, and visually gorgeous gallery of interactive physics animations, mathematical chaos, and sensory simulations built entirely with raw, vanilla web technologies.

---

## 🌌 Project Directory Structure

```
├── index.html            # Main Portal landing page (Aetheria Lab Hub)
├── style.css             # Main Portal layout tokens, glassmorphism, responsive grids
├── app.js                # Main Portal constellation particle network background and card hover lights
├── fireworks/            # Dedicated Fireworks App Space
│   ├── index.html        # Fireworks UI structure, canvas containers, and synthesis controls
│   ├── style.css         # Glassmorphic control panel styles, range sliders, and custom toggles
│   └── app.js            # Fireworks physics engine, vector math, Web Audio DSP synthesizer
├── README.md             # Project documentation (this file)
└── overview.md           # Visual breakdown and technical design details
```

---

## 🎨 Current & Upcoming Spaces

### 1. 🎆 Neon Flame (Fireworks Showcase)
*Located inside `fireworks/`*
* **Interactive Night Sky**: Click/tap to launch rockets; drag to paint beautiful trails of falling cosmic stardust.
* **Parametric Burst Patterns**: Seven distinct burst shapes mapped mathematically using trigonometric equations (Classic Spherical, Orbital Ring, Double Ring, Heart of Light, Five-Point Star, Weeping Willow, and Splitting Crossette).
* **Real-time Web Audio Synthesizer**: Dynamically synthesizes sweep whooshes, sub-bass explosion booms, and crackling cascades on the fly using standard oscillator and noise buffer nodes.
* **Glassmorphic Show Director**: Premium control sidebar to alter burst shapes, color palettes (Cyberpunk, Gold Dynasty, Pastel Dream, Fire & Ice, Rainbow), density, gravity, wind breeze, and synthesizer volumes.

### 2. 🌊 Aurora Drift (Plasma Fluid Dynamics)
*Concept - In Development*
* A gorgeous simulation of Navier-Stokes gaseous plasma particles and vector velocity fields. It will let users paint curtains of dancing light resembling the Aurora Borealis.

### 3. 🌀 Quantum Chaos (3D Mathematical Attractors)
*Concept - In Development*
* Real-time plotting of deterministic chaotic mathematical attractors (Lorenz, Clifford, Aizawa) in interactive 3D spaces.

### 4. 🦅 Synaptic Swarm (Emergent Boid Behavior)
*Concept - In Development*
* An elegant exploration of autonomous agent physics and flocking behavior (alignment, cohesion, and separation) creating gorgeous synchronized global patterns.

---

## 🚀 How to Run the Portal

Since Aetheria is crafted with native modern HTML5, CSS3, and ES6 JavaScript, it requires **zero compilation steps** or package dependencies.

### Option 1: Lightweight HTTP Server (Recommended)
Running a local web server is highly recommended to ensure the **Web Audio API** and cross-origin document paths load smoothly.

**Using Node.js (npx):**
```bash
npx http-server -p 8000
```
Navigate to `http://localhost:8000` in your web browser.

**Using Python:**
```bash
python3 -m http.server 8000
```
Navigate to `http://localhost:8000` in your web browser.

### Option 2: Direct File Open
You can open **`index.html`** directly in any modern, up-to-date web browser (Chrome, Firefox, Safari, Edge) to experience the animations.
