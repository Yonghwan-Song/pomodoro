import styled from "styled-components";

interface NumberInputProps {
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  value: number;
  index?: number;
}

const StyledBlockNumberInput = styled.input`
  display: block;
  width: 50px;
  aspect-ratio: 1 / 1;
  border: 1px solid #ccc;
  border-radius: 4px;
  background-color: #f0f0f0;
  padding: 5px;
  font-size: 1em;
  text-align: center;
  //! Hard coded for the daily goals use case.
  margin: 2px 1px;
`;

const BlockNumberInput: React.FC<NumberInputProps> = ({
  onChange,
  value,
  index,
}) => {
  return (
    <StyledBlockNumberInput
      type="number"
      value={value}
      onChange={onChange}
      data-index={index}
    />
  );
};

export default BlockNumberInput;
