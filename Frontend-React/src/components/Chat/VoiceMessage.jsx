import { useRef, useState ,useEffect} from "react";

export default function VoiceMessage({ mediaUrl, isMe }) {

    const audioRef = useRef(null);

     const [isPlaying, setIsPlaying] = useState(false); 
    const [duration, setDuration] = useState(0);
    const [currentTime, setCurrentTime] = useState(0); 
    const [waveform, setWaveform] = useState([]);
    const [playbackRate, setPlaybackRate] = useState(1);

    const togglePlay = () => {

        if (!audioRef.current) return;

        if (isPlaying) {
            audioRef.current.pause();
        } else {
            audioRef.current.play();
        }
    };

  const changeSpeed = () => {

    let nextRate;

    if (playbackRate === 1) {
        nextRate = 1.5;
    } else if (playbackRate === 1.5) {
        nextRate = 2;
    } else {
        nextRate = 1;
    }

    setPlaybackRate(nextRate);

    if (audioRef.current) {
        audioRef.current.playbackRate = nextRate;
    }
};
    const formatTime = (seconds) => {

    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);

    return `${mins}:${String(secs).padStart(2, "0")}`;

};
    useEffect(() => {

    const generateWaveform = async () => {

        try {

            const response = await fetch(mediaUrl);

            const arrayBuffer = await response.arrayBuffer();

            const audioContext =
                new (window.AudioContext || window.webkitAudioContext)();

            const audioBuffer =
                await audioContext.decodeAudioData(arrayBuffer);

            const rawData =
                audioBuffer.getChannelData(0);

            const samples = 40;

            const blockSize =
                Math.floor(rawData.length / samples);

            const filteredData = [];

            for (let i = 0; i < samples; i++) {

                let sum = 0;

                for (let j = 0; j < blockSize; j++) {

                    sum += Math.abs(
                        rawData[(i * blockSize) + j]
                    );

                }

                filteredData.push(sum / blockSize);

            }

            const max = Math.max(...filteredData);

            const normalized = filteredData.map(v => v / max);

            setWaveform(normalized);

        } catch (err) {

            console.error("Waveform error:", err);

        }

    };

    generateWaveform();

}, [mediaUrl]);

    return (
        <div
          style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "12px",
        padding: "10px",
        borderRadius: "12px",

        background: isMe
            ? "#00695c"
            : "#2a3942"
    }}
        >
            <button
                onClick={togglePlay}
                onMouseEnter={(e) => {
        e.currentTarget.style.transform = "scale(1.08)";
    }}
    onMouseLeave={(e) => {
        e.currentTarget.style.transform = "scale(1)";
    }}
           style={{
            width: "38px",
            height: "38px",
            borderRadius: "50%",
             border: "none",
             cursor: "pointer",
            background: "#ffffff",
            color: "#111",
            fontSize: "16px",
            boxShadow: "0 2px 8px rgba(0,0,0,.25)",
            transition: "all .2s ease",
            userSelect: "none"
}}
            >
                {isPlaying ? "⏸" : "▶"}
            </button>

            <audio
                ref={audioRef}
                src={mediaUrl}
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
                onEnded={() => setIsPlaying(false)}
                onLoadedMetadata={() => {
            setDuration(audioRef.current.duration);
                    }}
                 onTimeUpdate={() =>
            setCurrentTime(audioRef.current.currentTime)
             }
                style={{ display: "none" }}
            />

         <div
   style={{
        minWidth: "190px",
        display: "flex",
        flexDirection: "column",
        gap: "4px",
        background: "transparent"
    }}
>

 <div
      style={{
        display: "flex",
        alignItems: "flex-end",
        gap: "1.5px",
        height: "32px",
        width: "100%",
        cursor: "pointer",
        background: "transparent"
    }}

    onClick={(e) => {

        if (!audioRef.current) return;

        const rect = e.currentTarget.getBoundingClientRect();

        const percent =
            (e.clientX - rect.left) / rect.width;

        const time = percent * duration;

        audioRef.current.currentTime = time;

        setCurrentTime(time);

    }}
>

    {waveform.map((value, index) => {

        const played =
            (index / waveform.length) <=
            (currentTime / duration);

        return (

            <div
                key={index}
                 style={{
                width: "3px",
                height: `${8 + value * 22}px`,
                borderRadius: "999px",
               background: played
                ? "#4ade80"
                 : "#5f6368",
                opacity: played ? 1 : 0.45,
                transition:
            "height .2s ease, background .25s ease, opacity .25s ease"
    }}
            />

        );

    })}

</div>

    <div
        style={{
            display: "flex",
            justifyContent: "space-between",
            color: "white",
            fontSize: "11px",
            opacity: 0.8,
        }}
    >
        <span>{formatTime(currentTime)}</span>

        <span>{formatTime(duration)}</span>
    </div>

    <button
    onClick={changeSpeed}
style={{
    border: "none",
    background: "rgba(255,255,255,.12)",
    color: "white",
    cursor: "pointer",
    fontWeight: "600",
    fontSize: "11px",
    padding: "4px 8px",
    borderRadius: "10px",
    alignSelf: "flex-end",
    transition: "all .2s ease"
}}
>
    {playbackRate}×
</button>

</div>
        </div>
    );
}