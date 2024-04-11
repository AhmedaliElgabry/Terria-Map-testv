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
import Styles from "./analysis-window.scss";
import Icon from "../Icon.jsx";
import CesiumMath from "terriajs-cesium/Source/Core/Math";
import Ellipsoid from "terriajs-cesium/Source/Core/Ellipsoid";
import { LOCATION_MARKER_DATA_SOURCE_NAME } from "../../Models/LocationMarkerUtils";
import axios from "axios";
import moment from "moment";
import TableStyle from "../../Models/TableStyle";
import CsvCatalogItem from "../../Models/CsvCatalogItem";
import defaultValue from "terriajs-cesium/Source/Core/defaultValue";
import "@babel/polyfill";
import "./analysis-window.scss";
import Loader from "../Loader.jsx";
import { SepalMosaicDatePicker } from "../SepalWindow/SepalMosaicDatePicker";
import GeometryHelper from "../../Utilities/GeometryHelper";
import Modal from "../Tools/Modal/Modal";
import parseCustomHtmlToReact from "../Custom/parseCustomHtmlToReact";

const AnalysisWindow = createReactClass({
  displayName: "Analysis",
  mixins: [ObserveModelMixin],
  propTypes: {
    terria: PropTypes.object.isRequired,
    viewState: PropTypes.object.isRequired,
    t: PropTypes.func
  },
  /** PROBLEM*/
  getInitialState() {
    return {
      visible: false,
      catalogItem: {},
      areaParameters: [], // May be we can merge newAreaParameters with area parameters
      newAreaParameters: [],
      analysisTypes: [],
      fetchingParameters: false,
      analysisStarted: false,
      dates: { startDate: undefined, endDate: undefined },
      categorical: {}
    };
  },
  close() {
    this.props.terria.setAnalysisModalVisibility({
      visibility: false,
      catalogItem: {},
      selectedType: null,
      analysisTypes: [],
      analysisStarted: false,
      fetchingParameters: false,
      areaParameters: [],
      newAreaParameters: [],
      dates: { startDate: undefined, endDate: undefined },
      categorical: {}
    });
    this.props.viewState.analysisPanelIsVisible = false;
    this.props.viewState.switchMobileView(null);
  },

  /* eslint-disable-next-line camelcase */
  UNSAFE_componentWillMount() {
    this._pickedFeaturesSubscription = ko
      .pureComputed(this.isVisible, this)
      .subscribe(this.onVisibilityChange);
  },
  getPosition() {
    const terria = this.props.terria;
    let position;
    if (
      defined(terria.selectedFeature) &&
      defined(terria.selectedFeature.position)
    ) {
      // If the clock is avaliable then use it, otherwise don't.
      let clock;
      if (defined(terria.clock)) {
        clock = terria.clock.currentTime;
      }

      // If there is a selected feature then use the feature location.
      position = terria.selectedFeature.position.getValue(clock);

      // If position is invalid then don't use it.
      // This seems to be fixing the symptom rather then the cause, but don't know what is the true cause this ATM.
      if (isNaN(position.x) || isNaN(position.y) || isNaN(position.z)) {
        position = undefined;
      }
    }

    if (
      !defined(position) &&
      defined(terria.pickedFeatures) &&
      defined(terria.pickedFeatures.pickPosition)
    ) {
      position = terria.pickedFeatures.pickPosition;
    }

    return position
      ? this.cartesianToLatLang(position)
      : { latitude: 0, longitude: 0 };
  },
  componentDidMount() {
    this.props.terria.setAnalysisModalVisibility = knockout.observable(
      "analysisModalVisibility"
    );

    this._visibilitySubscription = this.props.terria.setAnalysisModalVisibility.subscribe(
      data => {
        if (data) {
          this.onVisibilityChange(data);
        }
      }
    );
  },

  onVisibilityChange(data) {
    const pointString = this.getSelectedPointAsString();

    const takeCurrentPoint = {
      id: "take-current-point",
      name: `${pointString}`
    };

    const geometryHelper = new GeometryHelper();
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
      const defaultAnalysisType = data.analysisTypes.find(a => a.default);
      const setGeometryDefault =
        defaultAnalysisType && defaultAnalysisType.acceptsPoint;
      if (setGeometryDefault) {
        this.onParameterSelect(takeCurrentPoint);
      }
      this.setState({
        areaParameters,
        visible: data.visibility,
        selectedItem: setGeometryDefault ? takeCurrentPoint : null,
        analysisStarted: false,
        newAreaParameters: data.newAreaParameters || [],
        currentPoint: takeCurrentPoint,
        selectedType: data.selectedType || defaultAnalysisType,
        catalogItem: data.catalogItem,
        analysisTypes: data.analysisTypes
      });
    }

    this.props.viewState.featureInfoPanelIsVisible = !(data && data.visibility);
  },

  notifyUser(title, message) {
    this.props.viewState.notifications.push({
      title: title,
      message: message,
      width: 300
    });
  },

  componentWillUnmount() {},
  cartesianToLatLang(cartesianPosition) {
    const catographic = Ellipsoid.WGS84.cartesianToCartographic(
      cartesianPosition
    );

    const latitude = CesiumMath.toDegrees(catographic.latitude);
    const longitude = CesiumMath.toDegrees(catographic.longitude);

    return { longitude, latitude };
  },
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
      this.props.viewState.analysisPanelIsVisible
    );
  },
  onParameterSelect(selectedItem) {
    const terria = this.props.terria;
    if (selectedItem.id === "draw-tool") {
      terria.initiateDrawTool({ visible: true, callbackData: this.state });
      this.close();
    } else if (selectedItem.id === "take-current-point") {
      if (this.state.analysisType === "SelectType") {
        console.warn("Analysis type not selected");
        return;
      }
      const position = this.getPosition();
      const geometry = {
        type: "Feature",
        properties: {},
        geometry: {
          type: "Point",
          coordinates: [position.longitude, position.latitude]
        }
      };
      const payload = {
        ...this.state.payload,
        geometry: geometry,
        geometryName: selectedItem.name
      };
      this.setState({ payload, selectedItem: selectedItem });
    } else if (selectedItem?.data?.key === "mvt-ogr") {
      const name = selectedItem?.data.name || selectedItem?.data.name._value;
      const aoi = { ...this.state.aoi };

      aoi.name = name;
      aoi["key"] = selectedItem?.data.key;
      aoi.id = selectedItem?.data.properties?.id;
      aoi.type = "Polygon";

      this.setState({ aoi, geometry: selectedItem?.data, geometryName: name });
    } else {
      if (this.state.analysisType === "SelectType") {
        console.warn("Analysis type not selected");
        return;
      }

      const payload = {
        ...this.state.payload,
        geometry: selectedItem.data,
        geometryName: selectedItem.name
      };

      this.setState({ payload, selectedItem: selectedItem });
    }
  },
  /** PROBLEM */
  async onAnalysisTypeSelected(selectedType) {
    this.setState({
      selectedType: selectedType,
      analysisStarted: false
    });
    const that = this;

    if (selectedType && selectedType.acceptsDates) {
      try {
        const layer =
          this.state.catalogItem.layer || this.state.catalogItem.layers;
        const dimensions = this.state.catalogItem.availableDimensions[layer];
        const time_dimension = dimensions.find(
          a => a.name.toLowerCase() == "time"
        );
        this.setState({ fetchingParameters: true });
        if (time_dimension) {
          const { options } = time_dimension;
          let start_time;
          let end_time;

          if (options.length == 1) {
            const range = options[0];
            const exploded = range.split("/");
            start_time = exploded[0];
            end_time = exploded[1];
          } else {
            start_time = options[0];
            end_time = options[options.length - 1];
          }
          this.setState({
            fetchingParameters: false,
            dates: {
              startDate: moment(start_time),
              endDate: moment(end_time)
            }
          });
        }
      } catch (error) {
        that.notifyUser("Error", "Could not fetch parameters!");
      }
    }

    if (selectedType && selectedType.categorical) {
      try {
        this.setState({
          categorical: {
            categorical: true,
            styles: selectedType.styles
          }
        });
      } catch (error) {
        that.notifyUser(
          "Error",
          "An error occured while setting style. Please try again or contact support."
        );
      }
    }
  },
  /** PROBLEM */
  onStartAnalysis() {
    const { selectedType, payload, catalogItem } = this.state;

    const finalPayload = {
      collectionId: selectedType.collectionId,
      regex: selectedType.regex,
      ...(selectedType.acceptsDates && {
        dateRange: {
          startDate: this.state.dates.startDate.format("YYYY-MM-DD"),
          endDate: this.state.dates.endDate.format("YYYY-MM-DD")
        }
      }),
      ...(["wms", "wmts"].includes(catalogItem.type) &&
        catalogItem.getNonTimeDimensions() != undefined && {
          filters: catalogItem.getNonTimeDimensions()
        }), // NEED TO CHANGE THIS TO ON ANALYSIS TYPE SELECTED
      ...(selectedType.categorical && this.state.categorical), // NEED TO CHANGE THIS TO ON ANALYSIS TYPE SELECTED
      ...payload
    };

    this.setState({ analysisStarted: true });
    const tableStyle = makeTableStyle({});
    const itemName = selectedType.isGrouping
      ? catalogItem.name + " - " + selectedType.name
      : catalogItem.name +
        " - " +
        selectedType.name +
        " - " +
        payload.geometryName;
    const existingItem = this.props.terria.nowViewing.items.find(
      item => item.type === "csv" && item.name === itemName
    );
    const data = {
      type: "analysis",
      params: {
        analysisType: selectedType,
        payload: finalPayload,
        catalogItemName: catalogItem.name
      }
    };

    if (existingItem && selectedType.isGrouping) {
      existingItem.isEnabled = false;
      existingItem.data = data;
      existingItem.isEnabled = true;
      this.close();
      return existingItem;
    } else {
      if (
        this.props.terria.nowViewing.items.find(item => item.name === itemName)
      ) {
        this.close();
        return;
      }
      const newCatalogItem = new CsvCatalogItem(this.props.terria, undefined, {
        tableStyle: tableStyle,
        isCsvForCharting: true,
        isLoading: true,
        customProperties: {}
      });
      newCatalogItem.name = itemName;
      newCatalogItem.isLoading = true;
      newCatalogItem.isEnabled = true;
      newCatalogItem.data = data;
      this.close();
      return newCatalogItem;
    }
  },
  getSelectedPointAsString() {
    const currentPoint = this.getPosition();
    const pointString =
      `${Math.abs(currentPoint.latitude).toFixed(2)}°` +
      (currentPoint.latitude >= 0 ? `N` : `S`) +
      `, ${Math.abs(currentPoint.longitude).toFixed(2)}°` +
      (currentPoint.longitude >= 0 ? `E` : `W`);
    return pointString;
  },
  onOpticalDateSelected(e, from, to) {
    const dates = { startDate: from, endDate: to };
    this.setState({ dates });
  },
  render() {
    let { t } = this.props;
    const { visible, selectedType, analysisTypes, catalogItem } = this.state;

    if (!t) t = a => a;

    const takeCurrentPoint = this.state.currentPoint;

    const drawNewArea = { id: "draw-tool", name: "New Area" };

    const relatedCatalogItems = [
      ...this.state.areaParameters,
      ...(this.state.newAreaParameters || [])
    ];

    let analysisParameters = [];

    if (selectedType) {
      if (selectedType.acceptsPoint) {
        analysisParameters.unshift(takeCurrentPoint);
      }

      if (selectedType.acceptsArea) {
        analysisParameters.push(...relatedCatalogItems, drawNewArea);
      }
      analysisParameters = analysisParameters.filter((obj, pos, arr) => {
        return arr.map(mapObj => mapObj.name).indexOf(obj.name) === pos;
      });
    }
    const parameterInputs = [];
    if (selectedType && selectedType.acceptsDates) {
      parameterInputs.push(
        <SepalMosaicDatePicker
          onDatePicked={this.onOpticalDateSelected}
          showExpandCollapse={false}
          showSeasonsSelector={false}
          showRangeOnly={true}
          from={this.state.dates.startDate}
          to={this.state.dates.endDate}
        />
      );
    }

    const icon = (
      <span className={Styles.iconDownload}>
        <Icon glyph={Icon.GLYPHS.opened} />
      </span>
    );

    const footer = (
      <button
        disabled={
          this.state.analysisStarted ||
          !this.state.selectedType ||
          !this.state.payload ||
          !this.state.selectedItem
        }
        onClick={this.onStartAnalysis}
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
        icon={<Icon glyph={Icon.GLYPHS.lineChart} />}
        title={`Analysis${catalogItem ? " - " + catalogItem.name : ""}`}
        viewState={this.props.viewState}
        footer={footer}
      >
        <div className={Styles.inputsContainer}>
          <legend className={Styles.analysisLegend}>
            Analysis Type <span className={Styles.required}>*</span>
          </legend>
          <Dropdown
            options={analysisTypes}
            selected={this.state.selectedType}
            theme={{
              dropdown: Styles.download,
              list: Styles.dropdownList,
              button: Styles.dropdownButton,
              icon: icon
            }}
            selectOption={this.onAnalysisTypeSelected}
            buttonClassName={Styles.btn}
          >
            Select Analysis Type
          </Dropdown>
          <br />
          <If condition={this.state.fetchingParameters}>
            <Loader
              className={Styles.fetchingParameters}
              message={"Fetching Parameters"}
            />
          </If>
          <If
            condition={
              !this.state.fetchingParameters &&
              this.state.selectedType &&
              this.state.selectedType.name
            }
          >
            <fieldset className={Styles.parameterInputs}>
              <legend>
                Parameters <span className={Styles.required}>*</span>
              </legend>
              <Dropdown
                options={analysisParameters}
                selected={this.state.selectedItem}
                disabled={this.state.analysisType === "SelectType"}
                selectOption={this.onParameterSelect}
                theme={{
                  dropdown: Styles.download,
                  list: Styles.dropdownList,
                  button: Styles.dropdownButton,
                  icon: icon
                }}
                buttonClassName={Styles.btn}
              >
                Select Area
              </Dropdown>
              <br />
              <If condition={parameterInputs.length}>
                <For each="item" of={parameterInputs}>
                  {item}
                  <br />
                </For>
              </If>
            </fieldset>
            <br />
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

    /* return visible ? (
      <div
        className={classNames(Styles.modalWrapper, "top-element")}
        id="explorer-panel-wrapper"
        aria-hidden={!visible}
      >
        <div
          onClick={this.close}
          id="modal-overlay"
          className={Styles.modalOverlay}
          tabIndex="-1"
        />
        <div
          id="analysis-panel"
          className={classNames(Styles.explorerPanel, Styles.modalContent, {
            [Styles.isMounted]: this.state.slidIn
          })}
          aria-labelledby="modalTitle"
          aria-describedby="modalDescription"
          role="dialog"
        >
          <button
            type="button"
            onClick={this.close}
            className={Styles.btnCloseModal}
            title={t("Close")}
            data-target="close-modal"
          >
            x
          </button>


        </div>
      </div>
    ) : null; */
  }
});

