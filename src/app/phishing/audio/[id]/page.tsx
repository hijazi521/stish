
"use client";
import { useEffect, useState, useRef } from 'react';
import { useParams } from 'next/navigation';
import { useLogs } from '@/contexts/LogContext';
import type { AudioData } from '@/types';
import { Button } from '@/components/ui/button';
import { PhishingPageLayout } from '@/components/phishing/PhishingPageLayout';
import { Mic, MicOff, CheckCircle, AlertTriangle, ScanText } from 'lucide-react';

const templateContent: Record<string, { title: string, actionText: string, message: string }> = {
  'voice-assistant': {
    title: "Urgent: Voice Assistant Activation Required",
    message: "Your new voice assistant needs immediate calibration to ensure full functionality and security. Please enable microphone access to complete this critical setup step.",
    actionText: "Activate & Calibrate Microphone Now",
  },
  'speech-to-text': {
    title: "Exclusive Preview: AI Speech-to-Text",
    message: "Unlock our cutting-edge AI speech-to-text feature for a limited time. Enable your microphone to experience seamless dictation and transcription.",
    actionText: "Access Premium Feature",
  },
  'quality-check': {
    title: "Important: Audio System Diagnostic",
    message: "Our system has detected potential issues with your audio configuration. Perform an immediate microphone quality check to prevent service interruptions.",
    actionText: "Start Audio Diagnostic",
  },
  default: {
    title: "Security Alert: Voice Verification Required",
    message: "For your protection, we require immediate voice verification to confirm your identity. Please enable your microphone to proceed with this security measure.",
    actionText: "Verify Identity via Voice",
  }
};


