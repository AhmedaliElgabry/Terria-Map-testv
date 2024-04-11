"use strict";
import React from "react";
import createReactClass from "create-react-class";
import PropTypes from "prop-types";
import defined from "terriajs-cesium/Source/Core/defined";
import addedByUser from "../../Core/addedByUser";
import removeUserAddedData from "../../Models/removeUserAddedData";
import removeUserDataFromPersistentStore from "../../Models/removeUserDataFromPersistentStore";
import CatalogItem from "./CatalogItem";
import getAncestors from "../../Models/getAncestors";
import ObserveModelMixin from "../ObserveModelMixin";
import raiseErrorOnRejectedPromise from "../../Models/raiseErrorOnRejectedPromise";
import { withTranslation } from "react-i18next";
import he from "he";

// Individual dataset
export const DataCatalogItem = createReactClass({
  displayName: "DataCatalogItem",
  mixins: [ObserveModelMixin],

  propTypes: {
    item: PropTypes.object.isRequired,
    viewState: PropTypes.object.isRequired,
    removable: PropTypes.bool,
    terria: PropTypes.object,
    t: PropTypes.func.isRequired
  },

  onBtnClicked(event) {
    if (defined(this.props.viewState.storyShown)) {
      this.props.viewState.storyShown = false;
    }
    if (
      defined(this.props.item.invoke) ||
      this.props.viewState.useSmallScreenInterface
    ) {
      this.setPreviewedItem();
    } else {
      this.toggleEnable(event);
    }
  },

  shouldRemoveFromPersistentStore(item) {
    const parent = item.parent;
    if (parent.isGroup && parent.isUserSupplied) {
      return parent.userManagmentServices;
    }
  },

  onTrashClicked() {
    const removeFromPersistentStore = this.shouldRemoveFromPersistentStore(
      this.props.item
    );
    if (removeFromPersistentStore) {
      removeUserDataFromPersistentStore(
        this.props.terria,
        this.props.item.parent,
        this.props.item
      );
    } else {
      removeUserAddedData(this.props.terria, this.props.item);
    }
  },

  toggleEnable(event) {
    this.props.item.toggleEnabled();
    this.props.viewState.terria.checkNowViewingForTimeWms();
    // set preview as well
    this.setPreviewedItem();

    if (
      this.props.item.isEnabled === true &&
      !event.shiftKey &&
      !event.ctrlKey
    ) {
      // close modal window
      this.props.viewState.explorerPanelIsVisible = false;
      this.props.viewState.mobileView = null;
      if (this.props.viewState.firstTimeAddingData) {
        this.props.viewState.featureInfoPanelIsVisible = true;
      }
    }
  },

  setPreviewedItem() {
    raiseErrorOnRejectedPromise(this.props.item.terria, this.props.item.load());
    this.props.viewState.viewCatalogMember(this.props.item);
    // mobile switch to nowvewing
    this.props.viewState.switchMobileView(
      this.props.viewState.mobileViewOptions.preview
    );
  },

  isSelected() {
    return addedByUser(this.props.item)
      ? this.props.viewState.userDataPreviewedItem === this.props.item
      : this.props.viewState.previewedItem === this.props.item;
  },

  render() {
    const item = this.props.item;
    const { t } = this.props;

    const nameInCatalog = he.decode(item.nameInCatalog || "");
    const title = getAncestors(item)
      .map(member => he.decode(member.nameInCatalog || ""))
      .join(" → ");
    const STATE_TO_TITLE = {
      loading: t("catalogItem.loading"),
      remove: t("catalogItem.removeFromMap"),
      add: t("catalogItem.add"),
      trash: t("catalogItem.trash")
    };

    return (
      <CatalogItem
        onTextClick={this.setPreviewedItem}
        selected={this.isSelected()}
        text={nameInCatalog}
        title={title}
        btnState={this.getState()}
        onBtnClick={this.onBtnClicked}
        supportsAnalysis={
          item.customProperties && item.customProperties.allowAnalysis
        }
        // All things are "removable" - meaning add and remove from workbench,
        //    but only user data is "trashable"
        trashable={this.props.removable}
        onTrashClick={
          this.props.removable
            ? () => {
                this.onTrashClicked();
              }
            : undefined
        }
        titleOverrides={STATE_TO_TITLE}
      />
    );
  },

  getState() {
    if (this.props.item.isLoading) {
      return "loading";
    } else if (this.props.viewState.useSmallScreenInterface) {
      return "preview";
    } else if (this.props.item.isEnabled) {
      return "remove";
    } else if (!defined(this.props.item.invoke)) {
      return "add";
    } else {
      return "stats";
    }
  }
});

export default withTranslation()(DataCatalogItem);