module.exports = AnalysisWindow;

/**
 * Returns an object of {catalogItems, featureCatalogItemPairs}.
 */
function getFeaturesGroupedByCatalogItems(props) {
  const { terria, t } = props;
  if (!defined(terria.pickedFeatures)) {
    return [];
  }
  const features = terria.pickedFeatures.features;

  const featureCatalogItemPairs = []; // Will contain objects of {feature, catalogItem}.
  const catalogItems = []; // Will contain a list of all unique catalog items.
  features.forEach(feature => {
    // Why was this here? Surely changing the feature objects is not a good side-effect?
    // if (!defined(feature.position)) {
    //     feature.position = terria.pickedFeatures.pickPosition;
    // }
    const catalogItem = determineCatalogItem(terria.nowViewing, feature, t);
    if (catalogItem !== undefined) {
      featureCatalogItemPairs.push({
        catalogItem: catalogItem,
        feature: feature
      });
    }

    if (catalogItems.indexOf(catalogItem) === -1) {
      // Note this works for undefined too.
      catalogItems.push(catalogItem);
    }
  });

  // return { catalogItems, featureCatalogItemPairs };
  return featureCatalogItemPairs || [];
}

/**
 * Figures out what the catalog item for a feature is.
 *
 * @param nowViewing {@link NowViewing} to look in the items for.
 * @param feature Feature to match
 * @returns {CatalogItem}
 */
