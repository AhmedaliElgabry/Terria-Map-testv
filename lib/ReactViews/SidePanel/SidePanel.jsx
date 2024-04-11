import React from "react";

import createReactClass from "create-react-class";

import PropTypes from "prop-types";

import knockout from "terriajs-cesium/Source/ThirdParty/knockout";
import ObserveModelMixin from "../ObserveModelMixin";
import SearchBox from "../Search/SearchBox.jsx";
import SidebarSearch from "../Search/SidebarSearch.jsx";
import Workbench from "../Workbench/Workbench.jsx";
import EmptyWorkbench from "../Workbench/EmptyWorkbench.jsx";
import Icon from "../Icon.jsx";
import FullScreenButton from "./FullScreenButton.jsx";
import { removeMarker } from "../../Models/LocationMarkerUtils";
import { withTranslation, Trans } from "react-i18next";
import Styles from "./side-panel.scss";
import ConditionalyVisibleElement, {
  ElementsIdentifiers
} from "../ConditionalyVisibleElement";

const SidePanel = createReactClass({
  displayName: "SidePanel",
  mixins: [ObserveModelMixin],

  propTypes: {
    terria: PropTypes.object.isRequired,
    viewState: PropTypes.object.isRequired,
    t: PropTypes.func.isRequired
  },

  componentDidMount() {
    this.subscribeToProps();
  },

  componentDidUpdate() {
    this.subscribeToProps();
  },

  componentWillUnmount() {
    this.unsubscribeFromProps();
  },

  subscribeToProps() {
    this.unsubscribeFromProps();

    // Close the search results when the Now Viewing changes (so that it's visible).
    this._nowViewingChangeSubscription = knockout
      .getObservable(this.props.terria.nowViewing, "items")
      .subscribe(() => {
        this.props.viewState.searchState.showLocationSearchResults = false;
      });
  },

  unsubscribeFromProps() {
    if (this._nowViewingChangeSubscription) {
      this._nowViewingChangeSubscription.dispose();
      this._nowViewingChangeSubscription = undefined;
    }
  },

  onAddDataClicked(event) {
    event.stopPropagation();
    this.props.viewState.topElement = "AddData";
    this.props.viewState.openAddData();
  },

  onAddLocalDataClicked(event) {
    event.stopPropagation();
    this.props.viewState.topElement = "AddData";
    this.props.viewState.openUserData();
  },

  changeSearchText(newText) {
    this.props.viewState.searchState.locationSearchText = newText;

    if (newText.length === 0) {
      removeMarker(this.props.terria);
    }
  },

  search() {
    this.props.viewState.searchState.searchLocations();
  },

  startLocationSearch() {
    this.props.viewState.searchState.showLocationSearchResults = true;
  },

  render() {
    const { t } = this.props;
    const searchState = this.props.viewState.searchState;
    const addData = t("addData.addDataBtnText");

    return (
      <div className={Styles.workBench}>
        <div className={Styles.header}>
          <FullScreenButton
            terria={this.props.terria}
            viewState={this.props.viewState}
            minified={true}
            animationDuration={250}
            btnText={t("addData.btnHide")}
          />

          <ConditionalyVisibleElement
            terria={this.props.terria}
            id={ElementsIdentifiers.hideSearch}
          >
            <SearchBox
              onSearchTextChanged={this.changeSearchText}
              onDoSearch={this.search}
              onFocus={this.startLocationSearch}
              searchText={searchState.locationSearchText}
              placeholder={t("search.placeholder")}
            />
            <div className={Styles.addData}>
              <button
                id="addData"
                type="button"
                onClick={this.onAddDataClicked}
                className={Styles.button}
                title={addData}
              >
                <Icon glyph={Icon.GLYPHS.add} />
                {addData}
              </button>
              <button
                id="uploadData"
                type="button"
                onClick={this.onAddLocalDataClicked}
                className={Styles.uploadData}
                title={t("addData.load")}
              >
                <Icon glyph={Icon.GLYPHS.upload} />
              </button>
            </div>
          </ConditionalyVisibleElement>
        </div>
        <div className={Styles.body}>
          <Choose>
            <When
              condition={
                searchState.locationSearchText.length > 0 &&
                searchState.showLocationSearchResults
              }
            >
              <SidebarSearch
                terria={this.props.terria}
                viewState={this.props.viewState}
                isWaitingForSearchToStart={
                  searchState.isWaitingToStartLocationSearch
                }
              />
            </When>
            <When
              condition={
                this.props.terria.nowViewing.items &&
                this.props.terria.nowViewing.items.length > 0
              }
            >
              <Workbench
                viewState={this.props.viewState}
                terria={this.props.terria}
              />
            </When>
            <Otherwise>
              <EmptyWorkbench
                viewState={this.props.viewState}
                terria={this.props.terria}
                t={this.props.t}
              />
            </Otherwise>
          </Choose>
        </div>
      </div>
    );
  }
});

module.exports = withTranslation()(SidePanel);
