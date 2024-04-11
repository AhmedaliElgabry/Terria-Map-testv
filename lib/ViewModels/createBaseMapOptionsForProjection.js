"use strict";

/*global require*/
var BaseMapViewModel = require("./BaseMapViewModel");
var UrlTemplateCatalogItem = require("../Models/UrlTemplateCatalogItem");
var BingMapsCatalogItem = require("../Models/BingMapsCatalogItem");
var BingMapsStyle = require("terriajs-cesium/Source/Scene/BingMapsStyle")
  .default;
var Hillshading = require("../../wwwroot/images/Hillshading.png");
var NaturalColor = require("../../wwwroot/images/NaturalColor.png");
var Basic = require("../../wwwroot/images/Basic.png");
var Dark = require("../../wwwroot/images/Dark.png");
var LandAndWater = require("../../wwwroot/images/LandAndWater.png");
var OpenStreetMap = require("../../wwwroot/images/OpenStreetMap.png");
var Topographique = require("../../wwwroot/images/Topographique.png");
var Gray = require("../../wwwroot/images/Gray.png");
var White = require("../../wwwroot/images/White.png");
var Satellite = require("../../wwwroot/images/Satellite.png");

var createBaseMapOptionsForProjection = function(terria, baseMaps) {
  const result = [];
  try {
    baseMaps.forEach(baseMap => {
      var catalogItem = undefined;
      switch (baseMap.type) {
        case "bing-maps":
          catalogItem = new BingMapsCatalogItem(terria);
          catalogItem.name = "Bing Maps Aerial";
          catalogItem.mapStyle = BingMapsStyle.AERIAL;
          catalogItem.opacity = 1.0;
          catalogItem.key = terria.configParameters.bingMapsKey;
          catalogItem.isRequiredForRendering = true;
          break;
        case "url-template":
        default:
          catalogItem = new UrlTemplateCatalogItem(terria);
          catalogItem.name = baseMap.name;
          catalogItem.url = baseMap.url;
          catalogItem.opacity = 1.0;
          catalogItem.isRequiredForRendering = true;
          catalogItem.attribution = baseMap.attribution;
      }

      result.push(
        new BaseMapViewModel({
          image: getThumbnail(baseMap.thumbnail),
          catalogItem: catalogItem
        })
      );
    });
  } catch (error) {
    console.log(error);
  }

  return result;
};

const getThumbnail = function(thumbnail) {
  const nameAndExtention = thumbnail.split(".");
  const name = nameAndExtention[0];
  const extension = nameAndExtention[nameAndExtention.length - 1];
  if (!["png", "jpg", "jpeg"].includes(extension)) {
    return;
  }
  switch (name) {
    case "Hillshading":
      return Hillshading;
    case "NaturalColor":
      return NaturalColor;
    case "Basic":
      return Basic;
    case "Dark":
      return Dark;
    case "LandAndWater":
      return LandAndWater;
    case "OpenStreetMap":
      return OpenStreetMap;
    case "Topographique":
      return Topographique;
    case "Gray":
      return Gray;
    case "White":
      return White;
    case "Satellite":
      return Satellite;
    default:
      return Hillshading;
  }
};

module.exports = createBaseMapOptionsForProjection;
