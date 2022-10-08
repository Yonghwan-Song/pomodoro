import styled, { css } from "styled-components";

export const StyledFlexBox = styled.div`
  display: flex;
  align-items: stretch;
  gap: 2rem;
  /* ${({ gap }) =>
    gap &&
    css`
      gap: ${gap};
    `} */
  ${({ flexDirection }) =>
    flexDirection &&
    css`
      flex-direction: ${flexDirection};
    `}

  & > * {
    /* flex: 1; */
    flex-basis: 100%;
    text-align: center;
  }
`;
