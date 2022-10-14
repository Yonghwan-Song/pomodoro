import { async } from "@firebase/util";
import React from "react";
import { useRef } from "react";
import { useState } from "react";
import { UserAuth } from "../../Auth/AuthContext";
import { StyledNav } from "../styles/Nav.styled";
import { UnorderedList } from "../UnorderedList";
import { StyledLink } from "../styles/Link.styled";
import { useTheme } from "styled-components";
import styles from "./navBar.module.css";

function Navbar(props) {
  const { user, logOut } = UserAuth();
  const [isActive, setIsActive] = useState(false);
  const ulRef = useRef(null);
  const theme = useTheme();

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

      // toggle the ul element
      setIsActive(!isActive);

      // apply animation to the li elements
      let navLinks = Array.from(ulRef.current.children);
      console.log(navLinks);

      navLinks.forEach((link, index) => {
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
    // // toggle the ul element
    // setIsActive(!isActive);

    // // apply animation to the li elements
    // let navLinks = Array.from(ulRef.current.children);
    // console.log(navLinks);

    // navLinks.forEach((link, index) => {
    //   if (link.style.animation) {
    //     link.style.animation = "";
    //   } else {
    //     link.style.animation = `${styles.navLinksFade} 0.5s ease forwards ${
    //       index / 7 + 0.2
    //     }s`;
    //   }
    //   console.log(link.style);
    //   console.log(index / 7);
    // });
  }

  return (
    <StyledNav>
      <StyledLink to="/timer" size="2rem" letterSpacing="7px">
        Pomodoro
      </StyledLink>

      <UnorderedList ref={ulRef} isSideBarActive={isActive} liOpacity>
        <li>
          <StyledLink to="/statistics" onClick={toggleSideBar}>
            Statistics
          </StyledLink>
        </li>
        <li>
          <StyledLink to="/setting" onClick={toggleSideBar}>
            Setting
          </StyledLink>
        </li>
        {user?.displayName ? (
          <li>
            <span
              className={styles.span}
              onClick={() => {
                handleSignOut();
                toggleSideBar();
              }}
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
