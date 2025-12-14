# backend/api.py
import requests
from config import ROBOFLOW_API_KEY

def send_to_roboflow(image_path):
    url = "https://api.roboflow.com/detect"
    files = {"file": open(image_path, "rb")}
    headers = {"Authorization": f"Bearer {ROBOFLOW_API_KEY}"}

    response = requests.post(url, files=files, headers=headers)
    if response.status_code == 200:
        return response.json()
    else:
        raise Exception(f"API Error: {response.status_code} - {response.text}")
