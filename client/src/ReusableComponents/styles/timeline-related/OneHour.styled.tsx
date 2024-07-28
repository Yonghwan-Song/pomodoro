import styled from "styled-components";
import { BREAK_POINTS, MINIMUMS, PIXEL, VH_RATIO } from "../../../constants";

type StyledOneHourProps = {
  base: number;
  borderColor: string;
};

export const StyledOneHour = styled.div<StyledOneHourProps>`
  position: absolute;
  height: max(${MINIMUMS.TIMELINE}px, ${VH_RATIO.TIMELINE}vh);
  width: ${PIXEL.PER_HR.IN_FHD + "px"};
  top: 0px;
  border-left: 1px solid ${({ borderColor }) => borderColor};

  @media (width <= ${BREAK_POINTS.MOBILE}) {
    left: ${({ base }) => base * PIXEL.PER_HR.IN_MOBILE + "px"};
  }

  @media (${BREAK_POINTS.MOBILE}<width <= ${BREAK_POINTS.TABLET}) {
    left: ${({ base }) => base * PIXEL.PER_HR.IN_TABLET + "px"};
  }

  @media (${BREAK_POINTS.TABLET}<width <= ${BREAK_POINTS.FHD}) {
    left: ${({ base }) => base * PIXEL.PER_HR.IN_FHD + "px"};
  }

  @media (${BREAK_POINTS.FHD}<width <= ${BREAK_POINTS.QHD}) {
    left: ${({ base }) => base * PIXEL.PER_HR.IN_QHD + "px"};
  }

  @media (${BREAK_POINTS.QHD}<width <= ${BREAK_POINTS.UHD}) {
    left: ${({ base }) => base * PIXEL.PER_HR.IN_UHD + "px"};
  }
`;
