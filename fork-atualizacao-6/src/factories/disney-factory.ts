import * as fs from 'fs';
import * as path from 'path';
import { randomUUID } from 'crypto';
import { request } from 'undici';

import {
  DISNEY_API_URL,
  DISNEY_CLIENT_KEY,
  DISNEY_EXPLORE_VERSION,
  DISNEY_SESSION_FILE,
  DISNEY_USER_AGENT,
} from '../constants';
import { LOGGER } from '../utils/logger';
import {
  collectDisneyEpisodes,
  DisneyEntity,
  DisneyPlayable,
  DisneySearchResult,
  findDisneyPagination,
  parseDisneyEntity,
  parseDisneySearch,
} from '../utils/disney';

export type {
  DisneyPlayable,
  DisneySearchResult,
  DisneyEntity,
} from '../utils/disney';

export type DisneyErrorCode =
  | 'sem-sessao'
  | 'sessao-invalida'
  | 'rede'
  | 'sem-resultado'
  | 'sem-temporada'
  | 'sem-episodio'
  | 'sem-conteudo';

export class DisneyError extends Error {
  public readonly code: DisneyErrorCode;
  public readonly extra: Record<string, unknown>;

  constructor(
    code: DisneyErrorCode,
    message: string,
    extra: Record<string, unknown> = {},
  ) {
    super(message);
    this.name = 'DisneyError';
    this.code = code;
    this.extra = extra;
  }
}

export interface DisneyResolveOptions {
  /** qual resultado da busca usar (1 = o primeiro) */
  position?: number;
  season?: number;
  episode?: number;
}

export interface DisneyResolved {
  entity: DisneyEntity;
  playable: DisneyPlayable;
}

interface DisneySession {
  refreshToken: string;
  accessToken?: string;
  /** ms desde 1970 */
  expiresAt?: number;
}

const ACCESS_MARGIN_MS = 5 * 60 * 1000;
const CACHE_TTL_MS = 10 * 60 * 1000;
const SEASON_MAX_PAGES = 8;

const REFRESH_QUERY =
  'mutation refreshToken($input:RefreshTokenInput!){refreshToken(refreshToken:$input){activeSession{sessionId}}}';

export class DisneyFactory {
  private readonly __file: string;
  private __mem?: DisneySession;
  private __mtime = 0;
  private __refreshing?: Promise<string>;
  private readonly __cache = new Map<string, { at: number; value: unknown }>();

  constructor(sessionFile?: string) {
    this.__file = path.resolve(
      process.cwd(),
      sessionFile || process.env.RAVE_DISNEY_SESSION || DISNEY_SESSION_FILE,
    );
  }

  /** Caminho do arquivo onde a sessão da Disney fica guardada. */
  get sessionFile(): string {
    return this.__file;
  }

  public hasSession = (): boolean => {
    try {
      return !!this.__getSession().refreshToken;
    } catch {
      return false;
    }
  };

  /** Procura títulos na Disney+ (mesma busca do site). */
  public search = async (
    query: string,
    limit = 5,
  ): Promise<DisneySearchResult[]> => {
    const q = String(query).trim();
    if (!q) return [];
    const json = await this.__explore(
      `/explore/${DISNEY_EXPLORE_VERSION}/search?query=${encodeURIComponent(q)}`,
    );
    const results = parseDisneySearch(json);

    if (
      results.length === 0 &&
      !(json?.data?.page && Array.isArray(json.data.page.containers))
    ) {
      throw new DisneyError(
        'rede',
        'Disney search: unrecognized response format (layout changed?)',
      );
    }
    return results.slice(0, Math.max(1, limit));
  };

  /** Página de um título: série (com temporadas) ou filme. */
  public entity = async (entityId: string): Promise<DisneyEntity> => {
    const key = `entity:${entityId}`;
    const cached = this.__fromCache<DisneyEntity>(key);
    if (cached) return cached;

    const json = await this.__explore(
      `/explore/${DISNEY_EXPLORE_VERSION}/page/entity-${entityId}?disableSmartFocus=true&enhancedContainersLimit=15&limit=15`,
    );
    const entity = parseDisneyEntity(json, entityId);
    this.__toCache(key, entity);
    return entity;
  };

