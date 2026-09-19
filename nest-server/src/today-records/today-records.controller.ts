import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  Req,
  ValidationPipe,
} from '@nestjs/common';
import { TodayRecordsService } from './today-records.service';
import { CreateTodayRecordDto } from './dto/create-today-record.dto';
import { CustomRequest } from 'src/common/middlewares/firebase.middleware';

@Controller('today-records')
export class TodayRecordsController {
  constructor(private readonly todayRecordsService: TodayRecordsService) {}

  @Post()
  async create(
    @Body(new ValidationPipe()) createRecordOfTodayDto: CreateTodayRecordDto,
    @Req() request: CustomRequest,
  ) {
    await this.todayRecordsService.createTodayRecord(
      createRecordOfTodayDto,
      request.userEmail,
    );

    return { success: true };
  }

  @Get()
  async getTodayRecords(
    @Req() request: CustomRequest,
    @Query('timestamp') timestamp: string,
  ) {
    return await this.todayRecordsService.findTodayRecords(
      request.userEmail,
      parseInt(timestamp),
    );
  }
}
