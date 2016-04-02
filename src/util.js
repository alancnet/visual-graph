'use strict';
const matter = require('matter-js');
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

function readArguments() {
  const ret = {};
  for (var i = 0; i < arguments.length; i += 2) {
    ret[arguments[i]] = arguments[i + 1];
  }
  return ret;
}


function setFontFillSize(context, font, size, text) {
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

function drawLineBetweenVertices(v1, v2) {
  const fullVector = Vector.sub(v2.position, v1.position)

}

function intersect(a, b) {
  const x1 = a.a.x, y1 = a.a.y, x2 = a.b.x, y2 = a.b.y,
        x3 = b.a.x, y3 = b.a.y, x4 = b.b.x, y4 = b.b.y;

  var a1, a2, b1, b2, c1, c2;
  var r1, r2 , r3, r4;
  var denom, offset, num;
  var x, y;
  // Compute a1, b1, c1, where line joining points 1 and 2
  // is "a1 x + b1 y + c1 = 0".
  a1 = y2 - y1;
  b1 = x1 - x2;
  c1 = (x2 * y1) - (x1 * y2);

  // Compute r3 and r4.
  r3 = ((a1 * x3) + (b1 * y3) + c1);
  r4 = ((a1 * x4) + (b1 * y4) + c1);

  // Check signs of r3 and r4. If both point 3 and point 4 lie on
  // same side of line 1, the line segments do not intersect.
  if ((r3 != 0) && (r4 != 0) && same_sign(r3, r4)){
    return null;
  }

  // Compute a2, b2, c2
  a2 = y4 - y3;
  b2 = x3 - x4;
  c2 = (x4 * y3) - (x3 * y4);

  // Compute r1 and r2
  r1 = (a2 * x1) + (b2 * y1) + c2;
  r2 = (a2 * x2) + (b2 * y2) + c2;

  // Check signs of r1 and r2. If both point 1 and point 2 lie
  // on same side of second line segment, the line segments do
  // not intersect.
  if ((r1 != 0) && (r2 != 0) && (same_sign(r1, r2))){
    return null;
  }

  //Line segments intersect: compute intersection point.
  denom = (a1 * b2) - (a2 * b1);

  if (denom == 0) {
    return null;
  }

  if (denom < 0){
    offset = -denom / 2;
  }
  else {
    offset = denom / 2 ;
  }

  // The denom/2 is to get rounding instead of truncating. It
  // is added or subtracted to the numerator, depending upon the
  // sign of the numerator.
  num = (b1 * c2) - (b2 * c1);
  if (num < 0){
    x = (num - offset) / denom;
  }
  else {
    x = (num + offset) / denom;
  }

  num = (a2 * c1) - (a1 * c2);
  if (num < 0){
    y = ( num - offset) / denom;
  }
  else {
    y = (num + offset) / denom;
  }

  return { x, y };
}
module.exports.readArguments = readArguments;
module.exports.setFontFillSize = setFontFillSize;
