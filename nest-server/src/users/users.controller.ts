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
import { UpdateAutoStartSettingDto } from './dto/update-auto-start-setting.dto';
import { UpdateTimersStatesDto } from './dto/update-timers-states.dto';
import { CustomRequest } from 'src/common/middlewares/firebase.middleware';
import { UpdateIsUnCategorizedOnStatDto } from './dto/update-is-uncategorized-on-stat.dto';
import { UpdateColorForUnCategorizedDto } from './dto/update-color-for-uncategorized.dto';
import { UpdateCategoryChangeInfoArrayDto } from './dto/update-category-change-info-array.dto';
import { UpdateGoalsDto } from './dto/update-goals.dto';
import { UpdateCurrentCycleInfoDto } from './dto/update-current-cycle-info.dto';
import { UpdateCurrentTaskIdDto } from './dto/update-current-task-id';
import { UpdateTaskChangeInfoArrayDto } from './dto/update-task-change-info-array.dto';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  async getUserInfo(@Req() request: CustomRequest) {
    return await this.usersService.getUserInfo(request.userEmail);
  }

  //TODO: is it valid to instantiate a ValidationPipe for every method?
  @Post()
  async create(
    @Body(new ValidationPipe()) createUserDto: CreateUserDto,
    @Req() request: CustomRequest,
  ) {
    // ): Promise<{ success: true }> {
    console.log(createUserDto);
    return await this.usersService.create(
      createUserDto,
      request.userEmail,
      request.userNickname,
    );

    // return { success: true };
  }

  @Patch('auto-start-setting')
  async updateAutoStartSetting(
    @Body(new ValidationPipe())
    updateAutoStartSettingDto: UpdateAutoStartSettingDto,
    @Req() request: CustomRequest,
  ) {
    console.log(updateAutoStartSettingDto);
    await this.usersService.updateAutoStartSetting(
      updateAutoStartSettingDto,
      request.userEmail,
    );

    return { success: true };
  }

  @Patch('current-cycle-info')
  async updateCurrentCycleInfo(
    @Body(new ValidationPipe())
    updateCurrentCycleInfoDto: UpdateCurrentCycleInfoDto,
    @Req() request: CustomRequest,
  ) {
    console.log(
      'updateCurrentCycleInfoDto at the user controller',
      updateCurrentCycleInfoDto,
    );

    await this.usersService.updateCurrentCycleInfo(
      updateCurrentCycleInfoDto,
      request.userEmail,
    );

    return { success: true };
  }

  @Patch('goals')
  async updateGoals(
    @Body(new ValidationPipe())
    updateGoalsDto: UpdateGoalsDto,
    @Req() request: CustomRequest,
  ) {
    await this.usersService.updateGoals(updateGoalsDto, request.userEmail);
    return { success: true };
  }

  @Patch('timers-states')
  async updateTimersStates(
    @Body(new ValidationPipe()) updateTimersStatesDto: UpdateTimersStatesDto,
    @Req() request: CustomRequest,
  ) {
    await this.usersService.updateTimersStates(
      updateTimersStatesDto,
      request.userEmail,
    );

    return { success: true };
  }

  @Patch('is-uncategorized-on-stat')
  async updateIsUnCategorizedOnStat(
    @Body(new ValidationPipe())
    updateIsUnCategorizedOnStatDto: UpdateIsUnCategorizedOnStatDto,
    @Req() request: CustomRequest,
  ) {
    await this.usersService.updateIsUnCategorizedOnStat(
      updateIsUnCategorizedOnStatDto,
      request.userEmail,
    );

    return { success: true };
  }

  @Patch('color-for-uncategorized')
  async updateColorForUnCategorized(
    @Body(new ValidationPipe())
    updateColorForUnCategorizedDto: UpdateColorForUnCategorizedDto,
    @Req() request: CustomRequest,
  ) {
    await this.usersService.updateColorForUnCategorized(
      updateColorForUnCategorizedDto,
      request.userEmail,
    );

    return { success: true };
  }

  @Patch('category-change-info-array')
  async updateCategoryChangeInfo(
    @Body(new ValidationPipe())
    updateCategoryChangeInfoArrayDto: UpdateCategoryChangeInfoArrayDto,
    @Req() request: CustomRequest,
  ) {
    console.log(
      'updateCategoryChangeInfoArrayDto.categoryChangeInfoArray',
      updateCategoryChangeInfoArrayDto.categoryChangeInfoArray,
    );
    await this.usersService.updateCategoryChangeInfoArray(
      updateCategoryChangeInfoArrayDto,
      request.userEmail,
    );

    return { success: true };
  }

  @Patch('current-task-id')
  // 세션 도중 태스크 전환 이벤트 기록 (추가/교체)
  async updateCurrentTaskId(
    @Body(new ValidationPipe())
    updateCurrentTaskIdDto: UpdateCurrentTaskIdDto,
    @Req() request: CustomRequest,
  ): Promise<{ success: true }> {
    console.log(
      'updateCurrentTaskIdAndTaskChangeInfoArrayDto',
      updateCurrentTaskIdDto,
    );

    await this.usersService.updateCurrentTaskId(
      updateCurrentTaskIdDto,
      request.userEmail,
    );

    return { success: true };
  }

  @Patch('task-change-info-array')
  // 세션 시작/전환 시 배열 통째로 초기화 (리셋)
  async updateTaskChangeInfoArray(
    @Body(new ValidationPipe())
    updateTaskChangeInfoArrayDto: UpdateTaskChangeInfoArrayDto,
    @Req() request: CustomRequest,
  ): Promise<{ success: true }> {
    console.log('updateTaskChangeInfoArrayDto', updateTaskChangeInfoArrayDto);

    await this.usersService.updateTaskChangeInfoArray(
      updateTaskChangeInfoArrayDto,
      request.userEmail,
    );

    return { success: true };
  }

  @Delete()
  async deleteUser(@Req() request: CustomRequest) {
    await this.usersService.deleteUser(request.userEmail);

    return { success: true };
  }
}
