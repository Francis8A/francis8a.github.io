const permissionCheckboxes = document.querySelectorAll('.permission');
const resourceType = document.getElementById('resourceType');
const resourceName = document.getElementById('resourceName');
const octalResult = document.getElementById('octalResult');
const symbolicResult = document.getElementById('symbolicResult');
const commandResult = document.getElementById('commandResult');
const symbolicCommand = document.getElementById('symbolicCommand');
const recommendation = document.getElementById('recommendation');
const riskMessage = document.getElementById('riskMessage');
const copyButton = document.getElementById('copyButton');
const suid = document.getElementById('suid');
const sgid = document.getElementById('sgid');
const sticky = document.getElementById('sticky');
const specialPermissionInfo = document.getElementById('specialPermissionInfo');

const symbolicTargets = document.querySelectorAll('.symbolic-target');
const targetAll = document.getElementById('targetAll');
const symbolicPermissions = document.querySelectorAll('.symbolic-permission');
const symbolicOperators = document.querySelectorAll('input[name="symbolicOperator"]');
const symbolicBuilderCommand = document.getElementById('symbolicBuilderCommand');
const symbolicBuilderHint = document.getElementById('symbolicBuilderHint');
const copySymbolicButton = document.getElementById('copySymbolicButton');

const presets = {
    file: {
        permissions: '644', special: 0,
        description: 'Permiso habitual para archivos normales: el propietario puede leer y modificar; grupo y otros solo pueden leer.'
    },
    script: {
        permissions: '755', special: 0,
        description: 'Adecuado para scripts ejecutables: el propietario puede modificar y todos pueden leer/ejecutar.'
    },
    directory: {
        permissions: '755', special: 0,
        description: 'Directorio accesible por otros usuarios, pero solo el propietario puede crear o modificar entradas.'
    },
    config: {
        permissions: '640', special: 0,
        description: 'Configuración sensible: el propietario puede modificar, el grupo puede leer y otros no tienen acceso.'
    },
    'private-file': {
        permissions: '600', special: 0,
        description: 'Archivo privado: solo el propietario puede leer y modificar.'
    },
    'private-directory': {
        permissions: '700', special: 0,
        description: 'Directorio privado: solo el propietario puede listar, modificar y acceder.'
    },
    'shared-directory': {
        permissions: '775', special: 2,
        description: 'Directorio colaborativo: propietario y grupo pueden modificar. Se activa SGID para que los nuevos elementos hereden el grupo del directorio.'
    },
    custom: {
        permissions: null, special: null,
        description: 'Selecciona manualmente los permisos. Revisa especialmente escritura para Group/Others y los permisos especiales.'
    }
};

permissionCheckboxes.forEach(cb => cb.addEventListener('change', () => {
    resourceType.value = 'custom';
    recommendation.innerHTML = '<strong>Personalizado:</strong> revisa el resultado y la advertencia de seguridad.';
    updatePermissions();
}));

resourceName.addEventListener('input', () => {
    updatePermissions();
    updateSymbolicBuilder();
});

resourceType.addEventListener('change', applyPreset);
[suid, sgid, sticky].forEach(cb => cb.addEventListener('change', () => {
    resourceType.value = 'custom';
    recommendation.innerHTML = '<strong>Personalizado:</strong> se modificaron permisos especiales; valida que sean necesarios.';
    updatePermissions();
}));

symbolicTargets.forEach(cb => cb.addEventListener('change', () => {
    if (cb.checked) targetAll.checked = false;
    updateSymbolicBuilder();
}));

targetAll.addEventListener('change', () => {
    if (targetAll.checked) symbolicTargets.forEach(cb => { cb.checked = false; });
    updateSymbolicBuilder();
});

symbolicPermissions.forEach(cb => cb.addEventListener('change', updateSymbolicBuilder));
symbolicOperators.forEach(radio => radio.addEventListener('change', updateSymbolicBuilder));

function applyPreset() {
    const preset = presets[resourceType.value];
    recommendation.innerHTML = `<strong>Recomendación:</strong> ${preset.description}`;

    if (preset.permissions !== null) setPermissions(preset.permissions);
    if (preset.special !== null) setSpecialPermissions(preset.special);

    updatePermissions();
}

