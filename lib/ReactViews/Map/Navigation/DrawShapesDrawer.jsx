import React, { useState, useEffect, useMemo, useRef } from "react";
import PropTypes from "prop-types";
import Styles from "./draw-shapes-drawer.scss";
import "./draw-shapes-drawer.scss";
import Icon from "../../Icon.jsx";
import BtnStyles from "./tool_button.scss";
import classNames from "classnames";
import IconStyles from "../../icon.scss";
import { Shapes } from "../../../Models/ShapeDrawing";

export default function DrawShapesDrawer(props) {
  const { closeDrawer, visible, startDrawing, t } = props;

  const [shape, setShape] = useState(Shapes.Polygon);

  const onStartDrawing = shape => {
    setShape(shape);
    startDrawing(shape);
    closeDrawer();
  };

  return (
    <>
      <div
        className={Styles.toolbar}
        onMouseLeave={closeDrawer}
        hidden={!visible}
      >
        <button
          type="button"
          title="Polygon"
          className={classNames(BtnStyles.btn, Styles.shapeBtn)}
          onClick={_ => onStartDrawing(Shapes.Polygon)}
        >
          <svg
            className={classNames("icon", IconStyles.svg)}
            viewBox="0 0 24 24"
            fill="none"
            stroke="#FFFFFF"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="18" cy="5" r="3" />
            <circle cx="6" cy="12" r="3" />
            <circle cx="18" cy="19" r="3" />
            <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
            <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
            <line x1="16.5" y1="6.5" x2="16.5" y2="17.5" />
          </svg>
        </button>
        <button
          type="button"
          title="Circle"
          className={classNames(BtnStyles.btn, Styles.shapeBtn)}
          onClick={_ => onStartDrawing(Shapes.Circle)}
        >
          <svg
            className={classNames("icon", IconStyles.svg)}
            viewBox="0 0 24 24"
            fill="none"
            stroke="#FFFFFF"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="10" />
          </svg>
        </button>
        <button
          type="button"
          title="Square"
          className={classNames(BtnStyles.btn, Styles.shapeBtn)}
          onClick={_ => onStartDrawing(Shapes.Square)}
        >
          <svg
            className={classNames("icon", IconStyles.svg)}
            viewBox="0 0 24 24"
            fill="none"
            stroke="#FFFFFF"
            strokeWidth="2"
            strokeLinecap="square"
            strokeLinejoin="bevel"
          >
            <rect x="3" y="3" width="18" height="18" rx="0" ry="0" />
          </svg>
        </button>
        <button
          type="button"
          title="Rectangle"
          className={classNames(BtnStyles.btn, Styles.shapeBtn)}
          onClick={_ => onStartDrawing(Shapes.Rectange)}
        >
          <svg
            className={classNames("icon", IconStyles.svg)}
            viewBox="0 0 24 24"
            fill="none"
            stroke="#FFFFFF"
            strokeWidth="2"
            strokeLinecap="square"
            strokeLinejoin="bevel"
          >
            <rect x="3" y="6" width="18" height="12" rx="0" ry="0" />
          </svg>
        </button>
        <button
          type="button"
          title="Right-angled Triangle"
          className={classNames(BtnStyles.btn, Styles.shapeBtn)}
          onClick={_ => onStartDrawing(Shapes.Triangle)}
        >
          <svg
            className={classNames("icon", IconStyles.svg)}
            viewBox="0 0 24 24"
            fill="none"
            stroke="#FFFFFF"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M 3,20 H 21 L 3.0508475,3.3898305 Z" />
          </svg>
        </button>
        <button
          type="button"
          title="Line"
          className={classNames(BtnStyles.btn, Styles.shapeBtn)}
          onClick={_ => onStartDrawing(Shapes.Line)}
        >
          <svg
            className={classNames("icon", IconStyles.svg)}
            viewBox="0 0 24 24"
            fill="none"
            stroke="#FFFFFF"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="5" y1="5" x2="19" y2="19" />
          </svg>
        </button>
        <button
          type="button"
          title="Close"
          className={classNames(
            BtnStyles.btn,
            Styles.shapeBtn,
            Styles.closeBtn
          )}
          onClick={_ => closeDrawer()}
          style={{ backgroundColor: "#999" }}
        >
          <svg
            className={classNames("icon", IconStyles.svg)}
            viewBox="0 0 24 24"
            fill="none"
            stroke="#FFFFFF"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="7" y1="7" x2="17" y2="17" />
            <line x1="17" y1="7" x2="7" y2="17" />
          </svg>
        </button>
      </div>
    </>
  );
}

// Ellipse: <ellipse cx="12" cy="12" rx="10" ry="7" />
// Line: <line x1="5" y1="5" x2="19" y2="19" />
// Octagon: <polygon points="7.86 2 16.14 2 22 7.86 22 16.14 16.14 22 7.86 22 2 16.14 2 7.86 7.86 2" />
// Hex: <path d="M12 2l9 4.9V17L12 22l-9-4.9V7z" />
// Pentagon: <path d="m 12,2 9.915254,7.7474576 -3.661017,11.0152544 c -8.8245508,0.09714 -2.480989,0.189764 -12.7118641,-0.0017 L 2.1864407,9.5423729 Z" />
