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
    console.log(updateTimersStatesDto);
    return await this.usersService.updateTimersStates(
      updateTimersStatesDto,
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
