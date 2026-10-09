import { Module } from '@nestjs/common';
import { UsersModule } from '@modules/users/users.module';
import { RolesController } from './roles.controller';
import { RolesService } from './roles.service';
import { RolesRepository } from './roles.repository';

@Module({
  // UsersService.invalidateList() keeps the cached user list fresh when a
  // rename/delete changes the role names users carry.
  imports: [UsersModule],
  controllers: [RolesController],
  providers: [RolesService, RolesRepository],
})
export class RolesModule {}
