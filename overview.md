# Technical Architecture Overview: Neon Flame

This document describes the design patterns, mathematical formulas, and digital signal processing (DSP) architecture underpinning the **Neon Flame** fireworks showcase application.

---

## 🏗️ 1. Architecture & Execution Loop

Neon Flame is structured using standard Object-Oriented Programming (OOP) in JavaScript (ES6). The modular division isolates physical vector mechanics from layout rendering and audio synthesis.

```
┌──────────────────────────────────────────────────────────────────┐
│                      ShowcaseController                          │
│  (Manages Canvas contexts, resizing, user input, auto-launch)   │
└────────────────┬────────────────┬────────────────┬───────────────┘
                 │                │                │
                 ▼                ▼                ▼
         ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
         │  Starfield   │ │   Firework   │ │  SoundEngine │
         │ (Back canvas)│ │ (Ascent/Boom)│ │(Web Audio API│
         └──────────────┘ └───────┬──────┘ └──────────────┘
                                  │
                                  ▼
                          ┌──────────────┐
                          │   Particle   │
                          │(Active sparks│
                          └──────────────┘
```

The execution loop is driven by `requestAnimationFrame`, executing approximately 60 times per second:
1. **Clear Trail**: The main canvas is cleared using a highly transparent black fill: `ctx.fillStyle = "rgba(3, 3, 8, activeTrail)"`. This creates the signature organic motion blur and fading particle tails.
2. **Stars Update**: Twinkling background stars on the isolated parallax background canvas are redrawn at a slower, non-blocking rate.
3. **Launch Checks**: The automatic show scheduler evaluates launch intervals and instantiates ascending `Firework` rockets.
4. **Ascent Phase**: Active rockets update their velocity, accumulate ascending smoke trails, and check if they have reached their apex coordinates. If so, they explode and spawn `Particle` matrices.
5. **Explosion Phase**: Active explosion particles compute forces, apply wind and gravity drift, decay in alpha, and render motion lines to the canvas.
6. **Diagnostics Sync**: Real-time FPS, particle counts, and active rocket tallies are compiled and pushed to the glassmorphic DOM elements.

---

## 🎨 2. Mathematical Particle Patterns

When a rocket detonates, it distributes particles using specific velocity vectors derived from polar and parametric mathematics. Below are the formulas mapped into coordinate offsets relative to the explosion center:

### A. Classic Spherical Shell
Distributes particles uniformly inside a circle using randomized angles and speeds:
$$\theta = \text{random}(0, 2\pi)$$
$$V_{\text{speed}} = \text{random}(2.0, 8.5)$$
$$\vec{v} = (V_{\text{speed}} \cos\theta, V_{\text{speed}} \sin\theta)$$

### B. Orbital Ring
Creates a sharp, hollow boundary ring by constraining speeds to a narrow shell margin:
$$V_{\text{speed}} = \text{random}(5.5, 6.5)$$
$$\vec{v} = (V_{\text{speed}} \cos\theta, V_{\text{speed}} \sin\theta)$$

### C. Heart of Light (Cardioid)
Uses the classic math cardiod curves to sketch a glowing heart:
$$x_{\text{factor}} = 16\sin^3(t)$$
$$y_{\text{factor}} = -(13\cos(t) - 5\cos(2t) - 2\cos(3t) - \cos(4t))$$
We define $t = \theta - \frac{\pi}{2}$ (to orient the heart pointing upwards). The velocity vector is built from this offset and scaled down:
$$\vec{v} = \vec{u}_{\text{heart}} \times 0.4$$

### D. Five-Point Star
Calculates a polar modulo equation to interpolate between five outer tips ($7.0$) and five inner troughs ($2.5$):
$$\theta_{\text{arm}} = \frac{2\pi}{5}$$
$$\theta_{\text{relative}} = \theta \pmod{\theta_{\text{arm}}}$$
$$\text{Factor} = \frac{\left|\theta_{\text{relative}} - \frac{\theta_{\text{arm}}}{2}\right|}{\frac{\theta_{\text{arm}}}{2}}$$
$$V_{\text{speed}} = 2.5 + (7.0 - 2.5) \times (1 - \text{Factor})$$
$$\vec{v} = (V_{\text{speed}} \cos\theta, V_{\text{speed}} \sin\theta)$$

### E. Crackling Weeping Willow
Instantiates particles with high initial speeds ($1.5$ to $6.0$) and a high coefficient of friction ($0.985$) so they drift smoothly down, mimicking a shimmering waterfall, while triggering crackling sound effects on a delayed queue.

### F. Splitting Crossettes
Instantiates particles that shoot outward. When their HSL alpha reaches a specific threshold ($0.45$), they cease primary rendering and split into four perpendicular secondary sparks ($0^\circ$, $90^\circ$, $180^\circ$, $270^\circ$) to draw bright cross patterns.

