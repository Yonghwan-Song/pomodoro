import React from "react";
import { StyledUnorderedList } from "./styles/UnorderedList.styled";
import { ListItems } from "./ListItems";
export const UnorderedList = React.forwardRef(
  ({ children, isSideBarActive, liOpacity }, ref) => (
    <StyledUnorderedList ref={ref} isSideBarActive={isSideBarActive} liOpacity>
      {children}
    </StyledUnorderedList>
  )
);
