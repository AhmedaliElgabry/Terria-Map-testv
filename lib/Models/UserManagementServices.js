var defined = require("terriajs-cesium/Source/Core/defined").default;
import knockout from "terriajs-cesium/Source/ThirdParty/knockout";
import axios from "axios";
import GeoJsonCatalogItem from "../Models/GeoJsonCatalogItem";
import CatalogGroup from "../Models/CatalogGroup";
var defaultValue = require("terriajs-cesium/Source/Core/defaultValue").default;

var UserManagementServices = function(terria) {
  if (!defined(terria)) {
    throw new DeveloperError("terria is required");
  }
  this.terria = terria;
  this._isLoggedIn = undefined;

  knockout.track(this, ["_isLoggedIn"]);
};

Object.defineProperties(UserManagementServices.prototype, {
  isLoggedIn: {
    get: function() {
      return defaultValue(this._isLoggedIn, false);
    },
    set: function(isLoggedIn) {
      this._isLoggedIn = isLoggedIn;
    }
  }
});

UserManagementServices.prototype.loginOrRefreshSession = function() {
  return axios.get("/private/hih-auth-verification", {
    headers: {
      "X-Requested-With": "XMLHttpRequest"
    }
  });
};

UserManagementServices.prototype.getApiKeyStatus = function() {
  return axios.get("/private/api_key", {
    headers: {
      "X-Requested-With": "XMLHttpRequest"
    }
  });
};

UserManagementServices.prototype.createApiKey = function() {
  return axios.post("/private/api_key", {
    headers: {
      "X-Requested-With": "XMLHttpRequest"
    }
  });
};

UserManagementServices.prototype.deleteApiKey = function() {
  return axios.delete("/private/api_key", {
    headers: {
      "X-Requested-With": "XMLHttpRequest"
    }
  });
};

UserManagementServices.prototype.saveGeometry = function(item) {
  return item.saveGeometry();
};

UserManagementServices.prototype.getGeometries = function() {
  const that = this;
  axios
    .get("/private/areas", {
      headers: {
        "X-Requested-With": "XMLHttpRequest"
      }
    })
    .then(response => {
      try {
        const { geometries } = response.data;
        if (geometries != undefined) {
          const groupName = "My Saved Areas";
          let group = new CatalogGroup(that.terria);
          group.name = groupName;
          group.userManagmentServices = true;
          group.isUserSupplied = false;
          that.terria.catalog.userAddedDataGroup.add(group);
          geometries.forEach((item, i) => {
            const geometry = item.geometry;
            const geo = new GeoJsonCatalogItem(that.terria);
            geo.customProperties = { savedArea: true };
            geo.data = geometry;
            geo.name = item.name;
            geo.id = item.id;
            geo.description = geometry;
            geo.featureInfoTemplate = geometry;
            geo.isEnabled = false;
            geo.isShown = false;
            group.add(geo);
          });
        }
      } catch (error) {
        console.log("error", error);
      }
    });
};

module.exports = UserManagementServices;
