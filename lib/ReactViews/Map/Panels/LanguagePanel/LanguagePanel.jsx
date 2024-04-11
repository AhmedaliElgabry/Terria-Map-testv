"use strict";

import React from "react";
import createReactClass from "create-react-class";
import PropTypes from "prop-types";
import ObserverModelMixin from "../../../ObserveModelMixin";
import MenuPanel from "../../../StandardUserInterface/customizable/MenuPanel.jsx";
import { withTranslation } from "react-i18next";
import Styles from "./module.style.scss";
import i18next from "i18next";
import i18n from "../../../../Models/i18n";
import classNames from "classnames";
import _languageMap from "../../../../Language/langMap.json";

const languageMap = {};

const LanguagePanel = createReactClass({
  displayName: "LanguagePanel",
  mixins: [ObserverModelMixin],
  propTypes: {
    terria: PropTypes.object,
    viewState: PropTypes.object.isRequired,
    t: PropTypes.func.isRequired
  },
  getInitialState() {
    return {
      isOpen: false,
      lang: i18n.language,
      currentLanguageName: ""
    };
  },
  componentDidMount() {
    const { terria } = this.props;

    terria?.configParameters.availableLanguages?.forEach(lng => {
      languageMap[lng] = _languageMap[lng];
    });

    // TODO: filter out only available languages
    const langFromUrl = new URLSearchParams(location.search).get("lang");
    if (i18n.language !== langFromUrl) {
      i18n.changeLanguage(langFromUrl);
    }

    const currentLanguageName = this.getLanguageName();

    this.setState({
      lang: i18n.language,
      currentLanguageName
    });

    this.languageChanged(langFromUrl);
  },
  onOpenChanged(open) {
    this.setState({
      isOpen: open
    });
  },
  languageChanged(lang) {
    this.setState({
      lng: lang
    });

    i18next.changeLanguage(lang);
  },
  getLanguageName() {
    const langFromUrl = new URLSearchParams(location.search).get("lang");

    if (langFromUrl) {
      this.setState({
        lang: langFromUrl
      });
      return languageMap[langFromUrl];
    } else {
      const fallbackLanguage = "en";
      const lang = languageMap[fallbackLanguage];
      this.setState({
        lang: fallbackLanguage
      });
      this.updateUrlParameter("lang", fallbackLanguage);
      return lang;
    }
  },
  updateUrlParameter(key, value) {
    const params = new URLSearchParams(location.search);
    params.set(key, value);
    window.location.search = params.toString();
  },
  shouldHideLanguageSelector() {
    const { terria } = this.props;
    return (
      terria.configParameters.hideLanguageSelector ||
      terria.configParameters.availableLanguages?.length < 2
    );
  },
  onLanguageSelectorClick(key) {
    this.languageChanged(key);
    this.updateUrlParameter("lang", key);
  },
  render() {
    const dropdownTheme = {
      btn: Styles.btnShare,
      outer: Styles.ToolsPanel,
      inner: Styles.dropdownInner,
      icon: "translate"
    };
    const { lng, currentLanguageName } = this.state;

    if (this.shouldHideLanguageSelector()) {
      return null;
    }

    return (
      <MenuPanel
        id="languageSelectorMenuItem"
        theme={dropdownTheme}
        btnText={currentLanguageName}
        viewState={this.props.viewState}
        onOpenChanged={this.onOpenChanged}
        isOpen={this.state.isOpen}
        smallScreen={this.props.viewState.useSmallScreenInterface}
      >
        <div className={Styles.availableLanguges}>
          <ul>
            {Object.entries(languageMap).map(([key, value]) => (
              <li
                className={classNames(key === lng && Styles.active)}
                key={key}
              >
                <button
                  onClick={() => {
                    this.onLanguageSelectorClick(key);
                  }}
                >
                  {value}
                </button>
              </li>
            ))}
          </ul>
        </div>
      </MenuPanel>
    );
  }
});

export default withTranslation()(LanguagePanel);
