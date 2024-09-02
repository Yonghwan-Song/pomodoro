import { Injectable, NotFoundException } from '@nestjs/common';
import { Category } from 'src/schemas/category.schema';
import { HydratedDocument, Model } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { CreateCategoryDto } from './dto/create-category.dto';
import { User } from 'src/schemas/user.schema';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { Pomodoro } from 'src/schemas/pomodoro.schema';

@Injectable()
export class CategoriesService {
  constructor(
    @InjectModel(Category.name) private categoryModel: Model<Category>,
    @InjectModel(User.name) private userModel: Model<User>,
    @InjectModel(Pomodoro.name) private pomodoroModel: Model<Pomodoro>,
  ) {}

  private sessionCategory: HydratedDocument<Category> | null;

  async create(createCategoryDto: CreateCategoryDto, userEmail: string) {
    const dataToPersist = {
      ...createCategoryDto,
      userEmail,
    };
    const newCategory = new this.categoryModel(dataToPersist);
    const user = await this.userModel.findOne({ userEmail });
    const savedCategory = await newCategory.save();
    await user.updateOne({
      $push: {
        categories: savedCategory._id,
      },
    });

    return savedCategory;
  }
  //#region New
  async update(updateCategoryDto: UpdateCategoryDto, userEmail: string) {
    const { name, data } = updateCategoryDto;

    //#region These two should be in order
    //1
    if ('isCurrent' in data && data.isCurrent) {
      // For example, if the previous session's category was "Biology" and
      // updateCategoryDto is {name: "Math", data: {isCurrent: true}},
      // We must first set "Biology"'s isCurrent to false before updating "Math".
      const result = await setPreviousCurrentCategoryToFalse(
        userEmail,
        this.categoryModel,
      );
      console.log('setPreviousCurrentCategoryToFalse', result);
    }

    //2.
    const updatedCategory = await this.categoryModel
      .findOneAndUpdate({ userEmail, name }, { $set: data }, { new: true })
      .exec();
    //#endregion

    //#region It doesn't happen all the time
    if ('name' in data && data.name) {
      const user = await this.userModel.findOne({ userEmail });
      if (!user) {
        throw new NotFoundException(`User with email ${userEmail} not found`);
      }
      user.categoryChangeInfoArray.forEach((info) => {
        if (info.categoryName === name) {
          info.categoryName = data.name;
        }
      });
      await user.save();
      return {
        updateCategoryDto,
        updatedCategoryChangeInfoArray: user.categoryChangeInfoArray,
      };
    }

    if ('color' in data && data.color) {
      const user = await this.userModel.findOne({ userEmail });
      if (!user) {
        throw new NotFoundException(`User with email ${userEmail} not found`);
      }
      user.categoryChangeInfoArray.forEach((info) => {
        if (info.categoryName === name) {
          info.color = data.color;
        }
      });
      await user.save();
      return {
        updateCategoryDto,
        updatedCategoryChangeInfoArray: user.categoryChangeInfoArray,
      };
    }
    //#region

    return { updatedCategory };
  }
  //#endregion

  //#region Original
  // async update(updateCategoryDto: UpdateCategoryDto, userEmail: string) {
  //   const { name, data } = updateCategoryDto;

  //   if ('isCurrent' in data && data.isCurrent) {
  //     // For example, if the previous session's category was "Biology" and
  //     // updateCategoryDto is {name: "Math", data: {isCurrent: true}},
  //     // We must first set "Biology"'s isCurrent to false before updating "Math".
  //     const result = await setPreviousCurrentCategoryToFalse(
  //       userEmail,
  //       this.categoryModel,
  //     );
  //     console.log('setPreviousCurrentCategoryToFalse', result);
  //   }

  //   return this.categoryModel
  //     .findOneAndUpdate({ userEmail, name }, { $set: data }, { new: true })
  //     .exec();
  // }
  //#endregion

  async delete(name: string, userEmail: string) {
    const deletedDoc = await this.categoryModel
      .findOneAndDelete({ userEmail, name })
      .exec();

    if (!deletedDoc) {
      throw new NotFoundException('Category not found');
    }

    const updatedUser = await this.userModel.findOneAndUpdate(
      { userEmail },
      { $pull: { categories: deletedDoc._id } },
      { new: true },
    );

    await this.pomodoroModel.updateMany(
      { category: deletedDoc._id },
      { $unset: { category: '' } },
    );

    return { deletedDoc, updatedUser };
  }
}

async function setPreviousCurrentCategoryToFalse(
  userEmail: string,
  categoryModel: Model<Category>,
) {
  return categoryModel
    .updateOne({ userEmail, isCurrent: true }, { $set: { isCurrent: false } })
    .exec();
}
