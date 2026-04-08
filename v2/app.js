console.log("DOE v2 clean app loaded ✅");

document.getElementById("step-content").innerHTML = `
  <div style="padding:20px; font-weight:700;">app.js chargé</div>
`;

/* ========================
   STORAGE KEYS
======================== */
const SUPABASE_URL = "https://mefoczkqihvjltxqcxue.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1lZm9jemtxaWh2amx0eHFjeHVlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU2NDg3MDMsImV4cCI6MjA5MTIyNDcwM30.HO012TpTfhcLXNBB-zvFpt9y1jibYpAyxIwcfxXMeBs";

const supabaseGlobal = window.supabase;

if (!supabaseGlobal || typeof supabaseGlobal.createClient !== "function") {
    console.error("Supabase CDN non chargé correctement.", window.supabase);

    const fallbackContent = document.getElementById("step-content");
    if (fallbackContent) {
        fallbackContent.innerHTML = `
            <div style="padding:24px; background:white; border-radius:16px;">
                <h2>Erreur de chargement</h2>
                <p>Le client Supabase n’a pas été chargé. Ouvre la console du navigateur pour voir l’erreur.</p>
            </div>
        `;
    }

    throw new Error("Supabase global introuvable");
}

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const AUTOSAVE_KEY = "doe_v2_autosave";
const DRAFTS_KEY = "doe_v2_saved_drafts";
const CLOSED_KEY = "doe_v2_closed";
const ARCHIVED_KEY = "doe_v2_archived";
const REFERENCE_DATA_KEY = "doe_v2_reference_data";

/* ========================
   DEFAULT REFERENCE DATA
======================== */
const defaultReferenceData = {
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
    },

    equipment: {
        CHAUDIERE: {
            brands: {
                VIESSMANN: ["VITOCROSSAL 200", "VITODENS 100"],
                "DE DIETRICH": ["C310-280", "GT 512"],
                ELCO: ["TRIGON XL 200", "TRIGON XL 350"]
            }
        },
        POMPE: {
            brands: {
                GRUNDFOS: ["MAGNA 3D 32-80"]
            }
        },
        BRULEUR: {
            brands: {
                CUENOD: ["NC4", "NC9"],
                ELCO: ["VL2", "VG2"]
            }
        }
    },

    technicalSheetsLibrary: [
        {
            type: "CHAUDIERE",
            marque: "VIESSMANN",
            modele: "VITOCROSSAL 200",
            fileName: "FICHE_VIESSMANN_VITOCROSSAL_200.pdf",
            fileType: "application/pdf",
            file: null
        },
        {
            type: "POMPE",
            marque: "GRUNDFOS",
            modele: "MAGNA 3D 32-80",
            fileName: "FICHE_GRUNDFOS_MAGNA_3D_32_80.pdf",
            fileType: "application/pdf",
            file: null
        }
    ],

    pvTypes: [
        "PV RECEPTION",
        "PV MISE EN SERVICE",
        "PV ESSAIS"
    ],

    schemaTypes: [
        "SCHEMA HYDRAULIQUE",
        "SCHEMA ELECTRIQUE",
        "SCHEMA DE PRINCIPE"
    ]
};

/* ========================
   LOAD / SAVE REFERENCE DATA
======================== */
function loadReferenceData() {
    try {
        const raw = localStorage.getItem(REFERENCE_DATA_KEY);
        return raw ? JSON.parse(raw) : null;
    } catch (error) {
        console.error("Erreur chargement referenceData :", error);
        return null;
    }
}

function saveReferenceData() {
    try {
        localStorage.setItem(REFERENCE_DATA_KEY, JSON.stringify(referenceData));
    } catch (error) {
        console.error("Erreur sauvegarde referenceData :", error);
        showToast("Impossible de sauvegarder la bibliothèque.", "error");
    }
}

let referenceData = loadReferenceData() || structuredClone(defaultReferenceData);

referenceData = {
    ...structuredClone(defaultReferenceData),
    ...referenceData,
    equipment: {
        ...structuredClone(defaultReferenceData).equipment,
        ...(referenceData.equipment || {})
    },
    technicalSheetsLibrary: Array.isArray(referenceData.technicalSheetsLibrary)
        ? referenceData.technicalSheetsLibrary
        : structuredClone(defaultReferenceData).technicalSheetsLibrary,
    pvTypes: Array.isArray(referenceData.pvTypes)
        ? referenceData.pvTypes
        : structuredClone(defaultReferenceData).pvTypes,
    schemaTypes: Array.isArray(referenceData.schemaTypes)
        ? referenceData.schemaTypes
        : structuredClone(defaultReferenceData).schemaTypes
};

saveReferenceData();

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
   GLOBAL STATE
======================== */
let state = loadAutosave() || getEmptyState();

let currentScreen = "accueil";

if (!state.data.infos.date_doe) {
    state.data.infos.date_doe = getTodayDate();
}

let exportUiState = {
    isExporting: false
};

let exportValidationState = {
    infos: {},
    rows: {
        fiches: {},
        pv: {},
        schemas: {}
    }
};

let hasUnsavedChanges = false;

