//import  {createContext, ReactElement} from 'react'
//import {render, RenderOptions} from '@testing-library/react'
//import { UserAuth } from "./Auth/AuthContext.js"
//const PomoSettingContext = createContext();

//const customRender = (
//ui: ReactElement,
//options?: Omit<RenderOptions, 'wrapper'>,
//) => render(ui, {wrapper: , ...options})

//export * from '@testing-library/react'
//export {customRender as render}

import { render } from "@testing-library/react";
// import { AuthContextProvider } from "./Auth/AuthContext.js";
// import { UserContextProvider } from "./Components/UserContext.js";
import { AuthContextProvider } from "./Context/AuthContext";
import { UserContextProvider } from "./Context/UserContext";

const AllTheProviders = ({ children }) => {
  return (
    <AuthContextProvider>
      <UserContextProvider>{children}</UserContextProvider>
    </AuthContextProvider>
  );
};

// const customRender = (ui, options) =>
//   render(ui, { wrapper: AllTheProviders, ...options });
const customRender = (ui, options) => render(ui, { ...options });

// re-export everything
export * from "@testing-library/react";

// override render method
export { customRender as render };
