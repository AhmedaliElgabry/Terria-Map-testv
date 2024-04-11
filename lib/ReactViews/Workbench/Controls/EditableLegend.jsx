"use strict";

import React from "react";
import createReactClass from "create-react-class";
import PropTypes from "prop-types";
import Select from 'react-select';
import OberveModelMixin from "../../ObserveModelMixin";
import defined from "terriajs-cesium/Source/Core/defined";
import Styles from "./editable-legend.scss";

import ColorMap from "../../../Map/ColorMap";
import LegendHelper from "../../../Models/LegendHelper";
import Legend from "./Legend";
import MenuPanel from "../../StandardUserInterface/customizable/MenuPanel";

const EditableLegend = createReactClass({
  displayName: "EditableLegend",
  mixins: [OberveModelMixin],

  propTypes: {
    item: PropTypes.object.isRequired,
    colorBins: PropTypes.number,
    colorBinMethod: PropTypes.string,
    ColorMapOrPalette: PropTypes.string,
  },

  getInitialState: function () {
    const item = this.props.item;

    return {
      isOpen: false,
      isPaletteDetailsOpen: false,
      colorBins: item.tableStyle.colorBins,
      colorBinMethod: item.tableStyle.colorBinMethod,
      colorMapOrPalette: ColorMap.toColorString(item.tableStyle.colorMap),
    };
  },

  /* eslint-disable-next-line camelcase */
  UNSAFE_componentWillMount() {
    this.setState({
      colorBins: this.props.colorBins,
      colorBinMethod: this.props.colorBinMethod,
      colorMapOrPalette: ColorMap.toColorString(this.props.colorMap),
    });
  },

  /* eslint-disable-next-line camelcase */
  UNSAFE_componentWillReceiveProps(nextProps) {
    this.setState({
      colorBins: nextProps.colorBins,
      colorBinMethod: nextProps.colorBinMethod,
      colorMapOrPalette: ColorMap.toColorString(nextProps.colorMap),
    });
  },

  changeColorBins(event) {
    // this.props.item.isLoading = true;

    this.setState({
      colorBins: event.target.value,
    });
  },

  changeColorBinMethod(value, action) {
    // this.props.item.isLoading = true;

    this.setState({
      colorBinMethod: value['value'],
    });
  },

  changeColorMapOrPalette(event) {
    // this.props.item.isLoading = true;

    this.setState({
      colorMapOrPalette: event.target.value,
    });
  },

  toggleEdit(event) {
    event.preventDefault();

    this.setState({
      isOpen: !this.state.isOpen
    });
  },

  togglePaletteDetails(event) {
    event.preventDefault();

    this.setState({
      isPaletteDetailsOpen: !this.state.isPaletteDetailsOpen
    });
  },

  openPalette(event) {
    event.preventDefault();

    this.setState({
      isPaletteDetailsOpen: false
    });
    window.open("https://colorbrewer2.org/#type=qualitative&scheme=Set1&n=9");
  },

  updateLegendStyle(e) {
    e.preventDefault();

    const item = this.props.item;
    const activeItem = item._tableStructure.activeItems[0];
    const colorBins = parseInt(this.state.colorBins);
    item.tableStyle.colorBins = colorBins;

    const colorBinMethod = this.state.colorBinMethod;
    item.tableStyle.colorBinMethod = colorBinMethod;

    const colorMapOrPalette = this.state.colorMapOrPalette;
    const isPalette = colorMapOrPalette.includes("-class");

    if (isPalette) {
      const colorBinsOverride = colorMapOrPalette.split("-class")[0];
      item.tableStyle.colorBins = colorBinsOverride;

      // set colorPalette
      ColorMap.loadFromPalette(this.state.colorMapOrPalette).then(function (
        colorMap
      ) {
        item.tableStyle.colorMap = colorMap;
      });
    } else {
      const colorMap = ColorMap.stringToArray(this.state.colorMapOrPalette);
      item.tableStyle.colorMap = colorMap;
    }

    // Deprecated: name parameter
    const legendHelper = new LegendHelper(
      item._tableStructure.activeItems[0],
      item._tableStyle,
    );

    // HACK De-activate only after creating a legend with legendHelper
    // otherwise we will have issue with legend name
    item._tableStructure.activeItems[0].toggleActive();

    item.legendUrls = [legendHelper.legendUrl()];
    // item.isLoading = false;
    item._tableStructure.activeItems[0] = activeItem;
    // HACK Re-activate the item as a hack to reflesh the state
    item._tableStructure.activeItems[0].toggleActive();
  },

  render() {
    const item = this.props.item;
    const toggleText = this.state.isOpen ? "Hide" : "Edit";
    const colorBinMethodOptions = [
      { value: 'auto', label: 'Auto' },
      { value: 'ckmeans', label: 'CK Means' },
      { value: 'quantile', label: 'Quantile' },
      { value: 'none', label: 'None' }
    ];

    const colorBinMethodStyles = {
      menu: (provided, state) => ({
        ...provided,
        color: '#595b60'
      }),
    };

    return (
      <div className={Styles.editableLegend}>
        <div className={Styles.editableHeader}>
          <span className={Styles.editableTitle}>Legend</span>
          <span className={Styles.editableBtn} onClick={this.toggleEdit}>
            {toggleText}
          </span>
        </div>
        {this.state.isOpen ? (
          <form
            className={Styles.legendStyling}
            onSubmit={this.updateLegendStyle}
          >
            <div className={Styles.colorBins}>
              <label className={Styles.colorBinsLabel} htmlFor="colorBins">
                Color Count
              </label>
              <input
                className={Styles.colorBinsField}
                type="number"
                name="colorBins"
                value={this.state.colorBins}
                onChange={this.changeColorBins}
              />
            </div>

            <div className={Styles.colorMethod}>
              <label className={Styles.colorMethodLabel} htmlFor="colorBinMethod">
                Display Method
              </label>
              <Select
                className={Styles.colorMethodField}
                styles={colorBinMethodStyles}
                options={colorBinMethodOptions}
                defaultValue={colorBinMethodOptions[0]}
                onChange={this.changeColorBinMethod}/>
            </div>

            <div className={Styles.colorMapOrPalette}>

              <If condition={this.state.isPaletteDetailsOpen}>
                <ul className={Styles.paletteDetails}>
                  <li>1. Click the button below to generate a palette</li>
                  <li>2. Select palette options</li>
                  <li>3. Copy the resulting palette string e.g. <strong>9-class Set1</strong></li>
                  <button
                    className={Styles.btn}
                    onClick={this.openPalette} >
                    Generate Palette
                  </button>
                </ul>
              </If>

              <label
                className={Styles.colorMapOrPaletteLabel}
                htmlFor="colorMapOrpalette"
              >
                Color Sequence or {" "}
                <span className={Styles.colorPalette} onClick={this.togglePaletteDetails}>Generate Palette</span>
              </label>
              <input
                className={Styles.colorMapOrPaletteField}
                type="text"
                name="colorMapOrPalette"
                value={this.state.colorMapOrPalette}
                onChange={this.changeColorMapOrPalette}
              />
            </div>

            <button type="submit" title="Edit legend" className={Styles.btn}>
              Apply
            </button>
          </form>
        ) : (
          <div></div>
        )}

        <Legend item={item} />
      </div>
    );
  },
});

module.exports = EditableLegend;
