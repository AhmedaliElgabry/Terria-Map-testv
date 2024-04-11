import defined from "terriajs-cesium/Source/Core/defined";
import VarType from "../../../Map/VarType";
import moment from "moment";
import { Parser } from "expr-eval";

const parser = new Parser();

export function filterValue(criteria, value) {
  let pass = true;
  let start = null;
  let end = null;

  if (defined(criteria) && typeof criteria == "object") {
    if (criteria.hasOwnProperty("value")) {
      criteria = criteria.value;
    } else if (Array.isArray(criteria)) {
      criteria = criteria.map(a =>
        new String(a.value || "").trim().toLowerCase()
      );
    } else if (
      criteria.hasOwnProperty("start") ||
      criteria.hasOwnProperty("end")
    ) {
      start = criteria.start;
      end = criteria.end;
      criteria = "";
    }
  }

  if (!defined(criteria) && !defined(start) && !defined(end)) {
    return true;
  }

  if (!defined(value)) {
    return false;
  }

  const isDateField = defined(start) || defined(end);

  if (isDateField && moment(value).isValid()) {
    if (defined(start)) {
      pass = moment(value) >= start;
    }

    if (pass && defined(end)) {
      pass = moment(value) <= end;
    }
  } else if (!isDateField) {
    criteria = typeof criteria == "string" ? criteria.trim() : criteria;
    if (isNumber(value)) {
      if (("" + criteria).search(/[>=, <=, >, <, =]/) > -1) {
        try {
          const expression = parser.parse(value + " " + criteria);

          pass = expression.evaluate();
        } catch (err) {
          pass = false;
        }
      } else {
        pass = value == criteria;
      }
    } else {
      if (typeof criteria == "string") {
        pass =
          value
            .toLowerCase()
            .indexOf(new String(criteria || "").toLowerCase()) != -1;
      } else if (Array.isArray(criteria)) {
        pass = criteria.includes(value.toLowerCase());
      }
    }
  }

  return pass;
}

export function doFilter(filters, row) {
  let valid = true;
  for (const filter in filters) {
    if (filters[filter]) {
      valid = filterValue(filters[filter], row[filter]);
    }

    if (!valid) break;
  }
  return valid;
}

function getComparator(source, sortColumn) {
  const columnMetadata = source.indexedColumns[sortColumn];
  if ([VarType.SCALAR, VarType.LAT, VarType.LON].includes(columnMetadata?.type))
    return (a, b) => {
      return a?.[sortColumn] - b?.[sortColumn];
    };
  else
    return (a, b) => {
      return new String(a?.[sortColumn])?.localeCompare(b?.[sortColumn]);
    };
}

export function doSort(source, sortColumns, a, b) {
  for (const sort of sortColumns) {
    const comparator = getComparator(source, sort.columnKey);
    const compResult = comparator(a, b);
    if (compResult !== 0) {
      return sort.direction === "ASC" ? compResult : -compResult;
    }
  }
  return 0;
}

function isNumber(str) {
  return !isNaN(str) && !isNaN(parseFloat(str));
}
