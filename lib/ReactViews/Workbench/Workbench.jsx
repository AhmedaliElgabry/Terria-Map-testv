import ObserveModelMixin from "../ObserveModelMixin";
import React from "react";
import createReactClass from "create-react-class";
import PropTypes from "prop-types";
import WorkbenchList from "./WorkbenchList.jsx";
import CustomTabStyle from "./workbench-tabs.scss";
import { withTranslation } from "react-i18next";
import VisualizationType from "../../Models/VisualizationType";
import knockout from "terriajs-cesium/Source/ThirdParty/knockout-3.5.1";
import runLater from "../../Core/runLater";
import WorkbenchVisualizationHelper from "./WorkbenchVisualizationHelper";
import ConditionalyVisibleElement, {
  ElementsIdentifiers
} from "../ConditionalyVisibleElement";

const visualizationHelper = new WorkbenchVisualizationHelper();

const Workbench = createReactClass({
  displayName: "Workbench",
  mixins: [ObserveModelMixin],
  propTypes: {
    terria: PropTypes.object.isRequired,
    viewState: PropTypes.object.isRequired,
    t: PropTypes.func.isRequired
  },
  getInitialState() {
    return {
      currentTab: this.props.terria.viewType,
      enabledDatasets: {
        [VisualizationType.MAP]: [],
        [VisualizationType.CHART]: null,
        [VisualizationType.TABLE]: null
      }
    };
  },
  componentDidMount() {
    const terria = this.props.terria;

    visualizationHelper.prepareVisualizations(
      terria,
      this.state.enabledDatasets
    );

    this._currentViewTypeSubBefore = knockout
      .getObservable(terria, "viewType")
      .subscribe(
        previousTab => this.saveCurrentShownDatasets(previousTab),
        this,
        "beforeChange"
      );

    const checkItemsSelection = () => {
      runLater(() => {
        visualizationHelper.prepareVisualizations(
          terria,
          this.state.enabledDatasets
        );
      }, 200);
    };

    this._currentViewTypeSubAfter = knockout
      .getObservable(terria, "viewType")
      .subscribe(currentTab => {
        this.setState({ currentTab: currentTab });
        checkItemsSelection();
      });

    this._nowViewingObservable = knockout
      .getObservable(terria.nowViewing, "items")
      .subscribe(items => {
        this.saveCurrentShownDatasets(terria.viewType);
        checkItemsSelection();
      });

    runLater(() =>
      knockout.getObservable(terria.nowViewing, "items").valueHasMutated()
    );
  },
  componentWillUnmount() {
    this._currentViewTypeSubAfter?.dispose();
    this._currentViewTypeSubAfter = null;

    this._currentViewTypeSubBefore?.dispose();
    this._currentViewTypeSubBefore = null;

    this._nowViewingObservable?.dispose();
    this._nowViewingObservable = null;
  },
  saveCurrentShownDatasets(tab) {
    const enabledDatasets = { ...this.state.enabledDatasets };
    const currentlyEnabled = this.props.terria.nowViewing.currentVisualizationItems
      .filter(a => a.isShown)
      .map(a => a.uniqueId);

    if (tab == VisualizationType.MAP)
      enabledDatasets[tab] = currentlyEnabled || [];
    else enabledDatasets[tab] = currentlyEnabled?.[0];

    this.setState({ enabledDatasets });
  },
  onTabChange(e) {
    const newTab = e.target.value;
    if (newTab !== this.props.terria.viewType) {
      this.props.terria.viewType = newTab;
    }
  },
  renderTabs() {
    return visualizationHelper
      .getWorkbenchTabs(this.props.terria)
      .map((tab, i) => {
        return (
          <div key={i}>
            <input
              type="radio"
              name="tabset"
              value={tab}
              onChange={this.onTabChange}
              id={`tab${i + 1}`}
              checked={tab === this.props.terria.viewType}
            />
            <label htmlFor={`tab${i + 1}`}>{tab}</label>
          </div>
        );
      });
  },
  render() {
    const list = this.props.terria.nowViewing.currentVisualizationItems;
    return (
      <div>
        <ConditionalyVisibleElement
          terria={this.props.terria}
          id={ElementsIdentifiers.hideTabs}
        >
          <div className={CustomTabStyle.tabset} ref="tabs">
            {this.renderTabs()}
          </div>
        </ConditionalyVisibleElement>
        <WorkbenchList
          viewState={this.props.viewState}
          terria={this.props.terria}
          list={list}
        />
      </div>
    );
  }
});

export default withTranslation()(Workbench);
