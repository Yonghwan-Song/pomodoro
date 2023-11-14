import styled, { css } from "styled-components";

export type StyledToggleSwitchButtonPropsType = {
  backgroundColorForSwitch: string;
  isSwitchOn: boolean;
  unitSize?: number;
  xAxisEdgeWidth?: number;
};

export const StyledToggleSwitchButton = styled.div<StyledToggleSwitchButtonPropsType>`
  position: absolute;
  ${({ isSwitchOn, unitSize, xAxisEdgeWidth }) => {
    let edgeWidth = xAxisEdgeWidth || 2;
    let distanceToMove = unitSize || 100;
    if (isSwitchOn === true) {
      return css`
        left: ${distanceToMove + edgeWidth + "px"};
      `;
    } else {
      return css`
        left: ${edgeWidth + "px"};
      `;
    }
  }};

  transition-property: left;
  transition-duration: 500ms;
  /* transition-timing-function: ease; */

  width: ${({ unitSize }) => (unitSize ? unitSize + "px" : "100px")};
  height: ${({ unitSize }) => (unitSize ? unitSize + "px" : "100px")};

  cursor: pointer;
  border-radius: 100%;
  background-color: ${({ backgroundColorForSwitch }) =>
    backgroundColorForSwitch};
`;
