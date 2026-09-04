import { useState } from 'react'
import { ArrowUpRight, Bike, CarFront, Navigation, ShieldCheck, Sparkles, Star, WalletCards, X } from 'lucide-react'
import { api } from '../services/api'

export default function BookingFlow({ stage, setStage, ride, destination, currentRide, onConfirm }) {
  const [paymentMethod, setPaymentMethod] = useState('cash')
  const [error, setError] = useState('')
  const [paymentFailed, setPaymentFailed] = useState(false)
  const submitPayment = async () => {
    setError('')
    try { await api.pay(currentRide._id, paymentMethod); setPaymentFailed(false); setStage('done') } catch (requestError) { setPaymentFailed(true); setError(requestError.message) }
  }
  const retryPayment = () => { setPaymentFailed(false); setError(''); setPaymentMethod('cash') }
  const complete = stage === 'confirm' ? onConfirm : stage === 'payment' ? submitPayment : () => setStage('idle')
  const content = {
    confirm: ['CONFIRM YOUR RIDE', 'Ready when you are.', `A ${ride.toLowerCase()} ride to ${destination}`, 'Confirm booking'],
    matching: ['SMART MATCH', 'Finding your best match', 'Searching verified partners nearby', null],
    tracking: ['DRIVER FOUND', 'Your ride is on the way', 'Live driver updates will appear here', null],
    payment: ['SECURE PAYMENT', 'Complete your ride', 'Select a payment method', 'Pay for ride'],
    done: ['RIDE COMPLETE', 'Thanks for riding with RideX', 'Your payment and rating can be managed from your account', 'Close'],
  }[stage]
  return <div className="flow-backdrop"><div className={`flow-modal flow-${stage}`}><button className="flow-close" onClick={() => setStage('idle')} aria-label="Close booking flow"><X size={18} /></button><div className="flow-kicker">{paymentFailed ? 'PAYMENT UNSUCCESSFUL' : content[0]}</div><div className="flow-icon">{stage === 'confirm' && <Navigation size={25} />}{stage === 'matching' && <Sparkles size={25} />}{stage === 'tracking' && <CarFront size={25} />}{stage === 'payment' && <WalletCards size={25} />}{stage === 'done' && <Star size={25} fill="currentColor" />}</div><h2>{paymentFailed ? 'Payment could not be completed' : content[1]}</h2><p>{paymentFailed ? 'Your ride is still active. Retry the payment or choose cash to continue.' : content[2]}</p>{stage === 'confirm' && <div className="flow-summary"><span>{ride}</span><small>Live quote selected</small></div>}{stage === 'matching' && <div className="matching-orbit"><span className="pulse-ring"></span><span className="matching-dot"><Bike size={20} /></span></div>}{stage === 'tracking' && <div className="driver-preview"><div className="driver-avatar">--</div><div><strong>Waiting for assignment</strong><small>Driver details appear after acceptance</small></div></div>}{stage === 'payment' && <div className="payment-options">{['cash', 'upi', 'wallet'].map((method) => <button type="button" key={method} className={paymentMethod === method ? 'payment-selected' : ''} onClick={() => { setPaymentMethod(method); setPaymentFailed(false); setError('') }}><WalletCards size={17} /> {method.toUpperCase()}</button>)}</div>}{error && <p role="alert">{error}</p>}{paymentFailed ? <div className="payment-recovery"><button className="flow-action" onClick={retryPayment}>Try another method <ArrowUpRight size={16} /></button><button className="payment-cancel" onClick={() => setStage('idle')}>Cancel payment</button></div> : content[3] && <button className="flow-action" onClick={complete}>{content[3]} <ArrowUpRight size={16} /></button>}{stage === 'tracking' && <div className="safety-note"><ShieldCheck size={14} /> Ride PIN is available in the ride record</div>}</div></div>
}
