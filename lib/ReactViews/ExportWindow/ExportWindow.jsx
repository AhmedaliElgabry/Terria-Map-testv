"use strict";
import React from "react";
import createReactClass from "create-react-class";
import PropTypes from "prop-types";
import classNames from "classnames";
import ko from "terriajs-cesium/Source/ThirdParty/knockout";
import knockout from "terriajs-cesium/Source/ThirdParty/knockout";
import ObserveModelMixin from "../ObserveModelMixin";
import Dropdown from "../Generic/Dropdown";
import defined from "terriajs-cesium/Source/Core/defined";
import Styles from "./export-window.scss";
import axios from "axios";
import moment from "moment";
import "@babel/polyfill";
import "./export-window.scss";
import Loader from "../Loader.jsx";
import GeometryHelper from "../../Utilities/GeometryHelper";
import URI from "urijs";
import proxyCatalogItemUrl from "../../Models/proxyCatalogItemUrl";
import getStyle from "../../Models/getStyle";
import raiseErrorToUser from "../../Models/raiseErrorToUser";
import { withTranslation } from "react-i18next";
import Modal from "../Tools/Modal/Modal";
import Icon from "../Icon.jsx";
import parseCustomHtmlToReact from "../Custom/parseCustomHtmlToReact";

const SLIDE_DURATION = 300;
const geometryHelper = new GeometryHelper();
const borderRadiusStyle = { borderRadius: 2, display: "inline-flex" };