  /** Busca + página do título + escolha da temporada/episódio. Lança DisneyError quando não acha. */
  public resolve = async (
    query: string,
    options: DisneyResolveOptions = {},
  ): Promise<DisneyResolved> => {
    const results = await this.search(query, 10);
    const position = Math.max(1, Math.floor(options.position ?? 1));
    const hit = results[position - 1];
    if (!hit) {
      throw new DisneyError('sem-resultado', `Nenhum resultado para "${query}"`, {
        total: results.length,
      });
    }

    const entity = await this.entity(hit.entityId);

    if (entity.kind === 'MOVIE' && entity.movie) {
      return { entity, playable: entity.movie };
    }

    if (entity.kind === 'SERIES') {
      const seasonNumber = Math.max(1, Math.floor(options.season ?? 1));
      const episodeNumber = Math.max(1, Math.floor(options.episode ?? 1));

      const season = entity.seasons.find((s) => s.number === seasonNumber);
      if (!season) {
        throw new DisneyError(
          'sem-temporada',
          `${entity.title} não tem a temporada ${seasonNumber}`,
          {
            titulo: entity.title,
            temporada: seasonNumber,
            total: entity.seasons.length,
          },
        );
      }

      let episodes = season.episodes;
      let found = episodes.find((e) => e.episode === episodeNumber);
      if (!found) {
        try {
          episodes = await this.__seasonEpisodes(season.id);
        } catch (e) {
          const veioNaPagina = season.episodes.length > 0;
          if (!(e instanceof DisneyError) || e.code !== 'rede' || !veioNaPagina) {
            throw e;
          }
        }
        found = episodes.find((e) => e.episode === episodeNumber);
      }
      if (!found) {
        throw new DisneyError(
          'sem-episodio',
          `${entity.title} T${seasonNumber} não tem o episódio ${episodeNumber}`,
          {
            titulo: entity.title,
            temporada: seasonNumber,
            episodio: episodeNumber,
            total: episodes.length,
          },
        );
      }
      return { entity, playable: found };
    }

    throw new DisneyError('sem-conteudo', `Nada pra tocar em "${entity.title || query}"`, {
      titulo: entity.title || query,
    });
  };

  private __seasonEpisodes = async (
    seasonId: string,
  ): Promise<DisneyPlayable[]> => {
    const key = `season:${seasonId}`;
    const cached = this.__fromCache<DisneyPlayable[]>(key);
    if (cached) return cached;

    const all: DisneyPlayable[] = [];
    let offset = 0;
    for (let page = 0; page < SEASON_MAX_PAGES; page++) {
      const json = await this.__explore(
        `/explore/${DISNEY_EXPLORE_VERSION}/season/${seasonId}?limit=30${offset ? `&offset=${offset}` : ''}`,
      );
      const before = all.length;
      for (const ep of collectDisneyEpisodes(json, seasonId)) {
        if (!all.some((x) => x.providerId === ep.providerId)) all.push(ep);
      }
      const pagination = findDisneyPagination(json);
      if (all.length === before || !pagination?.hasMore) break;
      offset = all.length;
    }

    all.sort((a, b) => (a.episode ?? 0) - (b.episode ?? 0));
    this.__toCache(key, all);
    return all;
  };

  private __fromCache = <T>(key: string): T | null => {
    const hit = this.__cache.get(key);
    if (!hit) return null;
    if (Date.now() - hit.at > CACHE_TTL_MS) {
      this.__cache.delete(key);
      return null;
    }
    return hit.value as T;
  };

  private __toCache = (key: string, value: unknown): void => {
    if (this.__cache.size > 60) {
      this.__cache.delete(this.__cache.keys().next().value as string);
    }
    this.__cache.set(key, { at: Date.now(), value });
  };

  private __exploreHeaders = (token: string): Record<string, string> => ({
    accept: 'application/json',
    authorization: `Bearer ${token}`,
    'accept-language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
    origin: 'https://www.disneyplus.com',
    referer: 'https://www.disneyplus.com/',
    'user-agent': DISNEY_USER_AGENT,
    'x-application-version': '15f4cd16_bap',
    'x-bamsdk-client-id': 'disney-svod-3d9324fc',
    'x-bamsdk-platform': 'javascript/chromium/edge',
    'x-bamsdk-version': '35.6',
    'x-dss-edge-accept': 'vnd.dss.edge+json; version=2',
    'x-request-id': randomUUID(),
  });

  private __explore = async (
    pathAndQuery: string,
    retry = true,
  ): Promise<any> => {
    const token = await this.__accessToken();

    let statusCode: number;
    let text: string;
    try {
      const resp = await request(`${DISNEY_API_URL}${pathAndQuery}`, {
        method: 'GET',
        headers: this.__exploreHeaders(token),
      });
      statusCode = resp.statusCode;
      text = await resp.body.text();
    } catch (e) {
      throw new DisneyError('rede', `Disney: sem resposta (${(e as Error).message})`);
    }

    if ((statusCode === 401 || statusCode === 403) && retry) {
      if (this.__mem) this.__mem.accessToken = undefined;
      return await this.__explore(pathAndQuery, false);
    }
    if (statusCode < 200 || statusCode >= 300) {
      throw new DisneyError('rede', `Disney HTTP ${statusCode}`, { statusCode });
    }
    try {
      return JSON.parse(text);
    } catch {
      throw new DisneyError('rede', 'Disney: resposta que não é JSON');
    }
  };

