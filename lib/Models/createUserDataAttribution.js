"use strict";
const createCredit = require("../Map/createCredit");

function createUserDataAttribution(isWebData, newCatalogItem) {
  const text = "Displaying User Data";

  return createCredit(
    text,
    "https://data.apps.fao.org/static/sites/user-data-disclaimer.html"
  );
}

module.exports = createUserDataAttribution;
