// Color Correction using OpenCV.js

class ColorCorrection {
  constructor(notificationCallback) {
    this.isProcessing = false;
    this.currentMethod = "none";
    this.videoElement = null;
    this.canvasInput = null;
    this.canvasOutput = null;
    this.processingError = false;
    this.showNotification = notificationCallback || console.log; // Fallback to console.log if no callback provided
    this.isPaused = false; // Add this
    this.originalVideo = null; // Add this to store original video
  }

  initialize(videoElement, canvasInput, canvasOutput) {
    this.videoElement = videoElement;
    this.canvasInput = canvasInput;
    this.canvasOutput = canvasOutput;

    // Set default dimensions
    const defaultWidth = 640;
    const defaultHeight = 480;

    // Set initial dimensions
    this.canvasInput.width = defaultWidth;
    this.canvasInput.height = defaultHeight;
    this.canvasOutput.width = defaultWidth;
    this.canvasOutput.height = defaultHeight;

    // Reset error state
    this.processingError = false;
  }

  setMethod(method) {
    this.currentMethod = method;

    // If we're currently processing, apply the new method immediately
    if (this.isProcessing && this.canvasInput) {
      try {
        let src = cv.imread(this.canvasInput);
        let dst = new cv.Mat();

        // Apply selected color correction method
        switch (this.currentMethod) {
          case "stretch":
            ColorCorrection.stretchAndWPCorrection(src, dst);
            break;
          case "whitePatch":
            ColorCorrection.whitePatchCorrection(src, dst);
            break;
          case "grayWorld":
            ColorCorrection.modifiedGrayWorldCorrection(src, dst);
            break;
          default:
            src.copyTo(dst);
        }

        // Show corrected frame
        cv.imshow(this.canvasOutput, dst);

        // Clean up
        src.delete();
        dst.delete();
      } catch (err) {
        console.error("Error applying new method:", err);
      }
    }
  }

  startProcessing() {
    if (!this.isProcessing) {
      this.isProcessing = true;
      this.processingError = false;
      this.processFrame();
    }
  }

  stopProcessing() {
    this.isProcessing = false;
    if (this.videoElement) {
      this.videoElement.pause();
    }
    if (this.originalVideo) {
      this.originalVideo.pause();
    }
  }

  processFrame() {
    if (!this.isProcessing || this.processingError || this.isPaused) {
      return;
    }

    try {
      const ctx = this.canvasInput.getContext("2d");

      // Draw from appropriate video source
      const sourceVideo = this.originalVideo || this.videoElement;

      if (sourceVideo.readyState === sourceVideo.HAVE_ENOUGH_DATA) {
        // Update canvas dimensions if needed
        if (
          this.canvasInput.width !== sourceVideo.videoWidth ||
          this.canvasInput.height !== sourceVideo.videoHeight
        ) {
          this.canvasInput.width = sourceVideo.videoWidth;
          this.canvasInput.height = sourceVideo.videoHeight;
          this.canvasOutput.width = sourceVideo.videoWidth;
          this.canvasOutput.height = sourceVideo.videoHeight;
        }

        ctx.drawImage(
          sourceVideo,
          0,
          0,
          this.canvasInput.width,
          this.canvasInput.height
        );

        // Process frames
        let src = cv.imread(this.canvasInput);
        let dst = new cv.Mat();

        // Get the current color correction model from settings
        const colorModel = localStorage.getItem("colorModel") || "none";

        // Apply selected color correction method
        switch (colorModel) {
          case "stretch":
            ColorCorrection.stretchAndWPCorrection(src, dst);
            break;
          case "whitePatch":
            ColorCorrection.whitePatchCorrection(src, dst);
            break;
          case "grayWorld":
            ColorCorrection.modifiedGrayWorldCorrection(src, dst);
            break;
          default:
            src.copyTo(dst);
        }

        // Show original frame
        cv.imshow(this.canvasInput, src);

        // Show corrected frame
        cv.imshow(this.canvasOutput, dst);

        // Clean up
        src.delete();
        dst.delete();
      }

      requestAnimationFrame(() => this.processFrame());
    } catch (err) {
      console.error("Error processing frame:", err);
      this.processingError = true;
      this.stopProcessing();
      this.showNotification("Error processing video frame");
    }
  }

