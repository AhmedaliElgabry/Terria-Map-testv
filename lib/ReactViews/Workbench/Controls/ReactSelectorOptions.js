const colorStyles = {
  control: styles => ({
    ...styles,
    backgroundColor: "white",
    boxShadow: "none"
  }),
  option: (styles, { isDisabled, isSelected }) => {
    return {
      ...styles,
      backgroundColor: isSelected ? "#4783c6" : "white",
      color: isDisabled ? "lightgray" : isSelected ? "white" : "black",
      cursor: isDisabled ? "not-allowed" : "default",
      border: 0,
      zIndex: 12
    };
  },
  menu: () => {
    return {
      zIndex: 12
    };
  },
  // placeholder: () => {
  //   return {
  //     filter: "grayscale(100%)",
  //     color: "gray"
  //   };
  // },
  multiValue: (provided, state) => {
    return { ...provided, borderColor: "#3f4854" };
  },
  multiValueRemove: (provided, state) => {
    return { ...provided, color: "#3f4854" };
  }
};

export default colorStyles;
