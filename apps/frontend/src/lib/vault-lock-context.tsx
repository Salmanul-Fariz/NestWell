import React, { createContext, useContext, useState } from 'react';
import { deriveKey } from './crypto';

interface VaultLockContextType {
  cryptoKey: CryptoKey | null;
  isUnlocked: boolean;
  unlockVault: (masterPassword: string) => Promise<boolean>;
  lockVault: () => void;
}

const VaultLockContext = createContext<VaultLockContextType | undefined>(undefined);

export const VaultLockProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [cryptoKey, setCryptoKey] = useState<CryptoKey | null>(null);
  const [isUnlocked, setIsUnlocked] = useState(false);

  const unlockVault = async (masterPassword: string): Promise<boolean> => {
    try {
      const key = await deriveKey(masterPassword);
      setCryptoKey(key);
      setIsUnlocked(true);
      return true;
    } catch {
      return false;
    }
  };

  const lockVault = () => {
    setCryptoKey(null);
    setIsUnlocked(false);
  };

  return (
    <VaultLockContext.Provider value={{ cryptoKey, isUnlocked, unlockVault, lockVault }}>
      {children}
    </VaultLockContext.Provider>
  );
};

export const useVaultLock = () => {
  const ctx = useContext(VaultLockContext);
  if (!ctx) throw new Error('useVaultLock must be used within VaultLockProvider');
  return ctx;
};
