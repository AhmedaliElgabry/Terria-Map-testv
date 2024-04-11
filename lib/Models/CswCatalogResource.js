"use strict";
// Modified version of CswCatalogGroup

/*global require*/
var ArcGisMapServerCatalogItem = require("./ArcGisMapServerCatalogItem");
var CatalogItem = require("./CatalogItem");
var clone = require("terriajs-cesium/Source/Core/clone").default;
var CsvCatalogItem = require("./CsvCatalogItem");
var defined = require("terriajs-cesium/Source/Core/defined").default;
var formatError = require("terriajs-cesium/Source/Core/formatError").default;
var GeoJsonCatalogItem = require("./GeoJsonCatalogItem");
var inherit = require("../Core/inherit");
var KmlCatalogItem = require("./KmlCatalogItem");
var knockout = require("terriajs-cesium/Source/ThirdParty/knockout").default;
var LegendUrl = require("../Map/LegendUrl");
var loadWithXhr = require("../Core/loadWithXhr");
var loadXML = require("../Core/loadXML");
var proxyCatalogItemUrl = require("./proxyCatalogItemUrl");
var TerriaError = require("../Core/TerriaError");
var URI = require("urijs");
var WebMapServiceCatalogGroup = require("./WebMapServiceCatalogGroup");
var WebMapServiceCatalogItem = require("./WebMapServiceCatalogItem");
var WebProcessingServiceCatalogGroup = require("./WebProcessingServiceCatalogGroup");
var when = require("terriajs-cesium/Source/ThirdParty/when").default;
var xml2json = require("../ThirdParty/xml2json");
var i18next = require("i18next").default;
var createRegexDeserializer = require("./createRegexDeserializer");
var createRegexSerializer = require("./createRegexSerializer");
/**
 * A {@link CatalogItem} representing a record queried from an OGC Catalog Service (CSW) server.
 *
 * @alias CswCatalogResource
 * @constructor
 * @extends CatalogItem
 *
 * @param {Terria} terria The Terria instance.
 */
