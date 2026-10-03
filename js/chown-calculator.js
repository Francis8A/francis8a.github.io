const resourcePath = document.getElementById("resourcePath");
const resourceType = document.getElementById("resourceType");
const useCase = document.getElementById("useCase");

const changeOwner = document.getElementById("changeOwner");
const changeGroup = document.getElementById("changeGroup");
const ownerName = document.getElementById("ownerName");
const groupName = document.getElementById("groupName");

const recursive = document.getElementById("recursive");
const oneFileSystem = document.getElementById("oneFileSystem");
const noDereference = document.getElementById("noDereference");

const useReference = document.getElementById("useReference");
const referencePath = document.getElementById("referencePath");
const referenceGroup = document.getElementById("referenceGroup");

const changesOnly = document.getElementById("changesOnly");
const verbose = document.getElementById("verbose");
const silent = document.getElementById("silent");

const commandResult = document.getElementById("commandResult");
const copyButton = document.getElementById("copyButton");

const ownerSummary = document.getElementById("ownerSummary");
const groupSummary = document.getElementById("groupSummary");
const recursiveSummary = document.getElementById("recursiveSummary");
const typeSummary = document.getElementById("typeSummary");

const resourceHint = document.getElementById("resourceHint");
const optionHint = document.getElementById("optionHint");
const explanationBox = document.getElementById("explanationBox");
const riskMessage = document.getElementById("riskMessage");

const typeLabels = {
    file: "Archivo",
    directory: "Directorio",
    symlink: "Enlace simbólico"
};

const criticalPaths = [
    "/",
    "/etc",
    "/usr",
    "/var",
    "/boot",
    "/bin",
    "/sbin",
    "/lib",
    "/lib64"
];

