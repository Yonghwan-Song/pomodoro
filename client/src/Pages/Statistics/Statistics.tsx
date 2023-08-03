import { useState } from "react";
import { useEffect } from "react";
import * as CONSTANTS from "../../constants/index";
import { Grid } from "../../Components/Layouts/Grid";
import { GridItem } from "../../Components/Layouts/GridItem";
import {
  CertainWeek,
  DailyPomo,
  StatArrType,
  DataArray,
} from "./statRelatedTypes";
import { countDown } from "../..";
import { PayloadFromRecOfToday, pubsub } from "../../pubsub";
import { startOfWeek, endOfWeek } from "date-fns";
import { Overview } from "./Overview";
import { Graph } from "./Graph";
import { useFetch } from "../../Custom-Hooks/useFetch";
import { getStat } from "./utilFunctions";

export default function Statistics() {
  const [sum, setSum] = useState({
    today: 0,
    lastDay: 0,
    thisWeek: 0,
    lastWeek: 0,
    thisMonth: 0,
    lastMonth: 0,
    allTime: 0,
  });
  const [week, setWeek] = useState<CertainWeek>(init);
  const [weekStart, setWeekStart] = useState(
    startOfWeek(new Date(), { weekStartsOn: 1 }).getTime()
  );
  const [weekEnd, setWeekEnd] = useState(
    endOfWeek(new Date(), { weekStartsOn: 1 }).getTime()
  );
  const [average, setAverage] = useState(0);
  const [weekRange, setWeekRange] = useState("");
  const _24h = 24 * 60 * 60 * 1000;
  const [statData, setStatData] = useFetch<DataArray, DailyPomo[]>({
    urlSegment: CONSTANTS.URLs.POMO + "/stat",
    modifier: getStat,
    callbacks: [calculateOverview, calculateThisWeekData],
  });

  //#region from the previous useWeek.tsx
  /**
   * Purpose: to calculate overview, such as the totals of today, this week, and this month as well as the total of all pomo records.
   * @param {*} statArray the data retrieved from database e.g. [{date:"8/29/2022", timestamp: 1661745600000, dayOfWeek: "Mon", total: 700},...]
   */
  function calculateOverview(statArray: DailyPomo[]) {
    const now = new Date();
    //#region today and the last day total
    const startOfTodayTimestamp = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate()
    ).getTime();
    const todayPomo = statArray.find(
      (obj) => obj.timestamp === startOfTodayTimestamp
    );
    const lastDayPomo = statArray.find(
      (obj) => obj.timestamp === startOfTodayTimestamp - _24h
    );
    //#endregion

    //#region week total
    const thisWeekStartTimestamp = startOfWeek(now, {
      weekStartsOn: 1,
    }).getTime();
    const thisWeekEndTimestamp = endOfWeek(now, {
      weekStartsOn: 1,
    }).getTime();
    const thisWeekData = extractDataInRange(statArray, [
      thisWeekStartTimestamp,
      thisWeekEndTimestamp,
    ]);
    const thisWeekSum = thisWeekData.reduce(
      (acc: number, cur: DailyPomo) => acc + cur.total,
      0
    );
    const lastWeekData = extractDataInRange(statArray, [
      thisWeekStartTimestamp - 7 * _24h,
      thisWeekEndTimestamp - 7 * _24h,
    ]);
    const lastWeekSum = lastWeekData.reduce(
      (acc: number, cur: DailyPomo) => acc + cur.total,
      0
    );
    //#endregion

    //#region month total
    const thisMonthStartTimestamp = new Date(
      now.getFullYear(),
      now.getMonth()
    ).getTime();
    const thisMonthEndTimestamp =
      now.getMonth() === 11
        ? new Date(now.getFullYear() + 1, 0).getTime() - 1
        : new Date(now.getFullYear(), now.getMonth() + 1).getTime() - 1;
    const thisMonthData = extractDataInRange(statArray, [
      thisMonthStartTimestamp,
      thisMonthEndTimestamp,
    ]);
    const thisMonthSum = thisMonthData.reduce(
      (acc: number, cur: DailyPomo) => acc + cur.total,
      0
    );
    const lastMonthStartTimestamp =
      now.getMonth() === 0
        ? new Date(now.getFullYear() - 1, 11).getTime()
        : new Date(now.getFullYear(), now.getMonth() - 1).getTime();
    const lastMonthEndTimestamp = thisMonthStartTimestamp - 1;
    const lastMonthData = extractDataInRange(statArray, [
      lastMonthStartTimestamp,
      lastMonthEndTimestamp,
    ]);
    const lastMonthSum = lastMonthData.reduce(
      (acc: number, cur: DailyPomo) => acc + cur.total,
      0
    );
    //#endregion

    // total of all records
    const sum = statArray.reduce((acc, cur) => acc + cur.total, 0);
    setSum((prev) => {
      return {
        today: todayPomo ? todayPomo.total : prev.today,
        lastDay: lastDayPomo ? lastDayPomo.total : prev.lastDay,
        thisWeek: thisWeekSum,
        lastWeek: lastWeekSum,
        thisMonth: thisMonthSum,
        lastMonth: lastMonthSum,
        allTime: sum,
      };
    });
  }
  /**
   * Purpose:  to filter the statArray to get the array of this week
   *           and use the filtered array to set the week state variable.
   *           An average and weekRange are calcuated and set using the filtered array.
   * @param {DailyPomo[]} statArray the data retrieved from database e.g. [{date:"8/29/2022", timestamp: 1661745600000, dayOfWeek: "Mon", total: 700},...]
   */
  function calculateThisWeekData(statArray: DailyPomo[]) {
    let weekCloned = [...week];
    let correspondingWeekData = extractDataInRange(statArray, [
      weekStart,
      weekEnd,
    ]);
    fillWeekCloned(weekCloned as DailyPomo[], correspondingWeekData);

    let sum = correspondingWeekData.reduce((acc: number, cur: DailyPomo) => {
      return acc + cur.total;
    }, 0);

    setAverage(Math.trunc(sum / (new Date().getDay() || 7)));
    setWeekRange(
      `${weekCloned[0].date
        .slice(0, -5)
        .replace("/", ". ")} - ${weekCloned[6].date
        .slice(0, -5)
        .replace("/", ". ")}`
    );
    setWeek(weekCloned);
  }

  /**
   * Purpose:  to filter the statArray to get the array of one week before the week currently appearing on the chart
   *           and set the week state to the filtered array.
   *           An average and weekRange are calcuated and set using the filtered array.
   * @param {DailyPomo[]} statArray the data retrieved from database e.g. [{date:"8/29/2022", timestamp: 1661745600000, dayOfWeek: "Mon", total: 700},...]
   */
  function calculatePrevWeekData(statArray: DailyPomo[]) {
    let weekCloned = [...week] as DailyPomo[];
    let newWeekStart = weekStart - 7 * _24h;
    let newWeekEnd = weekEnd - 7 * _24h;
    for (let i = 0; i < 7; i++) {
      let aDate = new Date(newWeekStart + i * _24h);
      weekCloned[i].date = `${
        aDate.getMonth() + 1
      }/${aDate.getDate()}/${aDate.getFullYear()}`;

      weekCloned[i].timestamp = newWeekStart + i * _24h;
    }
    setWeekStart(newWeekStart);
    setWeekEnd(newWeekEnd);

    let correspondingWeekData = extractDataInRange(statArray, [
      newWeekStart,
      newWeekEnd,
    ]);
    fillWeekCloned(weekCloned, correspondingWeekData);

    let sum = correspondingWeekData.reduce((acc, cur) => {
      return acc + cur.total;
    }, 0);
    setAverage(Math.trunc(sum / 7));
    setWeekRange(
      `${weekCloned[0].date
        .slice(0, -5)
        .replace("/", ". ")} - ${weekCloned[6].date
        .slice(0, -5)
        .replace("/", ". ")}`
    );
    setWeek(weekCloned);
  }

  /**
   * Purpose:  to filter the statArray to get the array of one week after the week currently appearing on the chart
   *           and set the week state to the filtered array.
   *           An average and weekRange are calcuated and set using the filtered array.
   * @param {*} statArray the data retrieved from database e.g. [{date:"8/29/2022", timestamp: 1661745600000, dayOfWeek: "Mon", total: 700},...]
   */
  function calculateNextWeekData(statArray: DailyPomo[]) {
    let weekCloned = [...week];

    if (weekStart === startOfWeek(new Date(), { weekStartsOn: 1 }).getTime()) {
      alert("No more data");
    } else {
      let newWeekStart = weekStart + 7 * _24h;
      let newWeekEnd = weekEnd + 7 * _24h;
      for (let i = 0; i < 7; i++) {
        let aDate = new Date(newWeekStart + i * _24h);
        weekCloned[i].date = `${
          aDate.getMonth() + 1
        }/${aDate.getDate()}/${aDate.getFullYear()}`;
        delete weekCloned[i].total;
        weekCloned[i].timestamp = newWeekStart + i * _24h;
      }
      setWeekStart(newWeekStart);
      setWeekEnd(newWeekEnd);

      let correspondingWeekData = extractDataInRange(statArray, [
        newWeekStart,
        newWeekEnd,
      ]);

      fillWeekCloned(weekCloned, correspondingWeekData);

      let sum = correspondingWeekData.reduce((acc, cur) => {
        return acc + cur.total;
      }, 0);
      if (
        newWeekStart === startOfWeek(new Date(), { weekStartsOn: 1 }).getTime()
      ) {
        setAverage(Math.trunc(sum / new Date().getDay()));
      } else {
        setAverage(Math.trunc(sum / 7));
      }

      setWeekRange(
        `${weekCloned[0].date
          .slice(0, -5)
          .replace("/", ". ")} - ${weekCloned[6].date
          .slice(0, -5)
          .replace("/", ". ")}`
      );
      setWeek(weekCloned);
    }
  }
  //#endregion

  useEffect(() => {
    countDown(localStorage.getItem("idOfSetInterval"));
    const unsub = pubsub.subscribe(
      "pomoAdded",
      (data: PayloadFromRecOfToday) => {
        let { startTime, timeCountedDown } = data;
        setStatData((prev) => {
          // console.log("prev", prev);
          let today = new Date();
          const todayDateStr = `${
            today.getMonth() + 1
          }/${today.getDate()}/${today.getFullYear()}`;
          let days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
          let cloned = [...(prev as DailyPomo[])];
          console.log("todayDateStr", todayDateStr);
          let doesTodayObjExist =
            cloned.length !== 0 &&
            cloned[cloned.length - 1].date === todayDateStr;

          if (doesTodayObjExist) {
            cloned[cloned.length - 1].total += timeCountedDown;
            // console.log("cloned", cloned);
          } else {
            cloned.push({
              date: todayDateStr,
              timestamp: startTime,
              dayOfWeek: days[today.getDay()],
              total: timeCountedDown,
            });
            // console.log("cloned", cloned);
          }

          calculateThisWeekData(cloned);
          setSum((prev) => {
            return {
              ...prev,
              today: prev.today + timeCountedDown,
              thisWeek: prev.thisWeek + timeCountedDown,
              thisMonth: prev.thisMonth + timeCountedDown,
              allTime: prev.allTime + timeCountedDown,
            };
          });
          return cloned;
        });
      }
    );

    return () => {
      unsub();
    };
  }, []);

  useEffect(() => {
    console.log("sth has changed");
    console.log("statArr", statData);
    console.log("week", week);
  });

  return (
    <>
      {statData === null ? (
        <h3
          style={{
            position: "absolute",
            margin: "auto",
            top: "17.5%",
            left: "50%",
            transform: "translate(-50%, -50%)",
          }}
        >
          loading data...
        </h3>
      ) : (
        <Grid>
          <GridItem>
            <Overview sum={sum} />
          </GridItem>
          <GridItem>
            <Graph
              calculatePrevWeekData={calculatePrevWeekData}
              calculateNextWeekData={calculateNextWeekData}
              weekRange={weekRange}
              statArr={statData}
              average={average}
              week={week}
            />
          </GridItem>
        </Grid>
      )}
    </>
  );
}

