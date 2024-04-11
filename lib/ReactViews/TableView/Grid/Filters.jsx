import React, { useEffect } from "react";
import Styles from "./terria-grid.scss";
import moment from "moment";
import Select from "react-select";
import { inputStopPropagation, reactSelectStyle } from "./utils.js";
import DateRangeSelector from "./DateRangeSelector";
import debounce from "lodash.debounce";
const DEBOUNCE_INTERVAL = 500;

export function DefaultFilter(rest, filters, column, setFilters) {
  const onChange = value => {
    setFilters({
      ...filters,
      [column.id]: value
    });
  };

  useEffect(() => {
    if (rest.ref.current) {
      const val = filters?.[column.id] || "";
      rest.ref.current.value = val;
    }
  }, [filters]);

  const onChangeWithDebounce = debounce(onChange, DEBOUNCE_INTERVAL);

  return (
    <input
      {...rest}
      tabIndex={0}
      className={Styles.filterInput}
      onChange={e => {
        onChangeWithDebounce(e.target.value);
      }}
      onKeyDown={e => {
        if (e.key == "enter") onChange(e.target.value);
        inputStopPropagation(e);
      }}
      placeholder={`Filter by ${column.name}`}
    />
  );
}

export function DateFilter(
  currentVal,
  setFilters,
  filters,
  id,
  name,
  p,
  setDateFilterOpen
) {
  return (
    <DateRangeSelector
      onOpen={setDateFilterOpen}
      start={
        typeof currentVal?.start == "string" ? moment(currentVal?.start) : null
      }
      end={typeof currentVal?.end == "string" ? moment(currentVal?.end) : null}
      onDateChange={(start, end) => {
        setFilters({
          ...filters,
          [id]: { start, end }
        });
      }}
      label={`Filter by ${name}`}
      column={p.column}
    />
  );
}

export function DropdownFilter(name, filters, id, setFilters, uniqueValues) {
  const value = filters[id] || "";

  return (
    <Select
      styles={reactSelectStyle}
      defaultMenuIsOpen={false}
      menuPortalTarget={document.body}
      menuPosition={"fixed"}
      isMulti={true}
      isClearable={true}
      placeholder={`Filter by ${name}`}
      value={value}
      onChange={selection => {
        setFilters({
          ...filters,
          [id]: selection
        });
        // this.setState({ agriculturalSystem: val });
      }}
      className={Styles.dropdown}
      options={uniqueValues?.map(val => ({
        value: val,
        label: val
      }))}
    />
  );
}

export function scalarFilter(rest, filters, id, setFilters, name) {
  const value = filters[id] || "";
  return (
    <input
      {...rest}
      type="number"
      style={{
        width: "100%",
        border: "solid 1px lightgray",
        borderRadius: "3px",
        height: "30px",
        color: "black"
      }}
      value={value}
      onChange={e => {
        setFilters({
          ...filters,
          [id]: e.target.value
        });
      }}
      onKeyDown={inputStopPropagation}
      placeholder={`Filter by ${name}`}
    />
  );
}
