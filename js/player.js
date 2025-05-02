/**
 * Player class for handling character controls and game logic
 */
class Player {
    /**
     * Create a new player
     * @param {Object} options - Configuration options
     * @param {Sprite} options.sprite - The sprite for this player
     * @param {Object} options.controls - Control configuration
     * @param {number} options.playerNumber - Player number (1 or 2)
     */
    constructor(options) {
        this.sprite = options.sprite;
        this.controls = options.controls;
        this.playerNumber = options.playerNumber || 1;
        
        // Movement properties
        this.moveSpeed = 5;
        this.jumpForce = -15;
        this.gravity = 0.8;
        this.velocityX = 0;
        this.velocityY = 0;
        
        // Player state
        this.state = 'idle'; // idle, walking, running, jumping, attacking, hurt, blocking, defeated
        this.isJumping = false;
        this.isAttacking = false;
        this.isBlocking = false;
        this.isVulnerable = true;
        this.isDefeated = false;
        
        // Combat properties
        this.health = 100;
        this.maxHealth = 100;
        this.attackDamage = 10;
        this.attackCooldown = 0;
        this.attackCooldownMax = 30; // Frames before next attack
        this.comboCount = 0;
        this.comboTimer = 0;
        this.comboTimerMax = 45; // Frames before combo resets
        this.invulnerabilityFrames = 0;
        this.invulnerabilityMax = 30; // Frames of invulnerability after being hit
        this.blockStunFrames = 0;
        this.hitStunFrames = 0;
        
        // Last direction for movement
        this.lastDirection = 'right';
        
        // Input state
        this.input = {
            left: false,
            right: false,
            up: false,
            down: false,
            attack: false,
            jump: false,
            run: false,
            block: false
        };
        
        // Animation timers
        this.animationTimers = {
            attack: null,
            hurt: null,
            block: null
        };
        
        // Visual effects
        this.hitFlashFrames = 0;
        this.hitFlashColor = 'rgba(255, 0, 0, 0.5)';
        
        // Bind event handlers
        this.handleKeyDown = this.handleKeyDown.bind(this);
        this.handleKeyUp = this.handleKeyUp.bind(this);
        
        // Set up event listeners
        window.addEventListener('keydown', this.handleKeyDown);
        window.addEventListener('keyup', this.handleKeyUp);
        
        // Debug
        this.debug = false;
    }
    
    /**
     * Handle keydown events
     * @param {KeyboardEvent} event - The keyboard event
     */
    handleKeyDown(event) {
        const key = event.key.toLowerCase();
        
        // Prevent default behavior for game controls
        if (this.isGameControl(key)) {
            event.preventDefault();
        }
        
        this.updateInputState(event, true);
    }
    
    /**
     * Handle keyup events
     * @param {KeyboardEvent} event - The keyboard event
     */
    handleKeyUp(event) {
        this.updateInputState(event, false);
    }
    
    /**
     * Check if a key is a game control
     * @param {string} key - The key to check
     * @returns {boolean} - Whether the key is a game control
     */
    isGameControl(key) {
        const controlKeys = Object.values(this.controls);
        return controlKeys.includes(key);
    }
    
    /**
     * Update input state based on keyboard events
     * @param {KeyboardEvent} event - The keyboard event
     * @param {boolean} isPressed - Whether the key is pressed or released
     */
    updateInputState(event, isPressed) {
        const key = event.key.toLowerCase();
        
        // Check against the player's control configuration
        if (key === this.controls.left) {
            this.input.left = isPressed;
        } else if (key === this.controls.right) {
            this.input.right = isPressed;
        } else if (key === this.controls.up) {
            this.input.up = isPressed;
            this.input.jump = isPressed;
        } else if (key === this.controls.down) {
            this.input.down = isPressed;
            this.input.block = isPressed; // Down key also acts as block
        } else if (key === this.controls.attack) {
            this.input.attack = isPressed;
        } else if (key === this.controls.run) {
            this.input.run = isPressed;
        }
    }
    
