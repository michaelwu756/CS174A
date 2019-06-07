import { tiny, defs } from './assignment-4-resources.js';                                                               // Pull these names into this module's scope for convenience:
const { Vec, Mat, Mat4, Color, Light, Shader, Material, Texture,
  Scene, Canvas_Widget, Text_Widget, Shape } = tiny;
const { Square, Subdivision_Sphere, Textured_Phong, Phong_Shader } = defs;

// Now we have loaded everything in the files tiny-graphics.js, tiny-graphics-widgets.js, and assignment-4-resources.js.
// This yielded "tiny", an object wrapping the stuff in the first two files, and "defs" for wrapping all the rest.

// (Can define Main_Scene's class here)

const Main_Scene =
  class Surfing extends Scene {
    constructor() {
      super();

      this.audio = new Audio('assets/ocean.mp3');
      this.audio.loop = true;
      this.playingAudio = false;

      const initial_corner_point = Vec.of(0, 0, 0);

      const row_operation = (s, p) => p ? Mat4.translation([0, 1, 0]).times(p.to4(1)).to3() : initial_corner_point;
      const column_operation = (t, p) => Mat4.translation([1, 0, 0]).times(p.to4(1)).to3();

      //Buoy defs
      this.buoys = [];
      for (let i = 0; i < 8; i++) {
        this.buoys.push({ x: -63 + i * 20, y: 35 - i * 4, hit: false });
      }
      this.wake = [];
      this.helpText = `
        Paddle to move forward.
        Once you are moving:
        Tilt forward(w) to reduce drag.
        Tilt back(s) to increase drag.
        Tilt left(a) to turn left.
        Tilt right(d) to turn right.
        If you ever get lost, try returning to the start.
        Hit the buoys to collect points!
      `;
      this.numhits = 0;
      this.shapes = {
        'sheet': new defs.Grid_Patch(75, 75, row_operation, column_operation),
        'sphere': new Subdivision_Sphere(6),
        'spray': new Square(),
        'surfboard': new Shape_From_File("assets/surfboard.obj"),
        'buoy': new Shape_From_File("assets/buoy.obj")
      };
      this.board = {
        p: Vec.of(-85, 30, 0),
        v: Vec.of(0, 0, 0),
        theta: -Math.PI / 2,
        pitch: 0,
        roll: 0
      };
      this.keys = {
        left: false,
        right: false,
        up: false,
        down: false,
        space: false
      };

      // *** Shaders ***
      const phong_shader = new defs.Phong_Shader(2);
      const surfboard_shader = new defs.Surfboard_Shader(2);
      const water_shader = new defs.Water_Shader(2);
      const skybox_shader = new defs.Skybox_Shader(2);
      const spray_shader = new defs.Spray_Shader(2);

      this.materials = {
        sun: new Material(phong_shader, { ambient: 1, diffusivity: 0, specularity: 0, color: Color.of(1, 1, 0.9, 1) }),
        metal: new Material(phong_shader, { ambient: 0, diffusivity: 0.9, specularity: 0.2, color: Color.of(1, .5, 1, 1) }),
        surfboard: new Material(surfboard_shader, { ambient: 0.8, diffusivity: 1, specularity: 0.8 }),
        skybox: new Material(skybox_shader, {
          texture: new Texture("assets/skybig.jpg"),
          ambient: 1, diffusivity: 0, specularity: 0, color: Color.of(.4, .4, .4, 1)
        }),
        water: new Material(water_shader, { texture: new Texture("assets/wave.jpg"), reflection: new Texture("assets/reflection.jpg") }),
        spray: new Material(spray_shader, {
          texture: new Texture("assets/rain.png"),
          ambient: 1, diffusivity: 0, specularity: 0, color: Color.of(.4, .4, .4, 1)
        })
      };
      this.pn = new Perlin('random seed');
      this.t = 0;
    }
    make_control_panel() {
      // make_control_panel(): Sets up a panel of interactive HTML elements, including
      // buttons with key bindings for affecting this scene, and live info readouts.
      this.key_triggered_button("Up", ["w"], () => this.keys.up = true, undefined, () => this.keys.up = false);
      this.key_triggered_button("Left", ["a"], () => this.keys.left = true, undefined, () => this.keys.left = false);
      this.key_triggered_button("Down", ["s"], () => this.keys.down = true, undefined, () => this.keys.down = false);
      this.key_triggered_button("Right", ["d"], () => this.keys.right = true, undefined, () => this.keys.right = false);
      this.new_line();
      this.key_triggered_button("Paddle", [" "], () => this.keys.space = true, undefined, () => this.keys.space = false);
      this.new_line();
      this.key_triggered_button("Go to Start", ["r"], () => this.board.p = Vec.of(-85, 30, 0));
      this.new_line();
      this.key_triggered_button("Help", ["h"], () => 0, undefined, () => alert(this.helpText));
      this.key_triggered_button("Audio", ["0"], function () {
        if (!this.playingAudio) { this.audio.play(); }
        else { this.audio.pause(); }
        this.playingAudio = !this.playingAudio;
      });
      this.new_line();
      this.live_string(box => { box.textContent = "Number of Hit Buoys: " + this.numhits });
      this.new_line();
      this.live_string(box => { box.textContent = "X: " + this.board.p[0].toFixed(3) + ", Y: " + this.board.p[1].toFixed(3) });
    }
    height(x, y) {
      const wave = function (x, y, t) {
        const x_scale = 0.5;
        const y_scale = 0.025;
        const t_mod = t % 20;
        let v = y_scale * (y - 100 + 2 * t_mod);
        if (v > Math.PI / 2)
          v = Math.PI / 2;
        else if (v < -Math.PI / 2)
          v = -Math.PI / 2;
        let fadeInAndOut = 1;
        if (t_mod < 3)
          fadeInAndOut = t_mod / 3;
        else if (t_mod > 17)
          fadeInAndOut = (20 - t_mod) / 3;
        const amplitude = (5 + 30 * Math.cos(v) * Math.cos(v)) * fadeInAndOut;
        const u = x_scale * (x + 48 - 8 * t_mod);
        let blend = 1 - u / 4;
        if (blend < 0)
          blend = 0;
        else if (blend > 1)
          blend = 1;
        return (amplitude * Math.sin(u) / u) * blend;
      }
      x = x + this.board.p[0] + 74 / 2;
      y = y + this.board.p[1] + 74 / 2;
      return .15 * (wave(x, y, this.t) + wave(x, y - 5, this.t - 10)
        + 4 * this.pn.noise(x / 4 + this.t / 8, y / 4 + this.t / 8, 0.)
        - 2 * this.pn.noise(x / 4 + this.t / 4, y / 4 + this.t / 4, 0.)
        + 1 * this.pn.noise(x / 4 + this.t / 2, y / 4 + this.t / 2, 0.)
        - 0.5 * this.pn.noise(x / 4 + this.t, y / 4 + this.t, 0.));
    }
    normal(x, y) {
      return Vec.of(0.1, this.height(x + 0.1, y) - this.height(x, y), 0)
        .cross(Vec.of(0, this.height(x, y + 0.1) - this.height(x, y), -0.1)).normalized();
    }
    location_matrix(x, y) {
      return Mat4.translation([x * 2, this.height(x, y), -y * 2]);
    }
    rotation_matrix(normal) {
      const phi = Math.atan(Vec.of(normal[0], 0, normal[2]).norm() / normal[1]);
      return Mat4.rotation(phi, Vec.of(0, 1, 0).cross(normal));
    }
    update_physics(program_state, wave_normal) {
      this.t = program_state.animation_time / 1000;
      const dt = program_state.animation_delta_time / 1000;

      const torque_multiplier = 3;
      const wave_multiplier = 4;
      const torque_drag = 0.5;
      const pitch_drag = 2;
      const velocity_multiplier = 10;
      const acceleration_multiplier = 1;
      const acceleration_cutoff = 0.5;
      const v_decay = 0.1 + pitch_drag * Math.abs(this.board.pitch);
      const paddle_acceleration = 0.4;
      const max_paddle_speed = 1;
      const pitch_center = 0.1;
      const pitch_change = 0.5;
      const pitch_decay = 0.1;
      const roll_change = 1.5;
      const roll_decay = 0.1;

      const board_normal = Mat4.rotation(this.board.theta, [0, 1, 0])
        .times(Mat4.rotation(this.board.pitch, [1, 0, 0]))
        .times(Mat4.rotation(this.board.roll, [0, 0, 1]))
        .times(wave_normal.to4(1)).to3();
      const boardProjection = wave_normal.times(board_normal.dot(wave_normal));
      const forward = Vec.of(-Math.sin(this.board.theta), Math.cos(this.board.theta), 0);
      let turned = Vec.of(-Math.sin(this.board.theta + this.board.roll), Math.cos(this.board.theta + this.board.roll), 0);
      turned = turned.minus(forward.times(2 * forward.dot(turned)));
      let acceleration = Vec.of(boardProjection[0], -boardProjection[2], 0).normalized()
        .times(wave_multiplier * Math.abs(Vec.of(boardProjection[0], -boardProjection[2], 0).dot(forward)));
      const torque = this.board.v.cross(turned).times(torque_multiplier);
      acceleration = acceleration.minus(this.board.v.times(torque_drag * torque.norm()));

      this.board.p = this.board.p.plus(this.board.v.times(velocity_multiplier * dt));
      if (this.keys.down)
        this.board.pitch += pitch_change * dt;
      if (this.keys.up)
        this.board.pitch -= pitch_change * dt;
      this.board.pitch = (this.board.pitch - pitch_center) * Math.pow(pitch_decay, dt) + pitch_center;
      if (this.keys.right)
        this.board.roll -= roll_change * dt;
      if (this.keys.left)
        this.board.roll += roll_change * dt;
      this.board.roll *= Math.pow(roll_decay, dt);
      if (this.keys.space && this.board.v.norm() < max_paddle_speed) {
        this.board.v = this.board.v.plus(forward.times(paddle_acceleration * dt));
        if (this.board.v.norm() > max_paddle_speed) {
          this.board.v = this.board.v.times(max_paddle_speed / this.board.v.norm());
        }
      }
      if (acceleration.norm() > acceleration_cutoff)
        this.board.v = this.board.v.plus(acceleration.times(acceleration_multiplier * dt));
      if (this.board.v.norm() < v_decay * dt) {
        this.board.v = Vec.of(0, 0, 0);
      } else if (this.board.v.norm() != 0) {
        this.board.v = this.board.v.times(1 - v_decay * dt / this.board.v.norm());
      }
      this.board.v = Mat4.rotation(torque[2] * dt, [0, 0, 1]).times(this.board.v).to3();
      this.board.theta += torque[2] * dt;
    }
    display(context, program_state) {
      // display():  Called once per frame of animation.  For each shape that you want to
      // appear onscreen, place a .draw() call for it inside.  Each time, pass in a
      // different matrix value to control where the shape appears.

      // Setup -- This part sets up the scene's overall camera matrix, projection matrix, and lights:
      if (!this.camera_controls) {
        // Add a movement controls panel to the page:
        this.camera_controls = new defs.Camera_Controls();
        this.children.push(context.scratchpad.controls = this.camera_controls);
        // Define the global camera and projection matrices, which are stored in program_state.  The camera
        // matrix follows the usual format for transforms, but with opposite values (cameras exist as
        // inverted matrices).  The projection matrix follows an unusual format and determines how depth is
        // treated when projecting 3D points onto a plane.  The Mat4 functions perspective() and
        // orthographic() automatically generate valid matrices for one.  The input arguments of
        // perspective() are field of view, aspect ratio, and distances to the near plane and far plane.
        program_state.set_camera(Mat4.identity());
        program_state.projection_transform = Mat4.perspective(Math.PI / 4, context.width / context.height, 1, 200);
      }
      this.camera_controls.set_forward_angle(this.board.theta);

      const light1_position = Vec.of(0, 75 * Math.sin(Math.PI / 6), -75 * Math.cos(Math.PI / 6), 1);
      const light2_position = Vec.of(0, -75, 0, 1);
      program_state.lights = [new Light(light1_position, this.materials.sun.color, 100000000), new Light(light2_position, Color.of(1, 1, 1, 1), 100000000)];
      const sun_transform = Mat4.translation(light1_position)
        .times(Mat4.scale([5, 5, 5]));
      this.shapes.sphere.draw(context, program_state, sun_transform, this.materials.sun);

      const skybox_transform = Mat4.scale([75, 75, 75]);
      this.shapes.sphere.draw(context, program_state, skybox_transform, this.materials.skybox);

      const wave_normal = this.normal(0, 0);
      const board_transform = this.location_matrix(0, 0)
        .times(Mat4.translation([0, 0.1, 0]))
        .times(this.rotation_matrix(wave_normal))
        .times(Mat4.rotation(this.board.theta, [0, 1, 0]))
        .times(Mat4.rotation(this.board.pitch, [1, 0, 0]))
        .times(Mat4.rotation(this.board.roll, [0, 0, 1]))
        .times(Mat4.rotation(Math.PI / 2, [0, 0, 1]))
        .times(Mat4.rotation(Math.PI / 2, [0, 1, 0]));
      this.shapes.surfboard.draw(context, program_state, board_transform, this.materials.surfboard);

      for (let b = 0; b < this.buoys.length; b++) {
        const x_rel = this.buoys[b].x - this.board.p[0];
        const y_rel = this.buoys[b].y - this.board.p[1];
        const buoy_transform = this.location_matrix(x_rel, y_rel)
          .times(Mat4.translation([0, 2, 0]))
          .times(this.rotation_matrix(this.normal(x_rel, y_rel)))
          .times(Mat4.scale([2, 2, 2]));
        if (Vec.of(x_rel, y_rel).norm() < 1 || this.buoys[b].hit) {
          if (this.buoys[b].hit == false)
            this.numhits++;
          this.shapes.buoy.draw(context, program_state, buoy_transform, this.materials.metal.override(Color.of(0, 0.80, 0.81, 1)));
          this.buoys[b].hit = true;
        }
        else
          this.shapes.buoy.draw(context, program_state, buoy_transform, this.materials.metal.override(Color.of(0.93, 0.43, 0.12, 1)));
      }

      this.shapes.sheet.arrays.position.forEach((p, i, a) => {
        const x_rel = p[0] - 74 / 2;
        const y_rel = p[1] - 74 / 2;
        a[i] = Vec.of(p[0], p[1], this.height(x_rel, y_rel));
        this.shapes.sheet.arrays.normal[i] = this.normal(x_rel, y_rel);
      });
      const water_transform = Mat4.translation([-75, 0, 75])
        .times(Mat4.rotation(-Math.PI / 2, Vec.of(1, 0, 0)))
        .times(Mat4.scale([2, 2, 2]));
      this.shapes.sheet.draw(context, program_state, water_transform, this.materials.water);
      this.shapes.sheet.copy_onto_graphics_card(context.context, ["position", "normal"], false);

      const min_v = 0.3;
      const wake_lifetime = 1;
      const wake_fade = 0.2;
      const camera_location = program_state.camera_transform.times(Vec.of(0, 0, 0, 1)).to3();
      if (this.board.v.norm() > min_v) {
        this.wake.push({ p: this.board.p.copy(), t: 0 });
      }
      context.context.disable(context.context.DEPTH_TEST);
      this.wake.forEach((w, i) => {
        const wake_size = 0.5 + 0.8 * w.t;
        const wake_angle = 2 * i;
        const wake_height = 0.2 * w.t;
        const wake_location = w.p.minus(this.board.p).plus(Vec.of(0, wake_height, 0));
        const camera_direction = camera_location.minus(wake_location);
        const x_rel = w.p[0] - this.board.p[0];
        const y_rel = w.p[1] - this.board.p[1];
        const spray_transform = this.location_matrix(x_rel, y_rel)
          .times(Mat4.translation([0, wake_height, 0]))
          .times(this.rotation_matrix(camera_direction))
          .times(Mat4.rotation(Math.PI / 2, [-1, 0, 0]))
          .times(Mat4.rotation(Math.atan(camera_direction[0] / camera_direction[2]), [0, 0, 1]))
          .times(Mat4.scale([wake_size, wake_size, wake_size]));
        const fade_color = Color.of(.4, .4, .4, 1);
        if (w.t < wake_fade)
          fade_color[3] = w.t / wake_fade;
        else if (w.t > wake_lifetime - wake_fade)
          fade_color[3] = (wake_lifetime - w.t) / wake_fade;
        this.shapes.spray.draw(context, program_state, spray_transform, this.materials.spray.override({ angle: wake_angle, color: fade_color }));
      });
      this.wake.forEach(w => w.t += program_state.animation_delta_time / 1000);
      this.wake = this.wake.filter(w => w.t < wake_lifetime);
      context.context.enable(context.context.DEPTH_TEST);

      this.update_physics(program_state, wave_normal);
    }
  }

