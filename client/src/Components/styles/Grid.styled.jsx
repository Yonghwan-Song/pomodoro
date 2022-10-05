import styled, { css } from "styled-components";

export const StyledGrid = styled.div`
  max-width: 960px;
  margin: 100px auto;
  padding: 10px;
  display: grid;
  ${({ column }) =>
    column &&
    css`
      grid-template-columns: repeat(${column}, 1fr);
    `}

  gap: 10px;
  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;
