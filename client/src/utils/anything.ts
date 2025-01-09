import { AxiosRequestConfig } from "axios";
import { UpdateCategoryDTOWithUUID } from "../axios-and-error-handling/errorController";

export function insert_UUID_to_reqConfig(
  reqConfig: AxiosRequestConfig<any>,
  _uuid: string | undefined
) {
  if (!_uuid) return reqConfig; //? 그냥... non-undefined assertion하기 쫄려서..

  let parsed: UpdateCategoryDTOWithUUID = JSON.parse(reqConfig.data);
  if (_uuid) parsed._uuid = _uuid;
  reqConfig.data = JSON.stringify(parsed);

  return reqConfig;
}
