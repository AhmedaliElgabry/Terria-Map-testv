"use strict";

import classNames from "classnames";
import React from "react";
import createReactClass from "create-react-class";
import PropTypes from "prop-types";
import { sortable } from "react-anything-sortable";

import defined from "terriajs-cesium/Source/Core/defined";
import { defaultScalarColorMap } from "../../Models/LegendHelper";

import ConceptViewer from "./Controls/ConceptViewer";
import DateTimeSelectorSection from "./Controls/DateTimeSelectorSection";
import SatelliteImageryTimeFilterSection from "./Controls/SatelliteImageryTimeFilterSection";
import DimensionSelectorSection from "./Controls/DimensionSelectorSection";
import SmartCsvDimensionSelectorSection from "./Controls/SmartCsvDimensionSelectorSection";
import DisplayAsPercentSection from "./Controls/DisplayAsPercentSection";
import getAncestors from "../../Models/getAncestors";
import LeftRightSection from "./Controls/LeftRightSection";
import Legend from "./Controls/Legend";
import EditableLegend from "./Controls/EditableLegend";
import ObserveModelMixin from "./../ObserveModelMixin";
import OpacitySection from "./Controls/OpacitySection";
import ColorScaleRangeSection from "./Controls/ColorScaleRangeSection";
import ShortReport from "./Controls/ShortReport";
import StyleSelectorSection from "./Controls/StyleSelectorSection";
import ViewingControls from "./Controls/ViewingControls";
import TimerSection from "./Controls/TimerSection";
import { withTranslation } from "react-i18next";
import { SepalResultMetadata } from "../SepalWindow/SepalResultMetadata";
import Styles from "./workbench-item.scss";
import Icon from "../Icon.jsx";
import WorkbenchItemLoadingStatus from "./WorkbenchItemLoadingStatus";
import he from "he";
import AttributeSearch from "./Controls/AttributeSearch";
import VisualizationType from "../../Models/VisualizationType";
import isCommonMobilePlatform from "../../Core/isCommonMobilePlatform";
import knockout from "terriajs-cesium/Source/ThirdParty/knockout-3.5.1";
import GeoJsonCatalogItem from "../../Models/GeoJsonCatalogItem";
import ConditionalyVisibleElement, {
  ElementsIdentifiers
} from "../ConditionalyVisibleElement";

