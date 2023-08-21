chrome.runtime.onMessage.addListener(async function (request, sender, sendResponse) {
  if (request.action === "unfollow") {
    chrome.tabs.create({ url: "https://www.twitch.tv/directory/following/channels" }, (newTab) => {
      chrome.scripting.executeScript({
        target: { tabId: newTab.id },
        func: runUnfollowScript,
      });
    });
  }
});

const runUnfollowScript = async () => {
  const ERROR_MARGIN_PERCENT = 10;
  let scrollInterval;

  const scrollToBottom = async (element) => {
    element.scrollTop = element.scrollHeight;
  };

  const checkScrollEnd = async (element) => {
    const scrollPosition = element.scrollTop;
    const maxScrollHeight = element.scrollHeight - element.clientHeight;

    const errorMargin = (ERROR_MARGIN_PERCENT / 100) * element.clientHeight;

    if (scrollPosition >= maxScrollHeight - errorMargin) {
      console.log("Reached the end of the element within the error margin.");
      clearInterval(scrollInterval);

      console.log("Running the unfollow script...");
      await unfollow();
    }
  };

  const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  const startScrolling = async () => {
    await wait(2000);
    scrollInterval = setInterval(async () => {
      const rootScrollableElement = document.getElementsByClassName("simplebar-scroll-content")[1];

      await scrollToBottom(rootScrollableElement);
      await wait(2000);
      await checkScrollEnd(rootScrollableElement);
    }, 3000);
  };

  const unfollow = async () => {
    const unfollowButtons = document.getElementsByClassName("ScStatusAlertLabel-sc-1dmtv72-1 hEETeX");

    const confirmText = "Yes, unfollow";

    for (const button of unfollowButtons) {
      button.click();
      console.log("Clicked the unfollow button.");

      const confirmDivs = Array.from(document.querySelectorAll("div"));

      const confirmElement = confirmDivs.find((el) => el.textContent === confirmText);

      if (confirmElement) {
        const confirmButton = confirmElement.children[0];
        confirmButton.click();
        console.log("Confirmed the unfollow action.");
      }
    }

    console.log("Finished unfollowing channels. Script ended.");
  };

  await startScrolling();
};
