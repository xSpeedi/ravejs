import z from 'zod';

import { ProfileSchema, UserSchema } from './rave/user';
import { MeshSchema } from './rave/mesh';
import { PagingSchema } from './private';
import { ThreadSchema } from './rave/thread';
import { MessageSchema } from './rave/message';
import { AccountSchema } from './rave/account';

export const EditProfileSchema = z.object({
  data: UserSchema,
});

export const SendMagicLinkSchema = z
  .object({
    state_id: z.string(),
  })
  .transform((data) => {
    return {
      stateId: data.state_id,
    };
  });

export const CheckRegisterStateSchema = z
  .object({
    authenticated: z.boolean(),
    is_second_factor_login: z.boolean().optional(),
    oauth: z
      .object({
        access_token: z.string(),
        id_token: z.string(),
        refresh_token: z.string(),
        expires_in: z.string(),
        token_type: z.string(),
      })
      .optional(),
    user: z
      .object({
        created_at: z.string(),
        updated_at: z.string(),
        issuer: z.string(),
        user_id: z.string(),
        identifier: z.string(),
        email: z.string(),
      })
      .optional(),
  })
  .transform((data) => {
    return {
      authenticated: data.authenticated,
      isSecondFactorLogin: data.is_second_factor_login,
      oauth: data.oauth
        ? {
            accessToken: data.oauth.access_token,
            idToken: data.oauth.id_token,
            refreshToken: data.oauth.refresh_token,
            expiresIn: data.oauth.expires_in,
            tokenType: data.oauth.token_type,
          }
        : undefined,
      user: data.user
        ? {
            createdAt: data.user.created_at,
            updatedAt: data.user.updated_at,
            issuer: data.user.issuer,
            userId: data.user.user_id,
            identifier: data.user.identifier,
            email: data.user.email,
          }
        : undefined,
    };
  });

export const ParseUserCredentialsSchema = z.object({
  objectId: z.string(),
  createdAt: z.string(),
  username: z.string(),
  sessionToken: z.string(),
});

export const MojoLoginSchema = z.object({
  data: z.object({
    isValid: z.boolean(),
    newUser: z.boolean().optional(),
    suggestedHandles: z.array(z.string()),
  }),
});

export const AuthenticateSchema = z.object({
  isNewUser: z.boolean(),
  email: z.string(),
  username: z.string(),
  deviceId: z.string(),
  token: z.string(),
});

export const GetAvatarUploadSchema = z.object({
  data: z.object({
    expiresAt: z.string(),
    fileName: z.string(),
    mime: z.string(),
    uploadUrl: z.string(),
  }),
});

export const GetManyMeshesSchema = z.object({
  data: z.array(
    z.object({
      mesh: MeshSchema,
      users: z.array(UserSchema),
    }),
  ),
  paging: PagingSchema,
});

export const GetMeshSchema = z.object({
  data: z.object({
    ...MeshSchema.shape,
    users: z.array(UserSchema),
  }),
});

export const GetUserSchema = z.object({
  data: z.object({
    bio: z.object({
      bio: z.string().optional(),
      metadata: z.object({
        position: z.number(),
        privacy: z.string(),
      }),
    }),
    profile: ProfileSchema,
  }),
});

export const FriendshipSchema = z.object({
  data: z.object({
    fromUserId: z.number(),
    state: z.string(),
    toUserId: z.number(),
  }),
});

export const ValidateMeSchema = z.object({
  data: z.string(),
});

export const GetThreadsSchema = z.object({
  data: z.array(ThreadSchema),
});

export const GetThreadSchema = z.object({
  data: ThreadSchema,
});

export const SendMessageSchema = z.object({
  data: z.object({
    correlateId: z.string(),
    threadId: z.string(),
    messageType: z.string(),
    originator: z.number(),
    messageBody: MessageSchema,
  }),
});

export const StatusSchema = z.object({
  status: z.number(),
});

export const GetAccountSchema = z.object({
  data: AccountSchema,
});

export const GetSuccessSchema = z.object({
  success: z.boolean(),
});

export const GetFriendsSchema = z.object({
  data: z.array(UserSchema),
});

export type EditProfileResponse = z.infer<typeof EditProfileSchema>;
export type SendMagicLinkResponse = z.infer<typeof SendMagicLinkSchema>;
export type CheckRegisterStateResponse = z.infer<
  typeof CheckRegisterStateSchema
>;
export type ParseUserCredentialsResponse = z.infer<
  typeof ParseUserCredentialsSchema
>;
export type MojoLoginResponse = z.infer<typeof MojoLoginSchema>;
export type AuthenticateResponse = z.infer<typeof AuthenticateSchema>;
export type GetAvatarUploadResponse = z.infer<typeof GetAvatarUploadSchema>;
export type GetManyMeshesResponse = z.infer<typeof GetManyMeshesSchema>;
export type GetMeshResponse = z.infer<typeof GetMeshSchema>;
export type GetUserResponse = z.infer<typeof GetUserSchema>;
export type FriendshipResponse = z.infer<typeof FriendshipSchema>;
export type ValidateMeResponse = z.infer<typeof ValidateMeSchema>;
export type GetThreadsResponse = z.infer<typeof GetThreadsSchema>;
export type GetThreadResponse = z.infer<typeof GetThreadSchema>;
export type SendMessageResponse = z.infer<typeof SendMessageSchema>;
export type StatusedResponse = z.infer<typeof StatusSchema>;
export type GetAccountResponse = z.infer<typeof GetAccountSchema>;
export type GetSuccessResponse = z.infer<typeof GetSuccessSchema>;
export type GetFriendsResponse = z.infer<typeof GetFriendsSchema>;
