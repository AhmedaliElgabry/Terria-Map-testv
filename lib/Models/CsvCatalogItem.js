"use strict";

/*global require*/
var clone = require("terriajs-cesium/Source/Core/clone").default;
var defaultValue = require("terriajs-cesium/Source/Core/defaultValue").default;
var defined = require("terriajs-cesium/Source/Core/defined").default;

var DeveloperError = require("terriajs-cesium/Source/Core/DeveloperError")
  .default;

var Resource = require("terriajs-cesium/Source/Core/Resource").default;
var when = require("terriajs-cesium/Source/ThirdParty/when").default;

var inherit = require("../Core/inherit");
var Metadata = require("./Metadata");
var TableCatalogItem = require("./TableCatalogItem");
var TerriaError = require("../Core/TerriaError");
var proxyCatalogItemUrl = require("./proxyCatalogItemUrl");
var readText = require("../Core/readText");
var TableStructure = require("../Map/TableStructure");
var i18next = require("i18next").default;
var axios = require("axios");
var standardCssColors = require("../Core/standardCssColors");

/**
 * A {@link CatalogItem} representing CSV data.
 *
 * @alias CsvCatalogItem
 * @constructor
 * @extends TableCatalogItem
 *
 * @param {Terria} terria The Terria instance.
 * @param {String} [url] The URL from which to retrieve the CSV data.
 * @param {Object} [options] Initial values.
 * @param {Boolean} [options.isCsvForCharting] Whether this is solely for charting
 * @param {TableStyle} [options.tableStyle] An initial table style can be supplied if desired.
 */
var CsvCatalogItem = function(terria, url, options) {
  TableCatalogItem.call(this, terria, url, options);

  options = defaultValue(options, defaultValue.EMPTY_OBJECT);

  /**
   * Gets or sets the character set of the data, which overrides the file information if present. Default is undefined.
   * This property is observable.
   * @type {String}
   */
  this.charSet = undefined;

  /**
   * Some catalog items are created from other catalog items.
   * Record here so that the user (eg. via "About this Dataset") can reference the source item.
   * @type {CatalogItem}
   */
  this.sourceCatalogItem = undefined;
  this.sourceCatalogItemId = undefined;
  this.regenerationOptions = {};

  /**
   * Options for the value of the animation timeline at start. Valid options in config file are:
   *     initialTimeSource: "present"                            // closest to today's date
   *     initialTimeSource: "start"                              // start of time range of animation
   *     initialTimeSource: "end"                                // end of time range of animation
   *     initialTimeSource: An ISO8601 date e.g. "2015-08-08"    // specified date or nearest if date is outside range
   * @type {String}
   */
  this.initialTimeSource = undefined;

  /**
   * Flag to be used for charting, whether this item is generated for the purposes of drawing a chart
   * @type {Boolean}
   */
  this.isCsvForCharting = defaultValue(options.isCsvForCharting, false);

  /**
   * A HTML string to show above the chart as a disclaimer
   * @type {String}
   * @default null
   */
  this.chartDisclaimer = defaultValue(options.chartDisclaimer, null);
};

inherit(TableCatalogItem, CsvCatalogItem);

