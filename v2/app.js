console.log("DOE v2 dynamic system + clean infos layout 🚀");

const AUTOSAVE_KEY = "doe_v2_autosave";
const DRAFTS_KEY = "doe_v2_saved_drafts";

const referenceData = {
    workTypes: [
        "RENOVATION CHAUFFERIE",
        "RENOVATION SOUS-STATION"
    ],

    postalCodes: {
        "75001": ["PARIS"],
        "75002": ["PARIS"],
        "94100": ["SAINT-MAUR-DES-FOSSES"],
        "94300": ["VINCENNES"],
        "92100": ["BOULOGNE-BILLANCOURT"]
    }
};

/* ========================
   GLOBAL STATE
======================== */
let state = loadAutosave() || getEmptyState();

/* ========================
   STEP CONFIG
======================== */
const stepsConfig = [
    { title: "Infos", render: renderInfos },
    { title: "Fiches techniques", render: () => renderDynamicSection("fiches", ["type", "marque", "modele", "fichier"]) },
    { title: "Procès-verbaux", render: () => renderDynamicSection("pv", ["type", "fichier"]) },
    { title: "Schémas", render: () => renderDynamicSection("schemas", ["type", "fichier"]) },
    { title: "Export", render: renderSummary }
];

/* ========================
   DOM REFERENCES
======================== */
const steps = document.querySelectorAll(".step");
const content = document.getElementById("step-content");
const chantierBannerZone = document.getElementById("chantier-banner-zone");
const nextStepBtn = document.getElementById("next-step");
const prevStepBtn = document.getElementById("prev-step");

const draftsModal = document.getElementById("drafts-modal");
const draftsList = document.getElementById("drafts-list");
const openDraftsBtn = document.getElementById("open-drafts-btn");
const closeDraftsBtn = document.getElementById("close-drafts-btn");
const toastContainer = document.getElementById("toast-container");

const confirmModal = document.getElementById("confirm-modal");
const confirmTitle = document.getElementById("confirm-title");
const confirmMessage = document.getElementById("confirm-message");
const confirmOkBtn = document.getElementById("confirm-ok-btn");
const confirmCancelBtn = document.getElementById("confirm-cancel-btn");
const closeConfirmBtn = document.getElementById("close-confirm-btn");

/* ========================
   STEP SWITCHING
======================== */
steps.forEach((step, index) => {
    step.addEventListener("click", () => goToStep(index));
});

function goToStep(index) {
    state.currentStep = index;

    steps.forEach(step => step.classList.remove("active"));
    if (steps[index]) steps[index].classList.add("active");

    saveAutosave();
    renderStep();
}

function renderStep() {
    renderChantierBanner();

    const step = stepsConfig[state.currentStep];
    content.innerHTML = "";
    step.render();

    prevStepBtn.style.visibility = state.currentStep === 0 ? "hidden" : "visible";
    nextStepBtn.style.visibility = state.currentStep === stepsConfig.length - 1 ? "hidden" : "visible";

    initDropzones();
    initCustomSelects();
}

/* ========================
   EMPTY STATE
======================== */
function getEmptyState() {
    return {
        currentStep: 0,
        data: {
            infos: {
                adresse: "",
                nature_travaux: "",
                code_postal: "",
                ville: "",
                date_reception: "",
                date_doe: "",
                notes: ""
            },
            fiches: [],
            pv: [],
            schemas: []
        }
    };
}

/* ========================
   DATE HELPERS
======================== */
function getTodayDate() {
    return new Date().toISOString().split("T")[0];
}

function formatDateDisplay(value) {
    if (!value) return "JJ/MM/AAAA";
    const [year, month, day] = value.split("-");
    if (!year || !month || !day) return value;
    return `${day}/${month}/${year}`;
}

/* ========================
   CHANTIER BANNER
======================== */
function getCurrentAddressLine() {
    const { adresse, code_postal, ville } = state.data.infos;
    return [adresse, code_postal, ville].filter(Boolean).join(" ");
}

function getDraftDisplayTitle() {
    const { adresse, ville, code_postal } = state.data.infos;
    if (adresse || ville || code_postal) {
        return [adresse, code_postal, ville].filter(Boolean).join(" ");
    }
    return "Brouillon sans adresse";
}

