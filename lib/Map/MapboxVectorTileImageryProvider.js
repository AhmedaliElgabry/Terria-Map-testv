"use strict";

import i18next from "i18next";
import when from "terriajs-cesium/Source/ThirdParty/when";
/*global require*/
var computeRingWindingOrder = require("../Map/computeRingWindingOrder");
var WebMercatorTilingScheme = require("terriajs-cesium/Source/Core/WebMercatorTilingScheme")
  .default;
var GeographicTilingScheme = require("terriajs-cesium/Source/Core/GeographicTilingScheme")
  .default;
var Rectangle = require("terriajs-cesium/Source/Core/Rectangle").default;
var CesiumEvent = require("terriajs-cesium/Source/Core/Event").default;
var defined = require("terriajs-cesium/Source/Core/defined").default;
var VectorTile = require("@mapbox/vector-tile").VectorTile;
var Protobuf = require("pbf");
var Point = require("@mapbox/point-geometry");
var loadArrayBuffer = require("../Core/loadArrayBuffer");
var defaultValue = require("terriajs-cesium/Source/Core/defaultValue").default;
var DeveloperError = require("terriajs-cesium/Source/Core/DeveloperError")
  .default;
var URITemplate = require("urijs/src/URITemplate");
var Cartographic = require("terriajs-cesium/Source/Core/Cartographic").default;
var Cartesian2 = require("terriajs-cesium/Source/Core/Cartesian2").default;
var BoundingRectangle = require("terriajs-cesium/Source/Core/BoundingRectangle")
  .default;
var Intersect = require("terriajs-cesium/Source/Core/Intersect").default;
var WindingOrder = require("terriajs-cesium/Source/Core/WindingOrder").default;
var CesiumMath = require("terriajs-cesium/Source/Core/Math").default;

var POLYGON_FEATURE = 3; // feature.type == 3 for polygon features

var MapboxVectorTileImageryProvider = function(options) {
  this._uriTemplate = new URITemplate(options.url);

  if (typeof options.layerName !== "string") {
    throw new DeveloperError(
      i18next.t("map.mapboxVectorTileImageryProvider.requireLayerName")
    );
  }
  this._layerName = options.layerName;

  this._subdomains = defaultValue(options.subdomains, []);

  if (!(options.styleFunc instanceof Function)) {
    throw new DeveloperError(
      i18next.t("map.mapboxVectorTileImageryProvider.requireStyles")
    );
  }
  this._styleFunc = options.styleFunc;
  if (options.srs == "EPSG:3857") {
    this._srs = "EPSG:900913";
    this._tilingScheme = new WebMercatorTilingScheme();
  } else if (options.srs == "EPSG:4326") {
    this._srs = "EPSG:4326";
    this._tilingScheme = new GeographicTilingScheme();
  }

  this._tileWidth = 256;
  this._tileHeight = 256;

  this._minimumLevel = defaultValue(options.minimumZoom, 0);
  this._maximumLevel = defaultValue(options.maximumZoom, Infinity);
  this._maximumNativeLevel = defaultValue(
    options.maximumNativeZoom,
    this._maximumLevel
  );

  this._rectangle = defined(options.rectangle)
    ? Rectangle.intersection(options.rectangle, this._tilingScheme.rectangle)
    : this._tilingScheme.rectangle;
  this._uniqueIdProp = options.uniqueIdProp;
  this._featureInfoFunc = options.featureInfoFunc;
  //this._featurePicking = options.featurePicking;

  // Check the number of tiles at the minimum level.  If it's more than four,
  // throw an exception, because starting at the higher minimum
  // level will cause too many tiles to be downloaded and rendered.
  var swTile = this._tilingScheme.positionToTileXY(
    Rectangle.southwest(this._rectangle),
    this._minimumLevel
  );
  var neTile = this._tilingScheme.positionToTileXY(
    Rectangle.northeast(this._rectangle),
    this._minimumLevel
  );
  var tileCount =
    (Math.abs(neTile.x - swTile.x) + 1) * (Math.abs(neTile.y - swTile.y) + 1);
  if (tileCount > 4) {
    throw new DeveloperError(
      i18next.t("map.mapboxVectorTileImageryProvider.moreThanFourTiles", {
        tileCount: tileCount
      })
    );
  }

  this._errorEvent = new CesiumEvent();

  this._ready = true;
};