const Additional_Scenes = [];

export { Main_Scene, Additional_Scenes, Canvas_Widget, Text_Widget, defs }

const Water_Shader = defs.Water_Shader =
  class Water_Shader extends Shader {
    constructor(num_lights = 2) {
      super();
      this.num_lights = num_lights;
    }
    update_GPU(context, gpu_addresses, program_state, model_transform, material) {
      const [P, C, M] = [program_state.projection_transform, program_state.camera_inverse, model_transform],
        PCM = P.times(C).times(M);
      context.uniformMatrix4fv(gpu_addresses.projection_camera_model_transform, false, Mat.flatten_2D_to_1D(PCM.transposed()));
      context.uniform1f(gpu_addresses.time, program_state.animation_time / 1000);
      if (material.texture && material.texture.ready) {
        // Select texture unit 0 for the fragment shader Sampler2D uniform called "texture":
        context.uniform1i(gpu_addresses.texture, 0);
        material.texture.activate(context);
      }
      if (material.reflection && material.reflection.ready) {
        context.uniform1i(gpu_addresses.reflection, 1);
        material.reflection.activate(context, 1);
      }
      const O = Vec.of(0, 0, 0, 1), camera_center = program_state.camera_transform.times(O).to3();
      context.uniform3fv(gpu_addresses.camera_center, camera_center);
      const light_positions_flattened = [], light_colors_flattened = [];
      for (var i = 0; i < 4 * program_state.lights.length; i++) {
        light_positions_flattened.push(program_state.lights[Math.floor(i / 4)].position[i % 4]);
        light_colors_flattened.push(program_state.lights[Math.floor(i / 4)].color[i % 4]);
      }
      context.uniform4fv(gpu_addresses.light_positions_or_vectors, light_positions_flattened);
      context.uniform4fv(gpu_addresses.light_colors, light_colors_flattened);
    }
    shared_glsl_code() {
      return `
        precision mediump float;
        varying vec3 worldPosition;
        varying vec4 projectedPosition;
        varying vec3 N;
        varying vec2 f_tex_coord;`;
    }
    vertex_glsl_code() {
      return this.shared_glsl_code() + `
        attribute vec3 position;
        attribute vec3 normal;
        attribute vec2 texture_coord;
        uniform mat4 model_transform;
        uniform mat4 projection_camera_model_transform;

        void main(){
          worldPosition=vec3(model_transform*vec4(position,1.));
          N=normalize(normal);
          projectedPosition=gl_Position=projection_camera_model_transform*vec4(position,1.);
          f_tex_coord=texture_coord;
        }`;
    }
    fragment_glsl_code() {
      return this.shared_glsl_code() + `
        const int N_LIGHTS=`+ this.num_lights + `;
        uniform float time;
        uniform vec4 light_positions_or_vectors[N_LIGHTS],light_colors[N_LIGHTS];
        uniform vec3 camera_center;
        uniform sampler2D texture;
        uniform sampler2D reflection;
        vec4 getNoise(vec2 uv){
          vec2 uv0=(uv/103.)+vec2(time/17.,time/29.);
          vec2 uv1=uv/107.-vec2(time/-19.,time/31.);
          vec2 uv2=uv/vec2(897.,983.)+vec2(time/101.,time/97.);
          vec2 uv3=uv/vec2(991.,877.)-vec2(time/109.,time/-113.);
          vec4 noise=(texture2D(texture,uv0))+
          (texture2D(texture,uv1))+
          (texture2D(texture,uv2))+
          (texture2D(texture,uv3));
          return noise*.5-1.;
        }
        vec3 diffuseCalc(const vec3 surfaceNormal,const vec3 eyeDirection,float diffuse){
          vec3 diffuseColor=vec3(0.);
          for(int i=0;i<N_LIGHTS;i++){
            vec3 sunDirection=normalize(light_positions_or_vectors[i].xyz-worldPosition);
            vec3 reflection=normalize(reflect(-sunDirection,surfaceNormal));
            diffuseColor+=max(dot(sunDirection,surfaceNormal),1.)*vec3(light_colors[i])*diffuse;
          }
          return diffuseColor;
        }
        vec3 specularCalc(const vec3 surfaceNormal,const vec3 eyeDirection,float shiny,float spec){
          vec3 specularColor=vec3(0.);
          for(int i=0;i<N_LIGHTS;i++){
            vec3 sunDirection=normalize(light_positions_or_vectors[i].xyz-worldPosition);
            vec3 reflection=normalize(reflect(-sunDirection,surfaceNormal));
            float direction=max(0.,dot(eyeDirection,reflection));
            specularColor+=pow(direction,shiny)*vec3(light_colors[i])*spec;
          }
          return specularColor;
        }
        mat2 rotation(float angle){
          return mat2(cos(angle),-sin(angle),sin(angle),cos(angle));
        }
        void main(){
          vec4 noise=getNoise(f_tex_coord);
          vec3 surfaceNormal=normalize(N+noise.xzy);

          vec3 worldToEye=camera_center-worldPosition;
          vec3 eyeDirection=normalize(worldToEye);
          vec3 diffuse=diffuseCalc(surfaceNormal,eyeDirection,.5);
          vec3 specular=specularCalc(surfaceNormal,eyeDirection,1500.,1.);
          float dist=length(worldToEye);

          vec2 screen=(projectedPosition.xy/projectedPosition.w)*.5;
          float angle=-atan(camera_center.x/camera_center.z);
          if(camera_center.z<0.)
            angle+=3.1415;

          float distortionFactor=max(dist/100.,10.);
          vec2 distortion=surfaceNormal.xz/distortionFactor;
          vec3 reflectionSample=vec3(texture2D(reflection,rotation(angle)*(screen/3.+4.*distortion)-vec2(.5,.5)));
          vec3 color=vec3(.1,.25,.35);
          gl_FragColor=vec4(color*(reflectionSample+vec3(.1))*(diffuse+specular+.3)*2.,.9);
        }`;
    }
  }

