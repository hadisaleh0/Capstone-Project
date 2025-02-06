from flask import Flask, request, render_template, send_file, jsonify, Response, send_from_directory
import os
from werkzeug.utils import secure_filename
from gamma_correction import apply_gamma_correction
from SkinDetection import RGB_Model, YCBCR_Model, HSV_Model
from ThreeModels import stretch_and_wp_correction, modified_gray_world_correction, white_patch_correction
import cv2
import numpy as np
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

# Create uploads directory with absolute path
UPLOAD_FOLDER = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'static/uploads')
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max file size

# Ensure upload folder exists
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg'}

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

# Dictionary mapping skin detection models to their functions
SKIN_DETECTION_MODELS = {
    'RGB': RGB_Model,
    'YCbCr': YCBCR_Model,
    'HSV': HSV_Model
}

# Dictionary mapping color correction models to their functions
COLOR_CORRECTION_MODELS = {
    'Stretch': stretch_and_wp_correction,
    'GrayWorld': modified_gray_world_correction,
    'WhitePatch': white_patch_correction
}

@app.route('/')
@app.route('/offline')
def offline():
    return send_from_directory('.', 'upload.html')

@app.route('/upload', methods=['POST'])
def upload_file():
    try:
        if 'file' not in request.files:
            return jsonify({'success': False, 'error': 'No file uploaded'})
        
        file = request.files['file']
        
        if file.filename == '':
            return jsonify({'success': False, 'error': 'No selected file'})
        
        if file and allowed_file(file.filename):
            # Read image file
            file_bytes = np.frombuffer(file.read(), np.uint8)
            img = cv2.imdecode(file_bytes, cv2.IMREAD_COLOR)
            
            if img is None:
                return jsonify({'success': False, 'error': 'Failed to read image file'})
            
            # Save original image
            filename = secure_filename(file.filename)
            original_path = os.path.join(app.config['UPLOAD_FOLDER'], 'original_' + filename)
            processed_path = os.path.join(app.config['UPLOAD_FOLDER'], 'processed_' + filename)
            
            cv2.imwrite(original_path, img)
            cv2.imwrite(processed_path, img)  # Initially save as original
            
            return jsonify({
                'success': True,
                'original_image': f'/static/uploads/original_{filename}',
                'processed_image': f'/static/uploads/processed_{filename}'
            })
        
        return jsonify({'success': False, 'error': 'Invalid file type'})
        
    except Exception as e:
        print(f"Error processing file: {str(e)}")
        return jsonify({'success': False, 'error': str(e)})

@app.route('/process', methods=['POST'])
def process_image():
    try:
        data = request.json
        filename = data['filename']
        process_type = data['process_type']
        
        # Read original image
        original_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        img = cv2.imread(original_path)
        
        if img is None:
            return jsonify({'success': False, 'error': 'Failed to read image'})
        
        # Process the image based on selected type
        if process_type == 'gamma':
            processed_img = apply_gamma_correction(img)
        elif process_type == 'skin':
            skin_model = data['skin_model']
            if skin_model not in SKIN_DETECTION_MODELS:
                return jsonify({'success': False, 'error': 'Invalid skin detection model'})
            processed_img = SKIN_DETECTION_MODELS[skin_model](img)
        else:  # color correction
            color_model = data['color_model']
            if color_model not in COLOR_CORRECTION_MODELS:
                return jsonify({'success': False, 'error': 'Invalid color correction model'})
            processed_img = COLOR_CORRECTION_MODELS[color_model](img)
        
        # Save processed image
        processed_path = os.path.join(app.config['UPLOAD_FOLDER'], 'processed_' + filename.replace('original_', ''))
        cv2.imwrite(processed_path, processed_img)
        
        return jsonify({
            'success': True,
            'processed_image': f'/static/uploads/processed_{filename.replace("original_", "")}'
        })
        
    except Exception as e:
        print(f"Error processing image: {str(e)}")
        return jsonify({'success': False, 'error': str(e)})

@app.route('/<path:filename>')
def serve_static(filename):
    try:
        # Check for js files
        if filename.startswith('js/'):
            return send_from_directory('.', filename)
        # Check for css files
        elif filename.startswith('css/'):
            return send_from_directory('.', filename)
        # Finally check in root directory
        return send_from_directory('.', filename)
    except Exception as e:
        print(f"Error serving {filename}: {str(e)}")
        return str(e), 404

if __name__ == '__main__':
    app.run(host='127.0.0.1', port=5000, debug=False, threaded=True) 