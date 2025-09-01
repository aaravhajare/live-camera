// Connect to signaling server
const socket = io();

let localStream;
let remoteStream;
let pc;
let roomCode;

// Configuration for WebRTC
const config = {
    iceServers: [
        { urls: "stun:stun.l.google.com:19302" } // free Google STUN server
    ]
};

// Join a room
async function joinRoom() {
    roomCode = document.getElementById("room").value.trim();
    if (!roomCode) {
        alert("Please enter a room code!");
        return;
    }

    // Setup peer connection
    pc = new RTCPeerConnection(config);

    // Handle incoming remote stream
    remoteStream = new MediaStream();
    document.getElementById("remoteVideo").srcObject = remoteStream;

    pc.ontrack = (event) => {
        event.streams[0].getTracks().forEach(track => {
            remoteStream.addTrack(track);
        });
    };

    // ICE candidates
    pc.onicecandidate = (event) => {
        if (event.candidate) {
            socket.emit("signal", { room: roomCode, data: { candidate: event.candidate } });
        }
    };

    // Get local camera stream
    localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
    document.getElementById("localVideo").srcObject = localStream;
    localStream.getTracks().forEach(track => pc.addTrack(track, localStream));

    // Join room on server
    socket.emit("join", roomCode);

    // Create an offer if first participant
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    socket.emit("signal", { room: roomCode, data: { offer } });
}

// Handle incoming signals
socket.on("signal", async (data) => {
    if (!pc) return;

    if (data.offer) {
        // Someone sent an offer -> set remote desc and reply with answer
        await pc.setRemoteDescription(new RTCSessionDescription(data.offer));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socket.emit("signal", { room: roomCode, data: { answer } });

    } else if (data.answer) {
        // Got answer -> set as remote desc
        await pc.setRemoteDescription(new RTCSessionDescription(data.answer));

    } else if (data.candidate) {
        // Add ICE candidate
        try {
            await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
        } catch (e) {
            console.error("Error adding ICE candidate:", e);
        }
    }
});
