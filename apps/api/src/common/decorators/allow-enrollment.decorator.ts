import { SetMetadata } from '@nestjs/common';

export const ALLOW_ENROLLMENT_KEY = 'allowEnrollment';
export const AllowEnrollment = () => SetMetadata(ALLOW_ENROLLMENT_KEY, true);
