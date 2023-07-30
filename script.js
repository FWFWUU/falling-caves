const canvas = document.querySelector("canvas")
const gfx = canvas.getContext("2d")
const keyboard = {
	pressed: {}
}
const mouse = {
	x: 0,
	y: 0
}

var prefs = {
	framerate: 60.0,
	fonts: new Array(256),
	textures: new Array(256)
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

	static  Type_Air = 0
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
			point.x += 16

		if (point.y < 0)
			point.y += 16

		if (point.x >= this.w)
			point.x -= 16

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
				return "rgb(100, 100, 200)"
				break;

			case Particle.Type_Stone:
				return "rgb(100, 100, 100)"
				break;

			case Particle.Type_Grass:
				return "rgb(125, 150, 25)"
				break;

			case Particle.Type_Sand:
				return "rgb(242, 255, 198)"
				break;

			case Particle.Type_Dirt:
				return "rgb(125, 50, 25)"
				break;
		}
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
		for (let x = 0; x < Level.chunkSize; x++) {
			for (let y = 0; y < this.level.h; y++) {
				var pixel = this.level.getPixel(x + this.x1, y)

				if (pixel == Particle.Type_Air)
					continue

				gfx.fillStyle = Particle.getColor(pixel)
				
				gfx.fillRect(((x * Level.pixelSize) + (this.x1 * Level.pixelSize)) - this.level.scrollX,
					(y * Level.pixelSize) - this.level.scrollY, Level.pixelSize, Level.pixelSize)
			}
		}

		/*for (let x = 0; x < this.noise.w; x++) {
			for (let y = 0; y < this.noise.h; y++) {
				if (this.getPixel(x, y) == Particle.Type_Air)
					continue

				gfx.fillStyle = Particle.getColor(this.getPixel(x, y))
				
				gfx.fillRect((x * Level.pixelSize) - this.scrollX, (y * Level.pixelSize) - this.scrollY, Level.pixelSize, Level.pixelSize)
			}
		}*/
	}
}

class Level {
	w = 0
	h = 0
	pixels = new Array()
	static chunkSize = 32
	noise = null
	scrollX = 0
	scrollY = 0
	static pixelSize = 6
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

					if (Math.random() * 8 < 2) {
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
		if (x < 0 || y < 0 || x >= this.w + this.chunkSize || y >= this.h)
			return

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
				for (let dist = -2; dist < 2; dist++) {

					var nearChunk = this.getChunk(xc + dist)

					if (nearChunk)
						nearChunk.render()
				}
			}

