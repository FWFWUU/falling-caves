const canvas = document.querySelector("canvas")
const gfx = canvas.getContext("2d")

var prefs = {
	showChunksLimit: 1
}

class Point {
	constructor(x = 0, y = 0) {
		this.x = x
		this.y = y
	}
}


Math.lerp = function(x, y, s) {
	return x + s * (y - x)
}

Math.clamp = function(v, mn, mx) {
	if (v < mn)
		return mn

	else if (v > mx)
		return mx

	return v
}

class InputEventEstate {
	static keyboard = {
		keyNames: {},
		keyPressed: false,
		keyReleased: false
	}

	static cursor = {
		buttonIndices: {},
		buttonPressed: false,
		buttonReleased: false,
		x: 0,
		y: 0
	}

	static touches = {
		count: 0,
		point: new Point(0, 0),
		pressed: false
	}

	static ACTION_DELAY = 10

	static GetAction(key_Name) {
		if (key_Name in InputEventEstate.keyboard.keyNames)
			return InputEventEstate.keyboard.keyNames[key_Name]

		return false
	}

	static GetActionPressed(key_Name) {
		if (InputEventEstate.keyboard.keyPressed == true)
			return InputEventEstate.GetAction(key_Name)

		return false
	}

	static GetActionRelease(key_Name) {
		if (InputEventEstate.keyboard.keyReleased == true)
			return InputEventEstate.GetAction(key_Name)

		return false
	}

	static GetMouseOffset(relative_x = 0, relative_y = 0) {
		return new Point(InputEventEstate.cursor.x + relative_x, InputEventEstate.cursor.y + relative_y)
	}

	static GetMouseButton(button_Index) {
		if (button_Index in InputEventEstate.cursor.buttonIndices)
			return InputEventEstate.cursor.buttonIndices[button_Index]

		return false
	}

	static GetMouseButtonPressed(button_Index) {
		if (InputEventEstate.cursor.buttonPressed == true)
			return InputEventEstate.GetMouseButton(button_Index)

		return false
	}

	static GetMouseButtonRelease(button_Index) {
		if (InputEventEstate.cursor.buttonReleased == true)
			return InputEventEstate.GetMouseButton(button_Index)

		return false
	}

	static GetTouches() {
		return InputEventEstate.touches.count
	}

	static GetTouchAt() {
		return InputEventEstate.touches.point
	}

	static GetTouchPressed() {
		return InputEventEstate.touches.pressed
	}
}


class Resource_Loader {
	static images = new Array

	constructor() {

	}

	static Add(resource_paths, on_load = null) {

		var loaded = 0

		const load = () => {
			loaded++

			if (loaded == resource_paths.length) {
				on_load()
			}
		}

		for (let index = 0; index < resource_paths.length; index++) {
			var name = resource_paths[index]

			if (name.endsWith(".ttf")) {
				var font = new FontFace(name.split(":")[0], `url(${name.split(":")[1]})`)
				
				font.load().then((font) => {
					document.fonts.add(font)

					load()
				})
			}

			else if (name.endsWith(".png") || name.endsWith(".jpeg")) {
				
				var image_Index = Resource_Loader.images.length

				var image = new Image()
				image.addEventListener("load", () => {
					gfx.drawImage(image, 0, 0)

					var data = gfx.getImageData(0, 0, image.width, image.height)

					Resource_Loader.images[index].data = data

					load()
				})
				image.src = name

				Resource_Loader.images.push({
					image: image,
					data: new ImageData(32, 32)
				})
			}
		}

	}
}


class Noise {
	w = 0
	h = 0
	cells = new Array()
	spawn = null

	static Type_Air = 0
	static Type_Solid = 1

	constructor(w, h) {
		this.w = w
		this.h = h

		this.cells.length = this.w * this.h
		this.cells.fill(Noise.Type_Solid)
	}

	deg2rad(degrees){
		var pi = Math.PI

		return degrees * (pi/180)
	}

	countNeighbors(x, y) {
		var count = 0

		for (let w = -1; w < 2; w++) {
			for (let s = -1; s < 2; s++) {
				if (w == 0 && s == 0)
					continue

				if (x + w < 0 || y + s < 0 || x + w >= this.w || y + s >= this.h)
					count++

				var n = this.cells[(x + w) + (y + s) * this.w]

				if (n == Noise.Type_Solid)
					count++
			}
		}

		return count
	}

	defineSpawnPoint() {

		var point = {
			x: Math.floor(Math.random() * this.w),
			y: Math.floor(Math.random() * this.h)
		}

		if (point.x < 0)
			point.x += 8

		if (point.y < 0)
			point.y += 16

		if (point.x >= this.w)
			point.x -= 8

		if (point.y >= this.h)
			point.y -= 16

		return point
	}

