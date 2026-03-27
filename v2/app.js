console.log("DOE v2 dynamic system + autosave + drafts + files + infos dropdowns 🚀");

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

/* ========================
   CHANTIER BANNER
======================== */
function getCurrentAddressLine() {
    const { adresse, code_postal, ville } = state.data.infos;
    const parts = [adresse, code_postal, ville].filter(Boolean);
    return parts.join(", ");
}

function getDraftDisplayTitle() {
    const { adresse, ville, code_postal } = state.data.infos;
    if (adresse || ville || code_postal) {
        return [adresse, code_postal, ville].filter(Boolean).join(", ");
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
    const villeSelect = document.querySelector('[name="ville"]');

    if (!villeSelect) return;

    villeSelect.innerHTML = `<option value="" disabled hidden ${!state.data.infos.ville ? "selected" : ""}>Sélectionner</option>`;

    if (villes.length === 1) {
        state.data.infos.ville = villes[0];
        villeSelect.innerHTML = `
            <option value="" disabled hidden>Sélectionner</option>
            <option value="${villes[0]}" selected>${villes[0]}</option>
        `;
        villeSelect.classList.remove("is-placeholder");
    } else {
        state.data.infos.ville = "";
        villeSelect.classList.add("is-placeholder");

        villes.forEach(v => {
            const opt = document.createElement("option");
            opt.value = v;
            opt.textContent = v;
            villeSelect.appendChild(opt);
        });
    }

    saveAutosave();
    renderChantierBanner();
}

/* ========================
   STEP 1 — INFOS
======================== */
function renderInfos() {
    const infos = state.data.infos;

    content.innerHTML = `
        <div class="single-panel-layout">
            <div class="panel">
                <div class="section-toolbar">
                    <div>
                        <h3>Informations chantier</h3>
                    </div>
                </div>

                <div class="field-grid">
                    <div class="field span-7">
                        <label>Adresse</label>
                        <input
                            value="${escapeHtml(infos.adresse || "")}"
                            oninput="handleInputChange('infos','adresse', this.value, this); renderChantierBanner();"
                        />
                    </div>

                    <div class="field span-5">
                        <label>Nature des travaux</label>
                        <select
                            name="nature_travaux"
                            class="${infos.nature_travaux ? "" : "is-placeholder"}"
                            onchange="handleInputChange('infos','nature_travaux', this.value, this); this.classList.remove('is-placeholder')"
                        >
                            <option value="" disabled hidden ${!infos.nature_travaux ? "selected" : ""}>Rénovation chaufferie</option>
                            ${referenceData.workTypes.map(t => `
                                <option value="${t}" ${infos.nature_travaux === t ? "selected" : ""}>
                                    ${t}
                                </option>
                            `).join("")}
                        </select>
                    </div>

                    <div class="field span-2">
                        <label>CP</label>
                        <input
                            name="code_postal"
                            value="${escapeHtml(infos.code_postal || "")}"
                            oninput="handleInputChange('infos','code_postal', this.value, this); handlePostalCodeChange(this.value)"
                        />
                    </div>

                    <div class="field span-5">
                        <label>Ville</label>
                        <select
                            name="ville"
                            class="${infos.ville ? "" : "is-placeholder"}"
                            onchange="handleInputChange('infos','ville', this.value, this); this.classList.remove('is-placeholder'); renderChantierBanner();"
                        >
                            <option value="" disabled hidden ${!infos.ville ? "selected" : ""}>Sélectionner</option>
                            ${(referenceData.postalCodes[infos.code_postal] || []).map(v => `
                                <option value="${v}" ${infos.ville === v ? "selected" : ""}>${v}</option>
                            `).join("")}
                        </select>
                    </div>

                    <div class="field span-2">
                        <label>Date de réception</label>
                        <input
                            type="date"
                            value="${infos.date_reception || ""}"
                            onchange="handleInputChange('infos','date_reception', this.value)"
                        />
                    </div>

                    <div class="field span-3">
                        <label>Date DOE</label>
                        <input
                            type="date"
                            value="${infos.date_doe || getTodayDate()}"
                            onchange="handleInputChange('infos','date_doe', this.value)"
                        />
                    </div>

                    <div class="field full">
                        <label>Notes</label>
                        <textarea
                            oninput="handleInputChange('infos','notes', this.value, this)"
                        >${escapeHtml(infos.notes || "")}</textarea>
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
