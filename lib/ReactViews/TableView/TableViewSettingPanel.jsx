"use strict";

import classNames from "classnames";
import createReactClass from "create-react-class";
import PropTypes from "prop-types";
import React from "react";
import { withTranslation } from "react-i18next";
import knockout from "terriajs-cesium/Source/ThirdParty/knockout-3.5.1";
import Icon from "../Icon.jsx";
import DropdownStyles from "../Map/Panels/panel.scss";
import Styles from "./table-settings.scss";
import ObserveModelMixin from "../ObserveModelMixin";
import MenuPanel from "../StandardUserInterface/customizable/MenuPanel.jsx";
import { TableColorModes } from "./TableColorModes.jsx";
import { TableTypes } from "./TableTypes.jsx";

const TableViewSettingPanel = createReactClass({
  displayName: "TableViewSettingPanel",
  mixins: [ObserveModelMixin],

  propTypes: {
    terria: PropTypes.object.isRequired,
    allBaseMaps: PropTypes.array,
    viewState: PropTypes.object.isRequired,
    t: PropTypes.func.isRequired
  },
  getInitialState() {
    return {
      preparingExcel: false,
      tableDecimalPlaces: this.props.terria.tableDecimalPlaces
    };
  },

  componentDidMount() {
    this.props.terria._initiateTableDownload = knockout.observable();
  },
  componentWillUnmount() {
    this.props.terria._initiateTableDownload = null;
  },
  selectViewer(viewer, event) {
    event.stopPropagation();
    this.props.terria.tableType = viewer;
    // this.props.terria.persistTableChoice = true;
  },

  onColorModeChanged(mode) {
    this.props.terria.tableColorMode = mode;
    knockout
      .getObservable(this.props.terria, "tableColorMode")
      .valueHasMutated();
    this.props.terria.setLocalProperty("tableViewColorMode", mode);
  },

  render() {
    const { t, terria } = this.props;

    const that = this;
    const tableType = terria.tableType;

    const dropdownTheme = {
      outer: Styles.settingPanel,
      inner: Styles.dropdownInner,
      btn: Styles.btnDropdown,
      icon: "grid"
    };

    const colorModes = Object.values(TableColorModes);

    return (
      <MenuPanel
        id="tableViewSettingsMenuItem"
        theme={dropdownTheme}
        btnTitle={t("tableViewSettingPanel.btnTitle")}
        btnText={t("tableViewSettingPanel.btnText")}
        viewState={this.props.viewState}
        smallScreen={this.props.viewState.useSmallScreenInterface}
      >
        <div className={classNames(Styles.viewer, DropdownStyles.section)}>
          <label className={DropdownStyles.heading}>
            {t("tableViewSettingPanel.tableType")}
          </label>
          <ul className={Styles.viewerSelector}>
            <li key={"gridView"} className={Styles.listItem}>
              <button
                // disabled={!terria.configParameters.tabularViewSettings?.disableVisualizerSwitching}
                onClick={that.selectViewer.bind(this, "grid")}
                className={classNames(Styles.btnTableMode, {
                  [Styles.isActive]: tableType == TableTypes.grid
                })}
              >
                {/* <Icon glyph={Icon.GLYPHS.grid} />  */}
                {t("tableViewSettingPanel.grid")}
              </button>
            </li>
            <li key={"pivotView"} className={Styles.listItem}>
              <button
                // disabled={!terria.configParameters.tabularViewSettings?.disableVisualizerSwitching}
                onClick={that.selectViewer.bind(this, "pivot")}
                className={classNames(Styles.btnTableMode, {
                  [Styles.isActive]: tableType == TableTypes.pivot
                })}
              >
                {/* <Icon glyph={Icon.GLYPHS.pivot} />  */}
                {t("tableViewSettingPanel.pivot")}
              </button>
            </li>
          </ul>
        </div>

        <If
          condition={
            !terria.configParameters.tabularViewSettings?.disableColorModeChange
          }
        >
          <div className={DropdownStyles.section}>
            <label className={DropdownStyles.heading}>
              {t("tableViewSettingPanel.colorMode")}
            </label>

            <div className={Styles.baseColorSelector}>
              {colorModes.map((colorMode, index) => {
                return (
                  <button
                    key={index}
                    onClick={() => this.onColorModeChanged(colorMode)}
                    className={classNames(
                      Styles.btnColorMode,
                      Styles[`${colorMode}Mode`],
                      {
                        [Styles.isActive]:
                          this.props.terria.tableColorMode == colorMode
                      }
                    )}
                  >
                    <Icon
                      glyph={Icon.GLYPHS.grid}
                      style={{
                        display: "block",
                        height: "30px",
                        width: "30px",
                        margin: "6px auto 0 auto"
                      }}
                    />
                    {t(`tableViewSettingPanel.${colorMode}Mode`)}
                  </button>
                );
              })}
            </div>
          </div>
        </If>

        <div className={classNames(Styles.viewer, DropdownStyles.section)}>
          <div className={Styles.decimalPlacesParent}>
            <label
              style={{ flexShrink: 0, marginRight: "5px" }}
              className={DropdownStyles.heading}
            >
              {t("tableViewSettingPanel.decimalPlaces")}
            </label>
            <input
              className={Styles.decimalPlaces}
              key="decimalPlaces"
              type="number"
              placeholder={t("tableViewSettingPanel.decimalPlacesPlaceholder")}
              min={0}
              max={6}
              value={this.state.tableDecimalPlaces}
              onChange={e => {
                let decimalPlaces = Math.min(Math.max(0, e.target.value), 6);

                this.setState(
                  {
                    tableDecimalPlaces: new Number(decimalPlaces)
                  },
                  () =>
                    (this.props.terria.tableDecimalPlaces = this.state.tableDecimalPlaces)
                );
              }}
            />
          </div>
        </div>
      </MenuPanel>
    );
  }
});

module.exports = withTranslation()(TableViewSettingPanel);