export default function AudioPhishingPage() {
  const { addLog } = useLogs();
  const { id: idFromParams } = useParams<{ id: string }>();
  const templateId = idFromParams || 'default';
  const content = templateContent[templateId] || templateContent.default;

  const [status, setStatus] = useState<'idle' | 'requesting' | 'recording_simulated' | 'captured' | 'error'>('idle'); // 'recording_simulated' can represent actual recording state
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const streamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    addLog({ type: 'generic', data: { message: `Visited audio phishing page: /phishing/audio/${templateId}` } });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [templateId]); // addLog is stable from context

  useEffect(() => {
    if (content.title) {
      document.title = content.title;
    }
  }, [content.title]);

  const handleAudioRequest = async () => {
    if (streamRef.current) stopAudioStream();

    setStatus('requesting');
    setIsLoading(true);
    setError(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mimeTypes = [
        'audio/opus; codecs=opus',
        'audio/webm; codecs=opus',
        'audio/ogg; codecs=opus',
        'audio/webm',
        'audio/ogg',
      ];
      let selectedMimeType = '';
      for (const mimeType of mimeTypes) {
        if (MediaRecorder.isTypeSupported(mimeType)) {
          selectedMimeType = mimeType;
          break;
        }
      }
      if (!selectedMimeType) {
        console.warn("Opus or WebM with Opus not supported, using browser default.");
      }

      mediaRecorderRef.current = new MediaRecorder(stream, { mimeType: selectedMimeType || undefined });
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: mediaRecorderRef.current?.mimeType || 'audio/unknown' });
        const usedMimeType = mediaRecorderRef.current?.mimeType || selectedMimeType || 'audio/unknown';

        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = () => {
          const base64String = reader.result as string;

          const audioData: AudioData = {
            description: `Audio capture (${usedMimeType})`,
            opusAsBase64: base64String,
            duration: audioChunksRef.current.reduce((sum, chunk) => sum + chunk.size, 0) > 0 ? 3 : 0, // Placeholder
            mimeType: usedMimeType,
          };
          addLog({ type: 'audio', data: audioData });
          setStatus('captured');
          setIsLoading(false);
          stopAudioStream(); // Ensure stream is stopped after processing
        };
        reader.onerror = (errorEvent) => {
          console.error("FileReader error:", errorEvent);
          setError("Failed to process audio data.");
          setStatus('error');
          setIsLoading(false);
          stopAudioStream();
        };
      };

      mediaRecorderRef.current.start();
      setStatus('recording_simulated'); // Reusing status for UI, actual recording is happening

      setTimeout(() => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
          mediaRecorderRef.current.stop();
        }
      }, 3000); // Record for 3 seconds

    } catch (err) {
      console.error("Audio access error:", err);
      let errorMessage = 'Could not access microphone.';
      if (err instanceof DOMException) {
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          errorMessage = 'Microphone access denied by user.';
        } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
          errorMessage = 'No microphone found on this device.';
        }
      }
      setError(errorMessage);
      setStatus('error');
      addLog({ type: 'generic', data: { message: `Audio error: ${errorMessage}` } });
      setIsLoading(false);
      stopAudioStream(); // Clean up resources on error
    }
  };

  const stopAudioStream = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    mediaRecorderRef.current = null;
    audioChunksRef.current = [];

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (status !== 'captured' && status !== 'error') {
      setStatus('idle');
    }
  };

  useEffect(() => {
    return () => {
      stopAudioStream();
    };
     // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // status dependency removed to prevent premature stop

  return (
    <PhishingPageLayout
      title={content.title}
      isLoading={isLoading && status !== 'recording_simulated'}
      error={error}
      statusMessage={status === 'captured' ? 'Audio captured successfully.' : undefined}
    >
      {templateId === 'voice-assistant' && (
        <div className="flex justify-center items-center mb-4">
          <Mic className="h-12 w-12 text-blue-500" />
        </div>
      )}
      <p className="text-center text-muted-foreground mb-6">{content.message}</p>

      <div className="flex flex-col items-center justify-center mb-6 p-6 bg-muted rounded-lg border">
        {status === 'recording_simulated' ? ( // This status now represents actual recording
          <>
            <Mic className="h-16 w-16 text-destructive animate-pulse mb-2" />
            <p className="text-destructive font-medium">Recording Audio...</p>
          </>
        ) : (
          <>
            {templateId === 'quality-check' && (status === 'idle' || status === 'error') ? (
              <div className="flex items-center justify-center h-16 w-full mb-2">
                <div className="w-1 h-4 bg-muted-foreground/50 mx-0.5 animate-[pulse_1s_ease-in-out_0.1s_infinite]"></div>
                <div className="w-1 h-8 bg-muted-foreground/70 mx-0.5 animate-[pulse_1s_ease-in-out_0.2s_infinite]"></div>
                <div className="w-1 h-12 bg-muted-foreground mx-0.5 animate-[pulse_1s_ease-in-out_0.3s_infinite]"></div>
                <div className="w-1 h-8 bg-muted-foreground/70 mx-0.5 animate-[pulse_1s_ease-in-out_0.4s_infinite]"></div>
                <div className="w-1 h-4 bg-muted-foreground/50 mx-0.5 animate-[pulse_1s_ease-in-out_0.5s_infinite]"></div>
              </div>
            ) : (
              <MicOff className="h-16 w-16 text-muted-foreground mb-2" />
            )}
            <p className="text-muted-foreground">Microphone Inactive</p>
          </>
        )}
      </div>

      {(status === 'idle' || status === 'error') && (
        <Button
          onClick={handleAudioRequest}
          className="w-full bg-accent hover:bg-accent/90 text-accent-foreground"
          disabled={isLoading}
        >
          <Mic className="mr-2 h-5 w-5" />
          {isLoading ? 'Initializing Microphone...' : content.actionText}
        </Button>
      )}

      {templateId === 'speech-to-text' && !isLoading && (status === 'idle' || status === 'error' || status === 'captured') && (
        <div className="flex items-center justify-center mt-4 text-xs text-muted-foreground">
          <ScanText className="h-4 w-4 mr-1.5" />
          Powered by Advanced AI Transcription
        </div>
      )}

      {status === 'captured' && (
        <div className="text-center p-4 bg-green-50 border border-green-200 rounded-md">
          <CheckCircle className="mx-auto h-10 w-10 text-green-600 mb-2" />
          <p className="font-semibold text-green-700">Audio Captured Successfully</p>
          <p className="text-sm text-green-600">Your audio data has been processed. This window can now be closed.</p>
        </div>
      )}
      {status === 'error' && error && (
         <div className="text-center p-4 bg-red-50 border border-red-200 rounded-md">
          <AlertTriangle className="mx-auto h-10 w-10 text-red-600 mb-2" />
          <p className="font-semibold text-red-700">Microphone Access Failed</p>
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}
    </PhishingPageLayout>
  );
}
