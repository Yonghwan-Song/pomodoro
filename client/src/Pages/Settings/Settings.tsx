import React, { useEffect, useMemo } from "react";
import { useState } from "react";
import { useAuthContext } from "../../Context/AuthContext";
import { PomoSettingType } from "../../types/clientStatesType";
import { Button } from "../../ReusableComponents/Buttons/Button";
import { BoxShadowWrapper } from "../../ReusableComponents/Wrapper";
import { Grid } from "../../ReusableComponents/Layouts/Grid";
import { GridItem } from "../../ReusableComponents/Layouts/GridItem";
import { FlexBox } from "../../ReusableComponents/Layouts/FlexBox";
import {
  CacheName,
  RESOURCE,
  SUB_SET,
  BASE_URL,
  VH_RATIO,
  MINIMUMS,
} from "../../constants/index";
import {
  deleteUser,
  GoogleAuthProvider,
  reauthenticateWithPopup,
  User,
} from "firebase/auth";
import styles from "./Settings.module.css";
import {
  DynamicCache,
  clear__StateStore_RecOfToday_CategoryStore,
  countDown,
  deleteCache,
  emptyStateStore,
  openCache,
  persistCategoryChangeInfoArrayToIDB,
  postMsgToSW,
  stopCountDownInBackground,
  persistAutoStartSettingToServer,
  persistTimersStatesToServer,
} from "../..";
import ToggleSwitch from "../../ReusableComponents/ToggleSwitch/ToggleSwitch";
import { axiosInstance } from "../../axios-and-error-handling/axios-instances";
import Categories from "./Categories/Categories";
import { useBoundedPomoInfoStore } from "../../zustand-stores/pomoInfoStoreUsingSlice";
import GoalForm from "./GoalForm/GoalForm";

