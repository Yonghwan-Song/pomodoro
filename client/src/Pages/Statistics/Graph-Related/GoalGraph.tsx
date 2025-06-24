import { useEffect, useState } from "react";
import {
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid,
  TooltipProps,
  BarChart,
  Bar,
} from "recharts";
import {
  CategoryDetail,
  CategorySubtotal,
  DayStat,
  DayStatForGraph,
  DayStatWithGoal,
  StatDataForGraph_DailyPomoStat,
} from "../statRelatedTypes";
import { endOfWeek, startOfWeek } from "date-fns";
import { BoxShadowWrapper } from "../../../ReusableComponents/Wrapper";
import { useBoundedPomoInfoStore } from "../../../zustand-stores/pomoInfoStoreUsingSlice";
import {
  LeftArrow,
  RightArrow,
} from "../../../ReusableComponents/Icons/ChevronArrows";
import { _24h } from "../../../constants";
import {
  getHHmm,
  getMessageForRemainingDuration,
  roundTo_X_DecimalPoints,
} from "../../../utils/number-related-utils";

type GoalGraphProps = {
  statData: StatDataForGraph_DailyPomoStat | null;
  dailyStatOfThisWeek: DayStatForGraph[];
  weekRangeForThisWeek: string;
  listOfCategoryDetails: CategoryDetail[];
  averageForThisWeek: number;
  colorForUnCategorized: string;
};

export default function GoalGraph({
  statData,
  dailyStatOfThisWeek,
  listOfCategoryDetails,
  weekRangeForThisWeek,
  averageForThisWeek,
  colorForUnCategorized,
}: GoalGraphProps) {
  const dailyGoals = useBoundedPomoInfoStore((state) => state.goals.dailyGoals);
  const [dailyStatOfWeekWithGoal, setDailyStatOfWeekWithGoal] = useState<
    DayStatWithGoal[]
  >(() => {
    let cloned = structuredClone(dailyStatOfThisWeek); //TODO unnecessary?

    return cloned.map((dayStat, index) => {
      let withGoals: DayStatWithGoal = {
        ...structuredClone(dayStat),
        goal: {
          minimum: dailyGoals[index].minimum * 60,
          ideal: dailyGoals[index].ideal * 60,
          gap: dailyGoals[index].ideal * 60 - dailyGoals[index].minimum * 60,
        },
      };

      return withGoals;
    });
  });
  const [weekStart, setWeekStart] = useState(
    startOfWeek(new Date(), { weekStartsOn: 1 }).getTime()
  );
  const [weekEnd, setWeekEnd] = useState(
    endOfWeek(new Date(), { weekStartsOn: 1 }).getTime()
  );
  const [weekRange, setWeekRange] = useState(weekRangeForThisWeek);

  //#region This side effect is not necessary
  //* When? - another component rendered in `/statistics` updates daily goals.
  //* But I guess that will never happen...
  // useEffect(() => {
  //   //* update dailyStatWithGoals
  // }, [dailyGoals]);
  //#endregion

  // useEffect(() => {
  //   console.log("dailyStatOfWeekWithGoal", dailyStatOfWeekWithGoal);
  // }, [dailyStatOfWeekWithGoal]);

  useEffect(() => {
    let today = new Date();
    const todayDateStr = `${
      today.getMonth() + 1
    }/${today.getDate()}/${today.getFullYear()}`;
    if (
      // statData가 존재하고, []이 아니여야함.
      statData &&
      statData.length !== 0 &&
      dailyStatOfWeekWithGoal[0].timestamp ===
        startOfWeek(new Date(), { weekStartsOn: 1 }).getTime() &&
      statData[statData.length - 1].date === todayDateStr
    ) {
      setDailyStatOfWeekWithGoal((prev) => {
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

  //#region
  const maxValueOfData = Math.max(
    ...dailyStatOfWeekWithGoal.map((stat) => {
      if (stat.total)
        return stat.total >= stat.goal.ideal ? stat.total : stat.goal.ideal;
      else return stat.goal.ideal;
    })
  );
  const maxTickOfYAxis = maxValueOfData - (maxValueOfData % 60) + 60;
  const desirableTickCount = maxTickOfYAxis / 60 + 1;
  const ticks: number[] = [];
  for (let i = 0; i < desirableTickCount; i++) {
    ticks.push(i * 60);
  }

  // console.log("maxTick", maxTickOfYAxis);
  // console.log("ticks from GoalGraph", ticks);
  //#endregion

  /**
   * Purpose:  to filter the statArray to get the array of one week after the week currently appearing on the chart
   *           and set the week state to the filtered array.
   *           An average and weekRange are calcuated and set using the filtered array.
   * @param {*} pomodoroDailyStat the data retrieved from database e.g. [{date:"8/29/2022", timestamp: 1661745600000, dayOfWeek: "Mon", total: 700},...]
   */
  function calculateNextWeekData(
    pomodoroDailyStat: StatDataForGraph_DailyPomoStat | null
  ) {
    let weekCloned = [...dailyStatOfWeekWithGoal];

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

      setWeekRange(
        `${weekCloned[0].date
          .slice(0, -5)
          .replace("/", ". ")} - ${weekCloned[6].date
          .slice(0, -5)
          .replace("/", ". ")}`
      );
      setDailyStatOfWeekWithGoal(weekCloned);
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
    let weekCloned = [...dailyStatOfWeekWithGoal];
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

    setWeekRange(
      `${weekCloned[0].date
        .slice(0, -5)
        .replace("/", ". ")} - ${weekCloned[6].date
        .slice(0, -5)
        .replace("/", ". ")}`
    );
    setDailyStatOfWeekWithGoal(weekCloned);
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
      <ResponsiveContainer width="100%" minHeight={300}>
        <BarChart
          data={dailyStatOfWeekWithGoal}
          margin={{ top: 10, right: 10, left: -27, bottom: -10 }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="dayOfWeek" />
          <YAxis
            domain={[0, maxTickOfYAxis]}
            ticks={ticks}
            tickFormatter={(val: any) => {
              return `${val / 60}h`;
            }}
            interval={0}
          />
          <Tooltip isAnimationActive={true} content={CustomTooltip} />
          <Bar dataKey={"goal.minimum"} fill="#4081e9" stackId={"a"} />
          <Bar dataKey={"goal.gap"} fill="#5cca90" stackId={"a"} />
          <Bar dataKey="total" fill="#ffc658" />
          {/* <Bar dataKey="total" fill="#e0b73e" /> */}
        </BarChart>
      </ResponsiveContainer>
    </BoxShadowWrapper>
  );
}

function CustomTooltip({
  active,
  payload,
  label, // dayOfWeek: e.g., Wed, Thu, etc., which are the values for the X axis.
}: TooltipProps<number, string>) {
  if (active && payload && payload.length) {
    const minimum = payload[0].payload.goal.minimum;
    const ideal = payload[0].payload.goal.ideal;
    const todayTotal = payload[0].payload.total;
    const minimumGoalRateInPercent = roundTo_X_DecimalPoints(
      (todayTotal / minimum) * 100,
      1
    ); // Round to two decimal points
    const idealGoalRateInPercent = roundTo_X_DecimalPoints(
      (todayTotal / ideal) * 100,
      1
    );
    // const percentRoundedToTwoDecimalPoints =
    //   Math.round(minimumGoalRateInPercent * 100) / 100;

    const remainingUntilMinimum = minimum - todayTotal;
    const remainingUntilIdeal = ideal - todayTotal;

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
          let name = "";
          let duration = 0;
          if (dayData.name === "goal.minimum") {
            name = "Minimum";
            duration = minimum;
          } else if (dayData.name === "goal.gap") {
            name = "Ideal";
            duration = ideal;
          } else if (dayData.name === "total") {
            name = "Today";
            duration = todayTotal;
          }

          return (
            <div key={index}>
              {index === 0 && todayTotal !== undefined && (
                <div
                  style={{ display: "flex", justifyContent: "space-evenly" }}
                >
                  <p style={{ color: "#4081e9" }}>
                    {minimumGoalRateInPercent}%
                  </p>
                  <p style={{ color: "#5cca90" }}>{idealGoalRateInPercent}%</p>
                </div>
              )}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  columnGap: "6px",
                  color: dayData.color,
                }}
              >
                <p>{name}:</p>
                <p>{getHHmm(duration)}</p>
              </div>
              <p
                style={{
                  fontStyle: "italic",
                }}
              >
                {index === 2 &&
                  getMessageForRemainingDuration(
                    remainingUntilMinimum,
                    remainingUntilIdeal
                  )}
              </p>
            </div>
          );
        })}
      </div>
    );
  }
}

