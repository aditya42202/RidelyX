import { useEffect, useState } from "react";
import {
  ArrowUpRight,
  Bell,
  Bike,
  CalendarDays,
  CarFront,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Clock3,
  DollarSign,
  FileBarChart,
  Gift,
  Headphones,
  Heart,
  Home,
  Filter,
  MapPin,
  Menu,
  Navigation,
  Package,
  Play,
  Search,
  ShieldCheck,
  Settings,
  Sparkles,
  Star,
  Users,
  WalletCards,
  X,
} from "lucide-react";
import { api } from "./services/api";
import GoogleRideMap from "./components/GoogleRideMap";
import AuthPanel from "./components/AuthPanel";
import PartnerDashboard from "./components/PartnerDashboard";
import DriverKycPanel from "./components/DriverKycPanel";
import AdminDashboard from "./components/AdminDashboard";
import LiveBookingFlow from "./components/BookingFlow";
import SafetyCenter from "./components/SafetyCenter";
import RideChat from "./components/RideChat";
import { joinRide, onRideEvent } from "./services/socket";
import { CITY_POINTS as cityPoints } from "./data/cityData";
import "./App.css";
import "./ui.css";

const routeToView = {
  "/dashboard": "overview",
  "/rides": "rides",
  "/wallet": "wallet",
  "/saved": "saved",
  "/pass": "pass",
  "/rental": "rental",
  "/shared": "shared",
  "/safety": "safety",
  "/support": "support",
};
const viewToRoute = Object.fromEntries(Object.entries(routeToView).map(([path, view]) => [view, path]));
const viewFromLocation = () => routeToView[window.location.pathname] || "overview";
const addressSuggestions = {
  Delhi: ["Connaught Place, Delhi", "India Gate, Delhi", "Indira Gandhi Airport, Delhi", "Hauz Khas, Delhi", "Saket, Delhi"],
  Lucknow: ["Hazratganj, Lucknow", "Gomti Nagar, Lucknow", "Lucknow Airport, Lucknow", "Charbagh, Lucknow", "Aliganj, Lucknow"],
  Bengaluru: ["MG Road, Bengaluru", "Koramangala, Bengaluru", "Kempegowda Airport, Bengaluru", "Indiranagar, Bengaluru", "Whitefield, Bengaluru"],
};
const upDistrictSuggestions = ["Agra, Uttar Pradesh", "Aligarh, Uttar Pradesh", "Ayodhya, Uttar Pradesh", "Azamgarh, Uttar Pradesh", "Bahraich, Uttar Pradesh", "Bareilly, Uttar Pradesh", "Basti, Uttar Pradesh", "Bhadohi, Uttar Pradesh", "Bijnor, Uttar Pradesh", "Bulandshahr, Uttar Pradesh", "Chitrakoot, Uttar Pradesh", "Deoria, Uttar Pradesh", "Etah, Uttar Pradesh", "Etawah, Uttar Pradesh", "Farrukhabad, Uttar Pradesh", "Fatehpur, Uttar Pradesh", "Firozabad, Uttar Pradesh", "Ghaziabad, Uttar Pradesh", "Ghazipur, Uttar Pradesh", "Gonda, Uttar Pradesh", "Gorakhpur, Uttar Pradesh", "Hamirpur, Uttar Pradesh", "Hapur, Uttar Pradesh", "Hardoi, Uttar Pradesh", "Hathras, Uttar Pradesh", "Jhansi, Uttar Pradesh", "Kannauj, Uttar Pradesh", "Kanpur, Uttar Pradesh", "Kasganj, Uttar Pradesh", "Kaushambi, Uttar Pradesh", "Kushinagar, Uttar Pradesh", "Lakhimpur Kheri, Uttar Pradesh", "Lalitpur, Uttar Pradesh", "Lucknow, Uttar Pradesh", "Maharajganj, Uttar Pradesh", "Mahoba, Uttar Pradesh", "Mainpuri, Uttar Pradesh", "Mathura, Uttar Pradesh", "Mau, Uttar Pradesh", "Meerut, Uttar Pradesh", "Mirzapur, Uttar Pradesh", "Moradabad, Uttar Pradesh", "Muzaffarnagar, Uttar Pradesh", "Pilibhit, Uttar Pradesh", "Prayagraj, Uttar Pradesh", "Raebareli, Uttar Pradesh", "Rampur, Uttar Pradesh", "Saharanpur, Uttar Pradesh", "Sambhal, Uttar Pradesh", "Shahjahanpur, Uttar Pradesh", "Shamli, Uttar Pradesh", "Shravasti, Uttar Pradesh", "Siddharthnagar, Uttar Pradesh", "Sitapur, Uttar Pradesh", "Sonbhadra, Uttar Pradesh", "Sultanpur, Uttar Pradesh", "Unnao, Uttar Pradesh", "Varanasi, Uttar Pradesh"];

