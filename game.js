class SwipeyBird {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        
        // Initialize bird properties first
        this.bird = {
            name: 'Swipey',
            x: 0,
            y: 0,
            width: 50,
            height: 36,
            velocityY: 0,
            gravity: 0.25,
            jumpForce: -5,
            rotation: 0
        };
        
        // Make canvas full screen
        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());
        
        // Game state
        this.gameState = 'title'; // title, ready, playing, paused, gameOver
        this.score = 0;
        this.gameSpeed = 3;
        
        // Add high score tracking
        this.highScore = localStorage.getItem('swipeyBirdHighScore') || 0;
        
        // Background
        this.backgroundX = 0;
        this.groundX = 0;
        
        // Touch/swipe handling
        this.isHolding = false;
        this.lastTouchY = 0;
        this.swipeThreshold = 20;
        
        // Load images
        this.images = {};
        this.loadImages();
        
        // Skin management
        this.availableSkins = [
            { 
                name: 'Swipey (Yellow)', 
                image: 'bird.png', 
                unlockScore: 0 
            },
            { 
                name: 'Sparky (Blue)', 
                image: 'bird_3.png', 
                unlockScore: 0 
            },
            { 
                name: 'Swifter (Green)', 
                image: 'bird_2.png', 
                unlockScore: 0 
            },
            { 
                name: 'Cool Swipey', 
                image: 'cool_bird.png', 
                unlockScore: 50  // Paid/high-score skin
            },
            { 
                name: 'Goober', 
                image: 'Goober.png', 
                unlockScore: 75  // High-score unlock
            }
        ];
        this.currentSkinIndex = 0;
        this.loadSkins();
        
        // Event listeners
        this.setupEventListeners();
        
        // Start game loop
        this.gameLoop();
        
        // Pipes
        this.pipes = [];
        this.pipeWidth = 52;
        this.pipeGap = 240;  
        this.pipeTimer = 0;
        this.pipeInterval = 150;  
        
        // Add a flag to track if the game was paused mid-movement
        this.wasPausedMidMovement = false;
        this.pausedVelocity = 0;
        
        // Add point sound
        this.pointSound = new Audio('point.mp3');
        
        // Add death sound
        this.deathSound = new Audio('death.mp3');
        
        // Ranking system
        this.ranks = [
            { name: 'Bronze', minScore: 0, color: '#CD7F32' },
            { name: 'Silver', minScore: 10, color: '#C0C0C0' },
            { name: 'Gold', minScore: 25, color: '#FFD700' },
            { name: 'Platinum', minScore: 50, color: '#E5E4E2' }
        ];
    }
    
    loadImages() {
        const imageFiles = [
            'bird.png',
            'pipe.png',
            'BG.png',
            'Ground.jpeg',
            'Get_ready_screen_swipe_tag.png',
            'Get_ready_screen_text.png',
            'Game_over_screen_text.png',
            'cool_bird.png',
            'Goober.png'
        ];
        
        let loadedCount = 0;
        
        imageFiles.forEach(file => {
            const img = new Image();
            img.onload = () => {
                loadedCount++;
                if (loadedCount === imageFiles.length) {
                    this.imagesLoaded = true;
                }
            };
            img.src = file;
            this.images[file] = img;
        });
    }
    
    loadSkins() {
        this.skins = {};
        this.availableSkins.forEach(skin => {
            const img = new Image();
            img.src = skin.image;
            this.skins[skin.image] = img;
        });
        
        // Load saved skin selection
        const savedSkin = localStorage.getItem('swipeyBirdSelectedSkin');
        if (savedSkin !== null) {
            this.currentSkinIndex = parseInt(savedSkin);
        }
    }
    
    setupEventListeners() {
        // Touch events for mobile
        this.canvas.addEventListener('touchstart', (e) => this.handleTouchStart(e));
        this.canvas.addEventListener('touchmove', (e) => this.handleTouchMove(e));
        this.canvas.addEventListener('touchend', (e) => this.handleTouchEnd(e));
        
        // Mouse events for desktop
        this.canvas.addEventListener('mousedown', (e) => this.handleMouseDown(e));
        this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        this.canvas.addEventListener('mouseup', (e) => this.handleMouseUp(e));
        
        // Prevent context menu
        this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    }
    
    handleTouchStart(e) {
        e.preventDefault();
        if (this.gameState === 'ready') {
            this.isHolding = true;
            this.lastTouchY = e.touches[0].clientY;
        }
    }
    
    handleTouchMove(e) {
        e.preventDefault();
        if (this.gameState === 'ready') {
            this.startGame();
        } else if (this.gameState === 'playing') {
            const currentY = e.touches[0].clientY;
            const deltaY = currentY - this.lastTouchY;
            
            if (Math.abs(deltaY) > this.swipeThreshold) {
                if (deltaY < 0) {
                    // Swipe up
                    this.bird.velocityY = -8;
                } else {
                    // Swipe down
                    this.bird.velocityY = 6;
                }
                this.lastTouchY = currentY;
            }
        } else if (this.gameState === 'paused') {
            const currentY = e.touches[0].clientY;
            const deltaY = currentY - this.lastTouchY;
            
            if (Math.abs(deltaY) > this.swipeThreshold) {
                if (deltaY < 0) {
                    // Swipe up
                    this.pausedVelocity = -8;
                } else {
                    // Swipe down
                    this.pausedVelocity = 6;
                }
                this.lastTouchY = currentY;
            }
        }
    }
    
    handleTouchEnd(e) {
        e.preventDefault();
        if (this.gameState === 'paused') {
            this.resumeGame();
        } else if (this.gameState === 'playing') {
            this.pauseGame();
        }
        this.isHolding = false;
    }
    
    handleMouseDown(e) {
        if (this.gameState === 'ready') {
            this.isHolding = true;
            this.lastTouchY = e.clientY;
        }
    }
    
    handleMouseMove(e) {
        if (this.gameState === 'ready' && this.isHolding) {
            this.startGame();
        } else if (this.gameState === 'playing' && this.isHolding) {
            const currentY = e.clientY;
            const deltaY = currentY - this.lastTouchY;
            
            if (Math.abs(deltaY) > this.swipeThreshold) {
                if (deltaY < 0) {
                    // Swipe up
                    this.bird.velocityY = -8;
                } else {
                    // Swipe down
                    this.bird.velocityY = 6;
                }
                this.lastTouchY = currentY;
            }
        } else if (this.gameState === 'paused') {
            const currentY = e.clientY;
            const deltaY = currentY - this.lastTouchY;
            
            if (Math.abs(deltaY) > this.swipeThreshold) {
                if (deltaY < 0) {
                    // Swipe up
                    this.pausedVelocity = -8;
                } else {
                    // Swipe down
                    this.pausedVelocity = 6;
                }
                this.lastTouchY = currentY;
            }
        }
    }
    
    handleMouseUp(e) {
        if (this.gameState === 'paused') {
            this.resumeGame();
        } else if (this.gameState === 'playing') {
            this.pauseGame();
        }
        this.isHolding = false;
    }
    
    startGame() {
        this.gameState = 'playing';
        document.getElementById('getReadyScreen').classList.add('hidden');
        document.getElementById('score').classList.remove('hidden');
        this.resetGame();
    }
    
    resetGame() {
        this.bird.x = this.canvas.width * 0.25;
        this.bird.y = this.canvas.height * 0.5;
        this.bird.velocityY = 0;
        this.bird.rotation = 0;
        this.bird.width = 60;  
        this.bird.height = 44;  
        this.pipes = [];
        this.score = 0;
        this.pipeTimer = 0;
        this.backgroundX = 0;
        this.groundX = 0;
        this.updateScore();
    }
    
    resizeCanvas() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        
        // Update bird position relative to screen size
        this.bird.x = this.canvas.width * 0.25;
        this.bird.y = this.canvas.height * 0.5;
    }
    
    update() {
        if (this.gameState === 'paused') {
            return;
        }

        if (this.gameState !== 'playing') return;
        
        // Apply gravity and movement only when game is playing
        this.bird.velocityY += this.bird.gravity;
        this.bird.y += this.bird.velocityY;
        
        // Bird rotation based on velocity
        this.bird.rotation = Math.max(-30, Math.min(30, this.bird.velocityY * 3));
        
        // Clamp bird to screen bounds
        if (this.bird.y < 0) {
            this.bird.y = 0;
            this.bird.velocityY = 0;
        }
        const groundHeight = this.canvas.height * 0.15;
        if (this.bird.y > this.canvas.height - groundHeight - this.bird.height) {
            this.gameOver();
            return;
        }
        
        this.groundX -= this.gameSpeed;
        if (this.groundX <= -this.canvas.width) {
            this.groundX = 0;
        }
        
        // Update pipes
        this.updatePipes();
        
        // Check collisions
        this.checkCollisions();
    }
    
    updatePipes() {
        // Add new pipes
        this.pipeTimer++;
        if (this.pipeTimer >= this.pipeInterval) {
            this.addPipe();
            this.pipeTimer = 0;
        }
        
        // Move pipes
        for (let i = this.pipes.length - 1; i >= 0; i--) {
            const pipe = this.pipes[i];
            pipe.x -= this.gameSpeed;
            
            // Score when bird passes pipe
            if (!pipe.scored && pipe.x + this.pipeWidth < this.bird.x) {
                pipe.scored = true;
                this.score++;
                this.updateScore();
                
                // Play point sound
                this.pointSound.play();
                
                // Increase difficulty slightly
                if (this.score % 5 === 0) {
                    this.gameSpeed += 0.2;
                }
            }
            
            // Remove pipes that are off screen
            if (pipe.x + this.pipeWidth < 0) {
                this.pipes.splice(i, 1);
            }
        }
    }
    
    addPipe() {
        const groundHeight = this.canvas.height * 0.15;
        const minHeight = 60;
        const maxHeight = this.canvas.height - this.pipeGap - groundHeight - minHeight;
        const topHeight = Math.random() * (maxHeight - minHeight) + minHeight;
        
        this.pipes.push({
            x: this.canvas.width,
            topHeight: topHeight,
            bottomY: topHeight + this.pipeGap,
            scored: false
        });
    }
    
    checkCollisions() {
        const birdHitbox = {
            left: this.bird.x + 5,  
            right: this.bird.x + this.bird.width - 5,
            top: this.bird.y + 5,
            bottom: this.bird.y + this.bird.height - 5
        };

        for (const pipe of this.pipes) {
            const topPipeHitbox = {
                left: pipe.x,
                right: pipe.x + this.pipeWidth,
                top: 0,
                bottom: pipe.topHeight
            };

            const bottomPipeHitbox = {
                left: pipe.x,
                right: pipe.x + this.pipeWidth,
                top: pipe.bottomY,
                bottom: this.canvas.height - this.canvas.height * 0.15
            };

            // Check collision with top pipe
            if (birdHitbox.right > topPipeHitbox.left &&
                birdHitbox.left < topPipeHitbox.right &&
                birdHitbox.top < topPipeHitbox.bottom) {
                this.gameOver();
                return;
            }
            
            // Check collision with bottom pipe
            if (birdHitbox.right > bottomPipeHitbox.left &&
                birdHitbox.left < bottomPipeHitbox.right &&
                birdHitbox.bottom > bottomPipeHitbox.top) {
                this.gameOver();
                return;
            }
        }
    }
    
    pauseGame() {
        // Store the current velocity before pausing
        this.pausedVelocity = this.bird.velocityY;
        this.wasPausedMidMovement = true;
        
        this.gameState = 'paused';
        document.getElementById('pauseScreen').classList.remove('hidden');
        document.getElementById('pauseScore').textContent = `Current Score: ${this.score}`;
    }
    
    resumeGame() {
        this.gameState = 'playing';
        document.getElementById('pauseScreen').classList.add('hidden');
        
        // Reset velocity if it was paused mid-movement
        if (this.wasPausedMidMovement) {
            this.bird.velocityY = this.pausedVelocity;
            this.wasPausedMidMovement = false;
        } else {
            // If not paused mid-movement, reset velocity
            this.bird.velocityY = 0;
        }
        
        this.bird.rotation = 0;
    }
    
    gameOver() {
        // Determine player's rank
        const playerRank = this.determineRank(this.score);

        // Play death sound
        this.deathSound.play();
        
        // Update high score
        if (this.score > this.highScore) {
            this.highScore = this.score;
            localStorage.setItem('swipeyBirdHighScore', this.highScore);
        }
        
        this.gameState = 'gameOver';
        document.getElementById('score').classList.add('hidden');
        
        // Update game over screen with rank
        document.getElementById('finalScore').innerHTML = `
            Score: ${this.score} 
            <div style="font-size: 18px; color: ${playerRank.color};">
                Rank: ${playerRank.name}
            </div>
        `;
        document.getElementById('highScore').textContent = `High Score: ${this.highScore}`;
        document.getElementById('gameOverScreen').classList.remove('hidden');
    }
    
    determineRank(score) {
        // Only start ranking at 10 points
        if (score < 10) {
            return { name: 'Unranked', color: '#888888' };
        }

        // New ranking system
        if (score >= 10 && score < 20) {
            return { name: 'Bronze', color: '#CD7F32' };
        } else if (score >= 20 && score < 30) {
            return { name: 'Silver', color: '#C0C0C0' };
        } else if (score >= 30 && score < 40) {
            return { name: 'Gold', color: '#FFD700' };
        } else if (score >= 40) {
            return { name: 'Platinum', color: '#E5E4E2' };
        }
        
        // Fallback to default rank
        return { name: 'Unranked', color: '#888888' };
    }
    
    updateScore() {
        document.getElementById('score').textContent = this.score;
    }
    
    shareScore() {
        // Determine player's rank
        const playerRank = this.determineRank(this.score);

        // Construct message with conditional rank
        let message = `I scored ${this.score} in Swipey Bird, it isn't as simple as the other Flappy games, you must swipe up and down to control the bird`;
        
        // Add rank if not unranked
        if (playerRank.name !== 'Unranked') {
            message += ` and achieved ${playerRank.name} rank!`;
        }

        // Add download link
        message += ` Download the game: bentechgames.wordpress.com/getgameid1`;
        
        if (navigator.share) {
            navigator.share({
                title: 'Swipey Bird Score',
                text: message
            }).catch(console.error);
        } else {
            // Fallback for browsers that don't support Web Share API
            navigator.clipboard.writeText(message).then(() => {
                alert('Score message copied to clipboard!');
            });
        }
    }
    
    draw() {
        // Clear canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        if (!this.imagesLoaded) return;
        
        // Draw background
        this.drawBackground();
        
        // Draw pipes
        this.drawPipes();
        
        // Draw bird
        this.drawBird();
        
        // Draw ground
        this.drawGround();
    }
    
    drawBackground() {
        // Draw static background centered
        const bgWidth = this.images['BG.png'].width;
        const bgHeight = this.images['BG.png'].height;
        
        // Scale to fit screen while maintaining aspect ratio
        const scaleX = this.canvas.width / bgWidth;
        const scaleY = this.canvas.height / bgHeight;
        const scale = Math.max(scaleX, scaleY);
        
        const scaledWidth = bgWidth * scale;
        const scaledHeight = bgHeight * scale;
        
        // Center the background
        const offsetX = (this.canvas.width - scaledWidth) / 2;
        const offsetY = (this.canvas.height - scaledHeight) / 2;
        
        this.ctx.drawImage(this.images['BG.png'], offsetX, offsetY, scaledWidth, scaledHeight);
    }
    
    drawPipes() {
        for (const pipe of this.pipes) {
            // Draw top pipe (flipped)
            this.ctx.save();
            this.ctx.scale(1, -1);
            this.ctx.drawImage(this.images['pipe.png'], pipe.x, -pipe.topHeight, this.pipeWidth, pipe.topHeight);
            this.ctx.restore();
            
            // Draw bottom pipe
            this.ctx.drawImage(this.images['pipe.png'], pipe.x, pipe.bottomY, this.pipeWidth, this.canvas.height - pipe.bottomY - this.canvas.height * 0.15);
        }
    }
    
    drawBird() {
        const currentSkin = this.availableSkins[this.currentSkinIndex];
        this.ctx.save();
        this.ctx.translate(this.bird.x + this.bird.width/2, this.bird.y + this.bird.height/2);
        this.ctx.rotate(this.bird.rotation * Math.PI / 180);
        this.ctx.drawImage(this.skins[currentSkin.image], -this.bird.width/2, -this.bird.height/2, this.bird.width, this.bird.height);
        this.ctx.restore();
    }
    
    drawGround() {
        const groundHeight = this.canvas.height * 0.15;
        const groundY = this.canvas.height - groundHeight;
        
        // Draw scrolling ground
        const groundTiles = Math.ceil(this.canvas.width / this.images['Ground.jpeg'].width) + 1;
        for (let i = 0; i < groundTiles; i++) {
            this.ctx.drawImage(this.images['Ground.jpeg'], 
                this.groundX + (i * this.images['Ground.jpeg'].width), 
                groundY, 
                this.images['Ground.jpeg'].width, 
                groundHeight);
        }
    }
    
    showSkinsMenu() {
        // Explicitly hide all screens
        ['titleScreen', 'getReadyScreen', 'gameOverScreen', 'pauseScreen'].forEach(screenId => {
            const screen = document.getElementById(screenId);
            if (screen) screen.classList.add('hidden');
        });
        
        // Show skins screen
        document.getElementById('skinsScreen').classList.remove('hidden');
        this.updateSkinPreview();
    }
    
    updateSkinPreview() {
        const currentSkin = this.availableSkins[this.currentSkinIndex];
        document.getElementById('currentSkinImg').src = currentSkin.image;
        document.getElementById('skinName').textContent = currentSkin.name;
        
        // Check if skin is unlocked
        const unlockHintEl = document.getElementById('skinUnlockHint');
        if (currentSkin.unlockScore > this.highScore) {
            unlockHintEl.textContent = `Unlock at ${currentSkin.unlockScore} points`;
        } else {
            unlockHintEl.textContent = '';
        }
    }
    
    nextSkin() {
        this.currentSkinIndex = (this.currentSkinIndex + 1) % this.availableSkins.length;
        this.updateSkinPreview();
    }
    
    prevSkin() {
        this.currentSkinIndex = (this.currentSkinIndex - 1 + this.availableSkins.length) % this.availableSkins.length;
        this.updateSkinPreview();
    }
    
    selectSkin() {
        const currentSkin = this.availableSkins[this.currentSkinIndex];
        
        // Check if skin is locked before proceeding
        if (currentSkin.unlockScore > this.highScore) {
            alert(`Unlock this skin by scoring ${currentSkin.unlockScore} points!`);
            return; // Don't remove skins screen, just show alert
        }
        
        // Save the selected skin
        localStorage.setItem('swipeyBirdSelectedSkin', this.currentSkinIndex);
        
        // Hide skins screen and return to title
        document.getElementById('skinsScreen').classList.add('hidden');
        document.getElementById('titleScreen').classList.remove('hidden');
    }
    
    gameLoop() {
        this.update();
        this.draw();
        requestAnimationFrame(() => this.gameLoop());
    }
}

