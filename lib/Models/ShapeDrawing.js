import Cartographic from "terriajs-cesium/Source/Core/Cartographic";
import EllipsoidGeodesic from "terriajs-cesium/Source/Core/EllipsoidGeodesic";
import CesiumMath from "terriajs-cesium/Source/Core/Math";
import Ellipsoid from "terriajs-cesium/Source/Core/Ellipsoid";

/**
 * List of pre-defined polygons
 */
export const Shapes = {
  Polygon: "",
  Square: "square",
  Rectange: "rectangle",
  Circle: "circle",
  Ellipse: "ellipse",
  Pentagon: "pentagon",
  Hexagon: "hexagon",
  Octagon: "octagon",
  Triangle: "triangle",
  Line: "line"
};

/**
 *
 * @param {string} shape The type of polygon
 * @returns {number} The number of points the user needs to mark to draw the given shape type
 */
export function GetPointsNeeded(shape) {
  if (shape == Shapes.Ellipse || shape == Shapes.Triangle) return 3;
  return 2;
}

/**
 *
 * @param {string} shapeType
 * @param {Array<Cartographic>} userPoints
 * @returns {Array<Cartographic>} The list of vertices of the new shape
 */
export function GetNewShape(shapeType, userPoints) {
  if (shapeType == Shapes.Circle)
    return GetRegularPolygon(userPoints[0], userPoints[1], 60);
  if (shapeType == Shapes.Pentagon)
    return GetRegularPolygon(userPoints[0], userPoints[1], 5);
  if (shapeType == Shapes.Hexagon)
    return GetRegularPolygon(userPoints[0], userPoints[1], 6);
  if (shapeType == Shapes.Rectange)
    return GetRectangle(userPoints[0], userPoints[1]);
  if (shapeType == Shapes.Square)
    return GetSquare(userPoints[0], userPoints[1]);
  if (shapeType == Shapes.Triangle)
    return GetRightAngledTriangle(userPoints[0], userPoints[1]);
  if (shapeType == Shapes.Line) return GetLine(userPoints[0], userPoints[1]);
}

/**
 * Returns a circle constructed as a polygon from the given center and radius
 * @param {Array<number>} center An array of two numbers: longitude and latitude
 * @param {number} radius Radius in meters
 * @param {number} sides Number of sides to construct the polygon with
 * @param {boolean?} isRightHandRule whether to construct the circle clock or anticlock-wise
 * @returns A Geo-json in the format {type: "Polygon", coordinates: []}
 */
function CircleToPolygon(center, radius, sides, isRightHandRule) {
  var n = sides;
  var bearing = 0;
  var direction = isRightHandRule ? -1 : 1;
  const earthRadius = Ellipsoid.WGS84.maximumRadius; // This should always be 6378137 meters

  var start = CesiumMath.toRadians(bearing);
  var coordinates = [];
  for (var i = 0; i < n; ++i) {
    coordinates.push(
      offset(
        center,
        radius,
        earthRadius,
        start + (direction * 2 * Math.PI * -i) / n
      )
    );
  }
  coordinates.push(coordinates[0]);

  return {
    type: "Polygon",
    coordinates: [coordinates]
  };
}

function offset(c1, distance, earthRadius, bearing) {
  var lat1 = CesiumMath.toRadians(c1[1]);
  var lon1 = CesiumMath.toRadians(c1[0]);
  var dByR = distance / earthRadius;
  var lat = Math.asin(
    Math.sin(lat1) * Math.cos(dByR) +
      Math.cos(lat1) * Math.sin(dByR) * Math.cos(bearing)
  );
  var lon =
    lon1 +
    Math.atan2(
      Math.sin(bearing) * Math.sin(dByR) * Math.cos(lat1),
      Math.cos(dByR) - Math.sin(lat1) * Math.sin(lat)
    );
  return [CesiumMath.toDegrees(lon), CesiumMath.toDegrees(lat)];
}

