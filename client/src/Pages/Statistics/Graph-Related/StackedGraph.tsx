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
  CartesianGrid,
  TooltipProps,
  ReferenceLine,
  LabelList,
} from "recharts";
import {
  CategoryDetail,
  CategorySubtotal,
  DayStat,
  DayStatForGraph,
  StatDataForGraph_DailyPomoStat,
} from "../statRelatedTypes";
import { FunctionComponent, useEffect, useState } from "react";
import { endOfWeek, startOfWeek } from "date-fns";

type GraphProps = {
  statData: StatDataForGraph_DailyPomoStat | null;
  weekStatForThisWeek: DayStatForGraph[];
  weekRangeForThisWeek: string;
  listOfCategoryDetails: CategoryDetail[];
  averageForThisWeek: number;
  colorForUnCategorized: string;
};

export function StackedGraph({
  statData,
  weekStatForThisWeek,
  listOfCategoryDetails,
  weekRangeForThisWeek,
  averageForThisWeek,
  colorForUnCategorized,
}: GraphProps) {
  const [localWeekStat, setLocalWeekStat] = useState<DayStatForGraph[]>(
    JSON.parse(JSON.stringify(weekStatForThisWeek))
    // weekStatForThisWeek
  );
  const [weekStart, setWeekStart] = useState(
    startOfWeek(new Date(), { weekStartsOn: 1 }).getTime()
  );
  const [weekEnd, setWeekEnd] = useState(
    endOfWeek(new Date(), { weekStartsOn: 1 }).getTime()
  );
  const [weekRange, setWeekRange] = useState(weekRangeForThisWeek);
  const [average, setAverage] = useState(averageForThisWeek);
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
      localWeekStat[0].timestamp ===
        startOfWeek(new Date(), { weekStartsOn: 1 }).getTime() &&
      statData[statData.length - 1].date === todayDateStr
    ) {
      // console.log(statData[statData.length - 1]);
      setLocalWeekStat((prev) => {
        const updated = prev.map((dayStat) => {
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

  // console.log("dataArray", localWeekStat);

  const CustomizedLabel: FunctionComponent<any> = (props: any) => {
    const { x, y, stroke, value, index } = props;

    let diff = 0;
    if (index !== 0) {
      let prevValue = localWeekStat[index - 1].total;
      if (prevValue !== undefined) {
        diff = value - prevValue;
      }
    }

    return (
      <text
        x={x}
        y={y}
        dy={-5}
        fill={stroke}
        fontSize={13}
        textAnchor="middle"
        style={{ fontWeight: "bold" }}
      >
        {diff > 0 ? `+${diff}` : diff}
      </text>
    );
  };

  //#region Calculate tickCount
  const maxValOfYAxis =
    Math.floor(Math.max(...localWeekStat.map((stat) => stat.total ?? 0)) / 60) +
    1;
  const tickCount = maxValOfYAxis + 1;
  //#endregion

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
      {/* <ResponsiveContainer width="100%" height={400}> */}
      <ResponsiveContainer width="100%" minHeight={300}>
        <AreaChart
          data={localWeekStat}
          //* IMPT: This margin is applied to the acutal graph that consists of the cartesian grid and the two cartesian axises. And they are  the children of the Surface component the parent of which is the AreaChart.
          margin={{ top: 20, right: 30, left: 20, bottom: 0 }}
        >
          <defs></defs>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="dayOfWeek" />
          <YAxis
            domain={[
              0,
              (dataMax: number) => (Math.floor(dataMax / 60) + 1) * 60,
            ]}
            tickFormatter={(value: any, index: number) => {
              // return `${value / 60}h`;
              const hour = Math.floor(value / 60);
              const min = value % 60;
              return `${hour}h ${min !== 0 ? min + "m" : ""}`;
            }}
            tickCount={tickCount}
          />
          <Tooltip isAnimationActive={true} content={CustomTooltip} />
          {/* c_info_list의 isOnStat을 이용하기 때문에 Stat.withCategories에서 isOnStat은 사실상 현재 없어도 된다. */}
          {listOfCategoryDetails.map((detail, index) => {
            return (
              <Area
                key={index}
                type="monotone"
                stackId={0}
                dot={{
                  strokeWidth: 1.5,
                  r: 3,
                  fill: "#ffffff",
                }}
                dataKey={`subtotalByCategory.${detail.name}.duration`}
                stroke={detail.color}
                strokeWidth={1.5}
                fillOpacity={0.3}
                fill={detail.color}
                name={detail.name}
              />
            );
          })}
          <Area
            type="monotone"
            dataKey="withoutCategory"
            stackId={0}
            dot={{
              strokeWidth: 1.5,
              r: 3,
              fill: "#ffffff",
            }}
            stroke={colorForUnCategorized}
            strokeWidth={1.5}
            fillOpacity={0.3}
            fill={colorForUnCategorized}
            name="Uncategorized"
          >
            <LabelList content={CustomizedLabel} />
          </Area>
          <ReferenceLine
            y={average}
            label={`Average ${Math.floor(average / 60)}h ${average % 60}m`}
            stroke="#b9340b"
            strokeDasharray="3 3"
          />
        </AreaChart>
      </ResponsiveContainer>
    </BoxShadowWrapper>
  );
}

const CustomReferenceLabel = ({
  x = 0,
  y = 0,
  value,
}: {
  x: number;
  y: number;
  value: any;
}) => (
  <text x={x} y={y} dy={-5} fill="#b9340b" fontSize={14} fontWeight="bold">
    {`Average ${Math.floor(value / 60)}h ${value % 60}m`}
  </text>
);

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
  // console.log(`active - ${active}`);
  // console.log(`payload -------->`);
  // console.log(payload);
  // console.log(`label - ${label}`);

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
            <div key={index}>
              <p>{index === 0 && `Total: ${getHHmm(dayData.payload.total)}`}</p>
              <div
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
            </div>
          );
        })}
      </div>
    );
  }
}

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

