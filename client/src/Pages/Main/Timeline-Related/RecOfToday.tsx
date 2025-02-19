import { useEffect, useState } from "react";
import {
  RecType,
  SessionType,
  DurationType,
} from "../../../types/clientStatesType";
import Timeline from "./Timeline";
import { MINIMUMS, VH_RATIO } from "../../../constants";

type RecOfTodayProps = {
  records: RecType[];
};

export default function RecOfToday({ records }: RecOfTodayProps) {
  //! a single session of SessionType is created using a single record of RecType.
  const [arrOfSessions, setArrOfSessions] = useState<SessionType[]>([]);

  // useEffect(() => {
  //   console.log("Duration[][]", arrOfSessions);
  // }, [arrOfSessions]);

  useEffect(() => {
    setArrOfSessions(
      //* RecType의 데이터로부터 SessionType을 만들어 낸다. SessionType은 DurationType[]
      //* records는 RecType데이터의 배열.
      records
        .filter((rec) => {
          return rec.startTime !== 0;
        })
        .map((rec) => {
          // What are going to be combined?
          // Numbers that indicate the start or end of a Pomodoro, pause, or break.
          let arrOfStartAndEnd: number[] = [];
          arrOfStartAndEnd.push(rec.startTime);
          if (rec.pause.record.length !== 0) {
            rec.pause.record.forEach((value) => {
              let { start, end } = value;
              arrOfStartAndEnd.push(start);

              // end can be undefined when a pause is not ended yet.
              if (end !== undefined && end !== rec.endTime) {
                arrOfStartAndEnd.push(end);
              }
            });
          }
          arrOfStartAndEnd.push(rec.endTime); //! Wrong rec.endTime possibly caused the problem.

          // curIndex: starts from 0 (on first call, 0 if `initialValue` was specified, otherwise 1)
          return arrOfStartAndEnd.reduce<DurationType[]>(
            (accu, curVal, curIndex, arr) => {
              let subject: "pomo" | "break" | "pause" =
                // The first start cannot be the start of pause.
                // It must be either the start of pomodoro or break.
                (curIndex + 1) % 2 === 1 ? rec.kind : "pause";
              if (curIndex + 1 < arr.length) {
                return [
                  ...accu,
                  {
                    startTime: curVal,
                    endTime: arr[curIndex + 1],
                    subject,
                    duration: arr[curIndex + 1] - curVal,
                  },
                ];
              } else {
                return [...accu];
              }
            },
            []
          );
        })
    );
  }, [records]);

  // useEffect(() => {
  //   console.log("arrOfSessions", arrOfSessions);
  // });

  return (
    <div
      style={{
        position: "relative",
        height: `max(${VH_RATIO.TIMELINE + VH_RATIO.DETAIL_AREA}vh, ${
          MINIMUMS.TIMELINE + MINIMUMS.DETAIL_AREA
        }px)`,
      }}
    >
      <Timeline arrOfSessions={arrOfSessions} />
    </div>
  );
}
