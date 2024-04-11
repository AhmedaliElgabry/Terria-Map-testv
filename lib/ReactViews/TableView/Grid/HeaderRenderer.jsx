import React, { useContext } from "react";
import { FilterContext } from "./TerriaGrid";
import { useFocusRef } from "./useFocusRef";
import Styles from "./terria-grid.scss";
import Icon from "../../Icon";

const direction = {
  ASC: "ASC",
  DESC: "DESC"
};
export function HeaderRenderer({ isCellSelected, column, children, color }) {
  const context = useContext(FilterContext);

  if (!context) {
    return <div>{column?.name}</div>;
  }

  const { filters, sortColumns, setSortColumns, useColor } = context;
  const { ref, tabIndex } = useFocusRef(isCellSelected);
  const currentColumnSort = sortColumns.find(a => a.columnKey == column.key);

  const isSortedAsc =
    currentColumnSort && currentColumnSort.direction == direction.ASC;
  const isSortedDesc =
    currentColumnSort && currentColumnSort.direction == direction.DESC;

  const coloredStyle = {
    color: "#fff",
    backgroundColor: color
  };

  return (
    <div className={Styles.headerWrapper} style={useColor ? coloredStyle : {}}>
      <div
        className={Styles.header}
        title={column.name}
        onClick={() => {
          if (!currentColumnSort) {
            setSortColumns([
              {
                columnKey: column.key,
                name: column.name,
                direction: direction.ASC
              }
            ]);
            return;
          }

          if (currentColumnSort.direction == direction.ASC) {
            setSortColumns([
              {
                columnKey: column.key,
                name: column.name,
                direction: direction.DESC
              }
            ]);

            return;
          }

          setSortColumns([]);
        }}
      >
        <span className={Styles.headerTitle}>{column.name}</span>

        {isSortedAsc && (
          <Icon
            style={{ transform: "rotate(180deg)" }}
            glyph={Icon.GLYPHS.sortArrow}
          />
        )}

        {isSortedDesc && <Icon glyph={Icon.GLYPHS.sortArrow} />}

        {!isSortedAsc && !isSortedDesc && <Icon glyph={Icon.GLYPHS.sort} />}
      </div>
      <div>{children({ ref, tabIndex, filters })}</div>
    </div>
  );
}
