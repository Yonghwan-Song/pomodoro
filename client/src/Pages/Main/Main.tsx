/** @jsxImportSource @emotion/react */
import { useEffect, useRef, useState } from "react";
import {
  obtainStatesFromIDB,
  retrieveTodaySessionsFromIDB,
  stopCountDownInBackground,
} from "../..";
import {
  CycleInfoType,
  TimersStatesType,
  TimersStatesTypeWithCurrentCycleInfo,
} from "../../types/clientStatesType";
import { useAuthContext } from "../../Context/AuthContext";
import RecOfToday from "./Timeline-Related/RecOfToday";
import { RecType } from "../../types/clientStatesType";
import { pubsub } from "../../pubsub";
import { deciderOfWhetherDataForRunningTimerFetched } from "../..";
import {
  BREAK_POINTS,
  MINIMUMS,
  SUCCESS_PersistingTimersStatesWithCycleInfoToIDB,
  VH_RATIO,
} from "../../constants";
import CategoryList from "./Category-Related/CategoryList";
import { BoxShadowWrapper } from "../../ReusableComponents/Wrapper";
import { Grid } from "../../ReusableComponents/Layouts/Grid";
import { GridItem } from "../../ReusableComponents/Layouts/GridItem";
import { useBoundedPomoInfoStore } from "../../zustand-stores/pomoInfoStoreUsingSlice";
import { TimerController } from "./Timer-Related/TimerController/TimerController";
import { TodoistTasks } from "./Todoist-Related/TodoistTasks";
import { css } from "@emotion/react";

