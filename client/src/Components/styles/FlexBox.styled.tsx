import styled, { css } from "styled-components";

type FlexBoxType = {
  gap?: string;
  flexDirection?: string;
};

export const StyledFlexBox = styled.div<FlexBoxType>`
  display: flex;
  align-items: stretch;
  gap: 2rem;
  /* ${({ gap }) =>
    gap &&
    css`
      gap: ${gap};
    `} */
  /*TODO: 이렇게 해도 되는거냐? */
  /* gap: ${({ gap }) => gap || "2rem"}; */

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
