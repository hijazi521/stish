"use client";
import type { ReactNode } from 'react';
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { LogEntry, LocationData } from '@/types';
import { useToast } from '@/hooks/use-toast';

interface LogContextType {
  logs: LogEntry[];
  addLog: (log: Omit<LogEntry, 'id' | 'timestamp' | 'ip' | 'userAgent'>) => void;
  clearLogs: () => void;
  isLoading: boolean;
}

const LogContext = createContext<LogContextType | undefined>(undefined);

async function getPublicIP(): Promise<string> {
  try {
    // Note: Using a public IP service. In a real scenario, IP is best captured server-side.
    // This is a common free service, but its availability can vary.
    // Consider alternatives or acknowledge this limitation.
    const response = await fetch('https://api.ipify.org?format=json');
    if (!response.ok) {
      console.error("Failed to fetch IP, status:", response.status);
      return "IP Not Found (Fetch Error)";
    }
    const data = await response.json();
    return data.ip || "IP Not Found (API)";
  } catch (error) {
    console.error("Error fetching IP:", error);
    return "IP Not Found (Catch)";
  }
}

async function getGeoInfo(ip: string): Promise<{ city?: string; country?: string }> {
  if (ip.startsWith("IP Not Found") || ip === "127.0.0.1" || ip === "localhost") {
    return { city: "Local", country: "N/A" };
  }
  try {
    // Using ip-api.com for geolocation. Free tier has limitations.
    const response = await fetch(`https://ip-api.com/json/${ip}?fields=status,message,country,city`);
    if (!response.ok) return {};
    const data = await response.json();
    if (data.status === 'success') {
      return { city: data.city, country: data.country };
    }
  } catch (error) {
    console.error("Error fetching geo info:", error);
  }
  return {};
}


export const LogProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    try {
      const storedLogs = localStorage.getItem('stish_logs');
      if (storedLogs) {
        setLogs(JSON.parse(storedLogs));
      }
    } catch (error) {
      console.error("Error parsing logs from localStorage:", error);
      localStorage.removeItem('stish_logs'); // Clear corrupted data
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    if (!isLoading) {
      try {
        localStorage.setItem('stish_logs', JSON.stringify(logs));
      } catch (error) {
        console.error("Error saving logs to localStorage:", error);
        // Potentially notify user if storage is full or failing
      }
    }
  }, [logs, isLoading]);

  const addLog = useCallback(async (logData: Omit<LogEntry, 'id' | 'timestamp' | 'ip' | 'userAgent'>) => {
    const ip = await getPublicIP();
    const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : 'N/A';
    
    const newLog: LogEntry = {
      ...logData,
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      ip,
      userAgent,
    };
    setLogs(prevLogs => [newLog, ...prevLogs]);

    let toastTitle = "New Data Captured!";
    let toastDescription = `Type: ${newLog.type}, IP: ${ip}`;

    if (newLog.type === 'location') {
      const locData = newLog.data as LocationData;
      const geoInfo = await getGeoInfo(ip);
      const city = geoInfo.city || (locData as any).city || "Unknown City"; // Use fetched or existing
      const country = geoInfo.country || (locData as any).country || "Unknown Country";
      toastTitle = "Location Data Captured!";
      toastDescription = `From ${city}, ${country}. IP: ${ip}.`;
    } else if (newLog.type === 'camera') {
      toastTitle = "Camera Snapshot Captured!";
      toastDescription = `Image captured from IP: ${ip}.`;
    } else if (newLog.type === 'audio') {
      toastTitle = "Audio Capture Simulated!";
      toastDescription = `Audio event from IP: ${ip}.`;
    }
    
    toast({
      title: toastTitle,
      description: toastDescription,
      variant: "default", // or 'destructive' based on type
    });
  }, [toast]);

  const clearLogs = () => {
    setLogs([]);
    toast({
      title: "Logs Cleared",
      description: "All captured data has been deleted.",
    });
  };

  return (
    <LogContext.Provider value={{ logs, addLog, clearLogs, isLoading }}>
      {children}
    </LogContext.Provider>
  );
};

export const useLogs = (): LogContextType => {
  const context = useContext(LogContext);
  if (context === undefined) {
    throw new Error('useLogs must be used within a LogProvider');
  }
  return context;
};
