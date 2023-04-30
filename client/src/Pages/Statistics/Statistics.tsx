import axios from "axios";
import { useState } from "react";
import { useEffect } from "react";
import { UserAuth } from "../../Context/AuthContext";
import * as CONSTANTS from "../../constants/index";
import { LeftArrow, RightArrow } from "../../Components/Icons/ChevronArrows";
import { BoxShadowWrapper } from "../../Components/Wrapper";
import { Grid } from "../../Components/Layouts/Grid";
import { GridItem } from "../../Components/Layouts/GridItem";
import { FlexBox } from "../../Components/Layouts/FlexBox";
import { Total } from "../../Components/Total";
import { useWeek } from "./useWeek";
import {
  AreaChart,
  Area,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { User } from "firebase/auth";
import { TooltipProps } from "recharts";
import { pomoType, StatArrType } from "./statRelatedTypes";

export default function Statistics() {
  const { user } = UserAuth()!;
  const [statArr, setStatArr] = useState<StatArrType>([]);
  const {
    todayTotal,
    lastDayTotal,
    thisWeekTotal,
    lastWeekTotal,
    thisMonthTotal,
    lastMonthTotal,
    total,
    calculateOverview,
    week,
    prevWeek,
    nextWeek,
    thisWeek,
    average,
    weekRange,
  } = useWeek();
  //#region functions

  /**
   * TODO: Purpose:
   * @param user
   */
  async function getStatArr(user: User) {
    try {
      const idToken = await user.getIdToken();
      const response = await axios.get(
        CONSTANTS.URLs.POMO + `/stat/${user.email}`,
        {
          headers: {
            Authorization: "Bearer " + idToken,
          },
        }
      );
      let pomoRecords = response.data;
      let days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
      // [{ date: '9/12/2022', total: 300 }, ... ]
      let durationByDateArr = pomoRecords
        .sort((a: pomoType, b: pomoType) => a.startTime - b.startTime)
        .reduce((acc: StatArrType, curRec: pomoType) => {
          // check if the date property of the last element in the acc
          // has the same value as the curRec's date value.
          if (acc.length === 0) {
            const dayOfWeek = new Date(curRec.date).getDay();
            return [
              {
                date: curRec.date,
                timestamp: new Date(curRec.date).getTime(),
                dayOfWeek: days[dayOfWeek],
                total: curRec.duration,
              },
            ];
          }

          if (acc[acc.length - 1].date === curRec.date) {
            acc[acc.length - 1].total += curRec.duration;
            return acc;
          } else {
            const dayOfWeek = new Date(curRec.date).getDay();
            return [
              ...acc,
              {
                date: curRec.date,
                timestamp: new Date(curRec.date).getTime(),
                dayOfWeek: days[dayOfWeek],
                total: curRec.duration,
              },
            ];
          }
        }, []);
      console.log(durationByDateArr);
      setStatArr(durationByDateArr); //!
      calculateOverview(durationByDateArr);
      thisWeek(durationByDateArr);
    } catch (error) {
      console.log(error);
    }
  }

  useEffect(() => {
    if (
      user !== null &&
      Object.entries(user).length !== 0 &&
      statArr.length === 0
    ) {
      getStatArr(user);
    }

    console.log(week);
    console.log(`Average - ${average}`);
    console.log(`todayTotal - ${todayTotal}`);
    console.log(`lastDayTotal - ${lastDayTotal}`);
  }, [user]);

  return (
    <Grid>
      <GridItem>
        <BoxShadowWrapper fontSize={"1em"}>
          <FlexBox>
            <Total
              thisTotal={todayTotal}
              lastTotal={lastDayTotal}
              target="day"
              message="Today"
            />

            <Total
              thisTotal={thisWeekTotal}
              lastTotal={lastWeekTotal}
              target="week"
              message="This week"
            />

            <Total
              thisTotal={thisMonthTotal}
              lastTotal={lastMonthTotal}
              target="month"
              message="This month"
            />

            <div>
              <h4>Total</h4>
              <h3
                style={{
                  color: "#6272a4",
                  fontWeight: "bold",
                  fontSize: "1.2em",
                }}
              >
                {Math.floor(total / 60)}h {total % 60}m
              </h3>
            </div>
          </FlexBox>
        </BoxShadowWrapper>
      </GridItem>
      <GridItem>
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
            <LeftArrow handleClick={() => prevWeek(statArr)} />
            <p>{weekRange}</p>
            <RightArrow handleClick={() => nextWeek(statArr)} />
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
      </GridItem>
    </Grid>
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