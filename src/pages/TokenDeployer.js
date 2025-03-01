import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAccount } from 'wagmi';
import { supabase } from '../config/supabaseClient';
import './TokenDeployer.css';
import BuyBeraModal from '../components/BuyBeraModal';
import { ethers } from 'ethers';

// Update the constants at the top
const TOKEN_FACTORY_ADDRESS = "0x547290255f50f524e0dCe4eF00E18DC60911336A";
const BERA_USD_PRICE_FEED = "0x11B714817cBC92D402383cFd3f1037B122dcf69A";
const CREATION_FEE = ethers.utils.parseEther("0.002");

// ASCII art for the header
const ASCII_HEADER = `
+----------------------------------------------+
|                                              |
|  ██████╗ ███████╗██╗  ██╗██╗███████╗        |
|  ██╔══██╗██╔════╝╚██╗██╔╝██║██╔════╝        |
|  ██████╔╝█████╗   ╚███╔╝ ██║█████╗          |
|  ██╔══██╗██╔══╝   ██╔██╗ ██║██╔══╝          |
|  ██████╔╝███████╗██╔╝ ██╗██║███████╗        |
|  ╚═════╝ ╚══════╝╚═╝  ╚═╝╚═╝╚══════╝        |
|                                              |
|  TOKEN DEPLOYER v1.0                         |
|                                              |
+----------------------------------------------+
`;

// Update the factory ABI to match the actual contract events
const FACTORY_ABI = [
  "function createToken(string name, string symbol, uint256 totalSupply, address priceFeed) payable returns (address)",
  "event TokenCreated(address indexed creator, address tokenAddress, address bondingCurveAddress, string name, string symbol)",
  "function getTokenInfo(address token) view returns (address bondingCurve, bool isActive)",
  "function getBondingCurveInfo(address bondingCurve) view returns (uint256 price, uint256 supply)"
];

