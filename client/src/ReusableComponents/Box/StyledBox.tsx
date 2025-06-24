import styled from "styled-components";

/**
 * 기본적으로 position: relative, border-radius, box-shadow, padding만 고정.
 * 나머지 스타일은 style/className으로 자유롭게 조절 가능.
 *
 * position prop으로 absolute/fixed 등도 지원 가능.
 */
export const StyledBoxSimplified = styled.div<{
  position?: "relative" | "absolute" | "fixed" | "static" | "sticky";
  inset?: boolean;
}>`
  position: ${({ position = "relative" }) => position};
  border-radius: 0.5em;
  box-shadow: ${({ inset }) =>
    inset
      ? "inset 0px 0px 10px 0px rgba(0,0,0,0.7)"
      : "0px 0px 10px 0px rgba(0,0,0,0.7)"};
  padding: 0.5em;
`;
