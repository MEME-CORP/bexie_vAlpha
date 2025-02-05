import React, { useState } from 'react';
import './BuyBeraModal.css';

function BuyBeraModal({ isOpen, onClose, onConfirm }) {
  const [beraAmount, setBeraAmount] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    onConfirm(beraAmount);
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h2>Dev Buy</h2>
        <p className="modal-description">
          Enter the amount in Bera for the first buy of your token
        </p>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="beraAmount">BERA Amount*</label>
            <input
              type="number"
              id="beraAmount"
              value={beraAmount}
              onChange={(e) => setBeraAmount(e.target.value)}
              required
              min="0"
              step="0.01"
              placeholder="Enter BERA amount"
            />
          </div>
          <div className="modal-buttons">
            <button type="button" className="cancel-button" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="confirm-button">
              Confirm
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default BuyBeraModal; 