import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/** `@Public()` — opt a route out of the global JWT guard. */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