/**
 * Purpose: to initialize the local state variable, week.
 * @returns the array representing the current week. But the elements in it do not get the property, total.
 * Each total of elements is going to be added in the compareAndFill method defined below.
 * e.g 
 *  [
      {
        "date": "4/26/2023",
        "dayOfWeek": "Wed",
        "timestamp": 1682434800000
      },
      ...
    ]
 */

function init() {
  let weekArr: CertainWeek = [
    {
      date: "",
      dayOfWeek: "Mon",
      timestamp: 0,
    },
    {
      date: "",
      dayOfWeek: "Tue",
      timestamp: 0,
    },
    {
      date: "",
      dayOfWeek: "Wed",
      timestamp: 0,
    },
    {
      date: "",
      dayOfWeek: "Thu",
      timestamp: 0,
    },
    {
      date: "",
      dayOfWeek: "Fri",
      timestamp: 0,
    },
    {
      date: "",
      dayOfWeek: "Sat",
      timestamp: 0,
    },
    {
      date: "",
      dayOfWeek: "Sun",
      timestamp: 0,
    },
  ];

  const start = startOfWeek(new Date(), { weekStartsOn: 1 });
  weekArr[0].date = `${
    start.getMonth() + 1
  }/${start.getDate()}/${start.getFullYear()}`;

  const startOfWeekTimestamp = start.getTime();
  weekArr[0].timestamp = startOfWeekTimestamp;

  const _24h = 24 * 60 * 60 * 1000;
  for (let i = 1; i < 7; i++) {
    let nextDate = new Date(startOfWeekTimestamp + i * _24h);
    weekArr[i].date = `${
      nextDate.getMonth() + 1
    }/${nextDate.getDate()}/${nextDate.getFullYear()}`;
    weekArr[i].timestamp = startOfWeekTimestamp + i * _24h;
  }

  return weekArr;
}