// UI functions
function showGetReady() {
    document.getElementById('titleScreen').classList.add('hidden');
    document.getElementById('gameOverScreen').classList.add('hidden');
    document.getElementById('getReadyScreen').classList.remove('hidden');
    
    // Reset game state
    if (window.game) {
        window.game.gameState = 'ready';
        window.game.resetGame();
    }
}

function showTitle() {
    // Ensure all screens are hidden
    document.getElementById('getReadyScreen').classList.add('hidden');
    document.getElementById('gameOverScreen').classList.add('hidden');
    document.getElementById('skinsScreen')?.remove(); 
    document.getElementById('score').classList.add('hidden');
    document.getElementById('titleScreen').classList.remove('hidden');
    
    if (window.game) {
        window.game.gameState = 'title';
    }
}

function showHowToPlay() {
    // Remove any existing how-to-play modal first
    const existingModal = document.querySelector('.how-to-play-modal');
    if (existingModal) {
        existingModal.remove();
    }

    const modal = document.createElement('div');
    modal.className = 'how-to-play-modal';
    modal.innerHTML = `
        <div class="how-to-play-content" style="
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(0, 0, 0, 0.9);
            color: white;
            padding: 40px;
            border-radius: 10px;
            text-align: center;
            z-index: 100;
            font-family: 'Pixeled', monospace;
        ">
            <h2 style="color: #FFD700; margin-bottom: 20px;">How to Play</h2>
            <p style="margin-bottom: 15px;">Control your bird by swiping UP and DOWN</p>
            <p style="margin-bottom: 15px;">Avoid hitting the pipes</p>
            <p style="margin-bottom: 20px;">Get the highest score possible!</p>
            <button onclick="this.closest('.how-to-play-modal').remove()" style="
                background: linear-gradient(135deg, #FF6B35 0%, #F7931E 100%);
                color: white;
                border: 2px solid #D2691E;
                padding: 15px 30px;
                font-size: 20px;
                font-family: 'Pixeled', monospace;
                cursor: pointer;
                border-radius: 8px;
                text-shadow: 1px 1px 0px #000;
                box-shadow: 0 4px 8px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.2);
                transition: all 0.1s ease;
            ">CLOSE</button>
        </div>
    `;
    document.body.appendChild(modal);
}

