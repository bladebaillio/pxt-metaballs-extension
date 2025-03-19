//% color="#000000" icon="\uf111"
namespace metaballs {
    let field: Image = null
    let metaballSprite: Sprite = null
    let metaballObjects: MetaballObject[] = []
    let metaballSprites: Sprite[] = []
    let metaballTiles: TileMetaball[] = []

    // Cache screen dimensions
    const SCREEN_WIDTH = scene.screenWidth()
    const SCREEN_HEIGHT = scene.screenHeight()

    // Optimization settings
    const PIXEL_SKIP = 2 // Increase this to reduce resolution but improve performance
    const INFLUENCE_THRESHOLD = 0.1 // Minimum influence to consider
    const MAX_DISTANCE = 200 // Maximum distance to calculate influence

    // Detect tile size
    function getTileSize(): number {
        const tm = game.currentScene().tileMap
        return tm ? tm.tileWidth : 16 // Default to 16 if no tilemap
    }

    class MetaballObject {
        constructor(
            public x: number,
            public y: number,
            public strength: number,
            public color: number
        ) { }

        update(newX: number, newY: number) {
            this.x = newX
            this.y = newY
        }
    }

    class TileMetaball {
        public worldX: number
        public worldY: number

        constructor(
            public tileX: number,
            public tileY: number,
            public strength: number,
            public color: number,
            tileSize?: number
        ) {
            // Get the tile size, defaulting to detected size
            const size = tileSize || getTileSize()
            
            // Calculate world coordinates based on actual tile size
            this.worldX = tileX * size + (size / 2)
            this.worldY = tileY * size + (size / 2)
        }
    }

    //% blockId=initialize_metaballs
    //% block="initialize metaball field"
    export function initializeMetaballs() {
        if (!field) {
            field = image.create(SCREEN_WIDTH, SCREEN_HEIGHT)
            metaballSprite = sprites.create(field, SpriteKind.Player)
            game.onUpdate(updateMetaballs)
        }
    }

    //% blockId=make_sprite_metaball
    //% block="make $sprite a metaball with strength $strength and color $color"
    //% sprite.shadow="variables_get" sprite.defl="mySprite"
    //% strength.defl=100 strength.min=1 strength.max=1000
    //% color.shadow="colorindexpicker" color.defl=2
    export function makeMetaball(sprite: Sprite, strength: number = 100, color: number = 2) {
        metaballObjects.push(new MetaballObject(sprite.x, sprite.y, strength, color))
        metaballSprites.push(sprite)
    }

    //% blockId=make_tile_metaball
    //% block="make tile at col $col row $row a metaball with strength $strength and color $color"
    //% col.defl=0 row.defl=0
    //% strength.defl=100 strength.min=1 strength.max=1000
    //% color.shadow="colorindexpicker" color.defl=2
    export function makeTileMetaball(col: number, row: number, strength: number = 100, color: number = 2) {
        metaballTiles.push(new TileMetaball(col, row, strength, color))
    }

    //% blockId=make_tilemap_wall_metaballs
    //% block="make all wall tiles metaballs with strength $strength and color $color"
    //% strength.defl=100 strength.min=1 strength.max=1000
    //% color.shadow="colorindexpicker" color.defl=2
    export function makeWallTilesMetaballs(strength: number = 100, color: number = 2) {
        const currentTilemap = game.currentScene().tileMap
        if (!currentTilemap) return

        const tileSize = getTileSize()
        const cols = Math.ceil(SCREEN_WIDTH / tileSize)
        const rows = Math.ceil(SCREEN_HEIGHT / tileSize)

        for (let col = 0; col < cols; col++) {
            for (let row = 0; row < rows; row++) {
                if (tiles.tileAtLocationIsWall(tiles.getTileLocation(col, row))) {
                    makeTileMetaball(col, row, strength, color)
                }
            }
        }
    }

    //% blockId=remove_sprite_metaball
    //% block="remove metaball from $sprite"
    //% sprite.shadow="variables_get" sprite.defl="mySprite"
    export function removeMetaball(sprite: Sprite) {
        const index = metaballSprites.indexOf(sprite)
        if (index >= 0) {
            metaballSprites.removeAt(index)
            metaballObjects.removeAt(index)
        }
    }

    //% blockId=remove_all_wall_metaballs 
    //% block="remove all wall tile metaballs"
    export function removeAllWallMetaballs() {
        metaballTiles = []
    }

    function updateMetaballs() {
        if (!field) return

        // Update sprite-based metaballs positions
        for (let i = 0; i < metaballObjects.length; i++) {
            if (metaballSprites[i]) {
                metaballObjects[i].update(metaballSprites[i].x, metaballSprites[i].y)
            }
        }

        // Render metaballs with optimizations
        for (let x = 0; x < SCREEN_WIDTH; x += PIXEL_SKIP) {
            for (let y = 0; y < SCREEN_HEIGHT; y += PIXEL_SKIP) {
                let totalValue = 0
                let colorSum = 0

                // Process sprite-based metaballs
                for (const ball of metaballObjects) {
                    const dx = x - ball.x
                    const dy = y - ball.y
                    const distSq = dx * dx + dy * dy

                    if (distSq < MAX_DISTANCE * MAX_DISTANCE) {
                        const influence = ball.strength / distSq
                        if (influence > INFLUENCE_THRESHOLD) {
                            totalValue += influence
                            colorSum += ball.color * influence
                        }
                    }
                }

                // Process tile-based metaballs
                for (const tile of metaballTiles) {
                    const dx = x - tile.worldX
                    const dy = y - tile.worldY
                    const distSq = dx * dx + dy * dy

                    if (distSq < MAX_DISTANCE * MAX_DISTANCE) {
                        const influence = tile.strength / distSq
                        if (influence > INFLUENCE_THRESHOLD) {
                            totalValue += influence
                            colorSum += tile.color * influence
                        }
                    }
                }

                // Set pixel color
                const finalColor = totalValue > 1 ? Math.floor(colorSum / totalValue) : 0

                // Fill the skipped pixels
                for (let fx = 0; fx < PIXEL_SKIP && x + fx < SCREEN_WIDTH; fx++) {
                    for (let fy = 0; fy < PIXEL_SKIP && y + fy < SCREEN_HEIGHT; fy++) {
                        field.setPixel(x + fx, y + fy, finalColor)
                    }
                }
            }
        }
    }
}

