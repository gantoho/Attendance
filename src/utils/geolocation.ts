export type PrecisePosition = {
  latitude: number;
  longitude: number;
  accuracy: number;
};

export type PreciseOptions = {
  minSamples?: number;
  maxSamples?: number;
  desiredAccuracy?: number;
  timeoutMs?: number;
};

export function getPrecisePosition(options: PreciseOptions = {}): Promise<PrecisePosition> {
  const {
    minSamples = 2,
    maxSamples = 5,
    desiredAccuracy = 25,
    timeoutMs = 12000,
  } = options;

  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('当前环境不支持定位'));
      return;
    }

    let best: PrecisePosition | null = null;
    let count = 0;
    let watchId: number | null = null;
    const done = (pos: PrecisePosition | null, err?: GeolocationPositionError) => {
      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
      }
      clearTimeout(timer);
      if (pos) {
        resolve(pos);
      } else {
        reject(err || new Error('定位失败'));
      }
    };

    const timer = setTimeout(() => {
      if (best) {
        done(best);
      } else {
        done(null);
      }
    }, timeoutMs);

    watchId = navigator.geolocation.watchPosition(
      (p) => {
        const sample: PrecisePosition = {
          latitude: p.coords.latitude,
          longitude: p.coords.longitude,
          accuracy: p.coords.accuracy ?? Number.MAX_SAFE_INTEGER,
        };
        if (!best || sample.accuracy < best.accuracy) {
          best = sample;
        }
        count += 1;
        if (count >= minSamples && best && best.accuracy <= desiredAccuracy) {
          done(best);
        } else if (count >= maxSamples) {
          done(best);
        }
      },
      (err) => {
        if (best) {
          done(best);
        } else {
          done(null, err);
        }
      },
      {
        enableHighAccuracy: true,
        maximumAge: 0,
        timeout: timeoutMs,
      },
    );
  });
}
