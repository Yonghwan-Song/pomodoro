import { PatternTimer } from "../../Components/PatternTimer/PatternTimer";
import { PatternTimerVVV } from "../../Components/PatternTimer/PatternTimer_v";
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
        <PatternTimer
          statesRelatedToTimer={statesRelatedToTimer}
          pomoDuration={pomoDuration}
          shortBreakDuration={shortBreakDuration}
          longBreakDuration={longBreakDuration}
          numOfPomo={numOfPomo}
          setRecords={setRecords}
        />
      ) : (
        <PatternTimerVVV
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
