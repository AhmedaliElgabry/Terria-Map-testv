"use strict";
import classNames from "classnames";
import React, { Component } from "react";
import { withTranslation } from "react-i18next";
import defined from "terriajs-cesium/Source/Core/defined";
import knockout from "terriajs-cesium/Source/ThirdParty/knockout";
import VisualizationType from "../../Models/VisualizationType";
import Icon from "../Icon";
import Loader from "../Loader";
import TerriaGrid from "./Grid/TerriaGrid";
import TerriaPivot from "./Pivot/TerriaPivot";
import TableDataProvider from "./TableDataProvider";
import Styles from "./table-view-container.scss";
import ColorPallet from "./color-pallet.scss";
import { TableTypes } from "./TableTypes";
import { TableColorModes } from "./TableColorModes";
import isCommonMobilePlatform from "../../Core/isCommonMobilePlatform";

class TableViewContainer extends Component {
  constructor(props) {
    super(props);
    const { terria } = this.props;

    this.state = {
      isOpen: defined(terria.nowViewingTable),
      item: terria.nowViewingTable,
      tableType: terria.tableType,
      pivotState: {},
      loading: false,
      dragging: false,
      tableTop: terria.tableTop || 0,
      colorMode:
        terria.getLocalProperty("tableViewColorMode") ||
        terria.configParameters.tabularViewSettings?.defaultColorMode ||
        TableColorModes.dark
    };
  }

  componentDidMount() {
    const { terria } = this.props;
    const { nowViewing } = terria;

    this._tableTabVisibleHandler = knockout
      .getObservable(terria, "viewType")
      .subscribe(viewType => {
        const tabularItemsLength = terria.nowViewing.tabularItems.length;

        if (viewType != VisualizationType.TABLE || tabularItemsLength == 0) {
          terria.nowViewingTable = null;
          return;
        }
      });

    // If the item we're viewing is removed, this notifies us so we can close the table
    // this._nowViewingItemsObservableSubscription = knockout
    //   .getObservable(nowViewing, "items")
    //   .subscribe(a => {
    //     // if (this.state.isOpen && !nowViewing.items.includes(this.state.item)) {
    //     //   this.closeTable();
    //     // }
    //   });

    this._tableStatusObservable = knockout
      .getObservable(terria, "nowViewingTable")
      .subscribe(item => {
        if (!item) {
          this.closeTable();
          return;
        }

        // If there is no item in the current state
        if (!this.state.item) {
          this.openTable(item);
        } else if (this.state.item.uniqueId != item.uniqueId) {
          // If there is a new item opened
          this.closeTable().then(() => this.openTable(item));
          // runLater(() => this.openTable(item), 50);
        }
      });

    this._tableTypeSubscription = knockout
      .getObservable(terria, "tableType")
      .subscribe(type => {
        this.setState({ tableType: type });
      });

    // this._tableTopSubscription = knockout
    //   .getObservable(terria, "tableTop")
    //   .subscribe(tableTop => {
    //     this.setState({ tableTop });
    //   });

    this._colorModeSubscription = knockout
      .getObservable(terria, "tableColorMode")
      .subscribe(mode => {
        if (
          terria.configParameters.tabularViewSettings?.disableColorModeChange
        ) {
          return;
        }

        this.setState({ colorMode: mode });
      });

    if (this.state.item && terria.viewType === VisualizationType.TABLE) {
      this.openTable(this.state.item);
    } else {
      this.closeTable();
    }

    const mouseMove = e => {
      if (this.state.dragging) {
        let tableTop = Math.max(this.state.tableTop + e.movementY, 0);
        this.setState({ tableTop });
        e.stopPropagation();
        e.preventDefault();
        window.addEventListener("click", captureClick, true);
      }
    };

    const touchMove = e => {
      if (this.state.dragging) {
        var touchLocation = e.targetTouches[0];

        let tableTop = Math.max(touchLocation.pageY, 0);
        this.setState({ tableTop });
        e.stopPropagation();
      }
    };

    const captureClick = e => {
      e.stopPropagation();
      window.removeEventListener("click", captureClick, true); // cleanup
    };

    const mouseup = e => {
      if (this.state.dragging) {
        this.setState(
          { dragging: false },
          () => (this.props.terria.tableTop = this.state.tableTop)
        );
      }
    };

    document.addEventListener("mousemove", mouseMove);
    document.addEventListener("mouseup", mouseup);

    document.addEventListener("touchmove", touchMove);
    document.addEventListener("touchend", mouseup);
  }

