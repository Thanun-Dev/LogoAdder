/**
 * LogoAdder Pro - Tactical Build
 * Logic: PERSISTENCE | BATCH PROCESSING | DRAG & DROP | HUD NAV
 */

// ==========================================
// SECTOR 1: CONSTANTS & STATE
// ==========================================
const canvas = document.getElementById('mainCanvas');
const ctx = canvas.getContext('2d');
const bgInput = document.getElementById('bgInput');
const logoInput = document.getElementById('logoInput');
const resultsGallery = document.getElementById('resultsGallery');
const resultsSection = document.getElementById('results-section');
const zipContainer = document.getElementById('zipDownloadContainer');
const posButtons = document.querySelectorAll('.pos-btn');
const hiddenPosInput = document.getElementById('position');
const dropOverlay = document.getElementById('drop-overlay');

let bgFiles = [];
let currentIdx = 0;
let logoImg = null;
let currentPreviewImg = null;
let currentZipBlob = null;

// ==========================================
// SECTOR 2: CONFIGURATION & PERSISTENCE
// ==========================================
function saveConfig(logoBase64 = null) {
    const config = {
        marginX: document.getElementById('marginX').value,
        marginY: document.getElementById('marginY').value,
        size: document.getElementById('sizeSlider').value,
        opacity: document.getElementById('logo-opacity').value,
        position: hiddenPosInput.value
    };

    localStorage.setItem('logoAdderConfig_v2', JSON.stringify(config));

    if (logoBase64) {
        localStorage.setItem('logoAdder_PersistentLogo', logoBase64);
    }
}

async function loadConfig() {
    const saved = localStorage.getItem('logoAdderConfig_v2');
    const savedLogo = localStorage.getItem('logoAdder_PersistentLogo');

    if (saved) {
        const config = JSON.parse(saved);
        document.getElementById('marginX').value = config.marginX;
        document.getElementById('marginY').value = config.marginY;
        document.getElementById('sizeSlider').value = config.size;
        document.getElementById('sizeVal').innerText = config.size + "%";
        document.getElementById('logo-opacity').value = config.opacity;
        document.getElementById('opacity-val').innerText = config.opacity + "%";
        updatePositionUI(config.position);
    }

    if (savedLogo) {
        logoImg = new Image();
        logoImg.onload = () => {
            document.getElementById('logoStatus').innerText = "Logo: បញ្ចូលស្វ័យប្រវត្តិ (Auto-Loaded)";
            draw();
        };
        logoImg.src = savedLogo;
    }
}

// ==========================================
// SECTOR 3: IMAGE HANDLING & DRAG-DROP
// ==========================================
function loadImage(file) {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    });
}

// Global Drag and Drop Listeners
window.addEventListener('dragover', (e) => {
    e.preventDefault();
    if (dropOverlay) dropOverlay.style.display = 'flex';
});

window.addEventListener('dragleave', (e) => {
    if (e.relatedTarget === null && dropOverlay) {
        dropOverlay.style.display = 'none';
    }
});

window.addEventListener('drop', async (e) => {
    e.preventDefault();
    if (dropOverlay) dropOverlay.style.display = 'none';

    const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
    if (files.length > 0) {
        bgFiles = files;
        handleFileSelection();
    }
});

bgInput.onchange = (e) => {
    bgFiles = Array.from(e.target.files);
    handleFileSelection();
};

function handleFileSelection() {
    document.getElementById('fileCount').innerText = `${bgFiles.length} រូបភាពដែលបានជ្រើសរើស`;
    currentIdx = 0;
    if (bgFiles.length > 0) loadCurrentImg();
}

// ==========================================
// SECTOR 4: CORE RENDERING ENGINE
// ==========================================
function render(targetCanvas, bg, logo) {
    const tCtx = targetCanvas.getContext('2d');
    targetCanvas.width = bg.width;
    targetCanvas.height = bg.height;
    tCtx.drawImage(bg, 0, 0);

    if (logo) {
        const smartM = Math.min(targetCanvas.width, targetCanvas.height) * 0.01;
        const mX = (parseInt(document.getElementById('marginX').value) || 0) + smartM;
        const mY = (parseInt(document.getElementById('marginY').value) || 0) + smartM;
        const sizePct = document.getElementById('sizeSlider').value / 100;
        const opacityPct = document.getElementById('logo-opacity').value / 100;
        const pos = hiddenPosInput.value;
        
        const lW = targetCanvas.width * sizePct;
        const lH = (logo.height / logo.width) * lW;

        let x = mX, y = mY;

        if (pos === "top-right") x = targetCanvas.width - lW - mX;
        else if (pos === "bottom-left") y = targetCanvas.height - lH - mY;
        else if (pos === "bottom-right") {
            x = targetCanvas.width - lW - mX;
            y = targetCanvas.height - lH - mY;
        } else if (pos === "center") {
            x = (targetCanvas.width - lW) / 2;
            y = (targetCanvas.height - lH) / 2;
        }

        tCtx.save();
        tCtx.globalAlpha = opacityPct;
        tCtx.drawImage(logo, x, y, lW, lH);
        tCtx.restore();
    }
}

