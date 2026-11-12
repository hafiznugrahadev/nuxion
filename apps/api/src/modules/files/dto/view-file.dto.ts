import { IsString, Matches } from 'class-validator';

export class ViewFileDto {
  @IsString()
  @Matches(
    /^[a-z0-9_-]+\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(?:png|jpe?g|gif|webp|pdf)$/,
  )
  key!: string;
}
