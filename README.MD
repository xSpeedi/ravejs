<div align="center">
    <h1>RaveJS</h1>
    <a href="https://t.me/aminodorks"><img src="https://img.shields.io/badge/Telegram-2CA5E0?style=for-the-badge&logo=telegram&logoColor=white" alt="Telegram"></a>
    <a href="https://www.npmjs.com/package/ravejs"><img src="https://img.shields.io/badge/NPM-%23CB3837.svg?style=for-the-badge&logo=npm&logoColor=white" alt="NPM"></a>
</div>
<div align="center">
    <img src="https://img.shields.io/npm/dm/ravejs" alt="Downloads">
    <img src="https://img.shields.io/npm/v/ravejs.svg" alt="Version">
    <h2>RaveJS is a TypeScript library that interacts with the Rave: Watch Party App API.</h2>
</div>

## [README on English](https://github.com/AminoDorks/ravejs/blob/master/README.MD)
## [README на Русском](https://github.com/AminoDorks/ravejs/blob/master/README.RU.MD)

## Table of Contents
-----------------

* [Features](#features)
* [Getting Started](#getting-started)
* [Usage](#usage)
* [API Documentation](#api-documentation)
* [Contributing](#contributing)
* [License](#license)

## Features
--------

RaveJS contains a many features for example:
- Modular structure
- Easy to use
- Support any functions for using
- This is the first TypeScript library for this app

## Getting Started
---------------

To get started with RaveJS, follow these steps:
1. Initialize npm package: `npm init`
2. Install TypeScript: `npm i -g typescript`
3. Initialize TypeScript config and configure it: `tsc --init`
4. Install package via npm: `npm i ravejs`

## Usage
-----
### Basic authorization

```typescript
import { Rave } from 'ravejs';

(async () => {
const rave = new Rave();
await rave.auth.authenticate('token', 'device_id')
console.log(`logged as ${rave.account?.id}`);
})();
```

## Documentation
-----------------

### `Rave(config: RaveConfig)`
A main class to interacting with API in global namespace of app.
config - configuration for library, you can find it in `RaveConfig` type...
`RaveConfig` =>
*    credentials?: { deviceId: string, token: string } - main credentials for authorization and options
*    enableLogging?: boolean - enable logging for library
*    account?: Account - Your user profile information after authorization

#### Rave Properties

1. `Rave.token: string` - Authorization bearer token
2. `Rave.JWT: string` - Authorization JWT token for we mesh API
3. `Rave.account: Account | undefined` - Your user profile information after authorization
4. `Rave.proxy: string | undefined` - Proxy for requests (you can set socks proxy with proxy property setter too)

#### Rave Methods

1. `proxyIsAlive = async (): Promise<boolean>` - Check if proxy is alive
2. `offProxy = (): Promise<void>` - Remove proxy from Rave instance

-----------------
Rave haves the fully modular structure and parts called `Factories`. Now i will describe them:

### `AuthFactory`
The main factory for authorization and authentication. Can be called with `Rave.auth` property

#### Authenticate Factory methods

1. `refreshJWT = async (deviceId?: string): Promise<string>` - Refresh JWT token for we mesh API

2. `getAccount = async (): Promise<Account>` - Get your user profile information after authorization

3. `authenticate = async (token: string, deviceId: string): Promise<Account>` - Authenticate with token and device id, creates JWT and account info automatically
4. `sendMagicLink = async (email: string, language: string = DEFAULT_LANGUAGE): Promise<SendMagicLinkResponse> - Send magic link to email for authorization, if you doesn't know your credentials or just wanna register`
* DEFAULT_LANGUAGE = 'ru'
* SendMagicLinkResponse - { stateId: string } - stateId for magic link

5. `checkRegisterState = async (stateId: string): Promise<CheckRegisterStateResponse> - Check stateId for magic link`
* CheckRegisterStateResponse - {
  authenticated: boolean,
  isSecondFactorLogin: boolean,
  oauth: {
    accessToken: string,
    idToken: string,
    refreshToken: string,
    expiresIn: string,
    tokenType: string
  },
  user: {
    createdAt: string,
    updatedAt: string,
    issuer: string
    userId: string
    identifier: string
    email: string
  }
}

6. `parseUserCredentials = async (idToken: string, email: string): Promise<ParseUserCredentialsResponse> - Parse user credentials from idToken and email`
* ParseUserCredentialsResponse - {
  objectId: string,
  createdAt: string,
  username: string,
  sessionToken: string,
}

7. `mojoLogin = async (email: string, parseId: string, parseToken: string, name: string, deviceId?: string, language = DEFAULT_LANGUAGE): Promise<MojoLoginResponse> - Login with mojo service to Rave`
* MojoLoginResponse - { data: {
  isValid: boolean,
  newUser: boolean,
  suggestedHandles: string[],
}}

8. `login = async (stateId: string, name?: string, deviceId?: string, language = DEFAULT_LANGUAGE): Promise<AuthenticateResponse> - Simply summary of previous functions for login`
* AuthenticateResponse - {
  isNewUser: boolean,
  email: string,
  username: string,
  deviceId: string,
  token: string,
}

9. `register = async (email: string, name: string, deviceId?: string, language = DEFAULT_LANGUAGE): Promise<AuthenticateResponse> - Register a new user`
* RegisterResponse - {
  isNewUser: boolean,
  email: string,
  username: string,
  deviceId: string,
  token: string,
}

### `MeshFactory`
Factory for interacting with Meshes (rooms in Rave where you can watch videos). Can be called with `Rave.mesh` property

#### Mesh Factory methods

1. `get = async (meshId: string): Promise<GetMeshResponse>` - Get a mesh by its ID
* GetMeshResponse - {
  data: {
    blurT?: boolean,
    category: string,
    channel: number,
    createdAt: string,
    currentState: 'play' | 'paus',
    explicit: boolean,
    id: string,
    isFriend: boolean,
    isLocal: boolean,
    isPublic: boolean,
    kickMode: string,
    maturity: string,
    mediaUrl: string,
    originator: number,
    playMode: string,
    position: number,
    server: string,
    shareLink: string,
    thumbnails?: {
      channel?: string,
      standard?: string,
      animated?: string,
      maxres?: string,
      medium?: string,
      default?: string,
      high?: string,
    },
    time: number,
    videoAuthor: string,
    videoDuration: number,
    videoProvider: string,
    videoPublishedAt: string,
    videoThumbnail: string,
    videoTitle: string,
    videoUrl: string,
    vikiPass: boolean,
    voipMode: string,
    users: {
      avatar: string,
      country: string,
      displayName?: string,
      handle?: string,
      id: number,
      lang?: string
      lat: number,
      lng: number,
      name: string
    }[]
  },
}

2. `getByLink = async (meshLink: string): Promise<GetMeshResponse>` - Get a mesh by its link

3. `getMany = async (params: GetManyMeshesParams): Promise<GetManyMeshesResponse>` - Get multiple meshes from recently board
* GetManyMeshesParams - {
  isPublic?: boolean,
  limit: number,
  hasFriends: boolean,
  local: boolean,
  hasInvited: boolean,
  language?: string,
}

4. `join = async (meshId: string): Promise<MeshSocket>` - Join a mesh by its ID
* MeshSocket - special class for working with mesh socket workflow, events and unique methods. Will be described later

### `ThreadFactory`
Factory for interacting with threads (your chats with friends etc). Can be called with `Rave.thread` property

#### Thread Factory methods

1. `getMany = async (): Promise<Thread[]>` - Get all threads from your account
* Thread - {
  expiryMode: number,
  isFriend: boolean,
  myself: number,
  opposingUser: number,
  spokenLangs: string[],
  threadId: string,
}

2. `create = async (userId: number): Promise<Thread>` - Create a new thread with a user

3. `sendMessage async (threadId: string, content: string): Promise<SendMessageResponse>` - Send a message to a thread
* SendMessageResponse - {
  data: {
    correlateId: string,
    threadId: string,
    messageType: string,
    originator: number,
    messageBody: {
      content: string,
      detectedLang: string,
      id: string,
      translations: Record<string, string>,
    },
  }
}

### `UserFactory`
Factory for globally interacting with users from app. Can be called with `Rave.user` property

#### User Factory methods

1. `get = async (userId: number): Promise<GetUserResponse>` - Get user by id
* GetUserResponse - {
  data: {
    bio: {
      bio?: string,
      metadata: {
        position: number,
        privacy: string
      }
    },
    profile: {
      avatar: string,
      country: string,
      displayName?: string,
      handle?: string,
    }
  }
}

2. `sendFriendship = async (userId: number): Promise<FriendshipResponse>` - Send a friendship request to a user
* FriendshipResponse - {
  data: {
    fromUserId: number,
    state: string,
    toUserId: number,
  }
}

3. `acceptFriendship = async (userId: number): Promise<FriendshipResponse>` - Accept a friendship requests from a user

4. `declineFriendship = async (userId: number): Promise<FriendshipResponse>` - Decline a friendship request from a user

5. `edit = async (builder: EditProfileBuilder): Promise<EditProfileResponse>` - Edit user profile
* EditProfileBuilder - {
  displayAvatar?: string,
  displayName?: string,
  handle?: string,
}

* EditProfileResponse - {
  data: User
} - User Schema equals to previous `user` models

6. `getAvatarUpload = async (): Promise<GetAvatarUploadResponse>` - Get avatar upload url
* GetAvatarUploadResponse - {
  data: {
    expiresAt: string,
    fileName: string,
    mime: string,
    uploadUrl: string,
  }
}

7. `uploadOnUrl = async (uploadUrl: string, image: Buffer): Promise<any>` - Upload avatar on url

8. `uploadAvatar = async (image: Buffer): Promise<string>` - Fast using of `getAvatarUpload` and `uploadOnUrl`

### `MeshSocket`
The main class of opened mesh socket to interact with mesh

#### Mesh Socket methods

1. `onopen = (handler: () => void)` - Register a handler to be called when the socket is opened
2. `onclose = (handler: () => Promise<void>)` - Register a handler to be called when the socket is closed
3. `onerror = (handler: () => Promise<void>)` - Register a handler to be called when the socket encounters an error
4. `onmessage = (handler: (data: string) => Promise<void>)` - Register a handler to be called when the socket receives a message
4. `sendMessage = (content: string): void` - Send a message to the mesh
5. `leave = (): void` - Leave the mesh

## Contributing
------------

Contributions are welcome! Please submit a pull request with your changes.

## License
-------

RaveJS is licensed under the MIT License. See LICENSE for more information.
If you're will use my generators - write about it to my [DM](https://t.me/celt_is_god)
