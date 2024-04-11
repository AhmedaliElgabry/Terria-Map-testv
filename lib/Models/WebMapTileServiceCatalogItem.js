"use strict";

/*global require*/
var URI = require("urijs");
var i18next = require("i18next").default;

var clone = require("terriajs-cesium/Source/Core/clone").default;
var defaultValue = require("terriajs-cesium/Source/Core/defaultValue").default;
var defined = require("terriajs-cesium/Source/Core/defined").default;
var GeographicTilingScheme = require("terriajs-cesium/Source/Core/GeographicTilingScheme")
  .default;
var GetFeatureInfoFormat = require("terriajs-cesium/Source/Scene/GetFeatureInfoFormat")
  .default;
var knockout = require("terriajs-cesium/Source/ThirdParty/knockout").default;
var loadXML = require("../Core/loadXML");
var Rectangle = require("terriajs-cesium/Source/Core/Rectangle").default;
var WebMapTileServiceImageryProvider = require("terriajs-cesium/Source/Scene/WebMapTileServiceImageryProvider")
  .default;
var WebMercatorTilingScheme = require("terriajs-cesium/Source/Core/WebMercatorTilingScheme")
  .default;
var when = require("terriajs-cesium/Source/ThirdParty/when").default;

var containsAny = require("../Core/containsAny");
var Metadata = require("./Metadata");
var MetadataItem = require("./MetadataItem");
var ImageryLayerCatalogItem = require("./ImageryLayerCatalogItem");
var inherit = require("../Core/inherit");
var overrideProperty = require("../Core/overrideProperty");
var proxyCatalogItemUrl = require("./proxyCatalogItemUrl");
var xml2json = require("../ThirdParty/xml2json");
var LegendUrl = require("../Map/LegendUrl");
var TimeInterval = require("terriajs-cesium/Source/Core/TimeInterval").default;
var TimeIntervalCollection = require("terriajs-cesium/Source/Core/TimeIntervalCollection")
  .default;
var TerriaError = require("../Core/TerriaError");
var JulianDate = require("terriajs-cesium/Source/Core/JulianDate").default;
var moment = require("moment");
const { array } = require("prop-types");

/**
 * A {@link ImageryLayerCatalogItem} representing a layer from a Web Map Tile Service (WMTS) server.
 *
 * @alias WebMapTileServiceCatalogItem
 * @constructor
 * @extends ImageryLayerCatalogItem
 *
 * @param {Terria} terria The Terria instance.
 */
var WebMapTileServiceCatalogItem = function(terria) {
  ImageryLayerCatalogItem.call(this, terria);

  this._rawMetadata = undefined;
  this._metadata = undefined;
  this._dataUrl = undefined;
  this._dataUrlType = undefined;
  this._metadataUrl = undefined;
  this._legendUrl = undefined;
  this._rectangle = undefined;
  this._rectangleFromMetadata = undefined;
  this._intervalsFromMetadata = undefined;

  /**
   * Gets or sets the WMTS layer to use.  This property is observable.
   * @type {String}
   */
  this.layer = "";

  /**
   * If true will use ResourceURL Template from the getCapabilities response instead of the url speicfied in the
   * catalog item configuration
   */
  this.useResourceTemplate = false;

  /**
   * Gets or sets the WMTS style to use.  This property is observable.
   * @type {String}
   */
  this.style = undefined;

  /**
   * Gets or sets the WMTS Tile Matrix Set ID to use.  This property is observable.
   * @type {String}
   */
  this.tileMatrixSetID = undefined;

  /**
   * Gets or sets the labels for each level in the matrix set.  This property is observable.
   * @type {Array}
   */
  this.tileMatrixSetLabels = undefined;

  /**
   * Gets or sets the maximum level in the matrix set.  This property is observable.
   * @type {Array}
   */
  this.tileMatrixMaximumLevel = undefined;

  /**
   * Gets or sets the tiling scheme to pass to the WMTS server when requesting images.
   * If this property is undefiend, the default tiling scheme of the provider is used.
   * @type {Object}
   */
  this.tilingScheme = undefined;

  /**
   * Gets or sets the formats in which to try WMTS GetFeatureInfo requests.  If this property is undefined, the `WebMapServiceImageryProvider` defaults
   * are used.  This property is observable.
   * @type {GetFeatureInfoFormat[]}
   */
  this.getFeatureInfoFormats = undefined;

  /**
   * Gets or sets a value indicating whether a time dimension, if it exists in GetCapabilities, should be used to populate
   * the {@link ImageryLayerCatalogItem#intervals}.  If the {@link ImageryLayerCatalogItem#intervals} property is set explicitly
   * on this catalog item, the value of this property is ignored.
   * @type {Boolean}
   * @default true
   */
  this.populateIntervalsFromTimeDimension = true;

  /**
   * Gets or sets the denominator of the largest scale (smallest denominator) for which tiles should be requested.  For example, if this value is 1000, then tiles representing
   * a scale larger than 1:1000 (i.e. numerically smaller denominator, when zooming in closer) will not be requested.  Instead, tiles of the largest-available scale, as specified by this property,
   * will be used and will simply get blurier as the user zooms in closer.
   * @type {Number}
   */
  this.minScaleDenominator = undefined;

  /**
   * Gets or sets the maximum number of intervals that can be created by a single
   * date range, when specified in the form time/time/periodicity.
   * eg. 2015-04-27T16:15:00/2015-04-27T18:45:00/PT15M has 11 intervals
   * @type {Number}
   */
  this.maxRefreshIntervals = 1000;

  /**
   * Gets or sets the format in which to request tile images.  If not specified, 'image/png' is used.  This property is observable.
   * @type {String}
   */
  this.format = undefined;

  this.availableDimensions = undefined;

  /**
   * Gets or sets the selected values for dimensions available for this WMS layer.  The value of this property is
   * an object where each key is the name of a dimension and each value is the value to use for that dimension.
   * Note that WMS does not allow dimensions to be explicitly specified per layer.  So the selected dimension values are
   * applied to all layers with a corresponding dimension.
   * This property is observable.
   * @type {Object}
   * @example
   * wmsItem.dimensions = {
   *     elevation: -0.65625
   * };
   */
  this.dimensions = undefined;

  /**
   * Gets or sets the additional parameters to pass to the WMS server when requesting images.
   * All parameter names must be entered in lowercase in order to be consistent with references in TerrisJS code.
   * If this property is undefined, {@link WebMapTileServiceCatalogItem.defaultParameters} is used.
   * @type {Object}
   */
  this.parameters = {};

  /**
   * Workspace filter for the WMTS wrapper
   */
  this.workspace = "";

  knockout.track(this, [
    "_dataUrl",
    "_dataUrlType",
    "_metadataUrl",
    "_legendUrl",
    "_rectangle",
    "_rectangleFromMetadata",
    "_intervalsFromMetadata",
    "layer",
    "style",
    "parameters",
    "tileMatrixSetID",
    "tileMatrixMaximumLevel",
    "getFeatureInfoFormats",
    "tilingScheme",
    "populateIntervalsFromTimeDimension",
    "minScaleDenominator",
    "format",
    "availableDimensions"
  ]);

  WebMapTileServiceCatalogItem.prototype._getLegendUrls = function() {
    return computeLegendUrls(this);
  };

  // dataUrl, metadataUrl, and legendUrl are derived from url if not explicitly specified.
  overrideProperty(this, "metadataUrl", {
    get: function() {
      if (defined(this._metadataUrl)) {
        return (
          this._metadataUrl +
          (this.workspace ? `&workspace=${this.workspace}` : "")
        );
      }

      return (
        cleanUrl(this.url) +
        "?service=WMTS&request=GetCapabilities&version=1.0.0" +
        (this.workspace ? `&workspace=${this.workspace}` : "")
      );
    },
    set: function(value) {
      this._metadataUrl = value;
    }
  });

  // The dataUrl must be explicitly specified.  Don't try to use `url` as the the dataUrl, because it won't work for a WMTS URL.
  overrideProperty(this, "dataUrl", {
    get: function() {
      return this._dataUrl;
    },
    set: function(value) {
      this._dataUrl = value;
    }
  });

  overrideProperty(this, "dataUrlType", {
    get: function() {
      if (defined(this._dataUrlType)) {
        return this._dataUrlType;
      } else {
        return "none";
      }
    },
    set: function(value) {
      this._dataUrlType = value;
    }
  });

  var legendUrlsBase = Object.getOwnPropertyDescriptor(this, "legendUrls");

  overrideProperty(this, "legendUrls", {
    get: function() {
      return this._legendUrls;
    },
    set: function(value) {
      this._legendUrls = value;
    }
  });
};