Object.defineProperties(MapboxVectorTileImageryProvider.prototype, {
  url: {
    get: function() {
      return this._uriTemplate.expression;
    }
  },

  tileWidth: {
    get: function() {
      return this._tileWidth;
    }
  },

  tileHeight: {
    get: function() {
      return this._tileHeight;
    }
  },

  maximumLevel: {
    get: function() {
      return this._maximumLevel;
    }
  },

  minimumLevel: {
    get: function() {
      return this._minimumLevel;
    }
  },

  tilingScheme: {
    get: function() {
      return this._tilingScheme;
    }
  },

  rectangle: {
    get: function() {
      return this._rectangle;
    }
  },

  errorEvent: {
    get: function() {
      return this._errorEvent;
    }
  },

  ready: {
    get: function() {
      return this._ready;
    }
  },

  hasAlphaChannel: {
    get: function() {
      return true;
    }
  }
});

MapboxVectorTileImageryProvider.prototype._getSubdomain = function(
  x,
  y,
  level
) {
  if (this._subdomains.length === 0) {
    return undefined;
  } else {
    var index = (x + y + level) % this._subdomains.length;
    return this._subdomains[index];
  }
};

MapboxVectorTileImageryProvider.prototype._buildImageUrl = function(
  x,
  y,
  level,
  srs
) {
  return this._uriTemplate.expand({
    z: level,
    srs: srs,
    x: x,
    y: y,
    s: this._getSubdomain(x, y, level)
  });
};

MapboxVectorTileImageryProvider.prototype.requestImage = function(x, y, level) {
  var canvas = document.createElement("canvas");
  canvas.width = this._tileWidth;
  canvas.height = this._tileHeight;
  return this._requestImage(x, y, level, canvas);
};

MapboxVectorTileImageryProvider.prototype._requestImage = function(
  x,
  y,
  level,
  canvas
) {
  var requestedTile = {
    x: x,
    y: y,
    level: level
  };
  var nativeTile; // The level, x & y of the tile used to draw the requestedTile
  // Check whether to use a native tile or overzoom the largest native tile
  if (level > this._maximumNativeLevel) {
    // Determine which native tile to use
    var levelDelta = level - this._maximumNativeLevel;
    nativeTile = {
      x: x >> levelDelta,
      y: y >> levelDelta,
      level: this._maximumNativeLevel
    };
  } else {
    nativeTile = requestedTile;
  }

  var that = this;
  var url = this._buildImageUrl(
    nativeTile.x,
    nativeTile.y,
    nativeTile.level,
    this._srs
  );

  return loadArrayBuffer(url).then(function(data) {
    return that._drawTile(
      requestedTile,
      nativeTile,
      new VectorTile(new Protobuf(data)),
      canvas
    );
  });
};

// Use x,y,level vector tile to produce imagery for newX,newY,newLevel
function overzoomGeometry(rings, nativeTile, newExtent, newTile) {
  var diffZ = newTile.level - nativeTile.level;
  if (diffZ === 0) {
    return rings;
  } else {
    var newRings = [];
    // (offsetX, offsetY) is the (0,0) of the new tile
    var offsetX = newExtent * (newTile.x - (nativeTile.x << diffZ));
    var offsetY = newExtent * (newTile.y - (nativeTile.y << diffZ));
    for (var i = 0; i < rings.length; i++) {
      var ring = [];
      for (var i2 = 0; i2 < rings[i].length; i2++) {
        ring.push(rings[i][i2].sub(new Point(offsetX, offsetY)));
      }
      newRings.push(ring);
    }
    return newRings;
  }
}

