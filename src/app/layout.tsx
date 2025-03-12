'use client';

import '@/app/globals.css'
import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { connectWallet, switchNetwork, CHAIN_CONFIG, ChainKey } from '@/utils/web3';
import { SignOut, List, X, CaretDown, CaretUp, Lightning } from 'phosphor-react';
import Logo from '/public/logo.svg';

interface RootLayoutProps {
  children: React.ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [address, setAddress] = useState<string | null>(null);
  const [currentChain, setCurrentChain] = useState<ChainKey>('lineaSepolia');
  const [isChainMenuOpen, setIsChainMenuOpen] = useState(false);
  const [isNetworkSwitching, setIsNetworkSwitching] = useState(false);
  
  // Check current network on mount and listen for account changes
  useEffect(() => {
    const checkNetwork = async () => {
      if (window.ethereum) {
        try {
          // Check if already connected
          const accounts = await window.ethereum.request({ 
            method: 'eth_accounts' 
          }) as string[];
          
          if (accounts && accounts[0]) {
            setAddress(accounts[0]);
            
            // Only check chain if wallet is connected
            const chainId = await window.ethereum.request({ 
              method: 'eth_chainId' 
            }) as string;
            
            const network = Object.entries(CHAIN_CONFIG).find(
              ([, config]) => config.chainId.toLowerCase() === chainId.toLowerCase()
            );
            
            if (network) {
              setCurrentChain(network[0] as ChainKey);
            }
          }
        } catch (error) {
          console.error('Error checking network:', error);
        }
      }
    };
    
    checkNetwork();

    // Listen for account changes
    if (window.ethereum) {
      const handleAccountsChanged = (accounts: string[]) => {
        if (accounts.length === 0) {
          setAddress(null);
          // Close chain menu if it was open
          setIsChainMenuOpen(false);
        } else {
          setAddress(accounts[0]);
        }
      };

      window.ethereum.on('accountsChanged', handleAccountsChanged);
      return () => {
        window.ethereum?.removeListener('accountsChanged', handleAccountsChanged);
      };
    }
  }, []);

