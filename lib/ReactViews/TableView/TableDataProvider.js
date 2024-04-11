import defined from "terriajs-cesium/Source/Core/defined";
import knockout from "terriajs-cesium/Source/ThirdParty/knockout-3.5.1";
import { getCsvContent } from "./Grid/gridExportUtils";
import TableStructure from "../../Map/TableStructure";
import VarType from "../../Map/VarType";
export default class TableDataProvider {
  constructor(item, terria) {
    this.item = item;
    this.terria = terria;
    this.tableStructure = item.tableStructure;
    this.columns = this.tableStructure?.columns;
    this._regionMapping = item._regionMapping;

    const tableStyle = item.tableStyle || {};
    this.columnStyles =
      item.tabularViewSettings?.columns || tableStyle.columns || {};

    this.indexedColumns = {};
    for (const col of this.tableColumns) {
      this.indexedColumns[col.id || col.name] = col;
    }
  }

  get id() {
    return this.item.uniqueId;
  }

  get name() {
    return this.item.name;
  }

  get dateFormat() {
    if (this.item.dateFormat) {
      return this.item.dateFormat.currentTime || "DD/MM/YYYY";
    }

    return "DD/MM/YYYY";
  }

  getColumnName(key) {
    const col = this.indexedColumns[key] || {};
    return col.name || col.id || "";
  }

  getCleanName(id) {
    const name = (this.columnStyles?.[id] || this.columns[id] || {}).name || id;
    return name.replace(/-/g, " ").replace(/_/g, " ");
  }

  get tableRows() {
    const { columns } = this;
    const tableData = new Array();
    const length = columns[0].values.length;

    for (let i = 0; i < length; i++) {
      const row = {};
      for (const c of columns) {
        row[c.id] = c.values[i];
      }

      tableData.push(row);
    }

    return tableData;
  }

  get tableColumns() {
    const columnStyles = this.columnStyles;

    const filter = c => {
      if (columnStyles[c.id]) {
        return !columnStyles[c.id].hidden;
      }
      return true;
    };

    return this.columns.filter(filter).map(col => {
      const uniqueValues = col.uniqueValues || Array.from(new Set(col.values));

      uniqueValues.sort();
      return {
        id: col.id,
        name: this.getCleanName(col.id) || col.id,
        type: col.type,
        isActive: col.isActiveOnTableView,
        isActiveObservable: knockout.getObservable(col, "isActiveOnTableView"),
        uniqueValues: uniqueValues,
        uniqueValueCount: uniqueValues?.length,
        style: columnStyles[col.id],
        dateFormat: col.type == VarType.TIME ? this.dateFormat : "",
        color: col.color
      };
    });
  }

  get pivotTableRows() {
    const { columns } = this;
    const tableData = new Array();
    const length = columns[0].values.length;

    for (let i = 0; i < length; i++) {
      const row = {};
      for (const c of columns) {
        const key = this.columnStyles?.[c.id]?.name || c.id;
        row[key] = c.values[i];
      }

      tableData.push(row);
    }

    return tableData;
  }

  get downloadColumns() {
    const downloadCols = this.item.tabularViewSettings?.grid?.download?.columns;

    if (!downloadCols || !downloadCols.length) {
      return this.tableColumns;
    }

    return downloadCols.map(dcol => {
      const col = this.columns.find(c => c.id == dcol || c.name == dcol);
      return {
        id: col.id,
        name: this.getCleanName(col.name) || col.id,
        type: col.type,
        dateFormat: col.type == VarType.TIME ? this.dateFormat : ""
      };
    });
  }

  convertIdsToNames(ids) {
    if (!defined(ids)) return [];

    const styleNames = ids.map(id => {
      const styleName = this.columnStyles?.[id]?.name || id;
      return styleName;
    });

    return styleNames;
  }

  updateMap(filters) {
    const _regionMapping = this.item._regionMapping;
    const _dataSource = this.item._dataSource;

    if (_regionMapping && this.tableStructure.activeItems?.length) {
      var regionDetail = _regionMapping._regionDetails[0];

      var regionColumn = this.tableStructure.getColumnWithNameIdOrIndex(
        regionDetail.columnName
      );

      if (!defined(regionColumn)) {
        return;
      }

      const currentActiveItem = this.tableStructure.activeItems[0].name;
      _regionMapping.currentFilters = filters;
      _regionMapping.filteredActiveItems = this.tableStructure.columns.filter(
        a => a.name == currentActiveItem
      );
      _regionMapping.changedActiveItems();
    }

    if (_dataSource) {
      _dataSource.entities.removeAll();
      _dataSource.filterContext.filters = filters;
      _dataSource.changedActiveItems();
    }
  }
}
