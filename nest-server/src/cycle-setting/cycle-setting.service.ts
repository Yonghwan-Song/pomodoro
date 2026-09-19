import {
  Injectable,
  NotFoundException,
  ConflictException,
  Inject,
  InternalServerErrorException,
} from '@nestjs/common';
import { CreateCycleSettingDto } from './dto/create-cycle-setting.dto';
import { UpdateCycleSettingDto } from './dto/update-cycle-setting.dto';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { eq, and } from 'drizzle-orm';
import * as schema from 'src/postgresql/schema';

@Injectable()
export class CycleSettingService {
  constructor(
    @Inject('PG_DB_BY_DRIZZLE')
    private readonly db: NodePgDatabase<typeof schema>,
  ) {}

  // NOTE: 프론트엔드 전체에서 POST /cycle-settings를 호출하는 곳은 Settings.tsx:464-476 딱 1곳뿐입니다.
  async create(
    createCycleSettingDto: CreateCycleSettingDto,
    userEmail: string,
  ) {
    try {
      await this.db.transaction(async (tx) => {
        const pgUser = await tx.query.users.findFirst({
          where: eq(schema.users.userEmail, userEmail),
          columns: { id: true },
        });

        if (pgUser) {
          const { pomoSetting, name, isCurrent } = createCycleSettingDto;

          // NOTE: Just-in-case - 만약 새로 생성하는 설정이 isCurrent === true라면 기존 활성 설정을 false로 변경
          // 그런데, FE에서 항상 new cycleSetting은 isCurrent - false로 온다.
          if (isCurrent === true) {
            await tx
              .update(schema.cycleSettings)
              .set({ isCurrent: false })
              .where(eq(schema.cycleSettings.userId, pgUser.id));
          }

          const [insertedCycleSetting] = await tx
            .insert(schema.cycleSettings)
            .values({
              userId: pgUser.id,
              name,
              isCurrent: isCurrent ?? false,
              pomoDuration: pomoSetting.pomoDuration,
              shortBreakDuration: pomoSetting.shortBreakDuration,
              longBreakDuration: pomoSetting.longBreakDuration,
              numOfPomo: pomoSetting.numOfPomo,
              numOfCycle: pomoSetting.numOfCycle,
            })
            .returning();

          if (insertedCycleSetting) {
            // 평탄화된 컬럼을 다시 pomoSetting 중첩 객체로 복원하여 Shadow Diff 비교
            const {
              pomoDuration,
              shortBreakDuration,
              longBreakDuration,
              numOfPomo,
              numOfCycle,
              ...restPgSetting
            } = insertedCycleSetting;

            const pgResponse = {
              ...restPgSetting,
              pomoSetting: {
                pomoDuration,
                shortBreakDuration,
                longBreakDuration,
                numOfPomo,
                numOfCycle,
              },
              cycleStat: [],
            };

            console.log('pg result at create cycle settings');
            console.log('--------------------------------------------------->');
            console.dir(pgResponse, {
              depth: null,
              colors: true,
            });
            console.log('<---------------------------------------------------');
          }
        }
      });
      return;
    } catch (error) {
      // PostgreSQL SQLSTATE 23505: UNIQUE constraint 또는 unique index 위반
      if (error.code === '23505') {
        if (error.constraint === 'cycle_settings_user_id_name_unique') {
          throw new ConflictException(
            'Cycle setting with this name already exists for this user.',
          );
        }

        if (error.constraint === 'cycle_settings_user_id_is_current_unique') {
          throw new ConflictException(
            'A current cycle setting already exists for this user.',
          );
        }
      }

      console.error('[CycleSettingService.create]', error);
      throw new InternalServerErrorException('Failed to create cycle setting');
    }
  }