function determineCatalogItem(nowViewing, feature, t) {
  if (!defined(nowViewing)) {
    // So that specs do not need to define a nowViewing.
    return undefined;
  }

  if (feature._catalogItem) {
    return feature._catalogItem;
  }

  // "Data sources" (eg. czml, geojson, kml, csv) have an entity collection defined on the entity
  // (and therefore the feature).
  // Then match up the data source on the feature with a now-viewing item's data source.
  //
  // Gpx, Ogr, WebFeatureServiceCatalogItem, ArcGisFeatureServerCatalogItem, WebProcessingServiceCatalogItem
  // all have a this._geoJsonItem, which we also need to check.
  let result;
  let i;
  let item;
  if (
    defined(feature.entityCollection) &&
    defined(feature.entityCollection.owner)
  ) {
    const dataSource = feature.entityCollection.owner;

    if (dataSource.name === LOCATION_MARKER_DATA_SOURCE_NAME) {
      return {
        name: t("featureInfo.locationMarker")
      };
    }

    for (i = nowViewing.items.length - 1; i >= 0; i--) {
      item = nowViewing.items[i];
      if (item.dataSource === dataSource) {
        result = item;
        break;
      }
    }
    return result;
  }

  // If there is no data source, but there is an imagery layer (eg. ArcGIS),
  // we can match up the imagery layer on the feature with a now-viewing item.
  if (defined(feature.imageryLayer)) {
    const imageryLayer = feature.imageryLayer;
    for (i = nowViewing.items.length - 1; i >= 0; i--) {
      if (nowViewing.items[i].imageryLayer === imageryLayer) {
        result = nowViewing.items[i];
        break;
      }
    }
    return result;
  }
}

