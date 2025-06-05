import { useEffect, useRef } from "react";
import { useState } from "react";
import { useAuthContext } from "../../Context/AuthContext";
import { StyledNav } from "../../ReusableComponents/styles/Nav.styled";
import { UnorderedList } from "../../ReusableComponents/UnorderedList";
import { StyledLink } from "../../ReusableComponents/styles/Link.styled";
import { useTheme } from "styled-components";
import styles from "./navBar.module.css";
import { ThemeCustomized } from "../../App";
import {
  clearCategoryStore,
  clearRecOfToday,
  deciderOfWhetherDataForRunningTimerFetched,
  deleteCache,
  obtainStatesFromIDB,
  setStateStoreToDefault,
  stopCountDownInBackground,
  persistTimersStatesToServer,
} from "../..";
import {
  TimersStatesType,
  TimersStatesTypeWithCurrentCycleInfo,
} from "../../types/clientStatesType";
import { errController } from "../../axios-and-error-handling/errorController";
import { pubsub } from "../../pubsub";
import * as CONSTANTS from "../../constants/index";
import { useBoundedPomoInfoStore } from "../../zustand-stores/pomoInfoStoreUsingSlice";

function Navbar() {
  const updateCategoryChangeInfoArray = useBoundedPomoInfoStore(
    (state) => state.setCategoryChangeInfoArray
  );
  const { user, logOut } = useAuthContext()!; //TODO: NavBar는 Login안해도 render되니까.. non-null assertion 하면 안되나? 이거 navBar가 먼저 render되는 것 같아 contexts 보다. non-null assertion 다시 확인해봐
  const [isActive, setIsActive] = useState(false);
  const ulRef = useRef<HTMLUListElement | null>(null); // interface MutableRefObject<T> { current: T;}
  const theme = useTheme() as ThemeCustomized;

  // Main에서와 다르게 pomoInfo는 null값을 가질 수 있다. Main에서는 conditional rendering했던 것으로 기억.

  async function handleSignOut() {
    try {
      // 로그아웃 시도하는 당시의 데이터를 서버에 persist 해놓는다. 이유: 다음에 다시 로그인 했을 때, 이어서 사용할 수 있도록 하기 위해.
      const statesFromIDB = await obtainStatesFromIDB("withoutSettings");
      if (Object.entries(statesFromIDB).length !== 0) {
        if (user !== null) {
          //* Reason: statesFromIDB now includes currentCycleInfo, which is not a part of the TimersStates.
          const { currentCycleInfo, ...timersStatesFromIDB } =
            statesFromIDB as TimersStatesTypeWithCurrentCycleInfo;
          await persistTimersStatesToServer(
            timersStatesFromIDB as TimersStatesType
          );
        }
      }
      await setStateStoreToDefault(); //TODO: index.tsx에서 unload할때는 clear하고 여기서는 default로 했음. 이유를 까먹었다. 왜 안적었지? //! issue 38
      await clearRecOfToday();
      await clearCategoryStore();
      await deleteCache(CONSTANTS.CacheName);
      //#region Original
      // localStorage.setItem("user", "unAuthenticated");
      // sessionStorage.removeItem(CONSTANTS.CURRENT_CATEGORY_NAME);
      // sessionStorage.removeItem(CONSTANTS.CURRENT_TASK_ID);
      // sessionStorage.removeItem(CONSTANTS.CURRENT_SESSION_TYPE); //? 이거 지워도 되나?... 다시 reset안되면 우짜지?
      // deciderOfWhetherDataForRunningTimerFetched[0] = false;
      // deciderOfWhetherDataForRunningTimerFetched[1] = false;
      //#endregion
      await logOut();
      //#region New - 위치가 logOut()다음에 와야하는거 아닌가 싶어서. Error로 로그아웃 안되었을 때 저거 다 지워지면 제대로 뭐 못하잖아.
      localStorage.setItem("user", "unAuthenticated");
      sessionStorage.removeItem(CONSTANTS.CURRENT_CATEGORY_NAME);
      sessionStorage.removeItem(CONSTANTS.CURRENT_TASK_ID);
      sessionStorage.removeItem(CONSTANTS.CURRENT_SESSION_TYPE); // firefox, chromium 둘다 remove하고 TC가 다시 set하는 과정에 문제 없음.
      deciderOfWhetherDataForRunningTimerFetched[0] = false;
      deciderOfWhetherDataForRunningTimerFetched[1] = false;
      //#endregion
      errController.emptyFailedReqInfo();
      window.location.reload(); // beforeunload event handler doesn't work here.
    } catch (error) {
      console.warn(error);
    }
  }

  function toggleSideBar() {
    if (window.innerWidth <= Number(theme.mobile.slice(0, -2))) {
      // console.log(`inner width - ${window.innerWidth}
      // theme.mobile - ${theme.mobile}`);

      // Toggle the ul element
      setIsActive(!isActive);

      // Apply animation to the li elements
      let navLinks = Array.from(
        ulRef.current!.children as HTMLCollectionOf<HTMLLIElement>
      ); // children property is inhertied from the Element interface
      // console.log(navLinks);

      navLinks.forEach((link: HTMLLIElement, index) => {
        if (link.style.animation) {
          link.style.animation = "";
        } else {
          link.style.animation = `${styles.navLinksFade} 0.5s ease forwards ${
            index / 7 + 0.2
          }s`;
        }
        // console.log(link.style);
        // console.log(index / 7);
      });
    }
  }

  function handleLinkClick(e: React.SyntheticEvent) {
    toggleSideBar();
    setIsActive(!isActive);
  }

  function handleLinkClick2(e: React.SyntheticEvent) {
    stopCountDownInBackground();
    handleSignOut();
  }

  // When this component is mounted, user is null. Thus, subscription does not happen.
  // But after a usre logs in, a subscription to the event starts...
  // When the user logs out, ubsub() is supposed to be called. But I guess it will not be since the entire app is going to be refreshed...
  // Though the return statement does not have to be here due to the reason above, I will just keep it.. since it is logically correct...?....
  useEffect(() => {
    if (user == null) return;

    const unsub = pubsub.subscribe("sessionEndBySW", (payload) => {
      // console.log("inside sessionEndBySW subscriber: user is", user);
      updateCategoryChangeInfoArray(payload); //? 이게 먼저 실행되고, autoStartCurrentSession의 changeTimestamp할당이 일어나겠지?
    });

    return () => {
      unsub();
    };
  }, [user]);

  return (
    <StyledNav>
      <StyledLink
        to="/timer"
        max={{ constant: "1.5rem", variable: "3.2424vh" }}
        letterSpacing="7px"
      >
        Pomodoro
      </StyledLink>

      <UnorderedList ref={ulRef} isSideBarActive={isActive} liOpacity>
        {user !== null && (
          <li>
            <StyledLink
              to="/statistics"
              max={{ constant: "1rem", variable: "2.4318vh" }}
              onClick={handleLinkClick}
            >
              Statistics
            </StyledLink>
          </li>
        )}
        <li>
          <StyledLink
            to="/settings"
            max={{ constant: "1rem", variable: "2.4318vh" }}
            onClick={handleLinkClick}
          >
            Settings
          </StyledLink>
        </li>
        {/* TODO: signOut도 responsive하게 바꿔야함. */}
        {user?.displayName ? (
          <li>
            <span
              className={styles.span}
              id="signOut"
              onClick={handleLinkClick2}
            >
              Logout
            </span>
          </li>
        ) : (
          <li>
            <StyledLink
              to="/signin"
              onClick={toggleSideBar}
              max={{ constant: "0.75rem", variable: "1.6212vh" }}
              color={"#FFB86C"}
              hover
            >
              Sign in
            </StyledLink>
          </li>
        )}
      </UnorderedList>

      <div className={styles.burger} onClick={toggleSideBar}>
        <div className={styles.burgerDiv}></div>
        <div className={styles.burgerDiv}></div>
        <div className={styles.burgerDiv}></div>
      </div>
    </StyledNav>
  );
}

export default Navbar;