var CswCatalogResource = function(terria) {
  CatalogItem.call(this, terria);

  /**
   * Gets or sets the URL of the CSW server.  This property is observable.
   * @type {String}
   */
  this.url = "";

  /**
   * True to allow WMS resources to be added to the catalog; otherwise, false.
   * @type {Boolean}
   * @default true
   */
  this.includeWms = true;

  /**
   * Gets or sets a regular expression that, when it matches the protocol attribute of a URI element of a record, indicates that the URI is a WMS resource.
   * @type {RegExp}
   */
  this.wmsResourceFormat = /\bwms\b/i;

  /**
   * True to allow KML resources to be added to the catalog; otherwise, false.
   * @type {Boolean}
   * @default false
   */
  this.includeKml = false;

  /**
   * Gets or sets a regular expression that, when it matches the protocol attribute of a URI element of a record, indicates that the resource is a KML resource.
   * @type {RegExp}
   */
  this.kmlResourceFormat = /\bkml\b/i;

  /**
   * True to allow CSV resources to be added to the catalog; otherwise, false.
   * @type {Boolean}
   */
  this.includeCsv = false;

  /**
   * Gets or sets a regular expression that, when it matches the protocol attribute of a URI element of a record, indicates that the resource is a CSV resource.
   * @type {RegExp}
   */
  this.csvResourceFormat = /\bcsv-geo-/i;

  /**
   * True to allow external resources(links) to be shown on the about page of the catalog; otherwise, false.
   * @type {Boolean}
   */
  this.includeExternalResources = true;

  /**
   * Gets or sets a regular expression that, when it matches the protocol attribute of a URI element of a record, indicates that the resource is an external web resource (web links).
   * @type {RegExp}
   */
  this.externalResourceFormat = /www:link-/i;

  /**
   * True to allow ESRI Map resources to be added to the catalog; otherwise, false.
   * @type {Boolean}
   * @default false
   */
  this.includeEsriMapServer = false;

  /**
   * Sets the metadata link for the whole group
   * @type {String}
   * @default null
   */
  this.baseLink = undefined;

  /**
   * The csw record identifier used to fetch the resource
   * @type {String}
   */
  this.containerId = undefined;

  /**
   * The resource contained in the csw records. Only necessery when there are more than one resources contained in the record.
   * @type {String}
   */
  this.resourceId = undefined;

  /**
   * Gets or sets a regular expression that, when it matches the protocol attribute of a URI element of a record, indicates that the resource is an Esri MapServer resource.
   * @type {RegExp}
   */
  this.esriMapServerResourceFormat = /\besri rest\b/i;

  /**
   * True to allow GeoJSON resources to be added to the catalog; otherwise, false.
   * @type {Boolean}
   * @default false
   */
  this.includeGeoJson = false;

  /**
   * Gets or sets a regular expression that, when it matches the protocol attribute of a URI element of a record, indicates that the resource is a GeoJSON resource.
   * @type {RegExp}
   */
  this.geoJsonResourceFormat = /\bgeojson\b/i;

  /**
   * Gets or sets a list of key value pairs that will be used to group resources returned from the catalog. The keys are used to match elements in the metadata and the values are used as names for the groups of resources to be created.
   * @type {RegExp}
   */
  this.metadataGroups = [];

  /**
   * Gets or sets a description of a domain that will be pulled from the CSW service and used to define the metadataGroups. The domain is obtained by querying the CSW server for a particular property - the values of the property form the domain, the values are assumed to define a hierarchy eg. Wave Models | Wave Energy Flux - which is a two level hierarchy of groups that will be used to classify metadata records.
   * @type {Object}
   */
  this.domainSpecification = undefined;

  /**
   * True to allow OGC:WPS service resources to be added to the catalog; otherwise, false.
   * @type {Boolean}
   * @default false
   */
  this.includeWps = false;

  /**
   * Gets or sets a regular expression that, when it matches the protocol attribute of a URI element of a record, indicates that the resource is a WPS resource.
   * @type {RegExp}
   */
  this.wpsResourceFormat = /\bwps\b/i;

  /**
   * Gets or sets a hash of properties that will be set on the item created from the CKAN resource.
   * For example, { "treat404AsError": false }
   * @type {Object}
   */
  this.itemProperties = undefined;

  /**
   * Gets or sets a url that points to hash of properties that will be set on the item created from the CKAN resource.
   * For example,
   * @type {Url}
   */
  this.itemPropertiesUrl = undefined;

  /**
   * Layer if csw resource is a wms item
   * @type {string}
   */
  this.layers = undefined;

  knockout.track(this, [
    "url",
    "containerId",
    "resourceId",
    "includeWms",
    "includeKml",
    "includeCsv",
    "includeEsriMapServer",
    "includeGeoJson",
    "includeExternalResources",
    "includeWps",
    "itemProperties",
    "itemPropertiesUrl"
  ]);
};

CswCatalogResource.getRecordTemplate = require("./CswGetRecordTemplate.xml");

inherit(CatalogItem, CswCatalogResource);

Object.defineProperties(CswCatalogResource.prototype, {
  /**
   * Gets the type of data member represented by this instance.
   * @memberOf CswCatalogResource.prototype
   * @type {String}
   */
  type: {
    get: function() {
      return "csw-resource";
    }
  },

  /**
   * Gets a human-readable name for this type of data source, such as 'Catalogue Service (CSW)'.
   * @memberOf CswCatalogResource.prototype
   * @type {String}
   */
  typeName: {
    get: function() {
      return i18next.t("models.csw-resource.name");
    }
  },

  /**
   * Gets the set of functions used to update individual properties in {@link CatalogMember#updateFromJson}.
   * When a property name in the returned object literal matches the name of a property on this instance, the value
   * will be called as a function and passed a reference to this instance, a reference to the source JSON object
   * literal, and the name of the property.
   * @memberOf CswCatalogResource.prototype
   * @type {Object}
   */
  updaters: {
    get: function() {
      return CswCatalogResource.defaultUpdaters;
    }
  },

  /**
   * Gets the set of functions used to serialize individual properties in {@link CatalogMember#serializeToJson}.
   * When a property name on the model matches the name of a property in the serializers object literal,
   * the value will be called as a function and passed a reference to the model, a reference to the destination
   * JSON object literal, and the name of the property.
   * @memberOf CswCatalogResource.prototype
   * @type {Object}
   */
  serializers: {
    get: function() {
      return CswCatalogResource.defaultSerializers;
    }
  }
});

