import { types as mediasoupTypes } from 'mediasoup-client';
import * as Constants from './constants';

export function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export function normalizeFrameRate(frameRate?: number) {
  if (frameRate == null || !Number.isFinite(frameRate)) return 30;
  return clamp(Math.round(frameRate), 10, 30);
}

export function getHighLayerMaxBitrate(height: number, frameRate: number) {
  if (height >= 1080) {
    return frameRate >= 30
      ? Constants.FULL_HD_MAX_BITRATE_30FPS
      : Constants.FULL_HD_MAX_BITRATE_15FPS;
  }
  if (height >= 720) {
    return frameRate >= 30
      ? Constants.HD_MAX_BITRATE_30FPS
      : Constants.HD_MAX_BITRATE_15FPS;
  }
  if (height >= 540) {
    return frameRate >= 30
      ? Constants.QHD_MAX_BITRATE_30FPS
      : Constants.QHD_MAX_BITRATE_15FPS;
  }
  if (height >= 360) {
    return frameRate >= 30
      ? Constants.SD_MAX_BITRATE_30FPS
      : Constants.SD_MAX_BITRATE_15FPS;
  }
  return Constants.VERY_LOW_RESOLUTION_MAX_BITRATE;
}

export function createSimulcastEncodingsFromTrack(settings: {
  width?: number;
  height?: number;
  frameRate?: number;
}): mediasoupTypes.RtpEncodingParameters[] {
  const height = settings.height && settings.height > 0 ? settings.height : 720;
  const frameRate = normalizeFrameRate(settings.frameRate);
  const highMaxBitrate = getHighLayerMaxBitrate(height, frameRate);

  return [
    {
      scaleResolutionDownBy: 4,
      maxBitrate: Math.round(highMaxBitrate * 0.12),
      maxFramerate: Math.min(frameRate, 15),
    },
    {
      scaleResolutionDownBy: 2,
      maxBitrate: Math.round(highMaxBitrate * 0.4),
      maxFramerate: Math.min(frameRate, 30),
    },
    {
      scaleResolutionDownBy: 1,
      maxBitrate: highMaxBitrate,
      maxFramerate: Math.min(frameRate, 30),
    },
  ];
}

export function getConnectionStateLogLevel(
  state: mediasoupTypes.ConnectionState,
) {
  if (state === 'connected') return 'info';
  if (state === 'disconnected') return 'warn';
  if (state === 'failed') return 'error';
  return 'log';
}

const ADJECTIVES = [
  'Swift',
  'Calm',
  'Bright',
  'Quiet',
  'Bold',
  'Gentle',
  'Sharp',
  'Warm',
  'Cool',
  'Vivid',
  'Brave',
  'Kind',
  'Wise',
  'Sunny',
  'Silent',
  'Clever',
  'Lucky',
  'Steady',
  'Nimble',
  'Cheerful',
  'Mighty',
  'Curious',
  'Playful',
  'Serene',
  'Fierce',
  'Gracious',
  'Radiant',
  'Humble',
  'Lively',
  'Noble',
  'Breezy',
  'Cozy',
  'Dreamy',
  'Eager',
  'Frosty',
  'Golden',
  'Hazy',
  'Jolly',
  'Misty',
  'Tranquil',
];

const NOUNS = [
  'Otter',
  'Falcon',
  'Maple',
  'Comet',
  'Ember',
  'Willow',
  'Harbor',
  'Lynx',
  'Cedar',
  'Raven',
  'River',
  'Meadow',
  'Phoenix',
  'Badger',
  'Aspen',
  'Pebble',
  'Sparrow',
  'Glacier',
  'Coral',
  'Thistle',
  'Heron',
  'Canyon',
  'Juniper',
  'Dolphin',
  'Marlin',
  'Birch',
  'Kestrel',
  'Tundra',
  'Orchid',
  'Panther',
  'Lagoon',
  'Fjord',
  'Sable',
  'Wren',
  'Cascade',
  'Prairie',
  'Nimbus',
  'Cobalt',
  'Alder',
  'Zephyr',
];

function hashUid(uid: string): number {
  let hash = 0;
  for (let i = 0; i < uid.length; i++) {
    hash = (hash * 31 + uid.charCodeAt(i)) >>> 0; // unsigned 32-bit
  }
  return hash;
}

export function generateNickname(uid: string): string {
  const hash = hashUid(uid);
  const adjIndex = hash % ADJECTIVES.length;
  const nounIndex = Math.floor(hash / ADJECTIVES.length) % NOUNS.length;
  return `${ADJECTIVES[adjIndex]}${NOUNS[nounIndex]}`;
}

export function getNickname(user: {
  userNicknameFromGoogleAccount: string | null;
  uid: string;
}): string {
  return user.userNicknameFromGoogleAccount ?? generateNickname(user.uid);
}
