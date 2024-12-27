import styled from "styled-components";
import { css } from "styled-components";

// export type StyledBoxProp = {
//   fontSize?: string;
//   width?: string;
//   top?: string;
//   left?: string;
// };

// export const StyledBox = styled.div<StyledBoxProp>`
//   font-size: ${({ fontSize }) => fontSize};
//   /* font-size: ${({ fontSize }) => {
//     if
//   }}; */
//   position: relative;
//   width: ${({ width }) => width};
//   box-shadow: 0px 0px 10px 0px rgba(0, 0, 0, 0.7);
//   border-radius: 0.5em;
//   top: ${({ top }) => top};
//   left: ${({ left }) => left};
//   padding: 0.5em;
// `;

export type StyledBoxProps = {
  fontSize?: string;
  width?: string;
  top?: string;
  left?: string;
  marginTop?: string;
  marginRight?: string;
  marginBottom?: string;
  marginLeft?: string;
  maxHeight?: string;
  overflowY?: string;
  inset?: boolean;
  padding?: string;
  paddingLeft?: string;
  paddingRight?: string;
  paddingTop?: string;
  paddingBottom?: string;
  borderRadius?: string;
};

export const StyledBox = styled.div<StyledBoxProps>`
  position: relative;

  ${({ padding = "0.5em" }) =>
    css`
      padding: ${padding};
    `}
  ${({ paddingLeft = "0.5em" }) =>
    css`
      padding-left: ${paddingLeft};
    `}
  ${({ paddingRight = "0.5em" }) =>
    css`
      padding-right: ${paddingRight};
    `}
  ${({ paddingTop = "0.5em" }) =>
    css`
      padding-top: ${paddingTop};
    `}
  ${({ paddingBottom = "0.5em" }) =>
    css`
      padding-bottom: ${paddingBottom};
    `}
  ${({ borderRadius = "0.5em" }) => css`
    border-radius: ${borderRadius};
  `}

  ${({ inset }) =>
    inset
      ? css`
          box-shadow: inset 0px 0px 10px 0px rgba(0, 0, 0, 0.7);
        `
      : css`
          box-shadow: 0px 0px 10px 0px rgba(0, 0, 0, 0.7);
        `}
  ${({ fontSize }) =>
    fontSize &&
    css`
      font-size: ${fontSize};
    `}

  ${({ width }) =>
    width &&
    css`
      width: ${width};
    `}

  ${({ top }) =>
    top &&
    css`
      top: ${top};
    `}

  ${({ left }) =>
    left &&
    css`
      left: ${left};
    `}

  ${({ marginTop }) =>
    marginTop &&
    css`
      margin-top: ${marginTop};
    `}

  ${({ marginRight }) =>
    marginRight &&
    css`
      margin-right: ${marginRight};
    `}

  ${({ marginBottom }) =>
    marginBottom &&
    css`
      margin-bottom: ${marginBottom};
    `}

  ${({ marginLeft }) =>
    marginLeft &&
    css`
      margin-left: ${marginLeft};
    `}

  ${({ maxHeight }) =>
    maxHeight &&
    css`
      max-height: ${maxHeight};
    `}

  ${({ overflowY }) =>
    overflowY &&
    css`
      overflow-y: ${overflowY};
    `}
`;
