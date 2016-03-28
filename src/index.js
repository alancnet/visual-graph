'use strict';
const matter = require('matter-js');
window.matter = matter;

const Engine = matter.Engine;
const World = matter.World;
const Bodies = matter.Bodies;
const Common = matter.Common;
const Events = matter.Events;
const Body = matter.Body;
const Mouse = matter.Mouse;
const MouseConstraint = matter.MouseConstraint;
const Constraint = matter.Constraint;
const Composite = matter.Composite;
const Vector = matter.Vector;
const Bounds = matter.Bounds;
function center(bounds) {
  return {
    x: bounds.max.x / 2 + bounds.min.x / 2,
    y: bounds.max.y / 2 + bounds.min.y / 2
  }
};

const MindMapRender = {
  create() {
    const render = matter.Render.create();
    const world = render.world;
    render.world = function() {
      const ret = world.apply(this, arguments);
      console.log('world', arguments, ret);
      return ret;
    }
  }
}

const T = {
  id: "Symbol('id')",
  label: "Symbol('label')"
};

class MindMap {
  constructor(element) {
    this.vertices = {};
    this.edges = [];
    this.element = element;
    this.engine = Engine.create(element);
    this.engine.world.gravity.y = 0;
    this.runtime = Engine.run(this.engine);
    this.runtime.enabled = false;
    this.mouse = Mouse.create(element);
    this.mouseConstraint = MouseConstraint.create(this.engine);
    this.engine.render.options.hasBounds = true;
    this.originalBounds = this.engine.render.bounds;
    World.add(this.engine.world, this.mouseConstraint);
    for (var key in this) window[key] = this[key];

    Events.on(this.engine.render, 'beforeRender', ev => {
      this.normalize();
      this.updateBounds();
    })
    Events.on(this.engine.render, 'afterRender', ev => {
      this.normalize();
      this.renderNames();
      this.explosion();
    });
  }
  readArguments() {
    const ret = {};
    for (var i = 0; i < arguments.length; i += 2) {
      ret[arguments[i]] = arguments[i + 1];
    }
    return ret;
  }
  addVertex() {
    const props = this.readArguments.apply(this, arguments);
    console.log(props);
    if (!props.hasOwnProperty(T.id)) throw new Error("T.id required for vertex.");
    if (this.vertices.hasOwnProperty(props[T.id])) throw new Error(`T.id (${props[T.id]}) is not unique.`);
    const pos = center(this.engine.render.bounds);
    const shape = Bodies.rectangle(
      pos.x + Math.random(),
      pos.y + Math.random(),
      100,
      20,
      {
        collisionFilter: {
          group: -1
        }
      }
    );
    shape.props = props;
    shape.edges = [];
    this.vertices[props[T.id]] = shape;
    World.add(this.engine.world, [shape]);
    shape.addEdge = (verb, target) => {
      const edgeProps = this.readArguments.apply(this, arguments);
      const edge = Constraint.create({
        bodyA: shape,
        bodyB: target,
        label: verb,
        pointA: undefined,
        pointB: undefined,
        length: 100
      });
      edge.stiffness = 0.0002
      edge.props = edgeProps;
      shape.edges.push(edge);
      World.add(this.engine.world, edge);
      return edge;
    }
    return shape;
  }

  setFontFillSize(context, font, size, text) {
    const loop = (lower, upper, i) => {
      const pivot = upper / 2 + lower / 2;
      const getWidth = () => {
        context.font = `${pivot}px ${font}`;
        const textSize = context.measureText(text);
        return textSize.width;
      }
      if (i == 10) {
        return { width: getWidth(), height: pivot };
      } else {
        if (pivot > size.height || getWidth() > size.width) {
          // Size is too big
          return loop(lower, pivot, i + 1);
        } else {
          // Size is too small
          return loop(pivot, upper, i + 1);
        }
      }
    }
    return loop(4, 500, 0);
  }

  normalize() {
    this.engine.world.bodies.forEach(body => Body.setAngle(body, 0));
  }
  updateBounds() {
    const outerBounds = Bounds.create(
      this.engine.world.bodies
        .map(x => [x.bounds.min, x.bounds.max])
        .reduce((a, b) => a.concat(b))
    );
    const centerOfMass = {
      x: (outerBounds.min.x / 2 + outerBounds.max.x / 2 -
        this.originalBounds.max.x / 2) / 1000,
      y: (outerBounds.min.y / 2 + outerBounds.max.y / 2 -
        this.originalBounds.max.y / 2) / 1000
    };
    // this.engine.render.bounds = {
    //   min: Vector.add(this.originalBounds.min, centerOfMass),
    //   max: Vector.add(this.originalBounds.max, centerOfMass)
    // };
    this.engine.world.bodies.forEach(body => {
      body.position = Vector.sub(body.position, centerOfMass);
    })
  }
  explosion() {
    for (var key in this.vertices) {
      const vertex = this.vertices[key];
      for (var otherKey in this.vertices) {
        const other = this.vertices[otherKey];
        if (vertex != other) {
          let delta = Vector.sub(vertex.position, other.position);
          Body.applyForce(
            vertex,
            vertex.position,
            Vector.mult(
              Vector.normalise(delta),
              0.0000001 * (Math.max(0, 300 - Vector.magnitude(delta)))
            )
          );
          //console.log(Vector.normalise(delta))
        }
      }
    }
  };
  renderNames() {
      const engine = this.engine;
      const bodies = engine.world.bodies;
      const c = this.engine.render.context;
      var i, j;

      for (i = 0; i < bodies.length; i++) {
          if (!bodies[i].render.visible) {
              continue;
          }

          const body = bodies[i];
          body.name = body.props.name || "Unknown";
          const size = {
            width: body.bounds.max.x - body.bounds.min.x,
            height: body.bounds.max.y - body.bounds.min.y
          };
          const textSize = this.setFontFillSize(c, "Arial", size, body.name);
          //c.font = "12px Arial";
          c.fillStyle = 'rgba(255,255,255,0.5)';
          c.fillText(
            body.name,
            body.bounds.min.x + size.width / 2 - textSize.width / 2,
            body.bounds.min.y + textSize.height / 2 + size.height / 2
          );
      }
  }

  run() {
    this.runtime.enabled = true;
  }
}


document.addEventListener('DOMContentLoaded', () => {
  const graph = new MindMap(document.body);
  window.graph = graph;
  window.T = T;
  let marko = graph.addVertex(T.label, "person", T.id, 1, "name", "marko", "age", 29);
  let vadas = graph.addVertex(T.label, "person", T.id, 2, "name", "vadas", "age", 27);
  let lop = graph.addVertex(T.label, "software", T.id, 3, "name", "lop", "lang", "java");
  let josh = graph.addVertex(T.label, "person", T.id, 4, "name", "josh", "age", 32);
  let ripple = graph.addVertex(T.label, "software", T.id, 5, "name", "ripple", "lang", "java");
  let peter = graph.addVertex(T.label, "person", T.id, 6, "name", "peter", "age", 35);
  marko.addEdge("knows", vadas, T.id, 7, "weight", 0.5);
  marko.addEdge("knows", josh, T.id, 8, "weight", 1.0);
  marko.addEdge("created", lop, T.id, 9, "weight", 0.4);
  josh.addEdge("created", ripple, T.id, 10, "weight", 1.0);
  josh.addEdge("created", lop, T.id, 11, "weight", 0.4);
  peter.addEdge("created", lop, T.id, 12, "weight", 0.2);

  graph.run();
})
