// constants/contracts.ts
export const CONTRACT_ADDRESSES = {
  monadTestnet: '0xCa36dD890F987EDcE1D6D7C74Fb9df627c216BF6',
  } as const;

export const AUDIT_REGISTRY_ABI = [
	{
		"inputs": [],
		"stateMutability": "nonpayable",
		"type": "constructor"
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": true,
				"internalType": "bytes32",
				"name": "contractHash",
				"type": "bytes32"
			},
			{
				"indexed": false,
				"internalType": "uint8",
				"name": "stars",
				"type": "uint8"
			},
			{
				"indexed": false,
				"internalType": "string",
				"name": "summary",
				"type": "string"
			},
			{
				"indexed": true,
				"internalType": "address",
				"name": "auditor",
				"type": "address"
			},
			{
				"indexed": false,
				"internalType": "uint256",
				"name": "timestamp",
				"type": "uint256"
			}
		],
		"name": "AuditRegistered",
		"type": "event"
	},
	{
		"inputs": [
			{
				"internalType": "bytes32",
				"name": "contractHash",
				"type": "bytes32"
			},
			{
				"internalType": "uint8",
				"name": "stars",
				"type": "uint8"
			},
			{
				"internalType": "string",
				"name": "summary",
				"type": "string"
			}
		],
		"name": "registerAudit",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "withdraw",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"name": "allContractHashes",
		"outputs": [
			{
				"internalType": "bytes32",
				"name": "",
				"type": "bytes32"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "",
				"type": "address"
			},
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"name": "auditorHistory",
		"outputs": [
			{
				"internalType": "bytes32",
				"name": "",
				"type": "bytes32"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "bytes32",
				"name": "",
				"type": "bytes32"
			},
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"name": "contractAudits",
		"outputs": [
			{
				"internalType": "uint8",
				"name": "stars",
				"type": "uint8"
			},
			{
				"internalType": "string",
				"name": "summary",
				"type": "string"
			},
			{
				"internalType": "address",
				"name": "auditor",
				"type": "address"
			},
			{
				"internalType": "uint256",
				"name": "timestamp",
				"type": "uint256"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "uint256",
				"name": "startIndex",
				"type": "uint256"
			},
			{
				"internalType": "uint256",
				"name": "limit",
				"type": "uint256"
			}
		],
		"name": "getAllAudits",
		"outputs": [
			{
				"internalType": "bytes32[]",
				"name": "contractHashes",
				"type": "bytes32[]"
			},
			{
				"internalType": "uint8[]",
				"name": "stars",
				"type": "uint8[]"
			},
			{
				"internalType": "string[]",
				"name": "summaries",
				"type": "string[]"
			},
			{
				"internalType": "address[]",
				"name": "auditors",
				"type": "address[]"
			},
			{
				"internalType": "uint256[]",
				"name": "timestamps",
				"type": "uint256[]"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "auditor",
				"type": "address"
			}
		],
		"name": "getAuditorHistory",
		"outputs": [
			{
				"internalType": "bytes32[]",
				"name": "",
				"type": "bytes32[]"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "bytes32",
				"name": "contractHash",
				"type": "bytes32"
			}
		],
		"name": "getContractAudits",
		"outputs": [
			{
				"components": [
					{
						"internalType": "uint8",
						"name": "stars",
						"type": "uint8"
					},
					{
						"internalType": "string",
						"name": "summary",
						"type": "string"
					},
					{
						"internalType": "address",
						"name": "auditor",
						"type": "address"
					},
					{
						"internalType": "uint256",
						"name": "timestamp",
						"type": "uint256"
					}
				],
				"internalType": "struct AuditRegistry.Audit[]",
				"name": "",
				"type": "tuple[]"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "bytes32",
				"name": "contractHash",
				"type": "bytes32"
			}
		],
		"name": "getLatestAudit",
		"outputs": [
			{
				"components": [
					{
						"internalType": "uint8",
						"name": "stars",
						"type": "uint8"
					},
					{
						"internalType": "string",
						"name": "summary",
						"type": "string"
					},
					{
						"internalType": "address",
						"name": "auditor",
						"type": "address"
					},
					{
						"internalType": "uint256",
						"name": "timestamp",
						"type": "uint256"
					}
				],
				"internalType": "struct AuditRegistry.Audit",
				"name": "",
				"type": "tuple"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "getTotalContracts",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "owner",
		"outputs": [
			{
				"internalType": "address",
				"name": "",
				"type": "address"
			}
		],
		"stateMutability": "view",
		"type": "function"
	}
];

export type ChainKey = keyof typeof CONTRACT_ADDRESSES;