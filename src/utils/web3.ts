import { ethers } from 'ethers';

// Define event types for better type safety
type EthereumEvent = 
  | { type: 'accountsChanged'; value: string[] } 
  | { type: 'chainChanged'; value: string }
  | { type: 'connect'; value: { chainId: string } }
  | { type: 'disconnect'; value: { code: number; message: string } };

// Define event listener type
type EthereumEventListener<T extends EthereumEvent['type']> = (
  ...args: Extract<EthereumEvent, { type: T }>['value'] extends never
    ? []
    : [Extract<EthereumEvent, { type: T }>['value']]
) => void;

// Define interfaces for better type safety
interface EthereumProvider extends ethers.Eip1193Provider {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
  on<T extends EthereumEvent['type']>(event: T, listener: EthereumEventListener<T>): void;
  removeListener<T extends EthereumEvent['type']>(event: T, listener: EthereumEventListener<T>): void;
}

interface NativeCurrency {
  name: string;
  symbol: string;
  decimals: number;
}

interface ChainConfig {
  chainId: string;
  chainName: string;
  nativeCurrency: NativeCurrency;
  rpcUrls: string[];
  blockExplorerUrls: string[];
  iconPath: string;
}

// Extend Window interface properly
declare global {
  interface Window {
    ethereum?: EthereumProvider;
  }
}

export const CHAIN_CONFIG: Record<string, ChainConfig> = {
  monadTestnet: {
    chainId: '0x279F', // 10143 in hex
    chainName: 'Monad Testnet',
    nativeCurrency: {
      name: 'Monad',
      symbol: 'MON',
      decimals: 18
    },
    rpcUrls: ['https://monad-testnet.g.alchemy.com/v2/cPagatQQ9SL_dZvqKBJYoc_dG2cHbmcA','https://testnet-rpc.monad.xyz'],
    blockExplorerUrls: ['https://monad-testnet.socialscan.io'],
    iconPath: '/chains/monad.png'
  },
} as const;

export type ChainKey = keyof typeof CHAIN_CONFIG;

interface WalletConnection {
  provider: ethers.BrowserProvider;
  signer: ethers.JsonRpcSigner;
  address: string;
}

interface EthereumError extends Error {
  code: number;
}

export const connectWallet = async (): Promise<WalletConnection> => {
  if (!window.ethereum) {
    throw new Error('Please install MetaMask');
  }

  try {
    const provider = new ethers.BrowserProvider(window.ethereum);
    await provider.send('eth_requestAccounts', []);
    const signer = await provider.getSigner();
    const address = await signer.getAddress();
    return { provider, signer, address };
  } catch (error) {
    console.error('Error connecting wallet:', error);
    throw error;
  }
};

export const switchNetwork = async (chainKey: ChainKey): Promise<void> => {
  if (!window.ethereum) {
    throw new Error('Please install MetaMask');
  }

  const chain = CHAIN_CONFIG[chainKey];
  
  try {
    await window.ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: chain.chainId }],
    });
  } catch (error) {
    const switchError = error as EthereumError;
    // This error code means the chain has not been added to MetaMask
    if (switchError.code === 4902) {
      try {
        await window.ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [{
            chainId: chain.chainId,
            chainName: chain.chainName,
            nativeCurrency: chain.nativeCurrency,
            rpcUrls: chain.rpcUrls,
            blockExplorerUrls: chain.blockExplorerUrls
          }],
        });
      } catch (addError) {
        console.error('Error adding chain:', addError);
        throw addError;
      }
    } else {
      console.error('Error switching chain:', switchError);
      throw switchError;
    }
  }
};

export const isSupportedNetwork = (chainId: string): boolean => {
  return Object.values(CHAIN_CONFIG).some(
    chain => chain.chainId.toLowerCase() === chainId.toLowerCase()
  );
};

// New functions to work with Privy
export const getChainKeyFromChainId = (chainId: number): ChainKey | null => {
  const chainEntry = Object.entries(CHAIN_CONFIG).find(
    ([, config]) => parseInt(config.chainId, 16) === chainId
  );
  
  return chainEntry ? chainEntry[0] as ChainKey : null;
};

export const getChainConfigFromChainId = (chainId: number): ChainConfig | null => {
  const chainKey = getChainKeyFromChainId(chainId);
  return chainKey ? CHAIN_CONFIG[chainKey] : null;
};