"use strict";

import CesiumMath from "terriajs-cesium/Source/Core/Math";
import isCommonMobilePlatform from "../Core/isCommonMobilePlatform";
var MapInteractionMode = require("../Models/MapInteractionMode");
var DragPoints = require("../Map/DragPoints");
const {
  GetRegularPolygon,
  Shapes,
  GetRightAngledTriangle,
  GetRectangle,
  GetSquare,
  GetLine
} = require("./ShapeDrawing");

var DeveloperError = require("terriajs-cesium/Source/Core/DeveloperError")
  .default;
var defined = require("terriajs-cesium/Source/Core/defined").default;
var defaultValue = require("terriajs-cesium/Source/Core/defaultValue").default;
var Color = require("terriajs-cesium/Source/Core/Color").default;
var PolylineGlowMaterialProperty = require("terriajs-cesium/Source/DataSources/PolylineGlowMaterialProperty")
  .default;
var CustomDataSource = require("terriajs-cesium/Source/DataSources/CustomDataSource")
  .default;
var CallbackProperty = require("terriajs-cesium/Source/DataSources/CallbackProperty")
  .default;
var PolygonHierarchy = require("terriajs-cesium/Source/Core/PolygonHierarchy")
  .default;
var knockout = require("terriajs-cesium/Source/ThirdParty/knockout").default;
var Entity = require("terriajs-cesium/Source/DataSources/Entity.js").default;
var when = require("terriajs-cesium/Source/ThirdParty/when").default;
var Cartesian3 = require("terriajs-cesium/Source/Core/Cartesian3").default;
var Cartographic = require("terriajs-cesium/Source/Core/Cartographic").default;
var i18next = require("i18next").default;

/**
 * Callback for when a point is clicked.
 * @callback PointClickedCallback
 * @param {CustomDataSource} customDataSource Contains all point entities that user has selected so far
 */

/**
 * Callback for when a point is moved.
 * @callback PointMovedCallback
 * @param {CustomDataSource} customDataSource Contains all point entities that user has selected so far
 */

/**
 * Callback for when clean up is happening, i.e., for done or cancel.
 * @callback CleanUpCallback
 */

/**
 * Callback for when the dialog is displayed, to provide a custom message
 * @callback MakeDialogMessageCallback
 * @return {String} Message to add to dialog
 */

/**
 * For user drawings, which includes lines and/or a polygon
 *
 * @alias UserDrawing
 * @constructor
 *
 * @param {Object} options Object with the following properties:
 * @param {Terria} options.terria The Terria instance.
 * @param {ViewState} options.viewState The ViewState instance.
 * @param {String} [options.messageHeader='Draw on Map'] Heading for the dialog which pops up when in user drawing mode
 * @param {Bool}   [options.allowPolygon=true] Let the user click on first point to close loop
 * @param {PointClickedCallback} [options.onPointClicked] Way to subscribe to point clicks
 * @param {PointMovedCallback} [options.onPointMoved] Way to subscribe to point moves
 * @param {CleanUpCallback} [options.onCleanUp] Way to add own cleanup
 * @param {MakeDialogMessageCallback} [options.onMakeDialogMessage] Way to customise dialog message
 */
