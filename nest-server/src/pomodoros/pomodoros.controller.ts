import {
  Controller,
  Get,
  Post,
  Body,
  Delete,
  ValidationPipe,
  Req,
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

    return await this.pomodorosService.persistPomodoroRecordsAndTaskTrackingDurations(
      createPomodoroDto,
      request.userEmail,
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
    const arrOfDemoPomodoroRecords = await this.pomodorosService.createDemoData(
      createDemoDataDto,
      request.userEmail,
    );
    console.log(arrOfDemoPomodoroRecords);

    return arrOfDemoPomodoroRecords;
  }

  // @Delete('deleteDemoData')
  @Delete('demo-data')
  async deleteDemoData(@Req() request: CustomRequest) {
    return await this.pomodorosService.deleteDemoData(request.userEmail);
  }
}
