"use strict";
import React from "react";
import createReactClass from "create-react-class";
import PropTypes from "prop-types";
import classNames from "classnames";
import ko from "terriajs-cesium/Source/ThirdParty/knockout";
import knockout from "terriajs-cesium/Source/ThirdParty/knockout";
import ObserveModelMixin from "../ObserveModelMixin";
import Icon from "../Icon.jsx";
import "@babel/polyfill";
import Styles from "./geojson-editor.scss";
import { withTranslation } from "react-i18next";
import GeoJsonCatalogItem from "../../Models/GeoJsonCatalogItem";
import defined from "terriajs-cesium/Source/Core/defined";
import raiseErrorToUser from "../../Models/raiseErrorToUser";
import Modal from "../Tools/Modal/Modal";

const GeoJsonStyleEditor = createReactClass({
  displayName: "GeoJsonStyleEditor",
  mixins: [ObserveModelMixin],
  propTypes: {
    terria: PropTypes.object.isRequired,
    viewState: PropTypes.object.isRequired,
    t: PropTypes.func
  },
  getInitialState() {
    return {
      visible: false,
      catalogItem: {},
      slidIn: true,
      name: "",
      strokeColor: "#000",
      strokeWidth: 1,
      fillColor: "#555",
      fillOpacity: 0.75,
      refreshFunc: null,
      originalData: {},
      discardChanges: true
    };
  },
  close() {
    const { discardChanges } = this.state;
    const onClose = () => {
      this.props.terria.setGeojsonEditorlModalVisibility({
        visibility: false,
        catalogItem: {},
        slidIn: true
      });
      this.props.viewState.geojsonEditorPanelVisible = false;
      this.props.viewState.switchMobileView(null);
      this.resetState();
    };
    if (discardChanges) this.revertChanges(onClose);
    else onClose();
  },
  resetState() {
    this.setState(this.getInitialState());
  },
  /* eslint-disable-next-line camelcase */
  UNSAFE_componentWillMount() {
    this.props.viewState.explorerPanelAnimating = true;
    this._pickedFeaturesSubscription = ko
      .pureComputed(this.isVisible, this)
      .subscribe(this.onVisibilityChange);
  },
  componentDidMount() {
    this.props.terria.setGeojsonEditorlModalVisibility = knockout.observable(
      "geojsonStyleEditorVisibility"
    );

    this._visibilitySubscription = this.props.terria.setGeojsonEditorlModalVisibility.subscribe(
      data => {
        if (data) {
          this.onVisibilityChange(data);
        }
      }
    );
  },
  onVisibilityChange(data) {
    this.props.viewState.explorerPanelAnimating = data
      ? data.visibility
      : false;

    if (data && data.item) {
      const dataSource = data.item.dataSource;

      let fillColor;
      let fillOpacity;
      let strokeColor;
      let strokeWidth;

      for (const entity of dataSource.entities?.values) {
        if (!entity.polygon) continue;

        fillColor = getHexColor(entity.polygon.material.color._value);
        fillOpacity = entity.polygon.material.color._value.alpha;
        strokeColor = getHexColor(entity.polygon.outlineColor._value);
        strokeWidth = entity.polygon.outlineWidth?._value;

        // entity.polygon.material = new ColorMaterialProperty(Color.fromCssColorString(fillColor).withAlpha(fillOpacity));
        // entity.polygon.outlineColor = Color.fromCssColorString(strokeColor); // new ColorMaterialProperty();
        // entity.polygon.outlineWidth = new ConstantProperty(strokeWidth);

        break;
      }

      this.setState({
        visible: data.visibility,
        catalogItem: data.item,
        name: data.item.name,
        refreshFunc: data.refreshFunc,
        fillColor: fillColor || data.item.style?.["fill"] || "#777",
        fillOpacity: fillOpacity || data.item.style?.["fill-opacity"] || 0.65,
        strokeColor: strokeColor || data.item.style?.["stroke-color"] || "#333",
        strokeWidth: strokeWidth || data.item.style?.["stroke-width"] || 1,
        originalData: {
          name: data.item.name,
          fillColor: fillColor || data.item.style?.["fill"] || "#777",
          fillOpacity: fillOpacity || data.item.style?.["fill-opacity"] || 0.65,
          strokeColor:
            strokeColor || data.item.style?.["stroke-color"] || "#333",
          strokeWidth: strokeWidth || data.item.style?.["stroke-width"] || 1
        },
        dirty: false,
        customAttributes: {}
      });
    }
  },
  componentWillUnmount() {},
  notifyUser(title, message) {
    this.props.viewState.notifications.push({
      title: title,
      message: message,
      width: 300
    });
  },
  isVisible() {
    return (
      !this.props.viewState.useSmallScreenInterface &&
      !this.props.viewState.hideMapUi() &&
      this.props.viewState.geojsonEditorPanelVisible
    );
  },
  saveGeometry() {
    this.props.terria.userManagementServices
      .saveGeometry(this.state.catalogItem)
      .then(
        response => this.notifyUser("Success", response.data),
        error => {
          if (error.response.status == 401) {
            raiseErrorToUser(
              this.props.terria,
              "Please login or refresh session"
            );
          } else {
            raiseErrorToUser(this.props.terria, error.response.data);
          }
        }
      );
  },
  updateStyle() {
    const {
      name,
      fillColor,
      fillOpacity,
      strokeColor,
      strokeWidth,
      catalogItem,
      refreshFunc
    } = this.state;

    // TODO: temporary fix, for a bug that causes the system to crash when Escape is hit from the Editor window. Due to this function called twice, the second time the catalogItem is an empty object and that is when the system crashes.
    if (!defined(catalogItem) || !defined(catalogItem._load)) return;

    const geojson = catalogItem._readyData || {};
    const type = geojson.type;

    const updateFeature = feature => {
      if (feature?.geometry?.type == "Polygon") {
        const properties = feature.properties || {};
        properties["fill"] = fillColor;
        properties["fill-opacity"] = fillOpacity;
        properties["stroke"] = strokeColor;
        properties["stroke-width"] = parseInt(strokeWidth, 10);
        properties["title"] = name;

        feature.properties = properties;
      }
    };

    if (type === "FeatureCollection") {
      for (const feature of geojson.features) {
        if (feature.type == "Feature") {
          updateFeature(feature);
        }
      }
    } else if (type === "Feature") {
      updateFeature(geojson);
    }

    catalogItem.style = catalogItem.style || {};
    catalogItem.style["fill"] = fillColor;
    catalogItem.style["fill-opacity"] = fillOpacity;
    catalogItem.style["stroke"] = strokeColor;
    catalogItem.style["stroke-width"] = parseInt(strokeWidth, 10);
    catalogItem.style["title"] = name;

    catalogItem.url = undefined;
    catalogItem.data = geojson;
    catalogItem?._load();

    if (name !== catalogItem.name && refreshFunc) {
      catalogItem.name = name;
      refreshFunc();
    }
  },
  updateStateWithPreview(state) {
    this.setState({ ...state, dirty: true }, () => {
      this.updateStyle();
    });
  },
  acceptChangesAndClose() {
    this.setState({ discardChanges: false, visible: false });
  },
  cancelChangesAndClose() {
    this.setState({ discardChanges: true, visible: false });
  },
  revertChanges(callBack) {
    this.setState(
      {
        name: this.state.originalData.name,
        fillColor: this.state.originalData.fillColor,
        fillOpacity: this.state.originalData.fillOpacity,
        strokeColor: this.state.originalData.strokeColor,
        strokeWidth: this.state.originalData.strokeWidth
      },
      () => {
        this.updateStyle();
        if (callBack) callBack();
      }
    );
  },
  render() {
    let { t, terria } = this.props;
    const {
      visible,
      name,
      fillColor,
      fillOpacity,
      strokeColor,
      strokeWidth,
      catalogItem
    } = this.state;

    const canBeSaved =
      catalogItem instanceof GeoJsonCatalogItem &&
      defined(terria.configParameters.saveAreaUrl);

    const footer = (
      <div className={Styles.footer}>
        <button
          className={classNames(Styles.update, Styles.cancel)}
          onClick={this.cancelChangesAndClose}
        >
          {t("models.geoJson.editor.cancel")}
        </button>

        <button
          className={Styles.update}
          onClick={this.acceptChangesAndClose}
          disabled={!this.state.dirty}
        >
          {t("models.geoJson.editor.applyStyle")}
        </button>
      </div>
    );

    return (
      <Modal
        visible={visible}
        close={this.close}
        t={t}
        icon={<Icon glyph={Icon.GLYPHS.edit} />}
        title={
          <span>
            Style Editor{" "}
            {this.state.dirty ? (
              <sup>[{t("models.geoJson.editor.modified")}]</sup>
            ) : null}
          </span>
        }
        viewState={this.props.viewState}
        footer={footer}
        size={0.7}
      >
        <div className={Styles.body}>
          <div className={Styles.row}>
            <label htmlFor="polygonName">Name</label>
            <input
              id="polygonName"
              type="text"
              autoComplete="off"
              onChange={e =>
                this.updateStateWithPreview({ name: e.target.value })
              }
              value={name}
            />
          </div>

          <div className={Styles.row}>
            <label>Fill</label>
            <input
              type="color"
              autoComplete="off"
              onChange={e =>
                this.updateStateWithPreview({ fillColor: e.target.value })
              }
              value={fillColor}
            />
          </div>

          <div className={Styles.row}>
            <label>Stroke</label>
            <input
              type="color"
              onChange={e =>
                this.updateStateWithPreview({ strokeColor: e.target.value })
              }
              value={strokeColor}
            />
          </div>

          <div className={Styles.row}>
            <label>Opacity</label>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              autoComplete="off"
              onChange={e =>
                this.updateStateWithPreview({ fillOpacity: e.target.value })
              }
              value={fillOpacity}
            />
          </div>
        </div>

        <hr />

        <If
          condition={
            !canBeSaved || !catalogItem.customProperties?.areaAnalysisParameter
          }
        >
          <span className={Styles.warnLocal}>
            {t("models.geoJson.editor.saveWarning")}
          </span>
        </If>
      </Modal>
    );
  }
});

function convertToB16(c) {
  const hex = c.toString(16);
  return hex.length == 1 ? "0" + hex : hex;
}

function getHexColor(color) {
  return (
    "#" +
    convertToB16(color.red * 255) +
    convertToB16(color.green * 255) +
    convertToB16(color.blue * 255)
  );
}

module.exports = withTranslation()(GeoJsonStyleEditor);
