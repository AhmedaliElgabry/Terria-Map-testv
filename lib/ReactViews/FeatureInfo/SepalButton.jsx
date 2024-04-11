"use strict";
import React from "react";
import PropTypes from "prop-types";
import createReactClass from "create-react-class";
import Icon from "../Icon.jsx";
import Styles from "./analysis-button.scss";

const SepalButton = createReactClass({
  propTypes: {
    viewState: PropTypes.object.isRequired,
    terria: PropTypes.object.isRequired,
    catalogItem: PropTypes.object.isRequired
  },
  getInitialState() {
    return {
      analysisType: "SelectType",
      isOpen: false
    };
  },
  render() {
    const { catalogItem } = this.props;

    const isSepal =
      catalogItem &&
      catalogItem.customProperties &&
      catalogItem.customProperties.sepal;

    if (!isSepal) return null;

    const that = this;
    return (
      <div>
        <button
          type="button"
          className={Styles.sepalButton}
          onClick={() =>
            that.props.terria.setSepalModalVisibility({
              visibility: true,
              catalogItem: catalogItem
            })
          }
        >
          <Icon glyph={Icon.GLYPHS.sepal} /> <span> SEPAL </span>
        </button>
      </div>
    );
  }
});

export default SepalButton;
