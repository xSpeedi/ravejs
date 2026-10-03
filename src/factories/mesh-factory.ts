import { request } from 'undici';
import { randomUUID } from 'crypto';
import z from 'zod';

import {
  EVENTS_API_URL,
  PATCHED_DEVICE,
  PATCHED_IP_DATA,
  RAVE_LINK_URL,
} from '../constants';
import { HttpWorkflow } from '../core/httpworkflow';
import { GetManyMeshesParams, RaveConfig } from '../schemas';
import {
  GetManyMeshesResponse,
  GetManyMeshesSchema,
  GetMeshResponse,
  GetMeshSchema,
  StatusedResponse,
  StatusSchema,
} from '../schemas/responses';
import { matchMeshId, parseMeshId } from '../utils/utils';
import { MeshSocket } from '../core/mesh-socket';
import { Account } from '../schemas/rave/account';
import { raveVideoUrl } from './video-factory';

export interface MediaUploadInfo {
  uploadUrl: string;
  postingUrl: string;
  fileName: string;
}

export interface QueueItemInput {
  title: string;
  thumbnail: string;
  durationSeconds: number;
  video: string;
  author?: string;
  isLive?: boolean;
  replaceable?: boolean;
}

export class MeshFactory {
  private readonly __config: RaveConfig;
  private readonly __http: HttpWorkflow;
  private readonly __account: Account;

  constructor(config: RaveConfig = {}, http: HttpWorkflow, account: Account) {
    this.__config = config;
    this.__http = http;
    this.__account = account;
  }

  private __getRaveLink = async (meshLink: string) => {
    const meshId = matchMeshId(
      await this.__http.sendRaw(
        {
          method: 'GET',
          path: meshLink,
        },
        z.string(),
      ),
    );

    return await this.get(meshId);
  };

  public get = async (meshId: string): Promise<GetMeshResponse> => {
    return await this.__http.sendGet<GetMeshResponse>(
      {
        path: `/meshes/${meshId}`,
      },
      GetMeshSchema,
    );
  };

  public getByLink = async (meshLink: string): Promise<GetMeshResponse> => {
    if (meshLink.startsWith(RAVE_LINK_URL))
      return await this.__getRaveLink(meshLink);

    const { headers } = await request(meshLink);

    return await this.get(parseMeshId(headers.location as string));
  };

  public getMany = async (
    params: GetManyMeshesParams = {
      limit: 20,
      isPublic: true,
    },
  ): Promise<GetManyMeshesResponse> => {
    return await this.__http.sendGet<GetManyMeshesResponse>(
      {
        path: `/meshes/self?deviceId=${this.__config.credentials?.deviceId}&public=${!!params.isPublic}&friends=${!!params.hasFriends}&local=${!!params.local}&invited=${!!params.hasInvited}&limit=${params.limit}&lang=fuckravedevs`,
      },
      GetManyMeshesSchema,
    );
  };

  public getUsers = async (meshId: string) => {
    return (await this.get(meshId)).data.users;
  };

  public kick = async (
    meshId: string,
    userIds: number | number[],
    includeOnline = false,
  ): Promise<unknown> => {
    const ids = (Array.isArray(userIds) ? userIds : [userIds]).map(Number);

    return await this.__http.sendPost<unknown>(
      {
        path: `/meshes/${meshId}/kick`,
        body: JSON.stringify({
          deviceId: this.__config.credentials?.deviceId,
          ids,
          includeOnline,
        }),
      },
      z.any(),
    );
  };

  public transferLeadership = async (
    meshId: string,
    newLeaderId: number | string,
  ): Promise<boolean> => {
    const resp = await this.__http.sendPost<{ success?: boolean }>(
      {
        path: `/meshes/${meshId}/transferleadership`,
        body: JSON.stringify({ newLeaderId: Number(newLeaderId) }),
      },
      z.any(),
    );
    return !!resp?.success;
  };

  public mute = async (
    meshId: string,
    userId: number | string,
  ): Promise<boolean> => {
    const resp = await this.__http.sendPost<{ success?: boolean }>(
      { path: `/meshes/${meshId}/mute/${Number(userId)}`, body: '{}' },
      z.any(),
    );
    return !!resp?.success;
  };

  public unmute = async (
    meshId: string,
    userId: number | string,
  ): Promise<boolean> => {
    const resp = await this.__http.sendPost<{ success?: boolean }>(
      { path: `/meshes/${meshId}/unmute/${Number(userId)}`, body: '{}' },
      z.any(),
    );
    return !!resp?.success;
  };

  public setState = async (
    meshId: string,
    state: 'PLAY' | 'PAUS',
    position: number,
  ): Promise<unknown> => {
    return await this.__http.sendPut<unknown>(
      {
        path: `/meshes/${meshId}/state`,
        body: JSON.stringify({
          position,
          state,
          time: Date.now() / 1000,
        }),
      },
      z.any(),
    );
  };

