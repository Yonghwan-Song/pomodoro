import React, { useEffect } from "react";
import { useRef } from "react";
import { useState } from "react";
import { useAuthContext } from "../../Context/AuthContext";
import { StyledNav } from "../styles/Nav.styled";
import { UnorderedList } from "../UnorderedList";
import { StyledLink } from "../styles/Link.styled";
import { useTheme } from "styled-components";
import styles from "./navBar.module.css";
import { ThemeCustomized } from "../../App";
import {
  clearRecOfToday,
  deciderOfWhetherDataForRunningTimerFetched,
  obtainStatesFromIDB,
  setStateStoreToDefault,
  stopCountDownInBackground,
  updateTimersStates,
} from "../..";
import { TimersStatesType } from "../../types/clientStatesType";
import { errController } from "../../axios-and-error-handling/errorController";
import { pubsub } from "../../pubsub";
import * as CONSTANTS from "../../constants/index";

function Navbar() {
  const { user, logOut } = useAuthContext()!; //TODO: NavBar는 Login안해도 render되니까.. non-null assertion 하면 안되나? 이거 navBar가 먼저 render되는 것 같아 contexts 보다. non-null assertion 다시 확인해봐
  const [isActive, setIsActive] = useState(false);
  const ulRef = useRef<HTMLUListElement | null>(null); // interface MutableRefObject<T> { current: T;}
  const theme = useTheme() as ThemeCustomized;

  async function handleSignOut() {
    try {
      // 로그아웃 시도하는 당시의 데이터를 서버에 persist 해놓는다. 이유: 다음에 다시 로그인 했을 때, 이어서 사용할 수 있도록 하기 위해.
      const statesFromIDB = await obtainStatesFromIDB("withoutSettings");
      if (Object.entries(statesFromIDB).length !== 0) {
        if (user !== null) {
          await updateTimersStates(user, statesFromIDB as TimersStatesType);
        }
      }
      await setStateStoreToDefault();
      await clearRecOfToday();
      pubsub.publish("prepareTimerRelatedDBForUnloggedInUser", 1); //어차피 recOfToday도 이 시점에서는 clear되었기 때문에 따로 event를 만들어서 publish하지 않겠다.
      caches.delete(CONSTANTS.CacheName);
      localStorage.setItem("user", "unAuthenticated");
      deciderOfWhetherDataForRunningTimerFetched[0] = false;
      deciderOfWhetherDataForRunningTimerFetched[1] = false;
      await logOut();
      errController.emptyFailedReqInfo();
    } catch (error) {
      console.log(error);
    }
  }

  function toggleSideBar() {
    if (window.innerWidth <= Number(theme.mobile.slice(0, -2))) {
      console.log(`inner width - ${window.innerWidth}
      theme.mobile - ${theme.mobile}`);

      // Toggle the ul element
      setIsActive(!isActive);

      // Apply animation to the li elements
      let navLinks = Array.from(
        ulRef.current!.children as HTMLCollectionOf<HTMLLIElement>
      ); // children property is inhertied from the Element interface
      console.log(navLinks);

      navLinks.forEach((link: HTMLLIElement, index) => {
        if (link.style.animation) {
          link.style.animation = "";
        } else {
          link.style.animation = `${styles.navLinksFade} 0.5s ease forwards ${
            index / 7 + 0.2
          }s`;
        }
        console.log(link.style);
        console.log(index / 7);
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