	generate() {
		var to = {
			x: 0,
			y: 0
		}

		for (let x = 0; x < this.w; x++) {
			for (let y = 0; y < this.h; y++) {
				//to.x *= Math.cos(to.x) * 180 / Math.PI

				var period = 0

				var eye = {
					x: 0,
					y: 0
				}

				while (period < 12) {
					
					eye.x += Math.cos(this.deg2rad(Math.random() * 360))
					eye.y += Math.cos(this.deg2rad(Math.random() * 180))

					eye.x += Math.pow(9, -2)

					period ++
				}

				if (to.x + eye.x < 0)
					eye.x = -eye.x

				if (to.y + eye.y < 0)
					eye.y = -eye.y

				to.x += eye.x / 3 + 0
				to.y += eye.y / 3 + 0

				if (to.x < 0 || to.y < 0 || to.x >= this.w || to.y >= this.h)
					this.cells[Math.floor(to.x) + Math.floor(to.y) * this.w] = Noise.Type_Solid

					
				for (let i = -1; i < 2; i++) {
					for (let j = -1; j < 2; j++) {

						var cellX = Math.floor(to.x + i)
						var cellY = Math.floor(to.y + j)

						this.cells[cellX + cellY * this.w] = Noise.Type_Air
					}
				}
			}
		}

		var random_spawn_pixel = this.defineSpawnPoint()

		for (let x = 0; x < this.w; x++) {
			for (let y = 0; y < this.h; y++) {
				if (this.cells[x + y * this.w] == 1 && this.countNeighbors(x, y) < 4) {
					this.cells[x + y * this.w] = Noise.Type_Air
				}

				if (x < 4 || y < 4 || x > (this.w - 4) || y > (this.h - 4))
					this.cells[x + y * this.w] = Noise.Type_Solid

				if (this.spawn == null) {

					if (x == random_spawn_pixel.x && y == random_spawn_pixel.y) {

						for (let sx = -8; sx < 8; sx++) {
							for (let sy = -16; sy < 16; sy++) {
								this.cells[(x + sx) + (y + sy) * this.w ] = Noise.Type_Air
							}
						}

						this.spawn = {x: x * Level.pixelSize, y: y * Level.pixelSize}
					}
				}
			}
		}
	}

	draw() {
		for (let x = 0; x < this.w; x++) {
			for (let y = 0; y < this.h; y++) {
				gfx.fillStyle = "white"

				if (this.cells[x + y * this.w] == Noise.Type_Solid) {
					gfx.fillStyle = "black"
				}

				gfx.fillRect(x, y, 1, 1)
			}
		}
	}
}

class Color {
	constructor(r, g, b, a = 1) {
		this.r = r
		this.g = g
		this.b = b
		this.a = a
	}

	sub(r, g, b, a) {
		this.r = Math.clamp(this.r - r, 0, 255)
		this.g = Math.clamp(this.g - g, 0, 255)
		this.b = Math.clamp(this.b - b, 0, 255)
		this.a = Math.clamp(this.a - a, 0, 1)

		return this //new Color(this.r, this.g, this.b, this.a)
	}

	getString() {
		return `rgba(${this.r}, ${this.g}, ${this.b}, ${this.a})`
	}
}


class Particle {
	static Type_Air = Noise.Type_Air
	static Type_Dirt = 1
	static Type_Grass = 2
	static Type_Sand = 3
	static Type_Stone = 4
	static Type_Water = 5

	static getColor(type) {
		switch (type) {
			case Particle.Type_Water:
				return new Color(100, 100, 200)
				break;

			case Particle.Type_Stone:
				return new Color(100, 100, 100)
				break;

			case Particle.Type_Grass:
				return new Color(125, 150, 25)
				break;

			case Particle.Type_Sand:
				return new Color(242, 255, 198)
				break;

			case Particle.Type_Dirt:
				return new Color(125, 50, 25)
				break;
		}

		return new Color(0, 0, 0, 0)
	}

	static mayPass(type) {
		
		if (type == Particle.Type_Air || type == Particle.Type_Water)
			return true

		return false
	}
}

class Chunk {
	x0 = 0
	y0 = 0
	x1 = 0
	y1 = 0
	level = null

	constructor(x0, y0, x1, y1) {
		this.x0 = x0
		this.y0 = y0 //não sei se é relevante
		this.x1 = x1
		this.y1 = y1
	}