function renderChantierBanner() {
    const addressLine = getCurrentAddressLine();

    chantierBannerZone.innerHTML = `
        <div class="chantier-banner">
            <div class="chantier-banner-text">
                <span class="chantier-label">Chantier</span>
                <div class="chantier-value">
                    ${addressLine ? escapeHtml(addressLine) : "Adresse non renseignée"}
                </div>
            </div>

            <div class="banner-actions">
                <button type="button" class="banner-btn" onclick="saveDraft()">Enregistrer</button>
                <button type="button" class="footer-btn secondary-action" onclick="clearAutosave()">Effacer</button>
            </div>
        </div>
    `;
}

/* ========================
   INFOS HELPERS
======================== */
function handleInputChange(section, field, value, inputEl = null) {
    if (!state.data[section]) return;

    const shouldUppercase = !["notes", "date_reception", "date_doe"].includes(field);
    const finalValue = shouldUppercase ? value.toUpperCase() : value;

    state.data[section][field] = finalValue;

    if (inputEl && shouldUppercase) {
        inputEl.value = finalValue;
    }

    saveAutosave();
}

function handlePostalCodeChange(value) {
    const code = value.toUpperCase();
    const villes = referenceData.postalCodes[code] || [];

    state.data.infos.code_postal = code;

    if (villes.length === 1) {
        state.data.infos.ville = villes[0];
    } else if (!villes.includes(state.data.infos.ville)) {
        state.data.infos.ville = "";
    }

    saveAutosave();
    renderChantierBanner();
    renderStep();
}

/* ========================
   CUSTOM SELECT
======================== */
function renderCustomSelect({
    id,
    label,
    value,
    placeholder,
    options,
    onSelect,
    disabled = false
}) {
    const displayValue = value || placeholder;
    const isPlaceholder = !value;
    const safeOptions = Array.isArray(options) ? options : [];

    return `
        <div class="field">
            <label>${label}</label>
            <div class="custom-select ${disabled ? "is-disabled" : ""}" data-select-id="${id}">
                <button
                    type="button"
                    class="custom-select-trigger ${isPlaceholder ? "is-placeholder" : ""}"
                    onclick="${disabled ? "" : `toggleCustomSelect('${id}')`}"
                    ${disabled ? "disabled" : ""}
                >
                    <span class="select-value">${escapeHtml(displayValue)}</span>
                    <span class="material-symbols-outlined select-chevron">expand_more</span>
                </button>

                ${
                    !disabled && safeOptions.length > 0
                        ? `
                        <div class="custom-select-menu">
                            <div class="custom-select-list">
                                ${safeOptions.map(option => `
                                    <button
                                        type="button"
                                        class="custom-select-option ${value === option ? "is-active" : ""}"
                                        onclick="${onSelect}('${escapeJs(option)}')"
                                    >
                                        ${escapeHtml(option)}
                                    </button>
                                `).join("")}
                            </div>
                        </div>
                        `
                        : ""
                }
            </div>
        </div>
    `;
}

function toggleCustomSelect(id) {
    const all = document.querySelectorAll(".custom-select");
    all.forEach(el => {
        if (el.dataset.selectId !== id) {
            el.classList.remove("is-open");
        }
    });

    const target = document.querySelector(`.custom-select[data-select-id="${id}"]`);
    if (!target) return;
    target.classList.toggle("is-open");
}

function closeAllCustomSelects() {
    document.querySelectorAll(".custom-select").forEach(el => {
        el.classList.remove("is-open");
    });
}

function initCustomSelects() {
    document.addEventListener("click", handleDocumentClickForSelects, { once: true });
}

function handleDocumentClickForSelects(event) {
    const insideSelect = event.target.closest(".custom-select");
    if (!insideSelect) {
        closeAllCustomSelects();
    } else {
        initCustomSelects();
    }
}

function setNatureTravaux(value) {
    state.data.infos.nature_travaux = value;
    saveAutosave();
    renderStep();
}

function setVille(value) {
    state.data.infos.ville = value;
    saveAutosave();
    renderChantierBanner();
    renderStep();
}

