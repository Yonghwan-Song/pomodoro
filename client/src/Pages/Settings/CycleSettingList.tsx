import {
  Category,
  CycleSetting,
  PomoSettingType
} from "../../types/clientStatesType";
import { roundTo_X_DecimalPoints } from "../../utils/number-related-utils";
import { useBoundedPomoInfoStore } from "../../zustand-stores/pomoInfoStoreUsingSlice";
import { axiosInstance } from "../../axios-and-error-handling/axios-instances";
import {
  COLOR_FOR_CURRENT_STH,
  COLOR_FOR_SELECTED_SETTING,
  RESOURCE,
  SUB_SET
} from "../../constants";
import {
  persistCategoryChangeInfoArrayToIDB,
  persistTimersStatesToServer,
  postMsgToSW,
  stopCountDownInBackground
} from "../..";
import { useAuthContext } from "../../Context/AuthContext";
import { Button } from "../../ReusableComponents/Buttons/Button";
import { calculateTargetFocusRatio, getAverage } from "../../utils/anything";

type CycleSettingListProps = {
  setPomoSettingInputs: React.Dispatch<React.SetStateAction<PomoSettingType>>;
  currentCategory: Category | null;
  colorForUnCategorized: string;
  isUserCreatingNewCycleSetting: boolean;
  setIsUserCreatingNewCycleSetting: React.Dispatch<
    React.SetStateAction<boolean>
  >;
  cycleSettingSelected: CycleSetting | null;
  setCycleSettingSelected: React.Dispatch<
    React.SetStateAction<CycleSetting | null>
  >;
  setCycleSettingNameInput: React.Dispatch<React.SetStateAction<string>>;
  setTargetFocusRatio: React.Dispatch<React.SetStateAction<number>>;
  setIsInputLocked: React.Dispatch<React.SetStateAction<boolean>>;
  currentCycleSetting: CycleSetting | undefined;
};

export function CycleSettingList({
  setPomoSettingInputs,
  currentCategory,
  colorForUnCategorized,
  isUserCreatingNewCycleSetting,
  setIsUserCreatingNewCycleSetting,
  cycleSettingSelected,
  setCycleSettingSelected,
  setCycleSettingNameInput,
  setTargetFocusRatio,
  setIsInputLocked,
  currentCycleSetting
}: CycleSettingListProps) {
  const { user } = useAuthContext()!;
  const cycleSettings = useBoundedPomoInfoStore((state) => state.cycleSettings);
  const updateCategoryChangeInfoArray = useBoundedPomoInfoStore(
    (state) => state.setCategoryChangeInfoArray
  );
  const updateCycleSettings = useBoundedPomoInfoStore(
    (state) => state.setCycleSettings
  );
  const updatePomoSetting = useBoundedPomoInfoStore(
    (state) => state.setPomoSetting
  );

  // TODO - 이거 테스트부터 : 마치 이전에 했던 save and reset처럼 작동. 즉, 새로운 pomoSetting이 할당되므로,
  // *       그에 걸맞게, 1)timersStates와 2)categoryChangeInfoArray 그리고 3)currentCycleInfo 모두 재설한다.
  // ! 삼각 - a)locally b)IDB c)Server
  // 새롭게 해야할 것 - We need to
  function selectCycleSetting(
    ev: React.MouseEvent<HTMLDivElement>,
    cycleSetting: CycleSetting
  ) {
    if (cycleSettingSelected?.name === cycleSetting.name) return;

    setCycleSettingSelected(cycleSetting);
    setPomoSettingInputs(cycleSetting.pomoSetting);
    setCycleSettingNameInput(cycleSetting.name);
    setTargetFocusRatio(calculateTargetFocusRatio(cycleSetting.pomoSetting));
  }

  function handleCancelCreateNew() {
    // setIsUserCreatingNewCycleSetting((prev)=>!prev)
    setIsUserCreatingNewCycleSetting(false);
    setIsInputLocked(true);
    // set inputs and ratio to current
    if (currentCycleSetting) {
      // 100% :::...
      setPomoSettingInputs(currentCycleSetting.pomoSetting);
      setCycleSettingNameInput(currentCycleSetting.name);
      setTargetFocusRatio(
        calculateTargetFocusRatio(currentCycleSetting.pomoSetting)
      );
    }
  }

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-around",
        flexDirection: "row",
        flexWrap: "wrap",
        rowGap: "0.6rem"
      }}
    >
      {cycleSettings.map((setting, index) => {
        const {
          pomoDuration,
          shortBreakDuration,
          longBreakDuration,
          numOfPomo,
          numOfCycle
        } = setting.pomoSetting;

        const totalFocusDurationTargetedInSec = 60 * pomoDuration * numOfPomo;
        const cycleDurationTargetedInSec =
          60 *
          (pomoDuration * numOfPomo +
            shortBreakDuration * (numOfPomo - 1) +
            longBreakDuration);
        const ratioTargeted = roundTo_X_DecimalPoints(
          totalFocusDurationTargetedInSec / cycleDurationTargetedInSec,
          2
        );

        const isSelected = cycleSettingSelected?.name === setting.name;
        // reload시 cycleSettingSelected가 null이 되기 때문에 false값이 된다.

        let cssBorder = "1px solid #8c8c8c"; // default
        if (setting.isCurrent) {
          // cssBorder = "2px solid #ff8522";
          cssBorder = "2px solid " + COLOR_FOR_CURRENT_STH;
        }
        if (isSelected && !setting.isCurrent) {
          cssBorder = "2px solid " + COLOR_FOR_SELECTED_SETTING;
        }

        return (
          <div
            style={{
              border: cssBorder,
              borderRadius: "0.5em",
              paddingLeft: "5px",
              paddingRight: "5px",
              cursor: "pointer"
              // transform: isSelected ? "scale(1.3)" : "scale(1)",
              // transform: isSelected ? "rotate(12deg)" : "rotate(0deg)",
            }}
            key={index}
            onClick={(ev) => selectCycleSetting(ev, setting)}
          >
            <div>
              <i>{setting.name}</i>
            </div>
            <div>target ratio - {ratioTargeted}</div>
            {/* <div>average adherence rate {averageAdherenceRate}</div> */}
            <div>average adherence rate {setting.averageAdherenceRate}</div>
          </div>
        );
      })}
      {isUserCreatingNewCycleSetting ? (
        <Button handleClick={handleCancelCreateNew} color="blue">
          Cancel
        </Button>
      ) : (
        <Button
          color="blue"
          handleClick={() => {
            // setIsUserCreatingNewCycleSetting((prev) => !prev);
            setIsUserCreatingNewCycleSetting(true);
            setIsInputLocked(false);
          }}
        >
          Create a new cycle setting
        </Button>
      )}
    </div>
  );
}
