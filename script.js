/**
 * LogoAdder Pro - Ultra Persistence Version
 * Features: LocalStorage Sync, Persistent Logo Data, Batch Processing, GA4 Tracking, Opacity Control
 */

const canvas = document.getElementById('mainCanvas');
const ctx = canvas.getContext('2d');
const bgInput = document.getElementById('bgInput');
const logoInput = document.getElementById('logoInput');
const resultsGallery = document.getElementById('resultsGallery');
const resultsSection = document.getElementById('results-section');
const zipContainer = document.getElementById('zipDownloadContainer');
const posButtons = document.querySelectorAll('.pos-btn');
const hiddenPosInput = document.getElementById('position');

let bgFiles = [];
let currentIdx = 0;
let logoImg = null;
let currentPreviewImg = null;
let currentZipBlob = null;

// --- 1. CONFIGURATION & LOGO PERSISTENCE ---

function saveConfig(logoBase64 = null) {
    const config = {
        marginX: document.getElementById('marginX').value,
        marginY: document.getElementById('marginY').value,
        size: document.getElementById('sizeSlider').value,
        opacity: document.getElementById('logo-opacity').value, // ADDED OPACITY
        position: hiddenPosInput.value
    };
    
    // Save settings
    localStorage.setItem('logoAdderConfig_v2', JSON.stringify(config));
    
    // Save Logo Data if provided
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
        
        // LOAD OPACITY
        if (config.opacity !== undefined) {
            document.getElementById('logo-opacity').value = config.opacity;
            document.getElementById('opacity-val').innerText = config.opacity + "%";
        }

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

// --- 2. IMAGE UTILITIES ---

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

// --- 3. UI INTERACTION ---

function updatePositionUI(val) {
    hiddenPosInput.value = val;
    posButtons.forEach(b => {
        b.classList.toggle('active', b.getAttribute('data-value') === val);
    });
}

posButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        updatePositionUI(btn.getAttribute('data-value'));
        saveConfig();
        draw();
    });
});

canvas.addEventListener('click', (e) => {
    if (!currentPreviewImg) return;
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (canvas.width / rect.width);
    const y = (e.clientY - rect.top) * (canvas.height / rect.height);
    const cX = canvas.width * 0.35, cY = canvas.height * 0.35, cW = canvas.width * 0.65, cH = canvas.height * 0.65;

    let newVal = "";
    if (x > cX && x < cW && y > cY && y < cH) newVal = "center";
    else {
        if (x < canvas.width / 2 && y < canvas.height / 2) newVal = "top-left";
        else if (x >= canvas.width / 2 && y < canvas.height / 2) newVal = "top-right";
        else if (x < canvas.width / 2 && y >= canvas.height / 2) newVal = "bottom-left";
        else if (x >= canvas.width / 2 && y >= canvas.height / 2) newVal = "bottom-right";
    }
    updatePositionUI(newVal);
    saveConfig();
    draw();
});

// SIZE SLIDER
document.getElementById('sizeSlider').oninput = (e) => {
    document.getElementById('sizeVal').innerText = e.target.value + "%";
    saveConfig();
    draw();
};

// OPACITY SLIDER (ADDED)
document.getElementById('logo-opacity').oninput = (e) => {
    document.getElementById('opacity-val').innerText = e.target.value + "%";
    saveConfig();
    draw();
};

document.querySelectorAll('.fancy-input').forEach(el => {
    el.addEventListener('input', () => { saveConfig(); draw(); });
});

// --- 4. CORE RENDERING ---

function render(targetCanvas, bg, logo) {
    const tCtx = targetCanvas.getContext('2d');
    targetCanvas.width = bg.width;
    targetCanvas.height = bg.height;
    tCtx.drawImage(bg, 0, 0, targetCanvas.width, targetCanvas.height);
    if (logo) {
        const smartM = Math.min(targetCanvas.width, targetCanvas.height) * 0.01;
        const mX = (parseInt(document.getElementById('marginX').value) || 0) + smartM;
        const mY = (parseInt(document.getElementById('marginY').value) || 0) + smartM;
        const sizePct = document.getElementById('sizeSlider').value / 100;
        const opacityPct = document.getElementById('logo-opacity').value / 100; // ADDED
        const pos = hiddenPosInput.value;
        const lW = targetCanvas.width * sizePct;
        const lH = (logo.height / logo.width) * lW;
        
        let x = mX, y = mY;
        if (pos === "top-right") x = targetCanvas.width - lW - mX;
        else if (pos === "bottom-left") y = targetCanvas.height - lH - mY;
        else if (pos === "bottom-right") { x = targetCanvas.width - lW - mX; y = targetCanvas.height - lH - mY; }
        else if (pos === "center") { x = (targetCanvas.width - lW) / 2; y = (targetCanvas.height - lH) / 2; }
        
        // APPLY OPACITY
        tCtx.save();
        tCtx.globalAlpha = document.getElementById('logo-opacity').value / 100;
        tCtx.drawImage(logo, x, y, lW, lH);
        tCtx.restore();
    }
}