function Settings() {
  const { user } = useAuthContext()!;
  //
  const pomoSetting = useBoundedPomoInfoStore((state) => state.pomoSetting);
  const autoStartSetting = useBoundedPomoInfoStore(
    (state) => state.autoStartSetting
  );
  const setPomoSetting = useBoundedPomoInfoStore(
    (state) => state.setPomoSetting
  );
  const setAutoStartSetting = useBoundedPomoInfoStore(
    (state) => state.setAutoStartSetting
  );
  //
  const categories = useBoundedPomoInfoStore((state) => state.categories);
  const colorForUnCategorized = useBoundedPomoInfoStore(
    (state) => state.colorForUnCategorized
  );
  // To reset the current cycle.
  const updateCategoryChangeInfoArray = useBoundedPomoInfoStore(
    (state) => state.setCategoryChangeInfoArray
  );

  const pomoSettingMemoized = useMemo(() => {
    return pomoSetting;
  }, [pomoSetting]);
  const autoStartSettingMemoized = useMemo(() => {
    return autoStartSetting;
  }, [autoStartSetting]);
  const currentCategory = useMemo(() => {
    // if (user !== null) return categories.find((c) => c.isCurrent) ?? null;
    // else return null;

    //IMO: we don't need to strictly divide cases like above because returning null below includes
    // both non-sign-in users and a sign-in user who hasn't created categories.
    return categories.find((c) => c.isCurrent) ?? null;
  }, [categories]);
  const [pomoSettingInputs, setPomoSettingInputs] = useState(() => {
    if (pomoSetting === null)
      return {
        pomoDuration: 25,
        shortBreakDuration: 5,
        longBreakDuration: 15,
        numOfPomo: 4,
        numOfCycle: 1,
      };
    else return pomoSetting;
  });
  const [doesPomoStartAutomatically, setDoesPomoStartAutomatically] = useState(
    () => {
      if (autoStartSetting === null) return false;
      else return autoStartSetting.doesPomoStartAutomatically;
    }
  );
  const [doesBreakStartAutomatically, setDoesBreakStartAutomatically] =
    useState(() => {
      if (autoStartSetting === null) return false;
      else return autoStartSetting.doesBreakStartAutomatically;
    });
  const [doesCycleStartAutomatically, setDoesCycleStartAutomatically] =
    useState(() => {
      if (autoStartSetting === null) return false;
      else return autoStartSetting.doesCycleStartAutomatically;
    });

  //#region To Observe LifeCycle
  // const mountCount = useRef(0);
  // const updateCount = useRef(0);
  //#endregion

  //#region Event Handlers
  //TODO: 결국 여기에서 case "userOptionForAutoStart" 해서 한번에 보내는 형식으로 하면 걍 되기는 될 듯.
  function handlePomoSettingChange(event: React.ChangeEvent<HTMLInputElement>) {
    let targetValue = +event.target.value;
    // duration >= 1 && duration <= 1000, num >= 1 && num <= 100
    if (targetValue >= 1) {
      // for min values
      switch (event.target.name) {
        case "pomoDuration":
          targetValue <= 1000 &&
            setPomoSettingInputs({
              ...pomoSettingInputs,
              pomoDuration: targetValue,
            });
          break;
        case "shortBreakDuration":
          targetValue <= 1000 &&
            setPomoSettingInputs({
              ...pomoSettingInputs,
              shortBreakDuration: targetValue,
            });
          break;
        case "longBreakDuration":
          targetValue <= 1000 &&
            setPomoSettingInputs({
              ...pomoSettingInputs,
              longBreakDuration: targetValue,
            });
          break;
        case "numOfPomo":
          targetValue <= 100 &&
            setPomoSettingInputs({
              ...pomoSettingInputs,
              numOfPomo: targetValue,
            });
          break;
        case "numOfCycle":
          targetValue <= 100 &&
            setPomoSettingInputs({
              ...pomoSettingInputs,
              numOfCycle: targetValue,
            });
          break;
        default:
          break;
      }
    }
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const {
      numOfPomo,
      numOfCycle,
      pomoDuration,
      shortBreakDuration,
      longBreakDuration,
    } = pomoSettingInputs;

    let totalFocusDuration = numOfPomo * pomoDuration * 60;
    let cycleDuration =
      totalFocusDuration +
      (numOfPomo - 1) * shortBreakDuration * 60 +
      longBreakDuration * 60;

    postMsgToSW("saveStates", {
      stateArr: [
        { name: "pomoSetting", value: pomoSettingInputs },
        {
          name: "autoStartSetting",
          value: {
            doesPomoStartAutomatically,
            doesBreakStartAutomatically,
            doesCycleStartAutomatically,
          },
        },
        { name: "duration", value: pomoDuration },
        { name: "repetitionCount", value: 0 },
        { name: "running", value: false },
        { name: "startTime", value: 0 },
        { name: "pause", value: { totalLength: 0, record: [] } },
        {
          name: "currentCycleInfo",
          value: {
            totalFocusDuration,
            cycleDuration,
            cycleStartTimestamp: 0,
            veryFirstCycleStartTimestamp: 0,
            totalDurationOfSetOfCycles: cycleDuration * numOfCycle,
          },
        },
      ],
    });

    stopCountDownInBackground();

    if (user !== null) {
      const infoArr = [
        {
          categoryName:
            currentCategory === null ? "uncategorized" : currentCategory.name,
          categoryChangeTimestamp: 0,
          _uuid: currentCategory?._uuid,
          color:
            currentCategory !== null
              ? currentCategory.color
              : colorForUnCategorized,
          progress: 0,
        },
      ];

      persistCategoryChangeInfoArrayToIDB(infoArr);

      axiosInstance.patch(RESOURCE.USERS + SUB_SET.CATEGORY_CHANGE_INFO_ARRAY, {
        categoryChangeInfoArray: infoArr,
      });
      axiosInstance.patch(RESOURCE.USERS + SUB_SET.CURRENT_CYCLE_INFO, {
        totalFocusDuration,
        cycleDuration,
        cycleStartTimestamp: 0,
        veryFirstCycleStartTimestamp: 0,
        totalDurationOfSetOfCycles: cycleDuration * numOfCycle,
      });

      persistPomoSettingToServer(user, pomoSettingInputs)
        .then(() =>
          // timersStates are reset so that a user can start a new cycle of sessions with the new pomoSetting.
          persistTimersStatesToServer({
            duration: pomoSettingInputs.pomoDuration,
            repetitionCount: 0,
            running: false,
            startTime: 0,
            pause: { totalLength: 0, record: [] },
          })
        )
        .then(() =>
          persistAutoStartSettingToServer(user, {
            doesPomoStartAutomatically,
            doesBreakStartAutomatically,
            doesCycleStartAutomatically,
          })
        );

      setPomoSetting(pomoSettingInputs);
      setAutoStartSetting({
        doesPomoStartAutomatically,
        doesBreakStartAutomatically,
        doesCycleStartAutomatically,
      });
      updateCategoryChangeInfoArray(infoArr);
    } else {
      setPomoSetting(pomoSettingInputs);
      setAutoStartSetting({
        doesPomoStartAutomatically,
        doesBreakStartAutomatically,
        doesCycleStartAutomatically,
      });
    }
  }
  //#endregion

  //#region Side Effects

  // To set pomoSettingInputs to default when a user logs out.
  useEffect(() => {
    if (pomoSettingMemoized !== null) setPomoSettingInputs(pomoSettingMemoized);
  }, [pomoSettingMemoized]);

  //TODO:
  // What if only one of the autostart settings has changed? e.g. pomo start?
  // If it does, setDoesBreakStartAutomatically should've not called.
  useEffect(() => {
    if (autoStartSettingMemoized !== null) {
      setDoesPomoStartAutomatically(
        autoStartSettingMemoized.doesPomoStartAutomatically
      );
      setDoesBreakStartAutomatically(
        autoStartSettingMemoized.doesBreakStartAutomatically
      );
      setDoesCycleStartAutomatically(
        autoStartSettingMemoized.doesCycleStartAutomatically
      );
    }
  }, [autoStartSettingMemoized]);

  useEffect(() => {
    countDown(localStorage.getItem("idOfSetInterval"));
  }, []);
  //#endregion

  return (
    <main
      style={{
        minHeight: `calc(100vh - max(${VH_RATIO.NAV_BAR}vh, ${MINIMUMS.NAV_BAR}px))`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Grid maxWidth="634px" columnGap="25px" rowGap="25px">
        <GridItem>
          <BoxShadowWrapper>
            <form onSubmit={handleSubmit}>
              <Grid
                column={2}
                row={2}
                // autoRow={45}
                columnGap={"38px"}
                rowGap={"38px"}
                justifyItems="center"
                alignItems="center"
              >
                <label className={styles.arrangeLabel}>
                  Pomo Duration
                  <div className={styles.alignBoxes}>
                    <input
                      name="pomoDuration"
                      type="number"
                      className={styles.arrangeInput}
                      value={pomoSettingInputs.pomoDuration || 0}
                      onChange={handlePomoSettingChange}
                    />
                  </div>
                </label>
                <label className={styles.arrangeLabel}>
                  Short Break Duration
                  <div className={styles.alignBoxes}>
                    <input
                      name="shortBreakDuration"
                      type="number"
                      className={styles.arrangeInput}
                      value={pomoSettingInputs.shortBreakDuration || 0}
                      onChange={handlePomoSettingChange}
                    />
                  </div>
                </label>
                <label className={styles.arrangeLabel}>
                  Long Break Duration
                  <div className={styles.alignBoxes}>
                    <input
                      name="longBreakDuration"
                      type="number"
                      className={styles.arrangeInput}
                      value={pomoSettingInputs.longBreakDuration || 0}
                      onChange={handlePomoSettingChange}
                    />
                  </div>
                </label>
                <label className={styles.arrangeLabel}>
                  Number of Pomos
                  <div className={styles.alignBoxes}>
                    <input
                      name="numOfPomo"
                      type="number"
                      className={styles.arrangeInput}
                      value={pomoSettingInputs.numOfPomo || 0}
                      onChange={handlePomoSettingChange}
                    />
                  </div>
                </label>
                <label className={styles.arrangeLabel}>
                  Number of Cycles
                  <div className={styles.alignBoxes}>
                    <input
                      name="numOfCycle"
                      type="number"
                      className={styles.arrangeInput}
                      value={pomoSettingInputs.numOfCycle || 0}
                      onChange={handlePomoSettingChange}
                    />
                  </div>
                </label>
                <GridItem>
                  <ToggleSwitch
                    labelName="Auto Start Pomo"
                    name="pomo"
                    isSwitchOn={doesPomoStartAutomatically}
                    isHorizontal={true}
                    onChange={(e) => {
                      setDoesPomoStartAutomatically(e.target.checked);
                    }}
                    unitSize={25}
                    xAxisEdgeWidth={2}
                    borderWidth={2}
                    backgroundColorForOn="#75BBAF"
                    backgroundColorForOff="#bbc5c7"
                    backgroundColorForSwitch="#f0f0f0"
                  />
                </GridItem>
                <GridItem>
                  <ToggleSwitch
                    labelName="Auto Start Break"
                    name="break"
                    isSwitchOn={doesBreakStartAutomatically}
                    isHorizontal={true}
                    onChange={(e) => {
                      setDoesBreakStartAutomatically(e.target.checked);
                    }}
                    unitSize={25}
                    xAxisEdgeWidth={2}
                    borderWidth={2}
                    backgroundColorForOn="#75BBAF"
                    backgroundColorForOff="#bbc5c7"
                    backgroundColorForSwitch="#f0f0f0"
                  />
                </GridItem>
                <GridItem>
                  <ToggleSwitch
                    labelName="Auto Start Cycle"
                    name="cycle"
                    isSwitchOn={doesCycleStartAutomatically}
                    isHorizontal={true}
                    onChange={(e) => {
                      setDoesCycleStartAutomatically(e.target.checked);
                    }}
                    unitSize={25}
                    xAxisEdgeWidth={2}
                    borderWidth={2}
                    backgroundColorForOn="#75BBAF"
                    backgroundColorForOff="#bbc5c7"
                    backgroundColorForSwitch="#f0f0f0"
                  />
                </GridItem>
                <GridItem columnStart={1} columnEnd={3}>
                  {/* <GridItem columnStart={1} columnEnd={1}> */}
                  <Button type={"submit"} color={"primary"}>
                    SAVE and RESET
                  </Button>
                </GridItem>
              </Grid>
            </form>
          </BoxShadowWrapper>
        </GridItem>
        {user !== null && (
          <>
            <GridItem>
              <BoxShadowWrapper>
                <FlexBox justifyContent="space-between">
                  <Button
                    color={"primary"}
                    handleClick={() => createDemoData(user!)}
                  >
                    Create Demo data
                  </Button>
                  <Button handleClick={() => removeDemoData(user!)}>
                    Remove Demo data
                  </Button>
                  <Button
                    handleClick={async () => {
                      const provider = new GoogleAuthProvider();
                      let result = await reauthenticateWithPopup(
                        user!,
                        provider
                      );
                      await emptyStateStore();
                      localStorage.removeItem("user");
                      deleteAccount(result.user);
                    }}
                  >
                    Delete account
                  </Button>
                </FlexBox>
              </BoxShadowWrapper>
            </GridItem>
            <GridItem>
              <BoxShadowWrapper>
                <GoalForm />
              </BoxShadowWrapper>
            </GridItem>
            <GridItem>
              <BoxShadowWrapper>
                <Categories />
              </BoxShadowWrapper>
            </GridItem>
          </>
        )}
      </Grid>
    </main>
  );
}

async function deleteAccount(user: User) {
  // console.log(`--------------------DELETE ACCOUNT-------------------`);
  try {
    const res = await axiosInstance.delete(RESOURCE.USERS);
    // console.log("deleteAccount res", res.data);
    //await user.delete();
    let result = await deleteUser(user);
    await clear__StateStore_RecOfToday_CategoryStore();
    await deleteCache(CacheName);
    window.location.reload();
    // console.log(result);
  } catch (error) {
    console.warn(error);
  }
}
async function createDemoData(user: User) {
  try {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const timestampForBeginningOfYesterday =
      today.getTime() - 24 * 60 * 60 * 1000;
    let cache = DynamicCache || (await openCache(CacheName));
    await cache.delete(BASE_URL + RESOURCE.POMODOROS);
    const res = await axiosInstance.post(
      RESOURCE.POMODOROS + SUB_SET.DEMO_DATA,
      {
        timestampForBeginningOfYesterday,
        timezoneOffset: now.getTimezoneOffset(),
      }
    );
    // console.log("res obj.data", res.data);
  } catch (err) {
    console.warn(err);
  }
}
async function removeDemoData(user: User) {
  try {
    let cache = DynamicCache || (await openCache(CacheName));
    await cache.delete(BASE_URL + RESOURCE.POMODOROS);
    const res = await axiosInstance.delete(
      RESOURCE.POMODOROS + SUB_SET.DEMO_DATA
    );
    // console.log("res obj.data", res.data);
  } catch (err) {
    console.warn(err);
  }
}

//TODO: 1.변수명 바꾸기 pomoInfo나 뭐... requiredStatesToRunTimer로 2.
async function persistPomoSettingToServer(
  user: User,
  pomoSetting: PomoSettingType
) {
  try {
    let cache = DynamicCache || (await openCache(CacheName));
    let pomoSettingAndTimersStatesResponse = await cache.match(
      BASE_URL + RESOURCE.USERS
    );
    if (pomoSettingAndTimersStatesResponse !== undefined) {
      let pomoSettingAndTimersStates =
        await pomoSettingAndTimersStatesResponse.json();
      pomoSettingAndTimersStates.pomoSetting = pomoSetting;
      await cache.put(
        BASE_URL + RESOURCE.USERS,
        new Response(JSON.stringify(pomoSettingAndTimersStates))
      );
    }

    const res = await axiosInstance.patch(
      RESOURCE.USERS + SUB_SET.POMODORO_SETTING,
      {
        ...pomoSetting,
      }
    );

    // console.log("res obj.data", res.data);
  } catch (err) {
    console.warn(err);
  }
}

export default Settings;
