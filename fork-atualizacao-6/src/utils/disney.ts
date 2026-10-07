// Leitura das respostas da API "explore" da Disney+ (a mesma que o site dentro do Rave usa).
// Este arquivo não importa nada de propósito: são funções puras, fáceis de testar com respostas gravadas.

export interface DisneyPlayable {
  /** id do conteúdo na Disney (o que vai em disneyplus.com/play/<id>) */
  providerId: string;
  kind: 'EPISODE' | 'MOVIE';
  /** título como o Rave mostra (ex.: "S2E8 - Culpado como o pecado") */
  title: string;
  /** nome da série ou do filme */
  author: string;
  description: string;
  durationSeconds: number;
  thumbnail: string;
  thumbnails: { low: string; med: string; high: string };
  season?: number;
  episode?: number;
  /** id da temporada (o Rave guarda como seriesId) */
  seasonId?: string;
}

export interface DisneySearchResult {
  entityId: string;
  title: string;
  description: string;
}

export interface DisneySeason {
  id: string;
  number: number;
  name: string;
  /** episódios que vieram junto com a página (as outras temporadas vêm vazias) */
  episodes: DisneyPlayable[];
}

export interface DisneyEntity {
  entityId: string;
  title: string;
  kind: 'SERIES' | 'MOVIE' | 'UNKNOWN';
  seasons: DisneySeason[];
  movie?: DisneyPlayable;
}

const IMAGE_BASE =
  'https://disney.images.edge.bamgrid.com/ripcut-delivery/v1/variant/disney';

export const disneyImageUrl = (imageId: string, width = 1280): string =>
  `${IMAGE_BASE}/${imageId}/compose?format=jpeg&label=standard_regular_list_178&width=${width}`;

const thumbnailsOf = (imageId?: string) => {
  if (!imageId) return { low: '', med: '', high: '' };
  return {
    low: disneyImageUrl(imageId, 480),
    med: disneyImageUrl(imageId, 858),
    high: disneyImageUrl(imageId, 1280),
  };
};

const firstImageId = (artwork: any): string | undefined => {
  const std = artwork?.standard;
  const order = ['thumbnail', 'tile', 'background', 'up_next'];
  for (const slot of order) {
    const node = std?.[slot] ?? artwork?.up_next?.[slot];
    const id = node?.['1.78']?.imageId;
    if (typeof id === 'string' && id) return id;
  }
  return undefined;
};

const pickDescription = (visuals: any): string => {
  const d = visuals?.description;
  return String(d?.full ?? d?.medium ?? d?.brief ?? '');
};

const pickRuntimeSeconds = (visuals: any): number => {
  const ms = Number(
    visuals?.durationMs ?? visuals?.metastringParts?.runtime?.runtimeMs ?? 0,
  );
  return Number.isFinite(ms) && ms > 0 ? Math.floor(ms / 1000) : 0;
};

const playbackAction = (actions: any): any =>
  (Array.isArray(actions) ? actions : []).find(
    (a: any) => a?.type === 'playback' && typeof a?.deeplinkId === 'string',
  );

/** Resultados da busca (GET /explore/v1.20/search?query=...). */
export const parseDisneySearch = (json: any): DisneySearchResult[] => {
  const containers = json?.data?.page?.containers ?? [];
  const results: DisneySearchResult[] = [];
  const seen = new Set<string>();

  for (const container of containers) {
    for (const item of container?.items ?? []) {
      const action = (item?.actions ?? []).find(
        (a: any) =>
          typeof a?.pageId === 'string' && a.pageId.startsWith('entity-'),
      );
      const entityId = String(action?.pageId ?? '').replace(/^entity-/, '');
      const title = String(item?.visuals?.title ?? '').trim();
      if (!entityId || !title || seen.has(entityId)) continue;
      seen.add(entityId);
      results.push({
        entityId,
        title,
        description: pickDescription(item?.visuals),
      });
    }
  }
  return results;
};

/** Um item de episódio (visuals.episodeNumber presente) vira um DisneyPlayable. */
export const parseDisneyEpisode = (
  item: any,
  seasonId?: string,
): DisneyPlayable | null => {
  const v = item?.visuals;
  const play = playbackAction(item?.actions);
  const providerId = String(play?.deeplinkId ?? item?.id ?? '');
  const season = Number(v?.seasonNumber);
  const episode = Number(v?.episodeNumber);
  if (!providerId || !Number.isFinite(season) || !Number.isFinite(episode)) {
    return null;
  }
  if (v?.isUnavailable) return null;

  const episodeTitle = String(v?.episodeTitle ?? '').trim();
  const imageId = firstImageId(v?.artwork);
  const thumbs = thumbnailsOf(imageId);

  return {
    providerId,
    kind: 'EPISODE',
    title: episodeTitle ? `S${season}E${episode} - ${episodeTitle}` : `S${season}E${episode}`,
    author: String(v?.title ?? '').trim(),
    description: pickDescription(v),
    durationSeconds: pickRuntimeSeconds(v),
    thumbnail: thumbs.high,
    thumbnails: thumbs,
    season,
    episode,
    seasonId,
  };
};

