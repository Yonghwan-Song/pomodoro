import styled from "styled-components";

export const StyledNav = styled.nav`
  position: sticky;
  display: flex;
  justify-content: space-between;
  padding: 0 2rem;
  align-items: center;
  min-height: 10vh;
  background-color: ${({ theme }) => theme.colors.navBar};
  z-index: 999;
`;