const Skybox_Shader = defs.Skybox_Shader =
  class Skybox_Shader extends Textured_Phong {
    fragment_glsl_code() {
      return this.shared_glsl_code() + `
        varying vec2 f_tex_coord;
        uniform sampler2D texture;

        void main(){
          vec4 tex_color=texture2D(texture,f_tex_coord);
          if(tex_color.w<.01)discard;
          float blend1=1.-vertex_worldspace.y/30.;
          if(blend1<0.)
            blend1=0.;
          else if(blend1>.95)
            blend1=.95;
          float blend2=-vertex_worldspace.y/30.;
          if(blend2<0.)
            blend2=0.;
          else if(blend2>1.)
            blend2=1.;
          vec4 blend_color1=vec4(0.,.4,.8,1.);
          vec4 blend_color2=vec4(0.,0.,.1,1.);
          vec4 blend_color=mix(blend_color1,blend_color2,blend2);
          gl_FragColor=mix(vec4((tex_color.xyz+shape_color.xyz)*ambient,shape_color.w*tex_color.w),blend_color,blend1);
          gl_FragColor.xyz+=phong_model_lights(normalize(N),vertex_worldspace);
        }`;
    }
  }

const Surfboard_Shader = defs.Surfboard_Shader =
  class Surfboard_Shader extends Phong_Shader {
    shared_glsl_code() {
      return super.shared_glsl_code() + `
        varying vec3 obj_position;`;
    }
    vertex_glsl_code() {
      return this.shared_glsl_code() + `
        attribute vec3 position,normal;

        uniform mat4 model_transform;
        uniform mat4 projection_camera_model_transform;

        void main(){
          gl_Position=projection_camera_model_transform*vec4(position,1.);
          N=normalize(mat3(model_transform)*normal/squared_scale)*-1.;
          obj_position=position;
          vertex_worldspace=(model_transform*vec4(position,1.)).xyz;
        }`;
    }
    fragment_glsl_code() {
      return this.shared_glsl_code() + `
        void main(){
          vec3 color=vec3(1.,1.,1.);
          if(obj_position.x<.5)
            color=vec3(1.,.65,0.);
          if(abs(obj_position.y)<.03&&obj_position.z>-.05)
            color=mix(vec3(0.,0.,0.),color,abs(obj_position.y)/.03);
          gl_FragColor=vec4(color.xyz*ambient,1.);
          gl_FragColor.xyz+=phong_model_lights(normalize(N),vertex_worldspace);
        }` ;
    }
  }

