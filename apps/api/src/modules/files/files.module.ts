import { Module } from '@nestjs/common';
import { FilesController } from './files.controller';

/**
 * Exposes the generic upload endpoint. The StorageService it depends on comes
 * from the @Global StorageModule, so nothing extra is imported here.
 */
@Module({ controllers: [FilesController] })
export class FilesModule {}
