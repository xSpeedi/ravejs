// Busca no YouTube pelo mesmo caminho que o app do Rave usa
// (POST /youtubei/v1/search com o cliente WEB). Este arquivo não importa nada
// de propósito: o parser é uma função pura, fácil de testar com respostas gravadas.

export interface YoutubeSearchResult {
  /** id do vídeo no YouTube (ex.: "dQw4w9WgXcQ") */
  providerId: string;
  title: string;
  /** duração em segundos (0 quando é live ou não informada) */
  durationSeconds: number;
  /** duração como o YouTube mostra (ex.: "3:51") */
  durationText: string;
  author: string;
  thumbnail: string;
  isLive: boolean;
  url: string;
}

/** "3:51" -> 231, "1:02:03" -> 3723 */
export const parseClockDuration = (text?: string): number => {
  if (!text) return 0;
  const parts = text.split(':').map((p) => Number(p.trim()));
  if (parts.length === 0 || parts.some((n) => !Number.isFinite(n))) return 0;
  return parts.reduce((total, n) => total * 60 + n, 0);
};

const joinRuns = (node: any): string => {
  if (!node) return '';
  if (typeof node.simpleText === 'string') return node.simpleText;
  if (Array.isArray(node.runs)) return node.runs.map((r: any) => r?.text ?? '').join('');
  return '';
};

const isLiveRenderer = (renderer: any): boolean => {
  if (!renderer?.lengthText) return true; // sem duração = live ou estreia
  const badges = JSON.stringify(renderer.badges ?? []);
  return /LIVE_NOW/i.test(badges);
};

/** Extrai os vídeos (e só vídeos) de uma resposta do /youtubei/v1/search. */
export const parseYoutubeSearch = (json: any): YoutubeSearchResult[] => {
  const sections =
    json?.contents?.twoColumnSearchResultsRenderer?.primaryContents
      ?.sectionListRenderer?.contents ?? [];
  const results: YoutubeSearchResult[] = [];

  for (const section of sections) {
    for (const item of section?.itemSectionRenderer?.contents ?? []) {
      const v = item?.videoRenderer;
      if (!v?.videoId) continue;

      const live = isLiveRenderer(v);
      const durationText = joinRuns(v.lengthText);

      results.push({
        providerId: String(v.videoId),
        title: joinRuns(v.title).trim() || String(v.videoId),
        durationSeconds: live ? 0 : parseClockDuration(durationText),
        durationText,
        author: joinRuns(v.ownerText ?? v.longBylineText).trim(),
        thumbnail: `https://i.ytimg.com/vi/${v.videoId}/hqdefault.jpg`,
        isLive: live,
        url: `http://www.youtube.com/watch?v=${v.videoId}`,
      });
    }
  }

  return results;
};