    /**
     * Update player state
     * @param {number} deltaTime - Time since last update in milliseconds
     * @param {Object} gameState - Current game state
     */
    update(deltaTime, gameState) {
        // Skip updates if defeated
        if (this.isDefeated) {
            return;
        }
        
        // Update timers
        this.updateTimers();
        
        // Handle movement if not in hit stun or block stun
        if (this.hitStunFrames <= 0 && this.blockStunFrames <= 0) {
            this.handleMovement();
            
            // Handle attacks
            this.handleAttacks();
            
            // Handle blocking
            this.handleBlocking();
        }
        
        // Update sprite position based on velocity
        this.sprite.x += this.velocityX;
        this.sprite.y += this.velocityY;
        
        // Update sprite animation based on player state
        this.updateAnimation();
        
        // Update sprite
        this.sprite.update();
        
        // Apply gravity if not on the ground
        if (this.sprite.y < gameState.groundY - this.sprite.height) {
            this.velocityY += this.gravity;
            this.isJumping = true;
        } else {
            // Stop at ground level
            this.sprite.y = gameState.groundY - this.sprite.height;
            this.velocityY = 0;
            if (this.isJumping) {
                this.isJumping = false;
                // Transition from jumping to idle
                if (this.state === 'jumping' && !this.isAttacking && !this.isBlocking) {
                    this.setState('idle');
                }
            }
        }
        
        // Keep player within game bounds
        this.keepInBounds(gameState.bounds);
        
        // Debug info
        if (this.debug) {
            console.log(`Player ${this.playerNumber} - State: ${this.state}, Health: ${this.health}, Combo: ${this.comboCount}`);
        }
    }
    
    /**
     * Update timers and counters
     */
    updateTimers() {
        // Update attack cooldown
        if (this.attackCooldown > 0) {
            this.attackCooldown--;
        }
        
        // Update combo timer
        if (this.comboTimer > 0) {
            this.comboTimer--;
        } else if (this.comboCount > 0) {
            // Reset combo when timer expires
            this.comboCount = 0;
        }
        
        // Update invulnerability frames
        if (this.invulnerabilityFrames > 0) {
            this.invulnerabilityFrames--;
            this.isVulnerable = false;
        } else {
            this.isVulnerable = true;
        }
        
        // Update hit stun frames
        if (this.hitStunFrames > 0) {
            this.hitStunFrames--;
            if (this.hitStunFrames === 0 && !this.isDefeated) {
                // Transition out of hurt state when hit stun ends
                this.setState('idle');
            }
        }
        
        // Update block stun frames
        if (this.blockStunFrames > 0) {
            this.blockStunFrames--;
            if (this.blockStunFrames === 0 && this.input.down) {
                // Continue blocking if down is still held
                this.setState('blocking');
            } else if (this.blockStunFrames === 0) {
                // Return to idle if not blocking anymore
                this.setState('idle');
            }
        }
        
        // Update hit flash effect
        if (this.hitFlashFrames > 0) {
            this.hitFlashFrames--;
        }
    }
    
    /**
     * Set player state
     * @param {string} newState - The new state
     */
    setState(newState) {
        // Don't change state if in hit stun or block stun
        if (this.hitStunFrames > 0 && newState !== 'hurt' && newState !== 'defeated') {
            return;
        }
        
        if (this.blockStunFrames > 0 && newState !== 'blocking' && newState !== 'hurt' && newState !== 'defeated') {
            return;
        }
        
        // Don't change state if attacking (let animation finish)
        if (this.isAttacking && newState !== 'attacking' && newState !== 'hurt' && newState !== 'defeated') {
            return;
        }
        
        // Special case for defeated state
        if (newState === 'defeated') {
            this.isDefeated = true;
        }
        
        this.state = newState;
    }
    
