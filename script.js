// ============== Utility Functions ==============

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Function to wait for an element to appear
const waitForElement = (selector, timeout = 10000) => {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();

    const checkElement = () => {
      const element = document.querySelector(selector);

      if (element) {
        resolve(element);
        return;
      }

      if (Date.now() - startTime >= timeout) {
        reject(new Error(`Element ${selector} not found after ${timeout}ms`));
        return;
      }

      setTimeout(checkElement, 100);
    };

    checkElement();
  });
};

// Function to wait for multiple elements
const waitForElements = (selector, minCount = 1, timeout = 10000) => {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();

    const checkElements = () => {
      const elements = document.querySelectorAll(selector);

      if (elements.length >= minCount) {
        resolve(elements);
        return;
      }

      if (Date.now() - startTime >= timeout) {
        reject(
          new Error(
            `Less than ${minCount} elements ${selector} found after ${timeout}ms`
          )
        );
        return;
      }

      setTimeout(checkElements, 200);
    };

    checkElements();
  });
};

// ============== Scroll Functions ==============

const scrollToBottom = async (element) => {
  element.scrollTop = element.scrollHeight;
};

const scrollToTop = async (element) => {
  element.scrollTop = 0;
};

const checkScrollEnd = async (element, errorMarginPercent = 10) => {
  const scrollPosition = element.scrollTop;
  const maxScrollHeight = element.scrollHeight - element.clientHeight;
  const errorMargin = (errorMarginPercent / 100) * element.clientHeight;

  return scrollPosition >= maxScrollHeight - errorMargin;
};

// ============== UI State Management ==============

const toggleUIState = async (isLoading) => {
  toggleButtons(isLoading);
  toggleLoader(isLoading);
};

const toggleButtons = (disabled) => {
  const buttons = document.querySelectorAll(".my-component button");
  buttons.forEach((button) => {
    button.disabled = disabled;
    button.style.cursor = disabled ? "not-allowed" : "pointer";
  });
};

const toggleLoader = (show) => {
  const loader = document.getElementById("loader");
  if (loader) {
    loader.style.display = show ? "block" : "none";
  }
};

// ============== Main Functionality ==============

const selectChannels = async () => {
  const errorMessage = document.getElementById("error-message");
  const successMessage = document.getElementById("success-message");

  if (errorMessage) errorMessage.style.display = "none";
  if (successMessage) successMessage.style.display = "none";

  try {
    await startScrolling();
  } catch (error) {
    console.error("Error while fetching channels:", error);

    const errorText = document.getElementById("error-text");
    if (errorText) {
      errorText.textContent = "Error: " + error.message;
    }

    if (errorMessage) errorMessage.style.display = "block";
    if (successMessage) successMessage.style.display = "none";
  }
};

const startScrolling = async () => {
  const ERROR_MARGIN_PERCENT = 10;

  await toggleUIState(true);

  try {
    // Wait for the scroll element to be available
    const scrollElement = await waitForElement(
      ".simplebar-scroll-content",
      15000
    );
    console.log("Scroll element found");

    await wait(2000);

    let scrollAttempts = 0;
    const maxScrollAttempts = 100; // Limit attempts to avoid infinite loop

    const scrollInterval = setInterval(async () => {
      try {
        scrollAttempts++;

        if (scrollAttempts > maxScrollAttempts) {
          console.warn("Scroll attempt limit reached");
          clearInterval(scrollInterval);
          await finalizeScrolling();
          return;
        }

        // Check if we still have the scroll element
        const currentScrollElement = document.querySelector(
          ".simplebar-scroll-content"
        );
        if (!currentScrollElement) {
          console.warn("Scroll element not found, trying again...");
          return;
        }

        await scrollToBottom(currentScrollElement);
        await wait(2000);

        if (await checkScrollEnd(currentScrollElement, ERROR_MARGIN_PERCENT)) {
          console.log(
            "Reached the end of the element within the error margin."
          );
          clearInterval(scrollInterval);
          await finalizeScrolling();
        }
      } catch (error) {
        console.error("Error during scroll:", error);
        clearInterval(scrollInterval);
        await toggleUIState(false);
        throw error;
      }
    }, 3000);

    // Store the interval globally to cancel if needed
    window.currentScrollInterval = scrollInterval;
  } catch (error) {
    await toggleUIState(false);
    throw error;
  }
};

