"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.assertArray = exports.assertNumber = exports.assertString = exports.assertObject = exports.isJsonNumberArray = exports.isJsonStringArray = exports.isJsonArray = exports.isJsonValue = exports.isJsonString = exports.isJsonNumber = exports.isJsonBoolean = exports.isJsonObject = void 0;
function isJsonObject(value, deep) {
  if (deep === void 0) {
    deep = true;
  }
  return (
    value !== undefined &&
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    (!deep ||
      Object.values(value).every(function(v) {
        return isJsonValue(v, true);
      }))
  );
}
exports.isJsonObject = isJsonObject;
function isJsonBoolean(value) {
  return typeof value === "boolean";
}
exports.isJsonBoolean = isJsonBoolean;
function isJsonNumber(value) {
  return typeof value === "number";
}
exports.isJsonNumber = isJsonNumber;
function isJsonString(value) {
  return typeof value === "string";
}
exports.isJsonString = isJsonString;
function isJsonValue(value, deep) {
  if (deep === void 0) {
    deep = true;
  }
  return (
    typeof value === "undefined" ||
    value === null ||
    isJsonBoolean(value) ||
    isJsonNumber(value) ||
    isJsonString(value) ||
    isJsonArray(value, deep) ||
    isJsonObject(value, deep)
  );
}
exports.isJsonValue = isJsonValue;
function isJsonArray(value, deep) {
  if (deep === void 0) {
    deep = true;
  }
  return (
    Array.isArray(value) &&
    (!deep ||
      value.every(function(child) {
        return isJsonValue(child, true);
      }))
  );
}
exports.isJsonArray = isJsonArray;
function isJsonStringArray(value) {
  return (
    Array.isArray(value) &&
    value.every(function(child) {
      return isJsonString(child);
    })
  );
}
exports.isJsonStringArray = isJsonStringArray;
function isJsonNumberArray(value) {
  return (
    Array.isArray(value) &&
    value.every(function(child) {
      return isJsonNumber(child);
    })
  );
}
exports.isJsonNumberArray = isJsonNumberArray;
function assertObject(value, name) {
  if (isJsonObject(value)) return;
  throwUnexpectedError("JsonObject", typeof value, name);
}
exports.assertObject = assertObject;
function assertString(value, name) {
  if (typeof value === "string") return;
  throwUnexpectedError("string", typeof value, name);
}
exports.assertString = assertString;
function assertNumber(value, name) {
  if (typeof value === "number") return;
  throwUnexpectedError("number", typeof value, name);
}
exports.assertNumber = assertNumber;
function assertArray(value, name) {
  if (Array.isArray(value)) return;
  throwUnexpectedError("Array", typeof value, name);
}
exports.assertArray = assertArray;
function throwUnexpectedError(expectedType, actualType, name) {
  var nameToBe = name ? " ".concat(name, " to be") : "";
  throw new Error(
    "Expected"
      .concat(nameToBe, " ")
      .concat(expectedType, ", got ")
      .concat(actualType)
  );
}