    /**
     * Handle player movement based on input
     */
    handleMovement() {
        // Reset velocity
        this.velocityX = 0;
        
        // Don't allow movement while attacking or blocking
        if (this.isAttacking || this.isBlocking) {
            return;
        }
        
        // Handle horizontal movement
        if (this.input.left) {
            this.velocityX = -this.moveSpeed * (this.input.run ? 1.5 : 1);
            this.sprite.facingRight = false;
            this.lastDirection = 'left';
            
            if (!this.isJumping) {
                this.setState(this.input.run ? 'running' : 'walking');
            }
        } else if (this.input.right) {
            this.velocityX = this.moveSpeed * (this.input.run ? 1.5 : 1);
            this.sprite.facingRight = true;
            this.lastDirection = 'right';
            
            if (!this.isJumping) {
                this.setState(this.input.run ? 'running' : 'walking');
            }
        } else if (!this.isJumping && !this.isAttacking && !this.isBlocking) {
            // If not moving horizontally and not jumping or attacking, set to idle
            this.setState('idle');
        }
        
        // Handle jumping
        if (this.input.jump && !this.isJumping) {
            this.velocityY = this.jumpForce;
            this.isJumping = true;
            this.setState('jumping');
        }
    }
    
    /**
     * Handle player attacks based on input
     */
    handleAttacks() {
        if (this.input.attack && !this.isAttacking && this.attackCooldown <= 0 && !this.isBlocking) {
            this.isAttacking = true;
            this.attackCooldown = this.attackCooldownMax;
            this.setState('attacking');
            
            // Choose attack animation based on combo count
            let attackType = 'slash';
            
            // Implement combo system
            if (this.comboTimer > 0) {
                this.comboCount = (this.comboCount + 1) % 3;
                
                // Different attacks based on combo count
                switch (this.comboCount) {
                    case 0:
                        attackType = 'slash';
                        this.sprite.attackHitbox.damage = this.attackDamage;
                        break;
                    case 1:
                        attackType = 'backslash';
                        this.sprite.attackHitbox.damage = this.attackDamage * 1.2;
                        break;
                    case 2:
                        attackType = 'halfslash';
                        this.sprite.attackHitbox.damage = this.attackDamage * 1.5;
                        break;
                }
            } else {
                // Start new combo
                this.comboCount = 0;
                this.sprite.attackHitbox.damage = this.attackDamage;
            }
            
            // Reset combo timer
            this.comboTimer = this.comboTimerMax;
            
            // Set the attack animation
            this.sprite.setAnimation(attackType, 'down');
            
            // Activate attack hitbox
            this.sprite.attackHitbox.active = true;
            
            // Set a timeout to end the attack
            clearTimeout(this.animationTimers.attack);
            this.animationTimers.attack = setTimeout(() => {
                this.isAttacking = false;
                this.sprite.attackHitbox.active = false;
                
                // Return to appropriate state
                if (this.isJumping) {
                    this.setState('jumping');
                } else if (Math.abs(this.velocityX) > 0) {
                    this.setState(this.input.run ? 'running' : 'walking');
                } else {
                    this.setState('idle');
                }
            }, 500); // Attack duration in milliseconds
        }
    }
    
    /**
     * Handle player blocking based on input
     */
    handleBlocking() {
        if (this.input.down && !this.isJumping && !this.isAttacking) {
            if (!this.isBlocking) {
                this.isBlocking = true;
                this.setState('blocking');
            }
        } else if (this.isBlocking) {
            this.isBlocking = false;
            this.setState('idle');
        }
    }
    
    /**
     * Update sprite animation based on player state
     */
    updateAnimation() {
        switch (this.state) {
            case 'idle':
                this.sprite.setAnimation('idle', 'down');
                break;
            case 'walking':
                this.sprite.setAnimation('walk', 'down');
                break;
            case 'running':
                this.sprite.setAnimation('run', 'down');
                break;
            case 'jumping':
                this.sprite.setAnimation('jump', 'down');
                break;
            case 'attacking':
                // Attack animations are set in handleAttacks
                break;
            case 'hurt':
                this.sprite.setAnimation('hurt', 'down');
                break;
            case 'blocking':
                this.sprite.setAnimation('sit', 'down'); // Using sit animation for blocking
                break;
            case 'defeated':
                this.sprite.setAnimation('hurt', 'down'); // Use hurt animation for defeated
                break;
            default:
                this.sprite.setAnimation('idle', 'down');
        }
    }
    
