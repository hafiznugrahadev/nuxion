import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsUrl, MaxLength, MinLength } from 'class-validator';

export class UpdateBrandingDto {
  @ApiProperty({ example: 'Nuxion' })
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  appName!: string;

  /** Public URL of the uploaded logo (POST /files). Null = bundled asset. */
  @ApiPropertyOptional({ nullable: true, type: String })
  @IsOptional()
  @IsUrl({ require_protocol: true, require_tld: false })
  logoUrl?: string | null;

  /** Public URL of the uploaded favicon (POST /files). Null = bundled asset. */
  @ApiPropertyOptional({ nullable: true, type: String })
  @IsOptional()
  @IsUrl({ require_protocol: true, require_tld: false })
  faviconUrl?: string | null;
}
