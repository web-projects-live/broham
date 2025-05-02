/**
 * Collision detection utilities for the fighting game
 */
class CollisionDetector {
    /**
     * Check if two rectangles are colliding
     * @param {Object} rect1 - First rectangle {x, y, width, height}
     * @param {Object} rect2 - Second rectangle {x, y, width, height}
     * @returns {boolean} - Whether the rectangles are colliding
     */
    static rectanglesCollide(rect1, rect2) {
        return !(
            rect1.x + rect1.width < rect2.x ||
            rect1.x > rect2.x + rect2.width ||
            rect1.y + rect1.height < rect2.y ||
            rect1.y > rect2.y + rect2.height
        );
    }
    
    /**
     * Get the hitbox for a sprite in world coordinates
     * @param {Sprite} sprite - The sprite
     * @param {string} hitboxType - Type of hitbox ('body', 'attack', 'vulnerable')
     * @returns {Object} - Hitbox rectangle {x, y, width, height}
     */
    static getHitbox(sprite, hitboxType = 'body') {
        switch (hitboxType) {
            case 'attack':
                return this.getAttackHitbox(sprite);
            case 'vulnerable':
                return this.getVulnerableHitbox(sprite);
            case 'body':
            default:
                return {
                    x: sprite.x + sprite.hitbox.offsetX * sprite.scale,
                    y: sprite.y + sprite.hitbox.offsetY * sprite.scale,
                    width: sprite.hitbox.width * sprite.scale,
                    height: sprite.hitbox.height * sprite.scale
                };
        }
    }
    
    /**
     * Get the attack hitbox for a sprite in world coordinates
     * @param {Sprite} sprite - The sprite
     * @returns {Object} - Attack hitbox rectangle {x, y, width, height, active}
     */
    static getAttackHitbox(sprite) {
        // Adjust the x position based on the sprite's facing direction
        const offsetX = sprite.facingRight ? 
            sprite.attackHitbox.offsetX : 
            -sprite.attackHitbox.offsetX - sprite.attackHitbox.width;
            
        return {
            x: sprite.x + offsetX * sprite.scale,
            y: sprite.y + sprite.attackHitbox.offsetY * sprite.scale,
            width: sprite.attackHitbox.width * sprite.scale,
            height: sprite.attackHitbox.height * sprite.scale,
            active: sprite.attackHitbox.active,
            damage: sprite.attackHitbox.damage || 10
        };
    }
    
    /**
     * Get the vulnerable hitbox for a sprite in world coordinates
     * This is the area where a character can be hit
     * @param {Sprite} sprite - The sprite
     * @returns {Object} - Vulnerable hitbox rectangle {x, y, width, height}
     */
    static getVulnerableHitbox(sprite) {
        // For now, the vulnerable hitbox is the same as the body hitbox
        // but slightly smaller to make combat more precise
        const bodyHitbox = this.getHitbox(sprite, 'body');
        const padding = 10 * sprite.scale;
        
        return {
            x: bodyHitbox.x + padding,
            y: bodyHitbox.y + padding,
            width: bodyHitbox.width - (padding * 2),
            height: bodyHitbox.height - (padding * 2)
        };
    }
    
    /**
     * Check if a sprite's attack hitbox is hitting another sprite's vulnerable area
     * @param {Sprite} attacker - The attacking sprite
     * @param {Sprite} target - The target sprite
     * @returns {Object|null} - Hit information or null if no hit
     */
    static attackHits(attacker, target) {
        if (!attacker.attackHitbox.active) return null;
        
        const attackHitbox = this.getAttackHitbox(attacker);
        const vulnerableHitbox = this.getVulnerableHitbox(target);
        
        if (this.rectanglesCollide(attackHitbox, vulnerableHitbox)) {
            // Calculate hit position (center of overlap)
            const overlapX = Math.min(
                attackHitbox.x + attackHitbox.width,
                vulnerableHitbox.x + vulnerableHitbox.width
            ) - Math.max(attackHitbox.x, vulnerableHitbox.x);
            
            const overlapY = Math.min(
                attackHitbox.y + attackHitbox.height,
                vulnerableHitbox.y + vulnerableHitbox.height
            ) - Math.max(attackHitbox.y, vulnerableHitbox.y);
            
            const hitX = Math.max(attackHitbox.x, vulnerableHitbox.x) + (overlapX / 2);
            const hitY = Math.max(attackHitbox.y, vulnerableHitbox.y) + (overlapY / 2);
            
            return {
                hit: true,
                hitPosition: { x: hitX, y: hitY },
                damage: attackHitbox.damage,
                attackType: attacker.animation
            };
        }
        
        return null;
    }
    
