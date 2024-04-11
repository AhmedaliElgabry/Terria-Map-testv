"use strict";

import React from "react";
import createReactClass from "create-react-class";
import PropTypes from "prop-types";
import classNames from "classnames";
import ObserveModelMixin from "../../ObserveModelMixin";
import MenuPanel from "../../StandardUserInterface/customizable/MenuPanel.jsx";
import Icon from "../../Icon.jsx";
import { withTranslation } from "react-i18next";
import { exportToCsv, exportToExcel } from "./gridExportUtils";
import Styles from "../../Map/Panels/setting-panel.scss";
import DropdownStyles from "../../Map/Panels/panel.scss";
import GridStyle from "./terria-grid.scss";
import Loader from "../../Loader";

const GridSettingsPanel = createReactClass({
  displayName: "GridSettingsPanel",
  mixins: [ObserveModelMixin],

  propTypes: {
    terria: PropTypes.object.isRequired,
    viewState: PropTypes.object.isRequired,
    filters: PropTypes.object.isRequired,
    columns: PropTypes.array.isRequired,
    useColor: PropTypes.bool.isRequired,
    t: PropTypes.func.isRequired
  },

  getInitialState() {
    return {
      preparingExcel: false
    };
  },

  selectViewer(viewer, event) {
    event.stopPropagation();
    this.props.terria.tableType = viewer;
  },

  render() {
    const { t, useColor, setUseColor } = this.props;

    const dropdownTheme = {
      outer: Styles.settingPanel,
      inner: Styles.dropdownInner,
      btn: Styles.btnDropdown,
      icon: "menuDotted"
    };

    return (
      <MenuPanel
        theme={dropdownTheme}
        btnTitle={t("settingPanel.btnTitle")}
        viewState={this.props.viewState}
        smallScreen={this.props.viewState.useSmallScreenInterface}
        addedOffset={10}
      >
        <div className={classNames(Styles.viewer, DropdownStyles.section)}>
          <label className={DropdownStyles.heading}>
            {t("tableView.gridSetting")}
          </label>
          <ul className={Styles.viewerSelector}>
            <li className={Styles.listItem}>
              <button
                className={classNames(Styles.btnViewer, {
                  [Styles.isActive]: this.props.useColor
                })}
                onClick={() => setUseColor(!useColor)}
              >
                {t("tableView.toggleColors")}
              </button>
            </li>
          </ul>

          <fieldset className={GridStyle.downloadContainer}>
            <legend>
              {" "}
              <Icon glyph={Icon.GLYPHS.download} />
              Download
            </legend>

            <div>
              {this.state.preparingExcel && (
                <Loader message={"Preparing Download..."} />
              )}

              {!this.state.preparingExcel && (
                <div>
                  <button
                    aria-label="Download Excel"
                    title="Excel"
                    onClick={() => {
                      this.setState({ preparingExcel: true });

                      exportToExcel(
                        this.props.processedRows,
                        this.props.source,
                        this.props.columns,
                        this.props.filters,
                        this.props.terria,
                        this.props.viewState
                      ).finally(() => this.setState({ preparingExcel: false }));
                    }}
                    className={classNames(GridStyle.download)}
                  >
                    <Icon glyph={Icon.GLYPHS.excel} /> Excel
                  </button>

                  <button
                    aria-label="Download CSV"
                    title="CSV"
                    onClick={() =>
                      exportToCsv(
                        this.props.processedRows,
                        this.props.source.name
                      )
                    }
                    className={classNames(GridStyle.download)}
                  >
                    <Icon glyph={Icon.GLYPHS.csv} /> CSV
                  </button>
                </div>
              )}
            </div>
          </fieldset>
        </div>
      </MenuPanel>
    );
  }
});

module.exports = withTranslation()(GridSettingsPanel);
