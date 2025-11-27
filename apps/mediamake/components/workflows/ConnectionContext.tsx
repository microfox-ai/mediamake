import { createContext, useContext, useState, ReactNode } from 'react';

interface ConnectionContextType {
  isConnecting: boolean;
  setIsConnecting: (value: boolean) => void;
}

const ConnectionContext = createContext<ConnectionContextType | undefined>(undefined);

export function ConnectionProvider({ children }: { children: ReactNode }) {
  const [isConnecting, setIsConnecting] = useState(false);

  return (
    <ConnectionContext.Provider value={{ isConnecting, setIsConnecting }}>
      {children}
    </ConnectionContext.Provider>
  );
}

export function useConnection() {
  const context = useContext(ConnectionContext);
  if (!context) {
    throw new Error('useConnection must be used within ConnectionProvider');
  }
  return context;
}

