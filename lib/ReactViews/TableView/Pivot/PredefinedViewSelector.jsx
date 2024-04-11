import React, { useState, useEffect } from "react";
import PropTypes from "prop-types";

function PredefinedViewSelector({ currentView, predefinedViews, onChange }) {
  const [selected, setSelected] = useState(0);

  return (
    <div
      style={{
        display: "flex",
        gap: "10px",
        width: "100%",
        overflowX: "auto"
      }}
    >
      {predefinedViews.map((item, index) => (
        <AnimatedButton
          key={index}
          predefinedView={item}
          specialHighlight={index == predefinedViews.length - 1}
          isSelected={item === currentView}
          onClick={() => {
            setSelected(index);
            onChange(item);
          }}
        />
      ))}
    </div>
  );
}

function AnimatedButton({
  predefinedView,
  isSelected,
  onClick,
  specialHighlight
}) {
  const [opacity, setOpacity] = useState(0);
  const [transform, setTransform] = useState(-200);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setOpacity(1);
      setTransform(0);
    }, 0);

    return () => clearTimeout(timeoutId);
  }, []);

  return (
    <button
      style={{
        opacity,
        transform: `translateX(${transform}px)`,
        transition: "opacity 0.5s, transform 0.5s, all 250ms",
        fontWeight: isSelected ? "bold" : "normal",
        fontSize: isSelected ? "14px" : "12px",
        backgroundColor: isSelected ? "#346aa6" : "white",
        color: isSelected ? "#fff" : specialHighlight ? "#346aa6" : "#333",
        padding: "5px 10px",
        border: specialHighlight ? "solid 1px #346aa6" : "solid 1px gray",
        borderRadius: "4px",
        cursor: "pointer",
        whiteSpace: "nowrap"
      }}
      onClick={onClick}
    >
      {predefinedView.name}
    </button>
  );
}

PredefinedViewSelector.propTypes = {
  currentView: PropTypes.object.isRequired,
  predefinedViews: PropTypes.array.isRequired,
  onChange: PropTypes.func.isRequired
};

AnimatedButton.propTypes = {
  predefinedView: PropTypes.object.isRequired,
  isSelected: PropTypes.bool.isRequired,
  onClick: PropTypes.func.isRequired,
  specialHighlight: PropTypes.bool.isRequired
};

export default PredefinedViewSelector;
