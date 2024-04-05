import axios from "axios";
import { URLs } from "../constants";

export const axiosInstance = axios.create({
  baseURL: URLs.ORIGIN,
});