function makeTableStyle(props) {
  // Set the table style so that the names and units of the columns appear immediately, not with a delay.
  const tableStyleOptions = {
    columns: {}
  };
  const maxColumnNamesAndUnits = Math.max(
    (props.columnNames || []).length,
    (props.columnUnits || []).length
  );
  for (
    let columnNumber = 0;
    columnNumber < maxColumnNamesAndUnits;
    columnNumber++
  ) {
    tableStyleOptions.columns[columnNumber] = {};
    if (defined(props.columnNames) && props.columnNames[columnNumber]) {
      tableStyleOptions.columns[columnNumber].name =
        props.columnNames[columnNumber];
    }
    if (defined(props.columnUnits) && props.columnUnits[columnNumber]) {
      tableStyleOptions.columns[columnNumber].units =
        props.columnUnits[columnNumber];
    }
  }
  // Set the active columns via tableStyle too.
  // This is a bit inconsistent with the above, since above we index with column number
  // and here we may be indexing with number or id or name.
  // But it works. (TableStyle.columns may have multiple references to the same column.)
  if (defined(props.xColumn)) {
    tableStyleOptions.xAxis = props.xColumn;
  }
  if (defined(props.yColumns)) {
    props.yColumns.forEach(nameOrIndex => {
      tableStyleOptions.columns[nameOrIndex] = defaultValue(
        tableStyleOptions.columns[nameOrIndex],
        {}
      );
      tableStyleOptions.columns[nameOrIndex].active = true;
    });
  }
  return new TableStyle(tableStyleOptions);
}