function draw() { if (currentPreviewImg) render(canvas, currentPreviewImg, logoImg); }

// --- 5. BATCH & EXPORT ---

bgInput.onchange = async (e) => {
    bgFiles = Array.from(e.target.files);
    document.getElementById('fileCount').innerText = `${bgFiles.length} រូបភាពដែលបានជ្រើសរើស`;
    currentIdx = 0;
    if(bgFiles.length > 0) loadCurrentImg();
};

logoInput.onchange = async (e) => {
    if (e.target.files[0]) {
        const reader = new FileReader();
        reader.onload = async (event) => {
            const base64 = event.target.result;
            logoImg = new Image();
            logoImg.onload = () => {
                document.getElementById('logoStatus').innerText = `Logo: ${e.target.files[0].name}`;
                saveConfig(base64); 
                draw();
            };
            logoImg.src = base64;
        };
        reader.readAsDataURL(e.target.files[0]);
    }
};

async function loadCurrentImg() {
    const canvas = document.getElementById('mainCanvas');
    const wrapper = document.querySelector('.canvas-wrapper');
    const placeholder = document.getElementById('canvas-placeholder');
    const nav = document.getElementById('nav-controls');

    if (bgFiles.length > 0) {
        if (placeholder) placeholder.style.display = 'none';
        if (nav) nav.classList.remove('hidden-nav');
        canvas.classList.add('active-canvas');
    }

    // 1. Load the actual image
    currentPreviewImg = await loadImage(bgFiles[currentIdx]);
    
    // 2. Calculate the aspect ratio of the photo
    const imageRatio = currentPreviewImg.height / currentPreviewImg.width;
    
    // 3. Set the canvas internal resolution to match the photo exactly
    canvas.width = currentPreviewImg.width;
    canvas.height = currentPreviewImg.height;

    // 4. Force the wrapper to match the photo's shape
    // This makes the border "hug" the image
    wrapper.style.aspectRatio = `${currentPreviewImg.width} / ${currentPreviewImg.height}`;

    document.getElementById('navStatus').innerText = `${currentIdx + 1} / ${bgFiles.length}`;
    draw();
}

document.getElementById('nextZone').onclick = () => { 
    if (currentIdx < bgFiles.length - 1) { 
        currentIdx++; 
        loadCurrentImg(); 
    } 
};

document.getElementById('prevZone').onclick = () => { 
    if (currentIdx > 0) { 
        currentIdx--; 
        loadCurrentImg(); 
    } 
};

document.getElementById('downloadBtn').onclick = async () => {
    if (bgFiles.length === 0 || !logoImg) return alert("សូមជ្រើសរើសរូបភាព និង Logo!");
    
    gtag('event', 'image_processing_start', { 'event_category': 'engagement', 'event_label': 'Batch Size', 'value': bgFiles.length });

    const btn = document.getElementById('downloadBtn');
    btn.disabled = true; btn.innerText = "កំពុងរៀបចំ...";
    const resultsSection = document.getElementById('results-section');
    resultsSection.style.display = 'block'; 
    resultsGallery.innerHTML = "";
    const zip = new JSZip();
    const offCanvas = document.createElement('canvas');
    const progressContainer = document.querySelector('.export-progress-container');
    const progressFill = document.getElementById('export-progress-fill');
    const progressText = document.getElementById('progress-text');
    const progressCount = document.getElementById('progress-count');

    progressContainer.style.display = 'block';
    for (let i = 0; i < bgFiles.length; i++) {
        const img = await loadImage(bgFiles[i]);
        let w = img.width, h = img.height;
        if (w > 2500) { h = (2500/w)*h; w = 2500; }
        offCanvas.width = w; offCanvas.height = h;
        render(offCanvas, img, logoImg);
        const dataUrl = offCanvas.toDataURL('image/jpeg', 0.85);
        const resultImg = new Image();
        const percent = Math.round(((i + 1) / bgFiles.length) * 100);
        progressFill.style.width = percent + "%";
        progressText.innerText = `កំពុងរៀបចំ... (${percent}%)`;
        progressCount.innerText = `${i + 1} / ${bgFiles.length}`;
        resultImg.src = dataUrl;
        resultImg.className = "result-img";
        resultsGallery.appendChild(resultImg);
        zip.file(`LogoAdder_${i+1}.jpg`, dataUrl.split(',')[1], {base64: true});
    }
    progressText.innerText = "ជោគជ័យ!";
    currentZipBlob = await zip.generateAsync({type: "blob"});
    btn.disabled = false; btn.innerText = "ចាប់ផ្តើមជាថ្មី!";
    zipContainer.style.display = "block";
    resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
};

document.getElementById('finalZipBtn').onclick = () => {
    const link = document.createElement('a');
    link.href = URL.createObjectURL(currentZipBlob);
    link.download = "LogoAdder_Batch.zip";
    link.click();
};

loadConfig();