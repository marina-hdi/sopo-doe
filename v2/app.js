console.log("DOE v2 dynamic system + autosave + drafts 🚀");

const AUTOSAVE_KEY = "doe_v2_autosave";
const DRAFTS_KEY = "doe_v2_saved_drafts";

/* ========================
   GLOBAL STATE
======================== */
let state = loadAutosave() || getEmptyState();

/* ========================
   STEP CONFIG
======================== */
const stepsConfig = [
    { title: "Infos", render: renderInfos },
    { title: "Fiches techniques", render: () => renderDynamicSection("fiches", ["type", "marque", "modele"]) },
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
                natureTravaux: "",
                cp: "",
                ville: "",
                dateReception: "",
                dateDoe: "",
                notes: ""
            },
            fiches: [],
            pv: [],
            schemas: []
        }
    };
}

/* ========================
   CHANTIER BANNER
======================== */
function getCurrentAddressLine() {
    const { adresse, cp, ville } = state.data.infos;
    const parts = [adresse, cp, ville].filter(Boolean);
    return parts.join(", ");
}

function getDraftDisplayTitle() {
    const { adresse, ville, cp } = state.data.infos;
    if (adresse || ville || cp) {
        return [adresse, cp, ville].filter(Boolean).join(", ");
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
                            onchange="updateInfo('adresse', this.value)"
                        />
                    </div>

                    <div class="field span-5">
                        <label>Nature des travaux</label>
                        <input
                            value="${escapeHtml(infos.natureTravaux || "")}"
                            onchange="updateInfo('natureTravaux', this.value)"
                        />
                    </div>

                    <div class="field span-2">
                        <label>CP</label>
                        <input
                            value="${escapeHtml(infos.cp || "")}"
                            onchange="updateInfo('cp', this.value)"
                        />
                    </div>

                    <div class="field span-5">
                        <label>Ville</label>
                        <input
                            value="${escapeHtml(infos.ville || "")}"
                            onchange="updateInfo('ville', this.value)"
                        />
                    </div>

                    <div class="field span-2">
                        <label>Date de réception</label>
                        <input
                            value="${escapeHtml(infos.dateReception || "")}"
                            onchange="updateInfo('dateReception', this.value)"
                        />
                    </div>

                    <div class="field span-3">
                        <label>Date DOE</label>
                        <input
                            value="${escapeHtml(infos.dateDoe || "")}"
                            onchange="updateInfo('dateDoe', this.value)"
                        />
                    </div>

                    <div class="field full">
                        <label>Notes</label>
                        <textarea
                            onchange="updateInfo('notes', this.value)"
                        >${escapeHtml(infos.notes || "")}</textarea>
                    </div>
                </div>
            </div>
        </div>
    `;
}

function updateInfo(key, value) {
    state.data.infos[key] = value;
    saveAutosave();
    renderChantierBanner();
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
    return `
        <div class="dynamic-card">
            <div class="dynamic-card-header">
                <span class="dynamic-card-title">${getSectionTitle(key)} ${index + 1}</span>
                <button class="remove-row-btn" onclick="removeRow('${key}', ${index})">Supprimer</button>
            </div>

            <div class="field-grid">
                ${fields.map(field => {
                    if (field === "fichier") {
                        return `
                            <div class="field span-6">
                                <label>Fichier</label>

                                <input 
                                    type="file"
                                    accept=".pdf,image/*"
                                    onchange="handleFileUpload('${key}', ${index}, this)"
                                />

                                ${
                                    item.fileName
                                        ? `<div class="file-preview">${escapeHtml(item.fileName)}</div>`
                                        : ""
                                }
                            </div>
                        `;
                    }

                    return `
                        <div class="field span-4">
                            <label>${prettyLabel(field)}</label>
                            <input
                                value="${escapeHtml(item[field] || "")}"
                                placeholder="${prettyPlaceholder(field)}"
                                onchange="updateRow('${key}', ${index}, '${field}', this.value)"
                            />
                        </div>
                    `;
                }).join("")}
            </div>
        </div>
    `;
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

function updateRow(key, index, field, value) {
    state.data[key][index][field] = value;
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
    };

    reader.readAsDataURL(file);
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
                        <strong>${infos.cp ? escapeHtml(infos.cp) : "—"}</strong>
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
    const confirmed = confirm("Effacer le brouillon local en cours ?");
    if (!confirmed) return;

    localStorage.removeItem(AUTOSAVE_KEY);
    state = getEmptyState();
    goToStep(0);
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
    alert("Brouillon enregistré.");
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
}

function deleteDraft(draftId) {
    const confirmed = confirm("Supprimer ce brouillon ?");
    if (!confirmed) return;

    const drafts = getAllDrafts().filter(item => item.id !== draftId);
    setAllDrafts(drafts);
    renderDraftsList();
}

function formatDraftDate(value) {
    try {
        return new Date(value).toLocaleString("fr-FR");
    } catch {
        return value || "Date inconnue";
    }
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
        fiches: "Ajoutez les équipements, marques et modèles.",
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
        type: "Ex. Chaudière",
        marque: "Ex. Viessmann",
        modele: "Ex. Vitocrossal 200",
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

openDraftsBtn.onclick = openDraftsModal;
closeDraftsBtn.onclick = closeDraftsModal;
draftsModal.addEventListener("click", (event) => {
    if (event.target === draftsModal) closeDraftsModal();
});

/* ========================
   INIT
======================== */
goToStep(state.currentStep || 0);

/* ========================
   EXPOSE FUNCTIONS
======================== */
window.updateInfo = updateInfo;
window.addRow = addRow;
window.removeRow = removeRow;
window.updateRow = updateRow;
window.saveDraft = saveDraft;
window.clearAutosave = clearAutosave;
window.loadDraft = loadDraft;
window.deleteDraft = deleteDraft;
