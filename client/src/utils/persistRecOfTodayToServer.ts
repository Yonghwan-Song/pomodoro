import { RecType } from "../types/clientStatesType";
import { axiosInstance } from "../axios-and-error-handling/axios-instances";
import { DynamicCache, openCache } from "../index";
import { CacheName, BASE_URL, RESOURCE } from "../constants";

export async function persistRecOfTodayToServer(
  record: RecType,
  authGuard: unknown
) {
  try {
    // caching
    let cache = DynamicCache || (await openCache(CacheName));
    let resOfRecordOfToday = await cache.match(
      BASE_URL + RESOURCE.TODAY_RECORDS
    );
    if (resOfRecordOfToday !== undefined) {
      let recordsOfToday = await resOfRecordOfToday.json();
      recordsOfToday.push({
        record,
      });
      await cache.put(
        BASE_URL + RESOURCE.TODAY_RECORDS,
        new Response(JSON.stringify(recordsOfToday))
      );
    }

    // http request
    authGuard &&
      (await axiosInstance.post(RESOURCE.TODAY_RECORDS, {
        ...record,
      }));
  } catch (error) {
    console.warn(error);
  }
}
