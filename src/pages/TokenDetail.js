import { useState, useEffect } from 'react';
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
  const { id } = useParams();
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

  // Add function to fetch market info
  const fetchMarketInfo = async (bondingCurveAddress) => {
    if (!bondingCurveAddress) {
      console.error('No bonding curve address provided');
      setError('Token contract information is incomplete');
      setIsLoadingMarket(false);
      return;
    }

    try {
      // Add MetaMask connection check
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
      
      // Add request throttling
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

      // Sequential calls with individual error handling
      const beraPrice = await bondingCurve.getBeraPrice()
        .catch(() => ethers.BigNumber.from(0));
      
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const tokenPrice = await bondingCurve.getCurrentPrice()
        .catch(() => ethers.BigNumber.from(0));
      
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const remainingSupply = await bondingCurve.totalSupplyTokens()
        .catch(() => ethers.utils.parseEther("1000000000"));

      // Handle liquidity check separately
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

  // Add cleanup to market info fetch
  useEffect(() => {
    let mounted = true;
    
    const fetchToken = async () => {
      try {
        const { data: tokenData, error: tokenError } = await supabase
          .from('tokens')
          .select(`
            *,
            users (
              wallet_address
            )
          `)
          .eq('id', id)
          .single();

        if (!mounted) return;
        
        if (tokenError) throw tokenError;
        setToken(tokenData);
        
        if (tokenData.bonding_curve_contract_address) {
          fetchMarketInfo(tokenData.bonding_curve_contract_address);
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
  }, [id]);

  // Update the purchase function to handle status better
  const handlePurchase = async (e) => {
    e.preventDefault();
    if (!window.ethereum) {
      setError('Please install MetaMask to purchase tokens');
      return;
    }

    try {
      setPurchaseStatus('Initiating purchase...');
      setError(null);

      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const signer = provider.getSigner();
      
      // Simple bonding curve interface - match test pattern
      const bondingCurve = new ethers.Contract(
        token.bonding_curve_contract_address,
        ["function buyTokens(uint256) payable"],
        signer
      );

      const buyAmount = ethers.utils.parseEther(purchaseAmount);

      setPurchaseStatus('Sending transaction...');
      
      // Match test's simple purchase pattern
      const tx = await bondingCurve.buyTokens(
        1, // minTokens parameter
        { 
          value: buyAmount,
          gasLimit: 100000 // Same as test
        }
      );

      setPurchaseStatus('Waiting for confirmation...');
      const receipt = await tx.wait();

      if (receipt.status === 1) {
        setPurchaseStatus('Purchase successful!');
        setPurchaseAmount('');
        // Refresh market info after successful purchase
        await fetchMarketInfo(token.bonding_curve_contract_address);
      } else {
        throw new Error('Transaction failed');
      }

    } catch (error) {
      console.error('Purchase error:', error);
      setError(error.message.includes('user rejected') ? 
        'Transaction was rejected by user' : 
        'Failed to complete purchase');
      setPurchaseStatus('');
    }
  };

  // Add function to check sell price
  const checkSellPrice = async (amount) => {
    if (!amount || !window.ethereum) return;

    try {
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const bondingCurve = new ethers.Contract(
        token.bonding_curve_contract_address,
        ["function getSellPrice(uint256) view returns (uint256)"],
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

  // Add sell function after handlePurchase
  const handleSell = async (e) => {
    e.preventDefault();
    if (!window.ethereum) {
      setError('Please install MetaMask to sell tokens');
      return;
    }

    try {
      setSellStatus('Initiating sale...');
      setError(null);

      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const signer = provider.getSigner();
      
      // Create token contract interface for approval
      const tokenContract = new ethers.Contract(
        token.contract_address,
        ["function approve(address spender, uint256 amount) external returns (bool)"],
        signer
      );

      const sellAmountWei = ethers.utils.parseEther(sellAmount);

      setSellStatus('Approving tokens...');
      const approveTx = await tokenContract.approve(
        token.bonding_curve_contract_address,
        sellAmountWei
      );
      await approveTx.wait();

      setSellStatus('Sending sale transaction...');
      const bondingCurve = new ethers.Contract(
        token.bonding_curve_contract_address,
        ["function sellTokens(uint256 tokenAmount) returns (uint256)"],
        signer
      );

      const tx = await bondingCurve.sellTokens(sellAmountWei);

      setSellStatus('Waiting for confirmation...');
      const receipt = await tx.wait();

      if (receipt.status === 1) {
        setSellStatus('Sale successful!');
        setSellAmount('');
        // Refresh market info after successful sale
        await fetchMarketInfo(token.bonding_curve_contract_address);
      } else {
        throw new Error('Transaction failed');
      }

    } catch (error) {
      console.error('Sale error:', error);
      setError(error.message.includes('user rejected') ? 
        'Transaction was rejected by user' : 
        'Failed to complete sale');
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

        {/* Add purchase form */}
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
              />
            </div>
            <button 
              type="submit" 
              disabled={!purchaseAmount || !token?.bonding_curve_contract_address}
            >
              {purchaseStatus || 'Buy Tokens'}
            </button>
          </form>
          {purchaseStatus && <div className="status-message">{purchaseStatus}</div>}
          {error && <div className="error-message">{error}</div>}
        </div>

        {/* Add sell form after purchase form */}
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
          {sellStatus && <div className="status-message">{sellStatus}</div>}
          {error && <div className="error-message">{error}</div>}
        </div>
      </div>
    </div>
  );
}

export default TokenDetail; 