import numpy as np
import cv2

def calculate_gamma_value(image):
    # Calculate average luminance of the image
    luminance = np.mean(image)
    
    # Calculate gamma value based on luminance
    # Formula: GammaValue = 2.3204 - (0.00204 * ImageLuminance)
    gamma_value = 2.3204 - (0.00204 * luminance)
    
    # Clamp gamma value between 1.8 and 2.3
    gamma_value = np.clip(gamma_value, 1.8, 2.3)
    
    return gamma_value

def apply_gamma_correction(image):
    # Convert image to float32 for calculations
    image_float = image.astype(np.float32) / 255.0
    
    # Get gamma value based on image luminance
    gamma = calculate_gamma_value(image)
    
    # Apply gamma correction formula
    # I = pow((I/255), (1/gamma)) * 255
    corrected = np.power(image_float, 1/gamma) * 255.0
    
    # Convert back to uint8 and ensure values are in valid range
    corrected = np.clip(corrected, 0, 255).astype(np.uint8)
    
    return corrected