    /**
     * Check if two sprites are colliding
     * @param {Sprite} sprite1 - First sprite
     * @param {Sprite} sprite2 - Second sprite
     * @returns {boolean} - Whether the sprites are colliding
     */
    static spritesCollide(sprite1, sprite2) {
        const hitbox1 = this.getHitbox(sprite1, 'body');
        const hitbox2 = this.getHitbox(sprite2, 'body');
        
        return this.rectanglesCollide(hitbox1, hitbox2);
    }
    
    /**
     * Calculate the collision response (push direction and amount)
     * @param {Sprite} sprite1 - First sprite
     * @param {Sprite} sprite2 - Second sprite
     * @returns {Object} - Collision response {dx1, dy1, dx2, dy2}
     */
    static calculateCollisionResponse(sprite1, sprite2) {
        const hitbox1 = this.getHitbox(sprite1, 'body');
        const hitbox2 = this.getHitbox(sprite2, 'body');
        
        // Calculate overlap on each axis
        const overlapX = Math.min(
            hitbox1.x + hitbox1.width - hitbox2.x,
            hitbox2.x + hitbox2.width - hitbox1.x
        );
        
        const overlapY = Math.min(
            hitbox1.y + hitbox1.height - hitbox2.y,
            hitbox2.y + hitbox2.height - hitbox1.y
        );
        
        // Determine which axis has the smallest overlap
        let dx1 = 0, dy1 = 0, dx2 = 0, dy2 = 0;
        
        if (overlapX < overlapY) {
            // Resolve horizontally
            if (hitbox1.x < hitbox2.x) {
                dx1 = -overlapX / 2;
                dx2 = overlapX / 2;
            } else {
                dx1 = overlapX / 2;
                dx2 = -overlapX / 2;
            }
        } else {
            // Resolve vertically
            if (hitbox1.y < hitbox2.y) {
                dy1 = -overlapY / 2;
                dy2 = overlapY / 2;
            } else {
                dy1 = overlapY / 2;
                dy2 = -overlapY / 2;
            }
        }
        
        return { dx1, dy1, dx2, dy2 };
    }
    
    /**
     * Calculate the knockback direction and force when a sprite is hit
     * @param {Sprite} attacker - The attacking sprite
     * @param {Sprite} target - The target sprite
     * @param {string} attackType - Type of attack (slash, thrust, etc.)
     * @param {number} damage - Amount of damage dealt
     * @returns {Object} - Knockback vector {x, y}
     */
    static calculateKnockback(attacker, target, attackType, damage) {
        // Base knockback force depends on damage
        const baseForce = Math.min(damage * 0.8, 15);
        
        // Determine horizontal direction based on attacker's facing
        const directionX = attacker.facingRight ? 1 : -1;
        
        // Different attack types have different knockback characteristics
        let knockbackX = directionX * baseForce;
        let knockbackY = -baseForce / 3; // Slight upward force by default
        
        switch (attackType) {
            case 'slash':
            case 'slash_128':
            case 'slash_oversize':
                // Standard knockback
                break;
                
            case 'backslash':
            case 'backslash_128':
                // Stronger horizontal knockback
                knockbackX *= 1.3;
                knockbackY *= 0.7;
                break;
                
            case 'halfslash':
            case 'halfslash_128':
                // More upward knockback
                knockbackX *= 0.7;
                knockbackY *= 1.5;
                break;
                
            case 'thrust':
                // Strong horizontal knockback, less vertical
                knockbackX *= 1.5;
                knockbackY *= 0.5;
                break;
        }
        
        return {
            x: knockbackX,
            y: knockbackY
        };
    }
    
