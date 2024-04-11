"use strict";
import React from "react";
import PropTypes from "prop-types";
import createReactClass from "create-react-class";
import defined from "terriajs-cesium/Source/Core/defined";
import loadText from "../../../../../Core/loadText";
import when from "terriajs-cesium/Source/ThirdParty/when";
import ChartData from "../../../../../Charts/ChartData";
import ChartRenderer from "../../../../../Charts/ChartRenderer";
import proxyCatalogItemUrl from "../../../../../Models/proxyCatalogItemUrl";
import TableStructure from "../../../../../Map/TableStructure";
import VarType from "../../../../../Map/VarType";
import Highcharts from "highcharts-more-node";
import HighchartsBoost from "highcharts/modules/boost";
import HighchartsReact from "highcharts-react-official";
import Styles from "../chart.scss";

const defaultHeight = 200;
const defaultColor = "#eee"; // Allows the line color to be set by the css, esp. in the feature info panel.

const HighchartRenderer = createReactClass({
  propTypes: {
    domain: PropTypes.object,
    // A presentation mode, one of:
    //   "feature-info": makes a "mini-chart" with no grid, less space, for use in a feature info window
    //   "histogram": a bit less space
    //   undefined: default styling
    styling: PropTypes.string, // nothing, 'feature-info' or 'histogram' -- TODO: improve
    height: PropTypes.number,
    axisLabel: PropTypes.object,
    catalogItem: PropTypes.object,
    transitionDuration: PropTypes.number,
    highlightX: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    updateCounter: PropTypes.any, // Change this to trigger an update.
    pollSeconds: PropTypes.any, // This is not used by Chart. It is used internally by registerCustomComponentTypes.

    // You can provide the data directly via props.data (ChartData[]):
    data: PropTypes.array,
    // chartType: PropTypes.object, // TODO clarify. ChartData has its own 'type' which can be bar, line, etc.

    // Or, provide a URL to the data, along with optional xColumn, yColumns, colors
    url: PropTypes.string,
    xColumn: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    yColumns: PropTypes.array,
    colors: PropTypes.array,
    pollUrl: PropTypes.string,

    // Or, provide a tableStructure directly.
    tableStructure: PropTypes.object
  },
  getColumnStyle(name) {
    const option = (this.props.catalogItem.customProperties || {})
      .highchartsOption;
    if (option) {
      return option.series.find(a => a.name == name);
    }
  },
  componentDidMount() {
    const promise = this.getChartDataPromise(
      this.props.data,
      this.props.url,
      this.props.catalogItem
    );
    const option = this.defaultHighchartsOption;

    promise.then(
      tableStructure => {
        const xCol = tableStructure.columns.find(
          a => a.name === this.props.xColumn
        );
        if (xCol) {
          option.xAxis.categories = xCol.values;
          option.xAxis.type = "datetime";
        }

        if (this.props.yColumns) {
          option.series = tableStructure.columns
            .filter(
              a => a.type == 4 && this.props.yColumns.indexOf(a.name) !== -1
            ) //4 is scalar
            .map(a => {
              const colOption = this.getColumnStyle(a.name) || {
                type: "spline"
              };
              return {
                color: colOption.color,
                name: a.name,
                type: colOption.type,
                data: a.values
              };
            });
        }
        this.setState({});
      },
      err => {
        console.error(err);
      }
    );
  },
  getChartDataPromise(data, url, catalogItem) {
    // Returns a promise that resolves to an array of ChartData.
    const that = this;
    if (defined(data)) {
      // Nothing to do - the data was provided (either as props.data or props.tableStructure).
      return when(data);
    } else if (defined(url)) {
      return loadIntoTableStructure(catalogItem, url);
    }
  },
  defaultHighchartsOption: {
    chart: {
      height: `${defaultHeight}px`,
      type: "line",
      backgroundColor: "transparent",
      zoomType: "x"
    },
    credits: { enabled: false },
    title: {
      text: ""
    },
    legend: {
      enabled: false
    },
    yAxis: { visible: false },
    xAxis: {
      categories: [],
      labels: {
        enabled: false
      }
    },
    plotOptions: {
      series: {
        pointPadding: 0.05,
        groupPadding: 0,
        turboThreshold: 10000
      }
    },
    series: []
  },
  render() {
    const chart = this.defaultHighchartsOption.series.length ? (
      <HighchartsReact
        highcharts={Highcharts}
        options={this.defaultHighchartsOption}
        immutable={true}
      />
    ) : (
      ""
    );
    return (
      <div>
        {this.defaultHighchartsOption.series.length}
        {chart}
      </div>
    );
  }
});

/**
 * Loads data from a URL into a table structure.
 * @param  {String} url The URL.
 * @return {Promise} A promise which resolves to a table structure.
 */
function loadIntoTableStructure(catalogItem, url) {
  if (defined(catalogItem) && defined(catalogItem.loadIntoTableStructure)) {
    return catalogItem.loadIntoTableStructure(url);
  }
  // As a fallback, try to load in the data file as csv.
  const tableStructure = new TableStructure("feature info");
  url = proxyCatalogItemUrl(catalogItem, url, "0d");
  return loadText(url).then(tableStructure.loadFromCsv.bind(tableStructure));
}

module.exports = HighchartRenderer;
