import createReactClass from "create-react-class";
import ObserveModelMixin from "../../ObserveModelMixin";
import PropTypes from "prop-types";
import React from "react";
import _Styles from "./disclaimer-panel.scss";
import classNames from "classnames";
import Styles from "../../WelcomeMessage/welcome-message.scss";
import Icon from "../../Icon.jsx";
import FadeIn from "../../Transitions/FadeIn/FadeIn";
import SlideUpFadeIn from "../../Transitions/SlideUpFadeIn/SlideUpFadeIn";
import Spacing from "../../../Styled/Spacing";
import { disclaimer } from "./disclaimer-message";

/**
 * Currently disabled if needed add it in BottomDock
        <div className={Styles.bottomDockContent}>
          <DisclaimerPanel
            viewState={{
                        useSmallScreenInterface: false,
                        shareModalIsVisible: true
                      }}
            terria={this.props.viewState.terria}
          />
        </div> 
 * 
 */

const DisclaimerPanel = createReactClass({
  displayName: "DisclaimerPanel",
  state: {},
  mixins: [ObserveModelMixin],

  propTypes: {
    terria: PropTypes.object.isRequired,
    viewState: PropTypes.object.isRequired
  },
  getInitialState() {
    return {
      isOpen: false
    };
  },
  changeOpenState(open) {
    this.setState({
      isOpen: open
    });
  },
  getDefaultProps() {
    return {
      navItems: [],
      state: {}
    };
  },
  renderContent() {
    const handleClose = () => {
      this.setState({
        isOpen: false
      });
    };

    const { isOpen } = this.state;
    const useSmallScreenInterface = true;

    return (
      <FadeIn isVisible={isOpen}>
        <div
          className={classNames({
            [Styles.welcomeModalWrapper]: true,
            "top-element": isOpen
          })}
          onClick={handleClose.bind(null, false)}
        >
          <SlideUpFadeIn isVisible={isOpen}>
            <article className={Styles.welcomeModal}>
              <button
                type="button"
                className={Styles.closeBtn}
                onClick={() => handleClose(true)}
                title="Close"
                aria-label="Close"
              >
                <Icon glyph={Icon.GLYPHS.close} />
              </button>
              <h2>Disclaimer</h2>
              <span className={Styles.welcomeModalBody}>
                <div>{disclaimer.message}</div>
                <If condition={!useSmallScreenInterface}>
                  <Spacing bottom={10} />
                </If>
                <If condition={useSmallScreenInterface}>
                  <Spacing bottom={4} />
                </If>
                <div>
                  {
                    <button
                      className={classNames(
                        Styles.welcomeModalButton,
                        Styles.welcomeModalButtonTertiary
                      )}
                      onClick={() => {
                        handleClose(true);
                      }}
                    >
                      Close
                    </button>
                  }
                </div>
              </span>
            </article>
          </SlideUpFadeIn>
        </div>
      </FadeIn>
    );
  },
  render() {
    if (!this.state) this.setState({});

    return (
      <div>
        <button
          className={classNames(_Styles.btnDisclaimer)}
          onClick={() => {
            this.setState({ isOpen: true });
          }}
        >
          Disclaimer
        </button>
        {this.renderContent()}
      </div>
    );
  }
});

export default DisclaimerPanel;