			e.render()
		})
	}

	update(ticks) {
		
		this.entities.forEach((e) => {
			
			if (Player.prototype.isPrototypeOf(e)) {
				this.scrollX = e.x - canvas.width / 2
				this.scrollY = e.y - canvas.height / 2
			}

			e.update(ticks)
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
	}

	render() {
		gfx.save()

		gfx.setTransform(this.scaleX, 0, 0, this.scaleY, this.x, this.y)

		gfx.rotate(this.rotation_degrees * Math.PI / 180)

		if (this.image)
			gfx.drawImage(this.image, this.region.x, this.region.y, this.region.w, this.region.h, -(this.region.w * this.scaleX) / 2, -(this.region.h * this.scaleY) / 2, this.region.w * this.scaleX, this.region.h * this.scaleY)

		gfx.restore()
	}
}

class Entity {
	x = 0
	y = 0
	aabb = null
	level = null
	on_Floor = false
	jump_Height = 4
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

		this.aabb.position.x = this.x - this.aabb.size.x / 2
		this.aabb.position.y = this.y - this.aabb.size.y / 2
	}

	render() {

	}

	update(ticks) {

	}

	move(dx, dy) {

		if (this.on_Floor == false) {
			
			if (this.vel.y < 5.0)
				this.vel.y += 2 * 0.03
		
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
					//	this.vel.y = -this.jump_Height

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
	}

	render() {

		if (this.direction == Mob.Direction_Right) {
			this.sprite.region.x = 0
			this.sprite.region.y = 0
		}

		if (this.direction == Mob.Direction_Left) {
			this.sprite.region.x = 8
			this.sprite.region.y = 0
		}

		// draw sprite with transforms

		this.sprite.x = this.x - this.level.scrollX
		this.sprite.y = this.y - this.level.scrollY
		this.sprite.image = Resource_Loader.images[0].image

		this.sprite.render()

		// draw AABB

		gfx.strokeStyle = "white"

		gfx.strokeRect((this.x - this.aabb.size.x / 2) - this.level.scrollX, (this.y - this.aabb.size.y / 2) - this.level.scrollY, this.aabb.size.x, this.aabb.size.y)
	}

	update(ticks) {
		super.update(ticks)

		var impulse = {
			x: 0,
			y: 0
		}

		if (keyboard.ArrowLeft)
			impulse.x = -1

		if (keyboard.ArrowRight)
			impulse.x = 1

		if (keyboard.ArrowUp && this.on_Floor)
			this.vel.y = -this.jump_Height

		this.vel.x = impulse.x

		this.move(this.vel.x, this.vel.y)
	}
}

class Game {
	level = null
	last_Frame = 0
	current_Frame = 0
	tick_Frame = 0
	framerate = 0
	start = false
	menu_Options = new Array(3)
	menu_Selection = 0

	constructor() {
		this.level = new Level(23, 128)

		this.menu_Options[0] = "Single Player"
		this.menu_Options[1] = "Multiplayer (LAN)"
		this.menu_Options[2] = "Settings"
	}

	init() {
		this.level.generate()
	}

	drawTitleScreen() {

		gfx.font = "48px NanumPenScript"
		gfx.imageSmoothingEnabled = false
		
		for (let index = 0; index < this.menu_Options.length; index++) {
			gfx.fillStyle = "white"

			var option_Rect = new Rect(100, (100 - 28) + (index * 28), 24 * this.menu_Options[index].length, 24)

			if (this.menu_Selection == index) {
				gfx.fillStyle = "yellow"

				gfx.drawImage(Resource_Loader.images[0].image, 0, 16, 8, 8, 80, 74 + (this.menu_Selection * 24), 16, 16)
			}
		
			gfx.fillText(this.menu_Options[index], option_Rect.x, option_Rect.y + 28)

			if (option_Rect.collides(new Rect(mouse.x, mouse.y, 1, 1))) {
				this.menu_Selection = index
				if (mouse.pressed) {
					if (this.menu_Selection == 0) this.start = true
				}
			}


		}

		//this.menu_Selection = this.menu_Selection % this.menu_Options.length - 1
	}

	render() {

		gfx.setTransform(1, 0, 0, 1, 0, 0)

		gfx.clearRect(0, 0, canvas.width, canvas.height)

		gfx.fillStyle = "rgb(23, 33, 23)"
		gfx.fillRect(0, 0, canvas.width, canvas.height)	

		if (this.start)
			this.level.render()
		else
			this.drawTitleScreen()
	}

	update(ticks) {
		this.level.update(ticks)
	}

	run() {

		var loop = (time) => {
			this.current_Frame = Date.now()
			this.tick_Frame = (this.current_Frame - this.last_Frame)
			
			if (this.tick_Frame >= 1 / prefs.framerate) {

				this.framerate = this.tick_Frame

				//console.log(prefs.framerate / this.tick_Frame)

				this.update(prefs.framerate / this.tick_Frame)

				this.last_Frame = this.current_Frame - (this.tick_Frame % (1 / prefs.framerate))

			}

			this.render()

			requestAnimationFrame(loop)
		}

		requestAnimationFrame(loop)
	}
}

var game = new Game()

function main() {

	document.addEventListener("keydown", function(ev) {
		keyboard[ev.key] = true
		keyboard.pressed[ev.key] = true

		setTimeout(() => {
			keyboard.pressed[ev.key] = false
		}, 1000 / prefs.framerate)
	})

	document.addEventListener("keyup", function(ev) {
		keyboard[ev.key] = false
	})

	canvas.addEventListener("mousemove", (ev) => {
		mouse.x = ev.offsetX
		mouse.y = ev.offsetY
	})

	canvas.addEventListener("mousedown", (ev) => {
		mouse.button = ev.button
		mouse.down = true
		mouse.pressed = true

		setTimeout(() => {
			mouse.pressed = false
		}, 1000 / prefs.framerate)
	})

	canvas.addEventListener("mouseup", (ev) => {
		mouse.button = ev.button
		mouse.down = false
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