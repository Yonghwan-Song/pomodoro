import { useContext, createContext, Dispatch, SetStateAction } from "react";
import { UserAuth } from "./AuthContext";
import * as C from "../constants/index";
import { useFetch } from "../Custom-Hooks/useFetch";

export type PomoSettingType = {
  pomoDuration: number;
  shortBreakDuration: number;
  longBreakDuration: number;
  numOfPomo: number;
};

type UserInfoContextType = {
  pomoSetting: PomoSettingType | null;
  setPomoSetting: Dispatch<SetStateAction<PomoSettingType | null>>;
};

export const UserContext = createContext<UserInfoContextType | null>(null);

export function UserContextProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isNewUser, isNewUserRegistered } = UserAuth()!;

  const [pomoSetting, setPomoSetting] = useFetch<PomoSettingType>({
    urlSegment: C.URLs.USER,
    additionalDeps: [isNewUser, isNewUserRegistered],
    additionalCondition: isNewUser === false || isNewUserRegistered,
  });

  return (
    <>
      <UserContext.Provider
        value={{ pomoSetting: pomoSetting, setPomoSetting: setPomoSetting }}
      >
        {children}
      </UserContext.Provider>
    </>
  );
}

export function UserInfo() {
  return useContext(UserContext);
}
