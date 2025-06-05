import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import {
  getAuthStateParameter,
  getAuthorizationUrl,
  getAuthToken,
  Permission,
  revokeAuthToken,
  TodoistApi,
} from '@doist/todoist-api-typescript';
import { InjectModel } from '@nestjs/mongoose';
import { User } from 'src/schemas/user.schema';
import { Model } from 'mongoose';
import { TodoistTaskTracking } from 'src/schemas/todoistTaskTracking.schema';

type StateValidationResult = {
  isValid: boolean;
  reason?: 'csrf_error' | 'timeout' | 'user_canceled';
  userEmail?: string; // Include userEmail for successful validation
};

type StateMapValue = {
  createdAt: number;
  userEmail: string;
};

@Injectable()
export class TodoistService {
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly stateMap = new Map<string, StateMapValue>();
  private readonly stateTTL = 5 * 60 * 1000; // 5 minutes in milliseconds

  constructor(
    private readonly configService: ConfigService,
    @InjectModel(User.name) private userModel: Model<User>,
    @InjectModel(TodoistTaskTracking.name)
    private todoistTaskTrackingModel: Model<TodoistTaskTracking>,
    private readonly httpService: HttpService,
  ) {
    // Retrieve clientId and clientSecret from environment variables
    this.clientId = this.configService.get<string>('TODOIST_CLIENT_ID');
    this.clientSecret = this.configService.get<string>('TODOIST_CLIENT_SECRET');
  }

  generateAuthorizationUrl(userEmail: string): string {
    const state = getAuthStateParameter();
    const scopes: Permission[] = ['data:read', 'task:add'];
    const authorizationUrl = getAuthorizationUrl(this.clientId, scopes, state);

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
      const { accessToken } = await getAuthToken({
        clientId: this.clientId,
        clientSecret: this.clientSecret,
        code,
      });

      const user = await this.userModel.findOne({ userEmail });

      if (!user) {
        throw new Error(`User with email ${userEmail} not found`);
      }

      user.todoistAccessToken = accessToken;
      user.isTodoistIntegrationEnabled = true;
      user.currentTaskId = '';
      user.taskChangeInfoArray = [{ id: '', taskChangeTimestamp: 0 }];

      await user.save();

      console.log(`Access token obtained for user: ${userEmail}`, accessToken);
    } catch (error) {
      console.error('Error exchanging code for token:', error);
      throw error;
    }
  }

  async revokeToken(userEmail: string): Promise<boolean> {
    const user = await this.userModel.findOne({ userEmail });
    if (!user) {
      throw new Error(`User with email ${userEmail} not found`);
    }
    const accessToken = user.todoistAccessToken;
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
          `https://todoist.com/api/v1/access_tokens?client_id=${this.clientId}&client_secret=${this.clientSecret}&access_token=${accessToken}`,
        ),
      );

      console.log('revoke token response', response);

      if (response.status >= 200 && response.status < 300) {
        user.todoistAccessToken = null;
        user.isTodoistIntegrationEnabled = false;
        user.currentTaskId = '';
        user.taskChangeInfoArray = [];
        await user.save();
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error revoking token:', error);
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
    const user = await this.userModel.findOne({ userEmail });
    if (!user) {
      throw new Error(`User with email ${userEmail} not found`);
    }
    const accessToken = user.todoistAccessToken;
    if (!accessToken) {
      throw new Error(`No access token found for user: ${userEmail}`);
    }

    try {
      const result = await revokeAuthToken({
        clientId: this.clientId,
        clientSecret: this.clientSecret,
        accessToken: accessToken,
      });

      if (result) {
        user.todoistAccessToken = null;
        user.isTodoistIntegrationEnabled = false;
        await user.save();
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error revoking token using SDK:', error);
      if (error.response?.status === 403) {
        throw new HttpException(
          'Invalid or expired access token',
          HttpStatus.FORBIDDEN,
        );
      }
      throw error;
    }
  }

  async getTasks(userEmail: string): Promise<any[]> {
    const user = await this.userModel.findOne({ userEmail });
    if (!user) {
      throw new Error(`User with email ${userEmail} not found`);
    }

    const accessToken = user.todoistAccessToken;
    if (!accessToken) {
      throw new Error(`No access token found for user: ${userEmail}`);
    }

    try {
      const api = new TodoistApi(accessToken);
      const incompleteTasks = (await api.getTasks()).results.filter(
        (task) => task.isCompleted === false,
      );

      // trackingDocs 가져오기
      const trackingDocs = await this.todoistTaskTrackingModel
        .find({ userEmail })
        .lean();
      const trackingMap = new Map(
        trackingDocs.map((doc) => [doc.taskId, doc.duration]),
      );

      // incompleteTasks에 taskFocusDuration 추가
      return incompleteTasks.map((task) => ({
        ...task,
        taskFocusDuration: trackingMap.get(task.id) ?? 0,
      }));
    } catch (error) {
      console.error('Error fetching tasks from Todoist:', error);
      throw new Error('Failed to fetch tasks from Todoist');
    }
  }

  // async getTasks(userEmail: string): Promise<Task[]> {
  //   const user = await this.userModel.findOne({ userEmail });
  //   if (!user) {
  //     throw new Error(`User with email ${userEmail} not found`);
  //   }

  //   const accessToken = user.todoistAccessToken;
  //   if (!accessToken) {
  //     throw new Error(`No access token found for user: ${userEmail}`);
  //   }

  //   console.log('accessToken', accessToken);

  //   try {
  //     const api = new TodoistApi(accessToken);
  //     // https://doist.github.io/todoist-api-typescript/api/interfaces/Task
  //     // const tasks = await api.getTasks();
  //     const incompleteTasks = (await api.getTasks()).results.filter(
  //       (task) => task.isCompleted === false,
  //     );
  //     return incompleteTasks; // Return task objects
  //   } catch (error) {
  //     console.error('Error fetching tasks from Todoist:', error);
  //     throw new Error('Failed to fetch tasks from Todoist');
  //   }
  // }
}
