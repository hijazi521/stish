
"use client";
import type { ReactNode } from 'react';
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { LogEntry, LocationData } from '@/types';
import { useToast } from '@/hooks/use-toast';

interface LogContextType {
  logs: LogEntry[];
  addLog: (log: Omit<LogEntry, 'id' | 'timestamp' | 'ip' | 'userAgent'>) => Promise<void>; // Changed to Promise<void>
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
  const { toast } = useToast(); // Kept for clearLogs, but not for addLog directly

  // Load logs from localStorage on initial mount
  useEffect(() => {
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

  // Sync logs to localStorage whenever they change
  useEffect(() => {
    if (!isLoading) {
      try {
        localStorage.setItem('stish_logs', JSON.stringify(logs));
      } catch (error) {
        console.error("Error saving logs to localStorage:", error);
      }
    }
  }, [logs, isLoading]);

  // Listen for localStorage changes from other tabs
  useEffect(() => {
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
    
    const newLogBase: Omit<LogEntry, 'data'> = {
      ...logData,
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      ip,
      userAgent,
    };

    let finalData = logData.data;

    if (logData.type === 'location') {
      const geoInfo = await getGeoInfo(ip);
      // Enrich the data for location logs
      finalData = {
        ...(logData.data as LocationData), // Cast to ensure original properties are kept
        city: geoInfo.city,
        country: geoInfo.country,
      };
    }
    
    const newLog: LogEntry = {
      ...newLogBase,
      data: finalData,
    };

    setLogs(prevLogs => [newLog, ...prevLogs]);
    // Toasting logic moved to DashboardPage
  }, []);

  const clearLogs = () => {
    setLogs([]);
    toast({ // Toast for clearing logs can remain here or be moved too, but it's a direct action on dashboard
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
