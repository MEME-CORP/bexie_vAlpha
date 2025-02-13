import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../config/supabaseClient';
import './TokenDetail.css';

function TokenDetail() {
  const { id } = useParams();
  const [token, setToken] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

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
      </div>
    </div>
  );
}

export default TokenDetail; 