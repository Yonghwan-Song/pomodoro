import {
  Controller,
  Get,
  Post,
  Body,
  Delete,
  ValidationPipe,
  Req,
  Query,
} from '@nestjs/common';
import { PomodorosService } from './pomodoros.service';
import { CreatePomodoroDto } from './dto/create-pomodoro.dto';
import { CreateDemoDataDto } from './dto/create-demo-data.dto';
import { CustomRequest } from 'src/common/middlewares/firebase.middleware';

@Controller('pomodoros')
export class PomodorosController {
  constructor(private readonly pomodorosService: PomodorosService) {}

  @Post()
  async create(
    @Body(new ValidationPipe()) createPomodoroDto: CreatePomodoroDto,
    @Req() request: CustomRequest,
  ) {
    // console.log('Received createPomodoroDto in controller:', createPomodoroDto);

    await this.pomodorosService.persistPomodoroRecordsAndTaskTrackingDurations(
      createPomodoroDto,
      request.userEmail,
    );

    return { success: true };
  }

  @Get('today/total')
  async getTodayTotalDuration(
    @Req() request: CustomRequest,
    @Query('date') todayDateString: string,
  ) {
    return await this.pomodorosService.getTodayTotalDurationByUserEmail(
      request.userEmail,
      todayDateString,
    );
  }

  @Get()
  async getAllPomodoroRecordsByUserEmail(@Req() request: CustomRequest) {
    return await this.pomodorosService.getAllPomodoroRecordsByUserEmail(
      request.userEmail,
    );
  }

  // @Post('createDemoData')
  @Post('demo-data')
  async createDemoData(
    @Body(new ValidationPipe()) createDemoDataDto: CreateDemoDataDto,
    @Req() request: CustomRequest,
  ) {
    await this.pomodorosService.createDemoData(
      createDemoDataDto,
      request.userEmail,
    );

    return { success: true };
  }

  // @Delete('deleteDemoData')
  @Delete('demo-data')
  async deleteDemoData(@Req() request: CustomRequest) {
    await this.pomodorosService.deleteDemoData(request.userEmail);

    return { success: true };
  }
}
