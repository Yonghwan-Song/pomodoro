import styled from "styled-components";
import { KindOfDuration } from "../../../types/clientStatesType";
import { BREAK_POINTS, PIXEL } from "../../../constants";

type DurationStyledProps = {
  durationInSeconds: number;
  backgroundColor: string;
  subject: KindOfDuration;
};

export const DurationStyled = styled.div<DurationStyledProps>`
  display: inline-block;
  height: 100%;
  background-color: ${({ backgroundColor }) => backgroundColor};
  overflow: hidden;
  border: ${({ subject }) =>
    subject === "pause" ? "0.5px solid #e25353" : ""};
  border-radius: 7px;
  position: relative;

  @media (width <= ${BREAK_POINTS.MOBILE}) {
    width: ${({ durationInSeconds }) =>
      durationInSeconds * PIXEL.PER_SEC.IN_MOBILE + "px"};
  }

  @media (${BREAK_POINTS.MOBILE} < width <= ${BREAK_POINTS.TABLET}) {
    width: ${({ durationInSeconds }) =>
      durationInSeconds * PIXEL.PER_SEC.IN_TABLET + "px"};
  }

  @media (${BREAK_POINTS.TABLET} < width <= ${BREAK_POINTS.FHD}) {
    width: ${({ durationInSeconds }) =>
      durationInSeconds * PIXEL.PER_SEC.IN_FHD + "px"};
  }

  @media (${BREAK_POINTS.FHD} < width <= ${BREAK_POINTS.QHD}) {
    width: ${({ durationInSeconds }) =>
      durationInSeconds * PIXEL.PER_SEC.IN_QHD + "px"};
  }

  @media (${BREAK_POINTS.QHD} < width <= ${BREAK_POINTS.UHD}) {
    width: ${({ durationInSeconds }) =>
      durationInSeconds * PIXEL.PER_SEC.IN_UHD + "px"};
  }
`;
