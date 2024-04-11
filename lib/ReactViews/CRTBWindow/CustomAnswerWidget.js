"use strict";
import React from "react";
import PropTypes from "prop-types";

export default function CustomAnswerWidget(props) {
  function getText(val) {
    if (typeof val === "boolean") {
      if (val) return "Yes";
      else return "No";
    } else {
      return "N/A";
    }
  }

  return (
    <div title={"This value is read only"} className="answersWrapper">
      <span>{getText(props.value)}</span>
    </div>
  );
}

CustomAnswerWidget.propTypes = {
  value: PropTypes.any,
  readonly: PropTypes.bool
};
