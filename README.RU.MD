<div align="center">
    <h1>RaveJS</h1>
    <a href="https://t.me/aminodorks"><img src="https://img.shields.io/badge/Telegram-2CA5E0?style=for-the-badge&logo=telegram&logoColor=white" alt="Telegram"></a>
    <a href="https://www.npmjs.com/package/ravejs"><img src="https://img.shields.io/badge/NPM-%23CB3837.svg?style=for-the-badge&logo=npm&logoColor=white" alt="NPM"></a>
</div>
<div align="center">
    <img src="https://img.shields.io/npm/dm/ravejs" alt="Downloads">
    <img src="https://img.shields.io/npm/v/ravejs.svg" alt="Version">
    <h2>RaveJS — библиотека на TypeScript для взаимодействия с API приложения Rave: Watch Party</h2>
</div> 

- [README на английском](https://github.com/AminoDorks/ravejs/blob/master/README.MD)  
- [README на русском](https://github.com/AminoDorks/ravejs/blob/master/README.RU.MD)

---

## Содержание  
- [Возможности](#возможности)  
- [Начало работы](#начало-работы)  
- [Использование](#использование)  
- [Документация API](#документация-api)  
- [Участие в разработке](#участие-в-разработке)  
- [Лицензия](#лицензия)  

---

## Возможности  

RaveJS обладает рядом преимуществ:  
- Модульная архитектура  
- Простота в использовании  
- Поддержка всех необходимых функций  
- Первая библиотека на TypeScript для Rave API  

---

## Начало работы  

Чтобы начать использовать RaveJS, выполните следующие шаги:

1. Инициализируйте npm-пакет:  
```bash
npm init
```
2. Установите TypeScript глобально (опционально):  
```bash
npm install -g typescript
```
3. Создайте конфигурацию TypeScript:  
```bash
tsc --init
```
4. Установите RaveJS:  
```bash
npm install ravejs
```

---

## Использование  

### Базовая авторизация  

```typescript
import { Rave } from 'ravejs';

(async () => {
  const rave = new Rave();
  await rave.auth.authenticate('токен', 'девайс айди')
  console.log(`Авторизован как ${rave.account?.id}`);
})();
```

---

## Документация API  

### `Rave(config: RaveConfig)`  
Главный класс для взаимодействия с API Rave.

#### Конфигурация (`RaveConfig`)
- `credentials?`: `{ deviceId: string, token: string }` — данные для авторизации и опции  
- `enableLogging?`: `boolean` — включить логирование  
- `account?`: `Account` — профиль пользователя после авторизации  

#### Свойства экземпляра `Rave`
1. `token: string` — Bearer-токен авторизации  
2. `JWT: string` — JWT-токен для Web Mesh API  
3. `account: Account?` — информация о профиле пользователя  
4. `proxy?: string` — прокси для запросов (поддерживаются SOCKS-прокси; можно задать через сеттер)

#### Методы экземпляра `Rave`
1. `proxyIsAlive = async (): Promise<boolean>` - Проверить, работает ли прокси
2. `offProxy = (): Promise<void>` - Удалить прокси из экземпляра Rave

---

### Фабрики  

RaveJS использует модульную архитектуру, основанную на *фабриках*.

---

#### `AuthFactory`  
Фабрика для авторизации и аутентификации. Доступна через `rave.auth`.

##### Методы `AuthFactory`
1. `refreshJWT(deviceId?: string): Promise<string>` — обновить JWT-токен  

2. `getAccount(): Promise<Account>` — получить данные авторизованного пользователя

3. `authenticate = async (token: string, deviceId: string): Promise<Account>` - Функция аутентификации с использованием токена и идентификатора устройства, автоматически создает JWT и данные аккаунта.

1. `sendMagicLink(email: string, language = 'ru'): Promise<{ stateId: string }>`  
  Отправить «волшебную» ссылку на почту для входа или регистрации.

2. `checkRegisterState(stateId: string): Promise<CheckRegisterStateResponse>`  
  Проверить статус регистрации по `stateId`.  
  **Ответ:**  
```ts
{
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
    issuer: string,
    userId: string,
    identifier: string,
    email: string
  }
}
```

3. `parseUserCredentials(idToken: string, email: string): Promise<{ objectId: string; createdAt: string; username: string; sessionToken: string }>`  
  Извлечь учётные данные из `idToken` и email.

4. `mojoLogin(email: string, parseId: string, parseToken: string, name: string, deviceId?: string, language = 'ru'): Promise<{ data: { isValid: boolean; newUser: boolean; suggestedHandles: string[] } }>`  
  Вход через сервис Mojo.

5. `login(stateId: string, name?: string, deviceId?: string, language = 'ru'): Promise<AuthenticateResponse>`  
  Упрощённый метод входа (комбинирует предыдущие шаги).  
  **Ответ (`AuthenticateResponse`):**  
```ts
{
  isNewUser: boolean,
  email: string,
  username: string,
  deviceId: string,
  token: string
}
```

6. `register(email: string, name: string, deviceId?: string, language = 'ru'): Promise<RegisterResponse>`  
  Регистрация нового пользователя (аналогично `login`, но гарантирует создание аккаунта).

---

#### `MeshFactory`  
Фабрика для работы с *мешами* (комнатами просмотра). Доступна через `rave.mesh`.

##### Методы `MeshFactory`
1. `get(meshId: string): Promise<GetMeshResponse>`  
  Получить информацию о меше по ID.  
  **Ответ (`GetMeshResponse.data`):**
```ts
{
  blurT?: boolean;
  category: string;
  channel: number;
  createdAt: string;
  currentState: 'play' | 'paus';
  explicit: boolean;
  id: string;
  isFriend: boolean;
  isLocal: boolean;
  isPublic: boolean;
  kickMode: string;
  maturity: string;
  mediaUrl: string;
  originator: number;
  playMode: string;
  position: number;
  server: string;
  shareLink: string;
  thumbnails?: {
    channel?: string;
    standard?: string;
    animated?: string;
    maxres?: string;
    medium?: string;
    default?: string;
    high?: string;
  };
  time: number;
  videoAuthor: string;
  videoDuration: number;
  videoProvider: string;
  videoPublishedAt: string;
  videoThumbnail: string;
  videoTitle: string;
  videoUrl: string;
  vikiPass: boolean;
  voipMode: string;
  users: {
    avatar: string;
    country: string;
    displayName?: string;
    handle?: string;
    id: number;
    lang?: string;
    lat: number;
    lng: number;
    name: string;
  }[];
}
```

2. `getByLink(meshLink: string): Promise<GetMeshResponse>`  
  Получить меш по публичной ссылке (`shareLink`).

3. `getMany(params: GetManyMeshesParams): Promise<GetMeshResponse[]>`  
  Получить список мешей.  
  **Параметры (`GetManyMeshesParams`):**
```ts
{
  isPublic?: boolean;
  limit: number;
  hasFriends: boolean;
  local: boolean;
  hasInvited: boolean;
  language?: string;
}
```

4. `join(meshId: string): Promise<MeshSocket>`  
  Присоединиться к мешу. Возвращает экземпляр `MeshSocket` для взаимодействия через WebSocket.

---

#### `ThreadFactory`  
Фабрика для работы с переписками. Доступна через `rave.thread`.

##### Методы `ThreadFactory`
1. `getMany(): Promise<Thread[]>`  
  Получить все переписки.  
  **Структура `Thread`:**
```ts
{
  expiryMode: number;
  isFriend: boolean;
  myself: number;
  opposingUser: number;
  spokenLangs: string[];
  threadId: string;
}
```

2. `create(userId: number): Promise<Thread>`  
  Создать новую переписку с пользователем.

3. `sendMessage(threadId: string, content: string): Promise<SendMessageResponse>`  
  Отправить сообщение в переписку.  
  **Ответ (`SendMessageResponse.data`):**
```ts
{
  correlateId: string;
  threadId: string;
  messageType: string;
  originator: number;
  messageBody: {
    content: string;
    detectedLang: string;
    id: string;
    translations: Record<string, string>;
  }
}
```

---

#### `UserFactory`  
Фабрика для работы с пользователями. Доступна через `rave.user`.

##### Методы `UserFactory`
1. `get(userId: number): Promise<GetUserResponse>`  
  Получить профиль пользователя.  
  **Ответ (`GetUserResponse.data`):**
```ts
{
  bio: {
    bio?: string;
    metadata: { position: number; privacy: string };
  };
  profile: {
    avatar: string;
    country: string;
    displayName?: string;
    handle?: string;
  };
}
```

2. `sendFriendship(userId: number): Promise<FriendshipResponse>`  
  Отправить запрос на добавление в друзья.  
  **Ответ (`FriendshipResponse.data`):**
```ts
{
  fromUserId: number;
  state: string;
  toUserId: number;
}
```

3. `acceptFriendship(userId: number): Promise<void>`  
  Принять запрос в друзья.

4. `declineFriendship(userId: number): Promise<void>`  
  Отклонить запрос в друзья.

5. `edit(builder: EditProfileBuilder): Promise<EditProfileResponse>`  
  Редактировать профиль.  
  **Параметры (`EditProfileBuilder`):**
```ts
{
  displayAvatar?: string;
  displayName?: string;
  handle?: string;
}
```
  **Ответ (`EditProfileResponse.data`)** — объект `User`.

6. `getAvatarUpload(): Promise<GetAvatarUploadResponse>`  
  Получить URL для загрузки аватара.  
  **Ответ (`GetAvatarUploadResponse.data`):**
```ts
{
  expiresAt: string;
  fileName: string;
  mime: string;
  uploadUrl: string;
}
```

7. `uploadOnUrl(uploadUrl: string, image: Buffer): Promise<void>`  
  Загрузить изображение по полученному URL.

8. `uploadAvatar(image: Buffer): Promise<string>`  
  Упрощённый метод: получить URL и загрузить аватар за один вызов. Возвращает `displayAvatar` (новый URL аватара).

---

#### `MeshSocket`  
Класс для работы с WebSocket-соединением в меше.

##### Методы и свойства `MeshSocket`
1. `onopen(handler: () => void): void`  
  Обработчик открытия соединения.

2. `onclose(handler: () => Promise<void>): void`  
  Обработчик закрытия соединения.

3. `onerror(handler: () => Promise<void>): void`  
  Обработчик ошибок.

4. `onmessage(handler: (data: string) => Promise<void>): void`  
  Обработчик входящих сообщений (сырой JSON-строки).

5. `sendMessage(content: string): void`  
  Отправить сообщение в меш (например, команды управления воспроизведением).

6. `leave(): void`  
  Покинуть меш (закрывает сокет).

---

## Участие в разработке  

Приветствуются pull request'ы и предложения по улучшению!  
Если вы используете мои генераторы кода — напишите мне в [личные сообщения Telegram](https://t.me/celt_is_god).

---

## Лицензия  

RaveJS распространяется под лицензией **MIT**. Подробнее см. в файле [LICENSE](https://github.com/thatcelt/ravejs/blob/master/LICENSE).

---