/**
 * Gets or sets the set of default updater functions to use in {@link CatalogMember#updateFromJson}.  Types derived from this type
 * should expose this instance - cloned and modified if necesary - through their {@link CatalogMember#updaters} property.
 * @type {Object}
 */
CswCatalogResource.defaultUpdaters = clone(CatalogItem.defaultUpdaters);

CswCatalogResource.defaultUpdaters.wmsResourceFormat = createRegexDeserializer(
  "wmsResourceFormat"
);
CswCatalogResource.defaultUpdaters.kmlResourceFormat = createRegexDeserializer(
  "kmlResourceFormat"
);
CswCatalogResource.defaultUpdaters.csvResourceFormat = createRegexDeserializer(
  "csvResourceFormat"
);
CswCatalogResource.defaultUpdaters.esriMapServerResourceFormat = createRegexDeserializer(
  "esriMapServerResourceFormat"
);
CswCatalogResource.defaultUpdaters.geoJsonResourceFormat = createRegexDeserializer(
  "geoJsonResourceFormat"
);
CswCatalogResource.defaultUpdaters.wpsResourceFormat = createRegexDeserializer(
  "wpsResourceFormat"
);

Object.freeze(CswCatalogResource.defaultUpdaters);

/**
 * Gets or sets the set of default serializer functions to use in {@link CatalogMember#serializeToJson}.  Types derived from this type
 * should expose this instance - cloned and modified if necesary - through their {@link CatalogMember#serializers} property.
 * @type {Object}
 */
CswCatalogResource.defaultSerializers = clone(CatalogItem.defaultSerializers);

CswCatalogResource.defaultSerializers.wmsResourceFormat = createRegexSerializer(
  "wmsResourceFormat"
);
CswCatalogResource.defaultSerializers.kmlResourceFormat = createRegexSerializer(
  "kmlResourceFormat"
);
CswCatalogResource.defaultSerializers.csvResourceFormat = createRegexSerializer(
  "csvResourceFormat"
);
CswCatalogResource.defaultSerializers.esriMapServerResourceFormat = createRegexSerializer(
  "esriMapServerResourceFormat"
);
CswCatalogResource.defaultSerializers.geoJsonResourceFormat = createRegexSerializer(
  "geoJsonResourceFormat"
);
CswCatalogResource.defaultSerializers.wpsResourceFormat = createRegexSerializer(
  "wpsResourceFormat"
);

Object.freeze(CswCatalogResource.defaultSerializers);

CswCatalogResource.prototype._getValuesThatInfluenceLoad = function() {
  return [
    this.url,
    this.filterQuery,
    this.blacklist,
    this.minimumMaxScaleDenominator,
    this.allowEntireWmsServers,
    this.includeKml,
    this.includeWms,
    this.includeCsv,
    this.includeEsriMapServer,
    this.includeWps,
    this.includeExternalResources
  ];
};

var resourceFormats = [
  ["wmsResourceFormat", "includeWms", WebMapServiceCatalogItem],
  [
    "esriMapServerResourceFormat",
    "includeEsriMapServer",
    ArcGisMapServerCatalogItem
  ],
  ["kmlResourceFormat", "includeKml", KmlCatalogItem],
  ["geoJsonResourceFormat", "includeGeoJson", GeoJsonCatalogItem],
  ["csvResourceFormat", "includeCsv", CsvCatalogItem],
  ["wpsResourceFormat", "includeWps", WebProcessingServiceCatalogGroup],
  ["externalResourceFormat", "includeExternalResources", {}]
];

