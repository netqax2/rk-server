const WebSocket = require("ws");

const wss = new WebSocket.Server({ port: 8080 });

function makeChunk(size) {
    return Buffer.alloc(size, "a");
}

wss.on("connection", (ws, req) => {

    const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress;

    console.log("CLIENT CONNECTED:", ip);

    ws.send(JSON.stringify({
        type: "info",
        msg: `connected ${ip}`
    }));

    ws.on("message", (msg) => {

        const text = msg.toString();

        // START DOWNLOAD TEST
        if (text === "speed_download") {

            let sent = 0;
            const total = 10 * 1024 * 1024; // 10MB
            const chunkSize = 64 * 1024;

            const interval = setInterval(() => {

                if (sent >= total) {
                    ws.send(JSON.stringify({ type: "speed_download_done" }));
                    clearInterval(interval);
                    return;
                }

                ws.send(makeChunk(chunkSize));
                sent += chunkSize;

            }, 10);
        }

        // START UPLOAD TEST
        else if (text === "speed_upload_start") {
            ws.uploadBytes = 0;
            ws.uploadStart = Date.now();
        }

        // UPLOAD DATA CHUNK
        else if (Buffer.isBuffer(msg)) {
            ws.uploadBytes += msg.length;
        }

        // END UPLOAD
        else if (text === "speed_upload_end") {

            const time = Date.now() - ws.uploadStart;
            const mbps = (ws.uploadBytes * 8) / time / 1000;

            ws.send(JSON.stringify({
                type: "speed_upload_result",
                mbps
            }));
        }

        else {
            console.log("MSG:", text);
        }
    });

});