/* ========================
   STEP CONFIG
======================== */
const stepsConfig = [
    { title: "Infos", render: renderInfos },
    { title: "Fiches techniques", render: renderFichesStep },
    { title: "Procès-verbaux", render: renderPvStep },
    { title: "Schémas", render: renderSchemasStep },
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
const closeDraftsBtn = document.getElementById("close-drafts-btn");

const navAccueilBtn = document.getElementById("nav-accueil-btn");
const navNewBtn = document.getElementById("nav-new-btn");
const navDraftsBtn = document.getElementById("nav-drafts-btn");
const navClosedBtn = document.getElementById("nav-closed-btn");
const navLibraryBtn = document.getElementById("nav-library-btn");
const navSettingsBtn = document.getElementById("nav-settings-btn");
const navArchivesBtn = document.getElementById("nav-archives-btn");

const toastContainer = document.getElementById("toast-container");

const confirmModal = document.getElementById("confirm-modal");
const confirmTitle = document.getElementById("confirm-title");
const confirmMessage = document.getElementById("confirm-message");
const confirmOkBtn = document.getElementById("confirm-ok-btn");
const confirmCancelBtn = document.getElementById("confirm-cancel-btn");
const closeConfirmBtn = document.getElementById("close-confirm-btn");

const createValueModal = document.getElementById("create-value-modal");
const createValueTitle = document.getElementById("create-value-title");
const createValueLabel = document.getElementById("create-value-label");
const createValueInput = document.getElementById("create-value-input");
const createValueSaveBtn = document.getElementById("create-value-save-btn");
const createValueCancelBtn = document.getElementById("create-value-cancel-btn");
const closeCreateValueBtn = document.getElementById("close-create-value-btn");

// ===== FILE VALIDATION =====
function validateFile(file) {
    const allowedTypes = [
        "application/pdf",
        "image/jpeg",
        "image/png"
    ];

    const maxSize = 10 * 1024 * 1024; // 10MB

    if (!allowedTypes.includes(file.type)) {
        return { valid: false, reason: "Format non supporté" };
    }

    if (file.size > maxSize) {
        return { valid: false, reason: "Fichier trop volumineux" };
    }

    return { valid: true };
}

function getInvalidFiles() {
    const all = [
        ...(state.data.fiches || []),
        ...(state.data.pv || []),
        ...(state.data.schemas || [])
    ];

    return all.filter(item => item.invalid);
}

/* ========================
   HELPERS
======================== */
function setWorkspaceChromeVisibility(showBuilderChrome) {
    const stickyTop = document.querySelector(".workspace-top-sticky");
    const footer = document.querySelector(".main-panel-footer");

    if (stickyTop) {
        stickyTop.style.display = showBuilderChrome ? "" : "none";
    }

    if (footer) {
        footer.style.display = showBuilderChrome ? "" : "none";
    }
}

function setActiveSidebarLink(activeId) {
    document.querySelectorAll(".sidebar-link").forEach(btn => {
        btn.classList.remove("active");
    });

    if (activeId) {
        document.getElementById(activeId)?.classList.add("active");
    }
}

function goToAccueil() {
    currentScreen = "accueil";
    renderApp();
}

function goToBuilder() {
    currentScreen = "builder";
    renderApp();
}

function goToDraftsScreen() {
    currentScreen = "drafts";
    renderApp();
}

function goToClosedScreen() {
    currentScreen = "closed";
    renderApp();
}

function goToLibraryScreen() {
    currentScreen = "library";
    renderApp();
}

function goToArchivesScreen() {
    currentScreen = "archives";
    renderApp();
}

function goToSettingsScreen() {
    currentScreen = "settings";
    renderApp();
}

function duplicateDraft(draftId) {
    const drafts = getAllDrafts();
    const draft = drafts.find(item => item.id === draftId);
    if (!draft) return;

    const copy = deepClone(draft);
    copy.id = crypto.randomUUID ? crypto.randomUUID() : String(Date.now());
    copy.title = `${draft.title || "Brouillon"} (copie)`;
    copy.updatedAt = new Date().toISOString();

    drafts.unshift(copy);
    setAllDrafts(drafts);

    showToast("Brouillon dupliqué.", "success");
    renderApp();
}

function setSavedSearchValue(value) {
    state.savedSearch = value;
    renderApp();
}

function renderDraftsScreen() {
    setWorkspaceChromeVisibility(false);
    setActiveSidebarLink("nav-drafts-btn");

    const drafts = getAllDrafts();

    content.innerHTML = `
        <div class="single-panel-layout enregistres-layout">
            <div class="panel">
                <div class="enregistres-toolbar">
                    <div class="field full">
                        <label>Rechercher</label>
                        <input
                            type="text"
                            id="drafts-search-input"
                            placeholder="Adresse ou notes..."
                            value="${escapeHtml(state.draftsSearch || "")}"
                            oninput="filterDraftsTable(this.value)"
                        />
                    </div>
                </div>

                ${
                    drafts.length
                        ? `
                        <div class="table-shell">
                            <table class="data-table">
                                <thead>
                                    <tr>
                                       <th>Adresse</th>
                                       <th>Dernière mise à jour</th>
                                       <th>Notes</th>
                                       <th>Ouvrir</th>
                                       <th>Archiver</th>
                                    </tr>
                                </thead>
                                <tbody id="drafts-table-body">
                                    ${drafts.map(draft => {
                                        const infos = draft?.state?.data?.infos || {};
                                        const addressLine = [infos.adresse, infos.code_postal, infos.ville]
                                            .filter(Boolean)
                                            .join(" ");
                                        const notes = infos.notes || "";
                                        const searchText = `${addressLine} ${notes}`.toUpperCase();

                                        return `
                                            <tr data-search="${escapeHtml(searchText)}">
                                                <td>${escapeHtml(addressLine || "Adresse non renseignée")}</td>
                                                <td>${escapeHtml(formatDraftDate(draft.updatedAt))}</td>
                                                <td>${escapeHtml(notes)}</td>
                                                <td>
                                                    <button class="draft-btn load" onclick="loadDraft('${draft.id}'); goToBuilder();">Ouvrir</button>
                                                </td>
                                                   <td>
                                                       <button class="draft-btn delete" onclick="archiveDraft('${draft.id}')">Archiver</button>
                                                   </td>
                                            </tr>
                                        `;
                                    }).join("")}
                                </tbody>
                            </table>
                        </div>
                        `
                        : `
                        <div class="empty-state">
                            <p>Aucun brouillon trouvé.</p>
                        </div>
                        `
                }
            </div>
        </div>
    `;

    filterDraftsTable(state.draftsSearch || "");
}

function filterDraftsTable(value) {
    state.draftsSearch = value;

    const query = String(value || "").trim().toUpperCase();
    const rows = document.querySelectorAll("#drafts-table-body tr");

    rows.forEach(row => {
        const haystack = row.dataset.search || "";
        row.style.display = !query || haystack.includes(query) ? "" : "none";
    });
}

function getClosedItems() {
    try {
        return JSON.parse(localStorage.getItem(CLOSED_KEY) || "[]");
    } catch (error) {
        console.error("Erreur chargement clôturés :", error);
        return [];
    }
}

function setClosedItems(items) {
    localStorage.setItem(CLOSED_KEY, JSON.stringify(items));
}

function getArchivedItems() {
    try {
        return JSON.parse(localStorage.getItem(ARCHIVED_KEY) || "[]");
    } catch (error) {
        console.error("Erreur chargement archives :", error);
        return [];
    }
}

function setArchivedItems(items) {
    localStorage.setItem(ARCHIVED_KEY, JSON.stringify(items));
}

function archiveDraft(id) {
    const drafts = getAllDrafts();
    const draft = drafts.find(item => item.id === id);
    if (!draft) return;

    const archived = getArchivedItems();
    archived.unshift({
        archiveType: "draft",
        archivedAt: new Date().toISOString(),
        payload: draft
    });

    setArchivedItems(archived);
    setAllDrafts(drafts.filter(item => item.id !== id));

    showToast("Brouillon archivé.", "success");
    renderApp();
}

function archiveClosedDoe(id) {
    const items = getClosedItems();
    const item = items.find(entry => entry.id === id);
    if (!item) return;

    const archived = getArchivedItems();
    archived.unshift({
        archiveType: "closed",
        archivedAt: new Date().toISOString(),
        payload: item
    });

    setArchivedItems(archived);
    setClosedItems(items.filter(entry => entry.id !== id));

    showToast("DOE clôturé archivé.", "success");
    renderApp();
}

function restoreArchivedItem(index) {
    const archived = getArchivedItems();
    const item = archived[index];
    if (!item) return;

    if (item.archiveType === "draft") {
        const drafts = getAllDrafts();
        drafts.unshift(item.payload);
        setAllDrafts(drafts);
    } else if (item.archiveType === "closed") {
        const closed = getClosedItems();
        closed.unshift(item.payload);
        setClosedItems(closed);
    }

    archived.splice(index, 1);
    setArchivedItems(archived);

    showToast("Élément restauré.", "success");
    renderApp();
}

function deleteArchivedItem(index) {
    const archived = getArchivedItems();
    archived.splice(index, 1);
    setArchivedItems(archived);
    showToast("Archive supprimée.", "info");
    renderApp();
}

function renderClosedScreen() {
    setWorkspaceChromeVisibility(false);
    setActiveSidebarLink("nav-closed-btn");

    const items = getClosedItems();

    content.innerHTML = `
        <div class="single-panel-layout enregistres-layout">
            <div class="panel">
                <div class="enregistres-toolbar">
                    <div class="field full">
                        <label>Rechercher</label>
                        <input
                            type="text"
                            id="closed-search-input"
                            placeholder="Adresse..."
                            value="${escapeHtml(state.closedSearch || "")}"
                            oninput="filterClosedTable(this.value)"
                        />
                    </div>
                </div>

                ${
                    items.length
                        ? `
                        <div class="table-shell">
                            <table class="data-table">
                                <thead>
                                    <tr>
                                       <th>Adresse</th>
                                       <th>Enregistré le</th>
                                       <th>Aperçu</th>
                                       <th>Télécharger</th>
                                       <th>Réouvrir</th>
                                       <th>Archiver</th>
                                    </tr>
                                </thead>
                                <tbody id="closed-table-body">
                                    ${items.map(item => {
                                        const infos = item?.state?.data?.infos || {};
                                        const addressLine = [infos.adresse, infos.code_postal, infos.ville]
                                            .filter(Boolean)
                                            .join(" ");
                                        const searchText = `${addressLine}`.toUpperCase();

                                        return `
                                            <tr data-search="${escapeHtml(searchText)}">
                                                <td>${escapeHtml(addressLine || "Adresse non renseignée")}</td>
                                                <td>${escapeHtml(formatDraftDate(item.savedAt))}</td>
                                                <td><button class="draft-btn load" onclick="previewClosedDoe('${item.id}')">Aperçu</button></td>
                                                <td><button class="draft-btn load" onclick="downloadClosedDoe('${item.id}')">Télécharger</button></td>
                                                <td><button class="draft-btn load" onclick="reopenClosedDoe('${item.id}')">Réouvrir</button></td>
                                                <td><button class="draft-btn delete" onclick="archiveClosedDoe('${item.id}')">Archiver</button></td>
                                          </tr>
                                        `;
                                    }).join("")}
                                </tbody>
                            </table>
                        </div>
                        `
                        : `
                        <div class="empty-state">
                            <p>Aucun DOE clôturé.</p>
                        </div>
                        `
                }
            </div>
        </div>
    `;

    filterClosedTable(state.closedSearch || "");
}

function renderArchivesScreen() {
    setWorkspaceChromeVisibility(false);
    setActiveSidebarLink("nav-archives-btn");

    const archived = getArchivedItems();
    const search = String(state.archivesSearch || "").trim().toUpperCase();

    const filtered = archived.filter(item => {
        const payload = item.payload || {};
        const infos = payload?.state?.data?.infos || {};
        const addressLine = [infos.adresse, infos.code_postal, infos.ville].filter(Boolean).join(" ");
        return !search || addressLine.toUpperCase().includes(search);
    });

    content.innerHTML = `
        <div class="single-panel-layout enregistres-layout">
            <div class="panel">
                <div class="enregistres-toolbar">
                    <div class="field full">
                        <label>Rechercher</label>
                        <input
                            type="text"
                            placeholder="Adresse..."
                            value="${escapeHtml(state.archivesSearch || "")}"
                            oninput="state.archivesSearch=this.value; renderArchivesScreen();"
                        />
                    </div>
                </div>

                ${
                    filtered.length
                        ? `
                        <div class="table-shell">
                            <table class="data-table">
                                <thead>
                                    <tr>
                                        <th>Type</th>
                                        <th>Adresse</th>
                                        <th>Archivé le</th>
                                        <th>Restaurer</th>
                                        <th>Supprimer</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${filtered.map(item => {
                                        const originalIndex = archived.indexOf(item);
                                        const payload = item.payload || {};
                                        const infos = payload?.state?.data?.infos || {};
                                        const addressLine = [infos.adresse, infos.code_postal, infos.ville].filter(Boolean).join(" ");

                                        return `
                                            <tr>
                                                <td>
                                                    <span class="archive-badge ${item.archiveType === "draft" ? "draft" : "closed"}">
                                                        ${item.archiveType === "draft" ? "Brouillon" : "Clôturé"}
                                                    </span>
                                                </td>
                                                <td>${escapeHtml(addressLine || "Adresse non renseignée")}</td>
                                                <td>${escapeHtml(formatDraftDate(item.archivedAt))}</td>
                                                <td><button class="draft-btn load" onclick="restoreArchivedItem(${originalIndex})">Restaurer</button></td>
                                                <td><button class="draft-btn delete" onclick="deleteArchivedItem(${originalIndex})">Supprimer</button></td>
                                            </tr>
                                        `;
                                    }).join("")}
                                </tbody>
                            </table>
                        </div>
                        `
                        : `<div class="empty-state"><p>Aucune archive.</p></div>`
                }
            </div>
        </div>
    `;
}

function filterClosedTable(value) {
    state.closedSearch = value;

    const query = String(value || "").trim().toUpperCase();
    const rows = document.querySelectorAll("#closed-table-body tr");

    rows.forEach(row => {
        const haystack = row.dataset.search || "";
        row.style.display = !query || haystack.includes(query) ? "" : "none";
    });
}

function renderLibraryScreen() {
    setWorkspaceChromeVisibility(false);
    setActiveSidebarLink("nav-library-btn");

    const list = Array.isArray(referenceData.technicalSheetsLibrary)
        ? referenceData.technicalSheetsLibrary
        : [];

    const types = [...new Set(list.map(item => item.type).filter(Boolean))].sort();
    const marques = [...new Set(list.map(item => item.marque).filter(Boolean))].sort();
    const modeles = [...new Set(list.map(item => item.modele).filter(Boolean))].sort();

    content.innerHTML = `
        <div class="single-panel-layout enregistres-layout">
            <div class="panel">

                ${
                    list.length
                        ? `
                        <div class="table-shell">
                            <table class="data-table">
                                <thead>
                                    <tr>
                                        <th>
                                            <button type="button" class="table-sort-btn" data-column="type" data-label="Type" onclick="sortLibraryTable('type')">
                                                <span>Type</span>
                                                <span class="material-symbols-outlined sort-icon">unfold_more</span>
                                            </button>
                                            <div class="library-filter-select">
                                              <div class="library-filter-field">
                                                  ${renderCustomSelect({
                                                      id: "library-filter-type",
                                                      label: "",
                                                      value: state.libraryFilters?.type || "TOUS",
                                                      placeholder: "TOUS",
                                                      options: ["TOUS", ...types]
                                                  })}
                                                  ${
                                                      (state.libraryFilters?.type || "")
                                                          ? `<button type="button" class="filter-clear-inside" onclick="clearLibraryFilter('type')" aria-label="Effacer filtre type">✕</button>`
                                                          : ""
                                                  }
                                              </div>
                                          </div>
                                        </th>

                                        <th>
                                            <button type="button" class="table-sort-btn" data-column="marque" data-label="Marque" onclick="sortLibraryTable('marque')">
                                                <span>Marque</span>
                                                <span class="material-symbols-outlined sort-icon">unfold_more</span>
                                            </button>
                                             <div class="library-filter-select">
                                                 <div class="library-filter-field">
                                                     ${renderCustomSelect({
                                                         id: "library-filter-marque",
                                                         label: "",
                                                         value: state.libraryFilters?.marque || "TOUS",
                                                         placeholder: "TOUS",
                                                         options: ["TOUS", ...marques]
                                                     })}
                                                     ${
                                                         (state.libraryFilters?.marque || "")
                                                             ? `<button type="button" class="filter-clear-inside" onclick="clearLibraryFilter('marque')" aria-label="Effacer filtre marque">✕</button>`
                                                             : ""
                                                     }
                                                 </div>
                                             </div>
                                        </th>

                                        <th>
                                            <button type="button" class="table-sort-btn" data-column="modele" data-label="Modèle" onclick="sortLibraryTable('modele')">
                                                <span>Modèle</span>
                                                <span class="material-symbols-outlined sort-icon">unfold_more</span>
                                            </button>
                                              <div class="library-filter-select">
                                                 <div class="library-filter-field">
                                                     ${renderCustomSelect({
                                                         id: "library-filter-modele",
                                                         label: "",
                                                         value: state.libraryFilters?.modele || "TOUS",
                                                         placeholder: "TOUS",
                                                         options: ["TOUS", ...modeles]
                                                     })}
                                                     ${
                                                         (state.libraryFilters?.modele || "")
                                                             ? `<button type="button" class="filter-clear-inside" onclick="clearLibraryFilter('modele')" aria-label="Effacer filtre modèle">✕</button>`
                                                             : ""
                                                     }
                                                 </div>
                                             </div>
                                        </th>

                                       <th>Télécharger</th>
                                       <th>Remplacer</th>
                                       <th>Supprimer</th>
                                    </tr>
                                </thead>
                                <tbody id="library-table-body">
                                ${list.map((item, index) => `
                                  <tr
                                      data-index="${index}"
                                      data-type="${escapeHtml(String(item.type || "").toUpperCase())}"
                                      data-marque="${escapeHtml(String(item.marque || "").toUpperCase())}"
                                      data-modele="${escapeHtml(String(item.modele || "").toUpperCase())}"
                                  >
                                      <td>${escapeHtml(item.type || "")}</td>
                                      <td>${escapeHtml(item.marque || "")}</td>
                                      <td>${escapeHtml(item.modele || "")}</td>
                                      <td>
                                          ${
                                              item.file
                                                  ? `<button class="draft-btn load" onclick="downloadLibraryItem(${index})">Télécharger</button>`
                                                  : `<span class="draft-meta">—</span>`
                                          }
                                      </td>
                                      <td>
                                          <button class="draft-btn load" onclick="replaceLibraryItem(${index})">Remplacer</button>
                                      </td>
                                      <td>
                                          <button class="draft-btn delete" onclick="deleteLibraryItem(${index})">Supprimer</button>
                                      </td>
                                  </tr>
                              `).join("")}
                                </tbody>
                            </table>
                        </div>
                        `
                        : `
                        <div class="empty-state">
                            <p>Aucune fiche en bibliothèque.</p>
                        </div>
                        `
                }
            </div>
        </div>
    `;

    registerCustomSelectHandler("library-filter-type", (value) => setLibraryFilter("type", value));
    registerCustomSelectHandler("library-filter-marque", (value) => setLibraryFilter("marque", value));
    registerCustomSelectHandler("library-filter-modele", (value) => setLibraryFilter("modele", value));

    initCustomSelects();
    updateLibrarySortUi();
    filterLibraryTable();
}

function setLibraryFilter(field, value) {
    if (!state.libraryFilters) {
        state.libraryFilters = {
            type: "",
            marque: "",
            modele: ""
        };
    }

    state.libraryFilters[field] = value === "TOUS" ? "" : value;
    renderLibraryScreen();
}

function clearLibraryFilter(field) {
    if (!state.libraryFilters) return;
    state.libraryFilters[field] = "";
    renderLibraryScreen();
}

function filterLibraryTable() {
    const filters = state.libraryFilters || {
        type: "",
        marque: "",
        modele: ""
    };

    const typeQuery = String(filters.type || "").trim().toUpperCase();
    const marqueQuery = String(filters.marque || "").trim().toUpperCase();
    const modeleQuery = String(filters.modele || "").trim().toUpperCase();

    const rows = document.querySelectorAll("#library-table-body tr");

    rows.forEach(row => {
        const rowType = row.dataset.type || "";
        const rowMarque = row.dataset.marque || "";
        const rowModele = row.dataset.modele || "";

        const matchesType = !typeQuery || rowType === typeQuery;
        const matchesMarque = !marqueQuery || rowMarque === marqueQuery;
        const matchesModele = !modeleQuery || rowModele === modeleQuery;

        row.style.display = matchesType && matchesMarque && matchesModele ? "" : "none";
    });
}

function sortLibraryTable(column) {
    const tbody = document.getElementById("library-table-body");
    if (!tbody) return;

    const currentSort = state.librarySort || { column: "", direction: "asc" };
    const nextDirection =
        currentSort.column === column && currentSort.direction === "asc"
            ? "desc"
            : "asc";

    state.librarySort = {
        column,
        direction: nextDirection
    };

    const rows = Array.from(tbody.querySelectorAll("tr"));

    rows.sort((a, b) => {
        const aValue = (a.dataset[column] || "").toUpperCase();
        const bValue = (b.dataset[column] || "").toUpperCase();

        if (aValue < bValue) return nextDirection === "asc" ? -1 : 1;
        if (aValue > bValue) return nextDirection === "asc" ? 1 : -1;
        return 0;
    });

    rows.forEach(row => tbody.appendChild(row));

    updateLibrarySortUi();
    filterLibraryTable();
}

function updateLibrarySortUi() {
    const buttons = document.querySelectorAll(".table-sort-btn");
    const currentSort = state.librarySort || { column: "", direction: "asc" };

    buttons.forEach(button => {
        const column = button.dataset.column;
        const label = button.dataset.label || button.textContent.trim();

        if (column === currentSort.column) {
            const arrow = currentSort.direction === "asc" ? "arrow_upward" : "arrow_downward";
            button.innerHTML = `
                <span>${escapeHtml(label)}</span>
                <span class="material-symbols-outlined sort-icon is-active">${arrow}</span>
            `;
            button.classList.add("is-active");
        } else {
            button.innerHTML = `
                <span>${escapeHtml(label)}</span>
                <span class="material-symbols-outlined sort-icon">unfold_more</span>
            `;
            button.classList.remove("is-active");
        }
    });
}

function downloadLibraryItem(index) {
    const list = Array.isArray(referenceData.technicalSheetsLibrary)
        ? referenceData.technicalSheetsLibrary
        : [];

    const item = list[index];
    if (!item?.file) {
        showToast("Aucun fichier disponible.", "error");
        return;
    }

    try {
        const blob = dataURLToBlob(item.file);
        const fileName = item.fileName || `${item.type || "fiche"}.pdf`;
        triggerBlobDownload(blob, fileName);
    } catch (error) {
        console.error(error);
        showToast("Impossible de télécharger ce fichier.", "error");
    }
}

function replaceLibraryItem(index) {
    const list = Array.isArray(referenceData.technicalSheetsLibrary)
        ? referenceData.technicalSheetsLibrary
        : [];

    const item = list[index];
    if (!item) {
        showToast("Fiche introuvable.", "error");
        return;
    }

    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".pdf,.jpg,.jpeg,.png";

    input.onchange = (event) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const validation = validateFile(file);
        if (!validation.valid) {
            showToast(validation.reason || "Fichier invalide.", "error");
            return;
        }

        const reader = new FileReader();

        reader.onload = function (e) {
            item.file = e.target?.result || null;
            item.fileName = file.name;
            item.fileType = file.type;
            saveReferenceData();
            renderLibraryScreen();
            showToast("Fiche remplacée.", "success");
        };

        reader.onerror = function () {
            showToast("Impossible de lire le fichier.", "error");
        };

        reader.readAsDataURL(file);
    };

    input.click();
}

function deleteLibraryItem(index) {
    const list = Array.isArray(referenceData.technicalSheetsLibrary)
        ? referenceData.technicalSheetsLibrary
        : [];

    const item = list[index];
    if (!item) {
        showToast("Fiche introuvable.", "error");
        return;
    }

    openConfirmModal(
        "Supprimer cette fiche",
        `La fiche ${item.fileName || item.modele || "sélectionnée"} sera supprimée de la bibliothèque.`,
        () => {
            list.splice(index, 1);
            saveReferenceData();
            renderLibraryScreen();
            showToast("Fiche supprimée.", "success");
        }
    );
}

function renderSettingsScreen() {
    setWorkspaceChromeVisibility(false);
    setActiveSidebarLink("nav-settings-btn");

    const workTypes = Array.isArray(referenceData.workTypes) ? referenceData.workTypes : [];
    const pvTypes = Array.isArray(referenceData.pvTypes) ? referenceData.pvTypes : [];
    const schemaTypes = Array.isArray(referenceData.schemaTypes) ? referenceData.schemaTypes : [];
    const equipmentEntries = Object.keys(referenceData.equipment || {});

    content.innerHTML = `
        <div class="single-panel-layout settings-layout">
            <div class="panel">

                <div class="settings-section">
                    <div class="section-toolbar">
                        <div><h4>Types travaux</h4></div>
                        <button class="add-row-btn" type="button" onclick="promptAddSettingValue('workTypes')">+ Ajouter</button>
                    </div>
                    ${
                        workTypes.length
                            ? `<div class="settings-chip-list">
                                ${workTypes.map((item, index) => `
                                    <div class="settings-chip">
                                        <span>${escapeHtml(item)}</span>
                                        <button type="button" onclick="removeSettingValue('workTypes', ${index})">✕</button>
                                    </div>
                                `).join("")}
                            </div>`
                            : `<div class="empty-state"><p>Aucun type travaux.</p></div>`
                    }
                </div>

                <div class="settings-section">
                    <div class="section-toolbar">
                        <div><h4>Équipements</h4></div>
                        <button class="add-row-btn" type="button" onclick="promptAddEquipmentType()">+ Ajouter</button>
                    </div>
                    ${
                        equipmentEntries.length
                            ? `<div class="settings-chip-list">
                                ${equipmentEntries.map(typeKey => `
                                    <div class="settings-chip">
                                        <span>${escapeHtml(typeKey)}</span>
                                        <button type="button" onclick="removeEquipmentType('${escapeJs(typeKey)}')">✕</button>
                                    </div>
                                `).join("")}
                            </div>`
                            : `<div class="empty-state"><p>Aucun type équipement.</p></div>`
                    }
                </div>

                <div class="settings-section">
                    <div class="section-toolbar">
                        <div><h4>Types PV</h4></div>
                        <button class="add-row-btn" type="button" onclick="promptAddSettingValue('pvTypes')">+ Ajouter</button>
                    </div>
                    ${
                        pvTypes.length
                            ? `<div class="settings-chip-list">
                                ${pvTypes.map((item, index) => `
                                    <div class="settings-chip">
                                        <span>${escapeHtml(item)}</span>
                                        <button type="button" onclick="removeSettingValue('pvTypes', ${index})">✕</button>
                                    </div>
                                `).join("")}
                            </div>`
                            : `<div class="empty-state"><p>Aucun type de PV.</p></div>`
                    }
                </div>

                <div class="settings-section">
                    <div class="section-toolbar">
                        <div><h4>Types schémas</h4></div>
                        <button class="add-row-btn" type="button" onclick="promptAddSettingValue('schemaTypes')">+ Ajouter</button>
                    </div>
                    ${
                        schemaTypes.length
                            ? `<div class="settings-chip-list">
                                ${schemaTypes.map((item, index) => `
                                    <div class="settings-chip">
                                        <span>${escapeHtml(item)}</span>
                                        <button type="button" onclick="removeSettingValue('schemaTypes', ${index})">✕</button>
                                    </div>
                                `).join("")}
                            </div>`
                            : `<div class="empty-state"><p>Aucun type de schéma.</p></div>`
                    }
                </div>
            </div>
        </div>
    `;
}

function getRecentNotes() {
    return getAllDrafts()
        .map(draft => {
            const infos = draft?.state?.data?.infos || {};
            return {
                adresse: [infos.adresse, infos.code_postal, infos.ville].filter(Boolean).join(" "),
                note: infos.notes || "",
                updatedAt: draft.updatedAt || null
            };
        })
        .filter(item => item.note && item.note.trim() !== "")
        .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
        .slice(0, 15);
}

