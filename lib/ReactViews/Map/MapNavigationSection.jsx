import React from "react";
import PropTypes from "prop-types";
import createReactClass from "create-react-class";
import ObserveModelMixin from "./../ObserveModelMixin";
import MapNavigation from "./../Map/MapNavigation.jsx";
import FeedbackButton from "../Feedback/FeedbackButton.jsx";
import defined from "terriajs-cesium/Source/Core/defined";
import { withTranslation } from "react-i18next";
import classNames from "classnames";

import Styles from "./map-navigation-section.scss";
import ConditionalyVisibleElement, {
  ElementsIdentifiers
} from "../ConditionalyVisibleElement";
import Taskbar from "./Navigation/Taskbar";

const MapNavigationSection = createReactClass({
  displayName: "MapNavigationSection",
  mixin: [ObserveModelMixin],

  propTypes: {
    terria: PropTypes.object.isRequired,
    viewState: PropTypes.object.isRequired,
    navItems: PropTypes.arrayOf(PropTypes.element),
    customFeedbacks: PropTypes.array.isRequired,
    t: PropTypes.func.isRequired
  },

  render() {
    const { t } = this.props;

    return (
      <div className={Styles.mapNavigationSection}>
        <div className={Styles.mapNavigationTop}>
          <MapNavigation
            terria={this.props.terria}
            viewState={this.props.viewState}
            navItems={this.props.navItems}
          />
        </div>
        {/* <div style={{ flex: 1 }} /> */}
        <div style={{ flex: 1 }}>
          <Taskbar viewState={this.props.viewState} t={t} />
        </div>
        <div
          className={classNames(Styles.mapNavigationBottom, {
            [Styles.withTimeSeriesControls]: defined(
              this.props.terria.timeSeriesStack.topLayer
            )
          })}
        >
          <If
            condition={
              !this.props.customFeedbacks.length &&
              this.props.terria.configParameters.feedbackUrl &&
              !this.props.viewState.hideMapUi()
            }
          >
            <ConditionalyVisibleElement
              id={ElementsIdentifiers.hideFeedback}
              terria={this.props.terria}
            >
              <FeedbackButton
                viewState={this.props.viewState}
                btnText={t("feedback.feedbackBtnText")}
              />
            </ConditionalyVisibleElement>
          </If>
          <If
            condition={
              this.props.customFeedbacks.length &&
              this.props.terria.configParameters.feedbackUrl &&
              !this.props.viewState.hideMapUi()
            }
          >
            <For each="feedbackItem" of={this.props.customFeedbacks} index="i">
              <div key={i}>{feedbackItem}</div>
            </For>
          </If>
        </div>
      </div>
    );
  }
});

export default withTranslation()(MapNavigationSection);