const finalizeScrolling = async () => {
  try {
    const scrollElement = document.querySelector(".simplebar-scroll-content");
    if (scrollElement) {
      await scrollToTop(scrollElement);
    }

    console.log("Executing the unfollow script...");
    await toggleUIState(false);

    const channels = await getChannels();
    console.log("Channels found:", channels.length);

    updateChannelSelect(channels);
  } catch (error) {
    console.error("Error finalizing scroll:", error);
    await toggleUIState(false);
    throw error;
  }
};

const getChannels = async () => {
  try {
    // Wait for channel elements
    await waitForElements('[data-a-target="user-card-modal"]', 1, 5000);

    const userCardElements = document.querySelectorAll(
      '[data-a-target="user-card-modal"]'
    );
    console.log(`Found ${userCardElements.length} channel elements`);

    const linksInfo = Array.from(userCardElements)
      .map((element) => {
        const anchor = element.querySelector("a");
        if (anchor) {
          return {
            href: anchor.getAttribute("href"),
            ariaLabel: anchor.getAttribute("aria-label"),
          };
        }
        return null;
      })
      .filter((info) => info !== null);

    return linksInfo;
  } catch (error) {
    console.warn("Error getting channels:", error);
    return [];
  }
};

const startUnfollowProcess = async () => {
  try {
    const errorMessage = document.getElementById("error-message");
    const successMessage = document.getElementById("success-message");

    if (errorMessage) errorMessage.style.display = "none";
    if (successMessage) successMessage.style.display = "none";

    await toggleUIState(true);

    const selectedOptions = document.querySelectorAll(
      "#selected-channels option"
    );
    const exceptionsList = Array.from(selectedOptions).map(
      (option) => option.text
    );

    // Wait for unfollow buttons
    const unfollowButtons = await waitForElements(
      '[data-test-selector="unfollow-button"]',
      1,
      5000
    );
    console.log(`Found ${unfollowButtons.length} unfollow buttons`);

    for (const button of unfollowButtons) {
      try {
        const channelNameElement = button
          .closest('[data-a-target="user-card-modal"]')
          ?.querySelector("a");

        const channelName = channelNameElement
          ? channelNameElement.textContent.trim()
          : "";

        if (exceptionsList.includes(channelName)) {
          console.log(
            `Skipping ${channelName} as it is in the exceptions list.`
          );
          continue;
        }

        button.click();
        console.log(`Clicked the unfollow button for ${channelName}.`);

        await wait(500); // Wait a bit for the modal to appear

        // Wait for the confirmation button in the modal
        try {
          const modalUnfollowButton = await waitForElement(
            '[data-a-target="modal-unfollow-button"]',
            3000
          );
          modalUnfollowButton.click();
          console.log(`Confirmed the unfollow action for ${channelName}.`);
        } catch (modalError) {
          console.warn(
            `Confirmation modal not found for ${channelName}:"`,
            modalError
          );
        }

        await wait(1000); // Wait between actions
      } catch (buttonError) {
        console.warn("Error processing unfollow button:", buttonError);
        continue;
      }
    }

    if (successMessage) {
      successMessage.style.display = "block";
    }
  } catch (error) {
    console.error("Error detected:", error);

    const errorText = document.getElementById("error-text");
    const errorMessage = document.getElementById("error-message");
    const successMessage = document.getElementById("success-message");

    if (errorText) {
      errorText.textContent = "Error: " + error.message;
    }
    if (errorMessage) errorMessage.style.display = "block";
    if (successMessage) successMessage.style.display = "none";

    await wait(2000);
  } finally {
    await toggleUIState(false);
    console.log("Finished unfollowing channels. Script ended.");
  }
};

// ============== UI Update Functions ==============

const updateChannelSelect = (channels) => {
  const select = document.getElementById("channel-select");
  if (!select) return;

  select.innerHTML = "";

  channels.forEach((channel) => {
    const option = document.createElement("option");
    option.value = channel.href;
    option.textContent = channel.ariaLabel;
    select.appendChild(option);
  });
};

// ============== Event Handlers and Other Utilities ==============

const addSelectedChannels = () => {
  const selectedOptions = document.querySelectorAll(
    "#channel-select option:checked"
  );
  const selectedChannels = document.getElementById("selected-channels");

  if (selectedChannels) {
    selectedOptions.forEach((option) => {
      selectedChannels.appendChild(option);
    });
  }
};

const removeSelectedChannels = () => {
  const selectedOptions = document.querySelectorAll(
    "#selected-channels option:checked"
  );
  const channelSelect = document.getElementById("channel-select");

  if (channelSelect) {
    selectedOptions.forEach((option) => {
      channelSelect.appendChild(option);
    });
  }
};

