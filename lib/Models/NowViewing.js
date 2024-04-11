"use strict";

/*global require*/
var CesiumEvent = require("terriajs-cesium/Source/Core/Event").default;
var defaultValue = require("terriajs-cesium/Source/Core/defaultValue").default;
var defined = require("terriajs-cesium/Source/Core/defined").default;
var DeveloperError = require("terriajs-cesium/Source/Core/DeveloperError")
  .default;
var EventHelper = require("terriajs-cesium/Source/Core/EventHelper").default;
var knockout = require("terriajs-cesium/Source/ThirdParty/knockout").default;
var raiseErrorToUser = require("./raiseErrorToUser");
import VisualizationType from "./VisualizationType";
/**
 * The model for the "Now Viewing" pane.
 */
var NowViewing = function(terria) {
  this._terria = terria;
  this._eventSubscriptions = new EventHelper();

  /**
   * Gets the list of items that we are "now viewing".  It is recommended that you use
   * the methods on this instance instead of manipulating the list of items directly.
   * This property is observable.
   * @type {CatalogItem[]}
   */
  this.items = [];

  knockout.track(this, ["items"]);

  this.showNowViewingRequested = new CesiumEvent();

  this._eventSubscriptions.add(
    this.terria.beforeViewerChanged,
    function() {
      beforeViewerChanged(this);
    },
    this
  );

  this._eventSubscriptions.add(
    this.terria.afterViewerChanged,
    function() {
      afterViewerChanged(this);
    },
    this
  );
};

Object.defineProperties(NowViewing.prototype, {
  /**
   * Gets the Terria instance.
   * @memberOf NowViewing.prototype
   * @type  {Terria}
   */
  terria: {
    get: function() {
      return this._terria;
    }
  },

  /**
   * Gets a value indicating whether the "Now Viewing" pane has one or more items.
   * @memberOf NowViewing.prototype
   * @type {Boolean}
   */
  hasItems: {
    get: function() {
      return this.items.length > 0;
    }
  },

  /**
   * Gets a value indicating whether the "Now Viewing" pane has at list own data
   * source that is currently shown.
   * @memberOf NowViewing.prototype
   * @type {Boolean}
   */
  hasShownItems: {
    get: function() {
      for (var i = 0; i < this.items.length; ++i) {
        if (this.items[i].isShown) {
          return true;
        }
      }
      return false;
    }
  },

  hasChildren: {
    get: function() {
      return this.items.length > 0;
    }
  },

  chartableItems: {
    get: function() {
      return (this.items || []).filter(a => a.isCsvForCharting);
    }
  },

  mappableItems: {
    get: function() {
      return (this.items || []).filter(
        a => (!a.isCsvForCharting && !a.isTabular) || a.isMappable
      );
    }
  },

  tabularItems: {
    get: function() {
      return (this.items || []).filter(
        a => a.type == "csv" || a.type == "smart-csv"
      );
    }
  },

  currentVisualizationItems: {
    get: function() {
      switch (this.terria.viewType) {
        case VisualizationType.CHART:
          return this.chartableItems;
        case VisualizationType.MAP:
          return this.mappableItems;
        case VisualizationType.TABLE:
          return this.tabularItems;
      }
    }
  }
});

/**
 * Destroys this instance, including unsubscribing it from any events.
 */
NowViewing.prototype.destroy = function() {
  this._eventSubscriptions.removeAll();
};

/**
 * Toggles the workbench Item visibility based on type. For example, CsvCatalogItems are now radio buttos while data sets are normal multiselect
 */
NowViewing.prototype.toggleWorkbenchItemVisibility = function(turnedOnItem) {
  const viewType = this.terria.viewType;
  const currentlyVisible = this.currentVisualizationItems.map(a => a.uniqueId);

  // Only the Table and Chart tabs support the toggle item visibility feature
  if (
    viewType != VisualizationType.TABLE &&
    viewType != VisualizationType.CHART
  ) {
    return;
  }

  this.items = this.items.map(item => {
    if (!currentlyVisible.includes(item.uniqueId)) {
      return item; // this item is not visible in the current visualizer. no need to do anything
    }

    if (!["csv", "smart-csv"].includes(item.type)) {
      // only these types can use radio boxes
      return item;
    }

    if (turnedOnItem.uniqueId === item.uniqueId) {
      item.isShown = true;
      this.terria.nowViewingTable =
        viewType == VisualizationType.TABLE ? item : null;
    } else {
      item.isShown = false;
    }
    return item;
  });
};

NowViewing.prototype.reproject = function() {
  this.items = this.items.map(item => {
    item.isRefreshing = true;
    return item;
  });
};

/**
 * Adds an item to the "Now Viewing" pane.
 *
 * @param {CatalogMember} item The item to add.
 */
