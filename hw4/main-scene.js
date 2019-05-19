import { tiny, defs } from './assignment-4-resources.js';
const { Vec, Mat, Mat4, Color, Light, Shape, Shader, Material, Texture,
  Scene, Canvas_Widget, Code_Widget, Text_Widget } = tiny;
const { Cube, Subdivision_Sphere, Transforms_Sandbox_Base } = defs;

const Main_Scene =
  class Solar_System extends Scene {
    constructor() {
      super();
      const Subdivision_Sphere_Flat = Subdivision_Sphere.prototype.make_flat_shaded_version();
      this.shapes = {
        'box': new Cube(),
        'ball_1': new Subdivision_Sphere(1),
        'ball_2': new Subdivision_Sphere(2),
        'ball_3': new Subdivision_Sphere_Flat(3),
        'ball_4': new Subdivision_Sphere(4),
        'ball_5': new Subdivision_Sphere(5),
        'ball_6': new Subdivision_Sphere(6),
        'star': new Planar_Star()
      };
      this.shapes.ball_5.arrays.texture_coord.forEach(coord => coord.scale(5));

      const phong_shader = new defs.Phong_Shader(2);
      const texture_shader = new defs.Textured_Phong(2);
      const texture_shader_2 = new defs.Fake_Bump_Map(2);
      const gouraud_shader = new Gouraud_Shader(2);
      const black_hole_shader = new Black_Hole_Shader();
      const sun_shader = new Sun_Shader();

      this.materials = {
        sun: new Material(phong_shader, { ambient: 1, diffusivity: 0, specularity: 0 }),
        planet_1: new Material(phong_shader, { diffusivity: 0.9, specularity: 0.1, color: Color.of(0.5, 0.5, 0.5, 1) }),
        planet_2: new Material(phong_shader, { diffusivity: 0, specularity: 1, color: Color.of(0.41, 0.41, 0.41, 1) }),
        planet_3: new Material(texture_shader_2, { texture: new Texture("assets/earth.gif"), diffusivity: 0.9, specularity: 0.1, color: Color.of(0, 0.5, 0.5, 1) }),
        planet_4: new Material(texture_shader_2, { texture: new Texture("assets/bricks.png", "NEAREST"), diffusivity: 1, specularity: 1, smoothness: 10 }),
        planet_5: new Material(texture_shader_2, { texture: new Texture("assets/bricks.png"), diffusivity: 1, specularity: 1, smoothness: 10 }),
        star: new Material(texture_shader_2, { texture: new Texture("assets/star_face.png"), ambient: 1, diffusivity: 0, specularity: 0, color: Color.of(0, 0, 0, 1) }),
        moon_2: new Material(gouraud_shader, { diffusivity: 1, specularity: 0.5, color: Color.of(1, 1, 1, 1) }),
        black_hole: new Material(black_hole_shader)
      };

      this.lights_on = false;
      this.star_matrices = [];
      for (let i = 0; i < 30; i++)
        this.star_matrices.push(Mat4.rotation(Math.PI / 2 * (Math.random() - .5), Vec.of(0, 1, 0))
          .times(Mat4.rotation(Math.PI / 2 * (Math.random() - .5), Vec.of(1, 0, 0)))
          .times(Mat4.translation([0, 0, -150])));
    }
    make_control_panel() {
      this.key_triggered_button("Lights on/off", ["l"], () => this.lights_on = !this.lights_on);
    }
    display(context, program_state) {
      if (!context.scratchpad.controls) {
        this.children.push(context.scratchpad.controls = new defs.Movement_Controls());
        this.children.push(this.camera_teleporter = new Camera_Teleporter());
        program_state.set_camera(Mat4.look_at(Vec.of(0, 10, 20), Vec.of(0, 0, 0), Vec.of(0, 1, 0)));
        this.initial_camera_location = program_state.camera_inverse;
        program_state.projection_transform = Mat4.perspective(Math.PI / 4, context.width / context.height, 1, 200);
      }

      const t = program_state.animation_time / 1000;

      this.camera_teleporter.cameras = [];
      this.camera_teleporter.cameras.push(Mat4.look_at(Vec.of(0, 10, 20), Vec.of(0, 0, 0), Vec.of(0, 1, 0)));

      let model_transform = Mat4.identity();
      const modifier = this.lights_on ? { ambient: 0.3 } : { ambient: 0.0 };

      const smoothly_varying_ratio = .5 + .5 * Math.sin(2 * Math.PI * t / 10),
        sun_size = 1 + 2 * smoothly_varying_ratio,
        sun = model_transform.times(Mat4.scale([sun_size, sun_size, sun_size])),
        sun_color = Color.of(smoothly_varying_ratio, smoothly_varying_ratio, 1 - smoothly_varying_ratio, 1);
      this.materials.sun.color = sun_color;
      program_state.lights = [new Light(Vec.of(0, 0, 0, 1), sun_color, 10 ** sun_size)];
      this.shapes.ball_6.draw(context, program_state, sun, this.materials.sun);

      const planet1 = model_transform.times(Mat4.rotation(t, [0, 1, 0]))
        .times(Mat4.translation([5, 0, 0]))
        .times(Mat4.rotation(t, [0, 1, 0]));
      this.shapes.ball_3.draw(context, program_state, planet1, this.materials.planet_1.override(modifier));

      const planet2 = model_transform.times(Mat4.rotation(4 / 5 * t, [0, 1, 0]))
        .times(Mat4.translation([8, 0, 0]))
        .times(Mat4.rotation(4 / 5 * t, [0, 1, 0]));
      this.shapes.ball_2.draw(context, program_state, planet2, this.materials.planet_2.override(modifier));

      // TODO (#6b1):  Draw moon 1 orbiting 2 units away from planet 2, revolving AND rotating.

      const planet3 = model_transform.times(Mat4.rotation(3 / 5 * t, [0, 1, 0]))
        .times(Mat4.translation([11, 0, 0]))
        .times(Mat4.rotation(3 / 5 * t, [0, 1, 0]));
      this.shapes.ball_4.draw(context, program_state, planet3, this.materials.planet_3.override(modifier));

      const moon2 = planet3.times(Mat4.rotation(3 / 5 * t, [0, 1, 0]))
        .times(Mat4.translation([2, 0, 0]))
        .times(Mat4.rotation(3 / 5 * t, [0, 1, 0]));
      this.shapes.ball_1.draw(context, program_state, moon2, this.materials.moon_2.override(modifier));

      const planet4 = model_transform.times(Mat4.rotation(2 / 5 * t, [0, 1, 0]))
        .times(Mat4.translation([14, 0, 0]))
        .times(Mat4.rotation(2 / 5 * t, [0, 1, 0]));
      this.shapes.ball_5.draw(context, program_state, planet4, this.materials.planet_4.override(modifier));

      const planet5 = model_transform.times(Mat4.rotation(1 / 5 * t, [0, 1, 0]))
        .times(Mat4.translation([17, 0, 0]))
        .times(Mat4.rotation(1 / 5 * t, [0, 1, 0]));
      this.shapes.ball_5.draw(context, program_state, planet5, this.materials.planet_5.override(modifier));

      if (this.lights_on) {
        this.star_matrices.forEach(star => this.shapes.star.draw(context, program_state, star, this.materials.star));
      }

      const step_back = Mat4.translation([0, 0, 4]);
      this.camera_teleporter.cameras.push(Mat4.inverse(sun.times(step_back)));
      this.camera_teleporter.cameras.push(Mat4.inverse(planet1.times(step_back)));
      this.camera_teleporter.cameras.push(Mat4.inverse(planet2.times(step_back)));
      this.camera_teleporter.cameras.push(Mat4.inverse(planet3.times(step_back)));
      this.camera_teleporter.cameras.push(Mat4.inverse(moon2.times(step_back)));
      this.camera_teleporter.cameras.push(Mat4.inverse(planet4.times(step_back)));
      this.camera_teleporter.cameras.push(Mat4.inverse(planet5.times(step_back)));
    }
  }

