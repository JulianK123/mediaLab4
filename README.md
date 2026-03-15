# mediaLab4 – WebRTC Filter Application (Option A)

## Overview
A WebRTC-based camera filter application built with HTML5 Canvas and the getUserMedia API.

## Features
- **Live camera stream** via WebRTC (getUserMedia)
- **Existing filters:** Grayscale, Sepia, Invert
- **Custom filter:** Canny Edge Detection (not present in the original WebRTC sample)
- **Realtime threshold slider** to control the Canny edge sensitivity

## Canny Edge Detection Algorithm
The custom Canny filter is implemented from scratch in JavaScript:
1. Convert frame to grayscale
2. Apply 5×5 Gaussian blur (noise reduction)
3. Compute Sobel gradient magnitude and direction
4. Non-maximum suppression
5. Double threshold (high/low)
6. Hysteresis edge tracking

The **threshold slider** (range 10–200) controls the high threshold in real time. The low threshold is automatically set to 40% of the high value.

## Browser Testing

| Browser | Version | OS | Result |
|---|---|---|---|
| Google Chrome | 124.0.6367.82 | Windows 11 | ✅ Works |
| Mozilla Firefox | 125.0.2 | Windows 11 | ✅ Works |

## SSL / Server Setup
WebRTC requires HTTPS. To run locally:

```bash
# Generate self-signed certificate
openssl req -x509 -newkey rsa:4096 -keyout key.pem -out cert.pem -days 365 -nodes

# Serve with Node.js https
node server.js
```

Or use Apache with SSL module enabled (see lab instructions for links).

## Project Structure
```
mediaLab4/
├── index.html
├── style.css
├── main.js
└── README.md
```

## Git Branches
- `master` – final merged version
- `develop` – feature commits
