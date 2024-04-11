const csv = require("../../../ThirdParty/csv");
const ExportJsonExcel = require("js-export-excel");
const moment = require("moment");
import { buildShortShareLink } from "../../Map/Panels/SharePanel/BuildShareLink";

export function exportToCsv(source, processedRows) {
  const content = getContent(source, processedRows);
  downloadFile(
    source.name,
    new Blob([content], { type: "text/csv;charset=utf-8;" })
  );
}

export async function exportToExcel(
  processedRows,
  source,
  filters,
  terria,
  viewState
) {
  const downloadColumns = source.downloadColumns;

  const shareUrl = await buildShortShareLink(terria, viewState);
  const sheetData = processedRows.map(d => {
    const result = downloadColumns.reduce(function(all, newVal) {
      all[newVal.name] = d[newVal.id] || d[newVal.name];
      return all;
    }, {});
    return result;
  });

  const option = {
    fileName: source.name,
    datas: [
      {
        sheetData: [...sheetData],
        sheetName: "Data",
        sheetHeader: downloadColumns.map(a => a.name || a),
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
          { Data: "Address", Value: shareUrl },
          { Data: "Data URL", Value: source.item.url },
          {
            Data: "Filters Used",
            Value: getFiltersUsed(source, filters) || "-"
          },
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
  if (!typeof filters !== "object") return null;

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
      all[col.name] = row[col.id] || row[col.name];
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
