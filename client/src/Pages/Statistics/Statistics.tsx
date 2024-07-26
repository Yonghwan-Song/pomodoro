import { useMemo, useState } from "react";
import { useEffect } from "react";
import {
  FOREGROUND_COLOR,
  MINIMUMS,
  RESOURCE,
  SUB_SET,
  VH_RATIO,
} from "../../constants";
import { Grid } from "../../Components/Layouts/Grid";
import { GridItem } from "../../Components/Layouts/GridItem";
import {
  DayStat,
  DayStatForGraph,
  StatDataFromServer_PomoDocs,
  StatDataForGraph_DailyPomoStat,
  CategoryStat,
  CategoryInfoForStat,
} from "./statRelatedTypes";
import { countDown } from "../..";
import { pubsub } from "../../pubsub";
import { startOfWeek, endOfWeek } from "date-fns";
import { Overview } from "./Overview";
import { CategoryGraph } from "./CategoryGraph";
import { useFetch } from "../../Custom-Hooks/useFetch";
import { PomodoroSessionDocument } from "./statRelatedTypes";
import { StyledLoadingMessage } from "../../Components/styles/LoadingMessage.styled";
import { useUserContext } from "../../Context/UserContext";
import { axiosInstance } from "../../axios-and-error-handling/axios-instances";
import { BoxShadowWrapper } from "../../Components/Wrapper";
import { FlexBox } from "../../Components/Layouts/FlexBox";
import { StackedGraph } from "./StackedGraph";

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

  const [weekStat, setWeekStat] = useState<DayStatForGraph[]>(init);
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
    callbacks: [calculateOverview, calculateThisWeekData], // ThisWeekData is calculated in the Statistics component, which is the parent of the Graphs component. This ensures that the Graphs component displays this week's data when it initially mounts.
  });

  const userInfoContext = useUserContext()!;
  const setPomoInfo = userInfoContext.setPomoInfo;
  const categoriesFromServer = useMemo(() => {
    if (
      userInfoContext.pomoInfo !== null &&
      userInfoContext.pomoInfo.categories !== undefined
    ) {
      return userInfoContext.pomoInfo.categories;
    } else {
      return [];
    }
  }, [userInfoContext.pomoInfo?.categories]);
  const isUnCategorizedOnStat = useMemo(() => {
    return userInfoContext.pomoInfo?.isUnCategorizedOnStat ?? false;
  }, [userInfoContext.pomoInfo?.isUnCategorizedOnStat]);
  const [c_info_list, isThisSessionWithoutCategory] = useMemo(() => {
    if (
      userInfoContext.pomoInfo !== null &&
      userInfoContext.pomoInfo.categories !== undefined
    ) {
      const c_info_list = userInfoContext.pomoInfo.categories.reduce<
        CategoryInfoForStat[]
      >((previousValue, currentValue) => {
        const { name, color, isOnStat, isCurrent, _uuid } = currentValue;
        previousValue.push({ name, color, isOnStat, _uuid: _uuid!, isCurrent });
        return previousValue;
      }, []);
      const isThisSessionWithoutCategory =
        c_info_list.find((info) => info.isCurrent === true) === undefined
          ? true
          : false;
      return [c_info_list, isThisSessionWithoutCategory];
    } else {
      return [[], false];
    }
  }, [userInfoContext.pomoInfo?.categories]);

  //#region functions to modify data from server
  /**
   * Reduce the data into the daily pomodoro array
   * @param pomodoroDocs an array of pomodoro records.
   * @returns an element in DailyPomo[] is just total pomodoro duration in the particular day.
   */
  function calculateDailyPomodoroDuration(
    pomodoroDocs: StatDataFromServer_PomoDocs
  ): StatDataForGraph_DailyPomoStat {
    let days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    // [{ date: '9/12/2022', total: 300 }, ... ]

    let arrOfDurationByDate = pomodoroDocs
      .sort(
        (a: PomodoroSessionDocument, b: PomodoroSessionDocument) =>
          a.startTime - b.startTime
      )
      .reduce<DayStat[]>((acc, curRec) => {
        // 1. 첫번째 계산
        if (acc.length === 0) {
          const dayOfWeekNumber = new Date(curRec.date).getDay();
          const categoryStat = createInitialCategoryStat();
          let dailyPomos: DayStat = {
            date: curRec.date,
            timestamp: new Date(curRec.date).getTime(),
            dayOfWeek: days[dayOfWeekNumber],
            total: curRec.duration,
            withCategories: categoryStat,
            withoutCategory: 0,
          };
          //
          if (curRec.category !== undefined) {
            dailyPomos.withCategories[curRec.category.name].duration =
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
            // console.log(acc[acc.length - 1].withCategories);

            acc[acc.length - 1].withCategories[curRec.category.name].duration +=
              curRec.duration;
          } else {
            acc[acc.length - 1].withoutCategory += curRec.duration;
          }

          return acc;
        } else {
          // 3. 다음 날 첫번째 계산
          const dayOfWeekNumber = new Date(curRec.date).getDay();
          const categoryStat = createInitialCategoryStat();
          let dailyPomos: DayStat = {
            date: curRec.date,
            timestamp: new Date(curRec.date).getTime(),
            dayOfWeek: days[dayOfWeekNumber],
            total: curRec.duration,
            withCategories: categoryStat,
            withoutCategory: 0,
          };

          if (curRec.category !== undefined) {
            dailyPomos.withCategories[curRec.category.name].duration +=
              curRec.duration;
          } else {
            dailyPomos.withoutCategory += curRec.duration;
          }

          return [...acc, dailyPomos];
        }
      }, []);

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
   * Purpose:  to filter the statArray to get the array of this week
   *           and use the filtered array to set the week state variable.
   *           An average and weekRange are calcuated and set using the filtered array.
   * @param {DayStat[]} pomodoroDailyStat the data retrieved from database e.g. [{date:"8/29/2022", timestamp: 1661745600000, dayOfWeek: "Mon", total: 700},...]
   */
  function calculateThisWeekData(
    pomodoroDailyStat: StatDataForGraph_DailyPomoStat
  ) {
    let weekCloned = [...weekStat];
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
    setWeekStat(weekCloned);
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
    let weekStat: DayStatForGraph[] = [
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
    weekStat[0].date = `${
      start.getMonth() + 1
    }/${start.getDate()}/${start.getFullYear()}`;

    const startOfWeekTimestamp = start.getTime();
    weekStat[0].timestamp = startOfWeekTimestamp;

    const _24h = 24 * 60 * 60 * 1000;
    for (let i = 1; i < 7; i++) {
      let nextDate = new Date(startOfWeekTimestamp + i * _24h);
      weekStat[i].date = `${
        nextDate.getMonth() + 1
      }/${nextDate.getDate()}/${nextDate.getFullYear()}`;
      weekStat[i].timestamp = startOfWeekTimestamp + i * _24h;
    }
    return weekStat;
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
      withCategories?: CategoryStat;
      withoutCategory?: number;
    }[],
    weekStatFromData: DayStat[]
  ) {
    for (let cloned of weekCloned) {
      let matchingStat = weekStatFromData.find(
        (fromData) => fromData.date === cloned.date
      );
      console.log(
        "matchingStat from weekStatFromData in fillWeekCloned",
        matchingStat
      );
      if (matchingStat) {
        cloned.total = matchingStat.total;
        cloned.withCategories = matchingStat.withCategories;
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
        cloned.withCategories = createInitialCategoryStat();
        cloned.withoutCategory = 0;
      } else {
        // console.log(
        //   `This ${cloned} is the future not coming yet. Thus, it should not have any duration-related properties`
        // );
      }
    }
  }

  function createInitialCategoryStat() {
    // console.log(
    //   "inside createInitialCategoryStat---------------------------------"
    // );
    // console.log(c_info_list);
    const retVal = c_info_list.reduce<CategoryStat>(
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

  function reCalculateStatData() {
    if (statData) {
      const statDataUpdated = statData.map((dayStat) => {
        const transformed: {
          [_uuid: string]: {
            name: string;
            duration: number;
            isOnStat: boolean;
          };
        } = {};
        for (const name in dayStat.withCategories) {
          transformed[dayStat.withCategories[name]._uuid] = {
            name,
            duration: dayStat.withCategories[name].duration,
            isOnStat: dayStat.withCategories[name].isOnStat,
          };
        }
        const newStat: {
          [name: string]: {
            _uuid: string;
            duration: number;
            isOnStat: boolean;
          };
        } = {};
        for (const c_info of c_info_list) {
          newStat[c_info.name] = {
            _uuid: c_info._uuid,
            duration: transformed[c_info._uuid]
              ? transformed[c_info._uuid].duration
              : 0,
            isOnStat: c_info.isOnStat,
          };
        }
        dayStat.withCategories = newStat;

        return dayStat;
      });
      // console.log(
      //   "----------------------------------reCalculateStatData----------------------------------"
      // );
      // console.log(statData);
      // console.log(statDataUpdated);

      setStatData(statDataUpdated);
    }
  }
  function reCalculateWeekData() {
    const weekStatUpdated = weekStat.map((dayStat) => {
      if (dayStat.withCategories) {
        const transformed: {
          [_uuid: string]: {
            name: string;
            duration: number;
            isOnStat: boolean;
          };
        } = {};
        for (const name in dayStat.withCategories) {
          transformed[dayStat.withCategories[name]._uuid] = {
            name,
            duration: dayStat.withCategories[name].duration,
            isOnStat: dayStat.withCategories[name].isOnStat,
          };
        }
        const newStat: {
          [name: string]: {
            _uuid: string;
            duration: number;
            isOnStat: boolean;
          };
        } = {};
        for (const c_info of c_info_list) {
          newStat[c_info.name] = {
            _uuid: c_info._uuid,
            duration: transformed[c_info._uuid]
              ? transformed[c_info._uuid].duration
              : 0,
            isOnStat: c_info.isOnStat,
          };
        }
        dayStat.withCategories = newStat;
      }
      return dayStat;
    });

    // console.log(
    //   "----------------------------------reCalculateWeekData----------------------------------"
    // );
    // console.log(weekStat);
    // console.log(weekStatUpdated);

    setWeekStat(weekStatUpdated);
  }

  function changeIsOnStat(ev: React.MouseEvent<HTMLDivElement>) {
    const name = ev.currentTarget.getAttribute("data-name");
    if (name) {
      let isOnStat: boolean = true;
      const categoriesUpdated = categoriesFromServer.map((category) => {
        if (category.name === name) {
          isOnStat = !category.isOnStat;
          category.isOnStat = isOnStat;
        }
        return category;
      });

      setPomoInfo((prev) => {
        if (!prev) return prev;
        return { ...prev, categories: categoriesUpdated };
      });
      axiosInstance.patch(RESOURCE.CATEGORIES, {
        name,
        data: { isOnStat },
      });
    }
  }

  function changeIsUnCategorizedOnStat(ev: React.MouseEvent<HTMLDivElement>) {
    const newVal = !isUnCategorizedOnStat;
    setPomoInfo((prev) => {
      if (!prev) return prev;
      return { ...prev, isUnCategorizedOnStat: newVal };
    });
    axiosInstance.patch(RESOURCE.USERS + SUB_SET.IS_UNCATEGORIZED_ON_STAT, {
      isUnCategorizedOnStat: newVal,
    });
    // const name = ev.currentTarget.getAttribute("data-name");
    // if (name) {
    // }
  }

  //#endregion

  useEffect(() => {
    countDown(localStorage.getItem("idOfSetInterval"));
    const unsub = pubsub.subscribe("pomoAdded", (dataOfPomoSession: any) => {
      let { startTime, timeCountedDown, currentCategoryName } =
        dataOfPomoSession;
      console.log(`currentCateFromPayload - ${currentCategoryName}`);
      const nameOfCurrentCategory = categoriesFromServer.find(
        (category) => category.isCurrent
      )?.name;
      setStatData((prev) => {
        if (!prev) {
          return prev;
        } else {
          let today = new Date();
          const todayDateStr = `${
            today.getMonth() + 1
          }/${today.getDate()}/${today.getFullYear()}`;
          let days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
          let cloned = [...prev];
          let doesTodayPomodoroStatExist =
            cloned.length !== 0 &&
            cloned[cloned.length - 1].date === todayDateStr;
          if (doesTodayPomodoroStatExist) {
            // if (currentCategoryName !== null) {
            if (nameOfCurrentCategory !== undefined) {
              // console.log(`currentCategoryName - ${nameOfCurrentCategory}`);
              // console.log(`cloned<----------------------------`);
              // console.log(cloned);
              cloned[cloned.length - 1].withCategories[
                nameOfCurrentCategory
              ].duration += timeCountedDown;
              cloned[cloned.length - 1].total += timeCountedDown;
            } else {
              cloned[cloned.length - 1].total += timeCountedDown;
              cloned[cloned.length - 1].withoutCategory += timeCountedDown;
            }
          }

          if (!doesTodayPomodoroStatExist) {
            let dailyPomos: DayStat = {
              date: todayDateStr,
              timestamp: startTime,
              dayOfWeek: days[today.getDay()],
              total: timeCountedDown,
              withCategories: createInitialCategoryStat(),
              withoutCategory: 0,
            };
            // if (currentCategoryName !== null) {
            if (nameOfCurrentCategory !== undefined) {
              dailyPomos.withCategories[nameOfCurrentCategory].duration =
                timeCountedDown;
            } else {
              dailyPomos.withoutCategory += timeCountedDown;
            }
            cloned.push(dailyPomos);
          }
          // calculateThisWeekData(cloned); // ThisWeekData() is called to calculate weekStat because the "pomoAdded" event occurred today while you are using this app..
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
        }
      });
    });

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
          {/* Grid의 넓이가 최종적으로 rechart의 responsiveContainer때문에 너무 유동적인 것 같고...
      뭔가 최소한의 넓이로 결정되는 것 같음. flex item일 경우..
      그래서 basis로 강제로 80% 때려 넣어서 대충 해결했는데 원리는 잘 모르겠어 */}
          {/* intrinsic (width) size가 너무 작네?..  */}
          {/* flex-basis로 전체 다 먹게 하면 grid.styled.tsx에서 정한 max-width default값을 가져감. */}
          <Grid rowGap="12px">
            <GridItem>
              <Overview sum={sum} />
            </GridItem>
            <GridItem>
              {weekRange && (
                <StackedGraph
                  statData={statData}
                  weekStatForThisWeek={weekStat}
                  c_info_list={c_info_list}
                  weekRangeForThisWeek={weekRange}
                  averageForThisWeek={average}
                />
              )}
            </GridItem>
            <GridItem>
              {weekRange && (
                <CategoryGraph
                  statData={statData}
                  weekStatForThisWeek={weekStat}
                  c_info_list={c_info_list}
                  weekRangeForThisWeek={weekRange}
                  isUnCategorizedOnStat={isUnCategorizedOnStat}
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
                        backgroundColor: FOREGROUND_COLOR,
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
          </Grid>
        </div>
      )}
    </main>
  );
}