    /**
     * Create a hit effect at the specified position
     * @param {CanvasRenderingContext2D} ctx - Canvas rendering context
     * @param {Object} position - Position {x, y}
     * @param {string} type - Type of hit effect
     */
    static createHitEffect(ctx, position, type = 'normal') {
        // Save context state
        ctx.save();
        
        // Draw hit effect based on type
        switch (type) {
            case 'critical':
                // Draw a star-like shape for critical hits
                ctx.fillStyle = 'rgba(255, 255, 0, 0.7)';
                ctx.strokeStyle = 'rgba(255, 200, 0, 0.9)';
                ctx.lineWidth = 2;
                
                ctx.beginPath();
                for (let i = 0; i < 8; i++) {
                    const radius = i % 2 === 0 ? 20 : 10;
                    const angle = (i / 8) * Math.PI * 2;
                    const x = position.x + Math.cos(angle) * radius;
                    const y = position.y + Math.sin(angle) * radius;
                    
                    if (i === 0) {
                        ctx.moveTo(x, y);
                    } else {
                        ctx.lineTo(x, y);
                    }
                }
                ctx.closePath();
                ctx.fill();
                ctx.stroke();
                break;
                
            case 'normal':
            default:
                // Draw a simple circle for normal hits
                ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
                ctx.strokeStyle = 'rgba(255, 0, 0, 0.9)';
                ctx.lineWidth = 2;
                
                ctx.beginPath();
                ctx.arc(position.x, position.y, 15, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();
                
                // Add some impact lines
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
                for (let i = 0; i < 4; i++) {
                    const angle = (i / 4) * Math.PI * 2;
                    const startX = position.x + Math.cos(angle) * 10;
                    const startY = position.y + Math.sin(angle) * 10;
                    const endX = position.x + Math.cos(angle) * 25;
                    const endY = position.y + Math.sin(angle) * 25;
                    
                    ctx.beginPath();
                    ctx.moveTo(startX, startY);
                    ctx.lineTo(endX, endY);
                    ctx.stroke();
                }
                break;
        }
        
        // Restore context state
        ctx.restore();
    }
    
    /**
     * Draw hitboxes for debugging
     * @param {CanvasRenderingContext2D} ctx - Canvas rendering context
     * @param {Sprite} sprite - The sprite to draw hitboxes for
     * @param {boolean} showVulnerable - Whether to show vulnerable hitboxes
     */
    static drawHitboxes(ctx, sprite, showVulnerable = true) {
        // Save context state
        ctx.save();
        
        // Draw character hitbox
        const hitbox = this.getHitbox(sprite, 'body');
        ctx.strokeStyle = 'rgba(0, 255, 0, 0.5)';
        ctx.lineWidth = 2;
        ctx.strokeRect(hitbox.x, hitbox.y, hitbox.width, hitbox.height);
        
        // Draw vulnerable hitbox if enabled
        if (showVulnerable) {
            const vulnerableHitbox = this.getVulnerableHitbox(sprite);
            ctx.strokeStyle = 'rgba(0, 0, 255, 0.5)';
            ctx.strokeRect(
                vulnerableHitbox.x,
                vulnerableHitbox.y,
                vulnerableHitbox.width,
                vulnerableHitbox.height
            );
        }
        
        // Draw attack hitbox if active
        if (sprite.attackHitbox.active) {
            const attackHitbox = this.getAttackHitbox(sprite);
            ctx.strokeStyle = 'rgba(255, 0, 0, 0.5)';
            ctx.strokeRect(
                attackHitbox.x,
                attackHitbox.y,
                attackHitbox.width,
                attackHitbox.height
            );
            
            // Fill attack hitbox with semi-transparent color
            ctx.fillStyle = 'rgba(255, 0, 0, 0.2)';
            ctx.fillRect(
                attackHitbox.x,
                attackHitbox.y,
                attackHitbox.width,
                attackHitbox.height
            );
        }
        
        // Restore context state
        ctx.restore();
    }
}