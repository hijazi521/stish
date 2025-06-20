
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
  // const [isLoading, setIsLoading] = useState(true); // Commented out
  const [isLoading, setIsLoading] = useState(false); // isLoading is now always false
  // const [db, setDb] = useState<IDBDatabase | null>(null); // Commented out
  // const { toast } = useToast(); // Keep toast if needed for other things, or remove if not used at all

  // const dbReadyPromiseResolverRef = useRef<{ resolve: (db: IDBDatabase) => void; reject: (error: any) => void; } | null>(null); // Commented out
  // const dbReadyPromiseRef = useRef<Promise<IDBDatabase>>( // Commented out
  //   new Promise((resolve, reject) => {
  //     dbReadyPromiseResolverRef.current = { resolve, reject };
  //   })
  // );

  // useEffect(() => { // Commented out entire useEffect for initializeAndLoadLogs
  //   const initializeAndLoadLogs = async () => {
  //     if (typeof window === 'undefined') {
  //       setIsLoading(false);
  //       return;
  //     }
  //     setIsLoading(true);
  //     let database: IDBDatabase | null = null;

  //     try {
  //       database = await openDB();
  //       setDb(database); // Set db state immediately after successful open
  //       dbReadyPromiseResolverRef.current?.resolve(database);

  //       const loadedLogs = await getLogsFromDB(database);
  //       setLogs(loadedLogs);

  //     } catch (error) {
  //       console.error("Failed to initialize database or load logs:", error);
  //       dbReadyPromiseResolverRef.current?.reject(error); // Reject promise on any error in this block
  //       if (!database) { // Error likely happened in openDB
  //         toast({
  //           title: "Database Error",
  //           description: "Could not initialize local database. Logs will not be saved or loaded.",
  //           variant: "destructive",
  //         });
  //       } else { // Error likely happened in getLogsFromDB
  //         toast({
  //           title: "Error Loading Logs",
  //           description: "Could not retrieve initial logs from the database.",
  //           variant: "destructive",
  //         });
  //       }
  //       // setLogs([]); // Optionally clear logs if loading fails catastrophically
  //     } finally {
  //       setIsLoading(false);
  //     }
  //   };

  //   initializeAndLoadLogs();
  // }, [toast]);

  const addLog = useCallback(async (logData: Omit<LogEntry, 'id' | 'timestamp' | 'ip' | 'userAgent'>) => {
    // Simplified newLog for testing
    const newLog: LogEntry = {
      id: crypto.randomUUID(),
      type: 'TEST' as any, // Cast to any if 'TEST' is not a valid LogEntry['type']
      timestamp: new Date().toISOString(),
      ip: 'N/A',
      userAgent: 'N/A',
      data: { message: 'Test Log ' + Date.now() }
    };

    setLogs(prevLogs => [newLog, ...prevLogs]);

    // Commented out asynchronous background save
    // (async () => {
    //   try {
    //     const dbInstance = db || await dbReadyPromiseRef.current;
    //     if (!db && dbInstance) {
    //       setDb(dbInstance); // Keep db state in sync if promise was awaited
    //     }
    //     await addLogToDB(dbInstance, newLog);
    //   } catch (error) {
    //     console.error("Failed to save log to IndexedDB in background:", error);
    //     // Optional: Consider a toast notification for the user if background save fails
    //     // toast({
    //     //   title: "Background Save Error",
    //     //   description: "A log was added to the view but failed to save persistently.",
    //     //   variant: "warning", // Or "destructive" if critical
    //     // });
    //   }
    // })();

  }, []); // Dependencies are empty now as db, setDb are removed

  const clearLogs = async () => { // Made it async to match interface, but body is sync
    setLogs([]); // Clear local state only
    // Commented out DB interaction
    // let currentDbInstance: IDBDatabase;
    // try {
    //   currentDbInstance = db || await dbReadyPromiseRef.current;
    //   if (!db && currentDbInstance) {
    //     setDb(currentDbInstance); // Keep db state in sync
    //   }
    // } catch (error) {
    //   console.error("Database initialization failed or still pending for clearLogs:", error);
    //   toast({
    //     title: "Database Error",
    //     description: "Database not available. Logs could not be cleared.",
    //     variant: "destructive",
    //   });
    //   return;
    // }
    // try {
    //   await clearLogsFromDB(currentDbInstance);
    //   toast({
    //     title: "Logs Cleared",
    //     description: "All captured data has been deleted from IndexedDB.",
    //   });
    // } catch (error) {
    //   console.error("Failed to clear logs from DB:", error);
    //   toast({
    //     title: "Clearing Error",
    //     description: "Failed to clear logs from the database.",
    //     variant: "destructive",
    //   });
    // }
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
