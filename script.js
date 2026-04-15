const canvas = document.getElementById('mainCanvas');
const ctx = canvas.getContext('2d');
const bgInput = document.getElementById('bgInput');
const logoInput = document.getElementById('logoInput');

let bgFiles = [];
let currentIdx = 0;
let logoImg = null;
let currentPreviewImg = null;

// Helper: Load Image
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

// Slider Updates
document.getElementById('sizeSlider').oninput = (e) => {
    document.getElementById('sizeVal').innerText = e.target.value + "%";
    draw();
};
document.getElementById('opacitySlider').oninput = (e) => {
    document.getElementById('opacityVal').innerText = e.target.value + "%";
    draw();
};

// Re-draw on any setting change
document.querySelectorAll('input, select').forEach(el => el.onchange = draw);

bgInput.onchange = async (e) => {
    bgFiles = Array.from(e.target.files);
    document.getElementById('fileCount').innerText = `${bgFiles.length} រូបភាពបានជ្រើសរើស`;
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

// Navigation
document.getElementById('nextBtn').onclick = () => {
    if (currentIdx < bgFiles.length - 1) { currentIdx++; loadCurrentImg(); }
};
document.getElementById('prevBtn').onclick = () => {
    if (currentIdx > 0) { currentIdx--; loadCurrentImg(); }
};

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
        const sizePct = document.getElementById('sizeSlider').value / 100;
        const opacity = document.getElementById('opacitySlider').value / 100;
        const mX = parseInt(document.getElementById('marginX').value) || 0;
        const mY = parseInt(document.getElementById('marginY').value) || 0;
        const pos = document.getElementById('position').value;

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

        tCtx.globalAlpha = opacity;
        tCtx.drawImage(logo, x, y, lW, lH);
        tCtx.globalAlpha = 1.0;
    }
}

// ZIP LOGIC
document.getElementById('downloadBtn').onclick = async () => {
    if (bgFiles.length === 0 || !logoImg) return alert("សូមជ្រើសរើសរូបភាព និង Logo!");

    const btn = document.getElementById('downloadBtn');
    btn.disabled = true;
    btn.innerText = "កំពុងហាប់ឯកសារ...";

    const zip = new JSZip();
    const offCanvas = document.createElement('canvas');

    for (let i = 0; i < bgFiles.length; i++) {
        const img = await loadImage(bgFiles[i]);
        render(offCanvas, img, logoImg);
        const data = offCanvas.toDataURL('image/jpeg', 0.9).split(',')[1];
        zip.file(`LogoAdder_${i+1}.jpg`, data, {base64: true});
        document.getElementById('progressBar').value = ((i+1)/bgFiles.length)*100;
    }

    const blob = await zip.generateAsync({type: "blob"});
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = "Exported_Images.zip";
    link.click();

    btn.disabled = false;
    btn.innerText = "ចាប់ផ្ដើមដំណើរការ";
};