  static stretchAndWPCorrection(src, dst) {
    try {
      // Split the image into channels
      let channels = new cv.MatVector();
      cv.split(src, channels);

      // Get individual channels
      let R = channels.get(0);
      let G = channels.get(1);
      let B = channels.get(2);

      // Apply histogram equalization to each channel
      cv.equalizeHist(R, R);
      cv.equalizeHist(G, G);
      cv.equalizeHist(B, B);

      // Find min values for each channel
      let R_min = cv.minMaxLoc(R).minVal;
      let G_min = cv.minMaxLoc(G).minVal;
      let B_min = cv.minMaxLoc(B).minVal;

      // Create matrices for shifted channels
      let R_new = new cv.Mat();
      let G_new = new cv.Mat();
      let B_new = new cv.Mat();

      // Shift channels by subtracting minimum values (using 4-channel scalar)
      cv.subtract(
        R,
        new cv.Mat(R.rows, R.cols, R.type(), [R_min, 0, 0, 0]),
        R_new
      );
      cv.subtract(
        G,
        new cv.Mat(G.rows, G.cols, G.type(), [G_min, 0, 0, 0]),
        G_new
      );
      cv.subtract(
        B,
        new cv.Mat(B.rows, B.cols, B.type(), [B_min, 0, 0, 0]),
        B_new
      );

      // Find max values for White Patch correction
      let R_max = cv.minMaxLoc(R_new).maxVal;
      let G_max = cv.minMaxLoc(G_new).maxVal;
      let B_max = cv.minMaxLoc(B_new).maxVal;

      // Apply White Patch correction
      let scale_R = 255 / R_max;
      let scale_G = 255 / G_max;
      let scale_B = 255 / B_max;

      // Apply scaling to each channel (using 4-channel scalar)
      cv.multiply(
        R_new,
        new cv.Mat(R_new.rows, R_new.cols, R_new.type(), [scale_R, 0, 0, 0]),
        R_new
      );
      cv.multiply(
        G_new,
        new cv.Mat(G_new.rows, G_new.cols, G_new.type(), [scale_G, 0, 0, 0]),
        G_new
      );
      cv.multiply(
        B_new,
        new cv.Mat(B_new.rows, B_new.cols, B_new.type(), [scale_B, 0, 0, 0]),
        B_new
      );

      // Merge channels
      let corrected = new cv.MatVector();
      corrected.push_back(R_new);
      corrected.push_back(G_new);
      corrected.push_back(B_new);

      // If source has alpha channel, add it
      if (src.channels() === 4) {
        let A = channels.get(3);
        corrected.push_back(A);
      }

      cv.merge(corrected, dst);

      // Clean up
      channels.delete();
      R.delete();
      G.delete();
      B.delete();
      R_new.delete();
      G_new.delete();
      B_new.delete();
      corrected.delete();
    } catch (err) {
      console.error("Error in stretchAndWPCorrection:", err);
    }
  }

  static modifiedGrayWorldCorrection(src, dst) {
    try {
      // Split the image into channels
      let channels = new cv.MatVector();
      cv.split(src, channels);

      // Get individual channels
      let R = channels.get(0);
      let G = channels.get(1);
      let B = channels.get(2);

      // Calculate mean for each channel
      let mean_R = cv.mean(R)[0];
      let mean_G = cv.mean(G)[0];
      let mean_B = cv.mean(B)[0];

      // Calculate dynamic value
      let dynamic_value = (mean_R + mean_G + mean_B) / 3;

      // Calculate scaling factors
      let scale_R = dynamic_value / mean_R;
      let scale_G = dynamic_value / mean_G;
      let scale_B = dynamic_value / mean_B;

      // Apply scaling to each channel
      cv.multiply(
        R,
        new cv.Mat(R.rows, R.cols, R.type(), [scale_R, 0, 0, 0]),
        R
      );
      cv.multiply(
        G,
        new cv.Mat(G.rows, G.cols, G.type(), [scale_G, 0, 0, 0]),
        G
      );
      cv.multiply(
        B,
        new cv.Mat(B.rows, B.cols, B.type(), [scale_B, 0, 0, 0]),
        B
      );

      // Merge channels
      let corrected = new cv.MatVector();
      corrected.push_back(R);
      corrected.push_back(G);
      corrected.push_back(B);
      cv.merge(corrected, dst);

      // Clean up
      channels.delete();
      R.delete();
      G.delete();
      B.delete();
      corrected.delete();
    } catch (err) {
      console.error("Error in modifiedGrayWorldCorrection:", err);
    }
  }

