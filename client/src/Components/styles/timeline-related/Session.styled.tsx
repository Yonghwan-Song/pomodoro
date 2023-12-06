import styled from "styled-components";
import { PIXEL } from "../../../constants/index";
import { BREAK_POINTS } from "../../../constants/index";

type SessionStyledProps = {
  // This indicates the amount of seconds passed until this session starts since today.
  seconds: number;
};

export const SessionStyled = styled.div<SessionStyledProps>`
  display: inline-block;
  position: absolute;
  height: 60px;
  top: 10px;

  @media (width <= ${BREAK_POINTS.MOBILE}) {
    left: ${({ seconds }) => seconds * PIXEL.PER_SEC.IN_MOBILE + "px"};
  }

  @media (${BREAK_POINTS.MOBILE} < width <= ${BREAK_POINTS.TABLET}) {
    left: ${({ seconds }) => seconds * PIXEL.PER_SEC.IN_TABLET + "px"};
  }

  @media (${BREAK_POINTS.TABLET} < width <= ${BREAK_POINTS.FHD}) {
    left: ${({ seconds }) => seconds * PIXEL.PER_SEC.IN_FHD + "px"};
  }

  @media (${BREAK_POINTS.FHD} < width <= ${BREAK_POINTS.QHD}) {
    left: ${({ seconds }) => seconds * PIXEL.PER_SEC.IN_QHD + "px"};
  }

  @media (${BREAK_POINTS.QHD} < width <= ${BREAK_POINTS.UHD}) {
    left: ${({ seconds }) => seconds * PIXEL.PER_SEC.IN_UHD + "px"};
  }
`;
