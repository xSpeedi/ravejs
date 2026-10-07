import { z } from 'zod';

import { AuthFactory } from '../factories/auth-factory';
import { MeshFactory } from '../factories/mesh-factory';
import { UserFactory } from '../factories/user-factory';
import { RaveConfig } from '../schemas/public';
import initLogger, { LOGGER } from '../utils/logger';
import { HttpWorkflow } from './httpworkflow';
import { ThreadFactory } from '../factories/thread-factory';
import { VideoFactory } from '../factories/video-factory';
import { API_URL } from '../constants';
import { validateProxy } from '../utils/utils';

export class Rave {
  private __config?: RaveConfig;
  private __http: HttpWorkflow;

  private __authFactory?: AuthFactory;
  private __userFactory?: UserFactory;
  private __meshFactory?: MeshFactory;
  private __threadFactory?: ThreadFactory;
  private __videoFactory?: VideoFactory;

  constructor(config: RaveConfig = {}) {
    this.__config = config;
    this.__http = new HttpWorkflow();

    initLogger(!!config.enableLogging);
  }

  get token() {
    return this.__http.token;
  }

  get JWT() {
    return this.__http.weMeshToken;
  }

  get auth() {
    if (!this.__authFactory)
      return (this.__authFactory = new AuthFactory(this.__config, this.__http));
    return this.__authFactory;
  }

  get account() {
    const account = this.__config?.account || this.__authFactory?.account;

    if (!account) {
      throw new Error('Account not found');
    }

    return account;
  }

  get user() {
    if (!this.__userFactory)
      return (this.__userFactory = new UserFactory(this.__http));
    return this.__userFactory;
  }

  get mesh() {
    if (!this.__meshFactory)
      return (this.__meshFactory = new MeshFactory(
        this.__config,
        this.__http,
        this.account,
      ));
    return this.__meshFactory;
  }

  get thread() {
    if (!this.__threadFactory)
      return (this.__threadFactory = new ThreadFactory(this.__http));
    return this.__threadFactory;
  }

  get video() {
    if (!this.__videoFactory)
      return (this.__videoFactory = new VideoFactory(this.__http));
    return this.__videoFactory;
  }

  get proxy(): string | undefined {
    return this.__http.proxy;
  }

  set proxy(proxy: string) {
    try {
      this.__http.setProxy(proxy, validateProxy(proxy));
    } catch {
      LOGGER.error({ proxy }, 'Invalid proxy');
    }
  }

  public offProxy = () => {
    this.__http.offDispatcher();
  };

  public proxyIsAlive = async (): Promise<boolean> => {
    try {
      await this.__http.sendRaw<string>(
        {
          path: API_URL,
          method: 'GET',
        },
        z.string(),
      );
    } catch {
      return false;
    }
    return true;
  };
}
