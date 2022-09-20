import { async } from "@firebase/util";
import axios from "axios";
import { useState } from "react";
import { useEffect } from "react";
import { UserAuth } from "../../Auth/AuthContext";
import * as CONSTANTS from "../../constants/index";
import {
  ResponsiveContainer,
  AreaChart,
  XAxis,
  YAxis,
  Area,
  Tooltip,
  CartesianGrid,
} from "recharts";

export default function Statistics() {
  const { user } = UserAuth();
  const [todayTotal, setTodayTotal] = useState(0);
  const [thisWeekTotal, setThisWeekTotal] = useState(0);
  const [statArr, setStatArr] = useState([]);

  async function getPomos(user) {
    try {
      const response = await axios.get(CONSTANTS.URLs.POMO + `/${user.email}`, {
        headers: {
          Authorization: "Bearer " + user.accessToken,
        },
      });
      setTodayTotal(response.data.todayPomoTotalDuration);
      setThisWeekTotal(response.data.thisWeekPomoTotalDuration);
      //console.log(`getToday - ${response.data.todayPomoArr}`);
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
    } catch (error) {
      console.log(error);
    }
  }

  useEffect(() => {
    if (user !== null && Object.entries(user).length !== 0) {
      getPomos(user);
      getStatArr(user);
    }
  }, [user]);

  return (
    <ResponsiveContainer width="80%" height={300}>
      <AreaChart
        data={statArr}
        margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
      >
        <defs>
          <linearGradient id="color" x1="0" y1="0" x2="0" y2="1">
            <stop offset={"0%"} stopColor="#2451B7" stopOpacity={0.4} />
            <stop offset={"75%"} stopColor="#2451B7" stopOpacity={0.05} />
          </linearGradient>
          <linearGradient id="colorUv" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8} />
            <stop offset="95%" stopColor="#8884d8" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="colorPv" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#82ca9d" stopOpacity={0.8} />
            <stop offset="95%" stopColor="#82ca9d" stopOpacity={0} />
          </linearGradient>
        </defs>

        <Area
          type="monotone"
          dataKey="total"
          stroke="#8884d8"
          fillOpacity={1}
          fill="url(#color)"
        />
        <XAxis dataKey="dayOfWeek" axisLine={true} tickLine={false} />
        <YAxis
          axisLine={true}
          tickLine={false}
          tickFormatter={(minutes) => (minutes / 60).toFixed(1)}
        />
        {/* <CartesianGrid strokeDasharray="3 3" /> */}
        <CartesianGrid opacity={0.7} vertical={false} />
        <Tooltip content={CustomTooltip} />
      </AreaChart>
    </ResponsiveContainer>
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
