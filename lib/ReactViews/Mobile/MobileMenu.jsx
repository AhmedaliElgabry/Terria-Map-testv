import React from "react";
import defined from "terriajs-cesium/Source/Core/defined";
import createReactClass from "create-react-class";

import PropTypes from "prop-types";

import ObserveModelMixin from "../ObserveModelMixin";
import classNames from "classnames";
import MobileMenuItem from "./MobileMenuItem";
import SettingPanel from "../Map/Panels/SettingPanel.jsx";
import SharePanel from "../Map/Panels/SharePanel/SharePanel.jsx";
import LoginPanel from "../Map/Panels/LoginPanel/LoginPanel.jsx";
import Terria from "../../Models/Terria";
import RelatedSites from "../StandardUserInterface/RelatedSites";
import { withTranslation } from "react-i18next";

import ViewState from "../../ReactViewModels/ViewState";

import Styles from "./mobile-menu.scss";
import ConditionalyVisibleElement, {
  ElementsIdentifiers
} from "../ConditionalyVisibleElement";
import TableViewSettingPanel from "../TableView/TableViewSettingPanel";
import VisualizationType from "../../Models/VisualizationType";
import LanguagePanel from "../Map/Panels/LanguagePanel/LanguagePanel";

const MobileMenu = createReactClass({
  displayName: "MobileMenu",
  mixins: [ObserveModelMixin],

  propTypes: {
    menuItems: PropTypes.arrayOf(PropTypes.element),
    viewState: PropTypes.instanceOf(ViewState).isRequired,
    showFeedback: PropTypes.bool,
    terria: PropTypes.instanceOf(Terria).isRequired,
    allBaseMaps: PropTypes.array,
    t: PropTypes.func.isRequired
  },

  getDefaultProps() {
    return {
      menuItems: [],
      showFeedback: false
    };
  },

  toggleMenu() {
    this.props.viewState.mobileMenuVisible = !this.props.viewState
      .mobileMenuVisible;
  },

  getInitialState() {
    return {};
  },

  onFeedbackFormClick() {
    this.props.viewState.feedbackFormIsVisible = true;
    this.props.viewState.mobileMenuVisible = false;
  },

  hideMenu() {
    this.props.viewState.mobileMenuVisible = false;
  },

  runStories() {
    this.props.viewState.storyBuilderShown = false;
    this.props.viewState.storyShown = true;
    this.props.viewState.mobileMenuVisible = false;
  },
  dismissSatelliteGuidanceAction() {
    this.props.viewState.toggleFeaturePrompt("mapGuidesLocation", true, true);
  },

  render() {
    const { t } = this.props;
    const hasStories =
      this.props.terria.configParameters.storyEnabled &&
      defined(this.props.terria.stories) &&
      this.props.terria.stories.length > 0;

    // eslint-disable-next-line eqeqeq
    const hideAllUi = this.props.terria.userProperties.hideAllUi == "1";

    // return this.props.viewState.mobileMenuVisible ? (
    return (
      <div>
        <If condition={this.props.viewState.mobileMenuVisible}>
          <div className={Styles.overlay} onClick={this.toggleMenu} />
        </If>
        <div
          className={classNames(Styles.mobileNav, {
            [Styles.mobileNavHidden]: !this.props.viewState.mobileMenuVisible
          })}
        >
          <If condition={!hideAllUi}>
            <div onClick={this.hideMenu}>
              <ConditionalyVisibleElement
                id={ElementsIdentifiers.hideMapSettings}
                terria={this.props.terria}
              >
                <SettingPanel
                  terria={this.props.terria}
                  allBaseMaps={this.props.allBaseMaps}
                  viewState={this.props.viewState}
                />
              </ConditionalyVisibleElement>
            </div>
            {this.props.terria.viewType == VisualizationType.TABLE && (
              <div onClick={this.hideMenu}>
                <TableViewSettingPanel
                  terria={this.props.terria}
                  allBaseMaps={this.props.allBaseMaps}
                  viewState={this.props.viewState}
                />
              </div>
            )}
            <div onClick={this.hideMenu}>
              <ConditionalyVisibleElement
                id={ElementsIdentifiers.hideSharePanel}
                terria={this.props.terria}
              >
                <SharePanel
                  terria={this.props.terria}
                  viewState={this.props.viewState}
                />
              </ConditionalyVisibleElement>
            </div>
            <div onClick={this.hideMenu}>
              <ConditionalyVisibleElement
                id={ElementsIdentifiers.hideSharePanel}
                terria={this.props.terria}
              >
                <LoginPanel
                  terria={this.props.terria}
                  viewState={this.props.viewState}
                />
              </ConditionalyVisibleElement>
            </div>
            <ConditionalyVisibleElement
              id={ElementsIdentifiers.hideLangMenu}
              userProperties={this.props.terria.userProperties}
            >
              <li key={"lang-menu"} className={Styles.menuItem}>
                <LanguagePanel
                  terria={this.props.terria}
                  viewState={this.props.viewState}
                />
              </li>
            </ConditionalyVisibleElement>
            <div onClick={this.hideMenu}>
              <ConditionalyVisibleElement
                id={ElementsIdentifiers.hideRelatedSites}
                terria={this.props.terria}
              >
                <RelatedSites
                  smallScreen={true}
                  viewState={this.props.viewState}
                />
              </ConditionalyVisibleElement>
            </div>
          </If>

          <For each="menuItem" of={this.props.menuItems}>
            <div onClick={this.hideMenu} key={menuItem.key}>
              {menuItem}
            </div>
          </For>

          <If condition={this.props.showFeedback}>
            <ConditionalyVisibleElement
              id={ElementsIdentifiers.hideFeedback}
              terria={this.props.terria}
            >
              <MobileMenuItem
                onClick={this.onFeedbackFormClick}
                caption={t("feedback.feedbackBtnText")}
              />
            </ConditionalyVisibleElement>
          </If>
          <If condition={hasStories}>
            <MobileMenuItem
              onClick={this.runStories}
              caption={t("story.mobileViewStory", {
                storiesLength: this.props.terria.stories.length
              })}
            />
          </If>
        </div>
      </div>
    );
  }
});

export default withTranslation()(MobileMenu);
