import { Injectable, NotFoundException } from '@nestjs/common';
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
import { UpdateCategoryChangeInfoArrayDto } from './dto/update-category-change-info-array.dto';
import { UpdateGoalsDto } from './dto/update-goals.dto';
import { UpdateCurrentCycleInfoDto } from './dto/update-current-cycle-info.dto';
import { CycleSetting } from 'src/schemas/cycleSetting.schema';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private userModel: Model<User>,
    @InjectModel(Pomodoro.name) private pomodoroModel: Model<Pomodoro>,
    @InjectModel(TodayRecord.name) private todayRecordModel: Model<TodayRecord>,
    @InjectModel(Category.name) private categoryModel: Model<Category>,
    @InjectModel(CycleSetting.name)
    private cycleSettingModel: Model<CycleSetting>,
  ) {}

  async create(createUserDto: CreateUserDto, userEmail: string) {
    const defaultCycleSettingForANewUser = new this.cycleSettingModel({
      userEmail,
      name: 'Default cycle setting',
      isCurrent: true,
    });

    const settingSaved = await defaultCycleSettingForANewUser.save();

    console.log('settingSaved', settingSaved);

    const newUser = new this.userModel({
      ...createUserDto,
      userEmail,
      cycleSettings: [defaultCycleSettingForANewUser._id],
    });

    await newUser.save();

    return newUser;
  }

  async getUserInfo(userEmail: string) {
    const doc = await this.userModel
      .findOne({ userEmail })
      .populate(['categories', 'cycleSettings'])
      .exec();

    console.log('A user doc by getUserInfo() in the UsersService class', doc);
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

  updateGoals(updateGoalsDto: UpdateGoalsDto, userEmail: string) {
    console.log('updateGoalsDto', updateGoalsDto);
    return this.userModel
      .findOneAndUpdate(
        {
          userEmail,
        },
        {
          goals: updateGoalsDto,
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

  async updateCurrentCycleInfo(
    updateCurrentCycleInfoDto: UpdateCurrentCycleInfoDto,
    userEmail: string,
  ) {
    const currentUser = await this.userModel.findOne({ userEmail });

    const newCurrentCycleInfo = {
      ...currentUser.currentCycleInfo,
      ...updateCurrentCycleInfoDto,
    };

    currentUser.currentCycleInfo = newCurrentCycleInfo;

    const updatedUser = await currentUser.save();

    return updatedUser;
  }

  updateIsUnCategorizedOnStat(
    updateIsUnCategorizedOnStatDto: UpdateIsUnCategorizedOnStatDto,
    userEmail: string,
  ) {
    return this.userModel
      .findOneAndUpdate(
        { userEmail },
        {
          $set: {
            isUnCategorizedOnStat:
              updateIsUnCategorizedOnStatDto.isUnCategorizedOnStat,
          },
        },
        { new: true },
      )
      .exec();
  }

  async updateColorForUnCategorized(
    updateColorForUnCategorizedDto: UpdateColorForUnCategorizedDto,
    userEmail: string,
  ) {
    const user = await this.userModel.findOne({ userEmail });
    if (!user) {
      throw new NotFoundException(`User with email ${userEmail} not found`);
    }
    user.colorForUnCategorized =
      updateColorForUnCategorizedDto.colorForUnCategorized;
    user.categoryChangeInfoArray.forEach((info) => {
      if (info.categoryName === 'uncategorized') {
        info.color = updateColorForUnCategorizedDto.colorForUnCategorized;
      }
    });
    return await user.save();

    // return this.userModel
    //   .findOneAndUpdate(
    //     { userEmail },
    //     {
    //       $set: {
    //         colorForUnCategorized:
    //           updateColorForUnCategorizedDto.colorForUnCategorized,
    //       },
    //     },
    //     { new: true },
    //   )
    //   .exec();
  }

  updateCategoryChangeInfoArray(
    updateCategoryChangeInfoArrayDto: UpdateCategoryChangeInfoArrayDto,
    userEmail: string,
  ) {
    try {
      return this.userModel
        .findOneAndUpdate(
          { userEmail },
          {
            $set: {
              categoryChangeInfoArray:
                updateCategoryChangeInfoArrayDto.categoryChangeInfoArray,
            },
          },
          { new: true, upsert: true },
        )
        .exec(); // I read that .exec() is not neccessary when using findByIdAnd_____ ... but cannot remember where I read it..
    } catch (error) {
      console.log('error at updateCategoryChangeInfoArray', error);
    }
  }

  //TODO: test
  // async updateCategoryChangeInfoArray(
  //   updateCategoryChangeInfoArrayDto: UpdateCategoryChangeInfoArrayDto,
  //   userEmail: string,
  // ) {
  //   const arrayForUpdate: {
  //     category: ObjectId;
  //     categoryChangeTimestamp: number;
  //   }[] = [];
  //   for (const infoDto of updateCategoryChangeInfoArrayDto.categoryChangeInfoArray) {
  //     const category = await this.categoryModel
  //       .findOne({ userEmail, name: infoDto.categoryName })
  //       .exec();
  //     arrayForUpdate.push({
  //       category: category.id,
  //       categoryChangeTimestamp: infoDto.categoryChangeTimestamp,
  //     });
  //   }

  //   return this.userModel
  //     .findOneAndUpdate(
  //       { userEmail },
  //       {
  //         $set: {
  //           categoryChangeInfoArray: arrayForUpdate,
  //         },
  //       },
  //       { new: true, upsert: true },
  //     )
  //     .exec(); // I read that .exec() is not neccessary when using findByIdAnd_____ ... but cannot remember where I read it..
  // }

  async deleteUser(userEmail: string) {
    const deletedPomodoroRecords = await this.pomodoroModel
      .deleteMany({ userEmail })
      .exec();

    const deletedTodayRecords = await this.todayRecordModel
      .deleteMany({ userEmail })
      .exec();

    const deletedCycleSettings = await this.cycleSettingModel
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
      deletedCycleSettings,
      deletedCategories,
    };
  }
}
