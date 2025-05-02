/**
 * Main game class for the fighting game
 */
class Game {
    /**
     * Initialize the game
     */
    constructor() {
        // Get the canvas and context
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        
        // Game state
        this.isLoading = true;
        this.isRunning = false;
        this.debug = false; // Set to true to show hitboxes
        this.showHitboxes = false; // Separate toggle for hitboxes
        this.gameOver = false;
        this.winner = null;
        this.gameState = 'loading'; // loading, title, play, pause, gameOver
        
        // Game boundaries
        this.bounds = {
            left: 0,
            right: this.canvas.width,
            top: 0,
            bottom: this.canvas.height
        };
        
        // Ground level
        this.groundY = this.canvas.height - 100;
        
        // Sprite data
        this.spriteData = null;
        
        // Characters
        this.player1 = null;
        this.player2 = null;
        this.player1Sprite = null;
        this.player2Sprite = null;
        
        // Game score
        this.player1Score = 0;
        this.player2Score = 0;
        
        // Round timer
        this.roundTime = 60; // 60 seconds per round
        this.roundTimer = this.roundTime;
        this.lastTimerUpdate = 0;
        
        // Visual effects
        this.hitEffects = [];
        
        // Background elements
        this.backgroundImage = new Image();
        this.backgroundImage.src = 'assets/background.png';
        this.backgroundLoaded = false;
        this.backgroundImage.onload = () => {
            this.backgroundLoaded = true;
        };
        
        // UI elements
        this.uiElements = {
            titleScreen: null,
            pauseScreen: null,
            gameOverScreen: null
        };
        
        // Sound effects (optional)
        this.sounds = {
            hit: null,
            block: null,
            victory: null,
            defeat: null,
            background: null
        };
        
        // Game loop variables
        this.lastTime = 0;
        this.animationFrameId = null;
        
        // Bind methods
        this.gameLoop = this.gameLoop.bind(this);
        this.toggleDebug = this.toggleDebug.bind(this);
        this.toggleHitboxes = this.toggleHitboxes.bind(this);
        this.resetGame = this.resetGame.bind(this);
        this.togglePause = this.togglePause.bind(this);
        this.startGame = this.startGame.bind(this);
        this.handleClick = this.handleClick.bind(this);
        this.handleMouseMove = this.handleMouseMove.bind(this);
        
        // Set up event listeners
        window.addEventListener('keydown', (e) => {
            if (e.key === 'd') {
                this.toggleDebug();
            } else if (e.key === 'h') {
                this.toggleHitboxes();
            } else if (e.key === 'r' && this.gameOver) {
                this.resetGame();
            } else if (e.key === 'p' || e.key === 'Escape') {
                this.togglePause();
            }
        });
        
        // Add click event listener for buttons
        this.canvas.addEventListener('click', this.handleClick);
        this.canvas.addEventListener('mousemove', this.handleMouseMove);
        
        // Initialize the game
        this.init();
    }
    
    /**
     * Initialize the game
     */
    async init() {
        console.log('Initializing game...');
        
        try {
            // Load sprite data
            await this.loadSpriteData();
            
            // Create characters
            await this.createCharacters();
            
            // Create UI elements
            this.createUIElements();
            
            // Set initial game state to title screen
            this.isLoading = false;
            this.gameState = 'title';
            
            // Start the game loop
            this.isRunning = true;
            this.lastTime = performance.now();
            this.gameLoop(this.lastTime);
            
            console.log('Game initialized successfully');
        } catch (error) {
            console.error('Failed to initialize game:', error);
        }
    }
    
    /**
     * Load sprite data from JSON file
     */
    async loadSpriteData() {
        try {
            const response = await fetch('assets/sprite_data.json');
            if (!response.ok) {
                throw new Error(`Failed to load sprite data: ${response.status} ${response.statusText}`);
            }
            
            this.spriteData = await response.json();
            console.log('Sprite data loaded successfully');
            return this.spriteData;
        } catch (error) {
            console.error('Error loading sprite data:', error);
            throw error;
        }
    }
    