/* ========================
   CUSTOM DATE
======================== */
function renderCustomDateField({ label, field, value }) {
    const realValue = value || "";
    const displayValue = formatDateDisplay(realValue);

    return `
        <div class="field">
            <label>${label}</label>
            <div class="custom-date" data-date-id="${field}">
                <button
                    type="button"
                    class="custom-date-button"
                    onclick="toggleDatePicker('${field}')"
                >
                    <span class="date-value">${displayValue}</span>
                    <span class="material-symbols-outlined date-icon">calendar_today</span>
                </button>

                <div class="custom-date-panel" id="date-panel-${field}"></div>
            </div>
        </div>
    `;
}

function parseISODate(value) {
    if (!value) return null;
    const [year, month, day] = value.split("-").map(Number);
    if (!year || !month || !day) return null;
    return new Date(year, month - 1, day);
}

function formatISODate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

function getCalendarState(field) {
    const selectedValue = state.data.infos[field];
    const selectedDate = parseISODate(selectedValue) || new Date();

    return {
        field,
        selectedValue: selectedValue || "",
        selectedDate,
        viewYear: selectedDate.getFullYear(),
        viewMonth: selectedDate.getMonth()
    };
}

let openDatePickerId = null;
const datePickerViews = {};

function toggleDatePicker(field) {
    const alreadyOpen = openDatePickerId === field;
    closeAllDatePickers();

    if (alreadyOpen) return;

    const selected = parseISODate(state.data.infos[field]) || new Date();
    datePickerViews[field] = {
        year: selected.getFullYear(),
        month: selected.getMonth()
    };

    openDatePickerId = field;
    renderDatePicker(field);
    bindOutsideDatePickerClose();
}

function closeAllDatePickers() {
    document.querySelectorAll(".custom-date").forEach(el => {
        el.classList.remove("is-open");
    });

    document.querySelectorAll(".custom-date-panel").forEach(panel => {
        panel.innerHTML = "";
    });

    openDatePickerId = null;
}

function bindOutsideDatePickerClose() {
    document.addEventListener("click", handleOutsideDatePickerClose, { once: true });
}

function handleOutsideDatePickerClose(event) {
    const inside = event.target.closest(".custom-date");
    if (!inside) {
        closeAllDatePickers();
    } else {
        bindOutsideDatePickerClose();
    }
}

function renderDatePicker(field) {
    const wrapper = document.querySelector(`.custom-date[data-date-id="${field}"]`);
    const panel = document.getElementById(`date-panel-${field}`);
    if (!wrapper || !panel) return;

    wrapper.classList.add("is-open");

    const selectedValue = state.data.infos[field] || "";
    const selectedDate = parseISODate(selectedValue);
    const today = new Date();

    const view = datePickerViews[field] || {
        year: today.getFullYear(),
        month: today.getMonth()
    };

    const year = view.year;
    const month = view.month;

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startWeekday = (firstDay.getDay() + 6) % 7; // Monday first
    const daysInMonth = lastDay.getDate();

    const monthLabel = firstDay.toLocaleDateString("fr-FR", {
        month: "long",
        year: "numeric"
    });

    const weekdays = ["L", "M", "M", "J", "V", "S", "D"];

    const cells = [];

    for (let i = 0; i < startWeekday; i++) {
        cells.push(`<div class="calendar-empty"></div>`);
    }

    for (let day = 1; day <= daysInMonth; day++) {
        const current = new Date(year, month, day);
        const iso = formatISODate(current);

        const isSelected = selectedValue === iso;
        const isToday = formatISODate(today) === iso;

        cells.push(`
            <button
                type="button"
                class="calendar-day ${isSelected ? "is-selected" : ""} ${isToday ? "is-today" : ""}"
                onclick="selectDateValue('${field}', '${iso}')"
            >
                ${day}
            </button>
        `);
    }

    panel.innerHTML = `
        <div class="calendar-shell">
            <div class="calendar-header">
                <button type="button" class="calendar-nav" onclick="changeDateView('${field}', -1)">
                    <span class="material-symbols-outlined">chevron_left</span>
                </button>

                <div class="calendar-title">${capitalize(monthLabel)}</div>

                <button type="button" class="calendar-nav" onclick="changeDateView('${field}', 1)">
                    <span class="material-symbols-outlined">chevron_right</span>
                </button>
            </div>

            <div class="calendar-weekdays">
                ${weekdays.map(d => `<div class="calendar-weekday">${d}</div>`).join("")}
            </div>

            <div class="calendar-grid">
                ${cells.join("")}
            </div>

            <div class="calendar-footer">
                <button type="button" class="calendar-footer-btn" onclick="selectDateValue('${field}', '${formatISODate(today)}')">
                    Aujourd’hui
                </button>
                <button type="button" class="calendar-footer-btn ghost" onclick="clearDateValue('${field}')">
                    Effacer
                </button>
            </div>
        </div>
    `;
}

