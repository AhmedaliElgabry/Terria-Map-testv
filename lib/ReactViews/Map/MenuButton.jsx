import React from "react";
import Icon from "../Icon.jsx";
import PropTypes from "prop-types";
import Styles from "./menu-button.scss";

/**
 * Basic button for use in the menu part at the top of the map.
 *
 * @constructor
 */
function MenuButton(props) {
  return (
    <div>
      <Choose>
        <When condition={props.onClick}>
          <button
            id={props.id}
            onClick={props.onClick}
            className={Styles.btnAboutLink}
          >
            {props.icon && <Icon glyph={props.icon} />}
            {props.caption}
          </button>
        </When>
        <Otherwise>
          <a
            id={props.id}
            className={Styles.btnAboutLink}
            href={props.href}
            target={props.href !== "#" ? "_blank" : undefined}
            title={props.caption}
          >
            {props.href !== "#" && <Icon glyph={Icon.GLYPHS.externalLink} />}
            <span>{props.caption}</span>
          </a>
        </Otherwise>
      </Choose>
    </div>
  );
}

MenuButton.defaultProps = {
  href: "#"
};

MenuButton.propTypes = {
  href: PropTypes.string,
  caption: PropTypes.string.isRequired,
  icon: PropTypes.object
};

export default MenuButton;
