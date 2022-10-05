import styled from "styled-components";

export const StyledBox = styled.div`
  position: relative;
  width: ${({ width }) => width};
  box-shadow: 0px 0px 10px 0px rgba(0, 0, 0, 0.7);
  top: ${({ top }) => top};
  left: ${({ left }) => left};
`;