const Additional_Scenes = [];

export { Main_Scene, Additional_Scenes, Canvas_Widget, Code_Widget, Text_Widget, defs }


const Camera_Teleporter = defs.Camera_Teleporter =
  class Camera_Teleporter extends Scene {
    // **Camera_Teleporter** is a helper Scene meant to be added as a child to
    // your own Scene.  It adds a panel of buttons.  Any matrices externally
    // added to its "this.cameras" can be selected with these buttons. Upon
    // selection, the program_state's camera matrix slowly (smoothly)
    // linearly interpolates itself until it matches the selected matrix.
    constructor() {
      super();
      this.cameras = [];
      this.selection = 0;
    }
    make_control_panel() {
      // make_control_panel(): Sets up a panel of interactive HTML elements, including
      // buttons with key bindings for affecting this scene, and live info readouts.

      this.key_triggered_button("Enable", ["e"], () => this.enabled = true);
      this.key_triggered_button("Disable", ["Shift", "E"], () => this.enabled = false);
      this.new_line();
      this.key_triggered_button("Previous location", ["g"], this.decrease);
      this.key_triggered_button("Next", ["h"], this.increase);
      this.new_line();
      this.live_string(box => { box.textContent = "Selected camera location: " + this.selection });
    }
    increase() { this.selection = Math.min(this.selection + 1, Math.max(this.cameras.length - 1, 0)); }
    decrease() { this.selection = Math.max(this.selection - 1, 0); }   // Don't allow selection of negative indices.
    display(context, program_state) {
      const desired_camera = this.cameras[this.selection];
      if (!desired_camera || !this.enabled)
        return;
      const dt = program_state.animation_delta_time;
      program_state.set_camera(desired_camera.map((x, i) => Vec.from(program_state.camera_inverse[i]).mix(x, .01 * dt)));
    }
  }