  public requestMediaUpload = async (
    meshId: string,
    mime: string,
  ): Promise<MediaUploadInfo | null> => {
    const resp = await this.__http.sendPost<{ data?: MediaUploadInfo[] }>(
      {
        path: `/meshes/${meshId}/images/upload`,
        body: JSON.stringify({
          media: [{ index: 0, isExplicit: false, mime }],
        }),
      },
      z.any(),
    );

    return resp?.data?.[0] ?? null;
  };

  public uploadMedia = async (
    meshId: string,
    data: Buffer,
    mime: string,
  ): Promise<string> => {
    const info = await this.requestMediaUpload(meshId, mime);
    if (!info?.uploadUrl) throw new Error('Upload response has no uploadUrl');

    const put = await request(info.uploadUrl, {
      method: 'PUT',
      headers: { 'Content-Type': mime },
      body: data,
    });
    const text = await put.body.text().catch(() => '');
    if (put.statusCode >= 300) {
      throw new Error(
        `Media upload rejected (HTTP ${put.statusCode}): ${text.slice(0, 200)}`,
      );
    }

    return info.postingUrl;
  };

  public join = async (meshId: string): Promise<MeshSocket> => {
    const mesh = await this.get(meshId);
    await this.__http.sendPost<StatusedResponse>(
      {
        baseUrl: EVENTS_API_URL,
        path: '/api/event',
        body: JSON.stringify({
          device: {
            ...PATCHED_DEVICE,
            id: this.__config.credentials?.deviceId,
          },
          event: 'mesh_join',
          mesh: {
            id: meshId,
            numFriends: 0,
            numStrangers: 0,
            numTotal: 1,
            visibility: 'PRIVATE',
          },
          screen: {
            name: 'LobbyActivity',
          },
          sessionId: randomUUID(),
          user: {
            id: this.__account.id,
            ip_api_data: PATCHED_IP_DATA,
          },
        }),
      },
      StatusSchema,
    );

    return new MeshSocket({
      meshId: meshId,
      server: mesh.data.server,
      userId: this.__account.id,
      credentials: {
        deviceId: this.__config.credentials!.deviceId,
        token: this.__config.credentials!.token,
      },
      proxy: this.__http.proxy,
    });
  };

  public vote = async (
    meshId: string,
    video: string,
    urlBase?: string,
  ): Promise<unknown> => {
    return await this.__http.sendPost<unknown>(
      {
        path: `/meshes/${meshId}/votes`,
        body: JSON.stringify({
          deviceId: this.__config.credentials?.deviceId,
          time: Date.now() / 1000,
          url: raveVideoUrl(video, urlBase),
        }),
      },
      z.any(),
    );
  };

  public likeSkip = async (
    meshId: string,
    opinion: 'LIKE' | 'SKIP',
    video: string,
    videoInstanceId?: string,
    urlBase?: string,
  ): Promise<boolean> => {
    const resp = await this.__http.sendPut<{ success?: boolean }>(
      {
        path: `/meshes/${meshId}/likeskip`,
        body: JSON.stringify({
          opinion,
          url: raveVideoUrl(video, urlBase),
          videoInstanceId,
        }),
      },
      z.any(),
    );
    return !!resp?.success;
  };

  public removeOpinion = async (
    meshId: string,
    opinion: 'LIKE' | 'SKIP',
    video: string,
    videoInstanceId?: string,
    urlBase?: string,
  ): Promise<boolean> => {
    const query = new URLSearchParams({
      url: raveVideoUrl(video, urlBase),
      opinion,
    });
    if (videoInstanceId) query.set('videoInstanceId', videoInstanceId);

    const resp = await this.__http.sendDelete<{ success?: boolean }>(
      { path: `/meshes/${meshId}/likeskip?${query.toString()}` },
      z.any(),
    );
    return !!resp?.success;
  };

  public resume = async (meshId: string): Promise<unknown> => {
    const mesh = await this.get(meshId);
    if (mesh.data.currentState === 'play') return mesh;
    return await this.setState(meshId, 'PLAY', Math.floor(mesh.data.position));
  };

  public queueInsert = async (
    meshId: string,
    item: QueueItemInput,
    position = -1,
    urlBase?: string,
  ): Promise<unknown> => {
    const entry: Record<string, unknown> = {
      duration: String(Math.max(0, Math.floor(item.durationSeconds))),
      isLive: !!item.isLive,
      provider: 'YOUTUBE',
      replaceable: !!item.replaceable,
      thumbnail: item.thumbnail,
      title: item.title,
      url: raveVideoUrl(item.video, urlBase),
      viewCount: '0',
    };
    if (item.author !== undefined) entry.author = item.author;

    return await this.__http.sendPost<unknown>(
      {
        path: '/users/self/queues/insert',
        body: JSON.stringify({ items: [entry], meshId, position }),
      },
      z.any(),
    );
  };
}