inherit(ImageryLayerCatalogItem, WebMapTileServiceCatalogItem);

Object.defineProperties(WebMapTileServiceCatalogItem.prototype, {
  /**
   * Gets the type of data item represented by this instance.
   * @memberOf WebMapTileServiceCatalogItem.prototype
   * @type {String}
   */
  type: {
    get: function() {
      return "wmts";
    }
  },

  /**
   * Gets a human-readable name for this type of data source, 'Web Map Tile Service (WMTS)'.
   * @memberOf WebMapTileServiceCatalogItem.prototype
   * @type {String}
   */
  typeName: {
    get: function() {
      return i18next.t("models.webMapTileServiceCatalogItem.wmts");
    }
  },

  /**
   * Gets a value indicating whether this {@link ImageryLayerCatalogItem} supports the {@link ImageryLayerCatalogItem#intervals}
   * property for configuring time-dynamic imagery.
   * @type {Boolean}
   */
  supportsIntervals: {
    get: function() {
      return true;
    }
  },

  /**
   * Gets the metadata associated with this data source and the server that provided it, if applicable.
   * @memberOf WebMapTileServiceCatalogItem.prototype
   * @type {Metadata}
   */
  metadata: {
    get: function() {
      if (!defined(this._metadata)) {
        this._metadata = requestMetadata(this);
      }
      return this._metadata;
    }
  },

  /**
   * Gets the set of functions used to update individual properties in {@link CatalogMember#updateFromJson}.
   * When a property name in the returned object literal matches the name of a property on this instance, the value
   * will be called as a function and passed a reference to this instance, a reference to the source JSON object
   * literal, and the name of the property.
   * @memberOf WebMapTileServiceCatalogItem.prototype
   * @type {Object}
   */
  updaters: {
    get: function() {
      return WebMapTileServiceCatalogItem.defaultUpdaters;
    }
  },

  /**
   * Gets the set of functions used to serialize individual properties in {@link CatalogMember#serializeToJson}.
   * When a property name on the model matches the name of a property in the serializers object literal,
   * the value will be called as a function and passed a reference to the model, a reference to the destination
   * JSON object literal, and the name of the property.
   * @memberOf WebMapTileServiceCatalogItem.prototype
   * @type {Object}
   */
  serializers: {
    get: function() {
      return WebMapTileServiceCatalogItem.defaultSerializers;
    }
  }
});

WebMapTileServiceCatalogItem.defaultUpdaters = clone(
  ImageryLayerCatalogItem.defaultUpdaters
);

WebMapTileServiceCatalogItem.defaultUpdaters.tilingScheme = function(
  wmtsItem,
  json,
  propertyName,
  options
) {
  if (json.tilingScheme === "geographic") {
    wmtsItem.tilingScheme = new GeographicTilingScheme();
  } else if (json.tilingScheme === "web-mercator") {
    wmtsItem.tilingScheme = new WebMercatorTilingScheme();
  } else {
    wmtsItem.tilingScheme = json.tilingScheme;
  }
};

WebMapTileServiceCatalogItem.defaultUpdaters.getFeatureInfoFormats = function(
  wmtsItem,
  json,
  propertyName,
  options
) {
  var formats = [];

  for (var i = 0; i < json.getFeatureInfoFormats.length; ++i) {
    var format = json.getFeatureInfoFormats[i];
    formats.push(new GetFeatureInfoFormat(format.type, format.format));
  }

  wmtsItem.getFeatureInfoFormats = formats;
};

Object.freeze(WebMapTileServiceCatalogItem.defaultUpdaters);

WebMapTileServiceCatalogItem.defaultSerializers = clone(
  ImageryLayerCatalogItem.defaultSerializers
);

// Serialize the underlying properties instead of the public views of them.
WebMapTileServiceCatalogItem.defaultSerializers.dataUrl = function(
  wmtsItem,
  json,
  propertyName
) {
  json.dataUrl = wmtsItem._dataUrl;
};
WebMapTileServiceCatalogItem.defaultSerializers.dataUrlType = function(
  wmtsItem,
  json,
  propertyName
) {
  json.dataUrlType = wmtsItem._dataUrlType;
};
WebMapTileServiceCatalogItem.defaultSerializers.metadataUrl = function(
  wmtsItem,
  json,
  propertyName
) {
  json.metadataUrl = wmtsItem._metadataUrl;
};
WebMapTileServiceCatalogItem.defaultSerializers.legendUrl = function(
  wmtsItem,
  json,
  propertyName
) {
  json.legendUrl = wmtsItem._legendUrl;
};
WebMapTileServiceCatalogItem.defaultSerializers.tilingScheme = function(
  wmtsItem,
  json,
  propertyName
) {
  if (wmtsItem.tilingScheme instanceof GeographicTilingScheme) {
    json.tilingScheme = "geographic";
  } else if (wmtsItem.tilingScheme instanceof WebMercatorTilingScheme) {
    json.tilingScheme = "web-mercator";
  } else {
    json.tilingScheme = wmtsItem.tilingScheme;
  }
};

