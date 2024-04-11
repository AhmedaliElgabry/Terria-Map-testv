import "!!style-loader!css-loader?sourceMap!../tooltip.css";
import "!!style-loader!css-loader?sourceMap!react-data-grid/lib/styles.css";
import moment from "moment";
import PropTypes from "prop-types";
import React, {
  createContext,
  useEffect,
  useMemo,
  useRef,
  useState
} from "react";
import ReactDataGrid from "react-data-grid";
import { withTranslation } from "react-i18next";
import knockout from "terriajs-cesium/Source/ThirdParty/knockout-3.5.1";
import VarType from "../../../Map/VarType";
import { cellRenderer } from "./CellRenderer";
import { DateFilter, DefaultFilter, DropdownFilter } from "./Filters";
import { HeaderRenderer } from "./HeaderRenderer";
import { doFilter, doSort } from "./SortFilter";
import { exportToCsv, exportToExcel } from "./gridExportUtils";
import Styles from "./terria-grid.scss";

export const FilterContext = createContext(undefined);

function TerriaGrid(props) {
  const { source, terria, viewState, isLoading, i18n } = props;

  if (!source) return null;

  const isInitialMount = useRef(true);

  const [sortColumns, setSortColumns] = useState(
    terria.tableSortColumns?.[source.id] || []
  );

  const initialFilter = terria.tableFilters?.[source.id] || {};
  const [filters, setFilters] = useState(initialFilter);

  /* We need this to monitor changes to terria.tableFilters which could happen when a user is playing a story */
  useEffect(() => {
    setFilters(initialFilter);
    const filterSubscription = knockout
      .getObservable(terria, "tableFilters")
      .subscribe(() => {
        setFilters(terria.tableFilters?.[source.id] || {});
      });

    const sortSubscription = knockout
      .getObservable(terria, "tableSortColumns")
      .subscribe(() => {
        if (terria.tableSortColumns && terria.tableSortColumns[source.id])
          setSortColumns(terria.tableSortColumns[source.id]);
      });

    return () => {
      filterSubscription?.dispose();
      sortSubscription?.dispose();
    };
  }, [initialFilter]);

  const [isDateFilterOpen, setDateFilterOpen] = useState(false);
  const [columnSubscriptions, setColumnSubscriptions] = useState([]);
  const [useColor, setUseColor] = useState(false);
  const [columns, setColumns] = useState(
    getColumns(source, setFilters, setDateFilterOpen)
  );

  const processedRows = useMemo(() => {
    if (isLoading) return [];

    const dataRows = source.tableRows;

    const filtered = [...dataRows].filter(row => doFilter(filters, row));

    if (sortColumns.length === 0) return filtered;

    return filtered.sort((a, b) => doSort(source, sortColumns, a, b));
  }, [filters, sortColumns, isLoading, terria.tableFilters]);

  const [mapUpdated, setMapUpdated] = useState(false);

  useEffect(() => {
    if (isLoading) {
      return;
    }

    if (columnSubscriptions.length === 0) {
      const subscriptions = source.tableColumns.map(col => {
        col.isActiveObservable.subscribe(isActive => {
          setColumns(getColumns(source, setFilters, setDateFilterOpen));
          // clear out any filters for columns that are removed

          setFilters(filters => {
            if (!isActive && filters[col.id]) {
              const newFilters = { ...filters };
              delete newFilters[col.id];
              return newFilters;
            }

            return filters;
          });
        });
      });

      setColumnSubscriptions(subscriptions);
    }

    return () => {
      columnSubscriptions.forEach(sub => {
        sub?.dispose();
        sub = null;
      });

      setColumnSubscriptions([]);
    };
  }, [isLoading]);

  // Save the current filters to terria object so they can be shared
  useEffect(() => {
    if (isLoading) {
      return;
    }

    terria.tableFilters = { ...terria.tableFilters, [source.id]: filters };

    terria.tableSortColumns = {
      ...terria.tableSortColumns,

      [source.id]: sortColumns
    };

    const updateMapIfNeeded = () => {
      const validFiltersExist =
        Object.values(newFilter || {}).filter(a => a).length > 0;
      // source.updateMap is very expensive process. Run it only if there are valid filter values
      // update the map if valid filters exist or if it has been previously updated because user could be clearing the filters
      if (mapUpdated || validFiltersExist) {
        source.updateMap(newFilter);
        setMapUpdated(validFiltersExist);
      }
    };

    const newFilter = Object.entries(filters).reduce((acc, val) => {
      acc[source.getColumnName(val[0])] = val[1];
      acc[val[0]] = val[1];
      return acc;
    }, {});

    if (isInitialMount.current) {
      isInitialMount.current = false;
    }

    updateMapIfNeeded();
  }, [filters, sortColumns, isLoading]);

  // Download provider
  useEffect(() => {
    if (!terria._initiateTableDownload) return;

    let subscription = terria._initiateTableDownload.subscribe(param => {
      try {
        if (param.excel) {
          exportToExcel(processedRows, source, filters, terria, viewState);
        } else {
          exportToCsv(source, processedRows);
        }
      } catch (err) {
        console.error(err);
      }
    });

    return () => {
      subscription.dispose();

      subscription = null;
    };
  }, []);

  return (
    <>
      <div className={Styles.topBar}>
        <div style={{ display: "flex", overflow: "auto" }}>
          {columns && columns.length ? (
            getFilterTags(source, filters, setFilters)
          ) : (
            <span className={Styles.selectColumn}>
              {i18n.t("tableView.noColumnsSelected")}
            </span>
          )}
        </div>

        <div style={{ position: "relative" }} />
      </div>

      <FilterContext.Provider
        value={{
          filters,
          sortColumns,
          setSortColumns,
          setFilters,
          useColor,
          setUseColor
        }}
      >
        <ReactDataGrid
          style={{ height: "calc(100% - 30px - 25px)" }}
          defaultColumnOptions={{
            sortable: true,
            filterable: true,
            resizable: true
          }}
          columns={columns}
          rows={processedRows}
          rowClass={() => (isDateFilterOpen ? Styles.rowNoEvents : Styles.row)}
          className={Styles.terriaGrid}
          sortColumns={sortColumns}
          onSortColumnsChange={setSortColumns}
          minHeight={500}
          headerRowHeight={80}
        />
      </FilterContext.Provider>

      <div className={Styles.bottomBar}>
        {sortColumns.length > 0 ? (
          <pre>
            Sorting by{" "}
            {sortColumns.map(a => (
              <span key={a.name}>
                "{a.name}" in{" "}
                {a.direction === "ASC"
                  ? i18n.t("tableView.ascending")
                  : i18n.t("tableView.descending")}
              </span>
            ))}
          </pre>
        ) : (
          <pre> </pre>
        )}
        <pre className={Styles.totalRows}>
          {i18n.t("tableView.showing")}{" "}
          {(processedRows.length || 0).toLocaleString()}{" "}
          {i18n.t("tableView.rows")}{" "}
        </pre>
      </div>
    </>
  );
}

