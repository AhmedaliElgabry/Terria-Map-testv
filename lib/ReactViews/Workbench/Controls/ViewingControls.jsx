"use strict";
import Cartographic from "terriajs-cesium/Source/Core/Cartographic";
import defined from "terriajs-cesium/Source/Core/defined";
import Ellipsoid from "terriajs-cesium/Source/Core/Ellipsoid";
import Icon from "../../Icon.jsx";
import ObserveModelMixin from "../../ObserveModelMixin";
import PickedFeatures from "../../../Map/PickedFeatures";
import React from "react";
import createReactClass from "create-react-class";
import PropTypes from "prop-types";
import Rectangle from "terriajs-cesium/Source/Core/Rectangle";
import when from "terriajs-cesium/Source/ThirdParty/when";
import classNames from "classnames";
import Styles from "./viewing-controls.scss";
import { withTranslation } from "react-i18next";

import duplicateItem from "../../../Models/duplicateItem";
import addUserCatalogMember from "../../../Models/addUserCatalogMember";
import ImagerySplitDirection from "terriajs-cesium/Source/Scene/ImagerySplitDirection";
import GeoJsonCatalogItem from "../../../Models/GeoJsonCatalogItem.js";
import ViewerMode from "../../../Models/ViewerMode.js";
import VisualizationType from "../../../Models/VisualizationType.js";
import raiseErrorToUser from "../../../Models/raiseErrorToUser.js";

const inversionCoordinates = [
  [180, 90],
  [-180, 90],
  [-180, -90],
  [180, -90],
  [180, 90]
];

