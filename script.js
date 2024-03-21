// ============== Auxiliary Functions ==============

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// ============== Scroll Functions ==============

const scrollToBottom = async (element) => {
  element.scrollTop = element.scrollHeight;
};

const scrollToTop = async (element) => {
  element.scrollTop = element.scrollToTop;
};

const checkScrollEnd = async (element, errorMarginPercent) => {
  const scrollPosition = element.scrollTop;
  const maxScrollHeight = element.scrollHeight - element.clientHeight;
  const errorMargin = (errorMarginPercent / 100) * element.clientHeight;

  return scrollPosition >= maxScrollHeight - errorMargin;
};

// ============== Main Functionality ==============

const toggleUIState = async (isLoading) => {
  toggleButtons(isLoading);
  toggleLoader(isLoading);
};

const selectChannels = async () => {
  document.getElementById("error-message").style.display = "none";
  document.getElementById("success-message").style.display = "none";
  try {
    await startScrolling();
  } catch (error) {
    console.error("Error while fetching channels:", error);
    document.getElementById(
      "error-text"
    ).textContent = `Error: ${error.message}`;
    document.getElementById("error-message").style.display = "block";
    document.getElementById("success-message").style.display = "none";
  }
};

const startScrolling = async () => {
  const ERROR_MARGIN_PERCENT = 10;
  await toggleUIState(true);
  await wait(2000);
  scrollInterval = setInterval(async () => {
    const rootScrollableElement = document.getElementsByClassName(
      "simplebar-scroll-content"
    )[1];

    await scrollToBottom(rootScrollableElement);
    await wait(2000);

    if (await checkScrollEnd(rootScrollableElement, ERROR_MARGIN_PERCENT)) {
      console.log("Reached the end of the element within the error margin.");
      clearInterval(scrollInterval);
      await scrollToTop(rootScrollableElement);
      console.log("Executing the unfollow script...");
      await toggleUIState(false);
      const channels = await getChannels();
      console.log("Channels found:", channels.length);
      updateChannelSelect(channels);
    }
  }, 3000);
};

const getChannels = async () => {
  const userCardElements = document.querySelectorAll(
    '[data-a-target="user-card-modal"]'
  );

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
};

const startUnfollowProcess = async () => {
  try {
    document.getElementById("error-message").style.display = "none";
    document.getElementById("success-message").style.display = "none";
    await toggleUIState(true);
    const selectedOptions = document.querySelectorAll(
      "#selected-channels option"
    );
    const exceptionsList = Array.from(selectedOptions).map(
      (option) => option.text
    );

    const unfollowButtons = document.querySelectorAll(
      '[data-test-selector="unfollow-button"]'
    );

    for (const button of unfollowButtons) {
      const channelNameElement = button
        .closest('[data-a-target="user-card-modal"]')
        .querySelector("a");
      const channelName = channelNameElement
        ? channelNameElement.textContent.trim()
        : "";

      if (exceptionsList.includes(channelName)) {
        console.log(`Skipping ${channelName} as it is in the exceptions list.`);
        continue;
      }

      button.click();
      console.log(`Clicked the unfollow button for ${channelName}.`);

      await wait(1);

      const modalUnfollowButton = document.querySelector(
        '[data-a-target="modal-unfollow-button"]'
      );
      if (modalUnfollowButton) {
        modalUnfollowButton.click();
        console.log(`Confirmed the unfollow action for ${channelName}.`);
      }
    }
    document.getElementById("success-message").style.display = "block";
  } catch (error) {
    console.error("Erro detectado:", error);
    document.getElementById(
      "error-text"
    ).textContent = `Erro: ${error.message}`;
    document.getElementById("error-message").style.display = "block";
    document.getElementById("success-message").style.display = "none";
    await wait(2000);
  } finally {
    await toggleUIState(false);
    console.log("Finished unfollowing channels. Script ended.");
  }
};

// ============== UI Update Functions ==============

const toggleButtons = (disabled) => {
  document.querySelectorAll(".my-component button").forEach((button) => {
    button.disabled = disabled;
    button.style.cursor = disabled ? "not-allowed" : "pointer";
  });
};

const toggleLoader = (show) => {
  document.getElementById("loader").style.display = show ? "block" : "none";
};

const updateChannelSelect = (channels) => {
  const select = document.getElementById("channel-select");
  select.innerHTML = "";

  channels.forEach((channel) => {
    const option = document.createElement("option");
    option.value = channel.href;
    option.textContent = channel.ariaLabel;
    select.appendChild(option);
  });
};

// ============== Event Handlers and Other Utilities ==============

const confirmSelection = () => {
  const selectedOptions = document.querySelectorAll(
    "#channel-select option:checked"
  );
  const selectedValues = Array.from(selectedOptions).map(
    (option) => option.text
  );
  document.getElementById("selected-channels").value =
    selectedValues.join(", ");
};

const addSelectedChannels = () => {
  const selectedOptions = document.querySelectorAll(
    "#channel-select option:checked"
  );
  const selectedChannels = document.getElementById("selected-channels");

  selectedOptions.forEach((option) => {
    selectedChannels.appendChild(option);
  });
};

const removeSelectedChannels = () => {
  const selectedOptions = document.querySelectorAll(
    "#selected-channels option:checked"
  );
  const channelSelect = document.getElementById("channel-select");

  selectedOptions.forEach((option) => {
    channelSelect.appendChild(option);
  });
};

const filterOptions = (selectId, inputId) => {
  const input = document.getElementById(inputId);
  const filter = input.value.toUpperCase();
  const select = document.getElementById(selectId);
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

// ============== Event Listeners ==============

document
  .getElementById("channel-select")
  .addEventListener("keydown", function (event) {
    if (event.key === "Enter") {
      confirmSelection();
    }
  });

document
  .getElementById("popup-overlay")
  .addEventListener("click", function (event) {
    if (event.target === this) {
      this.style.display = "none";
    }
  });

document
  .querySelector(".my-component")
  .addEventListener("click", function (event) {
    event.stopPropagation();
  });

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

async function updateContentBasedOnLanguage() {
  const userLang = navigator.language.split("-")[0] ?? "";
  const langToUse = translations[userLang] ? userLang : "en";

  document.getElementById("title").textContent = translations[langToUse].title;
  document.getElementById("info-text").textContent =
    translations[langToUse].infoText;
  document.getElementById("explanation-text").textContent =
    translations[langToUse].explanationText;
  document.getElementById("analyze-button").textContent =
    translations[langToUse].analyzeButton;
  document.getElementById("channel-search").placeholder =
    translations[langToUse].searchPlaceholder;
  document.getElementById("add-button").textContent =
    translations[langToUse].addButton;
  document.getElementById("selected-channel-search").placeholder =
    translations[langToUse].searchSelectedPlaceholder;
  document.getElementById("remove-button").textContent =
    translations[langToUse].removeButton;
  document.getElementById("unfollow-button").textContent =
    translations[langToUse].unfollowButton;
  document.getElementById("success-text").textContent =
    translations[langToUse].successText;
}

updateContentBasedOnLanguage();

console.log("Script loaded successfully!");
