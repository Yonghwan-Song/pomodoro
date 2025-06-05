import { useMemo, useState } from "react";
import { useEffect } from "react";
import { MINIMUMS, RESOURCE, SUB_SET, VH_RATIO } from "../../constants";
import { Grid } from "../../ReusableComponents/Layouts/Grid";
import { GridItem } from "../../ReusableComponents/Layouts/GridItem";
import {
  DayStat,
  DayStatForGraph,
  StatDataForGraph_DailyPomoStat,
  CategorySubtotal,
  CategoryDetail,
  WeekStat,
} from "./statRelatedTypes";
import { countDown } from "../..";
import { pubsub } from "../../pubsub";
import { startOfWeek, endOfWeek, getISOWeek, getISOWeekYear } from "date-fns";
import { Overview } from "./Graph-Related/Overview";
import { CategoryGraph } from "./Graph-Related/CategoryGraph";
import { useFetch } from "../../Custom-Hooks/useFetch";
import { PomodoroSessionDocument } from "./statRelatedTypes";
import { axiosInstance } from "../../axios-and-error-handling/axios-instances";
import { BoxShadowWrapper } from "../../ReusableComponents/Wrapper";
import { FlexBox } from "../../ReusableComponents/Layouts/FlexBox";
import { StackedGraph } from "./Graph-Related/StackedGraph";
import { WeeklyTrendStacked } from "./Graph-Related/WeeklyTrendStacked";
import { useBoundedPomoInfoStore } from "../../zustand-stores/pomoInfoStoreUsingSlice";
import GoalGraph from "./Graph-Related/GoalGraph";

