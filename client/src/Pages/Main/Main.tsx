/** @jsxImportSource @emotion/react */
import { useAuthContext } from "../../Context/AuthContext";
import RecOfToday from "./Timeline-Related/RecOfToday";
import { BREAK_POINTS, MINIMUMS, VH_RATIO } from "../../constants";
import CategoryList from "./Category-Related/CategoryList";
import { BoxShadowWrapper } from "../../ReusableComponents/Wrapper";
import { Grid } from "../../ReusableComponents/Layouts/Grid";
import { GridItem } from "../../ReusableComponents/Layouts/GridItem";
import { useBoundedPomoInfoStore } from "../../zustand-stores/pomoInfoStoreUsingSlice";
import { TimerController } from "./Timer-Related/TimerController/TimerController";
import { TodoistTasks } from "./Todoist-Related/TodoistTasks";
import { css } from "@emotion/react";
import { useTimerData } from "../../Custom-Hooks/useTimerData";

export default function Main() {
  const { user } = useAuthContext()!;

  // 이전에 이 파일에 존재하던 타이머의 상태, 기록 페칭 로직 및 PubSub 구독 로직들은
  // 모두 useTimerData 훅 내부로 추출되었습니다. 이를 통해 Room.tsx 같은 다른 곳에서도
  // 핵심 타이머 로직을 재사용할 수 있게 되었습니다.
  const {
    statesRelatedToTimer,
    currentCycleInfo,
    records,
    setRecords,
    isStatesRelatedToTimerReady,
    isCurrentCycleInfoReady,
    areDataForRunningTimerFetchedCompletely
  } = useTimerData();

  //* At this point, it doesn't matter whether this setting comes from IDB or the server, as the AuthContextProvider handles it.
  const pomoSetting = useBoundedPomoInfoStore((state) => state.pomoSetting);
  const autoStartSetting = useBoundedPomoInfoStore(
    (state) => state.autoStartSetting
  );
  const isTodoistIntegrationEnabled = useBoundedPomoInfoStore(
    (state) => state.isTodoistIntegrationEnabled
  );

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
  const isUserAuthReady = user !== null;

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
                          statesRelatedToTimer={statesRelatedToTimer!}
                          currentCycleInfo={currentCycleInfo!}
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
                  <h2 css={{ textAlign: "center" }}>fetching data...</h2>
                )
              ) : (
                // User auth: NOT READY, user's data required to run timer: NOT READY
                <h2 css={{ textAlign: "center" }}>loading timer...</h2>
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
                      statesRelatedToTimer={statesRelatedToTimer!}
                      currentCycleInfo={currentCycleInfo!}
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
            <h2 css={{ textAlign: "center" }}>loading timer...</h2>
          ))}
      </section>
    </main>
  );
}