  private __getSession = (): DisneySession => {
    let stat: fs.Stats;
    try {
      stat = fs.statSync(this.__file);
    } catch {
      if (this.__mem) return this.__mem;
      throw new DisneyError(
        'sem-sessao',
        `Arquivo da sessão da Disney não encontrado: ${this.__file}`,
      );
    }

    if (!this.__mem || stat.mtimeMs !== this.__mtime) {
      const raw = fs.readFileSync(this.__file, 'utf8').trim();
      let parsed: Partial<DisneySession> = {};
      if (raw.startsWith('{')) {
        try {
          parsed = JSON.parse(raw);
        } catch {
          throw new DisneyError('sem-sessao', 'Arquivo da sessão da Disney com JSON quebrado');
        }
      } else if (raw) {
        parsed = { refreshToken: raw };
      }
      if (!parsed.refreshToken || typeof parsed.refreshToken !== 'string') {
        throw new DisneyError('sem-sessao', 'Arquivo da sessão da Disney sem refreshToken');
      }
      this.__mem = {
        refreshToken: parsed.refreshToken.trim(),
        accessToken: parsed.accessToken,
        expiresAt: parsed.expiresAt,
      };
      this.__mtime = stat.mtimeMs;
    }
    return this.__mem;
  };

  private __saveSession = (session: DisneySession): void => {
    this.__mem = session;
    try {
      const tmp = `${this.__file}.tmp`;
      fs.writeFileSync(tmp, JSON.stringify(session, null, 2), { mode: 0o600 });
      fs.renameSync(tmp, this.__file);
      this.__mtime = fs.statSync(this.__file).mtimeMs;
    } catch (e) {
      LOGGER.child({ file: this.__file }).warn(
        `Disney: não consegui gravar a sessão (${(e as Error).message}); segue só na memória`,
      );
    }
  };

  private __accessToken = async (): Promise<string> => {
    const session = this.__getSession();
    if (
      session.accessToken &&
      session.expiresAt &&
      Date.now() < session.expiresAt - ACCESS_MARGIN_MS
    ) {
      return session.accessToken;
    }
    if (!this.__refreshing) {
      this.__refreshing = this.__refresh(session).finally(() => {
        this.__refreshing = undefined;
      });
    }
    return await this.__refreshing;
  };

  // O refreshToken troca a cada renovação: o novo é gravado ANTES de usar o access token.
  private __refresh = async (session: DisneySession): Promise<string> => {
    let statusCode: number;
    let text: string;
    try {
      const resp = await request(
        `${DISNEY_API_URL}/graph/v1/device/graphql?op=refreshToken`,
        {
          method: 'POST',
          headers: {
            accept: 'application/json',
            authorization: `Bearer ${DISNEY_CLIENT_KEY}`,
            'content-type': 'application/json',
            'accept-language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
            origin: 'https://www.disneyplus.com',
            referer: 'https://www.disneyplus.com/',
            'user-agent': DISNEY_USER_AGENT,
            'x-application-version': '1.1.2',
            'x-bamsdk-client-id': 'disney-svod-3d9324fc',
            'x-bamsdk-platform': 'javascript/chromium/edge',
            'x-bamsdk-platform-id': 'browser',
            'x-bamsdk-version': '35.6',
            'x-disney-identity-client-id': 'DTCI-DISNEYPLUS.WEB',
            'x-dss-edge-accept': 'vnd.dss.edge+json; version=2',
            'x-request-id': randomUUID(),
          },
          body: JSON.stringify({
            query: REFRESH_QUERY,
            variables: { input: { refreshToken: session.refreshToken } },
            operationName: 'refreshToken',
          }),
        },
      );
      statusCode = resp.statusCode;
      text = await resp.body.text();
    } catch (e) {
      throw new DisneyError('rede', `Disney: sem resposta na renovação (${(e as Error).message})`);
    }

    let json: any = null;
    try {
      json = JSON.parse(text);
    } catch {
      /* cai no erro abaixo */
    }

    const token = json?.extensions?.sdk?.token;
    if (!token?.accessToken || !token?.refreshToken) {
      if (statusCode >= 500) {
        throw new DisneyError('rede', `Disney HTTP ${statusCode} na renovação`, { statusCode });
      }
      const reason =
        json?.errors?.[0]?.message ??
        json?.extensions?.operation?.operations?.[0]?.errorCode ??
        `HTTP ${statusCode}`;
      throw new DisneyError(
        'sessao-invalida',
        `A Disney recusou a renovação da sessão (${reason})`,
        { statusCode },
      );
    }

    const expiresInMs = (Number(token.expiresIn) || 14400) * 1000;
    this.__saveSession({
      refreshToken: String(token.refreshToken),
      accessToken: String(token.accessToken),
      expiresAt: Date.now() + expiresInMs,
    });
    return String(token.accessToken);
  };
}
