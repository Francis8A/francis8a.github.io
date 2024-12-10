function loadTool(toolUrl) {
    const modal = document.getElementById('tool-modal');
    const iframe = document.getElementById('tool-frame');
    iframe.src = toolUrl;
    modal.style.display = 'flex';
}

function closeModal() {
    const modal = document.getElementById('tool-modal');
    modal.style.display = 'none';
    document.getElementById('tool-frame').src = '';
}
