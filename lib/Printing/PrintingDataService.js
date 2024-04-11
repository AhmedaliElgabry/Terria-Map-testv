import L from "leaflet";
import URI from "urijs";
import CesiumMath from "terriajs-cesium/Source/Core/Math";
import Cartesian2 from "terriajs-cesium/Source/Core/Cartesian2";
import defined from "terriajs-cesium/Source/Core/defined";
import EllipsoidGeodesic from "terriajs-cesium/Source/Core/EllipsoidGeodesic";
import Jimp from "jimp";
import html2canvas from "terriajs-html2canvas";
import { AwesomeQR } from "awesome-qr";
import { MimeType } from "easy-template-x";
import proxyCatalogItemUrl from "../Models/proxyCatalogItemUrl";
import CrtbPrintingDataService from "./CrtbPrintingDataService";

window.html2canvas = html2canvas;
export default class PrintingDataService {
  dataTypes = {
    map: this.getMapImages,
    legends: this.getLegends,
    hih_share: this.getQrCode,
    location_preview: this.getLocationPreview,
    north_arrow: this.getNorthArrow,
    scale: this.getScale,
    scaleAndZoomLevel: this.getCurrentMapScale,
    disclaimer: this.getDisclaimer,
    short_date: this.getShortDate,
    dataset_detail: this.getDatasetDetail,
    title: this.getTitle,
    // individualLayers: this.getIndividualLayers,
    crtb: this.getCrtbData
  };

  _terria;
  _mapViewInfo;
  _enabledItems;
  _shareUrl;

  constructor(terria, shareUrl) {
    this._terria = { ...terria };

    const allItems = [...this._terria.nowViewing.items];
    this._enabledItems = allItems.filter(
      item => !item.isCsvForCharting && item.isShown
    );

    const enabledItemsCount = this._enabledItems.length;

    if (enabledItemsCount < 1) {
      // eslint-disable-next-line no-alert
      alert(
        `Please make sure you have enabled AT LEAST ONE catalog item in the workbench before printing.\n\nCurrently enabled item/s: ${enabledItemsCount}.`
      );
      return;
    }

    this._shareUrl = shareUrl;
    this._mapViewInfo = this.getMapViewInfo(this._terria);
  }

  getData(options = { images: [], texts: [] }, data = null, params = null) {
    return new Promise((resolve, reject) => {
      const { entries } = options;
      const promises = [];

      entries.forEach(entry => {
        const _dataFunc = this.dataTypes[entry.tag];

        if (typeof _dataFunc === "function")
          promises.push(
            this.dataTypes[entry.tag]({
              config: entry,
              terria: this._terria,
              enabledItems: this._enabledItems,
              mapInfo: this._mapViewInfo,
              shareUrl: this._shareUrl
            })
          );
      });

      Promise.all(promises).then(res => {
        const images = res.filter(res => res.type === "image");
        const imageArray = res.filter(res => res.type === "images");
        const texts = res.filter(res => res.type === "text");
        const textArray = res.filter(res => res.type === "texts");

        const _imageConfigEntires = images.reduce((acc, cur, idx) => {
          const { options: { size: { width, height } } = {} } = cur;

          return {
            ...acc,
            [cur.tag]: {
              _type: "image",
              source: cur.data,
              format: MimeType.Png,
              width: width,
              height: height
            }
          };
        }, {});

        const _textConfigEntries = texts.reduce((acc, cur) => {
          return {
            ...acc,
            [cur.tag]: cur.text
          };
        }, {});

        const _textArrayConfigEntries = textArray.reduce((acc, cur) => {
          return {
            ...acc,
            [cur.tag]: cur.texts.map(txt => txt)
          };
        }, {});

        this.getLegendsArrayConfigEntries(imageArray).then(ret => {
          resolve({
            ..._textConfigEntries,
            ..._textArrayConfigEntries,
            ..._imageConfigEntires,
            ...ret
          });
        });
      });
    });
  }

  getMapImages(options) {
    const { config, terria } = options; // TODO: better way to access class level this.terria variable instance

    return new Promise((resolve, reject) => {
      terria.currentViewer.captureScreenshot().then(mapImageDataUrl =>
        loadAndApplyOptionsToAnImage(mapImageDataUrl, config?.options).then(
          res => {
            const _config = { ...config };
            _config.options.size = { ...res.options.size };
            return resolve({ ..._config, data: res.data });
          }
        )
      );
    });
  }

