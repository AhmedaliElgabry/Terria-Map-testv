"use strict";
import React, { useState, useEffect, useRef } from "react";
import PropTypes from "prop-types";
import PivotTableUI from "react-pivottable/PivotTableUI";
// import getTableRenderers from "./VirtualizedTableRenderer.jsx";
import getTableRenderers from "./AdvancedTableRenderer.jsx";
// import TableRenderers from "react-pivottable/TableRenderers";
import "!!style-loader!css-loader?sourceMap!react-pivottable/pivottable.css";
import "!!style-loader!css-loader?sourceMap!./pivot-table.css";
import Styles from "./terria-pivot.scss";
import classNames from "classnames";
import CsvRenderer from "./CsvRenderer.jsx";
// import { downloadCsv, exportToExcel } from "./pivotExportUtils";
import { exportToCsv, exportToExcel } from "../Grid/gridExportUtils";
import Loader from "../../Loader";
import { withTranslation } from "react-i18next";
import knockout from "terriajs-cesium/Source/ThirdParty/knockout-3.5.1";
import { aggregators } from "react-pivottable/Utilities";
import PredefinedViewSelector from "./PredefinedViewSelector";
import { hideColumnsAndRows } from "./hideColumnsAndRows.jsx";
import parseCustomHtmlToReact from "../../Custom/parseCustomHtmlToReact";

const PIVOT_PROCESSING_DELAY = 500;

const DEFAULT_RENDERER_NAME = "Table";
const DEFAULT_AGGREGATOR = "Count";

const ALLOWED_AGGREGATORS = {
  Count: aggregators["Count"],
  Sum: aggregators["Sum"],
  Average: aggregators["Average"],
  Median: aggregators["Median"],
  Minimum: aggregators["Minimum"],
  Maximum: aggregators["Maximum"],
  First: aggregators["First"],
  Last: aggregators["Last"]
};

