import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import config from '../config/config';
import '../styles/TopUp.css';

/**
 * TopUp Page Component
 * 
 * Page for users to top-up their account balance
 * 
 * @returns {JSX.Element} TopUp page component
 */
const TopUp = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [paymentMethod, setPaymentMethod] = useState(null);
  const [subMethod, setSubMethod] = useState(null);
  const [selectedAmount, setSelectedAmount] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [pricingOptions, setPricingOptions] = useState([]);
  const [fetchingPricing, setFetchingPricing] = useState(true);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [viewHistory, setViewHistory] = useState(false);
  const [history, setHistory] = useState([]);
  const [fetchingHistory, setFetchingHistory] = useState(false);

  // Form data for different payment methods
  const [formData, setFormData] = useState({
    momo: { phoneNumber: '' },
    zalopay: { phoneNumber: '' },
    bank: { accountNumber: '', accountName: '', bankName: '', transferContent: '' },
    prepaidCard: { cardNumber: '', cardPin: '', provider: '' }
  });

  // Fetch pricing options
  useEffect(() => {
    const fetchPricing = async () => {
      try {
        setFetchingPricing(true);
        const response = await axios.get(
          `${config.backendUrl}/api/topup/pricing`,
          { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
        );
        setPricingOptions(response.data);
      } catch (err) {
        console.error('Failed to fetch pricing options:', err);
        setPricingOptions([
          { price: 12000, balance: 100, bonus: 10, note: "Good start! Try our service." },
          { price: 20000, balance: 200, bonus: 20, note: "Smart pick for regular readers!" },
          { price: 50000, balance: 550, bonus: 55, note: "Best value for unlocking more!" },
          { price: 250000, balance: 2800, bonus: 280, note: "Perfect for full volumes!" },
          { price: 350000, balance: 4000, bonus: 400, note: "For serious readers — huge savings!" }
        ]);
      } finally {
        setFetchingPricing(false);
      }
    };

    fetchPricing();
  }, []);

  // Fetch pending requests
  useEffect(() => {
    const fetchPendingRequests = async () => {
      if (!user) return;
      
      try {
        const response = await axios.get(
          `${config.backendUrl}/api/topup/pending`,
          { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
        );
        setPendingRequests(response.data);
      } catch (err) {
        console.error('Failed to fetch pending requests:', err);
      }
    };

    fetchPendingRequests();
  }, [user]);

  // Handle payment method selection
  const handleMethodSelect = (method) => {
    setPaymentMethod(method);
    setSubMethod(method === 'ewallet' ? 'momo' : null);
  };

  // Handle sub-method selection (for e-wallets)
  const handleSubMethodSelect = (method) => {
    setSubMethod(method);
  };

  // Handle amount selection
  const handleAmountSelect = (option) => {
    setSelectedAmount(option);
  };

  // Handle form input changes
  const handleInputChange = (category, field, value) => {
    setFormData(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [field]: value
      }
    }));
  };

  // Format price for display
  const formatPrice = (price) => {
    return new Intl.NumberFormat('vi-VN').format(price) + '₫';
  };

  // Format date for display
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedAmount) {
      setError('Please select an amount');
      return;
    }

    if (!paymentMethod) {
      setError('Please select a payment method');
      return;
    }

    setLoading(true);

    try {
      const response = await axios.post(
        `${config.backendUrl}/api/topup/request`,
        {
          amount: selectedAmount.price,
          balance: selectedAmount.balance,
          paymentMethod,
          subMethod,
          details: subMethod ? formData[subMethod] : formData[paymentMethod]
        },
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );
      
      // Show success message
      alert(response.data.message + (response.data.bonus ? `\n${response.data.bonus}` : ''));
      
      // Reset form
      setPaymentMethod(null);
      setSubMethod(null);
      setSelectedAmount(null);
      setFormData({
        momo: { phoneNumber: '' },
        zalopay: { phoneNumber: '' },
        bank: { accountNumber: '', accountName: '', bankName: '', transferContent: '' },
        prepaidCard: { cardNumber: '', cardPin: '', provider: '' }
      });
      
      // Refresh pending requests
      const pendingResponse = await axios.get(
        `${config.backendUrl}/api/topup/pending`,
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );
      setPendingRequests(pendingResponse.data);
      
    } catch (err) {
      console.error('Top-up request failed:', err);
      setError(err.response?.data?.message || 'Failed to process top-up request');
    } finally {
      setLoading(false);
    }
  };

  // Handle viewing transaction history
  const handleViewHistory = async () => {
    setViewHistory(true);
    setFetchingHistory(true);
    
    try {
      const response = await axios.get(
        `${config.backendUrl}/api/topup/history`,
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );
      setHistory(response.data);
    } catch (err) {
      console.error('Failed to fetch history:', err);
    } finally {
      setFetchingHistory(false);
    }
  };

  // Handle canceling a pending request
  const handleCancelRequest = async (requestId) => {
    if (!confirm('Are you sure you want to cancel this request?')) {
      return;
    }
    
    try {
      await axios.delete(
        `${config.backendUrl}/api/topup/request/${requestId}`,
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );
      
      // Update pending requests
      setPendingRequests(pendingRequests.filter(req => req._id !== requestId));
      
      alert('Request cancelled successfully');
    } catch (err) {
      console.error('Failed to cancel request:', err);
      alert(err.response?.data?.message || 'Failed to cancel request');
    }
  };

  return (
    <div className="top-up-container">
      <h1>Top-up Your Account</h1>
      
      {/* Rules section */}
      <section className="top-up-section rules-section">
        <div className="rules-list">
          <div className="rule-item">
            <span className="rule-icon">🦋</span>
            <p>Balance is the virtual currency used within our system</p>
          </div>
          <div className="rule-item">
            <span className="rule-icon">🦋</span>
            <p>Balance can only be used to unlock chapters, purchase features, and support authors</p>
          </div>
          <div className="rule-item">
            <span className="rule-icon">🦋</span>
            <p>Purchased balance cannot be refunded for any reason</p>
          </div>
          <div className="rule-item">
            <span className="rule-icon">🦋</span>
            <p>Balance will be added to your account once we confirm your payment</p>
          </div>
          <div className="rule-item">
            <span className="rule-icon">🦋</span>
            <p>You can purchase balance through one of the payment methods below</p>
          </div>
        </div>
      </section>

      {/* Pending requests section - shown if there are pending requests */}
      {pendingRequests.length > 0 && (
        <section className="top-up-section pending-section">
          <h2>Pending Requests</h2>
          <div className="pending-requests">
            {pendingRequests.map(request => (
              <div key={request._id} className="pending-request">
                <div className="request-details">
                  <div className="request-amount">
                    <span className="amount-label">Amount:</span>
                    <span className="amount-value">{formatPrice(request.amount)}</span>
                  </div>
                  <div className="request-credits">
                    <span className="credits-label">Balance:</span>
                    <span className="credits-value">{request.balance}</span>
                    {request.bonus > 0 && (
                      <span className="bonus-value">+{request.bonus} bonus</span>
                    )}
                  </div>
                  <div className="request-method">
                    <span className="method-label">Method:</span>
                    <span className="method-value">
                      {request.paymentMethod === 'ewallet' 
                        ? `${request.subMethod.charAt(0).toUpperCase() + request.subMethod.slice(1)}` 
                        : request.paymentMethod === 'bank' 
                          ? 'Bank Transfer' 
                          : 'Prepaid Card'}
                    </span>
                  </div>
                  <div className="request-date">
                    <span className="date-label">Requested:</span>
                    <span className="date-value">{formatDate(request.createdAt)}</span>
                  </div>
                </div>
                <button 
                  className="cancel-button"
                  onClick={() => handleCancelRequest(request._id)}
                >
                  Cancel
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      <div className="top-up-content">
        {/* Payment method selection */}
        <section className="top-up-section">
          <h2>Select Payment Method</h2>
          <div className="payment-methods">
            <div 
              className={`payment-method-card ${paymentMethod === 'ewallet' ? 'selected' : ''}`}
              onClick={() => handleMethodSelect('ewallet')}
            >
              <div className="payment-logos">
                <div className="payment-logo">
                  <img src="https://Valvrareteam.b-cdn.net/mmo.png" alt="Momo" />
                </div>
                <div className="payment-logo">
                  <img src="https://Valvrareteam.b-cdn.net/zalopay.webp" alt="ZaloPay" />
                </div>
              </div>
              <p>Pay with Momo and ZaloPay</p>
            </div>

            <div 
              className={`payment-method-card ${paymentMethod === 'bank' ? 'selected' : ''}`}
              onClick={() => handleMethodSelect('bank')}
            >
              <div className="payment-logos">
                <div className="payment-logo">
                  <img src="https://via.placeholder.com/100x40?text=Banks" alt="Banks" />
                </div>
              </div>
              <p>Bank Transfer</p>
            </div>

            <div 
              className={`payment-method-card ${paymentMethod === 'prepaidCard' ? 'selected' : ''}`}
              onClick={() => handleMethodSelect('prepaidCard')}
            >
              <div className="payment-logos">
                <div className="payment-logo">
                  <img src="https://Valvrareteam.b-cdn.net/viettel.png" alt="Viettel" />
                </div>
                <div className="payment-logo">
                  <img src="https://Valvrareteam.b-cdn.net/vinaphone.png" alt="Vinaphone" />
                </div>
                <div className="payment-logo">
                  <img src="https://Valvrareteam.b-cdn.net/mobiphone.png" alt="Mobiphone" />
                </div>
              </div>
              <p>Prepaid Cards (Thẻ cào)</p>
            </div>
          </div>
        </section>

        {/* Pricing table */}
        <section className="top-up-section">
          <h2>Select Amount</h2>
          {fetchingPricing ? (
            <p>Loading pricing options...</p>
          ) : (
            <div className="pricing-table">
              <div className="pricing-header">
                <div className="pricing-cell">Price</div>
                <div className="pricing-cell">Balance</div>
                <div className="pricing-cell">First-Time Bonus (10%)</div>
                <div className="pricing-cell">Note</div>
              </div>
              {pricingOptions.map((option, index) => (
                <div 
                  key={index} 
                  className={`pricing-row ${selectedAmount === option ? 'selected' : ''}`}
                  onClick={() => handleAmountSelect(option)}
                >
                  <div className="pricing-cell">{formatPrice(option.price)}</div>
                  <div className="pricing-cell">{option.balance} balance</div>
                  <div className="pricing-cell">+{option.bonus} balance</div>
                  <div className="pricing-cell note">{option.note}</div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Payment details section - shown only when a payment method is selected */}
        {paymentMethod && (
          <section className="top-up-section">
            <h2>Payment Details</h2>
            
            {/* E-wallet payment details */}
            {paymentMethod === 'ewallet' && (
              <div className="payment-details">
                <div className="sub-methods">
                  <label className="sub-method">
                    <input 
                      type="radio" 
                      name="ewallet" 
                      value="momo" 
                      checked={subMethod === 'momo'}
                      onChange={() => handleSubMethodSelect('momo')}
                    />
                    <span className="radio-label">Momo</span>
                  </label>
                  <label className="sub-method">
                    <input 
                      type="radio" 
                      name="ewallet" 
                      value="zalopay" 
                      checked={subMethod === 'zalopay'}
                      onChange={() => handleSubMethodSelect('zalopay')}
                    />
                    <span className="radio-label">ZaloPay</span>
                  </label>
                </div>

                {subMethod === 'momo' && (
                  <div className="method-form">
                    <div className="form-group">
                      <label htmlFor="momo-phone">Momo Phone Number</label>
                      <input 
                        type="text" 
                        id="momo-phone" 
                        value={formData.momo.phoneNumber}
                        onChange={(e) => handleInputChange('momo', 'phoneNumber', e.target.value)}
                        placeholder="Enter your Momo phone number"
                      />
                    </div>
                  </div>
                )}

                {subMethod === 'zalopay' && (
                  <div className="method-form">
                    <div className="form-group">
                      <label htmlFor="zalopay-phone">ZaloPay Phone Number</label>
                      <input 
                        type="text" 
                        id="zalopay-phone" 
                        value={formData.zalopay.phoneNumber}
                        onChange={(e) => handleInputChange('zalopay', 'phoneNumber', e.target.value)}
                        placeholder="Enter your ZaloPay phone number"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Bank transfer details */}
            {paymentMethod === 'bank' && (
              <div className="payment-details">
                <div className="method-form">
                  <div className="bank-instructions">
                    <p>Transfer the exact amount to our bank account:</p>
                    <div className="bank-info">
                      <p><strong>Bank Name:</strong> Example Bank</p>
                      <p><strong>Account Number:</strong> 1234567890</p>
                      <p><strong>Account Holder:</strong> Your Company Name</p>
                      <p><strong>Reference:</strong> {user?.username}</p>
                    </div>
                    <p>After making the transfer, please fill in your details below:</p>
                  </div>
                  <div className="form-group">
                    <label htmlFor="bank-name">Your Bank Name</label>
                    <input 
                      type="text" 
                      id="bank-name" 
                      value={formData.bank.bankName}
                      onChange={(e) => handleInputChange('bank', 'bankName', e.target.value)}
                      placeholder="Enter your bank name"
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="account-name">Account Holder Name</label>
                    <input 
                      type="text" 
                      id="account-name" 
                      value={formData.bank.accountName}
                      onChange={(e) => handleInputChange('bank', 'accountName', e.target.value)}
                      placeholder="Enter account holder name"
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="account-number">Your Account Number</label>
                    <input 
                      type="text" 
                      id="account-number" 
                      value={formData.bank.accountNumber}
                      onChange={(e) => handleInputChange('bank', 'accountNumber', e.target.value)}
                      placeholder="Enter your account number"
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="transfer-content">Transfer Content/Reference</label>
                    <input 
                      type="text" 
                      id="transfer-content" 
                      value={formData.bank.transferContent}
                      onChange={(e) => handleInputChange('bank', 'transferContent', e.target.value)}
                      placeholder="Enter transfer reference"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Prepaid card details */}
            {paymentMethod === 'prepaidCard' && (
              <div className="payment-details">
                <div className="method-form">
                  <div className="form-group">
                    <label htmlFor="card-provider">Card Provider</label>
                    <select 
                      id="card-provider"
                      value={formData.prepaidCard.provider}
                      onChange={(e) => handleInputChange('prepaidCard', 'provider', e.target.value)}
                    >
                      <option value="">Select provider</option>
                      <option value="viettel">Viettel</option>
                      <option value="vinaphone">Vinaphone</option>
                      <option value="mobiphone">Mobiphone</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label htmlFor="card-number">Card Number</label>
                    <input 
                      type="text" 
                      id="card-number" 
                      value={formData.prepaidCard.cardNumber}
                      onChange={(e) => handleInputChange('prepaidCard', 'cardNumber', e.target.value)}
                      placeholder="Enter card number/serial"
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="card-pin">Card PIN</label>
                    <input 
                      type="text" 
                      id="card-pin" 
                      value={formData.prepaidCard.cardPin}
                      onChange={(e) => handleInputChange('prepaidCard', 'cardPin', e.target.value)}
                      placeholder="Enter card PIN"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Submit button */}
            <button 
              className="submit-button" 
              onClick={handleSubmit}
              disabled={loading || !selectedAmount || !paymentMethod}
            >
              {loading ? 'Processing...' : 'Submit Payment Request'}
            </button>

            {/* Error message */}
            {error && <div className="error-message">{error}</div>}
          </section>
        )}

        {/* Transaction history toggle */}
        <div className="history-toggle">
          <button 
            className="history-button"
            onClick={handleViewHistory}
            disabled={viewHistory && fetchingHistory}
          >
            {viewHistory ? 'Refresh History' : 'View Transaction History'}
          </button>
        </div>

        {/* Transaction history */}
        {viewHistory && (
          <section className="top-up-section">
            <h2>Transaction History</h2>
            {fetchingHistory ? (
              <p>Loading transaction history...</p>
            ) : history.length === 0 ? (
              <p>No transaction history found</p>
            ) : (
              <div className="transaction-history">
                {history.map(transaction => (
                  <div key={transaction._id} className={`transaction-item status-${transaction.status.toLowerCase()}`}>
                    <div className="transaction-header">
                      <div className="transaction-date">{formatDate(transaction.createdAt)}</div>
                      <div className="transaction-status">{transaction.status}</div>
                    </div>
                    <div className="transaction-body">
                      <div className="transaction-amounts">
                        <div className="transaction-price">{formatPrice(transaction.amount)}</div>
                        <div className="transaction-credits">
                          {transaction.balance} balance
                          {transaction.bonus > 0 && (
                            <span className="transaction-bonus">+{transaction.bonus} bonus</span>
                          )}
                        </div>
                      </div>
                      <div className="transaction-method">
                        {transaction.paymentMethod === 'ewallet' 
                          ? `${transaction.subMethod.charAt(0).toUpperCase() + transaction.subMethod.slice(1)}` 
                          : transaction.paymentMethod === 'bank' 
                            ? 'Bank Transfer' 
                            : 'Prepaid Card'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  );
};

export default TopUp; 