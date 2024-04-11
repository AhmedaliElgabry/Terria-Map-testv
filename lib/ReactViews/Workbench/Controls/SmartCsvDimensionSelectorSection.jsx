"use strict";

import defined from "terriajs-cesium/Source/Core/defined";
import React from "react";
import createReactClass from "create-react-class";
import PropTypes from "prop-types";
import ObserveModelMixin from "../../ObserveModelMixin";
import Styles from "./smart-dimension-selector-section.scss";
import ko from "terriajs-cesium/Source/ThirdParty/knockout";
import Select from "react-select";
import DatePicker from "react-datepicker";
import moment from "moment";
import "react-dropdown-tree-select/dist/styles.css";
import "!!style-loader!css-loader?sourceMap!./tree-selector.css";
import DropdownTreeSelect from "react-dropdown-tree-select";
import { withTranslation } from "react-i18next";
import { listToTree } from "./listToTree";

const shiftBack = data => {
  // hierarchies are represented by increasing margin-left and padding-left
  // this reverses that effect when a nested value is selected
  // should result in marginLeft being 0
  const marginLeft = Number(
    (data?.label?.props?.style?.marginLeft || "0").replace("px", "")
  );
  const paddingLeft = Number(
    (data?.label?.props?.style?.paddingLeft || "0").replace("px", "")
  );

  const newMarginLeft = 0 - marginLeft - paddingLeft + "px";

  // if(data?.label?.props?.style) {
  //   data.label.props.style.paddingLeft = '2px';
  //   data.label.props.style.marginLeft = '2px';
  // }

  return {
    marginLeft: newMarginLeft
  };
};

const reactSelectStyles = {
  control: styles => ({
    ...styles,
    backgroundColor: "white",
    boxShadow: "none"
  }),
  option: (styles, { isDisabled, isSelected, label }) => {
    const style = {
      ...styles,
      backgroundColor: isSelected ? "#4783c6" : "white",
      color: isSelected ? "white" : "black"
      // cursor: isDisabled ? "not-allowed" : "default"
    };

    if (isDisabled) {
      style.color = "gray";
    }

    return style;
  },
  multiValue: (provided, { data }) => {
    return { ...provided, borderColor: "#3f4854", ...shiftBack(data) };
  },
  multiValueRemove: (provided, state) => {
    return { ...provided, color: "#3f4854" };
  },
  singleValue: (styles, { data }) => ({ ...styles, ...shiftBack(data) })
};

