// Global variables that will be accessible to both files
window.isProcessing = false;
window.animationFrameId = null;
window.videoStream = null;
window.cvLoaded = false; // Add flag to track OpenCV loading

let video = document.createElement("video");
let canvas = document.getElementById("inputVideo");
let context = canvas.getContext("2d", { willReadFrequently: true });
let skinMaskCanvas = document.getElementById("skinMask");
let skinMaskContext = skinMaskCanvas.getContext("2d", {
  willReadFrequently: true,
});

// Set up video and canvas dimensions
const width = 640;
const height = 480;
video.width = width;
video.height = height;
canvas.width = width;
canvas.height = height;
skinMaskCanvas.width = width;
skinMaskCanvas.height = height;

// Make functions globally accessible
window.startVideoStream = function () {
  if (!window.videoStream) {
    navigator.mediaDevices
      .getUserMedia({ video: true })
      .then(function (stream) {
        window.videoStream = stream;
        video.srcObject = stream;
        video.play();

        // Start continuous video drawing
        function drawVideo() {
          if (window.videoStream) {
            context.drawImage(video, 0, 0, width, height);
            if (window.isProcessing && window.cvLoaded) {
              try {
                // Create OpenCV matrices
                let src = cv.imread(canvas);
                let dst = new cv.Mat(height, width, cv.CV_8UC1);

                // Apply color correction if enabled
                if (
                  window.colorCorrection &&
                  window.colorCorrection.isProcessing
                ) {
                  let corrected = new cv.Mat();
                  window.colorCorrection.processFrame();
                  cv.imread(window.colorCorrection.canvasOutput, corrected);
                  src = corrected;
                }

                // Apply selected skin detection model
                switch (currentSkinModel) {
                  case "rgb":
                    RGBModel(src, dst);
                    break;
                  case "hsv":
                    HSVModel(src, dst);
                    break;
                  case "ycbcr":
                    YCbCrModel(src, dst);
                    break;
                  default:
                    HSVModel(src, dst);
                }

                // Show result
                cv.imshow(skinMaskCanvas, dst);

                // Clean up
                src.delete();
                dst.delete();
              } catch (err) {
                console.error("Error in skin detection processing:", err);
              }
            }
            window.animationFrameId = requestAnimationFrame(drawVideo);
          }
        }
        drawVideo();
      })
      .catch(function (err) {
        console.error("Error accessing webcam:", err);
      });
  }
};

// Make toggleProcessing globally accessible
window.toggleProcessing = function () {
  const startBtn = document.getElementById("startBtn");
  const videoOutput = document.getElementById("video-output");
  const inputVideo = document.getElementById("inputVideo");
  const skinMask = document.getElementById("skinMask");

  // Toggle the processing state
  window.isProcessing = !window.isProcessing;

  if (window.isProcessing) {
    // Clear video output
    videoOutput.innerHTML = "";

    // Create split container
    const splitContainer = document.createElement("div");
    splitContainer.className = "split-container";

    // Create original video view
    const originalView = document.createElement("div");
    originalView.className = "video-view";
    const originalLabel = document.createElement("div");
    originalLabel.className = "video-label";
    originalLabel.textContent = "Original";

    // Create input canvas if it doesn't exist
    if (!inputVideo) {
      const newInputVideo = document.createElement("canvas");
      newInputVideo.id = "inputVideo";
      newInputVideo.width = width;
      newInputVideo.height = height;
      originalView.appendChild(originalLabel);
      originalView.appendChild(newInputVideo);
    } else {
      originalView.appendChild(originalLabel);
      originalView.appendChild(inputVideo);
    }

    // Create processed video view
    const processedView = document.createElement("div");
    processedView.className = "video-view";
    const processedLabel = document.createElement("div");
    processedLabel.className = "video-label";
    processedLabel.textContent = "Skin Detection";

    // Create skin mask canvas if it doesn't exist
    if (!skinMask) {
      const newSkinMask = document.createElement("canvas");
      newSkinMask.id = "skinMask";
      newSkinMask.width = width;
      newSkinMask.height = height;
      processedView.appendChild(processedLabel);
      processedView.appendChild(newSkinMask);
    } else {
      processedView.appendChild(processedLabel);
      processedView.appendChild(skinMask);
    }

    // Show canvases
    if (inputVideo) {
      inputVideo.style.display = "block";
    }
    if (skinMask) {
      skinMask.style.display = "block";
    }

    // Add views to container
    splitContainer.appendChild(originalView);
    splitContainer.appendChild(processedView);
    videoOutput.appendChild(splitContainer);

    // Start video stream
    window.startVideoStream();

    // Update button state
    if (startBtn) {
      startBtn.innerHTML = '<i class="fas fa-stop"></i>';
      startBtn.title = "Stop";
    }
  } else {
    // Stop video stream
    if (window.videoStream) {
      window.videoStream.getTracks().forEach((track) => track.stop());
      window.videoStream = null;
    }

    // Cancel animation frame
    if (window.animationFrameId) {
      cancelAnimationFrame(window.animationFrameId);
      window.animationFrameId = null;
    }

    // Clear video output
    videoOutput.innerHTML = "";

    // Update button state
    if (startBtn) {
      startBtn.innerHTML = '<i class="fas fa-play"></i>';
      startBtn.title = "Start";
    }
  }
};

