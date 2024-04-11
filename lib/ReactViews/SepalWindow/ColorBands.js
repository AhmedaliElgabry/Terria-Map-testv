"use strict";

const red = "#880e4f";
const green = "#388e3c";
const blue = "#1976d2"; // "#346AA6"; -- shouldn't be similar as terriajs primary color
const gray = "gray";

const rgb = [red, green, blue];
// { value: 'ocean', label: 'Ocean', color: '#00B8D9', isFixed: true },
export const opticalColorBands = [
  {
    value: ["red", "green", "blue"],
    colors: rgb
  },
  {
    value: ["nir", "red", "green"],
    colors: rgb
  },
  {
    value: ["nir", "swir1", "red"],
    colors: rgb
  },
  {
    value: ["swir2", "nir", "red"],
    colors: rgb
  },
  {
    value: ["swir2", "swir1", "red"],
    colors: rgb
  },
  {
    value: ["swir2", "nir", "green"],
    colors: rgb
  },
  {
    value: ["brightness", "greenness", "wetness"],
    colors: rgb
  }
];

export const radarColorBands = [
  {
    value: ["VV_max", "VH_min", "NDCV"],
    text: ["VV max", "VH min", "NDCV"],
    colors: rgb
  },
  {
    value: ["VV_median", "VH_median", "VV_stdDev"],
    text: ["VV med", "VH med", "VV sd"],
    colors: rgb
  },
  {
    value: ["VV_median", "VH_median", "ratio_VV_median_VH_median"],
    text: ["VV med", "VH med", "VV med / VH med"],
    colors: rgb
  },
  {
    value: ["VV_max", "VV_min", "VV_stdDev"],
    text: ["VV max", "VV min", "VV sd"],
    colors: rgb
  },
  {
    value: ["VV_min", "VH_min", "VV_stdDev"],
    text: ["VV min", "VH min", "VV sd"],
    colors: rgb
  },
  {
    value: ["VV_phase", "VV_amplitude", "VV_residuals"],
    text: ["VV phase", "amp", "residuals (HSV)"],
    colors: [gray, gray, gray]
  },
  {
    value: ["VH_phase", "VH_amplitude", "VH_residuals"],
    text: ["VH phase", "amp", "residuals (HSV)"],
    colors: [gray, gray, gray]
  }
];
