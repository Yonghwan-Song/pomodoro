import styled from "styled-components";

type StyledToggleSwitchContainerPropsType = {
  unitSize?: number;
  xAxisEdgeWidth?: number;
};

export const StyledToggleSwitchContainer = styled.div<StyledToggleSwitchContainerPropsType>`
  display: flex;
  align-items: center;
  position: relative;
  width: ${({ unitSize, xAxisEdgeWidth }) => {
    let widthExceptForEdges = unitSize ? unitSize * 2 : 200;
    let edgesFromEachSide = xAxisEdgeWidth ? xAxisEdgeWidth * 2 : 2 * 2;

    return widthExceptForEdges + edgesFromEachSide + "px";
  }};
  height: ${({ unitSize }) => (unitSize ? unitSize + "px" : "100px")};
`;