// Do not serialize availableDimensions, availableStyles, intervals, description, info - these can be huge and can be recovered from the server.
// Normally when you share a WMS item, it is inside a WMS group, and when CatalogGroups are shared, they share their contents applying the
// CatalogMember.propertyFilters.sharedOnly filter, which only shares the "propertiesForSharing".
// However, if you create a straight WMS item outside a group (eg. by duplicating it), then share it, it will serialize everything it can.
WebMapTileServiceCatalogItem.defaultSerializers.availableDimensions = function() {};
WebMapTileServiceCatalogItem.defaultSerializers.availableStyles = function() {};
WebMapTileServiceCatalogItem.defaultSerializers.intervals = function() {};
WebMapTileServiceCatalogItem.defaultSerializers.description = function() {};
WebMapTileServiceCatalogItem.defaultSerializers.info = function() {};

Object.freeze(WebMapTileServiceCatalogItem.defaultSerializers);

/**
 * The collection of strings that indicate an Abstract property should be ignored.  If these strings occur anywhere
 * in the Abstract, the Abstract will not be used.  This makes it easy to filter out placeholder data like
 * Geoserver's "A compliant implementation of WMTS..." stock abstract.
 * @type {Array}
 */
WebMapTileServiceCatalogItem.abstractsToIgnore = [
  "A compliant implementation of WMTS"
];

/**
 * Updates this catalog item from a WMTS GetCapabilities document.
 * @param {Object|XMLDocument} capabilities The capabilities document.  This may be a JSON object or an XML document.  If it
 *                             is a JSON object, each layer is expected to have a `_parent` property with a reference to its
 *                             parent layer.
 * @param {Boolean} [overwrite=false] True to overwrite existing property values with data from the capabilities; false to
 *                  preserve any existing values.
 * @param {Object} [thisLayer] A reference to this layer within the JSON capabilities object.  If this parameter is not
 *                 specified or if `capabilities` is an XML document, the layer is found automatically based on this
 *                 catalog item's `layers` property.
 */
WebMapTileServiceCatalogItem.prototype.updateFromCapabilities = function(
  capabilities,
  overwrite,
  thisLayer,
  infoDerivedFromCapabilities
) {
  if (defined(capabilities.documentElement)) {
    capabilities = WebMapTileServiceCatalogItem.capabilitiesXmlToJson(
      capabilities
    );
    thisLayer = undefined;
  }

  if (!defined(thisLayer)) {
    thisLayer = findLayer(capabilities, this.layer);
    if (!defined(thisLayer)) {
      return;
    }
  }

  if (!defined(this.availableStyles)) {
    if (
      defined(infoDerivedFromCapabilities) &&
      defined(infoDerivedFromCapabilities.availableStyles)
    ) {
      this.availableStyles = infoDerivedFromCapabilities.availableStyles;
    } else {
      this.availableStyles = WebMapTileServiceCatalogItem.getAllAvailableStylesFromCapabilities(
        capabilities
      );
    }
  }

  if (!defined(this.availableDimensions)) {
    if (
      defined(infoDerivedFromCapabilities) &&
      defined(infoDerivedFromCapabilities.availableDimensions)
    ) {
      this.availableDimensions =
        infoDerivedFromCapabilities.availableDimensions;
    } else {
      this.availableDimensions = WebMapTileServiceCatalogItem.getAllAvailableDimensionsFromCapabilities(
        capabilities,
        thisLayer
      );

      if (this.onDimensionsLoaded && this.availableDimensions) {
        this.onDimensionsLoaded.valueHasMutated(); // let subscribers know dimensions are fetched and loaded into the catalog item
      }

      this.dimensions = this.dimensions || {};
      if (
        defined(this.availableDimensions) &&
        defined(this.availableDimensions[this.layer])
      ) {
        const layerDimensions = this.availableDimensions[this.layer];
        for (const dim of layerDimensions) {
          if (!this.dimensions[dim.name] && dim.default) {
            this.dimensions[dim.name] = dim.default;
          }
        }
      }
    }
  }

  this._rawMetadata = capabilities;

  if (
    !containsAny(
      thisLayer.Abstract,
      WebMapTileServiceCatalogItem.abstractsToIgnore
    )
  ) {
    updateInfoSection(
      this,
      overwrite,
      i18next.t("models.webMapTileServiceCatalogItem.dataDescription"),
      thisLayer.Abstract
    );
  }

  var service = defined(capabilities.Service) ? capabilities.Service : {};

  // Show the service abstract if there is one, and if it isn't the Geoserver default "A compliant implementation..."
  if (
    !containsAny(
      service.Abstract,
      WebMapTileServiceCatalogItem.abstractsToIgnore
    ) &&
    service.Abstract !== thisLayer.Abstract
  ) {
    updateInfoSection(
      this,
      overwrite,
      i18next.t("models.webMapTileServiceCatalogItem.serviceDescription"),
      service.Abstract
    );
  }

  // Show the Access Constraints if it isn't "none" (because that's the default, and usually a lie).
  if (
    defined(service.AccessConstraints) &&
    !/^none$/i.test(service.AccessConstraints)
  ) {
    updateInfoSection(
      this,
      overwrite,
      i18next.t("models.webMapTileServiceCatalogItem.accessConstraints"),
      service.AccessConstraints
    );
  }

  updateValue(this, overwrite, "dataCustodian", getDataCustodian(capabilities));
  updateValue(
    this,
    overwrite,
    "minScaleDenominator",
    thisLayer.MinScaleDenominator
  );
  updateValue(
    this,
    overwrite,
    "getFeatureInfoFormats",
    getFeatureInfoFormats(thisLayer)
  );
  updateValue(this, overwrite, "rectangle", getRectangleFromLayer(thisLayer));

  // Find a suitable image format.  Prefer PNG but fall back on JPEG is necessary
  var formats = thisLayer.Format;
  if (defined(formats)) {
    if (!Array.isArray(formats)) {
      formats = [formats];
    }

    var format;
    if (formats.indexOf("image/png") >= 0) {
      format = "image/png";
    } else if (
      formats.indexOf("image/jpeg") >= 0 ||
      formats.indexOf("images/jpg") >= 0
    ) {
      format = "image/jpeg";
    }

    updateValue(this, overwrite, "format", format);
  }

  // Find a suitable tile matrix set.
  var tileMatrixSetID = "urn:ogc:def:wkss:OGC:1.0:GoogleMapsCompatible";
  var tileMatrixSetLabels;

  var tileMatrixSetLinks = thisLayer.TileMatrixSetLink;
  if (!Array.isArray(tileMatrixSetLinks)) {
    tileMatrixSetLinks = [tileMatrixSetLinks];
  }

  var i;
  for (i = 0; i < tileMatrixSetLinks.length; ++i) {
    var link = tileMatrixSetLinks[i];
    var set = link.TileMatrixSet;
    if (capabilities.usableTileMatrixSets[set]) {
      tileMatrixSetID = set;
      tileMatrixSetLabels = capabilities.usableTileMatrixSets[set];
      break;
    }
  }

  if (Array.isArray(tileMatrixSetLabels)) {
    var maxLevel = tileMatrixSetLabels
      .map(label => Math.abs(Number(label)))
      .reduce((currentMaximum, level) => {
        return level > currentMaximum ? level : currentMaximum;
      }, 0);
  }

  updateValue(this, overwrite, "tileMatrixSetID", tileMatrixSetID);
  updateValue(this, overwrite, "tileMatrixSetLabels", tileMatrixSetLabels);
  updateValue(this, overwrite, "tileMatrixMaximumLevel", maxLevel);

  updateValue(
    this,
    overwrite,
    "intervals",
    getIntervalsFromLayer(this, thisLayer)
  );

  // Find the default style.
  var styles = thisLayer.Style;
  if (defined(styles)) {
    if (!Array.isArray(styles)) {
      styles = [styles];
    }

    var defaultStyle;

    for (i = 0; i < styles.length; ++i) {
      var style = styles[i];
      if (style.isDefault) {
        defaultStyle = style.Identifier;

        var legendData = style.legendURL;
        if (defined(legendData)) {
          // WMTS can specify multiple legends, where different legends are applicable to different zooms.
          // Since TerriaJS only supports showing a single legend currently, show the first one.
          if (Array.isArray(legendData)) {
            legendData = legendData[0];
          }

          this.legendUrl = new LegendUrl(legendData.href, legendData.format);
        }
        break;
      }
    }

    if (!defined(defaultStyle)) {
      defaultStyle = "";
    }

    updateValue(this, overwrite, "style", defaultStyle);
  }
};

