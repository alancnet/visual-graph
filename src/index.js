'use strict';
const _ = require('lodash');
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
const Vertices = matter.Vertices;
const Bounds = matter.Bounds;
const util = require('./util');
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
  constructor(element, options) {
    this.options = _.assign({
      fontName: 'Arial',
      minFontSize: 4,
      maxFontSize: 500,
      arrowShape: [ // Δ with origin at the top.
        { x: 0, y: 0 },
        { x: Math.sin(4/6*Math.PI*2), y: Math.cos(4/6*Math.PI*2) },
        { x: Math.sin(5/6*Math.PI*2), y: Math.cos(5/6*Math.PI*2) }
      ],
      arrowSize: 7,
      guide: 'clockwise',
      edgeLength: 125
    }, options);
    this.vertices = [];
    this.vertexMap = {};
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
      this.renderEdges();
      this.explosion();
    });
  }
  option(elem, name) {
    return (elem && elem.hasOwnProperty(name)) ? elem[name] : this.options[name];
  }
  addVertex() {
    const props = util.readArguments.apply(this, arguments);
    console.log(props);
    if (!props.hasOwnProperty(T.id)) throw new Error("T.id required for vertex.");
    if (this.vertexMap.hasOwnProperty(props[T.id])) throw new Error(`T.id (${props[T.id]}) is not unique.`);
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
    shape.shape = shape.vertices.map(v => Vector.sub(v, shape.position));
    shape.props = props;
    shape.edges = [];
    this.vertexMap[props[T.id]] = shape;
    this.vertices.push(shape);
    World.add(this.engine.world, [shape]);
    shape.addEdge = (verb, target, options) => {
      options = options || {};
      const edgeProps = util.readArguments.apply(this, arguments);
      const edge = Constraint.create({
        bodyA: shape,
        bodyB: target,
        label: verb,
        pointA: undefined,
        pointB: undefined,
        length: this.option(options, 'edgeLength'),
        render: {
          visible: false
        }
      });
      edge.stiffness = 0.0002
      edge.props = edgeProps;
      shape.edges.push(edge);
      World.add(this.engine.world, edge);
      return edge;
    }
    return shape;
  }

  normalize() {
    this.engine.world.bodies.forEach(body => {
      //Body.setAngle(body, 0);
      // Restore original shape
      body.vertices = body.shape
        .map(v =>
          Vector.add(
            v, body.position
          )
        );
    });
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
    this.vertices.forEach(vertex => {
      this.vertices.forEach(other => {
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
      })
    })
  };
  renderEdges() {
    this.vertices.forEach(vertex => {
      vertex.edges.forEach(edge => {
          const outgoing = vertex.edges.filter(e => e.bodyB === edge.bodyB);
          const incoming = edge.bodyB.edges.filter(e => e.bodyB === vertex);
          const ratio = (1 + outgoing.indexOf(edge)) / outgoing.length; // 0 -> 1
          const line = (incoming.length > 0 || outgoing.length > 1) ?
            util.drawClockwiseLineBetweenBodies(this.engine.render.context, edge.bodyA, edge.bodyB, ratio, ratio) :
            util.drawLineBetweenBodies(this.engine.render.context, edge.bodyA, edge.bodyB)
          const angle = Vector.angle(line.c || line.a, line.b);
          const arrow =
            Vertices.translate(
              Vertices.scale(
                Vertices.rotate(_.cloneDeep(this.option(edge, 'arrowShape')), angle, {x: 0, y: 0}),
                this.option(edge, 'arrowSize'),
                this.option(edge, 'arrowSize'),
                {x: 0, y: 0}
              ),
              line.b,
              false
            );
          util.fillShape(this.engine.render.context, arrow);
        }
      );
    })
  }
  renderNames() {
    const c = this.engine.render.context;
    this.engine.world.bodies.filter(body => body.render.visible).forEach(body => {
      const name = body.props.name || "Unknown";
      const bounds = Bounds.create(body.vertices);
      const size = Vector.sub(bounds.max, bounds.min);
      const textSize = util.setFontFillSize(
        c,
        this.option(body, 'fontName'),
        size,
        this.option(body, 'minFontSize'),
        this.option(body, 'maxFontSize'),
        name
      );
      c.fillStyle = 'rgba(255,255,255,0.5)';
      c.fillText(
        name,
        bounds.min.x + size.x / 2 - textSize.width / 2,
        bounds.min.y + textSize.height / 2 + size.y / 2
      );
    })
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
  vadas.addEdge("knows", marko, T.id, 13, "weight", 0.5);
  vadas.addEdge("knows", marko, T.id, 14, "weight", 0.5);
  vadas.addEdge("knows", marko, T.id, 15, "weight", 0.5);
  marko.addEdge("knows", josh, T.id, 8, "weight", 1.0);
  marko.addEdge("created", lop, T.id, 9, "weight", 0.4);
  josh.addEdge("created", ripple, T.id, 10, "weight", 1.0);
  josh.addEdge("created", lop, T.id, 11, "weight", 0.4);
  josh.addEdge("created", lop, T.id, 16, "weight", 0.4);
  peter.addEdge("created", lop, T.id, 12, "weight", 0.2);
  ripple.addEdge("knows", josh, T.id, 17, "weight", 0.3);
  graph.run();
})