	render() {

		//gfx.strokeStyle  = "white"
		//gfx.strokeRect(this.x1 * Level.pixelSize - this.level.scrollX, 0 - this.level.scrollY, Level.chunkSize * Level.pixelSize, this.level.h * Level.pixelSize)

		var xp = Math.floor((this.level.player.x) / Level.pixelSize)
		var yp = Math.floor((this.level.player.y) / Level.pixelSize)

		for (let xradius = -this.level.light_Radius; xradius < this.level.light_Radius + 1; xradius++) {

			for (let yradius = -this.level.light_Radius; yradius < this.level.light_Radius + 1; yradius++) {

				var pixel = this.level.getPixel((xp + xradius),
					yp + yradius)

				var d = Math.floor(Math.abs(xradius) * Math.abs(yradius) + Math.abs(xradius) * Math.abs(yradius))

				if (pixel == Particle.Type_Air)
					continue

				gfx.fillStyle = Particle.getColor(pixel).sub(d, d, d, 0).getString()
				
				var pixel_At = new Point( ((xp + xradius) * Level.pixelSize) - this.level.scrollX,
					((yp + yradius) * Level.pixelSize) - this.level.scrollY )

				gfx.fillRect(pixel_At.x, pixel_At.y, Level.pixelSize, Level.pixelSize)


			}
		}
		
	}

	startSimulation(ticks) {
		var that = this
		var delay = 100

		for (let x = 0; x < Level.chunkSize; x++) {
			for (let y = 0; y < this.level.h; y++) {
				if (this.level.getPixel(x + this.x1, y) == Particle.Type_Water) {
					if (this.level.getPixel(x + this.x1, y + 1) == Particle.Type_Air) {
						
						setTimeout(function() {
							that.level.pixels[(x + that.x1) + (y) * that.level.noise.w] = Particle.Type_Air
							that.level.pixels[(x + that.x1) + (y + 1) * that.level.noise.w] = Particle.Type_Water
						}, delay)
					}

					else if (this.level.getPixel(x + this.x1, y + 1) == Particle.Type_Water) {

						if (this.level.getPixel((x + 1) + this.x1, y + 1) == Particle.Type_Air)
							setTimeout(function() {
								that.level.pixels[(x + that.x1) + (y) * that.level.noise.w] = Particle.Type_Air
								that.level.pixels[((x + 1) + that.x1) + (y + 1) * that.level.noise.w] = Particle.Type_Water
							}, delay)

						else if (this.level.getPixel((x - 1) + this.x1, y + 1) == Particle.Type_Air)
							setTimeout(function() {
								that.level.pixels[(x + that.x1) + (y) * that.level.noise.w] = Particle.Type_Air
								that.level.pixels[((x - 1) + that.x1) + (y + 1) * that.level.noise.w] = Particle.Type_Water
							}, delay)

						else if (this.level.getPixel((x + 1) + this.x1, y) == Particle.Type_Air)
							setTimeout(function() {
								that.level.pixels[(x + that.x1) + y * that.level.noise.w] = Particle.Type_Air
								that.level.pixels[((x + 1) + that.x1) + y * that.level.noise.w] = Particle.Type_Water
							}, delay)

						else if (this.level.getPixel((x - 1) + this.x1, y) == Particle.Type_Air)
							setTimeout(function() {
								that.level.pixels[(x + that.x1) + y * that.level.noise.w] = Particle.Type_Air
								that.level.pixels[((x - 1) + that.x1) + y * that.level.noise.w] = Particle.Type_Water
							}, delay)
					}
				}
			}
		}
	}

	update(ticks) {
		this.startSimulation(ticks)
	}
}

class Level {
	w = 0
	h = 0
	pixels = new Array()
	static chunkSize = 12
	noise = null
	scrollX = 0
	scrollY = 0
	static pixelSize = 8
	entities = new Array
	player = null
	chunks = new Array

	constructor(w, h) {
		this.w = w
		this.h = h

		this.noise = new Noise(this.w * Level.chunkSize, this.h)
		this.pixels.length = this.noise.cells.length

		this.player = new Player()
		this.player.level = this

		this.addEntity(this.player)

		this.chunks.length = this.noise.w

		this.light_Radius = 21

		for (let x = 0; x < this.chunks.length; x++) {
			var chunk = new Chunk(x, 0, x * Level.chunkSize, this.h)
			chunk.level = this

			this.chunks[x] = chunk
		}
	}

	addEntity(e) {
		this.entities.push(e)
	}

