"use strict";
import React from "react";
import PropTypes from "prop-types";
import Styles from "./sepal-window.scss";
import moment from "moment";
export class SepalResultMetadata extends React.Component {
  constructor(props) {
    super(props);
    this.state = {};
  }

  getColorBandLabel(band) {
    const size = 15;
    const { value, text, colors } = band;
    const that = this;
    return (
      <span key="colorBands">
        {value.map((val, index) => {
          return (
            <span
              key={val + index}
              className={Styles.colorBandItem}
              style={{
                height: { size } + "px",
                width: "20%",
                backgroundColor: colors[index]
              }}
            >
              {(text && text[index]) || that.capitalize(val)}
            </span>
          );
        })}
      </span>
    );
  }

  capitalize(text) {
    return text.charAt(0).toUpperCase() + text.slice(1);
  }

  render() {
    let parameters = null;
    let colorBands = null;

    if (this.props.mosaicType === "Optical") {
      const sources = `${this.props.opticalOptions.sources.landsat.join(
        ", "
      )} ${this.props.opticalOptions.sources.sentinel.join(", ")}`;

      const corrections = `${this.props.opticalOptions.corrections.join(", ")}`;

      colorBands = this.getColorBandLabel(this.props.opticalOptions.colorBand);

      parameters = (
        <div key="opticalParams" className={Styles.parameters}>
          <p key="area">Area: {this.props.geometryName}</p>
          <p key="sources">Sources: {sources} </p>
          <p key="cloudMasking">
            Cloud Masking: {this.props.opticalOptions.cloudMasking}
          </p>
          <p key="cloudBuffer">
            Cloud Buffer: {this.props.opticalOptions.cloudBuffer}
          </p>
          <p key="corrections">Corrections: {corrections}</p>
          <p key="compose">Compose: {this.props.opticalOptions.compose}</p>
          <p key="seasonStart">
            Season Start:{" "}
            {moment(this.props.dates.seasonStart).format("DD/MM/YYYY")}
          </p>
          <p key="targetDate">
            Target Date:{" "}
            {moment(this.props.dates.targetDate).format("DD/MM/YYYY")}
          </p>
          <p key="seasonEnd">
            Season End:{" "}
            {moment(this.props.dates.seasonEnd).format("DD/MM/YYYY")}
          </p>
          <p key="seasonBefore">
            Seasons: Before = {this.props.dates.yearsBefore} After ={" "}
            {this.props.dates.yearsAfter}
          </p>
        </div>
      );
    } else {
      const orbits = `${this.props.radarOptions.orbits.join(",")}`;

      colorBands = this.getColorBandLabel(this.props.radarOptions.colorBand);

      parameters = (
        <div key="radarParams">
          <p key="area">Area: {this.props.geometryName}</p>
          <p key="orbits">Orbits: {orbits} </p>
          <p key="geometricCorrection">
            Geometric Correction: {this.props.radarOptions.geometricCorrection}
          </p>
          <p key="speckleFilter">
            Speckle Filter: {this.props.radarOptions.speckleFilter}
          </p>
          <p key="outlierRemoval">
            Outlier Removal: {this.props.radarOptions.outlierRemoval}
          </p>
          <p key="targetDate">
            Target Date:{" "}
            {moment(this.props.dates.targetDate).format("DD/MM/YYYY")}
          </p>
        </div>
      );
    }

    return (
      <div key="params" style={{ marginTop: "10px", marginLeft: "5px" }}>
        <If condition={this.props.showDetail}>{parameters}</If>

        {colorBands}
      </div>
    );
  }
}

SepalResultMetadata.propTypes = {
  geometryName: PropTypes.string.isRequired,
  mosaicType: PropTypes.string.isRequired,
  dates: PropTypes.object.isRequired,
  name: PropTypes.string.isRequired,
  showDetail: PropTypes.bool.isRequired,
  radarOptions: PropTypes.object,
  opticalOptions: PropTypes.object
};