function renderLoginScreen() {
    state.currentUser = null;
    currentScreen = "login";

    const appShell = document.querySelector(".app-shell");
    const sidebar = document.querySelector(".sidebar");

    if (appShell) appShell.classList.add("auth-mode");
    if (sidebar) sidebar.style.display = "none";

    setWorkspaceChromeVisibility(false);

    if (prevStepBtn) prevStepBtn.style.display = "none";
    if (nextStepBtn) nextStepBtn.style.display = "none";

    content.classList.add("login-mode");

    content.innerHTML = `
        <div class="login-screen">
            <div class="login-card">
                <h2>Connexion</h2>

                <input id="login-email" type="email" placeholder="Email" />
                <input id="login-password" type="password" placeholder="Mot de passe" />

                <button onclick="handleLogin()">Se connecter</button>

                <p id="login-error" class="login-error"></p>
            </div>
        </div>
    `;
}

async function handleLogin() {
    const email = document.getElementById("login-email").value;
    const password = document.getElementById("login-password").value;
    const errorEl = document.getElementById("login-error");

    if (errorEl) {
        errorEl.textContent = "";
    }

    const { error } = await supabaseClient.auth.signInWithPassword({
        email,
        password
    });

    if (error) {
        console.error("Erreur de connexion :", error);

        let message = "Erreur de connexion";

        if (error.message?.includes("Invalid login credentials")) {
            message = "Email ou mot de passe incorrect";
        } else if (error.message?.includes("Email not confirmed")) {
            message = "Email non confirmé";
        } else if (error.message) {
            message = error.message;
        }

        if (errorEl) {
            errorEl.textContent = message;
        } else {
            showToast(message, "error");
        }

        return;
    }

    await loadCurrentProfile();
    currentScreen = "accueil";
    renderApp();
}

async function handleLogout() {
    await supabaseClient.auth.signOut();
    state.currentUser = null;
    renderLoginScreen();
}

async function loadCurrentProfile() {
    const { data: authData } = await supabaseClient.auth.getUser();
    const user = authData?.user;

    if (!user) {
        state.currentUser = null;
        return null;
    }

    const { data: profile, error } = await supabaseClient
        .from("profiles")
        .select("id, username, full_name")
        .eq("id", user.id)
        .single();

    if (error) {
        console.error("Erreur chargement profil :", error);
        state.currentUser = {
            id: user.id,
            email: user.email,
            username: user.email || ""
        };
        return state.currentUser;
    }

    state.currentUser = {
        id: user.id,
        email: user.email,
        username: profile.username,
        full_name: profile.full_name
    };

    return state.currentUser;
}

function renderAccueilScreen() {
    setWorkspaceChromeVisibility(false);
    setActiveSidebarLink("nav-accueil-btn");

    const drafts = getAllDrafts();
    const notes = getRecentNotes();

    content.innerHTML = `
        <div class="single-panel-layout accueil-layout">
            <div class="panel accueil-top-panel">
                <div class="accueil-topbar">
                    <div class="accueil-quick-actions">
                        <button type="button" class="banner-btn" onclick="handleNewDoeFromAccueil()">
                            <span class="material-symbols-outlined">edit_square</span>
                            Création DOE
                        </button>

                        <button type="button" class="footer-btn secondary-action" onclick="goToDraftsScreen()">
                            <span class="material-symbols-outlined">draft</span>
                            Brouillons
                        </button>

                        <button type="button" class="footer-btn secondary-action" onclick="goToClosedScreen()">
                            <span class="material-symbols-outlined">inventory_2</span>
                            Clôturés
                        </button>
                    </div>

                    <div class="accueil-user">
                        <span>Bonjour, ${escapeHtml(state.currentUser?.username || "")}</span>
                        <button class="logout-icon-btn" onclick="handleLogout()" aria-label="Déconnexion" title="Déconnexion">
                            <span class="material-symbols-outlined">logout</span>
                        </button>
                    </div>
                </div>
            </div>

            <div class="accueil-grid-2cols">
                <div class="panel accueil-scroll-panel">
                    <div class="section-toolbar">
                        <div><h3>Derniers brouillons</h3></div>
                    </div>

                    ${
                        drafts.length
                            ? `
                            <div class="accueil-scroll-zone drafts-scroll-zone">
                                <div class="accueil-drafts-list">
                                    ${drafts.map(draft => `
                                        <div class="draft-item accueil-list-item">
                                            <div class="draft-main">
                                                <div class="draft-title">${escapeHtml(draft.title || "Brouillon")}</div>
                                                <div class="draft-meta">Dernière mise à jour : ${formatDraftDate(draft.updatedAt)}</div>
                                            </div>
                                            <div class="draft-actions">
                                                <button class="draft-btn load" onclick="loadDraft('${draft.id}'); goToBuilder();">Ouvrir</button>
                                                <button class="draft-btn delete" onclick="archiveDraft('${draft.id}')">Archiver</button>
                                            </div>
                                        </div>
                                    `).join("")}
                                </div>
                            </div>
                            `
                            : `<div class="empty-state"><p>Aucun brouillon.</p></div>`
                    }
                </div>

                <div class="panel accueil-scroll-panel">
                    <div class="section-toolbar">
                        <div><h3>Dernières notes</h3></div>
                    </div>

                    ${
                        notes.length
                            ? `
                            <div class="accueil-scroll-zone notes-scroll-zone">
                                <table class="data-table">
                                    <thead>
                                        <tr>
                                            <th>Adresse</th>
                                            <th>Note</th>
                                            <th>Mis à jour le</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${notes.map(item => `
                                            <tr>
                                                <td>${escapeHtml(item.adresse || "")}</td>
                                                <td>${escapeHtml(item.note || "")}</td>
                                                <td>${escapeHtml(formatDraftDate(item.updatedAt))}</td>
                                            </tr>
                                        `).join("")}
                                    </tbody>
                                </table>
                            </div>
                            `
                            : `<div class="empty-state"><p>Aucune note récente.</p></div>`
                    }
                </div>
            </div>
        </div>
    `;
}

function renderApp() {
    if (!state.currentUser) {
        renderLoginScreen();
        return;
    }

    const appShell = document.querySelector(".app-shell");
    const sidebar = document.querySelector(".sidebar");

    if (appShell) appShell.classList.remove("auth-mode");
    if (sidebar) sidebar.style.display = "";

    content.classList.remove("login-mode");

    setWorkspaceChromeVisibility(currentScreen === "builder");

    if (prevStepBtn) prevStepBtn.style.display = currentScreen === "builder" ? "" : "none";
    if (nextStepBtn) nextStepBtn.style.display = currentScreen === "builder" ? "" : "none";

    if (currentScreen === "accueil") {
        renderAccueilScreen();
        return;
    }

    if (currentScreen === "drafts") {
        renderDraftsScreen();
        return;
    }

    if (currentScreen === "closed") {
        renderClosedScreen();
        return;
    }

    if (currentScreen === "archives") {
        renderArchivesScreen();
        return;
    }

    if (currentScreen === "library") {
        renderLibraryScreen();
        return;
    }

    if (currentScreen === "settings") {
        renderSettingsScreen();
        return;
    }

    setWorkspaceChromeVisibility(true);
    setActiveSidebarLink("nav-new-btn");
    if (prevStepBtn) prevStepBtn.style.display = "";
    if (nextStepBtn) nextStepBtn.style.display = "";
    renderStep();
}

function handleNewDoeFromAccueil() {
    resetCurrentDoe();
    currentScreen = "builder";
    renderApp();
}

function showSavedPlaceholder() {
    goToClosedScreen();
}

function deepClone(value) {
    return JSON.parse(JSON.stringify(value));
}

function getSavedDrafts() {
    return getAllDrafts();
}

const DRAFTS_STORAGE_KEY = DRAFTS_KEY;

function getEmptyDoeState() {
    return getEmptyState().data;
}

function validateInfosForDraftSave() {
    const infos = state.data?.infos || {};
    const missing = [];

    if (!String(infos.adresse || "").trim()) missing.push("Adresse");
    if (!String(infos.nature_travaux || "").trim()) missing.push("Nature des travaux");
    if (!String(infos.code_postal || "").trim()) missing.push("Code postal");
    if (!String(infos.ville || "").trim()) missing.push("Ville");
    if (!String(infos.date_reception || "").trim()) missing.push("Date de réception");
    if (!String(infos.date_doe || "").trim()) missing.push("Date DOE");

    return missing;
}

function handleSaveDraft() {
    const missingInfos = validateInfosForDraftSave();

    if (missingInfos.length) {
        showToast(`Champs obligatoires manquants : ${missingInfos.join(", ")}`, "error");
        goToStep(0);
        return;
    }

    const existingIndex = findExistingDraftIndexByKey();

    if (existingIndex >= 0) {
        openDraftOverwriteModal();
        return;
    }

    saveDraftByMode("normal");
}

function handleClearDoe() {
    openConfirmModal(
        "Effacer ce DOE",
        "Tous les champs saisis seront supprimés.",
        () => {
            resetCurrentDoe();
            renderApp();
        }
    );
}

function handleCloseDoe() {
    const currentKey = getCurrentDraftMatchKey();

    if (!currentKey.adresse || !currentKey.nature) {
        showToast("Adresse et nature des travaux requises pour clôturer.", "error");
        return;
    }

    const closedItems = getClosedItems();

    const payload = {
        id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
        savedAt: new Date().toISOString(),
        state: deepClone(state)
    };

    const drafts = getAllDrafts();
    const existingDraftIndex = drafts.findIndex(draft => {
        const infos = draft?.state?.data?.infos || {};
        return (
            normalizeDraftKey(infos.adresse) === currentKey.adresse &&
            normalizeDraftKey(infos.nature_travaux) === currentKey.nature
        );
    });

    const finalizeClose = () => {
        if (existingDraftIndex >= 0) {
            drafts.splice(existingDraftIndex, 1);
            setAllDrafts(drafts);
        }

        closedItems.unshift(payload);
        setClosedItems(closedItems);

        resetCurrentDoe();
        showToast("DOE clôturé.", "success");
        goToClosedScreen();
    };

    if (existingDraftIndex >= 0) {
        openConfirmModal(
            "Brouillon existant",
            "Un brouillon avec la même adresse et le même type de travaux existe. Il sera supprimé automatiquement si vous clôturez.",
            finalizeClose
        );
        return;
    }

    finalizeClose();
}

function getClosedDoeById(id) {
    return getClosedItems().find(item => item.id === id);
}

async function previewClosedDoe(id) {
    const item = getClosedDoeById(id);
    if (!item) {
        showToast("DOE introuvable.", "error");
        return;
    }

    const previousState = deepClone(state);
    const previousScreen = currentScreen;

    state = deepClone(item.state);

    try {
        const result = await buildRealDoePdfBlob();
        const url = URL.createObjectURL(result.blob);
        window.open(url, "_blank");
    } catch (error) {
        console.error(error);
        showToast("Impossible de générer l’aperçu.", "error");
    } finally {
        state = previousState;
        currentScreen = previousScreen;
        renderApp();
    }
}

async function buildDoeZipBlobFromCurrentState() {
    if (typeof JSZip === "undefined") {
        throw new Error("JSZip n’est pas chargé.");
    }

    if (typeof PDFLib === "undefined") {
        throw new Error("PDF-lib n’est pas chargé.");
    }

    const validationIssues = collectExportValidation();
    if (validationIssues.length) {
        throw new Error("Merci de compléter les champs obligatoires avant export.");
    }

    const invalidFiles = getInvalidFiles();
    if (invalidFiles.length) {
        throw new Error("Certains fichiers sont invalides.");
    }

    const zip = new JSZip();

    const fullAddress = [state.data.infos.adresse, state.data.infos.code_postal, state.data.infos.ville]
        .filter(Boolean)
        .join(" ")
        .trim() || "DOE";

    const safeFolderName = sanitizeFileName(fullAddress);
    const root = zip.folder(safeFolderName);

    if (!root) {
        throw new Error("Impossible de créer le ZIP.");
    }

    const pdfResult = await buildRealDoePdfBlob();

    if (pdfResult.failedFiles.length) {
        throw new Error("Certains fichiers doivent être remplacés.");
    }

    root.file("DOE.pdf", pdfResult.blob);

    const sections = [
        {
            key: "fiches",
            folderName: "FICHES TECHNIQUES",
            getFileName: (item, index) => {
                const base = [item.type, item.marque, item.modele].filter(Boolean).join(" - ");
                return sanitizeFileName(base || `FICHE-${index + 1}`);
            }
        },
        {
            key: "pv",
            folderName: "PROCES-VERBAUX",
            getFileName: (item, index) => {
                const base = item.type || `PV-${index + 1}`;
                return sanitizeFileName(base);
            }
        },
        {
            key: "schemas",
            folderName: "SCHEMAS",
            getFileName: (item, index) => {
                const base = item.type || `SCHEMA-${index + 1}`;
                return sanitizeFileName(base);
            }
        }
    ];

    sections.forEach(section => {
        const sectionFolder = root.folder(section.folderName);
        if (!sectionFolder) return;

        state.data[section.key].forEach((item, index) => {
            if (!item.file) return;

            const extension = getFileExtension(item.fileName, item.fileType);
            const fileBaseName = section.getFileName(item, index);
            const finalFileName = `${fileBaseName}${extension}`;

            const blob = dataURLToBlob(item.file);
            sectionFolder.file(finalFileName, blob);
        });
    });

    const zipBlob = await zip.generateAsync({ type: "blob" });

    return {
        blob: zipBlob,
        fileName: `${safeFolderName}.zip`
    };
}

async function downloadClosedDoe(id) {
    const item = getClosedDoeById(id);
    if (!item) {
        showToast("DOE introuvable.", "error");
        return;
    }

    const previousState = deepClone(state);
    const previousScreen = currentScreen;

    state = deepClone(item.state);

    try {
        const result = await buildDoeZipBlobFromCurrentState();
        triggerBlobDownload(result.blob, result.fileName);
        showToast("ZIP téléchargé.", "success");
    } catch (error) {
        console.error(error);
        showToast(error.message || "Impossible de télécharger le ZIP.", "error");
    } finally {
        state = previousState;
        currentScreen = previousScreen;
        renderApp();
    }
}

function deleteClosedDoe(id) {
    openConfirmModal(
        "Supprimer ce DOE clôturé",
        "Cette action est définitive.",
        () => {
            const updated = getClosedItems().filter(item => item.id !== id);
            setClosedItems(updated);
            renderApp();
            showToast("DOE supprimé.", "success");
        }
    );
}

function reopenClosedDoe(id) {
    const items = getClosedItems();
    const item = items.find(entry => entry.id === id);
    if (!item) return;

    const drafts = getAllDrafts();
    const restoredDraft = {
        id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
        title: [item?.state?.data?.infos?.adresse, item?.state?.data?.infos?.code_postal, item?.state?.data?.infos?.ville]
            .filter(Boolean)
            .join(" ") || "Brouillon",
        updatedAt: new Date().toISOString(),
        state: deepClone(item.state)
    };

    drafts.unshift(restoredDraft);
    setAllDrafts(drafts);
    setClosedItems(items.filter(entry => entry.id !== id));

    showToast("DOE rouvert et renvoyé dans Brouillons.", "success");
    goToDraftsScreen();
}

function wireSidebarNavigation() {
    function leaveBuilder(targetFn) {
        if (hasUnsavedChanges) {
            openLeaveConfirmModal(() => {
                resetCurrentDoe();
                targetFn();
            });
        } else {
            resetCurrentDoe();
            targetFn();
        }
    }

    navAccueilBtn?.addEventListener("click", () => {
        if (!state.currentUser) {
            renderLoginScreen();
            return;
        }

        if (currentScreen === "accueil") return;

        if (["drafts", "closed", "archives", "library", "settings"].includes(currentScreen)) {
            goToAccueil();
            return;
        }

        leaveBuilder(goToAccueil);
    });

    navNewBtn?.addEventListener("click", () => {
        if (!state.currentUser) {
            renderLoginScreen();
            return;
        }

        if (currentScreen === "builder") return;

        if (["accueil", "drafts", "closed", "archives", "library", "settings"].includes(currentScreen)) {
            handleNewDoeFromAccueil();
            return;
        }

        leaveBuilder(() => {
            currentScreen = "builder";
            goToStep(0);
        });
    });

    navDraftsBtn?.addEventListener("click", () => {
        if (!state.currentUser) {
            renderLoginScreen();
            return;
        }

        if (currentScreen === "drafts") return;

        if (["accueil", "closed", "archives", "library", "settings"].includes(currentScreen)) {
            goToDraftsScreen();
            return;
        }

        leaveBuilder(goToDraftsScreen);
    });

    navClosedBtn?.addEventListener("click", () => {
        if (!state.currentUser) {
            renderLoginScreen();
            return;
        }

        if (currentScreen === "closed") return;

        if (["accueil", "drafts", "archives", "library", "settings"].includes(currentScreen)) {
            goToClosedScreen();
            return;
        }

        leaveBuilder(goToClosedScreen);
    });

    navLibraryBtn?.addEventListener("click", () => {
        if (!state.currentUser) {
            renderLoginScreen();
            return;
        }

        if (currentScreen === "library") return;

        if (["accueil", "drafts", "closed", "archives", "settings"].includes(currentScreen)) {
            goToLibraryScreen();
            return;
        }

        leaveBuilder(goToLibraryScreen);
    });

    navArchivesBtn?.addEventListener("click", () => {
        if (!state.currentUser) {
            renderLoginScreen();
            return;
        }

        if (currentScreen === "archives") return;

        if (["accueil", "drafts", "closed", "library", "settings"].includes(currentScreen)) {
            goToArchivesScreen();
            return;
        }

        leaveBuilder(goToArchivesScreen);
    });

    navSettingsBtn?.addEventListener("click", () => {
        if (!state.currentUser) {
            renderLoginScreen();
            return;
        }

        if (currentScreen === "settings") return;

        if (["accueil", "drafts", "closed", "archives", "library"].includes(currentScreen)) {
            goToSettingsScreen();
            return;
        }

        leaveBuilder(goToSettingsScreen);
    });
}

