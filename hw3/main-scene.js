import { tiny, defs } from './assignment-3-resources.js';
const { Vec, Mat, Mat4, Color, Shape, Shader,
    Scene, Canvas_Widget, Code_Widget, Text_Widget } = tiny;
const { Cube, Subdivision_Sphere, Transforms_Sandbox_Base } = defs;

const Main_Scene = defs.Transforms_Sandbox =
    class Transforms_Sandbox extends Transforms_Sandbox_Base {
        constructor() {
            super();
            this.numDragonFlies = 25;
            this.boids = [];
            let i;
            for (i = 0; i < this.numDragonFlies; i++) {
                this.boids.push(new Boid())
            }
        }
        display(context, program_state) {
            super.display(context, program_state);
            const t = this.t = program_state.animation_time / 1000;
            const p = this.p = (1 - Math.cos(program_state.animation_time * Math.PI / 500)) / 2;
            let model_transform = Mat4.identity();
            if (this.swarm) {
                program_state.set_camera(Mat4.translation([0, 0, -10]));
                let i;
                for (i = 0; i < this.numDragonFlies; i++) {
                    model_transform = Mat4.identity().times(Mat4.scale([0.05, 0.05, 0.05]))
                        .times(Mat4.translation(this.boids[i].position))
                        .times(Mat4.inverse(Mat4.look_at(this.boids[i].velocity, Vec.of(0, 0, 0), Vec.of(0, 1, 0))));
                    this.draw_dragonfly(context, program_state, model_transform);
                }
                for (i = 0; i < this.numDragonFlies; i++) {
                    this.boids[i].run(this.boids, program_state.animation_delta_time / 100);
                }
            } else if (this.hover) {
                this.draw_dragonfly(context, program_state, model_transform);
            } else {
                model_transform = model_transform.times(Mat4.rotation(t, [0, 1, 0]))
                    .times(Mat4.scale([0.1, 0.1, 0.1]))
                    .times(Mat4.translation([-40, 10 * p, 5]));
                this.draw_dragonfly(context, program_state, model_transform);
            }
        }
        draw_dragonfly(context, program_state, model_transform) {
            const blue = Color.of(0, 0, 1, 1), yellow = Color.of(1, 1, 0, 1), orange = Color.of(1, 140 / 255, 0, 1), glass = Color.of(0.5, 0.5, 1, 0.3);
            const p = this.p;
            this.shapes.ball.draw(context, program_state, model_transform.times(Mat4.translation([1.5, 0, 0])), this.materials.metal.override(blue));
            this.shapes.ball.draw(context, program_state, model_transform.times(Mat4.translation([-1.5, 0, 0])), this.materials.metal.override(blue));
            model_transform = model_transform.times(Mat4.scale([0.5, 0.5, 0.5]));
            this.shapes.box.draw(context, program_state, model_transform, this.materials.plastic.override(yellow));
            let i;
            for (i = 0; i < 10; i++) {
                model_transform = model_transform.times(Mat4.translation([0, -1, -1]))
                    .times(Mat4.rotation(0.2 * p, [-1, 0, 0]))
                    .times(Mat4.translation([0, 1, -1]));
                this.shapes.box.draw(context, program_state, model_transform, this.materials.plastic.override(orange));
                if (i == 1 || i == 2) {
                    let leftWing = model_transform.times(Mat4.translation([-1, 1, 0]))
                        .times(Mat4.rotation(p - 0.5, [0, 0, 1]))
                        .times(Mat4.scale([10, 1 / 4, 1]))
                        .times(Mat4.translation([-1, 1, 0]));
                    this.shapes.box.draw(context, program_state, leftWing, this.materials.plastic.override(glass));
                    let rightWing = model_transform.times(Mat4.translation([1, 1, 0]))
                        .times(Mat4.rotation(p - 0.5, [0, 0, -1]))
                        .times(Mat4.scale([10, 1 / 4, 1]))
                        .times(Mat4.translation([1, 1, 0]));
                    this.shapes.box.draw(context, program_state, rightWing, this.materials.plastic.override(glass));
                }
                if (1 <= i && i <= 3) {
                    let leftLeg = model_transform.times(Mat4.translation([-1, -1, 0]))
                        .times(Mat4.rotation(p / 6, [0, 0, -1]))
                        .times(Mat4.scale([1 / 3, 2, 1 / 3]))
                        .times(Mat4.translation([-1, -1, 0]));
                    this.shapes.box.draw(context, program_state, leftLeg, this.materials.plastic.override(yellow));
                    leftLeg = leftLeg.times(Mat4.translation([1, -1, 0]))
                        .times(Mat4.scale([3, 1 / 2, 3]))
                        .times(Mat4.rotation(p / 6, [0, 0, 1]))
                        .times(Mat4.scale([1 / 3, 2, 1 / 3]))
                        .times(Mat4.translation([-1, -1, 0]));
                    this.shapes.box.draw(context, program_state, leftLeg, this.materials.plastic.override(yellow));
                    let rightLeg = model_transform.times(Mat4.translation([1, -1, 0]))
                        .times(Mat4.rotation(p / 6, [0, 0, 1]))
                        .times(Mat4.scale([1 / 3, 2, 1 / 3]))
                        .times(Mat4.translation([1, -1, 0]));
                    this.shapes.box.draw(context, program_state, rightLeg, this.materials.plastic.override(yellow));
                    rightLeg = rightLeg.times(Mat4.translation([-1, -1, 0]))
                        .times(Mat4.scale([3, 1 / 2, 3]))
                        .times(Mat4.rotation(p / 6, [0, 0, -1]))
                        .times(Mat4.scale([1 / 3, 2, 1 / 3]))
                        .times(Mat4.translation([1, -1, 0]));
                    this.shapes.box.draw(context, program_state, rightLeg, this.materials.plastic.override(yellow));
                }
            }
        }
    }