/**
 * Gets all vertices for a polygon with the given center, edge point and number of sides.
 * @param {Cartographic} centerPoint A cartographic point representing the center of the polygon
 * @param {Cartographic} endPoint A cartographic point representing an edge in the polygon
 * @param {number} sides The number of sides for the polygon
 * @returns {Array<Cartographic>} The cartographic points used to plot the resulting polygon
 */
export function GetRegularPolygon(centerPoint, endPoint, sides) {
  const center = [
    (centerPoint.longitude * 180) / Math.PI,
    (centerPoint.latitude * 180) / Math.PI
  ];
  const geodesic = new EllipsoidGeodesic(
    new Cartographic(centerPoint.longitude, centerPoint.latitude),
    new Cartographic(endPoint.longitude, endPoint.latitude)
  );
  let polyCoords = CircleToPolygon(center, geodesic.surfaceDistance, sides)
    .coordinates[0];
  return polyCoords.map(
    pt => new Cartographic((pt[0] * Math.PI) / 180, (pt[1] * Math.PI) / 180, 0)
  );
}

/**
 * Gets all vertices for a right angled triangle with the given two vertices
 * @param {Cartographic} startPoint A cartographic point representing one edge of the triangle
 * @param {Cartographic} endPoint A cartographic point representing one edge of the triangle
 * @returns {Array<Cartographic>} The cartographic points used to plot the resulting polygon
 */
export function GetRightAngledTriangle(startPoint, endPoint) {
  const startx = startPoint.latitude;
  const starty = startPoint.longitude;
  const endx = endPoint.latitude;
  const endy = endPoint.longitude;

  return [
    new Cartographic(endy, startx, 0),
    new Cartographic(endy, endx, 0),
    new Cartographic(starty, startx, 0)
  ];
}

/**
 * Gets both vertices for a line with the given two vertices
 * @param {Cartographic} startPoint A cartographic point representing one edge of the line
 * @param {Cartographic} endPoint A cartographic point representing one edge of the line
 * @returns {Array<Cartographic>} The cartographic points used to plot the resulting line
 */
export function GetLine(p1, p2) {
  const startx = p1.latitude;
  const starty = p1.longitude;
  const endx = p2.latitude;
  const endy = p2.longitude;

  return [new Cartographic(starty, startx, 0), new Cartographic(endy, endx, 0)];
}

/**
 * Gets all vertices for a rectangle with the given two vertices
 * @param {Cartographic} topLeftVertex A cartographic point representing the top-left edge of the rectangle
 * @param {Cartographic} bottomRightVertex A cartographic point representing the bottom-right edge of the rectangle
 * @returns {Array<Cartographic>} The cartographic points used to plot the resulting polygon
 */
export function GetRectangle(topLeftVertex, bottomRightVertex) {
  const startx = topLeftVertex.latitude;
  const starty = topLeftVertex.longitude;
  const endx = bottomRightVertex.latitude;
  const endy = bottomRightVertex.longitude;

  return [
    new Cartographic(endy, startx, 0),
    new Cartographic(endy, endx, 0),
    new Cartographic(starty, endx, 0),
    new Cartographic(starty, startx, 0)
  ];
}

/**
 * Gets all vertices for a square with the given two vertices
 * @param {Cartographic} topLeftVertex A cartographic point representing the top-left edge of the rectangle
 * @param {Cartographic} bottomRightVertex A cartographic point representing the bottom-right edge of the rectangle
 * @returns {Array<Cartographic>} The cartographic points used to plot the resulting polygon
 */
export function GetSquare(topLeftVertex, bottomRightVertex) {
  const startx = topLeftVertex.latitude;
  const starty = topLeftVertex.longitude;
  const endx = bottomRightVertex.latitude;
  const endy = bottomRightVertex.longitude;
  const h = endy - starty;
  const sign = (endx - startx) / Math.abs(startx - endx);

  return [
    new Cartographic(endy, startx, 0),
    new Cartographic(endy, startx + sign * Math.abs(h), 0),
    new Cartographic(starty, startx + sign * Math.abs(h), 0),
    new Cartographic(starty, startx, 0)
  ];
}