function moveRow(section, index, direction) {
    const list = state.data?.[section];
    if (!Array.isArray(list)) return;

    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= list.length) return;

    const temp = list[index];
    list[index] = list[newIndex];
    list[newIndex] = temp;

   markAsDirty();
    saveAutosave();
    renderStep();
}

function getFileDisplay(item) {
    if (!item.fileName) return "AUCUN FICHIER";

    if (item.invalid) {
        return `
            <span style="color:#A02411; font-weight:600;">
                ⚠ ${item.fileName}
            </span>
            <div style="font-size:11px; color:#A02411; opacity:0.8;">
                ${item.error || "Fichier invalide"}
            </div>
        `;
    }

    return item.fileName;
}

function escapeHtml(value) {
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

function escapeJs(value) {
    return String(value ?? "")
        .replaceAll("\\", "\\\\")
        .replaceAll("'", "\\'");
}

function capitalize(value) {
    if (!value) return value;
    return value.charAt(0).toUpperCase() + value.slice(1);
}

function getTodayDate() {
    return new Date().toISOString().split("T")[0];
}

function formatDateDisplay(value) {
    if (!value) return "JJ/MM/AAAA";
    const [year, month, day] = value.split("-");
    if (!year || !month || !day) return value;
    return `${day}/${month}/${year}`;
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

function getSectionTitle(key) {
    const map = {
        fiches: "Fiches techniques",
        pv: "Procès-verbaux",
        schemas: "Schémas"
    };
    return map[key] || key;
}

function getCurrentAddressLine() {
    const { adresse, code_postal, ville } = state.data.infos;
    return [adresse, code_postal, ville].filter(Boolean).join(" ");
}

function getDraftDisplayTitle() {
    const { adresse, ville, code_postal } = state.data.infos;
    const parts = [adresse, code_postal, ville].filter(Boolean);
    return parts.length ? parts.join(" ") : "Brouillon sans adresse";
}

function formatFileSize(bytes) {
    if (!bytes || Number.isNaN(bytes)) return "";
    if (bytes < 1024) return `${bytes} o`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}

function getFileMetaLabel(item) {
    if (!item) return "";

    const parts = [];

    if (item.fileType) {
        if (item.fileType.includes("pdf")) parts.push("PDF");
        else if (item.fileType.startsWith("image/")) parts.push("Image");
        else parts.push(item.fileType);
    }

    if (item.fileSize) {
        parts.push(formatFileSize(item.fileSize));
    }

    if (item.fileSource === "library" || item.autoMatched) {
        parts.push("Base");
    } else if (item.fileSource === "upload") {
        parts.push("Upload");
    }

    return parts.join(" • ");
}

function downloadFile(section, index) {
    const item = state.data[section]?.[index];
    if (!item?.file) {
        showToast("Aucun fichier à télécharger.", "error");
        return;
    }

    try {
        const blob = dataURLToBlob(item.file);
        const objectUrl = URL.createObjectURL(blob);

        const link = document.createElement("a");
        link.href = objectUrl;
        link.download = item.fileName || "document";
        document.body.appendChild(link);
        link.click();
        link.remove();

        setTimeout(() => {
            URL.revokeObjectURL(objectUrl);
        }, 10000);
    } catch (error) {
        console.error("Erreur téléchargement fichier :", error);
        showToast("Impossible de télécharger ce fichier.", "error");
    }
}

function triggerReplaceFile(section, index) {
    const input = document.getElementById(`file-input-${section}-${index}`);
    if (!input) {
        showToast("Champ fichier introuvable.", "error");
        return;
    }
    input.click();
}

let pendingLeaveAction = null;

function openLeaveConfirmModal(onLeave) {
    pendingLeaveAction = onLeave;
    document.getElementById("leave-confirm-modal")?.classList.remove("hidden");
}

function closeLeaveConfirmModal() {
    pendingLeaveAction = null;
    document.getElementById("leave-confirm-modal")?.classList.add("hidden");
}

function executePendingLeave() {
    if (typeof pendingLeaveAction === "function") {
        pendingLeaveAction();
    }
    closeLeaveConfirmModal();
}

function resetCurrentDoe() {
    state = getEmptyState();
    state.data.infos.date_doe = getTodayDate();
    state.currentDraftId = null;
    resetExportValidationState();
    saveAutosave();
    markAsClean();
}

function wireLeaveConfirmModal() {
    document.getElementById("close-leave-confirm-btn")?.addEventListener("click", closeLeaveConfirmModal);
    document.getElementById("leave-stay-btn")?.addEventListener("click", closeLeaveConfirmModal);

    document.getElementById("leave-no-save-btn")?.addEventListener("click", () => {
        executePendingLeave();
    });

document.getElementById("leave-save-btn")?.addEventListener("click", () => {
    const missingInfos = validateInfosForDraftSave();

    if (missingInfos.length) {
        showToast(`Champs obligatoires manquants : ${missingInfos.join(", ")}`, "error");
        goToStep(0);
        closeLeaveConfirmModal();
        return;
    }

    const existingIndex = findExistingDraftIndexByKey();

    if (existingIndex >= 0) {
        saveDraftByMode("overwrite");
    } else {
        saveDraftByMode("normal");
    }

    executePendingLeave();
});
}

function normalizeDraftKey(value) {
    return String(value || "")
        .trim()
        .toUpperCase()
        .replace(/\s+/g, " ");
}

function getCurrentDraftMatchKey() {
    return {
        adresse: normalizeDraftKey(state.data?.infos?.adresse),
        nature: normalizeDraftKey(state.data?.infos?.nature_travaux)
    };
}

function findExistingDraftIndexByKey() {
    const drafts = getSavedDrafts();
    const current = getCurrentDraftMatchKey();

    if (!current.adresse || !current.nature) return -1;

    return drafts.findIndex(draft => {
        const infos = draft?.state?.data?.infos || {};
        return (
            normalizeDraftKey(infos.adresse) === current.adresse &&
            normalizeDraftKey(infos.nature_travaux) === current.nature
        );
    });
}

function buildDraftPayload() {
    return {
        id: state.currentDraftId || (crypto.randomUUID ? crypto.randomUUID() : String(Date.now())),
        title: getDraftDisplayTitle(),
        updatedAt: new Date().toISOString(),
        state: deepClone(state)
    };
}

function saveDraftByMode(mode = "normal") {
    const drafts = getSavedDrafts();
    const existingIndex = findExistingDraftIndexByKey();
    const payload = buildDraftPayload();

    if (mode === "overwrite" && existingIndex >= 0) {
        payload.id = drafts[existingIndex].id;
        drafts[existingIndex] = payload;
        state.currentDraftId = payload.id;
    } else {
        const sameIdIndex = drafts.findIndex(d => d.id === payload.id);

        if (sameIdIndex >= 0) {
            drafts[sameIdIndex] = payload;
        } else {
            drafts.unshift(payload);
        }

        state.currentDraftId = payload.id;
    }

    localStorage.setItem(DRAFTS_STORAGE_KEY, JSON.stringify(drafts));
    saveAutosave();
    markAsClean();
    showToast("Brouillon enregistré.", "success");
}

function openDraftOverwriteModal() {
    document.getElementById("draft-overwrite-modal")?.classList.remove("hidden");
}

function closeDraftOverwriteModal() {
    document.getElementById("draft-overwrite-modal")?.classList.add("hidden");
}

function wireDraftOverwriteModal() {
    document.getElementById("close-draft-overwrite-btn")?.addEventListener("click", closeDraftOverwriteModal);
    document.getElementById("draft-overwrite-cancel-btn")?.addEventListener("click", closeDraftOverwriteModal);

    document.getElementById("draft-overwrite-ok-btn")?.addEventListener("click", () => {
        saveDraftByMode("overwrite");
        closeDraftOverwriteModal();
    });

    document.getElementById("draft-overwrite-copy-btn")?.addEventListener("click", () => {
        state.currentDraftId = null;
        saveDraftByMode("normal");
        closeDraftOverwriteModal();
    });
}

function getEstimatedZipSize() {
    const sections = ["fiches", "pv", "schemas"];
    let total = 0;

    sections.forEach(section => {
        state.data[section].forEach(item => {
            if (item.fileSize) {
                total += Number(item.fileSize) || 0;
            } else if (item.file) {
                total += estimateBase64Size(item.file);
            }
        });
    });

    return total;
}

function estimateBase64Size(dataUrl) {
    if (!dataUrl || typeof dataUrl !== "string") return 0;
    const parts = dataUrl.split(",");
    if (parts.length < 2) return 0;

    const base64 = parts[1];
    const padding = (base64.match(/=*$/) || [""])[0].length;
    return Math.floor((base64.length * 3) / 4) - padding;
}

function renderExportDocSection(title, items, sectionKey) {
    const count = items.length;

    return `
        <div class="export-doc-block">
            <button
                type="button"
                class="export-doc-toggle"
                onclick="toggleExportDocList('${sectionKey}')"
            >
                <span>${escapeHtml(title)}</span>
                <strong>${count}</strong>
            </button>

            <div id="export-doc-list-${sectionKey}" class="export-doc-list hidden">
                ${
                    count === 0
                        ? `<div class="export-doc-empty">Aucun document</div>`
                        : items.map(item => `
                            <div class="export-doc-item">
                                ${escapeHtml(formatExportDocLabel(sectionKey, item))}
                            </div>
                        `).join("")
                }
            </div>
        </div>
    `;
}

function formatExportDocLabel(sectionKey, item) {
    if (sectionKey === "fiches") {
        const parts = [item.type, item.marque, item.modele].filter(Boolean);
        return parts.length ? parts.join(" : ") : "Document sans détail";
    }

    if (sectionKey === "pv" || sectionKey === "schemas") {
        const type = item.type || "TYPE NON RENSEIGNÉ";
        const fileName = item.fileName || "AUCUN FICHIER";
        return `${type} : ${fileName}`;
    }

    return "Document";
}

function toggleExportDocList(sectionKey) {
    const el = document.getElementById(`export-doc-list-${sectionKey}`);
    const parent = el?.closest(".export-doc-block");
    if (!el || !parent) return;

    const isOpen = !el.classList.contains("hidden");

    document.querySelectorAll(".export-doc-list").forEach(node => node.classList.add("hidden"));
    document.querySelectorAll(".export-doc-block").forEach(node => node.classList.remove("is-open"));

    if (!isOpen) {
        el.classList.remove("hidden");
        parent.classList.add("is-open");
    }
}

async function startFakeExportPrep() {
    if (exportUiState.isExporting) return;

    const fill = document.getElementById("export-progress-fill");
    const text = document.getElementById("export-progress-text");

    const validationIssues = collectExportValidation();

    if (validationIssues.length) {
        renderStep();
        showFailedFilesAlert(validationIssues);
        showToast("Merci de compléter les champs obligatoires avant export.", "error");
        return;
    }

    const invalidFiles = getInvalidFiles();

    if (invalidFiles.length) {
        showFailedFilesAlert(
            invalidFiles.map(item => ({
                label: (item.type || "DOCUMENT").toUpperCase(),
                fileName: item.fileName || "FICHIER",
                reason: item.error || "Fichier invalide"
            }))
        );

        showToast("Corrige les fichiers avant export", "error");
        return;
    }

    if (!fill || !text) return;

    if (typeof JSZip === "undefined") {
        showToast("JSZip n’est pas chargé.", "error");
        return;
    }

    if (typeof PDFLib === "undefined") {
        showToast("PDF-lib n’est pas chargé.", "error");
        return;
    }

    exportUiState.isExporting = true;
    syncExportUiState();

    const zip = new JSZip();

    const fullAddress = [state.data.infos.adresse, state.data.infos.code_postal, state.data.infos.ville]
        .filter(Boolean)
        .join(" ")
        .trim() || "DOE";

    const safeFolderName = sanitizeFileName(fullAddress);
    const root = zip.folder(safeFolderName);

    if (!root) {
        exportUiState.isExporting = false;
        syncExportUiState();
        showToast("Impossible de créer le ZIP.", "error");
        return;
    }

    fill.style.width = "0%";
    text.textContent = "Préparation du ZIP...";

    try {
        text.textContent = "Génération du DOE.pdf...";
        fill.style.width = "12%";

        const pdfResult = await buildRealDoePdfBlob();

        if (pdfResult.failedFiles.length) {
            fill.style.width = "0%";
            text.textContent = "Export bloqué";
            exportUiState.isExporting = false;
            syncExportUiState();

            showFailedFilesAlert(pdfResult.failedFiles);
            showToast("Certains fichiers doivent être remplacés.", "error");
            return;
        }

        root.file("DOE.pdf", pdfResult.blob);

        fill.style.width = "28%";
        text.textContent = "Préparation des fichiers originaux...";

        const sections = [
            {
                key: "fiches",
                folderName: "FICHES TECHNIQUES",
                getFileName: (item, index) => {
                    const base = [item.type, item.marque, item.modele].filter(Boolean).join(" - ");
                    return sanitizeFileName(base || `FICHE-${index + 1}`);
                }
            },
            {
                key: "pv",
                folderName: "PROCES-VERBAUX",
                getFileName: (item, index) => {
                    const base = item.type || `PV-${index + 1}`;
                    return sanitizeFileName(base);
                }
            },
            {
                key: "schemas",
                folderName: "SCHEMAS",
                getFileName: (item, index) => {
                    const base = item.type || `SCHEMA-${index + 1}`;
                    return sanitizeFileName(base);
                }
            }
        ];

        const allFiles = [];

        sections.forEach(section => {
            state.data[section.key].forEach((item, index) => {
                if (item.file) {
                    allFiles.push({
                        section,
                        item,
                        index
                    });
                }
            });
        });

        for (let i = 0; i < allFiles.length; i++) {
            const { section, item, index } = allFiles[i];
            const sectionFolder = root.folder(section.folderName);
            if (!sectionFolder) continue;

            text.textContent = `Ajout des fichiers originaux (${i + 1}/${allFiles.length})...`;

            const extension = getFileExtension(item.fileName, item.fileType);
            const fileBaseName = section.getFileName(item, index);
            const finalFileName = `${fileBaseName}${extension}`;

            const blob = dataURLToBlob(item.file);
            sectionFolder.file(finalFileName, blob);

            const percent = 28 + Math.round(((i + 1) / Math.max(allFiles.length, 1)) * 32);
            fill.style.width = `${percent}%`;
        }

        text.textContent = "Compression du ZIP...";

        const zipBlob = await zip.generateAsync(
            { type: "blob" },
            (metadata) => {
                const progress = 60 + Math.round((metadata.percent / 100) * 40);
                fill.style.width = `${Math.min(progress, 100)}%`;
            }
        );

        text.textContent = "Téléchargement...";
        fill.style.width = "100%";

        const zipFileName = `${safeFolderName}.zip`;
        triggerBlobDownload(zipBlob, zipFileName);

        text.textContent = "ZIP téléchargé";
        showToast("ZIP généré avec succès.", "success");
    } catch (error) {
        console.error("Erreur génération ZIP :", error);
        text.textContent = "Erreur lors de l’export";
        fill.style.width = "0%";
        showToast("Impossible de générer le ZIP.", "error");
    } finally {
        exportUiState.isExporting = false;
        syncExportUiState();
    }
}

function sanitizeFileName(value) {
    return String(value || "DOCUMENT")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[<>:"/\\|?*\x00-\x1F]/g, "")
        .replace(/\s+/g, " ")
        .trim()
        .replace(/\./g, "-");
}

function getFileExtension(fileName, fileType) {
    if (fileName && fileName.includes(".")) {
        return "." + fileName.split(".").pop().toLowerCase();
    }

    if (fileType === "application/pdf") return ".pdf";
    if (fileType?.startsWith("image/jpeg")) return ".jpg";
    if (fileType?.startsWith("image/png")) return ".png";
    if (fileType?.startsWith("image/webp")) return ".webp";

    return "";
}

function triggerBlobDownload(blob, fileName) {
    const objectUrl = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = objectUrl;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();

    setTimeout(() => {
        URL.revokeObjectURL(objectUrl);
    }, 10000);
}

function dataURLToUint8Array(dataURL) {
    if (!dataURL || typeof dataURL !== "string") return new Uint8Array();

    const parts = dataURL.split(",");
    if (parts.length < 2) return new Uint8Array();

    const byteString = atob(parts[1]);
    const array = new Uint8Array(byteString.length);

    for (let i = 0; i < byteString.length; i++) {
        array[i] = byteString.charCodeAt(i);
    }

    return array;
}

function drawWrappedText(page, text, x, y, maxWidth, font, size, color, lineHeight = 16) {
    const words = String(text || "").split(/\s+/);
    let line = "";
    let currentY = y;

    for (const word of words) {
        const candidate = line ? `${line} ${word}` : word;
        const width = font.widthOfTextAtSize(candidate, size);

        if (width <= maxWidth) {
            line = candidate;
        } else {
            if (line) {
                page.drawText(line, { x, y: currentY, size, font, color });
                currentY -= lineHeight;
            }
            line = word;
        }
    }

    if (line) {
        page.drawText(line, { x, y: currentY, size, font, color });
        currentY -= lineHeight;
    }

    return currentY;
}

function drawCenteredText(page, text, y, font, size, color) {
    const pageWidth = page.getWidth();
    const textWidth = font.widthOfTextAtSize(text, size);
    const x = (pageWidth - textWidth) / 2;

    page.drawText(text, { x, y, size, font, color });
}

function getSectionExportItems(sectionKey) {
    return state.data[sectionKey].filter(item => item.file);
}

function getSectionDisplayLabel(sectionKey) {
    const map = {
        fiches: "FICHES TECHNIQUES",
        pv: "PROCES-VERBAUX",
        schemas: "SCHEMAS"
    };
    return map[sectionKey] || sectionKey.toUpperCase();
}

async function buildRealDoePdfBlob() {
    const { PDFDocument, StandardFonts, rgb } = PDFLib;

    const pdf = await PDFDocument.create();

    const fontRegular = await pdf.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold);
    const fontItalic = await pdf.embedFont(StandardFonts.HelveticaOblique);

    const PAGE = { width: 595, height: 842 };

    const COLORS = {
        primary: rgb(0.07, 0.15, 0.35),
        accent: rgb(0.15, 0.35, 0.65),
        highlight: rgb(0.86, 0.16, 0.19),
        text: rgb(0.08, 0.08, 0.08),
        muted: rgb(0.45, 0.45, 0.45),
        black: rgb(0.1, 0.1, 0.1),
        white: rgb(1, 1, 1)
    };

    const infos = state.data.infos || {};
    const adresse = (infos.adresse || "").toUpperCase().trim();
    const ville = (infos.ville || "").toUpperCase().trim();
    const cp = (infos.code_postal || "").trim();
    const objet = (infos.nature_travaux || "").toUpperCase().trim();
    const date = infos.date_doe ? formatDateDisplay(infos.date_doe) : "";

    const fullAddress = [adresse, cp, ville].filter(Boolean).join(" ").trim();
    const headerContact = "82 RUE ALEXANDRE DUMAS 75020 PARIS | 01 43 56 62 43 | services@sopodex.fr";

    const renderedPages = [];
    const failedFiles = [];

    function addTrackedPage(role, meta = {}) {
        const page = pdf.addPage([PAGE.width, PAGE.height]);
        renderedPages.push({ page, role, ...meta });
        return page;
    }

    function drawCenteredText(page, text, y, font, size, color) {
        const safeText = String(text || "");
        const width = font.widthOfTextAtSize(safeText, size);
        const x = (PAGE.width - width) / 2;
        page.drawText(safeText, { x, y, size, font, color });
    }

    function drawDottedLeader(page, startX, endX, y) {
        const dotSpacing = 5;
        const dotRadius = 0.8;

        for (let x = startX; x <= endX; x += dotSpacing) {
            page.drawCircle({
                x,
                y,
                size: dotRadius,
                color: COLORS.text
            });
        }
    }

    function drawFooter(page, currentNumber, totalNumberedPages) {
        page.drawRectangle({
            x: 80,
            y: 57,
            width: PAGE.width - 160,
            height: 1,
            color: COLORS.text
        });

        page.drawText(`SOPODEX | DOE | ${objet || "SANS OBJET"}`, {
            x: 80,
            y: 34,
            size: 9,
            font: fontBold,
            color: COLORS.text
        });

        const label = `${currentNumber}/${totalNumberedPages}`;
        const labelWidth = fontRegular.widthOfTextAtSize(label, 9);

        page.drawText(label, {
            x: PAGE.width - 80 - labelWidth,
            y: 34,
            size: 9,
            font: fontRegular,
            color: COLORS.text
        });
    }

    function dataURLToUint8ArrayLocal(dataURL) {
        const parts = String(dataURL || "").split(",");
        if (parts.length < 2) return new Uint8Array();

        const binary = atob(parts[1]);
        const bytes = new Uint8Array(binary.length);

        for (let i = 0; i < binary.length; i++) {
            bytes[i] = binary.charCodeAt(i);
        }

        return bytes;
    }

    function getDisplayType(item) {
        return String(item?.type || "DOCUMENT").toUpperCase();
    }

    function getDisplayBrand(item) {
        return String(item?.marque || "").toUpperCase();
    }

    function getDisplayModel(item) {
        return String(item?.modele || "").toUpperCase();
    }

    function getFicheSubLabel(item) {
        return [getDisplayBrand(item), getDisplayModel(item)].filter(Boolean).join(" - ");
    }

    function getFailureLabel(sectionKey, item) {
        if (sectionKey === "fiches") return getDisplayType(item);
        return getDisplayType(item);
    }

    function getDividerInfoLines(sectionKey, item) {
        if (sectionKey === "fiches") {
            return [
                { text: getDisplayType(item), font: fontBold, size: 24, color: COLORS.primary },
                { text: getDisplayBrand(item), font: fontItalic, size: 20, color: COLORS.primary },
                { text: getDisplayModel(item), font: fontItalic, size: 16, color: COLORS.primary }
            ].filter(line => line.text);
        }

        return [
            { text: getDisplayType(item), font: fontBold, size: 24, color: COLORS.primary }
        ];
    }

    function addCover() {
        const cover = addTrackedPage("cover");

        cover.drawRectangle({
            x: 0,
            y: PAGE.height - 80,
            width: 120,
            height: 80,
            color: COLORS.primary
        });

        cover.drawText("SOPODEX", {
            x: 18,
            y: PAGE.height - 45,
            size: 12,
            font: fontBold,
            color: COLORS.white
        });

        cover.drawText(headerContact, {
            x: 140,
            y: PAGE.height - 45,
            size: 10,
            font: fontRegular,
            color: COLORS.primary
        });

        cover.drawRectangle({
            x: 0,
            y: PAGE.height - 82,
            width: PAGE.width,
            height: 1,
            color: COLORS.primary
        });

        cover.drawText("DOSSIER DES", {
            x: 80,
            y: 520,
            size: 28,
            font: fontBold,
            color: COLORS.text
        });

        cover.drawText("OUVRAGES", {
            x: 80,
            y: 480,
            size: 28,
            font: fontBold,
            color: COLORS.text
        });

        cover.drawText("EXECUTES", {
            x: 80,
            y: 440,
            size: 28,
            font: fontBold,
            color: COLORS.text
        });

        cover.drawRectangle({
            x: 80,
            y: 260,
            width: PAGE.width - 160,
            height: 80,
            color: rgb(0.03, 0.05, 0.20)
        });

        drawCenteredText(
            cover,
            fullAddress || "ADRESSE NON RENSEIGNEE",
            300,
            fontBold,
            18,
            COLORS.white
        );

        cover.drawText(objet || "SANS OBJET", {
            x: 80,
            y: 220,
            size: 14,
            font: fontRegular,
            color: COLORS.primary
        });

        if (date) {
            const dateWidth = fontRegular.widthOfTextAtSize(date, 14);
            cover.drawText(date, {
                x: PAGE.width - 80 - dateWidth,
                y: 220,
                size: 14,
                font: fontRegular,
                color: COLORS.text
            });
        }

        cover.drawRectangle({
            x: 80,
            y: 200,
            width: PAGE.width - 160,
            height: 1,
            color: COLORS.primary
        });
    }

    const summaryEntries = [];

    function addSummary() {
        const summary = addTrackedPage("summary");

        summary.drawRectangle({
            x: 80,
            y: PAGE.height - 120,
            width: 140,
            height: 50,
            color: COLORS.black
        });

        summary.drawText("SOMMAIRE", {
            x: 98,
            y: PAGE.height - 95,
            size: 14,
            font: fontBold,
            color: COLORS.white
        });

        if (fullAddress) {
            const addressWidth = fontRegular.widthOfTextAtSize(fullAddress, 10);
            summary.drawText(fullAddress, {
                x: PAGE.width - 80 - addressWidth,
                y: PAGE.height - 95,
                size: 10,
                font: fontRegular,
                color: COLORS.text
            });
        }

        summary.drawRectangle({
            x: 80,
            y: PAGE.height - 130,
            width: PAGE.width - 160,
            height: 1,
            color: COLORS.text
        });

        let y = 640;

        function drawSummarySection(title, color, items, sectionKey) {
            summary.drawRectangle({
                x: 80,
                y: y + 5,
                width: 12,
                height: 12,
                color
            });

            summary.drawText(title, {
                x: 104,
                y,
                size: 16,
                font: fontBold,
                color
            });

            y -= 34;

            if (!items.length) {
                summary.drawText("AUCUN DOCUMENT", {
                    x: 104,
                    y,
                    size: 12,
                    font: fontItalic,
                    color: COLORS.muted
                });
                y -= 38;
                return;
            }

            items.forEach((item) => {
                const entry = {
                    item,
                    sectionKey,
                    summaryPage: summary,
                    topY: y
                };
                summaryEntries.push(entry);

                const mainLabel = getDisplayType(item);

                summary.drawText(mainLabel, {
                    x: 104,
                    y,
                    size: 12,
                    font: fontBold,
                    color: COLORS.text
                });

                drawDottedLeader(summary, 200, PAGE.width - 100, y + 5);

                y -= 18;

                if (sectionKey === "fiches") {
                    const subLabel = getFicheSubLabel(item);

                    if (subLabel) {
                        summary.drawText(subLabel, {
                            x: 104,
                            y,
                            size: 11,
                            font: fontItalic,
                            color: COLORS.muted
                        });

                        y -= 26;
                    } else {
                        y -= 8;
                    }
                } else {
                    y -= 10;
                }
            });

            y -= 18;
        }

        drawSummarySection(
            "FICHES TECHNIQUES",
            COLORS.primary,
            state.data.fiches.filter(item => item.file),
            "fiches"
        );

        drawSummarySection(
            "PROCES VERBAUX",
            COLORS.accent,
            state.data.pv.filter(item => item.file),
            "pv"
        );

        drawSummarySection(
            "SCHEMAS",
            COLORS.highlight,
            state.data.schemas.filter(item => item.file),
            "schemas"
        );
    }

    function addSectionDivider(sectionTitle, color, sectionKey, item) {
        const page = addTrackedPage("divider", { sectionKey, item });

        page.drawRectangle({
            x: 80,
            y: PAGE.height - 120,
            width: 180,
            height: 50,
            color
        });

        page.drawText(sectionTitle, {
            x: 98,
            y: PAGE.height - 95,
            size: 14,
            font: fontBold,
            color: COLORS.white
        });

        if (fullAddress) {
            const addressWidth = fontRegular.widthOfTextAtSize(fullAddress, 10);
            page.drawText(fullAddress, {
                x: PAGE.width - 80 - addressWidth,
                y: PAGE.height - 95,
                size: 10,
                font: fontRegular,
                color: COLORS.text
            });
        }

        page.drawRectangle({
            x: 80,
            y: PAGE.height - 130,
            width: PAGE.width - 160,
            height: 1,
            color: COLORS.primary
        });

        const lines = getDividerInfoLines(sectionKey, item);
        let contentY = 470;

        lines.forEach((line, index) => {
            page.drawText(line.text, {
                x: 104,
                y: contentY,
                size: line.size,
                font: line.font,
                color: line.color
            });

            if (index === 0) contentY -= 28;
            else if (index === 1) contentY -= 24;
            else contentY -= 18;
        });

        return page;
    }

    async function addMergedFile(sectionKey, item) {
        const fileDataUrl = item?.file;
        if (!fileDataUrl) return;

        const bytes = dataURLToUint8ArrayLocal(fileDataUrl);
        const fileName = item?.fileName || "FICHIER SANS NOM";
        const fileType = item?.fileType || "";

        function pushFailure(reason = "") {
            failedFiles.push({
                sectionKey,
                label: getFailureLabel(sectionKey, item),
                fileName,
                reason
            });
        }

        const looksLikePdf =
            fileType === "application/pdf" ||
            fileName.toLowerCase().endsWith(".pdf") ||
            fileDataUrl.startsWith("data:application/pdf");

        const looksLikeJpg =
            fileType.startsWith("image/jpeg") ||
            /\.(jpe?g)$/i.test(fileName) ||
            fileDataUrl.startsWith("data:image/jpeg");

        const looksLikePng =
            fileType.startsWith("image/png") ||
            /\.png$/i.test(fileName) ||
            fileDataUrl.startsWith("data:image/png");

        if (looksLikePdf) {
            try {
                const srcPdf = await PDFDocument.load(bytes);
                const copiedPages = await pdf.copyPages(srcPdf, srcPdf.getPageIndices());

                copiedPages.forEach((copiedPage) => {
                    pdf.addPage(copiedPage);
                    renderedPages.push({ page: copiedPage, role: "content" });
                });

                return;
            } catch (error) {
                console.error("Erreur fusion PDF :", fileName, error);
                pushFailure("PDF invalide ou corrompu");
                return;
            }
        }

        if (looksLikeJpg || looksLikePng) {
            try {
                const page = addTrackedPage("content");
                let image = null;

                if (looksLikeJpg) {
                    image = await pdf.embedJpg(bytes);
                } else {
                    image = await pdf.embedPng(bytes);
                }

                const maxWidth = PAGE.width - 120;
                const maxHeight = PAGE.height - 160;
                const scale = Math.min(
                    maxWidth / image.width,
                    maxHeight / image.height
                );

                page.drawImage(image, {
                    x: (PAGE.width - image.width * scale) / 2,
                    y: (PAGE.height - image.height * scale) / 2,
                    width: image.width * scale,
                    height: image.height * scale
                });

                return;
            } catch (error) {
                console.error("Erreur intégration image :", fileName, error);
                pushFailure("Image invalide ou illisible");
                return;
            }
        }

        try {
            const srcPdf = await PDFDocument.load(bytes);
            const copiedPages = await pdf.copyPages(srcPdf, srcPdf.getPageIndices());

            copiedPages.forEach((copiedPage) => {
                pdf.addPage(copiedPage);
                renderedPages.push({ page: copiedPage, role: "content" });
            });

            return;
        } catch {}

        try {
            const page = addTrackedPage("content");
            let image = null;

            try {
                image = await pdf.embedJpg(bytes);
            } catch {
                image = await pdf.embedPng(bytes);
            }

            const maxWidth = PAGE.width - 120;
            const maxHeight = PAGE.height - 160;
            const scale = Math.min(
                maxWidth / image.width,
                maxHeight / image.height
            );

            page.drawImage(image, {
                x: (PAGE.width - image.width * scale) / 2,
                y: (PAGE.height - image.height * scale) / 2,
                width: image.width * scale,
                height: image.height * scale
            });

            return;
        } catch {}

        pushFailure("Format non pris en charge ou fichier illisible");
    }

    addCover();
    addSummary();

    const ficheItems = state.data.fiches.filter(item => item.file);
    const pvItems = state.data.pv.filter(item => item.file);
    const schemaItems = state.data.schemas.filter(item => item.file);

    for (const item of ficheItems) {
        item.__sectionStartPage = renderedPages.length;
        addSectionDivider("FICHES TECHNIQUES", COLORS.primary, "fiches", item);
        await addMergedFile("fiches", item);
    }

    for (const item of pvItems) {
        item.__sectionStartPage = renderedPages.length;
        addSectionDivider("PROCES VERBAUX", COLORS.accent, "pv", item);
        await addMergedFile("pv", item);
    }

    for (const item of schemaItems) {
        item.__sectionStartPage = renderedPages.length;
        addSectionDivider("SCHEMAS", COLORS.highlight, "schemas", item);
        await addMergedFile("schemas", item);
    }

    const totalPhysicalPages = renderedPages.length;
    const totalNumberedPages = Math.max(totalPhysicalPages - 1, 1);

    function numberedPageFromPhysicalIndex(physicalIndex) {
        return Math.max(physicalIndex, 1);
    }

    summaryEntries.forEach((entry) => {
        const item = entry.item;
        const summaryPage = entry.summaryPage;
        const topY = entry.topY;

        const targetNumber = numberedPageFromPhysicalIndex(item.__sectionStartPage);
        const numberText = String(targetNumber);
        const numberWidth = fontBold.widthOfTextAtSize(numberText, 12);

        summaryPage.drawText(numberText, {
            x: PAGE.width - 80 - numberWidth,
            y: topY,
            size: 12,
            font: fontBold,
            color: COLORS.text
        });
    });

    renderedPages.forEach((entry, index) => {
        if (index === 0) return;

        const currentNumber = numberedPageFromPhysicalIndex(index);

        if (entry.role === "content") {
            return;
        }

        drawFooter(entry.page, currentNumber, totalNumberedPages);
    });

    [...ficheItems, ...pvItems, ...schemaItems].forEach((item) => {
        delete item.__sectionStartPage;
    });

    const bytes = await pdf.save();
    return {
        blob: new Blob([bytes], { type: "application/pdf" }),
        failedFiles
    };
}

function resetExportValidationState() {
    exportValidationState = {
        infos: {},
        rows: {
            fiches: {},
            pv: {},
            schemas: {}
        }
    };
}

function markInfoMissing(field) {
    exportValidationState.infos[field] = true;
}

function markRowMissing(section, index, field) {
    if (!exportValidationState.rows[section][index]) {
        exportValidationState.rows[section][index] = {};
    }
    exportValidationState.rows[section][index][field] = true;
}

function isInfoMissing(field) {
    return !!exportValidationState.infos[field];
}

function isRowFieldMissing(section, index, field) {
    return !!exportValidationState.rows?.[section]?.[index]?.[field];
}

function isRowCardMissing(section, index) {
    return !!exportValidationState.rows?.[section]?.[index];
}

function hasAnyValue(value) {
    return value !== undefined && value !== null && String(value).trim() !== "";
}

function collectExportValidation() {
    resetExportValidationState();

    const issues = [];

    const infos = state.data.infos || {};
    const requiredInfos = [
        ["adresse", "Adresse"],
        ["nature_travaux", "Nature des travaux"],
        ["code_postal", "Code postal"],
        ["ville", "Ville"],
        ["date_reception", "Date de réception"],
        ["date_doe", "Date DOE"]
    ];

    requiredInfos.forEach(([field, label]) => {
        if (!hasAnyValue(infos[field])) {
            markInfoMissing(field);
            issues.push({
                label,
                fileName: "Champ obligatoire",
                reason: "Manquant"
            });
        }
    });

    (state.data.fiches || []).forEach((item, index) => {
        const missing = [];

        if (!hasAnyValue(item.type)) {
            markRowMissing("fiches", index, "type");
            missing.push("Type");
        }
        if (!hasAnyValue(item.marque)) {
            markRowMissing("fiches", index, "marque");
            missing.push("Marque");
        }
        if (!hasAnyValue(item.modele)) {
            markRowMissing("fiches", index, "modele");
            missing.push("Modèle");
        }
        if (!item.file) {
            markRowMissing("fiches", index, "file");
            missing.push("Fichier");
        }

        if (missing.length) {
            issues.push({
                label: `Fiche technique ${index + 1}`,
                fileName: missing.join(", "),
                reason: "Champs obligatoires manquants"
            });
        }
    });

    (state.data.pv || []).forEach((item, index) => {
        const missing = [];

        if (!hasAnyValue(item.type)) {
            markRowMissing("pv", index, "type");
            missing.push("Type");
        }
        if (!item.file) {
            markRowMissing("pv", index, "file");
            missing.push("Fichier");
        }

        if (missing.length) {
            issues.push({
                label: `PV ${index + 1}`,
                fileName: missing.join(", "),
                reason: "Champs obligatoires manquants"
            });
        }
    });

    (state.data.schemas || []).forEach((item, index) => {
        const missing = [];

        if (!hasAnyValue(item.type)) {
            markRowMissing("schemas", index, "type");
            missing.push("Type");
        }
        if (!item.file) {
            markRowMissing("schemas", index, "file");
            missing.push("Fichier");
        }

        if (missing.length) {
            issues.push({
                label: `Schéma ${index + 1}`,
                fileName: missing.join(", "),
                reason: "Champs obligatoires manquants"
            });
        }
    });

    return issues;
}

function getFieldErrorClass(isMissing) {
    return isMissing ? " field-error" : "";
}

function getCardErrorClass(isMissing) {
    return isMissing ? " card-error" : "";
}

function syncExportUiState() {
    const button = document.getElementById("export-zip-btn");
    const buttonLabel = document.getElementById("export-zip-btn-label");

    if (button) {
        button.disabled = exportUiState.isExporting;
        button.classList.toggle("is-loading", exportUiState.isExporting);
    }

    if (buttonLabel) {
        buttonLabel.textContent = exportUiState.isExporting ? "Export en cours..." : "Télécharger le ZIP";
    }
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
            state.data.infos.date_doe = getTodayDate();
            goToStep(0);
            showToast("Brouillon local effacé.", "info");
        }
    });
}

