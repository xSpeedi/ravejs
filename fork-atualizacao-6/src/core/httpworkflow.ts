import { Dispatcher, ProxyAgent, request } from 'undici';
import BodyReadable from 'undici/types/readable';
import { socksDispatcher, SocksProxies } from 'fetch-socks';
import { z } from 'zod';

import {
  API_URL,
  API_HEADERS,
  WE_MESH_API_URL,
  GLOBAL_DISPATCHER,
} from '../constants';
import { HeadersType, MethodType } from '../schemas/private';
import { generateHash, generateSSAID } from '../utils/cryptography';
import { LOGGER } from '../utils/logger';
import {
  GetRequestConfig,
  PostRequestConfig,
  RawRequestConfig,
} from '../schemas/configs';
import { isOk } from '../utils/utils';
import { APIException } from '../utils/exceptions';

export class HttpWorkflow {
  private __headers: HeadersType = { ...API_HEADERS };
  private __weMeshHeaders: HeadersType = { ...API_HEADERS };

  private __currentProxy?: string;
  private __currentDispatcher?: ProxyAgent;

  get token(): string {
    return this.__headers.Authorization.slice(
      7,
      this.__headers.Authorization.length,
    );
  }

  get weMeshToken(): string {
    return this.__weMeshHeaders.Authorization.slice(
      7,
      this.__weMeshHeaders.Authorization.length,
    );
  }

  get proxy(): string | undefined {
    return this.__currentProxy;
  }

  set token(token: string) {
    this.__headers.Authorization = `Bearer ${token}`;
  }

  set weMeshToken(token: string) {
    this.__weMeshHeaders.Authorization = `Bearer ${token}`;
  }

  set popHeaders(key: string) {
    delete this.__headers[key];
  }

  private __configureHeaders = (
    data?: string,
    headers?: HeadersType,
    host?: string,
  ): HeadersType => {
    const timestamp = Date.now().toString();

    return {
      ...(headers || this.__headers),
      'request-ts': timestamp,
      ssaid: generateSSAID(),
      Host: host || this.__headers.Host,
      'request-hash': generateHash(
        this.token,
        timestamp,
        data ? Buffer.byteLength(data, 'utf8') : 0,
      ),
    };
  };

  private __handleResponse = async <T>(
    statusCode: number,
    fullPath: string,
    body: BodyReadable & Dispatcher.BodyMixin,
    schema: z.ZodSchema,
  ): Promise<T> => {
    if (!isOk(statusCode)) {
      LOGGER.child({ path: fullPath }).error(statusCode);
      APIException.throw(statusCode);
    }

    const response = await body.text();
    LOGGER.child({ path: fullPath }).info(statusCode);

    let parsed: unknown;
    try {
      parsed = JSON.parse(response);
    } catch {
      // Não é JSON (HTML, corpo vazio...): devolve o texto como antes.
      return response as T;
    }

    try {
      return schema.parse(parsed) as T;
    } catch {
      // O JSON é válido, mas não bate com o schema (ex.: sala sem vídeo, currentState "vote").
      // Devolve o objeto já convertido em vez do texto cru, senão quem chama (mesh.get, join...)
      // recebe uma string e quebra.
      LOGGER.child({ path: fullPath }).warn(
        'schema validation failed, returning unvalidated JSON',
      );
      return parsed as T;
    }
  };

  private __sendDataRequest = async <T>(
    method: MethodType,
    config: PostRequestConfig,
    schema: z.ZodSchema,
  ): Promise<T> => {
    const baseUrl = config.baseUrl || API_URL;
    const { statusCode, body } = await request(`${baseUrl}${config.path}`, {
      method,
      headers: this.__configureHeaders(
        config.body,
        config.headers,
        config.baseUrl?.slice(8),
      ),
      body: config.body,
      dispatcher: this.__currentDispatcher || GLOBAL_DISPATCHER,
    });

    return await this.__handleResponse(
      statusCode,
      `${baseUrl}${config.path}`,
      body,
      schema,
    );
  };

  public offDispatcher = () => {
    this.__currentDispatcher = undefined;
  };

  public sendGetDelete = async <T>(
    method: 'GET' | 'DELETE',
    config: GetRequestConfig,
    schema: z.ZodSchema,
  ): Promise<T> => {
    const baseUrl = config.baseUrl || API_URL;
    const { statusCode, body } = await request(`${baseUrl}${config.path}`, {
      method,
      headers: this.__configureHeaders(undefined, config.headers),
      dispatcher: this.__currentDispatcher || GLOBAL_DISPATCHER,
    });

    return await this.__handleResponse(
      statusCode,
      `${baseUrl}${config.path}`,
      body,
      schema,
    );
  };

  public sendGet = async <T>(
    config: GetRequestConfig,
    schema: z.ZodSchema,
  ): Promise<T> => {
    return await this.sendGetDelete('GET', config, schema);
  };

  public sendDelete = async <T>(
    config: GetRequestConfig,
    schema: z.ZodSchema,
  ): Promise<T> => {
    return await this.sendGetDelete('DELETE', config, schema);
  };

  public sendPost = async <T>(
    config: PostRequestConfig,
    schema: z.ZodSchema,
  ): Promise<T> => {
    return await this.__sendDataRequest('POST', config, schema);
  };

  public sendPut = async <T>(
    config: PostRequestConfig,
    schema: z.ZodSchema,
  ): Promise<T> => {
    return await this.__sendDataRequest('PUT', config, schema);
  };

  public sendWeMeshGet = async <T>(
    config: GetRequestConfig,
    schema: z.ZodSchema,
  ): Promise<T> => {
    return await this.sendGet<T>(
      {
        ...config,
        baseUrl: WE_MESH_API_URL,
        headers: this.__weMeshHeaders,
      },
      schema,
    );
  };

  public sendWeMeshPost = async <T>(
    config: PostRequestConfig,
    schema: z.ZodSchema,
  ): Promise<T> => {
    return await this.__sendDataRequest(
      'POST',
      {
        ...config,
        baseUrl: WE_MESH_API_URL,
        headers: this.__weMeshHeaders,
      },
      schema,
    );
  };

  public sendRaw = async <T>(
    config: RawRequestConfig,
    schema: z.ZodSchema,
  ): Promise<T> => {
    const { statusCode, body } = await request(config.path, {
      headers: config.headers,
      method: config.method,
      body: config.body,
      dispatcher: this.__currentDispatcher || GLOBAL_DISPATCHER,
    });

    return await this.__handleResponse(statusCode, config.path, body, schema);
  };

  public setProxy(rawProxy: string, socksProxy: SocksProxies) {
    if (this.__currentDispatcher) this.__currentDispatcher.close();

    this.__currentProxy = rawProxy;
    this.__currentDispatcher = socksDispatcher(socksProxy, {
      connect: {
        rejectUnauthorized: false,
      },
    });

    LOGGER.info({ proxy: rawProxy }, 'Proxy set');
  }
}
