import { useEffect, useState } from 'react'
import { ArrowUpRight, FileCheck2 } from 'lucide-react'
import { api } from '../services/api'

export default function DriverKycPanel() {
  const [driver, setDriver] = useState(null)
  const [form, setForm] = useState({ aadhaarNumber: '', panNumber: '', licenseNumber: '' })
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  useEffect(() => { api.driver().then((result) => setDriver(result.driver)).catch((requestError) => setError(requestError.message)) }, [])
  const submit = async (event) => {
    event.preventDefault()
    setBusy(true)
    try { const result = await api.driverKyc(form); setDriver(result.driver); setMessage(result.message); setError('') } catch (requestError) { setError(requestError.message); setMessage('') } finally { setBusy(false) }
  }
  if (!driver) return null
  return <section className="kyc-panel"><div className="section-heading"><div><p className="section-kicker"><FileCheck2 size={13} /> DRIVER KYC</p><h2>Identity verification</h2></div><span className={`kyc-status kyc-${driver.verificationStatus || 'pending'}`}>{driver.verificationStatus || 'pending'}</span></div><p className="subheading">Submit identity and driving licence details. Admin approval is required before going online.</p>{driver.verificationStatus === 'approved' ? <p className="kyc-approved">Your KYC is approved.</p> : <form className="driver-profile-form" onSubmit={submit}><label>Aadhaar number<input required inputMode="numeric" pattern="[0-9 ]{12,14}" value={form.aadhaarNumber} onChange={(event) => setForm({ ...form, aadhaarNumber: event.target.value })} /></label><label>PAN number<input required maxLength="10" placeholder="ABCDE1234F" value={form.panNumber} onChange={(event) => setForm({ ...form, panNumber: event.target.value.toUpperCase() })} /></label><label>Driving licence number<input required value={form.licenseNumber} onChange={(event) => setForm({ ...form, licenseNumber: event.target.value })} /></label><button className="primary-button" type="submit" disabled={busy}>{busy ? 'Submitting...' : 'Submit KYC'} <ArrowUpRight size={16} /></button></form>}{message && <p className="partner-notice" role="status">{message}</p>}{error && <p className="partner-error" role="alert">{error}</p>}</section>
}