function closeHowToPlay() {
    const modal = document.getElementById('howToPlayModal');
    if (modal) {
        modal.remove();
    }
}

// Initialize game
window.addEventListener('load', () => {
    window.game = new SwipeyBird();
    
    // Remove the skins screen if it exists
    document.getElementById('skinsScreen')?.remove();
    
    // Skin navigation
    const skinsButton = document.createElement('button');
    skinsButton.textContent = 'SKINS';
    skinsButton.classList.add('start-button');
    skinsButton.style.marginTop = '10px';
    skinsButton.onclick = function() { 
        // Dynamically create and add the skins screen when needed
        if (!document.getElementById('skinsScreen')) {
            const skinsScreen = document.createElement('div');
            skinsScreen.className = 'skins-screen hidden';
            skinsScreen.id = 'skinsScreen';
            skinsScreen.innerHTML = `
                <div class="skins-title">BIRD SKINS</div>
                <div class="skin-selector">
                    <button class="arrow-btn" id="prevSkinBtn">&lt;</button>
                    <div class="skin-preview" id="skinPreview">
                        <img id="currentSkinImg" src="bird.png" alt="Current Skin">
                    </div>
                    <button class="arrow-btn" id="nextSkinBtn">&gt;</button>
                </div>
                <div class="skin-name" id="skinName">Default Bird</div>
                <div class="unlock-hint" id="skinUnlockHint"></div>
                <button class="start-button" onclick="selectSkin()">SELECT</button>
            `;
            document.getElementById('uiOverlay').appendChild(skinsScreen);
            
            // Add event listeners
            document.getElementById('nextSkinBtn').addEventListener('click', () => window.game.nextSkin());
            document.getElementById('prevSkinBtn').addEventListener('click', () => window.game.prevSkin());
        }
        window.game.showSkinsMenu(); 
    };
    
    const titleScreen = document.getElementById('titleScreen');
    titleScreen.appendChild(skinsButton);
});

function selectSkin() {
    if (window.game) {
        const currentSkin = window.game.availableSkins[window.game.currentSkinIndex];
        
        // Check if skin is locked before proceeding
        if (currentSkin.unlockScore > window.game.highScore) {
            alert(`Unlock this skin by scoring ${currentSkin.unlockScore} points!`);
            return; // Don't remove skins screen, just show alert
        }
        
        window.game.selectSkin();
        // Remove the skins screen after selection
        document.getElementById('skinsScreen')?.remove();
    }
}