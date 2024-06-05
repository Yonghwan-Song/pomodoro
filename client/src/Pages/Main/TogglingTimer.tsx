import { TimerController } from "../../Components/TimerController/TimerController";
import { TimerControllerVVV } from "../../Components/TimerController/TimerController_v";
import { RecType, TimersStatesType } from "../../types/clientStatesType";

type TogglingTimerProps = {
  toggle: boolean;
  statesRelatedToTimer: TimersStatesType | {};
  pomoDuration: number;
  shortBreakDuration: number;
  longBreakDuration: number;
  numOfPomo: number;
  setRecords: React.Dispatch<React.SetStateAction<RecType[]>>;
};
export default function TogglingTimer({
  toggle,
  statesRelatedToTimer,
  pomoDuration,
  shortBreakDuration,
  longBreakDuration,
  numOfPomo,
  setRecords,
}: TogglingTimerProps) {
  return (
    <>
      {toggle ? (
        <TimerController
          statesRelatedToTimer={statesRelatedToTimer}
          pomoDuration={pomoDuration}
          shortBreakDuration={shortBreakDuration}
          longBreakDuration={longBreakDuration}
          numOfPomo={numOfPomo}
          setRecords={setRecords}
        />
      ) : (
        <TimerControllerVVV
          statesRelatedToTimer={statesRelatedToTimer}
          pomoDuration={pomoDuration}
          shortBreakDuration={shortBreakDuration}
          longBreakDuration={longBreakDuration}
          numOfPomo={numOfPomo}
          setRecords={setRecords}
        />
      )}
    </>
  );
}