var UserDrawing = function(options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);
  if (!defined(options.terria)) {
    throw new DeveloperError(i18next.t("models.userDrawing.devError"));
  }

  /**
   * Text that appears at the top of the dialog when drawmode is active.
   * @type {String}
   * @default 'Draw on Map'
   */
  this.messageHeader = defaultValue(
    options.messageHeader,
    i18next.t("models.userDrawing.messageHeader")
  );

  /**
   * If true, user can click on first point to close the line, turning it into a polygon.
   * @type {Bool}
   * @default true
   */
  this.allowPolygon = defaultValue(options.allowPolygon, true);

  /**
   * If true, user is in analysis mode.
   * @type {Bool}
   * @default true
   */
  this.isAnalysis = defaultValue(options.isAnalysis, false);

  /**
   * Callback that occurs when point is clicked (may be added or removed). Function takes a CustomDataSource which is
   * a list of PointEntities.
   * @type {PointClickedCallback}
   * @default undefined
   */
  this.onPointClicked = options.onPointClicked;

  /**
   * Callback that occurs when point is moved. Function takes a CustomDataSource which is a list of PointEntities.
   * @type {PointMovedCallback}
   * @default undefined
   */
  this.onPointMoved = options.onPointMoved;

  /**
   * Callback that occurs on clean up, i.e. when drawing is done or cancelled.
   * @type {CleanUpCallback}
   * @default undefined
   */
  this.onCleanUp = options.onCleanUp;

  /**
   * Callback that occurs on analysis, i.e. when drawing is done or cancelled.
   * @type {AnalysisCallback}
   * @default undefined
   */
  this.onAnalysis = options.onAnalysis;

  /**
   * Callback that occurs when the dialog is redrawn, to add additional information to dialog.
   * @type {MakeDialogMessageCallback}
   * @default undefined
   */
  this.onMakeDialogMessage = options.onMakeDialogMessage;

  /**
   * Instance of Terria
   * @type {Terria}
   * @default undefined
   */
  this.terria = options.terria;

  /**
   * Instance of ViewState
   * @type {ViewState}
   * @default undefined
   */
  this.viewState = options.viewState;

  /**
   * Storage for points that will be drawn
   * @type {CustomDataSource}
   */
  this.pointEntities = new CustomDataSource(
    i18next.t("models.userDrawing.pointEntities")
  );

  /**
   * The current shape to be drawn
   * @type {string}
   */
  this.currentShape = Shapes.Polygon;

  /**
   * Whether to show a preview of the polygon to be drawn as the user moves the mouse pointer
   * @type {boolean}
   */
  this.enablePreview = false;

  this.previewBusy = false;

  /**
   * Storage for points that make up the preview polygon
   * @type {CustomDataSource}
   */
  this.previewPolygonPoints = new CustomDataSource("preview-polygon-points");

  /**
   * Storage for line that connects the points of the preview polygon
   * @type {CustomDataSource}
   */
  this.previewPolygonSides = new CustomDataSource("preview-polygon-sides");

  /**
   * Storage for line that connects the points, and polygon if the first and last point are the same
   * @type {CustomDataSource}
   */
  this.otherEntities = new CustomDataSource(
    i18next.t("models.userDrawing.otherEntities")
  );

  /**
   * Polygon that will be drawn if the user drawing is a closed shape
   * @type {Entity}
   */
  this.polygon = undefined;

  /**
   * Polygon that will be shown as a preview
   * @type {Entity}
   */
  this.previewPolygon = undefined;

  /**
   * Whether to interpret user clicks as drawing
   * @type {Bool}
   */
  this.inDrawMode = false;

  /**
   * Whether the first and last point in the user drawing are the same
   * @type {Bool}
   */
  this.closeLoop = false;

  this.mouseMovementListener = null;

  /**
   * SVG element for point drawn when user clicks.
   * http://stackoverflow.com/questions/24869733/how-to-draw-custom-dynamic-billboards-in-cesium-js
   */
  var svgDataDeclare = "data:image/svg+xml,";
  var svgPrefix =
    '<svg version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px" width="20px" height="20px" xml:space="preserve">';
  var svgCircle =
    '<circle cx="10" cy="10" r="5" stroke="rgb(0,170,215)" stroke-width="4" fill="white" /> ';
  var svgSuffix = "</svg>";
  var svgString = svgPrefix + svgCircle + svgSuffix;

  // create the cesium entity
  this.svgPoint = svgDataDeclare + svgString;

  // helper for dragging points around
  var that = this;
  this.dragHelper = new DragPoints(options.terria, function(customDataSource) {
    if (
      typeof that.onPointMoved === "function" &&
      that.currentShape == Shapes.Polygon
    ) {
      that.onPointMoved(customDataSource);
    }
    that._prepareToAddNewPoint();
  });
};

/**
 * Start interpreting user clicks as placing or removing points.
 */