function TokenDeployer() {
  const navigate = useNavigate();
  const { address, isConnected } = useAccount();
  const [formData, setFormData] = useState({
    tokenName: '',
    tokenSymbol: '',
    tokenDescription: '',
    tokenLogo: null,
    telegramUrl: '',
    twitterUrl: '',
    websiteOption: 'existing', // 'existing' or 'create'
    websiteUrl: ''
  });

  const [logoPreview, setLogoPreview] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deploymentStatus, setDeploymentStatus] = useState('');
  const [terminalOutput, setTerminalOutput] = useState([]);

  // Add terminal output function
  const addTerminalLine = (line) => {
    setTerminalOutput(prev => [...prev, `> ${line}`]);
    // Keep only the last 5 lines
    if (terminalOutput.length > 5) {
      setTerminalOutput(prev => prev.slice(prev.length - 5));
    }
  };
  
  useEffect(() => {
    // Check both RainbowKit connection status and account
    if (isConnected && typeof address !== 'undefined') {
      addTerminalLine(`WALLET CONNECTED: ${address.substring(0, 6)}...${address.substring(address.length - 4)}`);
    } else if (!isConnected) {
      addTerminalLine("WALLET DISCONNECTED");
    }
  }, [address, isConnected]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Add terminal feedback for important fields
    if (name === 'tokenName' || name === 'tokenSymbol') {
      addTerminalLine(`${name.toUpperCase()} SET: ${value}`);
    }
  };

  const handleLogoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        setError('File size should be less than 5MB');
        addTerminalLine("ERROR: LOGO FILE TOO LARGE");
        return;
      }
      
      if (!file.type.startsWith('image/')) {
        setError('Please upload an image file');
        addTerminalLine("ERROR: INVALID FILE TYPE");
        return;
      }

      setFormData(prev => ({
        ...prev,
        tokenLogo: file
      }));

      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result);
        addTerminalLine("LOGO UPLOADED SUCCESSFULLY");
      };
      reader.readAsDataURL(file);
    }
  };

  const handleWebsiteOptionChange = (e) => {
    const option = e.target.value;
    setFormData(prev => ({
      ...prev,
      websiteOption: option,
      websiteUrl: option === 'create' ? '' : prev.websiteUrl
    }));
    
    addTerminalLine(`WEBSITE OPTION: ${option.toUpperCase()}`);
  };

  const validateForm = () => {
    if (!formData.tokenName.trim()) {
      throw new Error('Token name is required');
    }
    if (!formData.tokenSymbol.trim()) {
      throw new Error('Token symbol is required');
    }
    if (!formData.tokenDescription.trim()) {
      throw new Error('Token description is required');
    }
    if (!formData.tokenLogo) {
      throw new Error('Token logo is required');
    }
    if (formData.websiteOption === 'existing' && !formData.websiteUrl.trim()) {
      throw new Error('Website URL is required when using existing website');
    }
    
    // Validate URLs if provided
    const urlRegex = /^https?:\/\/.+\..+$/;
    if (formData.telegramUrl && !urlRegex.test(formData.telegramUrl)) {
      throw new Error('Invalid Telegram URL format');
    }
    if (formData.twitterUrl && !urlRegex.test(formData.twitterUrl)) {
      throw new Error('Invalid Twitter URL format');
    }
    if (formData.websiteOption === 'existing' && !urlRegex.test(formData.websiteUrl)) {
      throw new Error('Invalid website URL format');
    }
    
    addTerminalLine("FORM VALIDATION: SUCCESS");
  };

  const uploadLogo = async (file) => {
    try {
      addTerminalLine("UPLOADING LOGO...");
      
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `public/${fileName}`;

      // eslint-disable-next-line no-unused-vars
      const { error: uploadError, data } = await supabase.storage
        .from('logos')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
          contentType: file.type
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('logos')
        .getPublicUrl(filePath);

      addTerminalLine("LOGO UPLOAD: SUCCESS");
      return publicUrl;
    } catch (error) {
      console.error('Error uploading logo:', error);
      addTerminalLine("LOGO UPLOAD: FAILED");
      throw new Error('Failed to upload logo image');
    }
  };

  const createOrGetUser = async () => {
    try {
      if (!address) {
        throw new Error('Wallet address not available');
      }

      addTerminalLine("CHECKING USER DATABASE...");

      const { data: user, error: fetchError } = await supabase
        .from('users')
        .select('id')
        .eq('wallet_address', address)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') {
        throw fetchError;
      }

      if (!user) {
        addTerminalLine("CREATING NEW USER...");
        
        const { data: newUser, error: insertError } = await supabase
          .from('users')
          .insert([{ wallet_address: address }])
          .select('id')
          .single();

        if (insertError) throw insertError;
        
        addTerminalLine("USER CREATED: SUCCESS");
        return newUser.id;
      }

      addTerminalLine("USER FOUND: SUCCESS");
      return user.id;
    } catch (error) {
      console.error('Error with user:', error);
      addTerminalLine("USER DATABASE ERROR");
      throw new Error('Failed to process user information');
    }
  };

  // Update the deployTokenToBlockchain function
  const deployTokenToBlockchain = async (beraAmount) => {
    try {
      if (!window.ethereum) {
        throw new Error("Please install MetaMask to deploy tokens");
      }

      if (!address) {
        throw new Error("Please connect your wallet to deploy tokens");
      }

      setDeploymentStatus('INITIATING DEPLOYMENT...');
      addTerminalLine("CONNECTING TO BLOCKCHAIN...");
      
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const signer = provider.getSigner();
      
      await window.ethereum.request({ method: 'eth_requestAccounts' });
      
      const purchaseAmount = ethers.utils.parseEther(beraAmount);
      const totalValue = CREATION_FEE.add(purchaseAmount);

      const tokenFactory = new ethers.Contract(
        TOKEN_FACTORY_ADDRESS,
        FACTORY_ABI,
        signer
      );

      setDeploymentStatus('CREATING TOKEN...');
      addTerminalLine("PREPARING TOKEN CREATION...");
      
      console.log('Starting token deployment with:', {
        name: formData.tokenName.trim(),
        symbol: formData.tokenSymbol.trim().toUpperCase(),
        value: totalValue.toString()
      });

      addTerminalLine(`DEPLOYING TOKEN: ${formData.tokenName.trim()} (${formData.tokenSymbol.trim().toUpperCase()})`);

      const tx = await tokenFactory.createToken(
        formData.tokenName.trim(),
        formData.tokenSymbol.trim().toUpperCase(),
        ethers.BigNumber.from("1000000000"),
        BERA_USD_PRICE_FEED,
        { 
          value: totalValue,
          gasLimit: 3000000
        }
      );

      setDeploymentStatus('WAITING FOR CONFIRMATION...');
      addTerminalLine(`TX HASH: ${tx.hash.substring(0, 10)}...${tx.hash.substring(tx.hash.length - 8)}`);
      addTerminalLine("AWAITING BLOCKCHAIN CONFIRMATION...");
      
      const receipt = await tx.wait();

      // Find TokenCreated event using indexed parameters
      const tokenCreatedEvent = receipt.logs.find(log => {
        try {
          const parsed = tokenFactory.interface.parseLog(log);
          return parsed.name === 'TokenCreated';
        } catch {
          return false;
        }
      });

      if (!tokenCreatedEvent) {
        throw new Error('TokenCreated event not found in transaction logs');
      }

      const parsedEvent = tokenFactory.interface.parseLog(tokenCreatedEvent);
      const tokenAddress = parsedEvent.args.tokenAddress;
      const bondingCurveAddress = parsedEvent.args.bondingCurveAddress;

      console.log('Extracted addresses:', {
        token: tokenAddress,
        bondingCurve: bondingCurveAddress
      });

      addTerminalLine("TOKEN DEPLOYMENT: SUCCESS");
      addTerminalLine(`TOKEN ADDRESS: ${tokenAddress.substring(0, 8)}...`);

      // Return the addresses and hash
      return {
        tokenAddress,
        bondingCurveAddress,
        txHash: tx.hash
      };

    } catch (error) {
      console.error('Error in deployment process:', error);
      addTerminalLine("DEPLOYMENT ERROR: " + error.message);
      throw error;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    try {
      if (!isConnected) {
        throw new Error('Please connect your wallet to continue');
      }
      
      // Only validate form here, don't check account
      validateForm();
      
      // Open modal for transaction
      setIsModalOpen(true);
      addTerminalLine("DEPLOYMENT INITIATED: AWAITING CONFIRMATION");
    } catch (error) {
      setError(error.message || 'Failed to validate form');
      addTerminalLine("ERROR: " + error.message);
    }
  };

  const handleBeraConfirmation = async (beraAmount) => {
    setIsModalOpen(false);
    setIsSubmitting(true);
    setError(null);

    try {
      addTerminalLine("CONFIRMATION RECEIVED: PROCEEDING WITH DEPLOYMENT");
      
      // Deploy token first
      const deploymentResult = await deployTokenToBlockchain(beraAmount);
      
      if (!deploymentResult) {
        throw new Error('Deployment failed');
      }

      const { tokenAddress, bondingCurveAddress, txHash } = deploymentResult;

      // Only create user after successful deployment
      const userId = await createOrGetUser();

      // Upload logo
      const logoUrl = await uploadLogo(formData.tokenLogo);

      addTerminalLine("SAVING TOKEN DATA TO DATABASE...");
      
      // Prepare token data
      const tokenData = {
        user_id: userId,
        token_name: formData.tokenName.trim(),
        token_symbol: formData.tokenSymbol.trim().toUpperCase(),
        token_description: formData.tokenDescription.trim(),
        logo_url: logoUrl,
        x_link: formData.twitterUrl.trim() || null,
        telegram_link: formData.telegramUrl.trim() || null,
        use_bexie: formData.websiteOption === 'create',
        website_link: formData.websiteOption === 'existing' ? 
          formData.websiteUrl.trim() : null,
        tx_hash: txHash,
        contract_address: tokenAddress,
        bonding_curve_contract_address: bondingCurveAddress
      };

      const { error: tokenError } = await supabase
        .from('tokens')
        .insert([tokenData]);

      if (tokenError) throw tokenError;

      addTerminalLine("TOKEN SAVED: SUCCESS");
      addTerminalLine("DEPLOYMENT COMPLETE");
      
      alert('Token deployed and saved successfully!');
      navigate('/');
      
    } catch (error) {
      console.error('Error in deployment process:', error);
      setError(error.message || 'Failed to deploy token');
      addTerminalLine("CRITICAL ERROR: " + error.message);
    } finally {
      setIsSubmitting(false);
      setDeploymentStatus('');
    }
  };

  return (
    <div className="token-deployer">
      <div className="ascii-header" style={{ whiteSpace: 'pre', fontFamily: 'monospace', textAlign: 'center', marginBottom: '2rem' }}>
        {ASCII_HEADER}
      </div>
      
      <BuyBeraModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onConfirm={handleBeraConfirmation}
      />
      
      <h1>DEPLOY YOUR TOKEN</h1>
      
      {error && (
        <div className="error-message">
          {error}
        </div>
      )}
      
      {deploymentStatus && (
        <div className="deployment-status">
          {deploymentStatus}
        </div>
      )}
      
      {terminalOutput.length > 0 && (
        <div className="terminal-output" style={{
          background: '#000',
          border: '1px solid #fff',
          padding: '1rem',
          fontFamily: 'monospace',
          marginBottom: '1.5rem',
          whiteSpace: 'pre-line',
          lineHeight: '1.5'
        }}>
          {terminalOutput.map((line, index) => (
            <div key={index}>{line}</div>
          ))}
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="deploy-form">
        {/* Basic Token Information */}
        <div className="form-section">
          <h2>BASIC INFORMATION</h2>
          <div className="form-group">
            <label htmlFor="tokenName">TOKEN NAME*</label>
            <input
              type="text"
              id="tokenName"
              name="tokenName"
              value={formData.tokenName}
              onChange={handleInputChange}
              required
              placeholder="e.g., My Awesome Token"
            />
          </div>

          <div className="form-group">
            <label htmlFor="tokenSymbol">TOKEN SYMBOL*</label>
            <input
              type="text"
              id="tokenSymbol"
              name="tokenSymbol"
              value={formData.tokenSymbol}
              onChange={handleInputChange}
              required
              placeholder="e.g., MAT"
              maxLength="6"
            />
          </div>

          <div className="form-group">
            <label htmlFor="tokenDescription">TOKEN DESCRIPTION*</label>
            <textarea
              id="tokenDescription"
              name="tokenDescription"
              value={formData.tokenDescription}
              onChange={handleInputChange}
              required
              placeholder="Describe your token's purpose and features"
              rows="4"
            />
          </div>
        </div>

        {/* Token Logo */}
        <div className="form-section">
          <h2>TOKEN LOGO</h2>
          <div className="form-group logo-upload">
            <label htmlFor="tokenLogo">UPLOAD LOGO* (MAX 5MB)</label>
            <input
              type="file"
              id="tokenLogo"
              name="tokenLogo"
              onChange={handleLogoChange}
              accept="image/*"
              required
            />
            {logoPreview && (
              <div className="logo-preview">
                <img src={logoPreview} alt="Token logo preview" />
              </div>
            )}
          </div>
        </div>

        {/* Social Media Links */}
        <div className="form-section">
          <div className="section-header">
            <h2>SOCIAL MEDIA</h2>
            <span className="optional-tag">OPTIONAL</span>
          </div>
          <p className="section-description">
            Add your social media links to help people find and connect with your project
          </p>
          <div className="social-links">
            <div className="form-group social-input">
              <div className="social-icon telegram">
                <i className="fab fa-telegram"></i>
              </div>
              <input
                type="url"
                id="telegramUrl"
                name="telegramUrl"
                value={formData.telegramUrl}
                onChange={handleInputChange}
                placeholder="https://t.me/yourgroup"
              />
            </div>

            <div className="form-group social-input">
              <div className="social-icon twitter">
                <i className="fab fa-x-twitter"></i>
              </div>
              <input
                type="url"
                id="twitterUrl"
                name="twitterUrl"
                value={formData.twitterUrl}
                onChange={handleInputChange}
                placeholder="https://x.com/youraccount"
              />
            </div>
          </div>
        </div>

        {/* Website Options */}
        <div className="form-section">
          <h2>WEBSITE CONFIGURATION</h2>
          <p className="section-description">
            Choose how you want to showcase your token online
          </p>
          <div className="website-options">
            <div className="website-option-card" onClick={() => handleWebsiteOptionChange({ target: { value: 'existing' } })}>
              <input
                type="radio"
                id="existing"
                name="websiteOption"
                value="existing"
                checked={formData.websiteOption === 'existing'}
                onChange={handleWebsiteOptionChange}
              />
              <label htmlFor="existing">
                <h3>USE EXISTING WEBSITE</h3>
                <p>Connect your token to your current website</p>
              </label>
            </div>

            <div className="website-option-card" onClick={() => handleWebsiteOptionChange({ target: { value: 'create' } })}>
              <input
                type="radio"
                id="create"
                name="websiteOption"
                value="create"
                checked={formData.websiteOption === 'create'}
                onChange={handleWebsiteOptionChange}
              />
              <label htmlFor="create">
                <h3>CREATE BEXIE WEBSITE</h3>
                <p>Let us create a professional website for your token</p>
              </label>
            </div>
          </div>

          {formData.websiteOption === 'existing' && (
            <div className="form-group website-url-input">
              <label htmlFor="websiteUrl">WEBSITE URL*</label>
              <input
                type="url"
                id="websiteUrl"
                name="websiteUrl"
                value={formData.websiteUrl}
                onChange={handleInputChange}
                required
                placeholder="https://yourwebsite.com"
              />
            </div>
          )}
        </div>

        <button 
          type="submit" 
          className="submit-button" 
          disabled={isSubmitting}
        >
          {isSubmitting ? 'DEPLOYING...' : 'DEPLOY TOKEN'}
        </button>
      </form>
    </div>
  );
}

export default TokenDeployer; 