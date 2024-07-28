import styled, { css } from "styled-components";
import { MINIMUMS, VH_RATIO } from "../../../constants";

type StyledTimelineProps = {
  dynamicLeftAndRight:
    | { left: number; right: null }
    | { left: null; right: number };
  fullWidthOfTimeline: number;
  backgroundColor?: string;
};

export const StyledTimeline = styled.div<StyledTimelineProps>`
  position: absolute;

  ${({ dynamicLeftAndRight }) => {
    if (dynamicLeftAndRight.right === null) {
      return css`
        left: ${dynamicLeftAndRight.left + "px"};
      `;
    } else if (dynamicLeftAndRight.left === null) {
      return css`
        right: ${dynamicLeftAndRight.right + "px"};
      `;
    }
  }}

  top: max(${MINIMUMS.NAV_BAR}px, ${VH_RATIO.NAV_BAR}vh);
  height: 80px;
  width: ${({ fullWidthOfTimeline }) => fullWidthOfTimeline + "px"};
  background-color: ${({ backgroundColor }) => backgroundColor || "#c6d1e6"};
`;
