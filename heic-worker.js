self.importScripts('./vendor/heic2any.min.js');

self.onmessage = async (event) => {
    const { id, file } = event.data || {};

    try {
        const converted = await heic2any({
            blob: file,
            toType: "image/jpeg",
            quality: 0.9
        });

        const blob = Array.isArray(converted) ? converted[0] : converted;
        self.postMessage({ id, ok: true, blob });
    } catch (error) {
        self.postMessage({
            id,
            ok: false,
            error: error && error.message ? error.message : "HEIC worker conversion failed"
        });
    }
};
