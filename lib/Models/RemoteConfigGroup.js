"use strict";

const CatalogGroup = require("./CatalogGroup");
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

const RemoteConfigGroup = function(terria) {
  CatalogGroup.call(this, terria, "remote-config-group");

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

  this.forceFlat = false;

  knockout.track(this, ["name", "url", "description"]);
};

inherit(CatalogGroup, RemoteConfigGroup);

Object.defineProperties(RemoteConfigGroup.prototype, {
  /**
   * Gets the type of data member represented by this instance.
   * @memberOf RemoteConfigGroup.prototype
   * @type {String}
   */
  type: {
    get: function() {
      return "remote-config-group";
    }
  },

  /**
   * Gets a human-readable name for this type of data source, such as 'Lazy Loader'.
   * @memberOf RemoteConfigGroup.prototype
   * @type {String}
   */
  typeName: {
    get: function() {
      return i18next.t("models.remote-config-group.name");
    }
  },

  /**
   * Gets the set of functions used to update individual properties in {@link CatalogMember#updateFromJson}.
   * When a property name in the returned object literal matches the name of a property on this instance, the value
   * will be called as a function and passed a reference to this instance, a reference to the source JSON object
   * literal, and the name of the property.
   * @memberOf RemoteConfigGroup.prototype
   * @type {Object}
   */
  updaters: {
    get: function() {
      return RemoteConfigGroup.defaultUpdaters;
    }
  },

  /**
   * Gets the set of functions used to serialize individual properties in {@link CatalogMember#serializeToJson}.
   * When a property name on the model matches the name of a property in the serializers object literal,
   * the value will be called as a function and passed a reference to the model, a reference to the destination
   * JSON object literal, and the name of the property.
   * @memberOf RemoteConfigGroup.prototype
   * @type {Object}
   */
  serializers: {
    get: function() {
      return RemoteConfigGroup.defaultSerializers;
    }
  }
});

/**
 * Gets or sets the set of default updater functions to use in {@link CatalogMember#updateFromJson}.  Types derived from this type
 * should expose this instance - cloned and modified if necesary - through their {@link CatalogMember#updaters} property.
 * @type {Object}
 */
RemoteConfigGroup.defaultUpdaters = clone(CatalogGroup.defaultUpdaters);

Object.freeze(RemoteConfigGroup.defaultUpdaters);

RemoteConfigGroup.defaultSerializers = clone(CatalogGroup.defaultSerializers);
RemoteConfigGroup.defaultSerializers.items =
  CatalogGroup.enabledShareableItemsSerializer;

RemoteConfigGroup.prototype._load = function() {
  var that = this;
  (that.parent || {}).isOpen = true;

  return loadCatalogItems(that);
};

function loadCatalogItems(that, config, type) {
  let promise;
  if (type === "group") {
    promise = new Promise(function(resolve, reject) {
      if (!defined(config)) {
        reject(i18next.t("models.remote-config-group.invalid-config"));
      }
      resolve(config);
    });
  } else {
    promise = loadConfig(that);
  }

  return promise.then(resourceJson => {
    const catalogItemsConfig =
      resourceJson.items ||
      resourceJson.catalog[0].items ||
      resourceJson.catalog;

    if (defined(resourceJson.name)) {
      that.name = resourceJson.name;
    }

    that.description =
      resourceJson.description || resourceJson?.catalog?.[0]?.description || "";
    that.preserveOrder =
      resourceJson.preserveOrder ||
      resourceJson?.catalog?.[0]?.preserveOrder ||
      false;

    for (const ciConfig of catalogItemsConfig) {
      const ci = createCatalogMemberFromType(ciConfig.type, that.terria);

      ci.updateFromJson(ciConfig);

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

      ci.url = Mustache.render(ci.url || " ", bindingModel);

      // If the child catalog item does not have an Id set, it could cause a problem during sharing.
      // SHARE KEY IS GENERATED USING A NAME THAT MAY BE CHANGED WHEN THE LAZY LOADED CATALOG ITEM IS
      // INITIALIZED (AND THE NAME IS CHANGED IN THE PROCESS)
      if (!ci.id) {
        ci.id = that.uniqueId + "/" + ci.name;
      }

      if (that.forceFlat === true && that.parent) {
        that.parent.add(ci);
        that.isHidden = true;
      } else {
        that.add(ci);
      }

      if (ci.type === "group") {
        ci.isEnabled = true;
      }
    }
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

module.exports = RemoteConfigGroup;
