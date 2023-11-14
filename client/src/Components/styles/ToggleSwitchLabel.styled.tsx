import styled, { css } from "styled-components";

export type StyledLabelForSwitchPropsType = {
  isHorizontal: boolean;
  marginBetweenLabelNameAndSwitch?: number;
};

export const StyledLabelForSwitch = styled.label.attrs((props) => ({
  htmlFor: props.htmlFor,
}))<StyledLabelForSwitchPropsType>`
  ${({ isHorizontal, marginBetweenLabelNameAndSwitch }) => {
    if (isHorizontal === true) {
      return css`
        display: flex;
        align-items: center;
        & > p {
          margin-right: ${marginBetweenLabelNameAndSwitch
            ? marginBetweenLabelNameAndSwitch + "px"
            : "20px"};
        }
      `;
    }

    // else로 하면 뭔가 null?이런거에 영향 받을 것 같아서 우선 이렇게 false를 따로 만들었음.
    if (isHorizontal === false) {
      return css`
        & > p {
          margin-bottom: ${marginBetweenLabelNameAndSwitch
            ? marginBetweenLabelNameAndSwitch + "px"
            : "20px"};
        }
      `;
    }
  }}
  cursor: pointer
`;
