import React, { useState, useRef } from 'react';
import { Mic, Square, Loader2, X } from 'lucide-react';

interface RecorderProps {
  onRecordingComplete: (base64Audio: string) => void;
  isProcessing: boolean;
}

export const Recorder: React.FC<RecorderProps> = ({ onRecordingComplete, isProcessing }) => {
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const isCancelledRef = useRef(false);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];
      isCancelledRef.current = false;

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        // Stop all tracks to release mic
        stream.getTracks().forEach(track => track.stop());

        // Check if user cancelled
        if (isCancelledRef.current) {
            console.log("Recording cancelled by user");
            return;
        }

        const blob = new Blob(chunksRef.current, { type: 'audio/webm' }); // webm is standard for Chrome/FF
        const reader = new FileReader();
        reader.readAsDataURL(blob);
        reader.onloadend = () => {
          const base64String = reader.result as string;
          if (base64String) {
              // Remove the data URL prefix (e.g., "data:audio/webm;base64,")
              const parts = base64String.split(',');
              if (parts.length > 1) {
                  onRecordingComplete(parts[1]);
              } else {
                  console.error("Invalid base64 string format");
              }
          } else {
              console.error("FileReader result is null or empty");
          }
        };
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error("Error accessing microphone:", err);
      alert("No se pudo acceder al micrófono. Por favor verifica los permisos.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const cancelRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
        isCancelledRef.current = true;
        mediaRecorderRef.current.stop();
        setIsRecording(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center space-y-4 my-6">
      <div className="flex items-center gap-6 relative">
          
          {/* Cancel Button - Only visible when recording */}
          {isRecording && !isProcessing && (
              <button
                onClick={cancelRecording}
                className="absolute right-full mr-4 p-3 bg-white text-slate-400 border border-slate-200 hover:text-red-500 hover:bg-red-50 hover:border-red-200 rounded-full shadow-sm transition-all animate-in fade-in zoom-in duration-300"
                title="Cancelar y descartar grabación"
              >
                  <X className="w-5 h-5" />
              </button>
          )}

          <div className="relative group">
            <div className={`absolute -inset-1 bg-gradient-to-r from-red-600 to-orange-600 rounded-full blur opacity-25 group-hover:opacity-100 transition duration-1000 group-hover:duration-200 ${isRecording ? 'animate-pulse opacity-75' : ''}`}></div>
            <button
              onClick={isRecording ? stopRecording : startRecording}
              disabled={isProcessing}
              className={`relative flex items-center justify-center w-20 h-20 rounded-full transition-all duration-300 shadow-xl ${
                isProcessing 
                  ? 'bg-slate-200 cursor-not-allowed' 
                  : isRecording 
                    ? 'bg-red-500 hover:bg-red-600' 
                    : 'bg-white hover:bg-slate-50'
              }`}
            >
              {isProcessing ? (
                <Loader2 className="w-8 h-8 text-slate-500 animate-spin" />
              ) : isRecording ? (
                <Square className="w-8 h-8 text-white fill-current" />
              ) : (
                <Mic className="w-8 h-8 text-red-600" />
              )}
            </button>
          </div>
      </div>
      
      <p className="text-sm font-medium text-slate-500 h-5 text-center">
        {isProcessing 
          ? "Procesando tarea con IA..." 
          : isRecording 
            ? "Escuchando... (Haz clic para terminar)" 
            : "Toca el micrófono para dictar una tarea"}
      </p>
    </div>
  );
};