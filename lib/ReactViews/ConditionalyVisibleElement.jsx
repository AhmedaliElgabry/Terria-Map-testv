"use strict";
import React from "react";
/***
 * Conditionally hides UX elements based on user parameters
 * hideStory
 * hideMapSettings
 * hideShare
 * hideRelatedSites
 * hideFeedback
 * hideGeolocation
 * hideSplitTool
 * hideMeasureTool
 * hideDrawTool
 * hideZoom
 * hideWorkbench
 * hidetabularViewSettings,
 */
export const ElementsIdentifiers = {
  hideStory: "hideStory",
  hideMapSettings: "hideMapSettings",
  hideSharePanel: "hideShare",
  hideRelatedSites: "hideRelatedSites",
  hideFeedback: "hideFeedback",
  hideGeolocation: "hideGeolocation",
  hideSplit: "hideSplitTool",
  hideMeasure: "hideMeasureTool",
  hideDrawTool: "hideDrawTool",
  hideZoom: "hideZoom",
  hideAbout: "hideAbout",
  hideSidePanel: "hideSidePanel",
  hidetabularViewSettings: "hidetabularViewSettings",
  hideTabs: "hideTabs",
  hideWorkbenchItemControls: "hideWorkbenchItemControls",
  hideConceptViewer: "hideConceptViewer",
  hideSearch: "hideSearch",
  hideMap: "hideMap"
};

export default function ConditionalyVisibleElement({
  children,
  id,
  terria: { configParameters, userProperties } = {
    configParameters: {},
    userProperties: {}
  }
}) {
  if (!id) {
    return children;
  }

  const visibilityConfig = {
    ...(configParameters.visibilityConfig || {}),
    ...userProperties
  };

  if (
    getValueCaseInsensitive(visibilityConfig, "hideAllUi") == 1 ||
    getValueCaseInsensitive(visibilityConfig, id) == 1 ||
    getValueCaseInsensitive(visibilityConfig, id) == "true"
  ) {
    return null;
  }

  function getValueCaseInsensitive(object, key) {
    if (!object) {
      return undefined;
    }

    for (var k in object) {
      if (k.toLowerCase() == key.toLowerCase()) {
        return object[k];
      }
    }
    return undefined;
  }
  return children;
}
