'use strict';

const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

canvas.width = 640;
canvas.height = 480;

// Get camera stream
navigator.mediaDevices.getUserMedia({ video: true, audio: false })
  .then(stream => {
    video.srcObject = stream;
    video.play();
    requestAnimationFrame(drawFrame);
  })
  .catch(err => {
    console.error('Camera error:', err);
    alert('Could not access camera: ' + err.message);
  });

function drawFrame() {
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  requestAnimationFrame(drawFrame);
}