    /**
     * Keep player within game bounds
     * @param {Object} bounds - Game bounds {left, right, top, bottom}
     */
    keepInBounds(bounds) {
        // Calculate sprite dimensions
        const spriteWidth = this.sprite.hitbox.width * this.sprite.scale;
        const spriteHeight = this.sprite.hitbox.height * this.sprite.scale;
        
        // Keep within horizontal bounds
        if (this.sprite.x < bounds.left) {
            this.sprite.x = bounds.left;
        } else if (this.sprite.x + spriteWidth > bounds.right) {
            this.sprite.x = bounds.right - spriteWidth;
        }
        
        // Keep within vertical bounds
        if (this.sprite.y < bounds.top) {
            this.sprite.y = bounds.top;
            this.velocityY = 0;
        } else if (this.sprite.y + spriteHeight > bounds.bottom) {
            this.sprite.y = bounds.bottom - spriteHeight;
            this.velocityY = 0;
            this.isJumping = false;
            
            // Transition from jumping to idle
            if (this.state === 'jumping' && !this.isAttacking && !this.isBlocking) {
                this.setState('idle');
            }
        }
    }
    
    /**
     * Take damage from an attack
     * @param {number} amount - Amount of damage to take
     * @param {Object} attackInfo - Information about the attack
     * @returns {boolean} - Whether the attack was successful
     */
    takeDamage(amount, attackInfo = {}) {
        // Check if player is invulnerable or defeated
        if (!this.isVulnerable || this.isDefeated) {
            return false;
        }
        
        // Check if player is blocking
        if (this.isBlocking) {
            // Reduce damage when blocking
            const blockedDamage = amount * 0.3;
            this.health -= blockedDamage;
            
            // Apply block stun
            this.blockStunFrames = 20;
            
            // Apply reduced knockback
            if (attackInfo.knockback) {
                this.velocityX = attackInfo.knockback.x * 0.3;
                this.velocityY = attackInfo.knockback.y * 0.3;
            }
            
            // Visual feedback for blocked attack
            this.hitFlashFrames = 5;
            this.hitFlashColor = 'rgba(0, 100, 255, 0.5)';
            
            return true;
        }
        
        // Apply damage
        this.health -= amount;
        if (this.health <= 0) {
            this.health = 0;
            this.setState('defeated');
        } else {
            // Play hurt animation
            this.setState('hurt');
        }
        
        // Apply hit stun
        this.hitStunFrames = 30;
        
        // Apply invulnerability
        this.invulnerabilityFrames = this.invulnerabilityMax;
        
        // Apply knockback
        if (attackInfo.knockback) {
            this.velocityX = attackInfo.knockback.x;
            this.velocityY = attackInfo.knockback.y;
        }
        
        // Visual feedback for hit
        this.hitFlashFrames = 10;
        this.hitFlashColor = 'rgba(255, 0, 0, 0.5)';
        
        return true;
    }
    
    /**
     * Draw the player with any visual effects
     * @param {CanvasRenderingContext2D} ctx - Canvas rendering context
     */
    draw(ctx) {
        // Apply hit flash effect
        if (this.hitFlashFrames > 0) {
            ctx.save();
            ctx.globalCompositeOperation = 'source-over';
            ctx.fillStyle = this.hitFlashColor;
            
            // Get player hitbox
            const hitbox = CollisionDetector.getHitbox(this.sprite, 'body');
            ctx.fillRect(hitbox.x, hitbox.y, hitbox.width, hitbox.height);
            
            ctx.restore();
        }
        
        // Draw invulnerability effect (blinking)
        if (this.invulnerabilityFrames > 0 && Math.floor(this.invulnerabilityFrames / 3) % 2 === 0) {
            ctx.save();
            ctx.globalAlpha = 0.7;
            this.sprite.draw(ctx);
            ctx.restore();
        } else {
            this.sprite.draw(ctx);
        }
    }
    
    /**
     * Clean up event listeners
     */
    cleanup() {
        window.removeEventListener('keydown', this.handleKeyDown);
        window.removeEventListener('keyup', this.handleKeyUp);
        
        // Clear any active timers
        clearTimeout(this.animationTimers.attack);
        clearTimeout(this.animationTimers.hurt);
        clearTimeout(this.animationTimers.block);
    }
}