  getLegends(options) {
    const { config, enabledItems } = options;
    const legendPromises = [];
    enabledItems.forEach(item => {
      const _lgndPromise = new Promise((resolve, reject) => {
        const legendUrl = item.legendUrl;
        const isImage = legendUrl?.isImage();
        const svg = legendUrl?.safeSvgContent;
        const isSvg = (legendUrl?.mimeType || "").indexOf("image/svg") !== -1;
        let legend;

        if (!isImage) {
          console.error(
            "ERROR: Legend image not found. Using default image ( 1X1 Pixel with white background/fill )."
          );
          legend = new Promise(resolveImg => {
            resolveImg({
              data: transparent1x1PngConstant,
              options: config.options
            });
          });
        } else if (!svg && !isSvg) {
          const insertDirectly = (legendUrl.url || "").startsWith("data:image");

          legend = new Promise(resolveImg => {
            resolveImg({
              data: insertDirectly
                ? legendUrl.url
                : (function(url) {
                    const proxiedUrl = proxyCatalogItemUrl(item, url);
                    const uri = new URI(proxiedUrl);
                    return uri.absoluteTo(window.location.href).toString();
                  })(legendUrl.url),
              options: config.options
            });
          }).catch(err => {
            console.error("==============================");
            console.error(
              "ERROR: An error occured while trying to get legend from SVG."
            );
            console.error("ERROR_STACK_TRACE:", err, "\n");
            console.error("==============================");
            return new Promise(resolveImg => {
              resolveImg({
                data: transparent1x1PngConstant,
                options: config.options
              });
            });
          });
        } else if (isSvg || svg) {
          legend = getLegendFromSvg(item, config.options);
        } else {
          console.error("ERROR: Unsupported image format");
          legend = new Promise(resolveImg => {
            resolveImg({
              data: transparent1x1PngConstant,
              options: config.options
            });
          });
        }

        legend.then(({ data, options }) => {
          loadAndApplyOptionsToAnImage(data, options)
            .then(res => {
              const itm = res.data;
              const _config = JSON.parse(JSON.stringify(config));
              _config.options.size = { ...res.options.size };
              resolve({
                legendName: item.name,
                title: item.name,
                data: itm,
                mimeType: "image/png",
                ..._config
              });
            })
            .catch(err => {
              console.error(err);
              return;
            });
        });
      });

      legendPromises.push(_lgndPromise);
    });

    return { ...config, items: legendPromises };
  }

  getLocationPreview({ config, mapInfo }) {
    const {
      lat,
      lng,
      zoomLevel: { value: zoomlevelValue }
    } = mapInfo;

    const {
      options: {
        baseMapurl,
        markerUrl,
        showWhenZoomLevelIsLessthan,
        size: { width: previewWidth, height: previewHeight },
        iconSize = 50
      }
    } = config;

    const baseMap = Jimp.read({ url: baseMapurl });
    const locationIndicator = Jimp.read({ url: markerUrl });

    const promises = [baseMap, locationIndicator];

    return new Promise((resolve, reject) => {
      if (
        (showWhenZoomLevelIsLessthan &&
          showWhenZoomLevelIsLessthan <= zoomlevelValue) ||
        zoomlevelValue >= 300000
      ) {
        resolve({});
      } else {
        Promise.all(promises).then(rslt => {
          const baseImg = rslt[0];
          const lctnImg = rslt[1];

          // TODO: remove this obsolet image correction factor and code associated with it
          // const imageCorrectionFactor = {
          //   x: 0,
          //   y: 0,
          // };

          const {
            bitmap: { height, width }
          } = baseImg;
          let { x, y } = latLonToOffsets(lat, lng, width, height);

          // Adjust for base map image dimension
          // x -= (iconSize / 2)  + imageCorrectionFactor.x;
          // y -= (iconSize / 2) + imageCorrectionFactor.y;
          x -= iconSize / 2;
          y -= iconSize / 2;

          lctnImg.resize(iconSize, iconSize);

          const location = baseImg
            .composite(lctnImg, Math.max(x, 0), Math.max(y, 0), {
              mode: Jimp.BLEND_SOURCE_OVER,
              opacityDest: 1,
              opacitySource: 1
            })
            .crop(
              Math.max(x - (previewWidth * 1.75) / 2, 0),
              Math.max(y - (previewHeight * 1.75) / 2, 0),
              previewWidth * 1.75,
              previewHeight * 1.75
            );

          location
            .getBufferAsync("image/png")
            .then(res =>
              resolve({
                ...config,
                data: res
              })
            )
            .catch(err => reject({}));
        });
      }
    });
  }

