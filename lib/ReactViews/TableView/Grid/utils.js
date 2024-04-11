export function inputStopPropagation(event) {
  if (["ArrowLeft", "ArrowRight"].includes(event.key)) {
    event.stopPropagation();
  }
}

export function selectStopPropagation(event) {
  if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) {
    event.stopPropagation();
  }
}

export const reactSelectStyle = {
  control: (provided, state) => ({
    ...provided,
    backgroundColor: "white",
    boxShadow: "none",
    // height: "30px",
    minHeight: "30px",
    margin: "4px 0",
    boxShadow: state.isFocused ? null : null
  }),
  indicatorsContainer: provided => ({
    ...provided,
    height: "30px"
  }),

  input: provided => ({
    ...provided,
    margin: "0px"
  }),
  indicatorSeparator: state => ({
    display: "none"
  }),
  option: (styles, { isDisabled, isSelected }) => {
    return {
      ...styles,
      backgroundColor: isSelected ? "#4783c6" : "whitesmoke",
      color: isSelected ? "white" : "black",
      cursor: isDisabled ? "not-allowed" : "default",
      borderColor: "#3f4854"
    };
  },
  valueContainer: (provided, state) => ({
    ...provided,
    height: "100%",
    maxHeight: "30px",
    overflowY: "auto"
  }),
  placeholder: (provided, state) => {
    return {
      ...provided,
      height: "20px",
      lineHeight: "20px"
    };
  },
  input: provided => ({
    ...provided,
    margin: 0,
    padding: 0,
    lineHeight: "30px",
    height: "30px",
    marginTop: "-8px"
  }),
  singleValue: provided => ({
    ...provided,
    height: "30px",
    lineHeight: "30px"
  }),
  multiValue: (provided, state) => {
    return {
      ...provided,
      borderColor: "#3f4854",
      padding: "0px",
      margin: "0 2px",
      height: "20px",
      lineHeight: "20px",
      maxWidth: "200px",
      div: {
        padding: "0 1px"
      }
    };
  },
  multiValueRemove: (provided, state) => {
    return { ...provided, color: "#3f4854" };
  },
  menuPortal: base => ({ ...base, zIndex: 9999 })
};
