import {
  BadRequestException,
  HttpException,
  Inject,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { count, eq, inArray, sql } from 'drizzle-orm';
import * as schema from 'src/postgresql/schema';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateAutoStartSettingDto } from './dto/update-auto-start-setting.dto';
import { UpdateTimersStatesDto } from './dto/update-timers-states.dto';
import { UpdateIsUnCategorizedOnStatDto } from './dto/update-is-uncategorized-on-stat.dto';
import { UpdateColorForUnCategorizedDto } from './dto/update-color-for-uncategorized.dto';
import { UpdateCategoryChangeInfoArrayDto } from './dto/update-category-change-info-array.dto';
import { UpdateGoalsDto } from './dto/update-goals.dto';
import { UpdateCurrentCycleInfoDto } from './dto/update-current-cycle-info.dto';
import { UpdateCurrentTaskIdDto } from './dto/update-current-task-id';
import { UpdateTaskChangeInfoArrayDto } from './dto/update-task-change-info-array.dto';
import {
  TodoistService,
  TodoistTaskWithFocusDuration,
} from 'src/todoist/todoist.service';

@Injectable()
export class UsersService {
  constructor(
    @Inject('PG_DB_BY_DRIZZLE')
    private readonly db: NodePgDatabase<typeof schema>,
    private readonly todoistService: TodoistService,
  ) {}

  async create(
    createUserDto: CreateUserDto,
    userEmail: string,
    userNickname: string,
  ): Promise<void> {
    try {
      const pgUserResult = await this.db.transaction(async (tx) => {
        // 1. Insert User
        const [createdUser] = await tx
          .insert(schema.users)
          .values({
            firebaseUid: createUserDto.firebaseUid,
            userEmail,
            userNickname,
          })
          .returning();

        // 2. Insert Default Cycle Setting
        const [createdCycleSetting] = await tx
          .insert(schema.cycleSettings)
          .values({
            userId: createdUser.id,
            name: 'Default',
            isCurrent: true,
          })
          .returning();

        return {
          ...createdUser,
          cycleSettings: [createdCycleSetting],
        };
      });
      console.log('pgUserResult');
      console.log('--------------------------------------------------->');
      console.dir(pgUserResult, {
        depth: null,
        colors: true,
      });
      console.log('<---------------------------------------------------');
    } catch (error) {
      console.error('[UsersService.create]', error);
      throw new InternalServerErrorException('Failed to create user');
    }

    return;
  }

