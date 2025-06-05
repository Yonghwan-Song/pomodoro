import { IsString, IsNotEmpty } from 'class-validator';

export class AuthCallbackDto {
  // Authorization code returned by Todoist
  @IsString()
  @IsNotEmpty()
  code: string;

  // State parameter for CSRF protection
  @IsString()
  @IsNotEmpty()
  state: string;
}
