import cv2
import numpy as np

# Enhanced RGB thresholds
RGB_MIN = np.array([95, 40, 20])
RGB_MAX = np.array([255, 255, 255])

# Enhanced HSV thresholds with better coverage for different skin tones
HSV_MIN = np.array([0, 30, 50])   # Lowered saturation minimum for darker skin
HSV_MAX = np.array([35, 255, 255]) # Increased hue range
HSV_MIN2 = np.array([165, 30, 50])
HSV_MAX2 = np.array([180, 255, 255])

# Enhanced YCrCb thresholds
YCRCB_MIN = np.array([0, 133, 77])
YCRCB_MAX = np.array([255, 173, 127])

def RGB_Model(image):
    """Enhanced RGB skin detection with improved rules"""
    image_rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
    
    # Convert to float for better precision
    r = image_rgb[:,:,0].astype(float)
    g = image_rgb[:,:,1].astype(float)
    b = image_rgb[:,:,2].astype(float)
    
    # Normalize RGB values
    sum_rgb = r + g + b
    sum_rgb[sum_rgb == 0] = 1  # Avoid division by zero
    r_norm = r / sum_rgb
    g_norm = g / sum_rgb
    b_norm = b / sum_rgb
    
    # Enhanced RGB rules
    skin_mask = (
        (r > 95) & (g > 40) & (b > 20) &  # Basic RGB thresholds
        (r > g) & (r > b) &                # Red dominant
        (abs(r - g) > 15) &                # Red-green difference
        (r_norm > 0.35) &                  # Normalized red
        (g_norm < 0.35) &                  # Normalized green
        (b_norm < 0.30)                    # Normalized blue
    )
    
    return (skin_mask[:,:,np.newaxis] * 255).astype(np.uint8)

def HSV_Model(iamge):
    """Enhanced HSV skin detection with adaptive thresholding"""
    hsv = cv2.cvtColor(iamge, cv2.COLOR_BGR2HSV)
    
    # Create base masks for both ranges
    mask1 = cv2.inRange(hsv, HSV_MIN, HSV_MAX)
    mask2 = cv2.inRange(hsv, HSV_MIN2, HSV_MAX2)
    
    # Extract HSV channels
    h, s, v = cv2.split(hsv)
    
    # Additional HSV rules
    s_adapted = ((s > 30) & (s < 250))  # Saturation limits
    v_adapted = ((v > 50) & (v < 250))  # Value limits
    
    # Combine all rules
    combined_mask = (
        (mask1 | mask2) &                # Basic HSV ranges
        s_adapted &                      # Saturation rule
        v_adapted                        # Value rule
    )
    
    # Apply morphological operations for noise reduction
    kernel = np.ones((3,3), np.uint8)
    combined_mask = cv2.morphologyEx(combined_mask.astype(np.uint8), cv2.MORPH_OPEN, kernel)
    combined_mask = cv2.morphologyEx(combined_mask, cv2.MORPH_CLOSE, kernel)
    
    return cv2.cvtColor(combined_mask * 255, cv2.COLOR_GRAY2BGR)

def YCBCR_Model(image):
    """Enhanced YCbCr skin detection with additional rules"""
    ycrcb = cv2.cvtColor(image, cv2.COLOR_BGR2YCrCb)
    y, cr, cb = cv2.split(ycrcb)
    
    # Basic YCbCr mask
    mask = cv2.inRange(ycrcb, YCRCB_MIN, YCRCB_MAX)
    
    # Additional YCbCr rules
    y_mask = (y > 80) & (y < 250)    # Luminance constraints
    cb_mask = (cb > 77) & (cb < 127) # Blue difference constraints
    cr_mask = (cr > 133) & (cr < 173)# Red difference constraints
    
    # Combine rules
    combined_mask = (
        mask & 
        y_mask & 
        cb_mask & 
        cr_mask
    )
    
    # Remove noise and fill holes
    kernel = np.ones((3,3), np.uint8)
    combined_mask = cv2.morphologyEx(combined_mask.astype(np.uint8), cv2.MORPH_OPEN, kernel)
    combined_mask = cv2.morphologyEx(combined_mask, cv2.MORPH_CLOSE, kernel)
    
    return cv2.cvtColor(combined_mask * 255, cv2.COLOR_GRAY2BGR)