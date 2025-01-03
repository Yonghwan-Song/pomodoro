import { Injectable, NotFoundException } from '@nestjs/common';
import { Category } from 'src/schemas/category.schema';
import { HydratedDocument, Model } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { CreateCategoryDto } from './dto/create-category.dto';
import { User } from 'src/schemas/user.schema';
import {
  BatchUpdateCategoryDto,
  UpdateCategoryDto,
} from './dto/update-category.dto';
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

  async update(updateCategoryDto: UpdateCategoryDto, userEmail: string) {
    const { name, data } = updateCategoryDto;

    // This should come first because of the logic how the setPrev... function finds the current category
    if ('isCurrent' in data) {
      await setCurrentCategoryToFalse(userEmail, this.categoryModel);
    }

    const categoryUpdated = await this.categoryModel
      .findOneAndUpdate({ userEmail, name }, { $set: data }, { new: true })
      .exec();

    if ('color' in data || 'name' in data) {
      const user = await this.userModel.findOne({ userEmail });
      if (!user) {
        throw new NotFoundException(`User with email ${userEmail} not found`);
      }
      user.categoryChangeInfoArray.forEach((info) => {
        if (info.categoryName === name) {
          if ('color' in data) info.color = data.color;
          if ('name' in data) info.categoryName = data.name;
        }
      });
      await user.save();
    }

    return {
      categoryUpdated,
    };
  }

  async batchUpdate(batchUpdateDto: BatchUpdateCategoryDto, userEmail: string) {
    const results = await Promise.all(
      batchUpdateDto.categories.map((categoryDto) =>
        this.update(categoryDto, userEmail),
      ),
    );

    return results;
  }

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

/**
 * For example, if the previous session's category was "Biology" and
 * updateCategoryDto is {name: "Math", data: {isCurrent: true}},
 * We must first set "Biology"'s isCurrent to false before updating "Math".
 */
async function setCurrentCategoryToFalse(
  userEmail: string,
  categoryModel: Model<Category>,
) {
  return categoryModel
    .findOneAndUpdate(
      { userEmail, isCurrent: true },
      { $set: { isCurrent: false } },
      { new: true },
    )
    .exec();
}
