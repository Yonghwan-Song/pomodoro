import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
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
import { Task, TodoistApi } from '@doist/todoist-api-typescript';
import { UpdateCurrentTaskIdAndTaskChangeInfoArrayDto } from './dto/update-current-task-id';
import { UpdateTaskChangeInfoArrayDto } from './dto/update-task-change-info-array.dto';
import { TodoistTaskTracking } from 'src/schemas/todoistTaskTracking.schema';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private userModel: Model<User>,
    @InjectModel(Pomodoro.name) private pomodoroModel: Model<Pomodoro>,
    @InjectModel(TodayRecord.name) private todayRecordModel: Model<TodayRecord>,
    @InjectModel(Category.name) private categoryModel: Model<Category>,
    @InjectModel(TodoistTaskTracking.name)
    private todoistTaskTrackingModel: Model<TodoistTaskTracking>,
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

  async getUserInfo(
    userEmail: string,
  ): Promise<Omit<User, 'todoistAccessToken'> & { todoistTasks: any[] }> {
    const userInfo = await this.userModel
      .findOne({ userEmail })
      .select('-__v -firebaseUid')
      .populate(['categories', 'cycleSettings'])
      .exec();

    if (!userInfo) {
      throw new NotFoundException(`User with email ${userEmail} not found`);
    }

    const { todoistAccessToken, ...userInfoWithoutAccessToken } =
      userInfo.toObject();
    let todoistTasks: Array<Task & { taskFocusDuration: number }> = []; // 이게 당장 스키마에는 없지만, 나중에 Todoist와 통합할 때 사용될 예정입니다. 그런데 그래도 상관 없나?

    if (
      userInfoWithoutAccessToken.isTodoistIntegrationEnabled &&
      todoistAccessToken
    ) {
      try {
        const api = new TodoistApi(todoistAccessToken);
        const incompleteTasks = (await api.getTasks()).results.filter(
          (task) => task.isCompleted === false,
        );

        // trackingDocs 가져오기
        const trackingDocs = await this.todoistTaskTrackingModel
          .find({ userEmail })
          .lean();
        const trackingMap = new Map(
          trackingDocs.map((doc) => [doc.taskId, doc.duration]),
        );
        todoistTasks = incompleteTasks.map((task) => ({
          ...task,
          taskFocusDuration: trackingMap.get(task.id) ?? 0,
        }));
      } catch (error) {
        console.error('Error fetching Todoist tasks:', error);
      }
    }

    console.log('A user doc by getUserInfo() in the UsersService class', {
      ...userInfoWithoutAccessToken,
      todoistTasks,
    });

    return {
      ...userInfoWithoutAccessToken,
      todoistTasks,
    };
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

  // Add this method in the UsersService class

  async updateTaskChangeInfoArray(
    updateTaskChangeInfoArrayDto: UpdateTaskChangeInfoArrayDto,
    userEmail: string,
  ) {
    try {
      const taskChangeInfoArray =
        updateTaskChangeInfoArrayDto.taskChangeInfoArray;

      if (!taskChangeInfoArray || taskChangeInfoArray.length === 0) {
        throw new BadRequestException('taskChangeInfoArray cannot be empty');
      }

      const currentTaskId =
        taskChangeInfoArray[taskChangeInfoArray.length - 1].id;

      const updatedUser = await this.userModel.findOneAndUpdate(
        { userEmail },
        {
          $set: {
            taskChangeInfoArray,
            currentTaskId,
          },
        },
        {
          new: true, // return the updated document
        },
      );

      if (!updatedUser) {
        throw new NotFoundException(`User with email ${userEmail} not found`);
      }

      return {
        currentTaskId: updatedUser.currentTaskId,
        taskChangeInfoArray: updatedUser.taskChangeInfoArray,
      };
    } catch (error) {
      console.log('error at updateTaskChangeInfoArray', error);
      throw error;
    }
  }

  async updateCurrentTaskIdAndTaskChangeInfoArray(
    updateCurrentTaskIdDto: UpdateCurrentTaskIdAndTaskChangeInfoArrayDto,
    userEmail: string,
  ) {
    try {
      const user = await this.userModel.findOne({ userEmail });
      if (!user) {
        throw new NotFoundException(`User with email ${userEmail} not found`);
      }
      user.currentTaskId = updateCurrentTaskIdDto.currentTaskId;

      if (updateCurrentTaskIdDto.doesItJustChangeTask) {
        // []일 수도 있잖아.. - 아예 이 기능을 처음 사용하는 사용자가, Pomo에서 Task를 하나 선택하는데,
        // 하필이면 just change option? 을 선택하면. []의 -1번째 element에 access할테니 error.
        // 그러니까.. []이면 just change를 못하게 만들어야함. 그런데 그게 사용자에게 딱 한번 발생하는 현상인데,
        // 그것 때문에 조건문을 매번 확인하는거는 매우 비효율적.//TODO 씨발 어쩌라고...그래서
        user.taskChangeInfoArray[user.taskChangeInfoArray.length - 1].id =
          updateCurrentTaskIdDto.currentTaskId;
      } else {
        user.taskChangeInfoArray.push({
          id: updateCurrentTaskIdDto.currentTaskId,
          taskChangeTimestamp: updateCurrentTaskIdDto.changeTimestamp,
        });
      }

      user.save();

      return {
        currentTaskId: user.currentTaskId,
        taskChangeInfoArray: user.taskChangeInfoArray,
      };
    } catch (error) {
      console.log('error at updateCurrentTaskIdAndTaskChangeInfoArray', error);
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
