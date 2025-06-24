import styled from "styled-components";
import { MINIMUMS, VH_RATIO } from "../../constants";

export const StyledNav = styled.nav`
  position: sticky;
  display: flex;
  justify-content: space-between;
  flex-wrap: wrap;
  min-width: 0px;
  padding: 0 2rem;
  align-items: center;
  /* height: ${VH_RATIO.NAV_BAR}vh; */
  height: max(${MINIMUMS.NAV_BAR}px, ${VH_RATIO.NAV_BAR}vh);
  background-color: ${({ theme }) => theme.colors.navBar};
  z-index: 999;
`;
