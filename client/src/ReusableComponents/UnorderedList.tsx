import React, { ForwardedRef, PropsWithoutRef } from "react";
import {
  StyledUnorderedList,
  StyledUnorderedListProps,
} from "./styles/UnorderedList.styled";

type ForwardRefProps = StyledUnorderedListProps & { children: React.ReactNode };

export const UnorderedList = React.forwardRef<
  HTMLUListElement,
  ForwardRefProps
>(
  (
    { children, isSideBarActive, liOpacity }: PropsWithoutRef<ForwardRefProps>,
    ref: ForwardedRef<HTMLUListElement>
  ) => (
    <StyledUnorderedList ref={ref} isSideBarActive={isSideBarActive} liOpacity>
      {children}
    </StyledUnorderedList>
  )
);
