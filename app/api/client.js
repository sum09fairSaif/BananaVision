// Talks to the BananaVision backend (api/app.py on Render).
import * as Network from "expo-network";
import { ImageManipulator, SaveFormat } from "expo-image-manipulator";

export const API_BASE = "https://bananavision-api.onrender.com";

// Render's free tier sleeps after ~15 idle minutes and takes 50–60 s to wake.
const TIMEOUT_MS = 90_000;
const SLOW_AFTER_MS = 4_000;
// The model only sees 224×224; a 1024 px upload keeps detail for the gate
// while cutting a 12 MP photo from several MB to roughly 150 KB.
const UPLOAD_LONG_EDGE = 1024;

export const STAGES = ["unripe", "ripe", "overripe", "rotten"];

export const ErrorKind = {
  OFFLINE: "offline",
  UNREACHABLE: "unreachable",
  TIMEOUT: "timeout",
  NOT_RECOGNIZED: "not_recognized",
  INVALID_IMAGE: "invalid_image",
  TOO_LARGE: "too_large",
  SERVER: "server",
  CANCELLED: "cancelled",
};

export class AnalyzeError extends Error {
  constructor(kind, cause) {
    super(kind);
    this.name = "AnalyzeError";
    this.kind = kind;
    this.cause = cause;
  }
}

// Fire-and-forget: wakes a sleeping server while the user lines up a photo.
export function warmUp() {
  fetch(`${API_BASE}/health`).catch(() => {});
}

// "online" | "offline" | "unknown". Only a definite reading counts as offline:
// expo-network reports isConnected=false whenever the type is UNKNOWN (and
// useNetworkState starts as {}), so treating those as offline would block
// scans that would have worked. A captive Wi-Fi portal — connected but no
// internet — is caught by isInternetReachable.
export function networkStatus(state) {
  if (!state || state.type === undefined) return "unknown";
  if (state.type === Network.NetworkStateType.NONE) return "offline";
  if (state.type === Network.NetworkStateType.UNKNOWN) return "unknown";
  if (state.isConnected === false || state.isInternetReachable === false) return "offline";
  return "online";
}

export async function isOnline() {
  try {
    return networkStatus(await Network.getNetworkStateAsync()) !== "offline";
  } catch {
    return true;
  }
}

async function prepareImage({ uri, width, height }) {
  const context = ImageManipulator.manipulate(uri);
  if (width && height && Math.max(width, height) > UPLOAD_LONG_EDGE) {
    context.resize(
      width >= height
        ? { width: UPLOAD_LONG_EDGE, height: null }
        : { width: null, height: UPLOAD_LONG_EDGE },
    );
  }
  const image = await context.renderAsync();
  const saved = await image.saveAsync({ compress: 0.8, format: SaveFormat.JPEG });
  return saved.uri;
}

/**
 * Uploads a photo and resolves with the analysis:
 *   { recognized, stage, confidence, edible, days_remaining: {estimate, low, high}, guide }
 * Rejects with an AnalyzeError whose `kind` is one of ErrorKind.
 *
 * @param photo   { uri, width?, height? } from the camera or photo library
 * @param signal  optional AbortSignal so the user can cancel
 * @param onSlow  called once if the request is still running after a few seconds
 */
export async function analyzePhoto(photo, { signal, onSlow } = {}) {
  if (!(await isOnline())) throw new AnalyzeError(ErrorKind.OFFLINE);

  const controller = new AbortController();
  let timedOut = false;
  const cancel = () => controller.abort();
  signal?.addEventListener("abort", cancel);
  const timeout = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, TIMEOUT_MS);
  const slow = setTimeout(() => onSlow?.(), SLOW_AFTER_MS);

  // Classifies a failure that happened while the request was in flight.
  async function transportError(cause) {
    if (signal?.aborted) return new AnalyzeError(ErrorKind.CANCELLED, cause);
    if (timedOut) return new AnalyzeError(ErrorKind.TIMEOUT, cause);
    const online = await isOnline();
    return new AnalyzeError(online ? ErrorKind.UNREACHABLE : ErrorKind.OFFLINE, cause);
  }

  try {
    let uri;
    try {
      uri = await prepareImage(photo);
    } catch (cause) {
      throw new AnalyzeError(ErrorKind.INVALID_IMAGE, cause);
    }
    if (signal?.aborted) throw new AnalyzeError(ErrorKind.CANCELLED);

    const form = new FormData();
    form.append("file", { uri, name: "banana.jpg", type: "image/jpeg" });

    let response;
    try {
      response = await fetch(`${API_BASE}/analyze`, {
        method: "POST",
        body: form,
        headers: { Accept: "application/json" },
        signal: controller.signal,
      });
    } catch (cause) {
      throw await transportError(cause);
    }

    if (response.status === 413) throw new AnalyzeError(ErrorKind.TOO_LARGE);
    if (response.status === 400) throw new AnalyzeError(ErrorKind.INVALID_IMAGE);
    if (!response.ok) throw new AnalyzeError(ErrorKind.SERVER);

    let data;
    try {
      data = await response.json();
    } catch (cause) {
      if (controller.signal.aborted) throw await transportError(cause);
      throw new AnalyzeError(ErrorKind.SERVER, cause);
    }

    if (data.recognized === false) throw new AnalyzeError(ErrorKind.NOT_RECOGNIZED);
    if (!STAGES.includes(data.stage)) throw new AnalyzeError(ErrorKind.SERVER);
    return data;
  } finally {
    clearTimeout(timeout);
    clearTimeout(slow);
    signal?.removeEventListener("abort", cancel);
  }
}
