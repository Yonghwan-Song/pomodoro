import { useState } from "react";
import { startOfWeek, endOfWeek } from "date-fns";

let weekArr = [
  {
    date: "",
    dayOfWeek: "Mon",
    total: 0,
  },
  {
    date: "",
    dayOfWeek: "Tue",
    total: 0,
  },
  {
    date: "",
    dayOfWeek: "Wed",
    total: 0,
  },
  {
    date: "",
    dayOfWeek: "Thu",
    total: 0,
  },
  {
    date: "",
    dayOfWeek: "Fri",
    total: 0,
  },
  {
    date: "",
    dayOfWeek: "Sat",
    total: 0,
  },
  {
    date: "",
    dayOfWeek: "Sun",
    total: 0,
  },
];

const start = startOfWeek(new Date(), { weekStartsOn: 1 });
const end = endOfWeek(new Date(), { weekStartsOn: 1 });
weekArr[0].date = start.toLocaleDateString();
const startOfWeekTimestamp = start.getTime();
const endOfWeekTimestamp = end.getTime();
const _24h = 24 * 60 * 60 * 1000;
for (let i = 1; i < 7; i++) {
  weekArr[i].date = new Date(
    startOfWeekTimestamp + i * _24h
  ).toLocaleDateString();
}

export function useWeek() {
  const [week, setWeek] = useState(weekArr);
  const [weekStart, setWeekStart] = useState(startOfWeekTimestamp);
  const [weekEnd, setWeekEnd] = useState(endOfWeekTimestamp);
  const [average, setAverage] = useState(0);

  function initializeWithThisWeek(statArray) {
    let correspondingWeekData = filterWeekData(
      statArray,
      startOfWeekTimestamp,
      endOfWeekTimestamp
    );

    for (const element of week) {
      let matchingObj = correspondingWeekData.find(
        (obj) => obj.date === element.date
      );
      if (matchingObj) {
        element.total = matchingObj.total;
      }
    }
    console.log(week);

    for (let i = 0; i < 7; i++) {
      let sum = 0;
      for (let j = i; j >= 0; j--) {
        sum += week[j].total;
      }
      week[i]["average"] = sum / (i + 1);
    }

    let sum = correspondingWeekData.reduce((acc, cur) => {
      return acc + cur.total;
    }, 0);
    setAverage(sum / 7);
    setWeek(week);
  }

  function prevWeek(statArray) {
    let newWeekStart = weekStart - 7 * _24h;
    let newWeekEnd = weekEnd - 7 * _24h;
    for (let i = 0; i < 7; i++) {
      week[i].date = new Date(newWeekStart + i * _24h).toLocaleDateString();
      week[i].total = 0;
    }
    setWeekStart(newWeekStart);
    setWeekEnd(newWeekEnd);

    let correspondingWeekData = filterWeekData(
      statArray,
      newWeekStart,
      newWeekEnd
    );

    for (const element of week) {
      let matchingObj = correspondingWeekData.find(
        (obj) => obj.date === element.date
      );
      if (matchingObj) {
        element.total = matchingObj.total;
      }
    }

    console.log(week);

    let sum = correspondingWeekData.reduce((acc, cur) => {
      return acc + cur.total;
    }, 0);
    setAverage(sum / 7);
    setWeek(week);
  }
  function nextWeek(statArray) {
    let newWeekStart = weekStart + 7 * _24h;
    let newWeekEnd = weekEnd + 7 * _24h;
    for (let i = 0; i < 7; i++) {
      week[i].date = new Date(newWeekStart + i * _24h).toLocaleDateString();
      week[i].total = 0;
    }
    setWeekStart(newWeekStart);
    setWeekEnd(newWeekEnd);

    let correspondingWeekData = filterWeekData(
      statArray,
      newWeekStart,
      newWeekEnd
    );

    for (const element of week) {
      let matchingObj = correspondingWeekData.find(
        (obj) => obj.date === element.date
      );
      if (matchingObj) {
        element.total = matchingObj.total;
      }
    }
    console.log(week);

    let sum = correspondingWeekData.reduce((acc, cur) => {
      return acc + cur.total;
    }, 0);
    setAverage(sum / 7);
    setWeek(week);
  }
  return { week, prevWeek, nextWeek, initializeWithThisWeek, average };
}

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
