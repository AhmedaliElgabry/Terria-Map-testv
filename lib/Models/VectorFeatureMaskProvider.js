import Rectangle from "terriajs-cesium/Source/Core/Rectangle";
import CesiumMath from "terriajs-cesium/Source/Core/Math";
import Cartesian3 from "terriajs-cesium/Source/Core/Cartesian3";
import SceneTransforms from "terriajs-cesium/Source/Scene/SceneTransforms";
import ViewerMode from "./ViewerMode";
import MapboxVectorTileCatalogItem from "./MapboxVectorTileCatalogItem";

export default class VectorFeatureMaskProvider {
  /**
   *
   * @param {Terria} terria
   * @param {MapboxVectorTileCatalogItem} item
   */
  constructor(terria, item) {
    this.terria = terria;
    this.item = item;
    this.tilebox = { x: 1, y: 1, level: 1 }; // setting the initial to 1, 1, 1 so we can search -1/+1
  }

  /**
   * Attempts to find a feature within the MVT catalog item and create a mask around it
   * @param {String} searchKey
   * @param {String} searchValue
   * @param {Rectangle} aoiBoundingBox Rectangle representing the bounding box of the area we are intereseted in
   */
  async mask(searchKey, searchValue, aoiBoundingBox, tilebox) {
    const { item, terria } = this;

    if (!tilebox)
      await this.calculateInitialTilebox(aoiBoundingBox, item, terria);

    terria.currentViewer.zoomTo(aoiBoundingBox, 2).then(async () => {
      var features = await item.imageryLayer.imageryProvider.pickFeaturesByAttribute(
        searchKey,
        searchValue,
        tilebox || this.tilebox
      );

      // If the feature was not found using the provided tilebox
      // Retry with tilebox of { x: 1, y: 1, level: 1 }
      if (!features.length) {
        features = await item.imageryLayer.imageryProvider.pickFeaturesByAttribute(
          searchKey,
          searchValue,
          { x: 1, y: 1, level: 1 }
        );

        if (!features.length) return;
      }

      var selectedFeature = {
        data: features[0].data,
        features: features,
        imageryLayer: item.imageryLayer
      };

      terria.selectedFeature = selectedFeature;

      const context = {
        searchKey,
        searchValue,
        tilebox: this.tilebox,
        rectangle: aoiBoundingBox
      };

      terria.currentViewer._createMaskAroundFeature(
        terria.selectedFeature,
        context
      );
    });
  }

  async calculateInitialTilebox(aoiBoundingBox, item, terria) {
    const { leaflet, cesium, viewerMode } = terria;

    if (viewerMode == ViewerMode.Leaflet) {
      var longRadians = CesiumMath.toRadians(aoiBoundingBox.east);
      var latRadians = CesiumMath.toRadians(aoiBoundingBox.north);

      this.tilebox = await item.imageryLayer.getFeaturePickingCoords(
        leaflet.map,
        longRadians,
        latRadians
      );
    } else {
      var scene = cesium.scene;

      const tryGetTileBox = () => {
        var cart3 = Cartesian3.fromDegrees(
          aoiBoundingBox.east,
          aoiBoundingBox.north
        );
        var screenPosition = SceneTransforms.wgs84ToWindowCoordinates(
          scene,
          cart3
        );
        var tilesProvider = cesium.pickFromScreenPosition(screenPosition, true);

        if (tilesProvider[item.url]) this.tilebox = tilesProvider[item.url];

        if (tilesProvider[`proxy/_0d/${item.url}`])
          this.tilebox = tilesProvider[`proxy/_0d/${item.url}`];
      };

      try {
        tryGetTileBox();
      } catch (err) {
        terria.currentViewer.zoomTo(aoiBoundingBox, 2).then(() => {
          tryGetTileBox();
        });
      }
    }
  }

  /**
   * Removes any masks present
   * @returns
   */
  async remove(feature) {
    return await this.terria.currentViewer?._removeMasksForLayers(feature);
  }
}
