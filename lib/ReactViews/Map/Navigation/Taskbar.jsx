import createReactClass from "create-react-class";
import React, { useEffect, useMemo, useState } from "react";
import { withTranslation } from "react-i18next";
import { WindowsManager } from "../../../Models/WindowManagement";
import ObserveModelMixin from "./../../ObserveModelMixin";
import PropTypes from "prop-types";
import Styles from "./taskbar.scss";
import "./taskbar.scss";
import Icon from "../../Icon";
import classNames from "classnames";

function TaskbarComp(props) {
  const { modalWindows, setModalWindows, t } = props;

  const [hideList, setHideList] = useState(false);

  const openWindow = useMemo(() => {
    return modalWindows.list.find(w => !w.minimized);
  }, [modalWindows]);

  const onToggleWindow = w => {
    const state = w.minimized
      ? WindowsManager.restoreWindow(modalWindows, w.id)
      : WindowsManager.minimizeWindow(modalWindows, w.id);
    setModalWindows(state);
  };

  const onCloseWindow = (e, w) => {
    e.stopPropagation();
    const state = WindowsManager.closeWindow(modalWindows, w.id);
    setModalWindows(state);
  };

  if (modalWindows.list.length == 0 || openWindow != null) return null;

  return (
    <div className={Styles.taskbarContainer}>
      <div className={Styles.taskbarWindowListContainer}>
        <div className={Styles.taskbarWindowList}>
          <div style={{ flex: 1 }} />
          {modalWindows.list.map(w => (
            <div
              key={w.id}
              onClick={_ => onToggleWindow(w)}
              className={classNames(
                Styles.taskButton,
                hideList ? Styles.taskButtonHidden : ""
              )}
              title={w.title}
            >
              <div style={{ display: "flex", gap: "3px" }}>
                <div>{w.icon}</div>
                <div className={Styles.taskButtonTitle}>{w.title}</div>
                <div
                  className={Styles.taskButtonClose}
                  title={t("Close")}
                  onClick={e => onCloseWindow(e, w)}
                  onMouseDown={e => e.stopPropagation()}
                >
                  &times;
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div
        className={Styles.taskbarSummary}
        onClick={_ => setHideList(!hideList)}
      >
        <Icon glyph={Icon.GLYPHS.externalLink} />
        <span className={Styles.taskbarSummaryInfo}>{t("RESTORE")}</span>
        <span className={Styles.taskbarSummaryCount}>
          {modalWindows.list.length}
        </span>
      </div>
    </div>
  );
}

const Taskbar = createReactClass({
  displayName: "Taskbar",
  mixins: [ObserveModelMixin],
  propTypes: {
    viewState: PropTypes.object.isRequired,
    t: PropTypes.func.isRequired
  },
  setModalWindows(state) {
    this.props.viewState.featureInfoPanelIsVisible = false;
    this.props.viewState.setModalWindows(state);
  },
  render() {
    return (
      <TaskbarComp
        modalWindows={this.props.viewState.modalWindows}
        setModalWindows={this.setModalWindows}
        t={this.props.t}
      />
    );
  }
});

module.exports = withTranslation()(Taskbar);
