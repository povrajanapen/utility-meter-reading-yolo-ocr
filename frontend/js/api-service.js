import { logger } from './logger.js';

export class ApiService {
    constructor() {
        // Base URL now points to Flask backend
        this.API_URL = '/api'; // Flask serves API at /api
    }

    /**
     * Health check endpoint
     */
    async checkHealth() {
        try {
            const response = await fetch(`${this.API_URL}/health`);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const data = await response.json();
            logger.log("API: Health check response received", data);
            return data;
        } catch (error) {
            logger.error(`Health check failed: ${error.message}`);
            return { status: "error", error: error.message };
        }
    }

    /**
     * Send image to Flask for YOLO + OCR detection
     * @param {Blob|File} imageFile - captured image from canvas or input
     */
    async sendDetectionRequest(imageFile) {
        if (!imageFile) {
            logger.error("No image provided for detection");
            return { success: false, message: "No image" };
        }

        try {
            logger.log("API: Sending image to Flask backend...");

            const formData = new FormData();
            formData.append("image", imageFile);

            const response = await fetch(`${this.API_URL}/detect`, {
                method: "POST",
                body: formData
            });

            if (!response.ok) {
                const errText = await response.text();
                logger.error(`API Failed: ${response.status} - ${errText}`);
                throw new Error(`API request failed: ${response.status}`);
            }

            const result = await response.json();
            logger.log("API: Detection response received");
            return this.formatResponse(result);

        } catch (error) {
            logger.error(`API Error: ${error.message}`);
            return { success: false, message: error.message, detections: [] };
        }
    }

    /**
     * Standardize Flask backend response to frontend expected format
     * @param {*} apiResult
     */
    formatResponse(apiResult) {
        // Expect backend to return:
        // { success: true, detections: [ { label, confidence, box: [x,y,w,h] } ] }
        if (apiResult && apiResult.success && Array.isArray(apiResult.detections)) {
            return apiResult;
        } else {
            logger.warn("ApiService: Unexpected backend response format", apiResult);
            return { success: false, detections: [], message: "Invalid backend response" };
        }
    }
}