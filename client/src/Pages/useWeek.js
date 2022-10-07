import { useState } from "react";
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth } from "date-fns";

export function useWeek() {
  const [todayTotal, setTodayTotal] = useState(0);
  const [lastDayTotal, setLastDayTotal] = useState(0);
  const [thisWeekTotal, setThisWeekTotal] = useState(0);
  const [lastWeekTotal, setLastWeekTotal] = useState(0);
  const [thisMonthTotal, setThisMonthTotal] = useState(0);
  const [lastMonthTotal, setLastMonthTotal] = useState(0);
  const [total, setTotal] = useState(0);
  const [week, setWeek] = useState(init);
  const [weekStart, setWeekStart] = useState(
    startOfWeek(new Date(), { weekStartsOn: 1 }).getTime()
  );
  const [weekEnd, setWeekEnd] = useState(
    endOfWeek(new Date(), { weekStartsOn: 1 }).getTime()
  );
  const [average, setAverage] = useState(0);
  const [weekRange, setWeekRange] = useState("");
  const _24h = 24 * 60 * 60 * 1000;

  /**
   * Purpose: to calculate overview, such as the totals of today, this week, and this month as well as the total of all pomo records.
   * @param {*} statArray the data retrieved from database e.g. [{date:"8/29/2022", timestamp: 1661745600000, dayOfWeek: "Mon", total: 700},...]
   */
  function calculateOverview(statArray) {
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
    const thisWeekSum = thisWeekData.reduce((acc, cur) => acc + cur.total, 0);
    setThisWeekTotal(thisWeekSum);

    let lastWeekData = filterWeekData(
      statArray,
      thisWeekStartTimestamp - 7 * _24h,
      thisWeekEndTimestamp - 7 * _24h
    );
    const lastWeekSum = lastWeekData.reduce((acc, cur) => acc + cur.total, 0);
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
    const thisMonthSum = thisMonthData.reduce((acc, cur) => acc + cur.total, 0);
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
    const lastMonthSum = lastMonthData.reduce((acc, cur) => acc + cur.total, 0);
    setLastMonthTotal(lastMonthSum);
    //#endregion

    // total of all records
    const sum = statArray.reduce((acc, cur) => acc + cur.total, 0);
    setTotal(sum);
  }
  /**
   * Purpose:  to filter the statArray to get the array of this week
   *           and use the filtered array to fill the week state variable.
   * @param {*} statArray the data retrieved from database e.g. [{date:"8/29/2022", timestamp: 1661745600000, dayOfWeek: "Mon", total: 700},...]
   */
  function initializeWithThisWeek(statArray) {
    let correspondingWeekData = filterWeekData(statArray, weekStart, weekEnd);
    compareAndFill(week, correspondingWeekData);
    console.log(week);

    let sum = correspondingWeekData.reduce((acc, cur) => {
      return acc + cur.total;
    }, 0);

    setAverage(Math.trunc(sum / new Date().getDay()));
    setWeekRange(
      `${week[0].date.slice(0, -5).replace("/", ". ")} - ${week[6].date
        .slice(0, -5)
        .replace("/", ". ")}`
    );
    setWeek(week);
  }

  /**
   * Purpose:  to filter the statArray to get the array of one week before the week currently appearing on the chart
   *           and use the filtered array to fill the week state variable.
   * @param {*} statArray the data retrieved from database e.g. [{date:"8/29/2022", timestamp: 1661745600000, dayOfWeek: "Mon", total: 700},...]
   */
  function prevWeek(statArray) {
    let newWeekStart = weekStart - 7 * _24h;
    let newWeekEnd = weekEnd - 7 * _24h;
    for (let i = 0; i < 7; i++) {
      week[i].date = new Date(newWeekStart + i * _24h).toLocaleDateString();
      delete week[i].total;
      week[i].timestamp = newWeekStart + i * _24h;
    }
    setWeekStart(newWeekStart);
    setWeekEnd(newWeekEnd);

    let correspondingWeekData = filterWeekData(
      statArray,
      newWeekStart,
      newWeekEnd
    );
    compareAndFill(week, correspondingWeekData);
    console.log(week);

    let sum = correspondingWeekData.reduce((acc, cur) => {
      return acc + cur.total;
    }, 0);
    setAverage(Math.trunc(sum / 7));
    setWeekRange(
      `${week[0].date.slice(0, -5).replace("/", ". ")} - ${week[6].date
        .slice(0, -5)
        .replace("/", ". ")}`
    );
    setWeek(week);
  }

  /**
   * Purpose:  to filter the statArray to get the array of one week after the week currently appearing on the chart
   *           and use the filtered array to fill the week state variable.
   * @param {*} statArray the data retrieved from database e.g. [{date:"8/29/2022", timestamp: 1661745600000, dayOfWeek: "Mon", total: 700},...]
   */
  function nextWeek(statArray) {
    if (weekStart === startOfWeek(new Date(), { weekStartsOn: 1 }).getTime()) {
      alert("No more data");
    } else {
      let newWeekStart = weekStart + 7 * _24h;
      let newWeekEnd = weekEnd + 7 * _24h;
      for (let i = 0; i < 7; i++) {
        week[i].date = new Date(newWeekStart + i * _24h).toLocaleDateString();
        delete week[i].total;
        week[i].timestamp = newWeekStart + i * _24h;
      }
      setWeekStart(newWeekStart);
      setWeekEnd(newWeekEnd);

      let correspondingWeekData = filterWeekData(
        statArray,
        newWeekStart,
        newWeekEnd
      );
      compareAndFill(week, correspondingWeekData);
      console.log(week);

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
        `${week[0].date.slice(0, -5).replace("/", ". ")} - ${week[6].date
          .slice(0, -5)
          .replace("/", ". ")}`
      );
      setWeek(week);
    }
  }

  return {
    todayTotal,
    lastDayTotal,
    thisWeekTotal,
    lastWeekTotal,
    thisMonthTotal,
    lastMonthTotal,
    total,
    calculateOverview,
    week,
    prevWeek,
    nextWeek,
    initializeWithThisWeek,
    average,
    weekRange,
  };
}