const filterOptions = (selectId, inputId) => {
  const input = document.getElementById(inputId);
  const select = document.getElementById(selectId);

  if (!input || !select) return;

  const filter = input.value.toUpperCase();
  const options = select.getElementsByTagName("option");

  for (let i = 0; i < options.length; i++) {
    const txtValue = options[i].textContent || options[i].innerText;
    if (txtValue.toUpperCase().indexOf(filter) > -1) {
      options[i].style.display = "";
    } else {
      options[i].style.display = "none";
    }
  }
};

// ============== Internationalization ==============

const translations = {
  en: {
    title: "Mass Unfollow on Twitch",
    infoText: "Click the button to analyze all your followers.",
    explanationText:
      "Optional: Add exceptions for channels you do not wish to unfollow.",
    analyzeButton: "Analyze",
    searchPlaceholder: "Search available...",
    addButton: "Add Selected",
    searchSelectedPlaceholder: "Search in selected...",
    removeButton: "Remove Selected",
    unfollowButton: "Start Mass Unfollow",
    successText: "Process completed successfully!",
  },
  pt: {
    title: "Mass Unfollow on Twitch",
    infoText: "Clique no botão para analisar todos os seus seguidores.",
    explanationText:
      "Opcional: Adicione exceções para canais que você não deseja deixar de seguir.",
    analyzeButton: "Analisar",
    searchPlaceholder: "Buscar nos disponíveis...",
    addButton: "Adicionar Selecionados",
    searchSelectedPlaceholder: "Buscar nos selecionados...",
    removeButton: "Remover Selecionados",
    unfollowButton: "Começar Unfollow em Massa",
    successText: "Processo concluído com sucesso!",
  },
  fr: {
    title: "Mass Unfollow on Twitch",
    infoText: "Cliquez sur le bouton pour analyser tous vos abonnés.",
    explanationText:
      "Facultatif : Ajoutez des exceptions pour les chaînes que vous ne souhaitez pas unfollow.",
    analyzeButton: "Analyser",
    searchPlaceholder: "Rechercher disponible...",
    addButton: "Ajouter sélectionné",
    searchSelectedPlaceholder: "Rechercher dans la sélection...",
    removeButton: "Supprimer sélectionné",
    unfollowButton: "Commencer Mass Unfollow",
    successText: "Processus terminé avec succès!",
  },
  de: {
    title: "Mass Unfollow on Twitch",
    infoText:
      "Klicken Sie auf die Schaltfläche, um alle Ihre Follower zu analysieren.",
    explanationText:
      "Optional: Fügen Sie Ausnahmen für Kanäle hinzu, die Sie nicht unfollow möchten.",
    analyzeButton: "Analysieren",
    searchPlaceholder: "Suche verfügbar...",
    addButton: "Ausgewählte hinzufügen",
    searchSelectedPlaceholder: "In ausgewählten suchen...",
    removeButton: "Ausgewählte entfernen",
    unfollowButton: "Massen-Unfollow starten",
    successText: "Prozess erfolgreich abgeschlossen!",
  },
  it: {
    title: "Mass Unfollow on Twitch",
    infoText: "Fai clic sul pulsante per analizzare tutti i tuoi follower.",
    explanationText:
      "Opzionale: aggiungi eccezioni per i canali che non desideri smettere di seguire.",
    analyzeButton: "Analizza",
    searchPlaceholder: "Cerca disponibile...",
    addButton: "Aggiungi selezionato",
    searchSelectedPlaceholder: "Cerca in selezionato...",
    removeButton: "Rimuovi selezionato",
    unfollowButton: "Inizia Mass Unfollow",
    successText: "Processo completato con successo!",
  },
  ru: {
    title: "Mass Unfollow on Twitch",
    infoText: "Нажмите кнопку, чтобы проанализировать всех ваших подписчиков.",
    explanationText:
      "Необязательно: добавьте исключения для каналов, которые вы не хотите отписываться.",
    analyzeButton: "Анализировать",
    searchPlaceholder: "Поиск доступен...",
    addButton: "Добавить выбранный",
    searchSelectedPlaceholder: "Поиск в выбранном...",
    removeButton: "Удалить выбранный",
    unfollowButton: "Начать массовую отписку",
    successText: "Процесс успешно завершен!",
  },
  nl: {
    title: "Mass Unfollow on Twitch",
    infoText: "Klik op de knop om al je volgers te analyseren.",
    explanationText:
      "Optioneel: voeg uitzonderingen toe voor kanalen die je niet wilt ontvolgen.",
    analyzeButton: "Analyseren",
    searchPlaceholder: "Zoeken beschikbaar...",
    addButton: "Geselecteerde toevoegen",
    searchSelectedPlaceholder: "Zoeken in geselecteerde...",
    removeButton: "Geselecteerde verwijderen",
    unfollowButton: "Begin Mass Unfollow",
    successText: "Proces succesvol afgerond!",
  },
  tr: {
    title: "Mass Unfollow on Twitch",
    infoText: "Tüm takipçilerinizi analiz etmek için düğmeye tıklayın.",
    explanationText:
      "İsteğe bağlı: Takip etmek istemediğiniz kanallar için istisnalar ekleyin.",
    analyzeButton: "Analiz etmek",
    searchPlaceholder: "Arama mevcut...",
    addButton: "Seçileni ekle",
    searchSelectedPlaceholder: "Seçilene göre ara...",
    removeButton: "Seçileni kaldır",
    unfollowButton: "Toplu Takipten Çıkmaya Başla",
    successText: "İşlem başarıyla tamamlandı!",
  },
  ja: {
    title: "Mass Unfollow on Twitch",
    infoText: "ボタンをクリックして、すべてのフォロワーを分析します。",
    explanationText:
      "オプション：アンフォローしたくないチャンネルの例外を追加します。",
    analyzeButton: "分析する",
    searchPlaceholder: "検索可能...",
    addButton: "選択したものを追加",
    searchSelectedPlaceholder: "選択したものを検索...",
    removeButton: "選択したものを削除",
    unfollowButton: "大量のフォロー解除を開始",
    successText: "プロセスが正常に完了しました！",
  },
  zh: {
    title: "Mass Unfollow on Twitch",
    infoText: "点击按钮分析所有粉丝。",
    explanationText: "可选：添加不希望取消关注的频道的例外。",
    analyzeButton: "分析",
    searchPlaceholder: "搜索可用...",
    addButton: "添加选定的",
    searchSelectedPlaceholder: "搜索选定的...",
    removeButton: "删除选定的",
    unfollowButton: "开始大量取消关注",
    successText: "进程成功完成！",
  },
  ko: {
    title: "Mass Unfollow on Twitch",
    infoText: "버튼을 클릭하여 모든 팔로워를 분석하십시오.",
    explanationText:
      "선택 사항 : 언팔로우하고 싶지 않은 채널에 예외를 추가하십시오.",
    analyzeButton: "분석",
    searchPlaceholder: "검색 가능...",
    addButton: "선택 항목 추가",
    searchSelectedPlaceholder: "선택 항목에서 검색...",
    removeButton: "선택 항목 제거",
    unfollowButton: "대량 언팔로우 시작",
    successText: "프로세스가 성공적으로 완료되었습니다!",
  },
  sv: {
    title: "Mass Unfollow on Twitch",
    infoText: "Klicka på knappen för att analysera alla dina följare.",
    explanationText:
      "Valfritt: Lägg till undantag för kanaler du inte vill unfollow.",
    analyzeButton: "Analysera",
    searchPlaceholder: "Sök tillgängligt...",
    addButton: "Lägg till valda",
    searchSelectedPlaceholder: "Sök i valda...",
    removeButton: "Ta bort valda",
    unfollowButton: "Börja Mass Unfollow",
    successText: "Processen slutförd!",
  },
  pl: {
    title: "Mass Unfollow on Twitch",
    infoText:
      "Kliknij przycisk, aby przeanalizować wszystkich swoich obserwujących.",
    explanationText:
      "Opcjonalnie: Dodaj wyjątki dla kanałów, których nie chcesz przestać obserwować.",
    analyzeButton: "Analizować",
    searchPlaceholder: "Wyszukaj dostępne...",
    addButton: "Dodaj wybrane",
    searchSelectedPlaceholder: "Wyszukaj w wybranych...",
    removeButton: "Usuń wybrane",
    unfollowButton: "Rozpocznij masowe odsubskrybowanie",
    successText: "Proces zakończony pomyślnie!",
  },
  fi: {
    title: "Mass Unfollow on Twitch",
    infoText: "Napsauta painiketta analysoidaksesi kaikki seuraajasi.",
    explanationText:
      "Valinnainen: Lisää poikkeukset kanaville, joita et halua lopettaa seuraamasta.",
    analyzeButton: "Analysoida",
    searchPlaceholder: "Hae käytettävissä...",
    addButton: "Lisää valitut",
    searchSelectedPlaceholder: "Hae valitusta...",
    removeButton: "Poista valitut",
    unfollowButton: "Aloita Mass Unfollow",
    successText: "Prosessi suoritettu onnistuneesti!",
  },
  es: {
    title: "Mass Unfollow on Twitch",
    infoText: "Haz clic en el botón para analizar todos tus seguidores.",
    explanationText:
      "Opcional: Añade excepciones para los canales que no deseas dejar de seguir.",
    analyzeButton: "Analizar",
    searchPlaceholder: "Buscar disponibles...",
    addButton: "Añadir Seleccionados",
    searchSelectedPlaceholder: "Buscar en seleccionados...",
    removeButton: "Eliminar Seleccionados",
    unfollowButton: "Comenzar Unfollow en Masa",
    successText: "¡Proceso completado con éxito!",
  },
  da: {
    title: "Mass Unfollow on Twitch",
    infoText: "Klik på knappen for at analysere alle dine følgere.",
    explanationText:
      "Valgfrit: Tilføj undtagelser for kanaler, du ikke ønsker at unfollow.",
    analyzeButton: "Analyser",
    searchPlaceholder: "Søg tilgængelige...",
    addButton: "Tilføj valgte",
    searchSelectedPlaceholder: "Søg i valgte...",
    removeButton: "Fjern valgte",
    unfollowButton: "Start masse-unfollow",
    successText: "Proces afsluttet!",
  },
};