  getQrCode({ config, shareUrl }) {
    return generateQrCode(config, shareUrl);
  }

  getNorthArrow({ config, mapInfo }) {
    const {
      options: { sourceUrl },
      options
    } = config;
    const { rotation } = mapInfo;

    return new Promise((resolve, reject) => {
      loadAndApplyOptionsToAnImage(sourceUrl, { ...options, rotation })
        .then(res => {
          const _config = { ...config };
          _config.options.size = { ...res.options.size };
          resolve({
            ..._config,
            data: res.data
          });
        })
        .catch(err => reject(err));
    });
  }

  getCurrentMapScale({ config }) {
    return new Promise(resolve => {
      const _document = document.querySelector("#distanceLabel");
      try {
        html2canvas(_document, { useCORS: true }).then(legend => {
          const _lgnd = legend.toDataURL("image/png");
          loadAndApplyOptionsToAnImage(_lgnd, config?.options).then(res => {
            const _config = { ...config };
            _config.options.size = { ...res.options.size };
            return resolve({ ..._config, data: res.data });
          });
        });
      } catch (error) {
        console.error(error);
        resolve({ ...config, data: null });
      }
    });
  }
  // TODO: Connect here with PUPPETEER
  getIndividualLayers({ config, shareUrl }) {
    return new Promise((resolve, reject) => {
      reject("Unsupported data format");
    });
  }

  getScale({ mapInfo, config }) {
    return new Promise(resolve => {
      resolve({
        ...config,
        text: mapInfo.zoomLevel.label
      });
    });
  }

  getTitle({ config, enabledItems }) {
    const title =
      (Array.isArray(enabledItems) && enabledItems.length > 0
        ? enabledItems[0].name
        : enabledItems.name) || "Untitled";

    return new Promise(resolve => {
      resolve({
        ...config,
        text: title
      });
    });
  }

  getDatasetDetail({ enabledItems, config }) {
    const items =
      Array.isArray(enabledItems) && enabledItems.length > 0
        ? enabledItems
        : [enabledItems];
    const texts = items.map(itm => {
      return { entry: itm.url };
    });

    return new Promise(resolve => {
      resolve({
        ...config,
        texts: texts
      });
    });
  }

  getDisclaimer({ config }) {
    return new Promise(resolve => {
      resolve({
        ...config,
        text:
          "The designations employed and the presentation of material in this information product are not warranted to be error free and do not imply the expression of any opinion whatsoever on the part of FAO concerning the legal status of any country, territory, city or area or of its authorities, or concerning the delimitation of its frontiers or boundaries. FAO makes every effort to ensure, but does not guarantee, the accuracy, completeness or authenticity of the information in this information product."
      });
    });
  }

  getShortDate({ config }) {
    return new Promise(resolve => {
      resolve({
        ...config,
        text: new Date().toGMTString()
      });
    });
  }

  getCrtbData({
    config,
    terria,
    // enabledItems,
    // mapInfo,
    shareUrl
  }) {
    return new Promise(resolve => {
      new CrtbPrintingDataService({ config, terria, shareUrl })
        .getData()
        .then(rsp => {
          resolve(rsp);
        });
    });
  }

  getLegendsArrayConfigEntries(imageArray) {
    return new Promise(resolve => {
      this.getArrayConfigEntriesPromises(imageArray).then(res => {
        const legends = res.map(itm => {
          const {
            data,
            mimeType,
            options: {
              size: { width, height }
            }
          } = itm;
          const rslt = {
            title: itm.title,
            legend: {
              _type: "image",
              source: data,
              format: mimeType,
              width,
              height
            }
          };
          return rslt;
        });

        if (
          res[0]?.options?.legendsPerPage &&
          res[0]?.options?.legendsPerPage?.length > 0
        ) {
          const legendsPerPage = {};

          (res[0]?.options?.legendsPerPage || [legends.length]).forEach(
            (legendConfig, indx) => {
              const { nLegends, tag } = legendConfig;
              const curLegends = legends.splice(0, Number(nLegends));

              if (curLegends.length > 0) {
                legendsPerPage[tag] = curLegends;
              }
            }
          );

          resolve({ ...legendsPerPage });
        } else {
          resolve({ legends: legends });
        }
      });
    });
  }

