"use strict";

import React from "react";

import createReactClass from "create-react-class";

import PropTypes from "prop-types";
import ko from "terriajs-cesium/Source/ThirdParty/knockout";
import defined from "terriajs-cesium/Source/Core/defined";
import Loader from "../../Loader.jsx";
import ObserveModelMixin from "../../ObserveModelMixin";
import { withTranslation } from "react-i18next";
import Highcharts from "highcharts";
import HC from "highcharts/highcharts-more";
import HighchartsReact from "highcharts-react-official";
import Styles from "./chart-panel.scss";
import darkUnica from "highcharts/themes/dark-unica";
require("highcharts/modules/exporting")(Highcharts);
require("highcharts/modules/export-data")(Highcharts);
require("highcharts/modules/data")(Highcharts);

const HighchartsMixin = {
  componentDidMount() {
    HC(Highcharts);
    darkUnica(Highcharts);
  },

  setHighchartsOptions() {
    Highcharts.setOptions({
      chart: {
        style: {
          fontFamily: '"Open Sans", sans-serif',
          fontSize: "18px"
        }
      },
      tooltip: {
        positioner: function(labelWidth, labelHeight, point) {
          const tooltipX = point.plotX - 50;
          const tooltipY = point.plotY + 30;
          return {
            x: tooltipX,
            y: tooltipY
          };
        }
      },
      navigation: {
        menuStyle: {
          background: "#2e343d", // $chart-dark
          color: "#ffffff !important"
        },
        menuItemHoverStyle: {
          background: "#519ac2",
          color: "#ffffff"
        },
        menuItemStyle: {
          padding: "0.5em 1em",
          color: "#fffff", //
          background: "none",
          fontSize: "11px",
          transition: "background 250ms, color 250ms"
        }
      },
      exporting: {
        allowHTML: true,
        csv: {},
        buttons: {
          contextButton: {
            enabled: true
          },
          exportButton: {
            // Use only the download related menu items from the default
            // context button
            menuClassName: "testin",
            menuItems: ["downloadSVG", "downloadCSV"],
            symbol: "menu"
          }
        }
      }
    });
  }
};

const ChartPanel = createReactClass({
  displayName: "ChartPanel",
  mixins: [ObserveModelMixin, HighchartsMixin],

  propTypes: {
    terria: PropTypes.object.isRequired,
    onHeightChange: PropTypes.func,
    viewState: PropTypes.object.isRequired,
    animationDuration: PropTypes.number,
    t: PropTypes.func.isRequired
  },

  componentDidMount() {
    this.chart = React.createRef();
    this.setHighchartsOptions();
  },
  componentDidUpdate() {
    if (defined(this.props.onHeightChange)) {
      this.props.onHeightChange();
      const chartRef =
        this.chart && this.chart.current && this.chart.current.chart;
      if (chartRef) {
        chartRef.reflow();
      }
    }
  },
  render() {
    const chartableItem = this.props.terria.catalog.chartableItems.find(
      x => x.isCsvForCharting && x.isShown
    );

    let chart;
    if (!this.props.viewState.isChartPanelVisible) {
      return null;
    }

    if (defined(chartableItem)) {
      const highchartsOption = chartableItem.customProperties.highchartsOption;
      chart = (
        <HighchartsReact
          ref={this.chart}
          highcharts={Highcharts}
          options={highchartsOption}
          immutable={true}
        />
      );
    }

    let isLoading =
      chartableItem === undefined ||
      (defined(chartableItem) && chartableItem.isLoading);
    return (
      <If condition={!isLoading}>
        <div className={Styles.holder}>
          <div className={Styles.panel}>
            <div className={Styles.chart}>{chart}</div>
          </div>
        </div>
      </If>
    );
  }
});

module.exports = withTranslation()(ChartPanel);
