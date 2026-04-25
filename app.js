function showFirstRunGuidance() {
    if (!ui.firstRunGuidance || !ui.firstRunGuidanceBody) {
        return;
    }

    const guidanceContent = getGuidanceContent();
    if (!guidanceContent || hasSeenGuidance()) {
        ui.firstRunGuidance.style.display = "none";
        return;
    }

    ui.firstRunGuidanceBody.innerText = guidanceContent;
    ui.firstRunGuidance.style.display = "block";
}

function dismissFirstRunGuidance() {
    markGuidanceSeen();
    if (ui.firstRunGuidance) {
        ui.firstRunGuidance.style.display = "none";
    }
}

ui.downloadBtn.onclick = async () => {
    if (bgFiles.length === 0 || !logoImg) {
        alert("សូមជ្រើសរើសរូបភាព និង Logo!");
        return;
    }

    const btn = ui.downloadBtn;
    setProcessingState(true);
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

if (ui.dismissGuidanceBtn) {
    ui.dismissGuidanceBtn.onclick = dismissFirstRunGuidance;
}

if (ui.qualityPreset) {
    ui.qualityPreset.onchange = () => saveConfig();
}

if (ui.sizePreset) {
    ui.sizePreset.onchange = () => saveConfig();
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

setAndroidFolderButtonVisibility();
loadConfig().finally(() => {
    showFirstRunGuidance();
});
