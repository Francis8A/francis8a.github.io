// Fetch the public IP using ipify API
fetch('https://api.ipify.org?format=json')
    .then(response => response.json())
    .then(data => {
        document.getElementById('loading').style.display = 'none';
        document.getElementById('ip').style.display = 'block';
        document.getElementById('ip-address').innerText = data.ip;
    })
    .catch(error => {
        document.getElementById('loading').innerText = 'Error al obtener la IP.';
        console.error('Error fetching IP:', error);
    });

// Fetch the public IP using ipify API
fetch('https://api.ipify.org?format=json')
    .then(response => response.json())
    .then(data => {
        document.getElementById('loading').style.display = 'none';
        document.getElementById('ip').style.display = 'block';
        document.getElementById('ip-address').innerText = data.ip;

        // Función para copiar la IP al portapapeles
        document.getElementById('copy-btn').addEventListener('click', () => {
            navigator.clipboard.writeText(data.ip).then(() => {
                const copyBtn = document.getElementById('copy-btn');
                copyBtn.innerText = 'Copiado'; // Cambiar texto del botón
                copyBtn.style.backgroundColor = '#28a745'; // Cambiar a verde
                copyBtn.style.color = 'white';

                // Opcional: Volver a "Copiar" después de 3 segundos
                setTimeout(() => {
                    copyBtn.innerText = 'Copiar';
                    copyBtn.style.backgroundColor = '#007bff'; // Restaurar color original
                }, 3000);
            }).catch(err => {
                console.error('Error al copiar la IP: ', err);
            });
        });
    })
    .catch(error => {
        document.getElementById('loading').innerText = 'Error al obtener la IP.';
        console.error('Error fetching IP:', error);
    });
