import React from "react";
import createReactClass from "create-react-class";
import PropTypes from "prop-types";
import classNames from "classnames";

import DataCatalog from "../DataCatalog/DataCatalog.jsx";
import DataPreview from "../Preview/DataPreview.jsx";
import MobileSearch from "./MobileSearch.jsx";
import WorkbenchList from "../Workbench/WorkbenchList.jsx";
import WorkbenchVisualizationHelper from "../Workbench/WorkbenchVisualizationHelper";
import ObserveModelMixin from "../ObserveModelMixin";
import Icon from "../Icon";
import knockout from "terriajs-cesium/Source/ThirdParty/knockout-3.5.1";
import Styles from "./mobile-modal-window.scss";
import VisualizationType from "../../Models/VisualizationType.js";
import runLater from "../../Core/runLater.js";

const visualizationHelper = new WorkbenchVisualizationHelper();

const MobileModalWindow = createReactClass({
  displayName: "MobileModalWindow",
  mixins: [ObserveModelMixin],

  propTypes: {
    terria: PropTypes.object,
    viewState: PropTypes.object.isRequired
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
  renderTabs() {
    return visualizationHelper
      .getWorkbenchTabsForMobile(this.props.terria)
      .map((tab, i) => {
        return (
          <button
            key={i}
            type="button"
            className={classNames(Styles.viewTypeButton, {
              [Styles.viewTypeActive]: this.props.terria.viewType == tab
            })}
            onClick={() => {
              this.props.terria.viewType = tab;
              this.props.viewState.switchMobileView(null);
            }}
          >
            {tab}
          </button>
        );
      });
  },
  renderModalContent() {
    const viewState = this.props.viewState;
    const searchState = viewState.searchState;

    if (
      viewState.mobileView !== viewState.mobileViewOptions.data &&
      viewState.mobileView !== viewState.mobileViewOptions.preview &&
      searchState.showMobileLocationSearch &&
      searchState.locationSearchText.length > 0
    ) {
      return (
        <MobileSearch
          terria={this.props.terria}
          viewState={this.props.viewState}
        />
      );
    }

    switch (viewState.mobileView) {
      case viewState.mobileViewOptions.data:
        // No multiple catalogue tabs in mobile
        return (
          <DataCatalog
            terria={this.props.terria}
            viewState={this.props.viewState}
            items={this.props.terria.catalog.group.items}
          />
        );
      case viewState.mobileViewOptions.preview:
        return (
          <DataPreview
            terria={this.props.terria}
            viewState={this.props.viewState}
            previewed={this.props.viewState.previewedItem}
          />
        );
      case viewState.mobileViewOptions.nowViewing:
        return (
          <WorkbenchList
            viewState={this.props.viewState}
            terria={this.props.terria}
            list={this.props.terria.nowViewing.currentVisualizationItems}
          />
        );
      default:
        return null;
    }
  },

  onClearMobileUI() {
    this.props.viewState.switchMobileView(null);
    this.props.viewState.explorerPanelIsVisible = false;
    this.props.viewState.searchState.showMobileLocationSearch = false;
    this.props.viewState.searchState.showMobileCatalogSearch = false;
    this.props.viewState.searchState.catalogSearchText = "";
  },

  /* eslint-disable-next-line camelcase */
  UNSAFE_componentWillReceiveProps() {
    if (
      this.props.terria.nowViewing.items.length === 0 &&
      this.props.viewState.mobileView ===
        this.props.viewState.mobileViewOptions.nowViewing
    ) {
      this.props.viewState.switchMobileView(null);
      this.props.viewState.explorerPanelIsVisible = false;
    }
  },

  goBack() {
    this.props.viewState.mobileView = this.props.viewState.mobileViewOptions.data;
  },

  render() {
    const modalClass = classNames(Styles.mobileModal, {
      [Styles.isOpen]:
        this.props.viewState.explorerPanelIsVisible &&
        this.props.viewState.mobileView
    });
    const mobileView = this.props.viewState.mobileView;
    const terria = this.props.terria;
    const viewState = this.props.viewState;

    return (
      <div className={modalClass}>
        <div className={Styles.modalBg}>
          <div className={Styles.modalTop}>
            <button
              type="button"
              disabled={
                mobileView !== this.props.viewState.mobileViewOptions.preview
              }
              className={classNames(Styles.backButton, {
                [Styles.backButtonInactive]:
                  mobileView !== this.props.viewState.mobileViewOptions.preview
              })}
              onClick={this.goBack}
            >
              <Icon className={Styles.iconBack} glyph={Icon.GLYPHS.left} />
            </button>

            <If
              condition={
                this.props.viewState.explorerPanelIsVisible && mobileView
              }
            >
              <div>
                <If
                  condition={
                    viewState.mobileView ==
                    viewState.mobileViewOptions.nowViewing
                  }
                >
                  {this.renderTabs()}
                </If>
              </div>

              <button
                type="button"
                className={Styles.doneButton}
                onClick={this.onClearMobileUI}
              >
                Done
              </button>
            </If>
          </div>

          {this.renderModalContent()}
        </div>
      </div>
    );
  }
});
module.exports = MobileModalWindow;
