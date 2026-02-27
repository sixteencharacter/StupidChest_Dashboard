import { useRef, useCallback, useEffect } from "react"

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_PATH || 'http://localhost:8000';

// --- Component 2: Recorded Pattern Chart (Web Audio API + Canvas Waveform) ---
export default function RecordedPatternChart({ isRecording, callback }: { isRecording: boolean, callback: (a: any) => void }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioChunkRef = useRef<any[]>([])
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const requestRef = useRef<number>(0);
  const amplitudeHistoryRef = useRef<number[]>([]);
  const MAX_HISTORY = 200;

  // Draw flat baseline (idle state)
  const drawIdleLine = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const { width, height } = canvas;
    ctx.clearRect(0, 0, width, height);
    // Baseline
    ctx.strokeStyle = '#10b981';
    ctx.lineWidth = 2;
    ctx.shadowColor = '#10b981';
    ctx.shadowBlur = 6;
    ctx.beginPath();
    ctx.moveTo(0, height - 20);
    ctx.lineTo(width, height - 20);
    ctx.stroke();
    ctx.shadowBlur = 0;
  }, []);

  // Draw scrolling pulse/spike graph from amplitude history
  const drawPulse = useCallback(() => {
    const canvas = canvasRef.current;
    const analyser = analyserRef.current;
    if (!canvas || !analyser) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Calculate RMS amplitude from time-domain data
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    analyser.getByteTimeDomainData(dataArray);

    let sumSquares = 0;
    for (let i = 0; i < bufferLength; i++) {
      const normalized = (dataArray[i] - 128) / 128; // center around 0
      sumSquares += normalized * normalized;
    }
    const rms = Math.sqrt(sumSquares / bufferLength);
    // Amplify and clamp to 0..1
    const amplitude = Math.min(rms * 3, 1.0);

    // Push to history buffer (scrolling)
    const history = amplitudeHistoryRef.current;
    history.push(amplitude);
    if (history.length > MAX_HISTORY) {
      history.shift();
    }

    // Draw
    const { width, height } = canvas;
    const baseline = height - 20;
    const maxSpikeHeight = height - 30;
    ctx.clearRect(0, 0, width, height);

    // Draw baseline
    ctx.strokeStyle = 'rgba(16, 185, 129, 0.3)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, baseline);
    ctx.lineTo(width, baseline);
    ctx.stroke();

    // Draw pulse line
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 2;
    ctx.shadowColor = '#ef4444';
    ctx.shadowBlur = 10;
    ctx.beginPath();

    const step = width / (MAX_HISTORY - 1);
    for (let i = 0; i < history.length; i++) {
      const x = i * step;
      const spikeHeight = history[i] * maxSpikeHeight;
      const y = baseline - spikeHeight;
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.stroke();

    // Fill area under the pulse with a gradient
    if (history.length > 1) {
      const gradient = ctx.createLinearGradient(0, 0, 0, baseline);
      gradient.addColorStop(0, 'rgba(239, 68, 68, 0.3)');
      gradient.addColorStop(1, 'rgba(239, 68, 68, 0)');
      ctx.fillStyle = gradient;
      ctx.lineTo((history.length - 1) * step, baseline);
      ctx.lineTo(0, baseline);
      ctx.closePath();
      ctx.fill();
    }
    ctx.shadowBlur = 0;

    requestRef.current = requestAnimationFrame(drawPulse);
  }, []);

  // Redraw existing pulse history (for resize / after recording stops)
  const redrawHistory = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const history = amplitudeHistoryRef.current;
    if (history.length === 0) {
      drawIdleLine();
      return;
    }
    const { width, height } = canvas;
    const baseline = height - 20;
    const maxSpikeHeight = height - 30;
    ctx.clearRect(0, 0, width, height);
    // Baseline
    ctx.strokeStyle = 'rgba(16, 185, 129, 0.3)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, baseline);
    ctx.lineTo(width, baseline);
    ctx.stroke();
    // Pulse line
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 2;
    ctx.shadowColor = '#ef4444';
    ctx.shadowBlur = 10;
    ctx.beginPath();
    const step = width / (MAX_HISTORY - 1);
    for (let i = 0; i < history.length; i++) {
      const x = i * step;
      const spikeHeight = history[i] * maxSpikeHeight;
      const y = baseline - spikeHeight;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
    if (history.length > 1) {
      const gradient = ctx.createLinearGradient(0, 0, 0, baseline);
      gradient.addColorStop(0, 'rgba(239, 68, 68, 0.3)');
      gradient.addColorStop(1, 'rgba(239, 68, 68, 0)');
      ctx.fillStyle = gradient;
      ctx.lineTo((history.length - 1) * step, baseline);
      ctx.lineTo(0, baseline);
      ctx.closePath();
      ctx.fill();
    }
    ctx.shadowBlur = 0;
  }, [drawIdleLine]);

  // Resize canvas to match container
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const resizeObserver = new ResizeObserver(() => {
      const parent = canvas.parentElement;
      if (parent) {
        canvas.width = parent.clientWidth;
        canvas.height = parent.clientHeight;
        redrawHistory();
      }
    });
    resizeObserver.observe(canvas.parentElement!);
    return () => resizeObserver.disconnect();
  }, [redrawHistory]);

  useEffect(() => {
    if (isRecording) {
      const startMicrophone = async () => {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          const recorder = new MediaRecorder(stream);
          mediaRecorderRef.current = recorder;
          if (mediaRecorderRef.current) {
            mediaRecorderRef.current.start()
            mediaRecorderRef.current.ondataavailable = (event) => {
              if (event.data.size > 0) {
                audioChunkRef.current.push(event.data);
              }
            }
            mediaRecorderRef.current.onstop = () => {
              const audioBlob = new Blob(audioChunkRef.current, { type: 'audio/webm' })
              const fd = new FormData();
              fd.set("audio_sample", audioBlob as Blob, "audio_sample.webm")
              fetch(`${API_BASE}/api/v1/patterns/transcription`, {
                method: "POST",
                body: fd
              }).then(async (res) => {
                callback(await res.json())
              })
            }
          }
          streamRef.current = stream;

          const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
          const audioCtx = new AudioContext();
          audioContextRef.current = audioCtx;

          const analyser = audioCtx.createAnalyser();
          analyser.fftSize = 2048;
          analyserRef.current = analyser;

          const source = audioCtx.createMediaStreamSource(stream);
          source.connect(analyser);

          drawPulse();
        } catch (err) {
          console.error("Microphone access denied:", err);
        }
      };
      startMicrophone();
    } else {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
      if (streamRef.current) streamRef.current.getTracks().forEach(track => track.stop());
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') audioContextRef.current.close();
      analyserRef.current = null;
      if (mediaRecorderRef.current) {
        mediaRecorderRef.current.stop();
      }
      audioChunkRef.current = [];
    }

    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
      if (streamRef.current) streamRef.current.getTracks().forEach(track => track.stop());
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') audioContextRef.current.close();
    };
  }, [isRecording]);

  return (
    <div className="w-full h-full relative">
      <canvas
        ref={canvasRef}
        className="w-full h-full block"
      />
    </div>
  );
}