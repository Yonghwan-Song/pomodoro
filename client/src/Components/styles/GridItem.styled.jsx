import styled, { css } from "styled-components";

export const StyledGridItem = styled.div`
  min-width: 0px;
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
