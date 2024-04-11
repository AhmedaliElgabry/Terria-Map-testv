import React from "react";
import PropTypes from "prop-types";

import MenuPanel from "./customizable/MenuPanel.jsx";
import PanelStyles from "../Map/Panels/panel.scss";
import Styles from "./RelatedSites.scss";
import classNames from "classnames";
import { withTranslation } from "react-i18next";

function RelatedSites(props) {
  const {
    configParameters: { relatedSites }
  } = props.viewState.terria;
  const { t } = props;
  const dropdownTheme = {
    inner: Styles.dropdownInner,
    icon: "gallery"
  };

  if (!(Array.isArray(relatedSites) && relatedSites.length)) return null;

  return (
    <MenuPanel
      id="relatedSitesMenuItem"
      theme={dropdownTheme}
      btnText={t("relatedSites.title")}
      smallScreen={props.smallScreen}
      viewState={props.viewState}
      btnTitle={t("relatedSites.title")}
      showDropdownInCenter
    >
      <div className={classNames(PanelStyles.header)}>
        <h2 style={{ marginTop: "5px" }}>{t("relatedSites.title")}</h2>
      </div>

      {relatedSites.map((site, i) => renderSite(site, i))}
    </MenuPanel>
  );
}

function renderSite(site, i) {
  return (
    <div
      key={"related_map_" + i}
      className={classNames(PanelStyles.section, Styles.section)}
    >
      <a
        target="_blank"
        className={Styles.link}
        href={site.url}
        rel="noreferrer"
      >
        <label className={Styles.siteName}>{site.name}</label>
        <div className={Styles.subSection}>
          {site.logo && site.logo.length && (
            <img
              className={Styles.image}
              src={site.logo}
              alt={site.name + " logo"}
            />
          )}
          <p className={Styles.siteDescription}>{site.description}</p>
        </div>
      </a>

      <hr />
    </div>
  );
}

RelatedSites.propTypes = {
  viewState: PropTypes.object.isRequired,
  smallScreen: PropTypes.bool,
  t: PropTypes.func.isRequired
};

export default withTranslation()(RelatedSites);
