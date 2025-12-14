import { logger } from './logger.js';
import { Camera } from './camera.js';
import { FrameProcessor } from './frame-processor.js';
import { ApiService } from './api-service.js';

// DOM Elements
const videoEl = document.getElementById('camera-stream');
const overlayCanvas = document.getElementById('overlay-canvas');
const overlayCtx = overlayCanvas.getContext('2d');
const statusBadge = document.createElement('div');

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

// Resize overlay to match video
function resizeCanvas() {
    if (!videoEl.videoWidth || !videoEl.videoHeight) return;
    overlayCanvas.width = videoEl.videoWidth;
    overlayCanvas.height = videoEl.videoHeight;
    overlayCanvas.style.width = '100%';
    overlayCanvas.style.height = 'auto';
}

// Start app
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
        statusBadge.innerText = `Camera Error`;
        statusBadge.style.background = 'rgba(231, 76, 60, 0.8)';
    }
}

// Continuous scanning for web
function startScanning() {
    const SCAN_INTERVAL = 500; // ms
    const MIN_CONFIDENCE = 0.7;

    const scanLoop = async () => {
        if (!camera.isPlaying() || isProcessing) {
            requestAnimationFrame(scanLoop);
            return;
        }

        isProcessing = true;
        statusBadge.innerText = 'Analyzing...';
        statusBadge.style.color = '#6c5ce7';

        // Capture frame
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = videoEl.videoWidth;
        canvas.height = videoEl.videoHeight;
        ctx.drawImage(videoEl, 0, 0, canvas.width, canvas.height);

        const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
        const rawBase64 = dataUrl.split(',')[1];

        try {
            const apiResponse = await api.sendDetectionRequest(rawBase64);
            const confidentDetections = apiResponse.detections?.filter(d => d.confidence >= MIN_CONFIDENCE) || [];
            handleDetectionResult(confidentDetections);
        } catch (err) {
            logger.error(`API Error: ${err.message}`);
            statusBadge.innerText = 'Error';
            statusBadge.style.color = '#ff7675';
        }

        isProcessing = false;
        setTimeout(scanLoop, SCAN_INTERVAL);
    };

    scanLoop();
}

// Draw results on canvas
function handleDetectionResult(detections) {
    overlayCtx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);

    if (detections.length === 0) {
        statusBadge.innerText = 'No objects found';
        statusBadge.style.color = '#333';
        return;
    }

    statusBadge.innerText = `Detected: ${detections.map(d => d.label).join(', ')}`;
    overlayCtx.lineWidth = 4;
    overlayCtx.font = '16px Outfit';

    detections.forEach(det => {
        const [x, y, w, h] = det.box;

        // Draw bounding box
        overlayCtx.strokeStyle = '#6c5ce7';
        overlayCtx.beginPath();
        overlayCtx.rect(x, y, w, h);
        overlayCtx.stroke();

        // Draw label
        overlayCtx.fillStyle = '#6c5ce7';
        const textWidth = overlayCtx.measureText(det.label).width;
        overlayCtx.fillRect(x, y - 24, textWidth + 16, 24);
        overlayCtx.fillStyle = '#ffffff';
        overlayCtx.fillText(det.label, x + 8, y - 6);
    });
}

// Initialize
document.addEventListener('DOMContentLoaded', startApp);

// Cleanup
window.addEventListener('beforeunload', () => {
    camera.stop();
});