WebMapTileServiceCatalogItem.prototype._load = function() {
  var that = this;
  const parameters = getCatalogItemParameters(this);
  return loadXML(
    proxyCatalogItemUrl(
      this,
      this.metadataUrl + (parameters.length ? "&" + parameters : "")
    )
  ).then(function(xml) {
    that._rawMetadata = WebMapTileServiceCatalogItem.capabilitiesXmlToJson(xml);

    var layers;
    if (
      !defined(that._rawMetadata.Contents) ||
      !defined(that._rawMetadata.Contents.Layer)
    ) {
      layers = [];
    } else if (Array.isArray(that._rawMetadata.Contents.Layer)) {
      layers = that._rawMetadata.Contents.Layer;
    } else {
      layers = [that._rawMetadata.Contents.Layer];
    }

    const layer = layers.find(
      a => a.Identifier.toLowerCase() === that.layer.toLowerCase()
    );

    // // that.availableDimensions= { layer.Identifier :  [layer.Dimension] };
    // that.availableDimensions = that.availableDimensions || {};

    // that.availableDimensions[layer.Identifier] = layer.Dimension
    //   ? [layer.Dimension]
    //   : [];

    that.updateFromCapabilities(that._rawMetadata, false, layer);

    that.currentLayer = layer;

    that._legendUrls = that._getLegendUrls();
    return that._rawMetadata;
  });
};

WebMapTileServiceCatalogItem.prototype._getValuesThatInfluenceLoad = function() {
  return [this.terria.activeProjection.srs];
};

WebMapTileServiceCatalogItem.prototype._setParameters = function() {
  let parameters = this.parameters;
  if (
    defined(this.dimensions) &&
    (!defined(parameters.dimensions) || parameters.dimensions.length === 0)
  ) {
    for (var dimensionName in this.dimensions) {
      if (this.dimensions.hasOwnProperty(dimensionName)) {
        // elevation is specified as simply elevation.
        // Other (custom) dimensions are prefixed with 'dim_'.
        // See WMS 1.3.0 spec section C.3.2 and C.3.3.
        if (dimensionName.toLowerCase() === "elevation") {
          parameters.elevation = this.dimensions[dimensionName];
        } else {
          parameters["dim_" + dimensionName] = this.dimensions[dimensionName];
        }
      }
    }
  }

  return parameters;
};

WebMapTileServiceCatalogItem.prototype._createImageryProvider = function(time) {
  let parameters = this._setParameters();

  var provider = new WebMapTileServiceImageryProvider({
    url: cleanAndProxyUrlAndAddParams(this, time, parameters),
    layer: this.layer,
    maximumLevel: this.tileMatrixMaximumLevel,
    style: this.style,
    getFeatureInfoFormats: this.getFeatureInfoFormats,
    parameters: parameters,
    // times: [time],
    tilingScheme:
      defined(this.terria.activeProjection.srs) &&
      this.terria.activeProjection.srs === "EPSG:4326"
        ? new GeographicTilingScheme()
        : new WebMercatorTilingScheme(),
    format: defaultValue(this.format, "image/png"),
    tileMatrixSetID: defaultValue(this.terria.activeProjection.srs, "EPSG:3857")
  });
  return provider;
};

WebMapTileServiceCatalogItem.prototype.getNonTimeDimensions = function() {
  if (!defined(this.availableDimensions)) {
    return undefined;
  }
  const dimensions = {};
  const layerDimensions = this.availableDimensions[this.layer].filter(
    dimension => dimension.name.toLowerCase() != "time"
  );
  for (const dim of layerDimensions) {
    if (defined(this.dimensions) && defined(this.dimensions[dim.name])) {
      dimensions[dim.name] = this.dimensions[dim.name];
    } else if (!layerDimensions[dim.name] && dim.default) {
      dimensions[dim.name] = dim.default;
    }
  }

  return dimensions;
};