  componentWillUnmount() {
    if (this._tableStatusObservable) {
      this._tableStatusObservable.dispose();
      this._tableStatusObservable = null;
    }

    if (this._tableTypeSubscription) {
      this._tableTypeSubscription.dispose();
      this._tableTypeSubscription = null;
    }

    if (this._nowViewingItemsObservableSubscription) {
      this._nowViewingItemsObservableSubscription.dispose();
      this._nowViewingItemsObservableSubscription = null;
    }

    if (this._tableTabVisibleHandler) {
      this._tableTabVisibleHandler.dispose();
      this._tableTabVisibleHandler = null;
    }

    if (this._tableTopSubscription) {
      this._tableTopSubscription.dispose();
      this._tableTopSubscription = null;
    }

    if (this._colorModeSubscription) {
      this._colorModeSubscription.dispose();
      this._colorModeSubscription = null;
    }
  }

  closeFeatureInfoPanel() {
    this.props.viewState.featureInfoPanelIsVisible = false;
  }

  componentDidUpdate() {}

  openTable(item) {
    if (!item) return;
    const { isLoading, tableStructure } = item;

    if (defined(tableStructure) && !defined(tableStructure.getColorCallback)) {
      tableStructure.getColorCallback = item.getNextColor.bind(item);
    }

    item.setColorColumns();

    let tableType;

    if (this.props.terria.tableIsShared) {
      tableType = this.props.terria.tableType;
    } else {
      tableType =
        item.tabularViewSettings?.tableType ||
        this.props.terria.configParameters.tabularViewSettings?.tableType ||
        this.props.terria.tableType ||
        TableTypes.grid;
    }

    this.props.terria.tableType = tableType;

    const flattenTime = () => {
      if (item._regionMapping) {
        item._regionMapping.flattenTime = true;
        item._regionMapping.changedActiveItems();
      }

      if (item._dataSource) {
        item._dataSource.entities.removeAll();
        item._dataSource.filterContext.filters =
          item._dataSource.filterContext.filtersBackup;
        item._dataSource.filterContext.flattenTime = true;
        item._dataSource.changedActiveItems(); // item.isTimeDisabled = true;
      }
    };

    const open = () => {
      flattenTime();
      this.closeFeatureInfoPanel();
      const dataProvider = new TableDataProvider(item, this.props.terria);
      const tableViewConfig = item.tabularViewSettings || {};

      const configTableTop =
        (window.innerHeight * (tableViewConfig.tableTop || 0)) / 100;

      const tableTop = this.props.terria.tableTop || configTableTop || 0;

      this.setState(
        {
          dataProvider: dataProvider,
          isOpen: true,
          item: item,
          title: item.name,
          description: item.description,
          loading: false,
          tableTop: tableTop,
          colorMode: this.state.colorMode || tableViewConfig.defaultColorMode
        },
        () => {
          if (this.state.colorMode != this.props.terria.tableColorMode) {
            this.props.terria.tableColorMode = this.state.colorMode;
          }
        }
      );
    };

    this._isLoadingObservableSubscription = knockout
      .getObservable(item, "isLoading")
      .subscribe(loading => {
        /**
         * We have to check current tab because user may change the
         * filter of a currently unselected smart-csv
         */
        if (this.props.terria.viewType !== VisualizationType.TABLE) {
          return;
        }

        if (loading) {
          this.setState({ loading: loading });
        } else {
          item.prepareTabularView().then(() => {
            open();
          });
        }
      });

    this.setState({ loading: true });

    if (!isLoading && tableStructure) {
      item.prepareTabularView().then(() => {
        open();
      });
    } else if (!isLoading && !defined(tableStructure)) {
      this.setState({ loading: true, isOpen: true, title: item.name });
    }
  }

  closeTable() {
    const item = this.state.item;

    this.setState({ loading: true });

    if (this._isLoadingObservableSubscription) {
      this._isLoadingObservableSubscription.dispose();
      this._isLoadingObservableSubscription = null;
    }

    if (item && item._regionMapping) {
      item._regionMapping.flattenTime = false;
      item._regionMapping.changedActiveItems();
      this.state.dataProvider?.updateMap(null);
    }

    if (item && item._dataSource) {
      item._dataSource.filterContext.flattenTime = false;
      // item._dataSource.entities.removeAll();
      item._dataSource.filterContext.filtersBackup =
        item._dataSource.filterContext.filters;
      item._dataSource.filterContext.filters = null;
      item._dataSource.changedActiveItems();
    }

    const cleanUpPromise =
      this.state.item?.revertToMapView() || Promise.resolve();

    cleanUpPromise.then(() => {
      this.props.terria.tableIsShared = false;

      this.setState({
        item: null,
        isOpen: false,
        dataProvider: null,
        title: null,
        description: null,
        loading: false
      });
    });

    return cleanUpPromise;
  }

