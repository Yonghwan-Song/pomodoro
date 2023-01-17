declare module "*.module.css";

// https://stackoverflow.com/questions/54121536/typescript-module-svg-has-no-exported-member-reactcomponent
declare module "*.svg" {
  import React from "react";

  export const ReactComponent: React.FunctionComponent<
    React.SVGProps<SVGSVGElement>
  >;
  const src: string;
  export default src;
}
