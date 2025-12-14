# backend/processing.py
import os
from PIL import Image
from config import UPLOAD_FOLDER

def save_image(file):
    """Save uploaded file and return its path."""
    path = os.path.join(UPLOAD_FOLDER, file.filename)
    os.makedirs(UPLOAD_FOLDER, exist_ok=True)
    file.save(path)
    return path

def process_image(image_path):
    """
    Placeholder for ML / OCR logic.
    Replace this with YOLO/OCR code later.
    """
    # Example dummy result
    result = {
        "success": True,
        "detections": [
            {"label": "12345", "box": [50, 50, 150, 100], "confidence": 0.95}
        ]
    }
    return result

def process_base64_image(base64_str):
    """If image is sent as base64 from frontend."""
    import base64
    import io

    img_data = base64.b64decode(base64_str)
    img = Image.open(io.BytesIO(img_data))
    path = os.path.join(UPLOAD_FOLDER, "temp.jpg")
    img.save(path)
    return process_image(path)
