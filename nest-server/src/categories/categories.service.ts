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

  async update(updateCategoryDto: UpdateCategoryDto, userEmail: string) {
    const { name, data } = updateCategoryDto;

    if ('isCurrent' in data && data.isCurrent) {
      // For example, if the previous session's category was "Biology" and
      // updateCategoryDto is {name: "Math", data: {isCurrent: true}},
      // We must first set "Biology"'s isCurrent to false before updating "Math".
      setPreviousCurrentCategoryToFalse(userEmail, this.categoryModel);
    }

    return await this.categoryModel
      .findOneAndUpdate({ userEmail, name }, { $set: data }, { new: true })
      .exec();
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

async function setPreviousCurrentCategoryToFalse(
  userEmail: string,
  categoryModel: Model<Category>,
) {
  await categoryModel
    .updateOne({ userEmail, isCurrent: true }, { $set: { isCurrent: false } })
    .exec();
}