	generate() {
		
		/*
		for (let x = 0; x < this.w * this.chunkSize; x++) {
			let height = (((Math.abs(Math.sin(x * 0.05) * (x / 48) % (this.h) - 10)) - 0.2) / 0.4) % this.h

			for (let y = 0; y < this.h; y++) {
				this.pixels[x + y * (this.w * this.chunkSize)] = 0

				if (y >= height) {
					this.pixels[x + y * (this.w * this.chunkSize)] = 1
				}
			}
		}
		*/

		this.noise.generate()

		this.pixels = this.noise.cells

		for (let x = 0; x < this.noise.w; x++) {
			for (let y = 0; y < this.noise.h; y++) {

				if (this.pixels[x + y * this.noise.w] == Noise.Type_Air)
					this.pixels[x + y * this.noise.w] = Particle.Type_Air

				if (this.pixels[x + y * this.noise.w] == Noise.Type_Solid) {
					this.pixels[x + y * this.noise.w] = Particle.Type_Dirt

					if (this.pixels[x + (y - 1) * this.noise.w] == Noise.Type_Air)
						this.pixels[x + (y - 1) * this.noise.w] = Particle.Type_Grass

					if (Math.random() * 86 > 12) {
						if (this.pixels[x + (y - 2) * this.noise.w] == Noise.Type_Air)
							this.pixels[x + (y - 2) * this.noise.w] = Particle.Type_Water
					}	

					if (Math.random() * 100 < 50) {
						this.pixels[x + y * this.noise.w] = Particle.Type_Stone
					}
				}
			}
		}

		if (this.noise.spawn) {
			this.player.setPosition(this.noise.spawn.x, this.noise.spawn.y)
		}
	}

	getPixel(x, y) {
		if (x < 0 || y < 0 || x >= this.noise.w || y >= this.h)
			return Particle.Type_Air

		return this.pixels[x + y * this.noise.w]
	}

	getChunk(x) {
		if (x < 0 || x >= this.noise.w)
			return

		return this.chunks[x]
	}

	render() {

		this.entities.forEach((e) => {

			var xc = Math.floor(e.x / (Level.chunkSize * Level.pixelSize))

			if (Player.prototype.isPrototypeOf(e)) {
				for (let dist = -prefs.showChunksLimit; dist < prefs.showChunksLimit + 1; dist++) {

					var nearChunk = this.getChunk(xc + dist)

					if (nearChunk)
						nearChunk.render()
				}
			}

			e.render()
		})

		Projectile.projectiles.forEach((p) => {
			p.render()
		})
	}

	update(ticks) {
		
		this.entities.forEach((e) => {
			
			if (Player.prototype.isPrototypeOf(e)) {
				this.scrollX = Math.floor(e.x - canvas.width / 2)
				this.scrollY = Math.floor(e.y - canvas.height / 2)

				var xc = Math.floor(e.x / (Level.chunkSize * Level.pixelSize))

				for (let dist = -prefs.showChunksLimit; dist < prefs.showChunksLimit + 1; dist++) {
					
					var near_Chunk = this.getChunk(xc + dist)

					if (near_Chunk) {
						near_Chunk.update(ticks)
					}
				}
			}

			e.update(ticks)
		})

		Projectile.projectiles.forEach((p) => {
			p.update(ticks)
		})

	}
}

class Rect {
	x = 0
	y = 0
	w = 0
	h = 0
	
	constructor(x, y, w, h) {
		this.x = x
		this.y = y
		this.w = w
		this.h = h
	}

	collides(rect) {
		return (this.x + this.w >= rect.x && rect.x + rect.w >= this.x) && (this.y + this.h >= rect.y && rect.y + rect.h >= this.y)
	}
}

class AABB extends Rect {
	position = {x: 0, y: 0}
	size = {x: 0, y: 0}

	constructor(position, size) {
		super(position.x, position.y, size.x, size.y)

		this.position = position
		this.size = size
	}
}

class Sprite {
	constructor() {
		this.x = 0
		this.y = 0
		this.scaleX = 1
		this.scaleY = 1
		this.region = new Rect(0, 0, 0, 0)
		this.rotation_degrees = 0.0
		this.image = null
		this.offsetX = 0
		this.offsetY = 0
		this.flipH = false
		this.flipV = false
	}

	render() {

		var flip_X = 1
		var flip_Y = 1

		if (this.flipH)
			flip_X = -1

		if (this.flipV)
			flip_Y = -1

		gfx.save()

		gfx.setTransform(this.scaleX, 0, 0, this.scaleY, this.x, this.y)

		gfx.rotate((this.rotation_degrees % 360) * Math.PI / 180)

		gfx.scale(flip_X, flip_Y)

		if (this.image)
			gfx.drawImage(this.image, this.region.x, this.region.y, this.region.w, this.region.h, -(this.region.w * this.scaleX) / 2 - this.offsetX, -(this.region.h * this.scaleY) / 2 - this.offsetY, this.region.w * this.scaleX, this.region.h * this.scaleY)

		gfx.restore()
	}