// 이게... Tooltip의 labelFormatter의 callback의 payload argument이다. (모두 0값인 통계)
//! 그래도 payload[i].date은 동일하다 (i는 0~카테고리 갯수 + 2)
/* [
    {
        "stroke": "#302783",
        "strokeWidth": 1.5,
        "fillOpacity": 1,
        "fill": "url(#color)",
        "name": "total",
        "points": [],
        "dataKey": "total",
        "color": "#302783",
        "value": 0,
        "payload": {
            "date": "7/3/2024",
            "dayOfWeek": "Wed",
            "timestamp": 1719932400000,
            "total": 0,
            "withCategories": {
                "Netflix": {
                    "_uuid": "e435613c-b239-495e-8b43-e5a51673e5de",
                    "duration": 0,
                    "isOnStat": true
                },
                "영어": {
                    "_uuid": "f3cbcadf-d61e-450c-82a7-c374dc0b3aa3",
                    "duration": 0,
                    "isOnStat": true
                },
                "ETC": {
                    "_uuid": "edb072e9-81f6-464b-96fb-dad816a37eff",
                    "duration": 0,
                    "isOnStat": true
                },
                "Personal Project": {
                    "_uuid": "ff364641-ec9f-4e87-8496-b0fa42713786",
                    "duration": 0,
                    "isOnStat": true
                }
            },
            "withoutCategory": 0
        }
    },
    {
        "stroke": "#f96d3e",
        "strokeWidth": 1.5,
        "fillOpacity": 1,
        "fill": "url(#color)",
        "name": "Netflix",
        "points": [],
        "dataKey": "withCategories.Netflix.duration",
        "color": "#f96d3e",
        "value": 0,
        "payload": {
            "date": "7/3/2024",
            "dayOfWeek": "Wed",
            "timestamp": 1719932400000,
            "total": 0,
            "withCategories": {
                "Netflix": {
                    "_uuid": "e435613c-b239-495e-8b43-e5a51673e5de",
                    "duration": 0,
                    "isOnStat": true
                },
                "영어": {
                    "_uuid": "f3cbcadf-d61e-450c-82a7-c374dc0b3aa3",
                    "duration": 0,
                    "isOnStat": true
                },
                "ETC": {
                    "_uuid": "edb072e9-81f6-464b-96fb-dad816a37eff",
                    "duration": 0,
                    "isOnStat": true
                },
                "Personal Project": {
                    "_uuid": "ff364641-ec9f-4e87-8496-b0fa42713786",
                    "duration": 0,
                    "isOnStat": true
                }
            },
            "withoutCategory": 0
        }
    },
    {
        "stroke": "#629ad5",
        "strokeWidth": 1.5,
        "fillOpacity": 1,
        "fill": "url(#color)",
        "name": "영어",
        "points": [],
        "dataKey": "withCategories.영어.duration",
        "color": "#629ad5",
        "value": 0,
        "payload": {
            "date": "7/3/2024",
            "dayOfWeek": "Wed",
            "timestamp": 1719932400000,
            "total": 0,
            "withCategories": {
                "Netflix": {
                    "_uuid": "e435613c-b239-495e-8b43-e5a51673e5de",
                    "duration": 0,
                    "isOnStat": true
                },
                "영어": {
                    "_uuid": "f3cbcadf-d61e-450c-82a7-c374dc0b3aa3",
                    "duration": 0,
                    "isOnStat": true
                },
                "ETC": {
                    "_uuid": "edb072e9-81f6-464b-96fb-dad816a37eff",
                    "duration": 0,
                    "isOnStat": true
                },
                "Personal Project": {
                    "_uuid": "ff364641-ec9f-4e87-8496-b0fa42713786",
                    "duration": 0,
                    "isOnStat": true
                }
            },
            "withoutCategory": 0
        }
    },
    {
        "stroke": "#d56c6c",
        "strokeWidth": 1.5,
        "fillOpacity": 1,
        "fill": "url(#color)",
        "name": "ETC",
        "points": [],
        "dataKey": "withCategories.ETC.duration",
        "color": "#d56c6c",
        "value": 0,
        "payload": {
            "date": "7/3/2024",
            "dayOfWeek": "Wed",
            "timestamp": 1719932400000,
            "total": 0,
            "withCategories": {
                "Netflix": {
                    "_uuid": "e435613c-b239-495e-8b43-e5a51673e5de",
                    "duration": 0,
                    "isOnStat": true
                },
                "영어": {
                    "_uuid": "f3cbcadf-d61e-450c-82a7-c374dc0b3aa3",
                    "duration": 0,
                    "isOnStat": true
                },
                "ETC": {
                    "_uuid": "edb072e9-81f6-464b-96fb-dad816a37eff",
                    "duration": 0,
                    "isOnStat": true
                },
                "Personal Project": {
                    "_uuid": "ff364641-ec9f-4e87-8496-b0fa42713786",
                    "duration": 0,
                    "isOnStat": true
                }
            },
            "withoutCategory": 0
        }
    },
    {
        "stroke": "#46b46c",
        "strokeWidth": 1.5,
        "fillOpacity": 1,
        "fill": "url(#color)",
        "name": "Personal Project",
        "points": [],
        "dataKey": "withCategories.Personal Project.duration",
        "color": "#46b46c",
        "value": 0,
        "payload": {
            "date": "7/3/2024",
            "dayOfWeek": "Wed",
            "timestamp": 1719932400000,
            "total": 0,
            "withCategories": {
                "Netflix": {
                    "_uuid": "e435613c-b239-495e-8b43-e5a51673e5de",
                    "duration": 0,
                    "isOnStat": true
                },
                "영어": {
                    "_uuid": "f3cbcadf-d61e-450c-82a7-c374dc0b3aa3",
                    "duration": 0,
                    "isOnStat": true
                },
                "ETC": {
                    "_uuid": "edb072e9-81f6-464b-96fb-dad816a37eff",
                    "duration": 0,
                    "isOnStat": true
                },
                "Personal Project": {
                    "_uuid": "ff364641-ec9f-4e87-8496-b0fa42713786",
                    "duration": 0,
                    "isOnStat": true
                }
            },
            "withoutCategory": 0
        }
    },
    {
        "stroke": "#581858",
        "strokeWidth": 1.5,
        "fillOpacity": 1,
        "fill": "url(#color)",
        "name": "Uncategorized",
        "points": [],
        "dataKey": "withoutCategory",
        "color": "#581858",
        "value": 0,
        "payload": {
            "date": "7/3/2024",
            "dayOfWeek": "Wed",
            "timestamp": 1719932400000,
            "total": 0,
            "withCategories": {
                "Netflix": {
                    "_uuid": "e435613c-b239-495e-8b43-e5a51673e5de",
                    "duration": 0,
                    "isOnStat": true
                },
                "영어": {
                    "_uuid": "f3cbcadf-d61e-450c-82a7-c374dc0b3aa3",
                    "duration": 0,
                    "isOnStat": true
                },
                "ETC": {
                    "_uuid": "edb072e9-81f6-464b-96fb-dad816a37eff",
                    "duration": 0,
                    "isOnStat": true
                },
                "Personal Project": {
                    "_uuid": "ff364641-ec9f-4e87-8496-b0fa42713786",
                    "duration": 0,
                    "isOnStat": true
                }
            },
            "withoutCategory": 0
        }
    }
] */
