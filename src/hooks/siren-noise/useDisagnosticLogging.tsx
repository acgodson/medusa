import { useRef, useCallback } from "react";

interface DiagnosticLog {
  timestamp: number;
  type: "info" | "warning" | "error";
  message: string;
  data?: any;
}

export const useDiagnosticLogging = (context: string) => {
    const log = useCallback((level: 'info' | 'warning' | 'error', message: string, data?: any) => {
      const timestamp = new Date().toISOString();
      const logEntry = {
        timestamp,
        context,
        level,
        message,
        data: data || {}
      };
  
      // Console logging
      switch(level) {
        case 'info':
          console.log(`[${context}] ${message}`, data);
          break;
        case 'warning':
          console.warn(`[${context}] ${message}`, data);
          break;
        case 'error':
          console.error(`[${context}] ${message}`, data);
          break;
      }
  
      // Additional logging logic can be added here if needed
      return logEntry;
    }, [context]);
  
    return { log };
  };