const SmartCsvDimensionSelectorSection = createReactClass({
  displayName: "SmartCsvDimensionSelectorSection",
  mixins: [ObserveModelMixin],
  propTypes: {
    item: PropTypes.object.isRequired,
    terria: PropTypes.object,
    viewState: PropTypes.object
  },
  getInitialState() {
    return {
      Selection: null,
      Dimensions: null
    };
  },
  setInitialValues(item) {
    const selection = {
      ...(item.defaultParameters || {}),
      ...(this.state.Selection || {}), // in case initialState is set
      ...(item.Selection || {}) // in case the item has selection property pre-populated because it was a shared catalog item
    };

    this.setState({ Selection: selection });

    item.Selection = selection;
  },
  async initialize(item) {
    if (item.isLoading || !item.onInitialized || !item.SmartCsvDimensions) {
      item.initRetryCount = item.initRetryCount || 0;
      // if it cannot be initialized, then retry
      if (item.initRetryCount < 3) {
        setTimeout(() => this.initialize(item), 2000);
        item.initRetryCount += 1;
      }
      return;
    }

    const action = () => {
      try {
        if (this.initialized) {
          return;
        }

        this.initialized = true;

        // if (
        //   item.Selection &&
        //   Object.keys(item.Selection).length > 0 &&
        //   item.needsRefresh
        // ) {
        //   // If this item is shared, then selection might already be populated with values.
        //   this.notifyDimensionChange();
        // }

        this.setInitialValues(item);

        this.setState({ Dimensions: item.SmartCsvDimensions.Dimensions });
      } catch (err) {
        console.error(err);
        this.notifyUser(
          "Error loading smart-csv schema",
          "Please contact site administrators"
        );
      }
    };

    this.onInitSubscription = item.onInitialized.subscribe(action);
    action();
  },
  notifyUser(title, message) {
    this.props.viewState.notifications.push({
      title: title,
      message: message,
      width: 300
    });
  },
  async componentDidMount() {
    const item = this.props.item;
    const that = this;

    this.onDimensionChangeSubscription = this.props.item.onSmartCsvDimensionChange.subscribe(
      async function(res) {
        that.setInitialValues(item);
        that.notifyDimensionChange();
      }
    );

    if (item.isLoading || !defined(item.tableStructure)) {
      this.isLoadingObservable = ko
        .getObservable(item, "isLoading")
        .subscribe(async function() {
          if (!item.isLoading) {
            await that.initialize(item);
            item.needsRefresh = false;
          }
        });
    } else {
      await this.initialize(item);
      item.needsRefresh = false;
    }
  },
  componentWillUnmount() {
    if (this.isLoadingObservable) {
      this.isLoadingObservable.dispose();
      this.isLoadingObservable = null;
    }

    if (this.onSmartCsvDimensionChange) {
      this.onSmartCsvDimensionChange.dispose();
    }

    if (this.onInitSubscription) {
      this.onInitSubscription.dispose();
      this.onInitSubscription = null;
    }

    if (this.onDimensionChangeSubscription) {
      this.onDimensionChangeSubscription.dispose();
      this.onDimensionChangeSubscription = null;
    }
  },
  changeDimension(dimension, value, setState = true) {
    const { item } = this.props;
    const selection = { ...(item.Selection || {}) };

    /**
     * Sorting filter values to make it easier on any caching system.
     */
    if (value) {
      const shouldSort = true;
      let filterValue = "";
      if (Array.isArray(value)) {
        if (shouldSort) {
          filterValue = value
            .map(v => v.value)
            .sort()
            .join(",");
        } else {
          filterValue = value.map(v => v.value).join(",");
        }
      } else {
        filterValue = value.value;
      }

      selection[dimension.Id] = filterValue;
    } else {
      selection[dimension.Id] =
        (item.defaultParameters || {})[dimension.Id] || "";
    }

    item.Selection = selection;
    if (typeof item.refresh === "function") item.refresh();

    if (setState) {
      this.setState({ Selection: selection });
    }

    this.notifyDimensionChange();
  },
  notifyDimensionChange() {
    const item = this.props.item;
    if (item.onSmartCsvDimensionChanged) {
      item.onSmartCsvDimensionChanged();
    }
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
  render() {
    const item = this.props.item;
    const Dimensions = this.state.Dimensions;
    // This section only makes sense if we have a layer that has dimensions.
    if (item.disableUserChanges || !defined(Dimensions)) {
      return null;
    }

    return (
      <div className={Styles.dimensionSelector}>
        {Dimensions.map(dimension => {
          const dimensionName = dimension.Label;
          const title =
            dimensionName.length > 0
              ? dimensionName.charAt(0).toUpperCase() + dimensionName.slice(1)
              : "";
          return this.renderDimension(item, dimension, title);
        })}
      </div>
    );
  },
  renderDimension(item, dimension, title) {
    if (dimension.type === "time") {
      return this.renderDateSelector(item, dimension, title);
    } else {
      if (dimension.Values.some(dim => dim.children && dim.children.length)) {
        return this.renderTree(item, dimension, title);
      }

      return this.renderDropdown(item, dimension, title);
    }
  },
  renderDateSelector(item, dimension, title) {
    const selection = this.state.Selection || {};
    let value = selection[dimension.Id] || dimension.default || "";

    if (value == "currentDate") {
      value = moment();
    }

    return (
      <div key={dimension.Id}>
        <label className={Styles.title} htmlFor={dimension.Id}>
          {title}
        </label>
        <div className={Styles.datePickerContainer}>
          <DatePicker
            id={dimension.Id}
            title={item.isLoading ? "Loading" : ""}
            selected={value ? moment(value) : null}
            type="date"
            className={Styles.filterDatePicker}
            calendarClassName={Styles.calendar}
            dateFormat="DD/MM/YYYY"
            disabled={item.disableFiltersWhileLoading && item.isLoading}
            onChange={e => {
              this.changeDimension(dimension, {
                value: e.format("YYYY-MM-DD")
              });
            }}
            showMonthDropdown
            showYearDropdown
          />
        </div>
      </div>
    );
  },
  isMultiSelectAllowed(item, dimension) {
    const additionalSettings = item._additionalSettings;

    if (
      additionalSettings &&
      Array.isArray(additionalSettings.multiselectDimensions)
    ) {
      return additionalSettings.multiselectDimensions.includes(dimension.Id);
    }

    return item.supportMultipleFilterValues;
  },
  renderTree(item, dimension, title) {
    const { t } = this.props;
    const additionalSettings = item._additionalSettings;
    const dimensionValues = dimension.Values;
    let defaultValues =
      additionalSettings["default"]?.[dimension.Id] || dimension.default || "";

    if (item.supportMultipleFilterValues) {
      defaultValues = defaultValues.split(",").map(val => val.trim());
    }

    const options = dimensionValues
      .filter(a => a.visible)
      .map(dim => ({
        value: dim.value,
        label: dim.label,
        expanded: false,
        checked: false,
        children: [],
        isDefaultValue: defaultValues.includes(dim.value),
        childrenId: dim.children
      }));

    const data = listToTree(options);

    if (dimension.unitSymbol) {
      title += "(" + dimension.unitSymbol + ")";
    }

    return (
      <div key={dimension.Id}>
        <label className={Styles.title} htmlFor={dimension.Id}>
          {title}
        </label>

        <DropdownTreeSelect
          keepTreeOnSearch={true}
          keepChildrenOnSearch={true}
          texts={{ placeholder: t("smartCsvSelector.select") + ` ${title}` }}
          showPartiallySelected={true}
          mode={
            this.isMultiSelectAllowed(item, dimension)
              ? "multiSelect"
              : "simpleSelect"
          }
          inlineSearchInput={false}
          onChange={(currentNode, selectedNodes) => {
            this.changeDimension(dimension, selectedNodes, false);
          }}
          className={Styles.treeDropdown}
          data={data}
        />
      </div>
    );
  },
  renderDropdown(item, dimension, title) {
    const additionalSettings = item._additionalSettings;
    const dimensionValues = dimension.Values;
    const selection = this.state.Selection || {};

    let filterValue = selection[dimension.Id] || dimension.default || "";

    if (filterValue.includes(",") && item.supportMultipleFilterValues) {
      filterValue = filterValue.split(",").map(val => val.trim());
    }

    let options = dimensionValues
      .filter(a => a.visible && !a.isChild)
      .map(dim => ({
        value: dim.value,
        text: dim.label,
        children: dim.children,
        label: (
          <label
            style={{
              display: "inline-block",
              width: "100%",
              cursor: "pointer"
            }}
            title={dim.description}
          >
            {dim.label}
          </label>
        )
      }));

    const selectedValue = Array.isArray(filterValue)
      ? options.filter(a => filterValue.includes(a.value))
      : options.find(a => a.value === filterValue);

    if (dimension.unitSymbol) {
      title += "(" + dimension.unitSymbol + ")";
    }

    return (
      <div key={dimension.Id}>
        <label className={Styles.title} htmlFor={dimension.Id}>
          {title}
        </label>

        <Select
          isDisabled={item.disableFiltersWhileLoading && item.isLoading}
          defaultMenuIsOpen={false}
          value={selectedValue}
          filterOption={this.selectorFilter}
          isClearable={item.supportMultipleFilterValues}
          onChange={this.changeDimension.bind(this, dimension)}
          className={Styles.dropdown}
          options={options}
          styles={reactSelectStyles}
          delimiter={","}
          closeMenuOnSelect={true}
          isMulti={this.isMultiSelectAllowed(item, dimension)}
          isOptionDisabled={option => {
            if (
              additionalSettings?.onlyLeafNodesCanBeSelected &&
              option.children &&
              option.children.length
            )
              return true;

            if (
              Array.isArray(additionalSettings.disabledNodes) &&
              additionalSettings.disabledNodes.includes(option.value)
            )
              return true;

            return false;
          }}
        />
      </div>
    );
  }
});

module.exports = withTranslation()(SmartCsvDimensionSelectorSection);
