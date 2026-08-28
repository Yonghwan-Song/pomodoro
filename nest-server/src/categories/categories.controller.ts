import {
  Body,
  Controller,
  Delete,
  Param,
  Patch,
  Post,
  Req,
  ValidationPipe,
} from '@nestjs/common';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { CustomRequest } from 'src/common/middlewares/firebase.middleware';
import {
  BatchUpdateCategoryDto,
  UpdateCategoryDto,
} from './dto/update-category.dto';

@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Post()
  async create(
    @Body(new ValidationPipe()) createCategoryDto: CreateCategoryDto,
    @Req() request: CustomRequest,
  ) {
    console.log(createCategoryDto);
    // console.log(request);
    await this.categoriesService.create(createCategoryDto, request.userEmail);

    return { success: true };
  }

  @Patch()
  async update(
    @Body(new ValidationPipe()) updateCategoryDto: UpdateCategoryDto,
    @Req() request: CustomRequest,
  ) {
    console.log(
      '<------------------------updateCategoryDto in the controller------------------------>',
      updateCategoryDto,
    );
    await this.categoriesService.update(updateCategoryDto, request.userEmail);

    return { success: true };
  }

  @Patch('batch')
  async batchUpdate(
    @Body(new ValidationPipe()) batchUpdateDto: BatchUpdateCategoryDto,
    @Req() request: CustomRequest,
  ) {
    await this.categoriesService.batchUpdate(batchUpdateDto, request.userEmail);

    return { success: true };
  }

  @Delete(':name')
  async delete(@Param('name') name: string, @Req() request: CustomRequest) {
    await this.categoriesService.delete(name, request.userEmail);

    return { success: true };
  }
}