    /**
     * Create character sprites and players
     */
    async createCharacters() {
        // Create player 1 sprite (Big Brother)
        this.player1Sprite = new Sprite({
            character: 'bigbro',
            animation: 'idle',
            direction: 'down',
            x: 200,
            y: this.groundY - 256, // Position at ground level
            scale: 2
        });
        
        // Create player 2 sprite (Little Brother)
        this.player2Sprite = new Sprite({
            character: 'littlebro',
            animation: 'idle',
            direction: 'down',
            x: 500,
            y: this.groundY - 256, // Position at ground level
            scale: 2
        });
        
        // Load sprite data for both characters
        try {
            await Promise.all([
                this.player1Sprite.loadSpriteData(this.spriteData),
                this.player2Sprite.loadSpriteData(this.spriteData)
            ]);
            
            // Set up attack hitboxes with damage values
            this.player1Sprite.attackHitbox = {
                width: 96,
                height: 64,
                offsetX: 64,
                offsetY: 96,
                active: false,
                damage: 10
            };
            
            this.player2Sprite.attackHitbox = {
                width: 96,
                height: 64,
                offsetX: 64,
                offsetY: 96,
                active: false,
                damage: 8
            };
            
            // Create player 1 (Big Brother) with WASD controls and Left Shift for attack
            this.player1 = new Player({
                sprite: this.player1Sprite,
                playerNumber: 1,
                controls: {
                    left: 'a',
                    right: 'd',
                    up: 'w',
                    down: 's',
                    jump: 'w',
                    attack: 'shift',
                    run: 'q'
                }
            });
            
            // Create player 2 (Little Brother) with Arrow keys and Spacebar for attack
            this.player2 = new Player({
                sprite: this.player2Sprite,
                playerNumber: 2,
                controls: {
                    left: 'arrowleft',
                    right: 'arrowright',
                    up: 'arrowup',
                    down: 'arrowdown',
                    jump: 'arrowup',
                    attack: ' ', // Space
                    run: 'enter'
                }
            });
            
            // Set initial facing directions (facing each other)
            this.player1Sprite.facingRight = true;
            this.player2Sprite.facingRight = false;
            
            // Set different combat attributes for each character
            this.player1.attackDamage = 12; // Big Brother hits harder
            this.player1.moveSpeed = 4.5;   // But moves slightly slower
            
            this.player2.attackDamage = 8;  // Little Brother hits lighter
            this.player2.moveSpeed = 5.5;   // But moves faster
            
            console.log('Characters created successfully');
        } catch (error) {
            console.error('Failed to load character sprites:', error);
            throw error;
        }
    }
    
    /**
     * Create UI elements for different game states
     */
    createUIElements() {
        // Create title screen UI
        this.uiElements.titleScreen = {
            title: "BROTHER BATTLE",
            subtitle: "A Pixel Fighting Game",
            startButton: {
                x: this.canvas.width / 2 - 100,
                y: this.canvas.height / 2 + 50,
                width: 200,
                height: 50,
                text: "START GAME",
                hovered: false
            },
            instructionsButton: {
                x: this.canvas.width / 2 - 100,
                y: this.canvas.height / 2 + 120,
                width: 200,
                height: 50,
                text: "INSTRUCTIONS",
                hovered: false
            }
        };
        
        // Create pause screen UI
        this.uiElements.pauseScreen = {
            title: "GAME PAUSED",
            resumeButton: {
                x: this.canvas.width / 2 - 100,
                y: this.canvas.height / 2 - 25,
                width: 200,
                height: 50,
                text: "RESUME",
                hovered: false
            },
            restartButton: {
                x: this.canvas.width / 2 - 100,
                y: this.canvas.height / 2 + 45,
                width: 200,
                height: 50,
                text: "RESTART",
                hovered: false
            },
            quitButton: {
                x: this.canvas.width / 2 - 100,
                y: this.canvas.height / 2 + 115,
                width: 200,
                height: 50,
                text: "QUIT TO TITLE",
                hovered: false
            }
        };
        
        // Create game over screen UI
        this.uiElements.gameOverScreen = {
            title: "GAME OVER",
            winnerText: "",
            restartButton: {
                x: this.canvas.width / 2 - 100,
                y: this.canvas.height / 2 + 50,
                width: 200,
                height: 50,
                text: "PLAY AGAIN",
                hovered: false
            },
            quitButton: {
                x: this.canvas.width / 2 - 100,
                y: this.canvas.height / 2 + 120,
                width: 200,
                height: 50,
                text: "QUIT TO TITLE",
                hovered: false
            }
        };
        
        // Create instructions screen UI
        this.uiElements.instructionsScreen = {
            title: "HOW TO PLAY",
            backButton: {
                x: this.canvas.width / 2 - 100,
                y: this.canvas.height - 80,
                width: 200,
                height: 50,
                text: "BACK",
                hovered: false
            },
            instructions: [
                "PLAYER 1 (Big Brother):",
                "W - Jump",
                "A - Move Left",
                "S - Crouch/Block",
                "D - Move Right",
                "SHIFT - Attack",
                "Q - Run",
                "",
                "PLAYER 2 (Little Brother):",
                "↑ - Jump",
                "← - Move Left",
                "↓ - Crouch/Block",
                "→ - Move Right",
                "SPACE - Attack",
                "ENTER - Run",
                "",
                "P - Pause Game",
                "D - Toggle Debug",
                "H - Toggle Hitboxes"
            ]
        };
    }
    