	lookAt(point) {
		var dist = {x: this.x - point.x, y: this.y - point.y}
		var angle = Math.atan2(-dist.y, -dist.x)

		this.rotation_degrees = (180 * angle / Math.PI)
	}
}

class Text {
	static default_Font = "NanumPenScript"

	static render(text, x, y, size = 12, color = "rgb(255, 255, 255)") {
		gfx.font = `${size}px ${Text.default_Font}`
		gfx.fillStyle = color

		gfx.fillText(text, x, y)
	}
}

class Projectile {
	static projectiles = new Array()

	constructor(x, y, direction) {
		this.x = x
		this.y = y
		this.vel = {
			x: 0,
			y: 0
		}
		this.accel = 0.008
		this.sprite = new Sprite()
		this.sprite.x = this.x
		this.sprite.y = this.y
		this.level = null
		this.direction = direction
		this.angle = Math.atan2(-(this.y - this.direction.y), -(this.x - this.direction.x))
		this.life_Time = 2

		Projectile.projectiles.push(this)

		var that = this

		setTimeout(() => {that.destroy()}, this.life_Time * 1000)
	}

	render() {

	}

	move() {
		this.vel.x = Math.cos(this.angle) * Math.lerp(0, 5, 20 * 0.09)
		this.vel.y = Math.sin(this.angle) * Math.lerp(0, 5, 20 * 0.09)

		//this.angle = Math.atan2(-(this.y - this.direction.y), -(this.x - this.direction.x))

		this.x += this.vel.x//Math.cos(this.angle) * (this.vel.x * this.accel)
		this.y += this.vel.y//Math.sin(this.angle) * (this.vel.y * this.accel)

		var xg = Math.floor(this.x / Level.pixelSize)
		var yg = Math.floor(this.y / Level.pixelSize)

		if (!Particle.mayPass(this.level.getPixel(xg, yg))) {
			this.onTouch(xg, yg)
		}
	}

	update(ticks) {

	}

	destroy() {
		var index = Projectile.projectiles.indexOf(this)

		Projectile.projectiles.splice(index, 1)
	}

	onTouch(xg, yg) {

	}

}

class ExplosionProjectile extends Projectile {
	constructor(x, y, direction) {
		super(x, y, direction)

		this.sprite.region.x = 0
		this.sprite.region.y = 24
		this.sprite.region.w = 8
		this.sprite.region.h = 8

		this.sprite.scaleX = 1.6
		this.sprite.scaleY = 1.6
	}

	render() {
		this.sprite.image = Resource_Loader.images[0].image
		this.sprite.render()
	}

	update(ticks) {
		this.sprite.x = this.x - this.level.scrollX
		this.sprite.y = this.y - this.level.scrollY

		this.sprite.rotation_degrees = (180 * this.angle / Math.PI)
		this.move()
	}

	onTouch(xg, yg) {

		for (let i = -4; i < 4; i++) {
			for (let j = -4; j < 4; j++) {
				this.level.pixels[(xg + i) + (yg + j) * this.level.noise.w] = Particle.Type_Air
			}
		}

		this.destroy()
	}
}

class Entity {
	x = 0
	y = 0
	aabb = null
	level = null
	on_Floor = false
	jump_Height = 6
	vel = {
		x: 0, y: 0
	}

	constructor(x, y) {
		this.x = 0
		this.y = 0
		this.aabb = new AABB({x: 0, y: 0}, {x: 16, y: 32})
	}

	setPosition(x, y) {
		this.x = x
		this.y = y

		this.aabb.position.x = this.x// - this.aabb.size.x / 2
		this.aabb.position.y = this.y// - this.aabb.size.y / 2
	}

	render() {

	}

	update(ticks) {

	}

	move(dx, dy) {

		if (this.on_Floor == false) {
			
			if (this.vel.y < 3.0)
				this.vel.y += 1 * 0.3
		
		}

		this.on_Floor = false

		if (dx != 0) this.move2(dx, 0)
		if (dy != 0) this.move2(0, dy)

	}

	move2(dx, dy) {
		
		if (this.testNotchCollision(dx, dy))
			return

		this.x += dx
		this.y += dy
	}

