import { useEffect, useState } from "react";
import {
  CategoryDetail,
  WeekStat,
  WeekStatWithGoal,
} from "../statRelatedTypes";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  TooltipProps,
  XAxis,
  YAxis,
} from "recharts";
import {
  LeftArrow,
  RightArrow,
} from "../../../ReusableComponents/Icons/ChevronArrows";
import { endOfISOWeek, startOfISOWeek } from "date-fns";
import { getHHmm } from "./StackedGraph";
import { useBoundedPomoInfoStore } from "../../../zustand-stores/pomoInfoStoreUsingSlice";
import {
  getMessageForRemainingDuration,
  roundTo_X_DecimalPoints,
} from "../../../utils/number-related-utils";

export function WeeklyTrendStacked({
  weeklyTrend,
  listOfCategoryDetails,
  colorForUnCategorized,
}: {
  weeklyTrend: WeekStat[];
  listOfCategoryDetails: CategoryDetail[];
  colorForUnCategorized: string;
}) {
  const INITIAL_COUNT = 10; // 나중에 이거 input으로 받을 수 있게 하면 좋을 듯.
  const weeklyGoal = useBoundedPomoInfoStore((state) => state.goals.weeklyGoal);
  const [localWeeklyTrend, setLocalWeeklyTrend] = useState<WeekStat[]>(() => {
    return structuredClone(weeklyTrend);
  });
  const [count, setCount] = useState(INITIAL_COUNT);
  const [start, setStart] = useState(() =>
    Math.max(localWeeklyTrend.length - INITIAL_COUNT, 0)
  );

  function selectPreviousTenWeekData() {
    if (start === 0) {
      alert("No more data");
    } else if (localWeeklyTrend.length <= count) {
      alert("No more data");
    } else {
      let newStart = start - INITIAL_COUNT;
      if (newStart < 0) newStart = 0;

      setStart(newStart);
    }
  }
  function selectNextTenWeekData() {
    if (start === localWeeklyTrend.length - count) {
      alert("No more data");
    } else if (localWeeklyTrend.length <= count) {
      alert("No more data");
    } else {
      let newStart = start + INITIAL_COUNT;
      if (newStart > localWeeklyTrend.length - count)
        newStart = localWeeklyTrend.length - count;
      setStart(newStart);
    }
  }

  useEffect(() => {
    setLocalWeeklyTrend(weeklyTrend);
  }, [weeklyTrend]);

  //#region With Goals
  const slicedLocalWeeklyTrend = localWeeklyTrend.slice(start, start + count);
  const combinedWithGoals: WeekStatWithGoal[] = slicedLocalWeeklyTrend.map(
    (weekStat, index) => {
      let cloned = structuredClone(weekStat); // TODO: is this unnecessary since we are not going to modify this value?

      return {
        ...cloned,
        goal: {
          minimum: weeklyGoal.minimum * 60,
          ideal: weeklyGoal.ideal * 60,
        },
      };
    }
  );
  const maxValueOfData = Math.max(
    ...combinedWithGoals.map((stat) => stat.total ?? 0),
    weeklyGoal.ideal * 60
  );
  let mintuesRemoved = removeMintues(maxValueOfData);
  const maxTickOfYAxis = roundUpToNearest_X_hour(mintuesRemoved, 300);
  const desirableTickCount = maxTickOfYAxis / 300 + 1;
  const ticks: number[] = [];
  for (let i = 0; i < desirableTickCount; i++) {
    ticks.push(i * 300);
  }
  //#endregion

  function removeMintues(hhmm: number) {
    return hhmm - (hhmm % 60);
  }
  function roundUpToNearest_X_hour(hhmm: number, X: number) {
    return hhmm + (X - (hhmm % X));
  }

  //#region Calculate week range
  let range = "";
  if (slicedLocalWeeklyTrend.length !== 0) {
    const startOfCorrespondingWeek = startOfISOWeek(
      slicedLocalWeeklyTrend[0].timestampOfFirstDate
    );
    const endOfCorrespondingWeek = endOfISOWeek(
      slicedLocalWeeklyTrend[slicedLocalWeeklyTrend.length - 1]
        .timestampOfFirstDate
    );
    range = `${startOfCorrespondingWeek.toLocaleDateString()} ~ ${endOfCorrespondingWeek.toLocaleDateString()}`;
  }
  //#endregion

  return (
    <>
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
        <LeftArrow handleClick={() => selectPreviousTenWeekData()} />
        <p>{range}</p>
        <RightArrow handleClick={() => selectNextTenWeekData()} />
      </div>
      <ResponsiveContainer width={"100%"} minHeight={300}>
        <AreaChart
          data={combinedWithGoals}
          margin={{ top: 20, right: 30, left: 20, bottom: 0 }}
        >
          <defs></defs>

          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey={"weekNumber"}
            tickFormatter={(value: string, index: number) => "W" + value}
          />
          <YAxis
            domain={[0, maxTickOfYAxis]}
            ticks={ticks}
            tickFormatter={(val: any) => {
              return `${val / 60}h`;
            }}
            interval={0}
          />
          <Tooltip isAnimationActive={true} content={CustomTooltip} />
          <ReferenceLine
            y={weeklyGoal.minimum * 60}
            // label={getHHmm(weeklyGoal.minimum * 60)}
            label={{
              position: "center",
              value: getHHmm(weeklyGoal.minimum * 60),
              fill: "#12489e",
            }}
            stroke="#4081e9"
          />
          <ReferenceLine
            y={weeklyGoal.ideal * 60}
            // label={getHHmm(weeklyGoal.ideal * 60)}
            label={{
              position: "center",
              value: getHHmm(weeklyGoal.ideal * 60),
              fill: "#0e8b48",
            }}
            stroke="#5cca90"
          />
          {listOfCategoryDetails.map((detail, index) => {
            return (
              <Area
                key={index}
                type="monotone"
                stackId={1}
                dot={{
                  strokeWidth: 1.5,
                  r: 3,
                  fill: "#ffffff",
                }}
                dataKey={`subtotalByCategory.${detail.name}.duration`}
                stroke={detail.color}
                strokeWidth={2}
                fillOpacity={0.3}
                fill={detail.color}
                name={detail.name}
              />
            );
          })}
          <Area
            type="monotone"
            dataKey="withoutCategory"
            stackId={1}
            dot={{
              strokeWidth: 1.5,
              r: 3,
              fill: "#ffffff",
            }}
            stroke={colorForUnCategorized}
            strokeWidth={2}
            fillOpacity={0.3}
            fill={colorForUnCategorized}
            name="Uncategorized"
          />
        </AreaChart>
      </ResponsiveContainer>
    </>
  );
}

