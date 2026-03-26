console.log("DOE v2 dynamic system 🚀");

/* ========================
   GLOBAL STATE
======================== */
let state = {
    currentStep: 0,
    data: {
        infos: {
            adresse: "",
            ville: "",
            cp: "",
            description: ""
        },
        fiches: [],
        pv: [],
        schemas: []
    }
};

/* ========================
   STEP CONFIG
======================== */
const stepsConfig = [
    {
        title: "Infos",
        render: renderInfos
    },
    {
        title: "Fiches techniques",
        render: () => renderDynamicSection("fiches", ["type", "marque", "modele"])
    },
    {
        title: "Procès-verbaux",
        render: () => renderDynamicSection("pv", ["type", "fichier"])
    },
    {
        title: "Schémas",
        render: () => renderDynamicSection("schemas", ["type", "fichier"])
    },
    {
        title: "Export",
        render: renderSummary
    }
];

/* ========================
   DOM REFERENCES
======================== */
const steps = document.querySelectorAll(".step");
const content = document.getElementById("step-content");
const nextStepBtn = document.getElementById("next-step");
const prevStepBtn = document.getElementById("prev-step");

/* ========================
   STEP SWITCHING
======================== */
steps.forEach((step, index) => {
    step.addEventListener("click", () => goToStep(index));
});

function goToStep(index) {
    state.currentStep = index;

    steps.forEach(step => step.classList.remove("active"));
    if (steps[index]) {
        steps[index].classList.add("active");
    }

    renderStep();
}

function renderStep() {
    const step = stepsConfig[state.currentStep];
    content.innerHTML = "";
    step.render();

    prevStepBtn.style.visibility = state.currentStep === 0 ? "hidden" : "visible";
    nextStepBtn.style.visibility = state.currentStep === stepsConfig.length - 1 ? "hidden" : "visible";
}

/* ========================
   ADDRESS BAR
======================== */
function getCurrentAddressLine() {
    const { adresse, cp, ville } = state.data.infos;
    const parts = [adresse, cp, ville].filter(Boolean);
    return parts.join(", ");
}

function renderAddressBanner() {
    if (state.currentStep === 0) return "";

    const addressLine = getCurrentAddressLine();

    return `
        <div class="current-address-banner">
            <span class="current-address-label">Adresse actuelle</span>
            <strong>${addressLine ? escapeHtml(addressLine) : "Adresse non renseignée"}</strong>
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
                        <p class="panel-muted">Renseignez les informations de base du DOE.</p>
                    </div>
                </div>

                <div class="field-grid">
                    <div class="field">
                        <label>Adresse</label>
                        <input
                            value="${escapeHtml(infos.adresse || "")}"
                            placeholder="Ex. 12 rue des Lilas"
                            onchange="updateInfo('adresse', this.value)"
                        />
                    </div>

                    <div class="field">
                        <label>Ville</label>
                        <input
                            value="${escapeHtml(infos.ville || "")}"
                            placeholder="Ex. Paris"
                            onchange="updateInfo('ville', this.value)"
                        />
                    </div>

                    <div class="field">
                        <label>Code postal</label>
                        <input
                            value="${escapeHtml(infos.cp || "")}"
                            placeholder="Ex. 75020"
                            onchange="updateInfo('cp', this.value)"
                        />
                    </div>

                    <div class="field full">
                        <label>Description</label>
                        <textarea
                            placeholder="Ajoutez une note utile..."
                            onchange="updateInfo('description', this.value)"
                        >${escapeHtml(infos.description || "")}</textarea>
                    </div>
                </div>
            </div>
        </div>
    `;
}

function updateInfo(key, value) {
    state.data.infos[key] = value;
}

/* ========================
   DYNAMIC SECTION
======================== */
function renderDynamicSection(key, fields) {
    const list = state.data[key];

    content.innerHTML = `
        ${renderAddressBanner()}

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
                ${fields.map(field => `
                    <div class="field ${field === "description" ? "full" : ""}">
                        <label>${prettyLabel(field)}</label>
                        <input
                            value="${escapeHtml(item[field] || "")}"
                            placeholder="${prettyPlaceholder(field)}"
                            onchange="updateRow('${key}', ${index}, '${field}', this.value)"
                        />
                    </div>
                `).join("")}
            </div>
        </div>
    `;
}

function addRow(key) {
    state.data[key].push({});
    renderStep();
}

function removeRow(key, index) {
    state.data[key].splice(index, 1);
    renderStep();
}

function updateRow(key, index, field, value) {
    state.data[key][index][field] = value;
}

/* ========================
   EXPORT SUMMARY
======================== */
function renderSummary() {
    const { infos, fiches, pv, schemas } = state.data;

    content.innerHTML = `
        ${renderAddressBanner()}

        <div class="single-panel-layout">
            <div class="panel">
                <div class="section-toolbar">
                    <div>
                        <h3>Export</h3>
                        <p class="panel-muted">Vérifiez le contenu avant génération.</p>
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

                <div class="export-status-block">
                    <span class="export-pill">
                        ${isDoeReady() ? "DOE assez rempli pour continuer" : "DOE encore incomplet"}
                    </span>
                </div>
            </div>
        </div>
    `;
}

function isDoeReady() {
    const { infos } = state.data;
    return Boolean(infos.adresse && infos.ville && infos.cp);
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
        fichier: "Fichier",
        adresse: "Adresse",
        ville: "Ville",
        cp: "Code postal",
        description: "Description"
    };
    return map[field] || field;
}

function prettyPlaceholder(field) {
    const map = {
        type: "Ex. Chaudière",
        marque: "Ex. Viessmann",
        modele: "Ex. Vitocrossal 200",
        fichier: "Nom du document",
        adresse: "Ex. 12 rue des Lilas",
        ville: "Ex. Paris",
        cp: "Ex. 75020",
        description: "Ajoutez une note utile..."
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

/* ========================
   INIT
======================== */
renderStep();

/* ========================
   EXPOSE FUNCTIONS
======================== */
window.updateInfo = updateInfo;
window.addRow = addRow;
window.removeRow = removeRow;
window.updateRow = updateRow;