function changeDateView(field, direction) {
    const current = datePickerViews[field];
    if (!current) return;

    let month = current.month + direction;
    let year = current.year;

    if (month < 0) {
        month = 11;
        year -= 1;
    }

    if (month > 11) {
        month = 0;
        year += 1;
    }

    datePickerViews[field] = { year, month };
    renderDatePicker(field);
}

function selectDateValue(field, isoValue) {
    state.data.infos[field] = isoValue;
    saveAutosave();
    closeAllDatePickers();
    renderStep();
}

function clearDateValue(field) {
    state.data.infos[field] = "";
    saveAutosave();
    closeAllDatePickers();
    renderStep();
}

function capitalize(value) {
    if (!value) return value;
    return value.charAt(0).toUpperCase() + value.slice(1);
}

/* ========================
   STEP 1 — INFOS
======================== */
function renderInfos() {
    const infos = state.data.infos;
    const cityOptions = referenceData.postalCodes[infos.code_postal] || [];

    content.innerHTML = `
        <div class="single-panel-layout">
            <div class="panel">
                <div class="section-toolbar">
                    <div>
                        <h3>Informations chantier</h3>
                    </div>
                </div>

                <div class="infos-form-grid">
                    <div class="infos-adresse">
                        <div class="field">
                            <label>Adresse</label>
                            <input
                                value="${escapeHtml(infos.adresse || "")}"
                                oninput="handleInputChange('infos','adresse', this.value, this); renderChantierBanner();"
                            />
                        </div>
                    </div>

                    <div class="infos-nature">
                        ${renderCustomSelect({
                            id: "nature-travaux-select",
                            label: "Nature des travaux",
                            value: infos.nature_travaux,
                            placeholder: "Rénovation chaufferie",
                            options: referenceData.workTypes,
                            onSelect: "setNatureTravaux",
                            disabled: false
                        })}
                    </div>

                    <div class="infos-left-row">
                        <div class="field">
                            <label>CP</label>
                            <input
                                value="${escapeHtml(infos.code_postal || "")}"
                                oninput="handlePostalCodeChange(this.value)"
                            />
                        </div>

                        <div>
                            ${renderCustomSelect({
                                id: "ville-select",
                                label: "Ville",
                                value: infos.ville,
                                placeholder: "Sélectionner",
                                options: cityOptions,
                                onSelect: "setVille",
                                disabled: cityOptions.length === 0
                            })}
                        </div>
                    </div>

                    <div class="infos-right-row">
                        ${renderCustomDateField({
                            label: "Date de réception",
                            field: "date_reception",
                            value: infos.date_reception
                        })}

                        ${renderCustomDateField({
                            label: "Date DOE",
                            field: "date_doe",
                            value: infos.date_doe || getTodayDate()
                        })}
                    </div>

                    <div class="infos-notes">
                        <div class="field">
                            <label>Notes</label>
                            <textarea
                                oninput="handleInputChange('infos','notes', this.value, this)"
                            >${escapeHtml(infos.notes || "")}</textarea>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

/* ========================
   DYNAMIC SECTION
======================== */
function renderDynamicSection(key, fields) {
    const list = state.data[key];

    content.innerHTML = `
        <div class="single-panel-layout">
            <div class="panel">
                <div class="section-toolbar">
                    <div>
                        <h3>${getSectionTitle(key)}</h3>
                        <p class="panel-muted">${getSectionSubtitle(key)}</p>
                    </div>
                    <button class="add-row-btn" onclick="addRow('${key}')">+ Ajouter</button>
                </div>

                ${
                    list.length === 0
                        ? `
                        <div class="empty-state">
                            <p>Aucun élément ajouté pour le moment.</p>
                        </div>
                        `
                        : `
                        <div class="dynamic-list">
                            ${list.map((item, index) => renderRow(key, item, index, fields)).join("")}
                        </div>
                        `
                }
            </div>
        </div>
    `;
}

function renderRow(key, item, index, fields) {
    const nonFileFields = fields.filter(field => field !== "fichier");
    const hasFileField = fields.includes("fichier");

    return `
        <div class="dynamic-card">
            <div class="dynamic-card-header">
                <span class="dynamic-card-title">${getSectionTitle(key)} ${index + 1}</span>
                <button class="remove-row-btn" onclick="removeRow('${key}', ${index})">Supprimer</button>
            </div>

            <div class="row-inline-layout">
                ${nonFileFields.map(field => `
                    <div class="field row-inline-field ${getInlineSpanClass(nonFileFields.length)}">
                        <label>${prettyLabel(field)}</label>
                        <input
                            value="${escapeHtml(item[field] || "")}"
                            placeholder="${prettyPlaceholder(field)}"
                            oninput="updateRow('${key}', ${index}, '${field}', this.value, this)"
                        />
                    </div>
                `).join("")}

                ${
                    hasFileField
                        ? `
                        <div class="field row-inline-upload">
                            <label>Fichier</label>
                            <div class="upload-inline">
                                <input
                                    id="file-input-${key}-${index}"
                                    class="hidden-file-input"
                                    type="file"
                                    accept=".pdf,image/*"
                                    onchange="handleFileUpload('${key}', ${index}, this)"
                                />

                                <div
                                    class="dropzone-inline"
                                    data-input-id="file-input-${key}-${index}"
                                    data-section="${key}"
                                    data-index="${index}"
                                >
                                    Déposer ou cliquer
                                </div>

                                <div class="file-name-inline ${item.fileName ? "has-file" : ""}">
                                    ${item.fileName ? escapeHtml(item.fileName) : "Aucun fichier"}
                                </div>

                                ${
                                    item.file
                                        ? `
                                            <button
                                                class="icon-btn-inline preview"
                                                type="button"
                                                aria-label="Voir le fichier"
                                                onclick="openFile('${key}', ${index}, this)"
                                            >
                                                <span class="material-symbols-outlined icon-default">visibility</span>
                                                <span class="material-symbols-outlined icon-spinner">progress_activity</span>
                                            </button>

                                            <button
                                                class="icon-btn-inline delete"
                                                type="button"
                                                aria-label="Supprimer le fichier"
                                                onclick="deleteFile('${key}', ${index})"
                                            >
                                                <span class="material-symbols-outlined icon-default">delete</span>
                                            </button>
                                          `
                                        : ""
                                }
                            </div>
                        </div>
                        `
                        : ""
                }
            </div>
        </div>
    `;
}

function getInlineSpanClass(fieldCount) {
    if (fieldCount === 1) return "span-wide";
    if (fieldCount === 2) return "span-medium";
    return "span-small";
}

function addRow(key) {
    state.data[key].push({});
    saveAutosave();
    renderStep();
}

function removeRow(key, index) {
    state.data[key].splice(index, 1);
    saveAutosave();
    renderStep();
}

function updateRow(key, index, field, value, inputEl = null) {
    const finalValue = value.toUpperCase();
    state.data[key][index][field] = finalValue;

    if (inputEl) {
        inputEl.value = finalValue;
    }

    saveAutosave();
}

function handleFileUpload(section, index, input) {
    const file = input.files[0];
    if (!file) return;

    const reader = new FileReader();

    reader.onload = function (e) {
        const base64 = e.target.result;

        state.data[section][index].file = base64;
        state.data[section][index].fileName = file.name;
        state.data[section][index].fileType = file.type;

        saveAutosave();
        renderStep();
        showToast("Fichier ajouté.", "success");
    };

    reader.readAsDataURL(file);
}

function deleteFile(section, index) {
    askConfirm({
        title: "Supprimer le fichier",
        message: "Le fichier joint à cette ligne sera supprimé.",
        confirmLabel: "Supprimer",
        onConfirm: () => {
            const item = state.data[section]?.[index];
            if (!item) return;

            delete item.file;
            delete item.fileName;
            delete item.fileType;

            saveAutosave();
            renderStep();
            showToast("Fichier supprimé.", "info");
        }
    });
}

function openFile(section, index, buttonEl) {
    const item = state.data[section]?.[index];
    if (!item?.file) return;

    if (buttonEl) {
        buttonEl.classList.add("is-loading");
        buttonEl.disabled = true;
    }

    try {
        const blob = dataURLToBlob(item.file);
        const objectUrl = URL.createObjectURL(blob);
        window.open(objectUrl, "_blank");

        setTimeout(() => {
            URL.revokeObjectURL(objectUrl);
        }, 10000);
    } catch (error) {
        console.error("Erreur ouverture fichier :", error);
        showToast("Impossible d’ouvrir ce fichier.", "error");
    } finally {
        setTimeout(() => {
            if (buttonEl) {
                buttonEl.classList.remove("is-loading");
                buttonEl.disabled = false;
            }
        }, 700);
    }
}

function dataURLToBlob(dataURL) {
    const parts = dataURL.split(",");
    const mimeMatch = parts[0].match(/:(.*?);/);
    const mime = mimeMatch ? mimeMatch[1] : "application/octet-stream";
    const byteString = atob(parts[1]);
    const arrayBuffer = new ArrayBuffer(byteString.length);
    const uintArray = new Uint8Array(arrayBuffer);

    for (let i = 0; i < byteString.length; i++) {
        uintArray[i] = byteString.charCodeAt(i);
    }

    return new Blob([arrayBuffer], { type: mime });
}

function initDropzones() {
    const dropzones = document.querySelectorAll(".dropzone-inline");

    dropzones.forEach(dropzone => {
        const inputId = dropzone.dataset.inputId;
        const section = dropzone.dataset.section;
        const index = Number(dropzone.dataset.index);
        const input = document.getElementById(inputId);

        if (!input) return;

        dropzone.addEventListener("click", () => {
            input.click();
        });

        dropzone.addEventListener("dragover", (event) => {
            event.preventDefault();
            dropzone.classList.add("dragover");
        });

        dropzone.addEventListener("dragleave", () => {
            dropzone.classList.remove("dragover");
        });

        dropzone.addEventListener("drop", (event) => {
            event.preventDefault();
            dropzone.classList.remove("dragover");

            const files = event.dataTransfer.files;
            if (!files || !files.length) return;

            const dt = new DataTransfer();
            dt.items.add(files[0]);
            input.files = dt.files;

            handleFileUpload(section, index, input);
        });
    });
}

/* ========================
   EXPORT SUMMARY
======================== */
function renderSummary() {
    const { infos, fiches, pv, schemas } = state.data;

    content.innerHTML = `
        <div class="single-panel-layout">
            <div class="panel">
                <div class="section-toolbar">
                    <div>
                        <h3>Export</h3>
                    </div>
                </div>

                <div class="summary-list">
                    <div class="summary-item">
                        <span>Adresse</span>
                        <strong>${infos.adresse ? escapeHtml(infos.adresse) : "—"}</strong>
                    </div>
                    <div class="summary-item">
                        <span>Ville</span>
                        <strong>${infos.ville ? escapeHtml(infos.ville) : "—"}</strong>
                    </div>
                    <div class="summary-item">
                        <span>Code postal</span>
                        <strong>${infos.code_postal ? escapeHtml(infos.code_postal) : "—"}</strong>
                    </div>
                    <div class="summary-item">
                        <span>Nature des travaux</span>
                        <strong>${infos.nature_travaux ? escapeHtml(infos.nature_travaux) : "—"}</strong>
                    </div>
                    <div class="summary-item">
                        <span>Fiches techniques</span>
                        <strong>${fiches.length}</strong>
                    </div>
                    <div class="summary-item">
                        <span>Procès-verbaux</span>
                        <strong>${pv.length}</strong>
                    </div>
                    <div class="summary-item">
                        <span>Schémas</span>
                        <strong>${schemas.length}</strong>
                    </div>
                </div>
            </div>
        </div>
    `;
}

/* ========================
   AUTOSAVE
======================== */
function saveAutosave() {
    try {
        localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(state));
    } catch (error) {
        console.error("Erreur autosave :", error);
        showToast("Impossible de sauvegarder localement.", "error");
    }
}

function loadAutosave() {
    try {
        const raw = localStorage.getItem(AUTOSAVE_KEY);
        return raw ? JSON.parse(raw) : null;
    } catch (error) {
        console.error("Erreur chargement autosave :", error);
        return null;
    }
}

function clearAutosave() {
    askConfirm({
        title: "Effacer le brouillon local",
        message: "Le brouillon en cours sera supprimé de cet appareil. Cette action est irréversible.",
        confirmLabel: "Effacer",
        onConfirm: () => {
            localStorage.removeItem(AUTOSAVE_KEY);
            state = getEmptyState();
            goToStep(0);
            showToast("Brouillon local effacé.", "info");
        }
    });
}

/* ========================
   DRAFTS STORAGE
======================== */
function getAllDrafts() {
    try {
        const raw = localStorage.getItem(DRAFTS_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch (error) {
        console.error("Erreur lecture brouillons :", error);
        return [];
    }
}

function setAllDrafts(drafts) {
    localStorage.setItem(DRAFTS_KEY, JSON.stringify(drafts));
}

function buildDraftPayload() {
    return {
        id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
        title: getDraftDisplayTitle(),
        updatedAt: new Date().toISOString(),
        state: JSON.parse(JSON.stringify(state))
    };
}

function saveDraft() {
    const drafts = getAllDrafts();
    const payload = buildDraftPayload();

    drafts.unshift(payload);
    setAllDrafts(drafts);
    saveAutosave();
    showToast("Brouillon enregistré.", "success");
}

function openDraftsModal() {
    renderDraftsList();
    draftsModal.classList.remove("hidden");
}

function closeDraftsModal() {
    draftsModal.classList.add("hidden");
}

function renderDraftsList() {
    const drafts = getAllDrafts();

    if (drafts.length === 0) {
        draftsList.innerHTML = `
            <div class="empty-drafts">
                Aucun brouillon enregistré pour le moment.
            </div>
        `;
        return;
    }

    draftsList.innerHTML = drafts.map(draft => `
        <div class="draft-item">
            <div class="draft-main">
                <div class="draft-title">${escapeHtml(draft.title || "Brouillon")}</div>
                <div class="draft-meta">
                    Dernière mise à jour : ${formatDraftDate(draft.updatedAt)}
                </div>
            </div>

            <div class="draft-actions">
                <button class="draft-btn load" onclick="loadDraft('${draft.id}')">Ouvrir</button>
                <button class="draft-btn delete" onclick="deleteDraft('${draft.id}')">Supprimer</button>
            </div>
        </div>
    `).join("");
}

function loadDraft(draftId) {
    const drafts = getAllDrafts();
    const draft = drafts.find(item => item.id === draftId);
    if (!draft) return;

    state = draft.state;
    saveAutosave();
    closeDraftsModal();
    goToStep(state.currentStep || 0);
    showToast("Brouillon chargé.", "success");
}

function deleteDraft(draftId) {
    askConfirm({
        title: "Supprimer le brouillon",
        message: "Ce brouillon enregistré sera supprimé définitivement.",
        confirmLabel: "Supprimer",
        onConfirm: () => {
            const drafts = getAllDrafts().filter(item => item.id !== draftId);
            setAllDrafts(drafts);
            renderDraftsList();
            showToast("Brouillon supprimé.", "info");
        }
    });
}

function formatDraftDate(value) {
    try {
        return new Date(value).toLocaleString("fr-FR");
    } catch {
        return value || "Date inconnue";
    }
}

/* ========================
   CONFIRM MODAL
======================== */
function askConfirm({
    title = "Confirmation",
    message = "Es-tu sûr de vouloir continuer ?",
    confirmLabel = "Confirmer",
    onConfirm = () => {}
}) {
    if (!confirmModal) return;

    confirmTitle.textContent = title;
    confirmMessage.textContent = message;
    confirmOkBtn.textContent = confirmLabel;

    confirmModal.classList.remove("hidden");

    const handleConfirm = () => {
        cleanup();
        onConfirm();
    };

    const handleClose = () => {
        cleanup();
    };

    const handleBackdrop = (event) => {
        if (event.target === confirmModal) {
            cleanup();
        }
    };

    function cleanup() {
        confirmModal.classList.add("hidden");
        confirmOkBtn.removeEventListener("click", handleConfirm);
        confirmCancelBtn.removeEventListener("click", handleClose);
        closeConfirmBtn.removeEventListener("click", handleClose);
        confirmModal.removeEventListener("click", handleBackdrop);
    }

    confirmOkBtn.addEventListener("click", handleConfirm);
    confirmCancelBtn.addEventListener("click", handleClose);
    closeConfirmBtn.addEventListener("click", handleClose);
    confirmModal.addEventListener("click", handleBackdrop);
}

/* ========================
   TOASTS
======================== */
function showToast(message, type = "info") {
    if (!toastContainer) return;

    const toast = document.createElement("div");
    toast.className = `toast ${type}`;

    const iconMap = {
        success: "check_circle",
        error: "error",
        info: "info"
    };

    toast.innerHTML = `
        <span class="material-symbols-outlined toast-icon">${iconMap[type] || "info"}</span>
        <div class="toast-message">${escapeHtml(message)}</div>
    `;

    toastContainer.appendChild(toast);

    setTimeout(() => {
        toast.classList.add("is-hiding");
        toast.addEventListener("animationend", () => {
            toast.remove();
        }, { once: true });
    }, 2600);
}

/* ========================
   HELPERS
======================== */
function getSectionTitle(key) {
    const map = {
        fiches: "Fiches techniques",
        pv: "Procès-verbaux",
        schemas: "Schémas"
    };
    return map[key] || key;
}

function getSectionSubtitle(key) {
    const map = {
        fiches: "Ajoutez les équipements, marques, modèles et fichiers.",
        pv: "Ajoutez les documents de réception, contrôle ou mise en service.",
        schemas: "Ajoutez les schémas hydrauliques, électriques ou d’équilibrage."
    };
    return map[key] || "";
}

function prettyLabel(field) {
    const map = {
        type: "Type",
        marque: "Marque",
        modele: "Modèle",
        fichier: "Fichier"
    };
    return map[field] || field;
}

function prettyPlaceholder(field) {
    const map = {
        type: "Ex. CHAUDIERE",
        marque: "Ex. VIESSMANN",
        modele: "Ex. VITOCROSSAL 200",
        fichier: "Nom du document"
    };
    return map[field] || "";
}

function escapeHtml(value) {
    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

function escapeJs(value) {
    return String(value)
        .replaceAll("\\", "\\\\")
        .replaceAll("'", "\\'");
}

/* ========================
   NAV BUTTONS
======================== */
nextStepBtn.onclick = () => {
    if (state.currentStep < stepsConfig.length - 1) {
        goToStep(state.currentStep + 1);
    }
};

prevStepBtn.onclick = () => {
    if (state.currentStep > 0) {
        goToStep(state.currentStep - 1);
    }
};

if (openDraftsBtn) openDraftsBtn.onclick = openDraftsModal;
if (closeDraftsBtn) closeDraftsBtn.onclick = closeDraftsModal;

if (draftsModal) {
    draftsModal.addEventListener("click", (event) => {
        if (event.target === draftsModal) closeDraftsModal();
    });
}

/* ========================
   INIT
======================== */
if (!state.data.infos.date_doe) {
    state.data.infos.date_doe = getTodayDate();
}

goToStep(state.currentStep || 0);

/* ========================
   EXPOSE FUNCTIONS
======================== */
window.renderChantierBanner = renderChantierBanner;
window.handleInputChange = handleInputChange;
window.handlePostalCodeChange = handlePostalCodeChange;
window.toggleCustomSelect = toggleCustomSelect;
window.setNatureTravaux = setNatureTravaux;
window.setVille = setVille;
window.toggleDatePicker = toggleDatePicker;
window.changeDateView = changeDateView;
window.selectDateValue = selectDateValue;
window.clearDateValue = clearDateValue;
window.addRow = addRow;
window.removeRow = removeRow;
window.updateRow = updateRow;
window.saveDraft = saveDraft;
window.clearAutosave = clearAutosave;
window.loadDraft = loadDraft;
window.deleteDraft = deleteDraft;
window.openFile = openFile;
window.handleFileUpload = handleFileUpload;
window.deleteFile = deleteFile;
window.getTodayDate = getTodayDate;
