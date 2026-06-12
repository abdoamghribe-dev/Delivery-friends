import { useEffect, useMemo } from 'react';
import { CircleMarker, MapContainer, Polyline, Popup, TileLayer, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

const DEFAULT_CENTER = [31.9539, 35.9106];
const DEFAULT_ZOOM = 13;

const COLOR_MAP = {
  current: '#38bdf8',
  pickup: '#f59e0b',
  delivery: '#22c55e',
  pending: '#f59e0b',
  accepted: '#3b82f6',
  in_transit: '#22c55e',
  delivered: '#16a34a',
  cancelled: '#ef4444',
};

function parseCoords(lat, lng) {
  const latitude = Number(lat);
  const longitude = Number(lng);

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return null;
  }

  return [latitude, longitude];
}

function FitBounds({ points, fallbackCenter, fallbackZoom = DEFAULT_ZOOM }) {
  const map = useMap();

  useEffect(() => {
    if (points.length > 0) {
      map.fitBounds(points, { padding: [40, 40], maxZoom: 15 });
      return;
    }

    if (fallbackCenter) {
      map.setView(fallbackCenter, fallbackZoom);
    }
  }, [fallbackCenter, fallbackZoom, map, points]);

  return null;
}

export default function MapComponent({ title = 'الخريطة', location, orders = [], height = 420 }) {
  const currentLocation = useMemo(() => parseCoords(location?.lat, location?.lng), [location]);

  const points = useMemo(() => {
    const nextPoints = [];

    if (currentLocation) {
      nextPoints.push({
        key: 'current-location',
        coords: currentLocation,
        color: COLOR_MAP.current,
        title: 'موقعي الحالي',
        subtitle: 'GPS مباشر',
        note: 'الموقع الحالي للهاتف أو المتصفح',
      });
    }

    orders.forEach((order) => {
      const pickup = parseCoords(order.pickup_lat, order.pickup_lng);
      const delivery = parseCoords(order.delivery_lat, order.delivery_lng);

      if (pickup) {
        nextPoints.push({
          key: `pickup-${order.id}`,
          coords: pickup,
          color: COLOR_MAP.pickup,
          title: order.item_name,
          subtitle: 'نقطة الاستلام',
          note: order.pickup_address,
          order,
        });
      }

      if (delivery) {
        nextPoints.push({
          key: `delivery-${order.id}`,
          coords: delivery,
          color: COLOR_MAP.delivery,
          title: order.item_name,
          subtitle: 'نقطة التسليم',
          note: order.delivery_address,
          order,
        });
      }
    });

    return nextPoints;
  }, [currentLocation, orders]);

  const routes = useMemo(
    () =>
      orders
        .map((order) => {
          const pickup = parseCoords(order.pickup_lat, order.pickup_lng);
          const delivery = parseCoords(order.delivery_lat, order.delivery_lng);

          if (!pickup || !delivery) {
            return null;
          }

          return {
            key: `route-${order.id}`,
            order,
            pickup,
            delivery,
            color: COLOR_MAP[order.status] ?? COLOR_MAP.accepted,
          };
        })
        .filter(Boolean),
    [orders],
  );

  const mapCenter = currentLocation ?? points[0]?.coords ?? DEFAULT_CENTER;
  const hasAnyData = Boolean(currentLocation || points.length > 0);

  return (
    <section className="card map-card">
      <div className="page-header map-header" style={{ marginBottom: 14 }}>
        <div>
          <h2>{title}</h2>
          <p className="text-muted" style={{ margin: 0 }}>
            خريطة فعلية تعتمد على OpenStreetMap وتعرض الموقع والطلبات الحقيقية.
          </p>
        </div>
        <span className="badge">{points.length} نقطة</span>
      </div>

      <div className="map-shell" style={{ height }}>
        <MapContainer center={mapCenter} zoom={DEFAULT_ZOOM} scrollWheelZoom={false} className="map-container" style={{ height: '100%', width: '100%' }}>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <FitBounds points={points.map((point) => point.coords)} fallbackCenter={mapCenter} />

          {routes.map((route) => (
            <Polyline
              key={route.key}
              positions={[route.pickup, route.delivery]}
              pathOptions={{
                color: route.color,
                weight: 4,
                opacity: 0.8,
                dashArray: route.order.status === 'pending' ? '8 10' : undefined,
              }}
            />
          ))}

          {points.map((point) => (
            <CircleMarker
              key={point.key}
              center={point.coords}
              radius={point.key === 'current-location' ? 11 : 9}
              pathOptions={{
                color: point.color,
                fillColor: point.color,
                fillOpacity: 0.7,
                weight: 3,
              }}
            >
              <Popup>
                <div>
                  <strong>{point.title}</strong>
                  <div>{point.subtitle}</div>
                  <div>{point.note}</div>
                </div>
              </Popup>
            </CircleMarker>
          ))}
        </MapContainer>
      </div>

      <div className="map-legend">
        <span className="badge"><span className="map-dot" style={{ background: COLOR_MAP.current }} /> موقعي الحالي</span>
        <span className="badge"><span className="map-dot" style={{ background: COLOR_MAP.pickup }} /> الاستلام</span>
        <span className="badge"><span className="map-dot" style={{ background: COLOR_MAP.delivery }} /> التسليم</span>
      </div>

      {!hasAnyData ? (
        <p className="map-hint text-muted">
          لا توجد إحداثيات محفوظة بعد، لكن الخريطة أصبحت فعلية وتعمل فور توفر lat/lng.
        </p>
      ) : null}
    </section>
  );
}
