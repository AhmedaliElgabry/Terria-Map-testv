"use strict";

import React, { Component } from "react";
import PropTypes from "prop-types";
import Loader from "../Loader.jsx";
import Styles from "./loading-status.scss";
const knockout = require("terriajs-cesium/Source/ThirdParty/knockout").default;

export default class WorkbenchItemLoadingStatus extends Component {
  constructor(props) {
    super(props);

    this.state = {
      totalTiles: 0,
      loadedTiles: 0
    };
  }

  componentDidMount() {
    const catalogItem = this.props.item;
    const that = this;

    if (!catalogItem.showLoadingProgressBar) return null;

    if (catalogItem.totalTiles !== undefined) {
      this._totalTilesObservable = knockout
        .getObservable(catalogItem, "totalTiles")
        .subscribe(function() {
          that.setState({ totalTiles: catalogItem.totalTiles });
        }, this);
    }

    if (catalogItem.loadedTiles !== undefined) {
      this._loadedTilesObservable = knockout
        .getObservable(catalogItem, "loadedTiles")
        .subscribe(function() {
          that.setState({ loadedTiles: catalogItem.loadedTiles });
        }, this);
    }
  }

  componentWillUnmount() {
    if (this._loadedTilesObservable) {
      this._totalTilesObservable.dispose();
      this._totalTilesObservable = null;
    }

    if (this._totalTilesObservable) {
      this._totalTilesObservable.dispose();
      this._totalTilesObservable = null;
    }
  }

  render() {
    const item = this.props.item;

    if (!item.showLoadingProgressBar) return null;

    if (item.loadedTiles >= item.totalTiles) return null;

    return (
      <div className={Styles.tileLoadProgressContainer}>
        <div>
          <Loader
            className={Styles.loading}
            message={`${this.state.loadedTiles} tiles loaded out of ${
              this.state.totalTiles
            }`}
          />
        </div>

        <div className={Styles.tileLoadParent}>
          <div
            className={Styles.tileLoadProgress}
            style={{
              width: `${(Math.min(
                this.state.loadedTiles,
                this.state.totalTiles
              ) /
                this.state.totalTiles) *
                100}%`
            }}
          />
        </div>
      </div>
    );
  }
}

WorkbenchItemLoadingStatus.propTypes = {
  item: PropTypes.object.isRequired
};
