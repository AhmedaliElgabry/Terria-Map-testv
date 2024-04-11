"use strict";

import { formSchemas } from "./commonOptions";

export const colorStyles = {
  control: styles => ({
    ...styles,
    backgroundColor: "white",
    boxShadow: "none"
  }),
  option: (styles, { isDisabled, isSelected }) => {
    return {
      ...styles,
      backgroundColor: isSelected ? "#4783c6" : "white",
      color: isSelected ? "white" : "black",
      cursor: isDisabled ? "not-allowed" : "default"
    };
  },
  multiValue: (provided, state) => {
    return { ...provided, borderColor: "#3f4854" };
  },
  multiValueRemove: (provided, state) => {
    return { ...provided, color: "#3f4854" };
  }
};

export function getUiSchema(arg, widget) {
  const uiSchema = {
    cropProductionAffected: {
      "ui:widget": "radio" // could also be "select"
    }
  };

  function setToShowRadioBoxes(obj) {
    for (const prop in obj.properties) {
      uiSchema[prop] = { "ui:widget": widget };
    }
  }

  if (Array.isArray(arg)) {
    for (const item of arg) {
      setToShowRadioBoxes(item);
    }

    return uiSchema;
  }

  setToShowRadioBoxes(arg);
  return uiSchema;
}

export function getQuestionCount(form) {
  const obj = (formSchemas[form] || {}).properties;
  if (!obj) {
    return 0;
  }

  return Object.keys(obj).length;
}

export function getFormSchema(form, timeScale, rcp) {
  const obj = (formSchemas[form] || {})[timeScale];

  if (!obj) {
    return null;
  }

  if (timeScale === "baseline" || timeScale === "baseline-userinput") {
    return obj;
  }

  const rcpSchema = obj[rcp];

  return rcpSchema;
}

export function isObject(_obj) {
  return _obj && typeof _obj === "object" && !Array.isArray(_obj);
}
