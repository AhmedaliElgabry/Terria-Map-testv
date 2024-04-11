"use strict";

/*global require*/

var clone = require("terriajs-cesium/Source/Core/clone").default;
var defined = require("terriajs-cesium/Source/Core/defined").default;
var knockout = require("terriajs-cesium/Source/ThirdParty/knockout").default;
var CatalogItem = require("./CatalogItem");
var inherit = require("../Core/inherit");
var i18next = require("i18next").default;
var loadBlob = require("../Core/loadBlob");
import shp from "shpjs";
import * as geoJsonMerge from "@mapbox/geojson-merge";
import { isJsonObject } from "../Core/json";
import createCatalogMemberFromType from "./createCatalogMemberFromType";

/**
 * A {@link CatalogItem} representing a layer from a Shapefile.
 *
 * @alias ShapefileCatalogItem
 * @constructor
 * @extends CatalogItem
 *
 * @param {Terria} terria The Terria instance.
 */
var ShapefileCatalogItem = function(terria) {
  CatalogItem.call(this, terria);

  this.name = "";
  this.url = "";
  this._file = "";
  this.description = undefined;

  knockout.track(this, ["name", "url", "file", "description"]);
};

inherit(CatalogItem, ShapefileCatalogItem);

Object.defineProperties(ShapefileCatalogItem.prototype, {
  /**
   * Gets the type of data item represented by this instance.
   * @memberOf ShapefileCatalogItem.prototype
   * @type {String}
   */
  type: {
    get: function() {
      return "shapefile";
    }
  },

  /**
   * Gets a human-readable name for this type of data source, 'shapefile'.
   * @memberOf ShapefileCatalogItem.prototype
   * @type {String}
   */
  typeName: {
    get: function() {
      return i18next.t("models.ShapefileCatalogItem.shapefile");
    }
  },

  /**
   * Gets the set of functions used to update individual properties in {@link CatalogMember#updateFromJson}.
   * When a property name in the returned object literal matches the name of a property on this instance, the value
   * will be called as a function and passed a reference to this instance, a reference to the source JSON object
   * literal, and the name of the property.
   * @memberOf ShapefileCatalogItem.prototype
   * @type {Object}
   */
  updaters: {
    get: function() {
      return ShapefileCatalogItem.defaultUpdaters;
    }
  },

  /**
   * Gets the set of functions used to serialize individual properties in {@link CatalogMember#serializeToJson}.
   * When a property name on the model matches the name of a property in the serializers object literal,
   * the value will be called as a function and passed a reference to the model, a reference to the destination
   * JSON object literal, and the name of the property.
   * @memberOf ShapefileCatalogItem.prototype
   * @type {Object}
   */
  serializers: {
    get: function() {
      return ShapefileCatalogItem.defaultSerializers;
    }
  },

  /**
   * Gets the data source associated with this catalog item.
   * @memberOf ShapefileCatalogItem.prototype
   * @type {DataSource}
   */
  dataSource: {
    get: function() {
      return defined(this._geoJsonItem)
        ? this._geoJsonItem.dataSource
        : undefined;
    }
  }
});

ShapefileCatalogItem.defaultUpdaters = clone(CatalogItem.defaultUpdaters);
Object.freeze(ShapefileCatalogItem.defaultUpdaters);
ShapefileCatalogItem.defaultSerializers = clone(CatalogItem.defaultSerializers);
ShapefileCatalogItem.defaultSerializers.items =
  CatalogItem.enabledShareableItemsSerializer;

export function isJsonArrayOrDeepArrayOfObjects(value) {
  return (
    Array.isArray(value) &&
    value.every(
      child => isJsonObject(child) || isJsonArrayOrDeepArrayOfObjects(child)
    )
  );
}

ShapefileCatalogItem.prototype._load = function() {
  loadCatalogItem(this)
    .then(cid => {
      const _ci = createCatalogMemberFromType("geojson", this.terria);
      _ci.updateFromJson({
        ...this,
        id: `${this.id || ""}_${generateUUID()}`,
        data: JSON.stringify({ ...cid, fileName: `${this.name}.json` }),
        dataUrlType: this.dataUrlType,
        name: (this.name || "").replace(".zip", "")
      });
      return _ci;
    })
    .catch(err => {
      const that = this;
      this.terria.nowViewing.items.remove(that);
      console.error(err);
      throw new Error(err);
    })
    .finally(() => {
      const that = this;
      this.terria.nowViewing.items.remove(that);
    });
};

ShapefileCatalogItem.prototype._enableInLeaflet = function() {
  // Nothing to be done.
};

ShapefileCatalogItem.prototype._enableInCesium = function() {
  // Nothing to be done.
};

ShapefileCatalogItem.prototype._showInLeaflet = function() {
  // Nothing to be done.
};

ShapefileCatalogItem.prototype._showInCesium = function() {
  // Nothing to be done.
};

ShapefileCatalogItem.prototype._hideInLeaflet = function() {
  // Nothing to be done.
};

ShapefileCatalogItem.prototype._hideInCesium = function() {
  // Nothing to be done.
};

async function loadCatalogItem(that) {
  if (that.data) return await parseShapefile(that.data);
  else if (that.url) {
    const data = await loadBlob(that.url);
    return await parseShapefile(data);
  }
}

async function parseShapefile(blob) {
  let json;
  const asAb = await blob.arrayBuffer();
  json = await shp.parseZip(asAb);

  if (isJsonArrayOrDeepArrayOfObjects(json)) {
    // There were multiple shapefiles in this zip file. Merge them.
    json = geoJsonMerge.merge(json);
  }
  return json;
}

/**
 * Copied code from the answer in stackoverflow:
 * https://stackoverflow.com/a/873856/2087294
 *  */

function generateUUID() {
  // http://www.ietf.org/rfc/rfc4122.txt
  var s = [];
  var hexDigits = "0123456789abcdef";
  for (var i = 0; i < 36; i++) {
    s[i] = hexDigits.substr(Math.floor(Math.random() * 0x10), 1);
  }
  s[14] = "4"; // bits 12-15 of the time_hi_and_version field to 0010
  s[19] = hexDigits.substr((s[19] & 0x3) | 0x8, 1); // bits 6-7 of the clock_seq_hi_and_reserved to 01
  s[8] = s[13] = s[18] = s[23] = "-";

  var uuid = s.join("");
  return uuid;
}

module.exports = ShapefileCatalogItem;
