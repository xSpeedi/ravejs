import { APIErrorData } from '../schemas/error';
import { CODES_MAP } from '../constants';

export class APIException extends Error {
  public readonly code: number;

  constructor(code: number, data: APIErrorData) {
    super(data.message);
    this.code = code;
    this.name = data.name || `RaveJSException.${code}`;
    this.code = code;

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, APIException);
    }
  }

  static get(code: number): APIException {
    const errorData = CODES_MAP[code];

    return errorData
      ? new APIException(code, errorData)
      : new APIException(code, {
          name: 'UnknownError',
          message: 'Unknown error',
        });
  }

  static throw(code: number): void {
    throw this.get(code);
  }
}