WebMapTileServiceCatalogItem.capabilitiesXmlToJson = function(xml) {
  var json = xml2json(xml);

  json.usableTileMatrixSets = {
    "urn:ogc:def:wkss:OGC:1.0:GoogleMapsCompatible": true
  };

  var standardTilingScheme = new WebMercatorTilingScheme();

  var matrixSets = json.Contents.TileMatrixSet;

  for (var i = 0; i < matrixSets?.length; ++i) {
    var matrixSet = matrixSets[i];

    // Usable tile matrix sets must use the Web Mercator projection.
    if (
      matrixSet.SupportedCRS !== "urn:ogc:def:crs:EPSG::900913" &&
      matrixSet.SupportedCRS !== "urn:ogc:def:crs:EPSG:6.18:3:3857"
    ) {
      continue;
    }

    // Usable tile matrix sets must have a single 256x256 tile at the root.
    var matrices = matrixSet.TileMatrix;
    if (!defined(matrices) || matrices.length < 1) {
      continue;
    }

    var levelZeroMatrix = matrices[0];
    if (
      (levelZeroMatrix.TileWidth | 0) !== 256 ||
      (levelZeroMatrix.TileHeight | 0) !== 256 ||
      (levelZeroMatrix.MatrixWidth | 0) !== 1 ||
      (levelZeroMatrix.MatrixHeight | 0) !== 1
    ) {
      continue;
    }

    var levelZeroScaleDenominator = 559082264.0287178; // from WMTS 1.0.0 spec section E.4.
    if (
      Math.abs(levelZeroMatrix.ScaleDenominator - levelZeroScaleDenominator) > 1
    ) {
      continue;
    }

    if (!defined(levelZeroMatrix.TopLeftCorner)) {
      continue;
    }

    var levelZeroTopLeftCorner = levelZeroMatrix.TopLeftCorner.split(" ");
    var startX = levelZeroTopLeftCorner[0];
    var startY = levelZeroTopLeftCorner[1];

    if (
      Math.abs(startX - standardTilingScheme._rectangleSouthwestInMeters.x) > 1
    ) {
      continue;
    }

    if (
      Math.abs(startY - standardTilingScheme._rectangleNortheastInMeters.y) > 1
    ) {
      continue;
    }

    json.usableTileMatrixSets[matrixSet.Identifier] = true;

    if (defined(matrixSet.TileMatrix) && matrixSet.TileMatrix.length > 0) {
      json.usableTileMatrixSets[
        matrixSet.Identifier
      ] = matrixSet.TileMatrix.map(function(item) {
        return item.Identifier;
      });
    }
  }

  return json;
};

WebMapTileServiceCatalogItem.getAllAvailableDimensionsFromCapabilities = function(
  capabilities,
  layers,
  result,
  inheritedDimensions
) {
  if (!defined(result)) {
    result = {};
    layers =
      capabilities && capabilities.Contents ? capabilities.Contents.Layer : [];
  }

  if (!defined(layers)) {
    return result;
  }

  layers = Array.isArray(layers) ? layers : [layers];

  for (var i = 0; i < layers.length; ++i) {
    var layer = layers[i];
    var dimensions = WebMapTileServiceCatalogItem.getSingleLayerDimensionsFromCapabilities(
      layer,
      inheritedDimensions
    );

    if (defined(layer.Name) && layer.Name.length > 0) {
      result[layer.Name] = dimensions;
    } else if (defined(layer.Identifier) && layer.Identifier.length) {
      result[layer.Identifier] = dimensions;
    }

    WebMapTileServiceCatalogItem.getAllAvailableDimensionsFromCapabilities(
      capabilities,
      layer.Layer,
      result,
      dimensions
    );
  }

  return result;
};

WebMapTileServiceCatalogItem.getAllAvailableStylesFromCapabilities = function(
  capabilities,
  layers,
  result,
  inheritedStyles
) {
  if (!defined(result)) {
    result = {};
    layers =
      capabilities && capabilities.Capability
        ? capabilities.Capability.Layer
        : [];
  }

  if (!defined(layers)) {
    return result;
  }

  layers = Array.isArray(layers) ? layers : [layers];

  for (var i = 0; i < layers.length; ++i) {
    var layer = layers[i];
    var styles = WebMapServiceCatalogItem.getSingleLayerStylesFromCapabilities(
      layer,
      inheritedStyles
    );
    if (defined(layer.Name) && layer.Name.length > 0) {
      result[layer.Name] = styles;
    }
    WebMapServiceCatalogItem.getAllAvailableStylesFromCapabilities(
      capabilities,
      layer.Layer,
      result,
      styles
    );
  }

  return result;
};
WebMapTileServiceCatalogItem.getSingleLayerDimensionsFromCapabilities = function(
  layerInCapabilities,
  inheritedDimensions
) {
  inheritedDimensions = inheritedDimensions || [];

  if (
    !defined(layerInCapabilities) ||
    !defined(layerInCapabilities.Dimension)
  ) {
    return inheritedDimensions;
  }

  var dimensions = Array.isArray(layerInCapabilities.Dimension)
    ? layerInCapabilities.Dimension
    : [layerInCapabilities.Dimension];

  // WMS 1.1.1 puts dimension values in an Extent element instead of directly in the Dimension element.
  var extents = layerInCapabilities.Extent
    ? Array.isArray(layerInCapabilities.Extent)
      ? layerInCapabilities.Extent
      : [layerInCapabilities.Extent]
    : [];

  // Filter out inherited dimensions that are duplicated here.  Child layer dimensions override parent layer dimensions.
  inheritedDimensions = inheritedDimensions.filter(
    inheritedDimension =>
      dimensions.filter(dimension => dimension.name === inheritedDimension.name)
        .length === 0
  );

  return inheritedDimensions.concat(
    dimensions.map(dimension => {
      var correspondingExtent = extents.filter(
        extent => extent.name === dimension.name
      )[0];

      var options;
      if (correspondingExtent && correspondingExtent.split) {
        options = correspondingExtent.split(",");
      } else if (dimension.split) {
        options = dimension.split(",");
      } else if (dimension.Value) {
        if (Array.isArray(dimension.Value)) {
          options = dimension.Value;
        } else if (dimension.Value.split) {
          options = dimension.Value.split(",");
        }
      } else if (dimension.Values) {
        if (Array.isArray(dimension.Values)) {
          options = dimension.Values;
        } else if (dimension.Values.split) {
          options = dimension.Values.split(",");
        }
      } else {
        options = [];
      }

      return {
        name: dimension.name || dimension.Identifier,
        units: dimension.units,
        unitSymbol: dimension.unitSymbol,
        default:
          dimension.default ||
          dimension.Default ||
          (options.length ? options[0] : null),
        multipleValues: dimension.multipleValues,
        nearestValue: dimension.nearestValue,
        options: options
      };
    })
  );
};

