'use strict';

const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

canvas.width = 640;
canvas.height = 480;

let currentFilter = 'none';

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

function applyFilter(imageData) {
  const data = imageData.data;
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
  return imageData;
}

function drawFrame() {
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  if (currentFilter !== 'none') {
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    ctx.putImageData(applyFilter(imageData), 0, 0);
  }
  requestAnimationFrame(drawFrame);
}
