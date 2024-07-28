import styled from "styled-components";
import { BREAK_POINTS, PIXEL } from "../../../constants";

type StyledNumberForTimeProps = {
  base: number;
};

export const StyledNumberForTime = styled.p<StyledNumberForTimeProps>`
  position: absolute;
  top: 0px;
  transform: translateY(calc(-100% - 2px));

  color: #d9d8e2;
  z-index: 1000;

  @media (width <= ${BREAK_POINTS.MOBILE}) {
    left: ${({ base }) => base * PIXEL.PER_HR.IN_MOBILE + "px"};
    font-size: 0.8rem;
  }

  @media (${BREAK_POINTS.MOBILE} < width <= ${BREAK_POINTS.TABLET}) {
    left: ${({ base }) => base * PIXEL.PER_HR.IN_TABLET + "px"};
    font-size: 1rem;
  }

  @media (${BREAK_POINTS.TABLET}<width <= ${BREAK_POINTS.FHD}) {
    left: ${({ base }) => base * PIXEL.PER_HR.IN_FHD + "px"};
    font-size: 1rem;
  }

  @media (${BREAK_POINTS.FHD}<width <= ${BREAK_POINTS.QHD}) {
    left: ${({ base }) => base * PIXEL.PER_HR.IN_QHD + "px"};
    font-size: 1.5rem;
  }

  @media (${BREAK_POINTS.QHD}<width <= ${BREAK_POINTS.UHD}) {
    left: ${({ base }) => base * PIXEL.PER_HR.IN_UHD + "px"};
    font-size: 2rem;
  }
`;
