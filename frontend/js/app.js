import { logger } from './logger.js';
import { Camera } from './camera.js';
import { FrameProcessor } from './frame-processor.js';
import { ApiService } from './api-service.js';

// Init Telegram WebApp only if it exists
let tg = null;
if (window.Telegram && window.Telegram.WebApp) {
    tg = window.Telegram.WebApp;
    tg.expand();
    tg.ready();
} else {
    console.log("Telegram WebApp not detected, running in normal browser");
}

// DOM Elements
const videoEl = document.getElementById('camera-stream');
const overlayCanvas = document.getElementById('overlay-canvas');
const overlayCtx = overlayCanvas.getContext('2d');
const statusBadge = document.createElement('div'); // Detection message

// Setup Status Badge
statusBadge.className = 'status-badge';
statusBadge.innerText = 'Ready';
document.querySelector('.camera-view').appendChild(statusBadge);

// Modules
const camera = new Camera(videoEl);
const processor = new FrameProcessor();
const api = new ApiService();

// State
let isProcessing = false;

function resizeCanvas() {
    if (!videoEl.videoWidth || !videoEl.videoHeight) return;
    overlayCanvas.width = videoEl.videoWidth;
    overlayCanvas.height = videoEl.videoHeight;
}

async function startApp() {
    try {
        statusBadge.innerText = 'Starting Camera...';
        await camera.start();
        statusBadge.innerText = 'Scanning...';
        resizeCanvas();
        window.addEventListener('resize', resizeCanvas);

        startScanning();

    } catch (e) {
        logger.error(`App Error: ${e.message}`);
        statusBadge.innerText = 'Camera Error';
        statusBadge.style.background = 'rgba(0, 0, 50, 0.8)'; // dark navy
        console.error(e);
    }
}

function startScanning() {
    const SCAN_INTERVAL = 500;
    const MIN_CONFIDENCE = 0.7;
    let lastScanTime = 0;

    const scanLoop = () => {
        if (!camera.isPlaying() || isProcessing) {
            requestAnimationFrame(scanLoop);
            return;
        }

        const now = Date.now();
        if (now - lastScanTime < SCAN_INTERVAL) {
            requestAnimationFrame(scanLoop);
            return;
        }

        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const video = camera.getVideo();
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        const rawBase64 = canvas.toDataURL('image/jpeg', 0.7).split(',')[1];

        lastScanTime = now;
        isProcessing = true;

        statusBadge.innerText = 'Analyzing...';
        statusBadge.style.background = 'rgba(0, 0, 50, 0.8)'; // dark navy
        statusBadge.style.color = 'white';
        if (tg && tg.HapticFeedback) tg.HapticFeedback.impactOccurred('light');

        api.sendDetectionRequest(rawBase64)
            .then(apiResponse => {
                const confidentDetections = apiResponse.detections?.filter(d => d.confidence >= MIN_CONFIDENCE) || [];

                if (confidentDetections.length > 0) {
                    handleDetectionResult(apiResponse);
                } else {
                    overlayCtx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
                    statusBadge.innerText = 'Scanning...';
                }

                isProcessing = false;
                requestAnimationFrame(scanLoop);
            })
            .catch(err => {
                logger.error(`Scanner: ${err.message}`);
                statusBadge.innerText = 'Error';
                statusBadge.style.background = 'rgba(255, 0, 0, 0.8)';
                setTimeout(() => {
                    isProcessing = false;
                    statusBadge.innerText = 'Scanning...';
                    statusBadge.style.background = 'rgba(0, 0, 50, 0.8)'; // dark navy
                    requestAnimationFrame(scanLoop);
                }, 1000);
            });
    };

    statusBadge.innerText = 'Scanning...';
    requestAnimationFrame(scanLoop);
}

function handleDetectionResult(response) {
    if (response.success && response.detections.length > 0) {
        const names = response.detections.map(d => d.label).join(', ');
        statusBadge.innerText = `Detected: ${names}`;

        if (tg && tg.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');

        overlayCtx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);

        response.detections.forEach(det => {
            const [x, y, w, h] = det.box;
            overlayCtx.strokeStyle = '#6c5ce7';
            overlayCtx.lineWidth = 4;
            overlayCtx.beginPath();
            overlayCtx.rect(x, y, w, h);
            overlayCtx.stroke();

            overlayCtx.fillStyle = '#6c5ce7';
            overlayCtx.font = '16px Outfit';
            const textWidth = overlayCtx.measureText(det.label).width;
            overlayCtx.fillRect(x, y - 24, textWidth + 16, 24);

            overlayCtx.fillStyle = '#ffffff';
            overlayCtx.fillText(det.label, x + 8, y - 6);
        });
    } else {
        statusBadge.innerText = 'No objects found';
    }
}

// Start
document.addEventListener('DOMContentLoaded', startApp);

// Cleanup
window.addEventListener('beforeunload', () => {
    camera.stop();
});
