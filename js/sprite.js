/**
 * Sprite class for handling character sprites and animations
 */
class Sprite {
    /**
     * Create a new sprite
     * @param {Object} options - Configuration options for the sprite
     * @param {string} options.character - Character name (e.g., 'bigbro', 'littlebro')
     * @param {string} options.animation - Initial animation name
     * @param {string} options.direction - Initial direction ('down', 'left', 'right', 'up')
     * @param {number} options.x - Initial x position
     * @param {number} options.y - Initial y position
     * @param {number} options.scale - Scale factor for rendering (zoom)
     */
    constructor(options) {
        this.character = options.character;
        this.animation = options.animation || 'idle';
        this.direction = options.direction || 'down';
        this.x = options.x || 0;
        this.y = options.y || 0;
        this.scale = options.scale || 2; // Default scale (zoom) factor
        this.width = 0;  // Will be set when images are loaded
        this.height = 0; // Will be set when images are loaded
        
        this.frameIndex = 0;
        this.frameCount = 0;
        this.animationSpeed = options.animationSpeed || 10; // Frames to wait before changing animation frame
        this.spriteData = null;
        this.images = {};
        this.currentFrame = null;
        this.isLoaded = false;
        this.facingRight = true; // For character orientation
        this.velocityX = 0; // For determining orientation
        this.velocityY = 0;
        
        // Animation state
        this.currentAnimationData = null;
        this.isAnimationLooping = true;
        this.animationComplete = false;
        
        // Default hitbox (can be overridden by sprite data)
        this.hitbox = {
            width: 64,
            height: 128,
            offsetX: 32,
            offsetY: 96
        };
        
        // Attack hitbox
        this.attackHitbox = {
            width: 96,
            height: 64,
            offsetX: 64,
            offsetY: 96,
            active: false,
            damage: 10
        };
        
        // Vulnerable hitbox (area where character can be hit)
        this.vulnerableHitbox = {
            width: 60,
            height: 120,
            offsetX: 34,
            offsetY: 100
        };
        
        // Hitbox adjustments for different animations
        this.hitboxAdjustments = {
            idle: { offsetX: 0, offsetY: 0, width: 0, height: 0 },
            walk: { offsetX: 0, offsetY: 0, width: 0, height: 0 },
            run: { offsetX: 0, offsetY: 0, width: 0, height: 0 },
            jump: { offsetX: 0, offsetY: -10, width: 0, height: -10 },
            slash: { offsetX: 0, offsetY: 0, width: 0, height: 0 },
            backslash: { offsetX: 0, offsetY: 0, width: 0, height: 0 },
            halfslash: { offsetX: 0, offsetY: 0, width: 0, height: 0 },
            hurt: { offsetX: 0, offsetY: 10, width: 0, height: -20 },
            sit: { offsetX: 0, offsetY: 20, width: 0, height: -30 }
        };
        
        // Attack hitbox adjustments for different attack animations
        this.attackHitboxAdjustments = {
            slash: { 
                offsetX: 70, 
                offsetY: 80, 
                width: 100, 
                height: 80,
                damage: 10
            },
            backslash: { 
                offsetX: 70, 
                offsetY: 100, 
                width: 110, 
                height: 70,
                damage: 12
            },
            halfslash: { 
                offsetX: 60, 
                offsetY: 70, 
                width: 90, 
                height: 90,
                damage: 15
            },
            thrust: { 
                offsetX: 80, 
                offsetY: 90, 
                width: 120, 
                height: 50,
                damage: 18
            }
        };
    }
    
