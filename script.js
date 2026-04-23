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
const ui = {
    canvasPlaceholder: document.getElementById('canvas-placeholder'),
    changeSaveFolderBtn: document.getElementById('changeSaveFolderBtn'),
    downloadBtn: document.getElementById('downloadBtn'),
    exportProgressContainer: document.querySelector('.export-progress-container'),
    fileCount: document.getElementById('fileCount'),
    finalZipBtn: document.getElementById('finalZipBtn'),
    logoOpacity: document.getElementById('logo-opacity'),
    logoStatus: document.getElementById('logoStatus'),
    marginX: document.getElementById('marginX'),
    marginY: document.getElementById('marginY'),
    navControls: document.getElementById('nav-controls'),
    navStatus: document.getElementById('navStatus'),
    opacityVal: document.getElementById('opacity-val'),
    progressCount: document.getElementById('progress-count'),
    progressFill: document.getElementById('export-progress-fill'),
    progressText: document.getElementById('progress-text'),
    sizeSlider: document.getElementById('sizeSlider'),
    sizeVal: document.getElementById('sizeVal')
};

let bgFiles = [];
let currentIdx = 0;
let logoImg = null;
let currentPreviewImg = null;
let currentZipDownloads = [];
let resultPreviewUrls = [];
let mobileShareState = null;
let renderedPreviewCount = 0;
let androidSaveDirectoryHandle = null;

const MAX_OUTPUT_PIXELS = 4000000;
const ZIP_CHUNK_SIZE = 5;
const MOBILE_SHARE_BATCH_SIZE = 10;
const RESULT_PREVIEW_PAGE_SIZE = 20;
const AUTO_DOWNLOAD_THRESHOLD = 20;
const DIRECTORY_DB_NAME = "logoAdderDirectoryAccess";
const DIRECTORY_STORE_NAME = "handles";
const DIRECTORY_HANDLE_KEY = "androidSaveDirectory";

// ==========================================
// SECTOR 2: CONFIGURATION & PERSISTENCE
// ==========================================
function saveConfig(logoBase64 = null) {
    const config = {
        marginX: ui.marginX.value,
        marginY: ui.marginY.value,
        size: ui.sizeSlider.value,
        opacity: ui.logoOpacity.value,
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
        ui.marginX.value = config.marginX;
        ui.marginY.value = config.marginY;
        ui.sizeSlider.value = config.size;
        ui.sizeVal.innerText = config.size + "%";
        ui.logoOpacity.value = config.opacity;
        ui.opacityVal.innerText = config.opacity + "%";
        updatePositionUI(config.position);
    }

    if (savedLogo) {
        logoImg = new Image();
        logoImg.onload = () => {
            ui.logoStatus.innerText = "Logo: បញ្ចូលស្វ័យប្រវត្តិ (Auto-Loaded)";
            draw();
        };
        logoImg.src = savedLogo;
    }
}

// ==========================================
// SECTOR 3: IMAGE HANDLING & DRAG-DROP
// ==========================================
function loadImage(file) {
    return loadImageFromBlob(file, file.name).catch(async (error) => {
        if (!isHeicFile(file)) {
            throw error;
        }

        const convertedBlob = await convertHeicToJpegBlob(file);
        return loadImageFromBlob(convertedBlob, file.name);
    });
}

function isHeicFile(file) {
    const fileName = file && file.name ? file.name.toLowerCase() : "";
    const fileType = file && file.type ? file.type.toLowerCase() : "";

    return (
        fileType === "image/heic" ||
        fileType === "image/heif" ||
        fileName.endsWith(".heic") ||
        fileName.endsWith(".heif")
    );
}

function loadImageFromBlob(blob, sourceName = "image") {
    return new Promise((resolve, reject) => {
        const url = URL.createObjectURL(blob);
        const img = new Image();

        img.onload = () => {
            URL.revokeObjectURL(url);
            resolve(img);
        };

        img.onerror = () => {
            URL.revokeObjectURL(url);
            reject(new Error(`Image load failed: ${sourceName}`));
        };

        img.src = url;
    });
}