MapboxVectorTileImageryProvider.prototype._drawTile = function(
  requestedTile,
  nativeTile,
  tile,
  canvas
) {
  var layer = tile.layers[this._layerName];
  if (!defined(layer)) {
    return canvas; // return blank canvas for blank tile
  }

  var context = canvas.getContext("2d");
  context.strokeStyle = "black";
  context.lineWidth = 1;

  var pos;

  var extentFactor = canvas.width / layer.extent; // Vector tile works with extent [0, 4095], but canvas is only [0,255]

  // Features
  for (var i = 0; i < layer.length; i++) {
    var feature = layer.feature(i);
    if (feature.type === POLYGON_FEATURE) {
      var style = this._styleFunc(feature.properties[this._uniqueIdProp]);
      if (!style) continue;
      context.fillStyle = style.fillStyle;
      context.strokeStyle = style.strokeStyle;
      context.lineWidth = style.lineWidth;
      context.lineJoin = style.lineJoin;
      context.beginPath();
      var coordinates;
      if (nativeTile.level !== requestedTile.level) {
        // Overzoom feature
        var bbox = feature.bbox(); // [w, s, e, n] bounding box
        var featureRect = new BoundingRectangle(
          bbox[0],
          bbox[1],
          bbox[2] - bbox[0],
          bbox[3] - bbox[1]
        );
        var levelDelta = requestedTile.level - nativeTile.level;
        var size = layer.extent >> levelDelta;
        if (size < 16) {
          // Tile has less less detail than 16x16
          throw new DeveloperError(
            i18next.t("map.mapboxVectorTileImageryProvider.maxLevelError")
          );
        }
        var x1 = size * (requestedTile.x - (nativeTile.x << levelDelta)); //
        var y1 = size * (requestedTile.y - (nativeTile.y << levelDelta));
        var tileRect = new BoundingRectangle(x1, y1, size, size);
        if (
          BoundingRectangle.intersect(featureRect, tileRect) ===
          Intersect.OUTSIDE
        ) {
          continue;
        }
        extentFactor = canvas.width / size;
        coordinates = overzoomGeometry(
          feature.loadGeometry(),
          nativeTile,
          size,
          requestedTile
        );
      } else {
        coordinates = feature.loadGeometry();
      }

      // Polygon rings
      for (var i2 = 0; i2 < coordinates.length; i2++) {
        pos = coordinates[i2][0];
        context.moveTo(pos.x * extentFactor, pos.y * extentFactor);

        // Polygon ring points
        for (var j = 1; j < coordinates[i2].length; j++) {
          pos = coordinates[i2][j];
          context.lineTo(pos.x * extentFactor, pos.y * extentFactor);
        }
      }
      context.stroke();
      context.fill();
    } else {
      console.log(
        "Unexpected geometry type: " +
          feature.type +
          " in region map on tile " +
          [requestedTile.level, requestedTile.x, requestedTile.y].join("/")
      );
    }
  }
  return canvas;
};

function isExteriorRing(ring) {
  // Normally an exterior ring would be clockwise but because these coordinates are in "canvas space" the ys are inverted
  // hence check for counter-clockwise ring
  const windingOrder = computeRingWindingOrder(ring);
  return windingOrder === WindingOrder.COUNTER_CLOCKWISE;
}

// Adapted from npm package "point-in-polygon" by James Halliday
// Licence included in LICENSE.md
function inside(point, vs) {
  // ray-casting algorithm based on
  // http://www.ecse.rpi.edu/Homepages/wrf/Research/Short_Notes/pnpoly.html

  var x = point.x,
    y = point.y;

  var inside = false;
  for (var i = 0, j = vs.length - 1; i < vs.length; j = i++) {
    var xi = vs[i].x,
      yi = vs[i].y;
    var xj = vs[j].x,
      yj = vs[j].y;

    var intersect =
      yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }

  return inside;
}

// According to the Mapbox Vector Tile specifications, a polygon consists of one exterior ring followed by 0 or more interior rings. Therefore:
// for each ring:
//   if point in ring:
//     for each interior ring (following the exterior ring):
//       check point in interior ring
//     if point not in any interior rings, feature is clicked
function isFeatureClicked(rings, point) {
  for (var i = 0; i < rings.length; i++) {
    if (inside(point, rings[i])) {
      // Point is in an exterior ring
      // Check whether point is in any interior rings
      var inInteriorRing = false;
      while (i + 1 < rings.length && !isExteriorRing(rings[i + 1])) {
        i++;
        if (!inInteriorRing && inside(point, rings[i])) {
          inInteriorRing = true;
          // Don't break. Still need to iterate over the rest of the interior rings but don't do point-in-polygon tests on those
        }
      }
      // Point is in exterior ring, but not in any interior ring. Therefore point is in the feature region
      if (!inInteriorRing) {
        return true;
      }
    }
  }
  return false;
}

