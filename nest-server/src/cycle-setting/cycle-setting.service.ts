import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { CreateCycleSettingDto } from './dto/create-cycle-setting.dto';
import {
  PartialCreateCycleSettingDto,
  UpdateCycleSettingDto,
} from './dto/update-cycle-setting.dto';
import { InjectModel, InjectConnection } from '@nestjs/mongoose';
import { CycleSetting } from 'src/schemas/cycleSetting.schema';
import { Model, Connection, UpdateQuery } from 'mongoose';
import { User } from 'src/schemas/user.schema';

@Injectable()
export class CycleSettingService {
  constructor(
    @InjectModel(CycleSetting.name)
    private cycleSettingModel: Model<CycleSetting>,
    @InjectModel(User.name) private userModel: Model<User>,
    @InjectConnection() private connection: Connection,
  ) {}

  async create(
    createCycleSettingDto: CreateCycleSettingDto,
    userEmail: string,
  ) {
    try {
      // Set the current cycle setting's isCurrent to false
      //! 이렇게 그냥 안하기로 했음.
      // await this.cycleSettingModel.updateMany(
      //   { userEmail, isCurrent: true },
      //   { $set: { isCurrent: false } },
      // );

      const newCycleSetting = new this.cycleSettingModel({
        ...createCycleSettingDto,
        userEmail,
      });

      const savedCycleSetting = await newCycleSetting.save();
      const currentUser = await this.userModel.findOne({
        userEmail,
      });
      const updatedUser = await currentUser.updateOne({
        $push: {
          cycleSettings: savedCycleSetting._id,
        },
      });
      console.log(
        'updatedUser at create method of CycleSettingService',
        updatedUser,
      );

      return savedCycleSetting;
    } catch (error) {
      if (error.code === 11000) {
        throw new ConflictException(
          'Cycle setting with this name already exists for this user.',
        );
      }
      throw error;
    }
  }

  async update(
    updateCycleSettingDto: UpdateCycleSettingDto,
    userEmail: string,
  ) {
    try {
      console.log('updateCycleSettingDto', updateCycleSettingDto);
      const { name, data } = updateCycleSettingDto;

      const settingToModify = await this.cycleSettingModel
        .findOne({
          userEmail,
          name,
        })
        .exec();
      console.log('settingToModify', settingToModify);

      if ('isCurrent' in data) {
        const prevCurrentUpdated = await this.cycleSettingModel
          .findOneAndUpdate(
            { userEmail, isCurrent: true },
            { $set: { isCurrent: false } },
            { new: true },
          )
          .exec();
        console.log(
          'prevCurrentUpdated at update() in the class CycleSttingService',
          prevCurrentUpdated,
        );
      }

      const updateQuery: UpdateQuery<PartialCreateCycleSettingDto> = {
        $set: data,
      };

      //* 그냥 cycleStat's length를 10으로 유지하기로 해서.. 아예 통짜로 client에서
      //* array자체를 보내버리기로 결정했음.
      // if ('cycleStat' in data) {
      //   updateQuery = {
      //     ...updateQuery,
      //     $push: { cycleStat: data.cycleStat },
      //   };
      //   delete updateQuery.$set.cycleStat;
      // }

      // Use $set to update multiple fields in the document
      const documentUpdated = await this.cycleSettingModel
        .findOneAndUpdate({ userEmail, name }, updateQuery, { new: true })
        .exec();

      console.log(
        'updated document at update() in the class CycleSttingService',
        documentUpdated,
      );
      return documentUpdated;
    } catch (error) {
      console.warn(error);
    }
  }

  //#region Multiple Journey
  async delete(name: string, userEmail: string) {
    // 1. Find and delete the cycle setting
    const deletedDoc = await this.cycleSettingModel
      .findOneAndDelete({ userEmail, name })
      .exec();

    if (!deletedDoc) {
      throw new NotFoundException('Cycle setting not found');
    }

    // 2.
    await this.userModel.findOneAndUpdate(
      { userEmail },
      { $pull: { cycleSettings: deletedDoc._id } },
    );

    // 3. Find the most recently created cycle setting to set it to current
    if (deletedDoc.isCurrent) {
      const cycleSettingsArr = await this.cycleSettingModel
        .find({ userEmail })
        .sort({ createdAt: 'descending' }) // timestamp가 descending한다고 생각하면, 가장 큰 timestamp이 처음에 오니까, 0 index의 값이 가장 최근 값이다.
        .exec();

      if (cycleSettingsArr.length > 0) {
        // Client 사이드에서도 체크함.
        await this.cycleSettingModel
          .findOneAndUpdate(
            { _id: cycleSettingsArr[0]._id },
            { $set: { isCurrent: true } },
            { new: true },
          )
          .exec();
      }
    }

    return deletedDoc;
  }
  //#endregion Multiple Journey

  //#region Single Communication - Nest40051: Write conflict. current setting을 지울 때 발생.
  // async delete(name: string, userEmail: string) {
  //   const session = await this.connection.startSession();
  //   session.startTransaction();

  //   try {
  //     // 1. Find and delete the cycle setting
  //     const deletedDoc = await this.cycleSettingModel
  //       .findOneAndDelete({ userEmail, name })
  //       .session(session)
  //       .setOptions({ noCursorTimeout: true }) // Disable yielding
  //       .exec();

  //     if (!deletedDoc) {
  //       throw new NotFoundException('Cycle setting not found');
  //     }

  //     // 2. Update the user document to remove the cycle setting reference
  //     await this.userModel
  //       .findOneAndUpdate(
  //         { userEmail },
  //         { $pull: { cycleSettings: deletedDoc._id } },
  //         { session },
  //       )
  //       .setOptions({ noCursorTimeout: true }) // Disable yielding
  //       .exec();

  //     // 3. Find and update the most recently created cycle setting to set it as current
  //     if (deletedDoc.isCurrent) {
  //       await this.cycleSettingModel
  //         .findOneAndUpdate(
  //           { userEmail, _id: { $ne: deletedDoc._id } }, // Exclude the document that was just deleted
  //           { $set: { isCurrent: true } },
  //           { sort: { createdAt: -1 }, session, new: true },
  //         )
  //         .setOptions({ noCursorTimeout: true }) // Disable yielding
  //         .exec();
  //     }

  //     await session.commitTransaction();
  //     session.endSession();

  //     return deletedDoc;
  //   } catch (error) {
  //     await session.abortTransaction();
  //     session.endSession();
  //     throw error;
  //   }
  // }
  //#endregion Single Communication
}
