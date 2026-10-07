import { SocksProxies } from 'fetch-socks';

export const isOk = (status: number) => status >= 200 && status < 303;
export const matchMeshId = (text: string): string =>
  text.match(
    /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi,
  )?.[0] || '';

export const parseMeshId = (text: string): string =>
  text.split('openRaveId=')![1];

export const validateProxy = (proxy: string): SocksProxies => {
  const match = proxy.match(/socks([45])/);

  if (proxy.includes('@')) {
    const splittedPart = proxy.split('@');
    const [, userId, password] = splittedPart[0].split(':');
    const [host, port] = splittedPart[1].split(':');

    return {
      host,
      type: match ? (Number(match[1]) as 4 | 5) : 5,
      port: Number(port),
      userId: userId.slice(2),
      password,
    };
  }

  const [host, port] = proxy.slice(9).split(':');

  return {
    host,
    type: match ? (Number(match[1]) as 4 | 5) : 5,
    port: Number(port),
  };
};