function markAsDirty() {
    hasUnsavedChanges = true;
}

function markAsClean() {
    hasUnsavedChanges = false;
}

/* ========================
   DRAFTS
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

function saveDraft() {
    handleSaveDraft();
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

    if (!drafts.length) {
        draftsList.innerHTML = `<div class="empty-drafts">Aucun brouillon enregistré pour le moment.</div>`;
        return;
    }

    draftsList.innerHTML = drafts.map(draft => `
        <div class="draft-item">
            <div class="draft-main">
                <div class="draft-title">${escapeHtml(draft.title || "Brouillon")}</div>
                <div class="draft-meta">Dernière mise à jour : ${formatDraftDate(draft.updatedAt)}</div>
            </div>
            <div class="draft-actions">
                <button class="draft-btn load" onclick="loadDraft('${draft.id}')">Ouvrir</button>
                <button class="draft-btn delete" onclick="deleteDraft('${draft.id}')">Supprimer</button>
            </div>
        </div>
    `).join("");
}

function loadDraft(draftId) {
    const draft = getAllDrafts().find(item => item.id === draftId);
    if (!draft) return;

    state = draft.state;
    saveAutosave();
    markAsClean();
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
   CREATE VALUE MODAL
======================== */
let pendingCreateValueContext = null;

function getCreateValueModalConfig(kind, row, section) {
    if (kind === "type" && section === "fiches") {
        return {
            title: "Ajouter un type",
            label: "Nouveau type",
            placeholder: "Ex. VASE D’EXPANSION"
        };
    }

    if (kind === "marque") {
        return {
            title: row?.type ? `Ajouter une marque pour ${row.type}` : "Ajouter une marque",
            label: "Nouvelle marque",
            placeholder: "Ex. ATLANTIC"
        };
    }

    if (kind === "modele") {
        return {
            title: row?.marque ? `Ajouter un modèle pour ${row.marque}` : "Ajouter un modèle",
            label: "Nouveau modèle",
            placeholder: "Ex. NAEMA 2"
        };
    }

    if (kind === "type" && section === "pv") {
        return {
            title: "Ajouter un type de PV",
            label: "Nouveau type de PV",
            placeholder: "Ex. PV CONTROLE"
        };
    }

    if (kind === "type" && section === "schemas") {
        return {
            title: "Ajouter un type de schéma",
            label: "Nouveau type de schéma",
            placeholder: "Ex. SCHEMA IMPLANTATION"
        };
    }

    return {
        title: "Ajouter une valeur",
        label: "Nouvelle valeur",
        placeholder: "Saisir une valeur"
    };
}