/**
 * Purpose: to obtain a specific week data from the statArray
 * @param {*} statArray the data retrieved from database e.g. [{date:"8/29/2022", timestamp: 1661745600000, dayOfWeek: "Mon", total: 700},...]
 * @param {*} timestampOfStartOfWeek
 * @param {*} timestampOfEndOfWeek
 * @returns a particular week array determined by the second and the third argument.
 */
function filterWeekData(
  statArray,
  timestampOfStartOfWeek,
  timestampOfEndOfWeek
) {
  return statArray.filter((ele) => {
    return (
      ele.timestamp <= timestampOfEndOfWeek && //! eg. value is ending with multiple 9s like 1665374399999
      ele.timestamp >= timestampOfStartOfWeek
    );
  });
}
/**
 * Purpose: to initialize the local state variable, week.
 * @returns the array representing the current week. But the elements in it do not get the property, total.
 */
function init() {
  let weekArr = [
    {
      date: "",
      dayOfWeek: "Mon",
    },
    {
      date: "",
      dayOfWeek: "Tue",
    },
    {
      date: "",
      dayOfWeek: "Wed",
    },
    {
      date: "",
      dayOfWeek: "Thu",
    },
    {
      date: "",
      dayOfWeek: "Fri",
    },
    {
      date: "",
      dayOfWeek: "Sat",
    },
    {
      date: "",
      dayOfWeek: "Sun",
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
 * Purpose: to copy the data(total property) from filteredWeek to week state
 * @param {*} week the local week state in this component
 * @param {*} filteredWeek a filtered array representing a particular week data
 */
function compareAndFill(week, filteredWeek) {
  for (let element of week) {
    let matchingObj = filteredWeek.find((obj) => obj.date === element.date);
    if (matchingObj) {
      element.total = matchingObj.total;
    } else if (element.timestamp <= new Date().getTime()) {
      element.total = 0;
    }
  }
}
