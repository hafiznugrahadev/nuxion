import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { STORAGE_DRIVER, type StorageDriver } from './storage.types';
import { LocalStorageDriver, type LocalDriverOptions } from './drivers/local.driver';
import { S3StorageDriver, type S3DriverOptions } from './drivers/s3.driver';
import { StorageService } from './storage.service';

/**
 * Global object-storage module. The driver (local | s3) is selected from config
 * at startup; both honour the same StorageDriver contract so call-sites are
 * storage-agnostic. Mirrors the RedisModule wiring (SPEC DRY #10).
 */
@Global()
@Module({
  providers: [
    {
      provide: STORAGE_DRIVER,
      inject: [ConfigService],
      useFactory: (config: ConfigService): StorageDriver => {
        const driver = config.get<string>('storage.driver') ?? 'local';
        if (driver === 's3') {
          return new S3StorageDriver(config.getOrThrow<S3DriverOptions>('storage.s3'));
        }
        return new LocalStorageDriver(config.getOrThrow<LocalDriverOptions>('storage.local'));
      },
    },
    StorageService,
  ],
  exports: [StorageService],
})
export class StorageModule {}
