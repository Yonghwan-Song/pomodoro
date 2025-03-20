import { Button } from "../../ReusableComponents/Buttons/Button";
import ToggleSwitch from "../../ReusableComponents/ToggleSwitch/ToggleSwitch";
import { BoxShadowWrapper } from "../../ReusableComponents/Wrapper";

type AutoStartSettingsUIProps = {
  handleSubmitToChangeAutoStartSettings: (
    ev: React.FormEvent<HTMLFormElement>
  ) => void;
  doesPomoStartAutomatically: boolean;
  setDoesPomoStartAutomatically: React.Dispatch<React.SetStateAction<boolean>>;
  doesBreakStartAutomatically: boolean;
  setDoesBreakStartAutomatically: React.Dispatch<React.SetStateAction<boolean>>;
  doesCycleStartAutomatically: boolean;
  setDoesCycleStartAutomatically: React.Dispatch<React.SetStateAction<boolean>>;
};

export function AutoStartSettingsUI({
  handleSubmitToChangeAutoStartSettings,
  doesPomoStartAutomatically,
  setDoesPomoStartAutomatically,
  doesBreakStartAutomatically,
  setDoesBreakStartAutomatically,
  doesCycleStartAutomatically,
  setDoesCycleStartAutomatically,
}: AutoStartSettingsUIProps) {
  return (
    <BoxShadowWrapper>
      <form
        onSubmit={handleSubmitToChangeAutoStartSettings}
        style={{
          display: "flex",
          justifyContent: "space-around",
          flexWrap: "wrap",
        }}
      >
        <ToggleSwitch
          labelName="Auto Start Pomo"
          name="pomo"
          isSwitchOn={doesPomoStartAutomatically}
          isHorizontal={false}
          onChange={(e) => {
            setDoesPomoStartAutomatically(e.target.checked);
          }}
          unitSize={25}
          xAxisEdgeWidth={2}
          borderWidth={2}
          backgroundColorForOn="#75BBAF"
          backgroundColorForOff="#bbc5c7"
          backgroundColorForSwitch="#f0f0f0"
        />

        <ToggleSwitch
          labelName="Auto Start Break"
          name="break"
          isSwitchOn={doesBreakStartAutomatically}
          isHorizontal={false}
          onChange={(e) => {
            setDoesBreakStartAutomatically(e.target.checked);
          }}
          unitSize={25}
          xAxisEdgeWidth={2}
          borderWidth={2}
          backgroundColorForOn="#75BBAF"
          backgroundColorForOff="#bbc5c7"
          backgroundColorForSwitch="#f0f0f0"
        />
        <ToggleSwitch
          labelName="Auto Start Cycle"
          name="cycle"
          isSwitchOn={doesCycleStartAutomatically}
          isHorizontal={false}
          onChange={(e) => {
            setDoesCycleStartAutomatically(e.target.checked);
          }}
          unitSize={25}
          xAxisEdgeWidth={2}
          borderWidth={2}
          backgroundColorForOn="#75BBAF"
          backgroundColorForOff="#bbc5c7"
          backgroundColorForSwitch="#f0f0f0"
        />

        <Button type={"submit"} color={"primary"}>
          SAVE
        </Button>
      </form>
    </BoxShadowWrapper>
  );
}
