// Main game logic for desktop view
class Game {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.width = 1200;
        this.height = 700;
        this.canvas.width = this.width;
        this.canvas.height = this.height;

        // Game state
        this.running = false;
        this.score = 0;
        this.boatsSaved = 0;
        this.gameTime = 0;

        // Debug mode - toggle with 'D' key
        this.debugMode = false;

        // Asset loading
        this.assets = {
            loaded: false,
            lighthouse: null,
            ships: {
                gray: null,
                red: null,
                blue: null,
                teal: null
            },
            rocks: {
                gray: null,
                illuminated1: null,
                illuminated2: null
            }
        };
        this.loadAssets();

        // Lighthouse
        this.lighthouseAngle = 0; // Angle in radians
        this.lighthouseX = this.width / 2;
        this.lighthouseY = 50;
        this.lightRange = 800; // Increased to cover full screen
        this.lightBeamWidth = Math.PI / 6; // 30 degrees

        // Game objects
        this.boats = [];
        this.obstacles = [];

        // ==========================================
        // SPAWN TIMING - ADJUST THESE VALUES TO CHANGE DIFFICULTY
        // ==========================================
        this.lastBoatSpawn = 0;
        this.boatSpawnInterval = 3000; // milliseconds between boat spawns (LOWER = more boats)
        this.lastObstacleSpawn = 0;
        this.obstacleSpawnInterval = 8000; // milliseconds between rock spawns (HIGHER = fewer rocks)
        this.maxObstacles = 5; // Maximum number of rocks on screen
        // ==========================================

