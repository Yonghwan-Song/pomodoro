import styled, { css } from "styled-components";

type FlexBoxType = {
  gap?: string;
  columnGap?: string;
  rowGap?: string;
  flexDirection?: string;
  justifyContent?: string;
  alignItems?: string;
  flexWrap?: string;
  flexBasis?: string;
  cursor?: string;
};

export const StyledFlexBox = styled.div<FlexBoxType>`
  display: flex;

  ${({ cursor }) =>
    cursor &&
    css`
      cursor: ${cursor};
    `}

  ${({ gap }) =>
    gap &&
    css`
      gap: ${gap};
    `}
  ${({ columnGap }) =>
    columnGap &&
    css`
      column-gap: ${columnGap};
    `}
  ${({ rowGap }) =>
    rowGap &&
    css`
      row-gap: ${rowGap};
    `}
  align-items: stretch;
  ${({ alignItems }) =>
    alignItems &&
    css`
      align-items: ${alignItems};
    `}
  ${({ flexDirection }) =>
    flexDirection &&
    css`
      flex-direction: ${flexDirection};
    `}
  ${({ justifyContent }) =>
    justifyContent &&
    css`
      justify-content: ${justifyContent};
    `}
  ${({ flexWrap }) =>
    flexWrap &&
    css`
      flex-wrap: ${flexWrap};
    `}
  & > * {
    flex-basis: ${({ flexBasis }) => flexBasis || "auto"};
    text-align: center;
  }
`;
