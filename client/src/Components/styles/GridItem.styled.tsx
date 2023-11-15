import styled, { css } from "styled-components";

type GridItemType = {
  textAlign?: string;
  backgroundColor?: string; // e.g. background-color: #74992e;
  columnStart?: number;
  columnEnd?: number;
  rowStart?: number;
  rowEnd?: number;
  minWidth?: number;
  minHeight?: number;
};

export const StyledGridItem = styled.div<GridItemType>`
  /* align-self: center;
  justify-self: center; */
  min-width: ${({ minWidth }) => {
    if (minWidth !== undefined) {
      if (minWidth >= 0) {
        return minWidth + "px";
      }
    } else {
      return "0px";
    }
  }};

  min-height: ${({ minHeight }) => {
    if (minHeight !== undefined) {
      if (minHeight >= 0) {
        return minHeight + "px";
      }
    } else {
      return "0px";
    }
  }};

  text-align: ${({ textAlign }) => textAlign};
  background-color: ${({ backgroundColor }) => backgroundColor};
  ${({ columnStart }) =>
    columnStart &&
    css`
      grid-column-start: ${columnStart};
    `}

  ${({ columnEnd }) =>
    columnEnd &&
    css`
      grid-column-end: ${columnEnd};
    `}

    ${({ rowStart }) =>
    rowStart &&
    css`
      grid-row-start: ${rowStart};
    `}

  ${({ rowEnd }) =>
    rowEnd &&
    css`
      grid-row-end: ${rowEnd};
    `}
`;