const updateContentBasedOnLanguage = async () => {
  try {
    const userLang = navigator.language.split("-")[0] ?? "";
    const langToUse = translations[userLang] ? userLang : "en";

    const elements = {
      title: translations[langToUse].title,
      "info-text": translations[langToUse].infoText,
      "explanation-text": translations[langToUse].explanationText,
      "analyze-button": translations[langToUse].analyzeButton,
      "add-button": translations[langToUse].addButton,
      "remove-button": translations[langToUse].removeButton,
      "unfollow-button": translations[langToUse].unfollowButton,
      "success-text": translations[langToUse].successText,
    };

    for (const [id, text] of Object.entries(elements)) {
      const element = document.getElementById(id);
      if (element) {
        element.textContent = text;
      }
    }

    const channelSearch = document.getElementById("channel-search");
    const selectedChannelSearch = document.getElementById(
      "selected-channel-search"
    );

    if (channelSearch) {
      channelSearch.placeholder = translations[langToUse].searchPlaceholder;
    }
    if (selectedChannelSearch) {
      selectedChannelSearch.placeholder =
        translations[langToUse].searchSelectedPlaceholder;
    }
  } catch (error) {
    console.warn("Error updating language:", error);
  }
};

// ============== Event Listeners Setup ==============

const setupEventListeners = () => {
  try {
    // Channel select keydown
    const channelSelect = document.getElementById("channel-select");
    if (channelSelect) {
      channelSelect.addEventListener("keydown", function (event) {
        if (event.key === "Enter") {
          // Implement confirmSelection if needed
        }
      });
    }

    // Popup overlay click
    const popupOverlay = document.getElementById("popup-overlay");
    if (popupOverlay) {
      popupOverlay.addEventListener("click", function (event) {
        if (event.target === this) {
          this.style.display = "none";
        }
      });
    }

    // Component click (prevent event bubbling)
    const myComponent = document.querySelector(".my-component");
    if (myComponent) {
      myComponent.addEventListener("click", function (event) {
        event.stopPropagation();
      });
    }
  } catch (error) {
    console.warn("Error setting up event listeners:", error);
  }
};

// ============== Initialization ==============

const initializeScript = async () => {
  try {
    // Wait for the interface to be ready
    await waitForElement("#popup-overlay", 10000);

    // Setup event listeners
    setupEventListeners();

    // Update language
    await updateContentBasedOnLanguage();

    console.log("Script loaded successfully!");
  } catch (error) {
    console.error("Error initializing script:", error);
  }
};

// ============== Global Functions (needed for onclick handlers) ==============

// Make functions global for HTML onclick handlers
window.selectChannels = selectChannels;
window.addSelectedChannels = addSelectedChannels;
window.removeSelectedChannels = removeSelectedChannels;
window.startUnfollowProcess = startUnfollowProcess;
window.filterOptions = filterOptions;

// Runs when the interface is ready
document.addEventListener("extensionInterfaceReady", initializeScript);

// Fallback: runs after a delay if the event does not fire
setTimeout(initializeScript, 3000);

console.log("Script loaded and waiting for interface...");
