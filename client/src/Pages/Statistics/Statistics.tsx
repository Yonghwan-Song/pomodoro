import axios from "axios";
import { useState } from "react";
import { useEffect } from "react";
import { UserAuth } from "../../Context/AuthContext";
import * as CONSTANTS from "../../constants/index";
import { Grid } from "../../Components/Layouts/Grid";
import { GridItem } from "../../Components/Layouts/GridItem";
import { User } from "firebase/auth";
import {
  pomoType,
  CertainWeek,
  DailyPomo,
  StatArrType,
} from "./statRelatedTypes";
import { postMsgToSW } from "../..";
import { pubsub } from "../../pubsub";
import { startOfWeek, endOfWeek } from "date-fns";
import { Overview } from "./Overview";
import { Graph } from "./Graph";

export default function Statistics() {
  const { user } = UserAuth()!;
  const [statArr, setStatArr] = useState<StatArrType>([]);
  const [todayTotal, setTodayTotal] = useState(0);
  const [lastDayTotal, setLastDayTotal] = useState(0);
  const [thisWeekTotal, setThisWeekTotal] = useState(0);
  const [lastWeekTotal, setLastWeekTotal] = useState(0);
  const [thisMonthTotal, setThisMonthTotal] = useState(0);
  const [lastMonthTotal, setLastMonthTotal] = useState(0);
  const [total, setTotal] = useState(0);
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
  //#region from the previous useWeek.tsx
  /**
   * Purpose: to calculate overview, such as the totals of today, this week, and this month as well as the total of all pomo records.
   * @param {*} statArray the data retrieved from database e.g. [{date:"8/29/2022", timestamp: 1661745600000, dayOfWeek: "Mon", total: 700},...]
   */
  function calculateOverview(statArray: StatArrType) {
    const now = new Date();
    //#region today and the last day total
    const startOfTodayTimestamp = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate()
    ).getTime();

    let todayObject = statArray.find(
      (obj) => obj.timestamp === startOfTodayTimestamp
    );
    if (todayObject) {
      setTodayTotal(todayObject.total);
    }
    let lastDayObject = statArray.find(
      (obj) => obj.timestamp === startOfTodayTimestamp - _24h
    );
    if (lastDayObject) {
      setLastDayTotal(lastDayObject.total);
    }
    //#endregion

    //#region week total
    const thisWeekStartTimestamp = startOfWeek(now, {
      weekStartsOn: 1,
    }).getTime();
    const thisWeekEndTimestamp = endOfWeek(now, {
      weekStartsOn: 1,
    }).getTime();

    let thisWeekData = filterWeekData(
      statArray,
      thisWeekStartTimestamp,
      thisWeekEndTimestamp
    );
    const thisWeekSum = thisWeekData.reduce(
      (acc: number, cur: DailyPomo) => acc + cur.total,
      0
    );
    setThisWeekTotal(thisWeekSum);

    let lastWeekData = filterWeekData(
      statArray,
      thisWeekStartTimestamp - 7 * _24h,
      thisWeekEndTimestamp - 7 * _24h
    );
    const lastWeekSum = lastWeekData.reduce(
      (acc: number, cur: DailyPomo) => acc + cur.total,
      0
    );
    setLastWeekTotal(lastWeekSum);
    //#endregion

    //#region month total
    const thisMonthStartTimestamp = new Date(
      now.getFullYear(),
      now.getMonth()
    ).getTime();
    let thisMonthEndTimestamp = 0;
    if (now.getMonth() === 11) {
      thisMonthEndTimestamp = new Date(now.getFullYear() + 1, 0).getTime() - 1;
    } else {
      thisMonthEndTimestamp =
        new Date(now.getFullYear(), now.getMonth() + 1).getTime() - 1;
    }

    let thisMonthData = filterWeekData(
      statArray,
      thisMonthStartTimestamp,
      thisMonthEndTimestamp
    );
    const thisMonthSum = thisMonthData.reduce(
      (acc: number, cur: DailyPomo) => acc + cur.total,
      0
    );
    setThisMonthTotal(thisMonthSum);

    let lastMonthStartTimestamp = 0;
    if (now.getMonth() === 0) {
      lastMonthStartTimestamp = new Date(now.getFullYear() - 1, 11).getTime();
    } else {
      lastMonthStartTimestamp = new Date(
        now.getFullYear(),
        now.getMonth() - 1
      ).getTime();
    }
    const lastMonthEndTimestamp = thisMonthStartTimestamp - 1;

    let lastMonthData = filterWeekData(
      statArray,
      lastMonthStartTimestamp,
      lastMonthEndTimestamp
    );
    const lastMonthSum = lastMonthData.reduce(
      (acc: number, cur: DailyPomo) => acc + cur.total,
      0
    );
    setLastMonthTotal(lastMonthSum);
    //#endregion

    // total of all records
    const sum = statArray.reduce((acc, cur) => acc + cur.total, 0);
    setTotal(sum);
  }
  /**
   * Purpose:  to filter the statArray to get the array of this week
   *           and use the filtered array to set the week state variable.
   *           An average and weekRange are calcuated and set using the filtered array.
   * @param {StatArrType} statArray the data retrieved from database e.g. [{date:"8/29/2022", timestamp: 1661745600000, dayOfWeek: "Mon", total: 700},...]
   */
  function setThisWeek(statArray: StatArrType) {
    let weekCloned = [...week];
    let correspondingWeekData = filterWeekData(statArray, weekStart, weekEnd);
    compareAndFill(weekCloned as DailyPomo[], correspondingWeekData);

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
   * @param {StatArrType} statArray the data retrieved from database e.g. [{date:"8/29/2022", timestamp: 1661745600000, dayOfWeek: "Mon", total: 700},...]
   */
  function setPrevWeek(statArray: StatArrType) {
    let weekCloned = [...week] as DailyPomo[];
    let newWeekStart = weekStart - 7 * _24h;
    let newWeekEnd = weekEnd - 7 * _24h;
    for (let i = 0; i < 7; i++) {
      weekCloned[i].date = new Date(
        newWeekStart + i * _24h
      ).toLocaleDateString();

      weekCloned[i].timestamp = newWeekStart + i * _24h;
    }
    setWeekStart(newWeekStart);
    setWeekEnd(newWeekEnd);

    let correspondingWeekData = filterWeekData(
      statArray,
      newWeekStart,
      newWeekEnd
    );
    compareAndFill(weekCloned, correspondingWeekData);

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
  function setNextWeek(statArray: StatArrType) {
    let weekCloned = [...week];

    if (weekStart === startOfWeek(new Date(), { weekStartsOn: 1 }).getTime()) {
      alert("No more data");
    } else {
      let newWeekStart = weekStart + 7 * _24h;
      let newWeekEnd = weekEnd + 7 * _24h;
      for (let i = 0; i < 7; i++) {
        weekCloned[i].date = new Date(
          newWeekStart + i * _24h
        ).toLocaleDateString();
        delete weekCloned[i].total;
        weekCloned[i].timestamp = newWeekStart + i * _24h;
      }
      setWeekStart(newWeekStart);
      setWeekEnd(newWeekEnd);

      let correspondingWeekData = filterWeekData(
        statArray,
        newWeekStart,
        newWeekEnd
      );

      compareAndFill(weekCloned, correspondingWeekData);

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

  /**
   * TODO: Purpose:
   * @param user
   */
  async function getStatArr(user: User) {
    try {
      const idToken = await user.getIdToken();
      const response = await axios.get(
        CONSTANTS.URLs.POMO + `/stat/${user.email}`,
        {
          headers: {
            Authorization: "Bearer " + idToken,
          },
        }
      );
      let pomoRecords = response.data;
      let days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
      // [{ date: '9/12/2022', total: 300 }, ... ]
      let durationByDateArr = pomoRecords
        .sort((a: pomoType, b: pomoType) => a.startTime - b.startTime)
        .reduce((acc: StatArrType, curRec: pomoType) => {
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
      console.log("pomoRecords", pomoRecords);
      console.log("durationByDateArr", durationByDateArr);
      setStatArr(durationByDateArr); //!
      calculateOverview(durationByDateArr);
      setThisWeek(durationByDateArr);
    } catch (error) {
      console.log(error);
    }
  }

  useEffect(() => {
    if (
      user !== null &&
      Object.entries(user).length !== 0 &&
      statArr.length === 0
    ) {
      getStatArr(user);
    }

    console.log(week);
    console.log(`Average - ${average}`);
    console.log(`todayTotal - ${todayTotal}`);
    console.log(`lastDayTotal - ${lastDayTotal}`);
  }, [user]);

  useEffect(() => {
    postMsgToSW("countDown", localStorage.getItem("idOfSetInterval"));
    const unsub = pubsub.subscribe("pomoAdded", (data: number) => {
      console.log("pomoAdded", data);

      setStatArr((prev) => {
        let cloned = [...prev];
        cloned[cloned.length - 1].total += data;
        setThisWeek(cloned);
        return cloned;
      });
      setTodayTotal((prev) => prev + data);
      setThisWeekTotal((prev) => prev + data);
      setThisMonthTotal((prev) => prev + data);
      setTotal((prev) => prev + data);
    });

    return () => {
      unsub();
    };
  }, []);

  useEffect(() => {
    console.log("sth has changed");
    console.log("statArr", statArr);
  });

  return (
    <>
      <Grid>
        <GridItem>
          <Overview
            todayTotal={todayTotal}
            lastDayTotal={lastDayTotal}
            thisWeekTotal={thisWeekTotal}
            lastWeekTotal={lastWeekTotal}
            thisMonthTotal={thisMonthTotal}
            lastMonthTotal={lastMonthTotal}
            total={total}
          />
        </GridItem>
        <GridItem>
          <Graph
            setPrevWeek={setPrevWeek}
            setNextWeek={setNextWeek}
            weekRange={weekRange}
            statArr={statArr}
            average={average}
            week={week}
          />
        </GridItem>
      </Grid>
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
  weekArr[0].date = start.toLocaleDateString();

  const startOfWeekTimestamp = start.getTime();
  weekArr[0].timestamp = startOfWeekTimestamp;

  const _24h = 24 * 60 * 60 * 1000;
  for (let i = 1; i < 7; i++) {
    weekArr[i].date = new Date(
      startOfWeekTimestamp + i * _24h
    ).toLocaleDateString();
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
function filterWeekData(
  statArray: StatArrType,
  timestampOfStartOfWeek: number,
  timestampOfEndOfWeek: number
): StatArrType {
  return statArray.filter((ele) => {
    return (
      ele.timestamp <= timestampOfEndOfWeek && //! eg. value is ending with multiple 9s like 1665374399999
      ele.timestamp >= timestampOfStartOfWeek
    );
  });
}

/**
 * Purpose: to copy the data(total property) from filteredWeek to week state
 * @param {*} week the local week state in this component
 * @param {*} filteredWeek a filtered array representing a particular week
 */
function compareAndFill(
  // week: Omit<DailyPomo, "total">[],
  week: CertainWeek,
  filteredWeek: StatArrType
) {
  for (let element of week) {
    let matchingObj = filteredWeek.find((obj) => obj.date === element.date);
    if (matchingObj) {
      element.total = matchingObj.total;
    } else if (element.timestamp <= new Date().getTime()) {
      element.total = 0;
    }
  }
}