  /** NOTE: 특이사항 - 이상한 constraint가 존재한다 -> cycleSettings table에서 특정 userId를 갖는 row들 중 isCurrent값이 true인 것은 단 한개이어야 한다.
   * 1. 이게 relational database의 data integrity와 어떤 관련이 있고 이런 특이한 constraint를 API 레벨 말고 db table level에서 강제할 수 있는지 궁금
   * 2. 그리고 그렇게 할 수 있다면, 그렇게 하는것이 적절한 선택인지도 궁금.
   */
  async update(
    updateCycleSettingDto: UpdateCycleSettingDto,
    userEmail: string,
  ) {
    try {
      console.log('updateCycleSettingDto', updateCycleSettingDto);
      const { name, data: updateData } = updateCycleSettingDto;
      // Three jobs are done in order.
      // 1) Ensure unique constraint about isCurrent column's value.
      // 2) update data all the properties of which are optional. 3) update cycle_records table if the data includes `cycleStat`.
      await this.db.transaction(async (tx) => {
        const pgUser = await tx.query.users.findFirst({
          where: eq(schema.users.userEmail, userEmail),
          columns: { id: true },
        });

        if (pgUser) {
          // TODO: Validate that the target setting exists before resetting isCurrent.
          // Otherwise, a request for a missing setting with isCurrent: true can
          // commit after clearing the user's existing current setting.
          // NOTE: 1) isCurrent: true 요청 시 기존 활성 설정을 false로 일괄 변경
          // The `isCurrent` value affects other rows owned by this user.
          // It is because the user's data in this table should have unique row where its isCurrent column is true.
          if (updateData.isCurrent === true) {
            await tx
              .update(schema.cycleSettings)
              .set({ isCurrent: false })
              .where(eq(schema.cycleSettings.userId, pgUser.id));
          }

          // 2) 업데이트할 필드 평탄화 매핑 (destructuring spread로 간결하게 병합)
          // NOTE: pomoSetting이 undefined여도 객체 스프레드({ ...pomoSetting })는 에러 없이 무시되고,
          // Drizzle ORM의 .set()은 undefined 필드를 SQL SET 절에서 자동으로 제외하므로 안전합니다.
          const { pomoSetting, cycleStat, ...directFields } = updateData;
          const updateValues = {
            ...directFields,
            ...pomoSetting,
          };

          let updatedPgSetting: {
            id: string;
            userId: string;
            name: string;
            isCurrent: boolean;
            pomoDuration: number;
            shortBreakDuration: number;
            longBreakDuration: number;
            numOfPomo: number;
            numOfCycle: number;
            averageAdherenceRate: number;
          };
          if (Object.keys(updateValues).length > 0) {
            const [result] = await tx
              .update(schema.cycleSettings)
              .set(updateValues)
              .where(
                and(
                  eq(schema.cycleSettings.userId, pgUser.id),
                  eq(schema.cycleSettings.name, name),
                ),
              )
              .returning();
            updatedPgSetting = result;
          } else {
            updatedPgSetting = await tx.query.cycleSettings.findFirst({
              where: and(
                eq(schema.cycleSettings.userId, pgUser.id),
                eq(schema.cycleSettings.name, name),
              ),
            });
          }

          // 3) cycleStat 동기화 (data.cycleStat이 넘어온 경우 자식 테이블 갱신)
          // TODO: [Refactoring] FE가 임베디드 전체 배열(최대 10건)을 보내기 때문에 현재는 DELETE 후 전체 INSERT(전체 교체)로 동기화 중.
          // 향후 PostgreSQL 완전 전환 시 단일 레코드 INSERT API(POST /cycle-records)로 개편 권장.
          // 상세 배경 및 계획 문서: nest-server/src/cycle-setting/README/cycle_stat_sync_and_refactoring.md
          if (updateData.cycleStat && updatedPgSetting) {
            await tx
              .delete(schema.cycleRecords)
              .where(
                eq(schema.cycleRecords.cycleSettingId, updatedPgSetting.id),
              );

            if (updateData.cycleStat.length > 0) {
              await tx.insert(schema.cycleRecords).values(
                updateData.cycleStat.map((stat) => ({
                  cycleSettingId: updatedPgSetting.id,
                  ratio: stat.ratio,
                  cycleAdherenceRate: stat.cycleAdherenceRate,
                  start: stat.start,
                  end: stat.end,
                })),
              );
            }
          }

          // 4) 그냥 update된 결과 print
          if (updatedPgSetting) {
            const {
              pomoDuration,
              shortBreakDuration,
              longBreakDuration,
              numOfPomo,
              numOfCycle,
              ...restPgSetting
            } = updatedPgSetting;

            const pgResponse = {
              ...restPgSetting,
              pomoSetting: {
                pomoDuration,
                shortBreakDuration,
                longBreakDuration,
                numOfPomo,
                numOfCycle,
              },
              cycleStat: updateData.cycleStat ?? [],
            };

            console.log('pg result at update cycle settings');
            console.log('--------------------------------------------------->');
            console.dir(pgResponse, {
              depth: null,
              colors: true,
            });
            console.log('<---------------------------------------------------');
          }
        }
      });

      return;
    } catch (error) {
      // PostgreSQL SQLSTATE 23505: UNIQUE constraint 또는 unique index 위반
      if (error.code === '23505') {
        if (error.constraint === 'cycle_settings_user_id_name_unique') {
          throw new ConflictException(
            'Cycle setting with this name already exists for this user.',
          );
        }

        if (error.constraint === 'cycle_settings_user_id_is_current_unique') {
          throw new ConflictException(
            'A current cycle setting already exists for this user.',
          );
        }
      }

      console.error('[CycleSettingService.update]', error);
      throw new InternalServerErrorException('Failed to update cycle setting');
    }
  }

