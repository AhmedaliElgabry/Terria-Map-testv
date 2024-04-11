const { default: axios } = require("axios");

/**
 * Remove a user added data item or group
 * @param {terria}
 * @param {target} the target to remove
 */
var removeUserDataFromPersistentStore = function(terria, group, target) {
  const groupIndex = terria.catalog.userAddedDataGroup.items.indexOf(group);
  const itemIndex = terria.catalog.userAddedDataGroup.items[
    groupIndex
  ].items.indexOf(target);
  if (itemIndex >= 0) {
    // remove from firebase
    axios
      .delete("/private/areas", {
        data: { id: target.id }
      })
      .then(response => {
        terria.catalog.userAddedDataGroup.items[groupIndex].items.splice(
          itemIndex,
          1
        );
      })
      .catch(error => {
        console.log(error);
      });
  }
};

module.exports = removeUserDataFromPersistentStore;
