"use strict";

const MapboxVectorTileImageryProvider = require("../Map/MapboxVectorTileImageryProvider");
const clone = require("terriajs-cesium/Source/Core/clone").default;
const defined = require("terriajs-cesium/Source/Core/defined").default;
const ImageryLayerFeatureInfo = require("terriajs-cesium/Source/Scene/ImageryLayerFeatureInfo")
  .default;
const ImageryLayerCatalogItem = require("./ImageryLayerCatalogItem");
const inherit = require("../Core/inherit");
const knockout = require("terriajs-cesium/Source/ThirdParty/knockout").default;
const Legend = require("../Map/Legend");
const overrideProperty = require("../Core/overrideProperty");
var i18next = require("i18next").default;
const proxyCatalogItemUrl = require("./proxyCatalogItemUrl");

/**
 * A {@link ImageryLayerCatalogItem} representing a rasterised Mapbox vector tile layer.
 *
 * @alias MapboxVectorTileCatalogItem
 * @constructor
 * @extends ImageryLayerCatalogItem
 *
 * @param {Terria} terria The Terria instance.
 */
const MapboxVectorTileCatalogItem = function(terria) {
  ImageryLayerCatalogItem.call(this, terria);

  /**
   * Gets or sets the outline color of the features, specified as a CSS color string.
   * @type {String}
   * @default '#000000'
   */
  this.lineColor = "#000000";

  /**
   * Gets or sets the fill color of the features, specified as a CSS color string.
   * @type {String}
   * @default 'rgba(0,0,0,0)'
   */
  this.fillColor = "rgba(0,0,0,0)";

  /**
   * Gets or sets the name of the layer to use the Mapbox vector tiles.
   * @type {String}
   */
  this.layer = undefined;

  /**
   * Gets or sets the name of the property that is a unique ID for features.
   * @type {String}
   * @default 'FID'
   */
  this.idProperty = "FID";

  /**
   * Gets or sets the name of the property from which to obtain the name of features.
   * @type {String}
   */
  this.nameProperty = undefined;

  /**
   * Gets or sets the maximum zoom level for which tile files exist.
   * @type {Number}
   * @default 12
   */
  this.maximumNativeZoom = 12;

  /**
   * Gets or sets the maximum zoom level that can be displayed by using the data in the
   * {@link MapboxVectorTileCatalogItem#maximumNativeZoom} tiles.
   * @type {Number}
   * @default 28
   */
  this.maximumZoom = 28;

  /**
   * Gets or sets the minimum zoom level for which tile files exist.
   * @type {Number}
   * @default 0
   */
  this.minimumZoom = 0;
  this._legendUrl = undefined;

  /**
   * Decides if the feature attribute search functionality
   * of this catalog item is available to the user or not.
   * @type {Boolean}
   * @default {true}
   */
  this.allowMasking = true;

  /**
   * Allows you to specify the attributes to search features by
   * eg ['adm0_code', 'adm0_name']
   * @type {Array}
   */
  this.featureSearchAttributes = [];

  /**
   * The WFS endpoint for this layer.
   * WFS endpoints are custom to a workspace. But the url on most layers are not configured
   * to point to the correct workspace so it's difficult to get the correct wfs automatically
   * This requires users to specify it.
   */
  this.wfsEndpoint = null;

  knockout.track(this, [
    "lineColor",
    "fillColor",
    "layer",
    "idProperty",
    "nameProperty",
    "_legendUrl"
  ]);

  overrideProperty(this, "legendUrl", {
    get: function() {
      if (defined(this._legendUrl)) {
        return this._legendUrl;
      } else {
        return new Legend({
          items: [
            {
              color: this.fillColor,
              lineColor: this.lineColor,
              title: this.name
            }
          ]
        }).getLegendUrl();
      }
    },
    set: function(value) {
      this._legendUrl = value;
    }
  });
};

inherit(ImageryLayerCatalogItem, MapboxVectorTileCatalogItem);

Object.defineProperties(MapboxVectorTileCatalogItem.prototype, {
  /**
   * Gets the type of data item represented by this instance.
   * @memberOf MapboxVectorTileCatalogItem.prototype
   * @type {String}
   */
  type: {
    get: function() {
      return "mvt";
    }
  },

  /**
   * Gets a human-readable name for this type of data source, 'Mapbox Vector Tile'.
   * @memberOf MapboxVectorTileCatalogItem.prototype
   * @type {String}
   */
  typeName: {
    get: function() {
      return i18next.t("models.mapboxVectorTile.name");
    }
  }
});

MapboxVectorTileCatalogItem.prototype._createImageryProvider = function() {
  const proxiedUrl = proxyCatalogItemUrl(this, this.url, "0d");
  return new MapboxVectorTileImageryProvider({
    url: proxiedUrl,
    layerName: this.layer,
    styleFunc: () => ({
      fillStyle: this.fillColor,
      strokeStyle: this.lineColor,
      lineWidth: 1
    }),
    srs: this.terria.activeProjection.srs,
    tileMatrixSetID: this.tileMatrixSetID,
    tileMatrixLabels: this.tileMatrixSetLabels,
    rectangle: this.rectangle,
    minimumZoom: this.minimumZoom,
    maximumNativeZoom: this.maximumNativeZoom,
    maximumZoom: this.maximumZoom,
    uniqueIdProp: this.idProperty,
    featureInfoFunc: feature => featureInfoFromFeature(this, feature)
  });
};

function featureInfoFromFeature(mapboxVectorTileCatalogItem, feature) {
  const featureInfo = new ImageryLayerFeatureInfo();
  if (defined(mapboxVectorTileCatalogItem.nameProperty)) {
    featureInfo.name =
      feature.properties[mapboxVectorTileCatalogItem.nameProperty];
  }
  featureInfo.properties = clone(feature.properties);
  featureInfo.data = {
    id: feature.properties[mapboxVectorTileCatalogItem.idProperty]
  }; // For highlight
  return featureInfo;
}

module.exports = MapboxVectorTileCatalogItem;
