import React from "react";
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
  StatesType,
  emptyRecOfToday,
  emptyStateStore,
  obtainStatesFromIDB,
  stopCountDownInBackground,
  updateTimersStates,
} from "../..";
import { RequiredStatesToRunTimerType } from "../../types/clientStatesType";
import * as CONSTANTS from "../../constants/index";
import { useUserContext } from "../../Context/UserContext";
import { pubsub } from "../../pubsub";

function Navbar() {
  const { user, logOut } = useAuthContext()!; //TODO: NavBar는 Login안해도 render되니까.. non-null assertion 하면 안되나? 이거 navBar가 먼저 render되는 것 같아 contexts 보다. non-null assertion 다시 확인해봐
  const { setPomoInfo } = useUserContext()!;
  const [isActive, setIsActive] = useState(false);
  const ulRef = useRef<HTMLUListElement | null>(null); // interface MutableRefObject<T> { current: T;}
  const theme = useTheme() as ThemeCustomized;

  async function handleSignOut() {
    try {
      // For the signing out user to continue his timer when re-signing in.
      const statesFromIDB = await obtainStatesFromIDB("withoutPomoSetting");
      if (Object.entries(statesFromIDB).length !== 0) {
        if (user !== null) {
          await updateTimersStates(user, statesFromIDB as StatesType);
          // await updateTimersStatesWithFetch(user, statesFromIDB as StatesType);
        }
      }
      localStorage.setItem("user", "unAuthenticated");
      await emptyStateStore();
      await emptyRecOfToday(); //!<-----
      pubsub.publish("clearObjectStores", 1); // move this to after `await logOut()`
      await caches.delete(CONSTANTS.CacheName);
      //#region To allow un-logged-in users to start to use this app with default pomoSetting. (the default value for pomoSetting set in the server-sdie is the same one as below)
      setPomoInfo((prev) => {
        return {
          ...(prev as RequiredStatesToRunTimerType),
          pomoSetting: {
            pomoDuration: 25,
            shortBreakDuration: 5,
            longBreakDuration: 15,
            numOfPomo: 4,
          },
        };
      });
      //#endregion

      await logOut();
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

      // navLinks.forEach((link: HTMLLIElement, index) => {
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
      <StyledLink to="/timer" size="2rem" letterSpacing="7px">
        Pomodoro
      </StyledLink>

      <UnorderedList ref={ulRef} isSideBarActive={isActive} liOpacity>
        {user !== null && (
          <li>
            <StyledLink to="/statistics" onClick={handleLinkClick}>
              Statistics
            </StyledLink>
          </li>
        )}
        <li>
          <StyledLink to="/settings" onClick={handleLinkClick}>
            Settings
          </StyledLink>
        </li>
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
              size="1rem"
              color={"#181313"}
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
