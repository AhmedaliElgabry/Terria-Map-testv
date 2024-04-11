"use strict";

import ObserveModelMixin from "../ObserveModelMixin";
import React from "react";
import createReactClass from "create-react-class";
import parseCustomMarkdownToReact from "../Custom/parseCustomMarkdownToReact";
import PropTypes from "prop-types";
import sendFeedback from "../../Models/sendFeedback.js";
import Styles from "./feedback-form.scss";
import Icon from "../Icon.jsx";
import classNames from "classnames";
import { withTranslation, Trans } from "react-i18next";
import Select, { StylesConfig } from "react-select";

const feedbackTypes = [
  {
    label: "Functionality Issue",
    value: "Functionality Issue",
    color: "#ff5722"
  },
  {
    label: "Data Issue",
    color: "#ff9800",
    value: "Data Issue"
  },
  {
    label: "Request Data",
    value: "Request Data",
    color: "#2196f3"
  },
  {
    label: "Suggestion",
    value: "Suggestion",
    color: "#00bcd4"
  },
  {
    label: "Other Support",
    value: "Other Support",
    color: "#009688"
  }
];

const dot = (color = "transparent") => ({
  alignItems: "center",
  display: "flex",

  ":before": {
    backgroundColor: color,
    borderRadius: 10,
    content: '" "',
    display: "block",
    marginRight: 8,
    height: 15,
    width: 15
  }
});

const dropdownStyle = {
  control: styles => ({ ...styles, backgroundColor: "white" }),
  option: (styles, { data, isDisabled, isFocused, isSelected }) => {
    return {
      ...styles,
      backgroundColor: "#fff",
      color: "#444",
      // borderBottom: `solid 1px ${color}`,
      borderRadius: "20px",
      cursor: isDisabled ? "not-allowed" : "pointer",
      ...dot(data.color)
    };
  },
  input: styles => ({ ...styles, ...dot() }),
  placeholder: styles => ({ ...styles, ...dot("#555") }),
  singleValue: (styles, { data }) => ({ ...styles, ...dot(data.color) }),
  menuPortal: base => ({ ...base, zIndex: 99999 })
};

const FeedbackForm = createReactClass({
  displayName: "FeedbackForm",
  mixins: [ObserveModelMixin],

  propTypes: {
    viewState: PropTypes.object.isRequired,
    t: PropTypes.func.isRequired
  },

  getInitialState() {
    return {
      isSending: false,
      sendShareURL: true,
      name: "",
      email: "",
      comment: "",
      feedbackType: null
    };
  },

  componentDidMount() {
    this.escKeyListener = e => {
      if (e.keyCode === 27) {
        this.onDismiss();
      }
    };
    window.addEventListener("keydown", this.escKeyListener, true);
  },

  componentWillUnmount() {
    // Feedback form stays mounted, but leave this in to ensure it gets cleaned up if that ever changes
    window.removeEventListener("keydown", this.escKeyListener, true);
  },

  onDismiss() {
    this.props.viewState.feedbackFormIsVisible = false;
    this.setState({ ...this.getInitialState(), isDismissed: true });
  },

  onSubmit(evt) {
    evt.preventDefault();

    if (this.state.comment.length > 0) {
      this.setState({
        isSending: true
      });

      // submit form
      sendFeedback({
        terria: this.props.viewState.terria,
        name: this.state.name,
        email: this.state.email,
        sendShareURL: this.state.sendShareURL,
        comment: this.state.comment,
        feedbackType: this.state.feedbackType?.value || "Other support"
      }).then(succeeded => {
        if (succeeded) {
          this.setState({
            isSending: false,
            comment: ""
          });
          this.props.viewState.feedbackFormIsVisible = false;
        } else {
          this.setState({
            isSending: false
          });
        }
      });
    }

    return false;
  },

  handleChange(e) {
    this.setState({
      [e.target.getAttribute("name")]: e.target.value
    });
  },

  changeSendShareUrl(e) {
    this.setState({
      sendShareURL: !this.state.sendShareURL
    });
  },

  render() {
    const { t } = this.props;
    const preamble = parseCustomMarkdownToReact(
      this.props.viewState.terria.configParameters.feedbackPreamble ||
        t("feedback.feedbackPreamble")
    );

    const feedbackFormClassNames = classNames(Styles.form, {
      [Styles.isOpen]: this.props.viewState.feedbackFormIsVisible,
      [Styles.isDismissed]:
        this.state.isDismissed && !this.props.viewState.feedbackFormIsVisible
    });

    return (
      <div className="feedback__inner">
        <div className={feedbackFormClassNames}>
          <div className={Styles.header}>
            <h4 className={Styles.title}>{t("feedback.title")}</h4>
            <button
              className={Styles.btnClose}
              onClick={this.onDismiss}
              title={t("feedback.close")}
            >
              <Icon glyph={Icon.GLYPHS.close} />
            </button>
          </div>
          <form onSubmit={this.onSubmit}>
            <div className={Styles.description}>{preamble}</div>
            <label className={Styles.label}>{t("feedback.yourName")}</label>
            <input
              type="text"
              name="name"
              className={Styles.field}
              value={this.state.name}
              onChange={this.handleChange}
            />
            <label className={Styles.label}>
              <Trans i18nKey="feedback.email">
                Email address (optional)
                <br />
                <em>We can&#39;t follow up without it!</em>
              </Trans>
            </label>
            <input
              type="text"
              name="email"
              className={Styles.field}
              value={this.state.email}
              onChange={this.handleChange}
            />
            <label className={Styles.label}>
              {t("feedback.type")}
              <br />
              <em>{t("feedback.typeText")}</em>
            </label>
            <Select
              placeholder="Select Type"
              options={feedbackTypes}
              styles={dropdownStyle}
              value={this.state.feedbackType}
              onChange={value => this.setState({ feedbackType: value })}
              menuPortalTarget={document.body}
              menuShouldScrollIntoView={true}
            />
            <br />
            <label className={Styles.label}>
              {t("feedback.commentQuestion")}
            </label>
            <textarea
              className={Styles.field}
              name="comment"
              value={this.state.comment}
              onChange={this.handleChange}
            />
            <div className={Styles.shareUrl}>
              <button onClick={this.changeSendShareUrl} type="button">
                {this.state.sendShareURL ? (
                  <Icon glyph={Icon.GLYPHS.checkboxOn} />
                ) : (
                  <Icon glyph={Icon.GLYPHS.checkboxOff} />
                )}
                {t("feedback.shareWithDevelopers", {
                  appName: this.props.viewState.terria.appName
                })}
                <br />
                <small>{t("feedback.captionText")}</small>
              </button>
            </div>
            <div className={Styles.action}>
              <button
                type="button"
                className={Styles.btnCancel}
                onClick={this.onDismiss}
              >
                {t("feedback.cancel")}
              </button>
              <button
                type="submit"
                className={Styles.btnSubmit}
                disabled={this.state.isSending}
              >
                {this.state.isSending
                  ? t("feedback.sending")
                  : t("feedback.send")}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }
});

module.exports = withTranslation()(FeedbackForm);
