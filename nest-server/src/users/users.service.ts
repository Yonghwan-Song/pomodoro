import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User } from 'src/schemas/user.schema';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdatePomoSettingDto } from './dto/update-pomo-setting.dto';
import { UpdateAutoStartSettingDto } from './dto/update-auto-start-setting.dto';
import { UpdateTimersStatesDto } from './dto/update-timers-states.dto';
import { Pomodoro } from 'src/schemas/pomodoro.schema';
import { TodayRecord } from 'src/schemas/todayRecord.schema';
import { Category } from 'src/schemas/category.schema';
import { UpdateIsUnCategorizedOnStatDto } from './dto/update-is-uncategorized-on-stat.dto';
import { UpdateColorForUnCategorizedDto } from './dto/update-color-for-uncategorized.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private userModel: Model<User>,
    @InjectModel(Pomodoro.name) private pomodoroModel: Model<Pomodoro>,
    @InjectModel(TodayRecord.name) private todayRecordModel: Model<TodayRecord>,
    @InjectModel(Category.name) private categoryModel: Model<Category>,
  ) {}

  create(createUserDto: CreateUserDto, userEmail: string) {
    const newUser = new this.userModel({ ...createUserDto, userEmail });
    return newUser.save();
  }

  async getUserInfo(userEmail: string) {
    const doc = await this.userModel
      .findOne({ userEmail })
      .populate(['categories'])
      .exec();

    console.log(doc);
    return doc;
  }

  updatePomoSetting(
    updatePomoSettingDto: UpdatePomoSettingDto,
    userEmail: string,
  ) {
    return this.userModel
      .findOneAndUpdate(
        {
          userEmail,
        },
        {
          pomoSetting: updatePomoSettingDto,
        },
        { new: true },
      )
      .exec();
  }

  updateAutoStartSetting(
    updateAutoStartSettingDto: UpdateAutoStartSettingDto,
    userEmail: string,
  ) {
    return this.userModel
      .findOneAndUpdate(
        {
          userEmail,
        },
        {
          autoStartSetting: updateAutoStartSettingDto,
        },
        { new: true },
      )
      .exec();
  }

  async updateTimersStates(
    updateTimersStatesDto: UpdateTimersStatesDto,
    userEmail: string,
  ) {
    console.log('updateTimersStates service');
    console.log(updateTimersStatesDto);

    const currentUser = await this.userModel.findOne({ userEmail });

    for (const key in updateTimersStatesDto) {
      currentUser.timersStates[key] = updateTimersStatesDto[key];
    }

    const updatedUser = await currentUser.save();

    return updatedUser;
  }

  updateIsUnCategorizedOnStat(
    updateIsUnCategorizedOnStatDto: UpdateIsUnCategorizedOnStatDto,
    userEmail: string,
  ) {
    return this.userModel.findOneAndUpdate(
      { userEmail },
      {
        $set: {
          isUnCategorizedOnStat:
            updateIsUnCategorizedOnStatDto.isUnCategorizedOnStat,
        },
      },
      { new: true },
    );
  }

  updateColorForUnCategorized(
    updateColorForUnCategorizedDto: UpdateColorForUnCategorizedDto,
    userEmail: string,
  ) {
    return this.userModel.findOneAndUpdate(
      { userEmail },
      {
        $set: {
          colorForUnCategorized:
            updateColorForUnCategorizedDto.colorForUnCategorized,
        },
      },
      { new: true },
    );
  }

  async deleteUser(userEmail: string) {
    const deletedPomodoroRecords = await this.pomodoroModel
      .deleteMany({ userEmail })
      .exec();

    const deletedTodayRecords = await this.todayRecordModel
      .deleteMany({ userEmail })
      .exec();

    const deletedUser = await this.userModel
      .findOneAndDelete({ userEmail })
      .exec();

    const deletedCategories = await this.categoryModel
      .deleteMany({ userEmail })
      .exec();

    return {
      deletedUser,
      deletedPomodoroRecords,
      deletedTodayRecords,
      deletedCategories,
    };
  }
}
