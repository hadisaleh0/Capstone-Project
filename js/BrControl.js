// class BrightnessControl {
//   constructor() {
//     this.alpha = 1.0; // Contrast control (1.0-3.0)
//     this.beta = 0; // Brightness control (0-100)
//     this.isProcessing = false;
//     this.videoElement = null;
//     this.canvasInput = null;
//     this.canvasOutput = null;
//   }

//   initialize(videoElement, canvasInput, canvasOutput) {
//     this.videoElement = videoElement;
//     this.canvasInput = canvasInput;
//     this.canvasOutput = canvasOutput;

//     // Set initial dimensions for video and canvases
//     this.videoElement.width = 320;
//     this.videoElement.height = 240;
//     this.canvasOutput.width = 320;
//     this.canvasOutput.height = 240;
//   }

//   setControls(alpha, beta) {
//     // Validate and set contrast (alpha)
//     if (alpha >= 1.0 && alpha <= 3.0) {
//       this.alpha = alpha;
//     }

//     // Validate and set brightness (beta)
//     if (beta >= 0 && beta <= 100) {
//       this.beta = beta;
//     }
//   }

//   startProcessing() {
//     if (!this.isProcessing) {
//       this.isProcessing = true;
//       this.processFrame();
//     }
//   }

//   stopProcessing() {
//     this.isProcessing = false;
//   }

//   processFrame() {
//     if (!this.isProcessing) {
//       return;
//     }

//     // Request next frame
//     requestAnimationFrame(() => this.processFrame());

//     // Check if video is playing and OpenCV is loaded
//     if (!this.videoElement || !this.videoElement.videoWidth || !cv || !cv.Mat) {
//       return;
//     }

//     try {
//       // Get input canvas context and draw video frame
//       const ctxInput = this.canvasInput.getContext("2d");
//       this.canvasInput.width = 320;
//       this.canvasInput.height = 240;
//       ctxInput.drawImage(this.videoElement, 0, 0, 320, 240);

//       // Convert canvas to Mat
//       let src = cv.imread(this.canvasInput);
//       let dst = new cv.Mat();

//       // Apply brightness and contrast adjustment
//       src.convertTo(dst, -1, this.alpha, this.beta);

//       // Display result on output canvas
//       cv.imshow(this.canvasOutput, dst);

//       // Clean up
//       src.delete();
//       dst.delete();
//     } catch (err) {
//       console.error("Error in brightness control processing:", err);
//     }
//   }
// }

// // Export the class
// window.BrightnessControl = BrightnessControl;