function setPermissions(octal) {
    ['owner', 'group', 'others'].forEach((group, index) => {
        const value = Number(octal[index]);
        document.querySelectorAll(`.permission[data-group="${group}"]`).forEach(cb => {
            const bit = Number(cb.value);
            cb.checked = (value & bit) === bit;
        });
    });
}

function setSpecialPermissions(value) {
    suid.checked = (value & 4) === 4;
    sgid.checked = (value & 2) === 2;
    sticky.checked = (value & 1) === 1;
}

function calculateGroup(group) {
    return [...document.querySelectorAll(`.permission[data-group="${group}"]`)]
        .filter(cb => cb.checked)
        .reduce((sum, cb) => sum + Number(cb.value), 0);
}

function getGroupText(group) {
    return ['r', 'w', 'x'].map(permission => {
        const cb = document.querySelector(`.permission[data-group="${group}"][data-permission="${permission}"]`);
        return cb.checked ? permission : '-';
    }).join('');
}

function applySpecialSymbols(ownerText, groupText, othersText) {
    const owner = ownerText.split('');
    const group = groupText.split('');
    const others = othersText.split('');

    if (suid.checked) owner[2] = owner[2] === 'x' ? 's' : 'S';
    if (sgid.checked) group[2] = group[2] === 'x' ? 's' : 'S';
    if (sticky.checked) others[2] = others[2] === 'x' ? 't' : 'T';

    return owner.join('') + group.join('') + others.join('');
}

function getSymbolicAssignment(group, prefix) {
    const permissions = ['r', 'w', 'x'].filter(permission => {
        return document.querySelector(`.permission[data-group="${group}"][data-permission="${permission}"]`).checked;
    }).join('');
    return `${prefix}=${permissions}`;
}

function getSpecialPermissionValue() {
    return (suid.checked ? 4 : 0) + (sgid.checked ? 2 : 0) + (sticky.checked ? 1 : 0);
}

function safeName() {
    return resourceName.value.trim() || 'archivo';
}

function updatePermissions() {
    const owner = calculateGroup('owner');
    const group = calculateGroup('group');
    const others = calculateGroup('others');
    const special = getSpecialPermissionValue();

    document.getElementById('ownerValue').textContent = owner;
    document.getElementById('groupValue').textContent = group;
    document.getElementById('othersValue').textContent = others;

    const normalOctal = `${owner}${group}${others}`;
    const fullOctal = special > 0 ? `${special}${normalOctal}` : normalOctal;
    octalResult.textContent = fullOctal;

    const symbolic = applySpecialSymbols(
        getGroupText('owner'),
        getGroupText('group'),
        getGroupText('others')
    );
    symbolicResult.textContent = symbolic;

    commandResult.textContent = `chmod ${fullOctal} ${safeName()}`;
    symbolicCommand.textContent = `chmod ${getSymbolicAssignment('owner', 'u')},${getSymbolicAssignment('group', 'g')},${getSymbolicAssignment('others', 'o')} ${safeName()}`;

    updateSpecialInfo();
    analyzeRisk(owner, group, others, special);
}

function updateSpecialInfo() {
    const active = [];
    if (suid.checked) active.push('<strong>SUID:</strong> cambia el UID efectivo al del propietario al ejecutar (si el sistema/filesystem lo permite).');
    if (sgid.checked) active.push('<strong>SGID:</strong> en directorios facilita que los archivos nuevos mantengan el grupo compartido.');
    if (sticky.checked) active.push('<strong>Sticky:</strong> útil en directorios escribibles por varios usuarios para restringir borrados/renombres ajenos.');

    specialPermissionInfo.innerHTML = active.length
        ? active.join('<br>')
        : 'No hay permisos especiales activos. El resultado usa el formato octal normal de tres dígitos.';
}

