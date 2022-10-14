import styled from "styled-components";

export const StyledBox = styled.div`
  font-size: ${({ fontSize }) => fontSize};
  position: relative;
  width: ${({ width }) => width};
  box-shadow: 0px 0px 10px 0px rgba(0, 0, 0, 0.7);
  border-radius: 0.5em;
  top: ${({ top }) => top};
  left: ${({ left }) => left};
  padding: 0.5em;
`;
