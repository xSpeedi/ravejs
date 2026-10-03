import { Agent } from 'undici';

import { APIErrorData } from './schemas/error';

// Constants

export const VERSION = '1.18.17';

export const SYMBOLS = '0123456789abcdef';
export const API_URL = 'https://api1.a-l-p-a.com';
export const PARSE_API_URL = 'https://api3.a-l-p-a.com';
export const EVENTS_API_URL = 'https://api2.a-l-p-a.com';
export const WE_MESH_API_URL = 'https://wallace2.red.wemesh.ca';
export const MOJO_AUTH_URL = 'https://api.mojoauth.com';
export const RAVE_LINK_URL = 'https://rave.link';
// Host que o app atual (8.2.57) usa nos links de vídeo (/videos/youtube/<id>).
export const VIDEO_URL_BASE = 'https://api.red.wemesh.ca';
// Busca do YouTube que o app do Rave usa (cliente WEB).
export const YOUTUBE_SEARCH_URL =
  'https://www.youtube.com/youtubei/v1/search?key=AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8&prettyPrint=false';
export const YOUTUBE_SEARCH_PARAMS = 'EgIQAQ%3D%3D'; // só vídeos
export const YOUTUBE_WEB_CLIENT_VERSION = '2.20221122.06.00';
export const HASH_SECRET =
  'c3ab8ff13720e8ad9047dd39466b3c8974e592c2fa383d4a3960714caef0c4f2';
export const DEFAULT_LANGUAGE = 'ru';
export const UUID_PATTERN = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx';
export const SOCKET_PING_DELAY = 10000;
export const SOCKET_DEAD_TIMEOUT = 30000;

// Structures

export const API_HEADERS = {
  'Content-Type': 'application/json',
  Accept: 'application/json',
  Connection: 'keep-alive',
  Host: 'api1.a-l-p-a.com',
  'User-Agent':
    'Rave/2133 (8.1.93) (Android 666; PatheticDevsTriedToStopMe; FunnyASF; ru)',
  'WeMesh-API-Version': '4.0',
  'WeMesh-Platform': 'android',
  'Client-Version': '8.1.93',
};

export const MOJO_AUTH_HEADERS = {
  Connection: 'keep-alive',
  'User-Agent': 'okhttp/5.1.0',
  Host: 'api.mojoauth.com',
  'Content-Type': 'application/json; charset=utf-8',
  'X-API-Key': '45af6a2e-4c1c-45a5-9874-df1eb3a22fe2',
};

export const PATCHED_DEVICE = {
  adId: 'e1bbf669-e099-4559-8a8f-ecf44da51fc4',
  appVersionRelease: 2133,
  appVersionStr: '8.1.93',
  carriers: ['MegaFon RUS'],
  isBackground: true,
  isChromebook: false,
  isLandscape: false,
  isPhone: true,
  isTV: false,
  isTablet: false,
  isVPN: false,
  lang: 'ru',
  network: 'WIFI',
  osName: 'ANDROID',
  osVersion: '15',
  phoneModelBrand: 'Redmi',
  phoneModelManufacturer: 'Xiaomi',
  phoneModelModel: '24117RN76O',
  ramFree: 429,
  ramTotal: 512,
  ramUsed: 83,
  screenX: 1080,
  screenY: 2249,
  sdkVersion: 35,
};

export const PATCHED_IP_DATA = {
  as: 'AS41733 JSC "ER-Telecom Holding"',
  asname: 'ZTELECOM-AS',
  city: 'St Petersburg',
  continent: 'Europe',
  continentCode: 'EU',
  country: 'Russia',
  countryCode: 'RU',
  currency: 'RUB',
  district: '',
  hosting: false,
  isp: 'Z-Telecom',
  lat: 59.8983,
  lon: 30.2618,
  mobile: false,
  offset: 10800,
  org: 'JSC ER-Telecom',
  proxy: false,
  query: '5.18.252.218',
  region: 'SPE',
  regionName: 'St.-Petersburg',
  status: 'success',
  timezone: 'Europe/Moscow',
  zip: '190990',
};

export const PARSE_USERS_HEADERS = {
  'Content-Type': 'application/json',
  Accept: 'application/json',
  Connection: 'keep-alive',
  'User-Agent': 'Parse Android SDK API Level 35',
  'X-Parse-Application-Id': '83a03c48-0f97-4f01-8a80-f603ea2a2270',
  'X-Parse-Installation-Id': '810ea3e5-b316-4409-afe7-a0abbef37ac2',
  'X-Parse-App-Build-Version': '2133',
  'X-Parse-App-Display-Version': '8.1.93',
  'X-Parse-OS-Version': '15',
};

export const CODES_MAP: Record<number, APIErrorData> = {
  400: {
    name: 'RaveJSException.BadRequest',
    message: 'Bad Request. Invalid request parameters.',
  },
  401: {
    name: 'RaveJSException.Unauthorized',
    message: 'Unauthorized. Invalid credentials.',
  },
  403: {
    name: 'RaveJSException.Forbidden',
    message: 'Forbidden. Access denied.',
  },
  404: {
    name: 'RaveJSException.NotFound',
    message: 'Not Found. Resource not found.',
  },
  429: {
    name: 'RaveJSException.RateLimitExceeded',
    message: 'Rate Limit Exceeded. Too many requests.',
  },
  500: {
    name: 'RaveJSException.InternalServerError',
    message: 'Internal Server Error. Something went wrong.',
  },
};

export const GLOBAL_DISPATCHER = new Agent({
  connect: {
    rejectUnauthorized: false,
  },
});
