import {
  Controller,
  Delete,
  Get,
  Query,
  Redirect,
  Req,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TodoistService } from './todoist.service';
import { CustomRequest } from 'src/common/middlewares/firebase.middleware';

@Controller('todoist')
export class TodoistController {
  constructor(
    private readonly todoistService: TodoistService,
    private readonly configService: ConfigService,
  ) {}

  /** OAuth 시작: FE가 이 URL을 호출하면 Todoist 인증 화면으로 리디렉트 */
  @Get('oauth/start')
  getAuthorizationUrl(@Req() request: CustomRequest) {
    const url = this.todoistService.generateAuthorizationUrl(request.userEmail);
    return { url }; // NestJS will use this URL for the redirection
  }

  /** OAuth 콜백: Todoist가 이 엔드포인트로 돌아올 때 state 검증 */
  @Get('oauth/callback')
  @Redirect()
  async handleCallback(
    @Query('code') code: string,
    @Query('state') state: string,
  ) {
    try {
      await this.todoistService.exchangeCodeForToken(code, state);
      // error 안던지고 exit gracefully하면, 여기 이 controller에서는 그냥 success로 리디렉트되는데?...
      return {
        url: `${this.configService.get('FRONTEND_URL')}/settings?oauth=success`,
      };
    } catch (error) {
      // Handle user cancellation explicitly
      if (error.message === 'State validation failed: user_canceled') {
        return {
          url: `${this.configService.get('FRONTEND_URL')}/settings?oauth=canceled`,
        };
      }

      // Handle other errors
      const errorMessage = encodeURIComponent(error.message);
      return {
        url: `${this.configService.get('FRONTEND_URL')}/settings?oauth=failed&error=${errorMessage}`,
      };
    }
  }

  @Delete('oauth/revoke')
  async revokeToken(@Req() request: CustomRequest) {
    try {
      const userEmail = request.userEmail;
      const result = await this.todoistService.revokeToken(userEmail);

      if (result) {
        return {
          success: true,
          message: 'Todoist integration successfully disabled',
        };
      } else {
        return {
          success: false,
          message: 'Failed to revoke Todoist access token',
        };
      }
    } catch (error) {
      return {
        success: false,
        message: error.message || 'An error occurred while revoking token',
      };
    }
  }

  @Delete('oauth/revoke-sdk')
  async revokeTokenWithSDK(@Req() request: CustomRequest) {
    try {
      const userEmail = request.userEmail;
      const result = await this.todoistService.revokeTokenUsingSDK(userEmail);

      if (result) {
        return {
          success: true,
          message: 'Todoist integration successfully disabled using SDK',
        };
      } else {
        return {
          success: false,
          message: 'Failed to revoke Todoist access token using SDK',
        };
      }
    } catch (error) {
      throw new HttpException(
        error.message || 'Error revoking token',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('tasks')
  async getTodoistTasks(@Req() request: CustomRequest) {
    try {
      const userEmail = request.userEmail;
      const tasks = await this.todoistService.getTasks(userEmail);
      return { tasks };
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to fetch Todoist tasks',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
