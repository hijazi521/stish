export interface LogEntry {
  id: string;
  type: 'location' | 'camera' | 'audio' | 'generic';
  timestamp: string;
  ip: string;
  userAgent: string;
  data: any; // Data specific to the log type
}

export interface LocationData {
  latitude: number;
  longitude: number;
  accuracy?: number;
  city?: string; // Added for toast
  country?: string; // Added for toast
}

export interface CameraData {
  imageUrl: string; // base64 data URL
}

export interface AudioData {
  description: string;
  opusAsBase64: string;
  duration?: number; // Duration in seconds
  mimeType?: string; // Actual mimeType used for recording
}

export interface GenericData {
  message: string;
}
