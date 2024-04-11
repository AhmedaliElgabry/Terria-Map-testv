import React from "react";
import PropTypes from "prop-types";
import createReactClass from "create-react-class";
import Icon from "../Icon.jsx";
import Styles from "./export-button.scss";
import defined from "terriajs-cesium/Source/Core/defined";
import { withTranslation } from "react-i18next";

const ExportButton = createReactClass({
  propTypes: {
    viewState: PropTypes.object.isRequired,
    terria: PropTypes.object.isRequired,
    catalogItem: PropTypes.object.isRequired,
    t: PropTypes.func.isRequired
  },
  getInitialState() {
    return {
      isOpen: false
    };
  },
  render() {
    const { catalogItem, t } = this.props;

    if (
      !defined(catalogItem.linkedWcsUrl) &&
      !defined(catalogItem.linkedWcsCoverage) &&
      !defined(catalogItem?.customProperties?.allowExport?.coverage)
    ) {
      return "";
    }

    const canBeExported =
      (catalogItem.linkedWcsUrl != undefined ||
        defined(this.props.terria.configParameters.exportServiceUrl)) &&
      (catalogItem.linkedWcsCoverage != "" ||
        (defined(catalogItem?.customProperties?.allowExport?.coverage) &&
          catalogItem.customProperties.allowExport.coverage != ""));

    const that = this;
    return (
      <div>
        <If condition={canBeExported}>
          <button
            type="button"
            className={Styles.exportButton}
            onClick={() =>
              that.props.terria.setExportModalVisibility({
                visibility: true,
                catalogItem: catalogItem
              })
            }
          >
            <Icon glyph={Icon.GLYPHS.lineChart} />{" "}
            {t("featureInfo.exportImage")}
          </button>
        </If>
      </div>
    );
  }
});

export default withTranslation()(ExportButton);