// Add a new function to handle stopping
function stopProcessing() {
  const videoOutput = document.getElementById("video-output");
  const inputVideo = document.getElementById("inputVideo");
  const skinMask = document.getElementById("skinMask");
  const startBtn = document.getElementById("startBtn");
  const pauseBtn = document.getElementById("pauseBtn");
  const stopBtn = document.getElementById("stopBtn");

  // Clear video output
  videoOutput.innerHTML = "";

  // Hide canvases
  inputVideo.style.display = "none";
  skinMask.style.display = "none";

  // Stop video stream
  if (window.videoStream) {
    window.videoStream.getTracks().forEach((track) => track.stop());
    window.videoStream = null;
  }

  // Cancel animation frame
  if (window.animationFrameId) {
    cancelAnimationFrame(window.animationFrameId);
    window.animationFrameId = null;
  }

  // Clear canvases
  const inputCtx = inputVideo.getContext("2d");
  const maskCtx = skinMask.getContext("2d");
  if (inputCtx && maskCtx) {
    inputCtx.clearRect(0, 0, inputVideo.width, inputVideo.height);
    maskCtx.clearRect(0, 0, skinMask.width, skinMask.height);
  }

  // Reset button states
  startBtn.disabled = false;
  pauseBtn.disabled = true;
  stopBtn.disabled = true;

  // Reset processing state
  window.isProcessing = false;
}

// Add stop button handler
document.getElementById("stopBtn").addEventListener("click", function () {
  stopProcessing();
});

// Replace it with direct DOM access if needed
let currentModel = "RGB"; // Default model