    /**
     * Main game loop
     * @param {number} timestamp - Current timestamp
     */
    gameLoop(timestamp) {
        // Calculate delta time
        const deltaTime = timestamp - this.lastTime;
        this.lastTime = timestamp;
        
        // Clear the canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Update and render based on game state
        switch (this.gameState) {
            case 'loading':
                this.drawLoadingScreen();
                break;
                
            case 'title':
                this.drawTitleScreen();
                break;
                
            case 'instructions':
                this.drawInstructionsScreen();
                break;
                
            case 'play':
                // Update game state
                this.update(deltaTime);
                
                // Render the game
                this.render();
                break;
                
            case 'pause':
                // Render the game (frozen)
                this.render();
                
                // Draw pause overlay
                this.drawPauseScreen();
                break;
                
            case 'gameOver':
                // Render the game (frozen)
                this.render();
                
                // Draw game over overlay
                this.drawGameOverScreen();
                break;
        }
        
        // Continue the game loop if the game is running
        if (this.isRunning) {
            this.animationFrameId = requestAnimationFrame(this.gameLoop);
        }
    }
    
    /**
     * Update game state
     * @param {number} deltaTime - Time since last update in milliseconds
     */
    update(deltaTime) {
        // Skip updates if game is paused or over
        if (this.gameState !== 'play') {
            return;
        }
        
        // Update round timer
        this.updateRoundTimer(deltaTime);
        
        // Create game state object to pass to players
        const gameState = {
            bounds: this.bounds,
            groundY: this.groundY,
            deltaTime: deltaTime
        };
        
        // Update players
        if (this.player1) {
            this.player1.update(deltaTime, gameState);
            
            // Update sprite velocity for orientation
            this.player1Sprite.velocityX = this.player1.velocityX;
            this.player1Sprite.velocityY = this.player1.velocityY;
        }
        
        if (this.player2) {
            this.player2.update(deltaTime, gameState);
            
            // Update sprite velocity for orientation
            this.player2Sprite.velocityX = this.player2.velocityX;
            this.player2Sprite.velocityY = this.player2.velocityY;
        }
        
        // Check for collisions and combat interactions
        this.checkCollisions();
        
        // Make players face each other when close
        this.updateFacingDirections();
        
        // Update visual effects
        this.updateVisualEffects(deltaTime);
        
        // Check for game over condition
        this.checkGameOver();
    }
    
    /**
     * Update the round timer
     * @param {number} deltaTime - Time since last update in milliseconds
     */
    updateRoundTimer(deltaTime) {
        // Update timer every second
        this.lastTimerUpdate += deltaTime;
        if (this.lastTimerUpdate >= 1000) {
            this.roundTimer -= Math.floor(this.lastTimerUpdate / 1000);
            this.lastTimerUpdate %= 1000;
            
            // Check if time is up
            if (this.roundTimer <= 0) {
                this.roundTimer = 0;
                this.determineWinnerByHealth();
            }
        }
    }
    
    /**
     * Determine the winner based on remaining health when time runs out
     */
    determineWinnerByHealth() {
        if (this.player1.health > this.player2.health) {
            this.gameOver = true;
            this.winner = 1;
        } else if (this.player2.health > this.player1.health) {
            this.gameOver = true;
            this.winner = 2;
        } else {
            // It's a tie - both players lose
            this.gameOver = true;
            this.winner = 0; // 0 indicates a tie
        }
        
        // Update game state
        if (this.gameOver) {
            this.gameState = 'gameOver';
            this.updateScores();
        }
    }
    
    /**
     * Update facing directions to make players face each other when close
     */
    updateFacingDirections() {
        if (!this.player1 || !this.player2) return;
        
        // Only update facing if players are not actively moving
        if (this.player1.velocityX === 0 && this.player2.velocityX === 0) {
            // Calculate horizontal distance between players
            const p1CenterX = this.player1Sprite.x + (this.player1Sprite.width * this.player1Sprite.scale) / 2;
            const p2CenterX = this.player2Sprite.x + (this.player2Sprite.width * this.player2Sprite.scale) / 2;
            
            // Make players face each other when close
            if (Math.abs(p1CenterX - p2CenterX) < 300) {
                this.player1Sprite.facingRight = p1CenterX < p2CenterX;
                this.player2Sprite.facingRight = p2CenterX < p1CenterX;
            }
        }
    }
    
