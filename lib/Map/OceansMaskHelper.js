import MapboxVectorTileImageryProvider from "./MapboxVectorTileImageryProvider";
import MapboxVectorCanvasTileLayer from "./MapboxVectorCanvasTileLayer";
import proxyCatalogItemUrl from "../Models/proxyCatalogItemUrl";
import ImageryLayer from "terriajs-cesium/Source/Scene/ImageryLayer";
var rectangleToLatLngBounds = require("./rectangleToLatLngBounds");

const OceanMaskTypes = {
  asfa: "asfa"
};

export default class OceansMaskHelper {
  constructor(terria) {
    this.imageryProvider = new MapboxVectorTileImageryProvider(
      {
        url:
          "https://data-dev.review.fao.org/proxy/https://data.review.fao.org/map/gsrv/gsrv1/mask/gwc/service/wmts?REQUEST=GetTile&SERVICE=WMTS&VERSION=1.0.0&LAYER=asfa&STYLE=&TILEMATRIX=EPSG:900913:{z}&TILEMATRIXSET=EPSG:900913&FORMAT=application/vnd.mapbox-vector-tile&TILECOL={x}&TILEROW={y}",
        layerName: "asfa",
        styleFunc: () => ({
          fillStyle: "#777",
          //   strokeStyle: this.lineColor,
          lineWidth: 0
        }),
        rectangle: this.rectangle,
        minimumZoom: 1,
        srs: terria.activeProjection.srs,
        maximumNativeZoom: 12,
        maximumZoom: 12,
        uniqueIdProp: null,
        featureInfoFunc: feature => null
      },
      {
        show: true,
        alpha: 1
      }
    );
  }

  getLeafletMask() {
    const options = {
      async: true,
      opacity: 1
    };
    return new MapboxVectorCanvasTileLayer(this.imageryProvider, options);
  }

  getCesiumMask() {
    return new ImageryLayer(this.imageryProvider);
  }
}
