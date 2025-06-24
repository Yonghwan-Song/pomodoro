import ToggleSwitchBackground from "./ToggleSwitchBackground";
import ToggleSwitchButton from "./ToggleSwitchButton";
import { StyledToggleSwitchContainer } from "../styles/ToggleSwitchContainer.styled";
import { StyledLabelForSwitch } from "../styles/ToggleSwitchLabel.styled";

type ToggleSwitchPropsType = {
  labelName: string;
  name: string;
  isSwitchOn: boolean;
  isHorizontal: boolean;
  marginBetweenLabelNameAndSwitch?: number; //optional
  unitSize?: number;
  xAxisEdgeWidth?: number;
  borderWidth?: number;
  backgroundColorForOn: string;
  backgroundColorForOff: string;
  backgroundColorForSwitch: string;
  isWithBorder?: boolean;
  onChange: React.ChangeEventHandler<HTMLInputElement>;
};

export type StyledToggleSwitchContainerPropsType = {
  unitSize?: number;
  xAxisEdgeWidth?: number;
  children?: React.ReactNode;
};

export default function ToggleSwitch({
  labelName,
  name,
  isSwitchOn,

  //label
  isHorizontal,
  marginBetweenLabelNameAndSwitch, //optional

  unitSize,
  xAxisEdgeWidth,
  borderWidth,
  backgroundColorForOn,
  backgroundColorForOff,
  backgroundColorForSwitch,
  isWithBorder = false,
  onChange,
}: ToggleSwitchPropsType) {
  return (
    <div
      style={{
        border: isWithBorder ? "1px solid black" : "none",
        borderRadius: "0.5em",
      }}
    >
      <input
        type="checkbox"
        name={name}
        id={name}
        checked={isSwitchOn}
        onChange={onChange}
        style={{
          opacity: 0,
          position: "absolute",
          left: "-9000px",
          top: "-9000px",
        }}
      />

      <StyledLabelForSwitch
        htmlFor={name}
        isHorizontal={isHorizontal}
        marginBetweenLabelNameAndSwitch={marginBetweenLabelNameAndSwitch} //TODO: check: tsx에서 optional로 하면 undeinfed 되겠지?
      >
        <p>{labelName}</p>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          {/* 이런식으로 도면 링크 걸어주기 */}
          {/* https://user-images.githubusercontent.com/72689705/277702177-d793e072-36df-49e5-983b-7cfc853888f2.gif */}
          <StyledToggleSwitchContainer
            unitSize={unitSize}
            xAxisEdgeWidth={xAxisEdgeWidth}
          >
            <ToggleSwitchBackground
              isSwitchOn={isSwitchOn}
              borderWidth={borderWidth}
              backgroundColorForOn={backgroundColorForOn}
              backgroundColorForOff={backgroundColorForOff}
              unitSize={unitSize}
              xAxisEdgeWidth={xAxisEdgeWidth}
            />
            <ToggleSwitchButton
              isSwitchOn={isSwitchOn}
              unitSize={unitSize}
              xAxisEdgeWidth={xAxisEdgeWidth}
              backgroundColorForSwitch={backgroundColorForSwitch}
            />
          </StyledToggleSwitchContainer>
        </div>
      </StyledLabelForSwitch>
    </div>
  );
}
