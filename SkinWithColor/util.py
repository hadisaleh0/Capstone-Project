import cv2
import numpy as np


def is_skin_pixel_RGB(r, g, b):
    r, g, b = int(r), int(g), int(b) 
    return (r > 220 and g > 210 and b > 170 and
            abs(r - g) <= 15 and b < r and b < g)

def is_skin_pixel_HSV(h, s, v):
    h, s, v = int(h), int(s), int(v)
    
    # Normalize hue to 0-360 range if needed
    h = h * 2 if h <= 180 else h  # Adjust if your hue range is 0-180
    
    # Primary skin tone detection
    is_skin_tone1 = (0 <= h <= 25 and 
                     20 <= s <= 220 and 
                     60 <= v <= 255)
    
    # Secondary skin tone detection
    is_skin_tone2 = (335 <= h <= 360 and 
                     20 <= s <= 220 and 
                     60 <= v <= 255)
    
    # Additional constraints
    valid_saturation = s >= 0.1 * v  # Saturation should be proportional to value
    not_too_dark = v >= 40
    not_too_saturated = s <= 0.8 * v  # Prevent overly saturated colors
    
    return (is_skin_tone1 or is_skin_tone2) and valid_saturation and not_too_dark and not_too_saturated

# def is_skin_pixel_HSV(h, s, v):
#     h, s, v  = int(h), int(s), int(v)  
#     return (0 < h < 20 and 30 < s < 150 and 80 < v < 255)

def is_skin_pixel_ycbcr(y, cb, cr):
    # More robust version with additional constraints
    return (
        80 <= y <= 235 and
        77 <= cb <= 127 and
        133 <= cr <= 173 and
        # Additional constraint for better accuracy
        abs(cr - cb) >= 20    # Ensures sufficient difference between Cr and Cb
    )