UserDrawing.prototype.enterDrawMode = function(shape) {
  if (!shape) {
    shape = Shapes.Polygon;
  }
  if (shape != Shapes.Polygon && !isCommonMobilePlatform()) {
    this.enablePreview = true;
  }
  this.currentShape = shape;
  this.dragHelper.setUp();

  // If we have finished a polygon, don't allow more points to be drawn. In future, perhaps support multiple polygons.
  if (this.inDrawMode || this.closeLoop) {
    // Do nothing
    return;
  }

  this.inDrawMode = true;

  if (defined(this.terria.cesium)) {
    this.terria.cesium.viewer.canvas.setAttribute("style", "cursor: crosshair");
  } else if (defined(this.terria.leaflet)) {
    document
      .getElementById("cesiumContainer")
      .setAttribute("style", "cursor: crosshair");
  }

  // Cancel any feature picking already in progress and disable feature info requests.
  this.terria.pickedFeatures = undefined;
  this.terria.allowFeatureInfoRequests = false;
  var that = this;

  // Line will show up once user has drawn some points. Vertices of line are user points.
  this.otherEntities.entities.add({
    name: i18next.t("models.userDrawing.line"),
    polyline: {
      positions: new CallbackProperty(function(date, result) {
        var pos = that._getPointsForShape();
        if (that.closeLoop) {
          pos.push(pos[0]);
        }
        return pos;
      }, false),

      material: new PolylineGlowMaterialProperty({
        color: new Color(0.0, 0.0, 0.0, 0.1),
        glowPower: 0.25
      }),
      width: 20
    }
  });

  if (this.enablePreview) {
    // Line will show up once user starts drawing a polygon
    this.previewPolygonSides.entities.add({
      name: i18next.t("models.userDrawing.line"),
      polyline: {
        positions: new CallbackProperty(function(date, result) {
          var pos = that._getPointsForPreviewPolygon();
          if (that.closeLoop) {
            pos.push(pos[0]);
          }
          return pos;
        }, false),

        material: new PolylineGlowMaterialProperty({
          color: new Color(0.0, 0.0, 0.0, 0.1),
          glowPower: 0.25
        }),
        width: 20
      }
    });

    this.terria.dataSources.add(this.previewPolygonPoints);
    this.terria.dataSources.add(this.previewPolygonSides);
  }
  this.terria.dataSources.add(this.pointEntities);
  this.terria.dataSources.add(this.otherEntities);

  // Listen for user clicks on map
  const pickPointMode = new MapInteractionMode({
    message: this._getDialogMessage(),
    buttonText: this._getButtonText(),
    onCancel: function() {
      that.terria.mapInteractionModeStack.pop();
      if (
        that.isAnalysis &&
        that.closeLoop &&
        typeof that.onAnalysis === "function"
      ) {
        try {
          that.onAnalysis();
        } catch (err) {
          console.error("Failed to draw shape", err);
        }
      }
      that._cleanUp();
    }
  });
  this.terria.mapInteractionModeStack.push(pickPointMode);

  // Handle what happens when user picks a point
  knockout
    .getObservable(pickPointMode, "pickedFeatures")
    .subscribe(function(pickedFeatures) {
      when(pickedFeatures.allFeaturesAvailablePromise, function() {
        if (defined(pickedFeatures.pickPosition)) {
          var pickedPoint = pickedFeatures.pickPosition;
          prevPoint = pickedPoint;
          that._addPointToPointEntities(
            i18next.t("models.userDrawing.firstPoint"),
            pickedPoint
          );
          that._prepareToAddNewPoint();

          if (that.enablePreview) {
            that._addPointToPreviewPolygon(
              i18next.t("models.userDrawing.firstPoint"),
              pickedPoint
            );
            that._startListeningPointerMovement();
          }
        }
      });
    });
};

/**
 * Create the HTML message in the dialog box.
 * Example:
 *
 *     Measuring Tool
 *     373.45 km
 *     Click to add another point
 *
 * @private
 */
UserDrawing.prototype._getDialogMessage = function() {
  var message = "<strong>" + this.messageHeader + "</strong></br>";

  var innerMessage = "";
  if (typeof this.onMakeDialogMessage === "function") {
    innerMessage = this.onMakeDialogMessage();
  }
  if (innerMessage !== "") {
    message += innerMessage + "</br>";
  }

  if (this.pointEntities.entities.values.length > 0) {
    message +=
      "<i>" + i18next.t("models.userDrawing.clickToAddAnotherPoint") + "</i>";
  } else {
    message +=
      "<i>" + i18next.t("models.userDrawing.clickToAddFirstPoint") + "</i>";
  }
  // htmlToReactParser will fail if html doesn't have only one root element.
  return "<div>" + message + "</div>";
};

