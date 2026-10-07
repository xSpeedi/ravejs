import pino, { Logger } from 'pino';
import prettifier from 'pino-pretty';

export let LOGGER: Logger;

const initLogger = (enableLogging: boolean): Logger => {
  if (LOGGER) return LOGGER;

  return (LOGGER = pino(
    {
      enabled: enableLogging,
    },
    prettifier({
      colorize: true,
      sync: true,
    }),
  ));
};

export default initLogger;