    /**
     * Check for collisions between players and handle combat interactions
     */
    checkCollisions() {
        if (!this.player1 || !this.player2) return;
        
        // Check if players are colliding (body collision)
        if (CollisionDetector.spritesCollide(this.player1Sprite, this.player2Sprite)) {
            // Calculate collision response
            const response = CollisionDetector.calculateCollisionResponse(
                this.player1Sprite, 
                this.player2Sprite
            );
            
            // Apply collision response
            this.player1Sprite.x += response.dx1;
            this.player1Sprite.y += response.dy1;
            this.player2Sprite.x += response.dx2;
            this.player2Sprite.y += response.dy2;
        }
        
        // Check if player 1's attack hits player 2
        const p1HitInfo = CollisionDetector.attackHits(this.player1Sprite, this.player2Sprite);
        if (p1HitInfo && p1HitInfo.hit) {
            // Calculate knockback based on attack type
            const knockback = CollisionDetector.calculateKnockback(
                this.player1Sprite,
                this.player2Sprite,
                p1HitInfo.attackType,
                p1HitInfo.damage
            );
            
            // Apply damage to player 2
            const hitSuccessful = this.player2.takeDamage(p1HitInfo.damage, { 
                knockback: knockback,
                attackType: p1HitInfo.attackType
            });
            
            // Create hit effect if hit was successful
            if (hitSuccessful) {
                this.createHitEffect(p1HitInfo.hitPosition);
                this.player1Sprite.attackHitbox.active = false; // Prevent multiple hits
                
                // Play hit sound (if implemented)
                // this.playSound('hit');
            }
        }
        
        // Check if player 2's attack hits player 1
        const p2HitInfo = CollisionDetector.attackHits(this.player2Sprite, this.player1Sprite);
        if (p2HitInfo && p2HitInfo.hit) {
            // Calculate knockback based on attack type
            const knockback = CollisionDetector.calculateKnockback(
                this.player2Sprite,
                this.player1Sprite,
                p2HitInfo.attackType,
                p2HitInfo.damage
            );
            
            // Apply damage to player 1
            const hitSuccessful = this.player1.takeDamage(p2HitInfo.damage, { 
                knockback: knockback,
                attackType: p2HitInfo.attackType
            });
            
            // Create hit effect if hit was successful
            if (hitSuccessful) {
                this.createHitEffect(p2HitInfo.hitPosition);
                this.player2Sprite.attackHitbox.active = false; // Prevent multiple hits
                
                // Play hit sound (if implemented)
                // this.playSound('hit');
            }
        }
    }
    
    /**
     * Create a hit effect at the specified position
     * @param {Object} position - Position {x, y}
     * @param {string} type - Type of hit effect
     */
    createHitEffect(position, type = 'normal') {
        this.hitEffects.push({
            position: { ...position },
            type: type,
            duration: 20, // Frames
            currentFrame: 0
        });
    }
    
    /**
     * Update visual effects
     * @param {number} deltaTime - Time since last update
     */
    updateVisualEffects(deltaTime) {
        // Update hit effects
        for (let i = this.hitEffects.length - 1; i >= 0; i--) {
            const effect = this.hitEffects[i];
            effect.currentFrame++;
            
            // Remove effect when duration is reached
            if (effect.currentFrame >= effect.duration) {
                this.hitEffects.splice(i, 1);
            }
        }
    }
    
    /**
     * Check for game over condition
     */
    checkGameOver() {
        if (this.player1.health <= 0) {
            this.gameOver = true;
            this.winner = 2;
            this.gameState = 'gameOver';
            this.updateScores();
        } else if (this.player2.health <= 0) {
            this.gameOver = true;
            this.winner = 1;
            this.gameState = 'gameOver';
            this.updateScores();
        }
    }
    
    /**
     * Update scores based on the winner
     */
    updateScores() {
        if (this.winner === 1) {
            this.player1Score++;
        } else if (this.winner === 2) {
            this.player2Score++;
        }
        // No score update for ties (winner === 0)
        
        // Update game over screen with winner text
        if (this.winner === 0) {
            this.uiElements.gameOverScreen.winnerText = "IT'S A TIE!";
        } else {
            const winnerName = this.winner === 1 ? "BIG BROTHER" : "LITTLE BROTHER";
            this.uiElements.gameOverScreen.winnerText = `${winnerName} WINS!`;
        }
    }
    
    /**
     * Reset the game for a new round
     */
    resetGame() {
        // Reset game state
        this.gameOver = false;
        this.winner = null;
        this.roundTimer = this.roundTime;
        this.lastTimerUpdate = 0;
        
        // Reset player positions
        this.player1Sprite.x = 200;
        this.player1Sprite.y = this.groundY - 256;
        this.player2Sprite.x = 500;
        this.player2Sprite.y = this.groundY - 256;
        
        // Reset player health and state
        this.player1.health = this.player1.maxHealth;
        this.player1.setState('idle');
        this.player1.isDefeated = false;
        
        this.player2.health = this.player2.maxHealth;
        this.player2.setState('idle');
        this.player2.isDefeated = false;
        
        // Reset facing directions
        this.player1Sprite.facingRight = true;
        this.player2Sprite.facingRight = false;
        
        // Clear visual effects
        this.hitEffects = [];
        
        // Set game state to play
        this.gameState = 'play';
    }
    
    /**
     * Start a new game
     */
    startGame() {
        // Reset scores for a completely new game
        this.player1Score = 0;
        this.player2Score = 0;
        
        // Reset the game state
        this.resetGame();
    }
    
    /**
     * Toggle pause state
     */
    togglePause() {
        if (this.gameState === 'play') {
            this.gameState = 'pause';
        } else if (this.gameState === 'pause') {
            this.gameState = 'play';
        }
    }
    
    /**
     * Handle mouse click events for UI buttons
     * @param {MouseEvent} event - Mouse event
     */
    handleClick(event) {
        // Get click position relative to canvas
        const rect = this.canvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        
        // Handle clicks based on game state
        switch (this.gameState) {
            case 'title':
                this.handleTitleScreenClick(x, y);
                break;
                
            case 'instructions':
                this.handleInstructionsScreenClick(x, y);
                break;
                
            case 'pause':
                this.handlePauseScreenClick(x, y);
                break;
                
            case 'gameOver':
                this.handleGameOverScreenClick(x, y);
                break;
        }
    }
    