CswCatalogResource.prototype._load = function() {
  const postDataTemplate = CswCatalogResource.getRecordTemplate;

  var that = this;

  var lastPostData;

  function loadRecord() {
    var postData = postDataTemplate.replace("{{identifier}}", that.containerId);

    // Don't page endlessly if there's no {startPosition} placeholder.
    if (postData === lastPostData) {
      return;
    }

    return loadWithXhr({
      url: proxyCatalogItemUrl(that, cleanUrl(that.url), "1d"),
      responseType: "document",
      method: "POST",
      overrideMimeType: "text/xml",
      data: postData,
      headers: {
        "Content-Type": "application/xml"
      }
    }).then(function(xml) {
      if (!defined(xml)) {
        return;
      }

      var json = xml2json(xml);

      if (json.Exception) {
        var errorMessage = i18next.t("models.csw-resource-item.unknownError");
        if (json.Exception.ExceptionText) {
          errorMessage = i18next.t("models.csw-resource.exceptionMessage", {
            exceptionText: json.Exception.ExceptionText
          });
        }
        throw new TerriaError({
          sender: that,
          title: that.name,
          message: errorMessage
        });
      }

      var downloadUrls, acceptableUrls, legendUrl;

      var record = json.Record;
      var uris = record.URI || record.references;
      if (!defined(uris)) {
        return;
      }

      if (uris instanceof String || typeof uris === "string") {
        uris = [uris];
      }

      // maybe more than one url that results in a data layer here - so check for
      // the acceptable ones, store the others as downloadUrls that can be
      // displayed in the metadata summary for the layer
      downloadUrls = [];
      acceptableUrls = [];
      legendUrl = undefined;

      const itemPropertiesResource = uris.find(
        a => a.name === "TerriaJs:ItemProperties"
      );

      for (var m = 0; m < uris.length; m++) {
        var url = uris[m];
        var excludedProtocol = false;
        for (var l = 0; l < resourceFormats.length; l++) {
          var f = resourceFormats[l];
          var resourceType = f[0];

          var protocolOrScheme = url.protocol || url.scheme;
          if (protocolOrScheme && protocolOrScheme.match(that[f[0]])) {
            excludedProtocol = true;

            if (resourceType === "externalResourceFormat") {
              downloadUrls.push(url);
            } else {
              acceptableUrls.push(url);
            }
          }
        }
        if (!excludedProtocol) {
          if (url.description === "LegendUrl") {
            legendUrl = url.toString();
          }
          downloadUrls.push({
            url: url.toString(),
            description: defined(url.description) ? url.description : url.name
          });
        }
      }

      // if resource id is specified, just load that and finish
      if (that.resourceId) {
        const relevantUrl = uris.find(a => a.name === that.resourceId);

        if (!defined(relevantUrl)) {
          throw new TerriaError({
            sender: that,
            title: i18next.t("models.csw-resource.notUseableTitle"),
            message:
              "The specified resource was not found " +
              '<a href="mailto:' +
              that.terria.supportEmail +
              '">' +
              that.terria.supportEmail +
              "</a>."
          });
        }

        const catalogItem = createItemForUri(
          that,
          record,
          relevantUrl,
          downloadUrls,
          legendUrl,
          itemPropertiesResource
        );

        if (defined(catalogItem)) {
          return catalogItem;
        } else {
          throw new TerriaError({
            sender: that,
            title: i18next.t("models.csw-resource.notUseableTitle"),
            message:
              "Unabel to create a catalog item from the specified resource " +
              '<a href="mailto:' +
              that.terria.supportEmail +
              '">' +
              that.terria.supportEmail +
              "</a>."
          });
        }
      }

      // Now process the list of acceptable urls and hand the metadata
      // record and the downloadUrls to each data layer item we create
      for (var j = 0; j < acceptableUrls.length; ++j) {
        var uri = acceptableUrls[j];

        const catalogItem = createItemForUri(
          that,
          record,
          uri,
          downloadUrls,
          legendUrl,
          itemPropertiesResource
        );

        if (defined(catalogItem)) {
          return catalogItem;
        }
      }
    });
  }

  function loadDomain() {
    var getDomainUrl =
      cleanUrl(that.url) +
      "?service=CSW&version=2.0.2&request=GetDomain&propertyname=" +
      that.domainSpecification.domainPropertyName;
    return loadXML(proxyCatalogItemUrl(that, getDomainUrl, "1d"))
      .then(function(xml) {
        if (
          !xml ||
          !xml.documentElement ||
          xml.documentElement.localName !== "GetDomainResponse"
        ) {
          throw new TerriaError({
            sender: that,
            title: i18next.t("models.csw-resource.notUseableTitle"),
            message:
              i18next.t("models.csw-resource.notUseableMessage") +
              '<a href="mailto:' +
              that.terria.supportEmail +
              '">' +
              that.terria.supportEmail +
              "</a>."
          });
        }
        var json = xml2json(xml),
          listOfValues = json.DomainValues.ListOfValues.Value;
        for (var i = 0; i < listOfValues.length; i++) {
          var keys = listOfValues[i].split(
            that.domainSpecification.hierarchySeparator
          );
          // recursively find the group that the last key in keys should belong to and add that key
          findLevel(
            keys,
            0,
            that.metadataGroups,
            that.domainSpecification.hierarchySeparator,
            that.domainSpecification.queryPropertyName
          );
        }
      })
      .otherwise(function(e) {
        throw new TerriaError({
          sender: that,
          title: i18next.t("models.csw-resource.notUseableTitle"),
          message: i18next.t("models.csw-resource.notUseableMessage", {
            email:
              '<a href="mailto:' +
              that.terria.supportEmail +
              '">' +
              that.terria.supportEmail +
              "</a>."
          })
        });
      });
  }

  var domainPromise = when();

  if (defined(that.domainSpecification)) {
    domainPromise = loadDomain().otherwise(function(e) {
      if (e instanceof TerriaError) {
        throw e;
      }
      throw new TerriaError({
        sender: that,
        title: that.name,
        message:
          i18next.t("models.csw-resource.checkCORSDomain", {
            cors:
              '<a href="http://enable-cors.org/" target="_blank">' +
              i18next.t("models.csw-resource.cors") +
              "</a>",
            email:
              '<a href="mailto:' +
              that.terria.supportEmail +
              '">' +
              that.terria.supportEmail +
              "</a>."
          }) +
          "<br/><br/><pre>" +
          formatError(e) +
          "</pre>"
      });
    });
  }

  return when(domainPromise, function() {
    return loadRecord().otherwise(function(e) {
      if (e instanceof TerriaError) {
        throw e;
      }
      throw new TerriaError({
        sender: that,
        title: that.name,
        message:
          i18next.t("models.csw-resource.checkCORS", {
            email:
              '<a href="mailto:' +
              that.terria.supportEmail +
              '">' +
              that.terria.supportEmail +
              "</a>."
          }) +
          "<br/><br/><pre>" +
          formatError(e) +
          "</pre>"
      });
    });
  });
};

