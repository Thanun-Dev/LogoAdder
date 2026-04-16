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

// Position Button Logic
posButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        updatePositionUI(btn.getAttribute('data-value'));
        draw();
    });
});

function updatePositionUI(val) {
    hiddenPosInput.value = val;
    posButtons.forEach(b => {
        b.classList.toggle('active', b.getAttribute('data-value') === val);
    });
}

canvas.addEventListener('click', (e) => {
    if (!currentPreviewImg) return;
    const rect = canvas.getBoundingClientRect();
    
    // Calculate click coordinates relative to the actual image pixels
    const x = (e.clientX - rect.left) * (canvas.width / rect.width);
    const y = (e.clientY - rect.top) * (canvas.height / rect.height);
    
    // Define the "Center Zone" (Inner 30% of the image)
    const centerXStart = canvas.width * 0.35;
    const centerXEnd = canvas.width * 0.65;
    const centerYStart = canvas.height * 0.35;
    const centerYEnd = canvas.height * 0.65;

    let newVal = "";

    // 1. Check if the click is in the Center first
    if (x > centerXStart && x < centerXEnd && y > centerYStart && y < centerYEnd) {
        newVal = "center";
    } 
    // 2. Otherwise, determine which corner
    else {
        if (x < canvas.width / 2 && y < canvas.height / 2) newVal = "top-left";
        else if (x >= canvas.width / 2 && y < canvas.height / 2) newVal = "top-right";
        else if (x < canvas.width / 2 && y >= canvas.height / 2) newVal = "bottom-left";
        else if (x >= canvas.width / 2 && y >= canvas.height / 2) newVal = "bottom-right";
    }
    
    updatePositionUI(newVal);
    draw();
});

document.getElementById('sizeSlider').oninput = (e) => {
    document.getElementById('sizeVal').innerText = e.target.value + "%";
    draw();
};

document.querySelectorAll('input').forEach(el => el.onchange = draw);

bgInput.onchange = async (e) => {
    bgFiles = Array.from(e.target.files);
    document.getElementById('fileCount').innerText = `${bgFiles.length} រូបភាពដែលបានជ្រើសរើស`;
    currentIdx = 0;
    if(bgFiles.length > 0) loadCurrentImg();
};

logoInput.onchange = async (e) => {
    if (e.target.files[0]) {
        logoImg = await loadImage(e.target.files[0]);
        document.getElementById('logoStatus').innerText = `Logo: ${e.target.files[0].name}`;
        draw();
    }
};

document.getElementById('nextBtn').onclick = () => { if (currentIdx < bgFiles.length - 1) { currentIdx++; loadCurrentImg(); } };
document.getElementById('prevBtn').onclick = () => { if (currentIdx > 0) { currentIdx--; loadCurrentImg(); } };

async function loadCurrentImg() {
    currentPreviewImg = await loadImage(bgFiles[currentIdx]);
    document.getElementById('navStatus').innerText = `${currentIdx + 1} / ${bgFiles.length}`;
    draw();
}

function draw() {
    if (!currentPreviewImg) return;
    render(canvas, currentPreviewImg, logoImg);
}

function render(targetCanvas, bg, logo) {
    const tCtx = targetCanvas.getContext('2d');
    targetCanvas.width = bg.width;
    targetCanvas.height = bg.height;
    tCtx.drawImage(bg, 0, 0);

    if (logo) {
        // Reduced Smart Margin: Now only 1% for a tighter fit
        const smartM = Math.min(targetCanvas.width, targetCanvas.height) * 0.005;
        
        // Manual inputs from your "Margin X" and "Margin Y" boxes
        const mX = (parseInt(document.getElementById('marginX').value) || 0) + smartM;
        const mY = (parseInt(document.getElementById('marginY').value) || 0) + smartM;

        const sizePct = document.getElementById('sizeSlider').value / 100;
        const pos = hiddenPosInput.value;
        const lW = targetCanvas.width * sizePct;
        const lH = (logo.height / logo.width) * lW;
        
        let x = mX, y = mY;
        if (pos === "top-right") x = targetCanvas.width - lW - mX;
        else if (pos === "bottom-left") y = targetCanvas.height - lH - mY;
        else if (pos === "bottom-right") { 
            x = targetCanvas.width - lW - mX; 
            y = targetCanvas.height - lH - mY; 
        }
        else if (pos === "center") { 
            x = (targetCanvas.width - lW) / 2; 
            y = (targetCanvas.height - lH) / 2; 
        }
        tCtx.drawImage(logo, x, y, lW, lH);
    }
}

document.getElementById('downloadBtn').onclick = async () => {
    if (bgFiles.length === 0 || !logoImg) return alert("សូមជ្រើសរើសរូបភាព និង Logo!");
    const btn = document.getElementById('downloadBtn');
    btn.disabled = true;
    btn.innerText = "កំពុងរៀបចំ...";
    resultsGallery.innerHTML = ""; 
    resultsSection.style.display = "block";
    const zip = new JSZip();
    const offCanvas = document.createElement('canvas');

    for (let i = 0; i < bgFiles.length; i++) {
        const img = await loadImage(bgFiles[i]);
        let w = img.width, h = img.height;
        if (w > 2500) { h = (2500/w)*h; w = 2500; }
        offCanvas.width = w; offCanvas.height = h;
        render(offCanvas, img, logoImg);
        const dataUrl = offCanvas.toDataURL('image/jpeg', 0.85);
        const resultImg = new Image();
        resultImg.src = dataUrl;
        resultImg.className = "result-img";
        resultsGallery.appendChild(resultImg);
        zip.file(`LogoAdder_${i+1}.jpg`, dataUrl.split(',')[1], {base64: true});
        document.getElementById('progressBar').value = ((i+1)/bgFiles.length)*100;
    }
    currentZipBlob = await zip.generateAsync({type: "blob"});
    btn.disabled = false; btn.innerText = "ចាប់ផ្តើមជាថ្មី!";
    zipContainer.style.display = "block";
};

document.getElementById('finalZipBtn').onclick = () => {
    const link = document.createElement('a');
    link.href = URL.createObjectURL(currentZipBlob);
    link.download = "LogoAdder_Results.zip";
    link.click();
};