/**
 * Figure out the text for the dialog button.
 * @private
 */
UserDrawing.prototype._getButtonText = function() {
  var buttonText = i18next.t("models.userDrawing.btnCancel");

  if (this.pointEntities.entities.values.length >= 2 && !this.allowPolygon) {
    buttonText = i18next.t("models.userDrawing.btnDone");
  }
  if (
    this.pointEntities.entities.values.length >= 3 &&
    this.allowPolygon &&
    this.closeLoop
  ) {
    buttonText = i18next.t("models.userDrawing.btnDone");
  }
  return buttonText;
};

/**
 * User has finished or cancelled; restore initial state.
 * @private
 */
UserDrawing.prototype._cleanUp = function() {
  this.terria.dataSources.remove(this.pointEntities);
  this.pointEntities = new CustomDataSource(
    i18next.t("models.userDrawing.pointEntities")
  );
  this.terria.dataSources.remove(this.otherEntities);
  this.otherEntities = new CustomDataSource(
    i18next.t("models.userDrawing.otherEntities")
  );

  this.enablePreview = false;
  this.terria.dataSources.remove(this.previewPolygonSides);
  this.previewPolygonSides = new CustomDataSource(
    i18next.t("models.userDrawing.pointEntities")
  );
  this.terria.dataSources.remove(this.previewPolygonPoints);
  this.previewPolygonPoints = new CustomDataSource(
    i18next.t("models.userDrawing.otherEntities")
  );
  this._stopListeningPointerMovement();

  this.terria.allowFeatureInfoRequests = true;

  this.inDrawMode = false;
  this.closeLoop = false;

  // Return cursor to original state
  if (defined(this.terria.cesium)) {
    this.terria.cesium.viewer.canvas.setAttribute("style", "cursor: auto");
  } else if (defined(this.terria.leaflet)) {
    document
      .getElementById("cesiumContainer")
      .setAttribute("style", "cursor: auto");
  }

  // Allow client to clean up too
  if (typeof this.onCleanUp === "function") {
    this.onCleanUp();
  }
};

/**
 * Called after a point has been added, this updates the MapInteractionModeStack with a listener for another point.
 * @private
 */
UserDrawing.prototype._mapInteractionModeUpdate = function() {
  this.terria.mapInteractionModeStack.pop();
  var that = this;
  const pickPointMode = new MapInteractionMode({
    message: this._getDialogMessage(),
    buttonText: this._getButtonText(),
    onCancel: function() {
      that.terria.mapInteractionModeStack.pop();
      if (
        that.isAnalysis &&
        that.closeLoop &&
        that.pointEntities.entities.values.length >= 3 &&
        typeof that.onAnalysis === "function"
      ) {
        try {
          that.onAnalysis();
        } catch (err) {
          console.error("Failed to draw shape", err);
        }
      }
      that._cleanUp();
    }
  });
  this.terria.mapInteractionModeStack.push(pickPointMode);
  return pickPointMode;
};

var prevPoint = null;

/**
 * Called after a point has been added, prepares to add and draw another point,
 * as well as updating the dialog.
 * @private
 */
UserDrawing.prototype._prepareToAddNewPoint = function() {
  var pickPointMode = this._mapInteractionModeUpdate();
  var that = this;

  knockout
    .getObservable(pickPointMode, "pickedFeatures")
    .subscribe(function(pickedFeatures) {
      when(pickedFeatures.allFeaturesAvailablePromise, function() {
        if (defined(pickedFeatures.pickPosition)) {
          var pickedPoint = pickedFeatures.pickPosition;
          // If existing point was picked, _clickedExistingPoint handles that, and returns true.
          // getDragCount helps us determine if the point was actually dragged rather than clicked. If it was
          // dragged, we shouldn't treat it as a clicked-existing-point scenario.
          if (
            that.dragHelper.getDragCount() < 10 &&
            !that._clickedExistingPoint(pickedFeatures.features)
          ) {
            // No existing point was picked, so add a new point
            if (that.currentShape == Shapes.Polygon) {
              that._addPointToPointEntities(
                i18next.t("models.userDrawing.anotherPoint"),
                pickedPoint
              );
            } else {
              if (prevPoint == null) {
                prevPoint = pickedPoint;
              } else {
                that.AddNewShape("My Circle", prevPoint, pickedPoint);
                that._closeShape(pickedFeatures.features);
                prevPoint = null;
              }
            }
          } else {
            that.dragHelper.resetDragCount();
          }
          that._prepareToAddNewPoint();
        }
      });
    });
};

