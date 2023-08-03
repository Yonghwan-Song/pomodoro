import { DailyPomo, pomoType } from "./statRelatedTypes";
import { DataArray } from "./statRelatedTypes";

export function getStat(data: DataArray): DailyPomo[] {
  let days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  // [{ date: '9/12/2022', total: 300 }, ... ]
  let durationByDateArr = data
    .sort((a: pomoType, b: pomoType) => a.startTime - b.startTime)
    .reduce((acc: DailyPomo[], curRec: pomoType) => {
      // check if the date property of the last element in the acc
      // has the same value as the curRec's date value.
      if (acc.length === 0) {
        const dayOfWeek = new Date(curRec.date).getDay();
        return [
          {
            date: curRec.date,
            timestamp: new Date(curRec.date).getTime(),
            dayOfWeek: days[dayOfWeek],
            total: curRec.duration,
          },
        ];
      }

      if (acc[acc.length - 1].date === curRec.date) {
        acc[acc.length - 1].total += curRec.duration;
        return acc;
      } else {
        const dayOfWeek = new Date(curRec.date).getDay();
        return [
          ...acc,
          {
            date: curRec.date,
            timestamp: new Date(curRec.date).getTime(),
            dayOfWeek: days[dayOfWeek],
            total: curRec.duration,
          },
        ];
      }
    }, []);
  return durationByDateArr;
}