/**
 * Purpose: to extract a specific week data from the statArray
 * @param {*} statArray the data retrieved from database e.g. [{date:"8/29/2022", timestamp: 1661745600000, dayOfWeek: "Mon", total: 700},...]
 * @param {*} timestampOfStartOfWeek
 * @param {*} timestampOfEndOfWeek
 * @returns a particular week array determined by the second and the third argument.
 */
function extractDataInRange(
  statArray: StatArrType,
  range: [number, number]
): StatArrType {
  return statArray.filter((ele) => {
    return (
      ele.timestamp >= range[0] && //! eg. value is ending with multiple 9s like 1665374399999
      ele.timestamp <= range[1]
    );
  });
}

/**
 * Purpose: to copy the data(total property) from filteredWeek to week state
 * @param {*} weekCloned the local week state in this component
 * @param {*} filteredWeek a filtered array representing a particular week
 */
function fillWeekCloned(weekCloned: CertainWeek, filteredWeek: StatArrType) {
  for (let element of weekCloned) {
    let matchingObj = filteredWeek.find((obj) => obj.date === element.date);
    console.log("matchingObj in fillWeekCloned", matchingObj);
    if (matchingObj) {
      element.total = matchingObj.total;
    } else if (element.timestamp <= new Date().getTime()) {
      element.total = 0;
    }
  }
}
