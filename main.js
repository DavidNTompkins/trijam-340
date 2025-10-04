// Main application controller
let network = null;
let game = null;
let mobileController = null;
let qrGenerator = null;
let lastFrameTime = 0;

// UI Elements
const titleScreen = document.getElementById('titleScreen');
const mobileScreen = document.getElementById('mobileScreen');
const gameScreen = document.getElementById('gameScreen');
const gameOverScreen = document.getElementById('gameOverScreen');

// Initialize the application
window.addEventListener('load', () => {
    network = new NetworkManager();

    network.init().then((result) => {
        if (network.isDesktop) {
            initDesktop(result);
        } else {
            initMobile(result);
        }
    }).catch((error) => {
        console.error('Failed to initialize network:', error);
        alert('Failed to initialize connection. Please refresh the page.');
    });
});

function initDesktop(result) {
    console.log('Initializing desktop mode...');

    // Set up title screen
    const accessCodeElement = document.getElementById('accessCode');
    accessCodeElement.textContent = result.accessCode;

    // QR code removed - users will open page manually on mobile

    // Set up network callbacks
    network.onConnection((connected) => {
        const statusBar = document.getElementById('connectionStatus');
        const startButton = document.getElementById('startGameBtn');
        const statusIcon = statusBar.querySelector('.statusIcon');
        const statusText = statusBar.querySelector('.statusText');

        if (connected) {
            statusIcon.textContent = '[OK]';
            statusText.textContent = 'Mobile device authenticated successfully';
            statusText.style.color = '#008000';
            startButton.disabled = false;
        } else {
            statusIcon.textContent = '[ERR]';
            statusText.textContent = 'Mobile device disconnected';
            statusText.style.color = '#ff0000';
            startButton.disabled = true;
        }
    });

    network.onData((data) => {
        if (data.type === 'rotation' && game) {
            game.setLighthouseAngle(data.angle);
        }
    });

    // Start game button
    document.getElementById('startGameBtn').addEventListener('click', () => {
        startGame();
    });

    // Restart button
    document.getElementById('restartBtn').addEventListener('click', () => {
        showScreen('titleScreen');
    });
}

function initMobile(result) {
    console.log('Initializing mobile mode...');

    showScreen('mobileScreen');

    // Check if code is in URL
    const urlParams = new URLSearchParams(window.location.search);
    const codeFromUrl = urlParams.get('code');
    if (codeFromUrl) {
        document.getElementById('codeInput').value = codeFromUrl;
    }

    // Connect button
    document.getElementById('connectBtn').addEventListener('click', () => {
        const code = document.getElementById('codeInput').value;
        if (code.length === 4) {
            connectMobileToDesktop(code);
        } else {
            alert('Please enter a valid 4-digit code');
        }
    });

    // Allow enter key to connect
    document.getElementById('codeInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            document.getElementById('connectBtn').click();
        }
    });
}

function connectMobileToDesktop(code) {
    const statusElement = document.getElementById('mobileStatus');
    statusElement.textContent = 'Connecting...';
    statusElement.style.color = '#ffd700';

    network.connectToDesktop(code).then(() => {
        statusElement.textContent = 'Connected!';
        statusElement.style.color = '#4eff4e';

        // Hide code entry, show controller
        document.getElementById('codeEntry').style.display = 'none';
        document.getElementById('controllerArea').style.display = 'block';

        // Initialize controller
        const wheelCanvas = document.getElementById('controlWheel');
        mobileController = new MobileController(wheelCanvas);

        // Send rotation updates to desktop
        mobileController.onRotate((angle) => {
            network.send({
                type: 'rotation',
                angle: angle
            });
        });

        // Listen for desktop data
        network.onData((data) => {
            // Handle any data from desktop if needed
        });

    }).catch((error) => {
        console.error('Connection failed:', error);
        statusElement.textContent = 'Connection failed';
        statusElement.style.color = '#ff4e4e';
        alert('Failed to connect. Please check the code and try again.');
    });
}

function startGame() {
    showScreen('gameScreen');

    // Initialize audio
    if (typeof audioManager !== 'undefined') {
        audioManager.init();
        audioManager.loadAirhorn();
        audioManager.startBackgroundMusic();
    }

    // Initialize game
    const gameCanvas = document.getElementById('gameCanvas');
    game = new Game(gameCanvas);

    game.onGameOver = (score, boatsSaved, crashCount) => {
        handleGameOver(score, boatsSaved, crashCount);
    };

    game.start();

    // Start game loop
    lastFrameTime = performance.now();
    gameLoop();
}

function gameLoop(currentTime) {
    if (!game || !game.running) return;

    const deltaTime = currentTime - lastFrameTime;
    lastFrameTime = currentTime;

    // Update game
    game.update(deltaTime);

    // Draw game
    game.draw();

    // Update UI
    document.getElementById('score').textContent = game.score;
    document.getElementById('boatsSaved').textContent = game.boatsSaved;
    document.getElementById('crashes').textContent = game.crashCount;

    // Continue loop
    requestAnimationFrame(gameLoop);
}

function handleGameOver(score, boatsSaved, crashCount) {
    console.log('Game Over! Score:', score, 'Boats Saved:', boatsSaved, 'Crashes:', crashCount);

    // Stop background music
    if (typeof audioManager !== 'undefined') {
        audioManager.stopBackgroundMusic();
    }

    // Show game over screen with fade effect
    showScreen('gameOverScreen');

    // Reset animations by removing and re-adding the class
    const fadeOverlay = document.getElementById('fadeOverlay');
    const gameOverContent = document.getElementById('gameOverContent');

    fadeOverlay.style.animation = 'none';
    gameOverContent.style.animation = 'none';

    setTimeout(() => {
        fadeOverlay.style.animation = '';
        gameOverContent.style.animation = '';
    }, 10);

    document.getElementById('finalScore').textContent = score;
    document.getElementById('finalBoatsSaved').textContent = boatsSaved;
}

function showScreen(screenId) {
    const screens = [titleScreen, mobileScreen, gameScreen, gameOverScreen];
    screens.forEach(screen => screen.classList.remove('active'));

    const targetScreen = document.getElementById(screenId);
    if (targetScreen) {
        targetScreen.classList.add('active');
    }
}

// Handle window resize - game handles its own resize via the resize listener in constructor

// Prevent accidental page navigation
window.addEventListener('beforeunload', (e) => {
    if (game && game.running) {
        e.preventDefault();
        e.returnValue = '';
    }
});

// Debug mode toggle
window.addEventListener('keydown', (e) => {
    if (e.key === 'd' || e.key === 'D') {
        if (game) {
            game.debugMode = !game.debugMode;
            console.log('Debug mode:', game.debugMode ? 'ON' : 'OFF');
        }
    }
});
