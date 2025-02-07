import { IsBoolean } from 'class-validator';

// router.put("/updateAutoStartSetting", updateAutoStartSetting);
export class UpdateAutoStartSettingDto {
  @IsBoolean()
  doesPomoStartAutomatically: boolean;

  @IsBoolean()
  doesBreakStartAutomatically: boolean;

  @IsBoolean()
  doesCycleStartAutomatically: boolean;
}
