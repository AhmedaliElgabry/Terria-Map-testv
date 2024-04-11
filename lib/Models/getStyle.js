var defined = require("terriajs-cesium/Source/Core/defined").default;

function getStyle(wmsItem) {
  const thisLayer = wmsItem._thisLayerInRawMetadata;
  if (!defined(thisLayer)) {
    console.log("cannot find current layer");
    return undefined;
  }

  var style;
  const availStyles = wmsItem.availableStyles[thisLayer.Name];
  if (availStyles.length >= 2) {
    const layers = wmsItem.layers.split(",");
    const layerIndex = layers.indexOf(thisLayer.Name);
    if (layerIndex === -1) {
      // Not a valid layer?  Something went wrong.
      console.log("cannot find layer index");
      return undefined;
    }

    const styles = wmsItem.styles.split(",");
    style = styles[layerIndex];

    var styleFound = false;
    for (var i = 0; i < availStyles.length; i++) {
      if (availStyles[i].name === style) {
        styleFound = true;
        break;
      }
    }

    if (!styleFound) {
      style = availStyles[0].name;
    }
  }

  return style;
}

module.exports = getStyle;
