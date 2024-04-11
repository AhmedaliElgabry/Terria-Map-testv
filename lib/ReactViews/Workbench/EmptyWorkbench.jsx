import ObserveModelMixin from "../ObserveModelMixin";
import React from "react";
import createReactClass from "create-react-class";
import PropTypes from "prop-types";
import Styles from "./workbench-empty.scss";
import Icon from "../Icon.jsx";
import { withTranslation, Trans } from "react-i18next";

const EmptyWorkbench = createReactClass({
  displayName: "EmptyWorkbench",
  mixins: [ObserveModelMixin],
  propTypes: {
    terria: PropTypes.object.isRequired,
    viewState: PropTypes.object.isRequired,
    t: PropTypes.func.isRequired
  },
  render() {
    const { t } = this.props;
    this.props.viewState.resetWorkbench();
    const addData = t("addData.addDataBtnText");
    return (
      <Trans i18nKey="emptyWorkbenchMessage">
        <div className={Styles.workbenchEmpty}>
          <div>Your workbench is empty</div>
          <p>
            <strong>Click &apos;{addData}&apos; above to:</strong>
          </p>
          <ul>
            <li>Browse the Data Catalogue</li>
            <li>Load your own data onto the map</li>
          </ul>
          <p>
            <Icon glyph={Icon.GLYPHS.bulb} />
            <strong>TIP:</strong>
            <em>All your active data sets will be listed here</em>
          </p>
        </div>
      </Trans>
    );
  }
});

export default withTranslation()(EmptyWorkbench);