  async getUserInfo(userEmail: string) {
    try {
      const pgUser = await this.db.query.users.findFirst({
        where: eq(schema.users.userEmail, userEmail),
        with: {
          categories: {
            columns: {
              id: false,
              userId: false,
            },
          },
          cycleSettings: {
            columns: {
              id: false,
              userId: false,
            },
            with: {
              cycleRecords: true,
            },
          },
        },
        columns: {
          firebaseUid: false,
          userEmail: false,
          createdAt: false,
        },
      });

      if (!pgUser) {
        throw new Error(`PostgreSQL user not found for ${userEmail}`);
      }

      let todoistTasks: TodoistTaskWithFocusDuration[] = [];
      if (pgUser.isTodoistIntegrationEnabled) {
        if (pgUser.todoistAccessToken) {
          try {
            todoistTasks = await this.todoistService.syncAndGetTasks(
              pgUser.id,
              pgUser.todoistAccessToken,
            );
          } catch (error) {
            console.warn(
              '[UsersService.getUserInfo] Todoist sync failed; using PostgreSQL cache:',
              error instanceof Error ? error.message : 'Unknown error',
            );
            todoistTasks = await this.todoistService.getCachedActiveTasks(
              pgUser.id,
            );
          }
        } else {
          console.error(
            `[UsersService.getUserInfo] Todoist integration is enabled without a PostgreSQL token for ${userEmail}`,
          );
          todoistTasks = await this.todoistService.getCachedActiveTasks(
            pgUser.id,
          );
        }
      }

      const cycleSettingsRestructured = [];

      const {
        id: _id,
        todoistAccessToken: _todoistAccessToken,
        //Things to re-structure
        doesPomoStartAutomatically,
        doesBreakStartAutomatically,
        doesCycleStartAutomatically,
        colorForUncategorized: colorForUnCategorized,
        isUncategorizedOnStat: isUnCategorizedOnStat,
        cycleSettings,
        ...pgUserRest
      } = pgUser;

      for (const {
        pomoDuration,
        shortBreakDuration,
        longBreakDuration,
        numOfPomo,
        numOfCycle,
        cycleRecords,
        ...restCycleSetting
      } of cycleSettings) {
        const pomoSetting = {
          pomoDuration,
          shortBreakDuration,
          longBreakDuration,
          numOfPomo,
          numOfCycle,
        };
        const cycleStat = cycleRecords.map(
          ({ id, cycleSettingId, ...cycleRecord }) => cycleRecord,
        );
        cycleSettingsRestructured.push({
          pomoSetting,
          cycleStat,
          ...restCycleSetting,
        });
      }

      const pgUserRestructured = {
        ...pgUserRest,
        colorForUnCategorized,
        isUnCategorizedOnStat,
        autoStartSetting: {
          doesPomoStartAutomatically,
          doesBreakStartAutomatically,
          doesCycleStartAutomatically,
        },
        cycleSettings: cycleSettingsRestructured,
        todoistTasks,
      };

      console.log('pgUser 재구조화 후');
      console.log('--------------------------------------------------->');
      console.dir(pgUserRestructured, {
        depth: null,
        colors: true,
      });
      console.log('<---------------------------------------------------');

      return pgUserRestructured;
    } catch (error) {
      console.error(
        '[UsersService.getUserInfo] PostgreSQL read failed:',
        error instanceof Error ? error.message : 'Unknown error',
      );
      throw new InternalServerErrorException('Failed to get user information');
    }
  }