async function convertHeicToJpegBlob(file) {
    try {
        const converted = await heic2any({
            blob: file,
            toType: "image/jpeg",
            quality: 0.9
        });

        if (Array.isArray(converted)) {
            return converted[0];
        }

        return converted;
    } catch (error) {
        throw new Error(`HEIC conversion failed: ${file.name}`);
    }
}

function openDirectoryHandleDb() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DIRECTORY_DB_NAME, 1);

        request.onupgradeneeded = () => {
            const db = request.result;
            if (!db.objectStoreNames.contains(DIRECTORY_STORE_NAME)) {
                db.createObjectStore(DIRECTORY_STORE_NAME);
            }
        };

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error || new Error("IndexedDB open failed"));
    });
}

async function savePersistedDirectoryHandle(handle) {
    const db = await openDirectoryHandleDb();

    return new Promise((resolve, reject) => {
        const transaction = db.transaction(DIRECTORY_STORE_NAME, "readwrite");
        transaction.objectStore(DIRECTORY_STORE_NAME).put(handle, DIRECTORY_HANDLE_KEY);
        transaction.oncomplete = () => {
            db.close();
            resolve();
        };
        transaction.onerror = () => {
            db.close();
            reject(transaction.error || new Error("Directory handle save failed"));
        };
    });
}

async function loadPersistedDirectoryHandle() {
    const db = await openDirectoryHandleDb();

    return new Promise((resolve, reject) => {
        const transaction = db.transaction(DIRECTORY_STORE_NAME, "readonly");
        const request = transaction.objectStore(DIRECTORY_STORE_NAME).get(DIRECTORY_HANDLE_KEY);

        request.onsuccess = () => {
            db.close();
            resolve(request.result || null);
        };
        request.onerror = () => {
            db.close();
            reject(request.error || new Error("Directory handle load failed"));
        };
    });
}

async function clearPersistedDirectoryHandle() {
    const db = await openDirectoryHandleDb();

    return new Promise((resolve, reject) => {
        const transaction = db.transaction(DIRECTORY_STORE_NAME, "readwrite");
        transaction.objectStore(DIRECTORY_STORE_NAME).delete(DIRECTORY_HANDLE_KEY);
        transaction.oncomplete = () => {
            db.close();
            resolve();
        };
        transaction.onerror = () => {
            db.close();
            reject(transaction.error || new Error("Directory handle delete failed"));
        };
    });
}

function isSupportedImageFile(file) {
    return Boolean(
        (file.type && file.type.startsWith('image/')) ||
        isHeicFile(file)
    );
}

function getOutputSize(width, height) {
    const pixels = width * height;
    if (pixels <= MAX_OUTPUT_PIXELS) return { width, height };

    const scale = Math.sqrt(MAX_OUTPUT_PIXELS / pixels);
    return {
        width: Math.round(width * scale),
        height: Math.round(height * scale)
    };
}

function canvasToJpegBlob(targetCanvas, quality = 0.85) {
    return new Promise((resolve, reject) => {
        targetCanvas.toBlob((blob) => {
            if (blob) resolve(blob);
            else reject(new Error("Canvas export failed"));
        }, "image/jpeg", quality);
    });
}

async function canvasToThumbnailBlob(sourceCanvas) {
    const maxThumbWidth = 360;
    const scale = Math.min(1, maxThumbWidth / sourceCanvas.width);
    const thumbCanvas = document.createElement('canvas');

    thumbCanvas.width = Math.max(1, Math.round(sourceCanvas.width * scale));
    thumbCanvas.height = Math.max(1, Math.round(sourceCanvas.height * scale));
    thumbCanvas
        .getContext('2d')
        .drawImage(sourceCanvas, 0, 0, thumbCanvas.width, thumbCanvas.height);

    const blob = await canvasToJpegBlob(thumbCanvas, 0.7);
    resetCanvas(thumbCanvas);

    return blob;
}

