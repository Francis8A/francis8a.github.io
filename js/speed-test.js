document.getElementById("start-test").addEventListener("click", () => {
    const downloadSpeedElement = document.getElementById("download-speed");
    const uploadSpeedElement = document.getElementById("upload-speed");
    const resultsContainer = document.getElementById("results");

    resultsContainer.style.display = "none"; // Ocultar resultados durante la prueba

    // Prueba de velocidad de descarga
    const testDownload = () => {
        return new Promise((resolve) => {
            const startTime = Date.now();
            const image = new Image();
            const cacheBuster = "?cache=" + startTime;
            image.src = "https://via.placeholder.com/1000x1000" + cacheBuster;

            image.onload = () => {
                const endTime = Date.now();
                const duration = (endTime - startTime) / 1000; // En segundos
                const sizeInBits = 1000000 * 8; // Imagen de 1MB en bits
                const speedMbps = (sizeInBits / duration) / 1000000;
                resolve(speedMbps.toFixed(2));
            };

            image.onerror = () => resolve(0); // Si falla, devolver 0 Mbps
        });
    };

    // Prueba de velocidad de subida
    const testUpload = () => {
        return new Promise((resolve) => {
            const startTime = Date.now();
            const xhr = new XMLHttpRequest();
            const data = new Blob(["a".repeat(1000000)]); // 1MB de datos

            xhr.open("POST", "https://httpbin.org/post", true);

            xhr.onload = () => {
                const endTime = Date.now();
                const duration = (endTime - startTime) / 1000; // En segundos
                const sizeInBits = data.size * 8;
                const speedMbps = (sizeInBits / duration) / 1000000;
                resolve(speedMbps.toFixed(2));
            };

            xhr.onerror = () => resolve(0); // Si falla, devolver 0 Mbps
            xhr.send(data);
        });
    };

    // Ejecutar pruebas
    Promise.all([testDownload(), testUpload()]).then(([downloadSpeed, uploadSpeed]) => {
        downloadSpeedElement.innerText = downloadSpeed;
        uploadSpeedElement.innerText = uploadSpeed;
        resultsContainer.style.display = "block";
    });
});


// Medir velocidad de descarga
async function testDownloadSpeed() {
    const url = "https://speed.hetzner.de/100MB.bin"; // Archivo de prueba (100 MB)
    const startTime = performance.now();
    const promises = [];
    const connections = 5; // Número de conexiones paralelas

    for (let i = 0; i < connections; i++) {
        promises.push(
            fetch(`${url}?nocache=${Math.random()}`)
                .then(response => response.blob()) // Descargar archivo
        );
    }

    await Promise.all(promises);
    const endTime = performance.now();

    const duration = (endTime - startTime) / 1000; // Duración en segundos
    const totalSize = 100 * connections; // Tamaño total (100 MB por archivo, 5 conexiones)
    const speedMbps = (totalSize * 8) / duration; // Convertir a Mbps

    return speedMbps.toFixed(2);
}

// Medir velocidad de subida
async function testUploadSpeed() {
    const url = "https://postman-echo.com/post"; // Servidor de prueba de subida
    const payload = new Blob(new Array(1e6).fill("a")); // 1 MB de datos
    const startTime = performance.now();
    const promises = [];
    const connections = 3; // Número de conexiones paralelas

    for (let i = 0; i < connections; i++) {
        promises.push(
            fetch(url, {
                method: "POST",
                body: payload,
            })
        );
    }

    await Promise.all(promises);
    const endTime = performance.now();

    const duration = (endTime - startTime) / 1000; // Duración en segundos
    const totalSize = 1 * connections; // Tamaño total (1 MB por archivo, 3 conexiones)
    const speedMbps = (totalSize * 8) / duration; // Convertir a Mbps

    return speedMbps.toFixed(2);
}

// Medir latencia
async function testLatency() {
    const url = "https://www.google.com"; // Servidor de prueba
    const startTime = performance.now();

    await fetch(`${url}?nocache=${Math.random()}`);

    const endTime = performance.now();

    const latencyMs = endTime - startTime;
    return latencyMs.toFixed(2);
}

// Botón para iniciar prueba
const startButton = document.getElementById("start-test");
const downloadResult = document.getElementById("download-speed");
const uploadResult = document.getElementById("upload-speed");
const latencyResult = document.getElementById("latency");

startButton.addEventListener("click", async () => {
    downloadResult.innerText = "Calculando...";
    uploadResult.innerText = "Calculando...";
    latencyResult.innerText = "Calculando...";

    const downloadSpeed = await testDownloadSpeed();
    const uploadSpeed = await testUploadSpeed();
    const latency = await testLatency();

    downloadResult.innerText = `${downloadSpeed} Mbps`;
    uploadResult.innerText = `${uploadSpeed} Mbps`;
    latencyResult.innerText = `${latency} ms`;
});


