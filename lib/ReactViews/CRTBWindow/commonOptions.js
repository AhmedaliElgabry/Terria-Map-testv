"use strict";

export const forms = [
  "aoi",
  "hazard",
  "exposure",
  "vulnerability",
  "adaptiveCapacity"
];

export const formNames = {
  aoi: "aoi",
  hazard: "hazard",
  exposure: "exposure",
  vulnerability: "vulnerability",
  adaptiveCapacity: "adaptiveCapacity"
};

export const timescaleOptions = {
  hazard: [
    { label: "Baseline (1981-2010)", value: "baseline" },
    { label: "Near-term (2021-2040)", value: "near-term" },
    { label: "Mid-term (2041-2060)", value: "mid-term" }
  ],
  exposure: [{ label: "Baseline", value: "baseline" }],
  vulnerability: [{ label: "Baseline", value: "baseline" }],
  adaptiveCapacity: [{ label: "Baseline", value: "baseline" }]
};

export const rcpOptions = {
  hazard: {
    "near-term": [
      { name: "Low Emission Scenario (SSP1-2.6)", value: "rcp_2.6" },
      { name: "High Emission Scenario (SSP5-8.5)", value: "rcp_8.5" }
    ],
    "mid-term": [
      { name: "Low Emission Scenario (SSP1-2.6)", value: "rcp_2.6" },
      { name: "High Emission Scenario (SSP5-8.5)", value: "rcp_8.5" }
    ]
  },
  exposure: {
    "far-future": [
      { name: "High Emission Scenario (SSP5-8.5)", value: "rcp_8.5" }
    ]
  },
  default: { name: "Low Emission Scenario (SSP1-2.6)", value: "rcp_2.6" }
};

export const formSchemas = {
  hazard: {
    baseline: require("./FormSchemas/hazard/baseline.json"),
    "near-term": {
      "rcp_2.6": require("./FormSchemas/hazard/near-term/rcp-2.6.json"),
      "rcp_8.5": require("./FormSchemas/hazard/near-term/rcp-8.5.json")
    },
    "mid-term": {
      "rcp_2.6": require("./FormSchemas/hazard/mid-term/rcp-2.6.json"),
      "rcp_8.5": require("./FormSchemas/hazard/mid-term/rcp-8.5.json")
    }
  },
  exposure: {
    baseline: require("./FormSchemas/exposure/baseline.json")
  },
  vulnerability: {
    baseline: require("./FormSchemas/vulnerability/baseline.json"),
    "baseline-userinput": require("./FormSchemas/vulnerability/baseline-userinput.json")
  },
  adaptiveCapacity: {
    baseline: require("./FormSchemas/adaptive-capacity/baseline.json"),
    "baseline-userinput": require("./FormSchemas/adaptive-capacity/baseline-userinput.json")
  }
};

export const analysisIds = {
  hazard: {
    baseline: "Hazards_Baseline",
    "near-term": {
      "rcp_2.6": "Hazards_Near_Term_RCP_2.6",
      "rcp_8.5": "Hazards_Near_Term_RCP_8.5"
    },
    "mid-term": {
      "rcp_2.6": "Hazards_Mid_Term_RCP_2.6",
      "rcp_8.5": "Hazards_Mid_Term_RCP_8.5"
    }
  },
  exposure: {
    baseline: "Exposure_Baseline"
  },
  vulnerability: {
    baseline: "Vulnerability_Baseline"
  },
  adaptiveCapacity: {
    baseline: "adaptiveCapacity_Baseline"
  }
};

export const agriculturalSystems = [
  { label: "Crops", value: "crops" },
  { label: "Livestock", value: "livestock" },
  { label: "Fisheries", value: "fisheries" },
  { label: "Biodiversity", value: "biodiversity" },
  { label: "Forestry", value: "forestry" }
];