  render() {
    const { terria, t } = this.props;

    if (terria.configParameters.tabularViewSettings?.disable) {
      console.warn("Table view disabled in the configurations");
      return null;
    }

    const {
      isOpen,
      dataProvider,
      title,
      tableType,
      tableTop,
      dragging,
      item
    } = this.state;

    // if(!item) {
    //   return;
    // }

    const draggableStyle = {
      top: `${this.state.tableTop}px`,
      height: `calc(100% - ${this.state.tableTop}px)`
    };

    if (dragging) {
      draggableStyle.transition = "none";
    }

    const isTableDraggable = !item?.tabularViewSettings?.hideDragButton;
    const isMobile = isCommonMobilePlatform() || window.innerWidth < 720;

    return (
      <div
        id="tableViewContainer"
        className={classNames(
          Styles.tableWrapper,
          ColorPallet[this.state.colorMode],
          {
            [Styles.slideIn]: isOpen,
            [Styles.slideOut]: !isOpen,
            [Styles.tableWrapperFullscreen]: this.props.viewState
              .isMapFullScreen,
            [Styles.storyBuilderShown]: this.props.viewState.storyBuilderShown
          }
        )}
        style={draggableStyle}
      >
        <div
          className={classNames(Styles.headerParent, {
            [Styles.noTopMargin]: isMobile && tableTop > 30
          })}
        >
          <div
            className={classNames(Styles.toolbarContainer, {
              [Styles.headerFullscreen]:
                this.props.viewState.isMapFullScreen && tableTop < 20
            })}
          >
            <div
              style={{
                padding: isMobile
                  ? "10px"
                  : `${Math.max(20 - tableTop * 0.045, 10)}px`
              }}
              className={classNames(Styles.titleContainer)}
            >
              {/* <Icon glyph={Icon.GLYPHS.grid} /> */}

              <h1
                className={classNames({
                  [Styles.smallerTitle]: tableTop > 250
                })}
              >
                {title}
              </h1>
            </div>

            {/* <div
              className={classNames(Styles.toolbar, {
                [Styles.viewSettingRight]: tableTop >= 40
              })}
            >
              {!terria.isCommonMobilePlatform &&
                !this.props.viewState.explorerPanelIsVisible && (
                  <TableViewSettingPanel
                    terria={this.props.terria}
                    viewState={this.props.viewState}
                  />
                )}
            </div> */}

            {isTableDraggable && (
              <button
                id="tableExpandCollapseButton"
                onTouchStart={e => {
                  this.setState({ dragging: true });
                  e.stopPropagation();
                }}
                onMouseDown={e => {
                  this.setState({ dragging: true });
                  e.stopPropagation();
                  // e.preventDefault();
                }}
                onClick={() => {
                  if (this.state.dragging) {
                    this.setState({ dragging: false });
                    return;
                  }

                  this.setState(
                    {
                      tableTop: tableTop > 100 ? 0 : window.innerHeight * 0.55
                    },
                    () => (this.props.terria.tableTop = this.state.tableTop)
                  );
                }}
                className={classNames(
                  Styles.menuItem,
                  Styles.expandCollapse,
                  {}
                )}
              >
                <Icon className={Styles.upArrow} glyph={Icon.GLYPHS.left} />
                <Icon className={Styles.downArrow} glyph={Icon.GLYPHS.left} />
              </button>
            )}
          </div>
        </div>

        <div className={Styles.tableContainer}>
          <If condition={this.state.loading}>
            <div key={0} className={Styles.loading}>
              <Loader message={t("tableView.loadingData")} />
            </div>
          </If>

          <If condition={!this.state.loading && isOpen}>
            {tableType == TableTypes.pivot && (
              <TerriaPivot
                terria={terria}
                viewState={this.props.viewState}
                source={dataProvider}
                isLoading={this.state.loading}
              />
            )}

            {tableType == TableTypes.grid && (
              <TerriaGrid
                terria={terria}
                viewState={this.props.viewState}
                source={dataProvider}
                isLoading={this.state.loading}
              />
            )}
          </If>
        </div>
      </div>
    );
  }
}

export default withTranslation()(TableViewContainer);
