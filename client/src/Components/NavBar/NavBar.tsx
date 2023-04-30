import React from "react";
import { useRef } from "react";
import { useState } from "react";
import { UserAuth } from "../../Context/AuthContext";
import { StyledNav } from "../styles/Nav.styled";
import { UnorderedList } from "../UnorderedList";
import { StyledLink } from "../styles/Link.styled";
import { useTheme } from "styled-components";
import styles from "./navBar.module.css";
import { ThemeCustomized } from "../../App";

function Navbar() {
  const { user, logOut } = UserAuth()!; //TODO: NavBar는 Login안해도 render되니까.. non-null assertion 하면 안되나? 이거 navBar가 먼저 render되는 것 같아 contexts 보다. non-null assertion 다시 확인해봐
  const [isActive, setIsActive] = useState(false);
  const ulRef = useRef<HTMLUListElement | null>(null); // interface MutableRefObject<T> { current: T;}
  const theme = useTheme() as ThemeCustomized; //TODO: 우선 error는 없어졌는데 이게 맞는건지 잘 모르겠어...

  async function handleSignOut() {
    try {
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
    // function handleLinkClick(e: React.MouseEvent) {
    if (localStorage.getItem("isTimerRunning") === "yes") {
      e.preventDefault();
      alert(
        "Timer is Running. Please end the timer or finish it before navigating to other pages"
      );
    } else {
      toggleSideBar();
    }
  }

  function handleLinkClick2(e: React.SyntheticEvent) {
    // function handleLinkClick(e: React.MouseEvent) {
    if (localStorage.getItem("isTimerRunning") === "yes") {
      e.preventDefault();
      alert(
        "Timer is Running. Please end the timer or finish it before navigating to other pages"
      );
    } else {
      handleSignOut();
    }
  }

  return (
    <StyledNav>
      <StyledLink to="/timer" size="2rem" letterSpacing="7px">
        Pomodoro
      </StyledLink>

      <UnorderedList ref={ulRef} isSideBarActive={isActive} liOpacity>
        <li>
          <StyledLink to="/statistics" onClick={handleLinkClick}>
            Statistics
          </StyledLink>
        </li>
        <li>
          <StyledLink to="/setting" onClick={handleLinkClick}>
            Setting
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
