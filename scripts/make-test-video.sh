#!/usr/bin/env bash
# Generates the Faz 0 device-spike video: 1080p test pattern with a tone, encoded with the
# exact settings of the real media pipeline (PLAN §10.2) so decode cost on Quest is representative.
set -euo pipefail
OUT_DIR="content/media/dist"
mkdir -p "$OUT_DIR/videos" "$OUT_DIR/posters"
ffmpeg -y -loglevel error \
  -f lavfi -i "testsrc2=size=1920x1080:rate=30:duration=30" \
  -f lavfi -i "sine=frequency=440:duration=30" \
  -c:v libx264 -profile:v high -preset slow -crf 22 \
  -vf "scale='min(1920,iw)':-2" -pix_fmt yuv420p \
  -force_key_frames "expr:gte(t,n_forced*2)" \
  -c:a aac -b:a 128k -ac 2 \
  -movflags +faststart "$OUT_DIR/videos/spike-test-pattern.mp4"
ffmpeg -y -loglevel error -ss 3 -i "$OUT_DIR/videos/spike-test-pattern.mp4" -frames:v 1 \
  -vf "scale='min(1280,iw)':-2" -q:v 3 "$OUT_DIR/posters/spike-test-pattern.jpg"
echo "wrote $OUT_DIR/videos/spike-test-pattern.mp4 and poster"
