import { BoxShadowWrapper } from "../../Components/Wrapper";
import { FlexBox } from "../../Components/Layouts/FlexBox";
import { TotalComparison } from "../../Components/Total";

type OverviewProps = {
  todayTotal: number;
  lastDayTotal: number;
  thisWeekTotal: number;
  lastWeekTotal: number;
  thisMonthTotal: number;
  lastMonthTotal: number;
  total: number;
};

export function Overview(props: OverviewProps) {
  const {
    todayTotal,
    lastDayTotal,
    thisWeekTotal,
    lastWeekTotal,
    thisMonthTotal,
    lastMonthTotal,
    total,
  } = props;

  return (
    <BoxShadowWrapper fontSize={"1em"}>
      <FlexBox>
        <TotalComparison
          thisTotal={todayTotal}
          lastTotal={lastDayTotal}
          target="day"
        />

        <TotalComparison
          thisTotal={thisWeekTotal}
          lastTotal={lastWeekTotal}
          target="week"
        />

        <TotalComparison
          thisTotal={thisMonthTotal}
          lastTotal={lastMonthTotal}
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
            {Math.floor(total / 60)}h {total % 60}m
          </h3>
        </div>
      </FlexBox>
    </BoxShadowWrapper>
  );
}