    /**
     * Handle mouse move events for button hover effects
     * @param {MouseEvent} event - Mouse event
     */
    handleMouseMove(event) {
        // Get mouse position relative to canvas
        const rect = this.canvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        
        // Check for button hovers based on game state
        let hovering = false;
        
        switch (this.gameState) {
            case 'title':
                hovering = this.updateButtonHoverStates(this.uiElements.titleScreen, x, y);
                break;
                
            case 'instructions':
                hovering = this.updateButtonHoverStates(this.uiElements.instructionsScreen, x, y);
                break;
                
            case 'pause':
                hovering = this.updateButtonHoverStates(this.uiElements.pauseScreen, x, y);
                break;
                
            case 'gameOver':
                hovering = this.updateButtonHoverStates(this.uiElements.gameOverScreen, x, y);
                break;
        }
        
        // Update cursor style
        this.canvas.style.cursor = hovering ? 'pointer' : 'default';
    }
    
    /**
     * Update hover states for all buttons in a screen
     * @param {Object} screen - Screen object containing buttons
     * @param {number} x - Mouse x position
     * @param {number} y - Mouse y position
     * @returns {boolean} - Whether any button is being hovered
     */
    updateButtonHoverStates(screen, x, y) {
        let hovering = false;
        
        // Check each button in the screen
        for (const key in screen) {
            const button = screen[key];
            
            // Skip non-button properties
            if (!button || typeof button !== 'object' || !button.hasOwnProperty('hovered')) {
                continue;
            }
            
            // Update hover state
            const isHovered = this.isPointInRect(x, y, button);
            button.hovered = isHovered;
            hovering = hovering || isHovered;
        }
        
        return hovering;
    }
    
    /**
     * Handle clicks on the title screen
     * @param {number} x - Click x position
     * @param {number} y - Click y position
     */
    handleTitleScreenClick(x, y) {
        const startButton = this.uiElements.titleScreen.startButton;
        const instructionsButton = this.uiElements.titleScreen.instructionsButton;
        
        // Check if start button was clicked
        if (this.isPointInRect(x, y, startButton)) {
            this.startGame();
        }
        
        // Check if instructions button was clicked
        if (this.isPointInRect(x, y, instructionsButton)) {
            this.gameState = 'instructions';
        }
    }
    
    /**
     * Handle clicks on the instructions screen
     * @param {number} x - Click x position
     * @param {number} y - Click y position
     */
    handleInstructionsScreenClick(x, y) {
        const backButton = this.uiElements.instructionsScreen.backButton;
        
        // Check if back button was clicked
        if (this.isPointInRect(x, y, backButton)) {
            this.gameState = 'title';
        }
    }
    
    /**
     * Handle clicks on the pause screen
     * @param {number} x - Click x position
     * @param {number} y - Click y position
     */
    handlePauseScreenClick(x, y) {
        const resumeButton = this.uiElements.pauseScreen.resumeButton;
        const restartButton = this.uiElements.pauseScreen.restartButton;
        const quitButton = this.uiElements.pauseScreen.quitButton;
        
        // Check if resume button was clicked
        if (this.isPointInRect(x, y, resumeButton)) {
            this.gameState = 'play';
        }
        
        // Check if restart button was clicked
        if (this.isPointInRect(x, y, restartButton)) {
            this.resetGame();
        }
        
        // Check if quit button was clicked
        if (this.isPointInRect(x, y, quitButton)) {
            this.gameState = 'title';
        }
    }
    
    /**
     * Handle clicks on the game over screen
     * @param {number} x - Click x position
     * @param {number} y - Click y position
     */
    handleGameOverScreenClick(x, y) {
        const restartButton = this.uiElements.gameOverScreen.restartButton;
        const quitButton = this.uiElements.gameOverScreen.quitButton;
        
        // Check if restart button was clicked
        if (this.isPointInRect(x, y, restartButton)) {
            this.resetGame();
        }
        
        // Check if quit button was clicked
        if (this.isPointInRect(x, y, quitButton)) {
            this.gameState = 'title';
        }
    }
    
    /**
     * Check if a point is inside a rectangle
     * @param {number} x - Point x position
     * @param {number} y - Point y position
     * @param {Object} rect - Rectangle {x, y, width, height}
     * @returns {boolean} - Whether the point is inside the rectangle
     */
    isPointInRect(x, y, rect) {
        return (
            x >= rect.x &&
            x <= rect.x + rect.width &&
            y >= rect.y &&
            y <= rect.y + rect.height
        );
    }
    