export default function Main() {
  const { user } = useAuthContext()!;
  const [statesRelatedToTimer, setStatesRelatedToTimer] = useState<
    TimersStatesType | {} | null
  >(null);
  const [currentCycleInfo, setCurrentCycleInfo] = useState<
    CycleInfoType | {} | null
  >(null);
  const [records, setRecords] = useState<RecType[]>([]);
  const areDataForRunningTimerFetched = useRef<[boolean, boolean]>(
    //[0] for the state `statesRelatedToTimer`.
    //[1] for the state `records`.
    deciderOfWhetherDataForRunningTimerFetched
  );
  //* At this point, it doesn't matter whether this setting comes from IDB or the server, as the AuthContextProvider handles it.
  const pomoSetting = useBoundedPomoInfoStore((state) => state.pomoSetting);
  const autoStartSetting = useBoundedPomoInfoStore(
    (state) => state.autoStartSetting
  );
  const isTodoistIntegrationEnabled = useBoundedPomoInfoStore(
    (state) => state.isTodoistIntegrationEnabled
  );

  //#region UseEffects
  /**
   * Where the setStatesRelatedToTimer is called among side effect functions below
   * 1. setStatesRelatedToTimerUsingDataFromIDB <-- e.g) navigating back to `/timer` after checking stat in `/statistics`.
   * 2. subscribeToClearObjectStores <-- (1)As soon as a user logs out. (2)By a callback to the "clearObjectStores" event.
   * 3. subscribeToSuccessOfPersistingTimerStatesToIDB <-- (1)As soon as a user logs in. (2)By a callback to the "successOfPersistingTimersStatesToIDB" event.
   */
  // useEffect(logStates);
  //* updating the pomoSetting from IDB is conditionally done in the AuthContextProvider.
  useEffect(setStatesRelatedToTimerAndCurrentCycleInfoUsingDataFromIDB, []);
  useEffect(setRecordsUsingDataFromIDB, []);
  useEffect(
    subscribeToSuccessOfPersistingTimerStatesWithCurrentCycleInfoToIDB,
    []
  );
  useEffect(subscribeToSuccessOfPersistingRecordsOfTodayToIDB, []);
  useEffect(subscribeToRePersistingFailedRecOfToday, []);
  useEffect(endTimerInBackground, [statesRelatedToTimer]);

  //TODO: pomoInfo가 변하면, 결국 pomoSetting이 변하든 autoStartSetting이 변하든, 즉각 즉각 idb statesStore에 반영을 해 줘야 하는데, 그거를 왜 이제와서 여기에서 했는지 잘 모르겠네.
  //TODO: setPomoInfo call할 때 거기에서 바로 save해줘야 하는 거 아니야?
  // useEffect(postSaveStatesMessageToServiceWorker, [user, pomoSetting]);
  //#endregion

  //#region Callbacks for useEffects
  // function logStates() {
  //   console.log("---------------------logStates---------------------");
  //   console.log(`toggle count - ${toggleCounter.current}`);
  //   toggleCounter.current += 1;
  //   console.log("<statesRelatedToTimer>");
  //   console.log(statesRelatedToTimer);
  //   console.log("<pomoSetting>");
  //   console.log(pomoSetting);
  //   console.log("user item in the localStorage");
  //   console.log(localStorage.getItem("user"));
  //   console.log(`toggle`);
  //   console.log(toggle);
  //   console.log(`records`);
  //   console.log(records);
  //   console.log("---------------------------------------------------");
  // }

  function endTimerInBackground() {
    // console.log("statesRelatedToTimer", statesRelatedToTimer);
    statesRelatedToTimer !== null &&
      Object.keys(statesRelatedToTimer).length !== 0 &&
      (statesRelatedToTimer as TimersStatesType).running &&
      stopCountDownInBackground();
  }

  //? 특이점 - //TODO 이거 들어내려면 조금 오래 걸릴 듯!
  //? IDB에 이미 값이 있는 경우에 즉, AuthContextProvider의 `getAndSetStatesFromIDBForNonSignedInUsers()`의
  //? 첫번째 if block의 경우에만 이 함수가 의미가 있다.
  //? 두번재 if block의 경우, `setStateStoreToDefault()`가 작업을 끝내기 전에 이 함수가 호출되므로,
  //? 아래 두 state 모두 {}값을 갖게되고, 이 경우 TimerController의 state init함수들이 이 경우를
  //? Object.entries(state).length === 0를 이용해서 걸러 낸 후 default값들을 상정해서 그 state들을 init한다.
  //! 그러니까 결과적으로는 IDB와 TC에서 state값들은 default값으로 씽크가 맞게 되긴 한다.
  //* 그래서 우선... 이 구조를 개선하기 전에는 currentCycleInfo도 같은 방식으로 default값을 TC에서 설정해보자 ㅠㅠ
  function setStatesRelatedToTimerAndCurrentCycleInfoUsingDataFromIDB() {
    const getStatesFromIDB = async () => {
      let states = await obtainStatesFromIDB("withoutSettings");
      //! IMPT
      //! How can we guarantee that the states is not undefined?
      //! IDB must already be filled with the data fetched from server before this setup function is called.
      //* However, this works when navigating back from other pages to `/timer`.
      //TODO - check if... there are duplications.
      if (Object.entries(states).length !== 0) {
        //! IMPT - 이 부분이 언제 작동하는지: 1)unAuth와 auth유저 모두에게 해당->다른 페이지에서 이 페이지로 돌아올 때.
        //!                               2)unAuth user가 앱을 열었을 때 (이전에 사용했던 데이터를 가져오는 것)
        let { currentCycleInfo, ...timersStates } =
          states as TimersStatesTypeWithCurrentCycleInfo;

        setStatesRelatedToTimer(timersStates);
        setCurrentCycleInfo(currentCycleInfo);
      } else {
        setStatesRelatedToTimer({});
        setCurrentCycleInfo({});
      }
    };
    getStatesFromIDB();
  }

  // This is needed for unlogged-in user. recOfToday objectstore is not cleared when an unlogged-in user closes the app as opposed to the case a logged in user closes the app.
  function setRecordsUsingDataFromIDB() {
    async function getTodaySession() {
      let data = await retrieveTodaySessionsFromIDB();

      let dataSet = new Set(data);

      setRecords((prev) => {
        prev.forEach((val) => {
          dataSet.add(val);
        });
        return Array.from(dataSet);
      });
    }
    getTodaySession();
  }

  function subscribeToRePersistingFailedRecOfToday() {
    const unsub = pubsub.subscribe(
      "addFailedRecOfTodayToIDB",
      (newlyAddedRecArr) => {
        setRecords((prev) => [...prev, ...newlyAddedRecArr]);
      }
    );

    return () => {
      unsub();
    };
  }

  // 이전에 zustand 도입하기 전에, idb에 데이터를 push한 후 그 데이터들을 이런식으로 받아야 했던 적이 있음.
  function subscribeToSuccessOfPersistingTimerStatesWithCurrentCycleInfoToIDB() {
    // Since UserContext component is rendered after this Main component is rendered when signing in.
    const unsub = pubsub.subscribe(
      SUCCESS_PersistingTimersStatesWithCycleInfoToIDB,
      (data) => {
        setStatesRelatedToTimer(data.timersStates);
        setCurrentCycleInfo(data.currentCycleInfo);
        areDataForRunningTimerFetched.current[0] = true;
      }
    );

    return () => {
      unsub();
    };
  }

  //* This is called later than the setRecordsUsingDataFromIDB()
  function subscribeToSuccessOfPersistingRecordsOfTodayToIDB() {
    const unsub = pubsub.subscribe(
      "successOfPersistingRecordsOfTodayToIDB",
      (data) => {
        setRecords(data);
        areDataForRunningTimerFetched.current[1] = true;
      }
    );

    return () => {
      unsub();
    };
  }
  //#endregion

  // When this main page is loaded,
  // pomoSetting is fetched from a remote server unlike the statesRelatedToTimer is retrieved from a browser's storage (client side).
  // Therefore, I just want to show "loading timer..." message only when the pomoSetting is not ready.
  // Reason:
  // User experience에 유의미하게 영향을 주는 요소는 여기서
  // pomoSetting object를 가져오는 데 걸리는 시간이다.
  // 왜냐하면 이것은 애초에 remote server에서 가져오는 데이터이기 때문이다(비록 cache를 하더라도).
  // statesRelatedToTimer는 user가 사용하는 브라우저에 저장되기 때문에 준비하는 데 걸리는 시간은 유의미한 영향을 주지 않는다.
  // TODO: I think this becomes always true after we apply the zustand store (because of initial value is never an empty object)
  const isPomoSettingReady = pomoSetting !== null;
  const isAutoStartSettingReady = autoStartSetting !== null;
  const isStatesRelatedToTimerReady = statesRelatedToTimer !== null;
  const isCurrentCycleInfoReady = currentCycleInfo !== null;
  const isUserAuthReady = user !== null;
  const areDataForRunningTimerFetchedCompletely =
    areDataForRunningTimerFetched.current[0] &&
    areDataForRunningTimerFetched.current[1];

  const SUM_OF_RATIO =
    VH_RATIO.NAV_BAR + VH_RATIO.TIMELINE + VH_RATIO.DETAIL_AREA;
  const SUM_OF_MIN =
    MINIMUMS.NAV_BAR + MINIMUMS.TIMELINE + MINIMUMS.DETAIL_AREA;

  return (
    <main>
      <RecOfToday records={records} />
      <section
        css={css`
          min-height: calc(
            100vh - max(${SUM_OF_RATIO}vh, ${SUM_OF_MIN}px)
          ); // This CSS rule is intended to make this section extend to the bottom of the viewport.
          display: grid;
          justify-items: center;
          align-items: center;

          @media (width <= ${BREAK_POINTS.MOBILE}) {
            justify-items: stretch;
          }
        `}
      >
        {isStatesRelatedToTimerReady &&
          isCurrentCycleInfoReady &&
          (isPomoSettingReady && isAutoStartSettingReady ? (
            localStorage.getItem("user") === "authenticated" ? ( // Though the user item is authenticated, the auth variable`user` below could not be ready yet.
              isUserAuthReady ? (
                // Though the user auth is ready, user's data needed to run a timer might not be ready.
                areDataForRunningTimerFetchedCompletely ? (
                  <Grid //* grid item이자 grid container
                    placeContent="center"
                    placeItems="center"
                    rowGap="14px"
                    maxWidth="687px"
                  >
                    <GridItem width="100%">
                      <BoxShadowWrapper>
                        <TimerController
                          statesRelatedToTimer={statesRelatedToTimer}
                          currentCycleInfo={currentCycleInfo}
                          pomoSetting={pomoSetting}
                          autoStartSetting={autoStartSetting}
                          records={records}
                          setRecords={setRecords}
                        />
                      </BoxShadowWrapper>
                    </GridItem>
                    <GridItem width={"100%"}>
                      {user !== null && (
                        <BoxShadowWrapper>
                          <CategoryList />
                        </BoxShadowWrapper>
                      )}
                    </GridItem>
                    <GridItem width={"100%"}>
                      {user !== null && isTodoistIntegrationEnabled && (
                        <BoxShadowWrapper>
                          <TodoistTasks />
                        </BoxShadowWrapper>
                      )}
                    </GridItem>
                  </Grid>
                ) : (
                  <h2>fetching data...</h2>
                )
              ) : (
                // User auth: NOT READY, user's data required to run timer: NOT READY
                <h2>loading timer...</h2>
              )
            ) : (
              // When a user logs out,
              <Grid //* flex item이자 grid container
                placeContent="center"
                placeItems="center"
                rowGap="14px"
                maxWidth="687px"
              >
                <GridItem width="100%">
                  <BoxShadowWrapper>
                    <TimerController
                      statesRelatedToTimer={statesRelatedToTimer}
                      currentCycleInfo={currentCycleInfo}
                      pomoSetting={pomoSetting}
                      autoStartSetting={autoStartSetting}
                      records={records}
                      setRecords={setRecords}
                    />
                  </BoxShadowWrapper>
                </GridItem>
              </Grid>
            )
          ) : (
            <h2>loading timer...</h2>
          ))}
      </section>
    </main>
  );
}
