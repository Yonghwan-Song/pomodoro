import {
  StyledLoadingMessageProps,
  StyledLoadingMessage,
} from "../styles/LoadingMessage.styled";

type LoadingMessageProps = StyledLoadingMessageProps & {
  children: React.ReactNode;
};

export function LoadingMessage({ children, ...props }: LoadingMessageProps) {
  return <StyledLoadingMessage {...props}>{children}</StyledLoadingMessage>;
}
