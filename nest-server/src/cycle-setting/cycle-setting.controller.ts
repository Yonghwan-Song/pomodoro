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

  @Post()
  async create(
    @Body(new ValidationPipe()) createCycleSettingDto: CreateCycleSettingDto,
    @Req() request: CustomRequest,
  ) {
    console.log(
      'createCycleSettingDto at create controller',
      createCycleSettingDto,
    );
    return await this.cycleSettingService.create(
      createCycleSettingDto,
      request.userEmail,
    );
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

    return this.cycleSettingService.update(
      updateCycleSettingDto,
      request.userEmail,
    );
  }

  @Delete(':name')
  async delete(@Param('name') name: string, @Req() request: CustomRequest) {
    console.log('name in delete controller', name);
    return await this.cycleSettingService.delete(name, request.userEmail);
  }
}