function App() {
  const [user, setUser] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [authError, setAuthError] = useState("");
  const [role, setRole] = useState("Customer");
  const [destination, setDestination] = useState("");
    const [addressField, setAddressField] = useState(null);
  const [pickup, setPickup] = useState({ address: cityPoints.Lucknow.pickup, location: cityPoints.Lucknow.center });
  const [destinationLocation, setDestinationLocation] = useState(null);
  const [selectedRide, setSelectedRide] = useState("Bike");
  const [bookingStage, setBookingStage] = useState("idle");
  const [menuOpen, setMenuOpen] = useState(false);
  const city = "Lucknow";
  const [weather, setWeather] = useState(null);
  const [quotes, setQuotes] = useState([]);
  const [route, setRoute] = useState(null);
  const [routeOptions, setRouteOptions] = useState([]);
  const [selectedRouteIndex, setSelectedRouteIndex] = useState(0);
  const [selectedRoute, setSelectedRoute] = useState(null);
  const [currentRide, setCurrentRide] = useState(null);
  const [driverLocation, setDriverLocation] = useState(null);
  const [activeNav, setActiveNav] = useState(() => {
    return viewFromLocation();
  });
  const [profileOpen, setProfileOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [adminSection, setAdminSection] = useState(() => {
    try { return sessionStorage.getItem("ridex-admin-section") || "dashboard"; } catch { return "dashboard"; }
  });

  useEffect(() => {
    const handlePopState = () => setActiveNav(viewFromLocation());
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  useEffect(() => {
    const center = cityPoints[city]?.center;
    if (!center) return undefined;
    let cancelled = false;
    fetch(`https://api.open-meteo.com/v1/forecast?latitude=${center.lat}&longitude=${center.lng}&current=temperature_2m,weather_code&timezone=auto`)
      .then((response) => response.ok ? response.json() : Promise.reject(new Error("Weather unavailable")))
      .then((data) => { if (!cancelled) setWeather({ temperature: Math.round(data.current.temperature_2m), code: data.current.weather_code }); })
      .catch(() => { if (!cancelled) setWeather(null); });
    return () => { cancelled = true; };
  }, [city]);

  useEffect(() => {
    let cancelled = false;
    const restoreSession = async () => {
      try {
        const { user: currentUser } = await api.me();
        if (cancelled) return;

        setUser(currentUser);
        setRole(currentUser.role === "partner" ? "Partner" : currentUser.role === "admin" ? "Admin" : "Customer");

        try {
          const rides = await api.rides();
          const activeRide = rides.find((ride) => ["searching", "driver_assigned", "driver_arriving", "driver_arrived", "started"].includes(ride.status));
          if (activeRide) {
            setCurrentRide(activeRide);
            setBookingStage(activeRide.status === "searching" ? "matching" : "tracking");
          }
        } catch (error) {
          void error;
        }
      } catch {
        if (!cancelled) {
          setUser(null);
          setRole("Customer");
        }
      } finally {
        if (!cancelled) setAuthChecked(true);
      }
    };

    restoreSession();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleAuthenticated = (authenticatedUser) => {
    setUser(authenticatedUser);
    setAuthOpen(false);
    setRole(
      authenticatedUser.role === "partner"
        ? "Partner"
        : authenticatedUser.role === "admin"
          ? "Admin"
          : "Customer",
    );
  };

  useEffect(() => {
    if (!currentRide?._id) return undefined;
    joinRide(currentRide._id);
    const stageByEvent = {
      "ride:driver-assigned": "tracking",
      "ride:confirmed": "tracking",
      "ride:driver-arriving": "tracking",
      "ride:driver-arrived": "tracking",
      "ride:started": "tracking",
      "ride:completed": "done",
      "ride:cancelled": "idle",
    };
    const cleanups = Object.entries(stageByEvent).map(([eventName, stage]) =>
      onRideEvent(eventName, () => setBookingStage(stage)),
    );
    cleanups.push(onRideEvent("ride:location", setDriverLocation));
    return () => cleanups.forEach((cleanup) => cleanup());
  }, [currentRide]);

  const loadQuotes = async () => {
    try {
      if (!pickup.address.trim() || !destination.trim()) throw new Error("Please enter pickup and destination addresses first.");
      const result = await api.quote(
        city,
        destination || cityPoints[city].destination,
        route?.distance?.value ? route.distance.value / 1000 : undefined,
        route?.duration?.value ? Math.ceil(route.duration.value / 60) : undefined,
      );
      if (route)
        result.quote = result.quote.map((quote) => ({
          ...quote,
          distance: route.distance?.value
            ? route.distance.value / 1000
            : quote.distance,
          duration: route.duration?.value
            ? Math.ceil(route.duration.value / 60)
            : quote.duration,
        }));
      setQuotes(result.quote);
      setSelectedRide(result.quote[0]?.category || "Bike");
      document
        .getElementById("ride-options")
        ?.scrollIntoView({ behavior: "smooth" });
    } catch (error) {
      setAuthError(error.message);
    }
  };

  const startBooking = async () => {
    try {
      if (!destination.trim())
        throw new Error("Please enter a destination before booking.");
      const quote = quotes.find((item) => item.category === selectedRide);
      if (!quote) return loadQuotes();
      const result = await api.bookRide({
        city,
        pickup: pickup.address,
        pickupLocation: pickup.location,
        destination: destination || cityPoints[city].destination,
        destinationLocation,
        routeIndex: selectedRouteIndex,
        routeSummary: selectedRoute?.summary,
        routePolyline: selectedRoute?.polyline?.points || selectedRoute?.polyline,
        distance: quote.distance,
        duration: quote.duration,
      });
      setCurrentRide(result);
      setBookingStage("matching");
    } catch (error) {
      setAuthError(error.message);
    }
  };

  const suggestionsFor = (value) => [...new Set([...addressSuggestions[city], ...upDistrictSuggestions])].filter((address) => !value.trim() || address.toLowerCase().includes(value.toLowerCase())).slice(0, 5);
  const chooseAddress = (field, address, location) => {
    if (field === "pickup") {
      setPickup({ address, location });
      setRoute(null);
      setRouteOptions([]);
      setSelectedRoute(null);
      setSelectedRouteIndex(0);
    } else {
      setDestination(address);
      setDestinationLocation(location);
    }
    setAddressField(null);
  };
  const setCurrentLocation = () => {
    if (!navigator.geolocation) return setAuthError("Location is not available in this browser.");
    navigator.geolocation.getCurrentPosition(({ coords }) => setPickup({ address: `Current location (${coords.latitude.toFixed(4)}, ${coords.longitude.toFixed(4)})`, location: { lat: coords.latitude, lng: coords.longitude } }), () => setAuthError("Location permission is required to set your pickup."));
  };

  const rideIcons = {
    Bike,
    Auto: Navigation,
    Cab: CarFront,
    Premium: CarFront,
    Shared: Users,
    XL: CarFront,
  };
  const rides = quotes.map((quote) => ({
    ...quote,
    name: quote.category,
    icon: rideIcons[quote.category] || CarFront,
    price: `₹${quote.fare}`,
    eta: `${quote.eta} min`,
    trip: `${quote.duration} min`,
    detail: `${quote.duration} min estimated trip`,
    tone:
      quote.category === "Bike"
        ? "mint"
        : quote.category === "Auto"
          ? "yellow"
          : "blue",
  }));

  if (!authChecked)
    return (
      <div className="app-shell">
        <main className="main-content">
          <div className="loading-state">Checking your RideX session...</div>
        </main>
      </div>
    );
  if (!user && !authOpen)
    return <GuestHome onOpenAuth={() => setAuthOpen(true)} />;
  if (!user)
    return (
      <div className="auth-entry">
        <button className="auth-back-button" onClick={() => setAuthOpen(false)}>← Back to home</button>
        <AuthPanel onAuthenticated={handleAuthenticated} error={authError} setError={setAuthError} />
      </div>
    );

  const isCustomer = role === "Customer";
  const isPartner = role === "Partner";
  const openNav = (view) => {
    setActiveNav(view);
    const path = viewToRoute[view] || "/dashboard";
    if (window.location.pathname !== path) window.history.pushState({}, "", path);
    try { sessionStorage.setItem("ridex-active-nav", view); } catch { setActiveNav(view); }
    setAuthError("");
    setMenuOpen(false);
    setMoreOpen(false);
    setNotificationsOpen(false);
  };
  const openAdminSection = (section) => {
    setAdminSection(section);
    setActiveNav("admin");
    sessionStorage.setItem("ridex-admin-section", section);
    sessionStorage.setItem("ridex-active-nav", "admin");
    setAuthError("");
    setMenuOpen(false);
  };
  const openNotifications = async () => {
    setNotificationsOpen(true);
    try {
      setNotifications(await api.notifications());
    } catch (error) {
      setAuthError(error.message);
    }
  };
  const markNotificationRead = async (notification) => {
    if (notification.readAt) return;
    try {
      const result = await api.markNotificationRead(notification._id);
      setNotifications((items) =>
        items.map((item) =>
          item._id === notification._id ? result.notification : item,
        ),
      );
    } catch (error) {
      setAuthError(error.message);
    }
  };
  const markAllNotificationsRead = async () => {
    try {
      const unread = notifications.filter((notification) => !notification.readAt);
      const updated = await Promise.all(unread.map((notification) => api.markNotificationRead(notification._id)));
      const changes = new Map(updated.map((result) => [result.notification._id, result.notification]));
      setNotifications((items) => items.map((item) => changes.get(item._id) || item));
    } catch (error) { setAuthError(error.message); }
  };
  const logout = async () => {
    await api.logout().catch(() => {});
    setUser(null);
    setProfileOpen(false);
    setNotifications([]);
    setCurrentRide(null);
    setBookingStage("idle");
  };

  return (
    <div className="app-shell">
      <aside className={menuOpen ? "sidebar open" : "sidebar"}>
        <div className="brand">
          <span className="brand-mark">
            R<span>X</span>
          </span>
          <span>ridex</span>
        </div>
        <button
          className="close-menu"
          onClick={() => setMenuOpen(false)}
          aria-label="Close menu"
        >
          <X size={20} />
        </button>
        <div className="workspace-label">{isPartner ? "DRIVER WORKSPACE" : role === "Admin" ? "ADMIN WORKSPACE" : "WORKSPACE"}</div>
        <nav aria-label={`${role} workspace navigation`}>
          {(isCustomer || isPartner || role === "Admin") && <button
            className={`nav-item ${activeNav === "overview" ? "active" : ""}`}
            onClick={() => role === "Admin" ? openAdminSection("dashboard") : openNav("overview")}
          >
            <Home size={18} /> {isCustomer ? "Overview" : "Dashboard"}
          </button>}
          {role === "Admin" && <><button className={`nav-item ${adminSection === "users" ? "active" : ""}`} onClick={() => openAdminSection("users")}><Users size={18} /> Users</button><button className={`nav-item ${adminSection === "drivers" ? "active" : ""}`} onClick={() => openAdminSection("drivers")}><CarFront size={18} /> Drivers</button><button className={`nav-item ${adminSection === "rides" ? "active" : ""}`} onClick={() => openAdminSection("rides")}><Bike size={18} /> Rides</button><button className={`nav-item ${adminSection === "payments" ? "active" : ""}`} onClick={() => openAdminSection("payments")}><WalletCards size={18} /> Payments</button><button className={`nav-item ${adminSection === "reports" ? "active" : ""}`} onClick={() => openAdminSection("reports")}><FileBarChart size={18} /> Reports</button></>}
          {!isPartner && role !== "Admin" && <button
            className={`nav-item ${activeNav === "rides" ? "active" : ""}`}
            onClick={() => openNav("rides")}
          >
            <Clock3 size={18} /> My rides <span className="nav-count">3</span>
          </button>}
          {!isPartner && role !== "Admin" && <button
            className={`nav-item ${activeNav === "saved" ? "active" : ""}`}
            onClick={() => openNav("saved")}
          >
            <Heart size={18} /> Saved places
          </button>}
          {!isPartner && role !== "Admin" && <button
            className={`nav-item ${activeNav === "wallet" ? "active" : ""}`}
            onClick={() => openNav("wallet")}
          >
            <WalletCards size={18} /> Wallet
          </button>}
          {!isPartner && role !== "Admin" && <button
            className={`nav-item ${activeNav === "pass" ? "active" : ""}`}
            onClick={() => openNav("pass")}
          >
            <Package size={18} /> RidePass <span className="new-tag">NEW</span>
          </button>}
        </nav>
        <div className="workspace-label space-top">{isPartner ? "DRIVER TOOLS" : role === "Admin" ? "ADMIN TOOLS" : "SERVICES"}</div>
        <nav aria-label={`${role} services navigation`}>
          {!isPartner && role !== "Admin" && <button
            className={`nav-item ${activeNav === "rental" ? "active" : ""}`}
            onClick={() => openNav("rental")}
          >
            <CarFront size={18} /> Rent a vehicle
          </button>}
          {!isPartner && role !== "Admin" && <button
            className={`nav-item ${activeNav === "shared" ? "active" : ""}`}
            onClick={() => openNav("shared")}
          >
            <Users size={18} /> Share a ride
          </button>}
          <button
            className={`nav-item ${activeNav === "safety" ? "active" : ""}`}
            onClick={() => openNav("safety")}
          >
            <ShieldCheck size={18} /> Safety center
          </button>
          {isPartner && <button className="nav-item" onClick={() => setProfileOpen(true)}><CarFront size={18} /> Driver profile</button>}
          {role === "Admin" && <button className={`nav-item ${adminSection === "dashboard" ? "active" : ""}`} onClick={() => openAdminSection("dashboard")}><ShieldCheck size={18} /> Manage platform</button>}
          {role === "Admin" && <><button className={`nav-item ${adminSection === "support" ? "active" : ""}`} onClick={() => openAdminSection("support")}><Headphones size={18} /> Support</button><button className={`nav-item ${adminSection === "settings" ? "active" : ""}`} onClick={() => openAdminSection("settings")}><Settings size={18} /> Settings</button></>}
        </nav>
        <button
          className="side-bottom"
          onClick={() => openNav("support")}
          aria-label="Open Help and Support"
        >
          <div className="support-icon">
            <Headphones size={18} />
          </div>
          <div>
            <strong>Need a hand?</strong>
            <small>We're here 24/7</small>
          </div>
          <ArrowUpRight size={16} />
        </button>
        <button
          className="profile"
          onClick={() => setProfileOpen(true)}
          aria-label={`Open profile details for ${user.name}`}
        >
          <div className="avatar">{user.name?.slice(0, 2).toUpperCase()}</div>
          <div>
            <strong>{user.name}</strong>
            <small>{user.email}</small>
          </div>
          <ChevronDown size={16} />
        </button>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <button
            className="menu-toggle"
            onClick={() => setMenuOpen(true)}
            aria-label="Open menu"
          >
            <Menu />
          </button>
          <div className="mobile-brand">ridex</div>
          <div className="current-role" aria-label={`Logged in as ${role}`}>
            {role}
          </div>
          {role === "Admin" && <div className="admin-date"><CalendarDays size={15} /> 22 Aug 2026 <span>·</span> 12:02 PM</div>}
          <div className="top-actions">
            <button
              className="icon-button"
              onClick={openNotifications}
              aria-label="Notifications"
            >
              <Bell size={19} />
              <i></i>
            </button>
            <button
              className="top-avatar"
              onClick={() => setProfileOpen(true)}
              aria-label="Open profile"
            >
              {user.name?.slice(0, 2).toUpperCase()}
            </button>
          </div>
        </header>

        {isCustomer && activeNav === "overview" ? (
          <>
            <section className="welcome-row">
              <div>
                <div className="eyebrow">
                  RIDE X <span className="live-dot"></span> LIVE
                </div>
                <h1>Where to, {user.name}?</h1>
                <p className="subheading">
                  Your day is yours. We'll get you there.
                </p>
              </div>
              <div className="weather">
                <span>{weather?.code === 0 ? "☀" : weather?.code < 4 ? "⛅" : "☁"}</span>
                <div>
                  <strong>{weather ? `${weather.temperature}°` : "--°"}</strong>
                  <small>{weather ? "Current weather" : "Weather loading"}</small>
                </div>
              </div>
            </section>
            <section className="booking-grid">
              <div className="booking-panel">
                <div className="panel-top">
                  <div>
                    <p className="section-kicker">PLAN YOUR JOURNEY</p>
                    <h2>Find your best ride</h2>
                  </div>
                  <button className="more-button" onClick={() => setMoreOpen(true)}>
                    More options <ChevronDown size={15} />
                  </button>
                </div>
                <div className="location-stack">
                  <div className="location-line">
                    <span className="location-dot pickup"></span>
                    <div>
                      <label>Pickup from</label>
                      <input
                        value={pickup.address}
                        onChange={(event) => { setPickup({ address: event.target.value, location: null }); setRoute(null); setRouteOptions([]); setSelectedRoute(null); setSelectedRouteIndex(0); }}
                        onFocus={() => setAddressField("pickup")}
                        placeholder="Search any UP city, town or kasba"
                        aria-label="Pickup address"
                      />
                      {addressField === "pickup" && <AddressSuggestions items={suggestionsFor(pickup.address)} value={pickup.address} onSelect={(address, location) => chooseAddress("pickup", address, location)} />}
                    </div>
                    <button onClick={() => setCurrentLocation()} aria-label="Use current location for pickup">
                      <Navigation size={16} />
                    </button>
                  </div>
                  <div className="route-line"></div>
                  <div className="location-line">
                    <span className="location-dot destination"></span>
                    <div>
                      <label>Where to?</label>
                      <input
                        value={destination}
                        onChange={(event) => { setDestination(event.target.value); setDestinationLocation(null); }}
                        onFocus={() => setAddressField("destination")}
                        placeholder="Search destination in Uttar Pradesh"
                      />
                      {addressField === "destination" && <AddressSuggestions items={suggestionsFor(destination)} value={destination} onSelect={(address, location) => chooseAddress("destination", address, location)} />}
                    </div>
                    <Search size={17} />
                  </div>
                </div>
                <div className="booking-footer">
                  <div>
                    <ShieldCheck size={16} />
                    <span>Verified partners · Live pricing</span>
                  </div>
                  <button className="primary-button" onClick={loadQuotes}>
                    Compare rides <ArrowUpRight size={17} />
                  </button>
                </div>
              </div>
              <GoogleRideMap
                city={city}
                pickup={pickup}
                destination={destination}
                driverLocation={driverLocation}
                selectedRouteIndex={selectedRouteIndex}
                onRouteReady={(leg, selected) => { setRoute(leg); setSelectedRoute(selected); }}
                onRouteOptions={(options) => { setRouteOptions(options); if (!options[selectedRouteIndex]) setSelectedRouteIndex(0); }}
                onRouteSelect={setSelectedRouteIndex}
                onPickupChange={setPickup}
                onDestinationChange={({ address, location }) => { setDestination(address); setDestinationLocation(location); setRoute(null); setRouteOptions([]); setSelectedRoute(null); setSelectedRouteIndex(0); }}
                onCurrentLocation={setCurrentLocation}
              />
              {routeOptions.length > 1 && <div className="route-options"><div><p className="section-kicker">ROUTE RECOMMENDATIONS</p><strong>Choose your preferred route</strong></div><div className="route-option-list">{routeOptions.map((option) => <button type="button" key={option.index} className={option.index === selectedRouteIndex ? "selected" : ""} onClick={() => setSelectedRouteIndex(option.index)}><span>{option.summary}</span><small>{option.duration} · {option.distance}</small></button>)}</div></div>}
            </section>

            <section className="section-block" id="ride-options">
              <div className="section-heading">
                <div>
                  <p className="section-kicker">SMART COMPARISON</p>
                  <h2>Choose what works for you</h2>
                </div>
                <button className="text-button" onClick={() => openNav("rides")}>
                  View all rides <ArrowUpRight size={16} />
                </button>
              </div>
              <div className="ride-grid">
                {rides.map((ride) => {
                  const Icon = ride.icon;
                  return (
                    <button
                      key={ride.name}
                      className={`ride-card ${selectedRide === ride.name ? "chosen" : ""}`}
                      onClick={() => setSelectedRide(ride.name)}
                    >
                      <div className={`ride-icon ${ride.tone}`}>
                        <Icon size={21} />
                      </div>
                      <div className="ride-card-info">
                        <strong>{ride.name}</strong>
                        <small>{ride.detail}</small>
                        <div className="ride-meta">
                          <span>{ride.eta} away</span>
                          <span>{ride.trip} trip</span>
                        </div>
                      </div>
                      <div className="ride-price">
                        <strong>{ride.price}</strong>
                        <small>from</small>
                      </div>
                      {selectedRide === ride.name && (
                        <span className="check-mark">✓</span>
                      )}
                    </button>
                  );
                })}
              </div>
              <div className="recommendation">
                <div className="sparkle">
                  <Sparkles size={19} />
                </div>
                <div>
                  <strong>Smart recommendation</strong>
                  <p>
                    {selectedRide} is recommended — fastest and most economical
                    for this route.
                  </p>
                </div>
                <span className="rec-reason">86% match</span>
                <button
                  className="recommend-button"
                  onClick={() => setBookingStage("confirm")}
                >
                  Book {selectedRide} <ArrowUpRight size={15} />
                </button>
              </div>
            </section>
          </>
        ) : activeNav === "safety" ? (
          <SafetyCenter onBack={() => openNav("overview")} onBook={() => openNav("overview")} onRides={() => openNav("rides")} />
        ) : activeNav === "support" ? (
          <WorkspaceView view="support" onBack={() => openNav("overview")} onSelectDestination={(place) => { setDestination(place); openNav("overview"); }} onNavigate={openNav} />
        ) : isCustomer ? (
          <WorkspaceView view={activeNav} onBack={() => openNav("overview")} onSelectDestination={(place) => { setDestination(place); openNav("overview"); }} onNavigate={openNav} />
        ) : role === "Partner" ? (
          <><PartnerDashboard /><DriverKycPanel /></>
        ) : (
          <AdminDashboard section={adminSection} />
        )}
        {bookingStage !== "idle" && (
          <LiveBookingFlow
            stage={bookingStage}
            setStage={setBookingStage}
            ride={selectedRide}
            destination={destination || "Connaught Place"}
            currentRide={currentRide}
            onConfirm={startBooking}
          />
        )}
        {bookingStage === "tracking" && currentRide?._id && <RideChat rideId={currentRide._id} />}
        {profileOpen && (
          <ProfileDialog
            user={user}
            onUpdated={setUser}
            onClose={() => setProfileOpen(false)}
            onNavigate={openNav}
            onLogout={logout}
          />
        )}
        {notificationsOpen && <NotificationDialog notifications={notifications} onClose={() => setNotificationsOpen(false)} onRead={markNotificationRead} onMarkAll={markAllNotificationsRead} />}
        {moreOpen && <ActionDialog title="More options" items={[["Safety center", "safety"], ["Help center", "support"], ["Saved places", "saved"], ["RidePass", "pass"], ["Settings", "profile"]]} onClose={() => setMoreOpen(false)} onSelect={(view) => view === "profile" ? setProfileOpen(true) : openNav(view)} />}
        {authError && <button className="error-toast" onClick={() => setAuthError("")} role="alert">{authError} ×</button>}
        <footer className="site-footer">
          <div className="footer-brand">
            <span className="brand-mark">
              R<span>X</span>
            </span>
            <strong>ridex</strong>
            <small>Smart mobility, thoughtfully moving.</small>
          </div>
          <div className="footer-links">
            <button onClick={() => openNav("support")}>Help center</button>
            <button onClick={() => openNav("safety")}>Safety</button>
            <button onClick={() => setAuthError("Terms and Conditions are available through RideX support.")}>Terms</button>
            <button onClick={() => setAuthError("Privacy requests can be handled by RideX support.")}>Privacy</button>
          </div>
          <span className="footer-status">
            <i></i> All systems operational
          </span>
        </footer>
      </main>
    </div>
  );
}

function GuestHome({ onOpenAuth }) {
  const [panel, setPanel] = useState(null)
  const openPanel = (name) => setPanel(name)
  return <main className="guest-home">
    <nav className="guest-nav">
      <button className="guest-logo" onClick={() => openPanel(null)} aria-label="RideX home"><span className="brand-mark" aria-hidden="true">R<span>X</span></span><strong>RideX</strong></button>
      <div className="guest-nav-actions"><button className="guest-link" onClick={onOpenAuth}>Sign in</button><button className="guest-nav-cta" onClick={onOpenAuth}>Get started <ArrowUpRight size={15} /></button></div>
    </nav>
    <div className="guest-trust"><div><span><CarFront size={22} /></span><strong>Book<br />Instantly</strong></div><div><span><ShieldCheck size={22} /></span><strong>Safe &amp;<br />Secure</strong></div><div><span><WalletCards size={22} /></span><strong>Digital<br />Payments</strong></div><div><span><Headphones size={22} /></span><strong>24/7<br />Support</strong></div></div>
    <section className="guest-hero">
      <div className="guest-hero-copy"><p className="eyebrow">SAFE · RELIABLE · AFFORDABLE</p><h1>Every Ride,<br />Your Way<br /><em>Anywhere, Anytime.</em></h1><p>Move freely with rides that fit your journey, your budget, and your day.</p><div className="guest-choice"><strong>Your Ride,<br /><em>Your Choice</em></strong><button onClick={onOpenAuth}><Bike size={28} /><small>Moto</small></button><button onClick={onOpenAuth}><CarFront size={28} /><small>Mini</small></button><button onClick={onOpenAuth}><CarFront size={28} /><small>SUV</small></button></div></div>
      <div className="guest-visual" aria-label="RideX ride preview"><div className="guest-cloud cloud-one"></div><div className="guest-cloud cloud-two"></div><div className="guest-cityline"></div><div className="guest-road road-a"></div><div className="guest-road road-b"></div><div className="guest-phone guest-phone-map"><div className="phone-notch"></div><div className="phone-status">9:41 <span>● ●</span></div><div className="phone-map"><i></i><strong>Pickup Location</strong><small>Connaught Place, New Delhi</small><strong>Drop Location</strong><small>India Gate, New Delhi</small><div className="phone-route"></div></div><div className="phone-trip"><b>Choose your ride</b><strong>Mini <em>₹120</em></strong><small>Arrives in 3 min</small></div></div><div className="guest-phone guest-phone-wallet"><div className="phone-notch"></div><div className="phone-status">Ride<span>X</span></div><div className="wallet-balance">Wallet Balance<strong>₹1,250.00</strong><button onClick={onOpenAuth}>+ Add Money</button></div><div className="wallet-box"><b>Refer &amp; Earn</b><small>Earn ₹100 on every successful referral</small></div><div className="wallet-list"><b>Recent Rides</b><span>Connaught Place <em>₹120</em></span><span>India Gate <em>₹210</em></span></div></div><div className="guest-car"><div className="car-window"></div><div className="car-body"></div><span></span><i></i></div></div>
    </section>
    <section className="guest-download"><div className="download-brand"><span className="brand-mark">X</span><div><strong>Ride<span>X</span></strong><small>Let's Ride Together!</small></div></div><div className="download-badges"><button onClick={() => openPanel('help')}><span>▶</span> GET IT ON<strong>Google Play</strong></button><button onClick={() => openPanel('help')}><span>●</span> Download on the<strong>App Store</strong></button></div></section>
    {panel && <GuestInfoDialog panel={panel} onClose={() => setPanel(null)} onOpenAuth={onOpenAuth} />}
  </main>;
}

function GuestInfoDialog({ panel, onClose, onOpenAuth }) {
  const content = {
    services: ['RideX services', 'Choose the ride that fits your day.', 'Book bikes, autos, cabs, rentals, and shared rides from one simple workspace.'],
    pass: ['RideX Pass', 'Make every ride count.', 'Get priority booking, lower platform fees, exclusive offers, and free cancellations.'],
    safety: ['Safety first', 'Move with confidence.', 'Every trip includes verified partners, live trip sharing, and support whenever you need it.'],
    business: ['For business', 'Simpler travel for your team.', 'Manage business rides, keep travel visible, and give your people a dependable way to move.'],
    help: ['RideX help', 'We are here whenever you need us.', 'Find answers, contact support, and get help with bookings, payments, or safety.'],
    video: ['How RideX works', 'A better way to move.', 'Choose a destination, compare live prices, and confirm the ride that works best for you.'],
  }[panel]
  return <div className="guest-dialog-backdrop" role="presentation" onClick={onClose}><section className="guest-dialog" role="dialog" aria-modal="true" aria-labelledby="guest-dialog-title" onClick={(event) => event.stopPropagation()}><button className="guest-dialog-close" onClick={onClose} aria-label="Close">×</button><p className="eyebrow">RIDEX · {content[0].toUpperCase()}</p><h2 id="guest-dialog-title">{content[1]}</h2><p>{content[2]}</p>{panel === 'video' && <div className="video-preview"><Play size={28} fill="currentColor" /> <span>RideX in two minutes</span></div>}<button className="guest-dialog-action" onClick={panel === 'help' ? onClose : onOpenAuth}>Get started <ArrowUpRight size={15} /></button></section></div>
}

function ProfileDialog({ user, onUpdated, onClose, onNavigate, onLogout }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(user.name || "");
  const [phone, setPhone] = useState(user.phone || "");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const accountType = user.role === "partner" ? "Driver / Partner" : user.role === "admin" ? "Administrator" : "Customer";
  const saveProfile = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      const result = await api.updateProfile({ name, phone });
      onUpdated(result.user);
      setEditing(false);
    } catch (requestError) { setError(requestError.message); }
    finally { setSaving(false); }
  };
  return (
    <div
      className="support-dialog-backdrop"
      role="presentation"
      onClick={onClose}
    >
      <section
        className="support-dialog profile-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="profile-dialog-title"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          className="dialog-close"
          aria-label="Close profile details"
          onClick={onClose}
        >
          ×
        </button>
        <div className="profile-dialog-heading">
          <div className="profile-dialog-avatar">
            {user.name?.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <p className="section-kicker">RIDEX ACCOUNT</p>
            <h2 id="profile-dialog-title">{user.name}</h2>
            <span>{accountType} account</span>
          </div>
        </div>
        {editing ? <form className="profile-edit-form" onSubmit={saveProfile}>
          <label>Full name<input required maxLength="80" value={name} onChange={(event) => setName(event.target.value)} /></label>
          <label>Phone number<input maxLength="30" type="tel" value={phone} onChange={(event) => setPhone(event.target.value)} /></label>
          {error && <p className="auth-error" role="alert">{error}</p>}
          <div className="dialog-actions"><button type="submit" disabled={saving}>{saving ? "Saving..." : "Save changes"}</button><button type="button" onClick={() => setEditing(false)}>Cancel</button></div>
        </form> : <div className="profile-details">
          <div>
            <small>Account type</small>
            <strong>{accountType}</strong>
          </div>
          <div>
            <small>Email</small>
            <strong>{user.email}</strong>
          </div>
          <div>
            <small>Phone</small>
            <strong>{user.phone || "Not added yet"}</strong>
          </div>
          {user.role === "customer" && <div>
            <small>Wallet balance</small>
            <strong>₹{user.walletBalance ?? 0}</strong>
          </div>}
          <div>
            <small>Account status</small>
            <strong className="verified-label">Verified account</strong>
          </div>
        </div>}
        {!editing && <button className="edit-profile-button" onClick={() => setEditing(true)}>Edit profile</button>}
        <div className="dialog-actions">
          <button onClick={() => { onClose(); onNavigate("rides"); }}>My rides</button>
          <button onClick={() => { onClose(); onNavigate("wallet"); }}>Wallet</button>
          <button onClick={() => { onClose(); onNavigate("support"); }}>Help &amp; support</button>
        </div>
        <button className="logout-button" onClick={onLogout}>
          Sign out
        </button>
      </section>
    </div>
  );
}

function NotificationDialog({ notifications, onClose, onRead, onMarkAll }) {
  return <div className="support-dialog-backdrop" role="presentation" onClick={onClose}><section className="support-dialog" role="dialog" aria-modal="true" aria-labelledby="notification-title" onClick={(event) => event.stopPropagation()}><button className="dialog-close" aria-label="Close notifications" onClick={onClose}>×</button><p className="section-kicker">RIDEX UPDATES</p><h2 id="notification-title">Notifications</h2>{notifications.length ? <><button className="text-button" onClick={onMarkAll}>Mark all as read</button>{notifications.map((notification) => <button className="workspace-row" key={notification._id} onClick={() => onRead(notification)}><div><strong>{notification.title || "RideX update"}</strong><small>{notification.message || notification.body || "You have a new update."}</small></div><small>{notification.readAt ? "Read" : "Mark read"}</small></button>)}</> : <p className="empty-state">No notifications yet.</p>}</section></div>;
}

function ShareDialog({ onClose }) {
  const shareUrl = `${window.location.origin}/?ref=ridex`;
  const message = "Join me on RideX for smarter, safer rides.";
  const options = [
    ["WhatsApp", `https://wa.me/?text=${encodeURIComponent(`${message} ${shareUrl}`)}`],
    ["Facebook", `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`],
    ["Telegram", `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(message)}`],
    ["Twitter", `https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(message)}`],
  ];
  return <div className="support-dialog-backdrop" role="presentation" onClick={onClose}><section className="support-dialog share-dialog" role="dialog" aria-modal="true" aria-labelledby="share-dialog-title" onClick={(event) => event.stopPropagation()}><button className="dialog-close" aria-label="Close sharing options" onClick={onClose}>×</button><p className="section-kicker">RIDEX REFERRAL</p><h2 id="share-dialog-title">Share RideX</h2><p>Invite friends and earn together.</p><div className="share-options">{options.map(([label, url]) => <a key={label} href={url} target="_blank" rel="noreferrer" onClick={onClose}>{label}<ArrowUpRight size={15} /></a>)}</div></section></div>;
}

function ActionDialog({ title, items, onClose, onSelect }) {
  return <div className="support-dialog-backdrop" role="presentation" onClick={onClose}><section className="support-dialog" role="dialog" aria-modal="true" aria-labelledby="action-title" onClick={(event) => event.stopPropagation()}><button className="dialog-close" aria-label="Close options" onClick={onClose}>×</button><p className="section-kicker">RIDEX MENU</p><h2 id="action-title">{title}</h2>{items.map(([label, value]) => <button className="workspace-row" key={value} onClick={() => onSelect(value)}><div><strong>{label}</strong><small>Open {label.toLowerCase()}</small></div><ArrowUpRight size={16} /></button>)}</section></div>;
}
function LegacyBookingFlow({ stage, setStage, ride, destination, onConfirm }) {
  const stages = {
    confirm: {
      label: "CONFIRM YOUR RIDE",
      title: "Ready when you are.",
      copy: `A ${ride.toLowerCase()} ride to ${destination}`,
      action: "Confirm booking",
    },
    matching: {
      label: "SMART MATCH",
      title: "Finding your best match",
      copy: "Scanning 24 nearby RideX partners",
      action: "Continue",
    },
    tracking: {
      label: "DRIVER FOUND",
      title: "Your ride is on the way",
      copy: "Arun is arriving in 5 minutes",
      action: "View payment",
    },
    payment: {
      label: "SECURE PAYMENT",
      title: "Complete your ride",
      copy: "Choose a payment method",
      action: "Pay ₹85",
    },
    done: {
      label: "RIDE COMPLETE",
      title: "How was your ride?",
      copy: "Your feedback helps us move better",
      action: "Done",
    },
  };
  const content = stages[stage];
  const next =
    stage === "confirm"
      ? "matching"
      : stage === "matching"
        ? "tracking"
        : stage === "tracking"
          ? "payment"
          : stage === "payment"
            ? "done"
            : "idle";
  const handleAction = () =>
    stage === "confirm" ? onConfirm() : setStage(next);
  return (
    <div className="flow-backdrop">
      <div className={`flow-modal flow-${stage}`}>
        <button
          className="flow-close"
          onClick={() => setStage("idle")}
          aria-label="Close booking flow"
        >
          <X size={18} />
        </button>
        <div className="flow-kicker">{content.label}</div>
        <div className="flow-icon">
          {stage === "confirm" && <Navigation size={25} />}
          {stage === "matching" && <Sparkles size={25} />}
          {stage === "tracking" && <CarFront size={25} />}
          {stage === "payment" && <WalletCards size={25} />}
          {stage === "done" && <Star size={25} fill="currentColor" />}
        </div>
        <h2>{content.title}</h2>
        <p>{content.copy}</p>
        {stage === "confirm" && (
          <div className="flow-summary">
            <span>{ride}</span>
            <strong>₹85</strong>
            <small>6 min away · 18 min trip</small>
          </div>
        )}
        {stage === "matching" && (
          <div className="matching-orbit">
            <span className="pulse-ring"></span>
            <span className="matching-dot">
              <Bike size={20} />
            </span>
          </div>
        )}
        {stage === "tracking" && (
          <div className="driver-preview">
            <div className="driver-avatar">KP</div>
            <div>
              <strong>
                Kabir Pradhan <span>4.9 ★</span>
              </strong>
              <small>DL 8C AX 2910 · Ather 450X</small>
            </div>
            <button className="call-button">Call</button>
          </div>
        )}
        {stage === "payment" && (
          <div className="payment-options">
            <button className="payment-selected">
              <WalletCards size={17} /> RideX Wallet <span>₹1,240</span>{" "}
              <b>✓</b>
            </button>
            <button>
              <DollarSign size={17} /> UPI <span>•••• 4921</span>
            </button>
          </div>
        )}
        {stage === "done" && (
          <div className="stars">
            {[1, 2, 3, 4, 5].map((star) => (
              <Star key={star} size={25} fill="currentColor" />
            ))}
          </div>
        )}
        <button className="flow-action" onClick={handleAction}>
          {content.action} <ArrowUpRight size={16} />
        </button>
        {stage === "tracking" && (
          <div className="safety-note">
            <ShieldCheck size={14} /> Ride PIN <strong>4286</strong> · Trip is
            protected
          </div>
        )}
      </div>
    </div>
  );
}

function RoleDashboard({ role }) {
  const partner = role === "Partner";
  return (
    <div className="role-dashboard">
      <div className="welcome-row">
        <div>
          <div className="eyebrow">
            RIDEX {partner ? "PARTNER" : "CONTROL"} ROOM{" "}
            <span className="live-dot"></span> LIVE
          </div>
          <h1>{partner ? "Good morning, Kabir." : "Good morning, Admin."}</h1>
          <p className="subheading">
            {partner
              ? "Your city is moving. Here is your pulse."
              : "A clear view of today’s mobility network."}
          </p>
        </div>
        <button className="primary-button">
          {partner ? "Go online" : "Download report"} <ArrowUpRight size={17} />
        </button>
      </div>
      <div className="stats-grid">
        <Stat
          label={partner ? "Today's earnings" : "Total revenue"}
          value={partner ? "₹2,840" : "₹8.42L"}
          delta="↑ 12.8%"
        />
        <Stat
          label={partner ? "Completed rides" : "Today’s rides"}
          value={partner ? "18" : "12,486"}
          delta="↑ 8.4%"
        />
        <Stat
          label={partner ? "Online hours" : "Active drivers"}
          value={partner ? "06:42" : "3,248"}
          delta="↑ 4.2%"
        />
        <Stat
          label={partner ? "Customer rating" : "Avg. ride fare"}
          value={partner ? "4.92" : "₹168"}
          delta="Top 5%"
        />
      </div>
      <div className="dashboard-panels">
        <div className="chart-panel">
          <div className="section-heading">
            <div>
              <p className="section-kicker">
                {partner ? "EARNINGS OVERVIEW" : "NETWORK ANALYTICS"}
              </p>
              <h2>{partner ? "Your week at a glance" : "Ride volume"}</h2>
            </div>
            <button className="filter-button">
              This week <ChevronDown size={15} />
            </button>
          </div>
          <div className="chart">
            <div className="chart-y">
              <span>₹4k</span>
              <span>₹3k</span>
              <span>₹2k</span>
              <span>₹1k</span>
              <span>₹0</span>
            </div>
            <div className="chart-area">
              <div className="chart-fill"></div>
              <div className="chart-line"></div>
              <div className="chart-labels">
                <span>Mon</span>
                <span>Tue</span>
                <span>Wed</span>
                <span>Thu</span>
                <span>Fri</span>
                <span>Sat</span>
                <span>Sun</span>
              </div>
            </div>
          </div>
        </div>
        <div className="request-panel">
          <div className="section-heading">
            <div>
              <p className="section-kicker">
                {partner ? "NEXT REQUEST" : "LIVE ALERTS"}
              </p>
              <h2>{partner ? "New ride request" : "Needs attention"}</h2>
            </div>
            <span className="status-pill">
              {partner ? "01 NEW" : "04 OPEN"}
            </span>
          </div>
          {partner ? (
            <>
              <div className="request-route">
                <div>
                  <span className="route-dot coral-dot"></span>
                  <strong>Vasant Vihar</strong>
                </div>
                <div className="route-connector"></div>
                <div>
                  <span className="route-dot"></span>
                  <strong>Hauz Khas Village</strong>
                </div>
              </div>
              <div className="request-details">
                <span>4.8 ★ customer</span>
                <span>8.4 km</span>
                <span>₹236 est.</span>
              </div>
              <div className="request-actions">
                <button className="decline-button">Decline</button>
                <button className="accept-button">
                  Accept ride <ArrowUpRight size={15} />
                </button>
              </div>
            </>
          ) : (
            <div className="alert-list">
              <div>
                <span className="alert-dot coral-dot"></span>
                <strong>3 KYC verifications</strong>
                <small>Need your review</small>
              </div>
              <div>
                <span className="alert-dot yellow-dot"></span>
                <strong>Safety alert #291</strong>
                <small>Awaiting resolution</small>
              </div>
              <div>
                <span className="alert-dot blue-dot"></span>
                <strong>Peak pricing active</strong>
                <small>South Delhi · 1.2x</small>
              </div>
            </div>
          )}
        </div>
      </div>
      <div className="table-panel">
        <div className="section-heading">
          <div>
            <p className="section-kicker">
              {partner ? "RECENT RIDES" : "TOP ROUTES TODAY"}
            </p>
            <h2>{partner ? "Your ride history" : "Popular corridors"}</h2>
          </div>
          <button className="text-button">
            View all <ArrowUpRight size={16} />
          </button>
        </div>
        <div className="simple-table">
          <div>
            <span>01</span>
            <strong>
              {partner ? "Mehrauli → Cyber Hub" : "Gurugram → South Delhi"}
            </strong>
            <b>{partner ? "₹412" : "2,842 rides"}</b>
          </div>
          <div>
            <span>02</span>
            <strong>
              {partner ? "Saket → Vasant Vihar" : "Connaught Place → Noida"}
            </strong>
            <b>{partner ? "₹196" : "1,964 rides"}</b>
          </div>
          <div>
            <span>03</span>
            <strong>
              {partner ? "Hauz Khas → Nehru Place" : "Airport → Gurugram"}
            </strong>
            <b>{partner ? "₹284" : "1,728 rides"}</b>
          </div>
        </div>
      </div>
    </div>
  );
}
function Stat({ label, value, delta }) {
  return (
    <div className="stat-card">
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{delta}</small>
    </div>
  );
}

function AddressSuggestions({ items, value, onSelect }) {
  const [places, setPlaces] = useState([]);
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!value.trim() || !window.google?.maps?.places) {
        setPlaces([]);
        return;
      }
      const service = new window.google.maps.places.AutocompleteService();
      service.getPlacePredictions({ input: `${value}, Uttar Pradesh, India`, componentRestrictions: { country: "in" }, bounds: { north: 30.42, south: 23.82, east: 84.67, west: 77.08 }, strictBounds: false, types: ["geocode", "establishment"] }, (predictions, status) => {
        if (status === "OK") setPlaces(predictions.slice(0, 5));
        else setPlaces([]);
      });
    }, 180);
    return () => clearTimeout(timer);
  }, [value]);
  const suggestions = places.length ? places : items.map((description) => ({ description }));
  if (!suggestions.length) return null;
  return <div className="address-suggestions" role="listbox">{suggestions.map((place) => <button type="button" key={place.place_id || place.description} onMouseDown={(event) => event.preventDefault()} onClick={() => {
    const select = (location) => onSelect(place.description, location);
    if (place.place_id && window.google?.maps) new window.google.maps.Geocoder().geocode({ address: place.description }, (results, status) => status === "OK" && results[0] ? select({ lat: results[0].geometry.location.lat(), lng: results[0].geometry.location.lng() }) : select(null));
    else select(null);
  }}><MapPin size={14} />{place.description}</button>)}</div>;
}