function getFilterTags(source, filters, setFilters) {
  return Object.entries(filters)
    .filter(a => a[1])
    .map((filter, index) => {
      const columnName = source.getColumnName(filter[0]);
      const color = source.columns.find(a => a.id == filter[0])?.color;

      return getFilterTag(
        filters,
        setFilters,
        filter,
        index,
        columnName,
        color
      );
    });
}

function getFilterTag(filters, setFilters, filter, index, columnName, color) {
  let value = null;
  if (typeof filter[1] === "string") {
    value = filter[1];
  }

  if (typeof filter[1] === "object" && filter[1].value) {
    value = filter[1].value;
  }

  if (typeof filter[1] === "object" && Array.isArray(filter[1])) {
    value = filter[1].map(a => a.value).join(", ");
  }

  if (typeof filter[1] === "object" && (filter[1].start || filter[1].end)) {
    value =
      (filter[1].start
        ? moment.utc(filter[1].start).format("DD/MM/YYYY")
        : "") + " - ";
    value += filter[1].end
      ? moment.utc(filter[1].end).format("DD/MM/YYYY")
      : "";
  }

  return value ? (
    <div className={Styles.filterBadge} style={{ background: color }}>
      <span>
        "{columnName}" : {value}
      </span>
      <button
        key={index}
        onClick={() => {
          const newFilter = { ...filters };
          delete newFilter[filter[0]];
          setFilters(newFilter);
        }}
      >
        x
      </button>
    </div>
  ) : (
    ""
  );
}

function getColumns(source, setFilters, setDateFilterOpen) {
  const columns = source.tableColumns
    .filter(a => a.isActive)
    .map((column, index) => ({
      name: column.name,
      key: column.id,
      isActiveObservable: column.isActiveObservable,
      type: column.type,
      style: column.style,
      dateFormat: column.dateFormat,
      sortable: true,
      filterable: true,
      formatter: cellRenderer,
      renderCell: cellRenderer,
      headerRenderer: param => {
        return headerColumnRenderer(
          param,
          column,
          setFilters,
          setDateFilterOpen
        );
      },
      renderHeaderCell: param => {
        return headerColumnRenderer(
          param,
          column,
          setFilters,
          setDateFilterOpen
        );
      }
    }));

  return columns;
}

function headerColumnRenderer(param, column, setFilters, setDateFilterOpen) {
  const parameters = { ...column, ...param };

  return (
    <HeaderRenderer {...parameters}>
      {({ filters, ...rest }) => {
        const { id, name, type, uniqueValues, uniqueValueCount } = column;

        if (type == VarType.SCALAR) {
          return DefaultFilter(rest, filters, column, setFilters);
        }

        if (type == VarType.TIME) {
          const currentVal = filters?.[id];
          return DateFilter(
            currentVal,
            setFilters,
            filters,
            id,
            name,
            param,
            setDateFilterOpen
          ); // createPortal(<DateRangeSelector />, ui)
        }

        if (
          [
            VarType.ENUM,
            VarType.REGION,
            VarType.TAG,
            VarType.HIDDEN,
            VarType.ADDR
          ].indexOf(type) >= 0 &&
          uniqueValueCount <= 50
        ) {
          return DropdownFilter(name, filters, id, setFilters, uniqueValues);
        }
        return DefaultFilter(rest, filters, column, setFilters);
      }}
    </HeaderRenderer>
  );
}

TerriaGrid.propTypes = {
  terria: PropTypes.object.isRequired,
  viewState: PropTypes.object.isRequired,
  source: PropTypes.object,
  t: PropTypes.func.isRequired,
  isLoading: PropTypes.bool,
  i18n: PropTypes.object
};

export default React.memo(withTranslation()(TerriaGrid));