    /**
     * Load sprite data from JSON
     * @param {Object} spriteData - The sprite data object
     * @returns {Promise} - Promise that resolves when all images are loaded
     */
    loadSpriteData(spriteData) {
        this.spriteData = spriteData.characters[this.character];
        
        if (!this.spriteData) {
            console.error(`No sprite data found for character: ${this.character}`);
            return Promise.reject(`No sprite data found for character: ${this.character}`);
        }
        
        // Set default hitbox from sprite data if available
        if (spriteData.hitbox && spriteData.hitbox.default) {
            this.hitbox = { 
                width: spriteData.hitbox.default.width,
                height: spriteData.hitbox.default.height,
                offsetX: spriteData.hitbox.default.offset_x,
                offsetY: spriteData.hitbox.default.offset_y
            };
            
            // Set vulnerable hitbox slightly smaller than body hitbox
            this.vulnerableHitbox = {
                width: this.hitbox.width - 4,
                height: this.hitbox.height - 8,
                offsetX: this.hitbox.offsetX + 2,
                offsetY: this.hitbox.offsetY + 4
            };
        }
        
        // Set attack hitbox from sprite data if available
        if (spriteData.hitbox && spriteData.hitbox.attack) {
            this.attackHitbox = { 
                width: spriteData.hitbox.attack.width,
                height: spriteData.hitbox.attack.height,
                offsetX: spriteData.hitbox.attack.offset_x,
                offsetY: spriteData.hitbox.attack.offset_y,
                active: false,
                damage: 10
            };
        }
        
        // Load all animation frames for this character
        const loadPromises = [];
        
        for (const animName in this.spriteData.animations) {
            const anim = this.spriteData.animations[animName];
            
            // Initialize the images object for this animation if it doesn't exist
            if (!this.images[animName]) {
                this.images[animName] = {};
            }
            
            // For each direction in the animation
            const directions = ['down']; // Default direction
            
            for (const direction of directions) {
                // Create a promise to load the image
                for (let i = 0; i < anim.frames_per_direction; i++) {
                    const promise = new Promise((resolve, reject) => {
                        const path = `assets/sprites/${this.character}/${animName}/${direction}/frame_${i}.png`;
                        const img = new Image();
                        img.onload = () => {
                            if (!this.images[animName][direction]) {
                                this.images[animName][direction] = [];
                            }
                            this.images[animName][direction][i] = img;
                            
                            // Set sprite dimensions based on first loaded image
                            if (!this.width || !this.height) {
                                this.width = img.width;
                                this.height = img.height;
                            }
                            
                            resolve();
                        };
                        img.onerror = () => {
                            console.error(`Failed to load image: ${path}`);
                            reject(`Failed to load image: ${path}`);
                        };
                        img.src = path;
                    });
                    
                    loadPromises.push(promise);
                }
            }
        }
        
        return Promise.all(loadPromises).then(() => {
            this.isLoaded = true;
            console.log(`All sprites loaded for ${this.character}`);
            
            // Set initial animation data
            this.updateAnimationData();
        });
    }
    
    /**
     * Update the current animation data
     */
    updateAnimationData() {
        const animData = this.spriteData.animations[this.animation];
        if (!animData) {
            console.error(`No animation data found for: ${this.animation}`);
            return;
        }
        
        this.currentAnimationData = animData;
        
        // Check if this animation should loop
        const animationType = this.animation.split('_')[0]; // Get base animation type (e.g., 'slash' from 'slash_128')
        const animationTypeData = this.spriteData.animations_types?.[animationType];
        
        if (animationTypeData) {
            this.isAnimationLooping = animationTypeData.loop || false;
            this.animationSpeed = 60 / (animationTypeData.default_fps || 10);
        } else {
            // Default to looping for safety
            this.isAnimationLooping = true;
            this.animationSpeed = 6; // Default animation speed
        }
        
        // Update hitboxes based on animation
        this.updateHitboxes();
    }
    
