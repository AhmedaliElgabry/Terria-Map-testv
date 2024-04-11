"use strict";
const JSONstat = require("../ThirdParty/jsonstat-toolkit");

export class DimensionLabelTranslator {
  constructor(data, type) {
    this.type = type;

    try {
      if (type === "jsonstat") {
        this.jsonStatLabels(data);
      }
    } catch (err) {
      console.error(err);
    }
  }

  jsonStatLabels(data) {
    const translations = JSONstat(data);
    if (!translations) return;

    this.dataset = translations.Dataset(0);

    if (!this.dataset) return;

    this.translations = {};

    this.dimensionName = {};

    const dimensionIds = this.dataset.id;

    this.dataset.Dimension().forEach((dimension, index) => {
      const ids = dimension.id;
      const categories = dimension.Category();
      const id = dimensionIds[index].toLowerCase();
      this.dimensionName[id] = dimension.label;

      const translation = categories.map((cat, i) => {
        const unit = cat.unit ? ` (${cat.unit.symbol})` : "";

        return {
          value: ids[i],
          label: cat.label + unit || ids[i],
          description: (cat.note || []).join("\n"),
          sortOrder: cat.index,
          visible: true
        };
      });

      this.translations[id] = translation;
    });
  }

  translate(dimension, items) {
    if (this.type === "jsonstat") {
      return this.translateWithJsonStat(dimension, items);
    } else {
      return this.getOriginal(items);
    }
  }

  transateDimensionName(name) {
    name = name.toLowerCase();

    if (this.type === "jsonstat") {
      if (this.dimensionName && this.dimensionName[name]) {
        return this.dimensionName[name];
      }
    }

    return name;
  }

  translateWithJsonStat(dimension, items) {
    if (!this.translations) {
      return this.getOriginal(items);
    }

    const translation = this.translations[dimension.toLowerCase()];

    if (!translation) return this.getOriginal(items);

    const labelsWithTranslations = translation
      .filter(a => items.includes(a.value))
      .sort((a, b) => {
        if (a.sortOrder < b.sortOrder) return -1;
        if (a.sortOrder >= b.sortOrder) return 1;
      });

    return labelsWithTranslations;
  }

  getOriginal(items) {
    return items.map((item, i) => ({
      value: item,
      label: item,
      description: "",
      sortOrder: i,
      visible: true
    }));
  }

  getMetadata() {
    if (!this.dataset) return;

    return this.dataset.extension;
  }
}
