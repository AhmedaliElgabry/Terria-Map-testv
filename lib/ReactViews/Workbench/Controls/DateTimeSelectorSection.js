"use strict";

import dateFormat from "dateformat";

import React from "react";
import createReactClass from "create-react-class";
import classNames from "classnames";
import PropTypes from "prop-types";

import defined from "terriajs-cesium/Source/Core/defined";
import JulianDate from "terriajs-cesium/Source/Core/JulianDate";

import DateTimePicker from "../../BottomDock/Timeline/DateTimePicker";
import ObserveModelMixin from "../../ObserveModelMixin";
import { formatDateTime } from "../../BottomDock/Timeline/DateFormats";
import { withTranslation } from "react-i18next";
import Styles from "./datetime-selector-section.scss";
import Icon from "../../Icon.jsx";
import VisualizationType from "../../../Models/VisualizationType";

const DateTimeSelectorSection = createReactClass({
  displayName: "DateTimeSelectorSection",

  mixins: [ObserveModelMixin],

  propTypes: {
    item: PropTypes.object.isRequired,
    t: PropTypes.func.isRequired
  },

  getInitialState() {
    return {
      isOpen: false
    };
  },

  changeDateTime(time) {
    const item = this.props.item;

    // Give this item focus on the timeline (if it is connected to the timeline), so that the user can select all available dates for this item.
    item.terria.timeSeriesStack.promoteLayerToTop(item);

    // Set the time on the item, set it to use its own clock, update the imagery and repaint.
    item.currentTime = JulianDate.fromDate(new Date(time));
    item.terria.currentViewer.notifyRepaintRequired();
  },

  onTimelineButtonClicked() {
    const item = this.props.item;
    if (item.isTimeDisabled) {
      item.isTimeDisabled = false;
      item.toggleTime();
    }
    item.useOwnClock = !item.useOwnClock;
    item.useClock(); // Adds this item to the timeline.
    item.terria.currentViewer.notifyRepaintRequired();
  },

  onToggleTime() {
    this.setState({
      isOpen: false
    });
    const item = this.props.item;
    item.isTimeDisabled = !item.isTimeDisabled;
    item.toggleTime();
  },

  onPreviousButtonClicked() {
    const item = this.props.item;

    // Give this item focus on the timeline (if it is connected to the timeline), so that the user can select all available dates for this item.
    item.terria.timeSeriesStack.promoteLayerToTop(item);

    item.moveToPreviousTime();

    // Repaint imagery on layers that don't subscribe to clock changes.
    item.terria.currentViewer.notifyRepaintRequired();
  },

  onNextButtonClicked() {
    const item = this.props.item;

    // Give this item focus on the timeline (if it is connected to the timeline), so that the user can select all available dates for this item.
    item.terria.timeSeriesStack.promoteLayerToTop(item);

    item.moveToNextTime();

    // Repaint imagery on layers that don't subscribe to clock changes.
    item.terria.currentViewer.notifyRepaintRequired();
  },

  onOpen() {
    this.setState({
      isOpen: true
    });
  },

  onClose() {
    this.setState({
      isOpen: false
    });
  },

  toggleOpen(event) {
    this.setState({
      isOpen: !this.state.isOpen
    });
    event.stopPropagation();
  },

  render() {
    const { t } = this.props;
    let discreteTime;
    let format;
    const item = this.props.item;

    if (item.terria.viewType == VisualizationType.TABLE) {
      return null;
    }

    if (defined(item.discreteTime)) {
      const time = item.discreteTime;
      if (defined(item.dateFormat.currentTime)) {
        format = item.dateFormat;
        discreteTime = dateFormat(time, item.dateFormat.currentTime);
      } else {
        discreteTime = formatDateTime(time);
      }
    }

    return (
      <div className={Styles.datetimeSelector}>
        <If
          condition={
            item.isTimeDisabled ||
            (defined(item.clock) &&
              defined(item.availableDates) &&
              item.availableDates.length !== 0)
          }
        >
          <div className={Styles.title}>Time:</div>
          <div className={Styles.datetimeSelectorInner}>
            <div className={Styles.datetimeAndPicker}>
              <button
                className={Styles.datetimePrevious}
                disabled={
                  item.isTimeDisabled || !item.isPreviousTimeAvaliable()
                }
                onClick={this.onPreviousButtonClicked}
                title={t("dateTime.previous")}
              >
                <Icon glyph={Icon.GLYPHS.previous} />
              </button>
              <button
                className={Styles.currentDate}
                onClick={this.toggleOpen}
                disabled={item.isTimeDisabled}
                title={t("dateTime.selectTime")}
              >
                {defined(discreteTime)
                  ? discreteTime
                  : item.isTimeDisabled
                  ? t("dateTime.timeDisabled")
                  : t("dateTime.outOfRange")}
              </button>
              <button
                className={Styles.datetimeNext}
                disabled={item.isTimeDisabled || !item.isNextTimeAvaliable()}
                onClick={this.onNextButtonClicked}
                title={t("dateTime.next")}
              >
                <Icon glyph={Icon.GLYPHS.next} />
              </button>
            </div>
            <div className={Styles.picker} title={t("dateTime.selectTime")}>
              <DateTimePicker
                currentDate={item.clampedDiscreteTime}
                dates={item.availableDates}
                onChange={this.changeDateTime}
                openDirection="down"
                isOpen={this.state.isOpen}
                showCalendarButton={false}
                onOpen={this.onOpen}
                onClose={this.onClose}
                dateFormat={format}
              />
            </div>
            <button
              className={classNames(Styles.timelineButton, {
                [Styles.timelineActive]: !item.useOwnClock
              })}
              type="button"
              onClick={this.onTimelineButtonClicked}
              title={t("dateTime.useTimeline")}
            >
              <Icon glyph={Icon.GLYPHS.timeline} />
            </button>
            <If condition={item.canToggleTime}>
              <button
                className={classNames(Styles.timelineButton, {
                  [Styles.disableClockActive]: item.isTimeDisabled
                })}
                type="button"
                onClick={this.onToggleTime}
                title={
                  item.isTimeDisabled
                    ? t("dateTime.enableClock")
                    : t("dateTime.disableClock")
                }
              >
                <Icon glyph={Icon.GLYPHS.clockCancel} />
              </button>
            </If>
          </div>
        </If>
      </div>
    );
  }
});

module.exports = withTranslation()(DateTimeSelectorSection);
