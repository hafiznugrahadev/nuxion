import { Body, Controller, Get, HttpCode, HttpStatus, Put } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@nuxion/shared-types';
import { Roles } from '@common/decorators/roles.decorator';
import { Public } from '@common/decorators/public.decorator';
import { SettingsService } from './settings.service';
import { UpdateBrandingDto } from './dto/update-branding.dto';

@ApiTags('settings')
@Controller('settings')
export class SettingsController {
  constructor(private readonly settings: SettingsService) {}

  @Public()
  @Get('branding')
  @ApiOperation({
    summary: 'Public branding (app name, logo, favicon) — read by the web SSR',
  })
  getBranding() {
    return this.settings.getBranding();
  }

  @Put('branding')
  @Roles(UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Update the 'branding' settings group (Super Admin)" })
  updateBranding(@Body() dto: UpdateBrandingDto) {
    return this.settings.updateBranding(dto);
  }
}
