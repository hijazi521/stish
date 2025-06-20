
"use client";
import type { ReactNode } from 'react';
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { LogEntry, LocationData, CameraData } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { openDB, addLogToDB, getLogsFromDB, clearLogsFromDB } from '@/lib/idb'; // StishDB optional

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
  const [db, setDb] = useState<IDBDatabase | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const initDB = async () => {
      if (typeof window === 'undefined') { // Ensure this runs only in client-side
        setIsLoading(false);
        return;
      }
      try {
        const database = await openDB();
        setDb(database);
      } catch (error) {
        console.error("Failed to open DB:", error);
        toast({
          title: "Database Error",
          description: "Could not initialize local database. Logs will not be saved.",
          variant: "destructive",
        });
        setIsLoading(false);
      }
    };
    initDB();
  }, [toast]);

  useEffect(() => {
    if (db) {
      setIsLoading(true);
      getLogsFromDB(db)
        .then(loadedLogs => {
          setLogs(loadedLogs);
        })
        .catch(error => {
          console.error("Error loading logs from DB:", error);
          toast({
            title: "Error Loading Logs",
            description: "Could not retrieve logs from the database.",
            variant: "destructive",
          });
        })
        .finally(() => {
          setIsLoading(false);
        });
    } else {
      // This case handles when DB is not yet initialized or failed to initialize
      if (!isLoading && !db) { // Check if not already loading and db is still null
        console.warn("Database not available, logs will not be loaded from IndexedDB.");
        // setIsLoading(false); // Already handled by initDB's error path or initial state
      }
    }
  }, [db, toast, isLoading]); // Added isLoading to dependencies to re-evaluate if it changes externally

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

    if (!db) {
      console.error("Database not available. Log cannot be saved to IndexedDB.");
      toast({
        title: "Logging Error",
        description: "Database not available. Log could not be saved.",
        variant: "destructive",
      });
      return;
    }

    try {
      await addLogToDB(db, newLog);
      // Re-fetch logs from DB to ensure consistency and reflect any DB-side logic (e.g. sorting)
      const updatedLogs = await getLogsFromDB(db);
      setLogs(updatedLogs);
    } catch (error) {
      console.error("Failed to add log to DB:", error);
      toast({
        title: "Logging Error",
        description: "Failed to save log to database.",
        variant: "destructive",
      });
    }
  }, [db, toast]);

  const clearLogs = async () => { // Made async
    if (!db) {
      console.error("Database not available. Logs cannot be cleared from IndexedDB.");
      toast({
        title: "Database Error",
        description: "Database not available. Logs could not be cleared.",
        variant: "destructive",
      });
      return;
    }
    try {
      await clearLogsFromDB(db);
      setLogs([]); // Clear local state
      toast({
        title: "Logs Cleared",
        description: "All captured data has been deleted from IndexedDB.",
      });
    } catch (error) {
      console.error("Failed to clear logs from DB:", error);
      toast({
        title: "Clearing Error",
        description: "Failed to clear logs from the database.",
        variant: "destructive",
      });
    }
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
