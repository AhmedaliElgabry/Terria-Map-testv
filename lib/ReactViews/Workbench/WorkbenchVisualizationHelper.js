import VisualizationType from "../../Models/VisualizationType";
export default class WorkbenchVisualizationHelper {
  getWorkbenchTabs(terria) {
    const tabs = [];

    if (terria.nowViewing.mappableItems?.length > 0) {
      tabs.push(VisualizationType.MAP);
    }

    if (terria.nowViewing.chartableItems?.length > 0) {
      tabs.push(VisualizationType.CHART);
    }

    if (
      !terria.configParameters.disableTableView &&
      terria.nowViewing.tabularItems?.length > 0
    ) {
      tabs.push(VisualizationType.TABLE);
    }

    return tabs;
  }

  getWorkbenchTabsForMobile(terria) {
    const tabs = this.getWorkbenchTabs(terria);

    return tabs.length == 1 ? [] : tabs;
  }

  prepareVisualizations(terria, enabledDatasets) {
    const currentVisualizationItems =
      terria.nowViewing.currentVisualizationItems;
    const tabs = this.getWorkbenchTabs(terria);
    // In the current view, if no dataset is selected, then show the last one
    if (
      terria.viewType != VisualizationType.MAP &&
      currentVisualizationItems.length &&
      currentVisualizationItems.every(a => !a.isShown)
    ) {
      currentVisualizationItems[
        currentVisualizationItems.length - 1
      ].isShown = true;
    }

    if (currentVisualizationItems.length == 0 && tabs.length > 0) {
      terria.viewType = tabs[0];
    }

    if (terria.viewType == VisualizationType.TABLE) {
      this.prepareTableVisualization(
        terria,
        currentVisualizationItems,
        enabledDatasets
      );
    } else if (terria.viewType == VisualizationType.MAP) {
      this.prepareMapVisualization(currentVisualizationItems, enabledDatasets);
    } else if (terria.viewType == VisualizationType.CHART) {
      this.prepareChartVisualization(
        terria,
        currentVisualizationItems,
        enabledDatasets
      );
    }
  }

  prepareTableVisualization(
    terria,
    currentVisualizationItems,
    enabledDatasets
  ) {
    let tabularDataset = terria.nowViewingTable;

    if (!currentVisualizationItems || !currentVisualizationItems.length) {
      return;
    }

    /*
          If current table is removed, select a different tabular item
         */
    if (!tabularDataset) {
      const id = enabledDatasets[VisualizationType.TABLE];

      tabularDataset =
        currentVisualizationItems.find(a => a.uniqueId == id) ||
        currentVisualizationItems.find(a => a.isShown) ||
        currentVisualizationItems[currentVisualizationItems.length - 1];
    }

    tabularDataset.isShown = true;
    const currentShownItems = currentVisualizationItems.filter(a => a.isShown);

    if (currentShownItems.length > 1) {
      for (let i = 0; i < currentShownItems.length; i++) {
        if (currentShownItems[i].uniqueId !== tabularDataset.uniqueId)
          currentShownItems[i].isShown = false;
      }
    }

    terria.nowViewingTable = tabularDataset;
  }

  prepareChartVisualization(
    terria,
    currentVisualizationItems,
    enabledDatasets
  ) {
    if (
      !currentVisualizationItems ||
      !currentVisualizationItems.length ||
      !terria.catalog.chartableItems.length
    ) {
      return;
    }

    const id = enabledDatasets[VisualizationType.CHART];

    let chartableItem =
      currentVisualizationItems.find(a => a.uniqueId == id) ||
      terria.catalog.chartableItems.find(x => x.isCsvForCharting && x.isShown);

    if (!chartableItem) {
      chartableItem = currentVisualizationItems.find(x => x.isCsvForCharting);
      chartableItem.isShown = true;
    }

    const currentShownItems = currentVisualizationItems.filter(a => a.isShown);

    if (currentShownItems.length > 1) {
      for (let i = 0; i < currentShownItems.length; i++) {
        if (currentShownItems[i].uniqueId !== chartableItem.uniqueId)
          currentShownItems[i].isShown = false;
      }
    }
  }

  prepareMapVisualization(currentVisualizationItems, enabledDatasets) {
    for (const item of currentVisualizationItems) {
      if (
        item.isEnabled &&
        enabledDatasets[VisualizationType.MAP].includes(item.uniqueId)
      ) {
        item.isShown = true;
      }
    }
  }
}
