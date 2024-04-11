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
import "@babel/polyfill";
import Loader from "../Loader.jsx";
import LoaderStyles from "../loader.scss";
import GeometryHelper from "../../Utilities/GeometryHelper";
import Select from "react-select";
import Styles from "./crtb-window.scss";
import AccordionStyle from "../ComponentStyles/accordion.scss";
import CrtbTabHeaders from "./CrtbTabHeaders";
import CsvCatalogItem from "../../Models/CsvCatalogItem";
import TableStyle from "../../Models/TableStyle";
import defined from "terriajs-cesium/Source/Core/defined";
import defaultValue from "terriajs-cesium/Source/Core/defaultValue";
import Form from "@rjsf/core";
import TableStructure from "../../Map/TableStructure";
import CustomRadioWidget from "./CustomRadioWidget";
import CustomAnswerWidget from "./CustomAnswerWidget";
import { withTranslation } from "react-i18next";
import {
  forms,
  timescaleOptions,
  agriculturalSystems,
  rcpOptions,
  analysisIds,
  formNames
} from "./commonOptions";
import { colorStyles, getUiSchema, getFormSchema, isObject } from "./helpers";
import { buildShortShareLink } from "../Map/Panels/SharePanel/BuildShareLink";
import loadJson from "../../Core/loadJson";
import PrintingService from "../../Printing/PrintingService";
import CrtbPrintingDataService from "../../Printing/CrtbPrintingDataService";
import html2canvas from "terriajs-html2canvas";
import Mustache from "mustache";
import Modal from "../Tools/Modal/Modal";
import { ModalSizes } from "../Tools/Modal/ModalSizes";
import ActionManager from "../../ActionManager/ActionManager";
import TerriaAction from "../../ActionManager/TerriaAction";

const geometryHelper = new GeometryHelper();

const SSPMapping = {
  "rcp_2.6": { label: "SSP1-2.6", value: "rcp_2.6" },
  "rcp_8.5": { label: "SSP5-8.5", value: "rcp_8.5" }
};

