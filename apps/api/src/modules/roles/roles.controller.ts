import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@nuxion/shared-types';
import { Roles } from '@common/decorators/roles.decorator';
import { RoleEntity } from './entities/role.entity';
import { RolesService } from './roles.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';

@ApiTags('roles')
@ApiBearerAuth()
@Controller('roles')
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Get()
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'List the role catalog (with holder counts)' })
  findAll(): Promise<RoleEntity[]> {
    return this.rolesService.findAll();
  }

  @Post()
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Create a custom role (super admin)' })
  create(@Body() dto: CreateRoleDto): Promise<RoleEntity> {
    return this.rolesService.create(dto);
  }

  @Patch(':id')
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Rename a custom role (super admin; built-ins protected)' })
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateRoleDto): Promise<RoleEntity> {
    return this.rolesService.update(id, dto);
  }

  @Delete(':id')
  @Roles(UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Delete a custom role, un-assigning it everywhere (super admin; built-ins protected)',
  })
  remove(@Param('id', ParseUUIDPipe) id: string): Promise<RoleEntity> {
    return this.rolesService.remove(id);
  }
}
