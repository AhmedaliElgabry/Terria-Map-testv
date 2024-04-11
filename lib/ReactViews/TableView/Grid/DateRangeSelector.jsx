"use strict!";
import React, { useState, useRef, useEffect } from "react";
import DatePicker from "react-datepicker";
import Styles from "./date-range-selector.scss";
import classNames from "classnames";

export default function TerriaRangeSelector(props) {
  const isInitialMount = useRef(true);
  const [startDate, setStartDate] = useState(props.start);
  const [endDate, setEndDate] = useState(props.end);
  const [bbox, setBbox] = useState(null);
  const [buttonBbox, setButtonBbox] = useState({});

  const [isOpen, setIsOpen] = useState(false);
  const buttonRef = useRef();
  const containerRef = useRef();

  const rangeSelectorWrapper = {};

  if (bbox) {
    rangeSelectorWrapper.width = `${bbox.width}px`;
    if (bbox.width + buttonBbox.left > window.innerWidth) {
      rangeSelectorWrapper.left =
        window.innerWidth - (bbox.width + buttonBbox.right - 100) + "px";
    }
  }

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
    } else {
      props.onDateChange && props.onDateChange(startDate, endDate);
    }
  }, [startDate, endDate]);

  useEffect(() => {
    if (props.onOpen) {
      props.onOpen(isOpen);
    }

    if (buttonRef.current) {
      setButtonBbox(buttonRef.current.getBoundingClientRect());
    }

    if (!containerRef.current) {
      return;
    }

    const bbox = containerRef.current.getBoundingClientRect();
    setBbox(bbox);
    containerRef.current.focus();

    if (props.column) {
      props.column.resizable = !isOpen;

      return () => {
        props.column.resizable = true;
      };
    }
  }, [isOpen]);

  const filterSelected = !!(endDate || startDate);

  return (
    <div>
      <div className={Styles.openButtonContainer}>
        <button
          ref={buttonRef}
          className={classNames(Styles.openButton, {
            [Styles.rightDock]: filterSelected
          })}
          onClick={() => {
            setIsOpen(!isOpen);
          }}
        >
          {" "}
          {props.label || "Click to Filter"}
        </button>

        {filterSelected && (
          <button
            key="clearBtn"
            title="Clear Filter"
            className={classNames(Styles.clearButton, {
              [Styles.leftDock]: filterSelected,
              [Styles.important]: filterSelected
            })}
            onClick={() => {
              setStartDate(null);
              setEndDate(null);
            }}
          >
            x
          </button>
        )}
      </div>

      {isOpen && (
        <div
          className={Styles.rangeSelectorWrapper}
          style={rangeSelectorWrapper}
        >
          <div className={Styles.topBar}>
            <span style={{}}>
              {" "}
              <pre>{startDate && startDate.format("DD/MM/YYYY")}</pre>
              <pre>{endDate && " To " + endDate.format("DD/MM/YYYY")}</pre>
              {!filterSelected && "Select date range"}
            </span>

            {(startDate || endDate) && (
              <button
                key="clearBtn"
                className={Styles.clearButton}
                onClick={() => {
                  setStartDate(null);
                  setEndDate(null);
                }}
              >
                Clear
              </button>
            )}

            <button
              key="closeBtn"
              className={Styles.closeButton}
              onClick={() => {
                setIsOpen(false);
              }}
            >
              x
            </button>
          </div>

          <div
            tabIndex={0}
            // onFocus={() => console.info("got focus")}
            onBlur={() => setIsOpen(false)}
            ref={containerRef}
            className={Styles.container}
          >
            <div className={Styles.dateContainer}>
              <label>From</label>
              <DatePicker
                selected={startDate}
                onChange={date => setStartDate(date)}
                selectsStart
                startDate={startDate}
                endDate={endDate}
                showYearDropdown
                showMonthDropdown
                inline
              />
            </div>
            <div className={Styles.dateContainer}>
              <label>To</label>

              <DatePicker
                selected={endDate}
                onChange={date => setEndDate(date)}
                selectsEnd
                startDate={startDate}
                endDate={endDate}
                minDate={startDate}
                showYearDropdown
                showMonthDropdown
                inline
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
