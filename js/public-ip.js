const getAWSIP = async () => {
    try {
        const response = await fetch('https://checkip.amazonaws.com/');
        if (!response.ok) throw new Error('Error en AWS CheckIP');
        const ip = await response.text();
        return ip.trim(); // Eliminamos espacios en blanco extra
    } catch (error) {
        console.error('Error obteniendo la IP con AWS:', error);
        return null;
    }
};

const updateIPDisplay = async () => {
    document.getElementById('loading').innerText = "Obteniendo tu IP...";

    try {
        // Obtener IP desde AWS CheckIP
        const awsIP = await getAWSIP();
        let finalIP = awsIP || 'No disponible';

        if (finalIP === 'No disponible') {
            document.getElementById('loading').innerText = "Error: No se pudo obtener la IP.";
        } else {
            document.getElementById('loading').style.display = 'none';
            document.getElementById('ip').style.display = 'block';
            document.getElementById('ip-address').innerText = finalIP;
        }

        // Función para copiar la IP al portapapeles
        document.getElementById('copy-btn').addEventListener('click', () => {
            navigator.clipboard.writeText(finalIP).then(() => {
                const copyBtn = document.getElementById('copy-btn');
                copyBtn.innerText = 'Copiado';
                copyBtn.style.backgroundColor = '#28a745';
                copyBtn.style.color = 'white';

                setTimeout(() => {
                    copyBtn.innerText = 'Copiar';
                    copyBtn.style.backgroundColor = '#007bff';
                }, 3000);
            }).catch(err => {
                console.error('Error al copiar la IP: ', err);
            });
        });

    } catch (error) {
        document.getElementById('loading').innerText = "Error: No se pudo obtener la IP.";
        console.error("Error general:", error);
    }
};

// Ejecutar la función al cargar la página
updateIPDisplay();
