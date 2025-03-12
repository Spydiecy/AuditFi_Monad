'use client';

import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { 
  Star,
  ArrowSquareOut,
  CircleNotch,
  Wallet,
  User,
  ChartBar,
  ListChecks,
  Lightning
} from 'phosphor-react';
import Image from 'next/image';
import { CHAIN_CONFIG } from '@/utils/web3';
import { CONTRACT_ADDRESSES, AUDIT_REGISTRY_ABI } from '@/utils/contracts';
import { useWallet } from '@/contexts/WalletConext';

interface AuditStats {
  totalAudits: number;
  averageStars: number;
  chainBreakdown: Record<string, number>;
  recentAudits: UserAudit[];
}

interface UserAudit {
  contractHash: string;
  stars: number;
  summary: string;
  timestamp: number;
  chain: keyof typeof CHAIN_CONFIG;
}

export default function ProfilePage() {
  const { walletAddress, walletConnected, connectWallet } = useWallet();
  const [stats, setStats] = useState<AuditStats>({
    totalAudits: 0,
    averageStars: 0,
    chainBreakdown: {},
    recentAudits: []
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch user stats when wallet is connected
  useEffect(() => {
    if (walletConnected && walletAddress) {
      fetchUserStats(walletAddress);
    } else {
      setIsLoading(false);
    }
  }, [walletConnected, walletAddress]);

  const fetchUserStats = async (userAddress: string) => {
    setIsLoading(true);
    setError(null);
    const allAudits: UserAudit[] = [];
    const chainCounts: Record<string, number> = {};
    let totalStars = 0;

    for (const [chainKey, chainData] of Object.entries(CHAIN_CONFIG)) {
      console.log(`Attempting to fetch from ${chainKey}...`);
      
      // Get contract address for this chain
      const contractAddress = CONTRACT_ADDRESSES[chainKey as keyof typeof CONTRACT_ADDRESSES];
      if (!contractAddress) {
        console.log(`No contract address found for ${chainKey}, skipping...`);
        continue;
      }

      let success = false;
      let retryCount = 0;
      const maxRetries = 3;
      const baseDelay = 2000; // 2 seconds base delay

      while (!success && retryCount < maxRetries) {
        // Try each RPC URL in sequence
        for (const rpcUrl of chainData.rpcUrls) {
          try {
            console.log(`Attempting RPC ${rpcUrl} (attempt ${retryCount + 1}/${maxRetries})...`);
            
            // Create provider with more aggressive timeouts
            const provider = new ethers.JsonRpcProvider(rpcUrl, undefined, {
              staticNetwork: true,
              polling: true,
              pollingInterval: 1000,
              batchMaxCount: 1
            });

            // Create contract instance
            const contract = new ethers.Contract(
              contractAddress,
              AUDIT_REGISTRY_ABI,
              provider
            );

            // Get total contracts with timeout
            const totalContractsPromise = contract.getTotalContracts();
            const totalContracts = await Promise.race([
              totalContractsPromise,
              new Promise((_, reject) => 
                setTimeout(() => reject(new Error('getTotalContracts timeout')), 10000)
              )
            ]);

            const totalContractsNum = Number(totalContracts);
            console.log(`Total contracts on ${chainKey}: ${totalContractsNum}`);

            if (totalContractsNum === 0) {
              console.log(`No contracts found on ${chainKey}`);
              success = true;
              break;
            }

            // Fetch all audits with timeout
            const getAllAuditsPromise = contract.getAllAudits(0, totalContractsNum);
            const result = await Promise.race([
              getAllAuditsPromise,
              new Promise((_, reject) => 
                setTimeout(() => reject(new Error('getAllAudits timeout')), 20000)
              )
            ]);

            if (!result || !Array.isArray(result.contractHashes)) {
              throw new Error('Invalid response format');
            }

            const {
              contractHashes,
              stars,
              summaries,
              auditors,
              timestamps
            } = result;

            // Process results in smaller batches to prevent UI freezing
            const batchSize = 50;
            for (let i = 0; i < contractHashes.length; i += batchSize) {
              const batch = contractHashes.slice(i, i + batchSize);
              batch.forEach((hash: string, idx: number) => {
                const actualIdx = i + idx;
                if (actualIdx < stars.length && actualIdx < summaries.length && 
                    actualIdx < auditors.length && actualIdx < timestamps.length &&
                    auditors[actualIdx].toLowerCase() === userAddress.toLowerCase()) {
                  allAudits.push({
                    contractHash: hash,
                    stars: Number(stars[actualIdx]),
                    summary: summaries[actualIdx] || '',
                    timestamp: Number(timestamps[actualIdx]),
                    chain: chainKey as keyof typeof CHAIN_CONFIG
                  });

                  // Update chain counts and total stars
                  chainCounts[chainKey] = (chainCounts[chainKey] || 0) + 1;
                  totalStars += Number(stars[actualIdx]);
                }
              });
              // Small delay between batches to prevent UI freeze
              await new Promise(resolve => setTimeout(resolve, 10));
            }

            console.log(`Successfully processed ${contractHashes.length} audits from ${chainKey}`);
            success = true;
            break; // Break the RPC URL loop if successful

          } catch (error: any) {
            // Check for specific RPC errors
            if (error?.code === 'SERVER_ERROR' || 
                (error?.message && (
                  error.message.includes('503') || 
                  error.message.includes('timeout') ||
                  error.message.includes('network error')
                ))) {
              console.warn(`RPC ${rpcUrl} failed (${error.message}), trying next...`);
              continue;
            }
            console.error(`Error on ${chainKey}:`, error);
          }
        }

        if (!success) {
          retryCount++;
          if (retryCount < maxRetries) {
            const delay = baseDelay * Math.pow(2, retryCount); // Exponential backoff
            console.log(`All RPCs failed for ${chainKey}, retrying in ${delay}ms...`);
            await new Promise(resolve => setTimeout(resolve, delay));
          }
        }
      }

      if (!success) {
        console.error(`Failed to fetch from ${chainKey} after ${maxRetries} attempts`);
      }
    }

    const totalAudits = allAudits.length;
    console.log(`Total audits found for user: ${totalAudits}`);
    
    setStats({
      totalAudits,
      averageStars: totalAudits > 0 ? totalStars / totalAudits : 0,
      chainBreakdown: chainCounts,
      recentAudits: allAudits
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, 5)
    });
    setIsLoading(false);
  };

  if (!walletConnected || !walletAddress) {
    return (
      <div className="min-h-screen py-12">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex flex-col items-center justify-center space-y-6 mt-20">
            <div className="relative w-20 h-20 mb-2">
              <div className="absolute inset-0 bg-primary-500/20 rounded-full blur-xl"></div>
              <Wallet size={80} className="text-primary-400 relative z-10" weight="duotone" />
            </div>
            <h2 className="text-2xl font-mono">Connect Your Wallet</h2>
            <p className="text-gray-400 max-w-md text-center">Connect your wallet to view your audit profile and see your security verification statistics</p>
            <button
              onClick={async () => {
                try {
                  await connectWallet();
                } catch (error) {
                  console.error('Failed to connect wallet:', error);
                }
              }}
              className="px-8 py-3 bg-primary-500 hover:bg-primary-600 text-white font-bold rounded-lg transition-all duration-200 flex items-center gap-2 shadow-lg shadow-primary-500/20"
            >
              <Lightning weight="fill" size={20} />
              Connect Wallet
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-12">
      <div className="max-w-6xl mx-auto px-4">
        {/* Profile Header */}
        <div className="bg-gray-900/50 border border-gray-800 hover:border-primary-500/30 transition-colors duration-300 rounded-lg p-6 mb-8 shadow-lg">
          <div className="flex items-start justify-between">
            <div>
              <div className="inline-block mb-3 px-4 py-1 rounded-full bg-primary-500/10 border border-primary-500/20">
                <span className="text-primary-400 text-sm font-semibold">Auditor Dashboard</span>
              </div>
              <h1 className="text-3xl font-mono font-bold mb-2">Auditor Profile</h1>
              <div className="flex items-center space-x-2 text-gray-400 bg-gray-800/50 rounded-lg px-3 py-1.5 border border-gray-700/50 inline-flex">
                <User size={16} className="text-primary-400" weight="bold" />
                <span className="font-mono">{walletAddress}</span>
                <a
                  href={`https://monad-testnet.socialscan.io/address/${walletAddress}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary-400 hover:text-primary-300 transition-colors"
                >
                  <ArrowSquareOut size={16} weight="bold" />
                </a>
              </div>
            </div>
            <button
              onClick={() => fetchUserStats(walletAddress)}
              className="p-2 hover:bg-primary-500/10 rounded-lg transition-colors duration-200"
              title="Refresh Stats"
            >
              <CircleNotch 
                size={24} 
                weight="bold"
                className={`text-primary-400 ${isLoading ? 'animate-spin' : ''}`}
              />
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="flex flex-col items-center">
              <CircleNotch size={40} className="animate-spin text-primary-400 mb-4" weight="bold" />
              <span className="text-primary-400">Loading your profile data...</span>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Stats Cards */}
            <div className="space-y-8">
              {/* Overall Stats */}
              <div className="bg-gray-900/50 border border-gray-800 hover:border-primary-500/30 transition-colors duration-300 rounded-lg p-6 shadow-lg">
                <div className="flex items-center gap-2 mb-4">
                  <ChartBar size={20} className="text-primary-400" weight="duotone" />
                  <h2 className="text-xl font-mono">Overall Statistics</h2>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-800/70 rounded-lg p-4 border border-gray-700/50 hover:border-primary-500/30 transition-colors duration-300">
                    <div className="text-3xl font-bold text-white">{stats.totalAudits}</div>
                    <div className="text-sm text-primary-400 mt-1">Total Audits</div>
                  </div>
                  <div className="bg-gray-800/70 rounded-lg p-4 border border-gray-700/50 hover:border-primary-500/30 transition-colors duration-300">
                    <div className="flex items-center space-x-1">
                      <span className="text-3xl font-bold text-white">
                        {stats.averageStars.toFixed(1)}
                      </span>
                      <Star weight="fill" className="text-primary-400" size={20} />
                    </div>
                    <div className="text-sm text-primary-400 mt-1">Average Rating</div>
                  </div>
                </div>
              </div>

              {/* Chain Distribution */}
              <div className="bg-gray-900/50 border border-gray-800 hover:border-primary-500/30 transition-colors duration-300 rounded-lg p-6 shadow-lg">
                <div className="flex items-center gap-2 mb-4">
                  <Lightning size={20} className="text-primary-400" weight="duotone" />
                  <h2 className="text-xl font-mono">Chain Distribution</h2>
                </div>
                <div className="space-y-4">
                  {Object.entries(stats.chainBreakdown).length > 0 ? (
                    Object.entries(stats.chainBreakdown).map(([chain, count]) => (
                      <div key={chain} className="flex items-center space-x-4">
                        <div className="relative">
                          <div className="absolute inset-0 bg-primary-500/20 rounded-full blur-[2px]"></div>
                          <Image
                            src={CHAIN_CONFIG[chain as keyof typeof CHAIN_CONFIG].iconPath}
                            alt={CHAIN_CONFIG[chain as keyof typeof CHAIN_CONFIG].chainName}
                            width={24}
                            height={24}
                            className="rounded-full relative z-10"
                          />
                        </div>
                        <div className="flex-1">
                          <div className="flex justify-between items-center mb-1">
                            <span>{CHAIN_CONFIG[chain as keyof typeof CHAIN_CONFIG].chainName}</span>
                            <span className="text-gray-400 px-2 py-0.5 rounded-full bg-primary-500/10 text-primary-300 text-xs border border-primary-500/20">{count} audits</span>
                          </div>
                          <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-primary-500"
                              style={{
                                width: `${(count / (stats.totalAudits || 1)) * 100}%`
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 bg-gray-800/30 rounded-lg border border-gray-700/30">
                      <div className="flex flex-col items-center">
                        <Lightning size={32} className="text-primary-400/50 mb-4" weight="duotone" />
                        <p className="text-gray-400 mb-2">No chain data available</p>
                        <span className="text-xs px-3 py-1 rounded-full bg-primary-500/10 text-primary-300 border border-primary-500/20">
                          Start auditing to see distribution
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Recent Audits */}
            <div className="bg-gray-900/50 border border-gray-800 hover:border-primary-500/30 transition-colors duration-300 rounded-lg p-6 shadow-lg">
              <div className="flex items-center gap-2 mb-4">
                <ListChecks size={20} className="text-primary-400" weight="duotone" />
                <h2 className="text-xl font-mono">Recent Audits</h2>
              </div>
              <div className="space-y-4">
                {stats.recentAudits.length > 0 ? (
                  stats.recentAudits.map((audit) => (
                    <div
                      key={`${audit.contractHash}-${audit.chain}`}
                      className="bg-gray-800/70 rounded-lg p-4 border border-gray-700/50 hover:border-primary-500/30 transition-colors duration-300"
                    >
                      <div className="flex justify-between items-start mb-3">
                        <div className="font-mono text-sm px-2 py-0.5 rounded bg-primary-500/10 text-primary-400 border border-primary-500/20">
                          {audit.contractHash.slice(0, 8)}...{audit.contractHash.slice(-6)}
                        </div>
                        <div className="flex items-center space-x-1">
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={i}
                              weight={i < audit.stars ? "fill" : "regular"}
                              className={i < audit.stars ? "text-primary-400" : "text-gray-600"}
                              size={16}
                            />
                          ))}
                        </div>
                      </div>
                      <div className="text-sm text-gray-300 mb-3">{audit.summary}</div>
                      <div className="flex justify-between items-center text-sm">
                        <div className="flex items-center space-x-2">
                          <div className="relative">
                            <div className="absolute inset-0 bg-primary-500/20 rounded-full blur-[1px]"></div>
                            <Image
                              src={CHAIN_CONFIG[audit.chain].iconPath}
                              alt={CHAIN_CONFIG[audit.chain].chainName}
                              width={16}
                              height={16}
                              className="rounded-full relative z-10"
                            />
                          </div>
                          <span className="text-gray-400">{CHAIN_CONFIG[audit.chain].chainName}</span>
                        </div>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-gray-900/80 text-gray-400 border border-gray-700/50">
                          {new Date(audit.timestamp * 1000).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-12 bg-gray-800/30 rounded-lg border border-gray-700/30">
                    <div className="flex flex-col items-center">
                      <ListChecks size={48} className="text-primary-400/50 mb-4" weight="duotone" />
                      <p className="text-gray-400 mb-2">No audits found</p>
                      <span className="text-xs px-3 py-1 rounded-full bg-primary-500/10 text-primary-300 border border-primary-500/20">
                        Start auditing contracts to see them here
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}