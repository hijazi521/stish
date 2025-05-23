
"use client";
import { useEffect, useState, useRef } from 'react';
import { useParams } from 'next/navigation';
import { useLogs } from '@/contexts/LogContext';
import type { AudioData } from '@/types';
import { Button } from '@/components/ui/button';
import { PhishingPageLayout } from '@/components/phishing/PhishingPageLayout';
import { Mic, MicOff, CheckCircle, AlertTriangle } from 'lucide-react';

const templateContent: Record<string, { title: string, actionText: string, message: string }> = {
  'voice-assistant': {
    title: 'Setup Voice Assistant',
    actionText: 'Enable Microphone & Calibrate',
    message: 'To setup your new voice assistant, we need to calibrate your microphone. Please enable microphone access.',
  },
  'speech-to-text': {
    title: 'Speech-to-Text Demo',
    actionText: 'Start Dictation',
    message: 'Try our new speech-to-text feature. Enable your microphone to begin dictating.',
  },
  'quality-check': {
    title: 'Audio Quality Check',
    actionText: 'Test Microphone Quality',
    message: 'Perform a quick audio quality check. Please enable your microphone for testing.',
  },
  default: {
    title: 'Microphone Access Required',
    actionText: 'Enable Microphone',
    message: 'This feature requires microphone access. Please enable your microphone to continue.',
  }
};


export default function AudioPhishingPage() {
  const { addLog } = useLogs();
  const params = useParams();
  const templateId = typeof params.id === 'string' ? params.id : 'default';
  const content = templateContent[templateId] || templateContent.default;
  
  const [status, setStatus] = useState<'idle' | 'requesting' | 'recording_simulated' | 'captured' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    addLog({ type: 'generic', data: { message: `Visited audio phishing page: /phishing/audio/${templateId}` } });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [templateId]); // addLog is stable from context

  const handleAudioRequest = async () => {
    if (streamRef.current) stopAudioStream();

    setStatus('requesting');
    setIsLoading(true);
    setError(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream; 
      
      setStatus('recording_simulated'); 
      
      setTimeout(() => {
        const audioData: AudioData = { message: 'Audio capture simulated successfully.' };
        addLog({ type: 'audio', data: audioData });
        setStatus('captured');
        setIsLoading(false);
        stopAudioStream(); 
      }, 3000);

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
    }
  };

  const stopAudioStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
     if (status !== 'captured' && status !== 'error') { // Avoid resetting status if already captured/errored
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
      statusMessage={status === 'captured' ? 'Audio capture simulated successfully for demonstration.' : undefined}
    >
      <p className="text-center text-muted-foreground mb-6">{content.message}</p>

      <div className="flex flex-col items-center justify-center mb-6 p-6 bg-muted rounded-lg border">
        {status === 'recording_simulated' ? (
          <>
            <Mic className="h-16 w-16 text-destructive animate-pulse mb-2" />
            <p className="text-destructive font-medium">Simulating Recording...</p>
          </>
        ) : (
          <>
            <MicOff className="h-16 w-16 text-muted-foreground mb-2" />
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

      {status === 'captured' && (
        <div className="text-center p-4 bg-green-50 border border-green-200 rounded-md">
          <CheckCircle className="mx-auto h-10 w-10 text-green-600 mb-2" />
          <p className="font-semibold text-green-700">Audio Capture Simulated</p>
          <p className="text-sm text-green-600">This window can now be closed.</p>
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
