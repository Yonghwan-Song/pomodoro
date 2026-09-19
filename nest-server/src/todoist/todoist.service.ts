import { Injectable, HttpException, HttpStatus, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import {
  getAuthStateParameter,
  getAuthorizationUrl,
  getAuthToken,
  Permission,
  revokeToken,
  Task,
  TodoistApi,
} from '@doist/todoist-sdk';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { eq, and, notInArray } from 'drizzle-orm';
import * as schema from 'src/postgresql/schema';

type StateValidationResult = {
  isValid: boolean;
  reason?: 'csrf_error' | 'timeout' | 'user_canceled';
  userEmail?: string; // Include userEmail for successful validation
};

type StateMapValue = {
  createdAt: number;
  userEmail: string;
};

export type TodoistTaskWithFocusDuration = Task & {
  taskFocusDuration: number;
};

type PgTodoistIntegrationUpdate = Pick<
  typeof schema.users.$inferInsert,
  | 'todoistAccessToken'
  | 'isTodoistIntegrationEnabled'
  | 'currentTaskId'
  | 'taskChangeInfoArray'
>;

@Injectable()
export class TodoistService {
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly stateMap = new Map<string, StateMapValue>();
  private readonly stateTTL = 5 * 60 * 1000; // 5 minutes in milliseconds

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
    @Inject('PG_DB_BY_DRIZZLE')
    private readonly db: NodePgDatabase<typeof schema>,
  ) {
    // Retrieve clientId and clientSecret from environment variables
    this.clientId = this.configService.get<string>('TODOIST_CLIENT_ID');
    this.clientSecret = this.configService.get<string>('TODOIST_CLIENT_SECRET');
  }

  generateAuthorizationUrl(userEmail: string): string {
    const state = getAuthStateParameter();
    const scopes: Permission[] = ['data:read', 'task:add'];
    const authorizationUrl = getAuthorizationUrl({
      clientId: this.clientId,
      permissions: scopes,
      state,
    });

    // Store the state with current timestamp
    this.stateMap.set(state, { createdAt: Date.now(), userEmail });

    return authorizationUrl;
  }

  validateState(state: string | undefined): StateValidationResult {
    if (!state) {
      this.stateMap.delete(state);
      return { isValid: false, reason: 'user_canceled' };
    }

    const stateData = this.stateMap.get(state);

    if (!stateData) {
      return { isValid: false, reason: 'csrf_error' };
    }

    const { createdAt, userEmail } = stateData;
    const elapsed = Date.now() - createdAt;

    if (elapsed > this.stateTTL) {
      this.stateMap.delete(state);
      return { isValid: false, reason: 'timeout' };
    }

    this.stateMap.delete(state);
    return { isValid: true, userEmail }; // Include userEmail in the result
  }

  private async updatePgTodoistIntegration(
    userEmail: string,
    update: PgTodoistIntegrationUpdate,
  ): Promise<void> {
    const [updatedPgIntegration] = await this.db
      .update(schema.users)
      .set(update)
      .where(eq(schema.users.userEmail, userEmail))
      .returning({
        isTodoistIntegrationEnabled: schema.users.isTodoistIntegrationEnabled,
        currentTaskId: schema.users.currentTaskId,
        taskChangeInfoArray: schema.users.taskChangeInfoArray,
      });

    if (!updatedPgIntegration) {
      throw new Error(`PostgreSQL user not found for ${userEmail}`);
    }

    console.log('pg result at update Todoist integration');
    console.log('--------------------------------------------------->');
    console.dir(updatedPgIntegration, {
      depth: null,
      colors: true,
    });
    console.log('<---------------------------------------------------');
  }

  // This method is called when Todoist redirects back to your app with the authorization code
  // and state parameter.
  // It exchanges the authorization code for an access token and stores it in the database.
  async exchangeCodeForToken(code: string, state: string): Promise<void> {
    const validationResult = this.validateState(state);

    if (!validationResult.isValid) {
      throw new Error(`State validation failed: ${validationResult.reason}`); // 이거 누가 catch하는지?
    }

    const { userEmail } = validationResult;

    try {
      const pgUser = await this.db.query.users.findFirst({
        where: eq(schema.users.userEmail, userEmail),
        columns: { id: true },
      });

      if (!pgUser) {
        throw new Error(`PostgreSQL user not found for ${userEmail}`);
      }

      const { accessToken } = await getAuthToken({
        clientId: this.clientId,
        clientSecret: this.clientSecret,
        code,
      });

      await this.updatePgTodoistIntegration(userEmail, {
        todoistAccessToken: accessToken,
        isTodoistIntegrationEnabled: true,
        currentTaskId: '',
        taskChangeInfoArray: [{ id: '', taskChangeTimestamp: 0 }],
      });
    } catch (error) {
      console.error(
        'Error exchanging code for token:',
        error instanceof Error ? error.message : 'Unknown error',
      );
      throw error;
    }
  }

  async revokeToken(userEmail: string): Promise<boolean> {
    const pgUser = await this.db.query.users.findFirst({
      where: eq(schema.users.userEmail, userEmail),
      columns: { todoistAccessToken: true },
    });
    if (!pgUser) {
      throw new Error(`PostgreSQL user not found for ${userEmail}`);
    }
    const accessToken = pgUser.todoistAccessToken;
    if (!accessToken) {
      throw new Error(`No access token found for user: ${userEmail}`);
    }

    try {
      //#region Original Code
      // const params = new URLSearchParams({
      //   client_id: this.clientId,
      //   client_secret: this.clientSecret,
      //   access_token: accessToken,
      // });

      // const response = await firstValueFrom(
      //   this.httpService.post(
      //     `https://todoist.com/api/v1/access_tokens?${params.toString()}`,
      //   ),
      // );

      const response = await firstValueFrom(
        this.httpService.delete(
          'https://api.todoist.com/api/v1/access_tokens',
          {
            params: {
              client_id: this.clientId,
              client_secret: this.clientSecret,
              access_token: accessToken,
            },
          },
        ),
      );

      if (response.status >= 200 && response.status < 300) {
        await this.updatePgTodoistIntegration(userEmail, {
          todoistAccessToken: null,
          isTodoistIntegrationEnabled: false,
          currentTaskId: '',
          taskChangeInfoArray: [],
        });
        return true;
      }
      return false;
    } catch (error) {
      console.error(
        'Error revoking token:',
        error instanceof Error ? error.message : 'Unknown error',
      );
      if (error.response?.status === 403) {
        throw new HttpException(
          'Invalid or expired access token',
          HttpStatus.FORBIDDEN,
        );
      }
      throw error;
    }
  }

  async revokeTokenUsingSDK(userEmail: string): Promise<boolean> {
    const pgUser = await this.db.query.users.findFirst({
      where: eq(schema.users.userEmail, userEmail),
      columns: { todoistAccessToken: true },
    });
    if (!pgUser) {
      throw new Error(`PostgreSQL user not found for ${userEmail}`);
    }
    const accessToken = pgUser.todoistAccessToken;
    if (!accessToken) {
      throw new Error(`No access token found for user: ${userEmail}`);
    }

    try {
      const result = await revokeToken({
        clientId: this.clientId,
        clientSecret: this.clientSecret,
        token: accessToken,
      });

      if (result) {
        await this.updatePgTodoistIntegration(userEmail, {
          todoistAccessToken: null,
          isTodoistIntegrationEnabled: false,
          currentTaskId: '',
          taskChangeInfoArray: [],
        });
        return true;
      }
      return false;
    } catch (error) {
      console.error(
        'Error revoking token using SDK:',
        error instanceof Error ? error.message : 'Unknown error',
      );
      if (error.response?.status === 403) {
        throw new HttpException(
          'Invalid or expired access token',
          HttpStatus.FORBIDDEN,
        );
      }
      throw error;
    }
  }

  /**
   * Syncs active tasks from Todoist into PostgreSQL `todoist_tasks` table
   * and returns the incomplete tasks enriched with `taskFocusDuration`.
   */
  async syncAndGetTasks(
    userId: string,
    accessToken: string,
  ): Promise<TodoistTaskWithFocusDuration[]> {
    try {
      const api = new TodoistApi(accessToken);
      // NOTE: API v1은 페이지 단위로 응답하므로 nextCursor가 없을 때까지 모두 가져온다.
      // 첫 페이지만 쓰면 나머지 태스크가 아래 Soft Deactivation에서 비활성화된다.
      const allTasks: Task[] = [];
      let cursor: string | null = null;
      do {
        const page = await api.getTasks({ cursor, limit: 200 });
        allTasks.push(...page.results);
        cursor = page.nextCursor;
      } while (cursor);
      const incompleteTasks = allTasks.filter((task) => !task.checked);

      const activeTodoistTaskIds = incompleteTasks.map((task) => task.id);
      const trackingRows = await this.db.transaction(async (tx) => {
        // Serialize automatic and manual syncs for the same user.
        const [pgUser] = await tx
          .select({ id: schema.users.id })
          .from(schema.users)
          .where(eq(schema.users.id, userId))
          .for('update');

        if (!pgUser) {
          throw new Error(`PostgreSQL user not found for id ${userId}`);
        }

        // 1. PostgreSQL todoist_tasks 테이블에 최신 태스크 목록 Upsert
        for (const task of incompleteTasks) {
          await tx
            .insert(schema.todoistTasks)
            .values({
              userId,
              todoistTaskId: task.id,
              taskData: task,
              isActive: true,
              syncedAt: new Date(),
            })
            // NOTE: Upsert: (userId, todoistTaskId) UNIQUE 충돌 시 에러 대신 최신 taskData와 syncedAt으로 UPDATE
            .onConflictDoUpdate({
              target: [
                schema.todoistTasks.userId,
                schema.todoistTasks.todoistTaskId,
              ],
              set: {
                taskData: task,
                isActive: true,
                syncedAt: new Date(),
              },
            });
        }

        // 2. 이번 응답에서 제외된(완료/삭제된) 기존 DB 태스크는 isActive = false 처리 (Soft Deactivation)
        // SQL: WHERE user_id = $1 AND todoist_task_id NOT IN ($activeIds)
        if (activeTodoistTaskIds.length > 0) {
          await tx
            .update(schema.todoistTasks)
            .set({ isActive: false })
            .where(
              and(
                eq(schema.todoistTasks.userId, userId),
                notInArray(
                  schema.todoistTasks.todoistTaskId,
                  activeTodoistTaskIds,
                ),
              ),
            );
        } else {
          await tx
            .update(schema.todoistTasks)
            .set({ isActive: false })
            .where(eq(schema.todoistTasks.userId, userId));
        }

        // 3. PostgreSQL todoist_tasks 테이블에서 totalFocusDuration 조회
        return tx.query.todoistTasks.findMany({
          where: eq(schema.todoistTasks.userId, userId),
          columns: {
            todoistTaskId: true,
            totalFocusDuration: true,
          },
        });
      });

      const trackingMap = new Map(
        trackingRows.map((row) => [row.todoistTaskId, row.totalFocusDuration]),
      );

      // 4. taskFocusDuration 프로퍼티를 결합하여 반환
      return incompleteTasks.map((task) => ({
        ...task,
        taskFocusDuration: trackingMap.get(task.id) ?? 0,
      }));
    } catch (error) {
      console.error(
        'Error in TodoistService.syncAndGetTasks:',
        error instanceof Error ? error.message : 'Unknown error',
      );
      throw error;
    }
  }

  async getCachedActiveTasks(
    userId: string,
  ): Promise<TodoistTaskWithFocusDuration[]> {
    const cachedRows = await this.db.query.todoistTasks.findMany({
      where: and(
        eq(schema.todoistTasks.userId, userId),
        eq(schema.todoistTasks.isActive, true),
      ),
      columns: {
        taskData: true,
        totalFocusDuration: true,
      },
    });

    const cachedTasks: TodoistTaskWithFocusDuration[] = [];
    for (const row of cachedRows) {
      if (row.taskData) {
        cachedTasks.push({
          ...row.taskData,
          taskFocusDuration: row.totalFocusDuration,
        });
      }
    }

    return cachedTasks;
  }

  async getTasks(userEmail: string): Promise<TodoistTaskWithFocusDuration[]> {
    // NOTE: PostgreSQL 유저 ID 조회 후 syncAndGetTasks 호출
    const pgUser = await this.db.query.users.findFirst({
      where: eq(schema.users.userEmail, userEmail),
      columns: {
        id: true,
        todoistAccessToken: true,
        isTodoistIntegrationEnabled: true,
      },
    });

    if (!pgUser) {
      throw new Error(`PostgreSQL user not found for ${userEmail}`);
    }
    if (!pgUser.isTodoistIntegrationEnabled) {
      throw new Error(`Todoist integration is not enabled for ${userEmail}`);
    }
    if (!pgUser.todoistAccessToken) {
      throw new Error(`No PostgreSQL access token found for ${userEmail}`);
    }

    return this.syncAndGetTasks(pgUser.id, pgUser.todoistAccessToken);
  }
}
