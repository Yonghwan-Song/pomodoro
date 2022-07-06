import { async } from "@firebase/util";
import React from "react";
import { Link } from "react-router-dom";
import { UserAuth } from "../../Auth/AuthContext";
import styles from "./navBar.module.css";

const Navbar = () => {
  const { user, logOut } = UserAuth();

  const handleSignOut = async () => {
    try {
      await logOut();
    } catch (error) {
      console.log(error);
    }
  };

  // TODO: remove the purple color for visited links.
  return (
    <nav className={styles.nav}>
      <Link to="/" className={`${styles.siteTitle} ${styles.textLink}`}>
        Pomodoro Timer
      </Link>
      <ul className={styles.navUl}>
        {user?.displayName ? (
          <li>
            <button onClick={handleSignOut}>Logout</button>
          </li>
        ) : (
          <li>
            <Link to="/signin" className={styles.textLink}>
              Sign in
            </Link>
          </li>
        )}
      </ul>
    </nav>
  );
};

export default Navbar;