export default function Statistics() {
  const categoriesFromServer = useBoundedPomoInfoStore(
    (state) => state.categories
  );
  const isUnCategorizedOnStat = useBoundedPomoInfoStore(
    (state) => state.isUnCategorizedOnStat
  );
  const colorForUnCategorized = useBoundedPomoInfoStore(
    (state) => state.colorForUnCategorized
  );
  const updateCategories = useBoundedPomoInfoStore(
    (state) => state.setCategories
  );
  const updateIsUncategorizedOnStat = useBoundedPomoInfoStore(
    (state) => state.setIsUnCategorizedOnStat
  );
  const [sum, setSum] = useState({
    today: 0,
    lastDay: 0,
    thisWeek: 0,
    lastWeek: 0,
    thisMonth: 0,
    lastMonth: 0,
    allTime: 0,
  });
  const [weeklyStatUpToTenWeeks, setWeeklyStatUpToTenWeeks] = useState<
    WeekStat[]
  >([]);
  const [dailyStatOfThisWeek, setDailyStatOfThisWeek] =
    useState<DayStatForGraph[]>(createStatTemplate);
  // This is an example of a weekStat after initialization.
  //  [
  //   { date: "7/1/2024", dayOfWeek: "Mon", timestamp: 1719759600000 },
  //   { date: "7/2/2024", dayOfWeek: "Tue", timestamp: 1719846000000 },
  //   { date: "7/3/2024", dayOfWeek: "Wed", timestamp: 1719932400000 },
  //   { date: "7/4/2024", dayOfWeek: "Thu", timestamp: 1720018800000 },
  //   { date: "7/5/2024", dayOfWeek: "Fri", timestamp: 1720105200000 },
  //   { date: "7/6/2024", dayOfWeek: "Sat", timestamp: 1720191600000 },
  //   { date: "7/7/2024", dayOfWeek: "Sun", timestamp: 1720278000000 },
  // ];
  // This array will get pomodoro duration statistics by going through
  // 'calculateThisWeekData()' which is passed as a callback element to the useFetch below.
  const [weekStart, setWeekStart] = useState(
    startOfWeek(new Date(), { weekStartsOn: 1 }).getTime()
  );
  const [weekEnd, setWeekEnd] = useState(
    endOfWeek(new Date(), { weekStartsOn: 1 }).getTime()
  );
  const [average, setAverage] = useState(0);
  const [weekRange, setWeekRange] = useState("");
  const _24h = 24 * 60 * 60 * 1000;
  const [statData, setStatData] = useFetch<
    PomodoroSessionDocument[],
    DayStat[]
  >({
    urlSegment: RESOURCE.POMODOROS,
    modifier: calculateDailyPomodoroDuration,
    callbacks: [calculateWeeklyTrend, calculateOverview, calculateThisWeekData], // ThisWeekData is calculated in the Statistics component, which is the parent of the Graphs component. This ensures that the Graphs component displays this week's data when it initially mounts.
  });

  const [listOfCategoryDetails, isThisSessionWithoutCategory] = useMemo(() => {
    const listOfCategoryDetails = categoriesFromServer.reduce<CategoryDetail[]>(
      (previousValue, currentValue) => {
        const { name, color, isOnStat, isCurrent, _uuid } = currentValue;
        previousValue.push({ name, color, isOnStat, _uuid: _uuid!, isCurrent });
        return previousValue;
      },
      []
    );

    //
    const isThisSessionWithoutCategory =
      listOfCategoryDetails.find((info) => info.isCurrent === true) ===
      undefined
        ? true
        : false;

    return [listOfCategoryDetails, isThisSessionWithoutCategory];
  }, [categoriesFromServer]);

  //#region functions to modify data from server
  /**
   * 어떤 과정을 거쳐서 DayStat[]값을 만드는지:
   *
   * DayStat 틀을 우선 먼저 만들어 놓고, PomodoroSessionDocument[]를 iterate하면서
   * DayStat을 완성해 나가는데, total 과 withoutCategory는 단순히 숫자를 더해 나가고,
   * categorySubtotal의 경우는 pomodoroSessionDocument가 어떤 카테고리값을 가지고 있는지 확인하면서
   * object를 완성해 나간다.
   */
  function calculateDailyPomodoroDuration(
    pomodoroDocs: PomodoroSessionDocument[]
  ): DayStat[] {
    let days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    // [{ date: '9/12/2022', total: 300 }, ... ]

    let arrOfDurationByDate = pomodoroDocs
      .sort(
        (a: PomodoroSessionDocument, b: PomodoroSessionDocument) =>
          a.startTime - b.startTime // in ascending order
      )
      .reduce<DayStat[]>((acc: DayStat[], curRec: PomodoroSessionDocument) => {
        // 1. 첫번째 계산
        if (acc.length === 0) {
          const dayOfWeekIndex = new Date(curRec.date).getDay();
          const categorySubtotal = createBaseCategorySubtotal();
          const timestamp = new Date(curRec.date).getTime();
          let dailyPomos: DayStat = {
            date: curRec.date,
            timestamp,
            dayOfWeek: days[dayOfWeekIndex],
            weekNumber: getISOWeek(timestamp),
            total: curRec.duration,
            subtotalByCategory: categorySubtotal,
            withoutCategory: 0,
          };
          //* error occurred after making the `weekNumber` in the TimeRelated type required.
          //* Thus, I commented out the code below and instead initialize it in the object above.
          // dailyPomos.weekNumber = getWeek(dailyPomos.timestamp, {
          //   weekStartsOn: 1,
          // });
          if (curRec.category !== undefined) {
            dailyPomos.subtotalByCategory[curRec.category.name].duration =
              curRec.duration;
          } else {
            dailyPomos.withoutCategory += curRec.duration;
          }
          return [dailyPomos];
        }

        // 2. 같은 날의 data는 다 합친다.
        if (acc[acc.length - 1].date === curRec.date) {
          acc[acc.length - 1].total += curRec.duration;
          if (curRec.category !== undefined) {
            // console.log(curRec.category.name);
            // console.log(acc[acc.length - 1].subtotalByCategory);

            //!<--------------- How the `[name: string]` index signature is used.
            acc[acc.length - 1].subtotalByCategory[
              curRec.category.name
            ].duration += curRec.duration;
          } else {
            acc[acc.length - 1].withoutCategory += curRec.duration;
          }

          return acc;
        } else {
          // 3. 다음 날 첫번째 계산
          const dayOfWeekNumber = new Date(curRec.date).getDay();
          const categoryStat = createBaseCategorySubtotal();
          const timestamp = new Date(curRec.date).getTime();
          let dailyPomos: DayStat = {
            date: curRec.date,
            timestamp,
            dayOfWeek: days[dayOfWeekNumber],
            total: curRec.duration,
            subtotalByCategory: categoryStat,
            withoutCategory: 0,
            weekNumber: getISOWeek(timestamp),
          };
          // dailyPomos.weekNumber = getWeek(dailyPomos.timestamp, {
          //   weekStartsOn: 1,
          // });

          if (curRec.category !== undefined) {
            dailyPomos.subtotalByCategory[curRec.category.name].duration +=
              curRec.duration;
          } else {
            dailyPomos.withoutCategory += curRec.duration;
          }

          return [...acc, dailyPomos];
        }
      }, []);

    // console.log("arrOfDurationByDate", arrOfDurationByDate);

    return arrOfDurationByDate;
  }

  /**
   * Purpose: to calculate overview, such as the totals of today, this week, and this month as well as the total of all pomo records.
   * @param {*} statArray the data retrieved from database e.g. [{date:"8/29/2022", timestamp: 1661745600000, dayOfWeek: "Mon", total: 700},...]
   */
  function calculateOverview(
    pomodoroDailyStat: StatDataForGraph_DailyPomoStat
  ) {
    const now = new Date();
    //#region today and the last day total
    const startOfTodayTimestamp = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate()
    ).getTime();
    const todayPomo = pomodoroDailyStat.find(
      (obj) => obj.timestamp === startOfTodayTimestamp
    );
    const lastDayPomo = pomodoroDailyStat.find(
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
    const thisWeekData = extractWeekData(pomodoroDailyStat, [
      thisWeekStartTimestamp,
      thisWeekEndTimestamp,
    ]);
    const thisWeekSum = thisWeekData.reduce(
      (acc: number, cur: DayStat) => acc + cur.total,
      0
    );
    const lastWeekData = extractWeekData(pomodoroDailyStat, [
      thisWeekStartTimestamp - 7 * _24h,
      thisWeekEndTimestamp - 7 * _24h,
    ]);
    const lastWeekSum = lastWeekData.reduce(
      (acc: number, cur: DayStat) => acc + cur.total,
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
    const thisMonthData = extractWeekData(pomodoroDailyStat, [
      thisMonthStartTimestamp,
      thisMonthEndTimestamp,
    ]);
    const thisMonthSum = thisMonthData.reduce(
      (acc: number, cur: DayStat) => acc + cur.total,
      0
    );
    const lastMonthStartTimestamp =
      now.getMonth() === 0
        ? new Date(now.getFullYear() - 1, 11).getTime()
        : new Date(now.getFullYear(), now.getMonth() - 1).getTime();
    const lastMonthEndTimestamp = thisMonthStartTimestamp - 1;
    const lastMonthData = extractWeekData(pomodoroDailyStat, [
      lastMonthStartTimestamp,
      lastMonthEndTimestamp,
    ]);
    const lastMonthSum = lastMonthData.reduce(
      (acc: number, cur: DayStat) => acc + cur.total,
      0
    );
    //#endregion

    // Total of all records
    const sum = pomodoroDailyStat.reduce((acc, cur) => acc + cur.total, 0);
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
   * Purpose:  to filter the statData to get the array of this week
   *           and use the filtered array to set the week state variable.
   *           An average and weekRange are calcuated and set using the filtered array.
   */
  function calculateThisWeekData(pomodoroDailyStat: DayStat[]) {
    let weekCloned = [...dailyStatOfThisWeek];
    let correspondingWeekData = extractWeekData(pomodoroDailyStat, [
      weekStart,
      weekEnd,
    ]);
    fillWeekCloned(weekCloned as DayStat[], correspondingWeekData);

    let sum = correspondingWeekData.reduce((acc: number, cur: DayStat) => {
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
    setDailyStatOfThisWeek(weekCloned);
  }

  function calculateWeeklyTrend(pomodoroDailyStat: DayStat[]) {
    const weeklyTrend: WeekStat[] = pomodoroDailyStat.reduce<WeekStat[]>(
      (acc: WeekStat[], curRec: DayStat) => {
        // 1. get the first base category subtotal combined.
        if (acc.length === 0) {
          const dummy: CategorySubtotal = {};

          for (const name in curRec.subtotalByCategory) {
            dummy[name] = { ...curRec.subtotalByCategory[name] };
          }

          const weekStat: WeekStat = {
            timestampOfFirstDate: curRec.timestamp,
            weekNumber: curRec.weekNumber,
            year: getISOWeekYear(curRec.timestamp),
            total: curRec.total,
            subtotalByCategory: dummy,
            withoutCategory: curRec.withoutCategory,
          };

          acc.push(weekStat);

          return acc;
        }

        // 2. combine subtotals
        if (acc[acc.length - 1].weekNumber === curRec.weekNumber) {
          acc[acc.length - 1].total += curRec.total;
          acc[acc.length - 1].withoutCategory += curRec.withoutCategory;
          for (const name in curRec.subtotalByCategory) {
            acc[acc.length - 1].subtotalByCategory[name].duration +=
              curRec.subtotalByCategory[name].duration;
          }
          return acc;
        } else {
          // 3. move to the next week and get the base category subtotal combined.
          const dummy: CategorySubtotal = {};

          for (const name in curRec.subtotalByCategory) {
            dummy[name] = { ...curRec.subtotalByCategory[name] };
          }

          const weekStat: WeekStat = {
            timestampOfFirstDate: curRec.timestamp,
            weekNumber: curRec.weekNumber,
            year: getISOWeekYear(curRec.timestamp),
            total: curRec.total,
            subtotalByCategory: dummy,
            withoutCategory: curRec.withoutCategory,
          };

          return [...acc, weekStat];
        }
      },
      []
    );

    setWeeklyStatUpToTenWeeks(weeklyTrend);
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
  function createStatTemplate() {
    const weekNumber = getISOWeek(Date.now());
    let statArr: DayStatForGraph[] = [
      {
        date: "",
        dayOfWeek: "Mon",
        timestamp: 0,
        weekNumber,
      },
      {
        date: "",
        dayOfWeek: "Tue",
        timestamp: 0,
        weekNumber,
      },
      {
        date: "",
        dayOfWeek: "Wed",
        timestamp: 0,
        weekNumber,
      },
      {
        date: "",
        dayOfWeek: "Thu",
        timestamp: 0,
        weekNumber,
      },
      {
        date: "",
        dayOfWeek: "Fri",
        timestamp: 0,
        weekNumber,
      },
      {
        date: "",
        dayOfWeek: "Sat",
        timestamp: 0,
        weekNumber,
      },
      {
        date: "",
        dayOfWeek: "Sun",
        timestamp: 0,
        weekNumber,
      },
    ];

    const start = startOfWeek(new Date(), { weekStartsOn: 1 });
    statArr[0].date = `${
      start.getMonth() + 1
    }/${start.getDate()}/${start.getFullYear()}`;

    const startOfWeekTimestamp = start.getTime();
    statArr[0].timestamp = startOfWeekTimestamp;

    const _24h = 24 * 60 * 60 * 1000;
    for (let i = 1; i < 7; i++) {
      let nextDate = new Date(startOfWeekTimestamp + i * _24h);
      statArr[i].date = `${
        nextDate.getMonth() + 1
      }/${nextDate.getDate()}/${nextDate.getFullYear()}`;
      statArr[i].timestamp = startOfWeekTimestamp + i * _24h;
    }

    return statArr;
  }

  /**
   * Purpose: to extract a specific week data from the statArray
   * @param {*} statArray the data retrieved from database e.g. [{date:"8/29/2022", timestamp: 1661745600000, dayOfWeek: "Mon", total: 700},...]
   * @param {*} timestampOfStartOfWeek
   * @param {*} timestampOfEndOfWeek
   * @returns a particular week array determined by the second and the third argument.
   */
  function extractWeekData(
    statArray: DayStat[],
    range: [number, number]
  ): DayStat[] {
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
   * @param {*} weekStatFromData an array filtered which represents a stat for a particular week.
   */
  function fillWeekCloned(
    // weekCloned: DayStatForGraph[],
    weekCloned: {
      date: string;
      timestamp: number;
      dayOfWeek: string;
      total?: number;
      subtotalByCategory?: CategorySubtotal;
      withoutCategory?: number;
    }[],
    weekStatFromData: DayStat[]
  ) {
    for (let cloned of weekCloned) {
      let matchingStat = weekStatFromData.find(
        (fromData) => fromData.date === cloned.date
      );
      // console.log(
      //   "matchingStat from weekStatFromData in fillWeekCloned",
      //   matchingStat
      // );
      if (matchingStat) {
        cloned.total = matchingStat.total;
        cloned.subtotalByCategory = matchingStat.subtotalByCategory;
        cloned.withoutCategory = matchingStat.withoutCategory;
      } else if (cloned.timestamp <= new Date().getTime()) {
        //! 1) match되는 stat이 없다는 것은. 그날 session진행을 한번도 안했다는 것.
        //! 2) if조건 뜻 === 과거이면
        // const categoryStat: CategoryStat = {};
        // for (const cateInfoObj of c_info_list) {
        //   if (cateInfoObj.isOnStat)
        //     console.log(cateInfoObj)
        //     categoryStat[cateInfoObj.name].duration = 0;
        // }

        cloned.total = 0;
        cloned.subtotalByCategory = createBaseCategorySubtotal();
        cloned.withoutCategory = 0;
      } else {
        // console.log(
        //   `This ${cloned} is the future not coming yet. Thus, it should not have any duration-related properties`
        // );
      }
    }
  }

  function createBaseCategorySubtotal() {
    const retVal = listOfCategoryDetails.reduce<CategorySubtotal>(
      (previousValue, currentValue) => {
        previousValue[currentValue.name] = {
          _uuid: currentValue._uuid,
          duration: 0,
          isOnStat: currentValue.isOnStat,
        };

        return previousValue;
      },
      {}
    );
    return retVal;
  }

  function changeIsOnStat(ev: React.MouseEvent<HTMLDivElement>) {
    const nameClicked = ev.currentTarget.getAttribute("data-name");
    if (nameClicked) {
      let isOnStat: boolean = true;
      const categoriesUpdated = categoriesFromServer.map((category) => {
        let categoryCloned = { ...category };
        if (categoryCloned.name === nameClicked) {
          isOnStat = !categoryCloned.isOnStat;
          categoryCloned.isOnStat = isOnStat;
        }
        return categoryCloned;
      });

      updateCategories(categoriesUpdated);
      axiosInstance.patch(RESOURCE.CATEGORIES, {
        name: nameClicked,
        data: { isOnStat },
      });
    }
  }

  function changeIsUnCategorizedOnStat(ev: React.MouseEvent<HTMLDivElement>) {
    const newVal = !isUnCategorizedOnStat;
    updateIsUncategorizedOnStat(newVal);
    axiosInstance.patch(RESOURCE.USERS + SUB_SET.IS_UNCATEGORIZED_ON_STAT, {
      isUnCategorizedOnStat: newVal,
    });
    // const name = ev.currentTarget.getAttribute("data-name");
    // if (name) {
    // }
  }

  //#endregion

  // useEffect(() => {
  //   console.log("weeklyTrend", weeklyTrend);
  // }, [weeklyTrend]);

  // useEffect(() => {
  //   console.log("statData", statData);
  // });

  useEffect(() => {
    if (statData !== null) {
      if (statData.length !== 0) calculateWeeklyTrend(statData);
      else {
        //initialize.... weeklyStatOfTenWeeks.
        const now = Date.now();
        const initialWeekStat: WeekStat = {
          timestampOfFirstDate: now, // Placeholder for initialization.
          weekNumber: getISOWeek(now),
          year: getISOWeekYear(now),
          total: 0,
          subtotalByCategory: createBaseCategorySubtotal(),
          withoutCategory: 0,
        };
        setWeeklyStatUpToTenWeeks([initialWeekStat]);
      }
    }
  }, [statData]);

  useEffect(() => {
    countDown(localStorage.getItem("idOfSetInterval"));
    // {
    //   userEmail: string;
    //   duration: number;
    //   startTime: number;
    //   date: string;
    //   isDummy: boolean;
    //   category?: {
    //     name: string;
    //   };
    // }[]
    const unsub = pubsub.subscribe(
      "pomoAdded",
      (
        final: {
          useEmail: string;
          duration: number;
          startTime: number;
          date: string;
          isDummy: boolean;
          category?: {
            name: string;
          };
        }[]
      ) => {
        setStatData((prev) => {
          if (!prev) {
            return prev;
          } else {
            let today = new Date();
            const todayDateString = `${
              today.getMonth() + 1
            }/${today.getDate()}/${today.getFullYear()}`;
            let days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

            // const newSum = { ...sum };

            let cloned = [...prev];
            let doesTodayStatExist =
              cloned.length !== 0 &&
              cloned[cloned.length - 1].date === todayDateString;

            if (doesTodayStatExist) {
              for (const pomoDoc of final) {
                cloned[cloned.length - 1].total += pomoDoc.duration;
                if (pomoDoc.category) {
                  // console.log("pomoDoc.category", pomoDoc.category);
                  // console.log(
                  //   "cloned[cloned.length - 1].subtotalByCategory[pomoDoc.category.name]",
                  //   cloned[cloned.length - 1].subtotalByCategory[
                  //     pomoDoc.category.name
                  //   ]
                  // );
                  cloned[cloned.length - 1].subtotalByCategory[
                    pomoDoc.category.name
                  ].duration += pomoDoc.duration;
                } else {
                  cloned[cloned.length - 1].withoutCategory += pomoDoc.duration;
                }
              }
            }
            if (!doesTodayStatExist) {
              const now = new Date();
              const startOfTodayTimestamp = new Date(
                now.getFullYear(),
                now.getMonth(),
                now.getDate()
              ).getTime();

              let dayStat: DayStat = {
                date: todayDateString,
                timestamp: startOfTodayTimestamp,
                dayOfWeek: days[today.getDay()],
                total: 0,
                subtotalByCategory: createBaseCategorySubtotal(),
                withoutCategory: 0,
                weekNumber: getISOWeek(Date.now()),
              };

              for (const pomoDoc of final) {
                dayStat.total += pomoDoc.duration;
                if (pomoDoc.category) {
                  dayStat.subtotalByCategory[pomoDoc.category.name].duration +=
                    pomoDoc.duration;
                } else {
                  dayStat.withoutCategory += pomoDoc.duration;
                }
              }

              cloned.push(dayStat);
            }

            setSum((prev) => {
              const retVal = { ...prev };
              for (const pomoDoc of final) {
                retVal.today += pomoDoc.duration;
                retVal.thisWeek += pomoDoc.duration;
                retVal.thisMonth += pomoDoc.duration;
                retVal.allTime += pomoDoc.duration;
              }
              return retVal;
            });

            return cloned;
          }
        });
      }
    );

    return () => {
      unsub();
    };
  }, []);

  // useEffect(() => {
  //   console.log(
  //     `c_info_list in side effect for recalculating stat data - ${c_info_list}`
  //   );
  //   reCalculateStatData();
  // }, [c_info_list]);
  // useEffect(() => {
  //   console.log(
  //     `c_info_list in side effect for recalculating week data - ${c_info_list}`
  //   );
  //   reCalculateWeekData();
  // }, [c_info_list]);

  return (
    <main
      style={{
        minHeight: `calc(100vh - max(${VH_RATIO.NAV_BAR}vh, ${MINIMUMS.NAV_BAR}px))`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {statData === null ? (
        <h2>loading data...</h2>
      ) : (
        <div style={{ flexBasis: "100%" }}>
          <Grid rowGap="12px" margin="auto">
            <GridItem>
              <Overview sum={sum} />
            </GridItem>
            <GridItem>
              {weekRange && (
                <StackedGraph
                  statData={statData}
                  dailyStatOfThisWeek={dailyStatOfThisWeek}
                  listOfCategoryDetails={listOfCategoryDetails}
                  weekRangeForThisWeek={weekRange}
                  averageForThisWeek={average}
                  colorForUnCategorized={colorForUnCategorized}
                />
              )}
            </GridItem>
            <GridItem>
              {weekRange && (
                <GoalGraph
                  statData={statData}
                  dailyStatOfThisWeek={dailyStatOfThisWeek}
                  listOfCategoryDetails={listOfCategoryDetails}
                  weekRangeForThisWeek={weekRange}
                  averageForThisWeek={average}
                  colorForUnCategorized={colorForUnCategorized}
                />
              )}
            </GridItem>
            <GridItem>
              {weekRange && (
                <CategoryGraph
                  statData={statData}
                  dailyStatOfThisWeek={dailyStatOfThisWeek}
                  listOfCategoryDetails={listOfCategoryDetails}
                  weekRangeForThisWeek={weekRange}
                  isUnCategorizedOnStat={isUnCategorizedOnStat}
                  colorForUnCategorized={colorForUnCategorized}
                />
              )}
            </GridItem>
            <GridItem>
              <BoxShadowWrapper>
                <FlexBox
                  justifyContent="space-around"
                  flexWrap="wrap"
                  gap="8px"
                >
                  {categoriesFromServer.map((category, index) => {
                    return (
                      <div
                        data-name={category.name}
                        key={index}
                        style={{
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          columnGap: "6px",
                        }}
                        onClick={changeIsOnStat}
                      >
                        <div
                          style={{
                            width: "30px",
                            height: "30px",
                            backgroundColor: `${category.color}`,
                            borderRadius: "50%",
                          }}
                        ></div>
                        <div
                          style={{
                            color: category.isCurrent ? "#ff8522" : "black",
                            fontWeight: category.isCurrent ? "bold" : "normal",
                            textDecorationLine: category.isOnStat
                              ? "underline"
                              : "none",
                          }}
                        >
                          {category.name}
                        </div>
                      </div>
                    );
                  })}
                  <div
                    style={{
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      columnGap: "6px",
                    }}
                    onClick={changeIsUnCategorizedOnStat}
                  >
                    <div
                      style={{
                        width: "30px",
                        height: "30px",
                        backgroundColor: colorForUnCategorized,
                        borderRadius: "50%",
                      }}
                    ></div>
                    <div
                      style={{
                        color: isThisSessionWithoutCategory
                          ? "#ff8522"
                          : "black",
                        fontWeight: isThisSessionWithoutCategory
                          ? "bold"
                          : "normal",
                        textDecorationLine: isUnCategorizedOnStat
                          ? "underline"
                          : "none",
                      }}
                    >
                      Uncategorized
                    </div>
                  </div>
                </FlexBox>
              </BoxShadowWrapper>
            </GridItem>
            <GridItem>
              <BoxShadowWrapper>
                <WeeklyTrendStacked
                  weeklyTrend={weeklyStatUpToTenWeeks}
                  listOfCategoryDetails={listOfCategoryDetails}
                  colorForUnCategorized={colorForUnCategorized}
                />
              </BoxShadowWrapper>
            </GridItem>
          </Grid>
        </div>
      )}
    </main>
  );
}