const ViewingControls = createReactClass({
  displayName: "ViewingControls",
  mixins: [ObserveModelMixin],
  propTypes: {
    terria: PropTypes.object.isRequired,
    item: PropTypes.object.isRequired,
    viewState: PropTypes.object.isRequired,
    t: PropTypes.func.isRequired
  },
  getInitialState() {
    return { geojsonInverted: this.isGeojsonInverted() };
  },
  componentDidUpdate() {
    const { item, terria } = this.props;
    if (!item instanceof GeoJsonCatalogItem) return;

    /* Right now, we support inverting geojson only on leaflet. 
       So if the user switches to 3d globe, then remove the inversion and show the original
       polygon.
    */
    if (this.isGeojsonInverted() && terria.viewerMode !== ViewerMode.Leaflet) {
      this.toggleFocus();
    }
  },
  isGeojsonInverted() {
    const item = this.props.item;
    if (!item instanceof GeoJsonCatalogItem) return;

    const coordinates = item.data?.geometry?.coordinates;
    let geojsonInverted =
      coordinates &&
      coordinates.length > 1 &&
      (coordinates[0] === inversionCoordinates ||
        deepEqual(coordinates[0], inversionCoordinates));
    return geojsonInverted;
  },
  removeFromMap() {
    this.props.terria.nowViewing.remove(this.props.item);
    //  this.props.item.isEnabled = false;
  },

  zoomTo() {
    this.props.item.zoomToAndUseClock();
  },

  notifyUser(title, message) {
    this.props.viewState.notifications.push({
      title: title,
      message: message,
      width: 300
    });
  },

  async saveArea() {
    try {
      const response = await this.props.terria.userManagementServices.saveGeometry(
        this.props.item
      );
      this.notifyUser("Success", response.data);
    } catch (error) {
      if (error.response.status == 401) {
        raiseErrorToUser(this.props.terria, "Please login or refresh session");
      } else {
        raiseErrorToUser(this.props.terria, error.response.data);
      }
    }
  },

  toggleFocus() {
    const item = this.props.item;
    const features = item.data?.features;

    if (Array.isArray(features) && features.length) {
      for (const feature of features) {
        const coordinates = feature.geometry?.coordinates;
        this.toggleInvertCoordinates(coordinates, item.data);
      }

      item._load();
      return;
    }

    const coordinates = item.data?.geometry?.coordinates;

    this.toggleInvertCoordinates(coordinates, item.data);

    item._load();
  },
  toggleInvertCoordinates(coordinates, data) {
    if (!Array.isArray(coordinates)) {
      return;
    }

    if (coordinates.length === 1) {
      coordinates.unshift(inversionCoordinates);
      this.zoomTo();

      data.properties = data.properties || {};
      data.properties["fill-bk"] = data.properties["fill"];
      data.properties["fill-opacity-bk"] = data.properties["fill-opacity"];
      data.properties["fill"] = "#444";
      data.properties["fill-opacity"] = 0.65;

      this.setState({ geojsonInverted: true });
      return;
    }

    if (coordinates.length >= 2) {
      if (
        coordinates[0] === inversionCoordinates ||
        deepEqual(coordinates[0], inversionCoordinates)
      ) {
        coordinates.shift();
        this.setState({ geojsonInverted: false });
      }

      data.properties = data.properties || {};
      data.properties["fill"] = data.properties["fill-bk"];
      data.properties["fill-opacity"] = data.properties["fill-opacity-bk"];
      delete data.properties["fill-bk"];
      delete data.properties["fill-opacity-bk"];
    }
  },
  openFeature() {
    const item = this.props.item;
    const pickedFeatures = new PickedFeatures();
    pickedFeatures.features.push(item.tableStructure.sourceFeature);
    pickedFeatures.allFeaturesAvailablePromise = when();
    pickedFeatures.isLoading = false;
    const xyzPosition = item.tableStructure.sourceFeature.position.getValue(
      item.terria.clock.currentTime
    );
    const ellipsoid = Ellipsoid.WGS84;
    // Code replicated from GazetteerSearchProviderViewModel.
    const bboxRadians = 0.1; // GazetterSearchProviderViewModel uses 0.2 degrees ~ 0.0035 radians. 1 degree ~ 110km. 0.1 radian ~ 700km.

    const latLonPosition = Cartographic.fromCartesian(xyzPosition, ellipsoid);
    const south = latLonPosition.latitude + bboxRadians / 2;
    const west = latLonPosition.longitude - bboxRadians / 2;
    const north = latLonPosition.latitude - bboxRadians / 2;
    const east = latLonPosition.longitude + bboxRadians / 2;
    const rectangle = new Rectangle(west, south, east, north);
    const flightDurationSeconds = 1;
    // TODO: This is bad. How can we do it better?
    setTimeout(function() {
      item.terria.pickedFeatures = pickedFeatures;
      item.terria.currentViewer.zoomTo(rectangle, flightDurationSeconds);
    }, 50);
  },

  splitItem() {
    const { t } = this.props;
    const item = this.props.item;

    item.splitDirection = ImagerySplitDirection.RIGHT;
    const newItem = duplicateItem(
      item,
      undefined,
      t("splitterTool.workbench.copyName", {
        name: item.name
      })
    );
    newItem.splitDirection = ImagerySplitDirection.LEFT;
    if (newItem.useOwnClock === false) {
      newItem.useOwnClock = true;
    }

    // newItem is added to terria.nowViewing automatically by the "isEnabled" observable on CatalogItem (see isEnabledChanged).
    // However, nothing adds it to terria.catalog automatically, which is required so the new item can be shared.
    addUserCatalogMember(item.terria, newItem, { open: false, zoomTo: false });
    item.terria.showSplitter = true;
  },

  previewItem() {
    let item = this.props.item;
    // If this is a chartable item opened from another catalog item, get the info of the original item.
    if (defined(item.sourceCatalogItem)) {
      item = item.sourceCatalogItem;
    }
    // Open up all the parents (doesn't matter that this sets it to enabled as well because it already is).
    item.enableWithParents();
    this.props.viewState.viewCatalogMember(item);
    this.props.viewState.switchMobileView(
      this.props.viewState.mobileViewOptions.preview
    );
  },

  analysisTool() {
    const item = this.props.item;
    item.analyzeData();
  },

  openDeltaTool() {
    this.props.viewState.currentTool = { type: "delta", item: this.props.item };
  },
  render() {
    const { item, terria } = this.props;

    const canZoom =
      item.canZoomTo ||
      (item.tableStructure && item.tableStructure.sourceFeature);
    const canSplit =
      terria.viewType == VisualizationType.MAP &&
      !item.terria.configParameters.disableSplitter &&
      item.supportsSplitting &&
      defined(item.splitDirection) &&
      item.terria.currentViewer.canShowSplitter;

    const shouldShowGeojsonFocus =
      item instanceof GeoJsonCatalogItem &&
      item.data &&
      terria.viewerMode === ViewerMode.Leaflet;

    const shouldSaveArea =
      item instanceof GeoJsonCatalogItem &&
      defined(terria.configParameters.saveAreaUrl) &&
      terria.userManagementServices.isLoggedIn;

    const isGeojsonInverted = this.state.geojsonInverted;

    const classList = {
      [Styles.noZoom]: !canZoom,
      [Styles.noSplit]: !canSplit,
      [Styles.noInfo]: !item.showsInfo
    };
    const { t, viewState } = this.props;
    return (
      <ul className={Styles.control}>
        <If condition={item.canZoomTo}>
          <li key={121} className={classNames(Styles.zoom, classList)}>
            <button
              type="button"
              onClick={this.zoomTo}
              title={t("workbench.zoomToTitle")}
              className={Styles.btn}
            >
              {t("workbench.zoomTo")}
            </button>
          </li>
          <span className={Styles.separator} />
        </If>
        <If condition={shouldSaveArea}>
          <li key={121} className={classNames(Styles.zoom, classList)}>
            <button
              type="button"
              onClick={this.saveArea}
              title={t("workbench.saveArea")}
              className={Styles.btn}
            >
              {t("workbench.saveArea")}
            </button>
          </li>
          <span className={Styles.separator} />
        </If>
        <If condition={shouldShowGeojsonFocus}>
          <li key={2} className={classNames(Styles.zoom, classList)}>
            <button
              type="button"
              onClick={this.toggleFocus}
              title={
                isGeojsonInverted
                  ? t("workbench.revertGeojsonTitle")
                  : t("workbench.invertGeojsonTitle")
              }
              className={Styles.btn}
            >
              {isGeojsonInverted
                ? t("workbench.revertGeojson")
                : t("workbench.invertGeojson")}
            </button>
          </li>
          <span className={Styles.separator} />
        </If>
        <If
          condition={item.tableStructure && item.tableStructure.sourceFeature}
        >
          <li key={3} className={classNames(Styles.zoom, classList)}>
            <button
              type="button"
              onClick={this.openFeature}
              title={t("workbench.openFeatureTitle")}
              className={Styles.btn}
            >
              {t("workbench.openFeature")}
            </button>
          </li>
          <span className={Styles.separator} />
        </If>
        <If condition={item.showsInfo}>
          <li key={4} className={classNames(Styles.info, classList)}>
            <button
              type="button"
              onClick={this.previewItem}
              className={Styles.btn}
              title={t("workbench.previewItemTitle")}
            >
              {t("workbench.previewItem")}
            </button>
          </li>
          <span className={Styles.separator} />
        </If>
        <If condition={canSplit}>
          <li key={5} className={classNames(Styles.split, classList)}>
            <button
              type="button"
              onClick={this.splitItem}
              title={t("workbench.splitItemTitle")}
              className={Styles.btn}
            >
              {t("workbench.splitItem")}
            </button>
          </li>
          <span className={Styles.separator} />
        </If>
        <If
          condition={
            item.supportsDeltaComparison &&
            viewState.useSmallScreenInterface === false
          }
        >
          <li key={8} className={classNames(Styles.delta, classList)}>
            <button
              type="button"
              onClick={this.openDeltaTool}
              className={Styles.btn}
              title="Compare imagery from two dates"
            >
              Delta
            </button>
          </li>
          <span className={Styles.separator} />
        </If>
        <li key={10} className={classNames(Styles.remove, classList)}>
          <button
            type="button"
            onClick={this.removeFromMap}
            title={t("workbench.removeFromMapTitle")}
            className={Styles.btn}
          >
            {t("workbench.removeFromMap")} <Icon glyph={Icon.GLYPHS.remove} />
          </button>
        </li>
      </ul>
    );
  }
});
module.exports = withTranslation()(ViewingControls);

function deepEqual(array1, array2) {
  if (!Array.isArray(array1) && !Array.isArray(array2)) {
    return array1 === array2;
  }

  if (array1.length !== array2.length) {
    return false;
  }

  for (var i = 0, len = array1.length; i < len; i++) {
    if (!deepEqual(array1[i], array2[i])) {
      return false;
    }
  }

  return true;
}
