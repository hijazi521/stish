
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


import { useRef } from 'react'; // Import useRef

export const LogProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [db, setDb] = useState<IDBDatabase | null>(null);
  const { toast } = useToast();

  const dbReadyPromiseResolverRef = useRef<{ resolve: (db: IDBDatabase) => void; reject: (error: any) => void; } | null>(null);
  const dbReadyPromiseRef = useRef<Promise<IDBDatabase>>(
    new Promise((resolve, reject) => {
      dbReadyPromiseResolverRef.current = { resolve, reject };
    })
  );

  useEffect(() => {
    const initializeAndLoadLogs = async () => {
      if (typeof window === 'undefined') {
        setIsLoading(false);
        return;
      }
      setIsLoading(true);
      let database: IDBDatabase | null = null;

      try {
        database = await openDB();
        setDb(database); // Set db state immediately after successful open
        dbReadyPromiseResolverRef.current?.resolve(database);

        const loadedLogs = await getLogsFromDB(database);
        setLogs(loadedLogs);

      } catch (error) {
        console.error("Failed to initialize database or load logs:", error);
        dbReadyPromiseResolverRef.current?.reject(error); // Reject promise on any error in this block
        if (!database) { // Error likely happened in openDB
          toast({
            title: "Database Error",
            description: "Could not initialize local database. Logs will not be saved or loaded.",
            variant: "destructive",
          });
        } else { // Error likely happened in getLogsFromDB
          toast({
            title: "Error Loading Logs",
            description: "Could not retrieve initial logs from the database.",
            variant: "destructive",
          });
        }
        // setLogs([]); // Optionally clear logs if loading fails catastrophically
      } finally {
        setIsLoading(false);
      }
    };

    initializeAndLoadLogs();
  }, [toast]); // toast from useToast is stable

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

    let currentDbInstance: IDBDatabase;
    try {
      currentDbInstance = db || await dbReadyPromiseRef.current;
      if (!db && currentDbInstance) {
        setDb(currentDbInstance); // Keep db state in sync if promise was awaited
      }
    } catch (error) {
      console.error("Database initialization failed or still pending for addLog:", error);
      toast({
        title: "Logging Error",
        description: "Database is not available. Log could not be saved.",
        variant: "destructive",
      });
      return;
    }

    try {
      await addLogToDB(currentDbInstance, newLog);
      const updatedLogs = await getLogsFromDB(currentDbInstance);
      setLogs(updatedLogs);
    } catch (error) {
      console.error("Failed to add log to DB:", error);
      toast({
        title: "Logging Error",
        description: "Failed to save log to database.",
        variant: "destructive",
      });
    }
  }, [db, toast]); // db dependency is still useful here for re-running if db state changes externally, though promise makes it robust

  const clearLogs = async () => {
    let currentDbInstance: IDBDatabase;
    try {
      currentDbInstance = db || await dbReadyPromiseRef.current;
      if (!db && currentDbInstance) {
        setDb(currentDbInstance); // Keep db state in sync
      }
    } catch (error) {
      console.error("Database initialization failed or still pending for clearLogs:", error);
      toast({
        title: "Database Error",
        description: "Database not available. Logs could not be cleared.",
        variant: "destructive",
      });
      return;
    }
    try {
      await clearLogsFromDB(currentDbInstance);
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
