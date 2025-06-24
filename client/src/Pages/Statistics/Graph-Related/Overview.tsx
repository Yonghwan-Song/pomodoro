import { BoxShadowWrapper } from "../../../ReusableComponents/Wrapper";
import { FlexBox } from "../../../ReusableComponents/Layouts/FlexBox";
import { TotalComparison } from "./Total";

type OverviewProps = {
  sum: {
    today: number;
    lastDay: number;
    thisWeek: number;
    lastWeek: number;
    thisMonth: number;
    lastMonth: number;
    allTime: number;
  };
};

export function Overview(props: OverviewProps) {
  const {
    sum: { today, lastDay, thisWeek, lastWeek, thisMonth, lastMonth, allTime },
  } = props;

  return (
    <BoxShadowWrapper
      fontSize={"1em"}
      // inset={true}
    >
      <FlexBox justifyContent="space-around" columnGap="7px">
        <TotalComparison thisTotal={today} lastTotal={lastDay} target="day" />

        <TotalComparison
          thisTotal={thisWeek}
          lastTotal={lastWeek}
          target="week"
        />

        <TotalComparison
          thisTotal={thisMonth}
          lastTotal={lastMonth}
          target="month"
        />

        <div>
          <h4>Total</h4>
          <h3
            style={{
              color: "#6272a4",
              fontWeight: "bold",
              fontSize: "1.2em",
            }}
          >
            {Math.floor(allTime / 60)}h {allTime % 60}m
          </h3>
        </div>
      </FlexBox>
    </BoxShadowWrapper>
  );
}