---

## 🔊 3. DSP Audio Synthesis Chain

Neon Flame synthesizes sound directly inside the browser using the modular routing system of the **Web Audio API**. This prevents network lag and provides high-fidelity, interactive spatial audio.

### Signal Flow Diagrams

#### A. Launch Whoosh Synthesizer
```
┌────────────────────────┐
│ Triangle Oscillator    ├──────┐
│ (60Hz ──► 380Hz Sweep) │      │
└────────────────────────┘      ▼
                         ┌──────────────┐     ┌──────────────┐     ┌─────────────┐
                         │ BiquadFilter ├────►│ Gain Node    ├────►│ Master Gain │
                         │ (Low-Pass)   │     │ (0.01 ──► 0.4│     └─────────────┘
                         └──────────────┘     │  ──► 0.001)  │
                                              └──────────────┘
```

#### B. Explosion BOOM Synthesizer
```
┌────────────────────────┐
│ Sine Oscillator        ├──────┐
│ (130Hz ──► 25Hz Sweep) │      │
└────────────────────────┘      ▼
                         ┌──────────────┐
                         │ Gain Node    ├──────────────────────────┐
                         │ (Exponential)│                          │
                         └──────────────┘                          ▼
                                              ┌──────────────┐     ┌─────────────┐
                                              │ Summing Node ├────►│ Master Gain │
                                              └──────────────┘     └─────────────┘
                                                       ▲
┌────────────────────────┐                             │
│ Triangle Oscillator    ├──────┐                      │
│ (280Hz ──► 80Hz Sweep) │      │                      │
└────────────────────────┘      ▼                      │
                         ┌──────────────┐              │
                         │ Gain Node    ├──────────────┘
                         │ (0.5 ──► 0.0)│
                         └──────────────┘
```

#### C. Sparkle Crackle Synthesizer
```
┌────────────────────────┐
│ White Noise Buffer     ├──────┐
│ (Random audio values)  │      │
└────────────────────────┘      ▼
                         ┌──────────────┐     ┌──────────────┐     ┌─────────────┐
                         │ BiquadFilter ├────►│ Gain Node    ├────►│ Master Gain │
                         │ (High-Pass)  │     │ (Volume decay│     └─────────────┘
                         └──────────────┘     │ over 0.05s)  │
                                              └──────────────┘
```

### Sound Synthesis Parameters

- **Ascent Whoosh**:
  - Oscillator Type: `triangle`
  - Pitch Curve: Upward exponential sweep ($60\text{ Hz} \to 380\text{ Hz}$ over $0.6$ seconds)
  - Filtering: Low-pass filter swept exponentially from $150\text{ Hz} \to 1200\text{ Hz}$
- **Explosion Mortar**:
  - Primary sub-bass oscillator: `sine` wave ($130\text{ Hz} \to 25\text{ Hz}$ pitch decay)
  - Mid-frequency blast oscillator: `triangle` wave ($280\text{ Hz} \to 80\text{ Hz}$ impact pop)
  - Volumetric Envelope: Exponential decay to $0$ over $0.6$ to $1.2$ seconds, scaled by explosion intensity
- **Sparkle Willow Crackle**:
  - Source: Pre-buffered array of white noise values
  - Filtering: High-pass filter cut-off at $2.5\text{ kHz}$ to $3.5\text{ kHz}$
  - Envelope: Tiny gain envelopes fading over $0.05$ seconds, fired at randomized intervals over a $0.5$-second window

---

## ⚡ 4. Diagnostics & Optimizations

To ensure visual excellence without causing hardware lag, Neon Flame includes three critical rendering optimizations:

1. **Dual-Canvas Layers**: Twinkling star backgrounds are fully rendered on a separate, non-overlapping canvas. This means the engine only draws the starfield once on resizing, then coordinates simple alpha twinkles instead of constantly redrawing stars under active, semi-transparent firework layers.
2. **Path Rendering Vectors**: Particles are drawn using single-vector lines between their current and previous positions (`prevPos` and `pos`). This is significantly faster for GPU pipelines to render than arc-based circle calculations, and automatically scales spark lengths based on their speed.
3. **Adaptive FPS Throttling**:
   - The Showcase Controller tracks the delta time between animation frames to compile real-time FPS.
   - If the frame rate drops below $35\text{ FPS}$ (common on low-end mobile devices when multiple high-density fireworks explode simultaneously), the engine automatically reduces the target `activeDensity` by $20$ particles.
   - This dynamically reduces the CPU/GPU workload until a stable $60\text{ FPS}$ is re-established.
