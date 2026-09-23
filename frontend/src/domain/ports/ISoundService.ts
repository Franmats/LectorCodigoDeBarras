export interface ISoundService {
  playSuccess(): void;
  playError(): void;
  vibrate(durationMs?: number): void;
}
