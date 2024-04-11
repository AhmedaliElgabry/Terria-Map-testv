"use strict";
import React, { Suspense } from "react";
import createReactClass from "create-react-class";
import PropTypes from "prop-types";
import arrayContains from "../../Core/arrayContains";
import Branding from "./../SidePanel/Branding.jsx";
import DragDropFile from "./../DragDropFile.jsx";
import DragDropNotification from "./../DragDropNotification.jsx";
import ExplorerWindow from "./../ExplorerWindow/ExplorerWindow.jsx";
import FeatureInfoPanel from "./../FeatureInfo/FeatureInfoPanel.jsx";
import FeedbackForm from "../Feedback/FeedbackForm.jsx";
import MapColumn from "./MapColumn.jsx";
import MapInteractionWindow from "./../Notification/MapInteractionWindow.jsx";
import MapNavigationSection from "./../Map/MapNavigationSection.jsx";
import FeedbackButton from "../Feedback/FeedbackButton.jsx";
import MenuBar from "./../Map/MenuBar.jsx";
import ExperimentalFeatures from "./../Map/ExperimentalFeatures.jsx";
import MobileHeader from "./../Mobile/MobileHeader.jsx";
import Notification from "./../Notification/Notification.jsx";
import ObserveModelMixin from "./../ObserveModelMixin";
import ProgressBar from "../Map/ProgressBar.jsx";
import SidePanel from "./../SidePanel/SidePanel.jsx";
import processCustomElements from "./processCustomElements";
import FullScreenButton from "./../SidePanel/FullScreenButton.jsx";
import StoryPanel from "./../Story/StoryPanel.jsx";
import StoryBuilder from "./../Story/StoryBuilder.jsx";
import ToolPanel from "./../ToolPanel.jsx";

import SatelliteGuide from "../Guide/SatelliteGuide.jsx";
import WelcomeMessage from "../WelcomeMessage/WelcomeMessage.jsx";
import InternetExplorerOverlay from "../InternetExplorerOverlay/InternetExplorerOverlay.jsx";

import { Small, Medium } from "../Generic/Responsive";
import classNames from "classnames";
import "inobounce";
import AnalysisWindow from "./../AnalysisWindow/AnalysisWindow";
import ExportWindow from "./../ExportWindow/ExportWindow";

import { withTranslation } from "react-i18next";

import Styles from "./standard-user-interface.scss";
//import SepalWindow from "./../SepalWindow/SepalWindow";
//import CrtbWindow from "./../CRTBWindow/CrtbWindow";
import ConditionalyVisibleElement, {
  ElementsIdentifiers
} from "../ConditionalyVisibleElement";
import HelpSidebar from "../HelpSidebar/HelpSidebar";
import GeoJsonStyleEditor from "./../GeojsonStyleEditor/GeoJsonStyleEditor";
import defined from "terriajs-cesium/Source/Core/defined";
import knockout from "terriajs-cesium/Source/ThirdParty/knockout";
import { LazyComponent } from "../Generic/LazyComponent";

