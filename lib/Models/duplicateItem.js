"use strict";
import createCatalogMemberFromType from "./createCatalogMemberFromType";

export default function(item, id, name) {
  // Stringify then parse to ensure there is no shared references to original item properties
  const serialized = item.serializeToJson();
  // avoid circular dependency since createrCatalogItem will contain a terriajs reference
  serialized.creatorCatalogItem = null;
  serialized.sourceCatalogItem = null;

  const itemJson = JSON.parse(JSON.stringify(serialized));
  itemJson.id = id;
  itemJson.name = name;
  const newItem = createCatalogMemberFromType(item.type, item.terria);
  newItem.updateFromJson(itemJson);
  return newItem;
}