const Spray_Shader = defs.Spray_Shader =
  class Spray_Shader extends Textured_Phong {
    update_GPU(context, gpu_addresses, program_state, model_transform, material) {
      super.update_GPU(context, gpu_addresses, program_state, model_transform, material);
      context.uniform1f(gpu_addresses.time, program_state.animation_time / 1000);
      context.uniform1f(gpu_addresses.angle, material.angle);
    }
    fragment_glsl_code() {
      return this.shared_glsl_code() + `
        varying vec2 f_tex_coord;
        uniform sampler2D texture;
        uniform float time;
        uniform float angle;

        void main(){
          vec2 tex_coord_shift=f_tex_coord+vec2(cos(angle),sin(angle))*time;
          vec4 tex_color=texture2D(texture,tex_coord_shift);
          if(tex_color.w<.01)discard;
          float alpha=max(0.,1.-length(f_tex_coord-vec2(.5,.5))*2.);
          gl_FragColor=vec4((tex_color.xyz+shape_color.xyz)*ambient,shape_color.w*tex_color.w*alpha);
          gl_FragColor.xyz+=phong_model_lights(normalize(N),vertex_worldspace);
        }`;
    }
  }

class Shape_From_File extends Shape {
  // **Shape_From_File** is a versatile standalone Shape that imports
  // all its arrays' data from an .obj 3D model file.
  constructor(filename) {
    super("position", "normal", "texture_coord");
    // Begin downloading the mesh. Once that completes, return
    // control to our parse_into_mesh function.
    this.load_file(filename);
  }
  load_file(filename) {
    // Request the external file and wait for it to load.
    // Failure mode:  Loads an empty shape.
    return fetch(filename)
      .then(response => {
        if (response.ok) return Promise.resolve(response.text())
        else return Promise.reject(response.status)
      })
      .then(obj_file_contents => this.parse_into_mesh(obj_file_contents))
      .catch(error => { this.copy_onto_graphics_card(this.gl); })
  }
  parse_into_mesh(data) {
    // Adapted from the "webgl-obj-loader.js" library found online:
    var verts = [], vertNormals = [], textures = [], unpacked = {};

    unpacked.verts = []; unpacked.norms = []; unpacked.textures = [];
    unpacked.hashindices = {}; unpacked.indices = []; unpacked.index = 0;

    var lines = data.split('\n');

    var VERTEX_RE = /^v\s/; var NORMAL_RE = /^vn\s/; var TEXTURE_RE = /^vt\s/;
    var FACE_RE = /^f\s/; var WHITESPACE_RE = /\s+/;

    for (var i = 0; i < lines.length; i++) {
      var line = lines[i].trim();
      var elements = line.split(WHITESPACE_RE);
      elements.shift();

      if (VERTEX_RE.test(line)) verts.push.apply(verts, elements);
      else if (NORMAL_RE.test(line)) vertNormals.push.apply(vertNormals, elements);
      else if (TEXTURE_RE.test(line)) textures.push.apply(textures, elements);
      else if (FACE_RE.test(line)) {
        var quad = false;
        for (var j = 0, eleLen = elements.length; j < eleLen; j++) {
          if (j === 3 && !quad) { j = 2; quad = true; }
          if (elements[j] in unpacked.hashindices)
            unpacked.indices.push(unpacked.hashindices[elements[j]]);
          else {
            var vertex = elements[j].split('/');

            unpacked.verts.push(+verts[(vertex[0] - 1) * 3 + 0]);
            unpacked.verts.push(+verts[(vertex[0] - 1) * 3 + 1]);
            unpacked.verts.push(+verts[(vertex[0] - 1) * 3 + 2]);

            if (textures.length) {
              unpacked.textures.push(+textures[((vertex[1] - 1) || vertex[0]) * 2 + 0]);
              unpacked.textures.push(+textures[((vertex[1] - 1) || vertex[0]) * 2 + 1]);
            }

            unpacked.norms.push(+vertNormals[((vertex[2] - 1) || vertex[0]) * 3 + 0]);
            unpacked.norms.push(+vertNormals[((vertex[2] - 1) || vertex[0]) * 3 + 1]);
            unpacked.norms.push(+vertNormals[((vertex[2] - 1) || vertex[0]) * 3 + 2]);

            unpacked.hashindices[elements[j]] = unpacked.index;
            unpacked.indices.push(unpacked.index);
            unpacked.index += 1;
          }
          if (j === 3 && quad) unpacked.indices.push(unpacked.hashindices[elements[0]]);
        }
      }
    }
    {
      const { verts, norms, textures } = unpacked;
      for (var j = 0; j < verts.length / 3; j++) {
        this.arrays.position.push(Vec.of(verts[3 * j], verts[3 * j + 1], verts[3 * j + 2]));
        this.arrays.normal.push(Vec.of(norms[3 * j], norms[3 * j + 1], norms[3 * j + 2]));
        this.arrays.texture_coord.push(Vec.of(textures[2 * j], textures[2 * j + 1]));
      }
      this.indices = unpacked.indices;
    }

    this.normalize_positions(false);
    this.ready = true;
  }
  draw(context, program_state, model_transform, material) {
    // draw(): Same as always for shapes, but cancel all
    // attempts to draw the shape before it loads:
    if (this.ready)
      super.draw(context, program_state, model_transform, material);
  }
}

