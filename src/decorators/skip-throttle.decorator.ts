import { SetMetadata } from '@nestjs/common';

export const THROTTLER_SKIP = 'throttler:skip';

/**
 * Decorator to skip throttling for specific routes or controllers
 * @param skip - Whether to skip throttling (default: true)
 */
export const SkipThrottle = (skip = true) => SetMetadata(THROTTLER_SKIP, skip);

/**
 * Decorator to apply specific throttle configuration to a route or controller
 * @param options - Throttle options or throttle name
 */
export const Throttle = (options: { name: string }) => SetMetadata('throttler:options', options);
