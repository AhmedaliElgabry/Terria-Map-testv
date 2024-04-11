import { MimeType } from "easy-template-x";
import Jimp from "jimp";
import URI from "urijs";
import loadJson from "../Core/loadJson";

import { loadAndApplyOptionsToAnImage } from "./PrintingDataService";

import FONTS from "../Utilities/fonts";
// import _fnt from '../../node_modules/jimp/fonts/open-sans/open-sans-16-white/open-sans-16-white.fnt';

export default class CrtbPrintingDataService {
  dataTypes = {
    project_title: this.projectTitle,
    risk_layers: this.getRiskLayers,
    chart: this.getChart
  };

  _terria;
  _shareUrl;
  _selectedGeometry;

  constructor(terria, shareUrl, selectedGeometry) {
    this._terria = { ...terria };
    this._shareUrl = shareUrl;
    this._selectedGeometry = selectedGeometry;
  }

  getData = (dataOptions, otherDatasources, data = null, params = null) => {
    return new Promise(resolve => {
      const { entries } = dataOptions;
      const dataPromises = [];

      entries.forEach(entry => {
        const _dataFunc = this.dataTypes[entry.tag];

        if (typeof _dataFunc === "function")
          dataPromises.push(
            _dataFunc({
              config: entry,
              terria: this._terria,
              shareUrl: this._shareUrl,
              params: params,
              selectedGeometry: this._selectedGeometry,
              data: data,
              otherDatasources: otherDatasources
            })
          );
      });

      Promise.all(dataPromises).then(res => {
        const images = res.filter(res => res.type === "image");
        const imageObjs = res.filter(res => res.type === "imageObjs");
        // const imageArray = res.filter(res => res.type === "images");
        // const texts = res.filter(res => res.type === "text");
        // const textArray = res.filter(res => res.type === "texts");

        let _imageObjEntries = {};
        imageObjs.forEach((imgO, _index) => {
          const imgs = imgO.data.reduce((acc, cur) => {
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

          _imageObjEntries = { ..._imageObjEntries, ...imgs };
        });

        const _imageConfigEntires = images.reduce((acc, cur) => {
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

        resolve({
          ...data,
          ..._imageObjEntries,
          ..._imageConfigEntires
          // ...imageArray,
          // ...texts,
          // ...textArray
        });
      });
    });
  };

  projectTitle({ config, terria }) {
    return new Promise(resolve => {
      resolve({
        ...config,
        text: "_________________________"
      });
    });
  }

  getChart(options) {
    const {
      config,
      data: { chart }
    } = options; // TODO: better way to access class level this.terria variable instance

    return new Promise(resolve => {
      // terria.currentViewer.captureScreenshot().then(mapImageDataUrl =>
      loadAndApplyOptionsToAnImage(chart, config?.options).then(res => {
        const _config = { ...config };
        _config.options.size = { ...res.options.size };
        return resolve({ ..._config, data: res.data });
      });
      // );
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

  getRiskLayersArrayConfigEntries(imageArray) {
    return new Promise((resolve, reject) => {
      this.getArrayConfigEntriesPromises(imageArray).then(res => {
        const riskLayers = res.map(itm => {
          const {
            data,
            mimeType,
            options: {
              size: { width, height }
            }
          } = itm;
          const rslt = {
            // name: itm.title,
            risk: {
              _type: "image",
              source: data,
              format: mimeType,
              width,
              height
            }
          };
          return rslt;
        });

        resolve({ legends: riskLayers });
      });
    });
  }

  async getRiskLayers({
    shareUrl,
    terria,
    params,
    config,
    selectedGeometry,
    otherDatasources
  }) {
    const { geometryName, gaul_id, gaul_lvl } = params || {};
    const {
      layerPrintServiceBaseurl: baseurl,
      north_arrow,
      riskLegends
    } = otherDatasources;

    const url = `${baseurl}?shareId=${shareUrl}&area=${geometryName}&${
      gaul_lvl
        ? "&level=" + gaul_lvl
        : "&geometry=" + JSON.stringify(selectedGeometry)
    }`;

    const getRiskLegend = key => {
      return riskLegends[key];
    };

    return new Promise(resolve => {
      const { corsProxy } = terria;
      const proxiedUrl = corsProxy.getURL(url, "1d");
      const uri = new URI(proxiedUrl);
      const _url = uri.absoluteTo(window.location.href).toString();

      const riskLayers = [];
      const riskLegends = [];

      loadJson(_url).then(rsp => {
        const {
          layer: layers,
          metadata: { scale }
        } = rsp;

        for (const risk in layers) {
          if (Object.hasOwnProperty.call(layers, risk)) {
            const riskLayer = layers[risk];

            riskLayers.push(
              loadAndApplyOptionsToAnImage(
                riskLayer,
                { ...config.options },
                { name: risk, type: "layer" }
              )
            );

            riskLegends.push(
              loadAndApplyOptionsToAnImage(
                getRiskLegend(risk),
                {},
                { name: risk, type: "legend" }
              )
            );
          }
        }

        const north_arrowPromise = loadAndApplyOptionsToAnImage(
          north_arrow,
          {},
          { name: "north_arrow", type: "north_arrow" }
        );

        const images = [];
        Promise.all([...riskLayers, ...riskLegends, north_arrowPromise]).then(
          // Promise.all([...riskLayers, ...riskLegends]).then(
          imgs => {
            let names = imgs.map(m => m.name);
            names = names.filter((v, i) => names.indexOf(v) === i);
            const _north_arrow = imgs[imgs.length - 1];
            for (const risk in layers) {
              const i = imgs.filter(img => img.name === risk);
              images.push(
                compose(
                  i[0]?.data,
                  i[1]?.data,
                  _north_arrow?.data,
                  { ...i[0]?.options, name: i[0]?.name },
                  scale
                )
              );
            }

            Promise.all(images).then(imagesRsp => {
              const _images = imagesRsp.map(mergedImage => {
                return {
                  tag: `${mergedImage.name}_layer`,
                  type: "image",
                  format: MimeType.Png,
                  data: mergedImage?.data,
                  options: mergedImage?.options
                };
              });
              resolve({
                data: [..._images],
                type: "imageObjs"
              });
            });
          }
        );
      });
    });
  }
}

export const compose = (map, legend, north_arrow, config, scale) => {
  const _map = Jimp.read(map);
  const _legend = Jimp.read(legend);
  const _north_arrow = Jimp.read(north_arrow);

  return new Promise(resolve => {
    Promise.all([_map, _legend, _north_arrow]).then(([m, l, na]) => {
      l.resize(Jimp.AUTO, Math.min(m.getHeight() - 10, l.getHeight() - 10));
      na.resize(40, Jimp.AUTO);
      na.resize(Jimp.AUTO, 40);

      const merged = m
        .composite(l, m.getWidth() - l.getWidth() - 5, 5, {
          mode: Jimp.BLEND_SOURCE_OVER,
          opacityDest: 1,
          opacitySource: 0.9
        })
        .composite(na, 10, 10, {
          mode: Jimp.BLEND_SOURCE_OVER,
          opacityDest: 1,
          opacitySource: 0.9
        });

      Jimp.loadFont(FONTS.OPEN_SANS_16_WHITE)
        .then(font => {
          merged.print(font, 10, merged.getHeight() - 30, scale || "");
        })
        .catch(err => {
          console.error(err);
        })
        .finally(() => {
          merged.getBufferAsync("image/png").then(_data => {
            resolve({
              data: _data,
              options: {
                size: { width: merged.getWidth(), height: merged.getHeight() }
              },
              ...config
            });
          });
        });
    });
  });
};