const ExportWindow = createReactClass({
  displayName: "Export",
  mixins: [ObserveModelMixin],
  propTypes: {
    terria: PropTypes.object.isRequired,
    viewState: PropTypes.object.isRequired,
    t: PropTypes.func.isRequired
  },
  /** PROBLEM*/
  getInitialState() {
    return {
      visible: false,
      catalogItem: {},
      dimensions: {},
      areaParameters: [],
      newAreaParameters: [],
      slidIn: false,
      exportStarted: false,
      isLoading: false,
      isToggleDateTurnedOn: false,
      dates: undefined,
      geometry: undefined,
      geometryName: undefined,
      showExportWarning: false
    };
  },
  close() {
    this.props.terria.setExportModalVisibility({
      visibility: false,
      catalogItem: {},
      dimensions: {},
      areaParameters: [],
      newAreaParameters: [],
      slidIn: false,
      exportStarted: false,
      isLoading: false,
      isToggleDateTurnedOn: false,
      dates: undefined,
      geometry: undefined,
      geometryName: undefined,
      showExportWarning: false
    });
    this.props.viewState.exportPanelIsVisible = false;
    this.props.viewState.switchMobileView("nowViewing");
    this.setState(this.getInitialState());
  },

  /* eslint-disable-next-line camelcase */
  UNSAFE_componentWillMount() {
    this.props.viewState.explorerPanelAnimating = true;
    this._pickedFeaturesSubscription = ko
      .pureComputed(this.isVisible, this)
      .subscribe(this.onVisibilityChange);
  },
  onGeometrySelected(selectedItem) {
    const terria = this.props.terria;

    if (selectedItem.id === "draw-tool") {
      terria.initiateDrawTool({
        visible: true,
        callbackData: this.state,
        caller: "EXPORT"
      });
      this.close();
    } else {
      const geometryData = selectedItem.data;

      if (geometryData.type === "mvt") {
        const name = selectedItem.name || geometryData?.name._value;
        const aoi = {
          ...this.state.aoi,
          id: geometryData.featuresCollectionId,
          keyColumn: geometryData.featureColumn,
          key: geometryData.value
        };

        this.setState({ aoi, geometry: selectedItem, geometryName: name });
      } else if (geometryData.type === "wms") {
        const name = geometryData.name;
        const aoi = { ...this.state.aoi };

        aoi.key = name;
        aoi.id = "FAO/GAUL_SIMPLIFIED_500m/2015/level0";
        aoi.keyColumn = "ADM0_NAME";

        this.setState({ aoi, geometry: selectedItem, geometryName: name });
      } else {
        if (typeof selectedItem.data === "string") {
          selectedItem.data = JSON.parse(selectedItem.data);
        }
        const path =
          selectedItem.data.geometry.coordinates &&
          selectedItem.data.geometry.coordinates.length &&
          selectedItem.data.geometry.coordinates[0];
        const aoi = { path: path, type: "POLYGON" };

        this.setState({
          aoi,
          geometry: selectedItem,
          geometryName: selectedItem.name
        });
      }
    }
  },
  async componentDidMount() {
    this.props.terria.setExportModalVisibility = knockout.observable(
      "exportModalVisibility"
    );

    this._visibilitySubscription = this.props.terria.setExportModalVisibility.subscribe(
      data => {
        if (data) {
          this.onVisibilityChange(data);
        }
      }
    );
  },
  async onToggleDate(isTurnedOn) {
    if (!isTurnedOn) {
      this.setState({
        isToggleDateTurnedOn: true,
        isLoading: true
      });

      try {
        const response = await axios.post(
          "https://api.data.apps.fao.org/api/v2/map/gee_metadata",
          {
            asset_id: this.state.catalogItem.linkedWcsCoverage,
            asset_type: "IMAGE_COLLECTION"
          }
        );
        this.setState({
          isToggleDateTurnedOn: true,
          isLoading: false,
          dates: {
            startDate: moment(response.data.startDate),
            endDate: moment(response.data.endDate)
          }
        });
      } catch (error) {
        this.notifyUser(
          "Error",
          "An error occured while fetching parameters. Please try again or contact support."
        );
        this.setState({
          isToggleDateTurnedOn: false,
          isLoading: false,
          dates: {
            startDate: undefined,
            endDate: undefined
          }
        });
      }
    } else {
      this.setState({
        isToggleDateTurnedOn: false,
        isLoading: false,
        dates: {
          startDate: undefined,
          endDate: undefined
        }
      });
    }
  },
  async onVisibilityChange(data) {
    this.props.viewState.explorerPanelAnimating = data
      ? data.visibility
      : false;

    let areaParameters;

    try {
      areaParameters = geometryHelper.getGeometriesExcept(
        this.props.terria,
        this.state.catalogItem.name
      );
    } catch (e) {
      this.notifyUser(
        "Unsupported Feature Selected",
        "The selected feature is not yet supported, please select a different feature and try again."
      );
      return;
    }

    if (data) {
      const newAreaParameters = data.newAreaParameters || [];

      if (newAreaParameters.length > 0) {
        const catalogItem = newAreaParameters[0];
        this.onGeometrySelected({
          name: catalogItem.name,
          id: catalogItem.type,
          data: catalogItem.data
        });
      }

      const dimensions = {};

      this.setState({
        visible: data.visibility,
        catalogItem: data.catalogItem,
        dimensions: dimensions,
        areaParameters: areaParameters,
        newAreaParameters: newAreaParameters
      });
    }
    this.props.viewState.featureInfoPanelIsVisible = !(data && data.visibility);
  },
  componentWillUnmount() {},
  isVisible() {
    return (
      !this.props.viewState.useSmallScreenInterface &&
      !this.props.viewState.hideMapUi() &&
      this.props.viewState.exportPanelIsVisible
    );
  },
  async onExport() {
    const { catalogItem, geometry, geometryName } = this.state;
    try {
      var uri = undefined;
      var coverage = undefined;

      if (defined(this.props.terria.configParameters.exportServiceUrl)) {
        uri = new URI(this.props.terria.configParameters.exportServiceUrl);
      } else if (defined(catalogItem.linkedWcsUrl)) {
        uri = new URI(catalogItem.linkedWcsUrl);
      }

      if (
        defined(catalogItem.customProperties) &&
        defined(catalogItem.customProperties.allowExport)
      ) {
        coverage = catalogItem.customProperties.allowExport.coverage;
      } else if (defined(catalogItem.linkedWcsCoverage)) {
        coverage = catalogItem.linkedWcsCoverage;
      }

      const body = {
        service: "WCS",
        request: "GetCoverage",
        version: "1.0.0",
        format: "GeoTIFF",
        crs: "EPSG:4326",
        coverage: coverage,
        geometry: geometry,
        geometryName: geometryName
      };

      if (defined(catalogItem.discreteTime)) {
        body.time = catalogItem.discreteTime.toISOString();
        // body.dateRange = {
        //   startDate: catalogItem.discreteTime.toISOString(),
        //   endDate: catalogItem.discreteTime.toISOString()
        // }

        // if (
        //   this.state.isToggleDateTurnedOn &&
        //   this.state.dates.startDate != undefined &&
        //   this.state.dates.endDate != undefined &&
        //   catalogItem.availableDates.length > 1
        // ) {
        //   body.time =
        //     this.state.dates.startDate.toISOString() +
        //     "/" +
        //     this.state.dates.endDate.toISOString();
        // }
      }

      if (catalogItem.getNonTimeDimensions() != undefined) {
        body.filters = catalogItem.getNonTimeDimensions();
      }

      const style = getStyle(catalogItem);

      if (defined(style)) {
        body.styles = style;
      }

      const that = this;
      this.setState({ exportStarted: true, showExportWarning: true });
      var url = proxyCatalogItemUrl(catalogItem, uri.toString(), "1d");
      axios
        .post(url, body)
        .then(response => response.data)
        .then(data => {
          const link = document.createElement("a");
          link.href = data;
          link.download = "filename";
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          this.setState({ exportStarted: false, showExportWarning: false });
          this.close();
        })
        .catch(function(error) {
          that.setState({ exportStarted: false, showExportWarning: false });
          that.close();
          if (defined(error.response) && defined(error.response.data)) {
            raiseErrorToUser(that.props.terria, error.response.data);
          } else if (defined(error.message)) {
            raiseErrorToUser(that.props.terria, error.response.data);
          } else {
            raiseErrorToUser(that.props.terria, error);
          }
        });
    } catch (error) {}
  },
  onOpticalDateSelected(e, from, to) {
    const dates = { startDate: from, endDate: to };
    this.setState({ dates });
  },
  render() {
    let { t } = this.props;

    if (!t) t = a => a;

    const { visible, catalogItem } = this.state;

    const drawNewArea = { id: "draw-tool", name: "New Area" };

    const geometries = [
      ...this.state.areaParameters,
      ...(this.state.newAreaParameters || []),
      drawNewArea
    ];

    const footer = (
      <button
        disabled={
          this.state.exportStarted ||
          !this.state.catalogItem ||
          !this.state.geometry
        }
        onClick={this.onExport}
        className={Styles.startExportButton}
      >
        <If condition={this.state.exportStarted}>
          <Loader message={"Exporting ..."} className={Styles.startingExport} />
        </If>
        <If condition={!this.state.exportStarted}>
          {t("exportWindow.export")}
        </If>
      </button>
    );

    return (
      <Modal
        visible={visible}
        close={this.close}
        t={t}
        icon={<Icon glyph={Icon.GLYPHS.export} />}
        title={
          t("exportWindow.title") +
          (catalogItem ? ` - ${catalogItem.name} - ` : "")
        }
        viewState={this.props.viewState}
        footer={footer}
      >
        <div className={Styles.parameterInputs}>
          <Dropdown
            options={geometries}
            selected={this.state.geometry}
            selectOption={this.onGeometrySelected}
            theme={{
              dropdown: Styles.dropdown,
              list: Styles.dropdownList,
              button: Styles.dropdownButton
            }}
            buttonClassName={Styles.btn}
          >
            {t("exportWindow.selectArea")}
          </Dropdown>

          <If condition={this.state.showExportWarning}>
            <div className={Styles.exportWarning}>
              <span>&#42;</span>
              {t("exportWindow.exportWarning")}
            </div>
          </If>

          <If
            condition={this.props.terria.configParameters.additionalResources}
          >
            <div className={Styles.additionalResourcesContainer}>
              <Icon
                glyph={Icon.GLYPHS.bulb}
                className={Styles.additionalResourcesIcon}
              />
              <span className={Styles.additionalResourcesText}>
                {parseCustomHtmlToReact(
                  this.props.terria.configParameters.additionalResources
                )}
              </span>
            </div>
          </If>
        </div>
      </Modal>
    );
  }
});

module.exports = withTranslation()(ExportWindow);
