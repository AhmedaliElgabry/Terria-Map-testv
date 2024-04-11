"use strict";

/*global require*/
var clone = require("terriajs-cesium/Source/Core/clone").default;
var defaultValue = require("terriajs-cesium/Source/Core/defaultValue").default;
var defined = require("terriajs-cesium/Source/Core/defined").default;
var DeveloperError = require("terriajs-cesium/Source/Core/DeveloperError")
  .default;
var inherit = require("../Core/inherit");
var Metadata = require("./Metadata");
var TableCatalogItem = require("./TableCatalogItem");
var TerriaError = require("../Core/TerriaError");
var raiseErrorToUser = require("./raiseErrorToUser");
var proxyCatalogItemUrl = require("./proxyCatalogItemUrl");
var TableStructure = require("../Map/TableStructure");
var i18next = require("i18next").default;
import axios, { CancelToken } from "axios";
import knockout from "terriajs-cesium/Source/ThirdParty/knockout";
import when from "terriajs-cesium/Source/ThirdParty/when";
import runLater from "../Core/runLater";
import CsvCatalogItem from "./CsvCatalogItem";
import VisualizationType from "./VisualizationType";
var moment = require("moment");

const JsonStatHelper = require("../Utilities/JsonStatHelper.js");

/**
 * A {@link CatalogItem} representing CSV data.
 *
 * @alias SmartCsvCatalogItem
 * @constructor
 * @extends TableCatalogItem
 *
 * @param {Terria} terria The Terria instance.
 * @param {String} [url] The URL from which to retrieve the CSV data.
 * @param {Object} [options] Initial values.
 * @param {Boolean} [options.isCsvForCharting] Whether this is solely for charting
 * @param {TableStyle} [options.tableStyle] An initial table style can be supplied if desired.
 */
