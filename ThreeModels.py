import cv2
import numpy as np

def stretch_and_wp_correction(frame):
    """Enhanced stretch and white patch correction with adaptive parameters"""
    # Convert to float32 for better precision
    frame_float = frame.astype(np.float32) / 255.0
    
    # Split the image into R, G, B channels
    b, g, r = cv2.split(frame_float)
    
    # Calculate adaptive parameters based on image statistics
    mean_intensity = np.mean(frame_float)
    std_intensity = np.std(frame_float)
    
    # Adaptive contrast stretching
    def adaptive_stretch(channel):
        # Calculate adaptive min-max values
        min_val = np.percentile(channel, 1)  # Use 1st percentile instead of min
        max_val = np.percentile(channel, 99)  # Use 99th percentile instead of max
        
        # Stretch the channel
        stretched = (channel - min_val) / (max_val - min_val + 1e-8)
        return np.clip(stretched, 0, 1)
    
    # Apply adaptive stretching to each channel
    r_stretched = adaptive_stretch(r)
    g_stretched = adaptive_stretch(g)
    b_stretched = adaptive_stretch(b)
    
    # Apply white patch correction with adaptive scaling
    max_r = np.percentile(r_stretched, 95)
    max_g = np.percentile(g_stretched, 95)
    max_b = np.percentile(b_stretched, 95)
    
    # Prevent division by zero
    eps = 1e-8
    r_final = r_stretched / (max_r + eps)
    g_final = g_stretched / (max_g + eps)
    b_final = b_stretched / (max_b + eps)
    
    # Merge channels and convert back to uint8
    corrected_frame = cv2.merge([b_final, g_final, r_final])
    corrected_frame = np.clip(corrected_frame * 255, 0, 255).astype(np.uint8)
    
    return corrected_frame

def modified_gray_world_correction(frame):
    """Enhanced gray world correction with local adaptation"""
    # Convert to float32
    frame_float = frame.astype(np.float32) / 300.0
    
    # Split channels
    b, g, r = cv2.split(frame_float)
    
    # Calculate local means using Gaussian blur
    kernel_size = int(min(frame.shape[0], frame.shape[1]) * 0.1) | 1  # Ensure odd
    r_local = cv2.GaussianBlur(r, (kernel_size, kernel_size), 0)
    g_local = cv2.GaussianBlur(g, (kernel_size, kernel_size), 0)
    b_local = cv2.GaussianBlur(b, (kernel_size, kernel_size), 0)
    
    # Calculate global means
    r_mean = np.mean(r)
    g_mean = np.mean(g)
    b_mean = np.mean(b)
    
    # Calculate target gray value (adaptive)
    gray_target = np.mean([r_mean, g_mean, b_mean])
    
    # Calculate adaptive scaling factors
    eps = 1e-8
    r_scale = gray_target / (r_local + eps)
    g_scale = gray_target / (g_local + eps)
    b_scale = gray_target / (b_local + eps)
    
    # Apply correction with local adaptation
    r_corrected = np.clip(r * r_scale, 0, 1)
    g_corrected = np.clip(g * g_scale, 0, 1)
    b_corrected = np.clip(b * b_scale, 0, 1)
    
    # Merge channels and convert back to uint8
    corrected_frame = cv2.merge([b_corrected, g_corrected, r_corrected])
    corrected_frame = (corrected_frame * 255).astype(np.uint8)
    
    return corrected_frame

def white_patch_correction(frame):
    """Enhanced white patch correction with highlight preservation"""
    # Convert to float32
    frame_float = frame.astype(np.float32) / 255.0
    
    # Split channels
    b, g, r = cv2.split(frame_float)
    
    # Find robust maximum values (95th percentile)
    max_r = np.percentile(r, 95)
    max_g = np.percentile(g, 95)
    max_b = np.percentile(b, 95)
    
    # Calculate illuminant estimation
    illuminant_r = max_r / max(max_r, max_g, max_b)
    illuminant_g = max_g / max(max_r, max_g, max_b)
    illuminant_b = max_b / max(max_r, max_g, max_b)
    
    # Apply correction with highlight preservation
    eps = 1e-8
    r_corrected = np.clip(r / (illuminant_r + eps), 0, 1)
    g_corrected = np.clip(g / (illuminant_g + eps), 0, 1)
    b_corrected = np.clip(b / (illuminant_b + eps), 0, 1)
    
    # Preserve highlights
    highlight_threshold = 0.95
    r_mask = r > highlight_threshold
    g_mask = g > highlight_threshold
    b_mask = b > highlight_threshold
    
    r_corrected[r_mask] = r[r_mask]
    g_corrected[g_mask] = g[g_mask]
    b_corrected[b_mask] = b[b_mask]
    
    # Merge channels and convert back to uint8
    corrected_frame = cv2.merge([b_corrected, g_corrected, r_corrected])
    corrected_frame = (corrected_frame * 255).astype(np.uint8)
    
    return corrected_frame