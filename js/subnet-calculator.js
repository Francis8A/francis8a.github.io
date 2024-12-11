document.getElementById('subnet-form').addEventListener('submit', function (e) {
    e.preventDefault();

    const ipAddress = document.getElementById('ip-address').value;
    const subnetMask = document.getElementById('subnet-mask').value;

    try {
        const results = calculateSubnet(ipAddress, subnetMask);
        document.getElementById('network-address').innerText = results.networkAddress;
        document.getElementById('broadcast-address').innerText = results.broadcastAddress;
        document.getElementById('total-hosts').innerText = results.totalHosts;
        document.getElementById('usable-hosts').innerText = results.usableHosts;
        document.getElementById('ip-range').innerText = results.ipRange;
        document.getElementById('ip-class').innerText = results.ipClass;
        document.getElementById('ip-type').innerText = results.ipType; // Mostrar el tipo de IP
        document.getElementById('results').style.display = 'block';
    } catch (error) {
        alert(error.message);
    }
});



function calculateSubnet(ip, mask) {
    // console.log('IP:', ip);
    // console.log('Máscara:', mask);
    // Validar la dirección IP
    if (!validateIP(ip)) throw new Error('Dirección IP inválida.');
    
    // Convertir la máscara a CIDR si es necesario
    const cidr = mask.includes('/') ? parseInt(mask.replace('/', '')) : maskToCIDR(mask);

    if (cidr < 0 || cidr > 32) throw new Error('Máscara de subred inválida.');

    // Cálculos básicos
    const networkAddress = getNetworkAddress(ip, cidr);
    const broadcastAddress = getBroadcastAddress(ip, cidr);
    const totalHosts = Math.pow(2, 32 - cidr); // Total de hosts posibles
    const usableHosts = cidr >= 31 ? 0 : totalHosts - 2; // Hosts utilizables
    const ipRange = usableHosts > 0 ? getIPRange(networkAddress, broadcastAddress) : 'N/A';
    const ipClass = getIPClass(ip); // Calcular la clase de IP
    const ipType = getIPType(ip); // Calcular la clase de IP

    return {
        networkAddress,
        broadcastAddress,
        totalHosts,
        usableHosts,
        ipRange,
        ipClass,
        ipType,
    };
}

function getIPType(ip) {
    const octets = ip.split('.').map(Number);

    // Bloques de direcciones especiales
    if (octets[0] === 0) return 'Red actual (origen válido)';
    if (octets[0] === 10) return 'Privada (Clase A)';
    if (octets[0] === 100 && octets[1] >= 64 && octets[1] <= 127) return 'Privada (NAT a nivel operador)';
    if (octets[0] === 127) return 'Loopback';
    if (octets[0] === 169 && octets[1] === 254) return 'Enlace local';
    if (octets[0] === 172 && octets[1] >= 16 && octets[1] <= 31) return 'Privada (Clase B)';
    if (octets[0] === 192 && octets[1] === 0 && octets[2] === 0) return 'Asignaciones IETF Protocol';
    if (octets[0] === 192 && octets[1] === 0 && octets[2] === 2) return 'Documentación (TEST-NET-1)';
    if (octets[0] === 192 && octets[1] === 88 && octets[2] === 99) return 'Reservada (Relay IPv6 a IPv4)';
    if (octets[0] === 192 && octets[1] === 168) return 'Privada (Clase C)';
    if (octets[0] === 198 && (octets[1] === 18 || octets[1] === 19)) return 'Pruebas de referencia';
    if (octets[0] === 198 && octets[1] === 51 && octets[2] === 100) return 'Documentación (TEST-NET-2)';
    if (octets[0] === 203 && octets[1] === 0 && octets[2] === 113) return 'Documentación (TEST-NET-3)';
    if (octets[0] >= 224 && octets[0] <= 239) return 'Multicast';
    if (octets[0] >= 240 && octets[0] <= 255) return 'Experimental (Reservada)';
    if (ip === '255.255.255.255') return 'Broadcast limitado';

    // Por defecto, si no coincide con ninguna de las anteriores, es pública
    return 'Pública';
}


// Nueva función para determinar la clase de IP
function getIPClass(ip) {
    const firstOctet = parseInt(ip.split('.')[0], 10);

    if (firstOctet >= 1 && firstOctet <= 126) return 'Clase A';
    if (firstOctet >= 128 && firstOctet <= 191) return 'Clase B';
    if (firstOctet >= 192 && firstOctet <= 223) return 'Clase C';
    if (firstOctet >= 224 && firstOctet <= 239) return 'Clase D (Multicast)';
    if (firstOctet >= 240 && firstOctet <= 255) return 'Clase E (Experimental)';
    
    return 'Clase Desconocida';
}

