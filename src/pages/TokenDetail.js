import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../config/supabaseClient';
import './TokenDetail.css';
import { ethers } from 'ethers';

// Update the Bonding Curve ABI to include all necessary functions
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
  const [provider, setProvider] = useState(null);
  const [networkError, setNetworkError] = useState(false);

  // Create a function to safely get the provider
  const getProvider = useCallback(async () => {
    if (!window.ethereum) {
      setNetworkError(true);
      throw new Error('MetaMask not installed');
    }

    try {
      // Request accounts to ensure connection
      await window.ethereum.request({ method: 'eth_requestAccounts' });
      const web3Provider = new ethers.providers.Web3Provider(window.ethereum);
      
      // Check if we can get the network (validates connection)
      await web3Provider.getNetwork();
      
      setNetworkError(false);
      return web3Provider;
    } catch (error) {
      console.error('Provider connection error:', error);
      setNetworkError(true);
      throw new Error('Failed to connect to blockchain');
    }
  }, []);

  // Initialize provider on component mount
  useEffect(() => {
    const initProvider = async () => {
      try {
        if (window.ethereum) {
          const web3Provider = await getProvider();
          setProvider(web3Provider);
        }
      } catch (error) {
        console.warn('Could not initialize provider:', error.message);
      }
    };

    initProvider();

    // Handle network changes
    const handleChainChanged = () => {
      window.location.reload();
    };

    if (window.ethereum) {
      window.ethereum.on('chainChanged', handleChainChanged);
    }

    return () => {
      if (window.ethereum) {
        window.ethereum.removeListener('chainChanged', handleChainChanged);
      }
    };
  }, [getProvider]);

  // Add function to fetch market info with better error handling
  const fetchMarketInfo = useCallback(async (bondingCurveAddress) => {
    if (!bondingCurveAddress) {
      console.error('No bonding curve address provided');
      setError('Token contract information is incomplete');
      setIsLoadingMarket(false);
      return;
    }

    try {
      // Use fallback values if no provider
      if (!window.ethereum) {
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

      const provider = new ethers.providers.Web3Provider(window.ethereum);
      
      // Add request throttling like in previous version
      await new Promise(resolve => setTimeout(resolve, 1000));

      const bondingCurve = new ethers.Contract(
        bondingCurveAddress,
        [
          "function getBeraPrice() view returns (uint256)",
          "function getCurrentPrice() view returns (uint256)",
          "function totalSupplyTokens() view returns (uint256)",
          "function liquidityDeployed() view returns (bool)"
        ],
        provider
      );

      // Sequential calls with individual error handling and throttling
      const beraPrice = await bondingCurve.getBeraPrice()
        .catch(() => ethers.BigNumber.from(0));
      
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const tokenPrice = await bondingCurve.getCurrentPrice()
        .catch(() => ethers.BigNumber.from(0));
      
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const remainingSupply = await bondingCurve.totalSupplyTokens()
        .catch(() => ethers.utils.parseEther("1000000000"));

      // Handle liquidity check separately with throttling
      let isLiquidityDeployed = false;
      try {
        await new Promise(resolve => setTimeout(resolve, 500));
        isLiquidityDeployed = await bondingCurve.liquidityDeployed();
      } catch (e) {
        console.warn('Could not check liquidity status - assuming false');
      }

      const totalSupply = ethers.utils.parseEther("1000000000");
      const soldTokens = totalSupply.sub(remainingSupply);

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
  }, [setError, setMarketInfo, setIsLoadingMarket]);

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

  // Update the purchase function to exactly match the test pattern
  const handlePurchase = async (e) => {
    e.preventDefault();
    
    if (!window.ethereum) {
      setError('Please install MetaMask to purchase tokens');
      return;
    }

    try {
      setPurchaseStatus('Initiating purchase...');
      setError(null);

      // Create a fresh provider instance like in the test
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const signer = provider.getSigner();
      
      // Use minimal ABI with exact function signature from contract
      const bondingCurve = new ethers.Contract(
        token.bonding_curve_contract_address,
        ["function buyTokens(uint256) external payable"],
        signer
      );

      const buyAmount = ethers.utils.parseEther(purchaseAmount);

      setPurchaseStatus('Sending transaction...');
      
      // Use exact same parameters and gas limit as the test
      console.log("Sending transaction with value:", ethers.utils.formatEther(buyAmount), "BERA");
      const tx = await bondingCurve.buyTokens(
        1, // minTokens parameter - must be exactly 1 as in test
        { 
          value: buyAmount,
          gasLimit: 100000 // Match test exactly
        }
      );

      setPurchaseStatus('Waiting for confirmation...');
      const receipt = await tx.wait();

      if (receipt.status === 1) {
        setPurchaseStatus('Purchase successful!');
        setPurchaseAmount('');
        // Add throttling before refreshing market info
        await new Promise(resolve => setTimeout(resolve, 1000));
        await fetchMarketInfo(token.bonding_curve_contract_address);
      } else {
        throw new Error('Transaction failed');
      }

    } catch (error) {
      console.error('Purchase error:', error);
      // Provide more detailed error information
      let errorMessage = 'Failed to complete purchase';
      
      if (error.message.includes('user rejected')) {
        errorMessage = 'Transaction was rejected by user';
      } else if (error.code === 'INSUFFICIENT_FUNDS') {
        errorMessage = 'Insufficient funds for transaction';
      } else if (error.message.includes('gas')) {
        errorMessage = 'Gas estimation failed or not enough gas';
      } else if (error.data) {
        // Contract revert with data
        errorMessage = `Contract error: ${error.data.message || error.message}`;
      }
      
      setError(errorMessage);
      setPurchaseStatus('');
    }
  };

  // Update the check sell price function to match test pattern
  const checkSellPrice = async (amount) => {
    if (!amount || !window.ethereum) return;

    try {
      // Create a fresh provider like in the test
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      
      // Add throttling
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Use exact contract function signature from contract
      const bondingCurve = new ethers.Contract(
        token.bonding_curve_contract_address,
        ["function getSellPrice(uint256) public view returns (uint256)"],
        provider
      );

      const amountWei = ethers.utils.parseEther(amount);
      const expectedBera = await bondingCurve.getSellPrice(amountWei);
      const contractBalance = await provider.getBalance(token.bonding_curve_contract_address);
      
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
    }
  };

  // Update sell function to match test pattern exactly
  const handleSell = async (e) => {
    e.preventDefault();
    
    if (!window.ethereum) {
      setError('Please install MetaMask to sell tokens');
      return;
    }

    try {
      setSellStatus('Initiating sale...');
      setError(null);

      // Create fresh provider instance
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const signer = provider.getSigner();
      
      const sellAmountWei = ethers.utils.parseEther(sellAmount);
      
      // Step 1: Approve tokens exactly as in test
      setSellStatus('Approving tokens...');
      console.log("Approving tokens:", ethers.utils.formatEther(sellAmountWei));
      
      // Use exact token contract interface
      const tokenContract = new ethers.Contract(
        token.contract_address,
        ["function approve(address spender, uint256 amount) external returns (bool)"],
        signer
      );

      const approveTx = await tokenContract.approve(
        token.bonding_curve_contract_address,
        sellAmountWei,
        { gasLimit: 100000 } // Same as test
      );
      
      console.log("Approval transaction sent:", approveTx.hash);
      const approveReceipt = await approveTx.wait();
      console.log("Approval confirmed, hash:", approveReceipt.hash);

      // Add throttling between transactions
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Step 2: Sell tokens exactly as in test
      setSellStatus('Sending sale transaction...');
      console.log("Selling tokens:", ethers.utils.formatEther(sellAmountWei));
      
      // Use exact contract signature from contract
      const bondingCurve = new ethers.Contract(
        token.bonding_curve_contract_address,
        ["function sellTokens(uint256) external returns (uint256)"],
        signer
      );

      const tx = await bondingCurve.sellTokens(
        sellAmountWei,
        { gasLimit: 100000 } // Same as test
      );
      
      console.log("Sell transaction sent:", tx.hash);
      setSellStatus('Waiting for confirmation...');
      const receipt = await tx.wait();
      console.log("Sell confirmed, hash:", receipt.hash);

      if (receipt.status === 1) {
        setSellStatus('Sale successful!');
        setSellAmount('');
        // Add throttling before refreshing
        await new Promise(resolve => setTimeout(resolve, 1000));
        await fetchMarketInfo(token.bonding_curve_contract_address);
      } else {
        throw new Error('Transaction failed');
      }

    } catch (error) {
      console.error('Sale error:', error);
      // Provide more detailed error information
      let errorMessage = 'Failed to complete sale';
      
      if (error.message.includes('user rejected')) {
        errorMessage = 'Transaction was rejected by user';
      } else if (error.code === 'INSUFFICIENT_FUNDS') {
        errorMessage = 'Insufficient funds for gas';
      } else if (error.message.includes('gas')) {
        errorMessage = 'Gas estimation failed or not enough gas';
      } else if (error.data) {
        // Contract revert with data
        errorMessage = `Contract error: ${error.data.message || error.message}`;
      }
      
      setError(errorMessage);
      setSellStatus('');
    }
  };

  if (isLoading) {
    return <div className="token-detail-container">Loading...</div>;
  }

  if (error || !token) {
    return <div className="token-detail-container">Error: {error || 'Token not found'}</div>;
  }

  return (
    <div className="token-detail-container">
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

        {/* Add market info section */}
        {marketInfo && (
          <div className="token-detail-section">
            <h2>Market Information</h2>
            <div className="market-info">
              <p>Current Price: ${Number(marketInfo.tokenPriceUSD).toFixed(6)} USD</p>
              <p>Tokens Sold: {parseInt(marketInfo.soldTokens).toLocaleString()}</p>
              <p>Remaining Supply: {parseInt(marketInfo.remainingSupply).toLocaleString()}</p>
              {!marketInfo.isLiquidityDeployed && (
                <p className="warning">Note: Token liquidity not yet deployed</p>
              )}
            </div>
          </div>
        )}

        {/* Add network error message */}
        {networkError && (
          <div className="network-error-message">
            Warning: Unable to connect to blockchain. Some features may be limited.
          </div>
        )}

        {/* Update purchase form */}
        <div className="token-detail-section">
          <h2>Purchase Tokens</h2>
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
                disabled={networkError}
              />
            </div>
            <button 
              type="submit" 
              disabled={!purchaseAmount || !token?.bonding_curve_contract_address || networkError}
            >
              {purchaseStatus || 'Buy Tokens'}
            </button>
          </form>
          {purchaseStatus && <div className="status-message">{purchaseStatus}</div>}
          {error && <div className="error-message">{error}</div>}
        </div>

        {/* Update sell form */}
        <div className="token-detail-section">
          <h2>Sell Tokens</h2>
          <form onSubmit={handleSell} className="purchase-form">
            <div className="form-group">
              <label htmlFor="tokenAmount">Token Amount:</label>
              <input
                type="number"
                id="tokenAmount"
                value={sellAmount}
                onChange={(e) => {
                  setSellAmount(e.target.value);
                  checkSellPrice(e.target.value);
                }}
                min="0"
                step="0.01"
                required
                placeholder="Enter token amount"
                className="purchase-input"
                disabled={networkError}
              />
            </div>
            {expectedReturn && (
              <p className="expected-return">
                Expected return: {expectedReturn} BERA
              </p>
            )}
            <button 
              type="submit" 
              disabled={!sellAmount || !token?.bonding_curve_contract_address || !expectedReturn || networkError}
            >
              {sellStatus || 'Sell Tokens'}
            </button>
          </form>
          {sellStatus && <div className="status-message">{sellStatus}</div>}
          {error && <div className="error-message">{error}</div>}
        </div>
      </div>
    </div>
  );
}

export default TokenDetail; 