NowViewing.prototype.add = function(item, index) {
  const viewType = this.terria.viewType;
  index = defaultValue(index, 0);
  if (item.name === "Unnamed Item") {
    return;
  }

  // If the new item is tabular or chart, then hide the other items so we can enable the new one
  if (item.isCsvForCharting || item.isTabular) {
    this.items = this.items.map(item => {
      if (item.isCsvForCharting || item.isTabular) {
        item.isShown = false;
      }
      return item;
    });
  }

  if (viewType == VisualizationType.TABLE) {
    this.tabularItems
      .filter(a => a.uniqueId != item.uniqueId)
      .forEach(a => (a.isShown = false));
  }

  if (viewType == VisualizationType.CHART) {
    this.chartableItems
      .filter(a => a.uniqueId != item.uniqueId)
      .forEach(a => (a.isShown = false));
  }

  // Keep reorderable data sources (e.g.: imagery layers) below non-orderable ones (e.g.: GeoJSON).
  if (item.supportsReordering) {
    while (index < this.items.length && !this.items[index].supportsReordering) {
      ++index;
    }
  } else {
    while (
      index > 0 &&
      this.items.length > 0 &&
      this.items[index - 1].supportsReordering
    ) {
      --index;
    }
  }

  if (!item.keepOnTop) {
    while (
      index < this.items.length &&
      this.items[index].keepOnTop &&
      this.items[index].supportsReordering === item.supportsReordering
    ) {
      ++index;
    }
  } else {
    while (
      index > 0 &&
      this.items.length > 0 &&
      this.items[index - 1].keepOnTop &&
      this.items[index - 1] === item.supportsReordering
    ) {
      --index;
    }
  }
  this.items.splice(index, 0, item);
  this.terria.catalogItemAdded = item;

  if (
    ![
      "remote-config-item",
      "remote-config-group",
      "group",
      "ckan-resource",
      "csw-resource",
      "csw"
    ].includes(item.type)
  ) {
    this.activateVisualizerForCatalogItem(item);
  }
};

NowViewing.prototype.activateVisualizerForCatalogItem = function(item) {
  // if showing stories, then the selected tab will be controlled by the story
  if (
    this.terria.stories &&
    this.terria.stories.length &&
    this.terria.activatedFromStory
  ) {
    return;
  }

  if (item.isCsvForCharting) {
    this.terria.viewType = VisualizationType.CHART;
  } else if (item.isTabular) {
    this.terria.viewType = VisualizationType.TABLE;

    if (!defined(item.tabularViewSettings?.tableTop)) {
      this.terria.tableTop = item.isMappable ? window.innerHeight * 0.55 : 0;
    }

    this.terria.nowViewingTable = item;
  } else {
    this.terria.viewType = VisualizationType.MAP;
    if (this.terria.isCommonMobilePlatform) {
      if (this.terria.nowViewing.chartableItems?.length > 0) {
        this.terria.viewType = VisualizationType.CHART;
      }
    }
  }
};

/**
 * Removes an item from the "Now Viewing" pane and from the map.
 *
 * @param {CatalogMember} item The item to remove.
 */
NowViewing.prototype.remove = function(item) {
  // Need to assign these conditions better
  if (item.name === "Unnamed Item") {
    // There is an unnamed item that gets added to this list everythime user clicks something in the catalog. This refreshes the sidepanel due to observables
    return;
  } else if (
    item.isCsvForCharting &&
    item.isShown &&
    this.chartableItems.length > 1
  ) {
    const index = this.items.findIndex(
      item => item.isCsvForCharting && !item.isShown
    );
    this.items[index].isShown = true;
  } else if (
    (item.isTabular || this.terria.nowViewingTable == item) &&
    this.tabularItems.length > 1
  ) {
    if (item.isShown) {
      const nextItemToEnable = this.items.find(
        nextItem => nextItem.isTabular && !nextItem.isShown && nextItem !== item
      );
      if (nextItemToEnable) {
        nextItemToEnable.isShown = true;
        this.terria.nowViewingTable = nextItemToEnable;
      }
    }
  }
  item.isEnabled = false;
  this.items.remove(item);
  this.terria.catalogItemRemoved = item;
};

/**
 * Removes all data sources from the "Now Viewing" pane and from the map.
 */
NowViewing.prototype.toggleItemOn = function() {
  const item = this.items.shift();
  item.isShown = true;
  this.items.unshift(item);
};

/**
 * Removes all data sources from the "Now Viewing" pane and from the map.
 */
NowViewing.prototype.removeAll = function() {
  // Work backwards through the list of items because setting isEnabled=false
  // will usually remove the item from the list.
  for (var i = this.items.length - 1; i >= 0; --i) {
    this.items[i].isEnabled = false;
  }

  this.items.removeAll();
};

/**
 * Raises an item, making it displayed on top of the item that is currently above it.  If it
 * is nonsensical to move this item up (e.g. it is already at the top), this method does nothing.
 *
 * @param {CatalogMember} item The item to raise.
 * @param {Number} [index] The index of the item of the list, if it is already known.
 */
