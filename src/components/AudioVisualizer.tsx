import React, { useEffect, useRef } from 'react';

interface AudioVisualizerProps {
  stream: MediaStream | null;
  isListening: boolean;
  barColor?: string;
}

export const AudioVisualizer: React.FC<AudioVisualizerProps> = ({
  stream,
  isListening,
  barColor = '#10b981',
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);

  useEffect(() => {
    if (!isListening || !stream) {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close().catch(() => {});
      }
      audioContextRef.current = null;
      analyserRef.current = null;
      sourceRef.current = null;

      // Clear canvas
      if (canvasRef.current) {
        const ctx = canvasRef.current.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        }
      }
      return;
    }

    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioCtx();
      audioContextRef.current = ctx;

      const analyser = ctx.createAnalyser();
      analyser.fftSize = 64;
      analyser.smoothingTimeConstant = 0.8;
      analyserRef.current = analyser;

      const source = ctx.createMediaStreamSource(stream);
      source.connect(analyser);
      sourceRef.current = source;

      const canvas = canvasRef.current;
      if (!canvas) return;
      const canvasCtx = canvas.getContext('2d');
      if (!canvasCtx) return;

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const draw = () => {
        if (!isListening) return;
        animationFrameRef.current = requestAnimationFrame(draw);

        analyser.getByteFrequencyData(dataArray);

        canvasCtx.clearRect(0, 0, canvas.width, canvas.height);

        const barWidth = (canvas.width / bufferLength) * 2;
        let barHeight;
        let x = 0;

        for (let i = 0; i < bufferLength; i++) {
          barHeight = (dataArray[i] / 255) * canvas.height * 0.9;

          // Draw rounded pill bar
          const gradient = canvasCtx.createLinearGradient(0, canvas.height, 0, 0);
          gradient.addColorStop(0, '#06b6d4');
          gradient.addColorStop(1, '#3b82f6');

          canvasCtx.fillStyle = gradient;
          canvasCtx.fillRect(
            x,
            canvas.height - barHeight,
            Math.max(2, barWidth - 3),
            barHeight
          );

          x += barWidth;
        }
      };

      draw();
    } catch (err) {
      console.warn('AudioVisualizer setup error:', err);
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close().catch(() => {});
      }
    };
  }, [isListening, stream, barColor]);

  return (
    <div className="flex items-center justify-center w-full h-10 px-2 bg-slate-900/60 rounded-xl border border-slate-700/60 overflow-hidden backdrop-blur-sm">
      {isListening ? (
        <canvas ref={canvasRef} width={260} height={36} className="w-full h-8" />
      ) : (
        <div className="flex items-center gap-1.5 opacity-40">
          <div className="w-1 h-2 bg-slate-400 rounded-full animate-pulse" />
          <div className="w-1 h-4 bg-slate-400 rounded-full animate-pulse delay-75" />
          <div className="w-1 h-3 bg-slate-400 rounded-full animate-pulse delay-150" />
          <div className="w-1 h-5 bg-slate-400 rounded-full animate-pulse delay-200" />
          <div className="w-1 h-2 bg-slate-400 rounded-full animate-pulse delay-300" />
          <span className="text-xs text-slate-400 ml-2 font-medium">마이크 대기 중</span>
        </div>
      )}
    </div>
  );
};
