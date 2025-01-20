function onOpenCvReady() {
  // Set flag when OpenCV is loaded
  window.cvLoaded = true;
  console.log("OpenCV.js is ready");
}

window.isDarkMode = localStorage.getItem("theme") === "dark";
window.themeToggle = document.getElementById("themeToggle");

let currentSkinModel = "rgb";
let currentColorModel = "none";

let modal, closeBtn, saveBtn, skinModelSelect, colorModelSelect;

document.addEventListener("DOMContentLoaded", function () {
  // DOM Elements
  const textInput = document.getElementById("text-input");
  const videoOutput = document.getElementById("video-output");
  const startBtn = document.getElementById("startBtn");
  const pauseBtn = document.getElementById("pauseBtn");
  const stopBtn = document.getElementById("stopBtn");
  const muteBtn = document.getElementById("muteBtn");
  const sidebarItems = document.querySelectorAll(".sidebar-menu-item");
  const sidebar = document.querySelector(".sidebar");
  const sidebarLogo = document.querySelector(".sidebar-logo");

  // State
  let isPlaying = false;
  let isMuted = false;

  // Theme toggle functionality
  function applyTheme(isDark) {
    const theme = isDark ? "dark" : "light";
    const icon = isDark
      ? '<i class="fas fa-sun"></i>'
      : '<i class="fas fa-moon"></i>';

    // Apply theme to document
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("theme", theme);
    window.themeToggle.innerHTML = icon;

    // Update gradients based on theme
    if (isDark) {
      document.documentElement.style.setProperty(
        "--gradient-1",
        "var(--gradient-1-dark)"
      );
      document.documentElement.style.setProperty(
        "--gradient-2",
        "var(--gradient-2-dark)"
      );
      document.documentElement.style.setProperty(
        "--gradient-3",
        "var(--gradient-3-dark)"
      );
      document.documentElement.style.setProperty(
        "--gradient-4",
        "var(--gradient-4-dark)"
      );
    } else {
      document.documentElement.style.setProperty(
        "--gradient-1",
        "var(--gradient-1-light)"
      );
      document.documentElement.style.setProperty(
        "--gradient-2",
        "var(--gradient-2-light)"
      );
      document.documentElement.style.setProperty(
        "--gradient-3",
        "var(--gradient-3-light)"
      );
      document.documentElement.style.setProperty(
        "--gradient-4",
        "var(--gradient-4-light)"
      );
    }

    // Update background color
    document.body.style.background = isDark
      ? "linear-gradient(-45deg, #2c3e50, #34495e, #3498db, #2980b9)"
      : "linear-gradient(-45deg, #4ecdc4, #ff6b6b, #ffe66d, #6c5ce7)";

    // Update animations
    updateAnimations(isDark);
  }

  function toggleTheme() {
    window.isDarkMode = !window.isDarkMode;
    applyTheme(window.isDarkMode);
  }

  // Add click event listener to theme toggle button
  window.themeToggle.addEventListener("click", toggleTheme);

  // Initialize theme
  const savedTheme = localStorage.getItem("theme");
  if (savedTheme) {
    window.isDarkMode = savedTheme === "dark";
    toggleTheme();
  }

  // Event Listeners
  startBtn.addEventListener("click", startWebCam);
  pauseBtn.addEventListener("click", pauseTranslation);
  stopBtn.addEventListener("click", stopWebCam);
  muteBtn.addEventListener("click", toggleMute);

  // Translation functions
  function startWebCam() {
    isPlaying = true;
    startBtn.disabled = true;
    pauseBtn.disabled = false;
    stopBtn.disabled = false;
    document.body.classList.add("recording");

    console.log("Starting WebCam...");
  }

  function pauseTranslation() {
    isPlaying = false;
    startBtn.disabled = false;
    pauseBtn.disabled = true;

    console.log("Pausing WebCam...");
  }

  function stopWebCam() {
    isPlaying = false;
    startBtn.disabled = false;
    pauseBtn.disabled = true;
    stopBtn.disabled = true;
    textInput.value = "";
    document.body.classList.remove("recording");

    console.log("Stopping WebCam...");
  }

  function toggleMute() {
    isMuted = !isMuted;
    muteBtn.innerHTML = isMuted
      ? '<i class="fas fa-volume-mute"></i>'
      : '<i class="fas fa-volume-up"></i>';

    console.log("Toggle mute:", isMuted);
  }

  // Sidebar navigation with functionality
  sidebarItems.forEach((item) => {
    item.addEventListener("click", () => {
      // Remove active class from all items
      sidebarItems.forEach((i) => {
        i.classList.remove("active");
        i.style.transform = "translateX(0)";
      });

      // Add active class to clicked item
      item.classList.add("active");
      item.style.transform = "translateX(5px)";

      // Check which item was clicked
      const itemText = item.querySelector("span").textContent;
      const videoOutput = document.getElementById("video-output");

      // Handle different sidebar items
      switch (itemText) {
        case "Brightness Control":
          // Clear video output
          videoOutput.innerHTML = "";

          // Set video-output dimensions and center it
          videoOutput.style.width = "320px";
          videoOutput.style.height = "240px";
          videoOutput.style.minHeight = "unset";
          videoOutput.style.margin = "auto";
          videoOutput.style.position = "absolute";
          videoOutput.style.left = "50%";
          videoOutput.style.top = "50%";
          videoOutput.style.transform = "translate(-50%, -50%)";

          // Add container styles to center content
          const videoContainer = document.querySelector(".video-container");
          videoContainer.style.display = "block";
          videoContainer.style.position = "relative";
          videoContainer.style.minHeight = "400px";

          // Hide text input when in brightness control mode
          textInput.style.display = "none";

          // Initialize brightness correction if not already initialized
          if (!brightnessCorrection) {
            initializeBrightnessCorrection();
          } else {
            brightnessCorrection.startProcessing();
          }
          break;

        case "Color Correction":
          // Check if ColorCorrection is loaded
          if (typeof ColorCorrection === "undefined") {
            // Try to load ColorCorrection.js dynamically
            const script = document.createElement("script");
            script.src = "js/ColorCorrection.js";
            script.onload = () => {
              console.log("ColorCorrection.js loaded");
              handleColorCorrection(); // Call the handler after script loads
            };
            script.onerror = () => {
              console.error("Failed to load ColorCorrection.js");
              showNotification("Error: Failed to load color correction module");
            };
            document.head.appendChild(script);
            return;
          }

          // If webcam was previously stopped, reset colorCorrection instance
          if (!window.videoStream) {
            window.colorCorrection = null;
          }

          handleColorCorrection();
          break;

        case "Settings":
          // Show settings modal
          const modal = document.getElementById("settingsModal");
          modal.style.display = "block";
          break;

        case "Skin Detection":
          // Check if SkinDetection.js is loaded
          if (typeof window.RGBModel === "undefined") {
            // Try to load SkinDetection.js dynamically
            const script = document.createElement("script");
            script.src = "js/SkinDetection.js";
            script.onload = () => {
              console.log("SkinDetection.js loaded");
              handleSkinDetection(); // Call the handler after script loads
            };
            script.onerror = () => {
              console.error("Failed to load SkinDetection.js");
              showNotification("Error: Failed to load skin detection module");
            };
            document.head.appendChild(script);
            return;
          }

          handleSkinDetection();
          break;

        default:
          // Reset video-output styles
          videoOutput.style.width = "";
          videoOutput.style.height = "";
          videoOutput.style.minHeight = "";
          videoOutput.style.margin = "";
          videoOutput.style.position = "";
          videoOutput.style.left = "";
          videoOutput.style.top = "";
          videoOutput.style.transform = "";

          // Reset container styles
          const container = document.querySelector(".video-container");
          container.style.display = "";
          container.style.position = "";
          container.style.minHeight = "";

          // Stop brightness correction if it's running
          if (brightnessCorrection && brightnessCorrection.isProcessing) {
            brightnessCorrection.stopProcessing();
          }

          // Show text input
          textInput.style.display = "block";

          // Clear video output
          videoOutput.innerHTML = "";
      }
    });
  });

  // Animation control
  function updateAnimations(isDark) {
    const shapes = document.querySelectorAll(".floating-element");
    shapes.forEach((shape) => {
      shape.style.animationPlayState = isDark ? "paused" : "running";
      setTimeout(() => {
        shape.style.animationPlayState = "running";
      }, 300);
    });
  }

  // Function to update brightness

  let brightnessCorrection;

  function initializeBrightnessCorrection() {
    brightnessCorrection = new BrightnessCorrection();

    const videoElement = document.createElement("video");
    videoElement.setAttribute("autoplay", "");
    videoElement.setAttribute("playsinline", "");

    const canvasInput = document.getElementById("inputVideo");
    const canvasOutput = document.createElement("canvas");

    canvasOutput.style.width = "320px";
    canvasOutput.style.height = "240px";
    canvasOutput.style.borderRadius = "12px";

    brightnessCorrection.initialize(videoElement, canvasInput, canvasOutput);

    const videoOutput = document.getElementById("video-output");
    videoOutput.style.width = "320px";
    videoOutput.style.height = "240px";
    videoOutput.innerHTML = "";
    videoOutput.appendChild(canvasOutput);

    navigator.mediaDevices
      .getUserMedia({
        video: {
          width: { ideal: 320 },
          height: { ideal: 240 },
        },
      })
      .then((stream) => {
        videoElement.srcObject = stream;
        videoElement.play();
        brightnessCorrection.startProcessing();
      })
      .catch((err) => {
        console.error("Error accessing webcam:", err);
      });
  }

  function initializeModalControls() {
    // Initialize modal elements
    modal = document.getElementById("settingsModal");
    closeBtn = document.querySelector(".close-modal");
    saveBtn = document.getElementById("saveSettings");
    skinModelSelect = document.getElementById("skinDetectionModel");
    colorModelSelect = document.getElementById("colorCorrectionModel");

    // Close modal when clicking X
    closeBtn.onclick = function () {
      modal.style.display = "none";
    };

    // Close modal when clicking outside
    window.onclick = function (event) {
      if (event.target == modal) {
        modal.style.display = "none";
      }
    };

    // Handle save button click
    saveBtn.addEventListener("click", function () {
      // Save settings to localStorage
      localStorage.setItem("skinModel", currentSkinModel);
      localStorage.setItem("colorModel", currentColorModel);

      // Apply the selected models
      applySelectedModels();

      // Close the modal
      modal.style.display = "none";

      // Show success notification
      showNotification("Settings saved successfully!");
    });

    // Handle skin detection model change
    skinModelSelect.addEventListener("change", function (e) {
      currentSkinModel = e.target.value;
    });

    // Handle color correction model change
    colorModelSelect.addEventListener("change", function (e) {
      currentColorModel = e.target.value;
      localStorage.setItem("colorModel", currentColorModel);

      // Apply the new color model immediately if color correction is active
      if (window.colorCorrection && window.colorCorrection.isProcessing) {
        window.colorCorrection.setMethod(currentColorModel);
      }
    });

    // Load saved settings on init
    loadSavedSettings();
  }

  // Call initializeModalControls after DOM is loaded
  initializeModalControls();

  // Helper functions
  function loadSavedSettings() {
    const savedSkinModel = localStorage.getItem("skinModel");
    const savedColorModel = localStorage.getItem("colorModel");

    if (savedSkinModel) {
      currentSkinModel = savedSkinModel;
      skinModelSelect.value = savedSkinModel;
    }

    if (savedColorModel) {
      currentColorModel = savedColorModel;
      colorModelSelect.value = savedColorModel;
    }
  }

  function applySelectedModels() {
    // Wait for OpenCV to load
    if (typeof cv === "undefined") {
      showNotification("Waiting for OpenCV to load...");
      cv["onRuntimeInitialized"] = () => {
        applyModels();
      };
      return;
    }

    applyModels();
  }

  function applyModels() {
    // Check if ColorCorrection is loaded
    if (typeof ColorCorrection === "undefined") {
      console.error("ColorCorrection class not loaded");
      showNotification("Error: ColorCorrection module not loaded");
      return;
    }

    // Initialize color correction if not already done
    if (!window.colorCorrection) {
      try {
        window.colorCorrection = new ColorCorrection(showNotification);

        // Create video and canvas elements
        const videoElement = document.createElement("video");
        videoElement.setAttribute("autoplay", "");
        videoElement.setAttribute("playsinline", "");

        const canvasInput = document.createElement("canvas");
        const canvasOutput = document.getElementById("skinMask");

        // Initialize color correction
        window.colorCorrection.initialize(
          videoElement,
          canvasInput,
          canvasOutput
        );
      } catch (err) {
        console.error("Error initializing ColorCorrection:", err);
        showNotification("Error initializing color correction");
        return;
      }
    }

    // Apply skin detection model
    switch (currentSkinModel) {
      case "rgb":
        window.skinDetectionFunction = RGBModel;
        break;
      case "hsv":
        window.skinDetectionFunction = HSVModel;
        break;
      case "ycbcr":
        window.skinDetectionFunction = YCbCrModel;
        break;
    }

    // Apply color correction model
    switch (currentColorModel) {
      case "stretch":
      case "whitePatch":
      case "grayWorld":
        // Start color correction processing
        if (window.videoStream) {
          window.colorCorrection.videoElement.srcObject = window.videoStream;
          window.colorCorrection.startProcessing();
        }
        break;
      case "none":
        // Stop color correction processing
        if (window.colorCorrection && window.colorCorrection.isProcessing) {
          window.colorCorrection.stopProcessing();
        }
        break;
    }
  }

  function showNotification(message) {
    const notification = document.createElement("div");
    notification.className = "notification";
    notification.innerHTML = `
      <i class="fas fa-check-circle"></i>
      ${message}
    `;
    document.body.appendChild(notification);

    // Remove notification after 3 seconds
    setTimeout(() => {
      notification.remove();
    }, 3000);
  }

  // Add this function outside the switch statement
  function handleColorCorrection() {
    // Store the current uploaded media before clearing
    const uploadedMedia = document.querySelector(
      "#video-output video, #video-output img"
    );

    if (!uploadedMedia && !window.videoStream) {
      // Start webcam if no media is uploaded
      navigator.mediaDevices
        .getUserMedia({ video: true })
        .then(function (stream) {
          window.videoStream = stream;
          setupColorCorrection(null, true);
        })
        .catch(function (err) {
          console.error("Error accessing webcam:", err);
          showNotification("Error accessing webcam");
        });
      return;
    }

    if (uploadedMedia) {
      setupColorCorrection(uploadedMedia, false);
    }
  }

  function setupColorCorrection(uploadedMedia, isWebcam) {
    // Clear video output but keep a reference to the media
    videoOutput.innerHTML = "";

    // Create split view container
    const splitContainer = document.createElement("div");
    splitContainer.className = "split-container";

    // Create original view
    const originalView = document.createElement("div");
    originalView.className = "video-view";
    originalView.innerHTML = `
      <div class="video-label">Original</div>
      <canvas id="originalCanvas"></canvas>
    `;

    // Create processed view
    const processedView = document.createElement("div");
    processedView.className = "video-view";
    processedView.innerHTML = `
      <div class="video-label">Color Corrected</div>
      <canvas id="correctedCanvas"></canvas>
    `;

    // Add views to container
    splitContainer.appendChild(originalView);
    splitContainer.appendChild(processedView);
    videoOutput.appendChild(splitContainer);

    // Initialize color correction
    if (!window.colorCorrection) {
      window.colorCorrection = new ColorCorrection(showNotification);
    }

    if (isWebcam) {
      // Create video element for webcam
      const videoElement = document.createElement("video");
      videoElement.setAttribute("autoplay", "");
      videoElement.setAttribute("playsinline", "");
      videoElement.srcObject = window.videoStream;

      // Initialize with default dimensions first
      window.colorCorrection.initialize(
        videoElement,
        document.getElementById("originalCanvas"),
        document.getElementById("correctedCanvas")
      );

      // Start processing once video is playing
      videoElement.onplaying = () => {
        window.colorCorrection.startProcessing();
        isPlaying = true;
        updateButtonStates();
      };
    } else {
      // Handle uploaded media
      const isVideo = uploadedMedia instanceof HTMLVideoElement;
      const mediaElement = document.createElement(isVideo ? "video" : "img");
      if (isVideo) {
        mediaElement.setAttribute("autoplay", "");
        mediaElement.setAttribute("playsinline", "");
      }

      // Initialize with canvases
      window.colorCorrection.initialize(
        mediaElement,
        document.getElementById("originalCanvas"),
        document.getElementById("correctedCanvas")
      );

      // Process the media with the stored source
      if (isVideo) {
        window.colorCorrection.processUploadedVideo(uploadedMedia.src);
      } else {
        window.colorCorrection.processUploadedImage(uploadedMedia.src);
      }
    }
  }

  // Add these functions to handle webcam state
  function stopWebcam() {
    if (window.videoStream) {
      window.videoStream.getTracks().forEach((track) => track.stop());
      window.videoStream = null;
    }
    if (window.colorCorrection) {
      window.colorCorrection.stopProcessing();
    }
    // Clear video output
    const videoOutput = document.getElementById("video-output");
    videoOutput.innerHTML = "";
  }

  // Update the stop button handler
  stopBtn.addEventListener("click", () => {
    if (window.colorCorrection) {
      window.colorCorrection.stopProcessing();
    }
    stopWebcam();
    isPlaying = false;
    updateButtonStates();
  });

  // Add this function near your other helper functions
  function updateButtonStates() {
    // Update button states based on isPlaying
    startBtn.disabled = isPlaying;
    pauseBtn.disabled = !isPlaying;
    stopBtn.disabled = !isPlaying && !window.videoStream;
    muteBtn.disabled = !isPlaying;

    // Update button icons/text if needed
    startBtn.innerHTML = `<i class="fas fa-play"></i> Start`;
    pauseBtn.innerHTML = `<i class="fas fa-pause"></i> Pause`;
    stopBtn.innerHTML = `<i class="fas fa-stop"></i> Stop`;
    muteBtn.innerHTML = `<i class="fas fa-${
      isMuted ? "volume-mute" : "volume-up"
    }"></i> ${isMuted ? "Unmute" : "Mute"}`;
  }

  // Update the start button handler
  startBtn.addEventListener("click", () => {
    isPlaying = true;
    if (window.colorCorrection) {
      if (window.colorCorrection.isPaused) {
        window.colorCorrection.resume();
      } else {
        window.colorCorrection.startProcessing();
      }
    }
    updateButtonStates();
  });

  // Update the pause button handler
  pauseBtn.addEventListener("click", () => {
    isPlaying = false;
    if (window.colorCorrection) {
      window.colorCorrection.pause();
    }
    updateButtonStates();
  });

  // // Update the stop button handler (already exists, but make sure it's like this)
  // stopBtn.addEventListener("click", () => {
  //   if (window.colorCorrection) {
  //     window.colorCorrection.stopProcessing();
  //   }
  //   stopWebcam();
  //   isPlaying = false;
  //   updateButtonStates();
  // });

  // // Update the mute button handler
  // muteBtn.addEventListener("click", () => {
  //   isMuted = !isMuted;
  //   if (window.videoStream) {
  //     window.videoStream.getAudioTracks().forEach((track) => {
  //       track.enabled = !isMuted;
  //     });
  //   }
  //   updateButtonStates();
  // });

  // Call updateButtonStates initially to set correct initial states
  // updateButtonStates();

  // function setupSkinDetection(uploadedMedia, isWebcam) {
  //   // Clear video output
  //   videoOutput.innerHTML = "";

  //   // Create split view container
  //   const splitContainer = document.createElement("div");
  //   splitContainer.className = "split-container";

  //   // Create original view
  //   const originalView = document.createElement("div");
  //   originalView.className = "video-view";
  //   originalView.innerHTML = `
  //     <div class="video-label">Original</div>
  //     <canvas id="originalCanvas"></canvas>
  //   `;

  //   // Create skin detection view
  //   const skinView = document.createElement("div");
  //   skinView.className = "video-view";
  //   skinView.innerHTML = `
  //     <div class="video-label">Skin Detection</div>
  //     <canvas id="skinMask"></canvas>
  //   `;

  //   // Add views to container
  //   splitContainer.appendChild(originalView);
  //   splitContainer.appendChild(skinView);
  //   videoOutput.appendChild(splitContainer);
  // }

  // function processUploadedVideoForSkinDetection(videoUrl) {
  //   const videoElement = document.createElement("video");
  //   videoElement.src = videoUrl;
  //   videoElement.setAttribute("autoplay", "");
  //   videoElement.setAttribute("playsinline", "");

  //   videoElement.onloadedmetadata = () => {
  //     // Make sure canvas elements exist
  //     const originalCanvas = document.getElementById("originalCanvas");
  //     const skinMaskCanvas = document.getElementById("skinMask");

  //     if (!originalCanvas || !skinMaskCanvas) {
  //       console.error("Canvas elements not found");
  //       showNotification("Error: Canvas elements not initialized");
  //       return;
  //     }

  //     try {
  //       // Set canvas dimensions
  //       originalCanvas.width = videoElement.videoWidth;
  //       originalCanvas.height = videoElement.videoHeight;
  //       skinMaskCanvas.width = videoElement.videoWidth;
  //       skinMaskCanvas.height = videoElement.videoHeight;

  //       // Start video playback
  //       videoElement.play();

  //       // Process frames
  //       function processFrame() {
  //         if (!videoElement.paused && !videoElement.ended) {
  //           // Draw original frame
  //           const ctxOriginal = originalCanvas.getContext("2d");
  //           ctxOriginal.drawImage(
  //             videoElement,
  //             0,
  //             0,
  //             originalCanvas.width,
  //             originalCanvas.height
  //           );

  //           // Process skin detection
  //           let src = cv.imread(originalCanvas);
  //           let skinMask = new cv.Mat();

  //           // Apply skin detection based on selected model
  //           const skinModel = localStorage.getItem("skinModel") || "rgb";
  //           switch (skinModel) {
  //             case "rgb":
  //               window.RGBModel(src, skinMask);
  //               break;
  //             case "hsv":
  //               window.HSVModel(src, skinMask);
  //               break;
  //             case "ycbcr":
  //               window.YCbCrModel(src, skinMask);
  //               break;
  //           }

  //           // Show skin detection result
  //           cv.imshow(skinMaskCanvas, skinMask);

  //           // Clean up
  //           src.delete();
  //           skinMask.delete();

  //           // Request next frame
  //           requestAnimationFrame(processFrame);
  //         }
  //       }

  //       processFrame();
  //     } catch (err) {
  //       console.error("Error processing video:", err);
  //       showNotification("Error processing video");
  //     }
  //   };

  //   // Handle video loading errors
  //   videoElement.onerror = () => {
  //     console.error("Error loading video");
  //     showNotification("Error loading video");
  //   };
  // }

  // function processUploadedImageForSkinDetection(imageUrl) {
  //   // Create and load the image first
  //   const img = new Image();
  //   img.crossOrigin = "anonymous";

  //   // Wait for both image load and DOM elements
  //   img.onload = () => {
  //     // Make sure canvas elements exist
  //     const originalCanvas = document.getElementById("originalCanvas");
  //     const skinMaskCanvas = document.getElementById("skinMask");

  //     if (!originalCanvas || !skinMaskCanvas) {
  //       console.error("Canvas elements not found");
  //       showNotification("Error: Canvas elements not initialized");
  //       return;
  //     }

  //     try {
  //       // Set canvas dimensions
  //       originalCanvas.width = img.width;
  //       originalCanvas.height = img.height;
  //       skinMaskCanvas.width = img.width;
  //       skinMaskCanvas.height = img.height;

  //       // Draw original image
  //       const ctxOriginal = originalCanvas.getContext("2d");
  //       ctxOriginal.drawImage(img, 0, 0, img.width, img.height);

  //       // Process skin detection
  //       let src = cv.imread(originalCanvas);
  //       let skinMask = new cv.Mat();

  //       // Apply skin detection based on selected model
  //       const skinModel = localStorage.getItem("skinModel") || "rgb";
  //       switch (skinModel) {
  //         case "rgb":
  //           window.RGBModel(src, skinMask);
  //           break;
  //         case "hsv":
  //           window.HSVModel(src, skinMask);
  //           break;
  //         case "ycbcr":
  //           window.YCbCrModel(src, skinMask);
  //           break;
  //       }

  //       // Show skin detection result
  //       cv.imshow(skinMaskCanvas, skinMask);

  //       // Clean up
  //       src.delete();
  //       skinMask.delete();
  //     } catch (err) {
  //       console.error("Error processing image:", err);
  //       showNotification("Error processing image");
  //     }
  //   };

  //   // Handle image loading errors
  //   img.onerror = () => {
  //     console.error("Error loading image");
  //     showNotification("Error loading image");
  //   };

  //   // Start loading the image
  //   img.src = imageUrl;
  // }

  // // Add this function near your other handlers
  // function handleSkinDetection() {
  //   const uploadedMedia = document.querySelector(
  //     "#video-output video, #video-output img"
  //   );

  //   if (!uploadedMedia && !window.videoStream) {
  //     showNotification("Please upload a video or image first");
  //     return;
  //   }

  //   // If it's a video element, make sure we have the source
  //   if (uploadedMedia instanceof HTMLVideoElement && !uploadedMedia.src) {
  //     showNotification("Please wait for the video to load");
  //     return;
  //   }

  //   // If it's an image element, make sure we have the source
  //   if (uploadedMedia instanceof HTMLImageElement && !uploadedMedia.src) {
  //     showNotification("Please wait for the image to load");
  //     return;
  //   }

  //   // Store the media source before clearing the video output
  //   const mediaSource = uploadedMedia.src;
  //   const isVideo = uploadedMedia instanceof HTMLVideoElement;

  //   // Setup skin detection views
  //   setupSkinDetection(null, false);

  //   // Wait for DOM to update and canvases to be created
  //   setTimeout(() => {
  //     const originalCanvas = document.getElementById("originalCanvas");
  //     const skinMaskCanvas = document.getElementById("skinMask");

  //     if (!originalCanvas || !skinMaskCanvas) {
  //       console.error("Canvas elements not found");
  //       showNotification("Error: Canvas elements not initialized");
  //       return;
  //     }

  //     // Process the media with the stored source
  //     if (isVideo) {
  //       processUploadedVideoForSkinDetection(mediaSource);
  //     } else {
  //       processUploadedImageForSkinDetection(mediaSource);
  //     }
  //   }, 0);
  // }
});
