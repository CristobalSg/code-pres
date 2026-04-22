(function () {
  const sourceFiles = window.CODE_PRES_FILES || {};
  const presentations = window.CODE_PRES_PRESENTATIONS || {};
  const availableFiles = Object.keys(sourceFiles).sort();

  const state = {
    currentFile: resolveInitialFile(),
    currentSectionKey: null,
    theme: resolveInitialTheme(),
  };

  const elements = {
    fileList: document.getElementById("file-list"),
    explanationTitle: document.getElementById("explanation-title"),
    explanationSummary: document.getElementById("explanation-summary"),
    explanationPoints: document.getElementById("explanation-points"),
    codeFileLabel: document.getElementById("code-file-label"),
    codeToolbarHint: document.getElementById("code-toolbar-hint"),
    codeContent: document.getElementById("code-content"),
    themeToggle: document.getElementById("theme-toggle"),
    themeToggleText: document.getElementById("theme-toggle-text"),
  };

  function resolveInitialFile() {
    const decodedHash = decodeURIComponent(window.location.hash.replace(/^#/, ""));
    if (decodedHash && sourceFiles[decodedHash]) {
      return decodedHash;
    }

    if (sourceFiles["src/cifrado_aes_ctr_paralelo.py"]) {
      return "src/cifrado_aes_ctr_paralelo.py";
    }

    return availableFiles[0] || "";
  }

  function resolveInitialTheme() {
    const savedTheme = window.localStorage.getItem("code-pres-theme");
    if (savedTheme === "dark" || savedTheme === "light") {
      return savedTheme;
    }

    return "dark";
  }

  function getPresentation(filePath) {
    return presentations[filePath] || {};
  }

  function getSections(filePath) {
    const presentation = getPresentation(filePath);
    return Array.isArray(presentation.sections) ? presentation.sections : [];
  }

  function getCurrentSection() {
    return getSections(state.currentFile).find((section) => section.key === state.currentSectionKey) || null;
  }

  function escapeHtml(text) {
    return text
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;");
  }

  function getFileLines(filePath) {
    return (sourceFiles[filePath] || "").split("\n");
  }

  function getFileSummary(filePath) {
    const fileName = filePath.split("/").pop();
    const presentation = getPresentation(filePath);
    return {
      title: presentation.title || fileName,
      summary: presentation.summary || "Archivo del proyecto disponible para presentacion.",
      points: presentation.points || [
        "Muestra el codigo completo embebido dentro del presentador.",
        "Puede ampliarse con explicaciones por seccion mas adelante.",
        "Forma parte del conjunto de archivos de src listos para exponer.",
      ],
    };
  }

  function getSectionByKey(filePath, sectionKey) {
    return getSections(filePath).find((section) => section.key === sectionKey) || null;
  }

  function getSectionForLine(sections, lineNumber) {
    return sections.find(
      (section) => lineNumber >= section.lineStart && lineNumber <= section.lineEnd
    ) || null;
  }

  function setCurrentFile(filePath) {
    state.currentFile = filePath;
    state.currentSectionKey = null;
    syncHash();
    render();
  }

  function setTheme(theme) {
    state.theme = theme;
    document.body.dataset.theme = theme;
    window.localStorage.setItem("code-pres-theme", theme);
    renderThemeToggle();
  }

  function toggleTheme() {
    setTheme(state.theme === "dark" ? "light" : "dark");
  }

  function toggleSection(sectionKey) {
    state.currentSectionKey = state.currentSectionKey === sectionKey ? null : sectionKey;
    render();
    if (state.currentSectionKey) {
      scrollToSelectedRange();
    }
  }

  function syncHash() {
    if (state.currentFile) {
      window.location.hash = encodeURIComponent(state.currentFile);
    }
  }

  function renderFileList() {
    elements.fileList.innerHTML = availableFiles
      .map((filePath) => {
        const info = getFileSummary(filePath);
        const isActive = filePath === state.currentFile ? " active" : "";
        return [
          `<button class="file-item${isActive}" type="button" data-file-path="${escapeHtml(filePath)}">`,
          `<span class="file-item-title">${escapeHtml(info.title)}</span>`,
          `</button>`,
        ].join("");
      })
      .join("");

    elements.fileList.querySelectorAll("[data-file-path]").forEach((button) => {
      button.addEventListener("click", () => {
        setCurrentFile(button.dataset.filePath);
      });
    });
  }

  function renderExplanation() {
    const fileInfo = getFileSummary(state.currentFile);
    const currentSection = getCurrentSection();

    if (currentSection) {
      elements.explanationTitle.textContent = currentSection.title;
      elements.explanationSummary.textContent = currentSection.summary;
      elements.explanationPoints.innerHTML = currentSection.points
        .map((point) => `<li>${escapeHtml(point)}</li>`)
        .join("");
      return;
    }

    elements.explanationTitle.textContent = fileInfo.title;
    elements.explanationSummary.textContent = fileInfo.summary;
    elements.explanationPoints.innerHTML = fileInfo.points
      .map((point) => `<li>${escapeHtml(point)}</li>`)
      .join("");
  }

  function renderViewerHeader() {
    const sections = getSections(state.currentFile);

    elements.codeFileLabel.textContent = state.currentFile;
    elements.codeToolbarHint.textContent = sections.length
      ? "Haz clic en las zonas verdes para ver la explicacion"
      : "Visor completo";
  }

  function renderThemeToggle() {
    elements.themeToggleText.textContent = state.theme === "dark" ? "Modo claro" : "Modo oscuro";
    elements.themeToggle.setAttribute(
      "aria-label",
      state.theme === "dark" ? "Cambiar a modo claro" : "Cambiar a modo oscuro"
    );
  }

  function renderCode() {
    const lines = getFileLines(state.currentFile);
    const sections = getSections(state.currentFile);
    const currentSection = getCurrentSection();

    elements.codeContent.innerHTML = lines
      .map((line, index) => {
        const lineNumber = index + 1;
        const sectionForLine = getSectionForLine(sections, lineNumber);
        const inAnyRange = Boolean(sectionForLine);
        const inSelectedRange = Boolean(currentSection && sectionForLine?.key === currentSection.key);
        const classes = ["code-line"];
        const attributes = [`data-line-number="${lineNumber}"`];
        let rangeLabel = "";

        if (inAnyRange) {
          classes.push("in-range");
          attributes.push(`data-section-key="${escapeHtml(sectionForLine.key)}"`);
          if (lineNumber === sectionForLine.lineStart) {
            classes.push("range-start");
            rangeLabel = `<span class="range-chip">${escapeHtml(sectionForLine.title)}</span>`;
          }
          if (lineNumber === sectionForLine.lineEnd) {
            classes.push("range-end");
          }
        }
        if (inSelectedRange) {
          classes.push("selected");
        }

        return [
          `<span class="${classes.join(" ")}" ${attributes.join(" ")}>`,
          `<span class="line-number">${lineNumber}</span>`,
          `<span class="line-text">${escapeHtml(line) || " "}</span>`,
          rangeLabel,
          `</span>`,
        ].join("");
      })
      .join("");
  }

  function scrollToSelectedRange() {
    const currentSection = getCurrentSection();
    if (!currentSection) {
      return;
    }

    window.requestAnimationFrame(() => {
      const targetLine = elements.codeContent.querySelector(
        `[data-line-number="${currentSection.lineStart}"]`
      );
      if (targetLine) {
        targetLine.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    });
  }

  function render() {
    renderFileList();
    renderExplanation();
    renderViewerHeader();
    renderCode();
    renderThemeToggle();
  }

  elements.codeContent.addEventListener("click", (event) => {
    const line = event.target.closest(".code-line[data-section-key]");
    if (!line) {
      return;
    }

    const section = getSectionByKey(state.currentFile, line.dataset.sectionKey);
    if (!section) {
      return;
    }

    toggleSection(section.key);
  });

  window.addEventListener("hashchange", () => {
    const decodedHash = decodeURIComponent(window.location.hash.replace(/^#/, ""));
    if (decodedHash && decodedHash !== state.currentFile && sourceFiles[decodedHash]) {
      state.currentFile = decodedHash;
      state.currentSectionKey = null;
      render();
    }
  });

  elements.themeToggle.addEventListener("click", () => {
    toggleTheme();
  });

  document.body.dataset.theme = state.theme;
  render();
})();
