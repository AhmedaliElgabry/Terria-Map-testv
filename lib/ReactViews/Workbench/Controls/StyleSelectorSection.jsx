"use strict";

import defined from "terriajs-cesium/Source/Core/defined";
import React from "react";
import createReactClass from "create-react-class";
import PropTypes from "prop-types";
import ObserveModelMixin from "../../ObserveModelMixin";
import Icon from "./../../Icon.jsx";
import Styles from "./style-selector-section.scss";

const StyleSelectorSection = createReactClass({
  displayName: "StyleSelectorSection",
  mixins: [ObserveModelMixin],

  propTypes: {
    item: PropTypes.object.isRequired
  },
  getInitialState() {
    return {
      styles: [],
      layers: []
    };
  },
  componentWillUnmount() {
    if (defined(this._onDimensionChange)) {
      this._onDimensionChange.dispose();
      this._onDimensionChange = undefined;
    }
  },
  componentDidMount() {
    const item = this.props.item;
    item.onStyleDefaultFound = this.trySetDimensionStyleDefault;

    const styleDefaults = (item.customProperties || {}).styleDefaults;
    const that = this;

    if (item.onDimensionChange) {
      this._onDimensionChange = item.onDimensionChange.subscribe(function(e) {
        that.trySetDimensionStyleDefault(styleDefaults);
      });

      // setTimeout(() => that.trySetDimensionStyleDefault(styleDefaults), 2000);
    }
  },
  trySetDimensionStyleDefault(styleConfigs) {
    const item = this.props.item;

    const layers = (item.layers || "")
      .split(",")
      .map(item => ({ name: item.trim() }));

    const styleDefaults =
      styleConfigs ||
      (item.customProperties && item.customProperties.styleDefaults);
    if (styleDefaults) {
      const selectedDimensionValues = Object.entries(item.dimensions || {}).map(
        dim => `${dim[0]}-${dim[1]}`.toLowerCase()
      );

      for (const layer of layers) {
        const styleDefaultsForLayer = styleDefaults[layer.name];

        if (!styleDefaultsForLayer) continue;

        if (Array.isArray(styleDefaultsForLayer)) {
          const styleForCurrentDimensionValues = styleDefaultsForLayer.find(
            config => {
              const str = Object.entries(config.dimensions).map(dim =>
                `${dim[0]}-${dim[1]}`.toLowerCase()
              );

              return selectedDimensionValues.every(dim => str.includes(dim));
            }
          );

          if (!styleForCurrentDimensionValues) continue;

          this.changeStyle(layer, null, styleForCurrentDimensionValues.style);
          console.info(
            "Current Dimensions: ",
            selectedDimensionValues,
            "Selected default style: ",
            styleForCurrentDimensionValues.style
          );
        } else {
          const keys = Object.keys(styleDefaultsForLayer);

          for (const key of keys) {
            const keyArray = key.toLowerCase().split(",");

            if (!keyArray || keyArray.length === 0) {
              continue;
            }

            if (selectedDimensionValues.every(dim => keyArray.includes(dim))) {
              this.changeStyle(layer, null, styleDefaultsForLayer[key]);
              console.info(
                `Dimensions: ${key} - Style: ${styleDefaultsForLayer[key]} `
              );
            }
          }
        }
      }

      this.forceUpdate();
    }
  },
  changeStyle(layer, event, value) {
    const item = this.props.item;
    const layers = item.layers.split(",");
    const styles = item.styles.split(",");

    const layerIndex = layers.indexOf(layer.name);
    if (layerIndex === -1) {
      // Not a valid layer?  Something went wrong.
      return;
    }

    styles[layerIndex] = value || event.target.value;
    item.styles = styles.join(",");
    item.refresh();
  },

  render() {
    const item = this.props.item;
    const styleDefaults = (item.customProperties || {}).styleDefaults;

    const layersConfigured = Object.keys(styleDefaults || {});

    // This section only makes sense if we have a layer that supports styles.
    if (
      item.disableUserChanges ||
      !defined(item.availableStyles) ||
      !defined(item.styles) ||
      !defined(item.layers) ||
      item.layers.length === 0
    ) {
      return null;
    }

    const layerTitles = item.layerTitles;
    const styles = item.styles.split(",");

    const layers = item.layers.split(",").map((item, i) => ({
      name: item.trim(),
      title: (layerTitles && layerTitles[i]) || item.trim(),
      style: styles[i]
    }));

    return (
      <div className={Styles.styleSelector}>
        {layers
          .filter(layer => !layersConfigured.includes(layer.name))
          .map(this.renderStyleSelectorForLayer)}
      </div>
    );
  },

  renderStyleSelectorForLayer(layer) {
    const item = this.props.item;
    const styles = item.availableStyles[layer.name];
    if (!defined(styles) || styles.length < 2) {
      return null;
    }

    const label =
      item.layers.indexOf(",") >= 0 ? layer.title + " Style" : "Style";

    return (
      <div key={layer.name}>
        <label className={Styles.title} htmlFor={layer.name}>
          {label}
        </label>
        <select
          className={Styles.field}
          name={layer.name}
          value={layer.style}
          onChange={this.changeStyle.bind(this, layer)}
        >
          {styles.map(item => (
            <option key={item.name} value={item.name}>
              {item.title || item.name}
            </option>
          ))}
        </select>
        <Icon glyph={Icon.GLYPHS.opened} />
      </div>
    );
  }
});
module.exports = StyleSelectorSection;