function cleanAndProxyUrlAndAddParams(catalogItem, time, parameters) {
  let url = catalogItem.url;

  const currentLayer = catalogItem.currentLayer;
  if (
    currentLayer &&
    catalogItem.useResourceTemplate &&
    currentLayer.ResourceURL
  ) {
    if (
      Array.isArray(currentLayer.ResourceURL) &&
      currentLayer.ResourceURL.length
    ) {
      url = currentLayer.ResourceURL[0].template;
    } else {
      url = currentLayer.ResourceURL.template;
    }
  }

  var proxied = proxyCatalogItemUrl(catalogItem, cleanUrl(url));

  const queryParams = getCatalogItemParameters(catalogItem, time, parameters);

  proxied += "?" + queryParams;

  return proxied;
}

function getCatalogItemParameters(catalogItem, time) {
  if (time) {
    catalogItem.parameters["dim_time"] = time;
  }

  if (defined(catalogItem.layer)) {
    catalogItem.parameters["layer"] = catalogItem.layer;
  }

  const params = Object.entries(catalogItem.parameters)
    .filter(a => a.length === 2 && a[1])
    // eslint-disable-next-line no-return-assign
    .map(a => `${a[0]}=${a[1]}`)
    .join("&");

  return params;
}

function cleanUrl(url) {
  // Strip off the search portion of the URL
  var uri = new URI(url);
  uri.search("");
  return uri.toString();
}

function getRectangleFromLayer(layer) {
  // Unfortunately, WMTS 1.0 doesn't require WGS84BoundingBox (or any bounding box) to be specified.
  var bbox = layer.WGS84BoundingBox;
  if (!defined(bbox)) {
    return undefined;
  }

  var ll = bbox.LowerCorner;
  var ur = bbox.UpperCorner;

  if (!defined(ll) || !defined(ur)) {
    return undefined;
  }

  var llParts = ll.split(" ");
  var urParts = ur.split(" ");
  if (llParts.length !== 2 || urParts.length !== 2) {
    return undefined;
  }

  return Rectangle.fromDegrees(llParts[0], llParts[1], urParts[0], urParts[1]);
}

function getFeatureInfoFormats(layer) {
  var supportsJsonGetFeatureInfo = false;
  var supportsXmlGetFeatureInfo = false;
  var supportsHtmlGetFeatureInfo = false;
  var xmlContentType = "text/xml";

  var format = layer.InfoFormat;

  if (defined(format)) {
    if (format === "application/json") {
      supportsJsonGetFeatureInfo = true;
    } else if (
      defined(format.indexOf) &&
      format.indexOf("application/json") >= 0
    ) {
      supportsJsonGetFeatureInfo = true;
    }

    if (format === "text/xml" || format === "application/vnd.ogc.gml") {
      supportsXmlGetFeatureInfo = true;
      xmlContentType = format;
    } else if (defined(format.indexOf) && format.indexOf("text/xml") >= 0) {
      supportsXmlGetFeatureInfo = true;
      xmlContentType = "text/xml";
    } else if (
      defined(format.indexOf) &&
      format.indexOf("application/vnd.ogc.gml") >= 0
    ) {
      supportsXmlGetFeatureInfo = true;
      xmlContentType = "application/vnd.ogc.gml";
    } else if (defined(format.indexOf) && format.indexOf("text/html") >= 0) {
      supportsHtmlGetFeatureInfo = true;
    }
  }

  var result = [];

  if (supportsJsonGetFeatureInfo) {
    result.push(new GetFeatureInfoFormat("json"));
  }
  if (supportsXmlGetFeatureInfo) {
    result.push(new GetFeatureInfoFormat("xml", xmlContentType));
  }
  if (supportsHtmlGetFeatureInfo) {
    result.push(new GetFeatureInfoFormat("html"));
  }

  return result;
}

function requestMetadata(wmtsItem) {
  var result = new Metadata();

  result.isLoading = true;

  const queryParams = getCatalogItemParameters(wmtsItem);
  const url =
    proxyCatalogItemUrl(wmtsItem, wmtsItem.metadataUrl) +
    "&" +
    queryParams +
    "&layer=" +
    wmtsItem.layer;
  var metadata =
    wmtsItem._rawMetadata ||
    loadXML(url).then(WebMapTileServiceCatalogItem.capabilitiesXmlToJson);

  result.promise = when(metadata, function(json) {
    if (json.ServiceIdentification || json.ServiceProvider) {
      populateMetadataGroup(result.serviceMetadata, {
        Identification: json.ServiceIdentification,
        Provider: json.ServiceProvider
      });
    } else {
      result.serviceErrorMessage =
        "Service information not found in GetCapabilities operation response.";
    }

    var layer = findLayer(json, wmtsItem.layer);
    wmtsItem.currentLayer = layer;
    if (layer) {
      populateMetadataGroup(result.dataSourceMetadata, layer);
    } else {
      result.dataSourceErrorMessage =
        "Layer information not found in GetCapabilities operation response.";
    }

    wmtsItem.updateFromCapabilities(json, false, layer);

    result.isLoading = false;
  }).otherwise(function() {
    result.dataSourceErrorMessage =
      "An error occurred while invoking the GetCapabilities service.";
    result.serviceErrorMessage =
      "An error occurred while invoking the GetCapabilities service.";
    result.isLoading = false;
  });

  return result;
}

function findLayer(json, name) {
  if (!defined(json.Contents) || !defined(json.Contents.Layer)) {
    return undefined;
  }

  var layers;
  if (Array.isArray(json.Contents.Layer)) {
    layers = json.Contents.Layer;
  } else {
    layers = [json.Contents.Layer];
  }

  for (var i = 0; i < layers.length; ++i) {
    var layer = layers[i];
    if (layer.Identifier === name || layer.Title === name) {
      return layer;
    }
  }

  return undefined;
}