Object.defineProperties(CsvCatalogItem.prototype, {
  /**
   * Gets the type of data member represented by this instance.
   * @memberOf CsvCatalogItem.prototype
   * @type {String}
   */
  type: {
    get: function() {
      return "csv";
    }
  },

  /**
   * Gets a human-readable name for this type of data source, 'CSV'.
   * @memberOf CsvCatalogItem.prototype
   * @type {String}
   */
  typeName: {
    get: function() {
      return i18next.t("models.csv.name");
    }
  },

  /**
   * Gets the metadata associated with this data source and the server that provided it, if applicable.
   * @memberOf CsvCatalogItem.prototype
   * @type {Metadata}
   */
  metadata: {
    //TODO: return metadata if tableDataSource defined
    get: function() {
      var result = new Metadata();
      result.isLoading = false;
      result.dataSourceErrorMessage = i18next.t(
        "models.csv.dataSourceErrorMessage"
      );
      result.serviceErrorMessage = i18next.t("models.csv.serviceErrorMessage");
      return result;
    }
  },

  /**
   * Gets the data source associated with this catalog item.
   * @memberOf CsvCatalogItem.prototype
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
      // if this catalog item contains analysis result, then add "customProperties" to list of properties to share
      if (
        this.customProperties &&
        (this.customProperties.highchartsOption ||
          this.customProperties.analysisResult)
      ) {
        return [
          ...CsvCatalogItem.defaultPropertiesForSharing,
          "customProperties"
        ];
      }

      return CsvCatalogItem.defaultPropertiesForSharing;
    }
  }
});

CsvCatalogItem.defaultUpdaters = clone(TableCatalogItem.defaultUpdaters);

CsvCatalogItem.defaultUpdaters.sourceCatalogItem = function() {
  // TODO: For now, don't update from JSON. Better to do it via an id?
};

Object.freeze(CsvCatalogItem.defaultUpdaters);

CsvCatalogItem.defaultSerializers = clone(TableCatalogItem.defaultSerializers);

CsvCatalogItem.defaultSerializers.sourceCatalogItem = function() {
  // TODO: For now, don't serialize. Can we do it via an id?
};

CsvCatalogItem.defaultSerializers.customProperties = function(
  item,
  json,
  propertyName,
  options
) {
  if (
    item.type === "csv" &&
    item.customProperties &&
    item.customProperties.highchartsOption
  ) {
    json.customProperties = { ...item.customProperties };
  }
};

Object.freeze(CsvCatalogItem.defaultSerializers);

CsvCatalogItem.defaultPropertiesForSharing = clone(
  TableCatalogItem.defaultPropertiesForSharing
);
CsvCatalogItem.defaultPropertiesForSharing.push("isCsvForCharting");
CsvCatalogItem.defaultPropertiesForSharing.push("dataUrl");
CsvCatalogItem.defaultPropertiesForSharing.push("sourceCatalogItemId");
CsvCatalogItem.defaultPropertiesForSharing.push("regenerationOptions");

Object.freeze(CsvCatalogItem.defaultPropertiesForSharing);

/**
 * Loads analysis results into Table
 *
 * @param {String} url url for doing analysis
 * @param {Object}  String in csv format.
 * @return {Promise} A promise that resolves to true if it is a recognised format.
 * @private
 */
CsvCatalogItem.prototype.loadTableFromAnalysis = function(
  item,
  response,
  analysisType,
  geometryName,
  catalogItemName
) {
  try {
    item._tableStyle.xAxis = response.data.header[0];
    var tableStyle = item._tableStyle;
    var options = {
      idColumnNames: item.idColumns,
      isSampled: item.isSampled,
      regexFormatter: item.data.params.payload.regex,
      initialTimeSource: item.initialTimeSource,
      displayDuration: tableStyle.displayDuration,
      replaceWithNullValues: tableStyle.replaceWithNullValues,
      replaceWithZeroValues: tableStyle.replaceWithZeroValues,
      columnOptions: tableStyle.columns // may contain per-column replacements for these
    };
    var tableStructure = defined(item._tableStructure)
      ? item._tableStructure
      : new TableStructure(undefined, options);
    const csvStr = toCSVString(response, analysisType.chartConfig.range);
    if (defined(tableStructure.csvStr)) {
      const normalizedCsvStr = tableStructure.mergeCsvStrings(
        tableStructure.csvStr,
        csvStr,
        {
          xAxis: item._tableStyle.xAxis
        }
      );
      tableStructure.loadFromCsv(normalizedCsvStr);
      tableStructure.csvStr = normalizedCsvStr;
    } else {
      tableStructure.csvStr = csvStr;
      tableStructure.loadFromCsv(csvStr);
    }
    // Get column names from tablestructure and store the map of geometry name and column name inside a variable and get the highcharts option.
    // Make sure that the column must not be present and only add those columns once. This approach makes it lil bogus.

    item.customProperties.highchartsOption = this.getHighchartOptions(
      analysisType,
      response,
      geometryName,
      tableStructure,
      catalogItemName
    );

    const group = this.terria.catalog.userAddedDataGroup;
    item.id = group.uniqueId + "/" + item.name;
    if (group.items.find(i => i.id === item.id)) {
      this.terria.catalog.userAddedDataGroup.update(item);
    } else {
      this.terria.catalog.userAddedDataGroup.add(item);
    }

    // For visualizing chart in tabular form
    tableStructure._tableViewInitialized = false;

    return tableStructure;
  } catch (err) {
    throw new TerriaError({
      sender: item,
      title: i18next.t("models.csv.serverErrortitle"),
      message:
        i18next.t("models.csv.serverErrorMessage", {
          appName: this.terria.appName
        }) +
        '<a href="mailto:' +
        this.terria.supportEmail +
        '">' +
        this.terria.supportEmail +
        "</a>."
    });
  }
};

/**
 * Loads the TableStructure from a csv file.
 *
 * @param {CsvCatalogItem} item Item that tableDataSource is created for
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
    columnOptions: tableStyle.columns // may contain per-column replacements for these
  };
  var tableStructure = new TableStructure(undefined, options);
  tableStructure.loadFromCsv(csvString);
  return item.initializeFromTableStructure(tableStructure);
}

/**
 * Regenerates a chart from a given itemJson
 * @param {Object} itemsJson The items as simple JSON data. The JSON should be in the form of an object literal, not a
 *                 string
 * @return {Promise} A promise which resolves to the newly created CsvCatalogItem
 */
CsvCatalogItem.regenerateChartItem = function(itemJson, terria) {
  // we have a csv with url so regenerate, reimplements some of `makeNewCatalogItem()` in
  // lib/ReactViews/Custom/Chart/ChartExpandAndDownloadButtons.jsx
  const newItem = new CsvCatalogItem(terria, itemJson.url, {
    tableStyle: itemJson.tableStyle,
    isCsvForCharting: true
  });
  const group = terria.catalog.userAddedDataGroup;
  newItem.name = itemJson.name;
  newItem.description = itemJson?.customProperties?.analysisResult?.data;
  newItem.id = group.uniqueId + "/" + itemJson.name;
  group.isOpen = true;
  newItem.isLoading = true;
  newItem.isMappable = false;
  if (group.items.find(i => i.id === newItem.id)) {
    group.update(newItem);
  } else {
    group.add(newItem);
  }

  // if we have sourceCatalogItemId and it's a SOS item, use the tablestructure from that to load
  if (itemJson.sourceCatalogItemId) {
    const sourceCatalogItem =
      terria.catalog.shareKeyIndex[itemJson.sourceCatalogItemId];
    newItem.sourceCatalogItem = sourceCatalogItem;
    if (
      defined(sourceCatalogItem) &&
      sourceCatalogItem.type === "sos" &&
      defined(itemJson.regenerationOptions) &&
      defined(sourceCatalogItem.load)
    ) {
      return newItem
        .updateFromJson(itemJson)
        .then(sourceCatalogItem.load.bind(sourceCatalogItem))
        .then(() => {
          newItem.data = sourceCatalogItem.loadIntoTableStructure(
            itemJson.url,
            itemJson.regenerationOptions
          );
          newItem.isEnabled = true;
        })
        .then(newItem.load.bind(newItem))
        .then(() =>
          newItem.applyTableStyleColumnsToStructure(
            itemJson.tableStyle,
            newItem.tableStructure
          )
        );
    } else {
      console.error(
        "Csv regeneration referenced a sourceCatalogItemId that we could not look up"
      );
    }
  }

  newItem.isEnabled = true; // This loads it as well.

  return newItem
    .updateFromJson(itemJson)
    .then(newItem.load.bind(newItem))
    .then(function() {
      return newItem.applyTableStyleColumnsToStructure(
        itemJson.tableStyle,
        newItem.tableStructure
      );
    });
};
/**
 * Loads csv data from a URL into a (usually temporary) table structure.
 * This is required by Chart.jsx for any non-csv format.
 * @param  {String} url The URL.
 * @return {Promise} A promise which resolves to a table structure.
 */
CsvCatalogItem.prototype.loadIntoTableStructure = function(url) {
  const item = this;
  const tableStructure = new TableStructure();
  // Note item is only used for its 'terria', 'forceProxy' and 'cacheDuration' properties
  // (which are all defined on CatalogMember, the base class of CatalogItem).
  return loadTextWithMime(proxyCatalogItemUrl(item, url, "0d")).then(
    tableStructure.loadFromCsv.bind(tableStructure)
  );
};

/**
 * Every <polling.seconds> seconds, if the csvItem is enabled,
 * request data from the polling.url || url, and update/replace this._tableStructure.
 */
CsvCatalogItem.prototype.startPolling = function() {
  const polling = this.polling;

  if (defined(polling.seconds) && polling.seconds > 0) {
    var item = this;

    // Initialise polling and timer variables, because they might not be set yet
    polling.isPolling = item.isEnabled;

    if (!defined(polling.nextScheduledUpdateTime)) {
      const tempDate = new Date();
      tempDate.setSeconds(new Date().getSeconds() + polling.seconds);
      polling.nextScheduledUpdateTime = tempDate;
    }

    this._pollTimeout = setTimeout(function() {
      if (item.isEnabled) {
        polling.isPolling = true;
        item
          .loadIntoTableStructure(polling.url || item.url)
          .then(function(newTable) {
            // Update timestamp
            const tempDate = new Date();
            tempDate.setSeconds(new Date().getSeconds() + polling.seconds);
            polling.nextScheduledUpdateTime = tempDate;

            if (
              item._tableStructure.hasLatitudeAndLongitude !==
                newTable.hasLatitudeAndLongitude ||
              item._tableStructure.columns.length !== newTable.columns.length
            ) {
              console.log(
                "The newly polled data is incompatible with the old data."
              );
              throw new DeveloperError(
                "The newly polled data is incompatible with the old data."
              );
            }
            // Maintain active item and colors.  Assume same column ordering for now.
            item._tableStructure.columns.forEach(function(column, i) {
              newTable.columns[i].isActive = column.isActive;
              newTable.columns[i].color = column.color;
            });
            if (polling.replace) {
              item._tableStructure.columns = newTable.columns;
            } else {
              if (defined(item.idColumns) && item.idColumns.length > 0) {
                item._tableStructure.merge(newTable);
              } else {
                item._tableStructure.append(newTable);
              }
            }
          });
      }
      // update isPolling - if the item is disabled then we are not polling
      polling.isPolling = false;

      // Note this means the timer keeps going even when you remove (disable) the item,
      // but it doesn't actually request new data any more.
      // If the item is re-enabled, the same timer just starts picking it up again.
      item.startPolling();
    }, polling.seconds * 1000);
  }
};

/**
 * @returns {Promise} A promise that resolves when the load is complete, or undefined if the function is already loaded.
 */
CsvCatalogItem.prototype._load = function() {
  var that = this;
  const sourceCatalogItem = this.terria.catalog.shareKeyIndex[
    this.sourceCatalogItemId
  ];

  const sourceIsSos = sourceCatalogItem && sourceCatalogItem.type === "sos";
  const urlToUse = this.url || this.dataUrl;
  // For sos sourced charts, we need it to be ready first so we can assign the promise from
  // SensorObservationServiceCatalogItem's `loadIntoTableStructure` to data and load it that way
  // Otherwise we don't know how to parse the result via loadTableFromCsv
  if (!defined(this.data) && sourceIsSos) {
    return;
  }

  if (defined(this.data)) {
    return when(that.data, async function(data) {
      if (typeof Blob !== "undefined" && data instanceof Blob) {
        return readText(data).then(function(text) {
          return loadTableFromCsv(that, text);
        });
      } else if (typeof data === "string") {
        return loadTableFromCsv(that, data);
      } else if (data instanceof TableStructure) {
        that.applyTableStyleColumnsToStructure(that._tableStyle, data);
        return that.initializeFromTableStructure(data);
      } else if (typeof data === "object") {
        const { params } = data; // type can be used to filter data ops
        const { analysisType, payload, catalogItemName } = params;
        const { geometryName } = payload;
        that.isCsvForCharting = true;
        that.isMappable = false;
        that.customProperties.analysisResult = {
          catalogItemName: params.catalogItemName,
          name: that.name,
          date: new Date()
        };
        try {
          const response = await axios.post(analysisType.endpoint, payload);
          if (analysisType.chartConfig.multiplier) {
            const { data } = response;
            const { multiplier } = analysisType.chartConfig;
            response.data.items = data.items.map(row => {
              return row.map((val, index) => {
                return index === 0 || val === null ? val : val * multiplier; //y axis multiplier for better data presentation
              });
            });
          }
          const tableStructure = that.loadTableFromAnalysis(
            that,
            response,
            analysisType,
            geometryName,
            catalogItemName
          );
          that.applyTableStyleColumnsToStructure(
            that._tableStyle,
            tableStructure
          );
          return that.initializeFromTableStructure(tableStructure);
        } catch (error) {
          that.terria.catalog.removeChartableItem(that);
          that.terria.nowViewing.remove(that);
          throw new TerriaError({
            sender: that,
            title: i18next.t("models.csv.serverErrorTitle"),
            message: i18next.t("models.csv.serverErrorMessage")
          });
        }
      } else {
        throw new TerriaError({
          sender: that,
          title: i18next.t("models.csv.unexpectedTypeTitle"),
          message:
            i18next.t("models.csv.unexpectedTypeMessage", {
              appName: that.terria.appName
            }) +
            '<a href="mailto:' +
            that.terria.supportEmail +
            '">' +
            that.terria.supportEmail +
            "</a>."
        });
      }
    });
  } else if (defined(urlToUse)) {
    var overrideMimeType;
    if (defined(that.charSet)) {
      overrideMimeType = "text/csv; charset=" + that.charSet;
    }
    return loadTextWithMime(
      proxyCatalogItemUrl(that, urlToUse, "1d"),
      undefined,
      overrideMimeType
    )
      .then(function(text) {
        return loadTableFromCsv(that, text);
      })
      .otherwise(function(e) {
        throw new TerriaError({
          sender: that,
          title: i18next.t("models.csv.unableToLoadTitle"),
          message: i18next.t("models.csv.unableToLoadMessage", {
            message: e.message || e.response
          })
        });
      });
  } else {
    throw new TerriaError({
      sender: that,
      title: i18next.t("models.csv.unableToLoadItemTitle"),
      message: i18next.t("models.csv.unableToLoadItemMessage")
    });
  }
};

/**
 * The same as terriajs-cesium/Source/Core/loadText, but with the ability to pass overrideMimeType through to loadWithXhr.
 * @private
 */
function loadTextWithMime(url, headers, overrideMimeType) {
  return Resource.fetch({
    url: url,
    headers: headers,
    overrideMimeType: overrideMimeType
  });
}
/**
 * {
 *  header:[]
 *  items: [ [], [] ]
 * }
 */

function getRange(response, range) {
  const { header, items } = response.data;
  const columnsIndexForRange = range.map(a => header.indexOf(a));

  const newHeader = range.join("-");

  const rangeValues = items.map(item => {
    return columnsIndexForRange.map(a => item[a]);
  });

  return {
    newColumn: newHeader,
    rangeValues: rangeValues
  };
}

function modifyForRange(response, range) {
  const { header, items } = response.data;
  const columnsIndexForRange = range.map(a => header.indexOf(a));

  const { rangeValues, newColumn } = getRange(response, range);

  const newHeader = header.filter(a => !range.includes(a));
  newHeader.push(newColumn);

  const newItems = items.map((item, index) => {
    const tempItems = item.filter((a, i) => !columnsIndexForRange.includes(i));
    return [...tempItems, rangeValues[index]];
  });

  return {
    header: newHeader,
    items: newItems
  };
}

function toCSVString(response, range) {
  const { header, items } = range
    ? modifyForRange(response, range)
    : response.data;

  const csvHeader = header.map(value => `"${value}"`).join(",");
  let setNullsToZero = false;

  if (items.every(a => a.length > 1 && !a[1])) {
    console.warn("api returned null result ", items);
    setNullsToZero = true;
  }

  // sometimes the api returns null data values. In those cases change null to zero
  items.forEach(item => {
    for (let i = 0; i < item.length; i++) {
      if (!item[i] && setNullsToZero) {
        item[i] = 0;
      }
    }
  });

  const csvContent = items
    .map(a =>
      a
        .map(value => (typeof value === "string" ? `"${value}"` : value))
        .join(",")
    )
    .join("\n");

  return `${csvHeader}\n${csvContent}`;
}

function getColumnConfig(response, chartConfig, col) {
  const def = { id: col.id, name: col.name, type: "spline" };
  // const def = { name: col, type: "spline" };
  if (!chartConfig) {
    return def;
  }

  if (chartConfig.range) {
    if (chartConfig.range.join("-") === col.name) {
      const { rangeValues, newColumn } = getRange(response, chartConfig.range);
      const template = (chartConfig.series || []).filter(
        a => a.name === newColumn
      );
      const config = (template.length && template[0]) || {
        name: newColumn,
        type: "areasplinerange"
      };
      config.data = rangeValues;
      return config;
    }
  }
  if (chartConfig.chart && chartConfig.chart.type) {
    if (chartConfig.chart.type.isPolar && !chartConfig.chart.type) {
      def.type = "line";
      return def;
    }
    def.type = chartConfig.chart.type;
    def.isActive = chartConfig.chart.isActive;
    return def;
  }

  if (chartConfig.series) {
    // eslint-disable-next-line eqeqeq
    const template = chartConfig.series.find(a => a.name == col.name);

    if (!template) {
      return def;
    }

    if (!template.type && chartConfig.type) template.type = chartConfig.type;

    return template;
  }
  // add values here
  return def;
}

CsvCatalogItem.prototype.getHighchartOptions = function(
  selectedType,
  response,
  geometryName,
  tableStructure,
  catalogItemName
) {
  const chartConfig = selectedType.chartConfig;
  const columnPrefix = geometryName;
  const key = selectedType.isGrouping
    ? `${catalogItemName} - ${selectedType.name}`
    : `${catalogItemName} - ${selectedType.name} - ${geometryName}`;
  const pieHeight = "340px";
  const seriesHeight = "280px";
  const chartHeight =
    selectedType?.chartConfig?.chart?.type === "pie" ? pieHeight : seriesHeight;
  const colors = response?.data?.colors;
  const globalColors = defined(colors)
    ? colors
    : standardCssColors.modifiedBrewer8ClassSet2;
  const highchartDefaultOption = {
    key,
    analysisResult: true,
    columnPrefix,
    chart: {
      marginBottom: 75,
      type: "",
      polar: false,
      height: chartHeight,
      zoomType: "xy",
      resetZoomButton: {
        position: {
          align: "left",
          verticalAlign: "top",
          y: 10
        },
        theme: {
          fill: "#2e343d", // $chart-dark
          stroke: "#519ac2", // $primary-color
          r: 0,
          style: {
            color: "white",
            fontFamily: "Open Sans",
            fontSize: "10px"
          },
          states: {
            hover: {
              fill: "#519ac2", // $primary-color
              style: {
                color: "white"
              }
            }
          },
          zIndex: 10
        }
      }
    },
    title: {
      text: (selectedType.chartConfig || {}).title || ""
    },
    xAxis: {
      categories: []
    },
    yAxis: {
      labels: {
        enabled: true
      },
      title: {
        text: null
      }
    },
    legend: {
      layout: "vertical",
      verticalAlign: "top",
      y: 30,
      align: "right",
      floating: true,
      maxHeight: 100,
      navigation: {
        arrowSize: 10,
        style: {
          fontSize: "10px",
          color: "white"
        }
      }
    },
    tooltip: {},
    plotOptions: {
      series: {
        connectNulls: true,
        pointPadding: 0.05,
        groupPadding: 0,
        turboThreshold: 10000
      },
      column: {
        threshold: null
      },
      pie: {
        colors: globalColors
      }
    },
    series:
      tableStructure.columns.map(col =>
        getColumnConfig(response, chartConfig, col)
      ) || []
  };

  if (chartConfig && chartConfig.chart) {
    highchartDefaultOption.chart = {
      ...highchartDefaultOption.chart,
      ...chartConfig.chart
    };
  }

  if (chartConfig && chartConfig.tooltip) {
    highchartDefaultOption.tooltip = {
      ...highchartDefaultOption.tooltip,
      ...chartConfig.tooltip
    };
  }

  if (chartConfig && chartConfig.valueColors) {
    highchartDefaultOption.valueColors = chartConfig.valueColors;
  }

  if (chartConfig && chartConfig.yAxis) {
    highchartDefaultOption.yAxis = {
      ...highchartDefaultOption.yAxis,
      ...chartConfig.yAxis
    };
  }

  if (chartConfig && chartConfig.plotOptions) {
    highchartDefaultOption.plotOptions = {
      ...highchartDefaultOption.plotOptions,
      ...chartConfig.plotOptions
    };
  }

  let xAxisValues = [];
  if (this._tableStyle.xAxis) {
    const xAxisCol = tableStructure.columns.find(
      c => c.id === this._tableStyle.xAxis
    );
    highchartDefaultOption.xAxis.categories = generalFormatter(
      xAxisCol.name,
      xAxisCol.values
    );
    xAxisValues =
      highchartDefaultOption.xAxis.categories &&
      highchartDefaultOption.xAxis.categories.length
        ? highchartDefaultOption.xAxis.categories
        : xAxisCol.values;
    highchartDefaultOption.xAxis.values = xAxisValues;
  }

  const isPolar = (highchartDefaultOption.chart || {}).polar || false;

  if (isPolar) {
    highchartDefaultOption.xAxis.lineWidth = 0;
  }

  const valueColors = highchartDefaultOption.valueColors || {};

  highchartDefaultOption.credits = { enabled: false };
  highchartDefaultOption.exporting = {
    sourceWidth: 1200,
    sourceHeight: 400,
    buttons: {
      contextButton: {
        enabled: false
      }
    }
  };

  if (
    highchartDefaultOption.chart &&
    highchartDefaultOption.chart.type === "bar"
  ) {
    highchartDefaultOption.chart.type = "column"; // because we have limited virtical space, bar chart's are not rendering well
  }

  const seriesTemplate = highchartDefaultOption.series || [];
  const pairXAxisValues = true;

  highchartDefaultOption.series = tableStructure.columns
    .filter(a => a.type === 4) // 4 is scalar
    .map((a, columnIndex) => {
      // eslint-disable-next-line eqeqeq
      const columnTemplate = seriesTemplate.find(b => b.name === a.name) || {};
      if (columnTemplate.color) {
        a.color = columnTemplate.color;
      } else {
        a.color = globalColors[columnIndex];
      }
      /**
       * We must remove bigqueries to use aliases with space using sqlite. I can then pass to the header.
       * We can modify the table structure columns to map the nice name with original name. We must store the niceName as part of TableColumn.
       * We can modify how we load the new options. Ideally, we should always have one config tied to the items, but name should come from mapping or column
       *
       * LETs make a mapping of Column Name and geometry name. We can call the keys id and name. Finally, we can map it during the loop and
       */
      return {
        color: a.color,
        name: a.name,
        type: getSeriesType(columnTemplate, isPolar),
        visible: getSeriesVisibility(columnTemplate),
        boostThreshold: 10,
        data:
          columnTemplate.data && columnTemplate.data.length
            ? columnTemplate.data.map((val, index) => {
                const xAxisValue = xAxisValues[index];
                if (Array.isArray(val)) {
                  return [xAxisValue, ...val];
                } else return [xAxisValue, val];
              })
            : a.values.map((val, index) => {
                const formattedValue =
                  typeof val === "number" ? Number(val.toFixed(2)) : val;

                const xAxisValue = xAxisValues[index];
                const color = valueColors[xAxisValue];
                if (pairXAxisValues) {
                  return highchartDefaultOption.analysisResult
                    ? [xAxisValue, formattedValue]
                    : formattedValue;
                } else {
                  return { y: formattedValue, color: color };
                }
              })
      };
    });

  for (const col of tableStructure.columns) {
    const columnTemplate = getColumnConfig(response, chartConfig, col);
    if (columnTemplate && columnTemplate.isActive) {
      col.isOpened = col.isVisible = col.isActive = columnTemplate.isActive;
    }
  }

  return highchartDefaultOption;
};

function getSeriesVisibility(template) {
  if (!template || !template.hasOwnProperty("visible")) return true;
  return template.visible;
}

function getSeriesType(template, isPolar) {
  // this is returning spline
  if (!template || (!template.type && !isPolar)) return "spline";

  if (!template || (!template.type && isPolar)) return "line";

  return template.type === "bar" ? "column" : template.type;
}

function generalFormatter(colName, valueSet) {
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec"
  ];

  if (
    colName.toLowerCase() === "month" &&
    valueSet.every(a => a >= 1 && a <= 12)
  ) {
    const categories = valueSet.map(x => {
      return months[x - 1];
    });
    return categories;
  } else if (colName.toLowerCase() === "dekadal") {
    const categories = valueSet.map(x => {
      const lables = x.split("-");
      const monthLabel = months[lables[0] - 1];
      const dekadalLabel = lables[1];
      return [monthLabel, dekadalLabel].join("-");
    });
    return categories;
  }

  return valueSet;
}
module.exports = CsvCatalogItem;