	testNotchCollision(dx, dy) {
		//this.aabb.position = {x: (this.x + dx), y: (this.y + dy)}

		//var ox0 = Math.floor(this.aabb.position.x / Level.pixelSize)
		//var oy0 = Math.floor(this.aabb.position.y / Level.pixelSize)

		this.aabb.position = {x: (this.x + dx) - this.aabb.size.x / 2, y: (this.y + dy) - this.aabb.size.y / 2 }

		var x0 = Math.floor((this.aabb.position.x - 0) / Level.pixelSize)
		var x1 = Math.floor((this.aabb.position.x + this.aabb.size.x) / Level.pixelSize)
		var y0 = Math.floor((this.aabb.position.y - 0) / Level.pixelSize)
		var y1 = Math.floor((this.aabb.position.y + this.aabb.size.y) / Level.pixelSize)
		
		for (let i = x0; i < x1 + 1; i++) {
			for (let j = y0; j < y1 + 1; j++) {


				//plis, trabalhar para implementar o .mayPass()

				if (!Particle.mayPass(this.level.getPixel(i, j))) {
					//if (dx != 0)
					//	this.vel.y = -this.jump_Height / 2

					if (dy > 0)
						this.on_Floor = true

					if (dy < 0)
						this.vel.y = -this.vel.y

					return true
				}
			}
		}

		return false
	}
}

class Mob extends Entity {
	
	static Direction_Left = -1
	static Direction_Right = 1

	constructor() {
		super(0, 0)

		this.direction = Mob.Direction_Right
	}

	update(ticks) {
		if (this.vel.x != 0) {
			if (this.vel.x < 0)
				this.direction = Mob.Direction_Left
			else
				this.direction = Mob.Direction_Right
		}
	}
}

class Player extends Mob {

	constructor() {
		super()

		this.sprite = new Sprite()

		this.sprite.x = this.x
		this.sprite.y = this.y

		this.sprite.region.x = 0
		this.sprite.region.x = 0
		this.sprite.region.w = 8
		this.sprite.region.h = 16

		this.sprite.scaleX = 1.5
		this.sprite.scaleY = 1.5

		this.tool_Sprite = new Sprite()
		this.tool_Sprite.region.x = 0
		this.tool_Sprite.region.y = 16
		this.tool_Sprite.region.w = 8
		this.tool_Sprite.region.h = 8

		this.tool_Sprite.scaleX = 1.8
		this.tool_Sprite.scaleY = 1.8

		this.tool_Sprite.offsetX = -16
	}

	render() {

		/*if (this.direction == Mob.Direction_Right) {
			this.sprite.region.x = 0
			this.sprite.region.y = 0
		}

		if (this.direction == Mob.Direction_Left) {
			this.sprite.region.x = 8
			this.sprite.region.y = 0
		}*/

		// draw sprite with transforms

		this.sprite.x = this.x - this.level.scrollX
		this.sprite.y = this.y - this.level.scrollY
		this.sprite.image = Resource_Loader.images[0].image

		this.sprite.render()

		// draw Tool Sprite

		this.sprite.flipH = this.tool_Sprite.flipV

		this.tool_Sprite.x = this.sprite.x
		this.tool_Sprite.y = this.sprite.y
		this.tool_Sprite.image = Resource_Loader.images[0].image

		this.tool_Sprite.render()

		// draw AABB

		gfx.strokeStyle = "white"
		gfx.lineWidth = 2

		//gfx.strokeRect((this.aabb.position.x) - this.level.scrollX, (this.aabb.position.y) - this.level.scrollY, this.aabb.size.x, this.aabb.size.y)
	}

	update(ticks) {
		super.update(ticks)

		if (InputEventEstate.GetMouseOffset().x < this.tool_Sprite.x)
			this.tool_Sprite.flipV = true

		if (InputEventEstate.GetMouseOffset().x > this.tool_Sprite.x)
			this.tool_Sprite.flipV = false

		this.tool_Sprite.lookAt(InputEventEstate.GetMouseOffset())

		var impulse = {
			x: 0,
			y: 0
		}

		if (InputEventEstate.GetAction("KeyA") || GamePad.Btn_Left)
			impulse.x = -1

		if (InputEventEstate.GetAction("KeyD") || GamePad.Btn_Right)
			impulse.x = 1

		if ((InputEventEstate.GetAction("Space") || GamePad.Btn_Up) && this.on_Floor)
			this.vel.y = -this.jump_Height

		this.vel.x = Math.lerp(this.vel.x, impulse.x * 4, ticks * 2)

		this.move(this.vel.x, this.vel.y)

		if (InputEventEstate.GetMouseButtonPressed(0) || InputEventEstate.GetTouches() == 2) {

			var target = InputEventEstate.GetMouseOffset(this.level.scrollX, this.level.scrollY)

			var explosion_Projectile = new ExplosionProjectile(this.x, this.y, {
				x: target.x, y: target.y
			})
			explosion_Projectile.level = this.level
		}
	}
}

class Timer {
	constructor() {
		this.seconds = 0
	}

	asSeconds() {

		var ms = 0

		while (ms < 1000.0) {
			ms += Math.pow(10.0, -3)
		}

		this.seconds++

		return this.seconds
	}

	reset() {
		this.seconds = 0
	}
}

