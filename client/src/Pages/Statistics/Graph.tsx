import { BoxShadowWrapper } from "../../Components/Wrapper";
import { LeftArrow, RightArrow } from "../../Components/Icons/ChevronArrows";
import {
  AreaChart,
  Area,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  TooltipProps,
} from "recharts";
import { CertainWeek, StatArrType } from "./statRelatedTypes";

type GraphProps = {
  setPrevWeek: (statArray: StatArrType) => void;
  setNextWeek: (statArray: StatArrType) => void;
  weekRange: string;
  statArr: StatArrType;
  average: number;
  week: CertainWeek;
};
export function Graph(props: GraphProps) {
  const { setPrevWeek, setNextWeek, weekRange, statArr, average, week } = props;
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
        <LeftArrow handleClick={() => setPrevWeek(statArr)} />
        <p>{weekRange}</p>
        <RightArrow handleClick={() => setNextWeek(statArr)} />
      </div>

      <ResponsiveContainer width="100%" height={300}>
        <AreaChart
          data={week}
          margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
        >
          <defs>
            <linearGradient id="color" x1="0" y1="0" x2="0" y2="1">
              <stop offset={"0%"} stopColor="#0740c7" stopOpacity={0.4} />
              <stop offset={"75%"} stopColor="#0740c7" stopOpacity={0.05} />
            </linearGradient>
            <linearGradient id="colorUv" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8} />
              <stop offset="95%" stopColor="#8884d8" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="colorPv" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#a3d4f9" stopOpacity={0.8} />
              <stop offset="95%" stopColor="#a3d4f9" stopOpacity={0} />
            </linearGradient>
          </defs>

          <Area
            type="monotone"
            dataKey="total"
            dot={{
              strokeWidth: 1.5,
              r: 3,
              fill: "#ffffff",
            }}
            stroke="#302783"
            strokeWidth={1.5}
            fillOpacity={1}
            fill="url(#color)"
          />
          <XAxis dataKey="dayOfWeek" axisLine={false} tickLine={false} />

          <YAxis axisLine={false} tickLine={false} tick={false} />
          <ReferenceLine
            y={average}
            label={`Average ${Math.floor(average / 60)}h ${average % 60}m`}
            stroke="#ed8262"
            strokeDasharray="3 3"
          />

          <Tooltip content={CustomTooltip} />
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
  label,
}: TooltipProps<number, string>) {
  if (active && payload && payload.length) {
    return (
      <div
        style={{
          borderRadius: "0.25rem",
          background: "#26313c",
          color: "#fff",
          padding: "1rem",
          boxShadow: "15px 30px 40px 5px rgba(0, 0, 0, 0.5)",
          textAlign: "center",
        }}
      >
        <h4>{payload[0].payload.date}</h4>
        <p>
          {payload[0].value !== undefined
            ? `${Math.trunc(payload[0].value / 60)}h ${payload[0].value % 60}m`
            : ""}
        </p>
        <p>{payload[0].value}m</p>
      </div>
    );
  }
}