function promptCreateEquipmentValue(kind, index) {
    const row = state.data.fiches[index];
    const config = getCreateValueModalConfig(kind, row, "fiches");

    pendingCreateValueContext = {
        kind,
        index,
        section: "fiches"
    };

    createValueTitle.textContent = config.title;
    createValueLabel.textContent = config.label;
    createValueInput.placeholder = config.placeholder;
    createValueInput.value = "";

    createValueModal.classList.remove("hidden");

    setTimeout(() => {
        createValueInput.focus();
        createValueInput.select();
    }, 0);
}

function promptCreateDocType(section, index) {
    const row = state.data[section][index];
    const config = getCreateValueModalConfig("type", row, section);

    pendingCreateValueContext = {
        kind: "type",
        index,
        section
    };

    createValueTitle.textContent = config.title;
    createValueLabel.textContent = config.label;
    createValueInput.placeholder = config.placeholder;
    createValueInput.value = "";

    createValueModal.classList.remove("hidden");

    setTimeout(() => {
        createValueInput.focus();
        createValueInput.select();
    }, 0);
}

function closeCreateValueModal() {
    createValueModal.classList.add("hidden");
    createValueInput.value = "";
    pendingCreateValueContext = null;
}

function submitCreateValueModal() {
   if (!pendingCreateValueContext) {
       showToast("Contexte introuvable.", "error");
       return;
   }
   
   const { kind, index, section, mode, settingKey } = pendingCreateValueContext;
   const entered = createValueInput.value.trim();

    if (!entered) {
        showToast("Merci de saisir une valeur.", "error");
        return;
    }

   if (mode === "settings") {
    const created = addSettingValue(settingKey, entered);

    if (!created) return;

    closeCreateValueModal();
    renderApp();
    return;
}

    if (section === "fiches") {
        const row = state.data.fiches[index];
        const createdValue = createNewEquipmentValue(kind, entered, row);

        if (!createdValue) {
            showToast("Impossible d’ajouter cette valeur.", "error");
            return;
        }

        closeCreateValueModal();
        setFicheField(index, kind, createdValue);
        showToast("Valeur ajoutée.", "success");
        return;
    }

    if (section === "pv" || section === "schemas") {
        const createdValue = createNewDocType(section, entered);

        if (!createdValue) {
            showToast("Impossible d’ajouter cette valeur.", "error");
            return;
        }

        closeCreateValueModal();
        setDocTypeField(section, index, createdValue);
        showToast("Valeur ajoutée.", "success");
        return;
    }

    showToast("Section inconnue.", "error");
}

/* ========================
   CUSTOM SELECTS
======================== */
const customSelectHandlers = {};
const customSelectSearchState = {};
let customSelectsBound = false;

function registerCustomSelectHandler(id, handler) {
    customSelectHandlers[id] = handler;
}

function handleCustomSelectOption(id, value) {
    const handler = customSelectHandlers[id];
    if (typeof handler === "function") {
        handler(value);
    }
    delete customSelectSearchState[id];
    closeAllCustomSelects();
}

