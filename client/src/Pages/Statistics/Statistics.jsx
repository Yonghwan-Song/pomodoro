import { async } from "@firebase/util";
import axios from "axios";
import { useState } from "react";
import { useEffect } from "react";
import { UserAuth } from "../../Auth/AuthContext";
import * as CONSTANTS from "../../constants/index";
import { useWeek } from "../useWeek";
import { LeftArrow, RightArrow } from "../../Components/Icons/ChevronArrows";
import { BoxShadowWrapper } from "../../Components/Wrapper";
import { Grid } from "../../Components/Layouts/Grid";
import { GridItem } from "../../Components/Layouts/GridItem";
import {
  AreaChart,
  Area,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export default function Statistics() {
  const { user } = UserAuth();
  const [todayTotal, setTodayTotal] = useState(0);
  const [thisWeekTotal, setThisWeekTotal] = useState(0);
  const [statArr, setStatArr] = useState([]);
  const {
    week,
    prevWeek,
    nextWeek,
    initializeWithThisWeek,
    average,
    weekRange,
  } = useWeek();

  async function getPomos(user) {
    try {
      const idToken = await user.getIdToken();
      const response = await axios.get(CONSTANTS.URLs.POMO + `/${user.email}`, {
        headers: {
          Authorization: "Bearer " + idToken,
        },
      });
      setTodayTotal(response.data.todayPomoTotalDuration);
      setThisWeekTotal(response.data.thisWeekPomoTotalDuration);
    } catch (error) {
      console.log(error);
    }
  }
  async function getStatArr(user) {
    try {
      const response = await axios.get(
        CONSTANTS.URLs.POMO + `/stat/${user.email}`,
        {
          headers: {
            Authorization: "Bearer " + user.accessToken,
          },
        }
      );
      setStatArr(response.data);
      initializeWithThisWeek(response.data);
    } catch (error) {
      console.log(error);
    }
  }

  useEffect(() => {
    if (user !== null && Object.entries(user).length !== 0) {
      getPomos(user);
      getStatArr(user);
    }
    console.log(`week - ${week}`);
    console.log(`Average - ${average}`);
  }, [user, week]);

  return (
    <Grid>
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
                stroke="#302783"
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

function CustomTooltip({ active, payload, label }) {
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
          {Math.trunc(payload[0].value / 60)}h {payload[0].value % 60}m
        </p>
        <p>{payload[0].value}m</p>
      </div>
    );
  }
}
