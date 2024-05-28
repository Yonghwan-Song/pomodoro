import { IsNotEmpty, IsString } from 'class-validator';

export class CreateUserDto {
  @IsNotEmpty()
  @IsString()
  firebaseUid: string;

  // @IsNotEmpty()
  // @IsString()
  // email: string;
}
