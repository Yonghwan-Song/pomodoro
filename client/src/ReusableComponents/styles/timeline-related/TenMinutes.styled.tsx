import styled from "styled-components";
import { BREAK_POINTS, PIXEL } from "../../../constants";

type StyledTenMinutesProps = {
  n: number;
  colorOptions: {
    opt_1: string;
    opt_2: string;
    opt_3: string;
    opt_4: string;
    opt_5: string;
  };
};

export const StyledTenMinutes = styled.div<StyledTenMinutesProps>`
  position: absolute;
  top: 0px;
  border: 1.5px solid ${({ n, colorOptions: color }) => n === 3 && color.opt_3};
  border-radius: 20%;
  background-color: ${({ n, colorOptions: color }) =>
    n === 3 ? color.opt_2 : color.opt_3};

  translate: -50% -95%;
  rotate: -45deg;
  z-index: 1;

  @media (width <= ${BREAK_POINTS.MOBILE}) {
    left: ${({ n }) => n * PIXEL.PER_MIN.IN_MOBILE * 10 + "px"};
    height: ${({ n }) => (n !== 3 ? 2 * 7 + "px" : 3 * 7 + "px")};
    width: ${({ n }) => (n !== 3 ? 2 * 7 + "px" : 3 * 7 + "px")};
    /* height: ${({ n }) => (n !== 3 ? 2 * 7.5 + "px" : 3 * 7.5 + "px")};
    width: ${({ n }) => (n !== 3 ? 2 * 7.5 + "px" : 3 * 7.5 + "px")}; */
    height: ${({ n }) => (n !== 3 ? 2 * 7 + "px" : 3 * 7 + "px")};
    width: ${({ n }) => (n !== 3 ? 2 * 7 + "px" : 3 * 7 + "px")};
    /* height: ${({ n }) => (n !== 3 ? 2 * 8 + "px" : 3 * 8 + "px")};
    width: ${({ n }) => (n !== 3 ? 2 * 8 + "px" : 3 * 8 + "px")}; */
  }

  // 30 min indicator is 3/2 bigger than 10, 20, 40, 50.
  // 8 -> 10 -> 12 -> 14 : hard coded
  @media (${BREAK_POINTS.MOBILE} < width <= ${BREAK_POINTS.TABLET}) {
    left: ${({ n }) => n * PIXEL.PER_MIN.IN_TABLET * 10 + "px"};
    height: ${({ n }) => (n !== 3 ? 2 * 8 + "px" : 3 * 8 + "px")};
    width: ${({ n }) => (n !== 3 ? 2 * 8 + "px" : 3 * 8 + "px")};
  }

  @media (${BREAK_POINTS.TABLET} < width <= ${BREAK_POINTS.FHD}) {
    left: ${({ n }) => n * PIXEL.PER_MIN.IN_FHD * 10 + "px"};
    height: ${({ n }) => (n !== 3 ? 2 * 10 + "px" : 3 * 10 + "px")};
    width: ${({ n }) => (n !== 3 ? 2 * 10 + "px" : 3 * 10 + "px")};
  }

  @media (${BREAK_POINTS.FHD} < width <= ${BREAK_POINTS.QHD}) {
    left: ${({ n }) => n * PIXEL.PER_MIN.IN_QHD * 10 + "px"};
    height: ${({ n }) => (n !== 3 ? 2 * 12 + "px" : 3 * 12 + "px")};
    width: ${({ n }) => (n !== 3 ? 2 * 12 + "px" : 3 * 12 + "px")};
  }

  @media (${BREAK_POINTS.QHD} < width <= ${BREAK_POINTS.UHD}) {
    left: ${({ n }) => n * PIXEL.PER_MIN.IN_UHD * 10 + "px"};
    height: ${({ n }) => (n !== 3 ? 2 * 14 + "px" : 3 * 14 + "px")};
    width: ${({ n }) => (n !== 3 ? 2 * 14 + "px" : 3 * 14 + "px")};
  }
`;
