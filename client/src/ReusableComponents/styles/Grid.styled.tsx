import styled, { css } from "styled-components";
import { BREAK_POINTS } from "../../constants";

type GridType = {
  maxWidth?: string;
  minWidth?: string;
  justifyItems?: string;
  justifyContent?: string;
  alignContent?: string;
  alignItems?: string;
  placeItems?: string;
  placeContent?: string;
  column?: number;
  row?: number;
  autoColumn?: number;
  autoRow?: number;
  columnGap?: string;
  rowGap?: string;
  margin?: string;
  marginTop?: string;
  marginRight?: string;
  marginBottom?: string;
  marginLeft?: string;
  padding?: string;
};

export const StyledGrid = styled.div<GridType>`
  max-width: ${({ maxWidth }) => maxWidth || "960px"};

  ${({ minWidth }) =>
    minWidth &&
    css`
      min-width: ${minWidth};
    `}
  ${({ justifyItems }) =>
    justifyItems &&
    css`
      justify-items: ${justifyItems};
    `}
  ${({ alignItems }) =>
    alignItems &&
    css`
      align-items: ${alignItems};
    `}
  ${({ justifyContent }) =>
    justifyContent &&
    css`
      justify-content: ${justifyContent};
    `}
  ${({ alignContent }) =>
    alignContent &&
    css`
      align-content: ${alignContent};
    `}

  ${({ placeItems }) =>
    placeItems &&
    css`
      place-items: ${placeItems};
    `}
  ${({ placeContent }) =>
    placeContent &&
    css`
      place-content: ${placeContent};
    `}

  padding: ${({ padding }) => padding || "10px"};
  display: grid;

  ${({ column }) => {
    if (column) {
      return css`
        grid-template-columns: repeat(${column}, 1fr);
      `;
    } else {
      return css`
        grid-template-columns: repeat(1, 1fr);
      `;
    }
  }}
  ${({ row }) =>
    row &&
    css`
      grid-template-rows: repeat(${row}, 1fr);
    `}
  ${({ autoColumn }) =>
    autoColumn &&
    css`
      grid-auto-columns: ${autoColumn + "px"};
    `}
  ${({ autoRow }) =>
    autoRow &&
    css`
      grid-auto-rows: ${autoRow + "px"};
    `}


  ${({ columnGap }) =>
    columnGap &&
    css`
      grid-column-gap: ${columnGap};
    `};
  ${({ rowGap }) =>
    rowGap &&
    css`
      grid-row-gap: ${rowGap};
    `};

  ${({ margin }) =>
    css`
      margin: ${margin};
    `}
  ${({ marginTop }) =>
    css`
      margin-top: ${marginTop};
    `}
  ${({ marginRight }) =>
    css`
      margin-right: ${marginRight};
    `}
  ${({ marginBottom }) =>
    css`
      margin-bottom: ${marginBottom};
    `}
  ${({ marginLeft }) =>
    css`
      margin-left: ${marginLeft};
    `}

  @media (width<= ${BREAK_POINTS.MOBILE}) {
    grid-template-columns: 1fr;
    // 1 column이니까 column gap은 소용 없고 row gap만 의미가 있다.
    // TODO: 1. gap을 다 row-gap column-gap으로 바꾸고  2. 여기서 column-gap을 없애.
    ${({ columnGap }) =>
      columnGap &&
      css`
        grid-column-gap: 0px;
      `}

    // 이유: SAVE button이 1에서 start 3에서 end인데, 이게 column이 하나가 되는 것을 막았다.
    // 이게 최선의 방법인지는 잘 모르겠음... 뭔가 좀 이상해. :::...
    > * {
      grid-column-start: 1;
      grid-column-end: 2;
    }
  }
`;
