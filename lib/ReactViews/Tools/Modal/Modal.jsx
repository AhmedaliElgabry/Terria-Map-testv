import React, { useState, useEffect } from "react";
import PropTypes from "prop-types";
import classNames from "classnames";
import Styles from "./modal.scss";
import "./modal.scss";
import { WindowsManager } from "../../../Models/WindowManagement";
import { uniqueId } from "lodash";
import ObserveModelMixin from "./../../ObserveModelMixin";
import createReactClass from "create-react-class";
import { withTranslation } from "react-i18next";
import { ModalSizes } from "./ModalSizes";

("use strict");

export const ModalWindowButtons = {
  Minimize: 1,
  Close: 2
};

const SLIDE_DURATION = 300;

function ModalComponent(props) {
  const [slideIn, setSlideIn] = useState(false);

  const {
    children,
    visible,
    close,
    id,
    t,
    title,
    windowButtons: windowButtons = [
      ModalWindowButtons.Minimize,
      ModalWindowButtons.Close
    ],
    minimized: minimized = false,
    minimize: minimize = () => {},
    closeOnEsc: closeOnEsc = true,
    animate: animate = true,
    size: size = null,
    icon: icon = null,
    footer: footer = null
  } = props;

  useEffect(() => {
    const escKeyListener = e => {
      // Only explicitly check share modal state, move to levels/"layers of modals" logic if we need to go any deeper
      if (e.keyCode === 27 && closeOnEsc) {
        close();
      }
    };
    window.addEventListener("keydown", escKeyListener, true);

    return () => {
      // Window stays mounted, but leave this in to ensure it gets cleaned up if that ever changes
      window.removeEventListener("keydown", escKeyListener, true);
    };
  }, []);

  useEffect(() => {
    if (animate) {
      setTimeout(() => {
        setTimeout(() => {
          setSlideIn(visible);
        }, SLIDE_DURATION);
      });
    } else {
      setSlideIn(visible);
    }
  }, [visible, animate]);

  const minimizeEnabled =
    windowButtons.indexOf(ModalWindowButtons.Minimize) > -1;
  const closeEnabled = windowButtons.indexOf(ModalWindowButtons.Close) > -1;

  return visible ? (
    <div
      className={classNames(Styles.modalWrapper, "top-element")}
      hidden={minimized}
      id={id + "-wrapper"}
      aria-hidden={!visible}
    >
      <div
        onClick={close}
        id="modal-overlay"
        className={Styles.modalOverlay}
        tabIndex="-1"
      />

      <div
        id={id}
        className={classNames(Styles.modalContentPanel, Styles.modalContent, {
          [Styles.isMounted]: slideIn
        })}
        aria-labelledby="modalTitle"
        aria-describedby="modalDescription"
        role="dialog"
        style={{
          height: `${
            size == null || size == ModalSizes.Auto ? "auto" : 100 * size
          }%`,
          maxWidth:
            size == null || size == ModalSizes.Auto
              ? ModalSizes.Medium * 750
              : size * 750
        }}
      >
        <div className={Styles.modalTitleBarContainer}>
          <div className={Styles.modalTitleBar}>
            <div>{icon == null ? "" : icon}</div>
            <div className={Styles.modalTitle}>{title}</div>
            <div className={Styles.modalCtrlButtonsContainer}>
              {minimizeEnabled && (
                <button
                  type="button"
                  onClick={minimize}
                  className={Styles.modalControlBtn}
                  title={t("Minimize")}
                >
                  &ndash;
                </button>
              )}
              {closeEnabled && (
                <button
                  type="button"
                  onClick={close}
                  className={Styles.modalControlBtn}
                  title={t("Close")}
                  data-target="close-modal"
                >
                  &times;
                </button>
              )}
            </div>
          </div>
        </div>
        <div className={Styles.modalBodyScrollContainer} style={{ flex: 1 }}>
          <div className={Styles.modalBody}>{children}</div>
        </div>
        {footer}
        <div />
      </div>
    </div>
  ) : null;
}

const commonModalPropTypes = {
  t: PropTypes.func,
  visible: PropTypes.bool.isRequired,
  close: PropTypes.func.isRequired,
  closeOnEsc: PropTypes.bool,
  animate: PropTypes.bool,
  size: PropTypes.number,
  scale: PropTypes.number,
  windowButtons: PropTypes.arrayOf(PropTypes.number),
  title: PropTypes.any.isRequired,
  icon: PropTypes.any,
  footer: PropTypes.any
};

ModalComponent.propTypes = {
  id: PropTypes.string,
  minimize: PropTypes.func,
  minimized: PropTypes.bool,
  ...commonModalPropTypes
};

const Modal = createReactClass({
  displayName: "Modal",
  mixins: [ObserveModelMixin],
  id: "",
  propTypes: {
    viewState: PropTypes.object.isRequired,
    ...commonModalPropTypes
  },
  onMinimize() {
    const state = WindowsManager.minimizeWindow(
      this.props.viewState.modalWindows,
      this.id
    );
    this.props.viewState.setModalWindows(state);
  },
  onClose() {
    const state = WindowsManager.closeWindow(
      this.props.viewState.modalWindows,
      this.id
    );
    this.props.viewState.setModalWindows(state);
    //this.props.close()
  },
  componentDidMount() {},
  componentWillMount() {},
  componentDidUpdate(prevProps) {
    //console.log("modal did update", this.id);
    if (this.props.visible && !prevProps.visible) {
      this.id = uniqueId("modal-");
      const state = WindowsManager.addWindow(
        this.props.viewState.modalWindows,
        this.id,
        this.props.title,
        this.props.icon,
        this.props.close
      );
      this.props.viewState.setModalWindows(state);
    } else if (!this.props.visible && prevProps.visible) {
      const win = this.props.viewState.modalWindows.list.find(
        w => w.id == this.id
      );
      if (!win) return;
      const state = WindowsManager.closeWindow(
        this.props.viewState.modalWindows,
        this.id
      );
      this.props.viewState.setModalWindows(state);
    }
  },
  render() {
    const modalWindow = this.props.viewState.modalWindows.list.find(
      w => w.id == this.id
    );
    return (
      <ModalComponent
        t={this.props.t}
        visible={this.props.visible}
        closeOnEsc={this.props.closeOnEsc}
        animate={this.props.animate}
        size={this.props.size}
        scale={this.props.scale}
        windowButtons={this.props.windowButtons}
        title={this.props.title}
        icon={this.props.icon}
        minimize={this.onMinimize}
        minimized={modalWindow != null ? modalWindow.minimized : false}
        id={this.id}
        close={this.onClose}
        footer={this.props.footer}
      >
        {this.props.children}
      </ModalComponent>
    );
  }
});

module.exports = withTranslation()(Modal);
