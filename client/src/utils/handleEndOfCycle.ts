import { boundedPomoInfoStore } from "../zustand-stores/pomoInfoStoreUsingSlice";
import { axiosInstance } from "../axios-and-error-handling/axios-instances";
import { RESOURCE } from "../constants";
import { CycleRecord } from "../types/clientStatesType";
import { roundTo_X_DecimalPoints } from "./number-related-utils";
import { getAverage } from "./anything";

export function handleEndOfCycle(
  payload: CycleRecord,
  userEmail: string | null
) {
  console.log(
    "cycleRecord at the endOfCycle case of BC message event handler",
    payload
  );
  const zustandStates = boundedPomoInfoStore.getState();
  const cycleSettingsCloned = structuredClone(zustandStates.cycleSettings);
  let name = "";
  let cycleStatPayload: CycleRecord[] = [];
  let averageAdherenceRatePayload = 1;
  for (let i = 0; i < cycleSettingsCloned.length; i++) {
    const cycleSetting = cycleSettingsCloned[i];
    if (!cycleSetting) continue;
    if (cycleSetting.isCurrent) {
      name = cycleSetting.name;
      if (cycleSetting.cycleStat.length >= 10) {
        cycleSetting.cycleStat.shift();
      }
      cycleSetting.cycleStat.push(payload);
      const adherenceRateArr = cycleSetting.cycleStat.map(
        (record) => record.cycleAdherenceRate
      );
      const averageAdherenceRate = roundTo_X_DecimalPoints(
        getAverage(adherenceRateArr),
        2
      );
      cycleSetting.averageAdherenceRate = averageAdherenceRate;
      averageAdherenceRatePayload = averageAdherenceRate;
      cycleStatPayload = cycleSetting.cycleStat;
    }
  }

  boundedPomoInfoStore.setState({ cycleSettings: cycleSettingsCloned });
  console.log("cycleStatPayload at the BC event handler", cycleStatPayload);
  userEmail &&
    axiosInstance.patch(RESOURCE.CYCLE_SETTINGS, {
      name,
      data: {
        cycleStat: cycleStatPayload,
        averageAdherenceRate: averageAdherenceRatePayload,
      },
    });
}