document.addEventListener("DOMContentLoaded", function () {
  // DOM Elements
  const textInput = document.getElementById("text-input");
  const videoOutput = document.getElementById("video-output");
  const startBtn = document.getElementById("startBtn");
  const pauseBtn = document.getElementById("pauseBtn");
  const stopBtn = document.getElementById("stopBtn");
  const muteBtn = document.getElementById("muteBtn");
  const sidebarItems = document.querySelectorAll(".sidebar-menu-item");

  // State
  // let isPlaying = false;
  // let isMuted = false;

  // // Define functions first
  // function startTranslation() {
  //   if (!textInput.value.trim()) {
  //     console.log("No text to translate");
  //     return;
  //   }
  //   isPlaying = true;
  //   startBtn.disabled = true;
  //   pauseBtn.disabled = false;
  //   stopBtn.disabled = false;
  //   document.body.classList.add("recording");

  //   console.log("Starting WebCam...");
  // }

  // function pauseTranslation() {
  //   isPlaying = false;
  //   startBtn.disabled = false;
  //   pauseBtn.disabled = true;

  //   // Here you would typically pause your translation animation/video
  //   console.log("Pausing translation...");
  // }

  // function stopTranslation() {
  //   isPlaying = false;
  //   startBtn.disabled = false;
  //   pauseBtn.disabled = true;
  //   stopBtn.disabled = true;
  //   textInput.value = "";
  //   document.body.classList.remove("recording");

  //   console.log("Stopping WebCam...");
  // }

  // function toggleMute() {
  //   isMuted = !isMuted;
  //   muteBtn.innerHTML = isMuted
  //     ? '<i class="fas fa-volume-mute"></i>'
  //     : '<i class="fas fa-volume-up"></i>';

  //   // Here you would typically mute/unmute your video/audio
  //   console.log("Toggle mute:", isMuted);
  // }

  // Then add event listeners
  // startBtn.addEventListener("click", startTranslation);
  // pauseBtn.addEventListener("click", pauseTranslation);
  // stopBtn.addEventListener("click", stopTranslation);
  // muteBtn.addEventListener("click", toggleMute);

  // Sidebar navigation
  sidebarItems.forEach((item) => {
    item.addEventListener("click", () => {
      sidebarItems.forEach((i) => {
        i.classList.remove("active");
        i.style.transform = "translateX(0)";
      });
      item.classList.add("active");
      item.style.transform = "translateX(5px)";
    });
  });

  // Text input handler with debounce
  let timeout;
  textInput.addEventListener("input", () => {
    clearTimeout(timeout);
    timeout = setTimeout(() => {
      // Here you would typically send the text to your translation API
      console.log("Text to translate:", textInput.value);
    }, 500);
  });

  // Add this variable at the top level to store the current media
  let currentMedia = null;

  // Modify the handleFileUpload function to store the uploaded file
  function handleFileUpload(file, type) {
    const videoOutput = document.getElementById("video-output");
    videoOutput.innerHTML = "";
    currentMedia = { file, type }; // Store the current media

    try {
      if (type === "video") {
        const video = document.createElement("video");
        video.style.width = "100%";
        video.style.height = "100%";
        video.style.borderRadius = "16px";
        video.style.objectFit = "cover";
        video.controls = true;
        video.autoplay = false;

        const fileURL = URL.createObjectURL(file);
        video.src = fileURL;

        video.onerror = function () {
          console.error("Error loading video");
          videoOutput.innerHTML = "Error loading video";
        };

        video.onloadeddata = function () {
          console.log("Video loaded successfully");
        };

        videoOutput.appendChild(video);
      } else if (type === "image") {
        const img = document.createElement("img");
        img.style.width = "100%";
        img.style.height = "100%";
        img.style.borderRadius = "16px";
        img.style.objectFit = "cover";

        const fileURL = URL.createObjectURL(file);
        img.src = fileURL;

        img.onerror = function () {
          console.error("Error loading image");
          videoOutput.innerHTML = "Error loading image";
        };

        img.onload = function () {
          console.log("Image loaded successfully");
        };

        videoOutput.appendChild(img);
      }
    } catch (error) {
      console.error("Error handling file upload:", error);
      videoOutput.innerHTML = "Error uploading file";
    }
  }

  // Get file input elements
  const videoInput = document.querySelector('input[accept="video/*"]');
  const imageInput = document.querySelector('input[accept="image/*"]');

  // Add event listeners for file inputs
  if (videoInput) {
    videoInput.addEventListener("change", function (e) {
      console.log("Video input change detected");
      const file = e.target.files[0];
      if (file) {
        console.log("Video file selected:", file.name);
        handleFileUpload(file, "video");
      }
    });
  } else {
    console.error("Video input element not found");
  }

  if (imageInput) {
    imageInput.addEventListener("change", function (e) {
      console.log("Image input change detected");
      const file = e.target.files[0];
      if (file) {
        console.log("Image file selected:", file.name);
        handleFileUpload(file, "image");
      }
    });
  } else {
    console.error("Image input element not found");
  }

  // Make the upload options clickable
  const uploadOptions = document.querySelectorAll(".upload-option");
  uploadOptions.forEach((option) => {
    option.addEventListener("click", function () {
      const input = this.querySelector('input[type="file"]');
      if (input) {
        input.click();
      }
    });
  });

  // Add CSS styles to video output
  document.getElementById("video-output").style.cssText = `
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(0, 0, 0, 0.1);
    border-radius: 16px;
    overflow: hidden;
  `;

  // Get the color correction button
  const colorCorrectionBtn = document.querySelector(
    ".sidebar-menu-item:nth-child(2)"
  );
  let isVideoSplit = false;

  // Modify createSplitView to use the stored media
  function createSplitView() {
    if (!currentMedia) {
      console.error("No media uploaded yet");
      return;
    }

    const videoOutput = document.getElementById("video-output");
    videoOutput.innerHTML = "";

    const splitContainer = document.createElement("div");
    splitContainer.className = "split-container";

    const originalView = document.createElement("div");
    originalView.className = "video-view";

    const processedView = document.createElement("div");
    processedView.className = "video-view";

    if (currentMedia.type === "video") {
      // Original video
      const video1 = document.createElement("video");
      video1.src = URL.createObjectURL(currentMedia.file);
      video1.style.cssText = `
        width: 100%;
        height: 100%;
        object-fit: contain;
        display: block;
      `;
      video1.controls = true;
      video1.load();
      originalView.appendChild(video1);

      // Create canvases for processing
      const processCanvas = document.createElement("canvas");
      processCanvas.width = width;
      processCanvas.height = height;
      const processCtx = processCanvas.getContext("2d", {
        willReadFrequently: true,
      });

      const skinMaskCanvas = document.createElement("canvas");
      skinMaskCanvas.width = width;
      skinMaskCanvas.height = height;
      skinMaskCanvas.style.cssText = `
        width: 100%;
        height: 100%;
        object-fit: contain;
        display: block;
      `;
      processedView.appendChild(skinMaskCanvas);

      video1.addEventListener("play", function () {
        function processFrame() {
          if (!video1.paused && !video1.ended) {
            processCtx.drawImage(video1, 0, 0, width, height);

            try {
              let src = new cv.Mat(height, width, cv.CV_8UC4);
              src.data.set(processCtx.getImageData(0, 0, width, height).data);
              let dst = new cv.Mat(height, width, cv.CV_8UC1);

              // Convert RGBA to BGR first
              cv.cvtColor(src, src, cv.COLOR_RGBA2BGR);

              // Now process with HSV model
              HSVModel(src, dst);

              // Show result
              cv.imshow(skinMaskCanvas, dst);

              // Clean up
              src.delete();
              dst.delete();
            } catch (err) {
              console.error("Error processing video frame:", err);
            }
          }
          requestAnimationFrame(processFrame);
        }
        processFrame();
      });

      // Start playing the video
      video1.play();
    } else if (currentMedia.type === "image") {
      // Original image
      const img1 = document.createElement("img");
      img1.src = URL.createObjectURL(currentMedia.file);
      img1.style.cssText = `
        width: 100%;
        height: 100%;
        object-fit: contain;
        display: block;
      `;
      originalView.appendChild(img1);

      // Process image with skin detection
      const processCanvas = document.createElement("canvas");
      processCanvas.width = width;
      processCanvas.height = height;
      const processCtx = processCanvas.getContext("2d", {
        willReadFrequently: true,
      });

      const skinMaskCanvas = document.createElement("canvas");
      skinMaskCanvas.width = width;
      skinMaskCanvas.height = height;
      skinMaskCanvas.style.cssText = `
        width: 100%;
        height: 100%;
        object-fit: contain;
        display: block;
      `;
      processedView.appendChild(skinMaskCanvas);

      img1.onload = function () {
        // Draw image to process canvas
        processCtx.drawImage(img1, 0, 0, width, height);

        try {
          // Create OpenCV matrices
          let src = new cv.Mat(height, width, cv.CV_8UC4);
          let dst = new cv.Mat(height, width, cv.CV_8UC1);

          // Get image data
          const imageData = processCtx.getImageData(0, 0, width, height);
          src.data.set(imageData.data);

          // Convert RGBA to BGR
          cv.cvtColor(src, src, cv.COLOR_RGBA2BGR);

          // Apply skin detection
          HSVModel(src, dst);

          // Display result on skinMaskCanvas
          cv.imshow(skinMaskCanvas, dst);

          // Clean up
          src.delete();
          dst.delete();
        } catch (err) {
          console.error("Error processing image:", err);
        }
      };
    }

    // Add labels
    const label1 = document.createElement("div");
    label1.textContent = "Original";
    label1.className = "video-label";
    originalView.appendChild(label1);

    const label2 = document.createElement("div");
    label2.textContent = "Skin Detection";
    label2.className = "video-label";
    processedView.appendChild(label2);

    splitContainer.appendChild(originalView);
    splitContainer.appendChild(processedView);
    videoOutput.appendChild(splitContainer);
  }

  // Handle color correction button click
  colorCorrectionBtn.addEventListener("click", function () {
    isVideoSplit = !isVideoSplit;

    // Toggle active state
    document.querySelectorAll(".sidebar-menu-item").forEach((item) => {
      item.classList.remove("active");
    });
    this.classList.add("active");

    if (isVideoSplit) {
      createSplitView();
    } else {
      // Restore original view
      const videoOutput = document.getElementById("video-output");
      const existingVideo = document.querySelector("video");
      if (existingVideo) {
        videoOutput.innerHTML = "";
        const video = existingVideo.cloneNode(true);
        video.style.width = "100%";
        video.style.height = "100%";
        video.style.objectFit = "cover";
        videoOutput.appendChild(video);
      }
    }
  });

  // Modify the handleFileUpload function to reset split view if active
  const originalHandleFileUpload = handleFileUpload;
  handleFileUpload = function (file, type) {
    isVideoSplit = false;
    document.querySelectorAll(".sidebar-menu-item").forEach((item) => {
      item.classList.remove("active");
    });
    document
      .querySelector(".sidebar-menu-item:first-child")
      .classList.add("active");
    originalHandleFileUpload(file, type);
  };
});

