import {
  Body,
  Controller,
  Delete,
  Get,
  Patch,
  Post,
  Req,
  ValidationPipe,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdatePomoSettingDto } from './dto/update-pomo-setting.dto';
import { UpdateAutoStartSettingDto } from './dto/update-auto-start-setting.dto';
import { UpdateTimersStatesDto } from './dto/update-timers-states.dto';
import { CustomRequest } from 'src/common/middlewares/firebase.middleware';
import { UpdateIsUnCategorizedOnStatDto } from './dto/update-is-uncategorized-on-stat.dto';
import { UpdateColorForUnCategorizedDto } from './dto/update-color-for-uncategorized.dto';
import { UpdateCategoryChangeInfoArrayDto } from './dto/update-category-change-info-array.dto';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  async getUserInfo(@Req() request: CustomRequest) {
    return await this.usersService.getUserInfo(request.userEmail);
  }

  //TODO: is it valid to instantiate a ValidationPipe for every method?
  @Post()
  create(
    @Body(new ValidationPipe()) createUserDto: CreateUserDto,
    @Req() request: CustomRequest,
  ) {
    console.log(createUserDto);
    return this.usersService.create(createUserDto, request.userEmail);
  }

  @Patch('pomodoro-setting')
  async updatePomoSetting(
    @Body(new ValidationPipe()) updatePomoSettingDto: UpdatePomoSettingDto,
    @Req() request: CustomRequest,
  ) {
    // console.log(updatePomoSettingDto);
    return await this.usersService.updatePomoSetting(
      updatePomoSettingDto,
      request.userEmail,
    );
  }

  @Patch('auto-start-setting')
  async updateAutoStartSetting(
    @Body(new ValidationPipe())
    updateAutoStartSettingDto: UpdateAutoStartSettingDto,
    @Req() request: CustomRequest,
  ) {
    console.log(updateAutoStartSettingDto);
    return await this.usersService.updateAutoStartSetting(
      updateAutoStartSettingDto,
      request.userEmail,
    );
  }

  @Patch('timers-states')
  async updateTimersStates(
    @Body(new ValidationPipe()) updateTimersStatesDto: UpdateTimersStatesDto,
    @Req() request: CustomRequest,
  ) {
    return await this.usersService.updateTimersStates(
      updateTimersStatesDto,
      request.userEmail,
    );
  }

  @Patch('is-uncategorized-on-stat')
  async updateIsUnCategorizedOnStat(
    @Body(new ValidationPipe())
    updateIsUnCategorizedOnStatDto: UpdateIsUnCategorizedOnStatDto,
    @Req() request: CustomRequest,
  ) {
    return await this.usersService.updateIsUnCategorizedOnStat(
      updateIsUnCategorizedOnStatDto,
      request.userEmail,
    );
  }

  @Patch('color-for-uncategorized')
  async updateColorForUnCategorized(
    @Body(new ValidationPipe())
    updateColorForUnCategorizedDto: UpdateColorForUnCategorizedDto,
    @Req() request: CustomRequest,
  ) {
    return await this.usersService.updateColorForUnCategorized(
      updateColorForUnCategorizedDto,
      request.userEmail,
    );
  }

  @Patch('category-change-info-array')
  async updateCategoryChangeInfo(
    @Body(new ValidationPipe())
    updateCategoryChangeInfoArrayDto: UpdateCategoryChangeInfoArrayDto,
    @Req() request: CustomRequest,
  ) {
    console.log(updateCategoryChangeInfoArrayDto.categoryChangeInfoArray);
    return await this.usersService.updateCategoryChangeInfoArray(
      updateCategoryChangeInfoArrayDto,
      request.userEmail,
    );
  }

  @Delete()
  async deleteUser(@Req() request: CustomRequest) {
    const deletedData = await this.usersService.deleteUser(request.userEmail);
    console.log(deletedData);
    return deletedData;
  }
}
