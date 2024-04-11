import React from "react";
import triggerResize from "../../Core/triggerResize";
import createReactClass from "create-react-class";

import PropTypes from "prop-types";
import classNames from "classnames";
import SettingPanel from "./Panels/SettingPanel.jsx";
import RelatedSites from "../StandardUserInterface/RelatedSites";
import SharePanel from "./Panels/SharePanel/SharePanel.jsx";
import ToolsPanel from "./Panels/ToolsPanel/ToolsPanel.jsx";
import LoginPanel from "./Panels/LoginPanel/LoginPanel";
import Icon from "../Icon.jsx";
import ObserveModelMixin from "../ObserveModelMixin";
import Prompt from "../Generic/Prompt";
import { withTranslation, Trans } from "react-i18next";
import Styles from "./menu-bar.scss";
import knockout from "terriajs-cesium/Source/ThirdParty/knockout-3.5.1";
import VisualizationType from "../../Models/VisualizationType";
import TableViewSettingPanel from "../TableView/TableViewSettingPanel";

import ConditionalyVisibleElement, {
  ElementsIdentifiers
} from "../ConditionalyVisibleElement";
import runLater from "../../Core/runLater";
import LanguagePanel from "./Panels/LanguagePanel/LanguagePanel";

// The map navigation region
const MenuBar = createReactClass({
  displayName: "MenuBar",
  mixins: [ObserveModelMixin],

  propTypes: {
    terria: PropTypes.object,
    viewState: PropTypes.object.isRequired,
    allBaseMaps: PropTypes.array,
    animationDuration: PropTypes.number,
    menuItems: PropTypes.arrayOf(PropTypes.element),
    t: PropTypes.func.isRequired
  },

  getInitialState() {
    const { terria } = this.props;
    return {
      isTableOpen: terria.viewType == VisualizationType.TABLE
    };
  },
  componentDidMount() {
    const { terria } = this.props;
    knockout.getObservable(terria, "viewType").subscribe(type => {
      this.setState({
        isTableOpen: type == VisualizationType.TABLE
      });
    });
  },
  getDefaultProps() {
    return {
      menuItems: []
    };
  },
  handleClick() {
    this.props.viewState.topElement = "MenuBar";
  },

  onStoryButtonClick() {
    if (
      !this.props.viewState.storyBuilderShown &&
      this.props.viewState.helpSidebarShown
    ) {
      this.props.viewState.helpSidebarShown = false;
      runLater(
        () =>
          (this.props.viewState.storyBuilderShown = !this.props.viewState
            .storyBuilderShown),
        250
      );
    } else {
      this.props.viewState.storyBuilderShown = !this.props.viewState
        .storyBuilderShown;
    }

    this.props.terria.currentViewer.notifyRepaintRequired();
    // Allow any animations to finish, then trigger a resize.
    setTimeout(function() {
      triggerResize();
    }, this.props.animationDuration || 1);
    this.props.viewState.toggleFeaturePrompt("story", false, true);
  },
  dismissAction() {
    this.props.viewState.toggleFeaturePrompt("story", false, true);
  },
  dismissSatelliteGuidanceAction() {
    this.props.viewState.toggleFeaturePrompt("mapGuidesLocation", true, true);
  },
  render() {
    const { t, terria } = this.props;
    const satelliteGuidancePrompted = terria.getLocalProperty(
      "satelliteGuidancePrompted"
    );
    const mapGuidesLocationPrompted = terria.getLocalProperty(
      "mapGuidesLocationPrompted"
    );
    const storyEnabled = terria.configParameters.storyEnabled;
    const enableTools = terria.getUserProperty("tools") === "1";

    // eslint-disable-next-line eqeqeq
    const hideAllUi = terria.userProperties.hideAllUi == "1";

    const { isTableOpen } = this.state;

    const promptHtml =
      this.props.terria.stories.length > 0 ? (
        <Trans i18nKey="story.promptHtml1">
          <div>
            You can view and create stories at any time by clicking here.
          </div>
        </Trans>
      ) : (
        <Trans i18nKey="story.promptHtml2">
          <div>
            <small>INTRODUCING</small>
            <h3>Data Stories</h3>
            <div>
              Create and share interactive stories directly from your map.
            </div>
          </div>
        </Trans>
      );
    const delayTime =
      storyEnabled && this.props.terria.stories.length > 0 ? 1000 : 2000;

    return (
      <div
        className={classNames(
          Styles.menuArea,
          this.props.viewState.topElement === "MenuBar" ? "top-element" : ""
        )}
        onClick={this.handleClick}
      >
        <ul className={Styles.menu}>
          <If condition={!hideAllUi && storyEnabled}>
            <ConditionalyVisibleElement
              id={ElementsIdentifiers.hidetabularViewSettings}
              terria={this.props.terria}
            >
              {/* {isTableOpen && (this.props.terria.tableTop || 0) < 40 && (
                <li key={41} className={Styles.menuItem}>
                  <TableViewSettingPanel
                    terria={this.props.terria}
                    viewState={this.props.viewState}
                  />
                </li>
              )} */}

              <li key={41} className={Styles.menuItem}>
                <TableViewSettingPanel
                  terria={this.props.terria}
                  viewState={this.props.viewState}
                />
              </li>
            </ConditionalyVisibleElement>

            <ConditionalyVisibleElement
              id={ElementsIdentifiers.hideStory}
              terria={this.props.terria}
            >
              <li className={Styles.menuItem}>
                <button
                  id={"storyMenuItem"}
                  className={Styles.storyBtn}
                  type="button"
                  onClick={this.onStoryButtonClick}
                  aria-expanded={this.props.viewState.storyBuilderShown}
                >
                  <Icon glyph={Icon.GLYPHS.story} />
                  <span>{t("story.story")}</span>
                </button>
                {storyEnabled &&
                  this.props.viewState.featurePrompts.indexOf("story") >= 0 && (
                    <Prompt
                      content={promptHtml}
                      displayDelay={delayTime}
                      dismissText={t("story.dismissText")}
                      dismissAction={this.dismissAction}
                    />
                  )}
              </li>
            </ConditionalyVisibleElement>
          </If>

          <ConditionalyVisibleElement
            id={ElementsIdentifiers.hideMapSettings}
            terria={this.props.terria}
          >
            {!isTableOpen && (
              <li key={41} className={Styles.menuItem}>
                <SettingPanel
                  terria={this.props.terria}
                  allBaseMaps={this.props.allBaseMaps}
                  viewState={this.props.viewState}
                />
              </li>
            )}
          </ConditionalyVisibleElement>

          <ConditionalyVisibleElement
            id={ElementsIdentifiers.hideSharePanel}
            terria={this.props.terria}
          >
            <li className={Styles.menuItem}>
              <SharePanel
                terria={this.props.terria}
                viewState={this.props.viewState}
              />
            </li>
            <li className={Styles.menuItem}>
              <LoginPanel
                terria={this.props.terria}
                viewState={this.props.viewState}
              />
            </li>
          </ConditionalyVisibleElement>
          {/* <li className={Styles.menuItem}>
            <HelpMenuPanelBasic
              terria={this.props.terria}
              viewState={this.props.viewState}
            />
            {this.props.terria.configParameters.showFeaturePrompts &&
              satelliteGuidancePrompted &&
              !mapGuidesLocationPrompted &&
              !this.props.viewState.showSatelliteGuidance && (
                <Prompt
                  content={
                    <div>
                      <Trans i18nKey="satelliteGuidance.menuTitle">
                        You can access map guides at any time by looking in the{" "}
                        <strong>help menu</strong>.
                      </Trans>
                    </div>
                  }
                  displayDelay={1000}
                  dismissText={t("satelliteGuidance.dismissText")}
                  dismissAction={this.dismissSatelliteGuidanceAction}
                />
              )}
          </li> */}
          {enableTools && (
            <li key={6} className={Styles.menuItem}>
              <ToolsPanel
                terria={this.props.terria}
                viewState={this.props.viewState}
              />
            </li>
          )}

          <ConditionalyVisibleElement
            id={ElementsIdentifiers.hideRelatedSites}
            terria={this.props.terria}
          >
            <li className={Styles.menuItem}>
              <RelatedSites
                terria={this.props.terria}
                viewState={this.props.viewState}
              />
            </li>
          </ConditionalyVisibleElement>

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

          <If condition={!this.props.viewState.useSmallScreenInterface}>
            <For each="element" of={this.props.menuItems} index="i">
              <li className={Styles.menuItem} key={"c" + i}>
                {element}
              </li>
            </For>
          </If>
        </ul>
      </div>
    );
  }
});

export default withTranslation()(MenuBar);
