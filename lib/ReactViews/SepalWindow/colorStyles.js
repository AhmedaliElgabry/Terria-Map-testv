"use strict";

export const thumbSwitchColors = {
  activeThumb: {
    base: "#346aa6"
  },
  inactiveThumb: {
    base: "#aaa"
  },
  active: {
    base: "rgb(65,66,68)",
    hover: "rgb(95,96,98)"
  },
  inactive: {
    base: "rgb(65,66,68)",
    hover: "rgb(95,96,98)"
  }
};

export const bandSelectorStyles = {
  control: styles => ({
    ...styles,
    backgroundColor: "white",
    boxShadow: "none",
    height: "25px",
    zIndex: 9999
  }),
  option: (styles, { data, isDisabled, isSelected }) => {
    return {
      ...styles,
      backgroundColor: isSelected ? "#4783c6" : "white",
      color: isSelected ? "white" : "black",
      cursor: isDisabled ? "not-allowed" : "default",
      border: 0,
      padding: "1px 2px"
    };
  },
  singleValue: styles => ({
    width: "95%"
  })
};
