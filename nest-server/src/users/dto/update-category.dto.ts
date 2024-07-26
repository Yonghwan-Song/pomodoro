// import { ObjectId } from 'mongoose';

export class UpdateCategoryDto {
  // _id: ObjectId;
  _id: string;
  data:
    | {
        name: string;
      }
    | { color: string };
}
