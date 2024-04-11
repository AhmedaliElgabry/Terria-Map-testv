import React from "react";
import PropTypes from "prop-types";
import createReactClass from "create-react-class";
import Icon from "../Icon.jsx";
import Styles from "./analysis-button.scss";
import { withTranslation } from "react-i18next";

const AnalysisButton = createReactClass({
  propTypes: {
    viewState: PropTypes.object.isRequired,
    terria: PropTypes.object.isRequired,
    catalogItem: PropTypes.object.isRequired,
    t: PropTypes.func.isRequired
  },
  getInitialState() {
    return {
      analysisType: "SelectType",
      isOpen: false
    };
  },
  render() {
    const { catalogItem, t } = this.props;

    const { analysisTypes } = catalogItem.customProperties.allowAnalysis;

    if (
      catalogItem.customProperties &&
      catalogItem.customProperties.areaAnalysisParameter
    ) {
      return "";
    }

    const canBeAnalyzed =
      catalogItem.customProperties.allowAnalysis &&
      analysisTypes &&
      analysisTypes.length &&
      analysisTypes[0] &&
      analysisTypes[0].name;

    const that = this;
    return (
      <div>
        <If condition={canBeAnalyzed}>
          <button
            type="button"
            className={Styles.analysisButton}
            onClick={() =>
              that.props.terria.setAnalysisModalVisibility({
                visibility: true,
                catalogItem: catalogItem,
                analysisTypes:
                  catalogItem.customProperties.allowAnalysis.analysisTypes
              })
            }
          >
            <Icon glyph={Icon.GLYPHS.lineChart} /> {t("featureInfo.analysis")}
          </button>
        </If>
      </div>
    );
  }
});

export default withTranslation()(AnalysisButton);
