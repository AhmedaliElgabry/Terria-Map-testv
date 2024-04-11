"use strict";
import knockout from "terriajs-cesium/Source/ThirdParty/knockout-3.5.1";
import Commands from "./TerriaAction";

class ActionManager {
  constructor() {
    this.ActionObservables = {};

    for (const action in Commands) {
      this.ActionObservables[action] = knockout
        .observable(action)
        .extend({ notify: "always" });
    }
  }

  static getInstance() {
    if (!this.instance) {
      this.instance = new ActionManager();
    }

    return this.instance;
  }

  on(action, func) {
    if (!this.ActionObservables.hasOwnProperty(action)) {
      throw new Error("Unknown action", action);
    }

    if (typeof func != "function") {
      throw new Error(
        `Action subscription failed. Expecting function, got ${typeof subs}`
      );
    }

    this.ActionObservables[action].subscribe(params => func(params));

    return this;
  }

  dispatch(action, ...params) {
    if (!this.ActionObservables.hasOwnProperty(action)) {
      throw new Error("Unknown action", action, params);
    }

    this.ActionObservables[action](params);
  }
}

const mgr = ActionManager.getInstance();

export default mgr;