/**
 * Return a list of the coords for the user drawing
 * @return {Array} An array of coordinates for the user-drawn shape
 * @private
 */
UserDrawing.prototype._getPointsForShape = function() {
  if (defined(this.pointEntities.entities)) {
    var pos = [];
    for (var i = 0; i < this.pointEntities.entities.values.length; i++) {
      var obj = this.pointEntities.entities.values[i];
      if (defined(obj.position)) {
        var position = obj.position.getValue(this.terria.clock.currentTime);
        pos.push(position);
      }
    }
    return pos;
  }
};

/**
 * Return a list of the coords for the previewed polygon
 * @return {Array} An array of coordinates for the user-drawn shape
 * @private
 */
UserDrawing.prototype._getPointsForPreviewPolygon = function() {
  if (defined(this.previewPolygonPoints.entities)) {
    var pos = [];
    for (var i = 0; i < this.previewPolygonPoints.entities.values.length; i++) {
      var obj = this.previewPolygonPoints.entities.values[i];
      if (defined(obj.position)) {
        var position = obj.position.getValue(this.terria.clock.currentTime);
        pos.push(position);
      }
    }
    return pos;
  }
};

/**
 * Listen to mouse pointer movements
 */
UserDrawing.prototype._onMousePointerMove = function() {
  if (this.enablePreview) {
    if (this.previewBusy) return;
    this.previewBusy = true;
    const longStr = this.viewState.mouseCoords.longitude;
    const latStr = this.viewState.mouseCoords.latitude;
    let longitude = parseFloat(longStr.slice(0, -2));
    let latitude = parseFloat(latStr.slice(0, -2));
    if (longStr.indexOf("W") > -1) longitude = -longitude;
    if (latStr.indexOf("S") > -1) latitude = -latitude;
    const finalPosition = new Cartographic(longitude, latitude, 0);
    this.AddPreviewShape("preview-polygon", prevPoint, finalPosition);
    this.previewBusy = false;
  }
};

/**
 * Find out if user clicked an existing point and handle appropriately.
 * @param {PickedFeatures} features Feature/s that are under the point the user picked
 * @return {Bool} Whether user had clicked an existing point
 * @private
 */
UserDrawing.prototype._clickedExistingPoint = function(features) {
  var userClickedExistingPoint = false;

  if (features.length < 1) {
    return userClickedExistingPoint;
  }

  var that = this;

  features.forEach(feature => {
    var index = -1;
    for (var i = 0; i < this.pointEntities.entities.values.length; i++) {
      var pointFeature = this.pointEntities.entities.values[i];
      if (pointFeature.id === feature.id) {
        index = i;
        break;
      }
    }

    if (index === -1) {
      // Probably a layer or feature that has nothing to do with what we're drawing.
      return;
    } else if (index === 0 && !this.closeLoop && this.allowPolygon) {
      // Index is zero if it's the first point, meaning we have a closed shape
      this.polygon = this.otherEntities.entities.add({
        name: i18next.t("models.userDrawing.userPolygon"),
        polygon: {
          hierarchy: new CallbackProperty(function(date, result) {
            return new PolygonHierarchy(that._getPointsForShape());
          }, false),
          material: new Color(0.0, 0.666, 0.843, 0.25),
          outlineColor: new Color(1.0, 1.0, 1.0, 1.0),
          perPositionHeight: true
        }
      });
      this.closeLoop = true;
      // A point has not been added, but conceptually it has because the first point is now also the last point.
      if (typeof that.onPointClicked === "function") {
        that.onPointClicked(that.pointEntities);
      }
      userClickedExistingPoint = true;
      return;
    } else {
      // User clicked on a point that's not the end of the loop. Remove it.
      this.pointEntities.entities.removeById(feature.id);
      // If it gets down to 2 points, it should stop acting like a polygon.
      if (this.pointEntities.entities.values.length < 2 && this.closeLoop) {
        this.closeLoop = false;
        this.otherEntities.entities.remove(this.polygon);
      }
      // Also let client of UserDrawing know if a point has been removed.
      if (typeof that.onPointClicked === "function") {
        that.onPointClicked(that.pointEntities);
      }
      userClickedExistingPoint = true;
      return;
    }
  });
  return userClickedExistingPoint;
};