MapboxVectorTileImageryProvider.prototype.pickFeatures = function(
  x,
  y,
  level,
  longitude,
  latitude
) {
  var nativeTile;
  var levelDelta;
  var requestedTile = {
    x: x,
    y: y,
    level: level
  };
  // Check whether to use a native tile or overzoom the largest native tile
  if (level > this._maximumNativeLevel) {
    // Determine which native tile to use
    levelDelta = level - this._maximumNativeLevel;
    nativeTile = {
      x: x >> levelDelta,
      y: y >> levelDelta,
      level: this._maximumNativeLevel
    };
  } else {
    nativeTile = {
      x: x,
      y: y,
      level: level
    };
  }
  var srs = this._srs;
  var that = this;
  var url = this._buildImageUrl(
    nativeTile.x,
    nativeTile.y,
    nativeTile.level,
    srs
  );

  return loadArrayBuffer(url).then(function(data) {
    var layer = new VectorTile(new Protobuf(data)).layers[that._layerName];

    if (!defined(layer)) {
      return []; // return empty list of features for empty tile
    }

    var vt_range = [0, (layer.extent >> levelDelta) - 1];

    var boundRect = that._tilingScheme.tileXYToNativeRectangle(x, y, level);
    var x_range = [boundRect.west, boundRect.east];
    var y_range = [boundRect.north, boundRect.south];

    var mapForMercatorTilingScheme = function(
      pos,
      in_x_range,
      in_y_range,
      out_x_range,
      out_y_range
    ) {
      var offset = new Cartesian2();
      Cartesian2.subtract(
        pos,
        new Cartesian2(in_x_range[0], in_y_range[0]),
        offset
      ); // Offset of point from bottom left corner of bounding box
      var scale = new Cartesian2(
        (out_x_range[1] - out_x_range[0]) / (in_x_range[1] - in_x_range[0]),
        (out_y_range[1] - out_y_range[0]) / (in_y_range[1] - in_y_range[0])
      );
      return Cartesian2.add(
        Cartesian2.multiplyComponents(offset, scale, new Cartesian2()),
        new Cartesian2(out_x_range[0], out_y_range[0]),
        new Cartesian2()
      );
    };

    var mapForGeographicTilingScheme = function(
      pos,
      in_x_range,
      in_y_range,
      out_x_range,
      out_y_range
    ) {
      var offset = new Cartesian2();
      var subtractFromPos = Cartesian2.fromCartesian3(
        that._tilingScheme.projection.project(
          new Cartographic(
            CesiumMath.toRadians(in_x_range[0]),
            CesiumMath.toRadians(in_y_range[0])
          )
        )
      );

      Cartesian2.subtract(pos, subtractFromPos, offset); // Offset of point from bottom left corner of bounding box

      var rightMostPoint = Cartesian2.fromCartesian3(
        that._tilingScheme.projection.project(
          new Cartographic(
            CesiumMath.toRadians(in_x_range[1]),
            CesiumMath.toRadians(in_y_range[0])
          )
        )
      );

      var leftMostPoint = Cartesian2.fromCartesian3(
        that._tilingScheme.projection.project(
          new Cartographic(
            CesiumMath.toRadians(in_x_range[0]),
            CesiumMath.toRadians(in_y_range[0])
          )
        )
      );

      var topMostPoint = Cartesian2.fromCartesian3(
        that._tilingScheme.projection.project(
          new Cartographic(
            CesiumMath.toRadians(in_x_range[0]),
            CesiumMath.toRadians(in_y_range[0])
          )
        )
      );

      var bottomMostPoint = Cartesian2.fromCartesian3(
        that._tilingScheme.projection.project(
          new Cartographic(
            CesiumMath.toRadians(in_x_range[0]),
            CesiumMath.toRadians(in_y_range[1])
          )
        )
      );

      var scale = new Cartesian2(
        (out_x_range[1] - out_x_range[0]) /
          (rightMostPoint.x - leftMostPoint.x),
        (out_y_range[1] - out_y_range[0]) / (bottomMostPoint.y - topMostPoint.y)
      );

      return Cartesian2.add(
        Cartesian2.multiplyComponents(offset, scale, new Cartesian2()),
        new Cartesian2(out_x_range[0], out_y_range[0]),
        new Cartesian2()
      );
    };

    var pos = Cartesian2.fromCartesian3(
      that._tilingScheme.projection.project(
        new Cartographic(longitude, latitude)
      )
    );

    if (that._tilingScheme instanceof GeographicTilingScheme) {
      pos = mapForGeographicTilingScheme(
        pos,
        x_range,
        y_range,
        vt_range,
        vt_range
      );
    } else {
      pos = mapForMercatorTilingScheme(
        pos,
        x_range,
        y_range,
        vt_range,
        vt_range
      );
    }
    var point = new Point(pos.x, pos.y);

    var features = [];
    for (var i = 0; i < layer.length; i++) {
      var feature = layer.feature(i);
      if (
        feature.type === POLYGON_FEATURE &&
        isFeatureClicked(
          overzoomGeometry(
            feature.loadGeometry(),
            nativeTile,
            layer.extent >> levelDelta,
            requestedTile
          ),
          point
        )
      ) {
        var featureInfo = that._featureInfoFunc(feature);
        if (defined(featureInfo)) {
          features.push(featureInfo);
        }
      }
    }

    return features;
  });
};

