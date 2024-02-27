const init = () => {
  var targetElement = document.getElementById("following-page-main-content");
  if (targetElement) {
    var componentHtml = `
<html lang="en"><body><div class="loader" id="loader"></div><div class="centered-column"><div class="overlay" id="popup-overlay"><div class="my-component"><h2 id="title">Mass Unfollow on Twitch</h2><p id="info-text">Click the button to analyze all your followers.</p><button id="analyze-button" onclick="selectChannels()">Analyze</button><p id="explanation-text">Optional: Add exceptions for channels you do not wish to unfollow.</p><input type="text" id="channel-search" placeholder="Search available..." onkeyup='filterOptions("channel-select","channel-search")'><select id="channel-select" multiple="multiple" style="height:100px"></select><button id="add-button" onclick="addSelectedChannels()">Add Selected</button><input type="text" id="selected-channel-search" placeholder="Search in selected..." onkeyup='filterOptions("selected-channels","selected-channel-search")'><select id="selected-channels" multiple="multiple" style="height:100px"></select><button id="remove-button" onclick="removeSelectedChannels()">Remove Selected</button><button id="unfollow-button" onclick="startUnfollowProcess()">Start Mass Unfollow</button><div class="message-container" id="success-message" style="display:none"><p id="success-text">Process completed successfully!</p></div><div class="message-container" id="error-message" style="display:none"><p id="error-text"></p></div></div></div></div></body></html>
`;
    targetElement.insertAdjacentHTML("beforebegin", componentHtml);
  } else {
    console.error("Target element not found");
  }
};
init();