export const showStoryPrompt = (viewState, terria) => {
  terria.configParameters.showFeaturePrompts &&
    terria.configParameters.storyEnabled &&
    terria.stories.length === 0 &&
    viewState.toggleFeaturePrompt("story", true);
};
const animationDuration = 250;
/** blah */
const StandardUserInterface = createReactClass({
  displayName: "StandardUserInterface",
  mixins: [ObserveModelMixin],

  propTypes: {
    /**
     * Terria instance
     */
    terria: PropTypes.object.isRequired,
    /**
     * All the base maps.
     */
    allBaseMaps: PropTypes.array,
    viewState: PropTypes.object.isRequired,
    minimumLargeScreenWidth: PropTypes.number,
    version: PropTypes.string,
    children: PropTypes.oneOfType([
      PropTypes.arrayOf(PropTypes.element),
      PropTypes.element
    ]),
    t: PropTypes.func.isRequired
  },

  getDefaultProps() {
    return { minimumLargeScreenWidth: 768 };
  },

  /* eslint-disable-next-line camelcase */
  UNSAFE_componentWillMount() {
    const { t } = this.props;
    const that = this;
    // only need to know on initial load
    this.dragOverListener = e => {
      if (
        !e.dataTransfer.types ||
        !arrayContains(e.dataTransfer.types, "Files")
      ) {
        return;
      }
      e.preventDefault();
      e.stopPropagation();
      e.dataTransfer.dropEffect = "copy";
      that.acceptDragDropFile();
    };

    this.resizeListener = () => {
      this.props.viewState.useSmallScreenInterface = this.shouldUseMobileInterface();
    };

    window.addEventListener("resize", this.resizeListener, false);

    this.resizeListener();

    if (
      this.props.terria.configParameters.storyEnabled &&
      this.props.terria.stories &&
      this.props.terria.stories.length &&
      !this.props.viewState.storyShown
    ) {
      var message = null;
      if (
        defined(this.props.terria.hasUnauthorizedAccessForSharedData) &&
        this.props.terria.hasUnauthorizedAccessForSharedData
      ) {
        message = this.props.terria.userManagementServices.isLoggedIn
          ? t("authorization.unableToProvideAccessForAuthenticatedUser")
          : t("authorization.unableToProvideAccessForNonAuthenticatedUser");
        this.props.terria.hasUnauthorizedAccessForSharedData = false;
      }

      this.props.viewState.notifications.push({
        title: t("sui.notifications.title"),
        message: t("sui.notifications.message", {
          message: message
        }),
        confirmText: t("sui.notifications.confirmText"),
        denyText: t("sui.notifications.denyText"),
        confirmAction: () => {
          this.props.viewState.storyShown = true;
        },
        denyAction: () => {
          this.props.viewState.storyShown = false;
        },
        type: "story",
        width: 300
      });
    } else if (
      defined(this.props.terria.hasUnauthorizedAccessForSharedData) &&
      this.props.terria.hasUnauthorizedAccessForSharedData
    ) {
      const message = this.props.terria.userManagementServices.isLoggedIn
        ? t("authorization.unableToProvideAccessForAuthenticatedUser")
        : t("authorization.unableToProvideAccessForNonAuthenticatedUser");

      this.props.viewState.notifications.push({
        title: t("authorization.title"),
        message: message,
        confirmText: t("authorization.confirmText"),
        confirmAction: () => {},
        type: "story",
        width: 300
      });
      this.props.terria.hasUnauthorizedAccessForSharedData = false;
    }
  },

  getInitialState() {
    return {
      sepalWindowRequired: false,
      crtbWindowRequired: false
    };
  },

  componentDidMount() {
    var that = this;
    this._wrapper.addEventListener("dragover", this.dragOverListener, false);
    showStoryPrompt(this.props.viewState, this.props.terria);
    knockout
      .getObservable(this.props.terria, "hasUnauthorizedAccessForSharedData")
      .subscribe(type => {
        if (that.props.terria.hasUnauthorizedAccessForSharedData) {
          const message = that.props.terria.userManagementServices.isLoggedIn
            ? that.props.t(
                "authorization.unableToProvideAccessForAuthenticatedUser"
              )
            : that.props.t(
                "authorization.unableToProvideAccessForNonAuthenticatedUser"
              );

          that.props.viewState.notifications.push({
            title: that.props.t("authorization.title"),
            message: message,
            confirmText: that.props.t("authorization.confirmText"),
            confirmAction: () => {},
            type: "story",
            width: 300
          });
          that.props.terria.hasUnauthorizedAccessForSharedData = false;
        }
      });

    this.setupLazyComponents();
  },

  setupLazyComponents() {
    var that = this;
    this.props.terria.setCrtbModalVisibility = knockout.observable(
      "crtbModalVisibility"
    );

    this.props.terria.setCrtbModalVisibility.subscribe(data => {
      if (data && data.visibility) {
        that.setState({
          crtbWindowRequired: true
        });
      }
    });

    this.props.terria.setSepalModalVisibility = knockout.observable(
      "sepalModalVisibility"
    );

    this.props.terria.setSepalModalVisibility.subscribe(data => {
      if (data && data.visibility) {
        that.setState({
          sepalWindowRequired: true
        });
      }
    });
  },

  componentWillUnmount() {
    window.removeEventListener("resize", this.resizeListener, false);
    document.removeEventListener("dragover", this.dragOverListener, false);
  },

  acceptDragDropFile() {
    this.props.viewState.isDraggingDroppingFile = true;
    // if explorer window is already open, we open my data tab
    if (this.props.viewState.explorerPanelIsVisible) {
      this.props.viewState.openUserData();
    }
  },

  shouldUseMobileInterface() {
    return document.body.clientWidth < this.props.minimumLargeScreenWidth;
  },

  render() {
    const { t } = this.props;
    const { sepalWindowRequired, crtbWindowRequired } = this.state;

    const customElements = processCustomElements(
      this.props.viewState.useSmallScreenInterface,
      this.props.children
    );

    const terria = this.props.terria;
    const allBaseMaps = this.props.allBaseMaps;

    // eslint-disable-next-line eqeqeq
    const hideAllUi = this.props.terria.userProperties.hideAllUi == "1";

    const showStoryBuilder =
      this.props.viewState.storyBuilderShown &&
      !this.shouldUseMobileInterface();
    const showStoryPanel =
      this.props.terria.configParameters.storyEnabled &&
      this.props.terria.stories.length &&
      this.props.viewState.storyShown &&
      !this.props.viewState.explorerPanelIsVisible &&
      !this.props.viewState.storyBuilderShown;

    const showHelpSidebar =
      this.props.viewState.helpSidebarShown && !this.shouldUseMobileInterface();

    return (
      <div className={Styles.storyWrapper}>
        <InternetExplorerOverlay viewState={this.props.viewState} />
        <WelcomeMessage viewState={this.props.viewState} />
        <div
          className={classNames(Styles.uiRoot, {
            [Styles.withStoryBuilder]: showStoryBuilder || showHelpSidebar
          })}
          ref={w => (this._wrapper = w)}
        >
          <div className={Styles.ui}>
            <div className={Styles.uiInner}>
              <If
                condition={
                  !this.props.viewState.hideMapUi() &&
                  !this.props.viewState.showToolPanel()
                }
              >
                <Small>
                  <ConditionalyVisibleElement
                    id={ElementsIdentifiers.hideSidePanel}
                    terria={terria}
                  >
                    <MobileHeader
                      terria={terria}
                      menuItems={customElements.menu}
                      viewState={this.props.viewState}
                      version={this.props.version}
                      allBaseMaps={allBaseMaps}
                    />
                  </ConditionalyVisibleElement>
                </Small>
                <ConditionalyVisibleElement
                  id={ElementsIdentifiers.hideSidePanel}
                  terria={terria}
                >
                  <Medium>
                    <div
                      className={classNames(
                        Styles.sidePanel,
                        this.props.viewState.topElement === "SidePanel"
                          ? "top-element"
                          : "",
                        {
                          [Styles.sidePanelHide]: this.props.viewState
                            .isMapFullScreen
                        }
                      )}
                      tabIndex={0}
                      onClick={() => {
                        this.props.viewState.topElement = "SidePanel";
                      }}
                    >
                      <Branding terria={terria} version={this.props.version} />
                      <SidePanel
                        terria={terria}
                        viewState={this.props.viewState}
                      />
                    </div>
                  </Medium>
                </ConditionalyVisibleElement>
              </If>

              <If condition={this.props.viewState.showToolPanel()}>
                <ToolPanel viewState={this.props.viewState} />
              </If>

              <Medium>
                <div
                  className={classNames(Styles.showWorkbenchButton, {
                    [Styles.showWorkbenchButtonisVisible]: this.props.viewState
                      .isMapFullScreen,
                    [Styles.showWorkbenchButtonisNotVisible]: !this.props
                      .viewState.isMapFullScreen
                  })}
                >
                  <FullScreenButton
                    terria={this.props.terria}
                    viewState={this.props.viewState}
                    minified={false}
                    btnText={t("sui.showWorkbench")}
                    animationDuration={animationDuration}
                  />
                </div>
              </Medium>

              <section className={hideAllUi ? Styles.mapNoMargin : Styles.map}>
                <ProgressBar terria={terria} />
                <MapColumn
                  terria={terria}
                  viewState={this.props.viewState}
                  customFeedbacks={customElements.feedback}
                />
                <main>
                  <ExplorerWindow
                    terria={terria}
                    viewState={this.props.viewState}
                  />

                  <AnalysisWindow
                    terria={terria}
                    viewState={this.props.viewState}
                  />

                  <ExportWindow
                    terria={terria}
                    viewState={this.props.viewState}
                  />

                  <LazyComponent
                    load={React.lazy(() =>
                      import(
                        /* webpackChunkName: "sepalWindow" */ "./../SepalWindow/SepalWindow"
                      )
                    )}
                    condition={sepalWindowRequired /* customProperties.crtb */}
                    renderer={SepalWin => (
                      <SepalWin
                        terria={terria}
                        viewState={this.props.viewState}
                      />
                    )}
                  />

                  <LazyComponent
                    load={React.lazy(() =>
                      import(
                        /* webpackChunkName: "crtbWindow" */ "./../CRTBWindow/CrtbWindow"
                      )
                    )}
                    condition={crtbWindowRequired /* customProperties.crtb */}
                    renderer={CrtbWin => (
                      <CrtbWin
                        terria={terria}
                        viewState={this.props.viewState}
                      />
                    )}
                  />

                  <GeoJsonStyleEditor
                    terria={terria}
                    viewState={this.props.viewState}
                  />

                  <If
                    condition={
                      this.props.terria.configParameters.experimentalFeatures &&
                      !this.props.viewState.hideMapUi()
                    }
                  >
                    <ExperimentalFeatures
                      terria={terria}
                      viewState={this.props.viewState}
                      experimentalItems={customElements.experimentalMenu}
                    />
                  </If>
                </main>
              </section>
            </div>
          </div>

          <If condition={!this.props.viewState.hideMapUi()}>
            <div
              className={classNames({
                [Styles.explorerPanelIsVisible]: this.props.viewState
                  .explorerPanelIsVisible
              })}
            >
              <MenuBar
                terria={terria}
                viewState={this.props.viewState}
                allBaseMaps={allBaseMaps}
                menuItems={customElements.menu}
                animationDuration={animationDuration}
              />

              <If condition={!hideAllUi}>
                <MapNavigationSection
                  terria={terria}
                  viewState={this.props.viewState}
                  navItems={customElements.nav}
                  customFeedbacks={customElements.feedback}
                />
              </If>
            </div>
          </If>

          <If
            condition={
              !hideAllUi && this.props.viewState.explorerPanelIsVisible
            }
          >
            <div className={classNames(Styles.feedbackButton)}>
              <FeedbackButton
                viewState={this.props.viewState}
                btnText={t("feedback.feedbackBtnText")}
              />
            </div>
          </If>

          <Notification viewState={this.props.viewState} />
          <SatelliteGuide terria={terria} viewState={this.props.viewState} />
          <MapInteractionWindow
            terria={terria}
            viewState={this.props.viewState}
          />

          <If
            condition={
              !customElements.feedback.length &&
              this.props.terria.configParameters.feedbackUrl &&
              !this.props.viewState.hideMapUi()
            }
          >
            <aside className={Styles.feedback}>
              <FeedbackForm viewState={this.props.viewState} />
            </aside>
          </If>

          <div
            className={classNames(
              Styles.featureInfo,
              this.props.viewState.topElement === "FeatureInfo"
                ? "top-element"
                : "",
              {
                [Styles.featureInfoFullScreen]: this.props.viewState
                  .isMapFullScreen
              }
            )}
            tabIndex={0}
            onClick={() => {
              this.props.viewState.topElement = "FeatureInfo";
            }}
          >
            <FeatureInfoPanel
              terria={terria}
              viewState={this.props.viewState}
            />
          </div>
          <DragDropFile
            terria={this.props.terria}
            viewState={this.props.viewState}
          />
          <DragDropNotification
            lastUploadedFiles={this.props.viewState.lastUploadedFiles}
            viewState={this.props.viewState}
            t={this.props.t}
          />
          <If condition={showStoryPanel}>
            <StoryPanel terria={terria} viewState={this.props.viewState} />
          </If>
        </div>
        {this.props.terria.configParameters.storyEnabled &&
          !showHelpSidebar && (
            <StoryBuilder
              isVisible={showStoryBuilder}
              terria={terria}
              viewState={this.props.viewState}
              animationDuration={animationDuration}
            />
          )}

        {!showStoryBuilder && (
          <HelpSidebar
            isVisible={showHelpSidebar}
            terria={terria}
            viewState={this.props.viewState}
            animationDuration={animationDuration}
          />
        )}
      </div>
    );
  }
});

export const StandardUserInterfaceWithoutTranslation = StandardUserInterface;

export default withTranslation()(StandardUserInterface);