    /**
     * Render the game
     */
    render() {
        // Draw background
        this.drawBackground();
        
        // Draw characters
        if (this.player1) this.player1.draw(this.ctx);
        if (this.player2) this.player2.draw(this.ctx);
        
        // Draw hit effects
        this.drawHitEffects();
        
        // Draw hitboxes if debug mode is enabled
        if (this.showHitboxes) {
            if (this.player1Sprite) CollisionDetector.drawHitboxes(this.ctx, this.player1Sprite, true);
            if (this.player2Sprite) CollisionDetector.drawHitboxes(this.ctx, this.player2Sprite, true);
        }
        
        // Draw UI elements
        this.drawUI();
        
        // Draw debug info if enabled
        if (this.debug) {
            this.drawDebugInfo();
        }
    }
    
    /**
     * Draw UI elements (health bars, timer, score)
     */
    drawUI() {
        // Draw health bars
        this.drawHealthBars();
        
        // Draw round timer
        this.drawRoundTimer();
        
        // Draw score
        this.drawScore();
    }
    
    /**
     * Draw hit effects
     */
    drawHitEffects() {
        for (const effect of this.hitEffects) {
            // Calculate alpha based on remaining duration
            const alpha = 1 - (effect.currentFrame / effect.duration);
            
            // Calculate scale based on current frame
            const scale = 1 + (effect.currentFrame / 10);
            
            // Save context state
            this.ctx.save();
            
            // Apply alpha and scale
            this.ctx.globalAlpha = alpha;
            this.ctx.translate(effect.position.x, effect.position.y);
            this.ctx.scale(scale, scale);
            this.ctx.translate(-effect.position.x, -effect.position.y);
            
            // Draw the effect
            CollisionDetector.createHitEffect(this.ctx, effect.position, effect.type);
            
            // Restore context state
            this.ctx.restore();
        }
    }
    
    /**
     * Draw the game background
     */
    drawBackground() {
        if (this.backgroundLoaded) {
            // Draw the background image
            this.ctx.drawImage(this.backgroundImage, 0, 0, this.canvas.width, this.canvas.height);
        } else {
            // Fallback to drawing a simple background
            // Create gradient background
            const gradient = this.ctx.createLinearGradient(0, 0, 0, this.canvas.height);
            gradient.addColorStop(0, '#333');
            gradient.addColorStop(1, '#222');
            
            this.ctx.fillStyle = gradient;
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            
            // Draw a simple grid for reference
            this.ctx.strokeStyle = '#444';
            this.ctx.lineWidth = 1;
            
            // Vertical lines
            for (let x = 0; x < this.canvas.width; x += 50) {
                this.ctx.beginPath();
                this.ctx.moveTo(x, 0);
                this.ctx.lineTo(x, this.groundY);
                this.ctx.stroke();
            }
            
            // Horizontal lines
            for (let y = 0; y < this.groundY; y += 50) {
                this.ctx.beginPath();
                this.ctx.moveTo(0, y);
                this.ctx.lineTo(this.canvas.width, y);
                this.ctx.stroke();
            }
            
            // Draw floor
            this.ctx.fillStyle = '#555';
            this.ctx.fillRect(0, this.groundY, this.canvas.width, this.canvas.height - this.groundY);
        }
    }
    
    /**
     * Draw health bars for both players
     */
    drawHealthBars() {
        if (!this.player1 || !this.player2) return;
        
        // Player 1 health bar
        this.drawPlayerHealthBar(
            20, 20, 300, 25, 
            this.player1.health, this.player1.maxHealth,
            "BIG BROTHER", 'left'
        );
        
        // Player 2 health bar
        this.drawPlayerHealthBar(
            this.canvas.width - 320, 20, 300, 25,
            this.player2.health, this.player2.maxHealth,
            "LITTLE BROTHER", 'right'
        );
    }
    
    /**
     * Draw a player health bar
     * @param {number} x - X position
     * @param {number} y - Y position
     * @param {number} width - Width of health bar
     * @param {number} height - Height of health bar
     * @param {number} health - Current health
     * @param {number} maxHealth - Maximum health
     * @param {string} name - Player name
     * @param {string} align - Text alignment
     */
    drawPlayerHealthBar(x, y, width, height, health, maxHealth, name, align) {
        // Health percentage
        const healthPercent = Math.max(0, health / maxHealth);
        
        // Background
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        this.ctx.fillRect(x - 5, y - 5, width + 10, height + 30);
        
        // Border
        this.ctx.strokeStyle = '#fff';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(x - 5, y - 5, width + 10, height + 30);
        
        // Empty health bar
        this.ctx.fillStyle = '#333';
        this.ctx.fillRect(x, y, width, height);
        
        // Health bar color based on health percentage
        let healthColor;
        if (healthPercent > 0.6) {
            healthColor = '#0f0'; // Green
        } else if (healthPercent > 0.3) {
            healthColor = '#ff0'; // Yellow
        } else {
            healthColor = '#f00'; // Red
        }
        
        // Health bar
        this.ctx.fillStyle = healthColor;
        this.ctx.fillRect(x, y, width * healthPercent, height);
        
        // Border
        this.ctx.strokeStyle = '#fff';
        this.ctx.strokeRect(x, y, width, height);
        
        // Player name
        this.ctx.fillStyle = '#fff';
        this.ctx.font = 'bold 16px Arial';
        this.ctx.textAlign = align;
        
        if (align === 'left') {
            this.ctx.fillText(name, x, y + height + 20);
        } else {
            this.ctx.fillText(name, x + width, y + height + 20);
        }
    }
    
