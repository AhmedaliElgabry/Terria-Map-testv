import React from "react";
import PropTypes from "prop-types";
import { PivotData } from "react-pivottable/Utilities";

export default class CsvExportRenderer extends React.PureComponent {
  render() {
    const pivotData = new PivotData(this.props);
    const rowKeys = pivotData.getRowKeys();
    const colKeys = pivotData.getColKeys();
    if (rowKeys.length === 0) {
      rowKeys.push([]);
    }
    if (colKeys.length === 0) {
      colKeys.push([]);
    }

    const headerRow = pivotData.props.rows.map(r => r);

    if (colKeys.length === 1 && colKeys[0].length === 0) {
      headerRow.push(this.props.aggregatorName);
    } else {
      colKeys.map(c => headerRow.push(`"${c.join("-")}"`));
    }

    const result = rowKeys.map(r => {
      const row = r.map(x => (`${x}`.indexOf(",") > -1 ? `"${x}"` : x));
      colKeys.map(c => {
        const v = pivotData.getAggregator(r, c).value() || "";

        row.push(`${v}`.indexOf(",") > -1 ? `"${v}"` : v);
      });
      return row;
    });

    result.unshift(headerRow);

    return (
      <textarea
        id="terria-pivot-csv-renderer"
        value={result.map(r => r.join(",")).join("\n")}
        style={{
          width: "calc(100vw - 400px)",
          padding: "10px",
          height: "80vh"
        }}
        readOnly={true}
      />
    );
  }
}