const Planar_Star = defs.Planar_Star =
  class Planar_Star extends Shape {
    // **Planar_Star** defines a 2D five-pointed star shape.  The star's inner
    // radius is 4, and its outer radius is 7.  This means the complete star
    // fits inside a 14 by 14 sqaure, and is centered at the origin.
    constructor() {
      super("position", "normal", "texture_coord");

      this.arrays.position.push(Vec.of(0, 0, 0));
      for (let i = 0; i < 11; i++) {
        const spin = Mat4.rotation(i * 2 * Math.PI / 10, Vec.of(0, 0, -1));

        const radius = i % 2 ? 4 : 7;
        const new_point = spin.times(Vec.of(0, radius, 0, 1)).to3();

        this.arrays.position.push(new_point);
        if (i > 0)
          this.indices.push(0, i, i + 1)
      }

      this.arrays.normal = this.arrays.position.map(p => Vec.of(0, 0, -1));
      this.arrays.texture_coord = this.arrays.position.map(p => Vec.of((p[0] + 7) / 14, (p[1] + 7) / 14));
    }
  }

const Gouraud_Shader = defs.Gouraud_Shader =
  class Gouraud_Shader extends defs.Phong_Shader {
    shared_glsl_code() {
      return `
        precision mediump float;
        const int N_LIGHTS = ` + this.num_lights + `;
        uniform float ambient, diffusivity, specularity, smoothness;
        uniform vec4 light_positions_or_vectors[N_LIGHTS], light_colors[N_LIGHTS];
        uniform float light_attenuation_factors[N_LIGHTS];
        uniform vec4 shape_color;
        uniform vec3 squared_scale, camera_center;
        varying vec4 color;
        vec3 gouraud_model_lights(vec3 N, vec3 vertex_worldspace) {
          vec3 E = normalize(camera_center - vertex_worldspace);
          vec3 result = vec3(0.0);
          for (int i = 0; i < N_LIGHTS; i++)
          {
            vec3 surface_to_light_vector = light_positions_or_vectors[i].xyz -
              light_positions_or_vectors[i].w * vertex_worldspace;
            float distance_to_light = length(surface_to_light_vector);
  
            vec3 L = normalize(surface_to_light_vector);
            vec3 H = normalize(L + E);
            float diffuse = max(dot(N, L), 0.0);
            float specular = pow(max(dot(N, H), 0.0), smoothness);
            float attenuation = 1.0 / (1.0 + light_attenuation_factors[i] * distance_to_light * distance_to_light);
  
            vec3 light_contribution = shape_color.xyz * vec3(1.0, 1.0, 1.0) * diffusivity * diffuse
              + vec3(1.0, 1.0, 1.0) * specularity * specular;
  
            result += attenuation * light_contribution;
          }
          return result;
        }` ;

    }
    vertex_glsl_code() {
      return this.shared_glsl_code() + `
        attribute vec3 position, normal;
        uniform mat4 model_transform;
        uniform mat4 projection_camera_model_transform;
        void main() {
          gl_Position = projection_camera_model_transform * vec4(position, 1.0);
          vec3 N = normalize(mat3(model_transform) * normal / squared_scale);
          vec3 vertex_worldspace = (model_transform * vec4(position, 1.0)).xyz;
          color = vec4(shape_color.xyz * ambient, shape_color.w);
          color.xyz += gouraud_model_lights(normalize(N), vertex_worldspace);
        }` ;
    }
    fragment_glsl_code() {
      return this.shared_glsl_code() + `
        void main() {
          gl_FragColor = color;
        } ` ;
    }
  }