function Perlin(seed) {

  // Alea random number generator.
  //----------------------------------------------------------------------------//

  // From http://baagoe.com/en/RandomMusings/javascript/
  function Alea() {
    return (function (args) {
      // Johannes BaagÃ¸e <baagoe@baagoe.com>, 2010
      var s0 = 0;
      var s1 = 0;
      var s2 = 0;
      var c = 1;

      if (args.length == 0) {
        args = [+new Date];
      }
      var mash = Mash();
      s0 = mash(' ');
      s1 = mash(' ');
      s2 = mash(' ');

      for (var i = 0; i < args.length; i++) {
        s0 -= mash(args[i]);
        if (s0 < 0) {
          s0 += 1;
        }
        s1 -= mash(args[i]);
        if (s1 < 0) {
          s1 += 1;
        }
        s2 -= mash(args[i]);
        if (s2 < 0) {
          s2 += 1;
        }
      }
      mash = null;

      var random = function () {
        var t = 2091639 * s0 + c * 2.3283064365386963e-10; // 2^-32
        s0 = s1;
        s1 = s2;
        return s2 = t - (c = t | 0);
      };
      random.uint32 = function () {
        return random() * 0x100000000; // 2^32
      };
      random.fract53 = function () {
        return random() +
          (random() * 0x200000 | 0) * 1.1102230246251565e-16; // 2^-53
      };
      random.version = 'Alea 0.9';
      random.args = args;
      return random;

    }(Array.prototype.slice.call(arguments)));
  };

  // From http://baagoe.com/en/RandomMusings/javascript/
  // Johannes BaagÃ¸e <baagoe@baagoe.com>, 2010
  function Mash() {
    var n = 0xefc8249d;

    var mash = function (data) {
      data = data.toString();
      for (var i = 0; i < data.length; i++) {
        n += data.charCodeAt(i);
        var h = 0.02519603282416938 * n;
        n = h >>> 0;
        h -= n;
        h *= n;
        n = h >>> 0;
        h -= n;
        n += h * 0x100000000; // 2^32
      }
      return (n >>> 0) * 2.3283064365386963e-10; // 2^-32
    };

    mash.version = 'Mash 0.9';
    return mash;
  }

  // Simplex perlin noise.
  //----------------------------------------------------------------------------//

  // Ported from Stefan Gustavson's java implementation
  // http://staffwww.itn.liu.se/~stegu/simplexnoise/simplexnoise.pdf
  // Read Stefan's excellent paper for details on how this code works.
  //
  // Sean McCullough banksean@gmail.com

  /**
   * You can pass in a random number generator object if you like.
   * It is assumed to have a random() method.
   */
  var SimplexNoise = function (r) {
    if (r == undefined) r = Math;
    this.grad3 = [[1, 1, 0], [-1, 1, 0], [1, -1, 0], [-1, -1, 0],
    [1, 0, 1], [-1, 0, 1], [1, 0, -1], [-1, 0, -1],
    [0, 1, 1], [0, -1, 1], [0, 1, -1], [0, -1, -1]];
    this.p = [];
    for (var i = 0; i < 256; i++) {
      this.p[i] = Math.floor(r.random() * 256);
    }
    // To remove the need for index wrapping, double the permutation table length
    this.perm = [];
    for (var i = 0; i < 512; i++) {
      this.perm[i] = this.p[i & 255];
    }

    // A lookup table to traverse the simplex around a given point in 4D.
    // Details can be found where this table is used, in the 4D noise method.
    this.simplex = [
      [0, 1, 2, 3], [0, 1, 3, 2], [0, 0, 0, 0], [0, 2, 3, 1], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [1, 2, 3, 0],
      [0, 2, 1, 3], [0, 0, 0, 0], [0, 3, 1, 2], [0, 3, 2, 1], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [1, 3, 2, 0],
      [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0],
      [1, 2, 0, 3], [0, 0, 0, 0], [1, 3, 0, 2], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [2, 3, 0, 1], [2, 3, 1, 0],
      [1, 0, 2, 3], [1, 0, 3, 2], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [2, 0, 3, 1], [0, 0, 0, 0], [2, 1, 3, 0],
      [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0],
      [2, 0, 1, 3], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [3, 0, 1, 2], [3, 0, 2, 1], [0, 0, 0, 0], [3, 1, 2, 0],
      [2, 1, 0, 3], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [3, 1, 0, 2], [0, 0, 0, 0], [3, 2, 0, 1], [3, 2, 1, 0]];
  };

  SimplexNoise.prototype.dot = function (g, x, y) {
    return g[0] * x + g[1] * y;
  };

  SimplexNoise.prototype.noise = function (xin, yin) {
    var n0, n1, n2; // Noise contributions from the three corners
    // Skew the input space to determine which simplex cell we're in
    var F2 = 0.5 * (Math.sqrt(3.0) - 1.0);
    var s = (xin + yin) * F2; // Hairy factor for 2D
    var i = Math.floor(xin + s);
    var j = Math.floor(yin + s);
    var G2 = (3.0 - Math.sqrt(3.0)) / 6.0;
    var t = (i + j) * G2;
    var X0 = i - t; // Unskew the cell origin back to (x,y) space
    var Y0 = j - t;
    var x0 = xin - X0; // The x,y distances from the cell origin
    var y0 = yin - Y0;
    // For the 2D case, the simplex shape is an equilateral triangle.
    // Determine which simplex we are in.
    var i1, j1; // Offsets for second (middle) corner of simplex in (i,j) coords
    if (x0 > y0) { i1 = 1; j1 = 0; } // lower triangle, XY order: (0,0)->(1,0)->(1,1)
    else { i1 = 0; j1 = 1; }      // upper triangle, YX order: (0,0)->(0,1)->(1,1)
    // A step of (1,0) in (i,j) means a step of (1-c,-c) in (x,y), and
    // a step of (0,1) in (i,j) means a step of (-c,1-c) in (x,y), where
    // c = (3-sqrt(3))/6
    var x1 = x0 - i1 + G2; // Offsets for middle corner in (x,y) unskewed coords
    var y1 = y0 - j1 + G2;
    var x2 = x0 - 1.0 + 2.0 * G2; // Offsets for last corner in (x,y) unskewed coords
    var y2 = y0 - 1.0 + 2.0 * G2;
    // Work out the hashed gradient indices of the three simplex corners
    var ii = i & 255;
    var jj = j & 255;
    var gi0 = this.perm[ii + this.perm[jj]] % 12;
    var gi1 = this.perm[ii + i1 + this.perm[jj + j1]] % 12;
    var gi2 = this.perm[ii + 1 + this.perm[jj + 1]] % 12;
    // Calculate the contribution from the three corners
    var t0 = 0.5 - x0 * x0 - y0 * y0;
    if (t0 < 0) n0 = 0.0;
    else {
      t0 *= t0;
      n0 = t0 * t0 * this.dot(this.grad3[gi0], x0, y0);  // (x,y) of grad3 used for 2D gradient
    }
    var t1 = 0.5 - x1 * x1 - y1 * y1;
    if (t1 < 0) n1 = 0.0;
    else {
      t1 *= t1;
      n1 = t1 * t1 * this.dot(this.grad3[gi1], x1, y1);
    }
    var t2 = 0.5 - x2 * x2 - y2 * y2;
    if (t2 < 0) n2 = 0.0;
    else {
      t2 *= t2;
      n2 = t2 * t2 * this.dot(this.grad3[gi2], x2, y2);
    }
    // Add contributions from each corner to get the final noise value.
    // The result is scaled to return values in the interval [-1,1].
    return 70.0 * (n0 + n1 + n2);
  };

  // 3D simplex noise
  SimplexNoise.prototype.noise3d = function (xin, yin, zin) {
    var n0, n1, n2, n3; // Noise contributions from the four corners
    // Skew the input space to determine which simplex cell we're in
    var F3 = 1.0 / 3.0;
    var s = (xin + yin + zin) * F3; // Very nice and simple skew factor for 3D
    var i = Math.floor(xin + s);
    var j = Math.floor(yin + s);
    var k = Math.floor(zin + s);
    var G3 = 1.0 / 6.0; // Very nice and simple unskew factor, too
    var t = (i + j + k) * G3;
    var X0 = i - t; // Unskew the cell origin back to (x,y,z) space
    var Y0 = j - t;
    var Z0 = k - t;
    var x0 = xin - X0; // The x,y,z distances from the cell origin
    var y0 = yin - Y0;
    var z0 = zin - Z0;
    // For the 3D case, the simplex shape is a slightly irregular tetrahedron.
    // Determine which simplex we are in.
    var i1, j1, k1; // Offsets for second corner of simplex in (i,j,k) coords
    var i2, j2, k2; // Offsets for third corner of simplex in (i,j,k) coords
    if (x0 >= y0) {
      if (y0 >= z0) { i1 = 1; j1 = 0; k1 = 0; i2 = 1; j2 = 1; k2 = 0; } // X Y Z order
      else if (x0 >= z0) { i1 = 1; j1 = 0; k1 = 0; i2 = 1; j2 = 0; k2 = 1; } // X Z Y order
      else { i1 = 0; j1 = 0; k1 = 1; i2 = 1; j2 = 0; k2 = 1; } // Z X Y order
    }
    else { // x0<y0
      if (y0 < z0) { i1 = 0; j1 = 0; k1 = 1; i2 = 0; j2 = 1; k2 = 1; } // Z Y X order
      else if (x0 < z0) { i1 = 0; j1 = 1; k1 = 0; i2 = 0; j2 = 1; k2 = 1; } // Y Z X order
      else { i1 = 0; j1 = 1; k1 = 0; i2 = 1; j2 = 1; k2 = 0; } // Y X Z order
    }
    // A step of (1,0,0) in (i,j,k) means a step of (1-c,-c,-c) in (x,y,z),
    // a step of (0,1,0) in (i,j,k) means a step of (-c,1-c,-c) in (x,y,z), and
    // a step of (0,0,1) in (i,j,k) means a step of (-c,-c,1-c) in (x,y,z), where
    // c = 1/6.
    var x1 = x0 - i1 + G3; // Offsets for second corner in (x,y,z) coords
    var y1 = y0 - j1 + G3;
    var z1 = z0 - k1 + G3;
    var x2 = x0 - i2 + 2.0 * G3; // Offsets for third corner in (x,y,z) coords
    var y2 = y0 - j2 + 2.0 * G3;
    var z2 = z0 - k2 + 2.0 * G3;
    var x3 = x0 - 1.0 + 3.0 * G3; // Offsets for last corner in (x,y,z) coords
    var y3 = y0 - 1.0 + 3.0 * G3;
    var z3 = z0 - 1.0 + 3.0 * G3;
    // Work out the hashed gradient indices of the four simplex corners
    var ii = i & 255;
    var jj = j & 255;
    var kk = k & 255;
    var gi0 = this.perm[ii + this.perm[jj + this.perm[kk]]] % 12;
    var gi1 = this.perm[ii + i1 + this.perm[jj + j1 + this.perm[kk + k1]]] % 12;
    var gi2 = this.perm[ii + i2 + this.perm[jj + j2 + this.perm[kk + k2]]] % 12;
    var gi3 = this.perm[ii + 1 + this.perm[jj + 1 + this.perm[kk + 1]]] % 12;
    // Calculate the contribution from the four corners
    var t0 = 0.6 - x0 * x0 - y0 * y0 - z0 * z0;
    if (t0 < 0) n0 = 0.0;
    else {
      t0 *= t0;
      n0 = t0 * t0 * this.dot(this.grad3[gi0], x0, y0, z0);
    }
    var t1 = 0.6 - x1 * x1 - y1 * y1 - z1 * z1;
    if (t1 < 0) n1 = 0.0;
    else {
      t1 *= t1;
      n1 = t1 * t1 * this.dot(this.grad3[gi1], x1, y1, z1);
    }
    var t2 = 0.6 - x2 * x2 - y2 * y2 - z2 * z2;
    if (t2 < 0) n2 = 0.0;
    else {
      t2 *= t2;
      n2 = t2 * t2 * this.dot(this.grad3[gi2], x2, y2, z2);
    }
    var t3 = 0.6 - x3 * x3 - y3 * y3 - z3 * z3;
    if (t3 < 0) n3 = 0.0;
    else {
      t3 *= t3;
      n3 = t3 * t3 * this.dot(this.grad3[gi3], x3, y3, z3);
    }
    // Add contributions from each corner to get the final noise value.
    // The result is scaled to stay just inside [-1,1]
    return 32.0 * (n0 + n1 + n2 + n3);
  };

  // Classic Perlin noise, 3D version
  //----------------------------------------------------------------------------//

  var ClassicalNoise = function (r) { // Classic Perlin noise in 3D, for comparison
    if (r == undefined) r = Math;
    this.grad3 = [[1, 1, 0], [-1, 1, 0], [1, -1, 0], [-1, -1, 0],
    [1, 0, 1], [-1, 0, 1], [1, 0, -1], [-1, 0, -1],
    [0, 1, 1], [0, -1, 1], [0, 1, -1], [0, -1, -1]];
    this.p = [];
    for (var i = 0; i < 256; i++) {
      this.p[i] = Math.floor(r.random() * 256);
    }
    // To remove the need for index wrapping, double the permutation table length
    this.perm = [];
    for (var i = 0; i < 512; i++) {
      this.perm[i] = this.p[i & 255];
    }
  };

  ClassicalNoise.prototype.dot = function (g, x, y, z) {
    return g[0] * x + g[1] * y + g[2] * z;
  };

  ClassicalNoise.prototype.mix = function (a, b, t) {
    return (1.0 - t) * a + t * b;
  };

  ClassicalNoise.prototype.fade = function (t) {
    return t * t * t * (t * (t * 6.0 - 15.0) + 10.0);
  };

  ClassicalNoise.prototype.noise = function (x, y, z) {
    // Find unit grid cell containing point
    var X = Math.floor(x);
    var Y = Math.floor(y);
    var Z = Math.floor(z);

    // Get relative xyz coordinates of point within that cell
    x = x - X;
    y = y - Y;
    z = z - Z;

    // Wrap the integer cells at 255 (smaller integer period can be introduced here)
    X = X & 255;
    Y = Y & 255;
    Z = Z & 255;

    // Calculate a set of eight hashed gradient indices
    var gi000 = this.perm[X + this.perm[Y + this.perm[Z]]] % 12;
    var gi001 = this.perm[X + this.perm[Y + this.perm[Z + 1]]] % 12;
    var gi010 = this.perm[X + this.perm[Y + 1 + this.perm[Z]]] % 12;
    var gi011 = this.perm[X + this.perm[Y + 1 + this.perm[Z + 1]]] % 12;
    var gi100 = this.perm[X + 1 + this.perm[Y + this.perm[Z]]] % 12;
    var gi101 = this.perm[X + 1 + this.perm[Y + this.perm[Z + 1]]] % 12;
    var gi110 = this.perm[X + 1 + this.perm[Y + 1 + this.perm[Z]]] % 12;
    var gi111 = this.perm[X + 1 + this.perm[Y + 1 + this.perm[Z + 1]]] % 12;

    // The gradients of each corner are now:
    // g000 = grad3[gi000];
    // g001 = grad3[gi001];
    // g010 = grad3[gi010];
    // g011 = grad3[gi011];
    // g100 = grad3[gi100];
    // g101 = grad3[gi101];
    // g110 = grad3[gi110];
    // g111 = grad3[gi111];
    // Calculate noise contributions from each of the eight corners
    var n000 = this.dot(this.grad3[gi000], x, y, z);
    var n100 = this.dot(this.grad3[gi100], x - 1, y, z);
    var n010 = this.dot(this.grad3[gi010], x, y - 1, z);
    var n110 = this.dot(this.grad3[gi110], x - 1, y - 1, z);
    var n001 = this.dot(this.grad3[gi001], x, y, z - 1);
    var n101 = this.dot(this.grad3[gi101], x - 1, y, z - 1);
    var n011 = this.dot(this.grad3[gi011], x, y - 1, z - 1);
    var n111 = this.dot(this.grad3[gi111], x - 1, y - 1, z - 1);
    // Compute the fade curve value for each of x, y, z
    var u = this.fade(x);
    var v = this.fade(y);
    var w = this.fade(z);
    // Interpolate along x the contributions from each of the corners
    var nx00 = this.mix(n000, n100, u);
    var nx01 = this.mix(n001, n101, u);
    var nx10 = this.mix(n010, n110, u);
    var nx11 = this.mix(n011, n111, u);
    // Interpolate the four results along y
    var nxy0 = this.mix(nx00, nx10, v);
    var nxy1 = this.mix(nx01, nx11, v);
    // Interpolate the two last results along z
    var nxyz = this.mix(nxy0, nxy1, w);

    return nxyz;
  };


  //----------------------------------------------------------------------------//


  var rand = {};
  rand.random = new Alea(seed);
  var noise = new ClassicalNoise(rand);

  this.noise = function (x, y, z) {
    return 0.5 * noise.noise(x, y, z) + 0.5;
  }
}