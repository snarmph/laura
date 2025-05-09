function wsConnect() {
    var ws = new WebSocket("ws://localhost:8080/websocket");

    ws.onopen = () => {
        console.log("WebSocket connected");
    }

    ws.onmessage = (event) => {
        if (event.data === "reload") {
            ws.close()
            location.reload();
        }
    };

    ws.onclose = () => {
        setTimeout(() => wsConnect(), 1000);
    };
}

wsConnect();