const CrtbWindow = createReactClass({
  displayName: "CrtbWindow",
  mixins: [ObserveModelMixin],
  propTypes: {
    terria: PropTypes.object.isRequired,
    viewState: PropTypes.object.isRequired,
    t: PropTypes.func
  },

  getInitialState() {
    return {
      visible: false,
      currentForm: "aoi",
      catalogItem: {},
      areaParameters: [],
      newAreaParameters: [],
      analysisStarted: false,
      geometry: null,
      geometryName: null,
      agriculturalSystem: null,
      rcp: {
        hazard: [],
        exposure: [],
        vulnerability: [],
        adaptiveCapacity: []
      },
      selectedRcp: {
        hazard: [],
        exposure: [],
        vulnerability: [],
        adaptiveCapacity: []
      },
      userProvidedFormData: {
        hazard: {},
        exposure: {},
        vulnerability: {},
        adaptiveCapacity: {}
      },
      apiProvidedData: {
        hazard: {},
        exposure: {},
        adaptiveCapacity: {},
        vulnerability: {}
      },
      isFetchingAnswers: false,
      report: {
        isGeneratingReport: false,
        showGenerateReport: false,
        progress: 0
      },
      riskRatios: {},
      timescale: {
        hazard: ["baseline"],
        exposure: ["baseline"],
        vulnerability: ["baseline"],
        adaptiveCapacity: ["baseline"]
      },
      chartData: "",
      completedAnalysis: null,
      isUserReqInptChecked: false
    };
  },

  close() {
    this.props.terria.setCrtbModalVisibility({
      visibility: false,
      catalogItem: {},
      selectedType: null
    });
    this.props.viewState.crtbPanelIsVisible = false;
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
    this.props.terria.setCrtbModalVisibility.subscribe(data => {
      if (data) {
        this.onVisibilityChange(data);
      }
    });

    ActionManager.on(TerriaAction.OpenCRTB, () => {
      this.props.terria.setCrtbModalVisibility({
        visibility: true,
        catalogItem: {},
        selectedType: null
      });
    }).on(TerriaAction.CloseCRTB, () => {
      this.close();
    });

    this.onVisibilityChange(this.props.terria.setCrtbModalVisibility());
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
      } else if (data?.geometry?.defaultSelect) {
        this.onGeometrySelected({
          id: "geojson",
          name: data?.geometry?.name,
          data: data?.geometry?.data
        });
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
      this.props.viewState.crtbPanelIsVisible
    );
  },

  onGeometrySelected(selectedItem) {
    const terria = this.props.terria;

    if (selectedItem.id === "draw-tool") {
      terria.initiateDrawTool({
        visible: true,
        callbackData: this.state,
        caller: "CRTB"
      });
      this.close();
    } else {
      const geometryData = selectedItem.data;

      if (geometryData?.key === "mvt-ogr") {
        const name = geometryData.name || geometryData.name._value;
        const aoi = { ...this.state.aoi };

        aoi.name = name;
        aoi["key"] = geometryData.key;
        aoi.id = geometryData.properties?.id;
        aoi.type = "Polygon";

        this.setState({ aoi, geometry: geometryData, geometryName: name });
      } else if (geometryData.type === "mvt") {
        const name = selectedItem.name || geometryData.value;
        const aoi = { ...this.state.aoi };

        aoi.key = geometryData.value;
        aoi.id = geometryData.featuresCollectionId;
        aoi.keyColumn = geometryData.featureColumn;
        aoi.level = geometryData.level;

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

  shouldEnableGoButton(formStatus) {
    const {
      exposureTotal,
      vulnerabilityTotal,
      adaptiveCapacityTotal,
      exposureCompleted,
      vulnerabilityCompleted,
      adaptiveCapacityCompleted
    } = formStatus;

    const {
      analysisStarted,
      isFetchingAnswers,
      agriculturalSystem
    } = this.state;

    const acRequiresAction = adaptiveCapacityTotal > adaptiveCapacityCompleted;
    const exposureRequiresAction = exposureTotal > exposureCompleted;
    const vulRequiresAction = vulnerabilityTotal > vulnerabilityCompleted;

    return (
      !!this.state.geometry &&
      !acRequiresAction &&
      !exposureRequiresAction &&
      !vulRequiresAction &&
      !analysisStarted &&
      !isFetchingAnswers &&
      agriculturalSystem
    );
  },

  shouldEnableNextButton() {
    return !!this.state.geometry && !!this.state.agriculturalSystem;
  },

  showGenerateReportButton() {
    this.setState({
      report: {
        isGeneratingReport: false,
        showGenerateReport: true,
        progress: 0
      }
    });
  },

  hideReportButton() {
    this.setState({
      report: {
        isGeneratingReport: false,
        showGenerateReport: false,
        progress: 0
      }
    });
  },

  isGeneratingReport() {
    const {
      report: { isGeneratingReport }
    } = this.state;
    return isGeneratingReport;
  },

  showGenerateReport() {
    const {
      report: { showGenerateReport }
    } = this.state;
    return showGenerateReport;
  },

  setGeneratedReportState(state) {
    const { report } = this.state;
    this.setState({
      report: {
        ...report,
        isGeneratingReport: state,
        progress: state ? 0 : 100
      }
    });
  },

  calculateRatioOfYesToTotal(obj) {
    const entries = Object.entries(obj).filter(a => a[1] !== "NotAvailable");
    const totalCount = entries.length;
    const yesAnswerCount = entries.filter(a => a[1]).length;

    return yesAnswerCount / totalCount;
  },

  getSenarios() {
    const {
      timescale: { ["hazard"]: hazardTimescale },
      selectedRcp: { ["hazard"]: hazardRcp }
    } = this.state;

    let hazardSSPs = (hazardRcp || []).map(rcp => SSPMapping[rcp]);

    let scenarios = [];
    (hazardTimescale || []).forEach(_timescale => {
      if (hazardSSPs.length > 0 && _timescale !== "baseline") {
        const rcpScenario = hazardSSPs.map(_rcp => {
          const _name = `${this.ucFirstLeter(_timescale)} - ${(
            _rcp.label || ""
          ).toUpperCase()}`;
          return {
            name: _name,
            timescale: _timescale,
            rcp: _rcp.value
          };
        });
        scenarios = [...scenarios, ...rcpScenario];
      } else {
        scenarios.push({
          name: `${this.ucFirstLeter("baseline")}`,
          timescale: "baseline",
          rcp: "baseline"
        });
      }
    });

    return scenarios;
  },

  async startCrtbAnalysis() {
    this.setState({ analysisStarted: true });
    const { geometryName } = this.state;

    let row1 = "name";
    let row2 = "\nExposure";
    let row3 = "\nVulnerability";
    let row4 = '\n"Adaptive Capacity"';
    let row5 = "\nHazard";

    try {
      const scenarios = this.getSenarios();

      scenarios.forEach(({ name, timescale, rcp }) => {
        const hazardApiAnswers = this.getAnswersForForm(
          "hazard",
          timescale,
          rcp
        );
        const vulnerabilityApiAnswers = this.getAnswersForForm(
          "vulnerability",
          "baseline",
          "baseline"
        );
        const adaptiveCapacityApiAnswers = this.getAnswersForForm(
          "adaptiveCapacity",
          "baseline",
          "baseline"
        );
        const exposureApiAnswers = this.getAnswersForForm(
          "exposure",
          "baseline",
          "baseline"
        );
        const {
          vulnerability: vulnerabilityUserAnswer,
          adaptiveCapacity: adaptiveCapacityUserAnswer
        } = this.state.userProvidedFormData;

        const hazardValue = this.calculateRatioOfYesToTotal(hazardApiAnswers);
        const exposureValue = this.calculateRatioOfYesToTotal(
          exposureApiAnswers
        );
        const vulnerabilityValue = this.calculateRatioOfYesToTotal({
          ...vulnerabilityUserAnswer,
          ...vulnerabilityApiAnswers
        });
        const adaptiveCapacityValue = this.calculateRatioOfYesToTotal({
          ...adaptiveCapacityApiAnswers,
          ...adaptiveCapacityUserAnswer
        });

        row1 = row1.concat(`, ${geometryName} - ${name}`);
        row2 = row2.concat(`, ${exposureValue}`);
        row3 = row3.concat(`, ${vulnerabilityValue}`);
        row4 = row4.concat(`, ${adaptiveCapacityValue}`);
        row5 = row5.concat(`, ${hazardValue}`);

        const { riskRatios } = this.state;

        const exposure = riskRatios?.[timescale]?.[rcp]?.exposure || 0;
        const hazard = riskRatios?.[timescale]?.[rcp]?.hazard || 0;
        const vulnerability =
          riskRatios?.[timescale]?.[rcp]?.vulnerability || 0;
        const adaptiveCapacity =
          riskRatios?.[timescale]?.[rcp]?.adaptiveCapacity || 0;

        if (riskRatios[timescale]) {
          riskRatios[timescale] = {
            ...riskRatios[timescale],
            [rcp]: {
              exposure: exposure + exposureValue,
              hazard: hazard + hazardValue,
              vulnerability: vulnerability + vulnerabilityValue,
              adaptiveCapacity: adaptiveCapacity + adaptiveCapacityValue
            }
          };
        } else {
          riskRatios[timescale] = {
            [rcp]: {
              exposure: exposure + exposureValue,
              hazard: hazard + hazardValue,
              vulnerability: vulnerability + vulnerabilityValue,
              adaptiveCapacity: adaptiveCapacity + adaptiveCapacityValue
            }
          };
        }

        this.setState({
          riskRatios: riskRatios
        });
      });
    } catch (error) {
      console.error(error);
      this.notifyUser(
        "Error",
        `Unable to perform risk analysis for ${geometryName}`
      );
      this.setState({ analysisStarted: false });
      return;
    }

    const chartData = [row1, row2, row3, row4, row5].join("\n");

    this.setState({
      chartData: chartData
    });

    this.createResultCatalogItem({
      _name: `${geometryName} - Climate Risk Analysis`,
      data: chartData,
      analysisResult: [row1, row2, row3, row4, row5]
    });
  },

  createResultCatalogItem(chartData) {
    const { data: cd, _name, analysisResult } = chartData;
    const tableStyle = makeTableStyle({});
    tableStyle.xAxis = "name";

    const aggregateCi = new CsvCatalogItem(this.props.terria, undefined, {
      tableStyle: tableStyle,
      isCsvForCharting: true,
      isLoading: false
    });

    const geometryName = this.state.geometryName;
    const name = `${_name}`;

    const date = new Date();
    const id = `${name}-${date.getHours()}${date.getMinutes()}${date.getSeconds()}${date.getMilliseconds()}`;
    aggregateCi.name = name;
    aggregateCi.id = id;
    aggregateCi.data = cd;
    aggregateCi.customProperties = {
      analysisResult: {
        data: this.analysisResultToTemplate(analysisResult)
      }
    };

    aggregateCi.description = aggregateCi.customProperties.analysisResult.data;

    this.props.terria.catalog.userAddedDataGroup.add(aggregateCi);

    setTimeout(() => {
      const highchartsOption = aggregateCi.getHighchartOptions(
        {
          chartConfig: { chart: { polar: true, type: "line" } },
          isGrouping: true,
          name: name
        },
        {},
        geometryName,
        TableStructure.fromCsv(cd, aggregateCi.tableStructure),
        name
      );

      highchartsOption.yAxis.gridLineInterpolation = "polygon";
      highchartsOption.yAxis.lineWidth = 0;
      aggregateCi.customProperties.highchartsOption = highchartsOption;
      aggregateCi.isEnabled = true;
      aggregateCi.isUserSupplied = true;
      this.setState({ analysisStarted: false });
    }, 1000);

    this.setState({
      completedAnalysis: {
        name: name,
        id: id
      }
    });

    this.showGenerateReportButton();
  },

  analysisResultToTemplate(analysisResult) {
    const _template =
      `<table class="${Styles.resultTable}">` +
      "<tr> <td><b>Name</b> </td> {{#name}}<td><b>{{.}}</b></td>{{/name}} </tr>" +
      "<tr> <td><b>Hazard</b> </td> {{#hazard}}<td> {{.}} </td>{{/hazard}} </tr>" +
      "<tr> <td><b>Exposure</b> </td> {{#exposure}}<td> {{.}} </td>{{/exposure}} </tr>" +
      "<tr> <td><b>Vulnerability</b> </td> {{#vulnerability}}<td> {{.}} </td>{{/vulnerability}} </tr>" +
      "<tr> <td><b>Adaptive Capacity</b> </td> {{#adaptive capacity}}<td> {{.}} </td>{{/adaptive capacity}} </tr>" +
      `<tr class="${
        Styles.total
      }"> <td><b>Climate Risk</b> </td> {{#climate risk}} <td> {{.}} </td>{{/climate risk}} </tr>` +
      "</table>";
    const data = {
      name: analysisResult[0].split(",").filter((_, idx) => idx !== 0),
      hazard: analysisResult
        .find(a => a.startsWith("\nHazard"))
        .split(",")
        .filter((_, idx) => idx !== 0)
        .map(rslt => Number(rslt).toFixed(2)),
      exposure: analysisResult
        .find(a => a.startsWith("\nExposure"))
        .split(",")
        .filter((_, idx) => idx !== 0)
        .map(rslt => Number(rslt).toFixed(2)),
      vulnerability: analysisResult
        .find(a => a.startsWith("\nVulnerability"))
        .split(",")
        .filter((_, idx) => idx !== 0)
        .map(rslt => Number(rslt).toFixed(2)),
      "adaptive capacity": analysisResult
        .find(a => a.startsWith('\n"Adaptive Capacity"'))
        .split(",")
        .filter((_, idx) => idx !== 0)
        .map(rslt => Number(rslt).toFixed(2)),
      "climate risk": () => {
        const _riskResults = this.getRiskClassification();
        return Object.keys(_riskResults).map(_key => {
          const _riskRsltItem = _riskResults[_key];
          return Number(_riskRsltItem?.value).toFixed(2);
        });
      }
    };

    return Mustache.render(_template, data);
  },

  getAnalysisIds(form, _timescale) {
    if (_timescale === "baseline") {
      return [
        {
          analysisId: analysisIds[form][_timescale],
          rcp: "baseline",
          form: form,
          timescale: _timescale
        }
      ];
    } else {
      const rcps = this.state.selectedRcp[form];
      return rcps.map(_rcp => {
        return {
          analysisId: analysisIds[form][_timescale][_rcp],
          rcp: _rcp,
          form: form,
          timescale: _timescale
        };
      });
    }
  },

  getRcpValue(form, _timescale) {
    if (_timescale === "baseline") {
      return "baseline";
    } else {
      const rcps = this.state.rcp[form];
      // analysisId = analysisIds[form];
      return rcps.map(_rcp => {
        return analysisIds[form][_timescale][_rcp.value];
      });
    }
  },

  async query(payload, rcp) {
    try {
      const { data: apiAnswers } = await axios.post(
        "https://api.data.apps.fao.org/api/v2/map/CRTB_analysis",
        payload
      );

      return { apiAnswers: apiAnswers, rcp: rcp };
    } catch (error) {
      this.notifyUser(
        "Error getting answers",
        `Unable to get answers from our backend services for the <em>${payload.join(
          ", "
        )}</em> questions for <em>${
          this.state.geometryName
        }</em>. <br/> Please try again, or contact support.`
      );

      this.setState({
        isFetchingAnswers: false
      });
    }
  },

  getSelectedGeometry() {
    const payload = {};
    let level = null;

    const {
      geometry: { id, name, data, data: { name: adminLevelName } = {} },
      aoi
    } = this.state;

    if (id === "geojson") {
      payload["geojson"] = data?.geometry || name;
    } else if (data?.key === "mvt-ogr") {
      payload["geojson"] = { ...data?.geometry };
    } else if ((aoi.type || "").toLocaleLowerCase() === "polygon") {
      payload["geojson"] = { type: "Polygon", coordinates: [aoi?.path] };
    } else {
      let column = "";

      // TODO: This implementation is way too specific (hard-coded), update to fetch this from config.
      if (aoi.id === "FAO/GAUL_SIMPLIFIED_500m/2015/level2") {
        payload["geojson"] = {
          // eslint-disable-next-line camelcase
          feature_collection_id: "FAO/GAUL_SIMPLIFIED_500m/2015/level2"
        };
        column = "ADM2_CODE";
      } else if (aoi.id === "FAO/GAUL_SIMPLIFIED_500m/2015/level1") {
        payload["geojson"] = {
          // eslint-disable-next-line camelcase
          feature_collection_id: "FAO/GAUL_SIMPLIFIED_500m/2015/level1"
        };
        column = "ADM1_CODE";
      } else if (aoi.id === "FAO/GAUL_SIMPLIFIED_500m/2015/level0") {
        payload["geojson"] = {
          // eslint-disable-next-line camelcase
          feature_collection_id: "FAO/GAUL_SIMPLIFIED_500m/2015/level0"
        };
        column = "ADM0_CODE";
      } else {
        throw new Error("Unsupported Feature Selected");
      }

      payload["geometry_type"] = "feature_collection";
      payload["geojson"]["filters"] = [
        {
          filter: "eq",
          column: column,
          value: Number(aoi.key),
          level: level
        }
      ];
    }

    return payload;
  },

  async getAnswersFromApi(form) {
    if (!form) {
      form = this.state.currentForm;
    }

    this.setState({
      isFetchingAnswers: true
      // apiProvidedData: {}
    });

    const timescales = this.state.timescale[form];
    timescales?.forEach(async _timescale => {
      if (form === formNames.aoi) return;

      this.setState({ isFetchingAnswers: true });
      let payload = this.getSelectedGeometry();
      const analysisIds = this.getAnalysisIds(form, _timescale);
      const answerPromises = [];

      analysisIds.forEach(({ analysisId, rcp }) => {
        payload = { ...payload, ["analysis_id"]: analysisId };
        answerPromises.push(this.query(payload, rcp));
      });

      Promise.all(answerPromises)
        .then(rsp => {
          const { apiProvidedData: _apiProvidedData } = this.state;

          this.setState({
            apiProvidedData: {
              ..._apiProvidedData,
              [form]: {}
            }
          });

          rsp.forEach(({ apiAnswers, rcp: _rcp }) => {
            let currentFormData = this.getAnswersForForm(form);
            if (currentFormData) return;
            currentFormData = {};

            for (const answer of apiAnswers) {
              const value = this.getValue(answer);
              currentFormData[answer.code] = value;
            }

            if (!isObject(_apiProvidedData[form]?.[_timescale])) {
              _apiProvidedData[form][_timescale] = { [_rcp]: currentFormData };
            } else {
              _apiProvidedData[form][_timescale][_rcp] = currentFormData;
            }
          });

          this.setState({
            isFetchingAnswers: false,
            apiProvidedData: _apiProvidedData
          });
        })
        .finally(_ => {});
    });
  },

  // Get the current api answers.
  // Returns null if calls have not been made
  getAnswersForForm(form, _timescale, _rcp) {
    if (!form) form = this.state.currentForm;
    if (form === formNames.aoi) return null;
    const timescale = _timescale;
    const rcp = _rcp;
    if (!rcp) {
      return null;
    }
    return this.state.apiProvidedData[form]?.[timescale]?.[rcp];
  },

  getValue(answer) {
    switch (answer.answer) {
      case 1:
        return true;
      case 0:
        return false;
      default:
        return "NotAvailable";
    }
  },

  resetFormData(form) {
    const {
      apiProvidedData,
      apiProvidedData: { [form]: currentFormData }
    } = this.state;
    if (isObject(currentFormData)) {
      apiProvidedData[form] = {};
      this.setState({ apiProvidedData: apiProvidedData });
    }
  },

  setRcps() {
    const { rcp, currentForm } = this.state;
    const formRcp = rcp[currentForm];

    rcp[currentForm] = formRcp;
    this.setState(
      {
        rcp: rcp
      },
      this.getAnswersFromApi
    );
    this.resetFormData(currentForm);
  },

  onRcpSelected({ target }) {
    const rcpValue = target?.value;
    const { currentForm, selectedRcp } = this.state;

    if (target?.checked) {
      selectedRcp[currentForm].push(rcpValue);
    } else {
      const indx = selectedRcp[currentForm]?.indexOf(rcpValue);
      selectedRcp[currentForm].splice(indx, 1);

      // TODO: Remove Answers as well
      const { apiProvidedData } = this.state;
      apiProvidedData[currentForm] = {};
      this.setState({
        apiProvidedData: apiProvidedData
      });
    }

    this.setState({ selectedRcp: selectedRcp }, this.getAnswersFromApi);
  },

  tabChanged(tab) {
    this.setState({ currentForm: tab }, this.getAnswersFromApi);
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
      <fieldset key={`crtbAreaOfInterest`} className={Styles.sectionContainer}>
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

  onTimeScaleSelected({ target }) {
    const timescaleValue = target.value;
    const { currentForm, selectedRcp } = this.state;

    let {
      timescale: { [currentForm]: selectedItems },
      selectedRcp: { [currentForm]: formRcp }
    } = this.state;

    this.resetFormData(currentForm);

    if (target.checked) {
      selectedItems.push(timescaleValue);

      if (
        selectedItems.length >= 1 &&
        selectedItems.find(_sI => _sI !== "baseline") &&
        (formRcp && formRcp.length < 1)
      ) {
        formRcp = [rcpOptions.default.value];
      }
    } else {
      selectedItems = selectedItems.filter(itm => itm !== timescaleValue);
      if (
        selectedItems.length < 1 ||
        (selectedItems.length === 1 && selectedItems[0] === "baseline")
      ) {
        formRcp = [];
      }
    }

    this.setState(
      {
        timescale: {
          ...this.state.timescale,
          [currentForm]: selectedItems
        },
        rcp: {
          ...this.state.rcp,
          [currentForm]:
            selectedItems?.reduce((_acc, _sI) => {
              if (rcpOptions[currentForm][_sI]) {
                _acc = [...rcpOptions[currentForm][_sI]];
              }
              return _acc;
            }, []) || []
        },
        selectedRcp: {
          ...selectedRcp,
          [currentForm]: formRcp
        }
      },
      () => {
        if (this.state.rcp?.[currentForm]) {
          this.getAnswersFromApi();
        } else {
          this.setRcps(rcpOptions.default);
        }
      }
    );
  },

  getTimescaleSelector() {
    const form = this.state.currentForm;

    const _timescaleOpt = timescaleOptions[form];
    if (!Array.isArray(_timescaleOpt)) return null;

    let {
      timescale: { [form]: formTimescale }
    } = this.state;
    if (!Array.isArray(formTimescale)) {
      formTimescale = [formTimescale];
    }

    const inputs = _timescaleOpt.map((_tOpt, i) => (
      <span key={i + "ts"} style={{ marginLeft: "5px", marginRight: "15px" }}>
        <input
          key={`${this.state.currentForm}_timeLimit_${_tOpt?.value}`}
          name={`${this.state.currentForm}timeLimit`}
          checked={
            Array.isArray(formTimescale) && formTimescale.includes(_tOpt?.value)
          }
          type="checkbox"
          value={_tOpt.value}
          onChange={this.onTimeScaleSelected}
        />{" "}
        {_tOpt.label}
      </span>
    ));

    return (
      <fieldset key={`time_horizon`} className={Styles.sectionContainer}>
        <legend>Time horizon</legend>

        {inputs}
      </fieldset>
    );
  },

  getRcpSelector() {
    const {
      currentForm: form,
      rcp,
      selectedRcp: { [form]: formRcp }
    } = this.state;

    const options = rcp[form];

    return (
      options &&
      options.length > 0 && (
        <fieldset key={`fieldset_${form}`} className={Styles.sectionContainer}>
          <legend key={`legend`}>Shared Socio-Economic Pathway (RCP)</legend>

          {(options || []).map((_opt, i) => {
            if (!_opt) return;
            else
              return (
                <span
                  key={i + "_ts"}
                  style={{ marginLeft: "5px", marginRight: "15px" }}
                >
                  <input
                    name={`${form}_rcp_${_opt?.value}`}
                    key={`${form}_rcp_${_opt?.value}`}
                    checked={
                      Array.isArray(formRcp) && formRcp.includes(_opt?.value)
                    }
                    type="checkbox"
                    value={_opt.value}
                    onChange={this.onRcpSelected}
                  />
                  <span key={`${form}_rcp_${_opt?.name}`}>
                    &nbsp;{_opt?.name}
                  </span>
                </span>
              );
          })}
        </fieldset>
      )
    );
  },

  getUserRespondedCount(obj) {
    return Object.values(obj).filter(a => a !== null && a !== undefined).length; // but false is a valid answer.
  },

  getFormStatusCount() {
    const {
      vulnerability: vulData,
      adaptiveCapacity: acData
    } = this.state.userProvidedFormData;

    const exposureTotalCount = 0;
    const vulnerabilityTotalCount = 1;
    const adaptiveCapacityTotalCount = 1;

    const exposureAnsweredCount = 0;
    const vulnerabilityAnsweredCount = this.getUserRespondedCount(vulData);
    const adaptiveCapacityAnsweredCount = this.getUserRespondedCount(acData);

    return {
      exposureTotal: exposureTotalCount,
      vulnerabilityTotal: vulnerabilityTotalCount,
      adaptiveCapacityTotal: adaptiveCapacityTotalCount,
      exposureCompleted: exposureAnsweredCount,
      vulnerabilityCompleted: vulnerabilityAnsweredCount,
      adaptiveCapacityCompleted: adaptiveCapacityAnsweredCount
    };
  },

  formChanged({ formData }) {
    const currentForm = this.state.currentForm;
    const previousState = this.state.userProvidedFormData || {};

    this.setState({
      userProvidedFormData: {
        ...previousState,
        [currentForm]: formData
      }
    });
  },

  renderQuestions() {
    const {
      currentForm,
      isFetchingAnswers,
      apiProvidedData,
      selectedRcp,
      timescale
    } = this.state;

    if (!apiProvidedData[currentForm]) {
      return null;
    }

    const dataKys = timescale[currentForm];

    if (!dataKys || !Array.isArray(dataKys)) {
      return null;
    }

    return (dataKys || []).map(_ky => {
      let rcpDataKys = [];

      if (_ky !== "baseline") rcpDataKys = selectedRcp[currentForm];
      else {
        rcpDataKys = ["baseline"];
      }

      return rcpDataKys.map(_rcpKy => {
        const apiFormSchema = getFormSchema(currentForm, _ky, _rcpKy);
        const userFormSchema = getFormSchema(
          currentForm,
          "baseline-userinput",
          _rcpKy
        );

        const widgets = {
          CustomRadioWidget: CustomRadioWidget,
          CustomAnswerWidget: CustomAnswerWidget
        };

        const apiProvidedDataIcon = isFetchingAnswers ? (
          <span
            className={classNames(
              LoaderStyles.loader,
              Styles.iconAccordion,
              Styles.iconLoader
            )}
          >
            <Icon glyph={Icon.GLYPHS.loader} />
          </span>
        ) : (
          <span className={Styles.iconAccordion}>
            <Icon glyph={Icon.GLYPHS.web} />
          </span>
        );

        const userProvidedInputIcon = (
          <span className={Styles.iconAccordion}>
            <Icon glyph={Icon.GLYPHS.person} />
          </span>
        );

        const formData = this.getAnswersForForm(currentForm, _ky, _rcpKy) || {};

        return (
          <div
            key={`${currentForm}_${_ky}_${_rcpKy}}`}
            className={classNames(
              AccordionStyle.accordion,
              AccordionStyle.accordionXl
            )}
          >
            <input
              key={"crtbAvailableDataSection"}
              type="radio"
              name="crbtAccordion"
              className={AccordionStyle.accordionSelect}
            />
            <div className={AccordionStyle.accordionTitle}>
              <span>
                {apiProvidedDataIcon} Available Data{" "}
                {_ky !== _rcpKy
                  ? `( ${this.ucFirstLeter(_ky)} - ${(
                      SSPMapping[_rcpKy]?.label || ""
                    ).toUpperCase()} )`
                  : `( ${this.ucFirstLeter(_rcpKy)} )`}
              </span>
            </div>
            <div
              style={{ overflow: "unset" }}
              className={AccordionStyle.accordionContentXl}
            >
              <If condition={apiFormSchema}>
                {formData && Object.keys(formData).length > 1 && (
                  <Form
                    schema={apiFormSchema}
                    uiSchema={getUiSchema(apiFormSchema, "CustomAnswerWidget")}
                    widgets={widgets}
                    formData={formData}
                    readonly={true}
                    className={Styles.formWrapper}
                    onChange={() => {
                      if (this.state.isUserReqInptChecked) {
                        this.setState({ isUserReqInptChecked: false });
                      }
                    }}
                  >
                    {" "}
                    <div />
                  </Form>
                )}
              </If>
            </div>

            <If condition={userFormSchema}>
              <input
                key={"crtbUserInputDataSection"}
                type="radio"
                name="crbtAccordion"
                className={AccordionStyle.accordionSelect}
                checked={this.state.isUserReqInptChecked}
                onChange={() => {
                  this.setState({
                    isUserReqInptChecked: !this.state.isUserReqInptChecked
                  });
                }}
              />
              <div className={AccordionStyle.accordionTitle}>
                <span>{userProvidedInputIcon} Required User Input</span>
              </div>
              <div
                style={{ overflow: "unset" }}
                className={AccordionStyle.accordionContentXl}
              >
                <Form
                  schema={userFormSchema}
                  uiSchema={getUiSchema(userFormSchema, "CustomRadioWidget")}
                  widgets={widgets}
                  formData={
                    this.state.userProvidedFormData[this.state.currentForm]
                  }
                  onChange={this.formChanged}
                  className={Styles.formWrapper}
                >
                  {" "}
                  <div />
                </Form>
              </div>
            </If>
          </div>
        );
      });
    });
  },

  render() {
    const { t } = this.props;
    const {
      visible,
      report: { progress }
    } = this.state;

    const formStatus = this.getFormStatusCount();

    const footer = (
      <>
        <If
          condition={
            this.state.currentForm === forms[forms.length - 1] &&
            !this.showGenerateReport()
          }
        >
          <button
            onClick={this.startCrtbAnalysis}
            disabled={!this.shouldEnableGoButton(formStatus)}
            className={Styles.startAnalysisButton}
          >
            <If condition={this.state.analysisStarted}>
              <Loader className={Styles.startingAnalysis} />
            </If>
            <If condition={!this.state.analysisStarted}>Run</If>
          </button>
        </If>

        <If condition={this.state.currentForm !== forms[forms.length - 1]}>
          <button
            onClick={() => {
              const currentIndex = forms.indexOf(this.state.currentForm);
              const nextTab = forms[currentIndex + 1];
              this.tabChanged(nextTab);
            }}
            disabled={!this.shouldEnableNextButton()}
            className={Styles.startAnalysisButton}
          >
            <If condition={!this.state.analysisStarted}>Next</If>
          </button>
        </If>

        <If condition={this.isGeneratingReport()}>
          <div
            className={classNames(
              Styles.progressBar,
              progress >= 99 ? Styles.blink : ""
            )}
            data-label="Generating report ...."
          >
            <span className={Styles.value} style={{ width: `${progress}%` }} />
          </div>
        </If>

        <If
          condition={
            this.state.currentForm === forms[forms.length - 1] &&
            this.showGenerateReport() &&
            !this.isGeneratingReport()
          }
        >
          <button
            onClick={this.generateReport}
            disabled={this.isGeneratingReport()}
            className={classNames(Styles.startAnalysisButton)}
          >
            <span>Download Report</span>
          </button>
        </If>
      </>
    );

    return (
      <Modal
        visible={visible}
        close={this.close}
        t={t}
        title="Climate Risk Toolbox"
        icon={<Icon glyph={Icon.GLYPHS.lineChart} />}
        viewState={this.props.viewState}
        footer={footer}
        size={ModalSizes.Largest}
      >
        <div>
          <CrtbTabHeaders
            currentForm={this.state.currentForm}
            formStatus={formStatus}
            userData={this.state.userProvidedFormData}
            onTabChange={this.tabChanged}
            viewState={this.props.viewState}
            tabsEnabled={this.shouldEnableNextButton()}
          />

          <If condition={this.state.currentForm === formNames.aoi}>
            {this.getAreaOfInterest()}
            <fieldset
              key={`agricultural_systems`}
              className={Styles.sectionContainer}
            >
              <legend>Agricultural Systems</legend>
              <Select
                defaultMenuIsOpen={false}
                // defaultValue={selectedValue}
                filterOption={this.selectorFilter}
                isClearable={false}
                placeholder={
                  "Select agricultural systems  (select one or more)"
                }
                value={this.state.agriculturalSystem}
                onChange={val => {
                  this.setState({ agriculturalSystem: val });
                }}
                className={Styles.dropdown}
                options={agriculturalSystems}
                styles={colorStyles}
                delimiter={","}
                isMulti={true}
              />
            </fieldset>
          </If>

          <If condition={this.state.currentForm !== formNames.aoi}>
            {this.getTimescaleSelector()}
            {this.getRcpSelector()}
            {this.renderQuestions()}
          </If>
        </div>
      </Modal>
    );
  },

  async generateReport() {
    this.keepTicking(45); // TODO: This is just a best-guess for how long the report generation would take.
    this.setGeneratedReportState(true);

    const {
      terria,
      viewState,
      terria: {
        configParameters: { automaticReportingConfigUrl }
      }
    } = this.props;
    const { geometryName, geometry, aoi } = this.state;
    const shareUrl = (await buildShortShareLink(terria, viewState)).split(
      "share="
    )[1];
    const _config = await loadJson(automaticReportingConfigUrl);
    const { templates } = _config;
    const { config, outputOptions } = templates[0] || {};
    const data = await this.getReportData();
    const selectedGeometry =
      (geometry || {}).id === "mvt"
        ? {
            // eslint-disable-next-line camelcase
            gaul_lvl: aoi.level,
            // eslint-disable-next-line camelcase
            gaul_id: geometry?.data?.properties?.id
          }
        : this.getGeometryForPrinting(geometry);

    const printingDataService = new CrtbPrintingDataService(
      terria,
      shareUrl,
      selectedGeometry
    );
    new PrintingService()
      .generateReport(
        terria,
        { ...config, outputOptions },
        shareUrl,
        data,
        printingDataService,
        {
          geometryName,
          ...selectedGeometry
        }
      )
      .then(rsp => {
        const documentUrl = rsp?.documentUrl;
        const { completedAnalysis } = this.state;

        const ci = this.props.terria.catalog.userAddedDataGroup.items.find(
          ({ id }) => {
            return id === completedAnalysis.id;
          }
        );

        const link = `<a target='_blank' class='tjs-side-panel__button tjs-_buttons__btn tjs-_buttons__btn-primary'
                      href='${documentUrl}'><label style='color: #FFF'> Open: ${geometryName} - Climate Risk Report</label></a>`;
        ci.customProperties.analysisResult.data += "<br/>" + link;
        ci.description = ci.customProperties.analysisResult.data;
      })
      .catch(err => {
        console.error(err);
      })
      .finally(() => {
        this.setGeneratedReportState(false);
        this.resetState();
        this.close();
      });
  },

  async getReportData() {
    const { agriculturalSystem, geometryName } = this.state;

    const qAnda = this.getQuestions();

    const showAgriSystems = (agriculturalSystem || []).reduce((obj, item) => {
      const sectionName = (item["label"].split(" ") || [])
        .map(word => this.ucFirstLeter(word))
        .join("");
      return { ...obj, [`show${sectionName}`]: true };
    }, {});
    return {
      project_title: `${geometryName} - Climate Risk`,
      project_area: `${geometryName}`,
      country: ` _____________________________ `,
      analyst_name: ` _____________________________ `,
      date_completed: new Date().toDateString(),
      ...showAgriSystems,
      ...qAnda,
      ...this.getRiskClassification()
    };
  },

  getReportChart() {
    return new Promise(resolve => {
      const selector =
        "#ui > div > div.tjs-standard-user-interface__ui-root > div.tjs-standard-user-interface__ui > div > section > div.tjs-map-column__map__inner.tjs-map-column__map__innerChrome > div:nth-child(2) > div > div.tjs-chart-panel__holder > div > div > div";
      const _document = document.querySelector(selector);
      html2canvas(_document)
        .then(canvas => {
          canvas.style.display = "none";
          document.body.appendChild(canvas);
          return canvas;
        })
        .then(canvas => {
          resolve(
            canvas
              .toDataURL("image/png")
              .replace("image/png", "image/octet-stream")
          );
          canvas.remove();
        });
    });
  },

  getGeometryForPrinting(geometry) {
    return { id: geometry.id, name: geometry.name, data: geometry.data };
  },

  getQuestions() {
    const questionsWithAnswers = {};
    const { apiProvidedData, userProvidedFormData } = this.state;
    const formKeys = Object.keys(apiProvidedData);

    formKeys.forEach(_formKy => {
      const currentFormData = apiProvidedData[_formKy];
      const timescleKeys = Object.keys(currentFormData);

      timescleKeys.forEach(_timescleKy => {
        const currentFormRcpData = apiProvidedData[_formKy][_timescleKy];
        const rcpDataKys = Object.keys(currentFormRcpData);

        rcpDataKys.forEach(_rcpKy => {
          const questions = getFormSchema(_formKy, _timescleKy, _rcpKy)
            ?.properties;
          const userInputQuestions = getFormSchema(
            _formKy,
            "baseline-userinput",
            _rcpKy
          )?.properties;
          const ansObj = apiProvidedData[_formKy][_timescleKy][_rcpKy];
          const userInputAnsObj = userProvidedFormData?.[_formKy];
          const timeline = (_timescleKy || "").replace("-", "_");
          const rcp = ((_rcpKy || "").replace("-", "_") || "").replace(
            ".",
            "_"
          );
          const entryKey = `${_formKy}_${timeline}_${rcp}`;

          questionsWithAnswers[`show_${entryKey}`] = true;
          questionsWithAnswers[entryKey] = [];

          Object.keys(questions).forEach(qKey => {
            const answer = ansObj[qKey];
            questionsWithAnswers[entryKey].push({
              question: questions[qKey].title,
              // eslint-disable-next-line camelcase
              [`is_${answer}`]: "X"
            });
          });

          if (userInputQuestions) {
            Object.keys(userInputQuestions).forEach(qKey => {
              const answer = userInputAnsObj?.[qKey];
              questionsWithAnswers[entryKey].push({
                question: userInputQuestions[qKey].title,
                // eslint-disable-next-line camelcase
                [`is_${answer}`]: "X"
              });
            });
          }
        });
      });
    });
    return questionsWithAnswers;
  },

  toVariableName(obj, item) {
    const sectionName = (item["label"].split(" ") || [])
      .map(word => this.ucFirstLeter(word))
      .join("");
    return { ...obj, [`show${sectionName}Risk`]: true };
  },

  ucFirstLeter(str) {
    return !str ? "" : str.substr(0, 1).toUpperCase() + str.substr(1);
  },

  getRiskClassification() {
    const scenarios = this.getSenarios();
    const riskClassifications = {};
    scenarios.forEach(({ timescale, rcp }) => {
      const riskValue = this.getRiskLevel(timescale, rcp);
      const riskClassification = this.classifyRisk(riskValue);
      const riskType = ((riskClassification || "").split(" ") || [])
        .map(word => this.ucFirstLeter(word))
        .join("");
      const rcVariableName = `is${riskType}Risk`;

      let riskValueText = "";
      if (riskValue < -0.8) {
        riskValueText = "< -0.80";
      } else if (riskValue >= -0.8 && riskValue < 2) {
        riskValueText = Number(riskValue).toFixed(2);
      } else if (riskValue > 2) {
        riskValueText = "> 2";
      }

      riskClassifications[`RC_${timescale}_${rcp}`] = {
        rc: riskClassification,
        ["rc_value"]: riskValueText,
        ["value"]: Number(riskValue).toFixed(2),
        [rcVariableName]: true
      };
    });

    return riskClassifications;
  },

  classifyRisk(riskValue) {
    /**
     *   riskLevel =
     *    (Yes or 1 hazard pixels/total hazard pixels)
     *  + (Yes exposure pixels/total exposure pixels)
     *  + (Yes vulnerability pixels/total vulnerability responses)
     *  - (Yes adaptive capacity responses/total adaptive capacity responses)
     * ------------------------------------------------------------------------
     *  0 to 0.3 = low risk,
     *  0.3 to 0.6 = moderate risk,
     *  0.6 to 0.8 = high risk,
     *  > 0.8 = very high risk
     */

    if (riskValue < 0.2) return "Low Risk";
    else if (riskValue >= 0.2 && riskValue < 1.0) return "Moderate Risk";
    else if (riskValue >= 1.0 && riskValue < 1.6) return "High Risk";
    else if (riskValue >= 1.6) return "Very High Risk";
  },
  getRiskLevel(timescale, rcp) {
    const {
      riskRatios: {
        baseline: {
          baseline: { hazard: baseHazard }
        },
        [timescale]: {
          [rcp]: {
            exposure,
            hazard: futureHazard,
            vulnerability,
            adaptiveCapacity
          }
        }
      }
    } = this.state;

    const FH = timescale != "baseline" ? futureHazard : 0;

    // ((BH+(FH*0.25)+E+V)-AC)/3
    return baseHazard + FH * 0.25 + exposure + vulnerability - adaptiveCapacity;
  },
  keepTicking(until, now = 0) {
    const untilInBase100 = (now / 2 / until) * 100;

    setTimeout(() => {
      this.setState(_state => ({
        report: {
          ..._state.report,
          progress: untilInBase100
        }
      }));

      if (untilInBase100 < 100) {
        this.keepTicking(until, now + 1);
      }
    }, 500);
  }
});

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

module.exports = withTranslation()(CrtbWindow);
