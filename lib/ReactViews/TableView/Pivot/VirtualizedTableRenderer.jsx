/**
 * https://github.com/plotly/react-pivottable/blob/master/src/TableRenderers.jsx
 */
"use strict";

import React, { Component } from "react";
import PropTypes from "prop-types";
import { PivotData, numberFormat } from "react-pivottable/Utilities";
import Handlebars from "handlebars";
import defined from "terriajs-cesium/Source/Core/defined";
import parseCustomHtmlToReact from "../../Custom/parseCustomHtmlToReact";
import Styles from "./virtualized-table.scss";
import classNames from "classnames";
import { spanSize, redColorScaleGenerator } from "./tableRendererUtils";
import { List, AutoSizer } from "react-virtualized";

const hanldebarsHelpers = require("handlebars-helpers")([
  "comparison",
  "number"
]);

function makeRenderer(opts = {}) {
  const numberFormatter = numberFormat({
    digitsAfterDecimal: opts.decimalPlaces
  });

  const { columnStyles, tableRows, fullWidth, alternateBg } = opts;

  class AdvancedTableRenderer extends Component {
    constructor() {
      super();
      this.compiledTemplatesCache = new Map();
      this.columnTemplatesCache = new Map();

      this.state = {};
    }

    componentDidMount() {
      const filters = (this.props.rows || []).reduce((total, aggregate) => {
        total[aggregate] = "";
        return total;
      }, {});

      this.setState({ filters: filters });
    }

    componentDidCatch(err) {
      this.setState({ pivotData: new PivotData(this.props) });
      console.error(err);
      // todo: notify user
    }

    getTemplate(colStyle) {
      let valueTemplate = colStyle.valueTemplate;

      if (typeof valueTemplate == "string") {
        return valueTemplate;
      }

      if (Array.isArray(valueTemplate)) {
        valueTemplate = valueTemplate.join(" ");
      }

      if (defined(valueTemplate.partials)) {
        Object.entries(valueTemplate.partials).forEach(([partial, template]) =>
          Handlebars.registerPartial(partial, template)
        );
      }

      return valueTemplate.template;
    }

    renderTemplate(cacheKey, templateString, data) {
      if (this.compiledTemplatesCache.has(cacheKey)) {
        const template = this.compiledTemplatesCache.get(cacheKey);
        const computed = template(data);

        return parseCustomHtmlToReact(computed);
      }

      const template = Handlebars.compile(templateString);

      this.compiledTemplatesCache.set(cacheKey, template);

      const computed = template(data);

      const renderedComponent = parseCustomHtmlToReact(computed);

      return renderedComponent;
    }

    cellRenderer(field, row, value, config = {}, useCacheTemplates = true) {
      let colStyle = config[field];

      // console.time('cell-render');
      if (!colStyle || !colStyle.valueTemplate) {
        return value;
      }

      let template = "";
      const cacheKey = "pivotViewTemplate_" + field;

      if (useCacheTemplates && this.columnTemplatesCache.has(cacheKey)) {
        template = this.columnTemplatesCache.get(cacheKey);
      } else {
        template = this.getTemplate(colStyle);

        if (useCacheTemplates) {
          this.columnTemplatesCache.set(cacheKey, template);
        }
      }

      try {
        // return value;
        return this.renderTemplate(cacheKey, template, {
          ...row,
          [field]: value
        });
      } catch (error) {
        console.error(error);
        return value;
      }
      //  finally {
      //   console.timeEnd('cell-render');
      // }
    }

    onFilterChange(attribute, value) {
      this.setState({ filters: { ...filters, [attribute]: value } });
    }

    render() {
      const enableFilters = false;

      const pivotData = new PivotData(this.props); //this.state.pivotData;

      const colAttrs = pivotData.props.cols;
      const rowAttrs = pivotData.props.rows;
      const rowKeys = pivotData.getRowKeys();
      const colKeys = pivotData.getColKeys();

      let valueCellColors = () => {};
      let rowTotalColors = () => {};
      let colTotalColors = () => {};

      if (opts.heatmapMode) {
        const colorScaleGenerator = this.props.tableColorScaleGenerator;
        const rowTotalValues = colKeys.map(x =>
          pivotData.getAggregator([], x).value()
        );
        rowTotalColors = colorScaleGenerator(rowTotalValues);
        const colTotalValues = rowKeys.map(x =>
          pivotData.getAggregator(x, []).value()
        );
        colTotalColors = colorScaleGenerator(colTotalValues);

        if (opts.heatmapMode === "full") {
          const allValues = [];
          rowKeys.map(r =>
            colKeys.map(c =>
              allValues.push(pivotData.getAggregator(r, c).value())
            )
          );
          const colorScale = colorScaleGenerator(allValues);
          valueCellColors = (r, c, v) => colorScale(v);
        } else if (opts.heatmapMode === "row") {
          const rowColorScales = {};
          rowKeys.map(r => {
            const rowValues = colKeys.map(x =>
              pivotData.getAggregator(r, x).value()
            );
            rowColorScales[r] = colorScaleGenerator(rowValues);
          });
          valueCellColors = (r, c, v) => rowColorScales[r](v);
        } else if (opts.heatmapMode === "col") {
          const colColorScales = {};
          colKeys.map(c => {
            const colValues = rowKeys.map(x =>
              pivotData.getAggregator(x, c).value()
            );
            colColorScales[c] = colorScaleGenerator(colValues);
          });
          valueCellColors = (r, c, v) => colColorScales[c](v);
        }
      }

      const getClickHandler =
        this.props.tableOptions && this.props.tableOptions.clickCallback
          ? (value, rowValues, colValues) => {
              const filters = {};
              for (const i of Object.keys(colAttrs || {})) {
                const attr = colAttrs[i];
                if (colValues[i] !== null) {
                  filters[attr] = colValues[i];
                }
              }
              for (const i of Object.keys(rowAttrs || {})) {
                const attr = rowAttrs[i];
                if (rowValues[i] !== null) {
                  filters[attr] = rowValues[i];
                }
              }
              return e =>
                this.props.tableOptions.clickCallback(
                  e,
                  value,
                  filters,
                  pivotData
                );
            }
          : null;

      // return <Grid
      //   cellRenderer={cell => this.makeCells(colAttrs, colKeys, rowAttrs, rowKeys, pivotData, getClickHandler, valueCellColors, cell)}
      //   columnWidth={100}
      //   height={1000}
      //   columnCount={colAttrs.length + rowAttrs.length}
      //   rowCount={rowKeys.length}
      //   rowHeight={50}
      //   width={1000}
      // />;

      return (
        <AutoSizer>
          {({ height, width }) => (
            <List
              width={window.innerWidth - 0}
              height={3000}
              rowHeight={40}
              rowCount={rowKeys.length}
              rowRenderer={row =>
                this.rowRenderer(
                  colAttrs,
                  colKeys,
                  rowAttrs,
                  rowKeys,
                  pivotData,
                  getClickHandler,
                  valueCellColors,
                  row
                )
              }
            />
          )}
        </AutoSizer>
      );
    }

    rowRenderer(
      colAttrs,
      colKeys,
      rowAttrs,
      rowKeys,
      pivotData,
      getClickHandler,
      valueCellColors,
      {
        key, // Unique key within array of rows
        index, // Index of row within collection
        isScrolling, // The List is currently being scrolled
        isVisible, // This row is visible within the List (eg it is not an overscanned row)
        style // Style object to be applied to row (to position it)
      }
    ) {
      if (index === 0) {
        return this.getHeaders(key, colAttrs, colKeys, rowAttrs, false, style);
      }

      const offsetStyle = { ...style, top: style.top + 40 };
      // try { style.top += 40; } catch { debugger }

      const rowKey = rowKeys[index];
      const i = index;
      const row = getRow(tableRows, rowAttrs, rowKey) || {};
      const emphasize = row.IsAggregate === "True";

      return (
        <div
          key={key}
          style={offsetStyle}
          className={classNames({
            [Styles.row]: i % 2 === 0 && !emphasize,
            [Styles.altRow]: i % 2 === 1 && !emphasize,
            [Styles.rowEmphasis]: emphasize
          })}
        >
          {this.getRowKeys(
            rowKey,
            rowKeys,
            i,
            emphasize,
            rowAttrs,
            colAttrs,
            row
          )}
          {this.getRowValues(
            colKeys,
            pivotData,
            rowKey,
            rowAttrs,
            i,
            getClickHandler,
            valueCellColors
          )}
        </div>
      );
    }

    makeCells(
      colAttrs,
      colKeys,
      rowAttrs,
      rowKeys,
      pivotData,
      getClickHandler,
      valueCellColors,
      { columnIndex, key, rowIndex, style }
    ) {
      if (rowIndex === 0 && columnIndex === 0) {
        return this.getHeaders(colAttrs, colKeys, rowAttrs);
      }

      const rowKey = rowKeys[rowIndex];
      const i = rowIndex;
      const row = getRow(tableRows, rowAttrs, rowKey) || {};
      const emphasize = row.IsAggregate === "True";

      return (
        <div
          key={`rowKeyRow${i}`}
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "center"
          }}
          className={classNames({
            [Styles.row]: i % 2 === 0 && !emphasize,
            [Styles.altRow]: i % 2 === 1 && !emphasize,
            [Styles.rowEmphasis]: emphasize
          })}
        >
          {this.getRowKeys(
            rowKey,
            rowKeys,
            i,
            emphasize,
            rowAttrs,
            colAttrs,
            row
          )}
          {this.getRowValues(
            colKeys,
            pivotData,
            rowKey,
            rowAttrs,
            i,
            getClickHandler,
            valueCellColors
          )}
        </div>
      );
    }

    getBodyRows(
      colAttrs,
      colKeys,
      rowAttrs,
      rowKeys,
      pivotData,
      getClickHandler,
      valueCellColors
    ) {
      return rowKeys.map((rowKey, i) => {
        const row = getRow(tableRows, rowAttrs, rowKey) || {};
        const emphasize = row.IsAggregate === "True";

        return (
          <div
            key={`rowKeyRow${i}`}
            className={classNames({
              [Styles.row]: i % 2 === 0 && !emphasize,
              [Styles.altRow]: i % 2 === 1 && !emphasize,
              [Styles.rowEmphasis]: emphasize
            })}
          >
            {this.getRowKeys(
              rowKey,
              rowKeys,
              i,
              emphasize,
              rowAttrs,
              colAttrs,
              row
            )}
            {this.getRowValues(
              colKeys,
              pivotData,
              rowKey,
              rowAttrs,
              i,
              getClickHandler,
              valueCellColors
            )}
          </div>
        );
      });
    }

    getRowKeys(rowKey, rowKeys, i, emphasize, rowAttrs, colAttrs, row) {
      return rowKey.map((txt, j) => {
        const x = spanSize(rowKeys, i, j);
        // if (x === -1) {
        //   return null;
        // }
        console.info(txt);
        return (
          <div
            key={`rowKeyLabel${i}-${j}`}
            className={classNames(Styles.cell)}
            rowSpan={x}
            colSpan={j === rowAttrs.length - 1 && colAttrs.length !== 0 ? 2 : 1}
          >
            {this.cellRenderer(rowAttrs[j], row, txt, columnStyles)}
          </div>
        );
      });
    }

    getRowValues(
      colKeys,
      pivotData,
      rowKey,
      rowAttrs,
      i,
      getClickHandler,
      valueCellColors
    ) {
      return colKeys.map((colKey, j) => {
        const aggregator = pivotData.getAggregator(rowKey, colKey);
        const value = aggregator.value();
        const formattedValue = value ? numberFormatter(value) || value : "-";

        const valueFieldName = pivotData.props?.vals?.[0] || "";

        const row =
          getRow(
            tableRows,
            [...rowAttrs, valueFieldName],
            [...rowKey, value]
          ) || {};

        return (
          <div
            className={classNames(Styles.cell, Styles.valueCell)}
            key={`pvtVal${i}-${j}`}
            onClick={getClickHandler && getClickHandler(value, rowKey, colKey)}
            style={{ ...valueCellColors(rowKey, colKey, value) }}
          >
            {this.cellRenderer(
              valueFieldName,
              row,
              formattedValue,
              columnStyles,
              false
            ) || "-"}
          </div>
        );
      });
    }

    getHeaders(key, colAttrs, colKeys, rowAttrs, enableFilters, style) {
      const firstLevel = colAttrs.map((c, j) => {
        return (
          <div key={"header" + j} className={classNames(Styles.headerRow)}>
            {j === 0 && rowAttrs.length !== 0 && (
              <div
                colSpan={rowAttrs.length}
                style={{
                  display: "inline-block",
                  background: "blue",
                  width: `${(colAttrs.length + 1) * 250}px`
                }}
                rowSpan={colAttrs.length}
              />
            )}
            <div
              style={{
                display: "inline-block",
                width: "250px",
                background: "orange",
                textAlign: "right"
              }}
              className={classNames("pvtAxisLabel", Styles.headerCell)}
            >
              {c}
            </div>
            {}
          </div>
        );
      });

      const secondLevel = rowAttrs.length !== 0 && (
        <div className={classNames(Styles.headerRow)}>
          {rowAttrs.map((r, i) => {
            const lastLabelColumn = i === rowAttrs.length - 1; // https://trello.com/c/gqbhbhoQ/133-aquastat-improvements

            return (
              <div
                className={classNames("pvtAxisLabel", Styles.headerCell)}
                key={`rowAttr${i}`}
                colSpan={lastLabelColumn ? 2 : 1}
              >
                {r}
                {enableFilters && (
                  <label>
                    <input
                      onChange={e => this.onFilterChange(e.target.value, r)}
                      type="text"
                      placeholder="Filter"
                      style={{
                        display: "block",
                        border: "lightgray 1px solid",
                        borderRadius: "4px",
                        width: "100%"
                      }}
                    />
                  </label>
                )}
              </div>
            );
          })}
          {this.getPivotHeaderValues(colKeys, 0, colAttrs, rowAttrs)}
        </div>
      );

      return (
        <div
          style={{ ...style, height: "80px" }}
          className={Styles.header}
          key={key}
        >
          {firstLevel}
          {secondLevel}
        </div>
      );
    }

    getPivotHeaderValues(colKeys, j, colAttrs, rowAttrs) {
      return colKeys.map((colKey, i) => {
        const x = spanSize(colKeys, i, j);
        if (x === -1) {
          return null;
        }
        return (
          <div
            style={{
              display: "inline-block",
              width: "250px",
              textAlign: "right"
            }}
            className={classNames("pvtColLabel", Styles.cell)}
            key={`colKey${i}`}
            colSpan={x}
            rowSpan={j === colAttrs.length - 1 && rowAttrs.length !== 0 ? 2 : 1}
          >
            {colKey[j]}
          </div>
        );
      });
    }
  }

  AdvancedTableRenderer.defaultProps = PivotData.defaultProps;
  AdvancedTableRenderer.propTypes = PivotData.propTypes;
  AdvancedTableRenderer.defaultProps.tableColorScaleGenerator = redColorScaleGenerator;
  AdvancedTableRenderer.defaultProps.tableOptions = {};
  AdvancedTableRenderer.propTypes.tableColorScaleGenerator = PropTypes.func;
  AdvancedTableRenderer.propTypes.tableOptions = PropTypes.object;

  return React.memo(AdvancedTableRenderer);
}

export default function getTableRenderers({ terria, dataSource, fullWidth }) {
  const decimalPlaces = terria.tableDecimalPlaces;
  const columnStyles = dataSource.columnStyles;
  const tableRows = dataSource.pivotTableRows;

  return {
    Table: makeRenderer({
      decimalPlaces,
      columnStyles,
      tableRows,
      fullWidth,
      alternateBg: true
    }),
    Heatmap: makeRenderer({
      decimalPlaces,
      columnStyles,
      tableRows,
      heatmapMode: "full",
      fullWidth
    }),
    "Col Heatmap": makeRenderer({
      decimalPlaces,
      columnStyles,
      tableRows,
      heatmapMode: "col",
      fullWidth
    }),
    "Row Heatmap": makeRenderer({
      decimalPlaces,
      columnStyles,
      tableRows,
      heatmapMode: "row",
      fullWidth
    })
  };
}

function getRow(rows, fields, values) {
  const filterObject = [];
  fields.forEach((f, i) => (filterObject[f] = values[i]));
  const row = findInArray(rows, filterObject);
  return row;
}

function findInArray(array, criteria) {
  return array.find(item => {
    return Object.entries(criteria).every(([key, value]) => {
      return item[key] === value;
    });
  });
}
