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
  CategoryInfoForStat,
  CategoryStat,
  DayStat,
  DayStatForGraph,
  StatDataForGraph_DailyPomoStat,
} from "../statRelatedTypes";
import { useState, useEffect } from "react";
import { startOfWeek, endOfWeek } from "date-fns";

type GraphProps = {
  statData: DayStat[] | null;
  weekStatForThisWeek: DayStatForGraph[];
  c_info_list: CategoryInfoForStat[];
  weekRangeForThisWeek: string;
  isUnCategorizedOnStat: boolean;
  colorForUnCategorized: string;
};

export function CategoryGraph({
  statData,
  weekStatForThisWeek,
  c_info_list,
  weekRangeForThisWeek,
  isUnCategorizedOnStat,
  colorForUnCategorized,
}: GraphProps) {
  const [localWeekStat, setLocalWeekStat] = useState<DayStatForGraph[]>(
    JSON.parse(JSON.stringify(weekStatForThisWeek))
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
      localWeekStat[0].timestamp ===
        startOfWeek(new Date(), { weekStartsOn: 1 }).getTime() &&
      statData[statData.length - 1].date === todayDateStr
    ) {
      // console.log(statData[statData.length - 1]);
      setLocalWeekStat((prev) => {
        const updated = prev.map((dayStat) => {
          // 전제: ===의 오른쪽 operand는 이번주 데이터다. 왜냐하면, 나는 이 side effect이 무조건 이 앱을 사용하는 그 당일 (즉, 오늘)에만 일어나기 때문에,
          // 그런데 이게 이번주 일요일에 저번주 일요일 데이터를 집어넣는 꼴이 되서 버그가 생겼다.
          if (dayStat.dayOfWeek === statData[statData.length - 1].dayOfWeek) {
            dayStat.total = statData[statData.length - 1].total;
            dayStat.withoutCategory =
              statData[statData.length - 1].withoutCategory;
            dayStat.withCategories = JSON.parse(
              JSON.stringify(statData[statData.length - 1].withCategories)
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
    let weekCloned = [...localWeekStat];

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
        delete weekCloned[i].withCategories;
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
      setLocalWeekStat(weekCloned);
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
    let weekCloned = [...localWeekStat];
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
    setLocalWeekStat(weekCloned);
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
      // console.log(
      //   "matchingStat from weekStatFromData in fillWeekCloned",
      //   matchingStat
      // );
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
    // console.log(retVal);
    return retVal;
  }
  //#endregion

  function getTweakedWeekStat() {
    const tweaked = localWeekStat.map((dayStat) => {
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

      return {
        dayOfWeek: dayStat.dayOfWeek,
        date: dayStat.date,
        timeStamp: dayStat.timestamp,
        total: dayStat.total,
        withCategories: transformed,
        withoutCategory: dayStat.withoutCategory,
      };
    });

    return tweaked;
  }

  return (
    <BoxShadowWrapper
    // inset={true}
    >
      <div
        style={{
          position: "absolute",
          display: "flex",
          right: 0,
          top: "10px",
          marginRight: "20px",
          zIndex: 2,
        }}
      >
        <LeftArrow handleClick={() => calculatePrevWeekData(statData)} />
        <p>{weekRange}</p>
        <RightArrow handleClick={() => calculateNextWeekData(statData)} />
      </div>

      <ResponsiveContainer width="100%" height={300}>
        <AreaChart
          // data={localWeekStat}
          data={getTweakedWeekStat()} //이거 data만 잘 조작하면... {total, withCategoreis: {[_uuid]: {name, duration, isOnStat}}, withoutCategory}로 만들 수 있지 않나? 그러면 category name아무렇게나 막 해도 될 것 같은데?
          margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey={"dayOfWeek"} />
          <YAxis />
          <Tooltip isAnimationActive={true} content={CustomTooltip} />
          {c_info_list.map((c_info, index) => {
            return (
              c_info.isOnStat && (
                <Area
                  key={index}
                  type="monotone"
                  dot={{
                    strokeWidth: 1.5,
                    r: 3,
                    fill: "#ffffff",
                  }}
                  // dataKey={`withCategories.${c_info.name}.duration`}
                  // dataKey={`withCategories[${name}].duration`}
                  dataKey={`withCategories.${c_info._uuid}.duration`}
                  stroke={c_info.color}
                  strokeWidth={1.5}
                  fillOpacity={0}
                  // fill="url(#color)"
                  name={c_info.name}
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
