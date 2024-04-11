import React, { useState } from "react";
import Styles from "./Collapsible.scss"; // ensure to import the CSS file
import classNames from "classnames";
import Icon from "../Icon.jsx";
const Collapsible = ({ name, width, title, children }) => {
  const [isCollapsed, setIsCollapsed] = useState(true);

  const toggleCollapse = () => {
    setIsCollapsed(!isCollapsed);
  };

  return (
    <div>
      <button
        aria-label="Click to expand/collapse"
        title={title || "Click to expand/collapse"}
        className={Styles.toggleButton}
        style={{ width: width || "auto" }}
        onClick={toggleCollapse}
      >
        {name}

        <Icon
          className={classNames(Styles.arrow, {
            [Styles.arrowCollapsed]: isCollapsed,
            [Styles.arrowExpand]: !isCollapsed
          })}
          glyph={Icon.GLYPHS.closed}
        />
      </button>
      <div
        className={classNames(Styles.collapsibleContent, {
          [Styles.collapsibleContentCollapsed]: isCollapsed,
          [Styles.collapsibleContentExpanded]: !isCollapsed
        })}
      >
        {children}
      </div>
    </div>
  );
};

export default Collapsible;