  getArrayConfigEntriesPromises(imageArray) {
    const imageArrayPromises = imageArray.reduce(
      (prevConfigEntry, currConfigEntry) =>
        prevConfigEntry.concat(currConfigEntry.items),
      []
    );
    return Promise.all(imageArrayPromises);
  }

  makeAbsolute(url) {
    const uri = new URI(url);
    if (uri.protocol() !== "http" && uri.protocol() !== "https") {
      return url;
    } else {
      return uri.absoluteTo(window.location.href).toString();
    }
  }

  getMapViewInfo(terria) {
    if (defined(terria.cesium)) {
      const scene = terria.cesium.scene;
      const { latitude, longitude } = scene.camera.positionCartographic;
      const rotation = CesiumMath.toDegrees(scene.camera.heading);

      return {
        lng: CesiumMath.toDegrees(longitude),
        lat: CesiumMath.toDegrees(latitude),
        rotation: rotation,
        zoomLevel: this.getScaleForCesium(scene)
      };
    } else if (defined(terria.leaflet)) {
      const map = terria.leaflet.map;
      return {
        ...map.getCenter(),
        rotation: 0,
        zoomLevel: this.getScaleForLeaflet(map)
      };
    } else {
      return {
        lat: 0,
        lng: 0,
        rotation: 0,
        zoomLevel: { value: null, label: null }
      };
    }
  }

  getScaleForLeaflet(map) {
    const halfHeight = map.getSize().y / 2;
    const maxPixelWidth = 100;
    const maxMeters = map
      .containerPointToLatLng([0, halfHeight])
      .distanceTo(map.containerPointToLatLng([maxPixelWidth, halfHeight]));

    const meters = L.control.scale()._getRoundNum(maxMeters);
    return {
      value: meters,
      label: meters < 1000 ? meters + " m" : meters / 1000 + " km"
    };
  }

  getScaleForCesium(scene) {
    const geodesic = new EllipsoidGeodesic();

    // Find the distance between two pixels at the bottom center of the screen.
    const width = scene.canvas.clientWidth;
    const height = scene.canvas.clientHeight;

    const left = scene.camera.getPickRay(
      new Cartesian2((width / 2) | 0, height - 1)
    );
    const right = scene.camera.getPickRay(
      new Cartesian2((1 + width / 2) | 0, height - 1)
    );

    const globe = scene.globe;
    const leftPosition = globe.pick(left, scene);
    const rightPosition = globe.pick(right, scene);

    if (!defined(leftPosition) || !defined(rightPosition)) {
      return { zoomLevel: { value: null, label: null } };
    }

    const leftCartographic = globe.ellipsoid.cartesianToCartographic(
      leftPosition
    );
    const rightCartographic = globe.ellipsoid.cartesianToCartographic(
      rightPosition
    );

    geodesic.setEndPoints(leftCartographic, rightCartographic);
    const pixelDistance = geodesic.surfaceDistance;

    // Find the first distance that makes the scale bar less than 100 pixels.
    const maxBarWidth = 100;
    let distance;
    for (let i = distances.length - 1; !defined(distance) && i >= 0; --i) {
      if (distances[i] / pixelDistance < maxBarWidth) {
        distance = distances[i];
      }
    }

    const scale = { value: null, label: null };

    if (defined(distance)) {
      if (distance >= 1000) {
        scale.label = (distance / 1000).toString() + " km";
      } else {
        scale.label = distance.toString() + " m";
      }
      scale.value = distance;
    }

    return { zoomLevel: { ...scale } };
  }
}

const distances = [
  1,
  2,
  3,
  5,
  10,
  20,
  30,
  50,
  100,
  200,
  300,
  500,
  1000,
  2000,
  3000,
  5000,
  10000,
  20000,
  30000,
  50000,
  100000,
  200000,
  300000,
  500000,
  1000000,
  2000000,
  3000000,
  5000000,
  10000000,
  20000000,
  30000000,
  50000000
];

