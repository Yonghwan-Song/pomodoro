import {
  Body,
  Controller,
  Delete,
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
    const docSaved = await this.todayRecordsService.createTodayRecord(
      createRecordOfTodayDto,
      request.userEmail,
    );

    return docSaved;
  }

  @Get()
  async getTodayRecords(@Req() request: CustomRequest) {
    return await this.todayRecordsService.findTodayRecords(request.userEmail);
  }

  @Delete()
  async deleteRecordsBeforeToday(
    @Query('timestamp') timestamp: number,
    @Req() request: CustomRequest,
  ) {
    return await this.todayRecordsService.deleteRecordsBeforeToday(
      timestamp,
      request.userEmail,
    );
  }
}