//#region Different color
// function getMessageForRemainingDuration(
//   remainingUntilMinimum: number,
//   remainingUntilIdeal: number
// ) {
//   if (remainingUntilMinimum > 0)
//     return (
//       <span>
//         <span style={{ color: "#F04005" }}>
//           {getHHmm(remainingUntilMinimum)}
//         </span>{" "}
//         <span style={{ color: "#4081e9" }}>left until minimum</span>
//       </span>
//     );
//   else if (remainingUntilMinimum <= 0 && remainingUntilIdeal > 0)
//     return (
//       <>
//         <span>
//           <span style={{ color: "#F04005" }}>
//             {getHHmm(Math.abs(remainingUntilMinimum))}
//           </span>{" "}
//           <span style={{ color: "#4081e9" }}>beyond minimum</span>
//         </span>
//         <br />
//         <span>
//           <span style={{ color: "#F04005" }}>
//             {getHHmm(remainingUntilIdeal)}
//           </span>{" "}
//           <span style={{ color: "#5cca90" }}>left until ideal</span>
//         </span>
//       </>
//     );
//   else
//     return (
//       <span>
//         <span style={{ color: "#F04005" }}>
//           {getHHmm(Math.abs(remainingUntilIdeal))}
//         </span>{" "}
//         <span style={{ color: "#5cca90" }}>beyond ideal</span>
//       </span>
//     );
// }
//#endregion