function draw() {
    if (currentPreviewImg) render(canvas, currentPreviewImg, logoImg);
}

// ==========================================
// SECTOR 5: UI CONTROLLERS
// ==========================================
function updatePositionUI(val) {
    hiddenPosInput.value = val;
    posButtons.forEach(b => b.classList.toggle('active', b.getAttribute('data-value') === val));
}

posButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        updatePositionUI(btn.getAttribute('data-value'));
        saveConfig();
        draw();
    });
});

document.getElementById('sizeSlider').oninput = (e) => {
    document.getElementById('sizeVal').innerText = e.target.value + "%";
    saveConfig();
    draw();
};

document.getElementById('logo-opacity').oninput = (e) => {
    document.getElementById('opacity-val').innerText = e.target.value + "%";
    saveConfig();
    draw();
};

document.querySelectorAll('.fancy-input').forEach(el => {
    el.addEventListener('input', () => { saveConfig(); draw(); });
});

// ==========================================
// SECTOR 6: BATCH EXPORT & NAVIGATION
// ==========================================
async function loadCurrentImg() {
    const placeholder = document.getElementById('canvas-placeholder');
    const nav = document.getElementById('nav-controls');

    if (bgFiles.length > 0) {
        if (placeholder) placeholder.style.display = 'none';
        if (nav) nav.classList.remove('hidden-nav');
        canvas.classList.add('active-canvas');
    }

    currentPreviewImg = await loadImage(bgFiles[currentIdx]);
    document.getElementById('navStatus').innerText = `${currentIdx + 1} / ${bgFiles.length}`;
    draw();
}

document.getElementById('nextZone').onclick = () => {
    if (currentIdx < bgFiles.length - 1) { currentIdx++; loadCurrentImg(); }
};

document.getElementById('prevZone').onclick = () => {
    if (currentIdx > 0) { currentIdx--; loadCurrentImg(); }
};

document.getElementById('downloadBtn').onclick = async () => {
    if (bgFiles.length === 0 || !logoImg) return alert("សូមជ្រើសរើសរូបភាព និង Logo!");

    const btn = document.getElementById('downloadBtn');
    btn.disabled = true;
    btn.innerText = "កំពុងរៀបចំ...";

    resultsSection.style.display = 'block';
    resultsGallery.innerHTML = "";

    const zip = new JSZip();
    const offCanvas = document.createElement('canvas');
    const progressContainer = document.querySelector('.export-progress-container');
    const progressFill = document.getElementById('export-progress-fill');
    
    progressContainer.style.display = 'block';

    for (let i = 0; i < bgFiles.length; i++) {
        const img = await loadImage(bgFiles[i]);
        let w = img.width, h = img.height;
        if (w > 2500) { h = (2500 / w) * h; w = 2500; }

        offCanvas.width = w; offCanvas.height = h;
        render(offCanvas, img, logoImg);

        const dataUrl = offCanvas.toDataURL('image/jpeg', 0.85);
        const percent = Math.round(((i + 1) / bgFiles.length) * 100);

        progressFill.style.width = percent + "%";
        document.getElementById('progress-text').innerText = `កំពុងរៀបចំ... (${percent}%)`;
        document.getElementById('progress-count').innerText = `${i + 1} / ${bgFiles.length}`;

        const resultImg = new Image();
        resultImg.src = dataUrl;
        resultImg.className = "result-img";
        resultImg.draggable = false;
        resultsGallery.appendChild(resultImg);

        zip.file(`LogoAdder_${i + 1}.jpg`, dataUrl.split(',')[1], { base64: true });
    }

    currentZipBlob = await zip.generateAsync({ type: "blob" });
    btn.disabled = false;
    btn.innerText = "ចាប់ផ្តើមជាថ្មី!";
    zipContainer.style.display = "block";
    resultsSection.scrollIntoView({ behavior: 'smooth' });
};

document.getElementById('finalZipBtn').onclick = () => {
    const link = document.createElement('a');
    link.href = URL.createObjectURL(currentZipBlob);
    link.download = "LogoAdder_Batch.zip";
    link.click();
};

logoInput.onchange = async (e) => {
    if (e.target.files[0]) {
        const reader = new FileReader();
        reader.onload = (event) => {
            logoImg = new Image();
            logoImg.onload = () => {
                document.getElementById('logoStatus').innerText = `Logo: ${e.target.files[0].name}`;
                saveConfig(event.target.result);
                draw();
            };
            logoImg.src = event.target.result;
        };
        reader.readAsDataURL(e.target.files[0]);
    }
};

// Initial Load
loadConfig();