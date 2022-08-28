import { async } from "@firebase/util";
import axios from "axios";
import { useState } from "react";
import { useEffect } from "react";
import { UserAuth } from "../../Auth/AuthContext";
import * as CONSTANTS from "../../constants/index";

export default function Statistics() {
  const { user } = UserAuth();
  const [todayTotal, setTodayTotal] = useState(0);
  const [thisWeekTotal, setThisWeekTotal] = useState(0);

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

  useEffect(() => {
    if (user !== null && Object.entries(user).length !== 0) {
      getPomos(user);
    }
  }, [user]);

  return (
    <div>
      <div>Today</div>
      <div>{todayTotal / 60}</div>
      <div>This Week</div>
      <div>{thisWeekTotal / 60}</div>
    </div>
  );
}
