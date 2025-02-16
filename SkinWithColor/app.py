import sys
import os

# Add parent directory to Python path to find gamma_correction.py
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from flask import Flask, render_template, Response, send_from_directory
from flask_cors import CORS
import cv2
import numpy as np
from SkinDetection import HSV_Model, RGB_Model, YCBCR_Model
from ThreeModels import (stretch_and_wp_correction, 
                        modified_gray_world_correction, 
                        white_patch_correction)
from gamma_correction import apply_gamma_correction

app = Flask(__name__, 
    static_folder='static',
    static_url_path='/static')
CORS(app)  # Enable CORS for all routes

# Global variable for gamma correction toggle
gamma_enabled = False

# Global variables for model selection
skin_models = {
    'hsv': ('HSV', HSV_Model),
    'rgb': ('RGB', RGB_Model),
    'ycbcr': ('YCbCr', YCBCR_Model)
}

color_models = {
    'none': ('None', lambda x: x),  # Add 'none' option that returns original frame
    'stretch': ('Stretch & WP', stretch_and_wp_correction),
    'gray': ('Gray World', modified_gray_world_correction),
    'white': ('White Patch', white_patch_correction)
}

# Default models
current_skin_model = ('HSV', HSV_Model)
current_color_model = ('None', lambda x: x)  # Default to no color correction

def ensure_3channel_mask(mask):
    """Ensure mask is 3-channel BGR format"""
    if len(mask.shape) == 2:
        return cv2.cvtColor(mask, cv2.COLOR_GRAY2BGR)
    elif mask.shape[2] == 3:
        return mask
    else:
        return cv2.cvtColor(mask[:,:,0], cv2.COLOR_GRAY2BGR)

def generate_frames():
    cap = cv2.VideoCapture(0)
    cap.set(cv2.CAP_PROP_FRAME_WIDTH, 160)
    cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 120)

    # Pre-define kernel for morphological operations
    kernel = np.ones((3, 3), np.uint8)

    # Create background subtractor
    backSub = cv2.createBackgroundSubtractorKNN(
        history=500,
        dist2Threshold=400.0,
        detectShadows=True
    )

    while True:
        success, frame = cap.read()
        if not success:
            break

        # Resize frame to desired output size
        frame = cv2.resize(frame, (160, 120))

        # Apply color correction
        corrected_frame = current_color_model[1](frame)
        
        # Apply gamma correction to color-corrected frame if enabled
        if gamma_enabled:
            corrected_frame = apply_gamma_correction(corrected_frame)

        # Get skin detection masks
        skin_mask_original = current_skin_model[1](frame)
        skin_mask_corrected = current_skin_model[1](corrected_frame)
        
        # Background subtraction
        if len(skin_mask_corrected.shape) == 3:
            bg_input = skin_mask_corrected[:,:,0]
        else:
            bg_input = skin_mask_corrected
        skin_mask_corrected_sub = backSub.apply(bg_input)

        # Clean up masks
        skin_mask_original = cv2.morphologyEx(
            cv2.morphologyEx(skin_mask_original, cv2.MORPH_OPEN, kernel),
            cv2.MORPH_CLOSE, kernel
        )
        
        skin_mask_corrected = cv2.morphologyEx(
            cv2.morphologyEx(skin_mask_corrected, cv2.MORPH_OPEN, kernel),
            cv2.MORPH_CLOSE, kernel
        )

        # Ensure masks are 3-channel
        skin_mask_original = ensure_3channel_mask(skin_mask_original)
        skin_mask_corrected = ensure_3channel_mask(skin_mask_corrected)
        skin_mask_corrected_sub = ensure_3channel_mask(skin_mask_corrected_sub)

        # Add labels
        cv2.putText(skin_mask_original, f"Skin: {current_skin_model[0]}", 
                    (5, 10), cv2.FONT_HERSHEY_SIMPLEX, 0.3, (0, 255, 0), 1)
        
        label = f"Color: {current_color_model[0]}"
        if gamma_enabled:
            label += "+Gamma"
        label += f", Skin: {current_skin_model[0]}"
        cv2.putText(skin_mask_corrected, label,
                    (5,10), cv2.FONT_HERSHEY_SIMPLEX, 0.3, (0, 255, 0), 0)

        # Create combined display
        top_row = np.hstack((frame, corrected_frame))
        bottom_row = np.hstack((skin_mask_original, skin_mask_corrected))

        # Resize the combined display
        combined_display = cv2.resize(np.vstack((top_row, bottom_row)), (720, 480))

        # Convert to jpg for streaming
        ret, buffer = cv2.imencode('.jpg', combined_display)
        frame = buffer.tobytes()
        
        yield (b'--frame\r\n'
               b'Content-Type: image/jpeg\r\n\r\n' + frame + b'\r\n')

@app.route('/home.html')
def home():
    return send_from_directory('.', 'home.html')

@app.route('/index.html')
def app_page():
    return send_from_directory('.', 'index.html')

@app.route('/about.html')
def about():
    return send_from_directory('.', 'about.html')

@app.route('/contact.html')
def contact():
    return send_from_directory('.', 'contact.html')



@app.route('/')
@app.route('/combined')
def index():
    return render_template('SkinWithColor.html')

@app.route('/video_feed')
def video_feed():
    return Response(generate_frames(),
                    mimetype='multipart/x-mixed-replace; boundary=frame')

@app.route('/change_model/<model_type>/<model_name>')
def change_model(model_type, model_name):
    global current_skin_model, current_color_model
    if model_type == 'skin':
        if model_name in skin_models:
            current_skin_model = skin_models[model_name]
    elif model_type == 'color':
        if model_name in color_models:
            current_color_model = color_models[model_name]
    return 'OK'

@app.route('/toggle_gamma/<state>')
def toggle_gamma(state):
    global gamma_enabled
    gamma_enabled = (state.lower() == 'true')
    return 'OK'

if __name__ == '__main__':
    app.run(host='127.0.0.1', port=5500, debug=False, threaded=True) 