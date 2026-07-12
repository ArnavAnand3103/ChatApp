// STUN Server Configuration
export const rtcConfig = {
    iceServers: [
        {
            urls: "stun:stun.l.google.com:19302"
        }
    ]
};

// Get microphone
export async function getLocalAudioStream() {

    return await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: false
    });

}

// Get camera + microphone
export async function getLocalVideoStream() {

    return await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: true
    });

}

// Get screen share stream
export async function getScreenStream() {

    return await navigator.mediaDevices.getDisplayMedia({
        video: { cursor: "always" },
        audio: true
    });

}

// Create Peer
export function createPeer() {

    return new RTCPeerConnection(rtcConfig);

}

// Add Tracks
export function addTracks(peer, stream) {

    stream.getTracks().forEach(track => {

        peer.addTrack(track, stream);

    });

}

// Create Offer
export async function makeOffer(peer) {

    const offer = await peer.createOffer();

    await peer.setLocalDescription(offer);

    return offer;

}

// Create Answer
export async function makeAnswer(peer) {

    const answer = await peer.createAnswer();

    await peer.setLocalDescription(answer);

    return answer;

}

// Set Remote Description
export async function setRemote(peer, description) {

    await peer.setRemoteDescription(

        new RTCSessionDescription(description)

    );

}

// Add ICE Candidate
export async function addIce(peer, candidate) {

    if (!candidate) return;

    await peer.addIceCandidate(

        new RTCIceCandidate(candidate)

    );

}

// Close Peer
export function closePeer(peer) {

    if (!peer) return;

    peer.close();

}