# config.py

import os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# Folder to save uploaded images
UPLOAD_FOLDER = os.path.join(BASE_DIR, "uploads")
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

# You can add more configs later, e.g., ML model paths
