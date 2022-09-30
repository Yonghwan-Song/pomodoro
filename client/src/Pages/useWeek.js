import { useState } from "react";
import { startOfWeek, endOfWeek } from "date-fns";

export function useWeek() {
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
   *
   * @param {*} statArray the data retrieved from database e.g. [{date:"8/29/2022", timestamp: 1661745600000, dayOfWeek: "Mon", total: 700},...]
   */
  function initializeWithThisWeek(statArray) {
    let correspondingWeekData = filterWeekData(statArray, weekStart, weekEnd);

    for (let element of week) {
      let matchingObj = correspondingWeekData.find(
        (obj) => obj.date === element.date
      );

      if (matchingObj) {
        element.total = matchingObj.total;
      } else if (element.timestamp <= new Date().getTime()) {
        element.total = 0;
      }
    }
    console.log(week);

    for (let i = 0; i < 7; i++) {
      let sum = 0;
      for (let j = i; j >= 0; j--) {
        sum += week[j].total;
      }
      week[i]["averageUntilToday"] = sum / (i + 1);
    }

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

    for (let element of week) {
      let matchingObj = correspondingWeekData.find(
        (obj) => obj.date === element.date
      );
      if (matchingObj) {
        element.total = matchingObj.total;
      } else if (element.timestamp <= new Date().getTime()) {
        element.total = 0;
      }
    }

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

      for (let element of week) {
        let matchingObj = correspondingWeekData.find(
          (obj) => obj.date === element.date
        );
        if (matchingObj) {
          element.total = matchingObj.total;
        } else if (element.timestamp <= new Date().getTime()) {
          element.total = 0;
        }
      }
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
  }

  return {
    week,
    prevWeek,
    nextWeek,
    initializeWithThisWeek,
    average,
    weekRange,
  };
}

/**
 *
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
      ele.timestamp < timestampOfEndOfWeek &&
      ele.timestamp >= timestampOfStartOfWeek
    );
  });
}
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

function prepareWeekData(statArray, week, weekStart, weekEnd) {
  let correspondingWeekData = filterWeekData(statArray, weekStart, weekEnd);
  compareAndFill(week, correspondingWeekData);
}

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