function populateMetadataGroup(metadataGroup, sourceMetadata) {
  if (
    typeof sourceMetadata === "string" ||
    sourceMetadata instanceof String ||
    sourceMetadata instanceof Array
  ) {
    return;
  }

  for (var name in sourceMetadata) {
    if (sourceMetadata.hasOwnProperty(name) && name !== "_parent") {
      var value = sourceMetadata[name];

      var dest;
      if (name === "BoundingBox" && value instanceof Array) {
        for (var i = 0; i < value.length; ++i) {
          var subValue = value[i];

          dest = new MetadataItem();
          dest.name = name + " (" + subValue.CRS + ")";
          dest.value = subValue;

          populateMetadataGroup(dest, subValue);

          metadataGroup.items.push(dest);
        }
      } else {
        dest = new MetadataItem();
        dest.name = name;
        dest.value = value;

        populateMetadataGroup(dest, value);

        metadataGroup.items.push(dest);
      }
    }
  }
}

function updateInfoSection(item, overwrite, sectionName, sectionValue) {
  if (!defined(sectionValue) || sectionValue.length === 0) {
    return;
  }

  var section = item.findInfoSection(sectionName);
  if (!defined(section)) {
    item.info.push({
      name: sectionName,
      content: sectionValue
    });
  } else if (overwrite) {
    section.content = sectionValue;
  }
}

function updateValue(item, overwrite, propertyName, propertyValue) {
  if (!defined(propertyValue)) {
    return;
  }

  if (overwrite || !defined(item[propertyName])) {
    item[propertyName] = propertyValue;
  }
}

function getDataCustodian(json) {
  if (
    defined(json.ServiceProvider) &&
    defined(json.ServiceProvider.ProviderName)
  ) {
    var name = json.ServiceProvider.ProviderName;
    var web;
    var email;

    if (
      defined(json.ServiceProvider.ProviderSite) &&
      defined(json.ServiceProvider.ProviderSite["xlink:href"])
    ) {
      web = json.ServiceProvider.ProviderSite.href;
    }

    if (
      defined(json.ServiceProvider.ServiceContact) &&
      defined(json.ServiceProvider.ServiceContact.Address) &&
      defined(json.ServiceProvider.ServiceContact.Address.ElectronicMailAddress)
    ) {
      email = json.ServiceProvider.ServiceContact.Address.ElectronicMailAddress;
    }

    var text = defined(web) ? "[" + name + "](" + web + ")" : name;
    if (defined(email)) {
      text += "<br/>";
      text += "[" + email + "](mailto:" + email + ")";
    }

    return text;
  } else {
    return undefined;
  }
}

// Copied from web map service catalog item
// to support time dimension

function getIntervalsFromLayer(wmtsItem, layer) {
  var dimensions = wmtsItem.availableDimensions[layer.Identifier];

  if (!defined(dimensions)) {
    return undefined;
  }

  if (!(dimensions instanceof Array)) {
    dimensions = [dimensions];
  }

  var result = new TimeIntervalCollection();

  for (var i = 0; i < dimensions.length; ++i) {
    var dimension = dimensions[i];

    const name = dimension.Identifier || dimension.name || "";

    if (name.toLowerCase() !== "time") {
      continue;
    }

    let values = dimension.Value || dimension.Values || dimension.options;

    var times = Array.isArray(values) ? values : [values];

    if (times) {
      for (var j = 0; j < times.length; ++j) {
        var isoSegments = times[j].split("/");
        if (isoSegments.length > 1) {
          updateIntervalsFromIsoSegments(
            result,
            isoSegments,
            times[j],
            wmtsItem
          );
        } else {
          updateIntervalsFromTimes(result, times, j, wmtsItem.displayDuration);
        }
      }
    }
  }

  return result;
}

function updateIntervalsFromTimes(result, times, index, defaultDuration) {
  const timesFixed = [...times].map(a =>
    a
      .replace("D1", "01")
      .replace("D2", "11")
      .replace("D3", "21")
  );

  timesFixed.sort();

  let timeAtIndex = timesFixed[index];

  var start = JulianDate.fromIso8601(timeAtIndex);
  var stop;

  if (defaultDuration) {
    stop = JulianDate.addMinutes(start, defaultDuration, new JulianDate());
  } else if (index < timesFixed.length - 1) {
    // if the next date has a slash in it, just use the first part of it
    var nextTimeIsoSegments = timesFixed[index + 1].split("/");
    stop = JulianDate.fromIso8601(nextTimeIsoSegments[0]);
  } else if (result.length > 0) {
    var previousInterval = result.get(result.length - 1);
    var duration = JulianDate.secondsDifference(
      previousInterval.stop,
      previousInterval.start
    );
    stop = JulianDate.addSeconds(start, duration, new JulianDate());
  } else {
    // There's exactly one timestamp, so we set stop = start.
    stop = start;
  }
  result.addInterval(
    new TimeInterval({
      start: start,
      stop: stop,
      data: times[index]
    })
  );
}

function formatMomentForWmts(m, duration) {
  // If the original moment only contained a date (not a time), and the
  // duration doesn't include hours, minutes, or seconds, format as a date
  // only instead of a date+time.  Some WMS servers get confused when
  // you add a time on them.
  if (
    duration.hours() > 0 ||
    duration.minutes() > 0 ||
    duration.seconds() > 0 ||
    duration.milliseconds() > 0
  ) {
    return m.format();
  } else if (m.creationData().format.indexOf("T") >= 0) {
    return m.format();
  } else {
    return m.format(m.creationData().format);
  }
}

