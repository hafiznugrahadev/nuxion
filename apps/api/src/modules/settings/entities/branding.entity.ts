import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/** Response shape for the 'branding' settings group. */
export class BrandingEntity {
  @ApiProperty({ example: 'Nuxion' }) appName!: string;

  @ApiPropertyOptional({
    nullable: true,
    example: 'https://api.example.com/api/files/view?key=branding/abc.png',
  })
  logoUrl!: string | null;

  @ApiPropertyOptional({
    nullable: true,
    example: 'https://api.example.com/api/files/view?key=branding/fav.png',
  })
  faviconUrl!: string | null;
}