/**
 * Add new point to list of pointEntities
 * @param {String} name What to call new point
 * @param {Cartesian3} position Position of new point
 * @private
 */
UserDrawing.prototype._addPointToPointEntities = function(name, position) {
  var pointEntity = new Entity({
    name: name,
    position: position,
    billboard: {
      image: this.svgPoint
      /* eyeOffset: new Cartesian3(0.0, 0.0, -50.0) */
    }
  });
  this.pointEntities.entities.add(pointEntity);
  this.dragHelper.updateDraggableObjects(this.pointEntities);
  if (typeof this.onPointClicked === "function") {
    this.onPointClicked(this.pointEntities);
  }
};

/**
 * Add new point to list of preview polygon points
 * @param {String} name What to call new point
 * @param {Cartesian3} position Position of new point
 * @private
 */
UserDrawing.prototype._addPointToPreviewPolygon = function(name, position) {
  var pointEntity = new Entity({
    name: name,
    position: position,
    billboard: {
      image: this.svgPoint
      /* eyeOffset: new Cartesian3(0.0, 0.0, -50.0) */
    }
  });
  this.previewPolygonPoints.entities.add(pointEntity);
  this.dragHelper.updateDraggableObjects(this.previewPolygonPoints);
  if (typeof this.onPointClicked === "function") {
    this.onPointClicked(this.previewPolygonPoints);
  }
};

/**
 * Automatically close the drawn polygon
 * @param {PickedFeatures} features Feature/s that are under the point the user picked
 * @private
 */
UserDrawing.prototype._closeShape = function(features) {
  const that = this;
  this.polygon = this.otherEntities.entities.add({
    name: i18next.t("models.userDrawing.userPolygon"),
    polygon: {
      hierarchy: new CallbackProperty(function(date, result) {
        return new PolygonHierarchy(that._getPointsForShape());
      }, false),
      material: new Color(0.0, 0.666, 0.843, 0.25),
      outlineColor: new Color(1.0, 1.0, 1.0, 1.0),
      perPositionHeight: true
    }
  });
  this.closeLoop = true;
  if (typeof this.onPointClicked === "function") {
    this.onPointClicked(this.pointEntities);
  }
  if (this.enablePreview) {
    this.previewPolygonPoints.entities.removeAll();
    this.previewPolygonSides.entities.removeAll();
    this.enablePreview = false;
    this._stopListeningPointerMovement();
  }
  this.dragHelper.resetDragCount();
};

UserDrawing.prototype.AddNewShape = function(name, center, position) {
  if (this.currentShape == Shapes.Circle)
    this.AddRegularPolygon(name, center, position, 60);
  else if (this.currentShape == Shapes.Rectange)
    this.AddRectangle(name, center, position);
  else if (this.currentShape == Shapes.Square)
    this.AddSquare(name, center, position);
  else if (this.currentShape == Shapes.Pentagon)
    this.AddRegularPolygon(name, center, position, 5);
  else if (this.currentShape == Shapes.Hexagon)
    this.AddRegularPolygon(name, center, position, 6);
  else if (this.currentShape == Shapes.Octagon)
    this.AddRegularPolygon(name, center, position, 8);
  else if (this.currentShape == Shapes.Triangle)
    this.AddTriangle(name, center, position);
  else if (this.currentShape == Shapes.Line)
    this.AddLine(name, center, position);
};

