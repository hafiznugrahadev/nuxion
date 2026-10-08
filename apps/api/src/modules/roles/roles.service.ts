import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { UserRole } from '@nuxion/shared-types';
import { UsersService } from '@modules/users/users.service';
import { RoleEntity } from './entities/role.entity';
import { RolesRepository, type RoleWithCount } from './roles.repository';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';

/**
 * Role catalog management. Roles are data: custom rows are first-class and
 * assignable like the seeded ones. The well-known roles backing `@Roles` guards
 * and the registration flow are protected from rename/delete so authorization
 * semantics can't be broken from the admin UI.
 */

/** Roles the code itself depends on — never rename or delete these. */
const WELL_KNOWN_ROLES: readonly string[] = Object.values(UserRole);

@Injectable()
export class RolesService {
  private readonly entityName = 'Role';

  constructor(
    private readonly rolesRepository: RolesRepository,
    private readonly usersService: UsersService,
  ) {}

  async findAll(): Promise<RoleEntity[]> {
    return (await this.rolesRepository.listWithCounts()).map((r) => this.toEntity(r));
  }

  /** Duplicates (including well-known names) are rejected by `@IsUnique` on the
   *  DTO — a 400 before the service runs. */
  async create(dto: CreateRoleDto): Promise<RoleEntity> {
    const created = await this.rolesRepository.create({ name: dto.name });
    return this.toEntity({ ...created, userCount: 0 });
  }

  async update(id: string, dto: UpdateRoleDto): Promise<RoleEntity> {
    const existing = await this.findOrThrow(id);
    if (WELL_KNOWN_ROLES.includes(existing.name)) {
      throw new BadRequestException(`${existing.name} is a built-in role and cannot be renamed`);
    }
    if (!dto.name || dto.name === existing.name) return this.toEntity(existing);

    const clash = await this.rolesRepository.findByName(dto.name);
    if (clash && clash.id !== id) throw new ConflictException('name already exists');

    const renamed = await this.rolesRepository.rename(id, dto.name);
    // Role names appear in cached user list responses — keep that cache fresh.
    await this.usersService.invalidateList();
    return this.toEntity({ ...renamed, userCount: existing.userCount });
  }

  async remove(id: string): Promise<RoleEntity> {
    const existing = await this.findOrThrow(id);
    if (WELL_KNOWN_ROLES.includes(existing.name)) {
      throw new BadRequestException(`${existing.name} is a built-in role and cannot be deleted`);
    }
    await this.rolesRepository.delete(id);
    await this.usersService.invalidateList();
    return this.toEntity(existing);
  }

  private async findOrThrow(id: string): Promise<RoleWithCount> {
    const role = await this.rolesRepository.findById(id);
    if (!role) throw new NotFoundException(`${this.entityName} with id "${id}" not found`);
    return role;
  }

  private toEntity(r: RoleWithCount): RoleEntity {
    return { id: r.id, name: r.name, createdAt: r.createdAt, userCount: r.userCount };
  }
}