class Boid {
    constructor() {
        this.acceleration = Vec.of(0, 0, 0);
        this.velocity = Vec.of(0, 0, 0).randomized(1);
        this.position = Vec.of(0, 0, 0);
        this.maxPosition = 80;
        this.desiredseparation = 20.0;
        this.neighbordist = 40;
        this.maxspeed = 3;
        this.maxforce = 0.05;
    }

    run(boids, delta) {
        this.velocity = this.velocity.plus(this.separate(boids).times(1.5))
            .plus(this.align(boids).times(1.0))
            .plus(this.cohesion(boids).times(1.0));
        if (this.velocity.norm() > this.maxspeed) {
            this.velocity = this.velocity.times(this.maxspeed / this.velocity.norm());
        }
        this.position = this.position.plus(this.velocity.times(delta));
        let i;
        for (i = 0; i < 3; i++) {
            if (this.position[i] > this.maxPosition) {
                this.position[i] = -this.maxPosition;
            }
            else if (this.position[i] < -this.maxPosition) {
                this.position[i] = this.maxPosition;
            }
        }
    }

    separate(boids) {
        let steer = Vec.of(0, 0, 0);
        let count = 0;
        for (let i = 0; i < boids.length; i++) {
            let d = this.position.minus(boids[i].position).norm();
            if ((d > 0) && (d < this.desiredseparation)) {
                let diff = this.position.minus(boids[i].position)
                    .normalized()
                    .times(1 / d);
                steer = steer.plus(diff);
                count++;
            }
        }
        if (count > 0) {
            steer = steer.times(1 / count);
        }
        if (steer.norm() > 0) {
            steer = steer.normalized()
                .times(this.maxspeed)
                .minus(this.velocity);
            if (steer.norm() > this.maxforce) {
                steer = steer.times(this.maxforce / steer.norm());
            }
        }
        return steer;
    }

    align(boids) {
        let sum = Vec.of(0, 0, 0);
        let count = 0;
        for (let i = 0; i < boids.length; i++) {
            let d = this.position.minus(boids[i].position).norm();
            if ((d > 0) && (d < this.neighbordist)) {
                sum = sum.plus(boids[i].velocity);
                count++;
            }
        }
        if (count > 0) {
            let steer = sum.times(1 / count)
                .normalized()
                .times(this.maxspeed)
                .minus(this.velocity);
            if (steer.norm() > this.maxforce) {
                steer = steer.times(this.maxforce / steer.norm());
            }
            return steer;
        } else {
            return Vec.of(0, 0, 0);
        }
    }

    cohesion(boids) {
        let sum = Vec.of(0, 0, 0);
        let count = 0;
        for (let i = 0; i < boids.length; i++) {
            let d = this.position.minus(boids[i].position).norm();
            if ((d > 0) && (d < this.neighbordist)) {
                sum = sum.plus(boids[i].position);
                count++;
            }
        }
        if (count > 0) {
            let steer = sum.times(1 / count)
                .minus(this.position)
                .normalized()
                .times(this.maxspeed)
                .minus(this.velocity);
            if (steer.norm() > this.maxforce) {
                steer = steer.times(this.maxforce / steer.norm());
            }
            return steer;
        } else {
            return Vec.of(0, 0, 0);
        }
    }
}

const Additional_Scenes = [];

export { Main_Scene, Additional_Scenes, Canvas_Widget, Code_Widget, Text_Widget, defs }