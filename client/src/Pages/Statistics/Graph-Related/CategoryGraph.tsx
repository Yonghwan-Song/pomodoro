import { BoxShadowWrapper } from "../../../ReusableComponents/Wrapper";
import {
  LeftArrow,
  RightArrow,
} from "../../../ReusableComponents/Icons/ChevronArrows";
import {
  AreaChart,
  Area,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  TooltipProps,
  CartesianGrid,
} from "recharts";
import {
  CategoryDetail,
  CategorySubtotal,
  DayStat,
  DayStatForGraph,
  StatDataForGraph_DailyPomoStat,
} from "../statRelatedTypes";
import { useState, useEffect } from "react";
import { startOfWeek, endOfWeek } from "date-fns";

type GraphProps = {
  statData: DayStat[] | null;
  dailyStatOfThisWeek: DayStatForGraph[];
  listOfCategoryDetails: CategoryDetail[];
  weekRangeForThisWeek: string;
  isUnCategorizedOnStat: boolean;
  colorForUnCategorized: string;
};

export function CategoryGraph({
  statData,
  dailyStatOfThisWeek,
  listOfCategoryDetails,
  weekRangeForThisWeek,
  isUnCategorizedOnStat,
  colorForUnCategorized,
}: GraphProps) {
  const [dailyStatOfWeek, setDailyStatOfWeek] = useState<DayStatForGraph[]>(
    structuredClone(dailyStatOfThisWeek)
  );

  const [weekStart, setWeekStart] = useState(
    startOfWeek(new Date(), { weekStartsOn: 1 }).getTime()
  );
  const [weekEnd, setWeekEnd] = useState(
    endOfWeek(new Date(), { weekStartsOn: 1 }).getTime()
  );
  const [weekRange, setWeekRange] = useState(weekRangeForThisWeek);
  const _24h = 24 * 60 * 60 * 1000;

  useEffect(() => {
    let today = new Date();
    const todayDateStr = `${
      today.getMonth() + 1
    }/${today.getDate()}/${today.getFullYear()}`;
    if (
      // statData가 존재하고, []이 아니여야함.
      statData &&
      statData.length !== 0 &&
      // 만약 유저가 이번주 통계를 보고있으면,
      dailyStatOfWeek[0].timestamp ===
        startOfWeek(new Date(), { weekStartsOn: 1 }).getTime() &&
      statData[statData.length - 1].date === todayDateStr
    ) {
      // console.log(statData[statData.length - 1]);
      setDailyStatOfWeek((prev) => {
        const updated = prev.map((dayStat) => {
          // 전제: ===의 오른쪽 operand는 이번주 데이터다. 왜냐하면, 나는 이 side effect이 무조건 이 앱을 사용하는 그 당일 (즉, 오늘)에만 일어나기 때문에,
          // 그런데 이게 이번주 일요일에 저번주 일요일 데이터를 집어넣는 꼴이 되서 버그가 생겼다.
          if (dayStat.dayOfWeek === statData[statData.length - 1].dayOfWeek) {
            dayStat.total = statData[statData.length - 1].total;
            dayStat.withoutCategory =
              statData[statData.length - 1].withoutCategory;
            dayStat.subtotalByCategory = JSON.parse(
              JSON.stringify(statData[statData.length - 1].subtotalByCategory)
            );
          }

          return dayStat;
        });

        return updated;
      });
    }
  }, [statData]);

  //#region Utils
  /**
   * Purpose:  to filter the statArray to get the array of one week after the week currently appearing on the chart
   *           and set the week state to the filtered array.
   *           An average and weekRange are calcuated and set using the filtered array.
   * @param {*} pomodoroDailyStat the data retrieved from database e.g. [{date:"8/29/2022", timestamp: 1661745600000, dayOfWeek: "Mon", total: 700},...]
   */
  function calculateNextWeekData(
    pomodoroDailyStat: StatDataForGraph_DailyPomoStat | null
  ) {
    let weekCloned = [...dailyStatOfWeek];

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
        delete weekCloned[i].subtotalByCategory;
        delete weekCloned[i].withoutCategory;
        weekCloned[i].timestamp = newWeekStart + i * _24h;
      }
      setWeekStart(newWeekStart);
      setWeekEnd(newWeekEnd);

      let correspondingWeekData = extractWeekData(pomodoroDailyStat!, [
        newWeekStart,
        newWeekEnd,
      ]);

      fillWeekCloned(weekCloned, correspondingWeekData);

      // let sum = correspondingWeekData.reduce((acc, cur) => {
      //   return acc + cur.total;
      // }, 0);
      // if (
      //   newWeekStart === startOfWeek(new Date(), { weekStartsOn: 1 }).getTime()
      // ) {
      //   setAverage(Math.trunc(sum / new Date().getDay()));
      // } else {
      //   setAverage(Math.trunc(sum / 7));
      // }

      setWeekRange(
        `${weekCloned[0].date
          .slice(0, -5)
          .replace("/", ". ")} - ${weekCloned[6].date
          .slice(0, -5)
          .replace("/", ". ")}`
      );
      setDailyStatOfWeek(weekCloned);
    }
  }

  /**
   * Purpose:  to filter the statArray to get the array of one week before the week currently appearing on the chart
   *           and set the week state to the filtered array.
   *           An average and weekRange are calcuated and set using the filtered array.
   * @param {DayStat[]} pomodoroDailyStat the data retrieved from database e.g. [{date:"8/29/2022", timestamp: 1661745600000, dayOfWeek: "Mon", total: 700},...]
   */
  function calculatePrevWeekData(
    pomodoroDailyStat: StatDataForGraph_DailyPomoStat | null
  ) {
    let weekCloned = [...dailyStatOfWeek];
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

    let correspondingWeekData = extractWeekData(pomodoroDailyStat!, [
      newWeekStart,
      newWeekEnd,
    ]);
    fillWeekCloned(weekCloned, correspondingWeekData);

    // let sum = correspondingWeekData.reduce((acc, cur) => {
    //   return acc + cur.total;
    // }, 0);
    // setAverage(Math.trunc(sum / 7));
    setWeekRange(
      `${weekCloned[0].date
        .slice(0, -5)
        .replace("/", ". ")} - ${weekCloned[6].date
        .slice(0, -5)
        .replace("/", ". ")}`
    );
    setDailyStatOfWeek(weekCloned);
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
    // console.log(
    //   "inside createInitialCategoryStat---------------------------------"
    // );
    // console.log(c_info_list);
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
    // console.log(retVal);
    return retVal;
  }
  //#endregion

  //#region Calculate tickCount
  const maxCandidatesOfEachCategory = listOfCategoryDetails.map(
    (categoryDetail) => {
      if (categoryDetail.isOnStat) {
        return getMaxOfWeek(dailyStatOfWeek, categoryDetail);
      } else {
        return 0;
      }
    }
  );

  /**
   * To get the max value of a category's stat in a week
   *
   * @param dailyStatOfWeek
   * @param categoryDetail
   */
  function getMaxOfWeek(
    dailyStatOfWeek: DayStatForGraph[],
    categoryDetail: CategoryDetail
  ) {
    const durationArray = dailyStatOfWeek.map((stat) =>
      stat.subtotalByCategory !== undefined
        ? stat.subtotalByCategory[categoryDetail.name].duration
        : 0
    );
    return Math.max(...durationArray);
  }

  let maxOfUnCategorized = 0;
  if (isUnCategorizedOnStat) {
    let arr = dailyStatOfWeek.map((stat) => stat.withoutCategory ?? 0);
    maxOfUnCategorized = Math.max(...arr);
  }

  const maxValueOfData = Math.max(
    ...maxCandidatesOfEachCategory,
    maxOfUnCategorized
  );
  const maxTickOfYAxis = maxValueOfData - (maxValueOfData % 60) + 60;
  const desirableTickCount = maxTickOfYAxis / 60 + 1;
  const ticks: number[] = [];
  for (let i = 0; i < desirableTickCount; i++) {
    ticks.push(i * 60);
  }
  //#endregion

  return (
    <BoxShadowWrapper>
      <div
        style={{
          position: "absolute",
          display: "flex",
          right: "5px",
          top: "6px",
          zIndex: 2,
        }}
      >
        <LeftArrow handleClick={() => calculatePrevWeekData(statData)} />
        <p style={{ width: "95px", textAlign: "center" }}>{weekRange}</p>
        <RightArrow handleClick={() => calculateNextWeekData(statData)} />
      </div>

      <ResponsiveContainer width="100%" height={300}>
        <AreaChart
          data={dailyStatOfWeek}
          margin={{ top: 10, right: 10, left: -27, bottom: -10 }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey={"dayOfWeek"} />
          {/* //*IMPT: Since these Area Graphs are not stacked, dataMax parameter in the callback below changes depending on what areas we select to draw on the graph. */}
          {/* //*Therefore, tickCount should be calculated differently than we did at the `StackedGraph.tsx` */}
          <YAxis
            domain={[0, maxTickOfYAxis]}
            ticks={ticks}
            tickFormatter={(val: any) => {
              return `${val / 60}h`;
            }}
            interval={0}
          />
          <Tooltip isAnimationActive={true} content={CustomTooltip} />
          {listOfCategoryDetails.map((detail, index) => {
            return (
              detail.isOnStat && (
                <Area
                  key={index}
                  type="monotone"
                  dot={{
                    strokeWidth: 1.5,
                    r: 3,
                    fill: "#ffffff",
                  }}
                  dataKey={`subtotalByCategory.${detail.name}.duration`}
                  stroke={detail.color}
                  strokeWidth={1.5}
                  fillOpacity={0}
                  // fill="url(#color)"
                  name={detail.name}
                />
              )
            );
          })}
          {isUnCategorizedOnStat && (
            <Area
              type="monotone"
              dataKey="withoutCategory"
              dot={{
                strokeWidth: 1.5,
                r: 3,
                fill: "#ffffff",
              }}
              stroke={colorForUnCategorized}
              strokeWidth={1.5}
              fillOpacity={0}
              fill="url(#color)"
              name="Uncategorized"
            />
          )}
        </AreaChart>
      </ResponsiveContainer>
    </BoxShadowWrapper>
  );
}

