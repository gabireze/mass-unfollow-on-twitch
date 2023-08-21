document.addEventListener("DOMContentLoaded", function () {
  document.getElementById("runScript").addEventListener("click", () => {
    chrome.runtime.sendMessage({ action: "unfollow" });
  });
});
