/**
 * Aetheria Portal - Interactive Cosmic Particle Simulation & Dynamic Card Effects
 * 
 * Implements:
 * 1. Background particle network with fluid vector attraction/repulsion.
 * 2. High-performance canvas renders matching device pixel ratio.
 * 3. Premium mouse-hover lighting effect for glassmorphic cards.
 */

document.addEventListener('DOMContentLoaded', () => {
    initPortalParticles();
    initCardGlowEffects();
});

/**
 * Renders an interactive background particle network on a `<canvas>`
 */
function initPortalParticles() {
    const canvas = document.getElementById('portalCanvas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    
    // Physics variables & configuration
    let particles = [];
    const maxParticles = window.innerWidth < 768 ? 45 : 95; // Limit count on mobile for excellent performance
    const connectionDist = 120; // Distance within which lines are drawn
    const mouse = {
        x: null,
        y: null,
        radius: 180, // Influence area
        isActive: false
    };

    // Responsive Canvas Resize
    function resizeCanvas() {
        const dpr = window.devicePixelRatio || 1;
        canvas.width = window.innerWidth * dpr;
        canvas.height = window.innerHeight * dpr;
        ctx.scale(dpr, dpr);
        
        canvas.style.width = `${window.innerWidth}px`;
        canvas.style.height = `${window.innerHeight}px`;
    }

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Mouse Activity Listeners
    window.addEventListener('mousemove', (e) => {
        mouse.x = e.clientX;
        mouse.y = e.clientY;
        mouse.isActive = true;
    });

    window.addEventListener('mouseleave', () => {
        mouse.x = null;
        mouse.y = null;
        mouse.isActive = false;
    });

    // Particle Object Blueprint
    class Particle {
        constructor() {
            this.x = Math.random() * window.innerWidth;
            this.y = Math.random() * window.innerHeight;
            
            // Random direction velocities (slow and floaty)
            this.vx = (Math.random() - 0.5) * 0.4;
            this.vy = (Math.random() - 0.5) * 0.4;
            
            this.radius = Math.random() * 2.5 + 0.8;
            
            // Color selection from our palette
            const colors = ['#00f5d4', '#9d4edd', '#c77dff', '#3a86c8'];
            this.color = colors[Math.floor(Math.random() * colors.length)];
            
            // Core alpha pulse
            this.alpha = Math.random() * 0.5 + 0.25;
            this.pulseDir = Math.random() > 0.5 ? 0.005 : -0.005;
        }

        update() {
            // Update float pulse
            this.alpha += this.pulseDir;
            if (this.alpha > 0.85 || this.alpha < 0.2) {
                this.pulseDir = -this.pulseDir;
            }

            // Normal drifting
            this.x += this.vx;
            this.y += this.vy;

            // Screen boundary bounce
            if (this.x < 0 || this.x > window.innerWidth) this.vx = -this.vx;
            if (this.y < 0 || this.y > window.innerHeight) this.vy = -this.vy;

            // Mouse interaction (Fluid repulsion drag)
            if (mouse.isActive && mouse.x !== null) {
                const dx = this.x - mouse.x;
                const dy = this.y - mouse.y;
                const distance = Math.hypot(dx, dy);

                if (distance < mouse.radius) {
                    const force = (mouse.radius - distance) / mouse.radius;
                    // Push particles away gently
                    const angle = Math.atan2(dy, dx);
                    this.x += Math.cos(angle) * force * 1.5;
                    this.y += Math.sin(angle) * force * 1.5;
                }
            }
        }

        draw() {
            ctx.save();
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
            ctx.fillStyle = this.color;
            ctx.globalAlpha = this.alpha;
            // Add soft neon outer glow for larger dots
            if (this.radius > 2) {
                ctx.shadowColor = this.color;
                ctx.shadowBlur = 6;
            }
            ctx.fill();
            ctx.restore();
        }
    }

    // Initialize Particle Fleet
    for (let i = 0; i < maxParticles; i++) {
        particles.push(new Particle());
    }

    // Connect close nodes
    function drawConnections() {
        for (let i = 0; i < particles.length; i++) {
            for (let j = i + 1; j < particles.length; j++) {
                const p1 = particles[i];
                const p2 = particles[j];
                const dx = p1.x - p2.x;
                const dy = p1.y - p2.y;
                const distance = Math.hypot(dx, dy);

                if (distance < connectionDist) {
                    // Line opacity depends on distance
                    const alpha = (1 - distance / connectionDist) * 0.12;
                    ctx.beginPath();
                    ctx.moveTo(p1.x, p1.y);
                    ctx.lineTo(p2.x, p2.y);
                    
                    // Create beautiful gradient between the two particle colors
                    const grad = ctx.createLinearGradient(p1.x, p1.y, p2.x, p2.y);
                    grad.addColorStop(0, p1.color);
                    grad.addColorStop(1, p2.color);
                    
                    ctx.strokeStyle = grad;
                    ctx.globalAlpha = alpha;
                    ctx.lineWidth = 0.8;
                    ctx.stroke();
                }
            }
        }
    }

    // Core Animation Frame Loop
    function animate() {
        // Draw deep cosmic space background
        ctx.fillStyle = '#06040a';
        ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);

        // Update and draw particles
        particles.forEach(p => {
            p.update();
            p.draw();
        });

        // Draw connecting networks
        drawConnections();

        requestAnimationFrame(animate);
    }

    animate();
}

/**
 * Attaches real-time mouse coordinate tracking to Aetheria dashboard cards
 * to achieve premium glow overlay effects.
 */
function initCardGlowEffects() {
    const cards = document.querySelectorAll('.app-card');
    
    cards.forEach(card => {
        card.addEventListener('mousemove', (e) => {
            const rect = card.getBoundingClientRect();
            // Calculate absolute mouse coordinates relative to the card border bounds
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            
            card.style.setProperty('--mouse-x', `${x}px`);
            card.style.setProperty('--mouse-y', `${y}px`);
        });
    });
}