export default App;
void RoleDashboard;
void LegacyBookingFlow;

function WorkspaceView({ view, onBack, onSelectDestination, onNavigate }) {
  const labels = {
    rides: ["YOUR JOURNEYS", "My rides", "Track past and upcoming rides."],
    saved: [
      "QUICK ACCESS",
      "Saved places",
      "Your favourite destinations, ready when you are.",
    ],
    wallet: [
      "PAYMENTS",
      "RideX Wallet",
      "A faster way to pay for every journey.",
    ],
    pass: ["SUBSCRIPTION", "RidePass", "Less waiting. Better fares."],
    rental: [
      "RENTAL MARKETPLACE",
      "Rent a vehicle",
      "Choose a vehicle for as long as you need.",
    ],
    shared: [
      "SMART SHARING",
      "Share a ride",
      "Save money by sharing your route.",
    ],
    safety: [
      "RIDE PROTECTION",
      "Safety center",
      "Help is always one tap away.",
    ],
    support: [
      "24/7 ASSISTANCE",
      "Help & Support",
      "Get help with bookings, payments, and safety.",
    ],
  };
  const [kicker, title, copy] = labels[view] || labels.rides;
  const [selectedItem, setSelectedItem] = useState(null);
  if (view === "rides") return <RidesWorkspace onBack={onBack} onHelp={() => onNavigate("support")} />;
  if (view === "wallet") return <WalletWorkspace onBack={onBack} />;
  if (view === "saved") return <SavedPlacesWorkspace onBack={onBack} onSelectDestination={onSelectDestination} />;
  if (view === "support") return <SupportWorkspace onBack={onBack} />;
  if (view === "rental") return <RentalWorkspace onBack={onBack} />;
  if (view === "shared") return <SharedRideWorkspace onBack={onBack} />;
  if (view === "pass") return <RidePassWorkspace onBack={onBack} />;
  const items =
    view === "support"
      ? [
          [
            "Help & Support",
            "Get help with bookings, payments, and safety.",
            "Open",
          ],
          [
            "Personalized for support",
            "Your latest activity and settings.",
            "View",
          ],
        ]
      : [
          [title, "Ready in your RideX workspace.", "Open"],
          [
            `Personalized for ${view}`,
            "Your latest activity and settings.",
            "View",
          ],
        ];
  return (
    <div className="workspace-view">
      <button className="back-link" onClick={onBack}>
        ← Back to overview
      </button>
      <p className="section-kicker">{kicker}</p>
      <h1>{title}</h1>
      <p className="subheading">{copy}</p>
      <div className="workspace-list">
        {items.map(([label, detail, action]) => (
          <button
            className="workspace-row"
            key={label}
            onClick={() => setSelectedItem({ label, detail })}
          >
            <div>
              <strong>{label}</strong>
              <small>{detail}</small>
            </div>
            <b>{action}</b>
            <ArrowUpRight size={16} />
          </button>
        ))}
      </div>
      {selectedItem && (
        <div
          className="support-dialog-backdrop"
          role="presentation"
          onClick={() => setSelectedItem(null)}
        >
          <section
            className="support-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="support-dialog-title"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              className="dialog-close"
              aria-label="Close details"
              onClick={() => setSelectedItem(null)}
            >
              ×
            </button>
            <p className="section-kicker">RIDEX SUPPORT</p>
            <h2 id="support-dialog-title">{selectedItem.label}</h2>
            <p>{selectedItem.detail}</p>
            <button
              className="primary-button"
              onClick={() => setSelectedItem(null)}
            >
              Continue <ArrowUpRight size={16} />
            </button>
          </section>
        </div>
      )}
    </div>
  );
}