UserDrawing.prototype.AddPreviewShape = function(name, point1, point2InCarto) {
  this.previewPolygonSides.entities.removeAll();
  this.previewPolygonPoints.entities.removeAll();

  point2InCarto = new Cartographic(
    CesiumMath.toRadians(point2InCarto.longitude), // / 57.29585145438306,
    CesiumMath.toRadians(point2InCarto.latitude), // / 57.29585145438306,
    0
  );

  if (this.currentShape == Shapes.Circle)
    this.AddPreviewRegularPolygon(name, point1, point2InCarto, 60);
  else if (this.currentShape == Shapes.Pentagon)
    this.AddPreviewRegularPolygon(name, point1, point2InCarto, 5);
  else if (this.currentShape == Shapes.Hexagon)
    this.AddPreviewRegularPolygon(name, point1, point2InCarto, 6);
  else if (this.currentShape == Shapes.Octagon)
    this.AddPreviewRegularPolygon(name, point1, point2InCarto, 8);
  else if (this.currentShape == Shapes.Rectange)
    this.AddPreviewRectangle(name, point1, point2InCarto);
  else if (this.currentShape == Shapes.Square)
    this.AddPreviewSquare(name, point1, point2InCarto);
  else if (this.currentShape == Shapes.Triangle)
    this.AddPreviewTriangle(name, point1, point2InCarto);
  else if (this.currentShape == Shapes.Line)
    this.AddPreviewLine(name, point1, point2InCarto);

  const that = this;
  this.previewPolygon = this.previewPolygonSides.entities.add({
    name: i18next.t("models.userDrawing.userPolygon"),
    polygon: {
      hierarchy: new CallbackProperty(function(date, result) {
        return new PolygonHierarchy(that._getPointsForPreviewPolygon());
      }, false),
      material: new Color(0.0, 0.666, 0.843, 0.25),
      outlineColor: new Color(1.0, 1.0, 1.0, 1.0),
      perPositionHeight: true
    }
  });
};

UserDrawing.prototype.AddSquare = function(name, center, position) {
  const startCarto = Cartographic.fromCartesian(center);
  const endCarto = Cartographic.fromCartesian(position);

  const vertices = GetSquare(startCarto, endCarto);
  for (const vertex of vertices) {
    this.pointEntities.entities.add(
      new Entity({
        name: name,
        position: Cartographic.toCartesian(vertex),
        billboard: {
          image: this.svgPoint,
          eyeOffset: new Cartesian3(0.0, 0.0, -50.0)
        }
      })
    );
  }
};

UserDrawing.prototype.AddPreviewSquare = function(name, center, position) {
  let startCarto = Cartographic.fromCartesian(center);
  let endCarto = position;

  const vertices = GetSquare(startCarto, endCarto);
  for (const vertex of vertices) {
    this.previewPolygonPoints.entities.add(
      new Entity({
        name: name,
        position: Cartographic.toCartesian(vertex),
        billboard: {
          image: this.svgPoint,
          eyeOffset: new Cartesian3(0.0, 0.0, -50.0)
        }
      })
    );
  }
};

UserDrawing.prototype.AddRectangle = function(name, topLeft, bottomRight) {
  const startCarto = Cartographic.fromCartesian(topLeft);
  const endCarto = Cartographic.fromCartesian(bottomRight);

  const vertices = GetRectangle(startCarto, endCarto);
  for (const vertex of vertices) {
    this.pointEntities.entities.add(
      new Entity({
        name: name,
        position: Cartographic.toCartesian(vertex),
        billboard: {
          image: this.svgPoint,
          eyeOffset: new Cartesian3(0.0, 0.0, -50.0)
        }
      })
    );
  }
};

UserDrawing.prototype.AddLine = function(name, topLeft, bottomRight) {
  const startCarto = Cartographic.fromCartesian(topLeft);
  const endCarto = Cartographic.fromCartesian(bottomRight);

  const vertices = GetLine(startCarto, endCarto);
  for (const vertex of vertices) {
    this.pointEntities.entities.add(
      new Entity({
        name: name,
        position: Cartographic.toCartesian(vertex),
        billboard: {
          image: this.svgPoint,
          eyeOffset: new Cartesian3(0.0, 0.0, -50.0)
        }
      })
    );
  }
};