const Black_Hole_Shader = defs.Black_Hole_Shader =
  class Black_Hole_Shader extends Shader
  // Simple "procedural" texture shader, with texture coordinates but without an input image.
  {
    update_GPU(context, gpu_addresses, program_state, model_transform, material) {
      // update_GPU(): Define how to synchronize our JavaScript's variables to the GPU's.  This is where the shader
      // recieves ALL of its inputs.  Every value the GPU wants is divided into two categories:  Values that belong
      // to individual objects being drawn (which we call "Material") and values belonging to the whole scene or
      // program (which we call the "Program_State").  Send both a material and a program state to the shaders
      // within this function, one data field at a time, to fully initialize the shader for a draw.

      // TODO (#EC 1b):  Send the GPU the only matrix it will need for this shader:  The product of the projection,
      // camera, and model matrices.  The former two are found in program_state; the latter is directly
      // available here.  Finally, pass in the animation_time from program_state. You don't need to allow
      // custom materials for this part so you don't need any values from the material object.
      // For an example of how to send variables to the GPU, check out the simple shader "Funny_Shader".

      // context.uniformMatrix4fv( gpu_addresses.projection_camera_model_transform,
    }
    shared_glsl_code()            // ********* SHARED CODE, INCLUDED IN BOTH SHADERS *********
    {
      // TODO (#EC 1c):  For both shaders, declare a varying vec2 to pass a texture coordinate between
      // your shaders.  Also make sure both shaders have an animation_time input (a uniform).
      return `precision mediump float;

      `;
    }
    vertex_glsl_code()           // ********* VERTEX SHADER *********
    {
      // TODO (#EC 1d,e):  Create the final "gl_Position" value of each vertex based on a displacement
      // function.  Also pass your texture coordinate to the next shader.  As inputs,
      // you have the current vertex's stored position and texture coord, animation time,
      // and the final product of the projection, camera, and model matrices.
      return this.shared_glsl_code() + `

        void main()
        {

        }`;
    }
    fragment_glsl_code()           // ********* FRAGMENT SHADER *********
    {
      // TODO (#EC 1f):  Using the input UV texture coordinates and animation time,
      // calculate a color that makes moving waves as V increases.  Store
      // the result in gl_FragColor.
      return this.shared_glsl_code() + `
        void main()
        {

        }`;
    }
  }


const Sun_Shader = defs.Sun_Shader =
  class Sun_Shader extends Shader {
    update_GPU(context, gpu_addresses, graphics_state, model_transform, material) {
      // TODO (#EC 2): Pass the same information to the shader as for EC part 1.  Additionally
      // pass material.color to the shader.


    }
    // TODO (#EC 2):  Complete the shaders, displacing the input sphere's vertices as
    // a fireball effect and coloring fragments according to displacement.

    shared_glsl_code()            // ********* SHARED CODE, INCLUDED IN BOTH SHADERS *********
    {
      return `precision mediump float;

      `;
    }
    vertex_glsl_code()           // ********* VERTEX SHADER *********
    {
      return this.shared_glsl_code() + `

        void main()
        {

        }`;
    }
    fragment_glsl_code()           // ********* FRAGMENT SHADER *********
    {
      return this.shared_glsl_code() + `
        void main()
        {

        } ` ;
    }
  }