"use strict";
import React from "react";
import PropTypes from "prop-types";
import createReactClass from "create-react-class";
import GeoJsonParameter from "../../../Models/GeoJsonParameter";
import ObserveModelMixin from "../../ObserveModelMixin";
import UserDrawing from "../../../Models/UserDrawing";
import GeoJsonCatalogItem from "../../../Models/GeoJsonCatalogItem";
import Styles from "./tool_button.scss";
import Icon from "../../Icon.jsx";
import knockout from "terriajs-cesium/Source/ThirdParty/knockout";
import defined from "terriajs-cesium/Source/Core/defined";
import CesiumMath from "terriajs-cesium/Source/Core/Math";
import Ellipsoid from "terriajs-cesium/Source/Core/Ellipsoid";
import DrawShapesDrawer from "./DrawShapesDrawer";
import i18next from "i18next";
import { withTranslation } from "react-i18next";
import isCommonMobilePlatform from "../../../Core/isCommonMobilePlatform";

const GeoJsonDataSource = require("terriajs-cesium/Source/DataSources/GeoJsonDataSource")
  .default;
const sessionStorageKey = "drawn-area-c";
export const AnalysisTool = createReactClass({
  displayName: "DrawTool",
  mixins: [ObserveModelMixin],
  propTypes: {
    terria: PropTypes.object,
    viewState: PropTypes.object,
    previewed: PropTypes.object,
    parameter: PropTypes.object,
    label: PropTypes.string,
    t: PropTypes.func.isRequired
  },

  getInitialState() {
    const { t } = this.props;
    this.props.parameter.value = undefined;
    this.props.parameter.subtype = GeoJsonParameter.PolygonType;
    return {
      userDrawing: new UserDrawing({
        terria: this.props.terria,
        viewState: this.props.viewState,
        allowPolygon: true,
        messageHeader: t("analytics.drawAnArea"),
        onPointClicked: this.onPointClicked,
        onPointMoved: this.onPointMoved,
        onAnalysis: this.onAnalysis,
        onCleanUp: this.onCleanup,
        isAnalysis: true
      }),
      isMobile: isCommonMobilePlatform(),
      isDrawShapesDrawerShown: false
    };
  },
  componentDidMount() {
    this.props.terria.initiateDrawTool = knockout.observable(
      "initiateDrawTool"
    );
    this._initiateDrawTool = this.props.terria.initiateDrawTool.subscribe(
      data => {
        if (data.visible) this.handleClick();
        if (data.callbackData)
          this.setState({
            callbackData: data.callbackData,
            caller: data.caller
          });
      }
    );
    window.onunload = function() {
      sessionStorage.removeItem(sessionStorageKey);
    };
  },
  componentWillUnmount() {
    if (defined(this._initiateDrawTool)) {
      this._initiateDrawTool.dispose();
      this._initiateDrawTool = undefined;
    }
  },
  onCleanup() {
    if (
      this.state.callbackData &&
      !this.props.viewState.analysisPanelIsVisible
    ) {
      const that = this;
      setTimeout(() => {
        if (!that.state.callbackData) return;

        const newAreaParameters = [
          ...(that.state.callbackData.newAreaParameters || []),
          ...(that.state.callbackData.areaParameters || [])
        ];
        that.props.terria.setAnalysisModalVisibility({
          visibility: true,
          ...that.state.callbackData,
          newAreaParameters
        });

        that.setState({ callbackData: null });
      }, 500);
    }
  },
  onAnalysis() {
    const terria = this.props.terria;

    const searchTerm = /^Area \d/;
    const count =
      Number(
        sessionStorage.getItem(sessionStorageKey) ||
          terria.nowViewing.items.filter(a => searchTerm.test(a.name)).length ||
          0
      ) + 1;
    sessionStorage.setItem(sessionStorageKey, count);
    const name = "Area " + count;

    const geo = new GeoJsonCatalogItem(terria);
    geo.id = `Polygon-${name}-${new Date().getTime().toString()}`;
    geo.name = name;

    geo._dataSource = new GeoJsonDataSource(`${name}-datasource`);
    terria.dataSources.add(geo._dataSource);
    geo.customProperties = {
      hideRawDataButton: true,
      areaAnalysisParameter: true
    };

    geo.data = `{"properties": {}, "type": "Feature","geometry": {"type": "Polygon","coordinates": ${JSON.stringify(
      this.props.parameter.value
    )} }}`;

    geo.geojson = JSON.parse(`{
      "type": "FeatureCollection",
      "features": [${geo.data}]
    }`);

    import(
      /* webpackChunkName: "turf" */ "../../../ThirdParty/turf.min.js"
    ).then(turf => {
      const polygon = geo.geojson.features[0];
      const area = turf.area(polygon) / (1000 * 1000);
      const perimeter = turf.length(polygon, { units: "kilometers" });
      const bbox = turf.bbox(polygon)?.map(a => a.toFixed(3)) || [0, 0, 0, 0];
      const center = turf.center(polygon)?.geometry?.coordinates || [0, 0];

      polygon.properties.area = `${area.toFixed(2)} km<sup>2</sup>`;
      polygon.properties.perimeter = `${perimeter.toFixed(2)} km`;
      polygon.properties.bbox = bbox;
      polygon.properties.center = `{lat: ${center[1].toFixed(
        3
      )}°, lng: ${center[0].toFixed(3)}°}`;

      geo.description = geo.featureInfoTemplate = `
      <table>
        <tr>
          <td>Area</td>
          <td >${area.toFixed(2)} km<sup>2</sup></td>
        </tr>
        <tr>
          <td>Perimeter</td>
          <td >${perimeter.toFixed(2)} km</td>
        </tr>
        <tr>
          <td>Center</td>
          <td>{lat: ${center[1].toFixed(3)}°, lng: ${center[0].toFixed(
        3
      )}°}</td>
        </tr>
        <tr>
          <td>Bounding Box </td>
          <td>{"west": ${bbox[0]}°, "south": ${bbox[1]}°, "east": ${
        bbox[2]
      }°, "north": ${bbox[3]}°}   </td>
        </tr>
      </table>
      <br/> 
      <section>
        <strong>Geojson:</strong>
        <button disabled data-file="${
          geo.name
        }-GeoJson.json" style="float:right;cursor:pointer;border: 2px solid grey;padding: 3px;border-radius: 3px; background: transparent;" class="geojson-download">
          Download
        </button>
        <pre style='height: 150px;overflow-y:auto'>${JSON.stringify(
          geo._readyData || geo.geojson,
          null,
          2
        )}</pre>
      </section>`;

      geo.isEnabled = true;
      geo.isShown = true;
      geo.polygonForAreaTimeSeries = true;
      geo.clampToGround = true;
      geo.style = { "fill-opacity": 0.65 };
      // geo.isUserSupplied = false;
      this.props.terria.initiateDrawTool(false);

      if (this.state.callbackData) {
        const newAreaParameters = [
          geo,
          ...(this.state.callbackData.newAreaParameters || []),
          ...(this.state.callbackData.areaParameters || [])
        ];

        if (this.state.caller === "SEPAL") {
          this.props.terria.setSepalModalVisibility({
            visibility: true,
            ...this.state.callbackData,
            newAreaParameters
          });
        } else if (this.state.caller === "CRTB") {
          this.props.terria.setCrtbModalVisibility({
            visibility: true,
            ...this.state.callbackData,
            newAreaParameters
          });
        } else if (this.state.caller === "EXPORT") {
          this.props.terria.setExportModalVisibility({
            visibility: true,
            ...this.state.callbackData,
            newAreaParameters
          });
        } else {
          this.props.terria.setAnalysisModalVisibility({
            visibility: true,
            ...this.state.callbackData,
            newAreaParameters
          });
        }

        this.setState({ callbackData: null });
      }
      if (
        terria.catalog.userAddedDataGroup &&
        terria.catalog.userAddedDataGroup.items
      ) {
        terria.catalog.userAddedDataGroup.items.push(geo);
      }
    });
  },

  onPointClicked(pointEntities) {
    const { terria, parameter } = this.props;
    parameter.value = [this.getPointsLongLats(pointEntities, terria)];
  },

  onPointMoved(pointEntities) {
    this.onPointClicked(pointEntities);
  },

  handleClick() {
    this.state.userDrawing.enterDrawMode();
  },

  startDrawing(shape) {
    const shapeName = shape == "" ? "Shape" : shape;
    this.state.userDrawing.messageHeader = i18next.t(
      `models.userDrawing.draw${shapeName
        .charAt(0)
        .toUpperCase()}${shapeName.slice(1)}MessageHeader`
    );
    this.state.userDrawing.enterDrawMode(shape);
  },

  setIsDrawShapesDrawerShown(visible) {
    this.setState({
      isDrawShapesDrawerShown: visible
    });
  },

  /**
   * Helper function for processing clicked/moved points.
   */
  getPointsLongLats(pointEntities, terria) {
    const pointEnts = pointEntities.entities.values;
    const pointsLongLats = [];

    for (const currentPoint of pointEnts) {
      const currentPointPos = currentPoint.position.getValue(
        terria.clock.currentTime
      );
      const cartographic = Ellipsoid.WGS84.cartesianToCartographic(
        currentPointPos
      );
      const points = [];
      points.push(CesiumMath.toDegrees(cartographic.longitude));
      points.push(CesiumMath.toDegrees(cartographic.latitude));
      pointsLongLats.push(points);
    }

    // Close the polygon.
    if (pointsLongLats.length > 0) {
      pointsLongLats.push(pointsLongLats[0]);
    }

    return pointsLongLats;
  },

  render() {
    const btnClass = this.props.label ? Styles.full_button : Styles.btn;
    const { isDrawShapesDrawerShown, isMobile } = this.state;
    return (
      <div>
        <div className={Styles.toolButton}>
          <button
            type="button"
            className={btnClass}
            onClick={_ =>
              this.setIsDrawShapesDrawerShown(!isDrawShapesDrawerShown)
            }
            onMouseEnter={_ => {
              if (!isMobile) this.setIsDrawShapesDrawerShown(true);
            }}
            title={"Draw Shapes"}
          >
            <Icon glyph={Icon.GLYPHS.pencilDraw} />
            {this.props.label}
          </button>
          <DrawShapesDrawer
            visible={isDrawShapesDrawerShown}
            startDrawing={this.startDrawing}
            closeDrawer={() => this.setIsDrawShapesDrawerShown(false)}
            t={i18next.t}
          />
        </div>
      </div>
    );
  }
});
export default withTranslation()(AnalysisTool);
