"use strict";
import React from "react";
import createReactClass from "create-react-class";
import PropTypes from "prop-types";
import classNames from "classnames";
import ko from "terriajs-cesium/Source/ThirdParty/knockout";
import knockout from "terriajs-cesium/Source/ThirdParty/knockout";
import ObserveModelMixin from "../ObserveModelMixin";
import Dropdown from "../Generic/Dropdown";
import Icon from "../Icon.jsx";
import axios from "axios";
import moment from "moment";
import "@babel/polyfill";
import Loader from "../Loader.jsx";
import UrlTemplateCatalogItem from "../../Models/UrlTemplateCatalogItem";
import CatalogGroup from "../../Models/CatalogGroup";
import ToggleButton from "react-toggle-button";
import sepalAccount from "./sepal_account.json";
import GeometryHelper from "../../Utilities/GeometryHelper";
import Select from "react-select";
import { opticalColorBands, radarColorBands } from "./ColorBands";
import { thumbSwitchColors, bandSelectorStyles } from "./colorStyles";
import { SepalMosaicDatePicker } from "./SepalMosaicDatePicker";
import { SepalResultMetadata } from "./SepalResultMetadata";
import ReactDOMServer from "react-dom/server";
import Styles from "./sepal-window.scss";
import AccordionStyle from "../ComponentStyles/accordion.scss";
import CustomTabStyle from "../ComponentStyles/customTab.scss";
import runLater from "../../Core/runLater";
import { withTranslation } from "react-i18next";
import Modal from "../Tools/Modal/Modal";

const Rectangle = require("terriajs-cesium/Source/Core/Rectangle").default;

const proxyCatalogItemUrl = require("../../Models/proxyCatalogItemUrl");

const geometryHelper = new GeometryHelper();
const borderRadiusStyle = { borderRadius: 2, display: "inline-flex" };

