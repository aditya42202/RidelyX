import { useEffect, useRef, useState } from 'react'
import { Bike, CarFront, MapPin, Navigation, Plus } from 'lucide-react'
import { CITY_POINTS } from '../data/cityData'

export default function GoogleRideMap({ city, pickup, destination, driverLocation, selectedRouteIndex = 0, onRouteReady, onRouteOptions, onRouteSelect, onPickupChange, onDestinationChange, onCurrentLocation }) {
  const mapElement = useRef(null)
  const mapInstance = useRef(null)
  const [googleReady, setGoogleReady] = useState(Boolean(window.google?.maps))
  const [fallbackZoom, setFallbackZoom] = useState(1)
  const [selectionMode, setSelectionMode] = useState('destination')
  const point = CITY_POINTS[city]
  const configuredApiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY
  const apiKey = configuredApiKey && !configuredApiKey.startsWith('your-') ? configuredApiKey : ''

  useEffect(() => {
    if (googleReady || !apiKey) return undefined
    const existing = document.querySelector('script[data-ridex-google-maps]')
    const script = existing || document.createElement('script')
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`
    script.async = true
    script.defer = true
    script.dataset.ridexGoogleMaps = 'true'
    script.addEventListener('load', () => setGoogleReady(true))
    if (!existing) document.head.appendChild(script)
    return () => script.removeEventListener('load', () => setGoogleReady(true))
  }, [apiKey, googleReady])

  useEffect(() => {
    if (!googleReady || !mapElement.current || !point) return
    const maps = window.google.maps
    const map = new maps.Map(mapElement.current, { center: point.center, zoom: 12, disableDefaultUI: true, zoomControl: true, styles: [{ featureType: 'poi', stylers: [{ visibility: 'simplified' }] }, { featureType: 'transit', stylers: [{ visibility: 'off' }] }] })
    mapInstance.current = map
    const geocoder = new maps.Geocoder()
    const pickupPosition = pickup?.location || point.center
    const pickupMarker = new maps.Marker({ position: pickupPosition, map, title: pickup?.address || point.pickup, label: { text: 'P', color: '#ffffff', fontWeight: '700' }, icon: { path: maps.SymbolPath.CIRCLE, scale: 11, fillColor: '#55b3a3', fillOpacity: 1, strokeColor: '#ffffff', strokeWeight: 3 } })
    const clickListener = map.addListener('click', ({ latLng }) => geocoder.geocode({ location: latLng }, (results, status) => { if (status !== 'OK' || !results[0]) return; const address = results[0].formatted_address; const location = { lat: latLng.lat(), lng: latLng.lng() }; if (selectionMode === 'pickup') onPickupChange?.({ address, location }); else onDestinationChange?.({ address, location }) }))
    let dropoff
    const driverMarker = driverLocation ? new maps.Marker({ position: driverLocation, map, title: 'RideX driver', icon: { path: maps.SymbolPath.CIRCLE, scale: 8, fillColor: '#1d252b', fillOpacity: 1, strokeColor: '#ffffff', strokeWeight: 3 } }) : null
    if (destination) {
      const directionsService = new maps.DirectionsService()
      const directionsRenderer = new maps.DirectionsRenderer({ map, suppressMarkers: true, polylineOptions: { strokeColor: '#43afa2', strokeWeight: 5 } })
      directionsService.route({ origin: pickup?.address || point.pickup, destination, travelMode: maps.TravelMode.DRIVING, provideRouteAlternatives: true }, (result, status) => {
        if (status === 'OK') {
          const routes = result.routes.map((item, index) => ({ index, summary: item.summary || `Recommended route ${index + 1}`, distance: item.legs[0].distance?.text, duration: item.legs[0].duration?.text, polyline: item.overview_polyline }));
          onRouteOptions?.(routes)
          const selected = result.routes[selectedRouteIndex] || result.routes[0]
          directionsRenderer.setDirections({ ...result, routes: [selected] })
          const leg = selected.legs[0]
          dropoff = new maps.Marker({ position: leg.end_location, map, title: destination, label: { text: 'D', color: '#ffffff', fontWeight: '700' }, icon: { path: maps.SymbolPath.CIRCLE, scale: 11, fillColor: '#f69d79', fillOpacity: 1, strokeColor: '#ffffff', strokeWeight: 3 } })
          onRouteReady?.(leg, routes[selectedRouteIndex] || routes[0])
        }
      })
    }
    return () => { pickupMarker.setMap(null); dropoff?.setMap(null); driverMarker?.setMap(null); clickListener.remove(); mapInstance.current = null }
  }, [city, destination, driverLocation, googleReady, onRouteReady, onRouteOptions, onPickupChange, onDestinationChange, onRouteSelect, pickup, point, selectionMode, selectedRouteIndex])

  if (googleReady && apiKey) return <div className="map-card google-map-card"><div className="map-toolbar"><span><span className="map-live"></span> India map · {selectionMode === 'pickup' ? 'Select pickup' : 'Select destination'}</span><div className="map-actions"><button className={selectionMode === 'pickup' ? 'map-mode selected' : 'map-mode'} onClick={() => setSelectionMode('pickup')}>Pickup</button><button className={selectionMode === 'destination' ? 'map-mode selected' : 'map-mode'} onClick={() => setSelectionMode('destination')}>Destination</button><button aria-label="Use current location for pickup" onClick={onCurrentLocation}><Navigation size={15} /></button><button aria-label="Zoom map" onClick={() => mapInstance.current?.setZoom((mapInstance.current.getZoom() || 12) + 1)}><Plus size={16} /></button></div></div><div ref={mapElement} className="google-map-canvas" /><div className="map-bottom"><MapPin size={14} /> <span>{pickup?.address || 'Choose pickup'} → {destination || 'Choose destination'}</span></div></div>

  return <div className="map-card fallback-map"><div className="map-toolbar"><span><span className="map-live"></span> Route map · Uttar Pradesh</span><button aria-label="Zoom map" onClick={() => setFallbackZoom((value) => Math.min(value + 0.1, 1.5))}><Plus size={16} /></button></div><div style={{ transform: `scale(${fallbackZoom})`, transformOrigin: "center" }}><div className="map-road road-one"></div><div className="map-road road-two"></div><div className="map-road road-three"></div><div className="map-label label-one">{pickup?.address || "Pickup from"}</div><div className="map-label label-two">{destination || "Where to?"}</div><div className="route-path"></div><div className="map-pin start"><span></span></div><div className="map-pin end"><span></span></div><div className="ride-dot dot-one"><Bike size={13} /></div><div className="ride-dot dot-two"><CarFront size={13} /></div></div><div className="map-bottom"><MapPin size={14} /> <span>{pickup?.address || "Pickup from"} → {destination || "Where to?"}</span></div></div>
}