var SmartCsvCatalogItem = function(terria, url, options) {
  CsvCatalogItem.call(this, terria, url, options);

  options = defaultValue(options, defaultValue.EMPTY_OBJECT);

  /**
   * Refreshes the catalog item. This property is used inside DimensionSelector & SmartCsvDimensionSelector
   * @type {String}
   */
  this.needsRefresh = true;

  this.onSmartCsvDimensionChange = knockout
    .observable("onSmartCsvDimensionChange")
    .extend({ notify: "always" });

  /**
   * Flag to be used for charting, whether this item is generated for the purposes of drawing a chart
   * @type {Boolean}
   */
  this.isCsvForCharting = false;

  /**
   * Decides if a user is able to select multiple values for each dimension in this layer
   * @type {Boolean}
   * @default false
   */
  this.supportMultipleFilterValues = false;

  /**
   * A url pointing to a jsonstat document that defines the
   * filters
   * @type {URL}
   */
  this.schemaUrl = defaultValue(options.schemaUrl, "");

  /**
   * The default values for the filter parameters
   * Can also be specified within the jsonstat document (which schemaUrl points to)
   * @type {Object}
   */
  this.defaultParameters = defaultValue(options.defaultParameters, {});

  /**
   * The maximum amount of time to wait, in seconds, for response from the server
   * @type {Number}
   */
  this.requestTimeout = 60;

  /**
   * Current Selection of filters for this catalog item;
   * @type {Object}
   */
  this.Selection = defaultValue(options.Selection, {});
  /**
   * Disables the smart-csv dimension dropdowns if the catalog item is in a loading state
   * Prevents the user from changing filters while another request is in progress
   * @type {Boolean}
   */
  this.disableFiltersWhileLoading = false;

  this.onInitialized = knockout
    .observable("onInitialized")
    .extend({ notify: "always" });

  this.initialize = function(load) {
    const jsonStatHelper = new JsonStatHelper();

    const onInitError = err => {
      this.isLoading = false;
      this.isEnabled = false;
      this.isShown = false;

      raiseErrorToUser(
        this.terria,
        new TerriaError({
          sender: this,
          title: "Error Loading smart-csv schema",
          message: i18next.t("models.smart-csv.unableToLoadMessage", {
            message: "Unable to load smart-csv schema"
          })
        })
      );
    };

    return new Promise((resolve, reject) => {
      try {
        if (!this.schemaUrl) return;
        const that = this;

        const proxiedUrl = proxyCatalogItemUrl(this, this.schemaUrl, "0d");
        axios.get(proxiedUrl).then(data => {
          let dimensionInfo = data.data;

          if (typeof dimensionInfo === "string")
            dimensionInfo = JSON.parse(dimensionInfo);

          that.SmartCsvDimensions = {
            Dimensions: jsonStatHelper.getDimensions(dimensionInfo)
          };

          const metadata = jsonStatHelper.getMetadata(dimensionInfo);

          if (metadata && metadata.default) {
            that.defaultParameters = metadata.default;
          }

          that._additionalSettings = metadata;

          that._intialized = true;

          runLater(() => {
            that.onInitialized.valueHasMutated();
          }, 200);

          return resolve(load(that, true));
        }, onInitError);
      } catch (err) {
        reject(err);
        onInitError(err);
      }
    });
  };

  this.onSmartCsvDimensionChanged = function() {
    if (
      this.terria.viewType == VisualizationType.TABLE &&
      this.terria.nowViewingTable?.uniqueId !== this.uniqueId
    ) {
      return;
    }

    const selection = this.Selection;

    if (!selection) return;

    if (this.cancelToken) {
      this.cancelToken.cancel({
        userAbort: true
      });
      this.cancelToken = null;
    }

    // Remove the previously loaded data
    this.clearData();

    this.isLoading = true;

    const loadingPromise = this._load();
    const that = this;

    const onError = function(e) {
      if (e.message.userAbort) {
        console.warn("User abort");
        return;
      } else if (e.message.timedOut) {
        raiseErrorToUser(
          that.terria,
          new TerriaError({
            sender: that,
            title: i18next.t("models.smart-csv.unableToLoadTitle"),
            message: i18next.t("models.smart-csv.unableToLoadMessage", {
              message: "Request timed out"
            })
          })
        );
      } else {
        raiseErrorToUser(
          that.terria,
          new TerriaError({
            sender: that,
            title: i18next.t("models.smart-csv.unableToLoadTitle"),
            message: i18next.t("models.smart-csv.unableToLoadMessage", {
              message: e.message || e.response
            })
          })
        );
      }

      that.isLoading = false;

      that.terria.currentViewer.notifyRepaintRequired();
    };

    return loadingPromise.then(() => {
      that.isLoading = false;

      that.isShown = true;
      if (that._regionMapping) {
        // refresh for region mapped catalog items
        var currentIndex;
        if (defined(this.terria.cesium)) {
          var imageryLayers = this.terria.cesium.scene.imageryLayers;
          currentIndex = imageryLayers.indexOf(this._imageryLayer);
        }
        that._hide();
        that._disable();
        if (that.isEnabled) {
          that._enable(currentIndex);
          if (that.isShown) {
            that._show();
          }
        }
      } else {
        that.isRefreshing = true;
      }

      that.terria.currentViewer.notifyRepaintRequired();
    }, onError);
  };
};

inherit(CsvCatalogItem, SmartCsvCatalogItem);

