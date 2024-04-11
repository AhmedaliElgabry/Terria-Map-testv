"use strict";
/**
 * Using DOM manipulation because the library does not provide any props to hide the
 * @param {*} isReadonly
 * @returns
 */
export function hideColumnsAndRows(isReadonly) {
  const pivoteTable =
    document.querySelector(
      "#tableViewContainer > div.tjs-table-view-container__table-container > div > div.tjs-terria-pivot__pivot.tjs-terria-pivot__read-only-mode > table"
    ) ||
    document.querySelector(
      "#tableViewContainer > div.tjs-table-view-container__table-container > div > table"
    ) ||
    document.querySelector(
      "#tableViewContainer > div.tjs-table-view-container__table-container > div > div.tjs-terria-pivot__pivot.tjs-terria-pivot__read-only-mode > table"
    );

  if (!pivoteTable) {
    return Promise.reject("Pivot view not found");
  }

  const topRow = pivoteTable.querySelector("tbody > tr:nth-child(1)");

  const col1 = pivoteTable.querySelector(
    "tbody > tr:nth-child(2) > td.pvtAxisContainer.pvtUnused.pvtVertList"
  );
  const col2 = pivoteTable.querySelector(
    "tbody > tr:nth-child(2) > td.pvtAxisContainer.pvtVertList.pvtRows"
  );

  const col3 = pivoteTable.querySelector(
    "tbody > tr:nth-child(3) > td.pvtAxisContainer.pvtVertList.pvtRows"
  );
  const col4 = pivoteTable.querySelector(
    "tbody > tr:nth-child(2) > td.pvtAxisContainer.pvtVertList.pvtRows"
  );

  // const pivotUi = document.querySelector("#tableViewContainer > div.tjs-table-view-container__table-container > div > div.tjs-terria-pivot__pivot.tjs-terria-pivot__read-only-mode > table");
  const pivotDataTable = document.querySelector(
    "div.tjs-terria-pivot__read-only-mode > table > tbody > tr:nth-child(2) > td.pvtOutput > table"
  );

  const elements = [topRow, col1, col2, col3, col4];

  const toggleVisibility = function() {
    elements
      .filter(a => a)
      .forEach(element => {
        element.style.display = isReadonly ? "none" : "";
      });
  };

  // const widthToShift = 0;
  // const heightToShift = 0;
  // const transition = isReadonly
  //   ? `translate(${-widthToShift}px, ${-heightToShift}px)`
  //   : `translate(${0}px, ${0}px)`;
  // pivoteTable.style.transform = transition;
  return new Promise(resolve => {
    setTimeout(() => {
      toggleVisibility();
      if (pivotDataTable) {
        pivotDataTable.style.width = isReadonly ? "calc(100vw - 450px);" : "";
        resolve(true);
      }
    }, 100);
  });
}
