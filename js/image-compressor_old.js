const $ = (id) => document.getElementById(id);

const state = {
    files: [],
    results: []
};

const fileInput = $("fileInput");
const dropZone = $("dropZone");
const imageList = $("imageList");
const qualityRange = $("qualityRange");
const qualityValue = $("qualityValue");
const outputFormat = $("outputFormat");
const resizeMode = $("resizeMode");
const sizeLimit = $("sizeLimit");
const summary = $("summary");

function formatBytes(bytes) {
    if (!Number.isFinite(bytes)) return "—";

    const units = ["B", "KB", "MB", "GB"];
    let value = bytes;
    let unit = 0;

    while (value >= 1024 && unit < units.length - 1) {
        value /= 1024;
        unit++;
    }

    const decimals = value >= 100 ? 0 : value >= 10 ? 1 : 2;

    return `${value.toFixed(decimals)} ${units[unit]}`;
}

function escapeHtml(value) {
    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

function getExtension(mime) {
    if (mime === "image/webp") return "webp";
    if (mime === "image/jpeg") return "jpg";
    if (mime === "image/png") return "png";
    return "img";
}

function baseName(filename) {
    return filename.replace(/\.[^.]+$/, "");
}

function savedPercent(original, compressed) {
    if (!original || compressed >= original) return 0;
    return Math.round((1 - compressed / original) * 100);
}

function revokeResults() {
    state.results.forEach(result => {
        if (result?.url) {
            URL.revokeObjectURL(result.url);
        }
    });

    state.results = [];
}

function addFiles(fileList) {
    const validFiles = [...fileList].filter(file =>
        ["image/jpeg", "image/png", "image/webp"].includes(file.type)
    );

    state.files.push(...validFiles);

    renderFileList();
}

function renderFileList() {
    revokeResults();

    if (!state.files.length) {
        imageList.innerHTML = `
            <div class="empty-state">
                Todavía no seleccionaste imágenes.
            </div>
        `;

        return;
    }

    imageList.innerHTML = state.files.map((file, index) => {
        const previewUrl = URL.createObjectURL(file);

        return `
            <article class="image-item" data-index="${index}">
                <img
                    class="preview"
                    src="${previewUrl}"
                    alt="${escapeHtml(file.name)}"
                >

                <div>
                    <h3 class="image-name">
                        ${escapeHtml(file.name)}
                    </h3>

                    <div class="image-meta">
                        <span>Original: ${formatBytes(file.size)}</span>
                        <span>${escapeHtml(file.type.replace("image/", "").toUpperCase())}</span>
                    </div>

                    <div class="status">
                        Pendiente de compresión
                    </div>
                </div>

                <div></div>
            </article>
        `;
    }).join("");
}

function loadImage(file) {
    return new Promise((resolve, reject) => {
        const image = new Image();
        const url = URL.createObjectURL(file);

        image.onload = () => {
            URL.revokeObjectURL(url);
            resolve(image);
        };

        image.onerror = () => {
            URL.revokeObjectURL(url);
            reject(new Error("No se pudo leer la imagen."));
        };

        image.src = url;
    });
}

function calculateTargetSize(width, height) {
    const mode = resizeMode.value;

    if (mode === "none") {
        return { width, height };
    }

    const limit = Math.max(
        1,
        Number(sizeLimit.value) || 1920
    );

    if (mode === "max-width") {
        if (width <= limit) {
            return { width, height };
        }

        const ratio = limit / width;

        return {
            width: Math.round(width * ratio),
            height: Math.round(height * ratio)
        };
    }

    if (mode === "max-dimension") {
        const maxDimension = Math.max(width, height);

        if (maxDimension <= limit) {
            return { width, height };
        }

        const ratio = limit / maxDimension;

        return {
            width: Math.round(width * ratio),
            height: Math.round(height * ratio)
        };
    }

    return { width, height };
}

function canvasToBlob(canvas, mime, quality) {
    return new Promise((resolve, reject) => {
        canvas.toBlob(
            blob => {
                if (blob) {
                    resolve(blob);
                } else {
                    reject(
                        new Error("No se pudo generar la imagen comprimida.")
                    );
                }
            },
            mime,
            mime === "image/png" ? undefined : quality
        );
    });
}

async function compressFile(file, index) {
    const item = imageList.querySelector(
        `[data-index="${index}"]`
    );

    const status = item.querySelector(".status");

    status.textContent = "Procesando...";

    const image = await loadImage(file);

    const target = calculateTargetSize(
        image.naturalWidth,
        image.naturalHeight
    );

    const canvas = document.createElement("canvas");

    canvas.width = target.width;
    canvas.height = target.height;

    const ctx = canvas.getContext("2d", {
        alpha: true
    });

    const mime = outputFormat.value;

    if (mime === "image/jpeg") {
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(
            0,
            0,
            target.width,
            target.height
        );
    }

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";

    ctx.drawImage(
        image,
        0,
        0,
        image.naturalWidth,
        image.naturalHeight,
        0,
        0,
        target.width,
        target.height
    );

    const quality =
        Number(qualityRange.value) / 100;

    const blob = await canvasToBlob(
        canvas,
        mime,
        quality
    );

    const url =
        URL.createObjectURL(blob);

    const result = {
        blob,
        url,
        mime,
        width: target.width,
        height: target.height
    };

    state.results[index] = result;

    const extension =
        getExtension(mime);

    const downloadName =
        `${baseName(file.name)}-comprimida.${extension}`;

    const saved =
        savedPercent(
            file.size,
            blob.size
        );

    item.innerHTML = `
        <img
            class="preview"
            src="${url}"
            alt="${escapeHtml(file.name)}"
        >

        <div>
            <h3 class="image-name">
                ${escapeHtml(file.name)}
            </h3>

            <div class="image-meta">
                <span>
                    Original:
                    ${formatBytes(file.size)}
                </span>

                <span>
                    Comprimida:
                    ${formatBytes(blob.size)}
                </span>

                <span>
                    ${target.width}×${target.height}
                </span>

                <span>
                    ${extension.toUpperCase()}
                </span>
            </div>

            <div class="image-result ${blob.size < file.size ? "good" : "bad"}">
                ${
                    blob.size < file.size
                        ? `Ahorro aproximado: ${saved}%`
                        : "La imagen resultante es mayor que la original."
                }
            </div>
        </div>

        <a
            class="download-button"
            href="${url}"
            download="${escapeHtml(downloadName)}"
        >
            Descargar
        </a>
    `;

    return {
        originalSize: file.size,
        compressedSize: blob.size
    };
}

async function compressAll() {
    if (!state.files.length) {
        alert("Selecciona al menos una imagen.");
        return;
    }

    revokeResults();

    $("compressButton").disabled = true;
    $("compressButton").textContent = "Comprimiendo...";

    let totalOriginal = 0;
    let totalCompressed = 0;
    let processed = 0;

    try {
        for (let i = 0; i < state.files.length; i++) {
            try {
                const result =
                    await compressFile(
                        state.files[i],
                        i
                    );

                totalOriginal +=
                    result.originalSize;

                totalCompressed +=
                    result.compressedSize;

                processed++;

            } catch (error) {
                const item =
                    imageList.querySelector(
                        `[data-index="${i}"]`
                    );

                if (item) {
                    const status =
                        item.querySelector(".status");

                    if (status) {
                        status.textContent =
                            `Error: ${error.message}`;
                    }
                }
            }
        }

        const saved =
            savedPercent(
                totalOriginal,
                totalCompressed
            );

        summary.classList.remove("hidden");

        summary.innerHTML = `
            <strong>
                ${processed} imagen(es) procesada(s).
            </strong>

            Original:
            <strong>${formatBytes(totalOriginal)}</strong>

            · Resultado:
            <strong>${formatBytes(totalCompressed)}</strong>

            · Ahorro:
            <strong>${saved}%</strong>
        `;

    } finally {
        $("compressButton").disabled = false;
        $("compressButton").textContent = "Comprimir imágenes";
    }
}

function clearAll() {
    revokeResults();

    state.files = [];
    fileInput.value = "";

    summary.classList.add("hidden");
    summary.innerHTML = "";

    renderFileList();
}

qualityRange.addEventListener("input", () => {
    qualityValue.textContent =
        `${qualityRange.value}%`;
});

resizeMode.addEventListener("change", () => {
    sizeLimit.disabled =
        resizeMode.value === "none";
});

fileInput.addEventListener("change", () => {
    addFiles(fileInput.files);
});

dropZone.addEventListener("dragover", event => {
    event.preventDefault();
    dropZone.classList.add("dragover");
});

dropZone.addEventListener("dragleave", () => {
    dropZone.classList.remove("dragover");
});

dropZone.addEventListener("drop", event => {
    event.preventDefault();

    dropZone.classList.remove("dragover");

    addFiles(
        event.dataTransfer.files
    );
});

$("compressButton").addEventListener(
    "click",
    compressAll
);

$("clearButton").addEventListener(
    "click",
    clearAll
);
