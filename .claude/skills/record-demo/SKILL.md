---
name: record-demo
description: Record a short video of PrusaLink Web in a phone browser against the mock printer, as an MP4 that plays on iOS. Use when asked for a video, walkthrough or demo recording.
---

# Record a demo video

```bash
make dev DEV_PORT=5961 &                                  # any free port
node scripts/record-demo.ts http://localhost:5961 .video/out   # writes a .webm
ffmpeg -i .video/out/*.webm -vf "scale=780:-2:flags=lanczos,fps=30" -c:v libx264 \
  -pix_fmt yuv420p -profile:v high -crf 20 -movflags +faststart demo.mp4
```

`scripts/record-demo.ts` drives an iPhone 13 viewport: sign in, browse USB folders,
upload from the picker (a photo gets skipped), print, finish. It speeds the print up
through `/__mock/state` (`timeScale`). Edit its steps for other flows and keep pauses
long enough to read each screen. H.264, yuv420p and faststart are what iOS plays inline.

Headless browsers cannot open the real iOS picker, so uploads use `setInputFiles`.
`.video/` is git-ignored.
