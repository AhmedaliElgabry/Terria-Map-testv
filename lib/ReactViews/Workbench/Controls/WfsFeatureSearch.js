import loadJson from "../../../Core/loadJson";
import proxyCatalogItemUrl from "../../../Models/proxyCatalogItemUrl";
import L from "leaflet";

/**
 * This service queries Geoserver with WFS
 * to get available features within a vector tile layer
 */
export default class WfsFeatureSearch {
  constructor(catalogItem) {
    this.item = catalogItem;
  }

  /**
   * Fetches the attributes of a feature
   * such as adm0_name, adm0_code etc
   * @returns {Promise<[{name:'', type:''}]>}
   */
  async fetchLayerAttributes() {
    const { item } = this;
    if (this.searchableAttributes) return this.searchableAttributes;

    if (item.type !== "mvt") return [];

    const preferedAttributes = item.featureSearchAttributes || [];
    const preferedAttributesKeys = preferedAttributes.map(a => a.attribute);

    const params = {
      service: "wfs",
      version: "2.0.0",
      request: "DescribeFeatureType",
      typeName: this.item.layer,
      outputFormat: "application/json"
    };

    const paramterQuery = Object.entries(params)
      .map(a => `${a[0]}=${a[1]}`)
      .join("&");

    const url = `${this.getWfsUrl()}?${paramterQuery}`;
    const proxyUrl = proxyCatalogItemUrl(this.item, url, "1d");

    const result = await loadJson(proxyUrl);

    const supportedTypes = ["string", "number"];

    try {
      const filter = attrib => {
        if (preferedAttributesKeys.length) {
          return preferedAttributesKeys.includes(attrib.name);
        }

        return supportedTypes.includes(attrib.localType);
      };

      const searchableAttributes =
        result?.featureTypes?.[0]?.properties?.filter(filter).map(a => {
          const attrib = preferedAttributes.find(t => t.attribute == a.name);
          return {
            name: a.name,
            type: a.localType,
            text: attrib?.text,
            default: attrib?.default || false
          };
        }) ?? [];

      this.searchableAttributes = searchableAttributes;

      return searchableAttributes;
    } catch (error) {
      console.error(
        "Unable to fetch searchable attributes from geoserver",
        error
      );
      return (this.searchableAttributes = []), [];
    }
  }

  /**
   * Searches geoserver layer for feature that has
   * a "searchBy" attribute with a value
   * provided in the "query" parameter
   * @param {{name: '', type: ''}} searchBy
   * @param {String} query
   * @returns {Promise<Feature>}
   */
  async searchFeatures(searchBy, query) {
    if (!query) return [];

    /**
     * The WFS library has some dependency issues.
     * todo: resolve
     */
    // return new Promise((resolve, reject) => {
    //   wfs.getFeature({
    //     url: '`https://data.review.fao.org/map/gsrv/gsrv1/gaul/wfs',
    //     typeName: this.item.layer,
    //     filter: new geofilter.RuleSet([{
    //       type: 'like',
    //       args: {
    //         property: searchBy.name,
    //         value: query,
    //         matchCase: false
    //       }
    //     }]).to('ogc'),
    //   }, (err, result) => {
    //     debugger;
    //     if(err) {
    //       reject(err);
    //     }

    //     resolve(result.features || []);
    //   });
    // });
    // }

    const params = {
      service: "wfs",
      version: "1.0.0",
      request: "GetFeature",
      typeName: this.item.layer,
      maxFeatures: 10,
      outputFormat: "application/json",
      propertyName: this.searchableAttributes.map(a => a.name).join(","),
      cql_filter: `strToLowerCase(${
        searchBy.name
      })%20like%20%27%25${query.toLowerCase()}%25%27`
    };

    const paramterQuery = Object.entries(params)
      .map(a => `${a[0]}=${a[1]}`)
      .join("&");

    const url = `${this.getWfsUrl()}?${paramterQuery}`;
    const proxyUrl = proxyCatalogItemUrl(this.item, url, "1d");
    const result = await loadJson(proxyUrl);

    return (result?.features || []).map(feature => {
      /**
       * Some datasets in geoserver return bounding box in lat,lng (4326) while some return in meters (3857)
       * Converts to 4326
       */
      feature["bbox"] = this.Epsg3857To4326(feature["bbox"]);
      return feature;
    });
  }

  Epsg3857To4326(boundingBox) {
    const [west, south, east, north] = boundingBox;
    const is3857 =
      [west, east].some(c => c > 180 || c < -180) ||
      [north, south].some(c => c > 90 || c < -90);

    if (!is3857) return boundingBox;

    const swPoint = L.point(west, south, true);
    const nePoint = L.point(east, north, true);

    const sw4326 = L.Projection.SphericalMercator.unproject(swPoint);
    const ne4326 = L.Projection.SphericalMercator.unproject(nePoint);

    return [sw4326.lng, sw4326.lat, ne4326.lng, ne4326.lat];
  }

  getWfsUrl() {
    const { url, wfsEndpoint } = this.item;
    if (typeof wfsEndpoint == "string") {
      return wfsEndpoint;
    }

    let domain = "https://data.apps.fao.org/"; // fallback domain
    let workspace = "";

    // try {
    //   const workspaceRe = /(?<=(.+)gsrv\/gsrv1\/)(.+)(?=gwc\/service\/.+)/;
    //   const domainRe = /https:\/\/data\.(apps|review)\.fao\.org\//;

    //   domain = domainRe.exec(url)?.[0];
    //   workspace = workspaceRe.exec(url)?.[0] ?? "";
    // } catch (error) {
    // regex lookahead is not supported on safari, and no polyfill for it
    // typical url we need to parse looks like this
    // https://data.apps.fao.org/map/gsrv/gsrv1/gaul/gwc/service/wmts?REQUEST=GetTile&SERVICE=WMTS&VERSION=1.0.0&LAYER=g2015_2014_0&STYLE=&TILEMATRIX=EPSG:900913:{z}&TILEMATRIXSET=EPSG:900913&FORMAT=application/vnd.mapbox-vector-tile&TILECOL={x}&TILEROW={y}
    const newUrl = url
      .replace("https://data.apps.fao.org/map/gsrv/gsrv1/", "")
      .replace("https://data.review.fao.org/map/gsrv/gsrv1/", "");
    const indexOfService = newUrl.indexOf("gwc");
    if (indexOfService > 0) {
      workspace = newUrl.substring(0, indexOfService); // workspace is /gsrv1/<WORKSPACE>/GWC
    }
    // }

    // if (!domain) throw new Error("Not a valid wfs url");

    return `${domain}map/gsrv/gsrv1/${workspace}wfs`;
  }
}
