import styled from "styled-components";
import { MINIMUMS, VH_RATIO } from "../../constants";

export type StyledUnorderedListProps = {
  liOpacity: boolean;
  isSideBarActive: boolean;
};

export const StyledUnorderedList = styled.ul<StyledUnorderedListProps>`
  // flex
  display: flex;
  justify-content: space-between;
  align-items: center;

  // position
  z-index: 999;

  // size
  width: 40%;

  // style
  list-style: none;

  @media (max-width: ${({ theme }) => theme.tablet}) {
    // size
    width: 45%;
  }

  @media (max-width: ${({ theme }) => theme.mobile}) {
    // flex
    flex-direction: column;
    justify-content: space-around;
    align-items: center;

    // position
    position: absolute;
    right: 0px;
    top: max(${MINIMUMS.NAV_BAR}px, ${VH_RATIO.NAV_BAR}vh);
    height: 90vh;

    // size
    width: 50%;

    // color
    background-color: ${({ theme }) => theme.colors.navBar};

    li {
      opacity: ${({ liOpacity }) => (liOpacity ? 0 : 1)};
    }

    transform: ${({ isSideBarActive }) =>
      isSideBarActive ? "translateX(0%)" : "translateX(100%)"};
    transition: ${({ isSideBarActive }) =>
      isSideBarActive ? "transform 0.3s ease-in" : ""};
  }
`;
