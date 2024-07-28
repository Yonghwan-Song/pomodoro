import styled from "styled-components";

export type StyledLoadingMessageProps = {
  fontSize?: string;
  top?: string;
};

export const StyledLoadingMessage = styled.h3<StyledLoadingMessageProps>`
  position: absolute;
  margin: auto;
  left: 50%;
  transform: translate(-50%, -50%);
  ${({ top }) => `top: ${top || "30%"}`}
`;
