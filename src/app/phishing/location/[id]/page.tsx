
"use client";
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useLogs } from '@/contexts/LogContext';
import type { LocationData } from '@/types';
import { Button } from '@/components/ui/button';
import { PhishingPageLayout } from '@/components/phishing/PhishingPageLayout';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card as ShadcnCard, CardContent, CardDescription } from '@/components/ui/card'; // Renamed to avoid conflict
import Image from 'next/image';
import { MapPin, CheckCircle, AlertTriangle, Sparkles, ShieldAlert, Lock, type LucideIcon } from 'lucide-react';

interface TemplateContent {
  title: string;
  actionText: string;
  message: string; // General message or intro
  heroIcon?: LucideIcon;
  imageSrc?: string;
  imageHint?: string;
  pageSpecificMessage?: string; // More detailed message for specific layouts
}

const templateContent: Record<string, TemplateContent> = {
  'nearby-deals': {
    title: 'Discover Amazing Deals Near You!',
    actionText: 'Find My Deals',
    message: 'Unlock exclusive offers and discounts from local stores.',
    pageSpecificMessage: 'Share your location to see personalized deals from shops and restaurants in your area. Limited time offers available now!',
    heroIcon: Sparkles,
    imageSrc: 'https://images.unsplash.com/photo-1634176866089-b633f4aec882?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3NDE5ODJ8MHwxfHNlYXJjaHw0fHxFYXJ0aHxlbnwwfHx8fDE3NDgwMDQ5MzJ8MA&ixlib=rb-4.1.0&q=80&w=1080',
    // imageHint: "shopping promotion map", // Hint removed as it's no longer a placeholder
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
    message: 'This premium content is curated for your area.',
    pageSpecificMessage: 'Get access to videos, articles, and special features available only in your region. Share your location to unlock now!',
    heroIcon: Lock,
    imageSrc: 'https://placehold.co/400x250.png',
    imageHint: 'locked content preview',
  },
  default: {
    title: 'Location Verification Needed',
    actionText: 'Verify My Location',
    message: 'Please share your location to continue using this service.',
    heroIcon: MapPin,
  }
};

export default function LocationPhishingPage() {
  const { addLog } = useLogs();
  const params = useParams();
  const templateId = typeof params.id === 'string' ? params.id : 'default';
  const content = templateContent[templateId] || templateContent.default;

  const [status, setStatus] = useState<'idle' | 'requesting' | 'captured' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    addLog({ type: 'generic', data: { message: `Visited location phishing page: /phishing/location/${templateId}` } });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [templateId]);

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
            {content.imageSrc && (
              <Image 
                src={content.imageSrc} 
                alt="Promotional image for nearby deals" 
                width={400} 
                height={200} 
                className="rounded-lg mx-auto shadow-lg border object-cover" // Added object-cover
              />
            )}
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
              {content.imageSrc && (
                <Image 
                  src={content.imageSrc} 
                  alt="Preview of locked content" 
                  width={300} 
                  height={180} 
                  className="rounded-md mx-auto opacity-60 border-2 border-dashed border-primary/30 object-cover" // Added object-cover
                  data-ai-hint={content.imageHint || "locked preview"}
                />
              )}
              <CardDescription className="text-xl text-foreground font-semibold">{content.message}</CardDescription>
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
        title={content.title} // Use the dynamic title from content
        isLoading={isLoading && status !== 'captured'} // Show loading unless captured
        error={error}
        statusMessage={status === 'captured' ? 'Location data successfully captured for demonstration.' : undefined}
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
            <p className="text-xl font-semibold text-green-700">Location Verified (Simulated)</p>
            <p className="text-md text-green-600">Thank you. This window can now be closed.</p>
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