function findLevel(keys, index, group, separator, queryField) {
  if (group.length === 0 || index === keys.length - 1) {
    addMetadataGroup(keys, index, group, separator, queryField);
    if (index === keys.length - 1) return;
  }

  var groupIndex = -1;
  for (var i = 0; i < group.length; i++) {
    if (group[i].group === keys[index]) {
      groupIndex = i;
      break;
    }
  }

  if (groupIndex === -1) {
    // not found so add it
    addMetadataGroup(keys, index, group, separator, queryField);
    groupIndex = group.length - 1;
  }
  if (!defined(group[groupIndex].children)) group[groupIndex].children = [];
  findLevel(keys, index + 1, group[groupIndex].children, separator, queryField);
}

function addMetadataGroup(keys, index, group, separator, queryField) {
  var value,
    regex = true;
  // if we aren't at the last key, use a regex and tack on another separator to avoid mismatches
  if (index + 1 !== keys.length) {
    var sepRegex = separator.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
    value = "^" + keys.slice(0, index + 1).join(sepRegex) + sepRegex;
  } else {
    value = keys.slice(0, index + 1).join(separator);
    regex = false;
  }

  group.push({
    field: queryField,
    value: value,
    regex: regex,
    group: keys[index]
  });
}

function createItemForUri(
  parentCatalog,
  record,
  uri,
  downloadUrls,
  legendUrl,
  itemPropertiesResource
) {
  let uriName = uri.name || parentCatalog.resourceId || "";
  if (uriName.includes(":"))
    // strip out the namespace
    uriName = uriName.split(":")[1];

  const layerName = parentCatalog.layers || uriName;

  let catalogItem;

  for (const format of resourceFormats) {
    if (
      !defined(catalogItem) &&
      (uri.protocol || uri.scheme).match(parentCatalog[format[0]]) &&
      parentCatalog[format[1]]
    ) {
      if (format[2] === WebMapServiceCatalogItem && !defined(layerName)) {
        catalogItem = new WebMapServiceCatalogGroup(parentCatalog.terria);
      } else {
        catalogItem = new format[2](parentCatalog.terria);
      }
      break;
    }
  }

  if (defined(catalogItem)) {
    catalogItem.name = parentCatalog.name || record.title;

    catalogItem.sourceCatalogItem = parentCatalog;

    catalogItem.baseLink = parentCatalog.baseLink;

    catalogItem.url = uri.toString();

    if (catalogItem instanceof WebProcessingServiceCatalogGroup) {
      // only a few things we care about here
      return catalogItem;
    } else {
      catalogItem.description = record.description;
      catalogItem.dataCustodian = "";

      if (defined(record.contributor)) {
        catalogItem.info.push({
          name: i18next.t("models.csw-resource.dataResponsibility"),
          content: record.contributor.toString()
        });
      }

      catalogItem.info.push({
        name: i18next.t("models.csw-resource.links"),
        content: downloadUrls.reduce(function(previousValue, downloadUrl) {
          return (
            previousValue +
            "[" +
            (downloadUrl.description ||
              downloadUrl.name ||
              downloadUrl.text ||
              downloadUrl.url ||
              downloadUrl.toString()) +
            "](" +
            (downloadUrl.url || downloadUrl.toString()) +
            ")\n\n"
          );
        }, "")
      });

      catalogItem.info.push({
        name: i18next.t("models.csw-resource.metadataURL"),
        content: defined(catalogItem.baseLink)
          ? (catalogItem.baseLink + "/" + record.identifier).replace(
              /([^:]\/)\/+/g,
              "$1"
            )
          : catalogItem.url +
            "?&version=2.0.2&service=CSW&request=GetRecordById&outputSchema=http://www.opengis.net/cat/csw/2.0.2&ElementSetName=full&id=" +
            record.identifier
      });

      if (defined(legendUrl)) {
        catalogItem.legendUrl = new LegendUrl(legendUrl);
      }

      if (catalogItem.hasOwnProperty("layers") && defined(layerName)) {
        catalogItem.layers = layerName;
      }

      if (typeof parentCatalog.itemProperties === "object") {
        catalogItem.updateFromJson(parentCatalog.itemProperties);
      }

      if (itemPropertiesResource) {
        loadWithXhr({
          url: proxyCatalogItemUrl(catalogItem, itemPropertiesResource, "1d"),
          method: "GET"
        }).then(
          data => {
            catalogItem.updateFromJson(JSON.parse(data));
          },
          err => {
            throw new TerriaError({
              sender: catalogItem,
              title: i18next.t("models.csw-resource.notUseableTitle"),
              message: `Error loading ${parentCatalog.itemPropertiesUrl}`
            });
          }
        );
      }
    }
  }

  return catalogItem;
}

function cleanUrl(url) {
  // Strip off the search portion of the URL
  var uri = new URI(url);
  uri.search("");
  return uri.toString();
}

CswCatalogResource._findLevel = findLevel;
module.exports = CswCatalogResource;