function updateIntervalsFromIsoSegments(
  intervals,
  isoSegments,
  time,
  wmtsItem
) {
  // Note parseZone will create a moment with the original specified UTC offset if there is one,
  // but if not, it will create a moment in UTC.
  var start = moment.parseZone(isoSegments[0]);
  var stop = moment.parseZone(isoSegments[1]);

  if (isoSegments.length === 2) {
    // Does this situation ever arise?  The standard is confusing:
    // Section 7.2.4.6.10 of the standard, defining getCapabilities, refers to sections 6.7.5 through 6.7.7.
    // Section 6.7.6 is about Temporal CS, and says in full:
    //     Some geographic information may be available at multiple times (for example, an hourly weather map). A WMS
    //     may announce available times in its service metadata, and the GetMap operation includes a parameter for
    //     requesting a particular time. The format of a time string is specified in Annex D. Depending on the context, time
    //     values may appear as a single value, a list of values, or an interval, as specified in Annex C. When providing
    //     temporal information, a server should declare a default value in service metadata, and a server shall respond with
    //     the default value if one has been declared and the client request does not include a value.
    // Annex D says only moments and periods are allowed - it does not mention intervals.
    // Annex C describes how to request layers - not what getCapabilities returns: but it does allow for intervals.
    //     In either case, value uses the format described in Table C.2 to provide a single value, a comma-separated list, or
    //     an interval of the form start/end without a resolution... An interval in a request
    //     value is a request for all the data from the start value up to and including the end value.
    // This seems to imply getCapabilities should only return dates or periods, but that you can request a period, and receive
    // a server-defined aggregation of the layers in that period.
    //
    // But MapServer actually gives an example getCapabilities which contains a period:
    //     http://mapserver.org/ogc/wms_time.html#getcapabilities-output
    //     <Extent name="time" default="2004-01-01 14:10:00" nearestValue="0">2004-01-01/2004-02-01</Extent>
    // The standard defines nearestValue such that: 0 = request value(s) must correspond exactly to declared extent value(s),
    // and yet the default is not exactly a declared extend value.
    // So it looks like Map Server defines a period in GetCapabilities, but actually wants it requested using a date,
    // not a period, and that any date in that interval will return the same thing.
    intervals.addInterval(
      new TimeInterval({
        start: JulianDate.fromIso8601(start.format()),
        stop: JulianDate.fromIso8601(stop.format()),
        data: start // Convert the period to a date for requests (see discussion above).
      })
    );
  } else {
    // Note WMS uses extension ISO19128 of ISO8601; ISO 19128 allows start/end/periodicity
    // and does not use the "R[n]/" prefix for repeated intervals
    // eg. Data refreshed every 30 min: 2000-06-18T14:30Z/2000-06-18T14:30Z/PT30M
    // See 06-042_OpenGIS_Web_Map_Service_WMS_Implementation_Specification.pdf section D.4
    var duration = moment.duration(isoSegments[2]);
    if (
      duration.isValid() &&
      (duration.milliseconds() > 0 ||
        duration.seconds() > 0 ||
        duration.minutes() > 0 ||
        duration.hours() > 0 ||
        duration.days() > 0 ||
        duration.weeks() > 0 ||
        duration.months() > 0 ||
        duration.years() > 0)
    ) {
      var thisStop = start.clone();
      var prevStop = start;
      var stopDate = stop;
      var count = 0;

      // Add intervals starting at start until:
      //    we go past the stop date, or
      //    we go past the max limit
      while (
        thisStop &&
        prevStop.isSameOrBefore(stopDate) &&
        count < wmtsItem.maxRefreshIntervals
      ) {
        thisStop.add(duration);
        intervals.addInterval(
          new TimeInterval({
            start: JulianDate.fromIso8601(prevStop.format()),
            stop: JulianDate.fromIso8601(thisStop.format()),
            data: formatMomentForWmts(prevStop, duration) // used to form the web request
          })
        );
        prevStop = thisStop.clone();
        ++count;
      }
    } else {
      wmtsItem.terria.error.raiseEvent(
        new TerriaError({
          title: i18next.t(
            "models.webMapServiceCatalogItem.badlyFormatedTitle"
          ),
          message: i18next.t(
            "models.webMapServiceCatalogItem.badlyFormatedMessage",
            { name: wmtsItem.name, isoSegments: isoSegments[2] }
          )
        })
      );
    }
  }
}

function computeLegendUrls(catalogItem) {
  var result = [];
  var layer = catalogItem.currentLayer;
  if (!defined(layer)) {
    return result;
  }

  var legend = computeLegendForLayer(catalogItem, layer);
  if (defined(legend)) {
    result.push(legend);
  }

  return result;
}

function computeLegendForLayer(catalogItem, thisLayer) {
  let legendUri, legendMimeType;
  catalogItem._setParameters();

  // If we're using a specific styleName, use the legend associated with that style (if any).
  // Otherwise, use the legend associated with the first style in the list.
  var style = Array.isArray(thisLayer.Style)
    ? thisLayer.Style[0]
    : thisLayer.Style;

  if (defined(style) && defined(style.LegendURL)) {
    // Use the legend from the style.
    // According to the WMS schema, LegendURL is unbounded.  Use the first legend in the style.
    var legendUrl = Array.isArray(style.LegendURL)
      ? style.LegendURL[0]
      : style.LegendURL;
    if (
      defined(legendUrl) &&
      defined(legendUrl.OnlineResource) &&
      defined(legendUrl.OnlineResource["xlink:href"])
    ) {
      legendUri = new URI(
        decodeURIComponent(legendUrl.OnlineResource["xlink:href"])
      );
      legendMimeType = legendUrl.Format;
    }
  }

  if (!defined(legendUri)) {
    // Construct a GetLegendGraphic request.
    legendUri = new URI(
      cleanUrl(catalogItem.url) +
        "?service=WMTS&version=1.1.0&request=GetLegendGraphic&format=image/png&transparent=True&layer=" +
        encodeURIComponent(thisLayer.Identifier)
    );
    if (defined(style) && defined(style.Name))
      legendUri.addQuery("styles", style.Name);

    legendMimeType = "image/png";
  }

  if (defined(legendUri)) {
    // Tweak the URL to produce a better looking legend when possible.
    if (legendUri.toString().match(/GetLegendGraphic/i)) {
      if (catalogItem.isGeoServer) {
        legendUri.setQuery("version", "1.1.0");
        var legendOptions = "fontSize:14;forceLabels:on;fontAntiAliasing:true";
        legendUri.setQuery("transparent", "True"); // remove if our background is no longer light
        // legendOptions += ';fontColor:0xDDDDDD' // enable if we can ensure a dark background
        // legendOptions += ';dpi:182';           // enable if we can scale the image back down by 50%.
        legendUri.setQuery("LEGEND_OPTIONS", legendOptions);
      }

      // Include all of the parameters in the legend URI as well.
      if (defined(catalogItem.parameters)) {
        for (var key in catalogItem.parameters) {
          if (catalogItem.parameters.hasOwnProperty(key)) {
            legendUri.setQuery(key, catalogItem.parameters[key]);
          }
        }
      }

      if (
        defined(catalogItem.colorScaleMinimum) &&
        defined(catalogItem.colorScaleMaximum) &&
        !defined(catalogItem.parameters.colorscalerange)
      ) {
        legendUri.setQuery(
          "colorscalerange",
          [catalogItem.colorScaleMinimum, catalogItem.colorScaleMaximum].join(
            ","
          )
        );
      }
    }

    return new LegendUrl(
      addToken(
        legendUri.toString(),
        catalogItem.tokenParameterName,
        catalogItem._lastToken
      ),
      legendMimeType
    );
  }

  return undefined;
}

function addToken(url, tokenParameterName, token) {
  if (!defined(token)) {
    return url;
  } else {
    return new URI(url).setQuery(tokenParameterName, token).toString();
  }
}
module.exports = WebMapTileServiceCatalogItem;
