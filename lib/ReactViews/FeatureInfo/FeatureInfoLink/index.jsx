import React, { PureComponent } from "react";
import PropTypes from "prop-types";
import classNames from "classnames";
import Mustache from "mustache";

import defined from "terriajs-cesium/Source/Core/defined";

import { getPropertyValuesForFeature } from "../FeatureInfoSection";

import styles from "./styles.module.scss";

export class FeatureInfoLink extends PureComponent {
  render() {
    const links = this.props?.template?.links;

    if (!defined(links)) {
      return null;
    }

    const propertyData = this.getPropertyValues();
    const _links = Array.isArray(links) ? links : [links];

    return (
      <div className={styles.linkWrapper}>
        {_links.map(_lnk => {
          const _mustashRenderedUrl = Mustache.render(_lnk?.url, propertyData);

          return (
            <button
              key={_lnk.text}
              className={classNames(styles.linkButton)}
              onClick={() => {
                const target = defined(_lnk?._target) ? _lnk._target : "_self";
                window.open(_mustashRenderedUrl, target, _lnk.options);
              }}
            >
              {_lnk?.name || "Open"}
            </button>
          );
        })}
      </div>
    );
  }

  getPropertyValues = () => {
    return getPropertyValuesForFeature(
      this.props.feature,
      null,
      this.props.template && this.props.template.formats
    );
  };
}

FeatureInfoLink.propTypes = {
  viewState: PropTypes.object.isRequired,
  template: PropTypes.oneOfType([PropTypes.object, PropTypes.string]),
  feature: PropTypes.object,
  position: PropTypes.object
};

export default FeatureInfoLink;
