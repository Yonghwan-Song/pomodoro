/*How to use this file
 *
 * import Components from multiple files under the Pages directory.
 *
 * export them here at once so that we can import them easily from other files.
 *
 * import { AboutUs } from "./AboutUs/about-us";
 * import { Login } from "./Login/login";
 * import { Main } from "./Main/main";
 *
 * export { AboutUs, Login, Main };
 * */

import Main from "./Main/Main";
import Signin from "./Signin/Signin";
import Setting from "./Setting/Setting";
export { Main, Signin, Setting };