function validateIP(ip) {
    const regex = /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    return regex.test(ip);
}

function maskToCIDR(mask) {
    const binary = mask
        .split('.')
        .map(octet => parseInt(octet, 10).toString(2).padStart(8, '0'))
        .join('');
    return binary.split('1').length - 1;
}

function getNetworkAddress(ip, cidr) {
    const binaryIP = ipToBinary(ip);
    const networkBinary = binaryIP.slice(0, cidr).padEnd(32, '0');
    return binaryToIP(networkBinary);
}

function getBroadcastAddress(ip, cidr) {
    const binaryIP = ipToBinary(ip);
    const broadcastBinary = binaryIP.slice(0, cidr).padEnd(32, '1');
    return binaryToIP(broadcastBinary);
}

function getIPRange(network, broadcast) {
    const firstIP = incrementIP(network);
    const lastIP = decrementIP(broadcast);
    return `${firstIP} - ${lastIP}`;
}

function ipToBinary(ip) {
    return ip.split('.').map(octet => parseInt(octet, 10).toString(2).padStart(8, '0')).join('');
}

function binaryToIP(binary) {
    return binary.match(/.{8}/g).map(octet => parseInt(octet, 2)).join('.');
}

function incrementIP(ip) {
    const parts = ip.split('.').map(Number);
    for (let i = parts.length - 1; i >= 0; i--) {
        if (parts[i] < 255) {
            parts[i]++;
            break;
        } else {
            parts[i] = 0;
        }
    }
    return parts.join('.');
}

function decrementIP(ip) {
    const parts = ip.split('.').map(Number);
    for (let i = parts.length - 1; i >= 0; i--) {
        if (parts[i] > 0) {
            parts[i]--;
            break;
        } else {
            parts[i] = 255;
        }
    }
    return parts.join('.');
}



// /* Funciones para la funcionalida de Rango de Ips*/

// document.getElementById('ip-range-form').addEventListener('submit', function (e) {
//     e.preventDefault();

//     const startIP = document.getElementById('start-ip').value;
//     const endIP = document.getElementById('end-ip').value;

//     if (!validateIP(startIP) || !validateIP(endIP)) {
//         alert('Por favor ingrese direcciones IP válidas.');
//         return;
//     }

//     try {
//         const cidrList = summarizeIPRange(startIP, endIP);
//         document.getElementById('cidr-result').innerText = cidrList.join('\n');
//         document.getElementById('ip-range-result').style.display = 'block';
//     } catch (error) {
//         alert(error.message);
//     }
// });

// // Función para validar direcciones IP
// function validateIP(ip) {
//     const ipRegex = /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
//     return ipRegex.test(ip);
// }

// // Función para sumarizar rango de IPs a CIDR
// function summarizeIPRange(startIP, endIP) {
//     const start = ipToInteger(startIP);
//     const end = ipToInteger(endIP);

//     if (start > end) {
//         throw new Error('La IP inferior debe ser menor o igual a la IP superior.');
//     }

//     const cidrBlocks = [];
//     let current = start;

//     while (current <= end) {
//         let maxMask = 32;

//         while (maxMask > 0) {
//             const mask = Math.pow(2, 32 - maxMask);
//             const maskBase = current & ~(mask - 1);

//             // Validar si el bloque encaja dentro del rango
//             if (maskBase !== current || current + mask - 1 > end) {
//                 maxMask--;
//             } else {
//                 break;
//             }
//         }

//         // Agregar bloque CIDR al resultado
//         cidrBlocks.push(`${integerToIP(current)}/${maxMask}`);
//         current += Math.pow(2, 32 - maxMask); // Avanzar al siguiente bloque
//     }

//     return cidrBlocks;
// }


// // Convertir IP a entero

// function ipToInteger(ip) {
//     return ip.split('.').reduce((acc, octet) => (acc << 8) + parseInt(octet, 10), 0) >>> 0;
// }


// // function ipToInteger(ip) {
// //     return ip.split('.').reduce((acc, octet) => (acc << 8) + parseInt(octet, 10), 0) >>> 0;
// // }

// function integerToIP(int) {
//     return [
//         (int >>> 24) & 255,
//         (int >>> 16) & 255,
//         (int >>> 8) & 255,
//         int & 255
//     ].join('.');
// }


// console.log(ipToInteger('192.168.1.0')); // Debe devolver 3232235776
// console.log(ipToInteger('192.168.1.255')); // Debe devolver 3232236031
// console.log(integerToIP(3232235776)); // Debe devolver "192.168.1.0"
// console.log(integerToIP(3232236031)); // Debe devolver "192.168.1.255"
