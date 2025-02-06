import { useState } from 'react';
import './AgentActivationForm.css';

const personalTraits = [
  'Friendly', 'Professional', 'Humorous', 'Formal', 'Casual',
  'Enthusiastic', 'Calm', 'Patient', 'Direct', 'Diplomatic',
  'Creative', 'Analytical', 'Supportive', 'Assertive', 'Empathetic',
  'Optimistic', 'Realistic', 'Technical', 'Simple', 'Detailed'
];

function AgentActivationForm({ onClose, tokenName }) {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    description: '',
    selectedTraits: [],
    botChoice: 'bexie',
    botToken: '',
    telegramUsername: ''
  });

  const handleTraitSelection = (trait) => {
    setFormData(prev => {
      const traits = [...prev.selectedTraits];
      if (traits.includes(trait)) {
        return { ...prev, selectedTraits: traits.filter(t => t !== trait) };
      }
      if (traits.length < 3) {
        return { ...prev, selectedTraits: [...traits, trait] };
      }
      return prev;
    });
  };

  const handleNext = () => {
    setStep(prev => prev + 1);
  };

  const handleBack = () => {
    setStep(prev => prev - 1);
  };

  const handleSubmit = () => {
    // Handle form submission here
    console.log('Form submitted:', formData);
    onClose();
  };

  return (
    <div className="agent-activation-overlay">
      <div className="agent-activation-modal">
        <button className="close-button" onClick={onClose}>&times;</button>
        
        {/* Main Title with Token Name */}
        <div className="form-header">
          <h2>Activate Agent</h2>
          <div className="token-name">{tokenName}</div>
        </div>
        
        {/* Progress Steps */}
        <div className="progress-steps">
          <div className={`progress-step ${step === 1 ? 'active' : ''}`}>
            <div className="step-number">1</div>
            <div className="step-label">Basic Configuration</div>
          </div>
          <div className={`progress-step ${step === 2 ? 'active' : ''}`}>
            <div className="step-number">2</div>
            <div className="step-label">Telegram Setup</div>
          </div>
          <div className={`progress-step ${step === 3 ? 'active' : ''}`}>
            <div className="step-number">3</div>
            <div className="step-label">Confirmation</div>
          </div>
        </div>

        {step === 1 && (
          <div className="form-step">
            <div className="step-content">
              <div className="section-title">
                <h3>Basic Configuration</h3>
                <p className="section-description">Configure how your agent will behave and interact</p>
              </div>

              <div className="form-group">
                <label>Agent Description</label>
                <p className="field-description">Describe the personality and behavior of your agent</p>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  placeholder="Example: Friendly and helpful agent that assists users with token information..."
                />
              </div>

              <div className="form-group">
                <label>Personality Traits</label>
                <p className="field-description">Select up to 3 traits that define your agent's personality</p>
                <div className="traits-grid">
                  {personalTraits.map(trait => (
                    <div
                      key={trait}
                      className={`trait-item ${formData.selectedTraits.includes(trait) ? 'selected' : ''}`}
                      onClick={() => handleTraitSelection(trait)}
                    >
                      {trait}
                    </div>
                  ))}
                </div>
                <div className="traits-counter">
                  Selected: {formData.selectedTraits.length}/3
                </div>
              </div>
            </div>

            <div className="form-actions">
              <button 
                onClick={handleNext} 
                disabled={!formData.description || formData.selectedTraits.length === 0}
                className="primary-button"
              >
                Continue to Telegram Setup
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="form-step">
            <div className="step-content">
              <div className="section-title">
                <h3>Telegram Setup</h3>
                <p className="section-description">Configure your agent's Telegram integration</p>
              </div>

              {/* Username Field */}
              <div className="form-group username-field">
                <label>Telegram Username</label>
                <p className="field-description">Enter the Telegram username of the person who will activate the bot</p>
                <div className="username-input-wrapper">
                  <div className="username-input-container">
                    <div className="username-symbol">@</div>
                    <input
                      type="text"
                      value={formData.telegramUsername}
                      onChange={(e) => {
                        const username = e.target.value.replace('@', '');
                        setFormData({...formData, telegramUsername: username});
                      }}
                      placeholder="username"
                      className="telegram-username-input"
                    />
                  </div>
                </div>
              </div>

              {/* Bot Selection */}
              <div className="form-group bot-selection-group">
                <label>Bot Selection</label>
                <p className="field-description">Choose between Bexie bot or your custom bot</p>
                
                <div className="bot-options">
                  <label className={`bot-option ${formData.botChoice === 'bexie' ? 'selected' : ''}`}>
                    <input
                      type="radio"
                      value="bexie"
                      checked={formData.botChoice === 'bexie'}
                      onChange={(e) => setFormData({...formData, botChoice: e.target.value})}
                    />
                    <div className="option-content">
                      <div className="option-title">
                        <i className="fas fa-robot"></i>
                        Use Bexie Bot
                      </div>
                      <div className="option-description">Recommended for most users</div>
                    </div>
                  </label>
                  
                  <label className={`bot-option ${formData.botChoice === 'custom' ? 'selected' : ''}`}>
                    <input
                      type="radio"
                      value="custom"
                      checked={formData.botChoice === 'custom'}
                      onChange={(e) => setFormData({...formData, botChoice: e.target.value})}
                    />
                    <div className="option-content">
                      <div className="option-title">
                        <i className="fas fa-cog"></i>
                        Use Custom Bot
                      </div>
                      <div className="option-description">For advanced users</div>
                    </div>
                  </label>
                </div>
              </div>

              {/* Bot Setup Section */}
              <div className="bot-setup-section">
                {formData.botChoice === 'bexie' && (
                  <div className="setup-card">
                    <div className="setup-card-header">
                      <i className="fas fa-plus-circle"></i>
                      <h4>Add Bexie Bot to Your Group</h4>
                    </div>
                    <div className="setup-card-content">
                      <div className="admin-notice">
                        <i className="fas fa-exclamation-circle"></i>
                        Make sure to give the bot admin privileges in your group
                      </div>
                      <a 
                        href="https://t.me/bexie_bot?startgroup=true"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bexie-bot-link"
                      >
                        <i className="fab fa-telegram"></i>
                        Add to Group
                      </a>
                    </div>
                  </div>
                )}

                {formData.botChoice === 'custom' && (
                  <div className="setup-card">
                    <div className="setup-card-header">
                      <i className="fas fa-key"></i>
                      <h4>Custom Bot Configuration</h4>
                    </div>
                    <div className="setup-card-content">
                      <div className="form-group">
                        <label>Bot Token</label>
                        <input
                          type="text"
                          value={formData.botToken}
                          onChange={(e) => setFormData({...formData, botToken: e.target.value})}
                          placeholder="Enter your bot token from BotFather"
                          className="bot-token-input"
                        />
                      </div>
                      
                      <div className="setup-steps">
                        <div className="setup-steps-header">
                          <i className="fas fa-list-ol"></i>
                          Configure Bot Privacy Settings
                        </div>
                        <ol>
                          <li>Message <a href="https://t.me/BotFather" target="_blank" rel="noopener noreferrer">@BotFather</a></li>
                          <li>Send <code>/setprivacy</code></li>
                          <li>Select your bot</li>
                          <li>Choose <strong>DISABLE</strong></li>
                          <li>Add bot as admin to your group</li>
                        </ol>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="form-actions">
              <button onClick={handleBack} className="secondary-button">
                Back
              </button>
              <button 
                onClick={handleNext}
                disabled={!formData.telegramUsername || (formData.botChoice === 'custom' && !formData.botToken)}
                className="primary-button"
              >
                Continue to Review
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="form-step">
            <div className="step-content">
              <div className="section-title">
                <h3>Review Configuration</h3>
                <p className="section-description">Please review your agent configuration before activation</p>
              </div>

              <div className="confirmation-container">
                <div className="confirmation-section">
                  <div className="confirmation-header">
                    <i className="fas fa-sliders-h"></i>
                    <h4>Basic Configuration</h4>
                  </div>
                  <div className="confirmation-content">
                    <div className="confirmation-item">
                      <span className="item-label">Description</span>
                      <p className="item-value">{formData.description}</p>
                    </div>
                    <div className="confirmation-item">
                      <span className="item-label">Personality Traits</span>
                      <div className="traits-summary">
                        {formData.selectedTraits.map(trait => (
                          <span key={trait} className="trait-badge">{trait}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="confirmation-section">
                  <div className="confirmation-header">
                    <i className="fab fa-telegram"></i>
                    <h4>Telegram Setup</h4>
                  </div>
                  <div className="confirmation-content">
                    <div className="confirmation-item">
                      <span className="item-label">Telegram Username</span>
                      <span className="item-value username-value">@{formData.telegramUsername}</span>
                    </div>
                    <div className="confirmation-item">
                      <span className="item-label">Bot Configuration</span>
                      <div className="bot-summary">
                        <i className={formData.botChoice === 'bexie' ? 'fas fa-robot' : 'fas fa-cog'}></i>
                        <span>{formData.botChoice === 'bexie' ? 'Bexie Bot' : 'Custom Bot'}</span>
                      </div>
                    </div>
                    {formData.botChoice === 'custom' && (
                      <div className="confirmation-item">
                        <span className="item-label">Bot Token</span>
                        <span className="item-value token-value">
                          {/* Show only first and last 4 characters for security */}
                          {formData.botToken.slice(0, 4)}...{formData.botToken.slice(-4)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="form-actions">
              <button onClick={handleBack} className="secondary-button">
                <i className="fas fa-arrow-left"></i>
                Back to Setup
              </button>
              <button onClick={handleSubmit} className="primary-button activation-button">
                <i className="fas fa-check-circle"></i>
                Activate Agent
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default AgentActivationForm; 