import cv2
import numpy as np
from SkinDetection import HSV_Model, RGB_Model, YCBCR_Model
from ThreeModels import (stretch_and_wp_correction, 
                        modified_gray_world_correction, 
                        white_patch_correction)

def print_instructions():
    print("\nControls:")
    print("Press 'h' for HSV skin model")
    print("Press 'r' for RGB skin model")
    print("Press 'y' for YCbCr skin model")
    print("\nPress '1' for Stretch and WP correction")
    print("Press '2' for Modified Gray World correction")
    print("Press '3' for White Patch correction")
    print("Press 'q' to quit")

def ensure_3channel_mask(mask):
    """Ensure mask is 3-channel BGR format"""
    if len(mask.shape) == 2:
        return cv2.cvtColor(mask, cv2.COLOR_GRAY2BGR)
    elif mask.shape[2] == 3:
        return mask
    else:
        return cv2.cvtColor(mask[:,:,0], cv2.COLOR_GRAY2BGR)

# Initialize models
skin_models = {
    ord('h'): ('HSV', HSV_Model),
    ord('r'): ('RGB', RGB_Model),
    ord('y'): ('YCbCr', YCBCR_Model)
}

color_models = {
    ord('1'): ('Stretch & WP', stretch_and_wp_correction),
    ord('2'): ('Gray World', modified_gray_world_correction),
    ord('3'): ('White Patch', white_patch_correction)
}

# Default models
current_skin_model = ('HSV', HSV_Model)
current_color_model = ('Stretch & WP', stretch_and_wp_correction)

# Initialize video capture
cap = cv2.VideoCapture(0)
cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)

if not cap.isOpened():
    print("Error: Could not open video capture")
    exit(0)

# Pre-define kernel for morphological operations
kernel = np.ones((3, 3), np.uint8)

# Create enhanced background subtractor
backSub = cv2.createBackgroundSubtractorKNN(
    history=500,
    dist2Threshold=400.0,
    detectShadows=True
)

print_instructions()

while True:
    success, frame = cap.read()
    if not success:
        print("Error: Could not read frame")
        break

    # Apply color correction
    corrected_frame = current_color_model[1](frame)

    # Get skin detection masks
    skin_mask_original = current_skin_model[1](frame)
    skin_mask_corrected = current_skin_model[1](corrected_frame)
    
    # Ensure masks are in correct format for background subtraction
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

    # Ensure masks are 3-channel for display and text
    skin_mask_original = ensure_3channel_mask(skin_mask_original)
    skin_mask_corrected = ensure_3channel_mask(skin_mask_corrected)
    skin_mask_corrected_sub = ensure_3channel_mask(skin_mask_corrected_sub)

    # Add model names to display
    cv2.putText(skin_mask_original, f"Skin: {current_skin_model[0]}", 
                (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 0), 2)
    cv2.putText(skin_mask_corrected, f"Color: {current_color_model[0]}", 
                (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 0), 2)

    cv2.imshow("Skin Detection Original", skin_mask_original)
    cv2.imshow("Skin Detection Corrected", skin_mask_corrected)
    cv2.imshow("Skin Detection Corrected Sub", skin_mask_corrected_sub)

    key = cv2.waitKey(1) & 0xFF
    
    # Handle model selection
    if key in skin_models:
        current_skin_model = skin_models[key]
        print(f"\nSwitched to {current_skin_model[0]} skin model")
    elif key in color_models:
        current_color_model = color_models[key]
        print(f"\nSwitched to {current_color_model[0]} color correction")
    elif key == ord('q'):
        break
    elif key != 255:  # If any other key was pressed
        print_instructions()

cap.release()
cv2.destroyAllWindows()