        this.init();
    }

    loadAssets() {
        const assetPaths = {
            lighthouse: 'assets/lighthouse.png',
            ships: {
                gray: 'assets/ship-gray.png',
                red: 'assets/ship-red.png',
                blue: 'assets/ship-blue.png',
                teal: 'assets/ship-teal.png'
            },
            rocks: {
                gray: 'assets/rock-gray.png',
                illuminated1: 'assets/rock-illuminated1.png',
                illuminated2: 'assets/rock-illuminated2.png'
            }
        };

        let loadedCount = 0;
        const totalAssets = 8;

        const checkAllLoaded = () => {
            loadedCount++;
            if (loadedCount === totalAssets) {
                this.assets.loaded = true;
                console.log('All game assets loaded');
            }
        };

        // Load lighthouse image
        const lighthouseImg = new Image();
        lighthouseImg.onload = checkAllLoaded;
        lighthouseImg.onerror = () => {
            console.warn('Failed to load lighthouse asset');
            checkAllLoaded();
        };
        lighthouseImg.src = assetPaths.lighthouse;
        this.assets.lighthouse = lighthouseImg;

        // Load ship images
        for (let color in assetPaths.ships) {
            const img = new Image();
            img.onload = checkAllLoaded;
            img.onerror = () => {
                console.warn(`Failed to load ship asset: ${assetPaths.ships[color]}`);
                checkAllLoaded();
            };
            img.src = assetPaths.ships[color];
            this.assets.ships[color] = img;
        }

        // Load rock images
        for (let type in assetPaths.rocks) {
            const img = new Image();
            img.onload = checkAllLoaded;
            img.onerror = () => {
                console.warn(`Failed to load rock asset: ${assetPaths.rocks[type]}`);
                checkAllLoaded();
            };
            img.src = assetPaths.rocks[type];
            this.assets.rocks[type] = img;
        }
    }

    init() {
        // Create initial obstacles
        this.spawnObstacle();
        this.spawnObstacle();
        this.spawnObstacle();
    }

    start() {
        this.running = true;
        this.gameTime = 0;
        this.score = 0;
        this.boatsSaved = 0;
        this.boats = [];
        this.obstacles = [];
        this.init();
        this.lastBoatSpawn = Date.now();
        this.lastObstacleSpawn = Date.now();
    }

    stop() {
        this.running = false;
    }

    setLighthouseAngle(angle) {
        this.lighthouseAngle = angle;
    }

    spawnBoat() {
        const fromLeft = Math.random() < 0.5;
        const boat = {
            x: fromLeft ? -50 : this.width + 50,
            y: 200 + Math.random() * 400,
            width: 60,
            height: 30,
            speed: (0.5 + Math.random() * 1) * (fromLeft ? 1 : -1),
            direction: fromLeft ? 1 : -1,
            visionRange: 150,
            illuminated: false,
            warning: false,
            color: this.getRandomBoatColor(),
            saved: false
        };
        this.boats.push(boat);
    }

    getRandomBoatColor() {
        const colors = ['red', 'blue', 'teal'];
        return colors[Math.floor(Math.random() * colors.length)];
    }

    spawnObstacle() {
        const obstacle = {
            x: 150 + Math.random() * (this.width - 300),
            y: 200 + Math.random() * 400,
            radius: 20 + Math.random() * 30,
            illuminated: false
        };

        // Make sure obstacle doesn't overlap with existing ones
        let overlapping = false;
        for (let obs of this.obstacles) {
            const dist = Math.hypot(obstacle.x - obs.x, obstacle.y - obs.y);
            if (dist < obstacle.radius + obs.radius + 100) {
                overlapping = true;
                break;
            }
        }

        if (!overlapping) {
            this.obstacles.push(obstacle);
        }
    }

    update(deltaTime) {
        if (!this.running) return;

        this.gameTime += deltaTime;

        // Spawn boats
        const now = Date.now();
        if (now - this.lastBoatSpawn > this.boatSpawnInterval) {
            this.spawnBoat();
            this.lastBoatSpawn = now;
        }

        // Spawn obstacles occasionally
        if (now - this.lastObstacleSpawn > this.obstacleSpawnInterval && this.obstacles.length < this.maxObstacles) {
            this.spawnObstacle();
            this.lastObstacleSpawn = now;
        }

        // Update lighthouse illumination
        this.updateIllumination();

        // Update boats
        for (let i = this.boats.length - 1; i >= 0; i--) {
            const boat = this.boats[i];

            // Check for obstacles in path
            const nearestObstacle = this.findNearestObstacle(boat);
            boat.warning = false;

            if (nearestObstacle) {
                const distToObstacle = this.getDistanceToObstacle(boat, nearestObstacle);

                // Check if boat can see the obstacle
                const canSee = boat.illuminated && nearestObstacle.illuminated &&
                    distToObstacle < boat.visionRange;

                if (canSee) {
                    // Navigate around obstacle
                    const avoidY = nearestObstacle.y > boat.y ? -1 : 1;
                    boat.y += avoidY * Math.abs(boat.speed) * 0.5;
                } else if (distToObstacle < 100) {
                    // Collision warning - show when close but can't see
                    boat.warning = true;

                    // Check for actual collision
                    if (distToObstacle < nearestObstacle.radius + boat.width / 2) {
                        // Game over
                        this.gameOver();
                        return;
                    }
                }
            }

            // Move boat
            boat.x += boat.speed;

            // Remove boats that left the screen
            if (boat.x < -100 || boat.x > this.width + 100) {
                if (!boat.saved) {
                    boat.saved = true;
                    this.boatsSaved++;
                    this.score += 100;
                }
                this.boats.splice(i, 1);
            }
        }
    }

    updateIllumination() {
        // Update which objects are illuminated by the lighthouse
        const lightStartAngle = this.lighthouseAngle - this.lightBeamWidth / 2;
        const lightEndAngle = this.lighthouseAngle + this.lightBeamWidth / 2;

        // Check boats
        for (let boat of this.boats) {
            const boatCenterX = boat.x;
            const boatCenterY = boat.y;
            const angle = Math.atan2(boatCenterY - this.lighthouseY, boatCenterX - this.lighthouseX);
            const distance = Math.hypot(boatCenterX - this.lighthouseX, boatCenterY - this.lighthouseY);

            boat.illuminated = this.isAngleInBeam(angle, lightStartAngle, lightEndAngle) &&
                distance < this.lightRange;
        }

        // Check obstacles
        for (let obstacle of this.obstacles) {
            const angle = Math.atan2(obstacle.y - this.lighthouseY, obstacle.x - this.lighthouseX);
            const distance = Math.hypot(obstacle.x - this.lighthouseX, obstacle.y - this.lighthouseY);

            obstacle.illuminated = this.isAngleInBeam(angle, lightStartAngle, lightEndAngle) &&
                distance < this.lightRange;
        }
    }

    isAngleInBeam(angle, startAngle, endAngle) {
        // Normalize angles to -PI to PI
        const normalizeAngle = (a) => {
            while (a > Math.PI) a -= Math.PI * 2;
            while (a < -Math.PI) a += Math.PI * 2;
            return a;
        };

        angle = normalizeAngle(angle);
        let start = normalizeAngle(startAngle);
        let end = normalizeAngle(endAngle);

        if (start <= end) {
            return angle >= start && angle <= end;
        } else {
            return angle >= start || angle <= end;
        }
    }

    findNearestObstacle(boat) {
        let nearest = null;
        let minDist = Infinity;

        for (let obstacle of this.obstacles) {
            // Only consider obstacles in the boat's path
            const inPath = (boat.direction > 0 && obstacle.x > boat.x) ||
                (boat.direction < 0 && obstacle.x < boat.x);

            if (inPath) {
                const dist = this.getDistanceToObstacle(boat, obstacle);
                if (dist < minDist) {
                    minDist = dist;
                    nearest = obstacle;
                }
            }
        }

        return nearest;
    }

    getDistanceToObstacle(boat, obstacle) {
        // Distance from boat center to obstacle
        return Math.hypot(boat.x - obstacle.x, boat.y - obstacle.y);
    }

    draw() {
        // Clear canvas
        this.ctx.clearRect(0, 0, this.width, this.height);

        // Draw water background
        this.ctx.fillStyle = '#1a3a52';
        this.ctx.fillRect(0, 150, this.width, this.height - 150);

        // Draw lighthouse beam
        this.drawLighthouseBeam();

        // Draw obstacles
        for (let obstacle of this.obstacles) {
            this.drawObstacle(obstacle);

            // Debug: Draw collision box
            if (this.debugMode) {
                this.ctx.strokeStyle = '#ff00ff';
                this.ctx.lineWidth = 2;
                this.ctx.beginPath();
                this.ctx.arc(obstacle.x, obstacle.y, obstacle.radius, 0, Math.PI * 2);
                this.ctx.stroke();
            }
        }

        // Draw boats
        for (let boat of this.boats) {
            this.drawBoat(boat);

            // Debug: Draw collision box
            if (this.debugMode) {
                this.ctx.strokeStyle = '#00ff00';
                this.ctx.lineWidth = 2;
                this.ctx.strokeRect(boat.x - boat.width / 2, boat.y - boat.height / 2, boat.width, boat.height);

                // Draw vision range
                this.ctx.strokeStyle = '#ffff00';
                this.ctx.lineWidth = 1;
                this.ctx.beginPath();
                this.ctx.arc(boat.x, boat.y, boat.visionRange, 0, Math.PI * 2);
                this.ctx.stroke();
            }
        }

        // Draw lighthouse
        this.drawLighthouse();

        // Debug info overlay
        if (this.debugMode) {
            this.drawDebugInfo();
        }
    }

    drawDebugInfo() {
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        this.ctx.fillRect(10, 10, 300, 120);

        this.ctx.fillStyle = '#00ff00';
        this.ctx.font = '14px monospace';
        this.ctx.fillText('DEBUG MODE (Press D to toggle)', 20, 30);
        this.ctx.fillText(`Boats: ${this.boats.length}`, 20, 50);
        this.ctx.fillText(`Rocks: ${this.obstacles.length} / ${this.maxObstacles}`, 20, 70);
        this.ctx.fillText(`Boat spawn: every ${this.boatSpawnInterval}ms`, 20, 90);
        this.ctx.fillText(`Rock spawn: every ${this.obstacleSpawnInterval}ms`, 20, 110);
    }

    drawLighthouse() {
        // Draw lighthouse using image if loaded
        if (this.assets.loaded && this.assets.lighthouse && this.assets.lighthouse.complete) {
            const imgWidth = 80;
            const imgHeight = 100;
            this.ctx.drawImage(
                this.assets.lighthouse,
                this.lighthouseX - imgWidth / 2,
                this.lighthouseY - 10,
                imgWidth,
                imgHeight
            );
        } else {
            // Fallback to drawn lighthouse
            this.ctx.fillStyle = '#d4d4d4';
            this.ctx.beginPath();
            this.ctx.moveTo(this.lighthouseX - 20, this.lighthouseY + 50);
            this.ctx.lineTo(this.lighthouseX + 20, this.lighthouseY + 50);
            this.ctx.lineTo(this.lighthouseX + 15, this.lighthouseY);
            this.ctx.lineTo(this.lighthouseX - 15, this.lighthouseY);
            this.ctx.closePath();
            this.ctx.fill();

            // Lighthouse top (light chamber)
            this.ctx.fillStyle = '#ffd700';
            this.ctx.beginPath();
            this.ctx.arc(this.lighthouseX, this.lighthouseY, 15, 0, Math.PI * 2);
            this.ctx.fill();

            // Red stripes
            this.ctx.fillStyle = '#ff0000';
            this.ctx.fillRect(this.lighthouseX - 20, this.lighthouseY + 15, 40, 8);
            this.ctx.fillRect(this.lighthouseX - 18, this.lighthouseY + 35, 36, 8);
        }
    }

    drawLighthouseBeam() {
        const startAngle = this.lighthouseAngle - this.lightBeamWidth / 2;
        const endAngle = this.lighthouseAngle + this.lightBeamWidth / 2;

        // Create gradient for beam
        const gradient = this.ctx.createRadialGradient(
            this.lighthouseX, this.lighthouseY, 0,
            this.lighthouseX, this.lighthouseY, this.lightRange
        );
        gradient.addColorStop(0, 'rgba(255, 255, 200, 0.4)');
        gradient.addColorStop(1, 'rgba(255, 255, 200, 0)');

        this.ctx.fillStyle = gradient;
        this.ctx.beginPath();
        this.ctx.moveTo(this.lighthouseX, this.lighthouseY);
        this.ctx.arc(this.lighthouseX, this.lighthouseY, this.lightRange, startAngle, endAngle);
        this.ctx.closePath();
        this.ctx.fill();
    }

    drawBoat(boat) {
        this.ctx.save();
        this.ctx.translate(boat.x, boat.y);

        // Draw boat using image assets if loaded
        if (this.assets.loaded) {
            const shipImage = boat.illuminated ?
                this.assets.ships[boat.color] :
                this.assets.ships.gray;

            if (shipImage && shipImage.complete) {
                // Flip boat if going left
                if (boat.direction < 0) {
                    this.ctx.scale(-1, 1);
                }
                this.ctx.drawImage(shipImage, -boat.width / 2, -boat.height / 2, boat.width, boat.height);
            } else {
                // Fallback to drawn boat
                this.drawFallbackBoat(boat);
            }
        } else {
            // Fallback to drawn boat
            this.drawFallbackBoat(boat);
        }

        // Warning indicator
        if (boat.warning) {
            this.ctx.fillStyle = '#ff0000';
            this.ctx.font = 'bold 30px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillText('!', 0, -35);

            // Add warning circle
            this.ctx.strokeStyle = '#ff0000';
            this.ctx.lineWidth = 3;
            this.ctx.beginPath();
            this.ctx.arc(0, -35, 15, 0, Math.PI * 2);
            this.ctx.stroke();
        }

        this.ctx.restore();
    }

    drawFallbackBoat(boat) {
        // Boat hull
        this.ctx.fillStyle = boat.illuminated ? this.getBoatColorHex(boat.color) : '#333333';
        this.ctx.beginPath();
        this.ctx.ellipse(0, 0, boat.width / 2, boat.height / 2, 0, 0, Math.PI * 2);
        this.ctx.fill();

        // Boat cabin
        this.ctx.fillStyle = boat.illuminated ? '#ffffff' : '#222222';
        this.ctx.fillRect(-10, -15, 20, 15);
    }

    getBoatColorHex(colorName) {
        const colorMap = {
            'red': '#ff6b6b',
            'blue': '#45b7d1',
            'teal': '#4ecdc4'
        };
        return colorMap[colorName] || '#ffffff';
    }

    drawObstacle(obstacle) {
        // Draw rock using image assets if loaded
        if (this.assets.loaded) {
            let rockImage;
            if (obstacle.illuminated) {
                // Randomly pick between two illuminated rock variants
                if (!obstacle.illuminatedVariant) {
                    obstacle.illuminatedVariant = Math.random() < 0.5 ? 'illuminated1' : 'illuminated2';
                }
                rockImage = this.assets.rocks[obstacle.illuminatedVariant];
            } else {
                rockImage = this.assets.rocks.gray;
            }

            if (rockImage && rockImage.complete) {
                const size = obstacle.radius * 2;
                this.ctx.drawImage(rockImage, obstacle.x - obstacle.radius, obstacle.y - obstacle.radius, size, size);
                return;
            }
        }

        // Fallback to drawn rock
        this.ctx.fillStyle = obstacle.illuminated ? '#666666' : '#1a1a1a';
        this.ctx.strokeStyle = obstacle.illuminated ? '#888888' : '#0a0a0a';
        this.ctx.lineWidth = 2;

        this.ctx.beginPath();
        this.ctx.arc(obstacle.x, obstacle.y, obstacle.radius, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.stroke();

        // Add some texture
        if (obstacle.illuminated) {
            this.ctx.fillStyle = '#555555';
            this.ctx.beginPath();
            this.ctx.arc(obstacle.x - obstacle.radius / 3, obstacle.y - obstacle.radius / 3,
                obstacle.radius / 4, 0, Math.PI * 2);
            this.ctx.fill();
        }
    }

    gameOver() {
        this.stop();

        // Play airhorn sound on game over
        if (typeof audioManager !== 'undefined') {
            audioManager.playAirhorn();
        }

        // Trigger game over event
        if (this.onGameOver) {
            this.onGameOver(this.score, this.boatsSaved);
        }
    }

    onGameOver(callback) {
        this.onGameOver = callback;
    }
}
