
"use client";
import type { ReactNode } from 'react';
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { LogEntry, LocationData, CameraData } from '@/types'; // Added CameraData
import { useToast } from '@/hooks/use-toast';

interface LogContextType {
  logs: LogEntry[];
  addLog: (log: Omit<LogEntry, 'id' | 'timestamp' | 'ip' | 'userAgent'>) => Promise<void>;
  clearLogs: () => void;
  isLoading: boolean;
}

const LogContext = createContext<LogContextType | undefined>(undefined);

async function getPublicIP(): Promise<string> {
  try {
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
    if (typeof window === 'undefined') {
      setIsLoading(false); // Still need to set loading to false if in SSR/non-browser
      return;
    }
    try {
      const storedLogs = localStorage.getItem('stish_logs');
      if (storedLogs) {
        setLogs(JSON.parse(storedLogs));
      }
    } catch (error) {
      console.error("Error parsing logs from localStorage:", error);
      localStorage.removeItem('stish_logs');
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined' || isLoading) {
      return;
    }
    try {
      localStorage.setItem('stish_logs', JSON.stringify(logs));
    } catch (error) {
      console.error("Error saving logs to localStorage:", error);
    }
  }, [logs, isLoading]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === 'stish_logs' && event.newValue) {
        try {
          setLogs(JSON.parse(event.newValue));
        } catch (error) {
          console.error("Error parsing logs from storage event:", error);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  const addLog = useCallback(async (logData: Omit<LogEntry, 'id' | 'timestamp' | 'ip' | 'userAgent'>) => {
    const ip = await getPublicIP();
    const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : 'N/A';
    
    const newLogBase: Omit<LogEntry, 'id' | 'timestamp' | 'ip' | 'userAgent' | 'data'> = { // data will be added specifically
      type: logData.type,
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      ip,
      userAgent,
    };

    let finalData = logData.data;

    if (logData.type === 'location' && logData.data) {
      const geoInfo = await getGeoInfo(ip);
      finalData = {
        ...(logData.data as LocationData),
        city: geoInfo.city,
        country: geoInfo.country,
      };
    } else if (logData.type === 'camera' && logData.data) {
      finalData = logData.data as CameraData;
    }
    
    const newLog: LogEntry = {
      ...newLogBase,
      data: finalData,
    };

    setLogs(prevLogs => [newLog, ...prevLogs]);
  }, []);

  const clearLogs = () => {
    setLogs([]);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('stish_logs'); // Also clear from localStorage explicitly
    }
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
