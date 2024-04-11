"use strict";
import React from "react";
import PropTypes from "prop-types";

export default function CustomRadioWidget(props) {
  const radioStyle = {
    display: "inline-block",
    width: "auto",
    marginLeft: "15px",
    cursor: props.readonly ? "no-drop" : "pointer"
  };

  function onChange(val) {
    if (props.readonly) return;
    return props.onChange(val);
  }

  return (
    <div
      title={props.readonly ? "This value is read only" : undefined}
      style={{ color: props.readonly ? "#ddd" : "#fff" }}
      className="form-group"
    >
      <span>
        <input
          type="radio"
          onChange={() => onChange(true)}
          style={radioStyle}
          checked={props.value === true}
        />{" "}
        Yes
      </span>
      <span>
        <input
          type="radio"
          onChange={() => onChange(false)}
          style={radioStyle}
          checked={props.value === false}
        />{" "}
        No
      </span>
      <span>
        <input
          type="radio"
          onChange={() => onChange("NotAvailable")}
          style={radioStyle}
          checked={props.value === "NotAvailable" || props.value === null}
        />{" "}
        N/A
      </span>
    </div>
  );
}

CustomRadioWidget.propTypes = {
  value: PropTypes.any,
  readonly: PropTypes.bool,
  onChange: PropTypes.func
};
