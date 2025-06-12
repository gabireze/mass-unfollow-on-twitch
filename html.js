// Function to wait for multiple elements
const waitForMultipleElements = (selectors, timeout = 10000) => {
  const promises = selectors.map((selector) =>
    waitForElement(selector, timeout)
  );
  return Promise.all(promises);
};

// Function to check if the page is fully loaded
const waitForPageReady = () => {
  return new Promise((resolve) => {
    if (document.readyState === "complete") {
      resolve();
      return;
    }

    const onReady = () => {
      if (document.readyState === "complete") {
        document.removeEventListener("readystatechange", onReady);
        resolve();
      }
    };

    document.addEventListener("readystatechange", onReady);
  });
};

// Function to wait for specific Twitch elements to load
const waitForTwitchElements = async () => {
  const requiredSelectors = [
    "#following-page-main-content",
    ".simplebar-scroll-content",
    '[data-a-target="user-card-modal"]',
  ];

  try {
    // Wait for the main element first
    await waitForElement("#following-page-main-content", 15000);
    console.log("Main element found");

    // Wait a bit more to ensure other elements load
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Check if channel elements are loaded
    const userCards = document.querySelectorAll(
      '[data-a-target="user-card-modal"]'
    );
    if (userCards.length === 0) {
      console.log("Waiting for channels to load...");
      await waitForElement('[data-a-target="user-card-modal"]', 10000);
    }

    console.log("Twitch elements loaded successfully");
    return true;
  } catch (error) {
    console.warn(
      "Some elements may not have fully loaded:",
      error.message
    );
    // Continue even if some elements do not load
    return true;
  }
};

// Function to show loader during loading
const showInitialLoader = () => {
  const loader = document.createElement("div");
  loader.id = "extension-initial-loader";
  loader.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    z-index: 9999;
    background: rgba(0, 0, 0, 0.8);
    padding: 20px;
    border-radius: 10px;
    color: white;
    text-align: center;
    font-family: Arial, sans-serif;
  `;
  loader.innerHTML = `
    <div style="border: 3px solid #9147ff; border-top: 3px solid #35076a; border-radius: 50%; width: 30px; height: 30px; animation: spin 1s linear infinite; margin: 0 auto 10px;"></div>
    <div>Loading Mass Unfollow...</div>
    <style>
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
    </style>
  `;

  document.body.appendChild(loader);
  return loader;
};

// Function to remove initial loader
const hideInitialLoader = (loader) => {
  if (loader && loader.parentNode) {
    loader.parentNode.removeChild(loader);
  }
};

// Main initialization function
const init = async () => {
  console.log("Starting Mass Unfollow extension loading...");

  let initialLoader;

  try {
    // Show initial loader
    initialLoader = showInitialLoader();

    // Wait for page to be ready
    await waitForPageReady();
    console.log("Page ready");

    // Wait for specific Twitch elements
    await waitForTwitchElements();

    // Find the target element
    const targetElement = document.getElementById(
      "following-page-main-content"
    );

    if (!targetElement) {
      throw new Error(
        "Target element #following-page-main-content not found"
      );
    }

    // Remove initial loader
    hideInitialLoader(initialLoader);

    // Check if the interface has already been injected
    if (document.getElementById("popup-overlay")) {
      console.log("Interface already injected previously");
      return;
    }

    // Interface HTML
    const componentHtml = `
<html lang="en"><body><div class="loader" id="loader"></div><div class="centered-column"><div class="overlay" id="popup-overlay"><div class="my-component"><h2 id="title">Mass Unfollow on Twitch</h2><p id="info-text">Click the button to analyze all your followers.</p><button id="analyze-button" onclick="selectChannels()">Analyze</button><p id="explanation-text">Optional: Add exceptions for channels you do not wish to unfollow.</p><input type="text" id="channel-search" placeholder="Search available..." onkeyup='filterOptions("channel-select","channel-search")'><select id="channel-select" multiple="multiple" style="height:100px"></select><button id="add-button" onclick="addSelectedChannels()">Add Selected</button><input type="text" id="selected-channel-search" placeholder="Search in selected..." onkeyup='filterOptions("selected-channels","selected-channel-search")'><select id="selected-channels" multiple="multiple" style="height:100px"></select><button id="remove-button" onclick="removeSelectedChannels()">Remove Selected</button><button id="unfollow-button" onclick="startUnfollowProcess()">Start Mass Unfollow</button><div class="message-container" id="success-message" style="display:none"><p id="success-text">Process completed successfully!</p></div><div class="message-container" id="error-message" style="display:none"><p id="error-text"></p></div></div></div></div></body></html>
`;

    // Inject the interface
    targetElement.insertAdjacentHTML("beforebegin", componentHtml);
    console.log("Interface injected successfully");

    // Wait a moment to ensure the interface is rendered
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Dispatch custom event to notify that the interface is ready
    const event = new CustomEvent("extensionInterfaceReady", {
      detail: { timestamp: Date.now() },
    });
    document.dispatchEvent(event);

    console.log("Mass Unfollow extension fully loaded");
  } catch (error) {
    console.error("Error loading the extension:", error);

    // Remove loader in case of error
    hideInitialLoader(initialLoader);

    // Show error message to user
    const errorDiv = document.createElement("div");
    errorDiv.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #ff4757;
      color: white;
      padding: 15px;
      border-radius: 5px;
      z-index: 9999;
      max-width: 300px;
      font-family: Arial, sans-serif;
    `;
    errorDiv.innerHTML = `
      <strong>Mass Unfollow extension error:</strong><br>
      ${error.message}
      <br><br>
      <button onclick="this.parentNode.remove()" style="background: white; color: #ff4757; border: none; padding: 5px 10px; border-radius: 3px; cursor: pointer;">
        Close
      </button>
    `;

    document.body.appendChild(errorDiv);

    // Remove the error message automatically after 10 seconds
    setTimeout(() => {
      if (errorDiv.parentNode) {
        errorDiv.parentNode.removeChild(errorDiv);
      }
    }, 10000);
  }
};

// Observer to detect page changes (for SPA)
const observePageChanges = () => {
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.type === "childList") {
        const targetElement = document.getElementById(
          "following-page-main-content"
        );
        const existingOverlay = document.getElementById("popup-overlay");

        // If the target element exists but the interface does not, reinitialize
        if (targetElement && !existingOverlay) {
          console.log("Page changed, reinitializing extension...");
          setTimeout(init, 1000); // Small delay to ensure the page has loaded
        }
      }
    });
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });

  return observer;
};

// Retry function in case of failure
const initWithRetry = async (maxRetries = 3) => {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await init();
      return; // Success, exit function
    } catch (error) {
      console.warn(`Attempt ${attempt} failed:`, error.message);

      if (attempt === maxRetries) {
        console.error("All attempts failed");
        throw error;
      }

      // Wait before next attempt
      await new Promise((resolve) => setTimeout(resolve, 2000 * attempt));
    }
  }
};

// Run initialization
(async () => {
  try {
    await initWithRetry();
    observePageChanges();
  } catch (error) {
    console.error("Critical failure loading the extension:", error);
  }
})();