export const generateQrCode = (config = {}, shareUrl) => {
  const {
    options: { text, size = {}, logo = null }
  } = config;

  return new Promise((resolve, reject) => {
    const qrOptions = {
      text: shareUrl || text || "",
      size: size.width || 200
    };

    if (logo) {
      Jimp.read(logo)
        .then(res =>
          res.getBase64("image/png", (err, res) => {
            if (err) console.error(err);
            else {
              qrOptions["logoImage"] = res;
              qrOptions["logoScale"] = 0.25;
              qrOptions["margin"] = 2;
              createQrCode(qrOptions, config, resolve, reject);
            }
          })
        )
        .catch(err => console.error(err));
    } else {
      createQrCode(qrOptions, config, resolve, reject);
    }
  });
};

const createQrCode = (qrOptions, config, resolve, reject) => {
  new AwesomeQR(qrOptions)
    .draw()
    .then(qrImg =>
      loadAndApplyOptionsToAnImage(qrImg, config.options)
        .then(qrImg => {
          const _config = { ...config };
          _config.options.size = { ...qrImg.options.size };
          resolve({ ..._config, data: qrImg.data });
        })
        .catch(err => reject(err))
    )
    .catch(err => reject(err));
};

/**
 * @param {number} latitude in degrees
 * @param {number} longitude in degrees
 * @param {number} mapWidth in pixels
 * @param {number} mapHeight in pixels
 */
const latLonToOffsets = (latitude, longitude, mapWidth, mapHeight) => {
  const FE = 180; // false easting
  const radius = mapWidth / (2 * Math.PI);

  const latRad = degreesToRadians(latitude);
  const lonRad = degreesToRadians(longitude + FE);

  const x = lonRad * radius;

  const yFromEquator = radius * Math.log(Math.tan(Math.PI / 4 + latRad / 2));
  const y = mapHeight / 2 - yFromEquator;

  return { x: x, y: y };
};

/**
 * @param {number} degrees
 */
const degreesToRadians = degrees => {
  return (degrees * Math.PI) / 180;
};

export const transparent1x1PngConstant =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAQSURBVHgBAQUA+v8AAAAAAAAFAAFkeJU4AAAAAElFTkSuQmCC";

export const loadAndApplyOptionsToAnImage = async (
  img,
  options = {},
  config = null
) => {
  const imgSrc =
    img && (!Array.isArray(img) || img.startsWith("data:image"))
      ? img
      : { url: img };
  let res;
  try {
    res = await Jimp.read(imgSrc);
  } catch (err) {
    console.error("Unable to load image \nERROR: ", err, "\n");
    res = await Jimp.read(
      "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8zwQAAgYBAyKDV6YAAAAASUVORK5CYII="
    );
  }

  const { rotation, size: { width, height } = {} } = options;

  if (rotation) {
    res.rotate(rotation);
  }

  const originalHeight = res.getHeight();
  const originalWidth = res.getWidth();

  const { calcWidth, calHeight } = imageSize(
    originalHeight,
    originalWidth,
    width,
    height
  );

  res.resize(calcWidth, calHeight);

  const imageData = await res.getBufferAsync("image/png");

  return {
    data: imageData,
    options: { size: { width: res.getWidth(), height: res.getHeight() } },
    ...config
  };
};

const imageSize = (
  originalHeight,
  originalWidth,
  settingWidth,
  settingHeight
) => {
  let dimension;

  if (settingHeight || settingWidth) {
    let calcWidthFromHeight, calcHeightFromWidth;

    const aRatio = originalHeight / originalWidth;

    if (settingHeight) {
      calcWidthFromHeight = settingHeight / aRatio;
    }

    if (settingWidth) {
      calcHeightFromWidth = aRatio * settingWidth;
    }

    const fromHeightSum = calcWidthFromHeight + settingHeight,
      fromWidthSum = calcHeightFromWidth + settingWidth;

    if (fromHeightSum && fromHeightSum > fromWidthSum) {
      dimension = { calHeight: calcHeightFromWidth, calcWidth: settingWidth };
    } else if (fromWidthSum) {
      dimension = { calHeight: settingHeight, calcWidth: calcWidthFromHeight };
    } else {
      dimension = { calHeight: originalHeight, calcWidth: originalWidth };
    }
  } else {
    dimension = { calHeight: originalHeight, calcWidth: originalWidth };
  }

  return dimension;
};

