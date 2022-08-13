import { useEffect } from "react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { UserAuth } from "../../Auth/AuthContext";
import { UserInfo } from "../../Components/UserContext";
import axios from "axios";
import * as C from "../../constants/index";
import { async } from "@firebase/util";

//TODO:
//// 1. Change URL of api
//// 2. Axios call
// 3. Check database - test and debug
function Setting() {
  const { user } = UserAuth();
  const { pomoSetting } = UserInfo();
  const [settingInputs, setSettingInputs] = useState(pomoSetting || {});

  function handleInputChange(event) {
    switch (event.target.name) {
      case "pomoDuration":
        setSettingInputs({
          ...settingInputs,
          pomoDuration: +event.target.value,
        });
        break;
      case "shortBreakDuration":
        setSettingInputs({
          ...settingInputs,
          shortBreakDuration: +event.target.value,
        });
        break;
      case "longBreakDuration":
        setSettingInputs({
          ...settingInputs,
          longBreakDuration: +event.target.value,
        });
        break;
      case "numOfPomo":
        setSettingInputs({
          ...settingInputs,
          numOfPomo: +event.target.value,
        });
        break;
      default:
        break;
    }
  }

  function handleSubmit(event) {
    setPomoSetting(user, settingInputs);
    event.preventDefault();
  }

  useEffect(() => {
    if (user !== null && Object.entries(user).length !== 0) {
      console.log(user);
    }
    console.log(pomoSetting);

    // just in case users refresh the page
    if (pomoSetting != null && Object.entries(settingInputs).length === 0) {
      setSettingInputs(pomoSetting);
    }
    console.log("POMO SETTING INPUTS", settingInputs);
  }, [user, pomoSetting, settingInputs]);

  return (
    <div>
      <br />
      <br />
      <form onSubmit={handleSubmit}>
        <label>
          Pomo Duration:
          <input
            name="pomoDuration"
            type="number"
            value={settingInputs.pomoDuration}
            onChange={handleInputChange}
          />
        </label>
        <br />
        <label>
          Short Break Duration:
          <input
            name="shortBreakDuration"
            type="number"
            value={settingInputs.shortBreakDuration}
            onChange={handleInputChange}
          />
        </label>
        <br />
        <label>
          Long Break Duration:
          <input
            name="longBreakDuration"
            type="number"
            value={settingInputs.longBreakDuration}
            onChange={handleInputChange}
          />
        </label>
        <br />
        <label>
          Number of Pomos:
          <input
            name="numOfPomo"
            type="number"
            value={settingInputs.numOfPomo}
            onChange={handleInputChange}
          />
        </label>
        <br />
        <br />
        <input type="submit" value="Submit" />
      </form>
    </div>
  );
}

async function setPomoSetting(user, pomoSetting) {
  try {
    const res = await axios.put(
      C.URLs.USER + `/editPomoSetting/${user.email}`,
      {
        pomoSetting,
      },
      {
        headers: {
          Authorization: "Bearer " + user.accessToken,
        },
      }
    );
    console.log("res obj.data", res.data);
  } catch (err) {
    console.log(err);
  }
}

export default Setting;
