"use client";
import type { ReactNode } from 'react';
import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import type { LogEntry, LocationData, CameraData } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { openDB, addLogToDB, getLogsFromDB, clearLogsFromDB } from '@/lib/idb';

interface LogContextType {
  logs: LogEntry[];
  addLog: (log: Omit<LogEntry, 'id' | 'timestamp' | 'ip' | 'userAgent'>) => Promise<void>;
  clearLogs: () => Promise<void>;
  isLoading: boolean;
  isConnected: boolean;
}

const LogContext = createContext<LogContextType | undefined>(undefined);

// Enhanced IP fetching with multiple fallbacks and caching
let cachedIP: string | null = null;
let ipFetchPromise: Promise<string> | null = null;

async function getPublicIP(): Promise<string> {
  if (cachedIP) return cachedIP;
  if (ipFetchPromise) return ipFetchPromise;

  ipFetchPromise = (async () => {
    const endpoints = [
      'https://api.ipify.org?format=json',
      'https://ipapi.co/json/',
      'https://httpbin.org/ip'
    ];

    for (const endpoint of endpoints) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000);
        
        const response = await fetch(endpoint, { 
          signal: controller.signal,
          headers: { 'Accept': 'application/json' }
        });
        clearTimeout(timeoutId);
        
        if (!response.ok) continue;
        
        const data = await response.json();
        const ip = data.ip || data.origin?.split(',')[0]?.trim();
        
        if (ip && /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/.test(ip)) {
          cachedIP = ip;
          return ip;
        }
      } catch (error) {
        console.warn(`IP fetch failed for ${endpoint}:`, error);
        continue;
      }
    }
    
    // Fallback to local detection
    return "127.0.0.1";
  })();

  return ipFetchPromise;
}

// Enhanced geolocation with caching and error handling
const geoCache = new Map<string, { city?: string; country?: string; timestamp: number }>();
const GEO_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