Object.defineProperties(SmartCsvCatalogItem.prototype, {
  /**
   * Gets the type of data member represented by this instance.
   * @memberOf SmartCsvCatalogItem.prototype
   * @type {String}
   */
  type: {
    get: function() {
      return "smart-csv";
    }
  },

  /**
   * Gets a human-readable name for this type of data source, 'CSV'.
   * @memberOf SmartCsvCatalogItem.prototype
   * @type {String}
   */
  typeName: {
    get: function() {
      return i18next.t("models.smart-csv.name");
    }
  },

  /**
   * Gets the metadata associated with this data source and the server that provided it, if applicable.
   * @memberOf SmartCsvCatalogItem.prototype
   * @type {Metadata}
   */
  metadata: {
    //TODO: return metadata if tableDataSource defined
    get: function() {
      var result = new Metadata();
      result.isLoading = false;
      result.dataSourceErrorMessage = i18next.t(
        "models.smart-csv.dataSourceErrorMessage"
      );
      result.serviceErrorMessage = i18next.t(
        "models.smart-csv.serviceErrorMessage"
      );
      return result;
    }
  },

  /**
   * Gets the data source associated with this catalog item.
   * @memberOf SmartCsvCatalogItem.prototype
   * @type {DataSource}
   */
  dataSource: {
    get: function() {
      return this._dataSource;
    }
  },

  /**
   * Gets the set of names of the properties to be serialized for this object when {@link CatalogMember#serializeToJson} is called
   * for a share link.
   * @memberOf ImageryLayerCatalogItem.prototype
   * @type {String[]}
   */
  propertiesForSharing: {
    get: function() {
      return SmartCsvCatalogItem.defaultPropertiesForSharing;
    }
  },

  filterParameters: {
    get: function() {
      const selection = this.Selection || {};

      const defaultParameters = this.defaultParameters || {};
      // The default parameter object may contian tokens or queries that
      // cannot be changed by the user through the UI.
      // In such cases, we  want to include those values with the request.
      const params = { ...defaultParameters, ...selection };

      replacePropertyWithValue(
        params,
        "currentDate",
        moment().format("YYYY-MM-DD")
      );

      // we sort the parameter list to avoid unintentionally doing cache busting and
      // to make sure _loadInfluencingValues stays consistent, which avoids unnecessary loads
      const queryParams = Object.keys(params)
        .sort()
        .filter(key => params[key])
        .map(key => `${key}=${params[key]}`)
        .join("&");

      return queryParams;
    }
  }
});

SmartCsvCatalogItem.defaultUpdaters = clone(CsvCatalogItem.defaultUpdaters);

Object.freeze(SmartCsvCatalogItem.defaultUpdaters);

SmartCsvCatalogItem.defaultSerializers = clone(
  CsvCatalogItem.defaultSerializers
);

Object.freeze(SmartCsvCatalogItem.defaultSerializers);

SmartCsvCatalogItem.defaultPropertiesForSharing = clone(
  CsvCatalogItem.defaultPropertiesForSharing
);

SmartCsvCatalogItem.defaultPropertiesForSharing.push("dataUrl");
SmartCsvCatalogItem.defaultPropertiesForSharing.push("sourceCatalogItemId");
SmartCsvCatalogItem.defaultPropertiesForSharing.push("Selection");

Object.freeze(SmartCsvCatalogItem.defaultPropertiesForSharing);

/**
 * Loads the TableStructure from a csv file.
 *
 * @param {SmartCsvCatalogItem} item Item that tableDataSource is created for
 * @param {String} csvString String in csv format.
 * @return {Promise} A promise that resolves to true if it is a recognised format.
 * @private
 */
function loadTableFromCsv(item, csvString) {
  var tableStyle = item._tableStyle;
  var options = {
    idColumnNames: item.idColumns,
    isSampled: item.isSampled,
    initialTimeSource: item.initialTimeSource,
    displayDuration: tableStyle.displayDuration,
    replaceWithNullValues: tableStyle.replaceWithNullValues,
    replaceWithZeroValues: tableStyle.replaceWithZeroValues,
    columnOptions: tableStyle.columns // may contain per-column replacements for these,
  };

  var tableStructure = new TableStructure(undefined, options);

  tableStructure.loadFromCsv(csvString);
  item.csvStr = csvString;
  return item.initializeFromTableStructure(tableStructure);
}

SmartCsvCatalogItem.prototype._getValuesThatInfluenceLoad = function() {
  return [this.url, this.filterParameters, this.isTimeDisabled];
};

