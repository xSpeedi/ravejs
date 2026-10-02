import { WebSocket } from 'ws';
import { randomUUID } from 'crypto';

import { MeshSocketConfig } from '../schemas/private';
import { SOCKET_DEAD_TIMEOUT, SOCKET_PING_DELAY } from '../constants';
import { LOGGER } from '../utils/logger';
import { SocksProxyAgent } from 'socks-proxy-agent';

export class MeshSocket {
  private __config: MeshSocketConfig;
  private __url: string;
  private __websocket: WebSocket;
  private __heartbeat?: NodeJS.Timeout;
  private __lastActivity = Date.now();

  constructor(config: MeshSocketConfig) {
    this.__config = config;
    this.__url = `wss://${this.__config.server}/?roomId=${this.__config.meshId}&peerId=${this.__config.userId}_${this.__config.credentials.deviceId}`;
    this.__websocket = new WebSocket(this.__url, 'protoo', {
      rejectUnauthorized: false,
      headers: {
        authorization: `Bearer ${this.__config.credentials.token}`,
        'API-Version': '4',
      },
      agent: this.__config.proxy
        ? new SocksProxyAgent(this.__config.proxy)
        : undefined,
    });

    // Ouvinte padrão de erro: sem ele, um 'error' sem handler derruba o processo.
    this.__websocket.on('error', (error: Error) => {
      LOGGER.error({ url: this.__url, error: error?.message }, 'WebSocket error');
    });

    this.__websocket.on('open', () => {
      LOGGER.info({ url: this.__url }, 'WebSocket opened');
      this.__touch();
      this.__sendFullyJoined();
      this.__startHeartbeat();
    });

    // Qualquer mensagem ou pong conta como "a conexão está viva".
    this.__websocket.on('message', this.__touch);
    this.__websocket.on('pong', this.__touch);

    this.__websocket.on('close', () => {
      LOGGER.info({ url: this.__url }, 'WebSocket closed');
      this.__stopHeartbeat();
    });
  }

  private __touch = () => {
    this.__lastActivity = Date.now();
  };

  // Ping + vigia: se nada chegar do servidor por SOCKET_DEAD_TIMEOUT, derruba
  // o socket (terminate) e o 'close' normal dispara a reconexão de quem usa.
  private __startHeartbeat = () => {
    this.__stopHeartbeat();
    this.__heartbeat = setInterval(() => {
      if (this.__websocket.readyState !== WebSocket.OPEN) {
        this.__stopHeartbeat();
        return;
      }

      if (Date.now() - this.__lastActivity > SOCKET_DEAD_TIMEOUT) {
        LOGGER.warn({ url: this.__url }, 'WebSocket sem resposta, derrubando');
        this.terminate();
        return;
      }

      try {
        this.__pingServer();
        this.__websocket.ping();
      } catch {}
    }, SOCKET_PING_DELAY);
    this.__heartbeat.unref?.();
  };

  private __stopHeartbeat = () => {
    if (this.__heartbeat) clearInterval(this.__heartbeat);
    this.__heartbeat = undefined;
  };

  private __send = (data: string) => {
    LOGGER.info({ url: this.__url, data }, 'Sending data');
    this.__websocket.send(data);
  };

  private __sendFullyJoined = () => {
    this.__send(
      JSON.stringify({
        data: {},
        id: 1207144,
        method: 'fullyJoined',
        request: true,
      }),
    );
  };

  private __pingServer = () => {
    this.__send(
      JSON.stringify({
        data: {},
        id: 8841449,
        method: 'clientPing',
        request: true,
      }),
    );
  };

  get isOpen(): boolean {
    return this.__websocket.readyState === WebSocket.OPEN;
  }

  get lastActivityAt(): number {
    return this.__lastActivity;
  }

  public onopen = (handler: () => void) => {
    this.__websocket.onopen = handler;
  };

  public onclose = (handler: () => Promise<void>) => {
    this.__websocket.on('close', handler);
  };

  public onerror = (handler: () => Promise<void>) => {
    this.__websocket.on('error', handler);
  };

  public onmessage = (handler: (data: string) => Promise<void>) => {
    this.__websocket.on('message', handler);
  };

  public sendMessage = (content: string): void => {
    this.__send(
      JSON.stringify({
        data: {
          chat: content,
          detected_lang: 'ru',
          id: randomUUID(),
          translations: {
            ru: content,
          },
        },
        method: 'chatMessage',
        notification: true,
      }),
    );
  };

  // Fecha na marra, sem esperar o handshake de fechamento (socket meio morto).
  public terminate = (): void => {
    this.__stopHeartbeat();
    this.__websocket.terminate();
  };

  public leave = (): void => {
    this.__stopHeartbeat();
    this.__websocket.close();
  };
}
