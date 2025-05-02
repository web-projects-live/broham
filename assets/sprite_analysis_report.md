
# Sprite Analysis Report

## Character Sprites

### Big Brother
- Base frame dimensions: 128x256 pixels
- Total animations: 16
- Standard animations: 15
- Custom animations: 1
- Character description: A character with a boar head wearing overalls and wielding a war axe

### Little Brother
- Base frame dimensions: 128x256 pixels
- Total animations: 18
- Standard animations: 15
- Custom animations: 3
- Character description: A teenage character with a pig head wearing formal pants and wielding a sword

## Animation Details

### Big Brother Animations:
- spellcast: 3 frames, 1 direction(s)
- thrust: 4 frames, 1 direction(s)
- walk: 4 frames, 1 direction(s)
- slash: 3 frames, 1 direction(s)
- shoot: 6 frames, 1 direction(s)
- hurt: 3 frames, 1 direction(s)
- climb: 3 frames, 1 direction(s)
- idle: 1 frames, 1 direction(s)
- jump: 2 frames, 1 direction(s)
- sit: 1 frames, 1 direction(s)
- emote: 1 frames, 1 direction(s)
- run: 4 frames, 1 direction(s)
- combat_idle: 1 frames, 1 direction(s)
- backslash: 6 frames, 1 direction(s)
- halfslash: 3 frames, 1 direction(s)
- slash_oversize: 9 frames, 3 direction(s)

### Little Brother Animations:
- spellcast: 3 frames, 1 direction(s)
- thrust: 4 frames, 1 direction(s)
- walk: 4 frames, 1 direction(s)
- slash: 3 frames, 1 direction(s)
- shoot: 6 frames, 1 direction(s)
- hurt: 3 frames, 1 direction(s)
- climb: 3 frames, 1 direction(s)
- idle: 1 frames, 1 direction(s)
- jump: 2 frames, 1 direction(s)
- sit: 1 frames, 1 direction(s)
- emote: 1 frames, 1 direction(s)
- run: 4 frames, 1 direction(s)
- combat_idle: 1 frames, 1 direction(s)
- backslash: 6 frames, 1 direction(s)
- halfslash: 3 frames, 1 direction(s)
- slash_128: 6 frames, 2 direction(s)
- backslash_128: 13 frames, 2 direction(s)
- halfslash_128: 6 frames, 2 direction(s)

## Sprite Sheet Structure
- Each animation is stored in a separate sprite sheet
- Each frame is 128x256 pixels (except for hurt and climb which are 128x64)
- Frames are arranged horizontally for each direction
- Multiple directions (when present) are arranged vertically

## Hitbox Information
- Default hitbox: 64x128 pixels, offset (32, 96)
- Attack hitbox: 96x64 pixels, offset (64, 96)

## Notes
- The sprites follow the LPC (Liberated Pixel Cup) format
- Both characters have similar animation sets with some custom variations
- The sprites are designed for a top-down perspective game
- Character orientation changes based on the direction of movement
