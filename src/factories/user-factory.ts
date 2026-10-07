import { any } from 'zod';

import { HttpWorkflow } from '../core/httpworkflow';
import { EditProfileBuilder, Sites, User } from '../schemas';
import {
  EditProfileResponse,
  EditProfileSchema,
  GetAvatarUploadResponse,
  GetAvatarUploadSchema,
  GetUserResponse,
  GetUserSchema,
  FriendshipResponse,
  FriendshipSchema,
  GetSuccessResponse,
  GetSuccessSchema,
  GetFriendsResponse,
  GetFriendsSchema,
} from '../schemas/responses';

export interface ProfileChanges {
  name?: string;
  handle?: string;
  avatar?: string;
  country?: string;
  globalHideMature?: boolean;
  metadata?: { position: number; privacy: string };
}

export class UserFactory {
  private readonly __http: HttpWorkflow;

  constructor(http: HttpWorkflow) {
    this.__http = http;
  }

  private __friendshipRequests = async (
    body: string,
  ): Promise<FriendshipResponse> => {
    return await this.__http.sendPost<FriendshipResponse>(
      {
        path: `/friendships`,
        body,
      },
      FriendshipSchema,
    );
  };

  private __friendshipDelete = async (
    path: string,
  ): Promise<GetSuccessResponse> => {
    return await this.__http.sendDelete<GetSuccessResponse>(
      {
        path,
      },
      GetSuccessSchema,
    );
  };

  public get = async (userId: number): Promise<GetUserResponse> => {
    return await this.__http.sendGet<GetUserResponse>(
      {
        path: `/profiles/${userId}?exclude=false&clientVersion=1`,
      },
      GetUserSchema,
    );
  };

  public getFriends = async (limit: number = 24): Promise<User[]> => {
    return (
      await this.__http.sendGet<GetFriendsResponse>(
        {
          path: `/friendships?limit=${limit}`,
        },
        GetFriendsSchema,
      )
    ).data;
  };

  public sendFriendship = async (
    userId: number,
  ): Promise<FriendshipResponse> => {
    return await this.__friendshipRequests(JSON.stringify({ id: userId }));
  };

  public acceptFriendship = async (
    userId: number,
  ): Promise<FriendshipResponse> => {
    return await this.__friendshipRequests(
      JSON.stringify({ id: userId, state: 'friends' }),
    );
  };

  public declineFriendship = async (
    userId: number,
  ): Promise<FriendshipResponse> => {
    return await this.__friendshipRequests(
      JSON.stringify({ id: userId, state: 'notfriends' }),
    );
  };

  public deleteFriendship = async (userId: number): Promise<boolean> =>
    (await this.__friendshipDelete(`/friendships?id=${userId}`)).success;

  public deleteFriend = async (userId: number): Promise<boolean> =>
    (await this.__friendshipDelete(`/friendships/unfriend?id=${userId}`))
      .success;

  public edit = async (
    builder: EditProfileBuilder,
  ): Promise<EditProfileResponse> => {
    return await this.__http.sendPut<EditProfileResponse>(
      {
        path: '/users/self',
        body: JSON.stringify(builder),
      },
      EditProfileSchema,
    );
  };

  /** Esconde (ou volta a mostrar) a localização do perfil. */
  public hideLocation = async (hide = true): Promise<boolean> => {
    const resp = await this.__http.sendPost<{ success?: boolean }>(
      {
        path: '/users/self/location',
        body: JSON.stringify({ hideLocation: hide }),
      },
      any(),
    );
    return !!resp?.success;
  };

  /**
   * Edita o perfil do mesmo jeito que o app atual (PUT /profiles): lê o perfil,
   * troca só o que você passar em `changes` e devolve a resposta crua do servidor.
   * Ex.: await rave.user.updateProfile(rave.account.id, { name: 'Novo nome' })
   */
  public updateProfile = async (
    userId: number,
    changes: ProfileChanges,
  ): Promise<unknown> => {
    const current = await this.__http.sendGet<any>(
      { path: `/profiles/${userId}?exclude=false&clientVersion=1` },
      any(),
    );
    const p = current?.data?.profile;
    if (!p) throw new Error('Profile not found in server response');

    const profile: Record<string, unknown> = {
      avatar: p.avatar,
      country: p.country,
      globalHideMature: p.globalHideMature,
      handle: p.handle,
      metadata: p.metadata,
      name: p.name,
      state: p.state,
    };
    for (const [key, value] of Object.entries(changes)) {
      if (value !== undefined) profile[key] = value;
    }

    return await this.__http.sendPut<unknown>(
      {
        path: '/profiles',
        body: JSON.stringify({ profile, exclude: false, clientVersion: 1 }),
      },
      any(),
    );
  };

  public getAvatarUpload = async (): Promise<GetAvatarUploadResponse> => {
    return await this.__http.sendPost<GetAvatarUploadResponse>(
      {
        path: '/users/self/avatar/upload',
        body: JSON.stringify({ mime: 'image/jpeg' }),
      },
      GetAvatarUploadSchema,
    );
  };

  public uploadOnUrl = async (
    uploadUrl: string,
    image: Buffer,
  ): Promise<any> => {
    return await this.__http.sendRaw(
      {
        path: uploadUrl,
        method: 'PUT',
        body: image,
        headers: {
          'Content-Type': 'image/jpeg',
        },
      },
      any(), // nothing returns
    );
  };

  public uploadAvatar = async (image: Buffer): Promise<string> => {
    const { data } = await this.getAvatarUpload();
    await this.uploadOnUrl(data.uploadUrl, image);
    return data.uploadUrl;
  };
}