    /**
     * Update hitboxes based on current animation
     */
    updateHitboxes() {
        // Get base animation type
        const baseAnimation = this.animation.split('_')[0];
        
        // Apply hitbox adjustments for body hitbox
        if (this.hitboxAdjustments[baseAnimation]) {
            const adj = this.hitboxAdjustments[baseAnimation];
            
            // Store original hitbox values if not already stored
            if (!this._originalHitbox) {
                this._originalHitbox = { ...this.hitbox };
            }
            
            // Apply adjustments
            this.hitbox = {
                width: this._originalHitbox.width + adj.width,
                height: this._originalHitbox.height + adj.height,
                offsetX: this._originalHitbox.offsetX + adj.offsetX,
                offsetY: this._originalHitbox.offsetY + adj.offsetY
            };
            
            // Update vulnerable hitbox based on body hitbox
            this.vulnerableHitbox = {
                width: this.hitbox.width - 4,
                height: this.hitbox.height - 8,
                offsetX: this.hitbox.offsetX + 2,
                offsetY: this.hitbox.offsetY + 4
            };
        }
        
        // Apply attack hitbox adjustments if this is an attack animation
        if (this.attackHitboxAdjustments[baseAnimation]) {
            const adj = this.attackHitboxAdjustments[baseAnimation];
            
            // Store original attack hitbox values if not already stored
            if (!this._originalAttackHitbox) {
                this._originalAttackHitbox = { ...this.attackHitbox };
            }
            
            // Apply adjustments
            this.attackHitbox = {
                width: adj.width,
                height: adj.height,
                offsetX: adj.offsetX,
                offsetY: adj.offsetY,
                active: this.attackHitbox.active,
                damage: adj.damage
            };
        } else if (this._originalAttackHitbox) {
            // Restore original attack hitbox for non-attack animations
            this.attackHitbox = { ...this._originalAttackHitbox };
        }
    }
    
    /**
     * Set the current animation
     * @param {string} animation - Animation name
     * @param {string} direction - Direction ('down', 'left', 'right', 'up')
     */
    setAnimation(animation, direction) {
        // Don't change animation if it's the same
        if (this.animation === animation && this.direction === direction) {
            return;
        }
        
        // Check if the animation exists
        if (!this.spriteData.animations[animation]) {
            console.error(`Animation not found: ${animation}`);
            return;
        }
        
        this.animation = animation;
        this.direction = direction || this.direction;
        this.frameIndex = 0;
        this.frameCount = 0;
        this.animationComplete = false;
        
        // Update animation data
        this.updateAnimationData();
    }
    
    /**
     * Update the sprite animation
     */
    update() {
        if (!this.isLoaded) return;
        
        this.frameCount++;
        
        // Update animation frame
        if (this.frameCount >= this.animationSpeed) {
            this.frameCount = 0;
            
            const animData = this.currentAnimationData;
            if (animData) {
                if (this.frameIndex < animData.frames_per_direction - 1) {
                    // Move to next frame
                    this.frameIndex++;
                    
                    // Update hitboxes for frame-specific adjustments
                    this.updateHitboxesForFrame();
                } else {
                    // Animation complete
                    if (this.isAnimationLooping) {
                        // Loop back to first frame
                        this.frameIndex = 0;
                    } else {
                        // Mark as complete but stay on last frame
                        this.animationComplete = true;
                    }
                }
            }
        }
        
        // Update facing direction based on velocity
        if (this.velocityX > 0) {
            this.facingRight = true;
        } else if (this.velocityX < 0) {
            this.facingRight = false;
        }
    }
    
    /**
     * Update hitboxes based on current animation frame
     * This allows for frame-specific hitbox adjustments
     */
    updateHitboxesForFrame() {
        // Get base animation type
        const baseAnimation = this.animation.split('_')[0];
        
        // For attack animations, adjust attack hitbox based on frame
        if (baseAnimation === 'slash' || baseAnimation === 'backslash' || baseAnimation === 'halfslash') {
            // Middle frames have active hitboxes
            if (this.frameIndex === 1) {
                // Activate attack hitbox on middle frame
                this.attackHitbox.active = true;
            } else if (this.frameIndex === 2) {
                // Deactivate attack hitbox on last frame
                this.attackHitbox.active = false;
            }
        }
    }
    
    /**
     * Check if the current animation has completed
     * @returns {boolean} - Whether the animation has completed
     */
    isAnimationFinished() {
        return this.animationComplete;
    }
    