export const WorkbenchItemRaw = createReactClass({
  displayName: "WorkbenchItem",
  mixins: [ObserveModelMixin],

  propTypes: {
    style: PropTypes.object,
    className: PropTypes.string,
    onMouseDown: PropTypes.func.isRequired,
    onTouchStart: PropTypes.func.isRequired,
    item: PropTypes.object.isRequired,
    viewState: PropTypes.object.isRequired,
    setWrapperState: PropTypes.func,
    terria: PropTypes.object,
    t: PropTypes.func.isRequired
  },
  getInitialState() {
    return {
      isNameEditingEnabled: false,
      name: this.props.item.name
    };
  },
  componentDidMount() {
    if (this.props.item instanceof GeoJsonCatalogItem) {
      this._nameSubscription = knockout
        .getObservable(this.props.item, "name")
        .subscribe(name => {
          this.setState({ ...this.state, name });
        });
    }
  },
  componentWillUnmount() {
    if (this._nameSubscription) {
      this._nameSubscription.dispose();
      this._nameSubscription = null;
    }
  },
  toggleDisplay() {
    this.props.item.isLegendVisible = !this.props.item.isLegendVisible;
  },
  onEditClick() {
    if (this.props.item.type === "geojson") {
      this.setState({ isNameEditingEnabled: true });
    }
  },
  handleBlur() {
    if (this.state.name === "") {
      return;
    }
    this.props.item.name = this.state.name;
    this.setState({ isNameEditingEnabled: false });
  },
  onKeyPress(e) {
    if (this.state.name === "") {
      return;
    }
    if (e.keyCode === 13) {
      this.props.item.name = this.state.name;
      this.setState({ isNameEditingEnabled: false });
    }
  },
  onNameChange(e) {
    this.setState({ name: e.target.value });
  },
  openModal() {
    this.props.setWrapperState({
      modalWindowIsOpen: true,
      activeTab: 1,
      previewed: this.props.item
    });
  },
  toggleVisibility() {
    const { item, terria, viewState } = this.props;
    const viewType = terria.viewType;
    const isMobile = isCommonMobilePlatform();
    const { type, isCsvForCharting, isTabular } = item;
    if (
      (viewType == VisualizationType.CHART && isCsvForCharting) ||
      viewType == VisualizationType.TABLE
    ) {
      this.props.terria.nowViewing.toggleWorkbenchItemVisibility(
        this.props.item
      );
    } else {
      this.props.item.isShown = !this.props.item.isShown;
    }
  },
  render() {
    const workbenchItem = this.props.item;
    const isCSVItem =
      workbenchItem.type === "csv" || workbenchItem.type === "smart-csv";
    const isEditableLegend = isCSVItem && !workbenchItem.isCsvForCharting;

    const workbenchItemName = he.decode(this.state.name || "");

    const isMobile = isCommonMobilePlatform();

    const tooltip = getAncestors(workbenchItem)
      .map(member => member.nameInCatalog)
      .concat(workbenchItem.nameInCatalog)
      .join(" → ");

    const sepalOptions =
      workbenchItem.customProperties &&
      workbenchItem.customProperties.sepalResult &&
      workbenchItem.customProperties.sepalOptions;

    const viewType = this.props.terria.viewType;

    const { t } = this.props;

    return (
      <li
        style={this.props.style}
        className={classNames(this.props.className, Styles.workbenchItem, {
          [Styles.isOpen]: workbenchItem.isLegendVisible
        })}
      >
        <ul className={Styles.header}>
          <If condition={workbenchItem.supportsToggleShown}>
            <li className={Styles.visibilityColumn}>
              <button
                type="button"
                onClick={this.toggleVisibility}
                title={t("workbench.toggleVisibility")}
                className={Styles.btnVisibility}
              >
                <If
                  condition={
                    workbenchItem.isCsvForCharting &&
                    viewType == VisualizationType.CHART
                  }
                >
                  {workbenchItem.isShown ? (
                    <Icon glyph={Icon.GLYPHS.radioOn} />
                  ) : (
                    <Icon glyph={Icon.GLYPHS.radioOff} />
                  )}
                </If>
                <If condition={viewType == VisualizationType.TABLE}>
                  {workbenchItem.isShown ? (
                    <Icon glyph={Icon.GLYPHS.radioOn} />
                  ) : (
                    <Icon glyph={Icon.GLYPHS.radioOff} />
                  )}
                </If>
                <If condition={viewType == VisualizationType.MAP}>
                  {workbenchItem.isShown ? (
                    <Icon glyph={Icon.GLYPHS.checkboxOn} />
                  ) : (
                    <Icon glyph={Icon.GLYPHS.checkboxOff} />
                  )}
                </If>
              </button>
            </li>
          </If>
          <li className={Styles.nameColumn}>
            {!this.state.isNameEditingEnabled ? (
              <div
                onMouseDown={this.props.onMouseDown}
                onTouchStart={this.props.onTouchStart}
                className={Styles.draggable}
                title={
                  workbenchItem.type === "geojson"
                    ? tooltip + " - click to edit name"
                    : tooltip
                }
              >
                <If
                  condition={
                    !workbenchItem.isMappable && workbenchItem.isCsvForCharting
                  }
                >
                  <span className={Styles.iconLineChart}>
                    <Icon glyph={Icon.GLYPHS.lineChart} />
                  </span>
                </If>

                <If
                  condition={
                    !workbenchItem.isMappable && workbenchItem.isTabular
                  }
                >
                  <span className={Styles.iconLineChart}>
                    <Icon glyph={Icon.GLYPHS.grid} />
                  </span>
                </If>

                <span onClick={this.onEditClick}>{workbenchItemName}</span>
              </div>
            ) : (
              <input
                autoComplete="off"
                className={Styles.field}
                type="text"
                id="workbenchItemName"
                value={workbenchItemName}
                onChange={this.onNameChange}
                onBlur={this.handleBlur}
                onKeyDown={this.onKeyPress}
              />
            )}

            <div>
              <If condition={workbenchItem.type == "geojson"}>
                <button
                  title={"Edit GeoJSON Style"}
                  onClick={() =>
                    this.props.terria.setGeojsonEditorlModalVisibility({
                      item: workbenchItem,
                      visibility: true,
                      slidIn: true,
                      refreshFunc: this.forceUpdate.bind(this)
                    })
                  }
                  className={Styles.editGeojson}
                >
                  <Icon glyph={Icon.GLYPHS.edit} />
                </button>
              </If>
            </div>
          </li>

          <li className={Styles.toggleColumn}>
            <button
              type="button"
              className={Styles.btnToggle}
              onClick={this.toggleDisplay}
            >
              {workbenchItem.isLegendVisible ? (
                <Icon glyph={Icon.GLYPHS.opened} />
              ) : (
                <Icon glyph={Icon.GLYPHS.closed} />
              )}
            </button>
          </li>
          <li className={Styles.headerClearfix} />
        </ul>

        <If condition={workbenchItem.isLegendVisible}>
          <div className={Styles.inner}>
            <ConditionalyVisibleElement
              terria={this.props.terria}
              id={ElementsIdentifiers.hideWorkbenchItemControls}
            >
              <ViewingControls
                terria={this.props.terria}
                item={workbenchItem}
                viewState={this.props.viewState}
              />
            </ConditionalyVisibleElement>

            <If
              condition={this.props.terria.viewType != VisualizationType.TABLE}
            >
              <OpacitySection item={workbenchItem} />
            </If>
            <AttributeSearch item={workbenchItem} terria={this.props.terria} />
            <WorkbenchItemLoadingStatus item={workbenchItem} />
            <LeftRightSection item={workbenchItem} />
            <TimerSection item={workbenchItem} />
            <If
              condition={
                defined(workbenchItem.concepts) &&
                workbenchItem.concepts.length > 0 &&
                workbenchItem.displayChoicesBeforeLegend &&
                !workbenchItem.isCsvForCharting
              }
            >
              <ConditionalyVisibleElement
                terria={this.props.terria}
                id={ElementsIdentifiers.hideConceptViewer}
              >
                <ConceptViewer
                  terria={this.props.terria}
                  item={workbenchItem}
                />
              </ConditionalyVisibleElement>
            </If>

            <If condition={sepalOptions}>
              <div
                style={{
                  marginTop: workbenchItem.terria.showSplitter ? "50px" : ""
                }}
              >
                <SepalResultMetadata
                  name={sepalOptions.name}
                  mosaicType={sepalOptions.mosaicType}
                  geometryName={sepalOptions.geometryName}
                  dates={sepalOptions.dates}
                  radarOptions={sepalOptions.radarOptions}
                  opticalOptions={sepalOptions.opticalOptions}
                  showDetail={false}
                />
              </div>
            </If>

            <DimensionSelectorSection
              terria={this.props.terria}
              item={workbenchItem}
            />

            <If condition={workbenchItem.type === "smart-csv"}>
              <SmartCsvDimensionSelectorSection
                terria={this.props.terria}
                viewState={this.props.viewState}
                item={workbenchItem}
              />
            </If>

            <DateTimeSelectorSection item={workbenchItem} />
            <SatelliteImageryTimeFilterSection item={workbenchItem} />
            <StyleSelectorSection item={workbenchItem} />
            <ColorScaleRangeSection
              item={workbenchItem}
              minValue={workbenchItem.colorScaleMinimum}
              maxValue={workbenchItem.colorScaleMaximum}
            />
            <DisplayAsPercentSection item={workbenchItem} />
            <If
              condition={
                workbenchItem.shortReport ||
                (workbenchItem.shortReportSections &&
                  workbenchItem.shortReportSections.length)
              }
            >
              <ShortReport item={workbenchItem} />
            </If>

            <If
              condition={this.props.terria.viewType != VisualizationType.TABLE}
            >
              {isEditableLegend ? (
                <EditableLegend
                  item={workbenchItem}
                  colorMap={
                    workbenchItem.tableStyle.colorMap || defaultScalarColorMap
                  }
                  colorBins={workbenchItem.tableStyle.colorBins || 7}
                  colorBinMethod={workbenchItem.tableStyle.colorBinMethod}
                  colorPalette={workbenchItem.tableStyle.colorPalette}
                />
              ) : (
                <Legend item={workbenchItem} />
              )}
            </If>

            <If
              condition={
                defined(workbenchItem.concepts) &&
                workbenchItem.concepts.length > 0 &&
                !workbenchItem.displayChoicesBeforeLegend &&
                !workbenchItem.isCsvForCharting
              }
            >
              <ConditionalyVisibleElement
                terria={this.props.terria}
                id={ElementsIdentifiers.hideConceptViewer}
              >
                <ConceptViewer
                  terria={this.props.terria}
                  item={workbenchItem}
                />
              </ConditionalyVisibleElement>
            </If>
          </div>
        </If>
      </li>
    );
  }
});

export default sortable(withTranslation()(WorkbenchItemRaw));
