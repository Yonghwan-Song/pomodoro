import styled, { css } from "styled-components";

type GridType = {
  maxWidth?: string;
  justifyItems?: string;
  column?: number;
  gap?: string;
};

export const StyledGrid = styled.div<GridType>`
  max-width: ${({ maxWidth }) => maxWidth || "960px"};

  justify-items: ${({ justifyItems }) => justifyItems};
  margin: 100px auto;
  padding: 10px;
  display: grid;

  ${({ column }) =>
    column &&
    css`
      grid-template-columns: repeat(${column}, 1fr);
    `}

  gap: ${({ gap }) => gap || "10px"};

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;