function TerriaPivot(props) {
  if (!props.source) {
    return null;
  }

  const { terria, viewState, source, t } = props;
  const { item, pivotTableRows } = source;
  const [data, setData] = useState(pivotTableRows);

  const [isProcessing, setIsProcessing] = useState(true);

  const config = item.tabularViewSettings || {};
  const pivotConfig = config.pivot || {};

  const CUSTOM_VIEW_NAME = t("pivotView.customView");

  const pivotViewRef = useRef(null);

  const [TableRenderers, setTableRenderers] = useState(
    getTableRenderers({
      terria: terria,
      dataSource: source,
      fullWidth: !isEditMode
    })
  );

  const predefinedViews = [
    ...(pivotConfig.views || []),
    { name: CUSTOM_VIEW_NAME, rendererName: DEFAULT_RENDERER_NAME }
  ];

  terria.currentPivotViews = terria.currentPivotViews || {};

  const defaultView =
    predefinedViews.find(
      a => a.name == terria.currentPivotViews?.[item.uniqueId]
    ) ||
    predefinedViews.find(a => a.name == pivotConfig.defaultView) ||
    predefinedViews[0];

  const [currentView, setCurrentView] = useState(defaultView);

  if (defaultView.name != terria.currentPivotViews[item.uniqueId]) {
    terria.currentPivotViews[item.uniqueId] = defaultView.name;
  }

  const [isEditMode, setIsEditMode] = useState(
    defaultView.name == CUSTOM_VIEW_NAME
  );

  const [rendererName, setRendererName] = useState(
    currentView.rendererName || DEFAULT_RENDERER_NAME
  );

  const [pivotState, setPivotState] = useState({
    rendererName: rendererName
  });

  /**
   * Hide the list of columns
   */
  useEffect(() => {
    if (props.isLoading || !data) {
      setData([]);
      return;
    }
    setData(source.pivotTableRows);

    setIsProcessing(true);
    setPivotState({ rendererName });
    setIsEditMode(currentView.name === CUSTOM_VIEW_NAME);

    setTimeout(() => {
      hideColumnsAndRows(!isEditMode).finally(a => setIsProcessing(false));
    }, PIVOT_PROCESSING_DELAY);
  }, [props.isLoading, source.item, currentView, isEditMode]);

  /**
   * Provides csv and excel download by subscribing to a knockout prop terria._initiateTableDownload
   */
  useEffect(() => {
    if (!terria._initiateTableDownload) return;

    let subscription = terria._initiateTableDownload.subscribe(param => {
      setIsProcessing(true);

      try {
        if (param.excel) {
          exportToExcel(source.tableRows, source, {}, terria, viewState);
        } else {
          exportToCsv(source, source.tableRows);
        }
      } catch (err) {
        console.error(err);

        viewState.notifications.push({
          title: "Download Error",
          message: err,
          width: 300
        });
      } finally {
        setIsProcessing(false);
      }
    });

    return () => {
      subscription.dispose();
      subscription = null;
    };
  }, []);

  if (!data) return null;

  /**
   * Controls the number of decimal places to show on the table
   */
  useEffect(() => {
    let decimalPlacesSubscription = knockout
      .getObservable(terria, "tableDecimalPlaces")
      .subscribe(() => {
        setTableRenderers(
          getTableRenderers({
            terria,
            dataSource: source,
            fullWidth: !isEditMode
          })
        );
      });

    return () => {
      decimalPlacesSubscription?.dispose();
      decimalPlacesSubscription = null;
    };
  }, []);

  useEffect(() => {
    setIsProcessing(false);
  }, [currentView]);

  const derivedValues = {};
  for (const [key, value] of Object.entries(currentView?.derivedValues || {})) {
    derivedValues[key] = eval(value);
  }

  const vals = source.convertIdsToNames(currentView.vals);
  const rowsSettings = source.convertIdsToNames(currentView.rows);
  const cols = source.convertIdsToNames(currentView.cols);

  const pvt = (
    <PivotTableUI
      ref={pivotViewRef}
      data={data}
      aggregatorName={currentView.aggregator || DEFAULT_AGGREGATOR}
      aggregators={ALLOWED_AGGREGATORS}
      vals={vals}
      rows={rowsSettings}
      cols={cols}
      derivedAttributes={derivedValues}
      onChange={s => {
        setRendererName(s.rendererName || DEFAULT_RENDERER_NAME);
        setPivotState(s);
      }}
      renderers={Object.assign({}, TableRenderers, {
        CSV: CsvRenderer
      })}
      unusedOrientationCutoff={0}
      {...pivotState}
      rendererName={rendererName} // should be below {...pivotState}
    />
  );

  return (
    <div className={Styles.terriaPivotWrapper}>
      <div className={Styles.topBar}>
        <PredefinedViewSelector
          predefinedViews={predefinedViews}
          currentView={currentView}
          onChange={view => {
            setIsProcessing(true);
            setCurrentView(view);
            terria.currentPivotViews[item.uniqueId] = view.name;
          }}
        />
        {currentView.description && (
          <div className={Styles.description}>
            {parseCustomHtmlToReact(currentView.description)}
          </div>
        )}
      </div>

      {isProcessing && (
        <div className={Styles.processingMessage}>
          <Loader message={t("pivotView.preparingView")} />
        </div>
      )}

      <div
        className={classNames(Styles.pivot, Styles.readOnlyMode, {
          [Styles.editMode]: isEditMode,
          [Styles.isProcessing]: isProcessing
        })}
      >
        {pvt}
      </div>
      <div className={Styles.bottomBar}>
        <pre>
          <span className={Styles.primary}>{data.length} </span>
          <span className={Styles.label}>records organized by </span>
          <span className={Styles.label}>rows: </span>
          <span className={Styles.primary}>{rowsSettings.join(", ")} </span>
          <span className={Styles.label}>columns: </span>
          <span className={Styles.primary}>{cols.join(",")} </span>
          <span className={Styles.label}>vals: </span>
          <span className={Styles.primary}>Σ {currentView.aggregator}(</span>
          <span className={Styles.primary}>{vals}) </span>
        </pre>
      </div>
    </div>
  );
}

TerriaPivot.propTypes = {
  terria: PropTypes.object.isRequired,
  source: PropTypes.object.isRequired,
  viewState: PropTypes.object.isRequired,
  t: PropTypes.func.isRequired,
  isLoading: PropTypes.bool.isRequired
};

export default React.memo(withTranslation()(TerriaPivot));
