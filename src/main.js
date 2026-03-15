'use strict';

const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

canvas.width = 640;
canvas.height = 480;

let currentFilter = 'none';
let cannyThreshold = 50; // default, will be updated by slider

navigator.mediaDevices.getUserMedia({ video: true, audio: false })
  .then(stream => {
    video.srcObject = stream;
    video.play();
    requestAnimationFrame(drawFrame);
  })
  .catch(err => alert('Camera error: ' + err.message));

function setFilter(filter) {
  currentFilter = filter;
  document.querySelectorAll('.filter-buttons button').forEach(b => b.classList.remove('active'));
  event.target.classList.add('active');
}

// --- Standard filters ---
function applyStandardFilter(data) {
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i], g = data[i+1], b = data[i+2];
    if (currentFilter === 'grayscale') {
      const gray = 0.299*r + 0.587*g + 0.114*b;
      data[i] = data[i+1] = data[i+2] = gray;
    } else if (currentFilter === 'sepia') {
      data[i]   = Math.min(255, r*0.393 + g*0.769 + b*0.189);
      data[i+1] = Math.min(255, r*0.349 + g*0.686 + b*0.168);
      data[i+2] = Math.min(255, r*0.272 + g*0.534 + b*0.131);
    } else if (currentFilter === 'invert') {
      data[i] = 255-r; data[i+1] = 255-g; data[i+2] = 255-b;
    }
  }
}

// --- Canny Edge Detection ---
function toGrayscaleArray(data, w, h) {
  const gray = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) {
    gray[i] = 0.299*data[i*4] + 0.587*data[i*4+1] + 0.114*data[i*4+2];
  }
  return gray;
}

function gaussianBlur(gray, w, h) {
  // 5x5 Gaussian kernel
  const kernel = [2,4,5,4,2, 4,9,12,9,4, 5,12,15,12,5, 4,9,12,9,4, 2,4,5,4,2];
  const kSum = 159;
  const out = new Float32Array(w * h);
  for (let y = 2; y < h-2; y++) {
    for (let x = 2; x < w-2; x++) {
      let sum = 0;
      let ki = 0;
      for (let ky = -2; ky <= 2; ky++) {
        for (let kx = -2; kx <= 2; kx++) {
          sum += gray[(y+ky)*w + (x+kx)] * kernel[ki++];
        }
      }
      out[y*w+x] = sum / kSum;
    }
  }
  return out;
}

function sobelGradient(gray, w, h) {
  const mag = new Float32Array(w * h);
  const dir = new Float32Array(w * h);
  for (let y = 1; y < h-1; y++) {
    for (let x = 1; x < w-1; x++) {
      const gx =
        -gray[(y-1)*w+(x-1)] + gray[(y-1)*w+(x+1)]
        -2*gray[y*w+(x-1)]   + 2*gray[y*w+(x+1)]
        -gray[(y+1)*w+(x-1)] + gray[(y+1)*w+(x+1)];
      const gy =
        -gray[(y-1)*w+(x-1)] - 2*gray[(y-1)*w+x] - gray[(y-1)*w+(x+1)]
        +gray[(y+1)*w+(x-1)] + 2*gray[(y+1)*w+x] + gray[(y+1)*w+(x+1)];
      mag[y*w+x] = Math.sqrt(gx*gx + gy*gy);
      dir[y*w+x] = Math.atan2(gy, gx);
    }
  }
  return { mag, dir };
}

function nonMaxSuppression(mag, dir, w, h) {
  const out = new Float32Array(w * h);
  for (let y = 1; y < h-1; y++) {
    for (let x = 1; x < w-1; x++) {
      const angle = dir[y*w+x] * 180 / Math.PI;
      const normAngle = ((angle % 180) + 180) % 180;
      let q = 255, r = 255;
      if (normAngle < 22.5 || normAngle >= 157.5) {
        q = mag[y*w+(x+1)]; r = mag[y*w+(x-1)];
      } else if (normAngle < 67.5) {
        q = mag[(y+1)*w+(x-1)]; r = mag[(y-1)*w+(x+1)];
      } else if (normAngle < 112.5) {
        q = mag[(y+1)*w+x]; r = mag[(y-1)*w+x];
      } else {
        q = mag[(y-1)*w+(x-1)]; r = mag[(y+1)*w+(x+1)];
      }
      out[y*w+x] = (mag[y*w+x] >= q && mag[y*w+x] >= r) ? mag[y*w+x] : 0;
    }
  }
  return out;
}

function doubleThreshold(nms, w, h, low, high) {
  const STRONG = 255, WEAK = 75;
  const out = new Uint8Array(w * h);
  for (let i = 0; i < w*h; i++) {
    if (nms[i] >= high) out[i] = STRONG;
    else if (nms[i] >= low) out[i] = WEAK;
  }
  return out;
}

function hysteresisTracking(edges, w, h) {
  const STRONG = 255, WEAK = 75;
  for (let y = 1; y < h-1; y++) {
    for (let x = 1; x < w-1; x++) {
      if (edges[y*w+x] === WEAK) {
        const neighbors = [
          edges[(y-1)*w+(x-1)], edges[(y-1)*w+x], edges[(y-1)*w+(x+1)],
          edges[y*w+(x-1)],                         edges[y*w+(x+1)],
          edges[(y+1)*w+(x-1)], edges[(y+1)*w+x], edges[(y+1)*w+(x+1)]
        ];
        edges[y*w+x] = neighbors.includes(STRONG) ? STRONG : 0;
      }
    }
  }
  return edges;
}

function applyCanny(imageData, w, h, threshold) {
  const data = imageData.data;
  const high = threshold;
  const low = threshold * 0.4;
  let gray = toGrayscaleArray(data, w, h);
  gray = gaussianBlur(gray, w, h);
  const { mag, dir } = sobelGradient(gray, w, h);
  const nms = nonMaxSuppression(mag, dir, w, h);
  let edges = doubleThreshold(nms, w, h, low, high);
  edges = hysteresisTracking(edges, w, h);
  // Write edges back as white-on-black
  for (let i = 0; i < w*h; i++) {
    data[i*4] = data[i*4+1] = data[i*4+2] = edges[i];
    data[i*4+3] = 255;
  }
  return imageData;
}

// --- Draw loop ---
function drawFrame() {
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  if (currentFilter !== 'none') {
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    if (currentFilter === 'canny') {
      ctx.putImageData(applyCanny(imageData, canvas.width, canvas.height, cannyThreshold), 0, 0);
    } else {
      applyStandardFilter(imageData.data);
      ctx.putImageData(imageData, 0, 0);
    }
  }
  requestAnimationFrame(drawFrame);
}