class GamePad {

	static Joy_Direction_Left = 0
	static Joy_Direction_Right = 1
	static Joy_Direction_Up = 2
	static Joy_Direction_Down = 3

	static Btn_Left = false
	static Btn_Right = false
	static Btn_Up = false

	constructor() {
		this.cursor_Angle = 0.0
		this.direction_Button = GamePad.Joy_Direction_Up
		this.button_Scale = 2

		this.button_Left = new Rect(100 - 32, canvas.height - 164, 32 * this.button_Scale, 32 * this.button_Scale)
		this.button_Right = new Rect(100 + 64, canvas.height - 164, 32 * this.button_Scale, 32 * this.button_Scale)
		this.button_Up = new Rect(0, canvas.height - 198, 32 * this.button_Scale, 32 * this.button_Scale)


	}

	drawJoys() {

		this.button_Left.y = window.innerHeight - 128
		this.button_Right.y = window.innerHeight - 128
		this.button_Up.y = window.innerHeight - 156
		this.button_Up.x = window.innerWidth - 156

		gfx.strokeStyle = "white"
		
		gfx.strokeRect(this.button_Left.x, this.button_Left.y, this.button_Left.w, this.button_Left.h)

		gfx.strokeRect(this.button_Right.x, this.button_Right.y, this.button_Right.w, this.button_Right.h)

		gfx.strokeRect(this.button_Up.x, this.button_Up.y, this.button_Up.w, this.button_Up.h)
	}

	render() {
		this.drawJoys()
	}

	update(ticks) {

		GamePad.Btn_Left = false
		GamePad.Btn_Right = false
		GamePad.Btn_Up = false

		if (InputEventEstate.GetTouchPressed()) {

			var mouse = InputEventEstate.GetTouchAt()

			var mouse_Rect = new Rect(mouse.x, mouse.y, 1, 1)

			if (this.button_Left.collides(mouse_Rect))
				GamePad.Btn_Left = true

			if (this.button_Right.collides(mouse_Rect))
				GamePad.Btn_Right = true

			if (this.button_Up.collides(mouse_Rect))
				GamePad.Btn_Up = true
		}

	}
}

class Game {
	level = null
	last_Frame = performance.now()
	current_Frame = 0
	tick_Frame = 0
	framerate = 0
	start = false
	menu_Options = new Array(3)
	menu_Selection = 0
	fade_Transparency = 0

	constructor() {
		this.level = new Level(23, 128)

		this.menu_Options[0] = "Single Player"
		this.menu_Options[1] = "Multiplayer (LAN)"
		this.menu_Options[2] = "Settings"

		this.fade_Timer = new Timer()
		this.gamePad = new GamePad()
	}

	init() {
		this.level.generate()
	}

	drawTitleScreen() {
		
		for (let index = 0; index < this.menu_Options.length; index++) {
			var color = "white"

			var option_Rect = new Rect(100, 100 + (index * 32), 9 * this.menu_Options[index].length, 16)

			if (this.menu_Selection == index) {
				color = "yellow"

				gfx.drawImage(Resource_Loader.images[0].image, 0, 16, 8, 8, 80, option_Rect.y, 16, 16)
			}

			//gfx.strokeStyle = "white"

			//gfx.strokeRect(option_Rect.x, option_Rect.y, option_Rect.w, option_Rect.h)
		
			Text.render(this.menu_Options[index], option_Rect.x, option_Rect.y + 16, 24, color)

			var mouse = InputEventEstate.GetMouseOffset()

			if (option_Rect.collides(new Rect(mouse.x, mouse.y, 1, 1))) {
				this.menu_Selection = index

				if (InputEventEstate.GetMouseButtonPressed(0) || InputEventEstate.GetTouches() == 1) {
					if (this.menu_Selection == 0) {
						this.fade_Transparency = 0
						this.start = true
					}
				}
			}


		}

		//this.menu_Selection = this.menu_Selection % this.menu_Options.length - 1
	}

	render() {

		gfx.imageSmoothingEnabled = false
		gfx.setTransform(1, 0, 0, 1, 0, 0)

		gfx.clearRect(0, 0, canvas.width, canvas.height)

		gfx.fillStyle = "rgb(0, 0, 0)"
		gfx.fillRect(0, 0, canvas.width, canvas.height)	

		gfx.globalAlpha = this.fade_Transparency

		if (this.start)
			this.level.render()
		else
			this.drawTitleScreen()

		Text.render(`fps: ${Math.floor(this.framerate)}`, 16, 32, 32)

		this.gamePad.render()
	}

	update(ticks) {
		this.fade_Transparency = Math.lerp(this.fade_Transparency, 1.0, ticks * 0.5)

		this.level.update(ticks)

		this.gamePad.update(ticks)
	}

