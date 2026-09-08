import { Injectable } from '@nestjs/common';
import { BaseRepository, PrismaDelegate } from '@common/repositories/base.repository';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { UserEntity } from './entities/user.entity';

/** A user row with its roles included and the password omitted. */
export type UserWithRoles = Omit<UserEntity, 'roles'> & { roles: { name: string }[] };

@Injectable()
export class UsersRepository extends BaseRepository<UserEntity> {
  protected readonly searchableFields = ['name', 'email'];

  constructor(private readonly prisma: PrismaService) {
    super();
  }

  protected get delegate(): PrismaDelegate {
    return this.prisma.user as unknown as PrismaDelegate;
  }

  findWithRoles(id: string): Promise<UserWithRoles | null> {
    return this.prisma.user.findUnique({
      where: { id },
      include: { roles: true },
      omit: { password: true },
    }) as unknown as Promise<UserWithRoles | null>;
  }

  /** The only path that reads the password hash — used to verify the current
   * password before a self-service change. */
  findWithPassword(id: string): Promise<{ id: string; password: string } | null> {
    return this.prisma.user.findUnique({
      where: { id },
      select: { id: true, password: true },
    });
  }

  createWithRoles(
    data: { email: string; name: string; password: string },
    roleNames: string[],
  ): Promise<UserWithRoles> {
    return this.prisma.user.create({
      data: { ...data, roles: { connect: roleNames.map((name) => ({ name })) } },
      include: { roles: true },
      omit: { password: true },
    }) as unknown as Promise<UserWithRoles>;
  }

  updateWithRoles(
    id: string,
    data: { name?: string; password?: string; avatarUrl?: string | null },
    roleNames?: string[],
  ): Promise<UserWithRoles> {
    return this.prisma.user.update({
      where: { id },
      data: {
        ...data,
        ...(roleNames ? { roles: { set: roleNames.map((name) => ({ name })) } } : {}),
      },
      include: { roles: true },
      omit: { password: true },
    }) as unknown as Promise<UserWithRoles>;
  }
}
