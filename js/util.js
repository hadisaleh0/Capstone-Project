function isSkinPixelRGB(r, g, b) {
  r = parseInt(r);
  g = parseInt(g);
  b = parseInt(b);

  // Enhanced RGB rules
  return (
    // Basic RGB range check
    r > 95 &&
    g > 40 &&
    b > 20 &&
    // RGB max-min difference
    Math.max(r, g, b) - Math.min(r, g, b) > 15 &&
    // R > G > B rule for skin
    r > g &&
    g > b &&
    // Additional constraints
    Math.abs(r - g) > 15 &&
    r > 150 &&
    g > 110 &&
    b > 80 &&
    // Uniform illumination check
    Math.abs(r - g) <= 70
  );
}

function isSkinPixelHSV(h, s, v) {
  h = parseInt(h);
  s = parseInt(s);
  v = parseInt(v);

  // Enhanced HSV rules for OpenCV.js ranges
  // H: [0, 180], S: [0, 255], V: [0, 255]
  return (
    // Hue range for skin tones (0-50 in OpenCV's 0-180 range)
    h >= 0 &&
    h <= 50 &&
    // Saturation range (more precise than before)
    s >= 20 &&
    s <= 220 &&
    // Value range (adjusted for better lighting conditions)
    v >= 60 &&
    v <= 255 &&
    // Additional constraints for more accurate detection
    s > 0.1 * v && // Minimum saturation relative to value
    s < 0.9 * v // Maximum saturation relative to value
  );
}

function isSkinPixelYCbCr(y, cb, cr) {
  y = parseInt(y);
  cb = parseInt(cb);
  cr = parseInt(cr);

  // Enhanced YCbCr rules
  return (
    // Expanded Y (luminance) range
    y > 80 &&
    y <= 255 &&
    // Refined Cb (blue-difference chroma) range
    cb >= 80 &&
    cb <= 120 &&
    // Refined Cr (red-difference chroma) range
    cr >= 133 &&
    cr <= 173 &&
    // Additional constraints for better accuracy
    Math.abs(cb - cr) >= 15 && // Minimum difference between Cb and Cr
    cr > cb && // Cr should be greater than Cb for skin tones
    y > 0.3 * cr // Relationship between Y and Cr
  );
}

// // Add helper function for additional color space conversions if needed
// function rgbToHsv(r, g, b) {
//   r /= 255;
//   g /= 255;
//   b /= 255;

//   const max = Math.max(r, g, b);
//   const min = Math.min(r, g, b);
//   const diff = max - min;

//   let h = 0;
//   let s = max === 0 ? 0 : diff / max;
//   let v = max;

//   if (diff !== 0) {
//     switch (max) {
//       case r:
//         h = 60 * (((g - b) / diff) % 6);
//         break;
//       case g:
//         h = 60 * ((b - r) / diff + 2);
//         break;
//       case b:
//         h = 60 * ((r - g) / diff + 4);
//         break;
//     }
//   }

//   if (h < 0) h += 360;

//   // Convert to OpenCV ranges
//   h = h / 2; // Convert from [0,360] to [0,180]
//   s = s * 255; // Convert from [0,1] to [0,255]
//   v = v * 255; // Convert from [0,1] to [0,255]

//   return { h, s, v };
// }
