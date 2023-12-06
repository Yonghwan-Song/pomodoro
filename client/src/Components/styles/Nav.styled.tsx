import styled from "styled-components";

export const StyledNav = styled.nav`
  position: sticky;
  display: flex;
  justify-content: space-between;
  padding: 0 2rem;
  align-items: center;
  /* min-height: 10vh; */

  /* 이렇게 해도 별반 behavior에 차이가 없음 이 앱에서는. */
  height: 10vh;
  background-color: ${({ theme }) => theme.colors.navBar};
  z-index: 999;
`;