  // Listen for network changes
  useEffect(() => {
    if (window.ethereum) {
      const handleChainChanged = (chainId: string) => {
        const network = Object.entries(CHAIN_CONFIG).find(
          ([, config]) => config.chainId.toLowerCase() === chainId.toLowerCase()
        );
        if (network) {
          setCurrentChain(network[0] as ChainKey);
        }
        setIsNetworkSwitching(false);
      };

      window.ethereum.on('chainChanged', handleChainChanged);
      return () => {
        window.ethereum?.removeListener('chainChanged', handleChainChanged);
      };
    }
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('#chain-switcher')) {
        setIsChainMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleConnect = async () => {
    try {
      const { address: walletAddress } = await connectWallet();
      setAddress(walletAddress);
    } catch (error) {
      console.error('Failed to connect wallet:', error);
    }
  };

  const handleDisconnect = () => {
    setAddress(null);
  };

  const handleChainSwitch = async (chainKey: ChainKey) => {
    if (isNetworkSwitching) return;
    try {
      setIsNetworkSwitching(true);
      await switchNetwork(chainKey);
      setCurrentChain(chainKey);
      setIsChainMenuOpen(false);
    } catch (error) {
      console.error('Failed to switch chain:', error);
    } finally {
      setIsNetworkSwitching(false);
    }
  };

  const formatAddress = (addr: string) => 
    `${addr.slice(0, 6)}...${addr.slice(-4)}`;

  return (
    <html lang="en">
      <body className="bg-[#0A0B0D] text-white min-h-screen">
        <nav className="fixed w-full z-50 border-b border-gray-800/60 bg-[#0A0B0D]/90 backdrop-blur-xl shadow-md shadow-primary-900/10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              {/* Logo */}
              <Link href="/" className="flex items-center space-x-2 group">
                <div className="relative">
                  <div className="absolute inset-0 bg-primary-500/20 rounded-full blur-[10px] group-hover:bg-primary-400/30 transition-all duration-300"></div>
                  <Image 
                    src={Logo}
                    alt="AuditFi Logo"
                    width={34}
                    height={34}
                    className="relative z-10 group-hover:scale-105 transition-transform duration-300"
                  />
                </div>
                <span className="text-xl font-mono font-bold text-white group-hover:text-primary-400 transition-colors duration-200">
                  AuditFi
                </span>
              </Link>

              {/* Desktop Navigation */}
              <div className="hidden md:flex items-center space-x-1">
                {/* Nav Links */}
                <NavLink href="/contract-builder">Contract-builder</NavLink>
                <NavLink href="/testcase-generator">Test</NavLink>
                <NavLink href="/audit">Audit</NavLink>
                <NavLink href="/reports">Reports</NavLink>
                <NavLink href="/documentor">Documentor</NavLink>
                <NavLink href="/profile">Profile</NavLink>

                {/* Wallet Connection and Chain Switcher */}
                {address ? (
                  <>
                    {/* Chain Switcher - Only shown when wallet is connected */}
                    <div className="relative ml-4" id="chain-switcher">
                      <button
                        onClick={() => !isNetworkSwitching && setIsChainMenuOpen(!isChainMenuOpen)}
                        className={`flex items-center space-x-2 px-3 py-2 rounded-lg ${
                          isNetworkSwitching 
                            ? 'bg-gray-700 cursor-not-allowed' 
                            : 'bg-gray-800/50 border border-gray-700/50 hover:border-primary-500/50 hover:bg-gray-800/70'
                        } transition-all duration-200`}
                        disabled={isNetworkSwitching}
                      >
                        {CHAIN_CONFIG[currentChain] && (
                          <div className="relative">
                            <div className="absolute inset-0 bg-primary-500/20 rounded-full blur-[5px]"></div>
                            <Image 
                              src={CHAIN_CONFIG[currentChain].iconPath}
                              alt={CHAIN_CONFIG[currentChain].chainName}
                              width={20}
                              height={20}
                              className="rounded-full relative z-10"
                            />
                          </div>
                        )}
                        <span className="text-sm font-medium">
                          {isNetworkSwitching ? 'Switching...' : (CHAIN_CONFIG[currentChain]?.chainName || 'Select Network')}
                        </span>
                        {isChainMenuOpen ? (
                          <CaretUp className="w-4 h-4 text-primary-400" />
                        ) : (
                          <CaretDown className="w-4 h-4 text-primary-400" />
                        )}
                      </button>

                      {/* Chain Dropdown */}
                      {isChainMenuOpen && (
                        <motion.div 
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.2 }}
                          className="absolute right-0 mt-2 w-48 rounded-lg bg-gray-800/90 backdrop-blur-lg border border-gray-700/70 shadow-lg shadow-primary-900/20 py-1 overflow-hidden"
                        >
                          {Object.entries(CHAIN_CONFIG).map(([key, chain]) => (
                            <button
                              key={key}
                              onClick={() => handleChainSwitch(key as ChainKey)}
                              className={`flex items-center space-x-2 w-full px-4 py-2 text-sm ${
                                currentChain === key 
                                  ? 'bg-primary-500/10 text-primary-400 border-l-2 border-primary-500' 
                                  : 'text-gray-300 hover:bg-gray-700/70 hover:text-white'
                              } transition-all duration-200`}
                              disabled={isNetworkSwitching}
                            >
                              <Image 
                                src={chain.iconPath}
                                alt={chain.chainName}
                                width={18}
                                height={18}
                                className="rounded-full"
                              />
                              <span>{chain.chainName}</span>
                            </button>
                          ))}
                        </motion.div>
                      )}
                    </div>

                    {/* Connected Wallet Display */}
                    <button
                      onClick={handleDisconnect}
                      className="ml-4 flex items-center space-x-2 px-4 py-2 bg-gray-800/70 hover:bg-gray-800 border border-gray-700/50 hover:border-primary-500/50 text-white rounded-lg transition-all duration-200 group"
                    >
                      <span className="text-sm font-medium group-hover:text-primary-400 transition-colors">{formatAddress(address)}</span>
                      <SignOut className="w-4 h-4 text-primary-400" weight="bold" />
                    </button>
                  </>
                ) : (
                  // Wallet Connect Button (when not connected)
                  <button
                    onClick={handleConnect}
                    className="ml-4 px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white font-bold rounded-lg transition-all duration-200 shadow-md shadow-primary-500/20 flex items-center gap-2"
                  >
                    <Lightning weight="fill" className="w-4 h-4" />
                    Connect Wallet
                  </button>
                )}
              </div>

              {/* Mobile Menu Button */}
              <button 
                onClick={() => setIsOpen(!isOpen)}
                className="md:hidden p-2 rounded-lg bg-gray-800/50 hover:bg-gray-800 border border-gray-700/50 transition-colors duration-200"
              >
                {isOpen ? (
                  <X weight="bold" className="w-5 h-5 text-primary-400" />
                ) : (
                  <List weight="bold" className="w-5 h-5 text-primary-400" />
                )}
              </button>
            </div>
          </div>

          {/* Mobile Menu */}
          {isOpen && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
              className="md:hidden bg-gray-900/95 backdrop-blur-xl border-b border-gray-800"
            >
              <div className="px-4 pt-2 pb-3 space-y-2">
                <MobileNavLink href="/contract-builder">Contract Builder</MobileNavLink>
                <MobileNavLink href="/testcase-generator">Test Generator</MobileNavLink>
                <MobileNavLink href="/audit">Audit</MobileNavLink>
                <MobileNavLink href="/reports">Reports</MobileNavLink>
                <MobileNavLink href="/documentor">Documentor</MobileNavLink>
                <MobileNavLink href="/profile">Profile</MobileNavLink>
                
                {/* Mobile Chain Switcher - Only shown when wallet is connected */}
                {address && (
                  <div className="pt-4 pb-1">
                    <p className="px-3 text-xs text-gray-500 uppercase tracking-wider font-medium">Select Network</p>
                    <div className="mt-2 space-y-1">
                      {Object.entries(CHAIN_CONFIG).map(([key, chain]) => (
                        <button
                          key={key}
                          onClick={() => handleChainSwitch(key as ChainKey)}
                          className={`flex items-center space-x-2 w-full px-3 py-2 rounded-lg ${
                            currentChain === key 
                              ? 'bg-primary-500/10 text-primary-400 border-l-2 border-primary-500' 
                              : 'text-gray-300 hover:bg-gray-800/80 hover:text-white'
                          } transition-all duration-200`}
                          disabled={isNetworkSwitching}
                        >
                          <Image 
                            src={chain.iconPath}
                            alt={chain.chainName}
                            width={20}
                            height={20}
                            className="rounded-full"
                          />
                          <span>
                            {isNetworkSwitching && currentChain === key ? 'Switching...' : chain.chainName}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Mobile Wallet Connection */}
                <div className="pt-4">
                  {address ? (
                    <button
                      onClick={handleDisconnect}
                      className="flex items-center justify-center space-x-2 w-full px-4 py-3 bg-gray-800/80 border border-gray-700 text-white rounded-lg hover:bg-gray-800 hover:border-primary-500/50 transition-all duration-200"
                    >
                      <span className="font-medium">{formatAddress(address)}</span>
                      <SignOut className="w-4 h-4 text-primary-400" weight="bold" />
                    </button>
                  ) : (
                    <button
                      onClick={handleConnect}
                      className="w-full px-4 py-3 bg-primary-600 hover:bg-primary-700 text-white font-bold rounded-lg transition-all duration-200 shadow-lg shadow-primary-700/20 flex items-center justify-center gap-2"
                    >
                      <Lightning weight="fill" className="w-5 h-5" />
                      Connect Wallet
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </nav>

        <main className="pt-16">
          {children}
        </main>
      </body>
    </html>
  );
}

interface NavLinkProps {
  href: string;
  children: React.ReactNode;
}

function NavLink({ href, children }: NavLinkProps) {
  return (
    <Link 
      href={href} 
      className="group px-3 py-2 relative text-gray-300 hover:text-white transition-colors duration-200"
    >
      {children}
      <span className="absolute inset-x-3 bottom-1 h-[2px] bg-primary-500 transform scale-x-0 origin-left transition-transform group-hover:scale-x-100 duration-300"></span>
    </Link>
  );
}

function MobileNavLink({ href, children }: NavLinkProps) {
  return (
    <Link 
      href={href}
      className="block px-3 py-2.5 text-gray-300 hover:text-white hover:bg-primary-500/10 rounded-lg transition-colors duration-200 border-l-2 border-transparent hover:border-primary-500"
    >
      {children}
    </Link>
  );
}