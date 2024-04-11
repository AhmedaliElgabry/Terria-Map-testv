const csv = require("../../../ThirdParty/csv");
const ExportJsonExcel = require("js-export-excel");
const moment = require("moment");
import { buildShortShareLink } from "../../Map/Panels/SharePanel/BuildShareLink";

export function downloadCsv(source, csv) {
  downloadFile(
    source.name,
    new Blob([csv], { type: "text/csv;charset=utf-8;" })
  );
}

export async function exportToExcel(
  csvString,
  source,
  currentView,
  terria,
  viewState
) {
  if (!csvString || !csvString.split) return;

  const rows = csvString.split("\n");

  if (!rows.length) {
    console.warn("Pivot excel download failed. Nothing to download.");
    return;
  }

  csvString = csvString.replace(/"([^"]*)"/g, function(match, group1) {
    return '"' + group1.replace(/,/g, ";") + '"';
  });

  const downloadColumns = rows
    .shift()
    .replace(/"([^"]*)"/g, function(match, group1) {
      return '"' + group1.replace(/,/g, ">") + '"';
    })
    .split(",")
    .map(col => col.replaceAll('"', ""));

  const shareUrl = await buildShortShareLink(terria, viewState);

  const sheetData = csv.toObjects(csvString, {
    headers: downloadColumns,
    delimiter: ","
  });

  const option = {
    fileName: source.name,
    datas: [
      {
        sheetData: [...sheetData],
        sheetName: "Data",
        sheetHeader: downloadColumns.map(a => a),
        columnWidths: downloadColumns.map(a => 10)
      },
      {
        sheetName: "Metadata",
        sheetData: [
          { Data: "Name", Value: source.name },
          {
            Data: "Created On",
            Value: moment.utc().format("DD/MM/YYYY hh:mm")
          },
          { Data: "Source", Value: terria.appName },
          { Data: "View Name", Value: currentView.name },
          { Data: "Address", Value: shareUrl },
          { Data: "Data URL", Value: source.item.url },
          { Data: "Description", Value: source.item.description || "NA" }
        ],
        columnWidths: [5, 300]
      }
    ]
  };

  const toExcel = new ExportJsonExcel(option);
  toExcel.saveExcel();
}

function getFiltersUsed(source, filters) {
  return Object.entries(filters)
    .filter(a => a[1])
    .map((filter, index) => {
      const columnName = source.getColumnName(filter[0]);
      const color = source.columns.find(a => a.id == filter[0])?.color;

      return getFilterTag(filter, columnName);
    })
    .join("\n");
}

function getFilterTag(filter, columnName) {
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

  return value ? `${columnName}: ${value}` : "";
}

function getContent(source, processedRows) {
  const cols = source.downloadColumns;
  const rows = processedRows.map(row => {
    const newRow = cols.reduce((all, col) => {
      all[col.name] = row[col.name];
      return all;
    }, {});
    return newRow;
  });
  return csv.fromObjects(rows, { experimental: true });
}

function downloadFile(fileName, data) {
  const downloadLink = document.createElement("a");
  downloadLink.download = fileName;
  const url = URL.createObjectURL(data);
  downloadLink.href = url;
  downloadLink.click();
  URL.revokeObjectURL(url);
}