  async updateAutoStartSetting(
    updateAutoStartSettingDto: UpdateAutoStartSettingDto,
    userEmail: string,
  ) {
    try {
      const [updatedPgAutoStartSetting] = await this.db
        .update(schema.users)
        .set(updateAutoStartSettingDto)
        .where(eq(schema.users.userEmail, userEmail))
        .returning({
          doesPomoStartAutomatically: schema.users.doesPomoStartAutomatically,
          doesBreakStartAutomatically: schema.users.doesBreakStartAutomatically,
          doesCycleStartAutomatically: schema.users.doesCycleStartAutomatically,
        });

      if (!updatedPgAutoStartSetting) {
        throw new Error(`PostgreSQL user not found for ${userEmail}`);
      }

      console.log('pg result at update auto-start setting');
      console.log('--------------------------------------------------->');
      console.dir(updatedPgAutoStartSetting, {
        depth: null,
        colors: true,
      });
      console.log('<---------------------------------------------------');

      return;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }

      console.error('[UsersService.updateAutoStartSetting]', error);
      throw new InternalServerErrorException(
        'Failed to update auto-start setting',
      );
    }
  }

  async updateGoals(updateGoalsDto: UpdateGoalsDto, userEmail: string) {
    try {
      const [updatedPgGoals] = await this.db
        .update(schema.users)
        .set({ goals: updateGoalsDto as unknown as schema.Goals })
        .where(eq(schema.users.userEmail, userEmail))
        .returning({ goals: schema.users.goals });

      // `updatedPgGoals` is the projected user row returned by UPDATE, not the
      // goals value itself. It is undefined only when no user matched the WHERE clause.
      if (!updatedPgGoals) {
        throw new Error(`PostgreSQL user not found for ${userEmail}`);
      }

      console.log('pg result at update goals');
      console.log('--------------------------------------------------->');
      console.dir(updatedPgGoals, {
        depth: null,
        colors: true,
      });
      console.log('<---------------------------------------------------');

      return;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }

      console.error('[UsersService.updateGoals]', error);
      throw new InternalServerErrorException('Failed to update goals');
    }
  }

  async updateTimersStates(
    updateTimersStatesDto: UpdateTimersStatesDto,
    userEmail: string,
  ) {
    try {
      // PostgreSQL Drizzle Update (JSONB || merge 연산자를 통한 원자적 부분 병합)
      const [updatedPgTimersStates] = await this.db
        .update(schema.users)
        .set({
          timersStates: sql`${schema.users.timersStates} || ${JSON.stringify(updateTimersStatesDto)}::jsonb`,
        })
        .where(eq(schema.users.userEmail, userEmail))
        .returning({ timersStates: schema.users.timersStates });

      if (!updatedPgTimersStates) {
        throw new Error(`PostgreSQL user not found for ${userEmail}`);
      }

      console.log('pg result at update timer states');
      console.log('--------------------------------------------------->');
      console.dir(updatedPgTimersStates, {
        depth: null,
        colors: true,
      });
      console.log('<---------------------------------------------------');

      return;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }

      console.error('[UsersService.updateTimersStates]', error);
      throw new InternalServerErrorException('Failed to update timer states');
    }
  }

  async updateCurrentCycleInfo(
    updateCurrentCycleInfoDto: UpdateCurrentCycleInfoDto,
    userEmail: string,
  ) {
    try {
      // PostgreSQL Drizzle Update (JSONB || merge 연산자 적용)
      const [updatedPgCurrentCycleInfo] = await this.db
        .update(schema.users)
        .set({
          currentCycleInfo: sql`${schema.users.currentCycleInfo} || ${JSON.stringify(updateCurrentCycleInfoDto)}::jsonb`,
        })
        .where(eq(schema.users.userEmail, userEmail))
        .returning({ currentCycleInfo: schema.users.currentCycleInfo });

      if (!updatedPgCurrentCycleInfo) {
        throw new Error(`PostgreSQL user not found for ${userEmail}`);
      }

      console.log('pg result at update current cycle info');
      console.log('--------------------------------------------------->');
      console.dir(updatedPgCurrentCycleInfo, {
        depth: null,
        colors: true,
      });
      console.log('<---------------------------------------------------');

      return;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }

      console.error('[UsersService.updateCurrentCycleInfo]', error);
      throw new InternalServerErrorException(
        'Failed to update current cycle information',
      );
    }
  }

  async updateIsUnCategorizedOnStat(
    updateIsUnCategorizedOnStatDto: UpdateIsUnCategorizedOnStatDto,
    userEmail: string,
  ) {
    try {
      const [updatedPgStatPreference] = await this.db
        .update(schema.users)
        .set({
          isUncategorizedOnStat:
            updateIsUnCategorizedOnStatDto.isUnCategorizedOnStat,
        })
        .where(eq(schema.users.userEmail, userEmail))
        .returning({
          isUncategorizedOnStat: schema.users.isUncategorizedOnStat,
        });

      // This is the projected user row returned by UPDATE, not the boolean
      // itself. It is undefined only when no user matched the WHERE clause.
      if (!updatedPgStatPreference) {
        throw new Error(`PostgreSQL user not found for ${userEmail}`);
      }

      console.log('pg result at update uncategorized statistics preference');
      console.log('--------------------------------------------------->');
      console.dir(updatedPgStatPreference, {
        depth: null,
        colors: true,
      });
      console.log('<---------------------------------------------------');

      return;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }

      console.error('[UsersService.updateIsUnCategorizedOnStat]', error);
      throw new InternalServerErrorException(
        'Failed to update uncategorized statistics preference',
      );
    }
  }

  async updateColorForUnCategorized(
    updateColorForUnCategorizedDto: UpdateColorForUnCategorizedDto,
    userEmail: string,
  ) {
    try {
      const updatedPgUser = await this.db.transaction(async (tx) => {
        // See src/users/README/05_row_locks_for_jsonb_read_modify_write.md.
        // This flow reads and replaces categoryChangeInfoArray, so lock the users row first.
        const [pgCurrentUser] = await tx
          .select({
            id: schema.users.id,
            categoryChangeInfoArray: schema.users.categoryChangeInfoArray,
          })
          .from(schema.users)
          .where(eq(schema.users.userEmail, userEmail))
          .for('update');

        if (!pgCurrentUser) {
          throw new Error(`PostgreSQL user not found for ${userEmail}`);
        }

        const updatedCategoryChangeInfoArray =
          pgCurrentUser.categoryChangeInfoArray.map((info) => {
            if (info.categoryName === 'uncategorized') {
              return {
                ...info,
                color: updateColorForUnCategorizedDto.colorForUnCategorized,
              };
            }
            return info;
          });

        const [result] = await tx
          .update(schema.users)
          .set({
            colorForUncategorized:
              updateColorForUnCategorizedDto.colorForUnCategorized,
            categoryChangeInfoArray: updatedCategoryChangeInfoArray,
          })
          .where(eq(schema.users.id, pgCurrentUser.id))
          .returning();

        if (!result) {
          throw new Error(`PostgreSQL user not found for ${userEmail}`);
        }

        return result;
      });

      console.log('pg result at update color for uncategorized');
      console.log('--------------------------------------------------->');
      console.dir(updatedPgUser, {
        depth: null,
        colors: true,
      });
      console.log('<---------------------------------------------------');

      return;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }

      console.error('[UsersService.updateColorForUnCategorized]', error);
      throw new InternalServerErrorException(
        'Failed to update color for uncategorized',
      );
    }
  }

  async updateCategoryChangeInfoArray(
    updateCategoryChangeInfoArrayDto: UpdateCategoryChangeInfoArrayDto,
    userEmail: string,
  ) {
    try {
      const [updatedPgUser] = await this.db
        .update(schema.users)
        .set({
          categoryChangeInfoArray:
            updateCategoryChangeInfoArrayDto.categoryChangeInfoArray,
        })
        .where(eq(schema.users.userEmail, userEmail))
        .returning();

      if (!updatedPgUser) {
        throw new Error(`PostgreSQL user not found for ${userEmail}`);
      }

      console.log('pg result at update category change info array');
      console.log('--------------------------------------------------->');
      console.dir(updatedPgUser, {
        depth: null,
        colors: true,
      });
      console.log('<---------------------------------------------------');

      return;
    } catch (error) {
      console.error('[UsersService.updateCategoryChangeInfoArray]', error);
      throw new InternalServerErrorException(
        'Failed to update category change info array',
      );
    }
  }

  // Task change related
  async updateTaskChangeInfoArray(
    updateTaskChangeInfoArrayDto: UpdateTaskChangeInfoArrayDto,
    userEmail: string,
  ): Promise<void> {
    try {
      const taskChangeInfoArray =
        updateTaskChangeInfoArrayDto.taskChangeInfoArray;

      if (!taskChangeInfoArray || taskChangeInfoArray.length === 0) {
        throw new BadRequestException('taskChangeInfoArray cannot be empty');
      }

      const currentTaskId =
        taskChangeInfoArray[taskChangeInfoArray.length - 1].id;

      // TODO: 타이머 돌릴대 id: "" 인데도 update하는데?...
      const [updatedPgTaskState] = await this.db
        .update(schema.users)
        .set({
          taskChangeInfoArray,
          currentTaskId,
        })
        .where(eq(schema.users.userEmail, userEmail))
        .returning({
          currentTaskId: schema.users.currentTaskId,
          taskChangeInfoArray: schema.users.taskChangeInfoArray,
        });

      if (!updatedPgTaskState) {
        throw new Error(`PostgreSQL user not found for ${userEmail}`);
      }

      console.log('pg result at update task change info array');
      console.log('--------------------------------------------------->');
      console.dir(updatedPgTaskState, {
        depth: null,
        colors: true,
      });
      console.log('<---------------------------------------------------');

      return;
    } catch (error) {
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }

      console.error('[UsersService.updateTaskChangeInfoArray]', error);
      throw new InternalServerErrorException(
        'Failed to update task change info array',
      );
    }
  }

  async updateCurrentTaskId(
    updateCurrentTaskIdDto: UpdateCurrentTaskIdDto,
    userEmail: string,
  ): Promise<void> {
    try {
      //#region PG
      const updatedPgTaskState = await this.db.transaction(async (tx) => {
        // See src/users/README/05_row_locks_for_jsonb_read_modify_write.md.
        // This flow reads and replaces taskChangeInfoArray, so lock the users row first.
        const [pgCurrentUser] = await tx
          .select({
            id: schema.users.id,
            taskChangeInfoArray: schema.users.taskChangeInfoArray,
          })
          .from(schema.users)
          .where(eq(schema.users.userEmail, userEmail))
          .for('update');

        if (!pgCurrentUser) {
          throw new Error(`PostgreSQL user not found for ${userEmail}`);
        }

        const pgTaskArray = pgCurrentUser.taskChangeInfoArray.map((entry) => ({
          ...entry,
        }));
        if (updateCurrentTaskIdDto.doesItJustChangeTask) {
          if (pgTaskArray.length > 0) {
            pgTaskArray[pgTaskArray.length - 1].id =
              updateCurrentTaskIdDto.currentTaskId;
          } else {
            // ⚠️ 비정상 상태 감지: PG에서도 히스토리 배열이 비어있는 비정상 상태 로깅 및 fallback push
            console.warn(
              `[UsersService.updateCurrentTaskId] Abnormal State (PG): 'doesItJustChangeTask' is true, but 'pgTaskArray' is empty for user '${userEmail}'. Initialized new entry instead.`,
            );
            pgTaskArray.push({
              id: updateCurrentTaskIdDto.currentTaskId,
              taskChangeTimestamp: updateCurrentTaskIdDto.changeTimestamp ?? 0,
            });
          }
        } else {
          pgTaskArray.push({
            id: updateCurrentTaskIdDto.currentTaskId,
            taskChangeTimestamp: updateCurrentTaskIdDto.changeTimestamp,
          });
        }

        const [updatedPgUser] = await tx
          .update(schema.users)
          .set({
            currentTaskId: updateCurrentTaskIdDto.currentTaskId,
            taskChangeInfoArray: pgTaskArray,
          })
          .where(eq(schema.users.id, pgCurrentUser.id))
          .returning({
            currentTaskId: schema.users.currentTaskId,
            taskChangeInfoArray: schema.users.taskChangeInfoArray,
          });

        if (!updatedPgUser) {
          throw new Error(`PostgreSQL user not found for ${userEmail}`);
        }

        return updatedPgUser;
      });

      console.log('pg result at update current task id');
      console.log('--------------------------------------------------->');
      console.dir(updatedPgTaskState, {
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

      console.error('[UsersService.updateCurrentTaskId]', error);
      throw new InternalServerErrorException('Failed to update current task');
    }
  }

  async deleteUser(userEmail: string): Promise<void> {
    try {
      const pgUser = await this.db.query.users.findFirst({
        where: eq(schema.users.userEmail, userEmail),
        columns: {
          id: true,
          todoistAccessToken: true,
        },
      });

      if (!pgUser) {
        throw new Error(`PostgreSQL user not found for ${userEmail}`);
      }

      let todoistTokenRevocation: 'revoked' | 'skipped' | 'already-invalid' =
        'skipped';

      if (pgUser.todoistAccessToken) {
        try {
          const revoked = await this.todoistService.revokeToken(userEmail);

          if (!revoked) {
            throw new Error('Todoist token revocation returned false');
          }

          todoistTokenRevocation = 'revoked';
        } catch (error) {
          if (error instanceof HttpException && error.getStatus() === 403) {
            todoistTokenRevocation = 'already-invalid';
            console.warn(
              '[UsersService.deleteUser] Todoist token is already invalid or expired; continuing account deletion',
            );
          } else {
            throw error;
          }
        }
      }

      //#region Pg
      // PostgreSQL Drizzle Delete (ON DELETE CASCADE로 자식 테이블 자동 연쇄 삭제)
      const pgDeleteResult = await this.db.transaction(async (tx) => {
        const cycleSettingRows = await tx
          .select({ id: schema.cycleSettings.id })
          .from(schema.cycleSettings)
          .where(eq(schema.cycleSettings.userId, pgUser.id));
        const cycleSettingIds = cycleSettingRows.map((setting) => setting.id);

        const getDirectDependentCounts = async () => {
          const [
            [categoryCount],
            [cycleSettingCount],
            [todoistTaskCount],
            [timerSessionCount],
            [pomodoroCount],
          ] = await Promise.all([
            tx
              .select({ value: count() })
              .from(schema.categories)
              .where(eq(schema.categories.userId, pgUser.id)),
            tx
              .select({ value: count() })
              .from(schema.cycleSettings)
              .where(eq(schema.cycleSettings.userId, pgUser.id)),
            tx
              .select({ value: count() })
              .from(schema.todoistTasks)
              .where(eq(schema.todoistTasks.userId, pgUser.id)),
            tx
              .select({ value: count() })
              .from(schema.timerSessions)
              .where(eq(schema.timerSessions.userId, pgUser.id)),
            tx
              .select({ value: count() })
              .from(schema.pomodoros)
              .where(eq(schema.pomodoros.userId, pgUser.id)),
          ]);

          return {
            categories: categoryCount.value,
            cycleSettings: cycleSettingCount.value,
            todoistTasks: todoistTaskCount.value,
            timerSessions: timerSessionCount.value,
            pomodoros: pomodoroCount.value,
          };
        };

        const getCycleRecordCount = async () => {
          if (cycleSettingIds.length === 0) {
            return 0;
          }

          const [cycleRecordCount] = await tx
            .select({ value: count() })
            .from(schema.cycleRecords)
            .where(
              inArray(schema.cycleRecords.cycleSettingId, cycleSettingIds),
            );

          return cycleRecordCount.value;
        };

        const directCountsBefore = await getDirectDependentCounts();
        const cycleRecordsBefore = await getCycleRecordCount();

        const [deletedPgUser] = await tx
          .delete(schema.users)
          .where(eq(schema.users.id, pgUser.id))
          .returning({ id: schema.users.id });

        if (!deletedPgUser) {
          throw new Error(`PostgreSQL user not found for ${userEmail}`);
        }

        const directCountsAfter = await getDirectDependentCounts();
        const cycleRecordsAfter = await getCycleRecordCount();
        const dependentRows = {
          categories: {
            before: directCountsBefore.categories,
            after: directCountsAfter.categories,
          },
          cycleSettings: {
            before: directCountsBefore.cycleSettings,
            after: directCountsAfter.cycleSettings,
          },
          cycleRecords: {
            before: cycleRecordsBefore,
            after: cycleRecordsAfter,
          },
          todoistTasks: {
            before: directCountsBefore.todoistTasks,
            after: directCountsAfter.todoistTasks,
          },
          timerSessions: {
            before: directCountsBefore.timerSessions,
            after: directCountsAfter.timerSessions,
          },
          pomodoros: {
            before: directCountsBefore.pomodoros,
            after: directCountsAfter.pomodoros,
          },
        };
        const cascadeVerified = Object.values(dependentRows).every(
          ({ after }) => after === 0,
        );

        if (!cascadeVerified) {
          throw new Error(
            `PostgreSQL cascade verification failed for user ${deletedPgUser.id}`,
          );
        }

        return {
          deletedUserId: deletedPgUser.id,
          cascadeVerified,
          dependentRows,
        };
      });

      console.log('pg result at delete user');
      console.log('--------------------------------------------------->');
      console.dir(
        {
          ...pgDeleteResult,
          todoistTokenRevocation,
        },
        { depth: null, colors: true },
      );
      console.log('<---------------------------------------------------');
      //#endregion

      return;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }

      console.error('[UsersService.deleteUser]', error);
      throw new InternalServerErrorException('Failed to delete user');
    }
  }
}
