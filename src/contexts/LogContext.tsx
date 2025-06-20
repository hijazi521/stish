"use client";
import type { ReactNode } from 'react';
import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import type { LogEntry, LocationData, CameraData } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { openDB, addLogToDB, getLogsFromDB, clearLogsFromDB } from '@/lib/idb'; // StishDB

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
  const [isLoading, setIsLoading] = useState(true); // Restored to true for proper loading state
  const [db, setDb] = useState<IDBDatabase | null>(null); // Restored database state
  const { toast } = useToast();

  // Restored database ready promise management
  const dbReadyPromiseResolverRef = useRef<{ resolve: (db: IDBDatabase) => void; reject: (error: any) => void; } | null>(null);
  const dbReadyPromiseRef = useRef<Promise<IDBDatabase>>(
    new Promise((resolve, reject) => {
      dbReadyPromiseResolverRef.current = { resolve, reject };
    })
  );

  // Restored database initialization and log loading
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
        dbReadyPromiseResolverRef.current?.reject(error);
        if (!database) {
          toast({
            title: "Database Error",
            description: "Could not initialize local database. Logs will not be saved or loaded.",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Error Loading Logs",
            description: "Could not retrieve initial logs from the database.",
            variant: "destructive",
          });
        }
      } finally {
        setIsLoading(false);
      }
    };

    initializeAndLoadLogs();
  }, [toast]);

  // Restored full addLog functionality
  const addLog = useCallback(async (logData: Omit<LogEntry, 'id' | 'timestamp' | 'ip' | 'userAgent'>) => {
    try {
      // Get real IP and geolocation data
      const ip = await getPublicIP();
      const userAgent = navigator.userAgent;
      const geoInfo = await getGeoInfo(ip);

      // Create proper log entry with real data
      const newLog: LogEntry = {
        id: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        ip,
        userAgent,
        type: logData.type,
        data: {
          ...logData.data,
          // Add geolocation info for location logs
          ...(logData.type === 'location' ? geoInfo : {})
        }
      };

      // Update state immediately for real-time display
      setLogs(prevLogs => [newLog, ...prevLogs]);

      // Save to database in background
      (async () => {
        try {
          const dbInstance = db || await dbReadyPromiseRef.current;
          if (!db && dbInstance) {
            setDb(dbInstance); // Keep db state in sync if promise was awaited
          }
          await addLogToDB(dbInstance, newLog);
        } catch (error) {
          console.error("Failed to save log to IndexedDB in background:", error);
          toast({
            title: "Background Save Error",
            description: "A log was added to the view but failed to save persistently.",
            variant: "destructive",
          });
        }
      })();

    } catch (error) {
      console.error("Failed to create log entry:", error);
      toast({
        title: "Log Creation Error",
        description: "Failed to create log entry. Please try again.",
        variant: "destructive",
      });
    }
  }, [db, toast]);

  // Restored full clearLogs functionality
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