    /**
     * Draw the sprite on the canvas
     * @param {CanvasRenderingContext2D} ctx - Canvas rendering context
     * @param {boolean} debug - Whether to draw hitboxes for debugging
     */
    draw(ctx, debug = false) {
        if (!this.isLoaded) return;
        
        const frames = this.images[this.animation]?.[this.direction];
        
        if (!frames || !frames[this.frameIndex]) {
            console.error(`No frame found for animation: ${this.animation}, direction: ${this.direction}, frame: ${this.frameIndex}`);
            return;
        }
        
        const img = frames[this.frameIndex];
        
        // Save the current context state
        ctx.save();
        
        // Handle character orientation (flipping)
        if (!this.facingRight) {
            ctx.translate(this.x + img.width * this.scale, this.y);
            ctx.scale(-1, 1);
        } else {
            ctx.translate(this.x, this.y);
        }
        
        // Draw the sprite
        ctx.drawImage(
            img,
            0, // Source X
            0, // Source Y
            img.width, // Source width
            img.height, // Source height
            0, // Destination X (already handled by translate)
            0, // Destination Y (already handled by translate)
            img.width * this.scale, // Destination width
            img.height * this.scale // Destination height
        );
        
        // Restore the context state
        ctx.restore();
    }
    
    /**
     * Check if this sprite's hitbox collides with another sprite's hitbox
     * @param {Sprite} otherSprite - The other sprite to check collision with
     * @returns {boolean} - Whether the sprites are colliding
     */
    collidesWith(otherSprite) {
        // Calculate this sprite's hitbox in world coordinates
        const thisHitbox = {
            x: this.x + this.hitbox.offsetX * this.scale,
            y: this.y + this.hitbox.offsetY * this.scale,
            width: this.hitbox.width * this.scale,
            height: this.hitbox.height * this.scale
        };
        
        // Calculate other sprite's hitbox in world coordinates
        const otherHitbox = {
            x: otherSprite.x + otherSprite.hitbox.offsetX * otherSprite.scale,
            y: otherSprite.y + otherSprite.hitbox.offsetY * otherSprite.scale,
            width: otherSprite.hitbox.width * otherSprite.scale,
            height: otherSprite.hitbox.height * otherSprite.scale
        };
        
        // Check for intersection
        return !(
            thisHitbox.x + thisHitbox.width < otherHitbox.x ||
            thisHitbox.x > otherHitbox.x + otherHitbox.width ||
            thisHitbox.y + thisHitbox.height < otherHitbox.y ||
            thisHitbox.y > otherHitbox.y + otherHitbox.height
        );
    }
    
    /**
     * Check if this sprite's attack hitbox collides with another sprite's vulnerable hitbox
     * @param {Sprite} otherSprite - The other sprite to check collision with
     * @returns {boolean} - Whether the attack is hitting the other sprite
     */
    attackHits(otherSprite) {
        if (!this.attackHitbox.active) return false;
        
        // Calculate this sprite's attack hitbox in world coordinates
        const attackHitbox = {
            x: this.x + (this.facingRight ? 
                this.attackHitbox.offsetX * this.scale : 
                -this.attackHitbox.offsetX * this.scale - this.attackHitbox.width * this.scale),
            y: this.y + this.attackHitbox.offsetY * this.scale,
            width: this.attackHitbox.width * this.scale,
            height: this.attackHitbox.height * this.scale
        };
        
        // Calculate other sprite's vulnerable hitbox in world coordinates
        const vulnerableHitbox = {
            x: otherSprite.x + otherSprite.vulnerableHitbox.offsetX * otherSprite.scale,
            y: otherSprite.y + otherSprite.vulnerableHitbox.offsetY * otherSprite.scale,
            width: otherSprite.vulnerableHitbox.width * otherSprite.scale,
            height: otherSprite.vulnerableHitbox.height * otherSprite.scale
        };
        
        // Check for intersection
        return !(
            attackHitbox.x + attackHitbox.width < vulnerableHitbox.x ||
            attackHitbox.x > vulnerableHitbox.x + vulnerableHitbox.width ||
            attackHitbox.y + attackHitbox.height < vulnerableHitbox.y ||
            attackHitbox.y > vulnerableHitbox.y + vulnerableHitbox.height
        );
    }
}