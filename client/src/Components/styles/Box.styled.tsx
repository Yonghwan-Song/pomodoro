import styled from "styled-components";

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
};

export const StyledBox = styled.div<StyledBoxProps>`
  position: relative;
  box-shadow: 0px 0px 10px 0px rgba(0, 0, 0, 0.7);
  border-radius: 0.5em;
  padding: 0.5em;
  ${({ fontSize }) => (fontSize ? `font-size: ${fontSize}` : "")}
  ${({ width }) => (width ? `width: ${width}` : "")}
  ${({ top }) => (top ? `top: ${top}` : "")}
  ${({ left }) => (left ? `left: ${left}` : "")}
`;
