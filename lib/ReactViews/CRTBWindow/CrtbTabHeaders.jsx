"use strict";
import React from "react";
import PropTypes from "prop-types";
import Icon from "../Icon.jsx";
import CustomTabStyle from "../ComponentStyles/customTab.scss";
import Styles from "./crtb-window.scss";
import SettingStyles from "../Map/Panels/setting-panel.scss";
import DropdownStyles from "../Map/Panels/panel.scss";
import MenuPanel from "../StandardUserInterface/customizable/MenuPanel.jsx";
import classNames from "classnames";
import helpIcon from "../../../wwwroot/images/icons/help.svg";
import { withTranslation } from "react-i18next";
import { formNames } from "./commonOptions";
class CrtbTabHeaders extends React.Component {
  constructor(props) {
    super(props);
  }

  componentDidMount() {}

  onTabChange(e) {
    this.props.onTabChange(e.currentTarget.value);
  }

  getHelpTooltip(title, type) {
    const dropdownTheme = {
      outer: SettingStyles.inlineSettingPanel,
      inner: SettingStyles.dropdownInner,
      btn: SettingStyles.crtbHelpBtn,
      icon: helpIcon
    };

    const text = this.props.t(`crtb.${type}`);
    const tooltip = (
      <MenuPanel
        theme={dropdownTheme}
        showDropdownAsModal={true}
        btnTitle="Help"
        modalWidth={225}
        viewState={this.props.viewState}
        smallScreen={this.props.viewState.useSmallScreenInterface}
      >
        <div
          className={classNames(SettingStyles.viewer, DropdownStyles.section)}
        >
          <label className={DropdownStyles.heading}>{title}</label>
          <label>{text}</label>
        </div>
      </MenuPanel>
    );

    return tooltip;
  }

  render() {
    const {
      // exposureTotal,
      vulnerabilityTotal,
      adaptiveCapacityTotal,
      // exposureCompleted,
      vulnerabilityCompleted,
      adaptiveCapacityCompleted
    } = this.props.formStatus;

    const acRequiresAction = adaptiveCapacityTotal > adaptiveCapacityCompleted;
    // const exposureRequiresAction = exposureTotal > exposureCompleted;
    const vulRequiresAction = vulnerabilityTotal > vulnerabilityCompleted;

    const hazardHelp = this.getHelpTooltip("Hazard", formNames.hazard);
    const exposureHelp = this.getHelpTooltip("Exposure", formNames.exposure);
    const vulnerabilityHelp = this.getHelpTooltip(
      "Vulnerability",
      formNames.vulnerability
    );
    const adaptiveCapacityHelp = this.getHelpTooltip(
      "Adaptive Capacity",
      formNames.adaptiveCapacity
    );
    const disabledClass = classNames({
      [CustomTabStyle.disabledTab]: !this.props.tabsEnabled
    });
    const disabledTitle = this.props.tabsEnabled
      ? ""
      : "Select area of interest and agricultural systems to proceed";

    return (
      <div id="crtbTabset" className={CustomTabStyle.tabset}>
        <input
          type="radio"
          name="crtbTabset"
          onChange={this.onTabChange.bind(this)}
          value="aoi"
          id="aoiCrtb"
          aria-controls="aoiCrtb"
          checked={this.props.currentForm === formNames.aoi}
        />
        <label htmlFor="aoiCrtb">
          <Icon glyph={Icon.GLYPHS.geolocation} /> Parameters
        </label>

        <input
          type="radio"
          name="crtbTabset"
          disabled={!this.props.tabsEnabled}
          onChange={this.onTabChange.bind(this)}
          value="hazard"
          id="hazardCrtb"
          aria-controls="hazardCrtb"
          checked={this.props.currentForm === formNames.hazard}
        />
        <label
          title={disabledTitle}
          className={disabledClass}
          htmlFor="hazardCrtb"
        >
          <Icon glyph={Icon.GLYPHS.radar} /> Hazard{" "}
          {/* <span className={Styles.noActionRequired}>(0/0)</span> */}
          {hazardHelp}
        </label>

        <input
          type="radio"
          name="crtbTabset"
          disabled={!this.props.tabsEnabled}
          onChange={this.onTabChange.bind(this)}
          value="exposure"
          id="exposureCrtb"
          aria-controls="exposureCrtb"
          checked={this.props.currentForm === formNames.exposure}
        />
        <label
          title={disabledTitle}
          className={disabledClass}
          htmlFor="exposureCrtb"
        >
          <Icon glyph={Icon.GLYPHS.radar} /> Exposure{" "}
          {/* <span
            className={
              exposureRequiresAction
                ? Styles.requiresAction
                : Styles.noActionRequired
            }
          >
            {exposureCompleted}/{exposureTotal}
          </span> */}
          {exposureHelp}
        </label>

        <input
          type="radio"
          name="crtbTabset"
          disabled={!this.props.tabsEnabled}
          onChange={this.onTabChange.bind(this)}
          value="vulnerability"
          id="vulnerabilityCrtb"
          aria-controls="vulnerabilityCrtb"
          checked={this.props.currentForm === formNames.vulnerability}
        />
        <label
          title={disabledTitle}
          className={disabledClass}
          htmlFor="vulnerabilityCrtb"
        >
          <Icon glyph={Icon.GLYPHS.radar} /> Vulnerability{" "}
          <span
            className={
              vulRequiresAction
                ? Styles.requiresAction
                : Styles.noActionRequired
            }
          >
            {vulnerabilityCompleted}/{vulnerabilityTotal}
          </span>
          {vulnerabilityHelp}
        </label>

        <input
          type="radio"
          name="crtbTabset"
          disabled={!this.props.tabsEnabled}
          onChange={this.onTabChange.bind(this)}
          value="adaptiveCapacity"
          id="adaptiveCapacityCrtb"
          aria-controls="adaptiveCapacityCrtb"
          checked={this.props.currentForm === formNames.adaptiveCapacity}
        />
        <label
          title={disabledTitle}
          className={disabledClass}
          htmlFor="adaptiveCapacityCrtb"
        >
          <Icon glyph={Icon.GLYPHS.bulb} /> Adaptive Capacity{" "}
          <span
            className={
              acRequiresAction ? Styles.requiresAction : Styles.noActionRequired
            }
          >
            {adaptiveCapacityCompleted}/{adaptiveCapacityTotal}
          </span>
          {adaptiveCapacityHelp}
        </label>
      </div>
    );
  }
}

CrtbTabHeaders.propTypes = {
  onTabChange: PropTypes.func.isRequired,
  currentForm: PropTypes.string.isRequired,
  formStatus: PropTypes.object.isRequired,
  viewState: PropTypes.object.isRequired,
  tabsEnabled: PropTypes.bool.isRequired,
  t: PropTypes.func.isRequired
};

export default withTranslation()(CrtbTabHeaders);
