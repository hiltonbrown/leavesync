import { log as logtail } from "@logtail/next";
import { sanitizeObject } from "./scrubber";

type LogContext = Record<string, unknown>;

const productionLog = {
  debug(message: string, context?: LogContext): void {
    if (context === undefined) {
      logtail.debug(message);
      return;
    }
    logtail.debug(message, sanitizeObject(context));
  },
  error(message: string, context?: LogContext): void {
    if (context === undefined) {
      logtail.error(message);
      return;
    }
    logtail.error(message, sanitizeObject(context));
  },
  info(message: string, context?: LogContext): void {
    if (context === undefined) {
      logtail.info(message);
      return;
    }
    logtail.info(message, sanitizeObject(context));
  },
  warn(message: string, context?: LogContext): void {
    if (context === undefined) {
      logtail.warn(message);
      return;
    }
    logtail.warn(message, sanitizeObject(context));
  },
};

const developmentLog = {
  debug(message: string, context?: LogContext): void {
    if (context === undefined) {
      console.debug(message);
      return;
    }
    console.debug(message, context);
  },
  error(message: string, context?: LogContext): void {
    if (context === undefined) {
      console.error(message);
      return;
    }
    console.error(message, context);
  },
  info(message: string, context?: LogContext): void {
    if (context === undefined) {
      console.info(message);
      return;
    }
    console.info(message, context);
  },
  warn(message: string, context?: LogContext): void {
    if (context === undefined) {
      console.warn(message);
      return;
    }
    console.warn(message, context);
  },
};

export const log =
  process.env.NODE_ENV === "production" ? productionLog : developmentLog;
