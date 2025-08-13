// test-logger.ts
import pino from 'pino';

// Simplest possible logger
const logger = pino({
  level: 'debug',
  transport: {
    target: 'pino-pretty'
  }
});

logger.debug('TEST DEBUG MESSAGE');
logger.info('TEST INFO MESSAGE');
logger.error('TEST ERROR MESSAGE');