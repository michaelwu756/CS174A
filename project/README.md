# Surfing Simulator Project
## Description
The purpose of this project is to demonstrate water effects using WebGL while catching some sick waves.
:ocean::ocean::surfer:

You can play the game by running host.bat or host.command and navigating to http://localhost:8000, or
you can play it online [here](https://intro-graphics-master.github.io/term-project-18/).

## What We Implemented
### Water
The shape of the water consists of semi-regular waves along with random 2D Perlin noise variation.
The waves utilize a falloff to provide a more realistic shape. A shader was added to the water to
increase realism. The shader fakes reflection of the sky, adds specularity, and includes a moving
normal texture so the water looks bumpy.

### Sky
We have written a shader which fades the skybox to darkness underneath the water level in order to
simulate ocean depth.

### Surfboard
The surfboard rests on top of the water, moving up and down along with the waves. Furthermore, it
tilts along with the waves in a realistic manner, changing its angle as the waves increase and
decrease in size. The user can control the surfboard to move around the environment by paddling
and changing the angle the surfboard makes with the water. The surfboard texture is done in the shader,
as the texture coordinates in the obj file were malformed.

### Buoys
Buoys act as a target for the player to move towards and are the core of the game aspect of this
project. When the surfboard enters a certain radius of a buoy, it will change color from red to
green, indicating that the player has touched that buoy. There are a total of 10 buoys, and the
objective is to touch as many as possible.

### Control Panel
The surfboard can be moved by holding down the spacebar to paddle, which accelerates the board
forward. "A" and "D" tilt the surfboard left and right, while "W" and "S" tilt the
board forwards and backwards to change drag. Waves will push the surfboard if it
is facing down the wave. In addition, the camera can be controlled with the arrow keys, "Z" to
zoom the camera towards the surfboard, and "X" to move the camera away. "C" is a preset that orients
the camera to look down the board and "V" orients the camera to look backwards. We also added a sound
toggle, help message, and position display.

### Particle effect:
When the surfboard is moving faster than a certain velocity, it will cause some water spray to be drawn.
This spray is based on the previous location of the surfboard and fades out after a short time.

## Difficulties We Faced
- Operating and working between WebGL coordinates and game world coordinates
- Writing shaders for most of our objects so that they would look nice
- Calculating normals and heights so objects appear to be on the surface of the water

## Advanced Topics Used
- Stacked 2D Perlin noise was used to give the waves a more natural look
- Realistic Water
  - The normal of the water at the location of the surfboard was calculated to allow the surfboard
  tilt fluctuate with the waves
  - Custom shader that includes specularity, normal texturing, and a faked reflection texture. Since the
  surface height of the water varies, we could not implement reflections using a frame buffer object, as
  our normals are different at different points along the wave. Instead we use a fixed texture that we
  rotate along with the camera as our reflection texture.
- Surfing physics and interaction with buoys. We modeled the acceleration by calculating the projection
of the board's normal vector onto the forward direction of the board. We calculated torque by the cross
product of the velocity vector with the forward axis plus a horizontal component based on the board tilt.
- We added a particle effect by drawing textures on squares and rotating them to always face the camera.
We disabled depth buffering so the particles appears on top of everything else.

## Contributions

### Jeannie Hur
- Camera controls
- Particle texturing and setup
- Position indicator
- Project whiteboarding

### Jennie Zheng
- 2D Perlin noise for wave
- Surfboard obj display
- Help panel
- Audio toggle

### Michael Wu
- Water shader and wave shaping
- Surfboard tilting
- Movement physics
- Particle effect
- Skybox and surfboard shaders
- Lighting and sun

### Tristan Melton
- Skybox setup
- Buoy positioning and hit tracking
- Base water waves
- Initial codebase