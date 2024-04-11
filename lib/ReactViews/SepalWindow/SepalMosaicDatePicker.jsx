"use strict";
import React from "react";
import DatePicker from "react-datepicker";
import moment from "moment";
import Styles from "./sepal-window.scss";
import PickerStyles from "./date-picker.scss";
import RangeStyle from "./range-styles.scss";
import PropTypes from "prop-types";
import Icon from "../Icon.jsx";
export class SepalMosaicDatePicker extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      showSimple: true,
      selectedDate: moment().subtract(6, "month"),
      from: this.props.from || moment().subtract(12, "month"),
      to: this.props.to || moment(),
      pastSeasons: 0,
      futureSeasons: 0
    };
  }

  componentDidMount() {
    const midwayDate = this.state.to - (this.state.to - this.state.from) / 2;
    this.props.onDatePicked(
      moment(midwayDate),
      this.state.from,
      this.state.to,
      this.state.pastSeasons,
      this.state.futureSeasons
    );
  }

  onAdvancedDatePickerSelected(e) {
    const midwayDate = this.state.to - (this.state.to - this.state.from) / 2;
    this.props.onDatePicked(
      moment(midwayDate),
      this.state.from,
      this.state.to,
      this.state.pastSeasons,
      this.state.futureSeasons
    );
  }

  getSimpleYearPicker() {
    return (
      <div style={{ display: "inline-flex" }} key="simplePicker">
        <span style={{ marginTop: "5px" }}>Date:</span>
        <DatePicker
          showPopperArrow={false}
          showMonthDropdown={true}
          dateFormat={"DD/MM/YYYY"}
          // popperProps={{
          //   //  positionFixed: true // use this to make the popper position: fixed
          // }}
          // popperClassName={Styles.popperContainer}
          // popperModifiers={{
          //   offset: {
          //     enabled: true,
          //     offset: "5px 5px"
          //   },
          //   preventOverflow: {
          //     enabled: true,
          //     escapeWithReference: false,
          //     boundariesElement: document.querySelector(this.props.parentContainer)
          //   }
          // }}
          selected={moment(this.state.selectedDate)}
          onChange={e => {
            this.setState({ selectedDate: moment(e) });
            this.props.onDatePicked(e);
          }}
          showYearDropdown
        />
      </div>
    );
  }

  getSeasonSlider() {
    return (
      <div
        className={[
          RangeStyle.seasonsContainer,
          PickerStyles.seasonsContainer
        ].join(" ")}
      >
        <label style={{ textAlign: "right" }}>
          Past Seasons: &nbsp; {this.state.pastSeasons}
          <input
            onChange={e => {
              const value = Math.max(Math.min(e.target.value, 12), 0);
              this.setState(
                { pastSeasons: value },
                this.onAdvancedDatePickerSelected
              );
            }}
            list="tickmarks"
            style={{ width: "90%", direction: "rtl" }}
            value={this.state.pastSeasons}
            type="range"
            min="0"
            max="12"
            step="1"
          />
        </label>
        <label>
          Future Seasons:&nbsp; {this.state.futureSeasons}
          <input
            onChange={e => {
              const value = Math.max(Math.min(e.target.value, 12), 0);
              this.setState(
                { futureSeasons: value },
                this.onAdvancedDatePickerSelected
              );
            }}
            list="tickmarks"
            style={{ width: "90%" }}
            value={this.state.futureSeasons}
            type="range"
            min="0"
            max="12"
            step="1"
          />
        </label>
      </div>
    );
  }

  getAdvancedPicker() {
    return (
      <div key="advancedPicker" style={{ width: "100%" }}>
        <datalist id="tickmarks">
          <option value="0">0</option>
          <option value="1">1</option>
          <option value="2">2</option>
          <option value="3">3</option>
          <option value="4">4</option>
          <option value="5">5</option>
          <option value="6">6</option>
          <option value="7">7</option>
          <option value="8">8</option>
          <option value="9">9</option>
          <option value="10">10</option>
          <option value="11">11</option>
          <option value="12">12</option>
        </datalist>

        <div className={PickerStyles.fromToContainer}>
          <span className={PickerStyles.datePicker}>
            <label style={{ margin: "6px" }}>From: </label>
            <DatePicker
              showPopperArrow={true}
              showMonthDropdown={true}
              dateFormat={"DD/MM/YYYY"}
              selected={moment(this.state.from)}
              shouldCloseOnSelect={true}
              onChange={e => {
                if (e > this.state.to) return;
                this.setState(
                  { from: moment(e) },
                  this.onAdvancedDatePickerSelected
                );
              }}
              showMonthYearDropdown
              showYearDropdown
              yearDropdownItemNumber={35}
              scrollableYearDropdown={true}
              minDate={this.state.from}
              maxDate={this.state.to}
            />
          </span>

          <span className={PickerStyles.datePicker}>
            <label style={{ margin: "6px" }}> To: </label>
            <DatePicker
              showPopperArrow={true}
              showMonthDropdown={true}
              shouldCloseOnSelect={true}
              dateFormat={"DD/MM/YYYY"}
              selected={moment(this.state.to)}
              onChange={e => {
                if (e < this.state.from) return;
                this.setState(
                  { to: moment(e) },
                  this.onAdvancedDatePickerSelected
                );
              }}
              showMonthYearDropdown
              showYearDropdown
              yearDropdownItemNumber={35}
              scrollableYearDropdown={true}
              minDate={this.state.from}
              maxDate={this.state.to}
            />
          </span>
        </div>
        {this.props.showSeasonsSelector && this.getSeasonSlider()}
      </div>
    );
  }

  render() {
    const expand = (
      <span className={PickerStyles.iconExpand}>
        <Icon glyph={Icon.GLYPHS.menu} />
      </span>
    );

    const collapse = (
      <span className={PickerStyles.iconCollapse}>
        <Icon glyph={Icon.GLYPHS.close} />
      </span>
    );

    let picker = null;

    if (this.props.showRangeOnly) {
      picker = this.getAdvancedPicker();
    } else {
      picker = this.state.showSimple
        ? this.getSimpleYearPicker()
        : this.getAdvancedPicker();
    }

    return (
      <div
        key="datePicker"
        className={Styles.sectionContainer}
        style={{ flexDirection: "column" }}
      >
        {!this.props.showRangeOnly && this.props.showExpandCollapse && (
          <div key="moreContainer" className={PickerStyles.moreContainer}>
            <button
              onClick={() => {
                this.setState({ showSimple: !this.state.showSimple });
              }}
              className={PickerStyles.moreButton}
            >
              {" "}
              {this.state.showSimple ? expand : collapse}{" "}
            </button>
          </div>
        )}

        <div style={{ position: "relative" }}>{picker}</div>
      </div>
    );
  }
}

SepalMosaicDatePicker.propTypes = {
  onDatePicked: PropTypes.func.isRequired,
  type: PropTypes.string,
  showRangeOnly: PropTypes.bool,
  showSeasonsSelector: PropTypes.bool,
  showExpandCollapse: PropTypes.bool,
  parentContainer: PropTypes.string,
  from: PropTypes.object,
  to: PropTypes.object
};