	run() {

		const dt = 1.0 / 60.0

		var loop = (time) => {

			var new_Time = time
			var frame_Time = new_Time - this.last_Frame
			this.last_Frame = new_Time

			if (frame_Time > 0.0) {

				var delta_Time = Math.min(frame_Time, dt)

				this.framerate = frame_Time

				this.update(delta_Time)

				frame_Time -= delta_Time
			}

			this.render()


			requestAnimationFrame(loop)
		}

		requestAnimationFrame(loop)
	}
}

var game = new Game()

function main() {

	/*document.addEventListener("keydown", function(ev) {
		keyboard[ev.code] = true

		if (!keyboard.pressed[ev.code]) {
			keyboard.pressed[ev.code] = true

			setTimeout(() => {
				keyboard.pressed[ev.code] = false
			}, 1000 / prefs.framerate)
		}
	})

	document.addEventListener("keyup", function(ev) {

		keyboard[ev.code] = false
	})

	canvas.addEventListener("mousemove", (ev) => {
		mouse.x = ev.offsetX
		mouse.y = ev.offsetY
	})

	canvas.addEventListener("mousedown", (ev) => {
		mouse.button = ev.button
		mouse.down = true

		if (!mouse.pressed) {
			mouse.pressed = true

			setTimeout(() => {
				mouse.pressed = false
			}, 1000 / prefs.framerate)
		}
	})

	canvas.addEventListener("mouseup", (ev) => {
		mouse.button = ev.button
		mouse.down = false
	})*/

	window.addEventListener("touchstart", function(event) {

		InputEventEstate.touches.count++

		var touch = event.targetTouches[(event.targetTouches.length - 1) % 100]

		InputEventEstate.touches.point = new Point(Math.floor(touch.clientX), Math.floor(touch.clientY))

		var last = InputEventEstate.touches.count

		InputEventEstate.touches.pressed = true

		setTimeout(() => {
			if (last == InputEventEstate.touches.count)
				InputEventEstate.touches.count = 0
		}, InputEventEstate.ACTION_DELAY + 200)

	})

	window.addEventListener("touchmove", function(event) {

		var touch = event.targetTouches[(event.targetTouches.length - 1)]

		InputEventEstate.touches.point = new Point(Math.floor(touch.clientX), Math.floor(touch.clientY))

	})

	window.addEventListener("touchend", function(event) {
		
		InputEventEstate.touches.pressed = false

	})

	window.addEventListener("mousemove", function(event) {
		InputEventEstate.cursor.x = event.offsetX
		InputEventEstate.cursor.y = event.offsetY
	})

	window.addEventListener("mousedown", function(event) {

		InputEventEstate.cursor.buttonIndices[event.button] = true

		if (InputEventEstate.cursor.buttonPressed == false) {
			InputEventEstate.cursor.buttonPressed = true

			setTimeout(() => {
				
				InputEventEstate.cursor.buttonPressed = false

			}, InputEventEstate.ACTION_DELAY)
		}

	})

	window.addEventListener("dblclick", function(event) {
		event.preventDefault()
	})

	window.addEventListener("mouseup", function(event) {

		InputEventEstate.cursor.buttonIndices[event.button] = false

		if (InputEventEstate.cursor.buttonReleased == false) {
			InputEventEstate.cursor.buttonReleased = true

			setTimeout(() => {
				
				InputEventEstate.cursor.buttonReleased = false

			}, InputEventEstate.ACTION_DELAY)
		}

	})

	window.addEventListener("keyup", function (event) {

		InputEventEstate.keyboard.keyNames[event.code] = false


		if (InputEventEstate.keyboard.keyReleased == false) {
			InputEventEstate.keyboard.keyReleased = true

			setTimeout(() => {
				
				InputEventEstate.keyboard.keyReleased = false

			}, InputEventEstate.ACTION_DELAY)
		}

	})

	window.addEventListener("keydown", function (event) {
		
		InputEventEstate.keyboard.keyNames[event.code] = true


		if (InputEventEstate.keyboard.keyPressed == false) {
			InputEventEstate.keyboard.keyPressed = true

			setTimeout(() => {

				InputEventEstate.keyboard.keyPressed = false

			}, InputEventEstate.ACTION_DELAY)
		}

	})

	game.init()
	game.run()

}


window.onload = function() {

	document.querySelector("title").innerText = "Terracota"

	canvas.width = window.innerWidth
	canvas.height = window.innerHeight

	Resource_Loader.Add([
		"../assets/icons.png",
		"NanumPenScript:../assets/Nanum_Pen_Script/NanumPenScript-Regular.ttf"
		], main)

	
}