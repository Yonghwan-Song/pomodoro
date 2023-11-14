import styled, { css } from "styled-components";

export type StyledLeftRightBoxPropsType = {
  isSwitchOn: boolean;
  backgroundColorForOn: string;
  backgroundColorForOff: string;
  borderWidth?: number;
  unitSize?: number;
  xAxisEdgeWidth?: number;
};

//#region For ToggleSwitchBackground
export const StyledLeftBox = styled.div<StyledLeftRightBoxPropsType>`
  box-sizing: content-box;
  width: ${({ unitSize, xAxisEdgeWidth }) => {
    let widthExceptForEdges = unitSize ? unitSize : 100;
    let edgesFromEachSide = xAxisEdgeWidth ? xAxisEdgeWidth * 2 : 2 * 2;

    return widthExceptForEdges + edgesFromEachSide + "px";
  }};
  height: ${({ unitSize }) => (unitSize ? unitSize + "px" : "100px")};
  ${({
    isSwitchOn,
    borderWidth,
    backgroundColorForOn,
    backgroundColorForOff,
  }) => {
    if (isSwitchOn === true) {
      return css`
        border-top: ${borderWidth ? borderWidth + "px" : "2px"}
          ${backgroundColorForOn} solid;
        border-bottom: ${borderWidth ? borderWidth + "px" : "2px"}
          ${backgroundColorForOn} solid;
      `;
    }
    if (isSwitchOn === false) {
      return css`
        border-top: ${borderWidth ? borderWidth + "px" : "2px"}
          ${backgroundColorForOff} solid;
        border-bottom: ${borderWidth ? borderWidth + "px" : "2px"}
          ${backgroundColorForOff} solid;
      `;
    }
  }};
  border-top-left-radius: 50%;
  border-bottom-left-radius: 50%;
  ${({ isSwitchOn, backgroundColorForOn, backgroundColorForOff }) => {
    if (isSwitchOn === true) {
      return css`
        background-color: ${backgroundColorForOn};
      `;
    }
    if (isSwitchOn === false) {
      return css`
        background-color: ${backgroundColorForOff};
      `;
    }
  }}
  transition-property: "background-color", "border-color";
  transition-duration: 500ms;
  cursor: pointer;
`;

export const StyledRightBox = styled.div<StyledLeftRightBoxPropsType>`
  box-sizing: content-box;
  width: ${({ unitSize, xAxisEdgeWidth }) => {
    let widthExceptForEdges = unitSize ? unitSize : 100;
    let edgesFromEachSide = xAxisEdgeWidth ? xAxisEdgeWidth * 2 : 2 * 2;

    return widthExceptForEdges + edgesFromEachSide + "px";
  }};
  height: ${({ unitSize }) => (unitSize ? unitSize + "px" : "100px")};
  ${({
    isSwitchOn,
    borderWidth,
    backgroundColorForOn,
    backgroundColorForOff,
  }) => {
    if (isSwitchOn === true) {
      return css`
        border-top: ${borderWidth ? borderWidth + "px" : "2px"}
          ${backgroundColorForOn} solid;
        border-bottom: ${borderWidth ? borderWidth + "px" : "2px"}
          ${backgroundColorForOn} solid;
      `;
    }
    if (isSwitchOn === false) {
      return css`
        border-top: ${borderWidth ? borderWidth + "px" : "2px"}
          ${backgroundColorForOff} solid;
        border-bottom: ${borderWidth ? borderWidth + "px" : "2px"}
          ${backgroundColorForOff} solid;
      `;
    }
  }};
  border-top-right-radius: 50%;
  border-bottom-right-radius: 50%;
  ${({ isSwitchOn, backgroundColorForOn, backgroundColorForOff }) => {
    if (isSwitchOn === true) {
      return css`
        background-color: ${backgroundColorForOn};
      `;
    }
    if (isSwitchOn === false) {
      return css`
        background-color: ${backgroundColorForOff};
      `;
    }
  }}
  transition-property: "background-color", "border-color";
  transition-duration: 500ms;
  cursor: pointer;
`;
//#endregion
