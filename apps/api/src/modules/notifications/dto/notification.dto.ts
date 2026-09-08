import { IsOptional, IsString, IsIn } from 'class-validator';

export class CreateNotificationDto {
  @IsString()
  title!: string;

  @IsString()
  body!: string;

  @IsOptional()
  @IsString()
  @IsIn(['info', 'success', 'warning', 'error'])
  type?: string;
}