/**
 * payload[0] is like below 
 * 
    {
        "stroke": "#302783",
        "strokeWidth": 1.5,
        "fillOpacity": 1,
        "fill": "url(#color)",
        "points": [],
        "dataKey": "total",
        "name": "total",
        "color": "#302783",
        "value": 2,
        "payload": {
            "date": "4/26/2023",
            "dayOfWeek": "Wed",
            "timestamp": 1682434800000,
            "total": 2
        }
    }
  
  And, the payload[0].payload is an element of the week array which is passed as the data prop of AreaChart.
 */

// https://stackoverflow.com/questions/65913461/typescript-interface-for-recharts-custom-tooltip
function CustomTooltip({
  active,
  payload,
  label, // dayOfWeek: e.g., Wed, Thu, etc., which are the values for the X axis.
}: TooltipProps<number, string>) {
  if (active && payload && payload.length) {
    return (
      <div
        style={{
          borderRadius: "0.25rem",
          background: "#fff",
          padding: "1rem",
          boxShadow: "15px 30px 40px 5px rgba(0, 0, 0, 0.5)",
          textAlign: "left",
          fontWeight: "bold",
        }}
      >
        <p>
          {label} ({payload[0].payload.date})
        </p>
        {payload.map((dayData, index) => {
          return (
            <div
              key={index}
              style={{
                display: "flex",
                justifyContent: "space-between",
                columnGap: "6px",
                color: dayData.color,
              }}
            >
              <p>{dayData.name}:</p>
              <p>{getHHmm(dayData.value)}</p>
            </div>
          );
        })}
      </div>
    );
  }
}
// <div key={index}>
//   <p style={{ color: dayData.color }}>
//     {dayData.name}: {getHHmm(dayData.value)}
//   </p>
// </div>