SmartCsvCatalogItem.prototype.clearData = function() {
  if (this._dataSource) {
    this.terria.dataSources.contains(this._dataSource) && this._hide();
    this._dataSource = null;
  } else if (this._regionMapping) {
    this._regionMapping.hideImageryLayer();
    this._regionMapping = null;
  }
  this._tableStructure = null;
};

SmartCsvCatalogItem.prototype._reload = function() {
  if (!defined(this.tableStructure) && !defined(this.csvStr)) {
    return;
  }

  this.isRefreshing = true;
  this.isLoading = true;
  this.clearData();

  try {
    return loadTableFromCsv(this, this.csvStr);
  } catch (error) {
    raiseErrorToUser(
      this.terria,
      new TerriaError({
        sender: this,
        title: "Error loading data",
        message:
          "An error occured while loading the data. Please try again or contact support"
      })
    );
  }
};
/**
 * @returns {Promise} A promise that resolves when the load is complete, or undefined if the function is already loaded.
 */
SmartCsvCatalogItem.prototype._load = function() {
  var that = this;

  this.isLoading = true;

  if (!this._intialized) {
    return this.initialize(load);
  }

  return load(that);

  function load(that) {
    let urlToUse = that.url || that.dataUrl;

    if (that.filterParameters) {
      urlToUse =
        urlToUse + (urlToUse.includes("?") ? "&" : "?") + that.filterParameters;
    } else {
      return;
    }

    that._lastLoadInfluencingValues = that._getValuesThatInfluenceLoad();

    if (defined(urlToUse)) {
      const proxiedUrl = proxyCatalogItemUrl(that, urlToUse, "1d");

      return loadCsv(proxiedUrl, that).then(function(response) {
        if (!response) {
          return when();
        }

        const csvString = response.data;

        if (!isCsvValid(csvString)) {
          raiseErrorToUser(
            that.terria,
            new TerriaError({
              sender: that,
              title: "No data found",
              message: "The request returned no results"
            })
          );

          return when();
        }

        try {
          return loadTableFromCsv(that, csvString);
        } catch (error) {
          raiseErrorToUser(
            that.terria,
            new TerriaError({
              sender: that,
              title: "Error loading data",
              message:
                "An error occured while loading the data. Please try again or contact support"
            })
          );
        } finally {
          that.cancelToken = null;
        }
      });
    } else {
      throw new TerriaError({
        sender: that,
        title: i18next.t("models.smart-csv.unableToLoadItemTitle"),
        message: i18next.t("models.smart-csv.unableToLoadItemMessage")
      });
    }
  }
};

function isCsvValid(csv) {
  if (!csv || !csv.length) return false;

  const len = csv.split("\n").filter(entry => entry).length;

  return len > 1; // if backend is retu
}

function replacePropertyWithValue(selection, propertyName, val) {
  for (const dimension in selection) {
    if (
      selection.hasOwnProperty(dimension) &&
      selection[dimension] == propertyName
    ) {
      selection[dimension] = val;
      break;
    }
  }
  return selection;
}

/**
 * The same as terriajs-cesium/Source/Core/loadText, but with the ability to pass overrideMimeType through to loadWithXhr.
 * @private
 */
function loadCsv(url, item) {
  const source = CancelToken.source();
  const timeoutHanlde = setTimeout(() => {
    source.cancel({
      timedOut: true
    });
  }, item.requestTimeout * 1000 || 30000);

  item.cancelToken = source;

  const headers = {
    "content-type": "text/csv",
    Accept: "text/csv"
  };

  if (item.charSet) {
    headers["charset"] = item.charSet;
  }

  return axios
    .get(url, {
      headers: headers,
      cancelToken: source.token
    })
    .finally(() => {
      clearTimeout(timeoutHanlde);
    });
}

module.exports = SmartCsvCatalogItem;
