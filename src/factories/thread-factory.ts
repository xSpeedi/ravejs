import { randomUUID } from 'crypto';

import { HttpWorkflow } from '../core/httpworkflow';
import { Thread } from '../schemas/rave/thread';
import {
  GetThreadResponse,
  GetThreadSchema,
  GetThreadsResponse,
  GetThreadsSchema,
  SendMessageResponse,
  SendMessageSchema,
} from '../schemas/responses';

export class ThreadFactory {
  private readonly __http: HttpWorkflow;

  constructor(http: HttpWorkflow) {
    this.__http = http;
  }

  public getMany = async (): Promise<Thread[]> => {
    return (
      await this.__http.sendWeMeshGet<GetThreadsResponse>(
        {
          path: '/dms',
        },
        GetThreadsSchema,
      )
    ).data;
  };

  public create = async (userId: number): Promise<Thread> => {
    return (
      await this.__http.sendWeMeshPost<GetThreadResponse>(
        {
          path: '/dms/thread',
          body: JSON.stringify({
            targetUserId: userId,
          }),
        },
        GetThreadSchema,
      )
    ).data;
  };

  public sendMessage = async (
    threadId: string,
    content: string,
  ): Promise<SendMessageResponse> => {
    const messageId = randomUUID();

    return await this.__http.sendWeMeshPost<SendMessageResponse>(
      {
        path: `/dms/thread/${threadId}`,
        body: JSON.stringify({
          correlateId: messageId,
          messageBody: {
            chat: content,
            detected_lang: 'ru',
            id: messageId,
            translations: {
              ru: content,
            },
          },
          messageType: 'MESSAGE',
        }),
      },
      SendMessageSchema,
    );
  };
}