function getHHmm(duration: number | undefined) {
  if (duration) {
    return `${Math.trunc(duration / 60)}h ${duration % 60}m`;
  } else {
    return "0m";
  }
}

/**
 *[
    {
        "stroke": "#302783",
        "strokeWidth": 1.5,
        "fillOpacity": 1,
        "fill": "url(#color)",
        "points": [],
        "dataKey": "total",
        "name": "total",
        "color": "#302783",
        "value": 20,
        "payload": {
            "date": "7/10/2024",
            "dayOfWeek": "Wed",
            "timestamp": 1720537200000,
            "total": 20,
            "withCategories": {
                "ETC": 0,
                "Netflix": 6,
                "Project": 8,
                "영어": 0
            },
            "withoutCategory": 6
        }
    },
    {
        "stroke": "#f0dc05",
        "strokeWidth": 1.5,
        "fillOpacity": 1,
        "fill": "url(#color)",
        "name": "ETC",
        "points": [],
        "dataKey": "withCategories.ETC",
        "color": "#f0dc05",
        "value": 0,
        "payload": {
            "date": "7/10/2024",
            "dayOfWeek": "Wed",
            "timestamp": 1720537200000,
            "total": 20,
            "withCategories": {
                "ETC": 0,
                "Netflix": 6,
                "Project": 8,
                "영어": 0
            },
            "withoutCategory": 6
        }
    },
    {
        "stroke": "#c1988a",
        "strokeWidth": 1.5,
        "fillOpacity": 1,
        "fill": "url(#color)",
        "name": "Netflix", //!<------------------------------
        "points": [],
        "dataKey": "withCategories.Netflix",
        "color": "#c1988a", //!<------------------------------
        "value": 6,  //!<------------------------------
        "payload": {
            "date": "7/10/2024",
            "dayOfWeek": "Wed",
            "timestamp": 1720537200000,
            "total": 20,
            "withCategories": {
                "ETC": 0,
                "Netflix": 6,
                "Project": 8,
                "영어": 0
            },
            "withoutCategory": 6
        }
    },
    {
        "stroke": "#05f0a9",
        "strokeWidth": 1.5,
        "fillOpacity": 1,
        "fill": "url(#color)",
        "name": "Project",
        "points": [],
        "dataKey": "withCategories.Project",
        "color": "#05f0a9",
        "value": 8,
        "payload": {
            "date": "7/10/2024",
            "dayOfWeek": "Wed",
            "timestamp": 1720537200000,
            "total": 20,
            "withCategories": {
                "ETC": 0,
                "Netflix": 6,
                "Project": 8,
                "영어": 0
            },
            "withoutCategory": 6
        }
    },
    {
        "stroke": "#629ad5",
        "strokeWidth": 1.5,
        "fillOpacity": 1,
        "fill": "url(#color)",
        "name": "영어",
        "points": [],
        "dataKey": "withCategories.영어",
        "color": "#629ad5",
        "value": 0,
        "payload": {
            "date": "7/10/2024",
            "dayOfWeek": "Wed",
            "timestamp": 1720537200000,
            "total": 20,
            "withCategories": {
                "ETC": 0,
                "Netflix": 6,
                "Project": 8,
                "영어": 0
            },
            "withoutCategory": 6
        }
    }
]
 */
