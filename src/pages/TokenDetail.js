import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../config/supabaseClient';
import './TokenDetail.css';
import { ethers } from 'ethers';
import { 
  useAccount, 
  useChainId, 
  useSwitchChain, 
  useWalletClient,
  usePublicClient,
  useSendTransaction, 
  useWriteContract,
  // eslint-disable-next-line no-unused-vars
  useSimulateContract,
  // eslint-disable-next-line no-unused-vars
  useWaitForTransactionReceipt
} from 'wagmi';
import { berachainBartio } from '../config/chains';
import { useConnectModal } from '@rainbow-me/rainbowkit';
import { parseEther, formatEther } from 'viem';

// Remove unused BONDING_CURVE_ABI or mark it as intentionally unused
// eslint-disable-next-line no-unused-vars
const BONDING_CURVE_ABI = [
  "function buyTokens(uint256 minTokens) payable",
  "function buyTokensFor(address beneficiary) payable",
  "function getCurrentPrice() view returns (uint256)",
  "function getBeraPrice() view returns (uint256)",
  "function totalSupplyTokens() view returns (uint256)",
  "function getSellPrice(uint256 tokenAmount) view returns (uint256)",
  "function sellTokens(uint256 tokenAmount) returns (uint256)",
  "function liquidityDeployed() view returns (bool)",
  "function collectedBeraUSD() view returns (uint256)",
  "event TokensPurchased(address indexed buyer, uint256 tokens, uint256 beraAmount)",
  "event TokensSold(address indexed seller, uint256 tokens, uint256 beraAmount)",
  "function approve(address spender, uint256 amount) external returns (bool)"
];

// Define Berachain network constants for direct ethers.js usage
// eslint-disable-next-line no-unused-vars
const BERACHAIN_TESTNET = {
  chainId: '0x13894', // 80084 in hex
  chainName: 'Berachain bArtio Testnet',
  nativeCurrency: {
    name: 'BERA',
    symbol: 'BERA',
    decimals: 18
  },
  rpcUrls: ['https://bartio.rpc.berachain.com/'],
  blockExplorerUrls: ['https://bartio.beratrail.io/']
};

// Minimal ABIs for contract interactions
const TOKEN_ABI = [
  "function approve(address spender, uint256 amount) external returns (bool)"
];

const BONDING_CURVE_MINIMAL_ABI = [
  "function buyTokens(uint256 minTokens) external payable",
  "function sellTokens(uint256 tokenAmount) external returns (uint256)",
  "function getSellPrice(uint256 tokenAmount) view returns (uint256)",
  "function getBeraPrice() view returns (uint256)",
  "function getCurrentPrice() view returns (uint256)",
  "function totalSupplyTokens() view returns (uint256)",
  "function liquidityDeployed() view returns (bool)"
];