//////////////////// The Three Models

function HSVModel(src, dst) {
  try {
    let matSrc;

    // Check if src is a canvas element
    if (src instanceof HTMLCanvasElement) {
      // Get canvas context and image data
      const ctx = src.getContext("2d", { willReadFrequently: true });
      const imageData = ctx.getImageData(0, 0, src.width, src.height);
      matSrc = cv.matFromImageData(imageData);
    } else if (src instanceof cv.Mat) {
      matSrc = src;
    } else {
      console.error("Invalid source type for HSVModel");
      return;
    }

    // Create destination matrix if not provided
    let dstMat = dst instanceof cv.Mat ? dst : new cv.Mat();
    let hsvMat = new cv.Mat();

    // Convert to HSV color space
    cv.cvtColor(matSrc, hsvMat, cv.COLOR_RGBA2RGB);
    cv.cvtColor(hsvMat, hsvMat, cv.COLOR_RGB2HSV);

    // Define skin color range in HSV
    let low = new cv.Mat(
      hsvMat.rows,
      hsvMat.cols,
      hsvMat.type(),
      [0, 20, 70, 0]
    );
    let high = new cv.Mat(
      hsvMat.rows,
      hsvMat.cols,
      hsvMat.type(),
      [20, 255, 255, 255]
    );

    // Create binary mask for skin color
    cv.inRange(hsvMat, low, high, dstMat);

    // Apply morphological operations
    let kernel = cv.Mat.ones(5, 5, cv.CV_8U);
    cv.morphologyEx(
      dstMat,
      dstMat,
      cv.MORPH_OPEN,
      kernel,
      new cv.Point(-1, -1),
      2
    );
    cv.morphologyEx(
      dstMat,
      dstMat,
      cv.MORPH_CLOSE,
      kernel,
      new cv.Point(-1, -1),
      2
    );

    // If dst is a canvas element, show the result
    if (dst instanceof HTMLCanvasElement) {
      cv.imshow(dst, dstMat);
    }

    // Clean up
    if (!(src instanceof cv.Mat)) {
      matSrc.delete();
    }
    if (!(dst instanceof cv.Mat)) {
      dstMat.delete();
    }
    hsvMat.delete();
    low.delete();
    high.delete();
    kernel.delete();
  } catch (err) {
    console.error("Error in HSVModel:", err);
  }
}

