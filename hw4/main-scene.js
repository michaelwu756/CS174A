import { tiny, defs } from './assignment-4-resources.js';
const { Vec, Mat, Mat4, Color, Light, Shape, Shader, Material, Texture,
  Scene, Canvas_Widget, Code_Widget, Text_Widget } = tiny;
const { Subdivision_Sphere } = defs;

const Main_Scene =
  class Solar_System extends Scene {
    constructor() {
      super();
      const Subdivision_Sphere_Flat = Subdivision_Sphere.prototype.make_flat_shaded_version();
      this.shapes = {
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
      const texture_shader_2 = new defs.Fake_Bump_Map(2);
      const gouraud_shader = new Gouraud_Shader(2);
      const black_hole_shader = new Black_Hole_Shader();
      const sun_shader = new Sun_Shader();

      this.materials = {
        sun: new Material(sun_shader),
        planet_1: new Material(phong_shader, { diffusivity: 0.9, specularity: 0.1, color: Color.of(0.5, 0.5, 0.5, 1) }),
        planet_2: new Material(phong_shader, { diffusivity: 0, specularity: 1, color: Color.of(0.41, 0.41, 0.41, 1) }),
        planet_3: new Material(texture_shader_2, { texture: new Texture("assets/earth.gif"), diffusivity: 0.9, specularity: 0.1, color: Color.of(0, 0.5, 0.5, 1) }),
        planet_4: new Material(texture_shader_2, { texture: new Texture("assets/bricks.png", "NEAREST"), diffusivity: 1, specularity: 1, smoothness: 10 }),
        planet_5: new Material(texture_shader_2, { texture: new Texture("assets/bricks.png"), diffusivity: 1, specularity: 1, smoothness: 10 }),
        star: new Material(texture_shader_2, { texture: new Texture("assets/star_face.png"), ambient: 1, diffusivity: 0, specularity: 0, color: Color.of(0, 0, 0, 1) }),
        moon_1: new Material(black_hole_shader),
        moon_2: new Material(gouraud_shader, { diffusivity: 1, specularity: 0.5, color: Color.of(1, 1, 1, 1) })
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
      const modifier = this.lights_on ? { ambient: 0.3 } : { ambient: 0. };

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

      const moon1 = planet2.times(Mat4.rotation(4 / 5 * t, [0, 1, 0]))
        .times(Mat4.translation([2, 0, 0]))
        .times(Mat4.rotation(4 / 5 * t, [0, 1, 0]));
      this.shapes.ball_4.draw(context, program_state, moon1, this.materials.moon_1.override(modifier));

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
      this.camera_teleporter.cameras.push(Mat4.inverse(moon1.times(step_back)));
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
          vec3 result = vec3(0.);
          for (int i = 0; i < N_LIGHTS; i++)
          {
            vec3 surface_to_light_vector = light_positions_or_vectors[i].xyz -
              light_positions_or_vectors[i].w * vertex_worldspace;
            float distance_to_light = length(surface_to_light_vector);

            vec3 L = normalize(surface_to_light_vector);
            vec3 H = normalize(L + E);
            float diffuse = max(dot(N, L), 0.);
            float specular = pow(max(dot(N, H), 0.), smoothness);
            float attenuation = 1. / (1. + light_attenuation_factors[i] * distance_to_light * distance_to_light);

            vec3 light_contribution = shape_color.xyz * vec3(1., 1., 1.) * diffusivity * diffuse
              + vec3(1., 1., 1.) * specularity * specular;

            result += attenuation * light_contribution;
          }
          return result;
        }`;
    }
    vertex_glsl_code() {
      return this.shared_glsl_code() + `
        attribute vec3 position, normal;
        uniform mat4 model_transform;
        uniform mat4 projection_camera_model_transform;
        void main() {
          gl_Position = projection_camera_model_transform * vec4(position, 1.);
          vec3 N = normalize(mat3(model_transform) * normal / squared_scale);
          vec3 vertex_worldspace = (model_transform * vec4(position, 1.)).xyz;
          color = vec4(shape_color.xyz * ambient, shape_color.w);
          color.xyz += gouraud_model_lights(normalize(N), vertex_worldspace);
        }`;
    }
    fragment_glsl_code() {
      return this.shared_glsl_code() + `
        void main() {
          gl_FragColor = color;
        }`;
    }
  }

const Black_Hole_Shader = defs.Black_Hole_Shader =
  class Black_Hole_Shader extends Shader {
    update_GPU(context, gpu_addresses, program_state, model_transform, material) {
      const [P, C, M] = [program_state.projection_transform, program_state.camera_inverse, model_transform],
        PCM = P.times(C).times(M);
      context.uniformMatrix4fv(gpu_addresses.projection_camera_model_transform, false, Mat.flatten_2D_to_1D(PCM.transposed()));
      context.uniform1f(gpu_addresses.animation_time, program_state.animation_time / 1000);
    }
    shared_glsl_code() {
      return `
        precision mediump float;
        uniform float animation_time;
        varying vec2 f_tex_coord;
        const float PI = 3.1415926535897932384626433832795;`;
    }
    vertex_glsl_code() {
      return this.shared_glsl_code() + `
        attribute vec3 position;
        attribute vec2 texture_coord;
        uniform mat4 projection_camera_model_transform;

        void main() {
          vec3 newPosition = position * (1. + 0.1 * sin(mod(12. * PI * (texture_coord.y - animation_time / 2.), 2. * PI)));
          gl_Position = projection_camera_model_transform * vec4(newPosition, 1.);
          f_tex_coord = texture_coord;
        }`;
    }
    fragment_glsl_code() {
      return this.shared_glsl_code() + `
        void main() {
          float v = f_tex_coord.y;
          gl_FragColor = vec4(
            min(1., max(0., 0.5 + sin(12. * PI * (v - animation_time / 2.)))),
            min(1., max(0., 0.65 * sin(12. * PI * (v - animation_time / 2.)))), 0, 1);
        }`;
    }
  }

const Sun_Shader = defs.Sun_Shader =
  class Sun_Shader extends Shader {
    update_GPU(context, gpu_addresses, program_state, model_transform, material) {
      const [P, C, M] = [program_state.projection_transform, program_state.camera_inverse, model_transform],
        PCM = P.times(C).times(M);
      context.uniformMatrix4fv(gpu_addresses.projection_camera_model_transform, false, Mat.flatten_2D_to_1D(PCM.transposed()));
      context.uniform1f(gpu_addresses.time, program_state.animation_time / 1000);
      context.uniform4fv(gpu_addresses.sun_color, material.color);
    }
    shared_glsl_code() {
      return `
        precision mediump float;
        varying float disp;`;
    }
    vertex_glsl_code() {
      return this.shared_glsl_code() + `
        attribute vec3 position;
        attribute vec3 normal;
        attribute vec2 uv;
        attribute vec2 uv2;
        uniform mat4 projection_camera_model_transform;
        uniform float time;
        vec3 mod289(vec3 x) {
          return x - floor(x * (1. / 289.)) * 289.;
        }
        vec4 mod289(vec4 x) {
          return x - floor(x * (1. / 289.)) * 289.;
        }
        vec4 permute(vec4 x) {
          return mod289(((x * 34.) + 1.) * x);
        }
        vec4 taylorInvSqrt(vec4 r) {
          return 1.79284291400159 - 0.85373472095314 * r;
        }
        vec3 fade(vec3 t) {
          return t * t * t * (t * (t * 6. - 15.) + 10.);
        }
        float cnoise(vec3 P) {
          vec3 Pi0 = floor(P);
          vec3 Pi1 = Pi0 + vec3(1.);
          Pi0 = mod289(Pi0);
          Pi1 = mod289(Pi1);
          vec3 Pf0 = fract(P);
          vec3 Pf1 = Pf0 - vec3(1.);
          vec4 ix = vec4(Pi0.x, Pi1.x, Pi0.x, Pi1.x);
          vec4 iy = vec4(Pi0.yy, Pi1.yy);
          vec4 iz0 = Pi0.zzzz;
          vec4 iz1 = Pi1.zzzz;

          vec4 ixy = permute(permute(ix) + iy);
          vec4 ixy0 = permute(ixy + iz0);
          vec4 ixy1 = permute(ixy + iz1);

          vec4 gx0 = ixy0 * (1. / 7.);
          vec4 gy0 = fract(floor(gx0) * (1. / 7.)) - 0.5;
          gx0 = fract(gx0);
          vec4 gz0 = vec4(0.5) - abs(gx0) - abs(gy0);
          vec4 sz0 = step(gz0, vec4(0.));
          gx0 -= sz0 * (step(0., gx0) - 0.5);
          gy0 -= sz0 * (step(0., gy0) - 0.5);

          vec4 gx1 = ixy1 * (1. / 7.);
          vec4 gy1 = fract(floor(gx1) * (1. / 7.)) - 0.5;
          gx1 = fract(gx1);
          vec4 gz1 = vec4(0.5) - abs(gx1) - abs(gy1);
          vec4 sz1 = step(gz1, vec4(0.));
          gx1 -= sz1 * (step(0., gx1) - 0.5);
          gy1 -= sz1 * (step(0., gy1) - 0.5);

          vec3 g000 = vec3(gx0.x, gy0.x, gz0.x);
          vec3 g100 = vec3(gx0.y, gy0.y, gz0.y);
          vec3 g010 = vec3(gx0.z, gy0.z, gz0.z);
          vec3 g110 = vec3(gx0.w, gy0.w, gz0.w);
          vec3 g001 = vec3(gx1.x, gy1.x, gz1.x);
          vec3 g101 = vec3(gx1.y, gy1.y, gz1.y);
          vec3 g011 = vec3(gx1.z, gy1.z, gz1.z);
          vec3 g111 = vec3(gx1.w, gy1.w, gz1.w);

          vec4 norm0 = taylorInvSqrt(vec4(dot(g000, g000), dot(g010, g010), dot(g100, g100), dot(g110, g110)));
          g000 *= norm0.x;
          g010 *= norm0.y;
          g100 *= norm0.z;
          g110 *= norm0.w;
          vec4 norm1 = taylorInvSqrt(vec4(dot(g001, g001), dot(g011, g011), dot(g101, g101), dot(g111, g111)));
          g001 *= norm1.x;
          g011 *= norm1.y;
          g101 *= norm1.z;
          g111 *= norm1.w;

          float n000 = dot(g000, Pf0);
          float n100 = dot(g100, vec3(Pf1.x, Pf0.yz));
          float n010 = dot(g010, vec3(Pf0.x, Pf1.y, Pf0.z));
          float n110 = dot(g110, vec3(Pf1.xy, Pf0.z));
          float n001 = dot(g001, vec3(Pf0.xy, Pf1.z));
          float n101 = dot(g101, vec3(Pf1.x, Pf0.y, Pf1.z));
          float n011 = dot(g011, vec3(Pf0.x, Pf1.yz));
          float n111 = dot(g111, Pf1);

          vec3 fade_xyz = fade(Pf0);
          vec4 n_z = mix(vec4(n000, n100, n010, n110), vec4(n001, n101, n011, n111), fade_xyz.z);
          vec2 n_yz = mix(n_z.xy, n_z.zw, fade_xyz.y);
          float n_xyz = mix(n_yz.x, n_yz.y, fade_xyz.x);
          return 2.2 * n_xyz;
        }
        float turbulence(vec3 p) {
          float t = -0.5;
          for (float f = 1.; f <= 10. ; f++ ) {
            float power = pow(2., f);
            t += abs(cnoise(vec3(power * p)) / power);
          }
          return t;
        }

        void main() {
          float pulseHeight = 0.2;
          float displacementHeight = 0.65269959;
          float turbulenceDetail = 0.63107728;
          float noise = -0.8 * turbulence(turbulenceDetail * normal + (time * 0.2));
          float displacement = (0. - displacementHeight) * noise + pulseHeight * cnoise(0.05 * position + vec3(0.2 * time));
          disp = displacement;

          vec3 newPosition = position + normal * displacement;
          gl_Position = projection_camera_model_transform * vec4(newPosition, 1.);
        }`;
    }
    fragment_glsl_code() {
      return this.shared_glsl_code() + `
        uniform vec4 sun_color;

        void main() {
            vec3 color = vec3((1. - 15. * disp), (0.1 - disp * 3.) + 0.3, (0.1 - disp * 1.5) + 0.1 * abs(sin(10. * disp)));
            gl_FragColor = vec4(color.rgb, 1.);
            gl_FragColor *= sun_color;
        }`;
    }
  }