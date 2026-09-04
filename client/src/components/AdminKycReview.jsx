import { useEffect, useState } from 'react'
import { Check, X } from 'lucide-react'
import { api } from '../services/api'

export default function AdminKycReview() {
  const [drivers, setDrivers] = useState([])
  const [error, setError] = useState('')
  const load = () => api.adminDrivers().then(setDrivers).catch((requestError) => setError(requestError.message))
  useEffect(() => { load() }, [])
  const review = async (id, status) => {
    try { const result = await api.verifyDriver(id, status); setDrivers((items) => items.map((item) => item._id === id ? result.driver : item)); setError('') } catch (requestError) { setError(requestError.message) }
  }
  return <section className="kyc-panel"><div className="section-heading"><div><p className="section-kicker">KYC REVIEW</p><h2>Driver verification</h2></div><span>{drivers.filter((driver) => driver.verificationStatus === 'pending').length} pending</span></div>{error && <p role="alert">{error}</p>}{drivers.length ? drivers.map((driver) => <div className="admin-resource-row" key={driver._id}><div><strong>{driver.name}</strong><small>{driver.vehicleType} · {driver.vehicleNumber || 'Vehicle details pending'} · {driver.verificationStatus}</small></div>{driver.verificationStatus === 'pending' && <div className="admin-request-actions"><button className="approve-button" onClick={() => review(driver._id, 'approved')}>Approve <Check size={14} /></button><button className="reject-button" onClick={() => review(driver._id, 'rejected')}>Reject <X size={14} /></button></div>}</div>) : <p className="empty-state">No driver KYC submissions yet.</p>}</section>
}