function CustomTooltip(prop: TooltipProps<number, string>) {
  const {
    active,
    payload,
    label, // dayOfWeek: e.g., Wed, Thu, etc., which are the values for the X axis.
  } = prop;

  if (active && payload && payload.length) {
    const startOfCorrespondingWeek = startOfISOWeek(
      payload[0].payload.timestampOfFirstDate
    );
    const endOfCorrespondingWeek = endOfISOWeek(
      payload[payload.length - 1].payload.timestampOfFirstDate
    );

    const minimum = payload[0].payload.goal.minimum;
    const ideal = payload[0].payload.goal.ideal;
    const weekTotal = payload[0].payload.total;
    const minimumGoalRateInPercent = roundTo_X_DecimalPoints(
      (weekTotal / minimum) * 100,
      1
    ); // Round to one decimal point
    const idealGoalRateInPercent = roundTo_X_DecimalPoints(
      (weekTotal / ideal) * 100,
      1
    );

    const remainingUntilMinimum = minimum - weekTotal;
    const remainingUntilIdeal = ideal - weekTotal;

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
          W{label} ({startOfCorrespondingWeek.toLocaleDateString()} ~{" "}
          {endOfCorrespondingWeek.toLocaleDateString()})
        </p>
        {payload.map((dayData, index) => {
          return (
            <div key={index}>
              {index === 0 && (
                <div>
                  <p
                    style={{
                      fontWeight: "bold",
                      fontStyle: "italic",
                      textAlign: "center",
                    }}
                  >
                    Total: {getHHmm(dayData.payload.total)}
                  </p>
                  <div
                    style={{ display: "flex", justifyContent: "space-evenly" }}
                  >
                    <p style={{ color: "#4081e9" }}>
                      {minimumGoalRateInPercent}%
                    </p>
                    <p style={{ color: "#5cca90" }}>
                      {idealGoalRateInPercent}%
                    </p>
                  </div>
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
                <p>{dayData.name}:</p>
                <p>{getHHmm(dayData.value)}</p>
              </div>
              <p
                style={{
                  fontStyle: "italic",
                }}
              >
                {index === payload.length - 1 &&
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

  return null; // Return null if `active` or `payload` is invalid
}