// Add this new function alongside your other skin detection models
function RGBModel(src, dst) {
  try {
    if (!(src instanceof cv.Mat)) {
      console.error("Source must be an OpenCV Mat");
      return;
    }

    // Convert RGBA to BGR if needed
    let bgrMat = new cv.Mat();
    if (src.channels() === 4) {
      cv.cvtColor(src, bgrMat, cv.COLOR_RGBA2BGR);
    } else {
      src.copyTo(bgrMat);
    }

    // Create mask
    let mask = new cv.Mat();
    let low = new cv.Mat(
      bgrMat.rows,
      bgrMat.cols,
      bgrMat.type(),
      [20, 40, 95, 0]
    );
    let high = new cv.Mat(
      bgrMat.rows,
      bgrMat.cols,
      bgrMat.type(),
      [255, 255, 255, 255]
    );

    // Create skin mask using color thresholding
    cv.inRange(bgrMat, low, high, mask);

    // Apply morphological operations
    let kernel = cv.Mat.ones(3, 3, cv.CV_8U);
    cv.morphologyEx(mask, dst, cv.MORPH_OPEN, kernel);
    cv.morphologyEx(dst, dst, cv.MORPH_CLOSE, kernel);

    // Clean up
    bgrMat.delete();
    mask.delete();
    low.delete();
    high.delete();
    kernel.delete();
  } catch (err) {
    console.error("Error in RGBModel:", err);
  }
}

