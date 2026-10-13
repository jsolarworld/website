#!/usr/bin/env bash
# Makes the home page hero's background video from the owner's video (needs ffmpeg).
#
#   bash scripts/hero-video.sh [source video]
#
# Writes public/hero/hero.webm (smaller, for browsers that take it), hero.mp4 (plays everywhere) and
# poster.jpg (the first frame, shown while the video loads). The owner wants the whole two minutes, and
# the original is 142 MB, so it is shrunk hard: small picture, no sound, low bit rate. It plays under a
# navy wash (components/hero-video.tsx), which is why that does not show. Takes about ten minutes.
set -euo pipefail

SRC="${1:-media-source/j-solar-website-video.mp4}"
OUT=public/hero
FPS=24
# Under the wash, 640 by 480 blown up to a desktop screen looks the same as 768 by 576, at 70% of the weight.
FRAMES="fps=$FPS,scale=640:480:flags=lanczos,hqdn3d=1.5:1.5:5:5,format=yuv420p"

WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT
mkdir -p "$OUT"

# H.264 in MP4: every phone decodes it in hardware. faststart lets it begin before it has all arrived.
ffmpeg -v error -y -i "$SRC" -an -vf "$FRAMES" -c:v libx264 -preset veryslow -crf 35 \
  -profile:v high -level 3.0 -g $((FPS * 4)) -movflags +faststart "$OUT/hero.mp4"

# VP9 in WebM: about a quarter smaller. Two passes at a fixed average rate, so the size is known in advance.
# cues_to_front puts the index at the start of the file, so the browser can jump back to the beginning to repeat.
for pass in 1 2; do
  ffmpeg -v error -y -i "$SRC" -an -vf "$FRAMES" -c:v libvpx-vp9 -b:v 165k -g $((FPS * 4)) \
    -row-mt 1 -tile-columns 1 -deadline good -cpu-used 3 -auto-alt-ref 1 -lag-in-frames 25 \
    -pass "$pass" -passlogfile "$WORK/vp9" -f webm -cues_to_front 1 "$([ "$pass" = 1 ] && echo "$WORK/pass1.webm" || echo "$OUT/hero.webm")"
done

ffmpeg -v error -y -i "$SRC" -frames:v 1 -vf "scale=960:720:flags=lanczos" -q:v 4 "$OUT/poster.jpg"

ls -l "$OUT"