function analyzeRisk(owner, group, others, special) {
    riskMessage.className = 'risk-message';
    const groupWrite = (group & 2) === 2;
    const othersWrite = (others & 2) === 2;

    if (owner === 7 && group === 7 && others === 7 && special === 0) {
        riskMessage.classList.add('risk-danger');
        riskMessage.innerHTML = '<strong>⚠ Permiso muy abierto (777).</strong><br>Todos pueden leer, escribir y ejecutar. Antes de usarlo, revisa si Group y Others realmente necesitan escritura.';
        return;
    }

    if (othersWrite && sticky.checked && (resourceType.value === 'directory' || resourceType.value === 'shared-directory' || resourceType.value === 'custom')) {
        riskMessage.classList.add('risk-warning');
        riskMessage.innerHTML = '<strong>⚠ Escritura para Others.</strong> El Sticky Bit reduce el riesgo de borrar/renombrar entradas ajenas en directorios, pero el recurso sigue siendo ampliamente escribible.';
        return;
    }

    if (othersWrite) {
        riskMessage.classList.add('risk-danger');
        riskMessage.innerHTML = '<strong>⚠ Riesgo alto:</strong> Others tiene permiso de escritura. Esto permite modificaciones por usuarios fuera del propietario y grupo.';
        return;
    }

    if (suid.checked) {
        riskMessage.classList.add('risk-warning');
        riskMessage.innerHTML = '<strong>⚠ SUID habilitado.</strong> En ejecutables puede elevar el impacto de una vulnerabilidad. Úsalo solo cuando esté justificado y controla propietario/contenido del binario.';
        return;
    }

    if (groupWrite || sgid.checked || sticky.checked) {
        riskMessage.classList.add('risk-warning');
        riskMessage.innerHTML = '<strong>ℹ Revisión recomendada:</strong> hay permisos de colaboración o bits especiales activos. Confirma que el grupo y el comportamiento especial sean intencionales.';
        return;
    }

    riskMessage.classList.add('risk-safe');
    riskMessage.innerHTML = '<strong>✓ Configuración razonable.</strong> No se detecta escritura abierta para Others ni permisos especiales de mayor impacto.';
}

function updateSymbolicBuilder() {
    const operator = document.querySelector('input[name="symbolicOperator"]:checked').value;
    const selectedPermissions = [...symbolicPermissions].filter(cb => cb.checked).map(cb => cb.value).join('');
    let targets = targetAll.checked
        ? 'a'
        : [...symbolicTargets].filter(cb => cb.checked).map(cb => cb.value).join('');

    symbolicBuilderHint.className = 'builder-hint';

    if (!targets) {
        symbolicBuilderCommand.textContent = 'Selecciona al menos un destinatario';
        symbolicBuilderHint.classList.add('error');
        symbolicBuilderHint.textContent = 'Debes elegir Owner, Group, Others o Todos.';
        copySymbolicButton.disabled = true;
        return;
    }

    if (!selectedPermissions && operator !== '=') {
        symbolicBuilderCommand.textContent = 'Selecciona al menos un permiso';
        symbolicBuilderHint.classList.add('error');
        symbolicBuilderHint.textContent = `La operación ${operator} necesita al menos r, w o x.`;
        copySymbolicButton.disabled = true;
        return;
    }

    const expression = `${targets}${operator}${selectedPermissions}`;
    symbolicBuilderCommand.textContent = `chmod ${expression} ${safeName()}`;
    copySymbolicButton.disabled = false;

    const operationText = operator === '+' ? 'agregará' : operator === '-' ? 'quitará' : 'dejará exactamente';
    const permissionText = selectedPermissions || 'ningún permiso';
    symbolicBuilderHint.innerHTML = `<strong>${expression}</strong> ${operationText} <strong>${permissionText}</strong> para <strong>${targets}</strong>. ${operator === '=' ? 'Con = se reemplazan los permisos de esa clase.' : 'Los demás bits quedan sin cambios.'}`;
}

async function copyText(button, text) {
    try {
        await navigator.clipboard.writeText(text);
        const original = button.textContent;
        button.textContent = 'Copiado ✓';
        setTimeout(() => { button.textContent = original; }, 1400);
    } catch (error) {
        alert('No fue posible copiar el comando.');
    }
}

copyButton.addEventListener('click', () => copyText(copyButton, commandResult.textContent));
copySymbolicButton.addEventListener('click', () => copyText(copySymbolicButton, symbolicBuilderCommand.textContent));

applyPreset();
updateSymbolicBuilder();