  async delete(name: string, userEmail: string) {
    try {
      // PostgreSQL Drizzle Delete within Transaction
      const pgDeleteResult = await this.db.transaction(async (tx) => {
        const pgUser = await tx.query.users.findFirst({
          where: eq(schema.users.userEmail, userEmail),
          columns: { id: true },
        });

        if (!pgUser) {
          throw new Error(`PostgreSQL user not found for ${userEmail}`);
        }

        // 1) 대상 사이클 설정 삭제 (ON DELETE CASCADE로 하위 cycle_records 자동 삭제)
        const [deletedPgSetting] = await tx
          .delete(schema.cycleSettings)
          .where(
            and(
              eq(schema.cycleSettings.userId, pgUser.id),
              eq(schema.cycleSettings.name, name),
            ),
          )
          .returning({
            id: schema.cycleSettings.id,
            name: schema.cycleSettings.name,
            isCurrent: schema.cycleSettings.isCurrent,
          });

        if (!deletedPgSetting) {
          throw new Error(
            `PostgreSQL cycle setting '${name}' not found for ${userEmail}`,
          );
        }

        let promotedPgSetting:
          { id: string; name: string; isCurrent: boolean } | undefined;

        // 2) 삭제된 설정이 isCurrent === true 였다면, 남아있는 설정 중 1개를 isCurrent = true로 자동 승격
        if (deletedPgSetting.isCurrent) {
          const remainingSetting = await tx.query.cycleSettings.findFirst({
            where: eq(schema.cycleSettings.userId, pgUser.id),
            columns: { id: true },
          });

          if (remainingSetting) {
            [promotedPgSetting] = await tx
              .update(schema.cycleSettings)
              .set({ isCurrent: true })
              .where(eq(schema.cycleSettings.id, remainingSetting.id))
              .returning({
                id: schema.cycleSettings.id,
                name: schema.cycleSettings.name,
                isCurrent: schema.cycleSettings.isCurrent,
              });

            if (!promotedPgSetting) {
              throw new Error(
                `PostgreSQL cycle setting '${remainingSetting.id}' not found during current-setting promotion`,
              );
            }
          }
        }

        return { deletedPgSetting, promotedPgSetting };
      });

      console.log('pg result at delete cycle setting');
      console.log('--------------------------------------------------->');
      console.dir(pgDeleteResult, {
        depth: null,
        colors: true,
      });
      console.log('<---------------------------------------------------');
      //#endregion

      return;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }

      console.error('[CycleSettingService.delete]', error);
      throw new InternalServerErrorException('Failed to delete cycle setting');
    }
  }
}
