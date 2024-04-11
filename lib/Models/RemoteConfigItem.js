"use strict";

const CatalogItem = require("./CatalogItem");
const clone = require("terriajs-cesium/Source/Core/clone").default;
const inherit = require("../Core/inherit");
const knockout = require("terriajs-cesium/Source/ThirdParty/knockout").default;
const defined = require("terriajs-cesium/Source/Core/defined").default;
const URI = require("urijs");
const loadJson = require("../Core/loadJson");
const proxyCatalogItemUrl = require("./proxyCatalogItemUrl");
const i18next = require("i18next").default;
const Mustache = require("mustache");

import createCatalogMemberFromType from "./createCatalogMemberFromType";

const RemoteConfigItem = function(terria) {
  CatalogItem.call(this, terria, "remote-config-item");

  /**
   * Gets or sets the NAME of the CONFIGURATION.  This property is observable.
   * @type {String}
   */
  this.name = "";

  /**
   * Gets or sets the URL of CONFIG server.  This property is observable.
   * @type {String}
   */
  this.url = "";

  /**
   * The
   * @type {String}
   */
  this.description = undefined;

  knockout.track(this, ["name", "url", "description"]);
};

inherit(CatalogItem, RemoteConfigItem);

Object.defineProperties(RemoteConfigItem.prototype, {
  /**
   * Gets the type of data member represented by this instance.
   * @memberOf RemoteConfigItem.prototype
   * @type {String}
   */
  type: {
    get: function() {
      return "remote-config-item";
    }
  },

  /**
   * Gets a human-readable name for this type of data source, such as 'Lazy Loader'.
   * @memberOf RemoteConfigItem.prototype
   * @type {String}
   */
  typeName: {
    get: function() {
      return i18next.t("models.remote-config-item.name");
    }
  },

  /**
   * Gets the set of functions used to update individual properties in {@link CatalogMember#updateFromJson}.
   * When a property name in the returned object literal matches the name of a property on this instance, the value
   * will be called as a function and passed a reference to this instance, a reference to the source JSON object
   * literal, and the name of the property.
   * @memberOf RemoteConfigItem.prototype
   * @type {Object}
   */
  updaters: {
    get: function() {
      return RemoteConfigItem.defaultUpdaters;
    }
  },

  /**
   * Gets the set of functions used to serialize individual properties in {@link CatalogMember#serializeToJson}.
   * When a property name on the model matches the name of a property in the serializers object literal,
   * the value will be called as a function and passed a reference to the model, a reference to the destination
   * JSON object literal, and the name of the property.
   * @memberOf RemoteConfigItem.prototype
   * @type {Object}
   */
  serializers: {
    get: function() {
      return RemoteConfigItem.defaultSerializers;
    }
  }
});

/**
 * Gets or sets the set of default updater functions to use in {@link CatalogMember#updateFromJson}.  Types derived from this type
 * should expose this instance - cloned and modified if necesary - through their {@link CatalogMember#updaters} property.
 * @type {Object}
 */
RemoteConfigItem.defaultUpdaters = clone(CatalogItem.defaultUpdaters);

Object.freeze(RemoteConfigItem.defaultUpdaters);

RemoteConfigItem.defaultSerializers = clone(CatalogItem.defaultSerializers);
RemoteConfigItem.defaultSerializers.items =
  CatalogItem.enabledShareableItemsSerializer;

RemoteConfigItem.prototype._load = function() {
  (this.parent || {}).isOpen = true;

  return loadCatalogItem(this);
};

function loadCatalogItem(that) {
  const promise = loadConfig(that);

  return promise.then(catalogItemConfig => {
    that.name = catalogItemConfig.name || that.name;

    const ci = createCatalogMemberFromType(catalogItemConfig.type, that.terria);

    ci.updateFromJson(catalogItemConfig);

    const itemProperties = ci.itemProperties || that.itemProperties || {};
    const customProperties =
      ci.customProperties ||
      itemProperties.customProperties ||
      that.customProperties ||
      {};

    const bindingModel = {
      ...customProperties,
      id: ci.id || that.id,
      name: ci.name || that.name,
      description: ci.description || that.description
    };

    ci.url = Mustache.render(ci.url || "", bindingModel);

    return ci;
  });
}

function loadConfig(that) {
  const url = Mustache.render(that.url || "", {
    id: that.id,
    name: that.name,
    description: that.description
  });

  var baseUri = new URI(url).clone();
  var resourceUrl = proxyCatalogItemUrl(that, baseUri.toString(), "0d");
  return loadJson(resourceUrl);
}

module.exports = RemoteConfigItem;