const getLegendFromSvg = (_item, config) => {
  const curCatalogItem = { ..._item };

  return new Promise(resolve => {
    const svg = curCatalogItem["legendUrl"]?.["safeSvgContent"]
      .replaceAll("<text ", "<text fill='#000000' ")
      .replace("<svg ", "<svg fill='#FFFFFF' ");

    SVGToPNG({
      svg: svg,
      mimetype: "image/png",
      height: config?.size?.height || 500,
      quality: 1,
      outputFormat: "base64"
    })
      .then(function(outputData) {
        resolve({ data: outputData, options: config });
      })
      .catch(function(err) {
        console.error("==============================");
        console.error(
          "ERROR: An error occured while trying to get legend from SVG."
        );
        console.error("ERROR_STACK_TRACE:", err, "\n");
        console.error("==============================");
        resolve({ data: transparent1x1PngConstant, options: config });
      });
  });
};

/**
 * Simple function that converts a plain SVG string or SVG DOM Node into an image with custom dimensions.
 *
 * @param {Object} settings The configuration object to override the default settings.
 * @see https://ourcodeworld.com/articles/read/1456/how-to-convert-a-plain-svg-string-or-svg-node-to-an-image-png-or-jpeg-in-the-browser-with-javascript
 * @returns {Promise}
 */
function SVGToPNG(settings) {
  const _settings = {
    svg: null,
    // Usually all SVG have transparency, so PNG is the way to go by default
    mimetype: "image/png",
    quality: 0.92,
    width: "auto",
    height: "auto",
    outputFormat: "base64"
  };

  // Override default settings
  for (const key in settings) {
    _settings[key] = settings[key];
  }

  return new Promise(function(resolve) {
    let svgNode;

    // Create SVG Node if a plain string has been provided
    if (typeof _settings.svg === "string") {
      // Create a non-visible node to render the SVG string
      const SVGContainer = document.createElement("div");
      SVGContainer.style.display = "none";
      SVGContainer.innerHTML = _settings.svg;
      svgNode = SVGContainer.firstElementChild;
    } else {
      svgNode = _settings.svg;
    }

    svgNode = editSvgText(svgNode);

    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    const svgDataBase64 = btoa(new XMLSerializer().serializeToString(svgNode));
    const svgBase64 = "data:image/svg+xml;base64," + svgDataBase64;
    const image = new Image();

    image.onload = function() {
      let finalWidth, finalHeight;

      // Calculate width if set to auto and the height is specified (to preserve aspect ratio)
      if (_settings.width === "auto" && _settings.height !== "auto") {
        finalWidth = (this.width / this.height) * _settings.height;
        // Use image original width
      } else if (_settings.width === "auto") {
        finalWidth = this.naturalWidth;
        // Use custom width
      } else {
        finalWidth = _settings.width;
      }

      // Calculate height if set to auto and the width is specified (to preserve aspect ratio)
      if (_settings.height === "auto" && _settings.width !== "auto") {
        finalHeight = (this.height / this.width) * _settings.width;
        // Use image original height
      } else if (_settings.height === "auto") {
        finalHeight = this.naturalHeight;
        // Use custom height
      } else {
        finalHeight = _settings.height;
      }

      // Define the canvas intrinsic size
      canvas.width = finalWidth;
      canvas.height = finalHeight;

      // Render image in the canvas
      context.drawImage(this, 0, 0, finalWidth, finalHeight);

      if (_settings.outputFormat === "blob") {
        // Fullfil and Return the Blob image
        canvas.toBlob(
          function(blob) {
            resolve(blob);
          },
          _settings.mimetype,
          _settings.quality
        );
      } else {
        // Fullfil and Return the Base64 image
        resolve(canvas.toDataURL(_settings.mimetype, _settings.quality));
      }
    };

    // TODO: This needs to be improved for better error handling
    const REGEX = /[A-Za-z0-9+/=]/;
    if (REGEX.test(svgBase64)) {
      // Load the SVG in Base64 to the image
      image.src = svgBase64;
    } else {
      console.error(
        "ERROR: Invalid SVG Base64 string. Using default image ( 1X1 Pixel with white background/fill )."
      );
      image.src = transparent1x1PngConstant;
    }
  });
}

// remove accents/diacritics characters from a svg <text> element body
// https://stackoverflow.com/a/37511463/2087294
function removeAccents(str) {
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D");
}

// Edit SVG <text> elements body
function editSvgText(svg) {
  const selector = "text";
  const textElements = svg.querySelectorAll(selector);

  textElements.forEach(txt => {
    if (txt?.textContent) {
      txt.textContent = removeAccents(txt.textContent);
    }
  });

  return svg;
}
