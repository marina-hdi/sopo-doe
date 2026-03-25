console.log("DOE v2 dynamic system 🚀");

/* ========================
   GLOBAL STATE
======================== */
let state = {
    currentStep: 0,
    data: {
        infos: {},
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
        title: "Créer un DOE",
        description: "Commencez par renseigner les informations du chantier.",
        render: renderInfos
    },
    {
        title: "Fiches techniques",
        description: "Ajoutez les équipements.",
        render: () => renderDynamicSection("fiches", ["type", "marque", "modele"])
    },
    {
        title: "Procès-verbaux",
        description: "Ajoutez les PV.",
        render: () => renderDynamicSection("pv", ["type", "fichier"])
    },
    {
        title: "Schémas",
        description: "Ajoutez les schémas.",
        render: () => renderDynamicSection("schemas", ["type", "fichier"])
    },
    {
        title: "Export",
        description: "Vérifiez et générez le DOE.",
        render: renderSummary
    }
];

/* ========================
   STEP SWITCHING
======================== */
const steps = document.querySelectorAll(".step");
const content = document.getElementById("step-content");
const title = document.getElementById("step-title");
const description = document.getElementById("step-description");
const meta = document.getElementById("step-meta");

steps.forEach((step, index) => {
    step.addEventListener("click", () => goToStep(index));
});

function goToStep(index) {
    state.currentStep = index;

    steps.forEach(s => s.classList.remove("active"));
    steps[index].classList.add("active");

    renderStep();
}

function renderStep() {
    const step = stepsConfig[state.currentStep];

    title.innerText = step.title;
    description.innerText = step.description;
    meta.innerText = `Étape ${state.currentStep + 1} sur ${stepsConfig.length}`;

    content.innerHTML = "";
    step.render();
}

/* ========================
   STEP 1 — INFOS
======================== */
function renderInfos() {
    content.innerHTML = `
        <div class="field-grid">
            <div class="field">
                <label>Adresse</label>
                <input onchange="updateInfo('adresse', this.value)" />
            </div>

            <div class="field">
                <label>Ville</label>
                <input onchange="updateInfo('ville', this.value)" />
            </div>

            <div class="field">
                <label>Code postal</label>
                <input onchange="updateInfo('cp', this.value)" />
            </div>

            <div class="field full">
                <label>Description</label>
                <textarea onchange="updateInfo('description', this.value)"></textarea>
            </div>
        </div>
    `;
}

function updateInfo(key, value) {
    state.data.infos[key] = value;
}

/* ========================
   DYNAMIC SECTION (CORE)
======================== */
function renderDynamicSection(key, fields) {
    const list = state.data[key];

    content.innerHTML = `
        <div class="section-toolbar">
            <h3>${key.toUpperCase()}</h3>
            <button class="add-row-btn" onclick="addRow('${key}')">+ Ajouter</button>
        </div>

        <div class="dynamic-list">
            ${list.map((item, index) => renderRow(key, item, index, fields)).join("")}
        </div>
    `;
}

function renderRow(key, item, index, fields) {
    return `
        <div class="dynamic-card">
            <div class="dynamic-card-header">
                <span class="dynamic-card-title">#${index + 1}</span>
                <button class="remove-row-btn" onclick="removeRow('${key}', ${index})">Supprimer</button>
            </div>

            <div class="field-grid">
                ${fields.map(field => `
                    <div class="field">
                        <label>${field}</label>
                        <input value="${item[field] || ""}" 
                               onchange="updateRow('${key}', ${index}, '${field}', this.value)" />
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
   SUMMARY
======================== */
function renderSummary() {
    content.innerHTML = `
        <h3>Résumé</h3>
        <p>Fiches: ${state.data.fiches.length}</p>
        <p>PV: ${state.data.pv.length}</p>
        <p>Schémas: ${state.data.schemas.length}</p>
    `;
}

/* ========================
   NAV BUTTONS
======================== */
document.getElementById("next-step").onclick = () => {
    if (state.currentStep < stepsConfig.length - 1) {
        goToStep(state.currentStep + 1);
    }
};

document.getElementById("prev-step").onclick = () => {
    if (state.currentStep > 0) {
        goToStep(state.currentStep - 1);
    }
};

/* INIT */
renderStep();