// Add this new function alongside your other skin detection models
function YCbCrModel(src, dst) {
  try {
    if (!(src instanceof cv.Mat)) {
      console.error("Source must be an OpenCV Mat");
      return;
    }

    // Convert RGBA to BGR first
    let bgrMat = new cv.Mat();
    cv.cvtColor(src, bgrMat, cv.COLOR_RGBA2BGR);

    // Convert BGR to YCrCb
    let ycrcbMat = new cv.Mat();
    cv.cvtColor(bgrMat, ycrcbMat, cv.COLOR_BGR2YCrCb);

    // Create matrices for thresholding with same size and type as ycrcbMat
    let low = new cv.Mat(
      ycrcbMat.rows,
      ycrcbMat.cols,
      ycrcbMat.type(),
      [0, 138, 60, 100]
    );
    let high = new cv.Mat(
      ycrcbMat.rows,
      ycrcbMat.cols,
      ycrcbMat.type(),
      [255, 173, 127, 255]
    );

    // Create skin mask
    let mask = new cv.Mat();
    cv.inRange(ycrcbMat, low, high, mask);

    // Create kernel for morphological operations
    let kernel = cv.Mat.ones(3, 3, cv.CV_8U);

    // Apply morphological operations
    let temp = new cv.Mat();
    cv.morphologyEx(mask, temp, cv.MORPH_OPEN, kernel);
    cv.morphologyEx(temp, dst, cv.MORPH_CLOSE, kernel);

    // Clean up
    bgrMat.delete();
    ycrcbMat.delete();
    mask.delete();
    low.delete();
    high.delete();
    kernel.delete();
    temp.delete();
  } catch (err) {
    console.error("Error in YCbCrModel:", err);
    throw err; // Re-throw to see the full error in console
  }
}
