class BrightnessCorrection {
  constructor() {
    this.isProcessing = false;
    this.videoElement = null;
    this.canvasInput = null;
    this.canvasOutput = null;
    this.targetBrightness = 125; // Target mean brightness (0-255)
    this.adjustmentRate = 0.5; // Rate of adjustment (0-1)
  }

  initialize(videoElement, canvasInput, canvasOutput) {
    this.videoElement = videoElement;
    this.canvasInput = canvasInput;
    this.canvasOutput = canvasOutput;

    // Set initial dimensions
    this.videoElement.width = 480;
    this.videoElement.height = 400;
    this.canvasOutput.width = 480;
    this.canvasOutput.height = 400;
  }

  startProcessing() {
    if (!this.isProcessing) {
      this.isProcessing = true;
      this.processFrame();
    }
  }

  stopProcessing() {
    this.isProcessing = false;
  }

  calculateBrightness(mat) {
    // Convert to grayscale for brightness calculation
    let gray = new cv.Mat();
    cv.cvtColor(mat, gray, cv.COLOR_BGR2GRAY);

    // Calculate mean brightness
    let mean = cv.mean(gray);
    gray.delete();

    return mean[0]; // Return the mean brightness value
  }

  processFrame() {
    if (!this.isProcessing) {
      return;
    }

    requestAnimationFrame(() => this.processFrame());

    if (!this.videoElement || !this.videoElement.videoWidth || !cv || !cv.Mat) {
      return;
    }

    try {
      // Get input canvas context and draw video frame
      const ctxInput = this.canvasInput.getContext("2d");
      this.canvasInput.width = 480;
      this.canvasInput.height = 400;
      ctxInput.drawImage(this.videoElement, 0, 0, 480, 400);

      // Read image from canvas
      let src = cv.imread(this.canvasInput);
      let dst = new cv.Mat();

      // Convert from RGBA to BGR for OpenCV processing
      cv.cvtColor(src, dst, cv.COLOR_RGBA2BGR);

      // Calculate current brightness
      let currentBrightness = this.calculateBrightness(dst);

      // Calculate required adjustment
      let brightnessError = this.targetBrightness - currentBrightness;
      let beta = brightnessError * this.adjustmentRate;

      // Calculate alpha (contrast) based on image histogram
      let alpha = 1.0;

      // If image is too dark or too bright, adjust contrast
      if (Math.abs(brightnessError) > 50) {
        alpha = 1.0 + (Math.abs(brightnessError) / 255) * 0.5;
      }

      // Apply corrections
      let corrected = new cv.Mat();
      dst.convertTo(corrected, -1, alpha, beta);

      // Apply additional image enhancement
      let enhanced = new cv.Mat();
      cv.cvtColor(corrected, enhanced, cv.COLOR_BGR2Lab);

      // Split Lab channels
      let labPlanes = new cv.MatVector();
      cv.split(enhanced, labPlanes);

      // Enhance L channel (brightness)
      let L = labPlanes.get(0);
      cv.normalize(L, L, 0, 255, cv.NORM_MINMAX);

      // Merge channels back
      cv.merge(labPlanes, enhanced);

      // Convert back to BGR then RGBA for display
      cv.cvtColor(enhanced, enhanced, cv.COLOR_Lab2BGR);
      cv.cvtColor(enhanced, enhanced, cv.COLOR_BGR2RGBA);

      // Display result
      cv.imshow(this.canvasOutput, enhanced);

      // Clean up
      src.delete();
      dst.delete();
      corrected.delete();
      enhanced.delete();
      labPlanes.delete();
      L.delete();
    } catch (err) {
      console.error("Error in brightness correction processing:", err);
    }
  }

  setTargetBrightness(value) {
    // Allow adjustment of target brightness (0-255)
    if (value >= 0 && value <= 255) {
      this.targetBrightness = value;
    }
  }

  setAdjustmentRate(value) {
    // Allow adjustment of correction rate (0-1)
    if (value >= 0 && value <= 1) {
      this.adjustmentRate = value;
    }
  }
}

// Export the class
window.BrightnessCorrection = BrightnessCorrection;