MapboxVectorTileImageryProvider.prototype.pickFeaturesByAttribute = function(
  key,
  value,
  tilebox
) {
  var promises = [];
  for (let x = tilebox.x - 1; x < tilebox.x + 1; x++) {
    for (let y = tilebox.y - 1; y < tilebox.y + 1; y++) {
      try {
        var promise = pickFeaturesByAttribute.call(
          this,
          x,
          y,
          tilebox.level,
          key,
          value
        );
        promises.push(promise);
      } catch (err) {}
    }
  }

  return Promise.all(promises.filter(value => defined(value))).then(values => {
    return values.filter(val => defined(val)).flat();
  });
};

function pickFeaturesByAttribute(x, y, z, key, value, featureId = null) {
  var that = this;
  var srs = this._srs;
  var url = this._buildImageUrl(x, y, z, srs);

  return loadArrayBuffer(url).then(
    function(data) {
      var layer = new VectorTile(new Protobuf(data)).layers[that._layerName];

      if (!defined(layer)) {
        return []; // return empty list of features for empty tile
      }

      const filter = feature => {
        if (feature.type !== POLYGON_FEATURE) return false;

        if (key) {
          return (
            feature.properties[key]?.toString().toLowerCase() ==
            value.toLowerCase()
          );
        }

        if (featureId) {
          return featureId === feature.data.id;
        }

        return Object.values(feature.properties)
          .map(v => v.toString().toLowerCase())
          .includes(value.toLowerCase());
      };

      for (var i = 0; i < layer.length; i++) {
        var feature = layer.feature(i);

        if (filter(feature)) {
          var featureInfo = that._featureInfoFunc(feature);

          if (defined(featureInfo)) {
            return [featureInfo];
          }
        }
      }

      return null;
    },
    err => {
      throw err;
    }
  );
}
MapboxVectorTileImageryProvider.prototype.createHighlightImageryProvider = function(
  terria,
  regionUniqueID
) {
  var that = this;
  var styleFunc = function(FID) {
    if (regionUniqueID === FID) {
      // No fill, but same style border as the regions, just thicker
      var regionStyling = that._styleFunc(FID);
      if (defined(regionStyling)) {
        regionStyling.fillStyle = "rgba(0,0,0,0)";
        regionStyling.lineJoin = "round";
        regionStyling.lineWidth = Math.floor(
          1.5 * defaultValue(regionStyling.lineWidth, 1) + 1
        );
        return regionStyling;
      }
    }

    return undefined;
  };
  var imageryProvider = new MapboxVectorTileImageryProvider({
    url: this._uriTemplate.expression,
    layerName: this._layerName,
    subdomains: this._subdomains,
    rectangle: this._rectangle,
    srs: terria.activeProjection.srs,
    minimumZoom: this._minimumLevel,
    maximumNativeZoom: this._maximumNativeLevel,
    maximumZoom: this._maximumLevel,
    uniqueIdProp: this._uniqueIdProp,
    styleFunc: styleFunc
  });
  imageryProvider.pickFeatures = function() {
    return undefined;
  }; // Turn off feature picking
  return imageryProvider;
};

MapboxVectorTileImageryProvider.prototype.createMaskImageryProvider = function(
  terria,
  regionUniqueID
) {
  const that = this;
  const maskStyleFunc = function(FID) {
    const regionStyling = that._styleFunc(FID);

    // The area of interest will be transparent
    if (regionUniqueID === FID) {
      if (defined(regionStyling)) {
        regionStyling.fillStyle = "rgba(0,0,0,0)";
        regionStyling.strokeStyle = "rgba(0,0,0,0)";
        regionStyling.lineJoin = "round";
        regionStyling.lineWidth = 0;
        return regionStyling;
      }

      return undefined;
    }

    // The rest of the vector tiles are given some opacity to create a mask
    if (defined(regionStyling)) {
      regionStyling.fillStyle = "rgba(0, 0, 0, 0.5)";
      regionStyling.strokeStyle = "rgba(0,0,0,0)";
      regionStyling.lineJoin = "round";
      regionStyling.lineWidth = 0;
      return regionStyling;
    }

    return undefined;
  };

  const imageryProvider = new MapboxVectorTileImageryProvider({
    url: this._uriTemplate.expression,
    layerName: this._layerName,
    subdomains: this._subdomains,
    srs: terria.activeProjection.srs,
    rectangle: this._rectangle,
    minimumZoom: this._minimumLevel,
    maximumNativeZoom: this._maximumNativeLevel,
    maximumZoom: this._maximumLevel,
    uniqueIdProp: this._uniqueIdProp,
    styleFunc: maskStyleFunc,
    featureInfoFunc: () => undefined, // Turn off feature picking,
    pickFeatures: () => undefined
  });

  return imageryProvider;
};

module.exports = MapboxVectorTileImageryProvider;
