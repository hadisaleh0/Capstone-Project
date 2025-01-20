
import pickle
import cv2
import mediapipe as mp
import numpy as np
from flask import Flask, Response, send_from_directory
from flask_cors import CORS

app = Flask(__name__, static_folder='projects/static')
CORS(app)

labels_dict = {0: 'A', 1: 'B', 2: 'L'}

def extract_features(hand_landmarks):
    # Your existing feature extraction code
    x_ = []
    y_ = []
    for landmark in hand_landmarks.landmark:
        x_.append(landmark.x)
        y_.append(landmark.y)
    
    min_x = min(x_)
    min_y = min(y_)
    
    features = []
    for landmark in hand_landmarks.landmark:
        features.extend([landmark.x - min_x, landmark.y - min_y])
    
    return features



def process_frame(frame, hands, model, mp_hands, mp_drawing):
    H, W, _ = frame.shape
    frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
    results = hands.process(frame_rgb)
    
    if results.multi_hand_landmarks and results.multi_handedness:
        # Make sure we have same number of landmarks and handedness classifications
        if len(results.multi_hand_landmarks) == len(results.multi_handedness):
            # Draw landmarks for all detected hands
            for idx, (hand_landmarks, handedness) in enumerate(zip(results.multi_hand_landmarks, results.multi_handedness)):
                # Get hand type
                hand_type = handedness.classification[0].label
                
                # Draw landmarks with different colors for each hand
                color = (0, 255, 0) if hand_type == "Left" else (255, 0, 0)
                mp_drawing.draw_landmarks(
                    frame,
                    hand_landmarks,
                    mp_hands.HAND_CONNECTIONS,
                    mp_drawing.DrawingSpec(color=color, thickness=2, circle_radius=2),
                    mp_drawing.DrawingSpec(color=color, thickness=2)
                )
                
                # Process only the right hand (appears as "Left" in mirrored view)
                if hand_type == "Left":
                    x_list = []
                    y_list = []
                    for landmark in hand_landmarks.landmark:
                        x_list.append(int(landmark.x * W))
                        y_list.append(int(landmark.y * H))
                        
                    x1 = min(x_list) - 20
                    y1 = min(y_list) - 20
                    x2 = max(x_list) + 20
                    y2 = max(y_list) + 20
                    
                    # Extract features and get prediction
                    features = extract_features(hand_landmarks)
                    prediction = model.predict([features])[0]
                    predicted_character = labels_dict[int(prediction)]
                    
                    # Draw bounding box and label for right hand only
                    cv2.rectangle(frame, (x1, y1), (x2, y2), (0, 0, 0), 4)
                    cv2.putText(
                        frame,
                        predicted_character,
                        (x1, y1 - 10),
                        cv2.FONT_HERSHEY_SIMPLEX,
                        1.3,
                        (0, 0, 0),
                        3,
                        cv2.LINE_AA
                    )
    
    return frame

def generate_frames():
    cap = cv2.VideoCapture(0)
    
    mp_hands = mp.solutions.hands
    mp_drawing = mp.solutions.drawing_utils
    hands = mp_hands.Hands(static_image_mode=False, max_num_hands=2,
                          min_detection_confidence=0.5)
    
    model_dict = pickle.load(open('C:/Users/admin/Desktop/sign-language-detector-python-Copy/model.p', 'rb'))
    model = model_dict['model']
    
    try:
        while True:
            success, frame = cap.read()
            if not success:
                break
                
            frame = process_frame(frame, hands, model, mp_hands, mp_drawing)
            
            ret, buffer = cv2.imencode('.jpg', frame)
            frame = buffer.tobytes()
            yield (b'--frame\r\n'
                   b'Content-Type: image/jpeg\r\n\r\n' + frame + b'\r\n')
    finally:
        cap.release()

@app.route('/')
def index():
    return send_from_directory('projects/static', 'live-detection.html')

@app.route('/video_feed')
def video_feed():
    return Response(generate_frames(),
                   mimetype='multipart/x-mixed-replace; boundary=frame')

if __name__ == '__main__':
    app.run(debug=True, port=5000)