/** Procura, em qualquer lugar do JSON, itens que sejam episódios (a resposta de /season/<id> muda de embrulho). */
export const collectDisneyEpisodes = (
  json: any,
  seasonId?: string,
): DisneyPlayable[] => {
  const found: DisneyPlayable[] = [];
  const seen = new Set<string>();

  const walk = (node: any, depth: number) => {
    if (!node || typeof node !== 'object' || depth > 12) return;
    if (Array.isArray(node)) {
      for (const n of node) walk(n, depth + 1);
      return;
    }
    if (node?.visuals?.episodeNumber !== undefined && node?.actions) {
      const ep = parseDisneyEpisode(node, seasonId);
      if (ep && !seen.has(ep.providerId)) {
        seen.add(ep.providerId);
        found.push(ep);
      }
      return;
    }
    for (const key of Object.keys(node)) walk(node[key], depth + 1);
  };

  walk(json, 0);
  return found;
};

/** Procura o bloco de paginação ({ hasMore, currentOffset }) em qualquer lugar do JSON. */
export const findDisneyPagination = (
  json: any,
): { hasMore: boolean; currentOffset: number } | null => {
  let result: { hasMore: boolean; currentOffset: number } | null = null;
  const walk = (node: any, depth: number) => {
    if (result || !node || typeof node !== 'object' || depth > 12) return;
    if (!Array.isArray(node) && node.pagination && typeof node.pagination === 'object') {
      result = {
        hasMore: !!node.pagination.hasMore,
        currentOffset: Number(node.pagination.currentOffset) || 0,
      };
      return;
    }
    for (const key of Object.keys(node)) walk(node[key], depth + 1);
  };
  walk(json, 0);
  return result;
};

const seasonNumberOf = (name: string, fallback: number): number => {
  const m = String(name).match(/\d+/);
  return m ? Number(m[0]) : fallback;
};

/** Página de um título (GET /explore/v1.20/page/entity-<id>): série com temporadas ou filme com botão de assistir. */
export const parseDisneyEntity = (json: any, entityId: string): DisneyEntity => {
  const page = json?.data?.page;
  const title = String(page?.visuals?.title ?? '').trim();
  const containers: any[] = page?.containers ?? [];

  const episodesContainer = containers.find((c) => c?.type === 'episodes');
  if (episodesContainer) {
    const seasons: DisneySeason[] = (episodesContainer.seasons ?? []).map(
      (s: any, i: number) => {
        const name = String(s?.visuals?.name ?? '');
        const id = String(s?.id ?? '');
        const episodes = (s?.items ?? [])
          .map((it: any) => parseDisneyEpisode(it, id))
          .filter((e: DisneyPlayable | null): e is DisneyPlayable => !!e);
        return { id, number: seasonNumberOf(name, i + 1), name, episodes };
      },
    );
    return { entityId, title, kind: 'SERIES', seasons };
  }

  const play = playbackAction(page?.actions);
  if (play) {
    const v = page?.visuals;
    const imageId = firstImageId(v?.artwork);
    const thumbs = thumbnailsOf(imageId);
    return {
      entityId,
      title,
      kind: 'MOVIE',
      seasons: [],
      movie: {
        providerId: String(play.deeplinkId),
        kind: 'MOVIE',
        title,
        author: title,
        description: pickDescription(v),
        durationSeconds: pickRuntimeSeconds(v),
        thumbnail: thumbs.high,
        thumbnails: thumbs,
      },
    };
  }

  return { entityId, title, kind: 'UNKNOWN', seasons: [] };
};

/** 3255 -> "PT0H54M15S" (formato que o Rave usa) */
export const disneyIsoDuration = (totalSeconds: number): string => {
  const s = Math.max(0, Math.floor(totalSeconds));
  return `PT${Math.floor(s / 3600)}H${Math.floor((s % 3600) / 60)}M${s % 60}S`;
};

/** Corpo do POST /videos/disney, montado com os mesmos campos que o Rave devolve no GET /videos/disney/<id>. */
export const buildRaveDisneyBody = (
  p: DisneyPlayable,
  playUrlBase = 'https://www.disneyplus.com/play',
): Record<string, unknown> => {
  const body: Record<string, unknown> = {
    author: p.author,
    description: p.description,
    duration: disneyIsoDuration(p.durationSeconds),
    isLive: false,
    providerId: p.providerId,
    publishedAt: '',
    thumbnail: p.thumbnail,
    thumbnails: p.thumbnails,
    title: p.title,
    url: `${playUrlBase}/${p.providerId}`,
    viewCount: 0,
  };
  body.metadata =
    p.kind === 'EPISODE'
      ? {
          creditsLength: 0,
          episode: p.episode,
          season: p.season,
          seriesId: p.seasonId,
          videoKind: 'EPISODE',
        }
      : { creditsLength: 0, videoKind: 'MOVIE' };
  return body;
};