function TokenDetail() {
  const { contract_address } = useParams();
  const [token, setToken] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [purchaseAmount, setPurchaseAmount] = useState('');
  const [purchaseStatus, setPurchaseStatus] = useState('');
  const [marketInfo, setMarketInfo] = useState(null);
  const [isLoadingMarket, setIsLoadingMarket] = useState(true);
  const [sellAmount, setSellAmount] = useState('');
  const [sellStatus, setSellStatus] = useState('');
  const [expectedReturn, setExpectedReturn] = useState(null);
  // Remove unused provider state or use it
  // eslint-disable-next-line no-unused-vars
  const [provider, setProvider] = useState(null);
  // Remove unused networkError state or use it
  // eslint-disable-next-line no-unused-vars
  const [networkError, setNetworkError] = useState(false);
  const [isCorrectNetwork, setIsCorrectNetwork] = useState(false);
  
  // Wagmi hooks for wallet interactions
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();
  const { openConnectModal } = useConnectModal();
  // eslint-disable-next-line no-unused-vars
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();
  const { sendTransactionAsync } = useSendTransaction();
  const { writeContractAsync } = useWriteContract();
  
  // Function to check if the connected network is Berachain testnet using wagmi
  const checkNetwork = useCallback(() => {
    if (!isConnected) {
      setIsCorrectNetwork(false);
      return false;
    }

    const isOnBerachain = chainId === berachainBartio.id;
    console.log("Current network chainId:", chainId);
    setIsCorrectNetwork(isOnBerachain);
    return isOnBerachain;
  }, [isConnected, chainId]);

  // Function to switch network to Berachain using wagmi
  const switchToBerachain = useCallback(() => {
    if (!isConnected) {
      openConnectModal();
      return;
    }

    if (switchChain) {
      switchChain({ chainId: berachainBartio.id });
    } else {
      console.error("Network switching not supported by this wallet");
      setError("Network switching not supported by this wallet. Please switch networks manually.");
    }
  }, [isConnected, openConnectModal, switchChain]);

  // Create a function to get a direct ethers provider as fallback
  // eslint-disable-next-line no-unused-vars
  const getDirectProvider = useCallback(async () => {
    try {
      // Create provider with explicit network configuration
      const ethersProvider = new ethers.providers.JsonRpcProvider(
        'https://bartio.rpc.berachain.com/',
        {
          chainId: berachainBartio.id,
          name: berachainBartio.name,
        }
      );
      
      // Verify the provider is connected to the correct network
      const network = await ethersProvider.getNetwork();
      console.log("Provider connected to network:", network);
      
      if (network.chainId !== berachainBartio.id) {
        console.warn(`Provider connected to wrong network: ${network.chainId}, expected: ${berachainBartio.id}`);
        throw new Error('Provider connected to wrong network');
      }
      
      // Return the direct JsonRpcProvider for more reliable connections
      return ethersProvider;
    } catch (error) {
      console.error('Provider connection error:', error);
      throw error;
    }
  }, []);

  // Update effect to use wagmi for network checking
  useEffect(() => {
    checkNetwork();
  }, [checkNetwork, chainId]);

  // Update handlePurchase to use Wagmi hooks for transactions with higher gas price
  const handlePurchase = async (e) => {
    e.preventDefault();
    
    if (!isConnected) {
      openConnectModal();
      return;
    }
    
    if (!token?.bonding_curve_contract_address) {
      setError('Bonding curve address not found');
      return;
    }

    try {
      setPurchaseStatus('Initiating purchase...');
      setError(null);
      
      // Ensure we're on the correct network first
      if (!isCorrectNetwork) {
        setPurchaseStatus('Switching to Berachain network...');
        await switchToBerachain();
        
        // Wait a moment for the network switch to complete
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Check if we're on the correct network now
        if (!checkNetwork()) {
          throw new Error('Failed to switch to Berachain network. Please switch manually and try again.');
        }
      }
      
      const buyAmount = parseEther(purchaseAmount);
      
      setPurchaseStatus('Preparing transaction...');
      console.log("Sending transaction with value:", formatEther(buyAmount), "BERA");
      
      // Get current gas price from the network
      const currentGasPrice = await publicClient.getGasPrice();
      console.log("Current network gas price:", currentGasPrice);
      
      // CRITICAL FIX: Dramatically increase gas price for Berachain testnet
      // Based on successful cancellation evidence, we need to use Bwei range
      // Multiply gas price by 1000000x (million) to ensure it gets processed
      const boostedGasPrice = currentGasPrice * 1000000n;
      console.log("Using dramatically boosted gas price:", boostedGasPrice);
      
      // Use Wagmi's sendTransaction hook to send the transaction - this properly integrates with RainbowKit
      const hash = await sendTransactionAsync({
        to: token.bonding_curve_contract_address,
        value: buyAmount,
        data: '0xef8e5118000000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000', // buyTokens(1) function call
        chainId: berachainBartio.id,
        gas: 500000n, // Using BigInt literal with 'n' suffix
        gasPrice: boostedGasPrice // Use much higher gas price for Berachain testnet
      });
      
      console.log("Transaction hash:", hash);
      setPurchaseStatus(`Transaction submitted with hash: ${hash.slice(0, 10)}...${hash.slice(-8)}`);
      
      // Set up a timeout for transaction confirmation
      let confirmationTimeout;
      const timeoutPromise = new Promise((_, reject) => {
        confirmationTimeout = setTimeout(() => {
          reject(new Error(`Transaction confirmation timeout - it may still complete later. Hash: ${hash}`));
        }, 60000); // 60 second timeout
      });
      
      try {
        // Wait for transaction receipt with timeout
        const receipt = await Promise.race([
          publicClient.waitForTransactionReceipt({
            hash,
            confirmations: 1, // Reduce confirmations to 1 for faster feedback
            timeout: 60000
          }),
          timeoutPromise
        ]);
        
        clearTimeout(confirmationTimeout);
        
        if (receipt.status === 'success') {
          setPurchaseStatus('Purchase successful!');
          setPurchaseAmount('');
          // Add throttling before refreshing market info
          await new Promise(resolve => setTimeout(resolve, 2000));
          await fetchMarketInfo(token.bonding_curve_contract_address);
        } else {
          throw new Error('Transaction failed');
        }
      } catch (confirmError) {
        clearTimeout(confirmationTimeout);
        
        if (confirmError.message.includes('timeout')) {
          // If it's just a timeout, the transaction might still complete later
          setPurchaseStatus(`Transaction pending. Check explorer for status with hash: ${hash.slice(0, 10)}...${hash.slice(-8)}`);
          setError(`Transaction is still pending after 60 seconds. It may still complete later. You may need to reset your wallet if you want to submit a new transaction.`);
        } else {
          throw confirmError;
        }
        }
      } catch (error) {
      console.error('Purchase error:', error);
      // Provide more detailed error information
      let errorMessage = 'Failed to complete purchase';
      
      if (error.message.includes('user rejected') || error.message.includes('rejected by user')) {
        errorMessage = 'Transaction was rejected by user';
      } else if (error.message.includes('insufficient funds')) {
        errorMessage = 'Insufficient BERA for transaction';
      } else if (error.message.includes('gas')) {
        errorMessage = 'Gas estimation failed or not enough gas';
      } else if (error.message.includes('timeout')) {
        errorMessage = 'Transaction is taking too long to confirm. It may still complete later.';
      } else if (error.message.includes('nonce')) {
        errorMessage = 'Transaction nonce error. You may have pending transactions. Try resetting your wallet.';
      } else {
        // Use the error message directly if it's already descriptive
        errorMessage = error.message;
      }
      
      setError(errorMessage);
      setPurchaseStatus('');
    }
  };

  // Update handleSell to use Wagmi hooks for transactions with higher gas price
  const handleSell = async (e) => {
    e.preventDefault();
    
    if (!isConnected) {
      openConnectModal();
      return;
    }
    
    if (!token?.contract_address || !token?.bonding_curve_contract_address) {
      setError('Token or bonding curve address not found');
      return;
    }

    try {
      setSellStatus('Initiating sale...');
      setError(null);
      
      // Ensure we're on the correct network first
      if (!isCorrectNetwork) {
        setSellStatus('Switching to Berachain network...');
        await switchToBerachain();
        
        // Wait a moment for the network switch to complete
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Check if we're on the correct network now
        if (!checkNetwork()) {
          throw new Error('Failed to switch to Berachain network. Please switch manually and try again.');
        }
      }
      
      const sellAmountWei = parseEther(sellAmount);
      
      // Get current gas price from the network
      const currentGasPrice = await publicClient.getGasPrice();
      console.log("Current network gas price:", currentGasPrice);
      
      // CRITICAL FIX: Dramatically increase gas price for Berachain testnet
      // Based on successful cancellation evidence, we need to use Bwei range
      // Multiply gas price by 1000000x (million) to ensure it gets processed
      const boostedGasPrice = currentGasPrice * 1000000n;
      console.log("Using dramatically boosted gas price:", boostedGasPrice);
      
      // Step 1: Approve tokens using Wagmi's writeContract
      setSellStatus('Approving tokens...');
      console.log("Approving tokens:", formatEther(sellAmountWei));
      
      const approvalHash = await writeContractAsync({
        address: token.contract_address,
        abi: TOKEN_ABI,
        functionName: 'approve',
        args: [token.bonding_curve_contract_address, sellAmountWei],
        chainId: berachainBartio.id,
        gas: 200000n, 
        gasPrice: boostedGasPrice // Use much higher gas price for Berachain testnet
      });
      
      console.log("Approval transaction hash:", approvalHash);
      setSellStatus(`Approval submitted with hash: ${approvalHash.slice(0, 10)}...${approvalHash.slice(-8)}`);
      
      // Set up a timeout for approval confirmation
      let approvalTimeout;
      const approvalTimeoutPromise = new Promise((_, reject) => {
        approvalTimeout = setTimeout(() => {
          reject(new Error(`Approval confirmation timeout - it may still complete later. Hash: ${approvalHash}`));
        }, 60000); // 60 second timeout
      });
      
      try {
        // Wait for approval receipt with timeout
        const approvalReceipt = await Promise.race([
          publicClient.waitForTransactionReceipt({
            hash: approvalHash,
            confirmations: 1,
            timeout: 60000
          }),
          approvalTimeoutPromise
        ]);
        
        clearTimeout(approvalTimeout);
        
        if (approvalReceipt.status !== 'success') {
          throw new Error('Token approval failed');
        }
        
        // Success message for approval
        setSellStatus('Approval confirmed! Preparing to sell tokens...');
      } catch (approvalError) {
        clearTimeout(approvalTimeout);
        
        if (approvalError.message.includes('timeout')) {
          // If it's just a timeout, we'll continue but warn the user
          setSellStatus(`Approval pending. Will try to proceed but transaction may fail. Hash: ${approvalHash.slice(0, 10)}...${approvalHash.slice(-8)}`);
          console.warn('Approval confirmation timed out but proceeding:', approvalHash);
        } else {
          throw approvalError;
        }
      }
      
      // Add throttling between transactions - longer for Berachain
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      // Step 2: Sell tokens using Wagmi's writeContract
      setSellStatus('Sending sale transaction...');
      console.log("Selling tokens:", formatEther(sellAmountWei));
      
      const sellHash = await writeContractAsync({
        address: token.bonding_curve_contract_address,
        abi: BONDING_CURVE_MINIMAL_ABI,
        functionName: 'sellTokens',
        args: [sellAmountWei],
        chainId: berachainBartio.id,
        gas: 500000n,
        gasPrice: boostedGasPrice // Use much higher gas price for Berachain testnet
      });
      
      console.log("Sell transaction hash:", sellHash);
      setSellStatus(`Sell transaction submitted with hash: ${sellHash.slice(0, 10)}...${sellHash.slice(-8)}`);
      
      // Set up a timeout for sell confirmation
      let sellTimeout;
      const sellTimeoutPromise = new Promise((_, reject) => {
        sellTimeout = setTimeout(() => {
          reject(new Error(`Sell confirmation timeout - it may still complete later. Hash: ${sellHash}`));
        }, 60000); // 60 second timeout
      });
      
      try {
        // Wait for sell receipt with timeout
        const sellReceipt = await Promise.race([
          publicClient.waitForTransactionReceipt({
            hash: sellHash,
            confirmations: 1,
            timeout: 60000
          }),
          sellTimeoutPromise
        ]);
        
        clearTimeout(sellTimeout);
        
        if (sellReceipt.status === 'success') {
          setSellStatus('Sale successful!');
          setSellAmount('');
          // Add throttling before refreshing
          await new Promise(resolve => setTimeout(resolve, 2000));
          await fetchMarketInfo(token.bonding_curve_contract_address);
        } else {
          throw new Error('Sell transaction failed');
        }
      } catch (sellError) {
        clearTimeout(sellTimeout);
        
        if (sellError.message.includes('timeout')) {
          // If it's just a timeout, the transaction might still complete later
          setSellStatus(`Transaction pending. Check explorer for status with hash: ${sellHash.slice(0, 10)}...${sellHash.slice(-8)}`);
          setError(`Transaction is still pending after 60 seconds. It may still complete later. You may need to reset your wallet if you want to submit a new transaction.`);
        } else {
          throw sellError;
        }
      }
    } catch (error) {
      console.error('Sale error:', error);
      // Provide more detailed error information
      let errorMessage = 'Failed to complete sale';
      
      if (error.message.includes('user rejected') || error.message.includes('rejected by user')) {
        errorMessage = 'Transaction was rejected by user';
      } else if (error.message.includes('insufficient funds')) {
        errorMessage = 'Insufficient BERA for gas';
      } else if (error.message.includes('gas')) {
        errorMessage = 'Gas estimation failed or not enough gas';
      } else if (error.message.includes('timeout')) {
        errorMessage = 'Transaction is taking too long to confirm. It may still complete later.';
      } else if (error.message.includes('nonce')) {
        errorMessage = 'Transaction nonce error. You may have pending transactions. Try resetting your wallet.';
      } else if (error.message.includes('approval') || error.message.includes('Approval')) {
        errorMessage = 'Token approval failed. Please try again or check your token balance.';
      } else {
        // Use the error message directly if it's already descriptive
        errorMessage = error.message;
      }
      
      setError(errorMessage);
      setSellStatus('');
    }
  };

  // Keep fetchMarketInfo the same as it's working well
  const fetchMarketInfo = useCallback(async (bondingCurveAddress) => {
    if (!bondingCurveAddress) {
      console.error('No bonding curve address provided');
      setError('Token contract information is incomplete');
      setIsLoadingMarket(false);
      return;
    }

    try {
      // Use fallback values if no connection
      if (!isConnected) {
        setMarketInfo({
          beraPriceUSD: "0",
          tokenPriceUSD: "0",
          remainingSupply: "1000000000",
          soldTokens: "0",
          isLiquidityDeployed: false
        });
        setIsLoadingMarket(false);
        return;
      }

      // Create a direct JsonRpcProvider to Berachain - don't rely on wallet's network
      const directProvider = new ethers.providers.JsonRpcProvider(
        'https://bartio.rpc.berachain.com/',
        {
          chainId: berachainBartio.id,
          name: berachainBartio.name,
        }
      );
      
      console.log("Created direct provider for market info");
      
      // Add request throttling to avoid rate limits
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Create contract with minimal ABI for read-only operations
      const bondingCurve = new ethers.Contract(
        bondingCurveAddress,
        [
          "function getBeraPrice() view returns (uint256)",
          "function getCurrentPrice() view returns (uint256)",
          "function totalSupplyTokens() view returns (uint256)",
          "function liquidityDeployed() view returns (bool)"
        ],
        directProvider
      );

      // Sequential calls with individual error handling and throttling
      console.log("Fetching BERA price...");
      let beraPrice;
      try {
        beraPrice = await bondingCurve.getBeraPrice();
      } catch (err) {
        console.error("Error fetching BERA price:", err);
        beraPrice = ethers.BigNumber.from(0);
      }
      
      await new Promise(resolve => setTimeout(resolve, 2000)); // Longer delay for Berachain
      
      console.log("Fetching token price...");
      let tokenPrice;
      try {
        tokenPrice = await bondingCurve.getCurrentPrice();
      } catch (err) {
        console.error("Error fetching token price:", err);
        tokenPrice = ethers.BigNumber.from(0);
      }
      
      await new Promise(resolve => setTimeout(resolve, 2000)); // Longer delay for Berachain
      
      console.log("Fetching remaining supply...");
      let remainingSupply;
      try {
        remainingSupply = await bondingCurve.totalSupplyTokens();
      } catch (err) {
        console.error("Error fetching remaining supply:", err);
        remainingSupply = ethers.utils.parseEther("1000000000");
      }

      // Handle liquidity check separately with throttling
      let isLiquidityDeployed = false;
      try {
        await new Promise(resolve => setTimeout(resolve, 2000)); // Longer delay for Berachain
        console.log("Checking liquidity deployment...");
        isLiquidityDeployed = await bondingCurve.liquidityDeployed();
      } catch (e) {
        console.warn('Could not check liquidity status - assuming false:', e);
      }

      const totalSupply = ethers.utils.parseEther("1000000000");
      const soldTokens = totalSupply.sub(remainingSupply);

      console.log("Market info fetched successfully");
      setMarketInfo({
        beraPriceUSD: ethers.utils.formatEther(beraPrice),
        tokenPriceUSD: ethers.utils.formatUnits(tokenPrice, 6),
        remainingSupply: ethers.utils.formatEther(remainingSupply),
        soldTokens: ethers.utils.formatEther(soldTokens),
        isLiquidityDeployed
      });

    } catch (error) {
      console.error('Error fetching market info:', error);
      // Provide fallback values instead of error
      setMarketInfo({
        beraPriceUSD: "0",
        tokenPriceUSD: "0",
        remainingSupply: "1000000000",
        soldTokens: "0",
        isLiquidityDeployed: false
      });
    } finally {
      setIsLoadingMarket(false);
    }
  }, [isConnected, setError, setMarketInfo, setIsLoadingMarket]);

  // Update checkSellPrice to use Wagmi's publicClient for read operations
  const checkSellPrice = async (amount) => {
    if (!amount || !isConnected || !token?.bonding_curve_contract_address) return;

    try {
      // Create a direct JsonRpcProvider to Berachain - don't rely on wallet's network
      const directProvider = new ethers.providers.JsonRpcProvider(
        'https://bartio.rpc.berachain.com/',
        {
          chainId: berachainBartio.id,
          name: berachainBartio.name,
        }
      );
      
      // Add throttling for rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Use exact contract function signature
      const bondingCurve = new ethers.Contract(
        token.bonding_curve_contract_address,
        ["function getSellPrice(uint256) public view returns (uint256)"],
        directProvider
      );

      const amountWei = ethers.utils.parseEther(amount);
      
      console.log("Checking sell price for amount:", ethers.utils.formatEther(amountWei));
      
      // Add timeout for the call
      const sellPricePromise = bondingCurve.getSellPrice(amountWei);
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Sell price check timeout')), 15000)
      );
      
      const expectedBera = await Promise.race([
        sellPricePromise,
        timeoutPromise
      ]);
      
      const contractBalance = await directProvider.getBalance(token.bonding_curve_contract_address);
      
      console.log("Expected BERA return:", ethers.utils.formatEther(expectedBera));
      console.log("Contract balance:", ethers.utils.formatEther(contractBalance));
      
      if (expectedBera.gt(contractBalance)) {
        setError('Insufficient contract balance for this sale');
        setExpectedReturn(null);
      } else {
        setError(null);
        setExpectedReturn(ethers.utils.formatEther(expectedBera));
      }
    } catch (error) {
      console.error('Error checking sell price:', error);
      setExpectedReturn(null);
      
      // Provide more specific error message
      if (error.message.includes('timeout')) {
        setError('Sell price check timed out. The network may be congested.');
      } else {
        setError('Could not calculate expected return. Please try again.');
      }
    }
  };

  // Update the useEffect for TradingView widget
  useEffect(() => {
    let widget;
    if (token && token.token_symbol) {
      widget = new window.TradingView.widget({
        width: '100%',
        height: 500,
        symbol: `BINANCE:${token.token_symbol}USDT`,
        interval: 'D',
        timezone: 'Etc/UTC',
        theme: 'dark',
        style: '1',
        locale: 'en',
        toolbar_bg: '#f1f3f6',
        enable_publishing: false,
        allow_symbol_change: true,
        container_id: 'tradingview_chart'
      });
    }

    return () => {
      if (widget) {
        // Proper cleanup for TradingView widget
        const container = document.getElementById('tradingview_chart');
        if (container) {
          container.innerHTML = '';
        }
      }
    };
  }, [token]);

  // Update the useEffect for fetching token data
  useEffect(() => {
    let mounted = true;
    
    const fetchToken = async () => {
      try {
        console.log('Fetching token with contract address:', contract_address);
        
        const { data: tokenData, error: tokenError } = await supabase
          .from('tokens')
          .select(`
            *,
            users (
              wallet_address
            )
          `)
          .eq('contract_address', contract_address)
          .single();

        if (!mounted) return;
        
        if (tokenError) {
          console.error('Supabase error:', tokenError);
          throw tokenError;
        }
        
        if (!tokenData) {
          console.error('No token found with contract address:', contract_address);
          throw new Error('Token not found');
        }
        
        console.log('Token data retrieved:', tokenData);
        console.log('Contract address for this token:', tokenData.contract_address);
        setToken(tokenData);
        
        if (tokenData.bonding_curve_contract_address) {
          console.log('Fetching market info for bonding curve:', tokenData.bonding_curve_contract_address);
          fetchMarketInfo(tokenData.bonding_curve_contract_address);
        } else {
          console.warn('No bonding curve address available for token');
        }
      } catch (error) {
        if (!mounted) return;
        console.error('Error fetching token:', error);
        setError('Failed to load token details');
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    fetchToken();

    return () => {
      mounted = false;
    };
  }, [contract_address, fetchMarketInfo]);

  // Update the return statement with wagmi-aware UI
  return (
    <div className="token-detail-container">
      {isLoading ? (
        <div className="loading-container">Loading...</div>
      ) : error && !token ? (
        <div className="error-container">Error: {error || 'Token not found'}</div>
      ) : (
      <div className="token-detail-card">
        <div className="token-detail-header">
          <img 
            src={token.logo_url} 
            alt={`${token.token_name} logo`}
            className="token-detail-logo"
          />
          <div className="token-detail-title">
            <h1>{token.token_name}</h1>
            <span className="token-detail-symbol">{token.token_symbol}</span>
          </div>
        </div>

        <div className="token-detail-section">
          <h2>Price Chart</h2>
          <div 
            id="tradingview_chart" 
            className="tradingview-chart-container"
          />
        </div>

        <div className="token-detail-section">
          <h2>Description</h2>
          <p>{token.token_description}</p>
        </div>

        <div className="token-detail-section">
          <h2>Links</h2>
          <div className="token-detail-links">
            {token.website_link && (
              <a 
                href={token.website_link}
                target="_blank"
                rel="noopener noreferrer"
                className="detail-website-link"
              >
                <i className="fas fa-globe"></i>
                Website
              </a>
            )}
            {token.telegram_link && (
              <a 
                href={token.telegram_link}
                target="_blank"
                rel="noopener noreferrer"
                className="detail-social-link"
              >
                <i className="fab fa-telegram"></i>
                Telegram
              </a>
            )}
            {token.x_link && (
              <a 
                href={token.x_link}
                target="_blank"
                rel="noopener noreferrer"
                className="detail-social-link"
              >
                <i className="fab fa-x-twitter"></i>
                X (Twitter)
              </a>
            )}
          </div>
        </div>

        <div className="token-detail-section">
          <h2>Contract Information</h2>
          <div className="contract-detail-info">
            <p>
              <span className="label">Contract Address:</span>
              <span className="value">{token.contract_address}</span>
            </p>
            <p>
              <span className="label">Created by:</span>
              <span className="value">{token.users?.wallet_address}</span>
            </p>
          </div>
        </div>

          {/* Market info section with wagmi connection awareness */}
          <div className="token-detail-section">
            <h2>Market Information</h2>
            {!isConnected ? (
              <div className="connection-prompt">
                <p>Connect your wallet to view market information</p>
                <button onClick={openConnectModal} className="connect-button">
                  Connect Wallet
                </button>
              </div>
            ) : !isCorrectNetwork ? (
              <div className="network-warning-message">
                <p>You are connected to {chainId ? `Chain ID: ${chainId}` : "an unknown network"}.</p>
                <p>Please switch to Berachain bArtio Testnet to view market information.</p>
                <button onClick={switchToBerachain} className="network-switch-button">
                  Switch to Berachain
                </button>
              </div>
            ) : isLoadingMarket ? (
              <div className="loading-market">Loading market data...</div>
            ) : marketInfo ? (
            <div className="market-info">
              <p>Current Price: ${Number(marketInfo.tokenPriceUSD).toFixed(6)} USD</p>
              <p>Tokens Sold: {parseInt(marketInfo.soldTokens).toLocaleString()}</p>
              <p>Remaining Supply: {parseInt(marketInfo.remainingSupply).toLocaleString()}</p>
              {!marketInfo.isLiquidityDeployed && (
                <p className="warning">Note: Token liquidity not yet deployed</p>
              )}
            </div>
            ) : (
              <div className="market-info-error">Unable to load market information</div>
            )}
          </div>

          {/* Wallet connection status */}
          <div className="wallet-status">
            {isConnected ? (
              <div className="wallet-connected">
                <p>Connected with: {address?.slice(0,6)}...{address?.slice(-4)}</p>
                <p>Network: Chain ID {chainId || "Unknown"}</p>
                {!isCorrectNetwork && (
                  <button onClick={switchToBerachain} className="network-switch-button">
                    Switch to Berachain
                  </button>
                )}
              </div>
            ) : (
              <div className="wallet-disconnected">
                <p>Wallet not connected</p>
                <button onClick={openConnectModal} className="connect-button">
                  Connect Wallet
                </button>
          </div>
        )}
          </div>

          {/* Purchase form with connection awareness */}
        <div className="token-detail-section">
          <h2>Purchase Tokens</h2>
            {!isConnected ? (
              <div className="connection-prompt">
                <p>Connect your wallet to purchase tokens</p>
                <button onClick={openConnectModal} className="connect-button">
                  Connect Wallet
                </button>
              </div>
            ) : !isCorrectNetwork ? (
              <div className="network-warning">
                <p>Please switch to Berachain bArtio Testnet to purchase tokens</p>
                <button onClick={switchToBerachain} className="network-switch-button">
                  Switch Network
                </button>
              </div>
            ) : (
          <form onSubmit={handlePurchase} className="purchase-form">
            <div className="form-group">
              <label htmlFor="beraAmount">BERA Amount:</label>
              <input
                type="number"
                id="beraAmount"
                value={purchaseAmount}
                onChange={(e) => setPurchaseAmount(e.target.value)}
                min="0"
                step="0.01"
                required
                placeholder="Enter BERA amount"
                className="purchase-input"
              />
            </div>
            <button 
              type="submit" 
                  disabled={!purchaseAmount || !token?.bonding_curve_contract_address}
            >
              {purchaseStatus || 'Buy Tokens'}
            </button>
          </form>
            )}
          {purchaseStatus && <div className="status-message">{purchaseStatus}</div>}
          {error && <div className="error-message">{error}</div>}
        </div>

          {/* Sell form with connection awareness */}
        <div className="token-detail-section">
          <h2>Sell Tokens</h2>
            {!isConnected ? (
              <div className="connection-prompt">
                <p>Connect your wallet to sell tokens</p>
                <button onClick={openConnectModal} className="connect-button">
                  Connect Wallet
                </button>
              </div>
            ) : !isCorrectNetwork ? (
              <div className="network-warning">
                <p>Please switch to Berachain bArtio Testnet to sell tokens</p>
                <button onClick={switchToBerachain} className="network-switch-button">
                  Switch Network
                </button>
              </div>
            ) : (
          <form onSubmit={handleSell} className="purchase-form">
            <div className="form-group">
              <label htmlFor="tokenAmount">Token Amount:</label>
              <input
                type="number"
                id="tokenAmount"
                value={sellAmount}
                onChange={(e) => {
                  setSellAmount(e.target.value);
                      if (isCorrectNetwork) {
                  checkSellPrice(e.target.value);
                      }
                }}
                min="0"
                step="0.01"
                required
                placeholder="Enter token amount"
                className="purchase-input"
              />
            </div>
            {expectedReturn && (
              <p className="expected-return">
                Expected return: {expectedReturn} BERA
              </p>
            )}
            <button 
              type="submit" 
                  disabled={!sellAmount || !token?.bonding_curve_contract_address || !expectedReturn}
            >
              {sellStatus || 'Sell Tokens'}
            </button>
          </form>
            )}
          {sellStatus && <div className="status-message">{sellStatus}</div>}
          {error && <div className="error-message">{error}</div>}
        </div>
      </div>
      )}
    </div>
  );
}

export default TokenDetail; 