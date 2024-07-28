import { StyledBox, StyledBoxProps } from "./styles/Box.styled";

// TODO: 대충 유추해서 이렇게 되겠지 하고 이렇게 type 만들었는데 우선 error는 안났음. 그런데 runtime에서 뭘 확인해야하는지 잘 모르겟음.

type BoxShadowWrapperProp = StyledBoxProps & { children: React.ReactNode };

export function BoxShadowWrapper({ children, ...props }: BoxShadowWrapperProp) {
  return <StyledBox {...props}>{children}</StyledBox>;
}