function CalendarPicker({ month, selectedDate, onMonthChange, onDateChange, onClear }) {
  const year = month.getFullYear();
  const monthIndex = month.getMonth();
  const firstDay = new Date(year, monthIndex, 1).getDay();
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const dates = Array.from({ length: firstDay + daysInMonth }, (_, index) => index < firstDay ? null : index - firstDay + 1);
  const changeMonth = (amount) => onMonthChange(new Date(year, monthIndex + amount, 1));
  const formatDate = (day) => `${year}-${String(monthIndex + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  return <div className="ride-menu calendar-menu"><div className="calendar-heading"><strong>{month.toLocaleDateString("en-IN", { month: "long", year: "numeric" })}</strong><div><button type="button" aria-label="Previous month" onClick={() => changeMonth(-1)}><ChevronUp size={16} /></button><button type="button" aria-label="Next month" onClick={() => changeMonth(1)}><ChevronDown size={16} /></button></div></div><div className="calendar-weekdays">{["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((day) => <span key={day}>{day}</span>)}</div><div className="calendar-days">{dates.map((day, index) => day ? <button type="button" key={day} className={selectedDate === formatDate(day) ? "selected" : ""} onClick={() => onDateChange(formatDate(day))}>{day}</button> : <span key={`empty-${index}`} />)}</div>{selectedDate && <button className="calendar-clear" type="button" onClick={onClear}>Clear date</button>}</div>;
}

function RidesWorkspace({ onBack, onHelp }) {
  const [rides, setRides] = useState([]);
  const [walletBalance, setWalletBalance] = useState(0);
  const [filter, setFilter] = useState("all");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState("");
  const [shareOpen, setShareOpen] = useState(false);
  const [dateOpen, setDateOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState("");
  const [calendarMonth, setCalendarMonth] = useState(() => new Date());
  const load = async () => {
    setLoading(true);
    try {
      const [rideResult, walletResult] = await Promise.all([api.rides(), api.wallet()]);
      setRides(rideResult);
      setWalletBalance(walletResult.balance || 0);
      setError("");
    } catch (requestError) { setError(requestError.message); } finally { setLoading(false); }
  };
  useEffect(() => { const timer = setTimeout(load, 0); return () => clearTimeout(timer); }, []);
  const upcomingStatuses = ["searching", "driver_assigned", "driver_arriving", "arrived", "started"];
  const filtered = rides.filter((ride) => {
    const matchesStatus = filter === "all" || (filter === "upcoming" ? upcomingStatuses.includes(ride.status) : ride.status === filter);
    const matchesDate = !selectedDate || new Date(ride.createdAt).toISOString().slice(0, 10) === selectedDate;
    return matchesStatus && matchesDate;
  });
  const cancel = async (ride) => {
    setBusyId(ride._id);
    try { await api.updateRideStatus(ride._id, "cancelled"); await load(); } catch (requestError) { setError(requestError.message); } finally { setBusyId(""); }
  };
  return <div className="rides-workspace">
    {shareOpen && <ShareDialog onClose={() => setShareOpen(false)} />}
    <div className="rides-breadcrumb"><button onClick={onBack}>RideX</button><span>/</span><strong>My Rides</strong></div>
    <div className="rides-layout">
      <section className="rides-main">
        <div className="rides-heading"><div><h1>My Rides</h1><p>Track all your past, current and upcoming rides.</p></div></div>
        <div className="rides-toolbar"><div className="rides-tabs" role="tablist">{[["all", "All"], ["searching", "Searching"], ["upcoming", "Upcoming"], ["completed", "Completed"], ["cancelled", "Cancelled"]].map(([value, label]) => <button key={value} className={filter === value ? "active" : ""} onClick={() => setFilter(value)} role="tab" aria-selected={filter === value}>{label}</button>)}</div><div className="rides-tools"><div className="ride-control"><button onClick={() => { setDateOpen((value) => !value); setFilterOpen(false); }}><CalendarDays size={15} /> {selectedDate ? new Date(`${selectedDate}T00:00:00`).toLocaleDateString() : "Date"} <ChevronDown size={14} /></button>{dateOpen && <CalendarPicker month={calendarMonth} selectedDate={selectedDate} onMonthChange={setCalendarMonth} onDateChange={(date) => { setSelectedDate(date); setDateOpen(false); }} onClear={() => { setSelectedDate(""); setDateOpen(false); }} />}</div><div className="ride-control"><button onClick={() => { setFilterOpen((value) => !value); setDateOpen(false); }}><Filter size={14} /> Filter</button>{filterOpen && <div className="ride-menu filter-menu">{[["all", "All rides"], ["upcoming", "Upcoming"], ["completed", "Completed"], ["cancelled", "Cancelled"]].map(([value, label]) => <button type="button" key={value} onClick={() => { setFilter(value); setFilterOpen(false); }}>{label}</button>)}</div>}</div></div></div>
        {error && <p className="rides-error" role="alert">{error}</p>}
        {loading ? <p className="loading-state rides-loading">Loading your rides...</p> : filtered.length ? <div className="workspace-list rides-list">{filtered.map((ride) => <div className="workspace-row" key={ride._id}><div><strong>{ride.category} · {ride.pickup} → {ride.destination}</strong><small>{new Date(ride.createdAt).toLocaleString()} · Ride ID {ride._id} · ₹{ride.fare}</small></div><span className="status-pill">{ride.status}</span>{["searching", "driver_assigned", "driver_arriving"].includes(ride.status) && <button className="accept-button" disabled={busyId === ride._id} onClick={() => cancel(ride)}>{busyId === ride._id ? "Cancelling..." : "Cancel"}</button>}</div>)}</div> : <div className="rides-empty"><div className="empty-illustration" aria-hidden="true"><div className="empty-cloud cloud-one"></div><div className="empty-cloud cloud-two"></div><div className="empty-city"></div><div className="empty-pin"><MapPin size={20} fill="currentColor" /></div><div className="empty-car"><span></span><i></i><b></b></div><div className="empty-ground"></div></div><h2>No rides found</h2><p>You don't have any rides in this category.<br />Book a new ride and start your journey with RideX.</p><button className="primary-button" onClick={onBack}>Book a Ride Now <ArrowUpRight size={16} /></button></div>}
        <div className="rides-benefits"><div><span className="benefit-icon benefit-mint"><Clock3 size={19} /></span><strong>Real-time Tracking<small>Track your driver live<br />on the map</small></strong></div><div><span className="benefit-icon benefit-yellow"><ShieldCheck size={19} /></span><strong>Safe &amp; Secure<small>Your safety is our<br />top priority</small></strong></div><div><span className="benefit-icon benefit-blue"><DollarSign size={19} /></span><strong>Transparent Pricing<small>No hidden charges,<br />what you see is what you pay</small></strong></div><div><span className="benefit-icon benefit-purple"><Headphones size={19} /></span><strong>24/7 Support<small>We're always here<br />to help you</small></strong></div></div>
      </section>
      <aside className="rides-rail"><section className="pass-rail"><div className="pass-rail-heading"><h2>RideX Pass</h2><span>BEST VALUE</span></div><p>Unlock exclusive benefits</p><ul><li>Priority booking</li><li>Lower platform fees</li><li>Exclusive offers</li><li>Free cancellations</li></ul><button onClick={() => window.alert("RideX Pass plans are coming soon.")}>Explore RideX Pass <ArrowUpRight size={14} /></button><div className="pass-ticket">RX<span>PASS</span></div></section><section className="rail-card wallet-rail"><div><h3>RideX Wallet</h3><small>Balance</small><strong>₹{Number(walletBalance).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</strong><div><button onClick={() => window.alert("Wallet top-up is available from Wallet.")}>Add Money</button><button onClick={() => onBack()}>View Transactions</button></div></div><WalletCards size={39} /></section><section className="rail-card help-rail"><div><h3>Need Help?</h3><p>We're here to assist you</p><button onClick={onHelp}>Visit Help Center <ChevronRight size={14} /></button></div><Headphones size={47} /></section><section className="rail-card refer-rail"><div><h3>Refer &amp; Earn</h3><p>Invite your friends and<br />earn exciting rewards</p><button onClick={() => setShareOpen(true)}>Refer Now <ArrowUpRight size={14} /></button></div><Gift size={46} /></section></aside>
    </div>
  </div>;
}

function WalletWorkspace({ onBack }) {
  const [wallet, setWallet] = useState(null);
  const [amount, setAmount] = useState(500);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  useEffect(() => {
    if (window.Razorpay || document.querySelector('script[src="https://checkout.razorpay.com/v1/checkout.js"]')) return;
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    document.body.appendChild(script);
  }, []);
  const load = async () => { setLoading(true); try { setWallet(await api.wallet()); setError(""); } catch (requestError) { setError(requestError.message); } finally { setLoading(false); } };
  useEffect(() => { const timer = setTimeout(load, 0); return () => clearTimeout(timer); }, []);
  const topUp = async () => {
    if (!Number.isFinite(amount) || amount < 200) { setError("Wallet me add karne ke liye minimum ₹200 payment karein."); return; }
    setProcessing(true);
    setError("");
    try {
      const result = await api.createWalletOrder(amount);
      if (!window.Razorpay) throw new Error("Razorpay Checkout could not be loaded. Please refresh and try again.");
      const checkout = new window.Razorpay({
        key: result.data.keyId,
        amount: result.data.amount * 100,
        currency: result.data.currency,
        name: "RideX",
        description: "Wallet recharge",
        order_id: result.data.orderId,
        handler: async (response) => {
          try {
            const verified = await api.verifyWalletPayment(response);
            setWallet((current) => ({ ...current, balance: verified.balance }));
            await load();
          } catch (requestError) { setError(requestError.message); }
          finally { setProcessing(false); }
        },
        modal: { ondismiss: () => { setError("Payment failed or cancelled. Your wallet has not been charged."); setProcessing(false); } },
      });
      checkout.on("payment.failed", () => { setError("Payment failed or cancelled. Your wallet has not been charged."); setProcessing(false); });
      checkout.open();
    } catch (requestError) { setError(requestError.message); setProcessing(false); }
  };
  return <div className="workspace-view"><button className="back-link" onClick={onBack}>← Back to overview</button><p className="section-kicker">PAYMENTS</p><h1>RideX Wallet</h1><p className="subheading">A faster way to pay for every journey.</p>{error && <p role="alert">{error}</p>}{loading ? <p className="loading-state">Loading wallet...</p> : <><div className="stat-card"><span>Current balance</span><strong>₹{wallet?.balance ?? 0}</strong><small>{wallet?.currency || "INR"}</small></div><div className="workspace-list"><div className="workspace-row"><div><strong>Add money</strong><small>{processing ? "Creating secure payment..." : "Pay securely with Razorpay."}</small></div><input type="number" min="200" max="100000" value={amount} disabled={processing} onChange={(event) => setAmount(Number(event.target.value))} aria-label="Top-up amount" /><button className="accept-button" disabled={processing} onClick={topUp}>{processing ? "Processing..." : `Pay ₹${amount}`}</button></div>{wallet?.transactions?.length ? wallet.transactions.map((transaction, index) => <div className="workspace-row" key={transaction._id || `${transaction.createdAt}-${index}`}><div><strong>{transaction.description || transaction.type}</strong><small>{transaction.createdAt ? new Date(transaction.createdAt).toLocaleString() : "Recent"}</small></div><b>₹{transaction.amount}</b></div>) : <p className="empty-state">No wallet transactions yet.</p>}</div></>}</div>;
}

function SavedPlacesWorkspace({ onBack, onSelectDestination }) {
  const [places, setPlaces] = useState(() => {
    try { return JSON.parse(localStorage.getItem("ridex-saved-places") || "[]"); } catch { return []; }
  });
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [error, setError] = useState("");
  const savePlaces = (nextPlaces) => { setPlaces(nextPlaces); localStorage.setItem("ridex-saved-places", JSON.stringify(nextPlaces)); };
  const addPlace = (event) => {
    event.preventDefault();
    if (!name.trim() || !address.trim()) return setError("Enter a place name and address.");
    savePlaces([...places, { id: crypto.randomUUID(), name: name.trim(), address: address.trim() }]);
    setName(""); setAddress(""); setError("");
  };
  return <div className="workspace-view"><button className="back-link" onClick={onBack}>← Back to overview</button><p className="section-kicker">QUICK ACCESS</p><h1>Saved places</h1><p className="subheading">Your favourite destinations, ready when you are.</p><form className="saved-place-form" onSubmit={addPlace}><label>Place name<input value={name} onChange={(event) => setName(event.target.value)} placeholder="Home, office, airport..." /></label><label>Address<input value={address} onChange={(event) => setAddress(event.target.value)} placeholder="Enter a destination" /></label><button className="primary-button" type="submit">Save place <ArrowUpRight size={16} /></button>{error && <p role="alert">{error}</p>}</form>{places.length ? <div className="workspace-list saved-place-list">{places.map((place) => <div className="workspace-row" key={place.id}><div><strong>{place.name}</strong><small>{place.address}</small></div><button className="text-button" type="button" onClick={() => onSelectDestination(place.address)}>Use for booking <ArrowUpRight size={14} /></button><button className="dialog-close saved-place-delete" type="button" aria-label={`Delete ${place.name}`} onClick={() => savePlaces(places.filter((item) => item.id !== place.id))}>×</button></div>)}</div> : <div className="empty-state saved-place-empty"><strong>No saved places yet.</strong><span>Add home, work, or any destination you visit often.</span></div>}</div>;
}

function SupportWorkspace({ onBack }) {
  const [openQuestion, setOpenQuestion] = useState(null);
  const [category, setCategory] = useState("Booking");
  const [message, setMessage] = useState("");
  const [notice, setNotice] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const questions = [{ question: "How do I book a ride?", answer: "Choose a destination on the overview screen, compare available rides, and confirm the option that works for you." }, { question: "How can I pay for a ride?", answer: "You can use cash, UPI, or your RideX wallet during ride confirmation." }, { question: "What should I do if my payment fails?", answer: "Your ride remains active. Retry the payment or choose another method such as cash, UPI, or wallet." }, { question: "Can I cancel a ride?", answer: "Open My rides, select an active ride, and choose Cancel. The latest ride status will be shown there." }, { question: "Where can I see my ride history?", answer: "Open My rides from the sidebar to see upcoming, active, completed, and cancelled rides." }, { question: "How do I save a frequent destination?", answer: "Open Saved places, add a name and address, then use it directly while booking your next ride." }, { question: "How do I update my profile?", answer: "Open your profile from the top-right avatar, select Edit profile, update your details, and save the changes." }, { question: "Where can I get safety help?", answer: "Open Safety center to access trip sharing, emergency contacts, and driver verification." }, { question: "How do I contact RideX support?", answer: "Use the support form below, email support@ridex.app, or call 1800 123 4567 for assistance." }];
  const submit = async (event) => { event.preventDefault(); if (!message.trim()) return; setSubmitting(true); setNotice(""); try { await api.supportRequest(category, message); setNotice("Your request was sent. Our team will contact you shortly."); setMessage(""); } catch (requestError) { setNotice(requestError.message); } finally { setSubmitting(false); } };
  return <div className="support-workspace"><button className="back-link" onClick={onBack}>← Back to overview</button><div className="support-hero"><div><p className="section-kicker">RIDEX CARE</p><h1>How can we help?</h1><p className="subheading">Answers and assistance for every part of your journey.</p></div><div className="support-hero-mark" aria-hidden="true">?</div></div><div className="support-contact-row"><a href="mailto:support@ridex.app"><strong>Email support</strong><span>support@ridex.app</span></a><a href="tel:+9118001234567"><strong>Call us</strong><span>1800 123 4567 · 24/7</span></a></div><section className="payment-help"><div className="payment-help-heading"><div><p className="section-kicker">PAYMENT HELP</p><h2>Pay with confidence</h2><p>Choose the option that suits you. Your ride and payment status stay visible in My rides.</p></div><WalletCards size={28} aria-hidden="true" /></div><div className="payment-help-grid"><div><strong>Cash</strong><span>Pay the driver after your ride.</span></div><div><strong>UPI</strong><span>Complete payment from your UPI app.</span></div><div><strong>Wallet</strong><span>Use your RideX wallet balance.</span></div></div><div className="payment-help-note"><strong>Payment failed?</strong><span>Do not pay twice. Retry from the payment screen or select another method. A failed attempt remains recorded for reference.</span></div></section><section className="support-section"><div className="section-heading"><div><p className="section-kicker">QUICK ANSWERS</p><h2>Frequently asked questions</h2></div></div><div className="support-faqs">{questions.map((item, index) => <div className="support-faq" key={item.question}><button type="button" aria-expanded={openQuestion === index} onClick={() => setOpenQuestion(openQuestion === index ? null : index)}><span>{item.question}</span><b aria-hidden="true">{openQuestion === index ? "−" : "+"}</b></button>{openQuestion === index && <p>{item.answer}</p>}</div>)}</div></section><section className="support-section support-request"><div><p className="section-kicker">CONTACT RIDEX</p><h2>Still need a hand?</h2><p>Tell us what happened and we will route it to the right team.</p></div><form onSubmit={submit}><label>Request type<select value={category} onChange={(event) => setCategory(event.target.value)}><option>Booking</option><option>Payment</option><option>Safety</option><option>Account</option></select></label><label>Message<textarea required value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Describe your question or issue" rows="3" /></label><button className="primary-button" type="submit" disabled={submitting}>{submitting ? "Sending..." : "Send request"} {!submitting && <ArrowUpRight size={16} />}</button>{notice && <p className="support-notice" role="status">{notice}</p>}</form></section></div>;
}

function RentalWorkspace({ onBack }) {
  const [vehicle, setVehicle] = useState('Cab');
  const [duration, setDuration] = useState('1 day');
  const [notice, setNotice] = useState('');
  const prices = { Bike: 699, Auto: 899, Cab: 1499, Premium: 2499 };
  const request = async () => { try { await api.createServiceRequest('rental', { vehicle, duration }); setNotice(`${vehicle} rental request sent for admin approval.`); } catch (error) { setNotice(error.message); } };
  return <div className="feature-workspace"><button className="back-link" onClick={onBack}>← Back to overview</button><p className="section-kicker">RENTAL MARKETPLACE</p><h1>Rent a vehicle</h1><p className="subheading">Choose a vehicle for as long as you need.</p><section className="feature-panel"><div><h2>Find your vehicle</h2><p>Flexible rentals with simple daily pricing.</p></div><div className="choice-grid">{Object.keys(prices).map((item) => <button type="button" key={item} className={vehicle === item ? 'choice selected' : 'choice'} onClick={() => setVehicle(item)}><strong>{item}</strong><small>From ₹{prices[item]} / day</small></button>)}</div><label className="feature-field">Rental duration<select value={duration} onChange={(event) => setDuration(event.target.value)}><option>1 day</option><option>3 days</option><option>7 days</option><option>30 days</option></select></label><div className="feature-summary"><span>{vehicle} · {duration}</span><strong>₹{prices[vehicle] * (duration === '3 days' ? 3 : duration === '7 days' ? 7 : duration === '30 days' ? 30 : 1)}</strong></div><button className="primary-button" onClick={request}>Request vehicle <ArrowUpRight size={16} /></button>{notice && <p className="feature-notice" role="status">{notice}</p>}</section></div>;
}

function SharedRideWorkspace({ onBack }) {
  const [seats, setSeats] = useState('1');
  const [time, setTime] = useState('Now');
  const [notice, setNotice] = useState('');
  const request = async () => { try { await api.createServiceRequest('shared', { seats, time }); setNotice(`Shared ride request sent for admin approval.`); } catch (error) { setNotice(error.message); } };
  return <div className="feature-workspace"><button className="back-link" onClick={onBack}>← Back to overview</button><p className="section-kicker">SMART SHARING</p><h1>Share a ride</h1><p className="subheading">Save money by sharing your route.</p><section className="feature-panel shared-panel"><div><h2>Plan a shared trip</h2><p>Match with verified riders heading your way.</p></div><label className="feature-field">Pickup<input placeholder="Current location" /></label><label className="feature-field">Destination<input placeholder="Where are you going?" /></label><div className="feature-inline"><label className="feature-field">Seats<select value={seats} onChange={(event) => setSeats(event.target.value)}><option>1</option><option>2</option><option>3</option></select></label><label className="feature-field">Departure<select value={time} onChange={(event) => setTime(event.target.value)}><option>Now</option><option>In 30 minutes</option><option>Schedule for later</option></select></label></div><div className="feature-summary"><span>Estimated shared fare</span><strong>From ₹120</strong></div><button className="primary-button" onClick={request}>Find shared ride <ArrowUpRight size={16} /></button>{notice && <p className="feature-notice" role="status">{notice}</p>}</section></div>;
}

function RidePassWorkspace({ onBack }) {
  const [selected, setSelected] = useState('Monthly');
  const [notice, setNotice] = useState('');
  const [processing, setProcessing] = useState(false);
  const plans = [{ name: 'Weekly', price: 99, detail: '7 days of member fares' }, { name: 'Monthly', price: 299, detail: '30 days of lower fares' }, { name: 'Yearly', price: 2499, detail: 'Best value for regular riders' }];
  useEffect(() => { if (window.Razorpay || document.querySelector('script[src="https://checkout.razorpay.com/v1/checkout.js"]')) return; const script = document.createElement('script'); script.src = 'https://checkout.razorpay.com/v1/checkout.js'; script.async = true; document.body.appendChild(script); }, []);
  const request = async () => {
    setProcessing(true);
    setNotice('Creating secure payment...');
    try {
      const result = await api.createPassOrder(selected);
      if (!window.Razorpay) throw new Error('Razorpay Checkout could not be loaded. Please refresh and try again.');
      const checkout = new window.Razorpay({ key: result.data.keyId, amount: result.data.amount * 100, currency: result.data.currency, name: 'RideX', description: `${selected} RidePass`, order_id: result.data.orderId, handler: async (response) => {
        setNotice('Verifying payment...');
        try { const verified = await api.verifyPassPayment(response); setNotice(verified.message); } catch (error) { setNotice(error.message); } finally { setProcessing(false); }
      }, modal: { ondismiss: () => { setNotice('Payment failed or cancelled. RidePass was not activated.'); setProcessing(false); } } });
      checkout.on('payment.failed', () => { setNotice('Payment failed or cancelled. RidePass was not activated.'); setProcessing(false); });
      checkout.open();
    } catch (error) { setNotice(error.message); setProcessing(false); }
  };
  return <div className="feature-workspace"><button className="back-link" onClick={onBack}>← Back to overview</button><p className="section-kicker">SUBSCRIPTION</p><h1>RidePass</h1><p className="subheading">Less waiting. Better fares.</p><section className="pass-intro"><div><h2>Make every ride count.</h2><p>Save on eligible rides, skip the guesswork, and keep your benefits active.</p></div><span aria-hidden="true">RX</span></section><div className="pass-plans">{plans.map((plan) => <button type="button" key={plan.name} className={selected === plan.name ? 'pass-plan selected' : 'pass-plan'} onClick={() => setSelected(plan.name)}><span>{plan.name}</span><strong>₹{plan.price}</strong><small>{plan.detail}</small></button>)}</div><button className="primary-button pass-activate" disabled={processing} onClick={request}>{processing ? 'Processing payment...' : `Pay ₹${plans.find((plan) => plan.name === selected).price} & activate`} <ArrowUpRight size={16} /></button>{notice && <p className="feature-notice" role="status">{notice}</p>}</div>;
}