function shellQuote(value) {
    const text = (value || "").trim();

    if (!text) {
        return "''";
    }

    if (/^[A-Za-z0-9_./:@%+=,-]+$/.test(text)) {
        return text;
    }

    return "'" + text.replace(/'/g, `'\\''`) + "'";
}

function isValidAccountName(value) {
    const text = (value || "").trim();

    if (!text) {
        return false;
    }

    // Permite nombres Linux habituales y UID/GID numéricos.
    return /^[A-Za-z_][A-Za-z0-9_.-]*\$?$/.test(text) || /^\d+$/.test(text);
}

function normalizedPath() {
    let value = resourcePath.value.trim();

    if (value.length > 1) {
        value = value.replace(/\/+$/, "");
    }

    return value;
}

function isCriticalPath(path) {
    return criticalPaths.includes(path);
}

function hasBroadWildcard(path) {
    return path === "*" ||
           path === "/*" ||
           path.endsWith("/*") ||
           path.includes(" *") ||
           path.includes("/**");
}

function applyUseCase() {
    switch (useCase.value) {
        case "owner":
            changeOwner.checked = true;
            changeGroup.checked = false;
            recursive.checked = false;
            break;

        case "group":
            changeOwner.checked = false;
            changeGroup.checked = true;
            recursive.checked = false;
            break;

        case "both":
            changeOwner.checked = true;
            changeGroup.checked = true;
            recursive.checked = false;
            break;

        case "application":
            changeOwner.checked = true;
            changeGroup.checked = true;
            resourceType.value = "directory";
            recursive.checked = true;
            break;

        case "recursive":
            changeOwner.checked = true;
            changeGroup.checked = true;
            resourceType.value = "directory";
            recursive.checked = true;
            break;

        case "shared":
            changeOwner.checked = true;
            changeGroup.checked = true;
            resourceType.value = "directory";
            recursive.checked = true;
            break;

        case "custom":
        default:
            break;
    }

    updateUI();
}

function syncControls() {
    const referenceMode = useReference.checked;

    ownerName.disabled = !changeOwner.checked || referenceMode;
    groupName.disabled = !changeGroup.checked || referenceMode;

    changeOwner.disabled = referenceMode;
    changeGroup.disabled = referenceMode;

    referencePath.disabled = !referenceMode;

    if (resourceType.value !== "directory") {
        oneFileSystem.checked = false;
    }

    oneFileSystem.disabled = resourceType.value !== "directory";
}

function buildOwnershipTarget() {
    if (useReference.checked) {
        return null;
    }

    const owner = ownerName.value.trim();
    const group = groupName.value.trim();

    if (changeOwner.checked && changeGroup.checked) {
        return `${owner}:${group}`;
    }

    if (changeOwner.checked) {
        return owner;
    }

    if (changeGroup.checked) {
        return `:${group}`;
    }

    return "";
}

function getFlags() {
    const flags = [];

    if (recursive.checked) {
        flags.push("-R");
    }

    if (oneFileSystem.checked && resourceType.value === "directory") {
        flags.push("-x");
    }

    if (noDereference.checked) {
        flags.push("-h");
    }

    if (changesOnly.checked) {
        flags.push("-c");
    }

    if (verbose.checked) {
        flags.push("-v");
    }

    if (silent.checked) {
        flags.push("-f");
    }

    return flags;
}

function buildCommand() {
    const path = resourcePath.value.trim();
    const flags = getFlags();

    const parts = ["chown"];

    if (flags.length) {
        parts.push(...flags);
    }

    if (useReference.checked) {
        const ref = referencePath.value.trim();
        parts.push(`--reference=${shellQuote(ref)}`);
    } else {
        const target = buildOwnershipTarget();
        if (target) {
            parts.push(shellQuote(target));
        }
    }

    parts.push(shellQuote(path));

    return parts.join(" ");
}

function updateHints() {
    const path = normalizedPath();

    if (resourceType.value === "directory") {
        resourceHint.innerHTML =
            "<strong>Directorio:</strong> CHOWN cambia la propiedad del directorio. " +
            "Si habilitas <code>-R</code>, también cambiará todo su contenido.";
    } else if (resourceType.value === "symlink") {
        resourceHint.innerHTML =
            "<strong>Enlace simbólico:</strong> si quieres actuar sobre el enlace en sí, " +
            "habilita <code>-h</code>. Sin esa opción, el comportamiento puede afectar al destino según la operación y la plataforma.";
    } else {
        resourceHint.innerHTML =
            "<strong>Archivo:</strong> normalmente no necesitas <code>-R</code>. " +
            "Define owner, group o ambos.";
    }

    if (recursive.checked) {
        optionHint.innerHTML =
            "<strong>Recursividad habilitada:</strong> el cambio se aplicará al recurso y, cuando corresponda, a su árbol de contenido.";
    } else {
        optionHint.innerHTML =
            "<strong>Sin recursividad:</strong> el comando actuará únicamente sobre el recurso indicado.";
    }

    if (path === "") {
        resourceHint.innerHTML += "<br><strong>Falta indicar una ruta.</strong>";
    }
}

function updateSummary() {
    ownerSummary.textContent = useReference.checked
        ? "Desde referencia"
        : (changeOwner.checked ? (ownerName.value.trim() || "—") : "Sin cambio");

    groupSummary.textContent = useReference.checked
        ? "Desde referencia"
        : (changeGroup.checked ? (groupName.value.trim() || "—") : "Sin cambio");

    recursiveSummary.textContent = recursive.checked ? "Sí" : "No";
    typeSummary.textContent = typeLabels[resourceType.value];
}

function updateExplanation() {
    const path = resourcePath.value.trim() || "(ruta sin definir)";

    if (useReference.checked) {
        const ref = referencePath.value.trim() || "(referencia sin definir)";

        explanationBox.innerHTML =
            `El recurso <code>${escapeHtml(path)}</code> copiará owner y group desde ` +
            `<code>${escapeHtml(ref)}</code>` +
            (recursive.checked ? " y el cambio se aplicará recursivamente." : ".");
        return;
    }

    const pieces = [];

    if (changeOwner.checked) {
        pieces.push(`owner <strong>${escapeHtml(ownerName.value.trim() || "—")}</strong>`);
    }

    if (changeGroup.checked) {
        pieces.push(`group <strong>${escapeHtml(groupName.value.trim() || "—")}</strong>`);
    }

    let description = pieces.length
        ? `Se cambiará ${pieces.join(" y ")} de <code>${escapeHtml(path)}</code>.`
        : `No se ha seleccionado ningún cambio de owner o group para <code>${escapeHtml(path)}</code>.`;

    if (recursive.checked) {
        description += " La operación se aplicará también al contenido de forma recursiva.";
    }

    if (oneFileSystem.checked) {
        description += " No se atravesarán otros filesystems montados debajo de la ruta.";
    }

    if (noDereference.checked) {
        description += " La opción <code>-h</code> indica que se actúe sobre enlaces simbólicos en lugar de desreferenciarlos.";
    }

    explanationBox.innerHTML = description;
}

function updateRisk() {
    riskMessage.className = "risk-message";

    const path = normalizedPath();
    const owner = ownerName.value.trim();
    const group = groupName.value.trim();

    const problems = [];
    const warnings = [];

    if (!path) {
        problems.push("Debes indicar una ruta.");
    }

    if (!useReference.checked) {
        if (!changeOwner.checked && !changeGroup.checked) {
            problems.push("Selecciona al menos un cambio: owner o group.");
        }

        if (changeOwner.checked && !isValidAccountName(owner)) {
            problems.push("El owner está vacío o no tiene un formato válido.");
        }

        if (changeGroup.checked && !isValidAccountName(group)) {
            problems.push("El group está vacío o no tiene un formato válido.");
        }
    } else if (!referencePath.value.trim()) {
        problems.push("Debes indicar un recurso de referencia.");
    }

    if (recursive.checked && isCriticalPath(path)) {
        problems.push(
            `Operación de alto riesgo: <code>chown -R</code> sobre <code>${escapeHtml(path)}</code> puede alterar archivos esenciales del sistema.`
        );
    }

    if (recursive.checked && hasBroadWildcard(path)) {
        problems.push(
            "La ruta incluye un patrón amplio junto con recursividad. Revisa cuidadosamente qué recursos serán afectados."
        );
    }

    if (recursive.checked && resourceType.value === "directory") {
        warnings.push(
            "La opción <code>-R</code> cambiará propietario/grupo de todo el árbol de directorios."
        );
    }

    if (silent.checked) {
        warnings.push(
            "<code>-f</code> puede ocultar errores que sería útil revisar."
        );
    }

    if (noDereference.checked) {
        warnings.push(
            "Se ha habilitado <code>-h</code>; verifica que realmente quieras actuar sobre enlaces simbólicos."
        );
    }

    if (problems.length) {
        riskMessage.classList.add("risk-danger");
        riskMessage.innerHTML =
            "<strong>⚠ Revisión necesaria</strong><br>" +
            problems.join("<br>");
        return;
    }

    if (warnings.length) {
        riskMessage.classList.add("risk-warning");
        riskMessage.innerHTML =
            "<strong>⚠ Atención</strong><br>" +
            warnings.join("<br>");
        return;
    }

    riskMessage.classList.add("risk-safe");
    riskMessage.innerHTML =
        "<strong>✓ Configuración razonable.</strong> " +
        "No se detectaron combinaciones especialmente riesgosas.";
}

function escapeHtml(value) {
    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

function updateUI() {
    syncControls();
    updateHints();
    updateSummary();
    commandResult.textContent = buildCommand();
    updateExplanation();
    updateRisk();
}

[
    resourcePath,
    resourceType,
    changeOwner,
    changeGroup,
    ownerName,
    groupName,
    recursive,
    oneFileSystem,
    noDereference,
    useReference,
    referencePath,
    changesOnly,
    verbose,
    silent
].forEach(element => {
    element.addEventListener("input", updateUI);
    element.addEventListener("change", updateUI);
});

useCase.addEventListener("change", applyUseCase);

copyButton.addEventListener("click", async () => {
    try {
        await navigator.clipboard.writeText(commandResult.textContent);

        copyButton.textContent = "Copiado ✓";

        setTimeout(() => {
            copyButton.textContent = "Copiar";
        }, 1500);
    } catch (error) {
        alert("No fue posible copiar el comando.");
    }
});

updateUI();
