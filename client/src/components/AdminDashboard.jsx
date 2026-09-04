import { useEffect, useState } from 'react'
import { ArrowUpRight, Bell, Check, RefreshCw, X } from 'lucide-react'
import { api } from '../services/api'
import { joinAdminRoom, onRideEvent } from '../services/socket'
import AdminKycReview from './AdminKycReview'

function AdminOverview() {
  const [overview, setOverview] = useState(null)
  const [error, setError] = useState('')
  const [requests, setRequests] = useState([])
  const [busy, setBusy] = useState('')
  const load = async () => { try { const [result, requestResult] = await Promise.all([api.adminOverview(), api.adminRequests()]); setOverview(result); setRequests(requestResult.requests || []); setError('') } catch (requestError) { setError(requestError.message) } }
  useEffect(() => { const timer = setTimeout(load, 0); return () => clearTimeout(timer) }, [])
  useEffect(() => { joinAdminRoom(); return onRideEvent('admin:new-request', ({ request }) => setRequests((current) => [request, ...current.filter((item) => item._id !== request._id)])) }, [])
  const review = async (id, status) => { setBusy(id); try { const result = await api.reviewRequest(id, status); setRequests((current) => current.map((request) => request._id === id ? result.request : request)); setError('') } catch (requestError) { setError(requestError.message) } finally { setBusy('') } }
  const details = (request) => Object.entries(request.details || {}).map(([key, value]) => `${key}: ${value}`).join(' · ')
  const metrics = overview ? [['Users', overview.totalUsers], ['Active drivers', overview.activeDrivers], ["Today's rides", overview.todaysRides], ['Revenue', `₹${overview.revenue}`]] : []
  return <div className="role-dashboard"><div className="welcome-row"><div><div className="eyebrow">RIDEX CONTROL ROOM <span className="live-dot"></span> LIVE</div><h1>Admin dashboard</h1><p className="subheading">Review requests and manage the RideX network.</p></div><button className="filter-button" onClick={load} disabled={Boolean(busy)} aria-label="Refresh admin dashboard"><RefreshCw size={15} /> Refresh</button></div>{error && <p role="alert">{error}</p>}<div className="stats-grid">{metrics.map(([label, value]) => <div className="stat-card" key={label}><span>{label}</span><strong>{value}</strong><small>Current total</small></div>)}</div><section className="admin-requests"><div className="section-heading"><div><p className="section-kicker"><Bell size={13} /> ADMIN NOTIFICATIONS</p><h2>Service requests</h2></div><span className="request-count">{requests.filter((request) => request.status === 'pending').length} pending</span></div>{requests.length ? requests.map((request) => <div className="admin-request" key={request._id}><div><strong>{request.type === 'pass' ? 'RidePass' : request.type === 'rental' ? 'Vehicle rental' : 'Shared ride'}</strong><small>{details(request)}</small><em>{request.status}</em></div>{request.status === 'pending' && <div className="admin-request-actions"><button className="approve-button" disabled={Boolean(busy)} onClick={() => review(request._id, 'approved')} aria-label={`Approve ${request.type} request`}>{busy === request._id ? 'Saving...' : 'Approve'} <Check size={14} /></button><button className="reject-button" disabled={Boolean(busy)} onClick={() => review(request._id, 'rejected')} aria-label={`Reject ${request.type} request`}>Reject <X size={14} /></button></div>}</div>) : <p className="empty-state">No service requests yet.</p>}</section>{overview && <div className="request-panel"><div className="section-heading"><div><p className="section-kicker">NETWORK STATUS</p><h2>Operational overview</h2></div></div><p>Cancellation rate: {overview.cancellationRate}% · Average fare: ₹{overview.averageFare}</p></div>}</div>
}

export default function AdminDashboard({ section = 'dashboard' }) {
  if (section === 'dashboard') return <AdminOverview />
  if (section === 'drivers') return <><AdminKycReview /><AdminResourceView section={section} /></>
  return <AdminResourceView section={section} />
}

function AdminResourceView({ section }) {
  const [items, setItems] = useState([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const labels = { users: ['Users', 'Manage registered RideX accounts'], drivers: ['Drivers', 'Review driver profiles and verification'], rides: ['Rides', 'Monitor all rides across the network'], payments: ['Payments', 'Review ride payment activity'], reports: ['Reports', 'Network performance and operational reports'], support: ['Support', 'Keep customer support within reach'], settings: ['Settings', 'Configure your admin workspace'] }
  const [title, copy] = labels[section] || labels.dashboard || labels.users
  useEffect(() => {
    const loaders = { users: api.adminUsers, drivers: api.adminDrivers, rides: api.adminRides, payments: api.adminPayments }
    const load = loaders[section]
    if (!load) return undefined
    const timer = setTimeout(() => load().then((result) => setItems(Array.isArray(result) ? result : result.users || result.drivers || result.rides || result.payments || [])).catch((requestError) => setError(requestError.message)).finally(() => setLoading(false)), 0)
    return () => clearTimeout(timer)
  }, [section])
  if (section === 'support' || section === 'settings' || section === 'reports') return <div className="admin-resource-view"><p className="section-kicker">ADMIN TOOLS</p><h1>{title}</h1><p className="subheading">{copy}</p><div className="admin-tool-panel"><h2>{section === 'support' ? 'Support center' : section === 'settings' ? 'Workspace settings' : 'Reports overview'}</h2><p>{section === 'support' ? 'Review customer requests and reach the RideX support workspace.' : section === 'settings' ? 'Your admin workspace is configured and ready to use.' : 'Live network metrics are available on the Dashboard overview.'}</p><button className="primary-button" onClick={() => setError('This admin tool is ready for the next workflow step.')}>Open workspace <ArrowUpRight size={16} /></button>{error && <p role="alert">{error}</p>}</div></div>
  return <div className="admin-resource-view"><div className="admin-resource-heading"><div><p className="section-kicker">ADMIN WORKSPACE</p><h1>{title}</h1><p className="subheading">{copy}</p></div><span>{items.length} records</span></div>{error && <p className="admin-resource-error" role="alert">{error}</p>}{loading ? <p className="loading-state">Loading {title.toLowerCase()}...</p> : items.length ? <div className="admin-resource-list">{items.map((item, index) => <div className="admin-resource-row" key={item._id || item.id || index}><div><strong>{item.name || item.email || item.category || item.type || `${title} record ${index + 1}`}</strong><small>{item.email || item.status || item.verificationStatus || item.phone || item.description || 'RideX platform record'}</small></div><b>{item.role || item.status || item.verificationStatus || 'View'}</b></div>)}</div> : <div className="admin-tool-panel"><h2>No {title.toLowerCase()} yet</h2><p>New records will appear here as the platform grows.</p></div>}</div>
}
