import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import { getDatabase, ref, set, onChildAdded, remove } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-database.js";

// Your Firebase config
const firebaseConfig = {
    apiKey: "AIzaSyCaRCNg_55S4gbX5kujn6LNHjGFUcXVzHQ",
    authDomain: "sign-in-and-signout.firebaseapp.com",
    databaseURL: "https://sign-in-and-signout-default-rtdb.firebaseio.com",
    projectId: "sign-in-and-signout",
    storageBucket: "sign-in-and-signout.firebasestorage.app",
    messagingSenderId: "467951830562",
    appId: "1:467951830562:web:5a1a6ad1050b0ce460ec7b",
    measurementId: "G-LENRWW0M1Z"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// WebRTC setup
let pc = new RTCPeerConnection();
let localVideo = document.getElementById("localVideo");
let remoteVideo = document.getElementById("remoteVideo");
let roomInput = document.getElementById("room");
let localStream;

// Get local camera
navigator.mediaDevices.getUserMedia({ video: true, audio: true })
    .then(stream => {
        localStream = stream;
        localVideo.srcObject = stream;
        stream.getTracks().forEach(track => pc.addTrack(track, stream));
    });

// Remote stream
let remoteStream = new MediaStream();
remoteVideo.srcObject = remoteStream;

pc.ontrack = (event) => {
    event.streams[0].getTracks().forEach(track => {
        remoteStream.addTrack(track);
    });
};

// Firebase signaling
function joinRoom() {
    let roomId = roomInput.value;
    if (!roomId) {
        alert("Enter a room code!");
        return;
    }

    const roomRef = ref(db, "rooms/" + roomId);

    pc.onicecandidate = (event) => {
        if (event.candidate) {
            set(ref(db, `rooms/${roomId}/candidates/${pc.localDescription.type}`), event.candidate.toJSON());
        }
    };

    // Listen for signals
    onChildAdded(roomRef, async (snapshot) => {
        let data = snapshot.val();

        if (!pc.currentRemoteDescription && data.sdp) {
            await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));

            if (data.sdp.type === "offer") {
                let answer = await pc.createAnswer();
                await pc.setLocalDescription(answer);
                set(ref(db, `rooms/${roomId}/answer`), { sdp: answer });
            }
        }

        if (data.candidate) {
            try {
                await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
            } catch (e) {
                console.error("Error adding ICE candidate", e);
            }
        }
    });

    // Create offer
    pc.createOffer()
        .then(offer => pc.setLocalDescription(offer))
        .then(() => {
            set(ref(db, `rooms/${roomId}/offer`), { sdp: pc.localDescription });
        });
}

window.joinRoom = joinRoom;
