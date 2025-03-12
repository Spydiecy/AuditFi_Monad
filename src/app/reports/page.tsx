'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ethers } from 'ethers';
import { 
  MagnifyingGlass, 
  Star, 
  ArrowSquareOut,
  X,
  FunnelSimple,
  Download,
  FileText,
  ListChecks,
  CircleNotch,
  Copy
} from 'phosphor-react';
import Image from 'next/image';
import { CHAIN_CONFIG } from '@/utils/web3';
import { CONTRACT_ADDRESSES, AUDIT_REGISTRY_ABI, ChainKey } from '@/utils/contracts';

interface AuditReport {
  contractHash: string;
  transactionHash: string;
  stars: number;
  summary: string;
  auditor: string;
  timestamp: number;
  chain: ChainKey;
}

interface FilterState {
  search: string;
  chain: string;
  dateRange: 'all' | 'day' | 'week' | 'month';
  minStars: number;
}

export default function ReportsPage() {
  const [reports, setReports] = useState<AuditReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState<AuditReport | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    chain: 'all',
    dateRange: 'all',
    minStars: 0
  });

  // Fetch audits from all supported chains
  const fetchAllChainAudits = async () => {
    setIsLoading(true);
    try {
      const allAudits: AuditReport[] = [];

      for (const [chainKey, chainData] of Object.entries(CHAIN_CONFIG)) {
        try {
          console.log(`Fetching from ${chainKey}...`);
          
          const provider = new ethers.JsonRpcProvider(chainData.rpcUrls[0]);
  
          const contract = new ethers.Contract(
            CONTRACT_ADDRESSES[chainKey as ChainKey],
            AUDIT_REGISTRY_ABI,
            provider
          );

          // Get total number of contracts first
          try {
            const totalContracts = await contract.getTotalContracts();
            const totalContractsNum = Number(totalContracts);
            console.log(`Total contracts on ${chainKey}: ${totalContractsNum}`);
            
            if (totalContractsNum === 0) {
              console.log(`No contracts found on ${chainKey}`);
              continue;
            }

            // Fetch all audits at once with proper error handling
            try {
              const result = await contract.getAllAudits(0, totalContractsNum);
              
              if (!result || !result.contractHashes) {
                console.log(`No valid audit data returned from ${chainKey}`);
                continue;
              }

              const {
                contractHashes,
                stars,
                summaries,
                auditors,
                timestamps
              } = result;

              // Ensure we have valid arrays before processing
              if (!Array.isArray(contractHashes) || !Array.isArray(stars) || 
                  !Array.isArray(summaries) || !Array.isArray(auditors) || 
                  !Array.isArray(timestamps)) {
                console.error(`Invalid data structure returned from ${chainKey}`);
                continue;
              }

              // Process all audits with proper error handling
              for (let i = 0; i < contractHashes.length; i++) {
                try {
                  allAudits.push({
                    contractHash: contractHashes[i],
                    transactionHash: '', // Skip tx hash lookup for now
                    stars: Number(stars[i]),
                    summary: summaries[i] || '',
                    auditor: auditors[i],
                    timestamp: Number(timestamps[i]),
                    chain: chainKey as ChainKey
                  });
                } catch (parseError) {
                  console.error(`Error parsing audit data at index ${i}:`, parseError);
                  continue;
                }
              }

              console.log(`Processed ${contractHashes.length} audits from ${chainKey}`);

            } catch (fetchError) {
              console.error(`Error fetching audits from ${chainKey}:`, fetchError);
              continue;
            }

          } catch (error) {
            console.error(`Error getting total contracts from ${chainKey}:`, error);
            continue;
          }

        } catch (chainError) {
          console.error(`Error setting up chain ${chainKey}:`, chainError);
          continue;
        }
      }
  
      console.log(`Total audits collected: ${allAudits.length}`);
      if (allAudits.length === 0) {
        console.log('No audits found on any chain');
      } else {
        setReports(allAudits.sort((a, b) => b.timestamp - a.timestamp));
      }
  
    } catch (error) {
      console.error('Failed to fetch audits:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAllChainAudits();
  }, []);

  const getFilteredReports = () => {
    return reports.filter(report => {
      if (filters.search && 
          !report.contractHash.toLowerCase().includes(filters.search.toLowerCase()) &&
          !report.auditor.toLowerCase().includes(filters.search.toLowerCase())) {
        return false;
      }
      
      if (filters.chain !== 'all' && report.chain !== filters.chain) {
        return false;
      }

      if (filters.minStars > 0 && report.stars < filters.minStars) {
        return false;
      }

      if (filters.dateRange !== 'all') {
        const now = Date.now() / 1000;
        const ranges = {
          day: 86400,
          week: 604800,
          month: 2592000
        };
        if (now - report.timestamp > ranges[filters.dateRange]) {
          return false;
        }
      }

      return true;
    });
  };

  const exportReport = (report: AuditReport) => {
    // Convert BigInt values and format data for export
    const formattedReport = {
      contractHash: report.contractHash,
      stars: Number(report.stars),
      summary: report.summary,
      auditor: report.auditor,
      timestamp: Number(report.timestamp),
      chain: report.chain,
      chainName: CHAIN_CONFIG[report.chain].chainName,
      exportDate: new Date().toISOString(),
      network: {
        name: CHAIN_CONFIG[report.chain].chainName,
        chainId: CHAIN_CONFIG[report.chain].chainId,
        contractAddress: CONTRACT_ADDRESSES[report.chain as ChainKey],
      },
      auditDate: new Date(Number(report.timestamp) * 1000).toLocaleString(),
    };
  
    // Create and download the file
    try {
      const blob = new Blob([JSON.stringify(formattedReport, null, 2)], { 
        type: 'application/json' 
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `audit-${report.contractHash.slice(0, 8)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting report:', error);
    }
  };

  return (
    <div className="min-h-screen py-12">
      <div className="max-w-6xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <div className="inline-block mb-3 px-4 py-1 rounded-full bg-primary-500/10 border border-primary-500/20">
            <span className="text-primary-400 text-sm font-semibold">Security Verification</span>
          </div>
          <h1 className="text-3xl font-mono font-bold mb-4 text-primary-400">Audit Reports</h1>
          <p className="text-gray-400">View and analyze smart contract audits across multiple chains</p>
        </div>

        {/* Search and Filters */}
        <div className="mb-8">
          <div className="flex gap-4 items-center">
            <div className="flex-1 relative">
              <input
                type="text"
                placeholder="Search by contract hash or auditor address..."
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                className="w-full bg-gray-900/50 border border-gray-800 rounded-lg px-4 py-2 pl-10 focus:outline-none focus:border-primary-500/50 focus:ring-1 focus:ring-primary-500/20 transition-all duration-200"
              />
              <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} weight="bold" />
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="px-4 py-2 bg-gray-900/50 border border-gray-800 rounded-lg hover:bg-gray-800 hover:border-primary-500/30 transition-all duration-200 flex items-center gap-2"
            >
              <FunnelSimple size={20} className="text-primary-400" weight="bold" />
              Filters
            </button>
          </div>

          {/* Filter Panel */}
          {showFilters && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-4 bg-gray-900/50 border border-gray-800 rounded-lg p-4 shadow-lg"
            >
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Chain</label>
                  <select
                    value={filters.chain}
                    onChange={(e) => setFilters({ ...filters, chain: e.target.value })}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 focus:outline-none focus:border-primary-500/50 focus:ring-1 focus:ring-primary-500/20 transition-all duration-200"
                  >
                    <option value="all">All Chains</option>
                    {Object.entries(CHAIN_CONFIG).map(([key, chain]) => (
                      <option key={key} value={key}>{chain.chainName}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-2">Time Range</label>
                  <select
                    value={filters.dateRange}
                    onChange={(e) => setFilters({ ...filters, dateRange: e.target.value as FilterState['dateRange'] })}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 focus:outline-none focus:border-primary-500/50 focus:ring-1 focus:ring-primary-500/20 transition-all duration-200"
                  >
                    <option value="all">All Time</option>
                    <option value="day">Last 24 Hours</option>
                    <option value="week">Last Week</option>
                    <option value="month">Last Month</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-2">Minimum Stars</label>
                  <select
                    value={filters.minStars}
                    onChange={(e) => setFilters({ ...filters, minStars: Number(e.target.value) })}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 focus:outline-none focus:border-primary-500/50 focus:ring-1 focus:ring-primary-500/20 transition-all duration-200"
                  >
                    <option value={0}>Any Rating</option>
                    {[1, 2, 3, 4, 5].map(stars => (
                      <option key={stars} value={stars}>{stars}+ Stars</option>
                    ))}
                  </select>
                </div>
              </div>
            </motion.div>
          )}
        </div>

        {/* Reports Table */}
        <div className="bg-gray-900/50 border border-gray-800 hover:border-primary-500/30 transition-colors duration-300 rounded-lg overflow-hidden shadow-lg">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-800">
                  <th className="py-4 px-6 text-left text-sm font-mono text-primary-400">CONTRACT</th>
                  <th className="py-4 px-6 text-left text-sm font-mono text-primary-400">CHAIN</th>
                  <th className="py-4 px-6 text-left text-sm font-mono text-primary-400">RATING</th>
                  <th className="py-4 px-6 text-left text-sm font-mono text-primary-400">AUDITOR</th>
                  <th className="py-4 px-6 text-left text-sm font-mono text-primary-400">DATE</th>
                  <th className="py-4 px-6 text-right text-sm font-mono text-primary-400">ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {getFilteredReports().map((report) => (
                  <tr 
                    key={`${report.contractHash}-${report.chain}`}
                    className="border-b border-gray-800/50 hover:bg-primary-500/5 transition-colors duration-200"
                  >
                    <td className="py-4 px-6 font-mono">
                      {report.contractHash.slice(0, 10)}...{report.contractHash.slice(-8)}
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-2">
                        <div className="relative">
                          <div className="absolute inset-0 bg-primary-500/20 rounded-full blur-[2px]"></div>
                          <Image
                            src={CHAIN_CONFIG[report.chain].iconPath}
                            alt={CHAIN_CONFIG[report.chain].chainName}
                            width={20}
                            height={20}
                            className="rounded-full relative z-10"
                          />
                        </div>
                        <span>{CHAIN_CONFIG[report.chain].chainName}</span>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex gap-1">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            weight={i < report.stars ? "fill" : "regular"}
                            className={i < report.stars ? "text-primary-400" : "text-gray-600"}
                            size={16}
                          />
                        ))}
                      </div>
                    </td>
                    <td className="py-4 px-6 font-mono">
                      {report.auditor.slice(0, 6)}...{report.auditor.slice(-4)}
                    </td>
                    <td className="py-4 px-6 text-gray-400">
                      {new Date(report.timestamp * 1000).toLocaleDateString()}
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => setSelectedReport(report)}
                          className="p-2 hover:bg-primary-500/10 rounded-lg transition-colors duration-200"
                          title="View Details"
                        >
                          <ArrowSquareOut size={20} className="text-primary-400" weight="bold" />
                        </button>
                        <button
                          onClick={() => exportReport(report)}
                          className="p-2 hover:bg-primary-500/10 rounded-lg transition-colors duration-200"
                          title="Export Report"
                        >
                          <Download size={20} className="text-primary-400" weight="bold" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {isLoading && (
            <div className="py-12 text-center">
              <div className="inline-flex items-center px-4 py-2 bg-primary-500/10 text-primary-400 rounded-lg">
                <CircleNotch className="animate-spin mr-2" size={20} weight="bold" />
                Loading audits...
              </div>
            </div>
          )}

          {!isLoading && getFilteredReports().length === 0 && (
            <div className="py-12 text-center">
              <div className="inline-flex items-center px-4 py-2 bg-primary-500/10 text-primary-400 rounded-lg">
                <ListChecks className="mr-2" size={20} weight="bold" />
                No audit reports found matching your criteria
              </div>
            </div>
          )}
        </div>

        {/* Report Detail Modal */}
        {selectedReport && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-gray-900 border border-gray-800 rounded-lg max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto shadow-xl shadow-primary-900/10"
            >
              <div className="p-6">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <div className="inline-block mb-2 px-3 py-1 rounded-full bg-primary-500/10 border border-primary-500/20">
                      <span className="text-primary-400 text-xs font-medium">Audit Details</span>
                    </div>
                    <h3 className="text-xl font-bold">Contract Security Report</h3>
                  </div>
                  <button
                    onClick={() => setSelectedReport(null)}
                    className="p-1 hover:bg-gray-800 rounded-lg transition-colors duration-200 hover:text-primary-400"
                  >
                    <X size={20} weight="bold" />
                  </button>
                </div>

                <div className="space-y-6">
                    <div>
                    <label className="block text-sm text-gray-400 mb-1">Transaction Hash</label>
                    <div className="font-mono bg-gray-800/70 px-3 py-2 rounded-lg border border-gray-700/70 flex items-center justify-between">
                      <span className="truncate">
                      {selectedReport.transactionHash.slice(0, 28)}...{selectedReport.transactionHash.slice(-24)}
                      </span>
                        <button
                        onClick={() => {
                          navigator.clipboard.writeText(selectedReport.transactionHash);
                        }}
                        className="ml-2 p-1.5 hover:bg-primary-500/20 rounded-md transition-colors duration-200"
                        title="Copy txn hash"
                        >
                        <Copy size={18} weight="bold" className="text-primary-400" />
                      </button>
                    </div>
                    </div>

                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Chain</label>
                    <div className="flex items-center gap-2 bg-gray-800/70 px-3 py-2 rounded-lg border border-gray-700/70">
                      <div className="relative">
                        <div className="absolute inset-0 bg-primary-500/20 rounded-full blur-[2px]"></div>
                        <Image
                          src={CHAIN_CONFIG[selectedReport.chain].iconPath}
                          alt={CHAIN_CONFIG[selectedReport.chain].chainName}
                          width={20}
                          height={20}
                          className="rounded-full relative z-10"
                        />
                      </div>
                      <span>{CHAIN_CONFIG[selectedReport.chain].chainName}</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Security Rating</label>
                    <div className="flex gap-1 bg-gray-800/70 px-3 py-2 rounded-lg border border-gray-700/70">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          weight={i < selectedReport.stars ? "fill" : "regular"}
                          className={i < selectedReport.stars ? "text-primary-400" : "text-gray-600"}
                          size={20}
                        />
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Summary</label>
                    <div className="bg-gray-800/70 px-3 py-2 rounded-lg border border-gray-700/70">
                      {selectedReport.summary}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Auditor</label>
                    <div className="font-mono bg-gray-800/70 px-3 py-2 rounded-lg border border-gray-700/70 flex items-center justify-between">
                      <span>{selectedReport.auditor}</span>
                      <a
                        href={`${CHAIN_CONFIG[selectedReport.chain].blockExplorerUrls[0]}/address/${selectedReport.auditor}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary-400 hover:text-primary-300 flex items-center gap-1 transition-colors duration-200"
                      >
                        View on Explorer <ArrowSquareOut size={16} weight="bold" />
                      </a>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Timestamp</label>
                    <div className="bg-gray-800/70 px-3 py-2 rounded-lg border border-gray-700/70">
                      {new Date(selectedReport.timestamp * 1000).toLocaleString()}
                    </div>
                  </div>

                  <div className="flex justify-end gap-4 pt-4 border-t border-gray-800">
                    <button
                      onClick={() => exportReport(selectedReport)}
                      className="px-4 py-2 bg-primary-500/10 text-primary-400 rounded-lg hover:bg-primary-500/20 transition-colors duration-200 flex items-center gap-2"
                    >
                      <Download size={20} weight="bold" />
                      Export Report
                    </button>
                    <a
                      href={`${CHAIN_CONFIG[selectedReport.chain].blockExplorerUrls[0]}/tx/${selectedReport.transactionHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-2 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors duration-200 flex items-center gap-2"
                    >
                      View on Explorer
                      <ArrowSquareOut size={20} weight="bold" />
                    </a>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </div>
      </div>
    );
  }