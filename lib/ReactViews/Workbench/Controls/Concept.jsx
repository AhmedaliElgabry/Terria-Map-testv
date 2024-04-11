"use strict";

import classNames from "classnames";
import Icon from "../../Icon";
import ObserveModelMixin from "../../ObserveModelMixin";
import React from "react";
import createReactClass from "create-react-class";
import PropTypes from "prop-types";
import Styles from "./concept-viewer.scss";
import VisualizationType from "../../../Models/VisualizationType";
import knockout from "terriajs-cesium/Source/ThirdParty/knockout-3.5.1";

const Concept = createReactClass({
  displayName: "Concept",
  mixins: [ObserveModelMixin],

  propTypes: {
    concept: PropTypes.object.isRequired,
    hideName: PropTypes.bool,
    isLoading: PropTypes.bool,
    terria: PropTypes.object
  },

  getInitialState() {
    return {
      displayDescription: false,
      viewType: this.props.terria.viewType
    };
  },
  componentDidMount() {
    this._viewTypeObservable = knockout
      .getObservable(this.props.terria, "viewType")
      .subscribe(a => {
        this.setState({
          viewType: this.props.terria.viewType
        });
      });
  },
  componentWillUnmount() {
    if (this._viewTypeObservable) {
      this._viewTypeObservable.dispose();
      this._viewTypeObservable = null;
    }
  },
  toggleOpen() {
    this.props.concept.toggleOpen();
  },

  toggleActive() {
    if (!this.props.isLoading) {
      if (this.state.viewType != VisualizationType.TABLE) {
        this.props.concept.toggleActive();
      } else {
        this.props.concept.toggleActiveTabular();
      }
    }
  },

  getColorStyle() {
    if (this.props.concept.color) {
      return { color: this.props.concept.color };
    }
  },

  getFillStyle() {
    if (this.props.concept.color) {
      return { fill: this.props.concept.color };
    }
  },
  toggleDisplayTooltips() {
    this.setState({ displayDescription: !this.state.displayDescription });
  },
  render() {
    const concept = this.props.concept;
    const allowMultiple = concept.parent && concept.parent.allowMultiple;
    const classes = classNames(Styles.header, {
      [Styles.hasChildren]: concept.hasChildren,
      [Styles.isSelectable]: concept.isSelectable,
      [Styles.isLoading]: this.props.isLoading,
      [Styles.unSelectable]:
        concept.parent &&
        concept.parent.requireSomeActive &&
        isOnlyActiveSibling(concept)
    });
    // Renders the concept as a standard list of radio buttons or checkboxes (ie. not as an additive-condition).
    return (
      <li style={this.getColorStyle()}>
        <If condition={!this.props.hideName && concept.name}>
          <div className={classes}>
            <div className={Styles.btnGroup}>
              <If condition={concept.hasChildren}>
                <button
                  type="button"
                  onClick={this.toggleOpen}
                  style={this.getColorStyle()}
                  className={Styles.btnToggleOpen}
                  title="open variable selection"
                >
                  {concept.isOpen ? (
                    <Icon glyph={Icon.GLYPHS.showLess} />
                  ) : (
                    <Icon glyph={Icon.GLYPHS.showMore} />
                  )}
                </button>
              </If>
              <If
                condition={
                  concept.isSelectable &&
                  this.state.viewType != VisualizationType.TABLE
                }
              >
                <button
                  type="button"
                  onClick={this.toggleActive}
                  style={this.getColorStyle()}
                  className={Styles.btnToggleActive}
                  title="select variable"
                >
                  {concept.isActive && allowMultiple && (
                    <Icon
                      style={this.getFillStyle()}
                      glyph={Icon.GLYPHS.checkboxOn}
                    />
                  )}
                  {!concept.isActive && allowMultiple && (
                    <Icon
                      style={this.getFillStyle()}
                      glyph={Icon.GLYPHS.checkboxOff}
                    />
                  )}
                  {concept.isActive && !allowMultiple && (
                    <Icon
                      style={this.getFillStyle()}
                      glyph={Icon.GLYPHS.radioOn}
                    />
                  )}
                  {!concept.isActive && !allowMultiple && (
                    <Icon
                      style={this.getFillStyle()}
                      glyph={Icon.GLYPHS.radioOff}
                    />
                  )}
                </button>
              </If>

              <If
                condition={
                  concept.isSelectable &&
                  this.state.viewType == VisualizationType.TABLE
                }
              >
                <button
                  type="button"
                  onClick={this.toggleActive}
                  style={this.getColorStyle()}
                  className={Styles.btnToggleActive}
                  title="select variable"
                >
                  {concept.isActiveOnTableView && (
                    <Icon
                      style={this.getFillStyle()}
                      glyph={Icon.GLYPHS.checkboxOn}
                    />
                  )}
                  {!concept.isActiveOnTableView && (
                    <Icon
                      style={this.getFillStyle()}
                      glyph={Icon.GLYPHS.checkboxOff}
                    />
                  )}
                </button>
              </If>
            </div>
            <span title={concept.description}>{concept.name}</span>

            {concept.description && (
              <button
                type="button"
                className={Styles.btnToggleDescription}
                onClick={this.toggleDisplayTooltips}
              >
                {this.state.displayDescription ? (
                  <Icon glyph={Icon.GLYPHS.opened} />
                ) : (
                  <Icon glyph={Icon.GLYPHS.closed} />
                )}
              </button>
            )}

            <If
              condition={concept.description && this.state.displayDescription}
            >
              <p className={Styles.conceptDescription}>{concept.description}</p>
            </If>
          </div>
        </If>
        <If condition={concept.isOpen}>
          <ul className={Styles.items}>
            <If condition={this.state.viewType != VisualizationType.TABLE}>
              <For
                each="child"
                index="i"
                of={concept.items.filter(concept => concept.isVisible)}
              >
                <Concept
                  key={i}
                  concept={child}
                  allowMultiple={concept.allowMultiple}
                  isLoading={this.props.isLoading}
                  terria={this.props.terria}
                />
              </For>
            </If>

            <If condition={this.state.viewType == VisualizationType.TABLE}>
              <For
                each="child"
                index="i"
                of={concept.items.filter(
                  concept => concept.isVisibleOnTableView
                )}
              >
                <Concept
                  key={i}
                  concept={child}
                  allowMultiple={concept.allowMultiple}
                  isLoading={this.props.isLoading}
                  terria={this.props.terria}
                />
              </For>
            </If>
          </ul>
        </If>
      </li>
    );
  }
});

/**
 * @param  {Concept} concept A concept.
 * @return {Boolean} Is this the only active child of its parent?
 * @private
 */
function isOnlyActiveSibling(concept) {
  return concept.parent.items.every(child =>
    child === concept ? child.isActive : !child.isActive
  );
}

module.exports = Concept;
