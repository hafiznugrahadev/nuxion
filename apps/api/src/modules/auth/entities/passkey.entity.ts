import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Response shape for a registered passkey. The COSE public key and signature
 * counter never leave the API — they are verification state, not client data.
 */
export class PasskeyEntity {
  /** base64url credential ID (NOT a UUID — do not ParseUUIDPipe it). */
  @ApiProperty() id!: string;

  @ApiPropertyOptional({ nullable: true }) name?: string | null;

  @ApiProperty({ type: [String], example: ['internal'] }) transports!: string[];

  @ApiPropertyOptional({ nullable: true }) deviceType?: string | null;

  @ApiProperty() backedUp!: boolean;

  @ApiPropertyOptional({ nullable: true }) lastUsedAt?: Date | null;

  @ApiProperty() createdAt!: Date;
}
