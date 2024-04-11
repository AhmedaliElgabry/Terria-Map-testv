"use strict";

import i18next from "i18next";
import defined from "terriajs-cesium/Source/Core/defined";

import { LOCATION_MARKER_DATA_SOURCE_NAME } from "../Models/LocationMarkerUtils";

export default class GeometryHelper {
  getGeometriesExcept(terria, exceptCatalogName) {
    return this.getFeaturesGroupedByCatalogItems(terria)
      .filter(
        a =>
          a.catalogItem &&
          a.catalogItem.name !== exceptCatalogName &&
          (a.catalogItem.type === "geojson" ||
            a.catalogItem.type === "ogr" ||
            (a.catalogItem.type === "csv" &&
              a.catalogItem._regionMapping !== undefined) ||
            a.catalogItem.type === "mvt" ||
            a.catalogItem.customProperties.predefinedBoundaries == true)
      )
      .map(a => {
        const { feature, catalogItem } = a;
        // filter between multipolygon, polygon, and csv here
        if (
          defined(catalogItem.customProperties) &&
          catalogItem.customProperties.predefinedBoundaries
        ) {
          const properties = feature.properties;
          const keys = properties.propertyNames;
          const propertiesBag = {};

          const result = keys.reduce((obj, key) => {
            const property = a.feature.properties[key];
            obj[key] = property._value; // Set the value for each key
            return obj;
          }, propertiesBag);

          const nameKey = Object.keys(result).find(key => key.includes("name"));
          const nameValue = result[nameKey];

          const payload = {
            data: {
              type: "predefined",
              geometry: {
                type: "FeatureCollection",
                resource_uri: catalogItem.id,
                features: [
                  {
                    type: "Feature",
                    geometry: {},
                    properties: result
                  }
                ]
              }
            },
            name: nameValue
          };

          return payload;
        } else if (
          catalogItem.type === "geojson" &&
          catalogItem._readyData.type === "FeatureCollection"
        ) {
          return this.getFeaturesFromGeojsonFeatureCollection(
            feature,
            catalogItem
          );
        } else if (
          catalogItem.type === "geojson" &&
          catalogItem._readyData.type === "Feature"
        ) {
          return {
            name: catalogItem.name,
            id: catalogItem.type,
            data: catalogItem.data
          };
        } else if (catalogItem.type === "mvt") {
          return this.getFeaturesFromMvt(feature, catalogItem);
        } else if (catalogItem.type === "ogr") {
          return this.getFeaturesFromOgr(feature, catalogItem);
        } else {
          const { shapefileUrl } = catalogItem.customProperties;
          const url =
            shapefileUrl &&
            shapefileUrl.replace(/\{([^}]+)\}/g, feature.data.id);
          const properties = { id: feature.data.id };
          const geometry = {
            type: "region",
            featureFilesUrl: url,
            properties: properties
          };

          return { name: feature.name, id: catalogItem.type, data: geometry };
        }
      })
      .filter(a => a);
  }

  /**
   * Returns an object of {catalogItems, featureCatalogItemPairs}.
   */
  getFeaturesGroupedByCatalogItems(terria) {
    if (!defined(terria.pickedFeatures)) {
      return [];
    }
    const features = terria.pickedFeatures.features;

    const featureCatalogItemPairs = []; // Will contain objects of {feature, catalogItem}.
    const catalogItems = []; // Will contain a list of all unique catalog items.
    features.forEach(feature => {
      // Why was this here? Surely changing the feature objects is not a good side-effect?
      // if (!defined(feature.position)) {
      //     feature.position = terria.pickedFeatures.pickPosition;
      // }
      const catalogItem = this.determineCatalogItem(terria.nowViewing, feature);
      if (catalogItem !== undefined) {
        featureCatalogItemPairs.push({
          catalogItem: catalogItem,
          feature: feature
        });
      }

      if (catalogItems.indexOf(catalogItem) === -1) {
        // Note this works for undefined too.
        catalogItems.push(catalogItem);
      }
    });

    // return {catalogItems, featureCatalogItemPairs};
    return featureCatalogItemPairs || [];
  }

  /**
   * Figures out what the catalog item for a feature is.
   *
   * @param nowViewing {@link NowViewing} to look in the items for.
   * @param feature Feature to match
   * @returns {CatalogItem}
   */
  determineCatalogItem(nowViewing, feature) {
    if (!defined(nowViewing)) {
      // So that specs do not need to define a nowViewing.
      return undefined;
    }

    if (feature._catalogItem) {
      return feature._catalogItem;
    }

    // "Data sources" (eg. czml, geojson, kml, csv) have an entity collection defined on the entity
    // (and therefore the feature).
    // Then match up the data source on the feature with a now-viewing item's data source.
    //
    // Gpx, Ogr, WebFeatureServiceCatalogItem, ArcGisFeatureServerCatalogItem, WebProcessingServiceCatalogItem
    // all have a this._geoJsonItem, which we also need to check.
    let result;
    let i;
    let item;
    if (
      defined(feature.entityCollection) &&
      defined(feature.entityCollection.owner)
    ) {
      const dataSource = feature.entityCollection.owner;

      if (dataSource.name === LOCATION_MARKER_DATA_SOURCE_NAME) {
        return {
          name: i18next.t("featureInfo.locationMarker")
        };
      }

      for (i = nowViewing.items.length - 1; i >= 0; i--) {
        item = nowViewing.items[i];
        if (item.dataSource === dataSource) {
          result = item;
          break;
        }
      }

      return result;
    }

    // If there is no data source, but there is an imagery layer (eg. ArcGIS),
    // we can match up the imagery layer on the feature with a now-viewing item.
    if (defined(feature.imageryLayer)) {
      const imageryLayer = feature.imageryLayer;
      for (i = nowViewing.items.length - 1; i >= 0; i--) {
        if (nowViewing.items[i].imageryLayer === imageryLayer) {
          result = nowViewing.items[i];
          break;
        }
      }
      return result;
    }
  }

  getGaulName(feature) {
    return (
      feature.properties.adm2_name ||
      feature.properties.adm1_name ||
      feature.properties.adm0_name
    );
  }

  getGadmName(feature) {
    return (
      feature.properties.name_5 ||
      feature.properties.name_4 ||
      feature.properties.name_3 ||
      feature.properties.name_2 ||
      feature.properties.name_1 ||
      feature.properties.name_0
    );
  }

  getAdminLevel(feature) {
    if (feature.properties.adm2_name) return 2;
    if (feature.properties.adm1_name) return 1;
    if (feature.properties.adm0_name) return 0;

    if (feature.properties.name_2) return 2;
    if (feature.properties.name_1) return 1;
    if (feature.properties.name_0) return 0;

    return 0;
  }

  getFeaturesFromMvt(feature, catalogItem) {
    const gaulName = this.getGaulName(feature);
    const gadmName = this.getGadmName(feature);
    let level = null;

    const name =
      gaulName ||
      gadmName ||
      feature.properties.name ||
      feature.properties.NAME;

    if (!name) {
      return null;
    }

    let geometry = {};
    if (
      catalogItem?.customProperties?.bucket === "faostat" ||
      catalogItem?.customProperties?.bucket === "epi_units"
    ) {
      geometry = {
        type: "precached", // mvt
        id: feature.data.id,
        bucket: catalogItem.customProperties.bucket
      };
    } else {
      let featureCollectionId =
        catalogItem?.customProperties?.featureCollectionId;
      let featureColumn = catalogItem?.customProperties?.featureColumn;

      if (!defined(featureCollectionId) || !defined(featureColumn)) {
        if (catalogItem.layer === "g2015_2014_0") {
          featureCollectionId = "FAO/GAUL_SIMPLIFIED_500m/2015/level0";
          featureColumn = "ADM0_CODE";
        } else if (catalogItem.layer === "g2015_2014_1") {
          featureCollectionId = "FAO/GAUL_SIMPLIFIED_500m/2015/level1";
          featureColumn = "ADM1_CODE";
        } else if (catalogItem.layer === "g2015_2014_2") {
          featureCollectionId = "FAO/GAUL_SIMPLIFIED_500m/2015/level2";
          featureColumn = "ADM2_CODE";
        } else {
          throw new Error("Unsupported Feature Selected");
        }
      }

      if (defined(featureCollectionId)) {
        const lvl = featureCollectionId[featureCollectionId.length - 1];
        if (lvl == 0 || lvl == 1 || lvl == 2) {
          level = lvl;
        }
      }

      const featureId =
        feature.properties[featureColumn.toLowerCase()]._value ||
        feature.properties[featureColumn.toUpperCase()]._value;

      geometry = {
        type: "mvt",
        featuresCollectionId: featureCollectionId,
        featureColumn: featureColumn,
        filter: "eq",
        value: isNaN(Number(featureId)) ? featureId : Number(featureId),
        level: level
      };
    }

    return {
      name: name._value,
      id: catalogItem.type,
      data: geometry
    };
  }

  getFeaturesFromOgr(feature, catalogItem) {
    return this.getFeaturesFromGeojsonFeatureCollection(feature, {
      ...catalogItem,
      type: "geojson"
    });
  }

  getFeaturesFromGeojsonFeatureCollection(feature, catalogItem) {
    if (feature._properties.ADMIN) {
      const property = feature._properties.ADMIN._value;
      const { features } = catalogItem._readyData;
      const data = features.find(item => item.properties.ADMIN === property);
      return { name: property, id: catalogItem.type, data: data };
    } else if (feature._properties.Title) {
      const property = feature._properties.Title._value;
      const { features } = catalogItem._readyData;
      const data = features.find(item => item.properties.Title === property);
      return { name: property, id: catalogItem.type, data: data };
    } else if (feature?._properties?._propertyNames?.length > 0) {
      const propertyName = this.getFeaturePropertyName(feature, catalogItem);

      if (!propertyName) {
        throw new Error(
          "Selected feature has no properites to identify it by."
        );
      }
      const property = feature._properties[(propertyName?.name)]?._value;
      const { features } =
        catalogItem?._readyData || catalogItem?._geoJsonItem?.data;
      const data = features.find(
        ftr => ftr.properties[(propertyName?.name)] === property
      );

      return {
        name: `${
          propertyName.prefix ? propertyName.prefix + " - " : ""
        }${property}`,
        id: catalogItem.type,
        data: data
      };
    }
  }

  getFeaturePropertyName(feature, catalogItem = {}) {
    const _name = (feature._properties.propertyName || []).find(name =>
      /[name]{4}/g.test((name || "").toLowerCase())
    );

    const officialNames = (feature._properties._propertyNames || []).filter(
      name => /name_iso|name_un|name_fao/g.test((name || "").toLowerCase())
    );

    const fid = (feature._properties._propertyNames || []).find(name =>
      /[fid]{3}/g.test((name || "").toLowerCase())
    );

    const id = (feature._properties._propertyNames || []).find(name =>
      /[id]{2}/g.test((name || "").toLowerCase())
    );

    const _prefix = catalogItem?.name || feature.entityCollection?._owner?.name;

    return this.getGeometryName([
      { name: _name, prefix: "" },
      { name: officialNames[0], prefix: _prefix },
      { name: fid, prefix: _prefix },
      { name: id, prefix: _prefix },
      { name: feature?._properties?._propertyNames[0], prefix: _prefix }
    ]);
  }

  getGeometryName(possibleNames) {
    const current = (possibleNames || []).shift();

    if (possibleNames.length < 1) {
      return current;
    } else if (current && current?.name) {
      return current;
    } else {
      return this.getGeometryName(possibleNames);
    }
  }

  getFeaturesFromWms(feature) {
    const data = (feature.data || {}).properties || {};

    const name = data.name_2 || data.name_1 || data.name_0 || feature.name;

    if (!name) {
      return null;
    }

    return (
      name && {
        name: name,
        id: name,
        data: { type: "wms", name: name }
      }
    );
  }
}
