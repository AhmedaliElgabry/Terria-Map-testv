"use strict";

import defined from "terriajs-cesium/Source/Core/defined";
import React from "react";
import createReactClass from "create-react-class";
import PropTypes from "prop-types";
import ObserveModelMixin from "../../ObserveModelMixin";
import axios from "axios";
import Styles from "./dimension-selector-section.scss";
import csv from "../../../ThirdParty/csv";
import ko from "terriajs-cesium/Source/ThirdParty/knockout";
import { DimensionLabelTranslator } from "../../../Utilities/DimensionLabelTranslator.js";
import Select from "react-select";
import colorStyles from "./ReactSelectorOptions";
import { thresholdFreedmanDiaconis } from "d3-array";

const DimensionSelectorSection = createReactClass({
  displayName: "DimensionSelectorSection",
  mixins: [ObserveModelMixin],
  propTypes: {
    item: PropTypes.object.isRequired,
    terria: PropTypes.object
  },
  getInitialState() {
    return {
      dimensionLabels: null,
      dimensions: []
    };
  },
  setDefaults(item, dimensions, dimensionLabelsConfig, additionalSettings) {
    const containsStory =
      this.props.terria &&
      this.props.terria.configParameters.storyEnabled &&
      this.props.terria.stories &&
      this.props.terria.stories.length;

    if (additionalSettings.styles) {
      item.customProperties.styleDefaults = additionalSettings.styles;
      if (item.onStyleDefaultFound) {
        item.onStyleDefaultFound(additionalSettings.styles);
      }
    }

    // set defaults -- only if there are no stories - we don't want to override dimensions set in the story
    if (containsStory) return;

    item.dimensions = item.dimensions || {};

    if (additionalSettings && additionalSettings.default) {
      for (const dim of dimensions) {
        if (!item.dimensions[dim.name]) {
          item.dimensions[dim.name] =
            additionalSettings.default[dim.name.toLowerCase()] || dim.default;
        }
      }
    } else {
      for (const dim of dimensions) {
        const def = dimensionLabelsConfig
          ? (
              dimensionLabelsConfig.find(
                a => a.key.toLowerCase() === dim.name.toLowerCase()
              ) || {}
            ).default
          : null;

        if (!item.dimensions[dim.name]) {
          item.dimensions[dim.name] = def || dim.default;
        }
      }
    }
  },
  getDimensions(item) {
    const dimensions = [];
    const addDimensionsForLayer = layerName => {
      const layerDimensions = item.availableDimensions
        ? item.availableDimensions[layerName]
        : null;

      if (!layerDimensions) {
        return;
      }

      layerDimensions.forEach(layerDimension => {
        // Don't include the time dimension; it is handled specially
        if (layerDimension.name.toLowerCase() === "time") {
          return;
        }

        // Only use the first dimension we find with each name.
        const existingDimension = dimensions.find(
          dimension => dimension.name === layerDimension.name
        );

        if (!defined(existingDimension)) {
          dimensions.push(layerDimension);
        }
      });
    };

    if (item.layers) {
      item.layers.split(",").forEach(addDimensionsForLayer);
    } else if (item.layer) {
      addDimensionsForLayer(item.layer);
    }

    return dimensions;
  },
  getConfig(item) {
    if (!item.customProperties) return {};

    const customProperties = item.customProperties;

    if (customProperties.dimensionLabelsConfig) {
      const config = customProperties.dimensionLabelsConfig;

      return {
        showDimensionsOnPanel: config.showDimensionsOnPanel,
        dimensionLabelsConfig: config.dimensionLabels,
        dimensionsJsonStatUrl: config.dimensionsJsonStatUrl
      };
    } else if (
      customProperties.dimensionsJsonStatUrl ||
      customProperties.dimensionLabels
    ) {
      // for backward compatibility
      return {
        showDimensionsOnPanel: customProperties.showDimensionsOnPanel,
        dimensionLabelsConfig: customProperties.dimensionLabels,
        dimensionsJsonStatUrl: customProperties.dimensionsJsonStatUrl
      };
    } else return {};
  },
  async getTranslationFromJsonstatAsync(
    item,
    dimensions,
    dimensionsJsonStatUrl,
    dimensionLabelsConfig
  ) {
    let dimensionLabels = (await axios.get(dimensionsJsonStatUrl, {
      headers: { accept: "text/plain" }
    })).data;

    if (typeof dimensionLabels === "string") {
      dimensionLabels = JSON.parse(dimensionLabels);
    }

    this.dimensionTranslator = new DimensionLabelTranslator(
      dimensionLabels,
      "jsonstat"
    );

    const additionalSettings = this.dimensionTranslator.getMetadata();
    this.additionalSettings = additionalSettings;

    if (additionalSettings.dimensionOrder) {
      dimensions.forEach(dim => {
        dim.order = additionalSettings.dimensionOrder[dim.name.toLowerCase()];
      });

      dimensions.sort((a, b) => (a.order < b.order ? -1 : 1));
    }

    this.setDefaults(
      item,
      dimensions,
      dimensionLabelsConfig,
      additionalSettings
    );

    return dimensionLabels;
  },
  /**
   * if dimension translation is provided as a csv
     DEPRECATED. only exists for backwards compatibility
   */
  async getTranslationFromCsvAsync(item, dimensions, dimensionLabelsConfig) {
    const promises = dimensionLabelsConfig
      .filter(def => def.url)
      .map(def => axios(def.url));

    const data = await axios.all(promises).catch(() => {
      console.error("An error occured while fetching dimension labels");
    });

    const dimensionLabels = (data || []).map((response, index) => {
      const json = csv.toArrays(response.data);
      const key = dimensionLabelsConfig[index].key;
      return { key: key.toLowerCase(), translation: json };
    });

    this.dimensionTranslator = new DimensionLabelTranslator(
      dimensionLabels,
      "csv"
    );

    this.setDefaults(item, dimensions, dimensionLabelsConfig);

    return dimensionLabels;
  },
  // initialize can be triggered either by the isLoading property on the catalog item
  // or when the dimensions are fetched and loaded on to the catalog item.
  // the deciding factor is the catalog item type. if wms, then the first, if csw-resource, then the second
  // we need to handle both because csw-resource might set isLoading == false before the dimensions are loaded which prematurely triggers
  // this component. If this component don't find dimensions in the catalog item, it hides without showing anything
  async initializeAsync(item) {
    let initialized = false;

    const dimensions = this.getDimensions(item);

    const { dimensionsJsonStatUrl, dimensionLabelsConfig } = this.getConfig(
      item
    );

    let dimensionLabels = [];

    try {
      if (dimensionsJsonStatUrl) {
        dimensionLabels = await this.getTranslationFromJsonstatAsync(
          item,
          dimensions,
          dimensionsJsonStatUrl,
          dimensionLabelsConfig
        );
      } else {
        this.dimensionTranslator = new DimensionLabelTranslator(
          null,
          "default"
        );
      }

      initialized = true;
    } catch (err) {
      this.dimensionTranslator = new DimensionLabelTranslator(null, "default");
      console.error("Unable to load dimension translations", err);
    }

    // if (typeof item.refresh === "function" && item.needsRefresh) {
    //   item.refresh();
    // } //Why is it here ?

    this.notifyDimensionChange();

    this.setState({ dimensions, dimensionLabels, initialized });
  },
  async componentDidMount() {
    const that = this;
    const item = this.props.item;

    item.onDimensionsLoaded =
      item.onDimensionsLoaded ||
      ko.observable("onDimensionsLoaded").extend({ notify: "always" });

    item.onDimensionChange =
      item.onDimensionChange ||
      ko.observable("onDimensionChange").extend({ notify: "always" });

    this._onDimensionsLoadedSubscription = item.onDimensionsLoaded.subscribe(
      async () => {
        /**
         * listens for when available dimensions are loaded and assigned to the cataog item
         */
        if (!that.state.dimensions || !that.state.dimensions.length) {
          await that.initializeAsync(
            item,
            "dimensions done loading and triggered"
          );
        }
      }
    );

    this._onDimensionsChanged = null;

    const dimensionsObservable = ko.getObservable(item, "dimensions");

    if (dimensionsObservable) {
      this._onDimensionsChanged = dimensionsObservable.subscribe(function() {
        that.setState({ currentSelection: item.dimensions });
        if (typeof item.refresh === "function") {
          item.refresh();
        }
      });
    }

    if (item.isLoading) {
      this._isLoadingObservable = ko
        .getObservable(item, "isLoading")
        .subscribe(async function() {
          // triggers only when catalog item is done loading and availableDimension is available
          await that.initializeAsync(item, "done loading after waiting");
        });
    } else {
      await this.initializeAsync(item, "done loading line 282");
    }
  },
  componentWillUnmount() {
    if (this._isLoadingObservable) {
      this._isLoadingObservable.dispose();
      this._isLoadingObservable = null;
    }

    if (this._onDimensionsChanged) {
      this._onDimensionsChanged.dispose();
      this._onDimensionsChanged = null;
    }

    if (this._onDimensionsLoadedSubscription) {
      this._onDimensionsLoadedSubscription.dispose();
      this._onDimensionsLoadedSubscription = null;
    }
  },
  changeDimension(dimension, value) {
    const { item } = this.props;
    const dimensions = { ...(item.dimensions || {}) };
    const dimensionLabels = item.dimensionLabels || {};
    // const target = value.target;

    if (value) {
      const shouldSort = item.sortMultipleDimensionValues;

      let dimensionValue = "";
      /**
       * Sorting filter values to make it easier on any caching system
       */
      if (Array.isArray(value)) {
        if (shouldSort) {
          dimensionValue = value
            .map(v => v.value)
            .sort()
            .join(",");
        } else {
          dimensionValue = value.map(v => v.value).join(",");
        }
      } else {
        dimensionValue = value.value;
      }

      dimensions[dimension.name] = dimensionValue;

      if (value.text) {
        dimensionLabels[dimension.name] = value.text;
      }

      // https://trello.com/c/zAnVzD4X/106-wms-dimensions-disabling-values
      // Check if there are invalid combinations of dimension values
      for (let dim in dimensions) {
        if (dim == dimension.name) continue;

        const isInvalid = this.isValueInvalidForDimension(dim, dimensions[dim]);
        if (isInvalid) {
          dimensions[dim] = this.additionalSettings?.default?.[
            dim.toLowerCase()
          ];
          dimensionLabels[dim] = "";
        }
      }
    } else {
      dimensions[dimension.name] =
        this.additionalSettings?.default?.[dimension.name] ||
        dimension.default ||
        "";
      dimensionLabels[dimension.name] =
        this.additionalSettings?.default?.[dimension.name] ||
        dimension.default ||
        "";
    }

    item.dimensions = dimensions;
    item.dimensionLabels = dimensionLabels;
    if (typeof item.refresh === "function") {
      item.refresh();
    }

    if (item.type == "wmts") {
      item.legendUrls = item._getLegendUrls();
    }

    this.notifyDimensionChange();

    this.setState({ currentSelection: dimensions });
  },
  // https://trello.com/c/zAnVzD4X/106-wms-dimensions-disabling-values
  // Check if the value is valid for this dimension given the present value of the other dimensions
  isValueInvalidForDimension(currentDimensionName, valueToCheck) {
    const { item } = this.props;
    const exclusions = this.additionalSettings?.exclusions;
    let currentExclusions;

    if (
      exclusions &&
      currentDimensionName &&
      (currentExclusions = exclusions[currentDimensionName.toLowerCase()]) &&
      Array.isArray(currentExclusions)
    ) {
      let isInvalid = false;

      for (const exclusion of currentExclusions) {
        const ruleDimension = exclusion.dimension;

        if (!defined(ruleDimension)) {
          continue;
        }

        const currentValue = item.dimensions[ruleDimension.toUpperCase()];

        if (!defined(currentValue)) {
          continue;
        }

        const allowedValues = exclusion.rules?.find(
          a =>
            a.for == currentValue ||
            (Array.isArray(a.for) && a.for.includes(currentValue))
        )?.valuesAllowed;

        if (
          !isInvalid &&
          defined(allowedValues) &&
          Array.isArray(allowedValues)
        ) {
          isInvalid = allowedValues.indexOf(valueToCheck) == -1;
        }
      }

      return isInvalid;
    }

    return false;
  },
  notifyDimensionChange() {
    const item = this.props.item;
    if (item.onDimensionChange) {
      item.onDimensionChange.valueHasMutated();
    }
  },
  render() {
    const item = this.props.item;

    if (
      item.disableUserChanges ||
      !defined(item.availableDimensions) ||
      !(defined(item.layers) || defined(item.layer))
    ) {
      return null;
    }

    const dimensions = this.state.dimensions;

    return (
      <div className={Styles.dimensionSelector}>
        {dimensions.map(dimension => this.renderDimensionSelector(dimension))}
      </div>
    );
  },
  selectorFilter({ value, data }, str) {
    const text = data.text.toLowerCase();

    str = str.toLowerCase();

    return (
      text.includes(str) ||
      str.includes(text) ||
      value.includes(str) ||
      str.includes(value)
    );
  },
  isMultiSelectAllowed(item, dimension) {
    const additionalSettings = this.additionalSettings;

    if (
      additionalSettings &&
      Array.isArray(additionalSettings.multiselectDimensions)
    ) {
      const dimKey = (dimension.name ?? "").toLowerCase();
      return additionalSettings.multiselectDimensions
        .map(a => a.toLowerCase())
        .includes(dimKey);
    }

    return item.supportMultipleDimensionValues;
  },
  renderDimensionSelector(dimension) {
    const dimensionValues = dimension.options;
    const item = this.props.item;

    const selectedDimensions = item.dimensions || {};

    let currentDimensionValue =
      selectedDimensions[dimension.name] ||
      this.additionalSettings?.default?.[dimension.name?.toLowerCase()] ||
      dimension.default ||
      "";

    if (
      currentDimensionValue.includes(",") &&
      item.supportMultipleDimensionValues
    ) {
      // if we're supporting multiple values for each dimension
      currentDimensionValue = currentDimensionValue
        .split(",")
        .map(val => val.trim());
    }

    const dimensionName = this.dimensionTranslator.transateDimensionName(
      dimension.name
    );

    let title =
      dimensionName.length > 0
        ? dimensionName.charAt(0).toUpperCase() + dimensionName.slice(1)
        : "";

    if (dimension.unitSymbol) {
      title += "(" + dimension.unitSymbol + ")";
    }

    const translated = this.dimensionTranslator.translate(
      dimension.name,
      dimensionValues
    );

    const options =
      translated && translated.length
        ? translated.map((dim, index) => ({
            value: dim.value,
            text: dim.label,
            label: (
              <label
                key={index + "dimOptions"}
                style={{
                  display: "inline-block",
                  width: "100%",
                  cursor: "inherit"
                }}
                title={dim.description}
              >
                {dim.label}
              </label>
            )
          }))
        : dimensionValues.map((dim, index) => ({
            value: dim,
            text: dim,
            label: (
              <label
                key={index + "dimOptions"}
                style={{
                  display: "inline-block",
                  width: "100%",
                  cursor: "pointer"
                }}
                title={dim}
              >
                {dim}
              </label>
            )
          }));

    const selectedValue = Array.isArray(currentDimensionValue)
      ? options.filter(a => currentDimensionValue.includes(a.value))
      : options.find(a => a.value === currentDimensionValue);

    const select = (
      <Select
        defaultMenuIsOpen={false}
        value={selectedValue}
        filterOption={this.selectorFilter}
        delimiter={","}
        isClearable={this.isMultiSelectAllowed(
          item,
          dimension
        )} /* Clearable only if multiselect is enabled */
        closeMenuOnSelect={!item.supportMultipleDimensionValues}
        isMulti={this.isMultiSelectAllowed(item, dimension)}
        // defaultValue={selectedValue}
        onChange={this.changeDimension.bind(this, dimension)}
        isOptionDisabled={option =>
          this.isValueInvalidForDimension(dimension.name, option.value)
        }
        className={Styles.dropdown}
        options={options}
        styles={colorStyles}
      />
    );

    return (
      <div key={dimension.name}>
        <label className={Styles.title} htmlFor={dimension.name}>
          {title}
        </label>
        {select}
      </div>
    );
  }
});

module.exports = DimensionSelectorSection;