    /**
     * Draw the round timer
     */
    drawRoundTimer() {
        // Format time as MM:SS
        const minutes = Math.floor(this.roundTimer / 60);
        const seconds = this.roundTimer % 60;
        const timeString = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        
        // Draw timer background
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        this.ctx.fillRect(this.canvas.width / 2 - 50, 20, 100, 40);
        
        // Draw timer border
        this.ctx.strokeStyle = '#fff';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(this.canvas.width / 2 - 50, 20, 100, 40);
        
        // Draw timer text
        this.ctx.fillStyle = this.roundTimer <= 10 ? '#f00' : '#fff';
        this.ctx.font = 'bold 24px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(timeString, this.canvas.width / 2, 48);
    }
    
    /**
     * Draw the score
     */
    drawScore() {
        // Draw score background
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        this.ctx.fillRect(this.canvas.width / 2 - 80, 70, 160, 40);
        
        // Draw score border
        this.ctx.strokeStyle = '#fff';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(this.canvas.width / 2 - 80, 70, 160, 40);
        
        // Draw score text
        this.ctx.fillStyle = '#fff';
        this.ctx.font = 'bold 20px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(`${this.player1Score} - ${this.player2Score}`, this.canvas.width / 2, 98);
    }
    
    /**
     * Draw the title screen
     */
    drawTitleScreen() {
        // Draw background
        this.drawBackground();
        
        // Semi-transparent overlay
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw title
        this.ctx.fillStyle = '#f8d64e';
        this.ctx.font = 'bold 48px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(this.uiElements.titleScreen.title, this.canvas.width / 2, this.canvas.height / 3);
        
        // Draw subtitle
        this.ctx.fillStyle = '#fff';
        this.ctx.font = '24px Arial';
        this.ctx.fillText(this.uiElements.titleScreen.subtitle, this.canvas.width / 2, this.canvas.height / 3 + 40);
        
        // Draw start button
        this.drawButton(
            this.uiElements.titleScreen.startButton,
            '#f8d64e',
            '#fff'
        );
        
        // Draw instructions button
        this.drawButton(
            this.uiElements.titleScreen.instructionsButton,
            '#f8d64e',
            '#fff'
        );
    }
    
    /**
     * Draw the instructions screen
     */
    drawInstructionsScreen() {
        // Draw background
        this.drawBackground();
        
        // Semi-transparent overlay
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw title
        this.ctx.fillStyle = '#f8d64e';
        this.ctx.font = 'bold 36px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(this.uiElements.instructionsScreen.title, this.canvas.width / 2, 80);
        
        // Draw instructions
        this.ctx.fillStyle = '#fff';
        this.ctx.font = '18px Arial';
        this.ctx.textAlign = 'left';
        
        const instructions = this.uiElements.instructionsScreen.instructions;
        const startY = 130;
        const lineHeight = 25;
        
        for (let i = 0; i < instructions.length; i++) {
            const y = startY + i * lineHeight;
            
            // Check if this is a header line
            if (instructions[i].endsWith(':')) {
                this.ctx.font = 'bold 18px Arial';
                this.ctx.fillStyle = '#f8d64e';
            } else {
                this.ctx.font = '18px Arial';
                this.ctx.fillStyle = '#fff';
            }
            
            // Center the text horizontally
            this.ctx.fillText(instructions[i], this.canvas.width / 2 - 150, y);
        }
        
        // Draw back button
        this.drawButton(
            this.uiElements.instructionsScreen.backButton,
            '#f8d64e',
            '#fff'
        );
    }
    
    /**
     * Draw the pause screen
     */
    drawPauseScreen() {
        // Semi-transparent overlay
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw title
        this.ctx.fillStyle = '#f8d64e';
        this.ctx.font = 'bold 36px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(this.uiElements.pauseScreen.title, this.canvas.width / 2, this.canvas.height / 3);
        
        // Draw buttons
        this.drawButton(
            this.uiElements.pauseScreen.resumeButton,
            '#f8d64e',
            '#fff'
        );
        
        this.drawButton(
            this.uiElements.pauseScreen.restartButton,
            '#f8d64e',
            '#fff'
        );
        
        this.drawButton(
            this.uiElements.pauseScreen.quitButton,
            '#f8d64e',
            '#fff'
        );
    }
    
