// Mobile controller interface
class MobileController {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.size = Math.min(window.innerWidth - 40, 300);
        this.canvas.width = this.size;
        this.canvas.height = this.size;

        this.centerX = this.size / 2;
        this.centerY = this.size / 2;
        this.wheelRadius = this.size * 0.4;
        this.knobRadius = this.size * 0.15;

        this.currentAngle = 0;
        this.isDragging = false;
        this.lastAngle = 0;

        this.onRotateCallback = null;

        this.setupEventListeners();
        this.draw();
    }

    setupEventListeners() {
        // Touch events
        this.canvas.addEventListener('touchstart', (e) => this.handleStart(e), { passive: false });
        this.canvas.addEventListener('touchmove', (e) => this.handleMove(e), { passive: false });
        this.canvas.addEventListener('touchend', (e) => this.handleEnd(e), { passive: false });

        // Mouse events for testing
        this.canvas.addEventListener('mousedown', (e) => this.handleStart(e));
        this.canvas.addEventListener('mousemove', (e) => this.handleMove(e));
        this.canvas.addEventListener('mouseup', (e) => this.handleEnd(e));
    }

    handleStart(e) {
        e.preventDefault();
        this.isDragging = true;

        const pos = this.getEventPosition(e);
        const dx = pos.x - this.centerX;
        const dy = pos.y - this.centerY;
        this.lastAngle = Math.atan2(dy, dx);
    }

    handleMove(e) {
        if (!this.isDragging) return;
        e.preventDefault();

        const pos = this.getEventPosition(e);
        const dx = pos.x - this.centerX;
        const dy = pos.y - this.centerY;
        const angle = Math.atan2(dy, dx);

        // Calculate angle difference
        let delta = angle - this.lastAngle;

        // Handle angle wrapping
        if (delta > Math.PI) delta -= Math.PI * 2;
        if (delta < -Math.PI) delta += Math.PI * 2;

        this.currentAngle += delta;
        this.lastAngle = angle;

        // Normalize angle to -PI to PI
        while (this.currentAngle > Math.PI) this.currentAngle -= Math.PI * 2;
        while (this.currentAngle < -Math.PI) this.currentAngle += Math.PI * 2;

        this.draw();

        // Send rotation update
        if (this.onRotateCallback) {
            this.onRotateCallback(this.currentAngle);
        }
    }

    handleEnd(e) {
        e.preventDefault();
        this.isDragging = false;
    }

    getEventPosition(e) {
        const rect = this.canvas.getBoundingClientRect();

        if (e.touches && e.touches.length > 0) {
            return {
                x: e.touches[0].clientX - rect.left,
                y: e.touches[0].clientY - rect.top
            };
        } else {
            return {
                x: e.clientX - rect.left,
                y: e.clientY - rect.top
            };
        }
    }

    draw() {
        // Clear canvas
        this.ctx.clearRect(0, 0, this.size, this.size);

        // Save context and rotate entire canvas
        this.ctx.save();
        this.ctx.translate(this.centerX, this.centerY);
        this.ctx.rotate(this.currentAngle);
        this.ctx.translate(-this.centerX, -this.centerY);

        // Draw outer wheel
        this.ctx.strokeStyle = '#ffd700';
        this.ctx.lineWidth = 8;
        this.ctx.beginPath();
        this.ctx.arc(this.centerX, this.centerY, this.wheelRadius, 0, Math.PI * 2);
        this.ctx.stroke();

        // Draw inner circle
        this.ctx.fillStyle = 'rgba(255, 215, 0, 0.1)';
        this.ctx.beginPath();
        this.ctx.arc(this.centerX, this.centerY, this.wheelRadius - 10, 0, Math.PI * 2);
        this.ctx.fill();

        // Draw tick marks
        this.ctx.strokeStyle = '#ffd700';
        this.ctx.lineWidth = 3;
        for (let i = 0; i < 12; i++) {
            const angle = (Math.PI * 2 / 12) * i;
            const startRadius = this.wheelRadius - 20;
            const endRadius = this.wheelRadius - 5;

            const x1 = this.centerX + Math.cos(angle) * startRadius;
            const y1 = this.centerY + Math.sin(angle) * startRadius;
            const x2 = this.centerX + Math.cos(angle) * endRadius;
            const y2 = this.centerY + Math.sin(angle) * endRadius;

            this.ctx.beginPath();
            this.ctx.moveTo(x1, y1);
            this.ctx.lineTo(x2, y2);
            this.ctx.stroke();
        }

        // Draw direction indicator (lighthouse beam direction) - pointing up
        this.ctx.strokeStyle = '#ffed4e';
        this.ctx.fillStyle = '#ffed4e';
        this.ctx.lineWidth = 6;
        this.ctx.beginPath();
        this.ctx.moveTo(this.centerX, this.centerY);
        const indicatorLength = this.wheelRadius - 15;
        const indicatorX = this.centerX;
        const indicatorY = this.centerY - indicatorLength;
        this.ctx.lineTo(indicatorX, indicatorY);
        this.ctx.stroke();

        // Draw arrow head
        this.ctx.beginPath();
        this.ctx.moveTo(indicatorX, indicatorY);
        this.ctx.lineTo(indicatorX - 8, indicatorY + 15);
        this.ctx.lineTo(indicatorX + 8, indicatorY + 15);
        this.ctx.closePath();
        this.ctx.fill();

        // Draw center hub
        const hubRadius = this.wheelRadius * 0.25;

        // Hub shadow
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        this.ctx.beginPath();
        this.ctx.arc(this.centerX + 3, this.centerY + 3, hubRadius, 0, Math.PI * 2);
        this.ctx.fill();

        // Hub gradient
        const gradient = this.ctx.createRadialGradient(
            this.centerX - hubRadius / 3,
            this.centerY - hubRadius / 3,
            0,
            this.centerX,
            this.centerY,
            hubRadius
        );
        gradient.addColorStop(0, '#ffed4e');
        gradient.addColorStop(1, '#ffd700');

        this.ctx.fillStyle = gradient;
        this.ctx.beginPath();
        this.ctx.arc(this.centerX, this.centerY, hubRadius, 0, Math.PI * 2);
        this.ctx.fill();

        // Hub border
        this.ctx.strokeStyle = '#d4af37';
        this.ctx.lineWidth = 3;
        this.ctx.stroke();

        this.ctx.restore();

        // Draw angle display (not rotated)
        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = 'bold 20px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        const degrees = Math.round((this.currentAngle * 180 / Math.PI + 360) % 360);
        this.ctx.fillText(`${degrees}°`, this.centerX, this.centerY);
    }

    onRotate(callback) {
        this.onRotateCallback = callback;
    }

    setAngle(angle) {
        this.currentAngle = angle;
        this.draw();
    }
}