function yieldToBrowser() {
    return new Promise((resolve) => setTimeout(resolve, 0));
}

function cleanupObjectUrls(urls) {
    urls.forEach((url) => URL.revokeObjectURL(url));
    urls.length = 0;
}

function resetCanvas(targetCanvas) {
    const targetCtx = targetCanvas.getContext('2d');
    targetCtx.clearRect(0, 0, targetCanvas.width, targetCanvas.height);
    targetCanvas.width = 0;
    targetCanvas.height = 0;
}

function downloadBlobUrl(url, fileName) {
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
}

function scheduleUrlRevoke(url) {
    setTimeout(() => URL.revokeObjectURL(url), 30000);
}

function getSourceFileStem(file) {
    const sourceName = file && file.name ? file.name : "image";
    const lastDotIndex = sourceName.lastIndexOf(".");

    if (lastDotIndex <= 0) {
        return sourceName;
    }

    return sourceName.slice(0, lastDotIndex);
}

function sanitizeOutputFileStem(stem) {
    return stem
        .replace(/[<>:"/\\|?*]/g, "_")
        .replace(/\s+/g, " ")
        .trim() || "image";
}

function getMobileOutputFileName(file) {
    const safeStem = sanitizeOutputFileStem(getSourceFileStem(file));
    return `${safeStem}.jpg`;
}

function splitOutputFileName(fileName) {
    const lastDotIndex = fileName.lastIndexOf(".");
    if (lastDotIndex <= 0) {
        return { stem: fileName, extension: "" };
    }

    return {
        stem: fileName.slice(0, lastDotIndex),
        extension: fileName.slice(lastDotIndex)
    };
}

function buildNumberedFileName(fileName, index) {
    const { stem, extension } = splitOutputFileName(fileName);
    return index === 0 ? fileName : `${stem} (${index})${extension}`;
}

async function resolveAvailableDirectoryFileName(directoryHandle, fileName) {
    for (let index = 0; index < 10000; index++) {
        const candidateName = buildNumberedFileName(fileName, index);

        try {
            await directoryHandle.getFileHandle(candidateName, { create: false });
        } catch (error) {
            if (error.name === "NotFoundError") {
                return candidateName;
            }

            throw error;
        }
    }

    throw new Error("Could not resolve a unique file name");
}

function isAndroidChrome() {
    const userAgent = navigator.userAgent || "";
    const isAndroid = /Android/i.test(userAgent);
    const isIOS = /iPhone|iPad|iPod/i.test(userAgent);
    const isChrome = /Chrome\//i.test(userAgent) && !/EdgA|OPR|SamsungBrowser/i.test(userAgent);

    return isAndroid && isChrome && !isIOS;
}

function isMobileDevice() {
    return window.matchMedia('(pointer: coarse)').matches || window.innerWidth <= 768;
}

function canUseAndroidFolderSave() {
    return Boolean(
        isAndroidChrome() &&
        window.showDirectoryPicker &&
        window.FileSystemFileHandle &&
        window.FileSystemDirectoryHandle
    );
}

function setAndroidFolderButtonVisibility() {
    if (!ui.changeSaveFolderBtn) {
        return;
    }

    ui.changeSaveFolderBtn.style.display = canUseAndroidFolderSave() ? "block" : "none";
}

async function queryDirectoryPermission(directoryHandle) {
    if (!directoryHandle || !directoryHandle.queryPermission) {
        return "prompt";
    }

    return directoryHandle.queryPermission({ mode: "readwrite" });
}

async function requestDirectoryPermission(directoryHandle) {
    if (!directoryHandle || !directoryHandle.requestPermission) {
        return "denied";
    }

    return directoryHandle.requestPermission({ mode: "readwrite" });
}

async function restorePersistedAndroidDirectoryHandle() {
    if (androidSaveDirectoryHandle) {
        return androidSaveDirectoryHandle;
    }

    try {
        const handle = await loadPersistedDirectoryHandle();
        if (!handle) {
            return null;
        }

        androidSaveDirectoryHandle = handle;
        return handle;
    } catch (error) {
        return null;
    }
}

function canShareFiles(files) {
    try {
        return Boolean(
            navigator.share &&
            navigator.canShare &&
            navigator.canShare({ files })
        );
    } catch (error) {
        return false;
    }
}

function addResultPreview(blob) {
    const previewUrl = URL.createObjectURL(blob);
    resultPreviewUrls.push(previewUrl);

    renderResultPreviewPage();
}

function ensureShowMoreButton() {
    let showMoreBtn = document.getElementById('showMoreResultsBtn');

    if (!showMoreBtn) {
        showMoreBtn = document.createElement('button');
        showMoreBtn.type = 'button';
        showMoreBtn.id = 'showMoreResultsBtn';
        showMoreBtn.className = 'show-more-btn';
        showMoreBtn.onclick = () => renderResultPreviewPage(true);
        resultsGallery.insertAdjacentElement('afterend', showMoreBtn);
    }

    return showMoreBtn;
}

function renderResultPreviewPage(showMore = false) {
    if (showMore) {
        renderedPreviewCount = Math.min(
            renderedPreviewCount + RESULT_PREVIEW_PAGE_SIZE,
            resultPreviewUrls.length
        );
    } else {
        renderedPreviewCount = Math.min(
            Math.max(renderedPreviewCount, Math.min(RESULT_PREVIEW_PAGE_SIZE, resultPreviewUrls.length)),
            resultPreviewUrls.length
        );
    }

    while (resultsGallery.children.length < renderedPreviewCount) {
        const previewUrl = resultPreviewUrls[resultsGallery.children.length];
        const resultImg = new Image();

        resultImg.src = previewUrl;
        resultImg.className = "result-img";
        resultImg.draggable = false;
        resultsGallery.appendChild(resultImg);
    }

    updateShowMoreButton();
}

function updateShowMoreButton() {
    const showMoreBtn = ensureShowMoreButton();
    const remainingCount = resultPreviewUrls.length - renderedPreviewCount;

    showMoreBtn.style.display = remainingCount > 0 ? "block" : "none";
    showMoreBtn.innerText = remainingCount > 0
        ? `Show More (${Math.min(RESULT_PREVIEW_PAGE_SIZE, remainingCount)})`
        : "";
}

async function processImageToBlob(file, offCanvas) {
    const img = await loadImage(file);
    const outputSize = getOutputSize(img.width, img.height);

    render(offCanvas, img, logoImg, outputSize.width, outputSize.height);

    const outputBlob = await canvasToJpegBlob(offCanvas, 0.85);
    const previewBlob = await canvasToThumbnailBlob(offCanvas);
    resetCanvas(offCanvas);

    return { outputBlob, previewBlob };
}

function updateExportProgress(processedCount, totalCount) {
    const percent = Math.round((processedCount / totalCount) * 100);

    ui.progressFill.style.width = percent + "%";
    ui.progressText.innerText = `កំពុងរៀបចំ... (${percent}%)`;
    ui.progressCount.innerText = `${processedCount} / ${totalCount}`;
}

function setPrimaryButtonState(disabled, text) {
    ui.downloadBtn.disabled = disabled;
    ui.downloadBtn.innerText = text;
}

function showProcessingError(error) {
    setPrimaryButtonState(false, "ចាប់ផ្ដើមដំណើរការ");
    ui.progressText.innerText = "មានបញ្ហាក្នុងការរៀបចំរូបភាព";
    alert(error.message || "Image processing failed");
}

async function resetAndroidFolderSaveState() {
    androidSaveDirectoryHandle = null;

    try {
        await clearPersistedDirectoryHandle();
    } catch (error) {
        // Ignore persistence cleanup failures and continue.
    }
}

async function chooseAndroidSaveDirectory() {
    const directoryHandle = await requestAndroidSaveDirectory();
    ui.progressText.innerText = "បានប្តូរថតរក្សាទុករួចរាល់";
    return directoryHandle;
}

function resetExportState() {
    resultsSection.style.display = 'block';
    resultsGallery.innerHTML = "";
    cleanupObjectUrls(currentZipDownloads.map((item) => item.url));
    cleanupObjectUrls(resultPreviewUrls);
    currentZipDownloads = [];
    mobileShareState = null;
    renderedPreviewCount = 0;
    zipContainer.style.display = "none";
    ui.finalZipBtn.disabled = false;
    updateShowMoreButton();
    ui.exportProgressContainer.style.display = 'block';
}

async function requestAndroidSaveDirectory() {
    const directoryHandle = await window.showDirectoryPicker({
        id: "logoadder-android-save",
        mode: "readwrite",
        startIn: "pictures"
    });

    androidSaveDirectoryHandle = directoryHandle;
    await savePersistedDirectoryHandle(directoryHandle);
    return directoryHandle;
}

async function getAndroidSaveDirectory() {
    const restoredHandle = await restorePersistedAndroidDirectoryHandle();

    if (restoredHandle) {
        return restoredHandle;
    }

    return requestAndroidSaveDirectory();
}

async function handleChangeSaveFolderClick() {
    if (!canUseAndroidFolderSave()) {
        return;
    }

    try {
        ui.changeSaveFolderBtn.disabled = true;
        ui.progressText.innerText = "សូមជ្រើសថតថ្មីដើម្បីរក្សាទុករូប";
        await chooseAndroidSaveDirectory();
    } catch (error) {
        if (error.name === "AbortError") {
            ui.progressText.innerText = "បានបោះបង់ការជ្រើសថត";
            return;
        }

        ui.progressText.innerText = "មិនអាចប្តូរថតរក្សាទុកបាន";
        alert(error.message || "Could not change the save folder");
    } finally {
        ui.changeSaveFolderBtn.disabled = false;
    }
}

async function writeBlobToDirectory(directoryHandle, fileName, blob) {
    const availableFileName = await resolveAvailableDirectoryFileName(directoryHandle, fileName);
    const fileHandle = await directoryHandle.getFileHandle(availableFileName, { create: true });
    const writable = await fileHandle.createWritable();

    await writable.write(blob);
    await writable.close();

    return availableFileName;
}

function showAndroidSaveComplete(count) {
    ui.progressText.innerText = `រួចរាល់! បានរក្សាទុក ${count} រូប`;
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

    const files = Array.from(e.dataTransfer.files).filter(isSupportedImageFile);
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
    ui.fileCount.innerText = `${bgFiles.length} រូបភាពដែលបានជ្រើសរើស`;
    currentIdx = 0;
    if (bgFiles.length > 0) loadCurrentImg();
}

// ==========================================
// SECTOR 4: CORE RENDERING ENGINE
// ==========================================
function render(targetCanvas, bg, logo, outputWidth = bg.width, outputHeight = bg.height) {
    const tCtx = targetCanvas.getContext('2d');
    targetCanvas.width = outputWidth;
    targetCanvas.height = outputHeight;
    tCtx.drawImage(bg, 0, 0, outputWidth, outputHeight);

    if (logo) {
        const smartM = Math.min(outputWidth, outputHeight) * 0.005;
        const mX = (parseInt(ui.marginX.value) || 0) + smartM;
        const mY = (parseInt(ui.marginY.value) || 0) + smartM;
        const sizePct = ui.sizeSlider.value / 100;
        const opacityPct = ui.logoOpacity.value / 100;
        const pos = hiddenPosInput.value;
        
        const lW = outputWidth * sizePct;
        const lH = (logo.height / logo.width) * lW;

        let x = mX, y = mY;

        if (pos === "top-right") x = outputWidth - lW - mX;
        else if (pos === "bottom-left") y = outputHeight - lH - mY;
        else if (pos === "bottom-right") {
            x = outputWidth - lW - mX;
            y = outputHeight - lH - mY;
        } else if (pos === "center") {
            x = (outputWidth - lW) / 2;
            y = (outputHeight - lH) / 2;
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

ui.sizeSlider.oninput = (e) => {
    ui.sizeVal.innerText = e.target.value + "%";
    saveConfig();
    draw();
};

ui.logoOpacity.oninput = (e) => {
    ui.opacityVal.innerText = e.target.value + "%";
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
    if (bgFiles.length > 0) {
        if (ui.canvasPlaceholder) ui.canvasPlaceholder.style.display = 'none';
        if (ui.navControls) ui.navControls.classList.remove('hidden-nav');
        canvas.classList.add('active-canvas');
    }

    currentPreviewImg = await loadImage(bgFiles[currentIdx]);
    ui.navStatus.innerText = `${currentIdx + 1} / ${bgFiles.length}`;
    draw();
}

document.getElementById('nextZone').onclick = () => {
    if (currentIdx < bgFiles.length - 1) { currentIdx++; loadCurrentImg(); }
};

document.getElementById('prevZone').onclick = () => {
    if (currentIdx > 0) { currentIdx--; loadCurrentImg(); }
};

ui.downloadBtn.onclick = async () => {
    if (bgFiles.length === 0 || !logoImg) return alert("សូមជ្រើសរើសរូបភាព និង Logo!");

    const btn = ui.downloadBtn;
    setPrimaryButtonState(true, "កំពុងរៀបចំ...");

    resetExportState();

    if (canUseAndroidFolderSave()) {
        await startAndroidChromeFolderExport(btn);
        return;
    }

    if (isMobileDevice() && navigator.share && navigator.canShare) {
        await startMobileShareFlow(btn);
        return;
    }

    await startZipExport(btn, { chunked: false });
};

async function startAndroidChromeFolderExport(btn) {
    const offCanvas = document.createElement('canvas');
    let allowRetryWithFreshPicker = true;

    while (true) {
        try {
            const restoredHandle = await restorePersistedAndroidDirectoryHandle();
            ui.progressText.innerText = restoredHandle
                ? "កំពុងប្រើថតដែលបានចងចាំ"
                : "សូមជ្រើសថតក្នុង Pictures ដើម្បីរក្សាទុករូប";
            const directoryHandle = restoredHandle || await chooseAndroidSaveDirectory();
            let permissionState = await queryDirectoryPermission(directoryHandle);

            if (permissionState !== "granted") {
                ui.progressText.innerText = restoredHandle
                    ? "ថតត្រូវបានចងចាំរួចហើយ សូមចុច អនុញ្ញាត ដើម្បីរក្សាទុករូប"
                    : "Chrome ត្រូវការការអនុញ្ញាត ដើម្បីរក្សាទុករូបទៅថតដែលបានជ្រើស";
                permissionState = await requestDirectoryPermission(directoryHandle);
            }

            if (permissionState !== "granted") {
                throw new Error("Stored directory permission denied");
            }

            for (let i = 0; i < bgFiles.length; i++) {
                const { outputBlob, previewBlob } = await processImageToBlob(bgFiles[i], offCanvas);
                const fileName = getMobileOutputFileName(bgFiles[i]);

                addResultPreview(previewBlob);
                await writeBlobToDirectory(directoryHandle, fileName, outputBlob);
                updateExportProgress(i + 1, bgFiles.length);
                await yieldToBrowser();
            }

            resetCanvas(offCanvas);
            setPrimaryButtonState(false, "ចាប់ផ្តើមជាថ្មី!");
            zipContainer.style.display = "none";
            showAndroidSaveComplete(bgFiles.length);
            resultsSection.scrollIntoView({ behavior: 'smooth' });
            return;
        } catch (error) {
            resetCanvas(offCanvas);

            if (error.name === "AbortError") {
                zipContainer.style.display = "none";
                setPrimaryButtonState(false, "ចាប់ផ្ដើមដំណើរការ");
                ui.progressText.innerText = "បានបោះបង់ការជ្រើសថត";
                ui.progressCount.innerText = `0 / ${bgFiles.length}`;
                ui.progressFill.style.width = "0%";
                return;
            }

            await resetAndroidFolderSaveState();

            if (allowRetryWithFreshPicker) {
                allowRetryWithFreshPicker = false;
                ui.progressText.innerText = "សូមជ្រើសថតថ្មីដើម្បីរក្សាទុករូប";
                continue;
            }

            ui.progressText.innerText = "កំពុងប្តូរទៅការទាញយកជំនួស...";
            resetExportState();
            await startZipExport(btn, { chunked: true });
            return;
        }
    }
}

async function startMobileShareFlow(btn) {
    mobileShareState = {
        nextIndex: 0,
        total: bgFiles.length,
        currentFiles: [],
        currentLabel: ""
    };

    ui.progressText.innerText = "កំពុងរៀបចំ 10 រូបដំបូង...";
    await prepareNextMobileShareBatch(btn);
}

async function prepareNextMobileShareBatch(btn) {
    if (!mobileShareState) return;

    const offCanvas = document.createElement('canvas');
    const start = mobileShareState.nextIndex;
    const end = Math.min(start + MOBILE_SHARE_BATCH_SIZE, mobileShareState.total);

    try {
        mobileShareState.currentFiles = [];
        mobileShareState.currentLabel = `${start + 1}-${end}`;

        for (let i = start; i < end; i++) {
            const { outputBlob, previewBlob } = await processImageToBlob(bgFiles[i], offCanvas);
            const outputName = getMobileOutputFileName(bgFiles[i]);
            const shareFile = new File([outputBlob], outputName, { type: "image/jpeg" });

            mobileShareState.currentFiles.push(shareFile);
            addResultPreview(previewBlob);
            updateExportProgress(i + 1, mobileShareState.total);
            await yieldToBrowser();
        }

        resetCanvas(offCanvas);

        if (!canShareFiles(mobileShareState.currentFiles)) {
            mobileShareState = null;
            await startZipExport(btn, { chunked: true });
            return;
        }

        zipContainer.style.display = "block";
        ui.finalZipBtn.disabled = false;
        ui.finalZipBtn.innerText = `Save ${mobileShareState.currentLabel} Photos`;
        ui.progressText.innerText = `រូប ${mobileShareState.currentLabel} រួចរាល់`;
        setPrimaryButtonState(true, "ចុច Save Photos ខាងក្រោម");
    } catch (error) {
        resetCanvas(offCanvas);
        mobileShareState = null;
        showProcessingError(error);
    }
}

async function sharePreparedMobileBatch() {
    if (!mobileShareState || mobileShareState.currentFiles.length === 0) return;

    const btn = ui.downloadBtn;
    const shareBtn = ui.finalZipBtn;
    const sharedCount = mobileShareState.currentFiles.length;
    const batchEnd = mobileShareState.nextIndex + sharedCount;

    try {
        shareBtn.disabled = true;
        await navigator.share({
            files: mobileShareState.currentFiles,
            title: "LogoAdder Photos"
        });

        mobileShareState.nextIndex = batchEnd;
        mobileShareState.currentFiles = [];

        if (mobileShareState.nextIndex >= mobileShareState.total) {
            setPrimaryButtonState(false, "ចាប់ផ្តើមជាថ្មី!");
            shareBtn.disabled = false;
            zipContainer.style.display = "none";
            ui.progressText.innerText = "រួចរាល់! (100%)";
            resultsSection.scrollIntoView({ behavior: 'smooth' });
            mobileShareState = null;
            return;
        }

        setPrimaryButtonState(true, "កំពុងរៀបចំ...");
        ui.progressText.innerText = "កំពុងរៀបចំរូបបន្ទាប់...";
        await prepareNextMobileShareBatch(btn);
        shareBtn.disabled = false;
    } catch (error) {
        shareBtn.disabled = false;
        if (error.name !== "AbortError") {
            alert(error.message || "Could not open save/share menu");
        }
    }
}

async function startZipExport(btn, options = {}) {
    const offCanvas = document.createElement('canvas');
    const useChunkedZip = Boolean(options.chunked);
    const filesPerZip = useChunkedZip ? ZIP_CHUNK_SIZE : bgFiles.length;
    const shouldAutoDownloadChunks = useChunkedZip && bgFiles.length > AUTO_DOWNLOAD_THRESHOLD;

    try {
        for (let start = 0; start < bgFiles.length; start += filesPerZip) {
            const zip = new JSZip();
            const end = Math.min(start + filesPerZip, bgFiles.length);

            for (let i = start; i < end; i++) {
                const { outputBlob, previewBlob } = await processImageToBlob(bgFiles[i], offCanvas);

                addResultPreview(previewBlob);
                updateExportProgress(i + 1, bgFiles.length);
                zip.file(`LogoAdder_${i + 1}.jpg`, outputBlob);
                await yieldToBrowser();
            }

            const zipBlob = await zip.generateAsync({
                type: "blob",
                compression: "STORE",
                streamFiles: true
            });
            const chunkNumber = Math.floor(start / filesPerZip) + 1;
            const zipName = useChunkedZip && bgFiles.length > filesPerZip
                ? `LogoAdder_Batch_${chunkNumber}.zip`
                : "LogoAdder_Batch.zip";
            const zipUrl = URL.createObjectURL(zipBlob);

            if (shouldAutoDownloadChunks) {
                downloadBlobUrl(zipUrl, zipName);
                scheduleUrlRevoke(zipUrl);
            } else {
                currentZipDownloads.push({ name: zipName, url: zipUrl });
            }

            await yieldToBrowser();
        }

        resetCanvas(offCanvas);
        setPrimaryButtonState(false, "ចាប់ផ្តើមជាថ្មី!");
        zipContainer.style.display = shouldAutoDownloadChunks ? "none" : "block";
        if (!shouldAutoDownloadChunks) {
            ui.finalZipBtn.innerText = currentZipDownloads.length > 1
                ? `ទាញយកជា ZIP (${currentZipDownloads.length})`
                : "ទាញយកជា ZIP";
        }
        resultsSection.scrollIntoView({ behavior: 'smooth' });
    } catch (error) {
        resetCanvas(offCanvas);
        showProcessingError(error);
    }
}

ui.finalZipBtn.onclick = () => {
    if (mobileShareState) {
        sharePreparedMobileBatch();
        return;
    }

    currentZipDownloads.forEach((item, index) => {
        setTimeout(() => downloadBlobUrl(item.url, item.name), index * 300);
    });
};

if (ui.changeSaveFolderBtn) {
    ui.changeSaveFolderBtn.onclick = handleChangeSaveFolderClick;
}

logoInput.onchange = async (e) => {
    if (e.target.files[0]) {
        const reader = new FileReader();
        reader.onload = (event) => {
            logoImg = new Image();
            logoImg.onload = () => {
                ui.logoStatus.innerText = `Logo: ${e.target.files[0].name}`;
                saveConfig(event.target.result);
                draw();
            };
            logoImg.src = event.target.result;
        };
        reader.readAsDataURL(e.target.files[0]);
    }
};

// Initial Load
setAndroidFolderButtonVisibility();
loadConfig();
