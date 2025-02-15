import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../config/supabaseClient';
import './TokenDetail.css';
import { ethers } from 'ethers';

// Update the Bonding Curve ABI to include all necessary functions
const BONDING_CURVE_ABI = [
  "function buyTokens(uint256 minTokens) payable",
  "function getCurrentPrice() view returns (uint256)",
  "function getBeraPrice() view returns (uint256)",
  "event TokensPurchased(address indexed buyer, uint256 tokens, uint256 beraAmount)"
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

  // Add function to fetch market info
  const fetchMarketInfo = async (bondingCurveAddress) => {
    if (!bondingCurveAddress) {
      console.error('No bonding curve address provided');
      setError('Token contract information is incomplete');
      setIsLoadingMarket(false);
      return;
    }

    try {
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const bondingCurve = new ethers.Contract(
        bondingCurveAddress,
        BONDING_CURVE_ABI,
        provider
      );

      // Fetch market data
      const [beraPrice, tokenPrice, remainingSupply] = await Promise.all([
        bondingCurve.getBeraPrice().catch(() => ethers.BigNumber.from(0)),
        bondingCurve.getCurrentPrice().catch(() => ethers.BigNumber.from(0)),
        bondingCurve.totalSupplyTokens().catch(() => ethers.utils.parseEther("1000000000"))
      ]);

      // Try to get liquidity status but don't block on it
      let isLiquidityDeployed = false;
      try {
        isLiquidityDeployed = await bondingCurve.liquidityDeployed();
      } catch (e) {
        console.warn('Could not check liquidity status:', e);
      }

      const totalSupply = ethers.utils.parseEther("1000000000"); // 1B tokens
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
      setMarketInfo({
        beraPriceUSD: "0",
        tokenPriceUSD: "0",
        remainingSupply: "1000000000",
        soldTokens: "0",
        isLiquidityDeployed: false
      });
      setError('Failed to load market information');
    } finally {
      setIsLoadingMarket(false);
    }
  };

  // Update useEffect to fetch market info after token data
  useEffect(() => {
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

        if (tokenError) throw tokenError;
        setToken(tokenData);
        
        // Fetch market info if bonding curve address exists
        if (tokenData.bonding_curve_contract_address) {
          fetchMarketInfo(tokenData.bonding_curve_contract_address);
        }
      } catch (error) {
        console.error('Error fetching token:', error);
        setError('Failed to load token details');
      } finally {
        setIsLoading(false);
      }
    };

    fetchToken();
  }, [id]);

  useEffect(() => {
    if (token && token.token_symbol) {
      const widget = new window.TradingView.widget({
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

      return () => {
        if (widget && widget.remove) {
          widget.remove();
        }
      };
    }
  }, [token]);

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
      
      // Initialize contract with full ABI
      const bondingCurve = new ethers.Contract(
        token.bonding_curve_contract_address,
        BONDING_CURVE_ABI,
        signer
      );

      // Get current price info for validation
      const [beraPrice, currentPrice] = await Promise.all([
        bondingCurve.getBeraPrice(),
        bondingCurve.getCurrentPrice()
      ]);

      const purchaseValue = ethers.utils.parseEther(purchaseAmount);
      
      setPurchaseStatus('Creating transaction...');
      
      // Match the test implementation exactly
      const tx = await bondingCurve.buyTokens(
        1, // minTokens parameter as used in test
        { 
          value: purchaseValue,
          gasLimit: 200000 // Increased gas limit
        }
      );

      setPurchaseStatus('Waiting for confirmation...');
      const receipt = await tx.wait();

      // Parse events like in the test
      const event = receipt.logs.find(log => {
        try {
          return bondingCurve.interface.parseLog(log)?.name === "TokensPurchased";
        } catch {
          return false;
        }
      });

      if (event) {
        const parsedEvent = bondingCurve.interface.parseLog(event);
        const tokensReceived = parsedEvent.args.tokens;
        setPurchaseStatus(`Successfully purchased ${ethers.utils.formatEther(tokensReceived)} tokens!`);
        setPurchaseAmount('');
        
        // Refresh market info
        await fetchMarketInfo(token.bonding_curve_contract_address);
      } else {
        throw new Error('Purchase event not found in transaction');
      }

    } catch (error) {
      console.error('Purchase error:', error);
      // More specific error handling
      let errorMessage = 'Failed to complete purchase';
      if (error.message.includes('user rejected')) {
        errorMessage = 'Transaction was rejected by user';
      } else if (error.message.includes('insufficient funds')) {
        errorMessage = 'Insufficient BERA balance';
      } else if (error.error?.message) {
        errorMessage = error.error.message;
      }
      setError(errorMessage);
      setPurchaseStatus('');
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
              <p>Current Price: ${parseFloat(marketInfo.tokenPriceUSD).toFixed(8)} USD</p>
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
      </div>
    </div>
  );
}

export default TokenDetail; 