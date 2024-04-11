"use strict";
export function listToTree(list) {
  let map = {};
  for (let a = 0; a < list.length; a += 1) {
    map[list[a].value] = { ...list[a] };
  }

  let roots = [];
  for (let i = 0; i < list.length; i += 1) {
    let node = map[list[i].value]; // find current node
    if (list[i].childrenId) {
      // if there are children
      list[i].childrenId.forEach(childId => {
        let childNode = map[childId];
        if (childNode) {
          node.children.push(childNode);
        }
      });
    }

    // Check if the node is a root
    let isRoot = true;
    for (let j = 0; j < list.length; j += 1) {
      if ((list[j].childrenId || []).includes(node.value)) {
        isRoot = false;
        break;
      }
    }
    if (isRoot) {
      roots.push(node);
    }
  }

  return roots;
}