const SepalWindow = createReactClass({
  displayName: "SepalWindow",
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
      areaParameters: [],
      newAreaParameters: [],
      analysisStarted: false,
      sepalAnalysisType: "MOSAIC",
      mosaicType: "Optical", // Optical OR Radar
      geometry: null,
      geometryName: null,
      dates: {
        targetDate: moment().subtract(6, "month"),
        seasonStart: moment().subtract(12, "month"),
        seasonEnd: moment(),
        yearsBefore: 0,
        yearsAfter: 0
      },
      aoi: {
        type: "EE_TABLE",
        id: "FAO/GAUL_SIMPLIFIED_500m/2015/level0",
        keyColumn: "ADM0_NAME",
        key: null // area
      },
      opticalOptions: {
        corrections: ["SR", "BRDF", "CALIBRATE"],
        sources: {
          landsat: ["LANDSAT_8"],
          sentinel: []
        },
        snowMasking: "ON",
        cloudBuffer: 0,
        cloudMasking: "MODERATE",
        compose: "MEDOID",
        colorBand: opticalColorBands[0]
      },
      radarOptions: {
        geometricCorrection: "ELLIPSOID",
        orbits: ["ASCENDING"],
        outlierRemoval: "MODERATE",
        speckleFilter: "NONE",
        colorBand: radarColorBands[0]
      }
    };
  },
  close() {
    this.props.terria.setSepalModalVisibility({
      visibility: false,
      catalogItem: {},
      selectedType: null
    });
    this.props.viewState.sepalPanelIsVisible = false;
    this.props.viewState.switchMobileView(null);
    this.resetState();
  },
  resetState() {
    this.setState(this.getInitialState());
  },
  /* eslint-disable-next-line camelcase */
  UNSAFE_componentWillMount() {
    this._pickedFeaturesSubscription = ko
      .pureComputed(this.isVisible, this)
      .subscribe(this.onVisibilityChange);
  },
  componentDidMount() {
    this.props.terria.setSepalModalVisibility.subscribe(data => {
      if (data) {
        this.onVisibilityChange(data);
      }
    });

    this.onVisibilityChange(this.props.terria.setSepalModalVisibility());
  },
  onVisibilityChange(data) {
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
      this.setState({
        areaParameters,
        visible: data.visibility,
        newAreaParameters: newAreaParameters,
        catalogItem: data.catalogItem
      });

      if (newAreaParameters.length > 0) {
        this.onGeometrySelected(newAreaParameters[0]);
      }
    }

    this.props.viewState.featureInfoPanelIsVisible = !(data && data.visibility);
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
      this.props.viewState.sepalPanelIsVisible
    );
  },
  onOpticalRadioSelected(event) {
    const { name, value } = event.target;
    const opticalOptions = this.state.opticalOptions;
    opticalOptions[name] = value;
    this.setState({
      opticalOptions
    });
  },
  onRadarRadioSelected(event) {
    const { name, value } = event.target;
    const radarOptions = this.state.radarOptions;
    radarOptions[name] = value;
    this.setState({
      radarOptions
    });
  },
  onGeometrySelected(selectedItem) {
    const terria = this.props.terria;

    if (selectedItem.id === "draw-tool") {
      terria.initiateDrawTool({
        visible: true,
        callbackData: this.state,
        caller: "SEPAL"
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
  onOpticalBandSelected(band) {
    const options = { ...this.state.opticalOptions };
    options.colorBand = {
      colors: band.colors,
      value: band.value,
      text: band.text
    };
    this.setState({ opticalOptions: options });
  },
  onRadarBandSelected(band) {
    const options = { ...this.state.radarOptions };
    options.colorBand = {
      colors: band.colors,
      value: band.value,
      text: band.text
    };
    this.setState({ radarOptions: options });
  },
  getRadarMosaicModel() {
    const fromDate = moment(this.state.dates.targetDate).subtract(1, "year");
    return {
      recipe: {
        placeholder: `Radar_mosaic_${this.state.dates.targetDate.format(
          "YYYY-MM-DD"
        )}`,
        type: "RADAR_MOSAIC",
        model: {
          dates: {
            fromDate: fromDate.format("YYYY-MM-DD"),
            toDate: this.state.dates.targetDate.format("YYYY-MM-DD")
          },
          options: {
            orbits: this.state.radarOptions.orbits,
            geometricCorrection: this.state.radarOptions.geometricCorrection,
            speckleFilter: this.state.radarOptions.speckleFilter,
            outlierRemoval: this.state.radarOptions.outlierRemoval
          },
          aoi: this.state.aoi
        }
      },
      visParams: {
        bands: this.state.radarOptions.colorBand.value,
        panSharpen: false,
        min: [-17, -25, -1],
        max: [10, 2, 1],
        gamma: [1, 1, 1],
        inverted: [false, false, false]
      }
    };
  },
  getOpticalMosaicModel() {
    return {
      recipe: {
        type: this.state.sepalAnalysisType,
        model: {
          dates: {
            targetDate: this.state.dates.targetDate.format("YYYY-MM-DD"),
            seasonStart: this.state.dates.seasonStart.format("YYYY-MM-DD"),
            seasonEnd: this.state.dates.seasonEnd.format("YYYY-MM-DD"),
            yearsBefore: this.state.dates.yearsBefore,
            yearsAfter: this.state.dates.yearsAfter
          },
          sources: {
            LANDSAT: this.state.opticalOptions.sources.landsat,
            SENTINEL_2: this.state.opticalOptions.sources.sentinel
          },
          sceneSelectionOptions: {
            type: "ALL",
            targetDateWeight: 0
          },
          compositeOptions: {
            corrections: this.state.opticalOptions.corrections,
            filters: [],
            cloudMasking: this.state.opticalOptions.cloudMasking,
            cloudBuffer: this.state.opticalOptions.cloudBuffer,
            snowMasking: this.state.opticalOptions.snowMasking,
            compose: this.state.opticalOptions.compose
          },
          scenes: {},
          aoi: this.state.aoi
        }
      },
      visParams: {
        bands: this.state.opticalOptions.colorBand.value,
        panSharpen: false,
        min: [300, 100, 0],
        max: [2500, 2500, 2300],
        gamma: [1.3, 1.3, 1.3],
        inverted: [false, false, false]
      }
    };
  },
  shouldEnableGoButton() {
    if (this.state.mosaicType === "Radar") {
      return (
        this.state.aoi &&
        (this.state.aoi.key || this.state.aoi.path) &&
        this.state.radarOptions.orbits &&
        this.state.radarOptions.orbits.length &&
        this.state.dates.targetDate &&
        this.state.radarOptions.colorBand &&
        !this.state.analysisStarted
      );
    }

    if (this.state.mosaicType === "Optical") {
      return (
        this.state.aoi &&
        (this.state.aoi.key || this.state.aoi.path) &&
        (this.state.opticalOptions.sources.landsat || []).length +
          (this.state.opticalOptions.sources.sentinel || []).length >
          0 &&
        this.state.dates.targetDate &&
        this.state.opticalOptions.colorBand &&
        !this.state.analysisStarted
      );
    }

    return false;
  },
  async startMosaicAnalysis() {
    this.setState({
      analysisStarted: true
    });

    const model =
      this.state.mosaicType === "Optical"
        ? this.getOpticalMosaicModel()
        : this.getRadarMosaicModel();

    try {
      const terria = this.props.terria;

      const proxiedUrl = proxyCatalogItemUrl(
        this.state.catalogItem,
        "https://sepal.io/api/gee/preview",
        "0d"
      );

      const requestPromise = axios.post(proxiedUrl, model, {
        auth: sepalAccount
      });

      /** awaiting requestPromise here would lead to a delay before the sepal window is closed */
      // const response = await requestPromise;

      // const result = response.data;

      const newItem = new UrlTemplateCatalogItem(terria);

      if (this.state.aoi?.type === "POLYGON") {
        newItem.rectangle = this.getBoundingBoxForPolygon(this.state.aoi.path);
      }

      requestPromise
        .then(response => {
          const result = response.data;
          newItem.url = result.urlTemplate;
          newItem.isLoading = false;
          newItem.isRefreshing = true;
          runLater(() => (newItem.isEnabled = true), 50);
        })
        .catch(err => {
          this.notifyUser(
            "Error",
            `Sepal returned an error. Please try again or contact support.`
          );
          newItem.isEnabled = false;
          newItem.isShown = false;
          const group = this.getOrCreateSepalResultGroup(this.props.terria);
          group.remove(newItem);
          console.error(err);
        });

      newItem.name = `Sepal ${this.state.mosaicType} for ${
        this.state.geometryName
      } on ${new moment(this.state.dates.targetDate).format("DD/MM/YYYY")}`;

      newItem.isMappable = true;
      newItem.zoomOnEnable = true;
      newItem.isEnabled = true;
      newItem.isShown = true;
      newItem.isLegendVisible = true;
      newItem.isChartable = false;
      newItem.opacity = 1;
      newItem.showLoadingProgressBar = true;

      newItem.customProperties = {
        sepalResult: true,
        sepalOptions: {
          mosaicType: this.state.mosaicType,
          name: newItem.name,
          geometryName: this.state.geometryName,
          dates: this.state.dates,
          radarOptions: this.state.radarOptions,
          opticalOptions: this.state.opticalOptions
        }
      };

      const sepalMetadata = (
        <SepalResultMetadata
          key="sepalResultMetadata"
          name={newItem.name}
          mosaicType={this.state.mosaicType}
          geometryName={this.state.geometryName}
          dates={this.state.dates}
          radarOptions={this.state.radarOptions}
          opticalOptions={this.state.opticalOptions}
          showDetail={true}
        />
      );

      newItem.description = ReactDOMServer.renderToStaticMarkup(sepalMetadata);
      // to do: uncomment once circular dependecy during stringify is solved
      // newItem.customProperties.sepalSettingsBucket = this.state;

      const group = this.getOrCreateSepalResultGroup(this.props.terria);
      newItem.id = group.uniqueId + "/" + newItem.name;
      group.add(newItem);

      setTimeout(() => (newItem.isLoading = true), 100);
      this.close();

      this.resetState();
    } catch (err) {
      this.notifyUser(
        "Error",
        `An error occured while running this operation. Please try again or contact support.`
      );
      console.error(err);
      this.setState({
        analysisStarted: false
      });
    }
  },
  getOrCreateSepalResultGroup(terria) {
    const groupName = "Sepal Analysis Results";

    let group = terria.catalog.userAddedDataGroup.items.find(
      a => a.name === groupName
    );

    if (!group) {
      group = new CatalogGroup(this.props.terria);

      group.name = groupName;

      terria.catalog.userAddedDataGroup.add(group);
    }
    return group;
  },
  getAreaOfInterest() {
    const drawNewArea = { id: "draw-tool", name: "New Area" };
    const geometries = [
      ...this.state.areaParameters,
      ...(this.state.newAreaParameters || []),
      drawNewArea
    ];

    const icon = (
      <span className={Styles.iconDownload}>
        <Icon glyph={Icon.GLYPHS.opened} />
      </span>
    );

    const areaOfInterest = (
      <fieldset key="areaOfInterest" className={Styles.sectionContainer}>
        <legend>
          Area Of Interest<span className={Styles.required}>*</span>
        </legend>

        <Dropdown
          options={geometries}
          selected={this.state.geometry}
          selectOption={this.onGeometrySelected}
          theme={{
            dropdown: Styles.dropdown,
            list: Styles.dropdownList,
            button: Styles.dropdownButton,
            icon: icon
          }}
          buttonClassName={Styles.btn}
        >
          Select Area
        </Dropdown>
      </fieldset>
    );

    return areaOfInterest;
  },
  getComposite() {
    return (
      <div key="composite" className={Styles.sectionContainer}>
        <fieldset className={Styles.controlGroup}>
          <legend>Corrections</legend>
          <label className={Styles.toggleLabel}>
            SR:{" "}
            <ToggleButton
              value={this.state.opticalOptions.corrections.includes("SR")}
              thumbStyle={borderRadiusStyle}
              trackStyle={borderRadiusStyle}
              colors={thumbSwitchColors}
              onToggle={value => {
                const opticalOptions = { ...this.state.opticalOptions };
                const corrections = opticalOptions.corrections;

                if (corrections.includes("SR"))
                  corrections.splice(corrections.indexOf("SR"), 1);
                else corrections.push("SR");

                this.setState({
                  opticalOptions
                });
              }}
            />
          </label>

          <label className={Styles.toggleLabel}>
            BRDF:{" "}
            <ToggleButton
              value={this.state.opticalOptions.corrections.includes("BRDF")}
              thumbStyle={borderRadiusStyle}
              trackStyle={borderRadiusStyle}
              colors={thumbSwitchColors}
              onToggle={value => {
                const opticalOptions = { ...this.state.opticalOptions };
                const corrections = opticalOptions.corrections;

                if (corrections.includes("BRDF"))
                  corrections.splice(corrections.indexOf("BRDF"), 1);
                else corrections.push("BRDF");

                this.setState({
                  opticalOptions
                });
              }}
            />
          </label>
        </fieldset>

        <fieldset className={Styles.controlGroup}>
          <legend>Snow Masking</legend>
          <label className={Styles.toggleLabel}>
            <ToggleButton
              value={this.state.opticalOptions.snowMasking === "ON"}
              thumbStyle={borderRadiusStyle}
              trackStyle={borderRadiusStyle}
              colors={thumbSwitchColors}
              onToggle={value => {
                const opticalOptions = { ...this.state.opticalOptions };
                opticalOptions.snowMasking = !value ? "ON" : "OFF";
                this.setState({
                  opticalOptions
                });
              }}
            />
          </label>
        </fieldset>

        <fieldset style={{ marginLeft: "2%" }} className={Styles.controlGroup}>
          <legend>Composing Method</legend>
          <label htmlFor="medoid">
            {" "}
            <input
              id="medoid"
              onChange={this.onOpticalRadioSelected}
              name="compose"
              defaultChecked
              value="MEDOID"
              type="radio"
            />{" "}
            Medoid
          </label>
          <label htmlFor="median">
            {" "}
            <input
              id="median"
              onChange={this.onOpticalRadioSelected}
              name="compose"
              value="MEDIAN"
              type="radio"
            />{" "}
            Median
          </label>
        </fieldset>

        <br />

        <fieldset className={Styles.controlGroup}>
          <legend>Cloud Masking</legend>
          <label>
            {" "}
            <input
              onChange={this.onOpticalRadioSelected}
              name="cloudMasking"
              value="OFF"
              type="radio"
            />{" "}
            Off
          </label>
          <label>
            {" "}
            <input
              onChange={this.onOpticalRadioSelected}
              name="cloudMasking"
              defaultChecked
              value="MODERATE"
              type="radio"
            />{" "}
            Moderate
          </label>
          <label>
            {" "}
            <input
              onChange={this.onOpticalRadioSelected}
              name="cloudMasking"
              value="AGGRESSIVE"
              type="radio"
            />{" "}
            Aggressive
          </label>
        </fieldset>

        <fieldset style={{ marginLeft: "2%" }} className={Styles.controlGroup}>
          <legend>Cloud Buffering</legend>
          <label htmlFor="cloudBufferZero">
            <input
              id="cloudBufferZero"
              onChange={this.onOpticalRadioSelected}
              name="cloudBuffer"
              defaultChecked
              value="0"
              type="radio"
            />{" "}
            None
          </label>
          <label htmlFor="cloudBuffer120">
            {" "}
            <input
              id="cloudBuffer120"
              onChange={this.onOpticalRadioSelected}
              name="cloudBuffer"
              value="120"
              type="radio"
            />{" "}
            Moderate
          </label>
          <label htmlFor="cloudBuffer600">
            {" "}
            <input
              id="cloudBuffer600"
              onChange={this.onOpticalRadioSelected}
              name="cloudBuffer"
              value="600"
              type="radio"
            />{" "}
            Aggressive
          </label>
        </fieldset>
      </div>
    );
  },
  getSources() {
    return (
      <div key="sources" className={Styles.sectionContainer}>
        <fieldset className={Styles.controlGroup}>
          <legend>Landsat</legend>
          <label className={Styles.toggleLabel}>
            L8:{" "}
            <ToggleButton
              value={this.state.opticalOptions.sources.landsat.includes(
                "LANDSAT_8"
              )}
              thumbStyle={borderRadiusStyle}
              trackStyle={borderRadiusStyle}
              colors={thumbSwitchColors}
              onToggle={value => this.selectLandsat("LANDSAT_8", value)}
            />
          </label>
          <label className={Styles.toggleLabel}>
            L7:{" "}
            <ToggleButton
              value={this.state.opticalOptions.sources.landsat.includes(
                "LANDSAT_7"
              )}
              thumbStyle={borderRadiusStyle}
              trackStyle={borderRadiusStyle}
              colors={thumbSwitchColors}
              onToggle={value => this.selectLandsat("LANDSAT_7", value)}
            />
          </label>
          &emsp;
          <label className={Styles.toggleLabel}>
            L8 T2:{" "}
            <ToggleButton
              value={this.state.opticalOptions.sources.landsat.includes(
                "LANDSAT_8_T2"
              )}
              thumbStyle={borderRadiusStyle}
              trackStyle={borderRadiusStyle}
              colors={thumbSwitchColors}
              onToggle={value => this.selectLandsat("LANDSAT_8_T2", value)}
            />
          </label>
          <label className={Styles.toggleLabel}>
            L7 T2:{" "}
            <ToggleButton
              value={this.state.opticalOptions.sources.landsat.includes(
                "LANDSAT_7_T2"
              )}
              thumbStyle={borderRadiusStyle}
              trackStyle={borderRadiusStyle}
              colors={thumbSwitchColors}
              onToggle={value => this.selectLandsat("LANDSAT_7_T2", value)}
            />
          </label>
        </fieldset>

        <fieldset className={Styles.controlGroup}>
          <legend>Sentinel 2</legend>

          <label className={Styles.toggleLabel}>
            A+B:{" "}
            <ToggleButton
              value={this.state.opticalOptions.sources.sentinel.includes(
                "SENTINEL_2"
              )}
              thumbStyle={borderRadiusStyle}
              trackStyle={borderRadiusStyle}
              colors={thumbSwitchColors}
              onToggle={value => {
                const opticalOptions = { ...this.state.opticalOptions };
                const sources = opticalOptions.sources;
                const sentinel = [...sources.sentinel];

                if (sentinel.includes("SENTINEL_2"))
                  sentinel.splice(sentinel.indexOf("SENTINEL_2"), 1);
                else sentinel.push("SENTINEL_2");

                sources.sentinel = sentinel;

                this.setState({ opticalOptions });
              }}
            />
          </label>
        </fieldset>
      </div>
    );
  },
  selectLandsat(name, value) {
    const opticalOptions = { ...this.state.opticalOptions };
    const sources = opticalOptions.sources;
    const landsat = [...sources.landsat];

    if (landsat.includes(name)) landsat.splice(landsat.indexOf(name), 1);
    else landsat.push(name);

    sources.landsat = landsat;
    this.setState({ opticalOptions });
  },
  getRadarOptions() {
    return (
      <div key="radarOptions" className={Styles.sectionContainer}>
        <fieldset className={Styles.controlGroup}>
          <legend>
            Orbits<span className={Styles.required}>*</span>
          </legend>
          <label className={Styles.toggleLabel}>
            Ascending:{" "}
            <ToggleButton
              value={this.state.radarOptions.orbits.includes("ASCENDING")}
              thumbStyle={borderRadiusStyle}
              trackStyle={borderRadiusStyle}
              colors={thumbSwitchColors}
              onToggle={value => {
                const radarOptions = { ...this.state.radarOptions };
                const orbits = radarOptions.orbits;
                if (orbits.includes("ASCENDING"))
                  orbits.splice(orbits.indexOf("ASCENDING"), 1);
                else orbits.push("ASCENDING");

                this.setState({ radarOptions });
              }}
            />
          </label>

          <label className={Styles.toggleLabel}>
            Descending:{" "}
            <ToggleButton
              value={this.state.radarOptions.orbits.includes("DESCENDING")}
              thumbStyle={borderRadiusStyle}
              trackStyle={borderRadiusStyle}
              colors={thumbSwitchColors}
              onToggle={value => {
                const radarOptions = { ...this.state.radarOptions };
                const orbits = radarOptions.orbits;

                if (orbits.includes("DESCENDING"))
                  orbits.splice(orbits.indexOf("DESCENDING"), 1);
                else orbits.push("DESCENDING");

                this.setState({ radarOptions });
              }}
            />
          </label>
        </fieldset>

        <fieldset style={{ marginLeft: "2%" }} className={Styles.controlGroup}>
          <legend>Geometric Correction</legend>
          <label htmlFor="gcNone">
            {" "}
            <input
              id="gcNone"
              onChange={this.onRadarRadioSelected}
              name="geometricCorrection"
              value="NONE"
              type="radio"
            />{" "}
            None
          </label>
          <label htmlFor="ellipsoid">
            {" "}
            <input
              id="ellipsoid"
              onChange={this.onRadarRadioSelected}
              name="geometricCorrection"
              defaultChecked
              value="ELLIPSOID"
              type="radio"
            />{" "}
            Ellipsoid
          </label>

          <label htmlFor="terrain">
            {" "}
            <input
              id="terrain"
              onChange={this.onRadarRadioSelected}
              name="geometricCorrection"
              value="TERRAIN"
              type="radio"
            />{" "}
            Terrain
          </label>
        </fieldset>

        <br />

        <fieldset className={Styles.controlGroup}>
          <legend>Speckle Filter</legend>
          <label>
            {" "}
            <input
              onChange={this.onRadarRadioSelected}
              name="speckleFilter"
              defaultChecked
              value="NONE"
              type="radio"
            />{" "}
            None
          </label>
          <label>
            {" "}
            <input
              onChange={this.onRadarRadioSelected}
              name="speckleFilter"
              value="QUEGAN"
              type="radio"
            />{" "}
            Quegan
          </label>
          <label>
            {" "}
            <input
              onChange={this.onRadarRadioSelected}
              name="speckleFilter"
              value="SNIC"
              type="radio"
            />{" "}
            SNIC
          </label>
          <label>
            {" "}
            <input
              onChange={this.onRadarRadioSelected}
              name="speckleFilter"
              value="REFINED_LEE"
              type="radio"
            />{" "}
            Refined LEE
          </label>
        </fieldset>

        <fieldset className={Styles.controlGroup}>
          <legend>Outlier Removal</legend>
          <label htmlFor="orNone">
            <input
              id="orNone"
              onChange={this.onRadarRadioSelected}
              name="outlierRemoval"
              value="NONE"
              type="radio"
            />{" "}
            None
          </label>
          <label htmlFor="orModerate">
            {" "}
            <input
              id="orModerate"
              defaultChecked
              onChange={this.onRadarRadioSelected}
              name="outlierRemoval"
              value="MODERATE"
              type="radio"
            />{" "}
            Moderate
          </label>
          <label htmlFor="orAggressive">
            {" "}
            <input
              id="orAggressive"
              onChange={this.onRadarRadioSelected}
              name="outlierRemoval"
              value="AGGRESSIVE"
              type="radio"
            />{" "}
            Aggressive
          </label>
        </fieldset>
      </div>
    );
  },
  capitalize(text) {
    return text.charAt(0).toUpperCase() + text.slice(1);
  },
  getColorBandLabel(band) {
    const size = 15;
    const { value, text, colors } = band;
    const that = this;
    return (
      <span>
        {value.map((val, index) => {
          return (
            <span
              key={val + text}
              className={Styles.colorBandItem}
              style={{
                height: { size } + "px",
                backgroundColor: colors[index]
              }}
            >
              {(text && text[index]) || that.capitalize(val)}
            </span>
          );
        })}
      </span>
    );
  },
  getOpticalColorBands() {
    const that = this;
    const options = opticalColorBands.map(band => ({
      value: band.value,
      text: band.text,
      colors: band.colors,
      label: <span>{that.getColorBandLabel(band)}</span>
    }));

    return (
      <div className={Styles.sectionContainer}>
        <Select
          menuPlacement="auto"
          defaultMenuIsOpen={false}
          defaultValue={options[0]}
          isClearable={false}
          onChange={this.onOpticalBandSelected}
          className={Styles.dropdown}
          options={options}
          styles={bandSelectorStyles}
        />
      </div>
    );
  },
  getBoundingBoxForPolygon(polygons) {
    if (!Array.isArray(polygons))
      throw new Error("Polygon not provided", polygons);

    const minX = Math.min(...polygons.map(a => a[0]));
    const minY = Math.min(...polygons.map(a => a[1]));
    const maxX = Math.max(...polygons.map(a => a[0]));
    const maxY = Math.max(...polygons.map(a => a[1]));

    // return [minX, minY, maxX, maxY];
    return Rectangle.fromDegrees(minX, minY, maxX, maxY);
  },
  getRadarColorBands() {
    const that = this;

    const options = radarColorBands.map(band => ({
      value: band.value,
      text: band.text,
      colors: band.colors,
      label: <span>{that.getColorBandLabel(band)}</span>
    }));

    return (
      <div className={Styles.sectionContainer}>
        <Select
          defaultMenuIsOpen={false}
          defaultValue={options[0]}
          isClearable={false}
          onChange={this.onRadarBandSelected}
          className={Styles.dropdown}
          options={options}
          styles={{ ...bandSelectorStyles }}
        />
      </div>
    );
  },
  onOpticalDateSelected(e, from, to, pastSeasons, futureSeasons) {
    const selectedDate = e;
    const seasonStart = from || moment(e).subtract(3, "month");
    const seasonEnd = to || moment(e).add(3, "month");

    pastSeasons = pastSeasons || 0;
    futureSeasons = futureSeasons || 0;

    const dates = { ...this.state.dates };

    dates.targetDate = selectedDate;
    dates.seasonStart = seasonStart;
    dates.seasonEnd = seasonEnd;
    dates.yearsBefore = pastSeasons;
    dates.yearsAfter = futureSeasons;

    this.setState({ dates });
  },
  render() {
    let { t } = this.props;
    const { visible } = this.state;

    const areaOfInterest = this.getAreaOfInterest();

    const radarOptions = this.getRadarOptions();

    const opticalDate = (
      <SepalMosaicDatePicker
        onDatePicked={this.onOpticalDateSelected}
        parentContainer="opticalAccordion"
        showExpandCollapse={true}
        showSeasonsSelector={true}
      />
    );

    const radarDate = (
      <SepalMosaicDatePicker
        onDatePicked={this.onOpticalDateSelected}
        showExpandCollapse={true}
        parentContainer="radarAccordion"
      />
    );

    const source = this.getSources();

    const composite = this.getComposite();

    const opticalBandSelector = this.getOpticalColorBands();
    const radarBandSelector = this.getRadarColorBands();

    const sourceIcon = (
      <span className={Styles.iconAccordion}>
        <Icon glyph={Icon.GLYPHS.sepalLight} />
      </span>
    );

    const optionsIcon = (
      <span className={Styles.iconAccordion}>
        <Icon glyph={Icon.GLYPHS.settings} />
      </span>
    );

    const bandsIcon = (
      <span className={Styles.iconAccordion}>
        <Icon glyph={Icon.GLYPHS.eye} />
      </span>
    );

    const calendarIcon = (
      <span className={Styles.iconAccordion}>
        <Icon glyph={Icon.GLYPHS.calendar} />
      </span>
    );

    const footer = (
      <button
        onClick={this.startMosaicAnalysis}
        disabled={!this.shouldEnableGoButton()}
        className={Styles.startAnalysisButton}
      >
        <If condition={this.state.analysisStarted}>
          <Loader className={Styles.startingAnalysis} />
        </If>
        <If condition={!this.state.analysisStarted}>GO</If>
      </button>
    );

    return (
      <Modal
        visible={visible}
        close={this.close}
        t={t}
        title="Sepal"
        icon={<Icon glyph={Icon.GLYPHS.sepal} />}
        viewState={this.props.viewState}
        footer={footer}
      >
        <div>
          <div className={CustomTabStyle.tabset}>
            <input
              type="radio"
              name="sepalTabset"
              onChange={() => this.setState({ mosaicType: "Optical" })}
              id="sepalOpticalTab"
              aria-controls="opticalTab"
              defaultChecked
            />
            <label htmlFor="sepalOpticalTab">
              <Icon glyph={Icon.GLYPHS.camera} /> Optical
            </label>
            <input
              type="radio"
              name="sepalTabset"
              onChange={() => this.setState({ mosaicType: "Radar" })}
              id="sepalRadarTab"
              aria-controls="radarTab"
            />
            <label htmlFor="sepalRadarTab">
              <Icon glyph={Icon.GLYPHS.radar} /> Radar
            </label>

            <a
              style={{ float: "right" }}
              href="https://sepal.io"
              target="__blank"
            >
              <img
                style={{ height: "30px", marginTop: "-2px" }}
                src="https://storage.googleapis.com/810c63d8-3fde-4ecd-9882-14d62e3058be/static/images/sepal/sepal_logo.png"
              />
              {/* <h3>Launch SEPAL.IO</h3> */}
            </a>
          </div>

          <If condition={this.state.mosaicType === "Optical"}>
            {areaOfInterest}

            <div id="opticalAccordion" className={AccordionStyle.accordion}>
              <input
                key={0}
                type="radio"
                name="select"
                className={AccordionStyle.accordionSelect}
              />
              <div className={AccordionStyle.accordionTitle}>
                <span>{calendarIcon} Date</span>
              </div>
              <div
                style={{ overflow: "unset" }}
                className={AccordionStyle.accordionContentLarge}
              >
                {opticalDate}
              </div>

              <input
                key={1}
                type="radio"
                name="select"
                className={AccordionStyle.accordionSelect}
              />
              <div className={AccordionStyle.accordionTitle}>
                <span>{sourceIcon} Sources</span>
              </div>
              <div className={AccordionStyle.accordionContentSmall}>
                {source}
              </div>
              <input
                key={2}
                type="radio"
                name="select"
                className={AccordionStyle.accordionSelect}
              />
              <div className={AccordionStyle.accordionTitle}>
                <span>{optionsIcon} Composite</span>
              </div>
              <div className={AccordionStyle.accordionContent}>{composite}</div>
              <input
                key={3}
                type="radio"
                name="select"
                className={AccordionStyle.accordionSelect}
              />
              <div className={AccordionStyle.accordionTitle}>
                <span>{bandsIcon} Color Bands</span>
              </div>
              <div className={AccordionStyle.accordionContentLarge}>
                {opticalBandSelector}
              </div>
            </div>
          </If>

          <If condition={this.state.mosaicType === "Radar"}>
            {areaOfInterest}
            <div id="radarAccordion" className={AccordionStyle.accordion}>
              <input
                key={0}
                type="radio"
                name="select"
                className={AccordionStyle.accordionSelect}
              />
              <div className={AccordionStyle.accordionTitle}>
                <span>{calendarIcon} Date</span>
              </div>
              <div
                style={{ overflow: "unset" }}
                className={AccordionStyle.accordionContentLarge}
              >
                {radarDate}
              </div>
              <input
                key={1}
                type="radio"
                name="select"
                className={AccordionStyle.accordionSelect}
              />
              <div className={AccordionStyle.accordionTitle}>
                <span>{optionsIcon} Options</span>
              </div>
              <div className={AccordionStyle.accordionContent}>
                {radarOptions}
              </div>
              <input
                key={2}
                type="radio"
                name="select"
                className={AccordionStyle.accordionSelect}
              />
              <div className={AccordionStyle.accordionTitle}>
                <span>{bandsIcon} Bands</span>
              </div>
              <div className={AccordionStyle.accordionContentLarge}>
                {radarBandSelector}
              </div>
            </div>
          </If>
        </div>
      </Modal>
    );
  }
});

module.exports = withTranslation()(SepalWindow);