function renderCustomSelect({
    id,
    label,
    value,
    placeholder,
    options,
    disabled = false,
    createAction = ""
}) {
    const displayValue = value || placeholder;
    const isPlaceholder = !value;
    const safeOptions = Array.isArray(options) ? options : [];
    const searchValue = customSelectSearchState[id] || "";

    const filteredOptions = safeOptions.filter(option =>
        option.toLowerCase().includes(searchValue.toLowerCase())
    );

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
                    !disabled
                        ? `
                        <div class="custom-select-menu">
                            <div class="custom-select-search-wrap">
                                <input
                                    type="text"
                                    class="custom-select-search"
                                    placeholder="Rechercher..."
                                    value="${escapeHtml(searchValue)}"
                                    oninput="updateCustomSelectSearch('${id}', this.value)"
                                    onclick="event.stopPropagation()"
                                />
                            </div>

                            <div class="custom-select-list">
                                ${
                                    filteredOptions.length
                                        ? filteredOptions.map(option => `
                                            <button
                                                type="button"
                                                class="custom-select-option ${value === option ? "is-active" : ""}"
                                                onclick="handleCustomSelectOption('${id}', '${escapeJs(option)}')"
                                            >
                                                ${escapeHtml(option)}
                                            </button>
                                        `).join("")
                                        : `<div class="custom-select-empty">Aucun résultat</div>`
                                }

                                ${
                                    createAction
                                        ? `
                                        <button
                                            type="button"
                                            class="custom-select-option custom-select-create"
                                            onclick="${createAction}"
                                        >
                                            + Ajouter
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

function updateCustomSelectSearch(id, value) {
    customSelectSearchState[id] = value;
    rerenderOpenCustomSelect(id);
}

function rerenderOpenCustomSelect(id) {
    const selectEl = document.querySelector(`.custom-select[data-select-id="${id}"]`);
    if (!selectEl) return;

    const wasOpen = selectEl.classList.contains("is-open");

    if (currentScreen === "library") {
        renderLibraryScreen();
    } else if (currentScreen === "drafts") {
        renderDraftsScreen();
    } else if (currentScreen === "closed") {
        renderClosedScreen();
    } else if (currentScreen === "accueil") {
        renderAccueilScreen();
    } else if (currentScreen === "settings") {
        renderSettingsScreen();
    } else {
        renderStep();
    }

    if (wasOpen) {
        const next = document.querySelector(`.custom-select[data-select-id="${id}"]`);
        if (next) {
            next.classList.add("is-open");
            const input = next.querySelector(".custom-select-search");
            if (input) {
                input.focus();
                input.setSelectionRange(input.value.length, input.value.length);
            }
        }
    }
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

    const willOpen = !target.classList.contains("is-open");
    target.classList.toggle("is-open");

    if (willOpen) {
        setTimeout(() => {
            const input = target.querySelector(".custom-select-search");
            if (input) input.focus();
        }, 0);
    }
}

function closeAllCustomSelects() {
    document.querySelectorAll(".custom-select").forEach(el => {
        el.classList.remove("is-open");
    });
}

function initCustomSelects() {
    if (customSelectsBound) return;

    document.addEventListener("click", (event) => {
        if (!event.target.closest(".custom-select")) {
            closeAllCustomSelects();
        }
    });

    customSelectsBound = true;
}

/* ========================
   CUSTOM DATE PICKER
======================== */
let openDatePickerId = null;
const datePickerViews = {};
let datePickerBound = false;

function renderCustomDateField({ label, field, value }) {
    const realValue = value || "";

    return `
        <div class="field">
            <label>${label}</label>
            <div class="custom-date" data-date-id="${field}">
                <button
                    type="button"
                    class="custom-date-button"
                    onclick="toggleDatePicker('${field}')"
                >
                    <span class="date-value">${formatDateDisplay(realValue)}</span>
                    <span class="material-symbols-outlined date-icon">calendar_today</span>
                </button>

                <div class="custom-date-panel" id="date-panel-${field}"></div>
            </div>
        </div>
    `;
}

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

function initDatePickerGlobalClose() {
    if (datePickerBound) return;

    document.addEventListener("click", (event) => {
        if (!event.target.closest(".custom-date")) {
            closeAllDatePickers();
        }
    });

    datePickerBound = true;
}

function renderDatePicker(field) {
    const wrapper = document.querySelector(`.custom-date[data-date-id="${field}"]`);
    const panel = document.getElementById(`date-panel-${field}`);
    if (!wrapper || !panel) return;

    wrapper.classList.add("is-open");

    const selectedValue = state.data.infos[field] || "";
    const today = new Date();

    const view = datePickerViews[field] || {
        year: today.getFullYear(),
        month: today.getMonth()
    };

    const year = view.year;
    const month = view.month;

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startWeekday = (firstDay.getDay() + 6) % 7;
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

let confirmAction = null;

function openConfirmModal(title, message, onConfirm) {
    confirmTitle.textContent = title;
    confirmMessage.textContent = message;
    confirmAction = onConfirm;
    confirmModal.classList.remove("hidden");
}

function closeConfirmModal() {
    confirmModal.classList.add("hidden");
    confirmAction = null;
}



/* ========================
   INFOS STATE HELPERS
======================== */
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

function updateVilleSelectUI() {
    const infos = state.data.infos;
    const cityOptions = referenceData.postalCodes[infos.code_postal] || [];
    const container = document.querySelector(".infos-ville-slot");
    if (!container) return;

    container.innerHTML = renderCustomSelect({
        id: "ville-select",
        label: "Ville",
        value: infos.ville,
        placeholder: "Sélectionner",
        options: cityOptions,
        disabled: cityOptions.length === 0
    });

    registerCustomSelectHandler("ville-select", setVille);
}

function handleInputChange(section, field, value, inputEl = null) {
    if (!state.data[section]) return;

    const shouldUppercase = !["notes", "date_reception", "date_doe"].includes(field);
    const finalValue = shouldUppercase ? value.toUpperCase() : value;

    state.data[section][field] = finalValue;

    if (inputEl && shouldUppercase) {
        inputEl.value = finalValue;
    }

   markAsDirty();
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


   markAsDirty();
    saveAutosave();
    renderChantierBanner();
    updateVilleSelectUI();
}

function showFailedFilesAlert(failedFiles) {
    const modal = document.getElementById("errorModal");
    const list = document.getElementById("errorList");

    if (!modal || !list) return;

    list.innerHTML = "";

    failedFiles.forEach(item => {
        const div = document.createElement("div");
        div.className = "error-modal-list-item";

        const suffix = item.reason ? ` (${item.reason})` : "";
        div.textContent = `${item.label} : ${item.fileName}${suffix}`;

        list.appendChild(div);
    });

    modal.classList.remove("hidden");
}

function closeErrorModal() {
    const modal = document.getElementById("errorModal");
    if (!modal) return;
    modal.classList.add("hidden");
}

/* ========================
   FICHES HELPERS
======================== */
function getEquipmentTypes() {
    return Object.keys(referenceData.equipment);
}

function getBrandsForType(type) {
    if (!type || !referenceData.equipment[type]) return [];
    return Object.keys(referenceData.equipment[type].brands || {});
}

function getModelsForTypeAndBrand(type, brand) {
    if (!type || !brand) return [];
    return referenceData.equipment[type]?.brands?.[brand] || [];
}

function clearFicheAutoFile(row) {
    if (!row) return;
    delete row.file;
    delete row.fileName;
    delete row.fileType;
    delete row.autoMatched;
}

function tryAutoAttachTechnicalSheet(index) {
    const row = state.data.fiches[index];
    if (!row) return;

    const match = referenceData.technicalSheetsLibrary.find(item =>
        item.type === row.type &&
        item.marque === row.marque &&
        item.modele === row.modele
    );

    if (match) {
        row.fileName = match.fileName || "";
        row.fileType = match.fileType || "";
        row.file = match.file || null;
        row.fileSize = match.fileSize || 0;
        row.fileLastModified = match.fileLastModified || null;
        row.fileSource = "library";
        row.autoMatched = true;

        showToast("Fiche technique trouvée dans la base.", "success");
    } else {
        delete row.autoMatched;
        delete row.fileSource;
    }
}

function upsertTechnicalSheetLibraryEntry(row) {
    if (!row?.type || !row?.marque || !row?.modele) return;

    const existing = referenceData.technicalSheetsLibrary.find(item =>
        item.type === row.type &&
        item.marque === row.marque &&
        item.modele === row.modele
    );

    if (existing) {
        if (row.fileName) existing.fileName = row.fileName;
        if (row.fileType) existing.fileType = row.fileType;
        if (row.file) existing.file = row.file;
        if (row.fileSize) existing.fileSize = row.fileSize;
        if (row.fileLastModified) existing.fileLastModified = row.fileLastModified;
    } else {
        referenceData.technicalSheetsLibrary.push({
            type: row.type,
            marque: row.marque,
            modele: row.modele,
            fileName: row.fileName || "",
            fileType: row.fileType || "",
            file: row.file || null,
            fileSize: row.fileSize || 0,
            fileLastModified: row.fileLastModified || null
        });
    }

    saveReferenceData();
}

function createNewEquipmentValue(kind, rawValue, currentRow) {
    const value = String(rawValue || "").trim().toUpperCase();
    if (!value) return null;

    if (kind === "type") {
        if (!referenceData.equipment[value]) {
            referenceData.equipment[value] = { brands: {} };
            saveReferenceData();
        }
        return value;
    }

    if (kind === "marque") {
        const type = currentRow?.type;
        if (!type) return null;

        if (!referenceData.equipment[type]) {
            referenceData.equipment[type] = { brands: {} };
        }

        if (!referenceData.equipment[type].brands[value]) {
            referenceData.equipment[type].brands[value] = [];
            saveReferenceData();
        }

        return value;
    }

    if (kind === "modele") {
        const type = currentRow?.type;
        const marque = currentRow?.marque;
        if (!type || !marque) return null;

        if (!referenceData.equipment[type]) {
            referenceData.equipment[type] = { brands: {} };
        }

        if (!referenceData.equipment[type].brands[marque]) {
            referenceData.equipment[type].brands[marque] = [];
        }

        if (!referenceData.equipment[type].brands[marque].includes(value)) {
            referenceData.equipment[type].brands[marque].push(value);
            saveReferenceData();
        }

        return value;
    }

    return null;
}

function setFicheField(index, field, value) {
    const row = state.data.fiches[index];
    if (!row) return;

    const upperValue = value.toUpperCase();

    if (field === "type") {
        row.type = upperValue;
        row.marque = "";
        row.modele = "";
        clearFicheAutoFile(row);
    }

    if (field === "marque") {
        row.marque = upperValue;
        row.modele = "";
        clearFicheAutoFile(row);
    }

    if (field === "modele") {
        row.modele = upperValue;
        tryAutoAttachTechnicalSheet(index);
    }

   markAsDirty();
    saveAutosave();
    renderStep();
}

function openTechnicalLibraryStub() {
    showToast("La fiche existe en base, mais aucun fichier démo n’est encore chargé.", "info");
}

/* ========================
   PV / SCHEMAS HELPERS
======================== */
function getDocTypeOptions(section) {
    if (section === "pv") return referenceData.pvTypes || [];
    if (section === "schemas") return referenceData.schemaTypes || [];
    return [];
}

function createNewDocType(section, rawValue) {
    const value = String(rawValue || "").trim().toUpperCase();
    if (!value) return null;

    if (!Array.isArray(referenceData.pvTypes)) {
        referenceData.pvTypes = [...defaultReferenceData.pvTypes];
    }

    if (!Array.isArray(referenceData.schemaTypes)) {
        referenceData.schemaTypes = [...defaultReferenceData.schemaTypes];
    }

    if (section === "pv") {
        if (!referenceData.pvTypes.includes(value)) {
            referenceData.pvTypes.push(value);
            saveReferenceData();
        }
        return value;
    }

    if (section === "schemas") {
        if (!referenceData.schemaTypes.includes(value)) {
            referenceData.schemaTypes.push(value);
            saveReferenceData();
        }
        return value;
    }

    return null;
}

function setDocTypeField(section, index, value) {
    const row = state.data[section][index];
    if (!row) return;

    row.type = String(value || "").toUpperCase();

   markAsDirty();
   saveAutosave();
   renderStep();
}

function promptAddSettingValue(settingKey) {
    const titles = {
        workTypes: "Ajouter une nature de travaux",
        pvTypes: "Ajouter un type de PV",
        schemaTypes: "Ajouter un type de schéma"
    };

    const labels = {
        workTypes: "Nouvelle nature",
        pvTypes: "Nouveau type de PV",
        schemaTypes: "Nouveau type de schéma"
    };

    pendingCreateValueContext = {
        mode: "settings",
        settingKey
    };

    createValueTitle.textContent = titles[settingKey] || "Ajouter une valeur";
    createValueLabel.textContent = labels[settingKey] || "Nouvelle valeur";
    createValueInput.placeholder = "Saisir une valeur";
    createValueInput.value = "";

    createValueModal.classList.remove("hidden");

    setTimeout(() => {
        createValueInput.focus();
        createValueInput.select();
    }, 0);
}

function addSettingValue(settingKey, rawValue) {
    const value = String(rawValue || "").trim().toUpperCase();
    if (!value) return false;

    if (!Array.isArray(referenceData[settingKey])) {
        referenceData[settingKey] = [];
    }

    if (referenceData[settingKey].includes(value)) {
        showToast("Cette valeur existe déjà.", "info");
        return false;
    }

    referenceData[settingKey].push(value);
    saveReferenceData();
    showToast("Valeur ajoutée.", "success");
    return true;
}

function removeSettingValue(settingKey, index) {
    if (!Array.isArray(referenceData[settingKey])) return;

    referenceData[settingKey].splice(index, 1);
    saveReferenceData();
    renderApp();
    showToast("Valeur supprimée.", "info");
}

function promptAddEquipmentType() {
    const value = prompt("Nouveau type équipement ?");
    if (!value) return;

    const key = String(value).trim().toUpperCase();
    if (!key) return;

    if (referenceData.equipment[key]) {
        showToast("Ce type existe déjà.", "info");
        return;
    }

    referenceData.equipment[key] = { brands: {} };
    saveReferenceData();
    renderApp();
    showToast("Type équipement ajouté.", "success");
}

function removeEquipmentType(typeKey) {
    if (!referenceData.equipment[typeKey]) return;

    delete referenceData.equipment[typeKey];
    saveReferenceData();
    renderApp();
    showToast("Type équipement supprimé.", "info");
}

function promptAddBrand(typeKey) {
    const value = prompt(`Nouvelle marque pour ${typeKey} ?`);
    if (!value) return;

    const brand = String(value).trim().toUpperCase();
    if (!brand) return;

    if (!referenceData.equipment[typeKey]) {
        referenceData.equipment[typeKey] = { brands: {} };
    }

    if (referenceData.equipment[typeKey].brands[brand]) {
        showToast("Cette marque existe déjà.", "info");
        return;
    }

    referenceData.equipment[typeKey].brands[brand] = [];
    saveReferenceData();
    renderApp();
    showToast("Marque ajoutée.", "success");
}

function removeBrand(typeKey, brandKey) {
    if (!referenceData.equipment[typeKey]?.brands?.[brandKey]) return;

    delete referenceData.equipment[typeKey].brands[brandKey];
    saveReferenceData();
    renderApp();
    showToast("Marque supprimée.", "info");
}

function promptAddModel(typeKey, brandKey) {
    const value = prompt(`Nouveau modèle pour ${brandKey} ?`);
    if (!value) return;

    const model = String(value).trim().toUpperCase();
    if (!model) return;

    const models = referenceData.equipment[typeKey]?.brands?.[brandKey];
    if (!models) return;

    if (models.includes(model)) {
        showToast("Ce modèle existe déjà.", "info");
        return;
    }

    models.push(model);
    saveReferenceData();
    renderApp();
    showToast("Modèle ajouté.", "success");
}

function removeModel(typeKey, brandKey, modelIndex) {
    const models = referenceData.equipment[typeKey]?.brands?.[brandKey];
    if (!models) return;

    models.splice(modelIndex, 1);
    saveReferenceData();
    renderApp();
    showToast("Modèle supprimé.", "info");
}

/* ========================
   FILES
======================== */
function handleFileUpload(section, index, input) {
    const file = input?.files?.[0];
    if (!file) return;

    const item = state.data?.[section]?.[index];
    if (!item) return;

    const validation = validateFile(file);

    if (!validation.valid) {
        item.invalid = true;
        item.error = validation.reason;
        item.file = null;
        item.fileName = file.name;
        item.fileType = file.type || "";
        item.fileSize = file.size || 0;
        item.fileLastModified = file.lastModified || null;
        item.fileSource = "upload";

        markAsDirty();
        saveAutosave();
        renderStep();
        showToast(validation.reason, "error");
        return;
    }

    const reader = new FileReader();

    reader.onload = function (e) {
        item.file = e.target.result;
        item.fileName = file.name;
        item.fileType = file.type || "application/octet-stream";
        item.fileSize = file.size || 0;
        item.fileLastModified = file.lastModified || null;
        item.fileSource = "upload";
        item.invalid = false;
        item.error = null;
        delete item.autoMatched;

        if (section === "fiches") {
            upsertTechnicalSheetLibraryEntry(item);
        }

      markAsDirty();
      saveAutosave();
      renderStep();
      showToast("Fichier ajouté.", "success");
    };

    reader.onerror = function () {
        item.invalid = true;
        item.error = "Impossible de lire le fichier";
        item.file = null;

      markAsDirty();
      saveAutosave();
      renderStep();
      showToast("Erreur lecture fichier", "error");
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
            delete item.fileSize;
            delete item.fileLastModified;
            delete item.fileSource;
            delete item.autoMatched;

            markAsDirty();
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

        if (!input || dropzone.dataset.bound === "true") return;
        dropzone.dataset.bound = "true";

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
   RENDER — CHANTIER
======================== */
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
                <button type="button" class="banner-btn" onclick="handleSaveDraft()">Enregistrer brouillon</button>
                <button type="button" class="footer-btn secondary-action" onclick="openDraftsModal()">Ouvrir brouillon</button>
                <button type="button" class="footer-btn secondary-action" onclick="handleClearDoe()">Effacer</button>
                <button type="button" class="banner-btn" onclick="handleCloseDoe()">Clôturer</button>
            </div>
        </div>
    `;
}

/* ========================
   RENDER — INFOS
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
                        <div class="field${getFieldErrorClass(isInfoMissing("adresse"))}">
                            <label>Adresse</label>
                            <input
                                value="${escapeHtml(infos.adresse || "")}"
                                oninput="handleInputChange('infos','adresse', this.value, this); renderChantierBanner();"
                            />
                        </div>
                    </div>

                    <div class="infos-nature${getFieldErrorClass(isInfoMissing("nature_travaux"))}">
                        ${renderCustomSelect({
                            id: "nature-travaux-select",
                            label: "Nature des travaux",
                            value: infos.nature_travaux,
                            placeholder: "Rénovation chaufferie",
                            options: referenceData.workTypes
                        })}
                    </div>

                    <div class="infos-left-row">
                        <div class="field${getFieldErrorClass(isInfoMissing("code_postal"))}">
                            <label>CP</label>
                            <input
                                value="${escapeHtml(infos.code_postal || "")}"
                                oninput="handlePostalCodeChange(this.value)"
                            />
                        </div>

                        <div class="infos-ville-slot${getFieldErrorClass(isInfoMissing("ville"))}">
                            ${renderCustomSelect({
                                id: "ville-select",
                                label: "Ville",
                                value: infos.ville,
                                placeholder: "Sélectionner",
                                options: cityOptions,
                                disabled: cityOptions.length === 0
                            })}
                        </div>
                    </div>

                    <div class="infos-right-row">
                        <div class="${getFieldErrorClass(isInfoMissing("date_reception"))}">
                            ${renderCustomDateField({
                                label: "Date de réception",
                                field: "date_reception",
                                value: infos.date_reception
                            })}
                        </div>

                        <div class="${getFieldErrorClass(isInfoMissing("date_doe"))}">
                            ${renderCustomDateField({
                                label: "Date DOE",
                                field: "date_doe",
                                value: infos.date_doe || getTodayDate()
                            })}
                        </div>
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
   RENDER — FICHES
======================== */
function renderFichesStep() {
    const list = state.data.fiches;

    content.innerHTML = `
        <div class="single-panel-layout">
            <div class="panel">
                <div class="section-toolbar">
                    <div>
                        <h3>Fiches techniques</h3>
                        <p class="panel-muted">
                            Choisissez un type, une marque et un modèle. Si la fiche existe déjà dans la base, elle sera récupérée automatiquement.
                        </p>
                    </div>
                    <button class="add-row-btn" onclick="addRow('fiches')">+ Ajouter</button>
                </div>

                ${
                    list.length === 0
                        ? `
                        <div class="empty-state">
                            <p>Aucune fiche technique ajoutée pour le moment.</p>
                        </div>
                        `
                        : `
                        <div class="dynamic-list">
                            ${list.map((item, index) => renderFicheRow(item, index)).join("")}
                        </div>
                        `
                }
            </div>
        </div>
    `;
}

function renderFicheRow(item, index) {
    const typeOptions = getEquipmentTypes();
    const brandOptions = getBrandsForType(item.type);
    const modelOptions = getModelsForTypeAndBrand(item.type, item.marque);

    return `
        <div class="dynamic-card${getCardErrorClass(isRowCardMissing("fiches", index))}">
            <div class="dynamic-card-header">
             <span class="dynamic-card-title">Fiche technique ${index + 1}</span>
         
             <div class="row-order-actions">
                 <button class="icon-btn-inline preview" type="button" aria-label="Monter" onclick="moveRow('fiches', ${index}, -1)">
                     <span class="material-symbols-outlined icon-default">keyboard_arrow_up</span>
                 </button>
         
                 <button class="icon-btn-inline preview" type="button" aria-label="Descendre" onclick="moveRow('fiches', ${index}, 1)">
                     <span class="material-symbols-outlined icon-default">keyboard_arrow_down</span>
                 </button>
         
                 <button class="remove-row-btn" onclick="removeRow('fiches', ${index})">Supprimer</button>
             </div>
         </div>

            <div class="fiche-grid">
                <div class="${getFieldErrorClass(isRowFieldMissing("fiches", index, "type"))}">
                    ${renderCustomSelect({
                        id: `fiche-type-${index}`,
                        label: "Type",
                        value: item.type || "",
                        placeholder: "Sélectionner",
                        options: typeOptions,
                        createAction: `promptCreateEquipmentValue('type', ${index})`
                    })}
                </div>

                <div class="${getFieldErrorClass(isRowFieldMissing("fiches", index, "marque"))}">
                    ${renderCustomSelect({
                        id: `fiche-marque-${index}`,
                        label: "Marque",
                        value: item.marque || "",
                        placeholder: "Sélectionner",
                        options: brandOptions,
                        disabled: !item.type,
                        createAction: item.type ? `promptCreateEquipmentValue('marque', ${index})` : ""
                    })}
                </div>

                <div class="${getFieldErrorClass(isRowFieldMissing("fiches", index, "modele"))}">
                    ${renderCustomSelect({
                        id: `fiche-modele-${index}`,
                        label: "Modèle",
                        value: item.modele || "",
                        placeholder: "Sélectionner",
                        options: modelOptions,
                        disabled: !item.marque,
                        createAction: item.marque ? `promptCreateEquipmentValue('modele', ${index})` : ""
                    })}
                </div>

                <div class="field fiche-file-block${getFieldErrorClass(isRowFieldMissing("fiches", index, "file"))}">
                    <label>Fichier</label>
                    <div class="upload-inline">
                        <input
                            id="file-input-fiches-${index}"
                            class="hidden-file-input"
                            type="file"
                            accept=".pdf,image/*"
                            onchange="handleFileUpload('fiches', ${index}, this)"
                        />

                        <div
                            class="dropzone-inline"
                            data-input-id="file-input-fiches-${index}"
                            data-section="fiches"
                            data-index="${index}"
                        >
                            ${item.file ? "Remplacer" : "Déposer ou cliquer"}
                        </div>

                        <div class="file-name-inline ${(item.fileName || item.autoMatched) ? "has-file" : ""}">
                            <div class="file-name-stack">
                                <span class="file-primary-name">
                                    ${
                                        item.fileName
                                            ? escapeHtml(item.fileName)
                                            : item.autoMatched
                                                ? "FICHE TROUVÉE EN BASE"
                                                : "Aucun fichier"
                                    }
                                </span>
                                ${
                                    item.fileName || item.autoMatched
                                        ? `<span class="file-secondary-meta">${escapeHtml(getFileMetaLabel(item))}</span>`
                                        : ""
                                }
                            </div>
                        </div>

                        ${
                            item.file
                                ? `
                                    <button
                                        class="icon-btn-inline preview"
                                        type="button"
                                        aria-label="Voir le fichier"
                                        onclick="openFile('fiches', ${index}, this)"
                                    >
                                        <span class="material-symbols-outlined icon-default">visibility</span>
                                        <span class="material-symbols-outlined icon-spinner">progress_activity</span>
                                    </button>

                                    <button
                                        class="icon-btn-inline preview"
                                        type="button"
                                        aria-label="Télécharger le fichier"
                                        onclick="downloadFile('fiches', ${index})"
                                    >
                                        <span class="material-symbols-outlined icon-default">download</span>
                                    </button>

                                    <button
                                        class="icon-btn-inline preview"
                                        type="button"
                                        aria-label="Remplacer le fichier"
                                        onclick="triggerReplaceFile('fiches', ${index})"
                                    >
                                        <span class="material-symbols-outlined icon-default">upload</span>
                                    </button>

                                    <button
                                        class="icon-btn-inline delete"
                                        type="button"
                                        aria-label="Supprimer le fichier"
                                        onclick="deleteFile('fiches', ${index})"
                                    >
                                        <span class="material-symbols-outlined icon-default">delete</span>
                                    </button>
                                  `
                                : ""
                        }
                    </div>
                </div>
            </div>
        </div>
    `;
}

/* ========================
   RENDER — DOC STEP
======================== */
function renderDocStep(section, titleText) {
    const list = state.data[section];
    const options = getDocTypeOptions(section);

    content.innerHTML = `
        <div class="single-panel-layout">
            <div class="panel">
                <div class="section-toolbar">
                    <div>
                        <h3>${titleText}</h3>
                        <p class="panel-muted">Choisissez un type, joignez un fichier, ou ajoutez un nouveau type directement depuis le menu.</p>
                    </div>
                    <button class="add-row-btn" onclick="addRow('${section}')">+ Ajouter</button>
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
                            ${list.map((item, index) => renderDocRow(section, item, index, options)).join("")}
                        </div>
                        `
                }
            </div>
        </div>
    `;
}

function renderPvStep() {
    renderDocStep("pv", "Procès-verbaux");
}

function renderSchemasStep() {
    renderDocStep("schemas", "Schémas");
}

function renderDocRow(section, item, index, typeOptions) {
    return `
        <div class="dynamic-card${getCardErrorClass(isRowCardMissing(section, index))}">
         <div class="dynamic-card-header">
             <span class="dynamic-card-title">${getSectionTitle(section)} ${index + 1}</span>
         
             <div class="row-order-actions">
                 <button class="icon-btn-inline preview" type="button" aria-label="Monter" onclick="moveRow('${section}', ${index}, -1)">
                     <span class="material-symbols-outlined icon-default">keyboard_arrow_up</span>
                 </button>
         
                 <button class="icon-btn-inline preview" type="button" aria-label="Descendre" onclick="moveRow('${section}', ${index}, 1)">
                     <span class="material-symbols-outlined icon-default">keyboard_arrow_down</span>
                 </button>
         
                 <button class="remove-row-btn" onclick="removeRow('${section}', ${index})">Supprimer</button>
             </div>
         </div>

            <div class="doc-grid">
                <div class="${getFieldErrorClass(isRowFieldMissing(section, index, "type"))}">
                    ${renderCustomSelect({
                        id: `${section}-type-${index}`,
                        label: "Type",
                        value: item.type || "",
                        placeholder: "Sélectionner",
                        options: typeOptions,
                        createAction: `promptCreateDocType('${section}', ${index})`
                    })}
                </div>

                <div class="field doc-file-block${getFieldErrorClass(isRowFieldMissing(section, index, "file"))}">
                    <label>Fichier</label>
                    <div class="upload-inline">
                        <input
                            id="file-input-${section}-${index}"
                            class="hidden-file-input"
                            type="file"
                            accept=".pdf,image/*"
                            onchange="handleFileUpload('${section}', ${index}, this)"
                        />

                        <div
                            class="dropzone-inline"
                            data-input-id="file-input-${section}-${index}"
                            data-section="${section}"
                            data-index="${index}"
                        >
                            ${item.file ? "Remplacer" : "Déposer ou cliquer"}
                        </div>

                        <div class="file-name-inline ${item.fileName ? "has-file" : ""}">
                            <div class="file-name-stack">
                                <span class="file-primary-name">
                                    ${item.fileName ? escapeHtml(item.fileName) : "Aucun fichier"}
                                </span>
                                ${
                                    item.fileName
                                        ? `<span class="file-secondary-meta">${escapeHtml(getFileMetaLabel(item))}</span>`
                                        : ""
                                }
                            </div>
                        </div>

                        ${
                            item.file
                                ? `
                                    <button
                                        class="icon-btn-inline preview"
                                        type="button"
                                        aria-label="Voir le fichier"
                                        onclick="openFile('${section}', ${index}, this)"
                                    >
                                        <span class="material-symbols-outlined icon-default">visibility</span>
                                        <span class="material-symbols-outlined icon-spinner">progress_activity</span>
                                    </button>

                                    <button
                                        class="icon-btn-inline preview"
                                        type="button"
                                        aria-label="Télécharger le fichier"
                                        onclick="downloadFile('${section}', ${index})"
                                    >
                                        <span class="material-symbols-outlined icon-default">download</span>
                                    </button>

                                    <button
                                        class="icon-btn-inline preview"
                                        type="button"
                                        aria-label="Remplacer le fichier"
                                        onclick="triggerReplaceFile('${section}', ${index})"
                                    >
                                        <span class="material-symbols-outlined icon-default">upload</span>
                                    </button>

                                    <button
                                        class="icon-btn-inline delete"
                                        type="button"
                                        aria-label="Supprimer le fichier"
                                        onclick="deleteFile('${section}', ${index})"
                                    >
                                        <span class="material-symbols-outlined icon-default">delete</span>
                                    </button>
                                  `
                                : ""
                        }
                    </div>
                </div>
            </div>
        </div>
    `;
}

/* ========================
   STATE MUTATIONS
======================== */
function addRow(key) {
    state.data[key].push({});
   markAsDirty();
   saveAutosave();
   renderStep();
}

function removeRow(key, index) {
    state.data[key].splice(index, 1);
   markAsDirty();
   saveAutosave();
   renderStep();
}

function updateRow(key, index, field, value, inputEl = null) {
    const finalValue = value.toUpperCase();
    state.data[key][index][field] = finalValue;

    if (inputEl) {
        inputEl.value = finalValue;
    }

   markAsDirty();
   saveAutosave();
}

/* ========================
   EXPORT
======================== */
function renderSummary() {
    const { infos, fiches, pv, schemas } = state.data;

    const fullAddress = [infos.adresse, infos.code_postal, infos.ville].filter(Boolean).join(" ");
    const totalEstimatedBytes = getEstimatedZipSize();
    const totalEstimatedLabel = formatFileSize(totalEstimatedBytes || 0) || "0 o";

    content.innerHTML = `
        <div class="single-panel-layout">
            <div class="panel">
                <div class="section-toolbar">
                    <div>
                        <h3>Export</h3>
                    </div>
                </div>

                <div class="summary-list export-recap-list">
                    <div class="summary-item">
                        <span>Adresse</span>
                        <strong>${fullAddress ? escapeHtml(fullAddress) : "—"}</strong>
                    </div>

                    <div class="summary-item">
                        <span>Nature des travaux</span>
                        <strong>${infos.nature_travaux ? escapeHtml(infos.nature_travaux) : "—"}</strong>
                    </div>

                    ${renderExportDocSection("Fiches techniques", fiches, "fiches")}
                    ${renderExportDocSection("Procès-verbaux", pv, "pv")}
                    ${renderExportDocSection("Schémas", schemas, "schemas")}

                    <div class="export-final-row">
                        <div class="export-final-top">
                            <div class="export-final-text">
                                <span class="export-final-label">Exporter</span>
                                <strong class="export-final-size">ZIP estimé : ${escapeHtml(totalEstimatedLabel)}</strong>
                            </div>

                            <button
                                type="button"
                                id="export-zip-btn"
                                class="footer-btn"
                                onclick="startFakeExportPrep()"
                                ${exportUiState.isExporting ? "disabled" : ""}
                            >
                                <span id="export-zip-btn-label">${exportUiState.isExporting ? "Export en cours..." : "Télécharger le ZIP"}</span>
                            </button>
                        </div>

                        <div class="export-progress-wrap">
                            <div class="export-progress-bar">
                                <div id="export-progress-fill" class="export-progress-fill"></div>
                            </div>
                            <div id="export-progress-text" class="export-progress-text">Prêt à exporter</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;

    syncExportUiState();
}

/* ========================
   SELECT HANDLER REGISTRY
======================== */
function registerStepSelectHandlers() {
    Object.keys(customSelectHandlers).forEach(key => delete customSelectHandlers[key]);

    registerCustomSelectHandler("nature-travaux-select", setNatureTravaux);
    registerCustomSelectHandler("ville-select", setVille);

    state.data.fiches.forEach((item, index) => {
        registerCustomSelectHandler(`fiche-type-${index}`, (value) => setFicheField(index, "type", value));
        registerCustomSelectHandler(`fiche-marque-${index}`, (value) => setFicheField(index, "marque", value));
        registerCustomSelectHandler(`fiche-modele-${index}`, (value) => setFicheField(index, "modele", value));
    });

    state.data.pv.forEach((item, index) => {
        registerCustomSelectHandler(`pv-type-${index}`, (value) => setDocTypeField("pv", index, value));
    });

    state.data.schemas.forEach((item, index) => {
        registerCustomSelectHandler(`schemas-type-${index}`, (value) => setDocTypeField("schemas", index, value));
    });
}

/* ========================
   STEP SWITCHING
======================== */
steps.forEach((step, index) => {
    step.addEventListener("click", () => {
        if (!state.currentUser) {
            renderLoginScreen();
            return;
        }
        goToStep(index);
    });
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
    initDatePickerGlobalClose();
    registerStepSelectHandlers();
}

/* ========================
   NAV BUTTONS
======================== */
nextStepBtn.onclick = () => {
    if (!state.currentUser) {
        renderLoginScreen();
        return;
    }

    if (state.currentStep < stepsConfig.length - 1) {
        goToStep(state.currentStep + 1);
    }
};

prevStepBtn.onclick = () => {
    if (!state.currentUser) {
        renderLoginScreen();
        return;
    }

    if (state.currentStep > 0) {
        goToStep(state.currentStep - 1);
    }
};

if (closeDraftsBtn) closeDraftsBtn.onclick = closeDraftsModal;

if (draftsModal) {
    draftsModal.addEventListener("click", (event) => {
        if (event.target === draftsModal) closeDraftsModal();
    });
}

if (createValueCancelBtn) {
    createValueCancelBtn.onclick = closeCreateValueModal;
}

if (closeCreateValueBtn) {
    closeCreateValueBtn.onclick = closeCreateValueModal;
}

if (createValueSaveBtn) {
    createValueSaveBtn.onclick = submitCreateValueModal;
}

if (createValueModal) {
    createValueModal.addEventListener("click", (event) => {
        if (event.target === createValueModal) {
            closeCreateValueModal();
        }
    });
}

/* ========================
   INIT
======================== */
console.log("Avant initApp()");
wireDraftOverwriteModal();
wireLeaveConfirmModal();
wireSidebarNavigation();
initApp();

confirmCancelBtn?.addEventListener("click", closeConfirmModal);
closeConfirmBtn?.addEventListener("click", closeConfirmModal);
confirmOkBtn?.addEventListener("click", () => {
    if (typeof confirmAction === "function") {
        confirmAction();
    }
    closeConfirmModal();
});

async function initApp() {
    console.log("initApp lancé");

    try {
        const { data, error } = await supabaseClient.auth.getSession();

        if (error) {
            console.error("Erreur session Supabase :", error);
            renderLoginScreen();
            return;
        }

        if (!data.session) {
            console.log("Aucune session -> login");
            renderLoginScreen();
            return;
        }

        console.log("Session trouvée -> app");
        await loadCurrentProfile();
        currentScreen = "accueil";
        renderApp();
    } catch (error) {
        console.error("Erreur initApp :", error);
        renderLoginScreen();
    }
}

supabaseClient.auth.onAuthStateChange(async (event, session) => {
    if (session) {
        await loadCurrentProfile();
        currentScreen = "accueil";
        renderApp();
    } else {
        state.currentUser = null;
        renderLoginScreen();
    }
});

/* ========================
   WINDOW EXPORTS
======================== */
window.renderChantierBanner = renderChantierBanner;
window.handleInputChange = handleInputChange;
window.handlePostalCodeChange = handlePostalCodeChange;

window.toggleCustomSelect = toggleCustomSelect;
window.handleCustomSelectOption = handleCustomSelectOption;
window.updateCustomSelectSearch = updateCustomSelectSearch;
window.setNatureTravaux = setNatureTravaux;
window.setVille = setVille;

window.toggleDatePicker = toggleDatePicker;
window.changeDateView = changeDateView;
window.selectDateValue = selectDateValue;
window.clearDateValue = clearDateValue;

window.addRow = addRow;
window.removeRow = removeRow;
window.updateRow = updateRow;
window.moveRow = moveRow;

window.setFicheField = setFicheField;
window.setDocTypeField = setDocTypeField;
window.openTechnicalLibraryStub = openTechnicalLibraryStub;
window.promptCreateEquipmentValue = promptCreateEquipmentValue;
window.promptCreateDocType = promptCreateDocType;
window.closeCreateValueModal = closeCreateValueModal;
window.submitCreateValueModal = submitCreateValueModal;

window.saveDraft = saveDraft;
window.handleSaveDraft = handleSaveDraft;
window.clearAutosave = clearAutosave;
window.loadDraft = loadDraft;
window.deleteDraft = deleteDraft;
window.closeDraftOverwriteModal = closeDraftOverwriteModal;
window.closeLeaveConfirmModal = closeLeaveConfirmModal;
window.closeErrorModal = closeErrorModal;

window.openFile = openFile;
window.handleFileUpload = handleFileUpload;
window.deleteFile = deleteFile;

window.getTodayDate = getTodayDate;

window.downloadFile = downloadFile;
window.triggerReplaceFile = triggerReplaceFile;

window.toggleExportDocList = toggleExportDocList;
window.startFakeExportPrep = startFakeExportPrep;

window.goToBuilder = goToBuilder;
window.goToAccueil = goToAccueil;
window.goToDraftsScreen = goToDraftsScreen;
window.goToClosedScreen = goToClosedScreen;
window.goToLibraryScreen = goToLibraryScreen;
window.handleNewDoeFromAccueil = handleNewDoeFromAccueil;
window.showSavedPlaceholder = showSavedPlaceholder;
window.duplicateDraft = duplicateDraft;
window.setSavedSearchValue = setSavedSearchValue;

window.goToSettingsScreen = goToSettingsScreen;
window.promptAddSettingValue = promptAddSettingValue;
window.removeSettingValue = removeSettingValue;

window.filterDraftsTable = filterDraftsTable;
window.filterLibraryTable = filterLibraryTable;
window.filterClosedTable = filterClosedTable;
           
window.downloadLibraryItem = downloadLibraryItem;
window.sortLibraryTable = sortLibraryTable;
window.replaceLibraryItem = replaceLibraryItem;
window.deleteLibraryItem = deleteLibraryItem;

window.promptAddEquipmentType = promptAddEquipmentType;
window.removeEquipmentType = removeEquipmentType;
window.promptAddBrand = promptAddBrand;
window.removeBrand = removeBrand;
window.promptAddModel = promptAddModel;
window.removeModel = removeModel;

window.previewClosedDoe = previewClosedDoe;
window.downloadClosedDoe = downloadClosedDoe;
window.deleteClosedDoe = deleteClosedDoe;

window.setLibraryFilter = setLibraryFilter;
window.archiveDraft = archiveDraft;
window.archiveClosedDoe = archiveClosedDoe;
window.restoreArchivedItem = restoreArchivedItem;
window.deleteArchivedItem = deleteArchivedItem;
window.reopenClosedDoe = reopenClosedDoe;
window.clearLibraryFilter = clearLibraryFilter;
window.goToArchivesScreen = goToArchivesScreen;

window.handleLogin = handleLogin;
window.handleLogout = handleLogout;