UserDrawing.prototype.AddPreviewRectangle = function(name, center, position) {
  let startCarto = Cartographic.fromCartesian(center);
  let endCarto = position;

  const vertices = GetRectangle(startCarto, endCarto);
  for (const vertex of vertices) {
    this.previewPolygonPoints.entities.add(
      new Entity({
        name: name,
        position: Cartographic.toCartesian(vertex),
        billboard: {
          image: this.svgPoint,
          eyeOffset: new Cartesian3(0.0, 0.0, -50.0)
        }
      })
    );
  }
};

UserDrawing.prototype.AddPreviewLine = function(name, center, position) {
  let startCarto = Cartographic.fromCartesian(center);
  let endCarto = position;

  const vertices = GetLine(startCarto, endCarto);
  for (const vertex of vertices) {
    this.previewPolygonPoints.entities.add(
      new Entity({
        name: name,
        position: Cartographic.toCartesian(vertex),
        billboard: {
          image: this.svgPoint,
          eyeOffset: new Cartesian3(0.0, 0.0, -50.0)
        }
      })
    );
  }
};

UserDrawing.prototype.AddTriangle = function(name, center, position) {
  let startCarto = Cartographic.fromCartesian(center);
  let endCarto = Cartographic.fromCartesian(position);

  const vertices = GetRightAngledTriangle(startCarto, endCarto);
  for (const vertex of vertices) {
    this.pointEntities.entities.add(
      new Entity({
        name,
        position: Cartographic.toCartesian(vertex),
        billboard: {
          image: this.svgPoint,
          eyeOffset: new Cartesian3(0.0, 0.0, -50.0)
        }
      })
    );
  }
};

UserDrawing.prototype.AddPreviewTriangle = function(name, center, position) {
  let startCarto = Cartographic.fromCartesian(center);
  let endCarto = position;

  const vertices = GetRightAngledTriangle(startCarto, endCarto);
  for (const vertex of vertices) {
    this.previewPolygonPoints.entities.add(
      new Entity({
        name,
        position: Cartographic.toCartesian(vertex),
        billboard: {
          image: this.svgPoint,
          eyeOffset: new Cartesian3(0.0, 0.0, -50.0)
        }
      })
    );
  }
};

UserDrawing.prototype.AddRegularPolygon = function(
  name,
  center,
  position,
  sides
) {
  if (sides < 3) {
    console.error("Invalid sides for regular polygon: ", sides);
    return;
  }

  let centerCarto = Cartographic.fromCartesian(center);
  let edgeCarto = Cartographic.fromCartesian(position);
  const vertices = GetRegularPolygon(centerCarto, edgeCarto, sides);

  this.pointEntities.entities.removeAll();

  for (const vertex of vertices) {
    this.pointEntities.entities.add(
      new Entity({
        name,
        position: Cartographic.toCartesian(vertex),
        billboard: {
          image: this.svgPoint,
          eyeOffset: new Cartesian3(0.0, 0.0, -50.0)
        }
      })
    );
  }
};

UserDrawing.prototype.AddPreviewRegularPolygon = function(
  name,
  center,
  position,
  sides
) {
  if (sides < 4) {
    console.error("Invalid sides for regular polygon: ", sides);
    return;
  }
  let centerCarto = Cartographic.fromCartesian(center);
  let edgeCarto = position;

  const polygonPoints = GetRegularPolygon(centerCarto, edgeCarto, sides);

  for (const point of polygonPoints) {
    this.previewPolygonPoints.entities.add(
      new Entity({
        name,
        position: Cartographic.toCartesian(point),
        billboard: {
          image: this.svgPoint,
          eyeOffset: new Cartesian3(0.0, 0.0, -50.0)
        }
      })
    );
  }
};

UserDrawing.prototype._startListeningPointerMovement = function() {
  this.mouseMovementListener = this._onMousePointerMove.bind(this);
  window.addEventListener("mousemove", this.mouseMovementListener);
};

UserDrawing.prototype._stopListeningPointerMovement = function() {
  window.removeEventListener("mousemove", this.mouseMovementListener);
};

module.exports = UserDrawing;
