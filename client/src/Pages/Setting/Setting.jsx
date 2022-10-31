import { useEffect } from "react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { UserAuth } from "../../Auth/AuthContext";
import { UserInfo } from "../../Components/UserContext";
import { ArrowDown, ArrowUp } from "../../Components/Icons/Arrows/Arrows";
import { Button } from "../../Components/Buttons/Button";
import { BoxShadowWrapper } from "../../Components/Wrapper";
import { Grid } from "../../Components/Layouts/Grid";
import { GridItem } from "../../Components/Layouts/GridItem";
import { FlexBox } from "../../Components/Layouts/FlexBox";
import axios from "axios";
import * as C from "../../constants/index";
import { async } from "@firebase/util";
import {
  deleteUser,
  GoogleAuthProvider,
  reauthenticateWithPopup,
} from "firebase/auth";
import styles from "./Setting.module.css";

function Setting() {
  const { user } = UserAuth();
  const { pomoSetting, setPomoSetting } = UserInfo();
  const [settingInputs, setSettingInputs] = useState(pomoSetting || {});
  //const [settingInputs, setSettingInputs] = useState(pomoSetting);

  function handleInputChange(event) {
    let targetValue = +event.target.value;
    if (targetValue >= 0) {
      switch (event.target.name) {
        case "pomoDuration":
          setSettingInputs({
            ...settingInputs,
            pomoDuration: targetValue,
          });
          break;
        case "shortBreakDuration":
          setSettingInputs({
            ...settingInputs,
            shortBreakDuration: targetValue,
          });
          break;
        case "longBreakDuration":
          setSettingInputs({
            ...settingInputs,
            longBreakDuration: targetValue,
          });
          break;
        case "numOfPomo":
          setSettingInputs({
            ...settingInputs,
            numOfPomo: targetValue,
          });
          break;
        default:
          break;
      }
    }
  }

  function handleIncrease(targetProp) {
    setSettingInputs({
      ...settingInputs,
      [targetProp]: ++settingInputs[`${targetProp}`],
    });
  }

  function handleDecrease(targetProp) {
    if (settingInputs[`${targetProp}`] > 0) {
      setSettingInputs({
        ...settingInputs,
        [targetProp]: --settingInputs[`${targetProp}`],
      });
    }
  }

  function handleSubmit(event) {
    updatePomoSetting(user, settingInputs);
    setPomoSetting(settingInputs);
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
    <>
      <h3
        style={{
          position: "absolute",
          top: "16.5%",
          left: "50%",
          transform: "translate(-50%, -50%)",
        }}
      >
        {Object.values(settingInputs).length === 0 ? "Loading Data" : ""}
      </h3>
      <Grid maxWidth="634px" gap="25px">
        <GridItem>
          <BoxShadowWrapper>
            <form onSubmit={handleSubmit}>
              <label className={styles.arrangeLabel}>
                Pomo Duration
                <div className={styles.alignBoxes}>
                  <input
                    name="pomoDuration"
                    type="number"
                    className={styles.arrangeInput}
                    value={settingInputs.pomoDuration || 0}
                    onChange={handleInputChange}
                  />
                </div>
              </label>
              <br />
              <label className={styles.arrangeLabel}>
                Short Break Duration
                <div className={styles.alignBoxes}>
                  <input
                    name="shortBreakDuration"
                    type="number"
                    className={styles.arrangeInput}
                    value={settingInputs.shortBreakDuration || 0}
                    onChange={handleInputChange}
                  />
                </div>
              </label>
              <br />
              <label className={styles.arrangeLabel}>
                Long Break Duration
                <div className={styles.alignBoxes}>
                  <input
                    name="longBreakDuration"
                    type="number"
                    className={styles.arrangeInput}
                    value={settingInputs.longBreakDuration || 0}
                    onChange={handleInputChange}
                  />
                </div>
              </label>
              <br />
              <label className={styles.arrangeLabel}>
                Number of Pomos
                <div className={styles.alignBoxes}>
                  <input
                    name="numOfPomo"
                    type="number"
                    className={styles.arrangeInput}
                    value={settingInputs.numOfPomo || 0}
                    onChange={handleInputChange}
                  />
                </div>
              </label>

              <br />
              <div className={`${styles.flexBox}`}>
                <Button
                  type={"submit"}
                  color={"primary"}
                  styles="transform: translateX(50%)"
                >
                  SAVE
                </Button>
              </div>
            </form>
          </BoxShadowWrapper>
        </GridItem>
        <GridItem>
          <FlexBox>
            <Button color={"primary"} handleClick={() => createDemoData(user)}>
              Create Demo data
            </Button>
            <Button handleClick={() => removeDemoData(user)}>
              Remove Demo data
            </Button>
          </FlexBox>
        </GridItem>
        <GridItem>
          <Button
            handleClick={async () => {
              const provider = new GoogleAuthProvider();
              //.TODO:
              // I think I don't need to update the user state inside the Auth Context Provider
              // using the result.user
              // Since, we are going to delete this account.
              let result = await reauthenticateWithPopup(user, provider);
              deleteAccount(result.user);
              //deleteAccount(user)
            }}
          >
            Delete account
          </Button>
        </GridItem>
      </Grid>
    </>
  );
}

async function deleteAccount(user) {
  console.log(`--------------------DELETE ACCOUNT-------------------`);
  try {
    const idToken = await user.getIdToken();
    const res = await axios.delete(C.URLs.USER + `/${user.email}`, {
      headers: {
        Authorization: "Bearer " + idToken,
      },
    });
    console.log("deleteAccount res", res.data);
    //await user.delete();
    let result = await deleteUser(user);
    window.location.reload();
    console.log(result);
  } catch (error) {
    console.log(error);
  }
}
async function createDemoData(user) {
  try {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterdayTimestamp = today.getTime() - 24 * 60 * 60 * 1000;
    const idToken = await user.getIdToken();
    const res = await axios.post(
      C.URLs.POMO + `/generateDemoData/${user.email}`,
      {
        timestamp: yesterdayTimestamp,
        timezoneOffset: now.getTimezoneOffset(),
      },
      {
        headers: {
          Authorization: "Bearer " + idToken,
        },
      }
    );
    console.log("res obj.data", res.data);
  } catch (err) {
    console.log(err);
  }
}

async function removeDemoData(user) {
  try {
    const idToken = await user.getIdToken();
    const res = await axios.delete(C.URLs.POMO + `/demo/${user.email}`, {
      headers: {
        Authorization: "Bearer " + idToken,
      },
    });
    console.log("res obj.data", res.data);
  } catch (err) {
    console.log(err);
  }
}
async function updatePomoSetting(user, pomoSetting) {
  try {
    const idToken = await user.getIdToken();
    const res = await axios.put(
      C.URLs.USER + `/editPomoSetting/${user.email}`,
      {
        pomoSetting,
      },
      {
        headers: {
          Authorization: "Bearer " + idToken,
        },
      }
    );
    console.log("res obj.data", res.data);
  } catch (err) {
    console.log(err);
  }
}

export default Setting;
