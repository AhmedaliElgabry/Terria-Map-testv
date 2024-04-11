const Resource = require("terriajs-cesium/Source/Core/Resource").default;

function loadBlob(urlOrResource) {
  var resource = Resource.createIfNeeded(urlOrResource);
  return resource.fetchBlob();
}

export function isZip(uri) {
  return /(\.zip\b)/i.test(uri);
}

module.exports = loadBlob;
