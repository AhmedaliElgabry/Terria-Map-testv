"use strict";

/*global require*/

var knockout = require("terriajs-cesium/Source/ThirdParty/knockout").default;
var defined = require("terriajs-cesium/Source/Core/defined").default;
/**
 * Manages a stack of all the time series layers currently being shown and makes sure the clock provided is always tracking
 * the highest one. When the top-most layer is disabled, the clock will track the next highest in the stack. Provides access
 * to the current top layer so that can be displayed to the user.
 *
 * @param clock The clock that should track the highest layer.
 * @constructor
 */
var TimeSeriesStack = function(clock) {
  this.clock = clock;
  this.timelineTic = "yyyy-mm-dd";

  this._layerStack = [];

  knockout.track(this, ["_layerStack"]);

  /**
   * The highest time-series layer, or undefined if there are no time series layers.
   */
  knockout.defineProperty(this, "topLayer", {
    get: function() {
      if (this._layerStack.length) {
        return this._layerStack[this._layerStack.length - 1];
      }
      return undefined;
    }
  });

  knockout.getObservable(this, "topLayer").subscribe(function(topLayer) {
    if (!defined(topLayer)) {
      this.clock.shouldAnimate = false;
    }
  }, this);
};

/**
 * Adds the supplied {@link CatalogItem} to the top of the stack. If the item is already in the stack, it will be moved
 * rather than added twice.
 *
 * @param {CatalogItem} item
 */
TimeSeriesStack.prototype.addLayerToTop = function(item) {
  var currentIndex = this._layerStack.indexOf(item);
  if (currentIndex > -1) {
    this._layerStack.splice(currentIndex, 1);
  }
  var filteredLayerStack = this._layerStack.slice();
  filteredLayerStack.push(item);
  var unifiedClock = this.getUnifiedClock(
    filteredLayerStack,
    item.clock.currentTime
  );
  if (defined(unifiedClock)) {
    this.clock.setClock(unifiedClock);
    // trigger
  }
  this._layerStack.push(item);
};

TimeSeriesStack.prototype.getUnifiedClock = function(
  filteredLayerStack,
  currentTime
) {
  var minTime;
  var maxTime;
  var maxClockRange;
  var minMultiplier;
  var minClockStep;
  filteredLayerStack.forEach(function(layer) {
    if (layer.clock && !layer.useOwnClock) {
      var clock = layer.clock;
      var startTime = clock.startTime;
      var stopTime = clock.stopTime;
      var multiplier = clock.multiplier;
      var clockRange = clock.clockRange;
      var clockStep = clock.clockStep;
      if (
        minTime === undefined ||
        new Date(startTime).getTime() < new Date(minTime).getTime()
      ) {
        minTime = startTime;
      }

      if (minMultiplier == undefined || minMultiplier < multiplier) {
        minMultiplier = multiplier;
      }

      if (clockRange == undefined || maxClockRange < clockRange) {
        maxClockRange = clockRange;
      }

      if (clockStep == undefined || minClockStep < clockStep) {
        minClockStep = clockStep;
      }

      if (
        maxTime === undefined ||
        new Date(stopTime).getTime() > new Date(maxTime).getTime()
      ) {
        maxTime = stopTime;
      }
    }
  });
  if (
    minTime == undefined &&
    maxTime == undefined &&
    maxClockRange == undefined &&
    minClockStep == undefined &&
    minMultiplier == undefined
  ) {
    return undefined;
  }
  return {
    currentTime: defined(currentTime) ? currentTime : maxTime,
    startTime: minTime,
    stopTime: maxTime,
    clockStep: minClockStep,
    clockRange: maxClockRange,
    multiplier: minMultiplier
  };
};

/**
 * Removes a layer from the stack, no matter what it's location. If the layer is currently at the top, the value of
 * {@link TimeSeriesStack#topLayer} will change.
 *
 * @param {CatalogItem} item;
 */
TimeSeriesStack.prototype.removeLayer = function(item) {
  var index = this._layerStack.indexOf(item);
  if (index > -1) {
    // Create a new array containing the elements before the specified index
    var before = this._layerStack.slice(0, index);

    // Create a new array containing the elements after the specified index
    var after = this._layerStack.slice(index + 1);

    // Concatenate the two arrays to create the filteredLayerStack
    var filteredLayerStack = before.concat(after);
    var currentTime;
    if (filteredLayerStack.length) {
      var itemToLoad = filteredLayerStack[filteredLayerStack.length - 1];
      currentTime = itemToLoad.clock.stopTime;
    }

    var unifiedClock = this.getUnifiedClock(filteredLayerStack, currentTime);
    if (defined(unifiedClock)) {
      this.clock.setClock(unifiedClock);
      // this.clock.tick();
    }
    this._layerStack.splice(index, 1);
  }
};

/**
 * Promotes the supplied {@link CatalogItem} to the top of the stack if it is already in the stack. If the item is not
 * already in the stack it wont be added.
 *
 * @param {CatalogItem} item
 */
TimeSeriesStack.prototype.promoteLayerToTop = function(item) {
  var currentIndex = this._layerStack.indexOf(item);
  if (currentIndex > -1) {
    this.addLayerToTop(item);
  }
};

module.exports = TimeSeriesStack;
