import warnings
warnings.filterwarnings('ignore', category=UserWarning, module='google.protobuf.symbol_database')

import cv2
import mediapipe as mp
import numpy as np
from sign_language_labels import SignLanguageLabels
import time
from flask import Flask, Response, send_from_directory, send_file
from flask_cors import CORS
from flask import Flask, render_template
import os



app = Flask(__name__, static_folder='projects/static')
CORS(app)

# labels_dict = {0: 'A', 1: 'B', 2: 'L'}

# def extract_features(hand_landmarks):
#     # Your existing feature extraction code
#     x_ = []
#     y_ = []
#     for landmark in hand_landmarks.landmark:
#         x_.append(landmark.x)
#         y_.append(landmark.y)
    
#     min_x = min(x_)
#     min_y = min(y_)
    
#     features = []
#     for landmark in hand_landmarks.landmark:
#         features.extend([landmark.x - min_x, landmark.y - min_y])
    
#     return features



# def process_frame(frame, hands, model, mp_hands, mp_drawing):
#     H, W, _ = frame.shape
#     frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
#     results = hands.process(frame_rgb)
    
#     if results.multi_hand_landmarks and results.multi_handedness:
#         # Make sure we have same number of landmarks and handedness classifications
#         if len(results.multi_hand_landmarks) == len(results.multi_handedness):
#             # Draw landmarks for all detected hands
#             for idx, (hand_landmarks, handedness) in enumerate(zip(results.multi_hand_landmarks, results.multi_handedness)):
#                 # Get hand type
#                 hand_type = handedness.classification[0].label
                
#                 # Draw landmarks with different colors for each hand
#                 color = (0, 255, 0) if hand_type == "Left" else (255, 0, 0)
#                 mp_drawing.draw_landmarks(
#                     frame,
#                     hand_landmarks,
#                     mp_hands.HAND_CONNECTIONS,
#                     mp_drawing.DrawingSpec(color=color, thickness=2, circle_radius=2),
#                     mp_drawing.DrawingSpec(color=color, thickness=2)
#                 )
                
#                 # Process only the right hand (appears as "Left" in mirrored view)
#                 if hand_type == "Left":
#                     x_list = []
#                     y_list = []
#                     for landmark in hand_landmarks.landmark:
#                         x_list.append(int(landmark.x * W))
#                         y_list.append(int(landmark.y * H))
                        
#                     x1 = min(x_list) - 20
#                     y1 = min(y_list) - 20
#                     x2 = max(x_list) + 20
#                     y2 = max(y_list) + 20
                    
#                     # Extract features and get prediction
#                     features = extract_features(hand_landmarks)
#                     prediction = model.predict([features])[0]
#                     predicted_character = labels_dict[int(prediction)]
                    
#                     # Draw bounding box and label for right hand only
#                     cv2.rectangle(frame, (x1, y1), (x2, y2), (0, 0, 0), 4)
#                     cv2.putText(
#                         frame,
#                         predicted_character,
#                         (x1, y1 - 10),
#                         cv2.FONT_HERSHEY_SIMPLEX,
#                         1.3,
#                         (0, 0, 0),
#                         3,
#                         cv2.LINE_AA
#                     )
    
#     return frame

def generate_frames():
    cap = cv2.VideoCapture(0)
    labels_handler = SignLanguageLabels(min_time_between_changes=0.5)
    model = labels_handler.model
    
    mp_hands = mp.solutions.hands
    mp_drawing = mp.solutions.drawing_utils
    mp_drawing_styles = mp.solutions.drawing_styles
    hands = mp_hands.Hands(static_image_mode=True, min_detection_confidence=0.3)

    # For tracking label changes
    label_sequence = []  # Store sequence of labels
    start_time = time.time()

    try:
        while True:
            data_aux = []
            x_ = []
            y_ = []

            success, frame = cap.read()
            if not success:
                break

            H, W, _ = frame.shape
            frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)

            results = hands.process(frame_rgb)
            if results.multi_hand_landmarks:
                for hand_landmarks in results.multi_hand_landmarks:
                    mp_drawing.draw_landmarks(
                        frame,
                        hand_landmarks,
                        mp_hands.HAND_CONNECTIONS,
                        mp_drawing_styles.get_default_hand_landmarks_style(),
                        mp_drawing_styles.get_default_hand_connections_style())

                for hand_landmarks in results.multi_hand_landmarks:
                    for i in range(len(hand_landmarks.landmark)):
                        x = hand_landmarks.landmark[i].x
                        y = hand_landmarks.landmark[i].y
                        x_.append(x)
                        y_.append(y)

                    for i in range(len(hand_landmarks.landmark)):
                        x = hand_landmarks.landmark[i].x
                        y = hand_landmarks.landmark[i].y
                        data_aux.append(x - min(x_))
                        data_aux.append(y - min(y_))

                x1 = int(min(x_) * W) - 10
                y1 = int(min(y_) * H) - 10
                x2 = int(max(x_) * W) - 10
                y2 = int(max(y_) * H) - 10

                data_aux = np.array(data_aux)
                normalized_data = labels_handler.normalize_input(data_aux)
                prediction = model.predict([normalized_data])
                
                # Get prediction and check if it's a label change
                last_label, is_change = labels_handler.process_prediction(prediction[0])
                
                if is_change:
                    label_sequence.append(last_label)
                
                # Draw sequence on frame
                sequence_str = ''.join(label_sequence)
                cv2.putText(frame, f"Sequence: {sequence_str}", (10, 60),
                           cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 2, cv2.LINE_AA)

            ret, buffer = cv2.imencode('.jpg', frame)
            frame = buffer.tobytes()
            yield (b'--frame\r\n'
                   b'Content-Type: image/jpeg\r\n\r\n' + frame + b'\r\n')
    finally:
        cap.release()


