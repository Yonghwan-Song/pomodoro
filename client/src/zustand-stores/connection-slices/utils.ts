import { types as mediasoupTypes } from "mediasoup-client";
import * as Constants from "./constants";

export function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export function normalizeFrameRate(frameRate?: number) {
  if (frameRate == null || !Number.isFinite(frameRate)) return 30;
  return clamp(Math.round(frameRate), 10, 30);
}

export function getHighLayerMaxBitrate(height: number, frameRate: number) {
  if (height >= 1080) {
    return frameRate >= 30 ? Constants.FULL_HD_MAX_BITRATE_30FPS : Constants.FULL_HD_MAX_BITRATE_15FPS;
  }
  if (height >= 720) {
    return frameRate >= 30 ? Constants.HD_MAX_BITRATE_30FPS : Constants.HD_MAX_BITRATE_15FPS;
  }
  if (height >= 540) {
    return frameRate >= 30 ? Constants.QHD_MAX_BITRATE_30FPS : Constants.QHD_MAX_BITRATE_15FPS;
  }
  if (height >= 360) {
    return frameRate >= 30 ? Constants.SD_MAX_BITRATE_30FPS : Constants.SD_MAX_BITRATE_15FPS;
  }
  return Constants.VERY_LOW_RESOLUTION_MAX_BITRATE;
}

export function createSimulcastEncodingsFromTrack(
  settings: { width?: number; height?: number; frameRate?: number }
): mediasoupTypes.RtpEncodingParameters[] {
  const height = settings.height && settings.height > 0 ? settings.height : 720;
  const frameRate = normalizeFrameRate(settings.frameRate);
  const highMaxBitrate = getHighLayerMaxBitrate(height, frameRate);

  return [
    {
      scaleResolutionDownBy: 4,
      maxBitrate: Math.round(highMaxBitrate * 0.12),
      maxFramerate: Math.min(frameRate, 15)
    },
    {
      scaleResolutionDownBy: 2,
      maxBitrate: Math.round(highMaxBitrate * 0.4),
      maxFramerate: Math.min(frameRate, 30)
    },
    {
      scaleResolutionDownBy: 1,
      maxBitrate: highMaxBitrate,
      maxFramerate: Math.min(frameRate, 30)
    }
  ];
}

export function getConnectionStateLogLevel(state: mediasoupTypes.ConnectionState) {
  if (state === "connected") return "info";
  if (state === "disconnected") return "warn";
  if (state === "failed") return "error";
  return "log";
}