NowViewing.prototype.raise = function(item, index) {
  if (defined(index)) {
    if (this.items[index] !== item) {
      throw new DeveloperError("The provided index is not correct.");
    }
  } else {
    index = this.items.indexOf(item);
    if (index < 0) {
      return;
    }
  }

  if (index === 0) {
    return;
  }

  // Don't allow reorderable data sources to move above non-reorderable ones.
  if (item.supportsReordering && !this.items[index - 1].supportsReordering) {
    return;
  }

  var terria = this.terria;

  terria.currentViewer.raise(index);

  this.items.splice(index, 1);
  this.items.splice(index - 1, 0, item);

  terria.currentViewer.updateLayerOrderAfterReorder();

  terria.currentViewer.notifyRepaintRequired();
};

/**
 * Lowers an item, making it displayed below the item that is currently below it.  If it
 * is nonsensical to move this item down (e.g. it is already at the bottom), this method does nothing.
 *
 * @param {CatalogMember} item The item to lower.
 * @param {Number} [index] The index of the item of the list, if it is already known.
 */
NowViewing.prototype.lower = function(item, index) {
  if (defined(index)) {
    if (this.items[index] !== item) {
      throw new DeveloperError("The provided index is not correct.");
    }
  } else {
    index = this.items.indexOf(item);
    if (index < 0) {
      return;
    }
  }

  if (index === this.items.length - 1) {
    return;
  }

  var itemBelow = this.items[index + 1];

  // Don't allow non-reorderable data sources to move below reorderable ones.
  if (!item.supportsReordering && itemBelow.supportsReordering) {
    return;
  }

  var terria = this.terria;

  terria.currentViewer.lower(index);

  this.items.splice(index, 1);
  this.items.splice(index + 1, 0, item);

  terria.currentViewer.updateLayerOrderAfterReorder();

  terria.currentViewer.notifyRepaintRequired();
};

/**
 * Toggles the {@link NowViewing#isOpen} flag.  If it's open, it is closed.  If it's closed, it is opened.
 */
NowViewing.prototype.toggleOpen = function() {
  this.isOpen = !this.isOpen;
};

/**
 * Records the the index of each data source in the Now Viewing list in a {@link CatalogItem#nowViewingIndex} property
 * on the data source.  This is used to save the state of the Now Viewing list and is not intended for general
 * use.
 * @private
 */
NowViewing.prototype.recordNowViewingIndices = function() {
  for (var i = 0; i < this.items.length; ++i) {
    this.items[i].nowViewingIndex = i;
  }
};

/**
 * Sorts the data sources in the Now Viewing list by their {@link CatalogItem#nowViewingIndex} properties.  This is used
 * to restore the state of the Now Viewing list and is not intended for general use.
 * @private
 */
NowViewing.prototype.sortByNowViewingIndices = function() {
  var sortedItems = this.items.slice();
  sortedItems.sort(function(a, b) {
    return a.nowViewingIndex - b.nowViewingIndex;
  });

  for (var i = 0; i < sortedItems.length; ++i) {
    var item = sortedItems[i];
    var existingIndex = this.items.indexOf(item);
    var lastIndex;
    // Check if raise didn't succeed (ie. item's index didn't change), and quit the loop if so.
    while (existingIndex > i && existingIndex !== lastIndex) {
      lastIndex = existingIndex;
      this.raise(item, lastIndex);
      existingIndex = this.items.indexOf(item);
    }
  }

  if (defined(this.terria.currentViewer)) {
    this.terria.currentViewer.notifyRepaintRequired();
  }
};

function beforeViewerChanged(nowViewing) {
  // Hide and disable all data sources, without actually changing
  // their isEnabled and isShown flags.

  var dataSources = nowViewing.items;

  for (var i = 0; i < dataSources.length; ++i) {
    var dataSource = dataSources[i];
    if (defined(dataSource._loadForEnablePromise)) {
      continue;
    }

    if (dataSource.isShown) {
      dataSource._hide();
    }

    if (dataSource.isEnabled) {
      dataSource._disable();
    }
  }
}

function afterViewerChanged(nowViewing) {
  // Re-enable and re-show all data sources that were previously enabled or shown.
  // Work from the bottom data source up so that the correct order is created.

  var dataSources = nowViewing.items;

  for (var i = dataSources.length - 1; i >= 0; --i) {
    var dataSource = dataSources[i];
    if (defined(dataSource._loadForEnablePromise)) {
      continue;
    }

    if (dataSource.isEnabled) {
      try {
        dataSource._enable();
      } catch (e) {
        raiseErrorToUser(nowViewing.terria, e);
      }
      //Re-enable attribution
      nowViewing.terria.currentViewer.addAttribution(dataSource.attribution);
    }

    if (dataSource.isShown) {
      try {
        dataSource._show();
      } catch (e) {
        raiseErrorToUser(nowViewing.terria, e);
      }
    }
  }
}

module.exports = NowViewing;
