import { useEffect, useState } from "react";
import { CategoryDetail, WeekStat } from "../statRelatedTypes";
import { BoxShadowWrapper } from "../../../ReusableComponents/Wrapper";
import {
  Area,
  AreaChart,
  CartesianGrid,
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

export function WeeklyTrendStacked({
  weeklyTrend,
  listOfCategoryDetails,
  colorForUnCategorized,
}: {
  weeklyTrend: WeekStat[];
  listOfCategoryDetails: CategoryDetail[];
  colorForUnCategorized: string;
}) {
  console.log("weeklyTrend Prop", weeklyTrend);
  const [localWeeklyTrend, setLocalWeeklyTrend] = useState<WeekStat[]>(
    JSON.parse(JSON.stringify(weeklyTrend))
  );

  const INITIAL_COUNT = 10;

  const [count, setCount] = useState(INITIAL_COUNT);
  const [start, setStart] = useState(() =>
    Math.max(localWeeklyTrend.length - INITIAL_COUNT, 0)
  );

  function selectPreviousTenWeekData() {
    if (start === 0) {
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

  //#region Calculate tickCount
  // const slicedLocalWeeklyTrend = localWeeklyTrend.slice(-10);
  // const slicedLocalWeeklyTrend = localWeeklyTrend.slice(-20, -10);
  const slicedLocalWeeklyTrend = localWeeklyTrend.slice(start, start + count);
  const maxDurationRoundedUp =
    Math.floor(
      Math.max(...slicedLocalWeeklyTrend.map((stat) => stat.total ?? 0)) / 60
    ) + 1; // e.g) 20h 55m -> 21h
  const maxValOfYAxis = maxDurationRoundedUp + (5 - (maxDurationRoundedUp % 5));
  const tickCount = maxValOfYAxis / 5 + 1; // because of 0 at the bottom
  //#endregion

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
    <BoxShadowWrapper>
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
          data={slicedLocalWeeklyTrend}
          margin={{ top: 20, right: 30, left: 20, bottom: 0 }}
        >
          <defs></defs>

          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey={"weekNumber"}
            tickFormatter={(value: string, index: number) => "W" + value}
          />
          <YAxis
            domain={[
              0,
              (dataMax: number) => {
                const roundedUp = Math.floor(dataMax / 60) + 1; // e.g) 20h 55m -> 21h
                /**
                 * This makes the roundedUp a multiple of 5
                 * 21 + (5 - 21 % 5) = 21 + (5 - 1). 21 + 4 = 25
                 */
                const aMultipleOfFive = roundedUp + (5 - (roundedUp % 5));

                return aMultipleOfFive * 60;
              },
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
    </BoxShadowWrapper>
  );
}
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
    const startOfCorrespondingWeek = startOfISOWeek(
      payload[0].payload.timestampOfFirstDate
    );
    const endOfCorrespondingWeek = endOfISOWeek(
      payload[payload.length - 1].payload.timestampOfFirstDate
    );

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
          W{label} ({startOfCorrespondingWeek.toLocaleDateString()} ~
          {endOfCorrespondingWeek.toLocaleDateString()})
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
