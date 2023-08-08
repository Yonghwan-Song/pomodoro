import { useEffect } from "react";
import { useState } from "react";
import { UserAuth } from "../../Context/AuthContext";
import { PomoSettingType, UserInfo } from "../../Context/UserContext";
import { Button } from "../../Components/Buttons/Button";
import { BoxShadowWrapper } from "../../Components/Wrapper";
import { Grid } from "../../Components/Layouts/Grid";
import { GridItem } from "../../Components/Layouts/GridItem";
import { FlexBox } from "../../Components/Layouts/FlexBox";
import axios from "axios";
import * as CONSTANTS from "../../constants/index";
import {
  deleteUser,
  GoogleAuthProvider,
  reauthenticateWithPopup,
  User,
} from "firebase/auth";
import styles from "./Setting.module.css";
import {
  DynamicCache,
  clearStateStore,
  countDown,
  openCache,
  postMsgToSW,
  stopCountDown,
} from "../..";

function Setting() {
  const { user } = UserAuth()!;
  const userInfoContext = UserInfo()!;
  const setPomoSetting = userInfoContext.setPomoSetting;
  const pomoSetting = userInfoContext.pomoSetting ?? ({} as PomoSettingType);
  const [settingInputs, setSettingInputs] = useState(
    () => userInfoContext.pomoSetting ?? ({} as PomoSettingType)
  );

  function handleInputChange(event: {
    target: { value: string | number; name: any };
  }) {
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

  function handleSubmit(event: { preventDefault: () => void }) {
    event.preventDefault();
    postMsgToSW("emptyStateStore", {});
    stopCountDown();
    updatePomoSetting(user!, settingInputs);
    setPomoSetting(settingInputs);
  }

  useEffect(() => {
    if (user !== null && Object.entries(user).length !== 0) {
      console.log(user);
    }
    console.log(pomoSetting);

    //* Just in case users refresh the page
    //* pomoSetting != null is always true.
    //* if settingsInputs === {}, the second statement evaluates to [].length === 0
    // if (pomoSetting != null && Object.entries(settingInputs).length === 0) {
    //! 지워도 제대로 작동하는 것 같아...........
    if (Object.entries(settingInputs).length === 0) {
      setSettingInputs(pomoSetting);
    }

    console.log("POMO SETTING INPUTS", settingInputs);
  }, [user, pomoSetting, settingInputs]);

  useEffect(() => {
    countDown(localStorage.getItem("idOfSetInterval"));
  }, []);

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
                <Button type={"submit"} color={"primary"}>
                  SAVE
                </Button>
              </div>
            </form>
          </BoxShadowWrapper>
        </GridItem>
        <GridItem>
          <FlexBox>
            <Button color={"primary"} handleClick={() => createDemoData(user!)}>
              Create Demo data
            </Button>
            <Button handleClick={() => removeDemoData(user!)}>
              Remove Demo data
            </Button>
          </FlexBox>
        </GridItem>
        <GridItem>
          <Button
            handleClick={async () => {
              const provider = new GoogleAuthProvider();
              let result = await reauthenticateWithPopup(user!, provider);
              deleteAccount(result.user);
            }}
          >
            Delete account
          </Button>
        </GridItem>
      </Grid>
    </>
  );
}

async function deleteAccount(user: User) {
  console.log(`--------------------DELETE ACCOUNT-------------------`);
  try {
    const idToken = await user.getIdToken();
    const res = await axios.delete(CONSTANTS.URLs.USER + `/${user.email}`, {
      headers: {
        Authorization: "Bearer " + idToken,
      },
    });
    console.log("deleteAccount res", res.data);
    //await user.delete();
    let result = await deleteUser(user);
    await clearStateStore();
    await caches.delete(CONSTANTS.CacheName);
    window.location.reload();
    console.log(result);
  } catch (error) {
    console.log(error);
  }
}
async function createDemoData(user: User) {
  try {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterdayTimestamp = today.getTime() - 24 * 60 * 60 * 1000;
    const idToken = await user.getIdToken();
    let cache = DynamicCache || (await openCache(CONSTANTS.CacheName));
    await cache.delete(CONSTANTS.URLs.POMO + "/stat/" + user.email);
    const res = await axios.post(
      CONSTANTS.URLs.POMO + `/generateDemoData/${user.email}`,
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

async function removeDemoData(user: User) {
  try {
    const idToken = await user.getIdToken();
    let cache = DynamicCache || (await openCache(CONSTANTS.CacheName));
    await cache.delete(CONSTANTS.URLs.POMO + "/stat/" + user.email);
    const res = await axios.delete(
      CONSTANTS.URLs.POMO + `/demo/${user.email}`,
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
async function updatePomoSetting(user: User, pomoSetting: PomoSettingType) {
  try {
    const idToken = await user.getIdToken();
    let cache = DynamicCache || (await openCache(CONSTANTS.CacheName));
    cache.put(
      CONSTANTS.URLs.USER + `/${user.email}`,
      new Response(JSON.stringify(pomoSetting))
    );
    const res = await axios.put(
      CONSTANTS.URLs.USER + `/editPomoSetting/${user.email}`,
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
