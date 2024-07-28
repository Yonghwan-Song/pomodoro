import {
  StyledToggleSwitchButton,
  StyledToggleSwitchButtonPropsType,
} from "../styles/ToggleSwitchButton.styled";

export default function ToggleSwitchButton({
  isSwitchOn,
  unitSize,
  xAxisEdgeWidth,
  backgroundColorForSwitch,
}: StyledToggleSwitchButtonPropsType) {
  console.log("doesPomoAutoStart", isSwitchOn);
  return (
    <StyledToggleSwitchButton
      isSwitchOn={isSwitchOn}
      unitSize={unitSize}
      xAxisEdgeWidth={xAxisEdgeWidth}
      backgroundColorForSwitch={backgroundColorForSwitch}
    />
  );
}
