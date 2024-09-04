import {
  StyledLeftBox,
  StyledLeftRightBoxPropsType,
  StyledRightBox,
} from "../styles/ToggleSwitchLeftAndRightBox.styled";

export default function ToggleSwitchBackground({
  isSwitchOn,
  borderWidth,
  backgroundColorForOn,
  backgroundColorForOff,
  unitSize,
  xAxisEdgeWidth,
}: StyledLeftRightBoxPropsType) {
  // console.log("for on", backgroundColorForOn);
  return (
    <>
      <StyledLeftBox
        isSwitchOn={isSwitchOn}
        borderWidth={borderWidth}
        backgroundColorForOn={backgroundColorForOn}
        backgroundColorForOff={backgroundColorForOff}
        unitSize={unitSize}
        xAxisEdgeWidth={xAxisEdgeWidth}
      />
      <StyledRightBox
        isSwitchOn={isSwitchOn}
        borderWidth={borderWidth}
        backgroundColorForOn={backgroundColorForOn}
        backgroundColorForOff={backgroundColorForOff}
        unitSize={unitSize}
        xAxisEdgeWidth={xAxisEdgeWidth}
      />
    </>
  );
}