  static whitePatchCorrection(src, dst) {
    try {
      // Split the image into channels
      let channels = new cv.MatVector();
      cv.split(src, channels);

      // Get individual channels
      let R = channels.get(0);
      let G = channels.get(1);
      let B = channels.get(2);

      // Find max values for each channel
      let R_max = cv.minMaxLoc(R).maxVal;
      let G_max = cv.minMaxLoc(G).maxVal;
      let B_max = cv.minMaxLoc(B).maxVal;

      // Calculate scaling factors
      let scale_R = 255 / R_max;
      let scale_G = 255 / G_max;
      let scale_B = 255 / B_max;

      // Apply scaling to each channel (using 4-channel scalar)
      cv.multiply(
        R,
        new cv.Mat(R.rows, R.cols, R.type(), [scale_R, 0, 0, 0]),
        R
      );
      cv.multiply(
        G,
        new cv.Mat(G.rows, G.cols, G.type(), [scale_G, 0, 0, 0]),
        G
      );
      cv.multiply(
        B,
        new cv.Mat(B.rows, B.cols, B.type(), [scale_B, 0, 0, 0]),
        B
      );

      // Merge channels
      let corrected = new cv.MatVector();
      corrected.push_back(R);
      corrected.push_back(G);
      corrected.push_back(B);

      // If source has alpha channel, add it to the output
      if (src.channels() === 4) {
        let A = channels.get(3);
        corrected.push_back(A);
      }

      cv.merge(corrected, dst);

      // Clean up
      channels.delete();
      R.delete();
      G.delete();
      B.delete();
      corrected.delete();
    } catch (err) {
      console.error("Error in whitePatchCorrection:", err);
    }
  }

  // Method to handle uploaded video
  processUploadedVideo(videoUrl) {
    if (!this.videoElement || !this.canvasInput || !this.canvasOutput) {
      console.error("Components not properly initialized");
      return;
    }

    // Create and set up original video
    this.originalVideo = document.createElement("video");
    this.originalVideo.src = videoUrl;
    this.originalVideo.setAttribute("playsinline", "");

    // Set up the processed video
    this.videoElement.src = videoUrl;

    // Sync video loading
    Promise.all([
      new Promise((resolve) => (this.originalVideo.onloadedmetadata = resolve)),
      new Promise((resolve) => (this.videoElement.onloadedmetadata = resolve)),
    ]).then(() => {
      // Set canvas dimensions
      this.canvasInput.width = this.videoElement.videoWidth;
      this.canvasInput.height = this.videoElement.videoHeight;
      this.canvasOutput.width = this.videoElement.videoWidth;
      this.canvasOutput.height = this.videoElement.videoHeight;

      // Sync video playback
      this.originalVideo.play();
      this.videoElement.play();

      // Keep videos in sync
      this.videoElement.addEventListener("play", () => {
        this.originalVideo.currentTime = this.videoElement.currentTime;
        this.originalVideo.play();
      });

      this.videoElement.addEventListener("pause", () => {
        this.originalVideo.pause();
      });

      this.startProcessing();
    });

    // Handle video end
    this.videoElement.onended = () => {
      this.stopProcessing();
      this.videoElement.currentTime = 0;
      this.originalVideo.currentTime = 0;
    };
  }

  // Method to handle uploaded image
  processUploadedImage(imageUrl) {
    if (!this.canvasInput || !this.canvasOutput) {
      console.error("Components not properly initialized");
      return;
    }

    const img = new Image();
    img.crossOrigin = "anonymous"; // Handle cross-origin images

    img.onload = () => {
      // Set canvas dimensions to match image
      this.canvasInput.width = img.width;
      this.canvasInput.height = img.height;
      this.canvasOutput.width = img.width;
      this.canvasOutput.height = img.height;

      // Draw image and process
      const ctx = this.canvasInput.getContext("2d");
      ctx.drawImage(img, 0, 0, img.width, img.height);

      try {
        let src = cv.imread(this.canvasInput);
        let dst = new cv.Mat();

        // Apply color correction
        const colorModel = localStorage.getItem("colorModel") || "none";
        switch (colorModel) {
          case "stretch":
            ColorCorrection.stretchAndWPCorrection(src, dst);
            break;
          case "whitePatch":
            ColorCorrection.whitePatchCorrection(src, dst);
            break;
          case "grayWorld":
            ColorCorrection.modifiedGrayWorldCorrection(src, dst);
            break;
          default:
            src.copyTo(dst);
        }

        // Show original frame
        cv.imshow(this.canvasInput, src);
        cv.imshow(this.canvasOutput, dst);

        // Clean up
        src.delete();
        dst.delete();
      } catch (err) {
        console.error("Error processing image:", err);
      }
    };

    img.src = imageUrl;
  }
}

// Export the class
if (typeof module !== "undefined" && module.exports) {
  module.exports = ColorCorrection;
} else {
  window.ColorCorrection = ColorCorrection;
}