    /**
     * Draw the game over screen
     */
    drawGameOverScreen() {
        // Semi-transparent overlay
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw title
        this.ctx.fillStyle = '#f8d64e';
        this.ctx.font = 'bold 48px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(this.uiElements.gameOverScreen.title, this.canvas.width / 2, this.canvas.height / 3);
        
        // Draw winner text
        this.ctx.fillStyle = '#fff';
        this.ctx.font = 'bold 36px Arial';
        this.ctx.fillText(this.uiElements.gameOverScreen.winnerText, this.canvas.width / 2, this.canvas.height / 3 + 60);
        
        // Draw score
        this.ctx.font = '24px Arial';
        this.ctx.fillText(`Score: ${this.player1Score} - ${this.player2Score}`, this.canvas.width / 2, this.canvas.height / 3 + 100);
        
        // Draw buttons
        this.drawButton(
            this.uiElements.gameOverScreen.restartButton,
            '#f8d64e',
            '#fff'
        );
        
        this.drawButton(
            this.uiElements.gameOverScreen.quitButton,
            '#f8d64e',
            '#fff'
        );
    }
    
    /**
     * Draw a button
     * @param {Object} button - Button object {x, y, width, height, text, hovered}
     * @param {string} color - Button color
     * @param {string} textColor - Text color
     */
    drawButton(button, color, textColor) {
        // Button background
        this.ctx.fillStyle = button.hovered ? color : 'rgba(0, 0, 0, 0.5)';
        this.ctx.fillRect(button.x, button.y, button.width, button.height);
        
        // Button border
        this.ctx.strokeStyle = color;
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(button.x, button.y, button.width, button.height);
        
        // Button text
        this.ctx.fillStyle = textColor;
        this.ctx.font = 'bold 20px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText(button.text, button.x + button.width / 2, button.y + button.height / 2);
    }
    
    /**
     * Draw loading screen
     */
    drawLoadingScreen() {
        this.ctx.fillStyle = '#000';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        this.ctx.fillStyle = '#fff';
        this.ctx.font = '24px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('Loading...', this.canvas.width / 2, this.canvas.height / 2);
        
        // Loading progress bar
        this.ctx.strokeStyle = '#fff';
        this.ctx.strokeRect(this.canvas.width / 2 - 100, this.canvas.height / 2 + 20, 200, 20);
        
        // Animated loading bar
        const loadingWidth = (Math.sin(performance.now() / 500) + 1) * 100;
        this.ctx.fillStyle = '#f8d64e';
        this.ctx.fillRect(this.canvas.width / 2 - 100, this.canvas.height / 2 + 20, loadingWidth, 20);
    }
    
    /**
     * Draw debug information
     */
    drawDebugInfo() {
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        this.ctx.fillRect(10, this.canvas.height - 150, 300, 140);
        
        this.ctx.fillStyle = '#fff';
        this.ctx.font = '12px Courier New';
        this.ctx.textAlign = 'left';
        
        let y = this.canvas.height - 130;
        
        // Game state info
        this.ctx.fillText(`Game State: ${this.gameState}`, 20, y);
        this.ctx.fillText(`Round Timer: ${this.roundTimer}s`, 20, y + 15);
        this.ctx.fillText(`Score: ${this.player1Score} - ${this.player2Score}`, 20, y + 30);
        
        // Player 1 debug info
        if (this.player1) {
            this.ctx.fillText(`P1 State: ${this.player1.state}`, 20, y + 45);
            this.ctx.fillText(`P1 Pos: (${Math.round(this.player1Sprite.x)}, ${Math.round(this.player1Sprite.y)})`, 20, y + 60);
            this.ctx.fillText(`P1 Health: ${Math.round(this.player1.health)}/${this.player1.maxHealth}`, 20, y + 75);
        }
        
        // Player 2 debug info
        if (this.player2) {
            this.ctx.fillText(`P2 State: ${this.player2.state}`, 160, y + 45);
            this.ctx.fillText(`P2 Pos: (${Math.round(this.player2Sprite.x)}, ${Math.round(this.player2Sprite.y)})`, 160, y + 60);
            this.ctx.fillText(`P2 Health: ${Math.round(this.player2.health)}/${this.player2.maxHealth}`, 160, y + 75);
        }
        
        // Controls hint
        this.ctx.fillText('D: Debug | H: Hitboxes | P: Pause | R: Reset', 20, y + 105);
    }
    
    /**
     * Toggle debug mode
     */
    toggleDebug() {
        this.debug = !this.debug;
        console.log(`Debug mode: ${this.debug ? 'on' : 'off'}`);
    }
    
    /**
     * Toggle hitbox visualization
     */
    toggleHitboxes() {
        this.showHitboxes = !this.showHitboxes;
        console.log(`Hitbox visualization: ${this.showHitboxes ? 'on' : 'off'}`);
    }
    
    /**
     * Stop the game loop
     */
    stop() {
        this.isRunning = false;
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
        }
        
        // Clean up event listeners
        if (this.player1) this.player1.cleanup();
        if (this.player2) this.player2.cleanup();
        this.canvas.removeEventListener('click', this.handleClick);
        this.canvas.removeEventListener('mousemove', this.handleMouseMove);
    }
}

// Initialize the game when the page loads
window.addEventListener('load', () => {
    const game = new Game();
});