"use strict";
const JSONstat = require("../ThirdParty/jsonstat-toolkit");

class JsonStatHelper {
  constructor() {}

  getDimensions(data) {
    const translations = JSONstat(data);
    if (!translations) return;

    const dataset = translations.Dataset(0);

    if (!dataset) return;

    const dimensionIds = dataset.id;

    const dimensions = dataset.Dimension().map((dimension, index) => {
      const ids = dimension.id;
      const categories = dimension.Category();
      const id = dimensionIds[index].toLowerCase();

      const childItems = [];

      const dimensionValues = categories.map((cat, i) => {
        const unit = cat.unit ? ` (${cat.unit.symbol})` : "";

        if (cat.id && Array.isArray(cat.id)) {
          childItems.push(...cat.id);
        }

        return {
          value: ids[i],
          label: cat.label + unit || ids[i],
          description: (cat.note || []).join("\n"),
          sortOrder: cat.index,
          visible: true,
          children: cat.id
        };
      });

      for (const dim of dimensionValues) {
        dim.isChild = childItems.includes(dim.value);
      }

      return {
        Id: id,
        Label: dimension.label,
        Values: dimensionValues,
        type: dimension.role
      };
    });

    return dimensions;
  }

  getMetadata(data) {
    const translations = JSONstat(data);
    if (!translations) return;

    const dataset = translations.Dataset(0);

    if (!dataset) return;

    return dataset.extension;
  }
}

module.exports = JsonStatHelper;
