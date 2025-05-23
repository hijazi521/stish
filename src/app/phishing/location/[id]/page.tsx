"use client";
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useLogs } from '@/contexts/LogContext';
import type { LocationData } from '@/types';
import { Button } from '@/components/ui/button';
import { PhishingPageLayout } from '@/components/phishing/PhishingPageLayout';
import { MapPin, CheckCircle, AlertTriangle } from 'lucide-react';

// Dummy content based on template ID
const templateContent: Record<string, { title: string, actionText: string, message: string }> = {
  'prize-claim': {
    title: 'Claim Your Prize!',
    actionText: 'Verify Location to Claim',
    message: 'Congratulations! You have won a prize. Please verify your location to proceed with claiming your reward.',
  },
  'security-alert': {
    title: 'Security Alert',
    actionText: 'Verify My Location',
    message: 'We detected unusual activity on your account. Please verify your current location to secure your account.',
  },
  'content-unlock': {
    title: 'Unlock Exclusive Content',
    actionText: 'Unlock Content by Verifying Location',
    message: 'This content is region-restricted. Verify your location to access exclusive materials.',
  },
  default: {
    title: 'Location Verification Required',
    actionText: 'Verify Location',
    message: 'Please verify your location to continue.',
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
        
        // Attempt to get city/country (client-side, best effort)
        try {
          const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${locationData.latitude}&lon=${locationData.longitude}&zoom=10&addressdetails=1`);
          if (response.ok) {
            const geo = await response.json();
            locationData.city = geo.address?.city || geo.address?.town || geo.address?.village;
            locationData.country = geo.address?.country;
          }
        } catch (e) {
          console.warn("Could not fetch city/country from Nominatim:", e);
        }

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

  useEffect(() => {
    // Optionally auto-trigger on page load if design implies it, or wait for button click.
    // For this demo, let's make it user-triggered for clarity.
    // handleLocationRequest(); // Uncomment for auto-trigger
  }, []);


  return (
    <PhishingPageLayout 
        title={content.title}
        isLoading={isLoading}
        error={error}
        statusMessage={status === 'captured' ? 'Location data successfully captured for demonstration.' : undefined}
    >
      <p className="text-center text-muted-foreground mb-6">{content.message}</p>
      
      {status !== 'captured' && (
        <Button 
          onClick={handleLocationRequest} 
          className="w-full bg-accent hover:bg-accent/90 text-accent-foreground"
          disabled={isLoading || status === 'requesting'}
        >
          <MapPin className="mr-2 h-5 w-5" />
          {isLoading ? 'Verifying...' : content.actionText}
        </Button>
      )}

      {status === 'captured' && (
        <div className="text-center p-4 bg-green-50 border border-green-200 rounded-md">
          <CheckCircle className="mx-auto h-10 w-10 text-green-600 mb-2" />
          <p className="font-semibold text-green-700">Location Verified (Simulated)</p>
          <p className="text-sm text-green-600">Thank you. This window can now be closed.</p>
        </div>
      )}
      {status === 'error' && error && (
         <div className="text-center p-4 bg-red-50 border border-red-200 rounded-md">
          <AlertTriangle className="mx-auto h-10 w-10 text-red-600 mb-2" />
          <p className="font-semibold text-red-700">Location Access Failed</p>
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}
    </PhishingPageLayout>
  );
}