async function getGeoInfo(ip: string): Promise<{ city?: string; country?: string }> {
  if (ip === "127.0.0.1" || ip.startsWith("192.168.") || ip.startsWith("10.")) {
    return { city: "Local", country: "Local Network" };
  }

  // Check cache first
  const cached = geoCache.get(ip);
  if (cached && Date.now() - cached.timestamp < GEO_CACHE_DURATION) {
    return { city: cached.city, country: cached.country };
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    
    const response = await fetch(`https://ip-api.com/json/${ip}?fields=status,message,country,city,regionName`, {
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    
    if (!response.ok) return {};
    
    const data = await response.json();
    if (data.status === 'success') {
      const result = { 
        city: data.city || data.regionName, 
        country: data.country 
      };
      
      // Cache the result
      geoCache.set(ip, { ...result, timestamp: Date.now() });
      return result;
    }
  } catch (error) {
    console.warn("Geolocation fetch failed:", error);
  }
  
  return {};
}

export const LogProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(true);
  const [db, setDb] = useState<IDBDatabase | null>(null);
  const { toast } = useToast();
  
  // Enhanced database promise management
  const dbReadyPromiseResolverRef = useRef<{ resolve: (db: IDBDatabase) => void; reject: (error: any) => void; } | null>(null);
  const dbReadyPromiseRef = useRef<Promise<IDBDatabase>>(
    new Promise((resolve, reject) => {
      dbReadyPromiseResolverRef.current = { resolve, reject };
    })
  );

  // Connection monitoring
  useEffect(() => {
    const handleOnline = () => setIsConnected(true);
    const handleOffline = () => setIsConnected(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Enhanced database initialization with retry logic
  useEffect(() => {
    const initializeAndLoadLogs = async () => {
      if (typeof window === 'undefined') {
        setIsLoading(false);
        return;
      }
      
      setIsLoading(true);
      let database: IDBDatabase | null = null;
      let retryCount = 0;
      const maxRetries = 3;

      while (retryCount < maxRetries) {
        try {
          database = await openDB();
          setDb(database);
          dbReadyPromiseResolverRef.current?.resolve(database);

          const loadedLogs = await getLogsFromDB(database);
          setLogs(loadedLogs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
          break;

        } catch (error) {
          retryCount++;
          console.error(`Database initialization attempt ${retryCount} failed:`, error);
          
          if (retryCount >= maxRetries) {
            dbReadyPromiseResolverRef.current?.reject(error);
            toast({
              title: "Database Initialization Failed",
              description: "Local storage may not be available. Logs will be stored in memory only.",
              variant: "destructive",
            });
          } else {
            // Wait before retry
            await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
          }
        }
      }
      
      setIsLoading(false);
    };

    initializeAndLoadLogs();
  }, [toast]);

  // Enhanced addLog with optimistic updates and robust error handling
  const addLog = useCallback(async (logData: Omit<LogEntry, 'id' | 'timestamp' | 'ip' | 'userAgent'>) => {
    const logId = crypto.randomUUID();
    const timestamp = new Date().toISOString();
    
    // Create optimistic log entry
    const optimisticLog: LogEntry = {
      id: logId,
      timestamp,
      ip: "Fetching...",
      userAgent: navigator.userAgent,
      type: logData.type,
      data: { ...logData.data }
    };

    // Immediately update UI for real-time feel
    setLogs(prevLogs => [optimisticLog, ...prevLogs]);

    try {
      // Fetch IP and geo data in parallel
      const [ip, geoInfo] = await Promise.allSettled([
        getPublicIP(),
        getPublicIP().then(getGeoInfo)
      ]);

      const finalIP = ip.status === 'fulfilled' ? ip.value : "Unknown";
      const finalGeoInfo = geoInfo.status === 'fulfilled' ? geoInfo.value : {};

      // Create final log entry
      const finalLog: LogEntry = {
        ...optimisticLog,
        ip: finalIP,
        data: {
          ...logData.data,
          ...(logData.type === 'location' ? finalGeoInfo : {})
        }
      };

      // Update the optimistic entry with real data
      setLogs(prevLogs => 
        prevLogs.map(log => log.id === logId ? finalLog : log)
      );

      // Save to database in background
      if (db || dbReadyPromiseRef.current) {
        try {
          const dbInstance = db || await dbReadyPromiseRef.current;
          await addLogToDB(dbInstance, finalLog);
        } catch (dbError) {
          console.error("Failed to save log to IndexedDB:", dbError);
          // Don't show toast for background save failures unless critical
        }
      }

    } catch (error) {
      console.error("Failed to enhance log entry:", error);
      
      // Update with error state but keep the log
      setLogs(prevLogs => 
        prevLogs.map(log => 
          log.id === logId 
            ? { ...log, ip: "Error fetching IP", data: { ...log.data, error: "Network error" } }
            : log
        )
      );
    }
  }, [db, toast]);

  // Enhanced clearLogs with confirmation and proper cleanup
  const clearLogs = useCallback(async (): Promise<void> => {
    try {
      // Clear UI immediately
      setLogs([]);
      
      // Clear database
      if (db || dbReadyPromiseRef.current) {
        const dbInstance = db || await dbReadyPromiseRef.current;
        await clearLogsFromDB(dbInstance);
      }
      
      // Clear caches
      cachedIP = null;
      ipFetchPromise = null;
      geoCache.clear();
      
      toast({
        title: "Logs Cleared Successfully",
        description: "All captured data has been permanently deleted.",
        variant: "default",
      });
      
    } catch (error) {
      console.error("Failed to clear logs:", error);
      toast({
        title: "Clear Operation Failed",
        description: "Some logs may not have been cleared. Please try again.",
        variant: "destructive",
      });
    }
  }, [db, toast]);

  return (
    <LogContext.Provider value={{ logs, addLog, clearLogs, isLoading, isConnected }}>
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

