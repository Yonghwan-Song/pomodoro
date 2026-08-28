import {
  Controller,
  Post,
  Body,
  Patch,
  ValidationPipe,
  Req,
  Delete,
  Param,
} from '@nestjs/common';
import { CustomRequest } from 'src/common/middlewares/firebase.middleware';
import { CycleSettingService } from './cycle-setting.service';
import { CreateCycleSettingDto } from './dto/create-cycle-setting.dto';
import { UpdateCycleSettingDto } from './dto/update-cycle-setting.dto';

@Controller('cycle-settings')
export class CycleSettingController {
  constructor(private readonly cycleSettingService: CycleSettingService) {}

  // NOTE: 프론트엔드 전체에서 POST /cycle-settings를 호출하는 곳은 Settings.tsx:464-476 딱 1곳뿐입니다.
  @Post()
  async create(
    @Body(new ValidationPipe()) createCycleSettingDto: CreateCycleSettingDto,
    @Req() request: CustomRequest,
  ) {
    console.log(
      'createCycleSettingDto at create controller',
      createCycleSettingDto,
    );

    await this.cycleSettingService.create(
      createCycleSettingDto,
      request.userEmail,
    );

    return { success: true };
  }

  @Patch()
  async update(
    @Body(new ValidationPipe()) updateCycleSettingDto: UpdateCycleSettingDto,
    @Req() request: CustomRequest,
  ) {
    console.log('<------------------------------update controller------');
    console.log('updateCycleSettingDto', updateCycleSettingDto);
    console.log('request.userEmail', request.userEmail);
    console.log('----------------------------------------------------->');

    await this.cycleSettingService.update(
      updateCycleSettingDto,
      request.userEmail,
    );

    return { success: true };
  }

  @Delete(':name')
  async delete(@Param('name') name: string, @Req() request: CustomRequest) {
    console.log('name in delete controller', name);
    await this.cycleSettingService.delete(name, request.userEmail);

    return { success: true };
  }
}
