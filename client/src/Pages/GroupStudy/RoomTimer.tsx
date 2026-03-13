import { useBoundedPomoInfoStore } from "../../zustand-stores/pomoInfoStoreUsingSlice";
import { TimerController } from "../Main/Timer-Related/TimerController/TimerController";
import { BoxShadowWrapper } from "../../ReusableComponents/Wrapper";
import { Grid } from "../../ReusableComponents/Layouts/Grid";
import { GridItem } from "../../ReusableComponents/Layouts/GridItem";
import { useTimerData } from "../../Custom-Hooks/useTimerData";
import { css } from "../../../styled-system/css";

/**
 * RoomTimer Component
 *
 * Group Study Room(/group-study/room/:roomId) 내부에서 렌더링되는 가벼운 버전의 타이머입니다.
 * Main 페이지(/timer)의 복잡한 UI(타임라인, 카테고리 리스트, Todoist 등)를 모두 제거하고
 * 오직 핵심 타이머(TimerController)만 렌더링합니다.
 */
export function RoomTimer() {
  // useTimerData 훅을 통해 타이머 구동에 필요한 IndexedDB 데이터들을 불러옵니다.
  // DESIGN: skipPubSub: true 옵션을 전달하는 이유:
  // 사용자가 이미 /timer 페이지를 방문하여 전역 PubSub 이벤트들이 구독 및 완료된 상태이기 때문에,
  // RoomTimer가 마운트될 때 굳이 이벤트들을 다시 구독하지 않고 IndexedDB에 저장된 최신 상태만 빠르게 읽어오기 위함입니다.
  const {
    statesRelatedToTimer,
    currentCycleInfo,
    records,
    setRecords,
    isStatesRelatedToTimerReady,
    isCurrentCycleInfoReady
  } = useTimerData({ skipPubSub: true });

  // 서버(혹은 로컬)에서 가져온 사용자 설정값들을 Zustand 스토어에서 읽어옵니다.
  const pomoSetting = useBoundedPomoInfoStore((state) => state.pomoSetting);
  const autoStartSetting = useBoundedPomoInfoStore(
    (state) => state.autoStartSetting
  );

  const isPomoSettingReady = pomoSetting !== null;
  const isAutoStartSettingReady = autoStartSetting !== null;

  // 타이머 렌더링을 위해 필요한 모든 데이터가 준비되었는지 확인하는 안전 장치(Gate)입니다.
  const isReady =
    isStatesRelatedToTimerReady &&
    isCurrentCycleInfoReady &&
    isPomoSettingReady &&
    isAutoStartSettingReady;

  if (!isReady) {
    return (
      <div
        className={css({
          padding: "4",
          textAlign: "center",
          color: "gray.500"
        })}
      >
        loading timer...
      </div>
    );
  }

  return (
    <div
      className={css({
        display: "flex",
        alignItems: "center"
      })}
    >
      <Grid
        placeContent="center"
        placeItems="center"
        rowGap="14px"
        padding="0px"
        style={{ width: "auto" }}
      >
        <GridItem width="auto">
          <BoxShadowWrapper
            boxShadowColor="transparent"
            border="2px solid black"
          >
            <TimerController
              variant="mini"
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
    </div>
  );
}
