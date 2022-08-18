import { async } from "@firebase/util";
import React from "react";
import { useRef } from "react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { UserAuth } from "../../Auth/AuthContext";
import styles from "./navBar.module.css";

function Navbar() {
  const { user, logOut } = UserAuth();
  const [isActive, setIsActive] = useState(false);
  const ulRef = useRef(null);

  async function handleSignOut() {
    try {
      await logOut();
    } catch (error) {
      console.log(error);
    }
  }

  function toggleSideBar() {
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

  return (
    <nav className={styles.nav}>
      <Link to="/timer" className={`${styles.siteTitle} ${styles.textLink}`}>
        Pomodoro
      </Link>

      <ul
        className={`${styles.navLinks} ${
          isActive ? styles.navLinksActive : ""
        }`}
        ref={ulRef}
      >
        <li className={styles.navLinksItems}>
          <Link
            to="/statistics"
            className={`${styles.otherMenu} ${styles.textLink}`}
          >
            Statistics
          </Link>
        </li>
        <li className={styles.navLinksItems}>
          <Link
            to="/setting"
            className={`${styles.otherMenu} ${styles.textLink}`}
          >
            Setting
          </Link>
        </li>
        {user?.displayName ? (
          <li className={styles.navLinksItems}>
            {/* <button onClick={handleSignOut}>Logout</button> */}
            <span className={styles.span} onClick={handleSignOut}>
              Logout
            </span>
          </li>
        ) : (
          <li className={styles.navLinksItems}>
            <Link to="/signin" className={styles.textLink}>
              Sign in
            </Link>
          </li>
        )}
      </ul>
      <div className={styles.burger} onClick={toggleSideBar}>
        <div className={styles.burgerDiv}></div>
        <div className={styles.burgerDiv}></div>
        <div className={styles.burgerDiv}></div>
      </div>
    </nav>
  );
}

export default Navbar;