def test_realtime_labels():
    labels_handler = SignLanguageLabels(min_time_between_changes=0.5)
    model = labels_handler.model

    cap = cv2.VideoCapture(0)
    if not cap.isOpened():
        return

    mp_hands = mp.solutions.hands
    mp_drawing = mp.solutions.drawing_utils
    mp_drawing_styles = mp.solutions.drawing_styles
    hands = mp_hands.Hands(static_image_mode=True, min_detection_confidence=0.3)

    # For tracking label changes
    label_sequence = []  # Store sequence of labels
    start_time = time.time()

    while True:
        data_aux = []
        x_ = []
        y_ = []

        ret, frame = cap.read()
        if not ret:
            break

        H, W, _ = frame.shape
        frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)

        results = hands.process(frame_rgb)
        if results.multi_hand_landmarks:
            for hand_landmarks in results.multi_hand_landmarks:
                mp_drawing.draw_landmarks(
                    frame,
                    hand_landmarks,
                    mp_hands.HAND_CONNECTIONS,
                    mp_drawing_styles.get_default_hand_landmarks_style(),
                    mp_drawing_styles.get_default_hand_connections_style())

            for hand_landmarks in results.multi_hand_landmarks:
                for i in range(len(hand_landmarks.landmark)):
                    x = hand_landmarks.landmark[i].x
                    y = hand_landmarks.landmark[i].y
                    x_.append(x)
                    y_.append(y)

                for i in range(len(hand_landmarks.landmark)):
                    x = hand_landmarks.landmark[i].x
                    y = hand_landmarks.landmark[i].y
                    data_aux.append(x - min(x_))
                    data_aux.append(y - min(y_))

            x1 = int(min(x_) * W) - 10
            y1 = int(min(y_) * H) - 10
            x2 = int(max(x_) * W) - 10
            y2 = int(max(y_) * H) - 10

            data_aux = np.array(data_aux)
            normalized_data = labels_handler.normalize_input(data_aux)
            prediction = model.predict([normalized_data])
            
            # Add this debug line before prediction conversion
            raw_prediction = prediction[0]
            print(f"Raw prediction index: {raw_prediction}")
            
            # Get prediction and check if it's a label change
            last_label, is_change = labels_handler.process_prediction(prediction[0])
            
            # Only record when there's a label change
            if is_change:
                current_time = time.time() - start_time
                label_sequence.append(last_label)
                sequence_str = ''.join(label_sequence)  # Concatenate all labels
                print(f"Sequence: {sequence_str}")
            
            # Draw on frame
            cv2.rectangle(frame, (x1, y1), (x2, y2), (0, 0, 0), 4)
            cv2.putText(frame, last_label, (x1, y1 - 10), 
                       cv2.FONT_HERSHEY_SIMPLEX, 1.3, (0, 0, 0), 3, cv2.LINE_AA)

        # Add test duration and current sequence to frame
        cv2.putText(frame, f"Test Time: {time.time() - start_time:.1f}s", (10, 30), 
                   cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 0, 255), 2, cv2.LINE_AA)
        
        # Display current sequence on frame
        if label_sequence:
            sequence_str = ''.join(label_sequence)
            cv2.putText(frame, f"Sequence: {sequence_str}", (10, 60),
                       cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 0, 0), 2, cv2.LINE_AA)

        cv2.imshow('Sign Language Detection', frame)
        
        key = cv2.waitKey(1)
        if key == ord('q'):
            break
        elif key == ord('s'):
            # Save final sequence to file
            if label_sequence:
                with open('label_sequence.txt', 'w') as f:
                    final_sequence = ''.join(label_sequence)
                    f.write(f"Final Sequence: {final_sequence}\n")

    cap.release()
    cv2.destroyAllWindows()


@app.route('/')
def index():
    return send_from_directory('projects/static', 'live-detection.html')

@app.route('/<path:filename>')
def serve_static(filename):
    if os.path.exists(os.path.join('projects/static', filename)):
        return send_from_directory('projects/static', filename)
    return send_from_directory('.', filename)

@app.route('/video_feed')
def video_feed():
    return Response(generate_frames(),
                   mimetype='multipart/x-mixed-replace; boundary=frame')

if __name__ == '__main__':
    app.run(debug=True, port=5000)

