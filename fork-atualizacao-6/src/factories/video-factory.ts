import { any } from 'zod';
import { request } from 'undici';

import {
  VIDEO_URL_BASE,
  YOUTUBE_SEARCH_PARAMS,
  YOUTUBE_SEARCH_URL,
  YOUTUBE_WEB_CLIENT_VERSION,
} from '../constants';
import { HttpWorkflow } from '../core/httpworkflow';
import { buildRaveDisneyBody, DisneyPlayable } from '../utils/disney';
import { parseYoutubeSearch, YoutubeSearchResult } from '../utils/youtube';

export type { YoutubeSearchResult } from '../utils/youtube';

export interface YoutubeVideoInput {
  /** id do vídeo no YouTube (ex.: "dQw4w9WgXcQ") */
  providerId: string;
  title: string;
  /** duração em segundos, ou já em ISO 8601 (ex.: "PT0H3M32S") */
  duration: number | string;
  thumbnail: string;
  author?: string;
  description?: string;
  isLive?: boolean;
  maturity?: string;
  viewCount?: number;
  thumbnails?: Record<string, string>;
  url?: string;
}

export interface RaveVideo {
  /** id do vídeo dentro do Rave (UUID) */
  id: string;
  providerId: string;
  title: string;
  [key: string]: unknown;
}

/** 324 -> "PT0H5M24S" (formato que o app manda) */
export const toIsoDuration = (totalSeconds: number): string => {
  const s = Math.max(0, Math.floor(totalSeconds));
  return `PT${Math.floor(s / 3600)}H${Math.floor((s % 3600) / 60)}M${s % 60}S`;
};

/**
 * Link do vídeo dentro do Rave, do jeito que o app manda em votos/filas:
 * https://api.red.wemesh.ca/videos/youtube/<id do Rave>
 * Se já for um link, devolve como está. `base` troca o host (ex.: o da `mediaUrl` da sala).
 */
export const raveVideoUrl = (
  video: string,
  base: string = VIDEO_URL_BASE,
): string =>
  /^https?:\/\//i.test(video)
    ? video
    : `${base.replace(/\/+$/, '')}/videos/youtube/${video}`;

/**
 * Link de um vídeo da Disney dentro do Rave, do jeito que o app manda em votos/filas:
 * https://api.red.wemesh.ca/videos/disney/<id do Rave>
 * Se já for um link, devolve como está. `base` troca o host (ex.: o da `mediaUrl` da sala).
 */
export const raveDisneyUrl = (
  video: string,
  base: string = VIDEO_URL_BASE,
): string =>
  /^https?:\/\//i.test(video)
    ? video
    : `${base.replace(/\/+$/, '')}/videos/disney/${video}`;

export class VideoFactory {
  private readonly __http: HttpWorkflow;

  constructor(http: HttpWorkflow) {
    this.__http = http;
  }

  /** Registra um vídeo do YouTube no Rave e devolve o vídeo (com o `id` do Rave). */
  public registerYoutube = async (
    video: YoutubeVideoInput,
  ): Promise<RaveVideo> => {
    const body: Record<string, unknown> = {
      description: video.description ?? '',
      duration:
        typeof video.duration === 'number'
          ? toIsoDuration(video.duration)
          : video.duration,
      isLive: !!video.isLive,
      providerId: video.providerId,
      thumbnail: video.thumbnail,
      thumbnails: video.thumbnails ?? { low: video.thumbnail },
      title: video.title,
      url: video.url ?? `http://www.youtube.com/watch?v=${video.providerId}`,
      viewCount: video.viewCount ?? 0,
    };
    if (video.author !== undefined) body.author = video.author;
    if (video.maturity !== undefined) body.maturity = video.maturity;

    const resp = await this.__http.sendPost<{ data: RaveVideo }>(
      { path: '/videos/youtube', body: JSON.stringify(body) },
      any(),
    );
    return resp.data;
  };

  public getYoutube = async (raveVideoId: string): Promise<RaveVideo> => {
    const resp = await this.__http.sendGet<{ data: RaveVideo }>(
      { path: `/videos/youtube/${raveVideoId}` },
      any(),
    );
    return resp.data;
  };

  /**
   * Registra um título da Disney+ no Rave e devolve o vídeo (com o `id` do Rave).
   * Os campos seguem o que o próprio Rave devolve em GET /videos/disney/<id>.
   */
  public registerDisney = async (
    playable: DisneyPlayable,
  ): Promise<RaveVideo> => {
    const resp = await this.__http.sendPost<{ data: RaveVideo }>(
      {
        path: '/videos/disney',
        body: JSON.stringify(buildRaveDisneyBody(playable)),
      },
      any(),
    );
    return resp.data;
  };

  public getDisney = async (raveVideoId: string): Promise<RaveVideo> => {
    const resp = await this.__http.sendGet<{ data: RaveVideo }>(
      { path: `/videos/disney/${raveVideoId}` },
      any(),
    );
    return resp.data;
  };

  /** Link do vídeo da Disney no Rave, pronto pra mandar em votos (`mesh.vote`). */
  public disneyUrl = (raveVideoId: string, base?: string): string =>
    raveDisneyUrl(raveVideoId, base);

  /**
   * Procura vídeos no YouTube (só vídeos), na mesma chamada que o app do Rave faz.
   * Não passa pelo proxy do Rave nem manda o token dele.
   * Aceita também um link/ID do YouTube como consulta (o YouTube acha o vídeo).
   */
  public searchYoutube = async (
    query: string,
    limit = 5,
  ): Promise<YoutubeSearchResult[]> => {
    const { statusCode, body } = await request(YOUTUBE_SEARCH_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/106.0.0.0 Safari/537.36',
      },
      body: JSON.stringify({
        query,
        params: YOUTUBE_SEARCH_PARAMS,
        context: {
          client: {
            clientName: 'WEB',
            clientVersion: YOUTUBE_WEB_CLIENT_VERSION,
          },
        },
      }),
    });

    if (statusCode < 200 || statusCode >= 300) {
      await body.text().catch(() => '');
      throw new Error(`YouTube search failed (HTTP ${statusCode})`);
    }

    const json: any = await body.json();
    const results = parseYoutubeSearch(json).slice(0, Math.max(1, limit));

    // Sem resultado E sem a estrutura conhecida = o YouTube mudou o formato (não é "nada encontrado").
    if (
      results.length === 0 &&
      !json?.contents?.twoColumnSearchResultsRenderer
    ) {
      throw new Error(
        'YouTube search: unrecognized response format (layout changed?)',
      );
    }

    return results;
  };
}
