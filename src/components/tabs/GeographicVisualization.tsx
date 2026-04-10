import { useState, useEffect, useCallback } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, GeoJSON } from 'react-leaflet';
import { MapPin, Sun, Zap, ArrowRight, Info } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useDashboardStore } from '@/store/dashboardStore';
import { CITY_SOLAR_DATA, STATE_SOLAR_RESOURCE, STATE_COORDS } from '@/services/nrel';
import { fetchStatePrices, MOCK_STATE_PRICES } from '@/services/eia';
import { useToast } from '@/hooks/use-toast';
import type { Layer, PathOptions } from 'leaflet';
import type { Feature, GeoJsonProperties } from 'geojson';

// Minimal US States GeoJSON — simplified polygons for choropleth
// Using a CDN-loaded approach via useEffect
const US_STATES_GEOJSON_URL =
  'https://raw.githubusercontent.com/PublicaMundi/MappingAPI/master/data/geojson/us-states.json';

interface StateFeatureProperties {
  name: string;
  density?: number;
}

// State name to abbreviation lookup
const STATE_NAME_TO_CODE: Record<string, string> = {
  Alabama: 'AL', Alaska: 'AK', Arizona: 'AZ', Arkansas: 'AR', California: 'CA',
  Colorado: 'CO', Connecticut: 'CT', Delaware: 'DE', Florida: 'FL', Georgia: 'GA',
  Hawaii: 'HI', Idaho: 'ID', Illinois: 'IL', Indiana: 'IN', Iowa: 'IA',
  Kansas: 'KS', Kentucky: 'KY', Louisiana: 'LA', Maine: 'ME', Maryland: 'MD',
  Massachusetts: 'MA', Michigan: 'MI', Minnesota: 'MN', Mississippi: 'MS',
  Missouri: 'MO', Montana: 'MT', Nebraska: 'NE', Nevada: 'NV', 'New Hampshire': 'NH',
  'New Jersey': 'NJ', 'New Mexico': 'NM', 'New York': 'NY', 'North Carolina': 'NC',
  'North Dakota': 'ND', Ohio: 'OH', Oklahoma: 'OK', Oregon: 'OR', Pennsylvania: 'PA',
  'Rhode Island': 'RI', 'South Carolina': 'SC', 'South Dakota': 'SD', Tennessee: 'TN',
  Texas: 'TX', Utah: 'UT', Vermont: 'VT', Virginia: 'VA', Washington: 'WA',
  'West Virginia': 'WV', Wisconsin: 'WI', Wyoming: 'WY',
};

function getPriceColor(price: number): string {
  // Color scale from green (cheap) to red (expensive)
  // Range: ~8 (cheap) to ~40 (expensive) cents/kWh
  const min = 8, max = 40;
  const ratio = Math.max(0, Math.min(1, (price - min) / (max - min)));

  if (ratio < 0.25) return '#10b981'; // emerald - cheap
  if (ratio < 0.5) return '#84cc16';  // lime
  if (ratio < 0.75) return '#f59e0b'; // amber
  return '#ef4444';                   // red - expensive
}

export function GeographicVisualization() {
  const { setSelectedState, applyStateElectricityRate, selectedState, updateProjectInput } = useDashboardStore();
  const { toast } = useToast();
  const [statePrices, setStatePrices] = useState<Record<string, number>>(MOCK_STATE_PRICES);
  const [geoJSON, setGeoJSON] = useState<GeoJSON.FeatureCollection | null>(null);
  const [hoveredState, setHoveredState] = useState<string | null>(null);
  const [loadingPrices, setLoadingPrices] = useState(false);
  const [isMock, setIsMock] = useState(true);

  // Load state prices
  useEffect(() => {
    const loadPrices = async () => {
      setLoadingPrices(true);
      try {
        const prices = await fetchStatePrices();
        setStatePrices(prices);
        setIsMock(!import.meta.env.VITE_EIA_API_KEY);
      } catch {
        // keep mock
      } finally {
        setLoadingPrices(false);
      }
    };
    loadPrices();
  }, []);

  // Load GeoJSON
  useEffect(() => {
    fetch(US_STATES_GEOJSON_URL)
      .then((r) => r.json())
      .then((data) => setGeoJSON(data))
      .catch((e) => console.warn('GeoJSON load failed:', e));
  }, []);

  const handleStateClick = useCallback(
    (stateName: string) => {
      const code = STATE_NAME_TO_CODE[stateName];
      if (!code) return;

      const price = statePrices[code] ?? null;
      const coords = STATE_COORDS[code];
      const solarResource = STATE_SOLAR_RESOURCE[code] ?? null;

      setSelectedState({
        name: stateName,
        code,
        avgElectricityPrice: price,
        solarResource,
      });
    },
    [statePrices, setSelectedState]
  );

  const handleApplyRate = useCallback(() => {
    if (selectedState.avgElectricityPrice === null) return;
    const rateInDollars = selectedState.avgElectricityPrice / 100;
    updateProjectInput('electricityRate', rateInDollars);
    applyStateElectricityRate();
    toast({
      title: 'Rate Updated',
      description: `Electricity rate set to ${selectedState.avgElectricityPrice.toFixed(2)} ¢/kWh from ${selectedState.name} data.`,
    });
  }, [selectedState, updateProjectInput, applyStateElectricityRate, toast]);

  const geoJSONStyle = useCallback(
    (feature?: Feature<GeoJSON.Geometry, GeoJsonProperties>): PathOptions => {
      if (!feature?.properties) return {};
      const props = feature.properties as StateFeatureProperties;
      const code = STATE_NAME_TO_CODE[props.name] ?? '';
      const price = statePrices[code] ?? 12.5;
      const isSelected = selectedState.code === code;
      const isHovered = hoveredState === code;

      return {
        fillColor: getPriceColor(price),
        fillOpacity: isSelected ? 0.8 : isHovered ? 0.7 : 0.55,
        color: isSelected ? '#ffffff' : isHovered ? '#e2e8f0' : '#1e293b',
        weight: isSelected ? 2 : 1,
      };
    },
    [statePrices, selectedState.code, hoveredState]
  );

  const onEachFeature = useCallback(
    (feature: Feature<GeoJSON.Geometry, GeoJsonProperties>, layer: Layer) => {
      const props = feature.properties as StateFeatureProperties;
      const stateName = props.name;
      const code = STATE_NAME_TO_CODE[stateName] ?? '';
      const price = statePrices[code];

      layer.on({
        click: () => handleStateClick(stateName),
        mouseover: () => setHoveredState(code),
        mouseout: () => setHoveredState(null),
      });

      if (price !== undefined) {
        layer.bindTooltip(
          `<div style="background:#1e293b;border:1px solid #334155;border-radius:6px;padding:8px;color:#e2e8f0;font-size:12px">
            <strong>${stateName}</strong><br/>
            ${price.toFixed(2)} ¢/kWh avg
          </div>`,
          { sticky: true, className: 'leaflet-tooltip-custom' }
        );
      }
    },
    [statePrices, handleStateClick]
  );

  // Solar resource color scale for circle markers
  const getSolarColor = (resource: number) => {
    if (resource >= 6) return '#fbbf24';
    if (resource >= 5) return '#f59e0b';
    if (resource >= 4.5) return '#10b981';
    if (resource >= 4) return '#3b82f6';
    return '#6366f1';
  };

  const getSolarRadius = (resource: number) => {
    return 6 + (resource - 3) * 3;
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <MapPin className="h-6 w-6 text-emerald-400" />
            Geographic Visualization
          </h2>
          <p className="text-slate-400 text-sm mt-1">
            State electricity prices (choropleth) + solar resource potential (circle markers)
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isMock && <Badge variant="outline" className="border-amber-500/50 text-amber-400">Sample Prices</Badge>}
          {loadingPrices && <Badge variant="outline" className="border-blue-500/50 text-blue-400">Loading...</Badge>}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-4">
        {/* Map */}
        <div className="xl:col-span-3">
          <Card className="bg-slate-800 border-slate-700 overflow-hidden">
            <div style={{ height: '520px' }} className="relative">
              <MapContainer
                center={[37.8, -96]}
                zoom={4}
                style={{ height: '100%', width: '100%', backgroundColor: '#0f172a' }}
                zoomControl={true}
              >
                <TileLayer
                  url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
                />

                {/* State choropleth */}
                {geoJSON && (
                  <GeoJSON
                    key={`${selectedState.code}-${hoveredState}-${Object.keys(statePrices).length}`}
                    data={geoJSON}
                    style={geoJSONStyle}
                    onEachFeature={onEachFeature}
                  />
                )}

                {/* City solar resource markers */}
                {CITY_SOLAR_DATA.map((city) => (
                  <CircleMarker
                    key={city.name}
                    center={[city.lat, city.lng]}
                    radius={getSolarRadius(city.solarResource)}
                    pathOptions={{
                      fillColor: getSolarColor(city.solarResource),
                      fillOpacity: 0.85,
                      color: '#1e293b',
                      weight: 1,
                    }}
                  >
                    <Popup className="leaflet-popup-dark">
                      <div style={{ backgroundColor: '#1e293b', color: '#e2e8f0', padding: '8px', borderRadius: '6px', fontSize: '12px', minWidth: '160px' }}>
                        <strong style={{ color: '#10b981' }}>{city.name}</strong>
                        <br />
                        Solar Resource: <strong>{city.solarResource.toFixed(2)} kWh/m²/day</strong>
                        <br />
                        State: {city.state}
                      </div>
                    </Popup>
                  </CircleMarker>
                ))}
              </MapContainer>
            </div>
          </Card>

          {/* Legend */}
          <div className="flex flex-wrap gap-6 mt-3 px-1">
            <div>
              <p className="text-xs text-slate-500 mb-1.5 font-medium uppercase tracking-wide">Electricity Price (¢/kWh)</p>
              <div className="flex gap-2 items-center">
                {[
                  { color: '#10b981', label: '≤ 10¢' },
                  { color: '#84cc16', label: '12-16¢' },
                  { color: '#f59e0b', label: '17-24¢' },
                  { color: '#ef4444', label: '>25¢' },
                ].map((item) => (
                  <div key={item.label} className="flex items-center gap-1">
                    <div className="h-3 w-3 rounded-sm" style={{ backgroundColor: item.color }} />
                    <span className="text-xs text-slate-400">{item.label}</span>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs text-slate-500 mb-1.5 font-medium uppercase tracking-wide">Solar Resource (kWh/m²/day)</p>
              <div className="flex gap-2 items-center">
                {[
                  { color: '#6366f1', label: '<4.0' },
                  { color: '#3b82f6', label: '4.0-4.5' },
                  { color: '#10b981', label: '4.5-5.0' },
                  { color: '#f59e0b', label: '5.0-6.0' },
                  { color: '#fbbf24', label: '>6.0' },
                ].map((item) => (
                  <div key={item.label} className="flex items-center gap-1">
                    <div className="h-3 w-3 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="text-xs text-slate-400">{item.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* State Detail Panel */}
        <div className="xl:col-span-1 space-y-4">
          {selectedState.name ? (
            <StateDetailPanel
              selectedState={selectedState}
              onApplyRate={handleApplyRate}
            />
          ) : (
            <Card className="bg-slate-800 border-slate-700">
              <CardContent className="p-5 text-center">
                <MapPin className="h-8 w-8 text-slate-600 mx-auto mb-2" />
                <p className="text-slate-400 text-sm">Click any state on the map to view details</p>
              </CardContent>
            </Card>
          )}

          {/* Top Solar States */}
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader className="pb-2">
              <CardTitle className="text-white text-xs font-medium uppercase tracking-wide flex items-center gap-1">
                <Sun className="h-3.5 w-3.5 text-yellow-400" />
                Top Solar States
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 pt-0">
              <div className="space-y-2">
                {Object.entries(STATE_SOLAR_RESOURCE)
                  .sort(([, a], [, b]) => b - a)
                  .slice(0, 8)
                  .map(([code, resource]) => (
                    <div key={code} className="flex items-center justify-between">
                      <span className="text-xs text-slate-400">{code}</span>
                      <div className="flex items-center gap-2">
                        <div
                          className="h-1.5 rounded-full"
                          style={{
                            width: `${(resource / 7) * 60}px`,
                            backgroundColor: getSolarColor(resource),
                          }}
                        />
                        <span className="text-xs text-slate-300 w-10 text-right">{resource.toFixed(1)}</span>
                      </div>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>

          {/* Cheapest/Most Expensive */}
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader className="pb-2">
              <CardTitle className="text-white text-xs font-medium uppercase tracking-wide flex items-center gap-1">
                <Zap className="h-3.5 w-3.5 text-yellow-400" />
                Electricity Price Extremes
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 pt-0 space-y-3">
              <div>
                <p className="text-xs text-emerald-500 mb-1">Cheapest</p>
                {Object.entries(statePrices)
                  .sort(([, a], [, b]) => a - b)
                  .slice(0, 3)
                  .map(([code, price]) => (
                    <div key={code} className="flex justify-between text-xs">
                      <span className="text-slate-400">{code}</span>
                      <span className="text-emerald-400">{price.toFixed(1)}¢</span>
                    </div>
                  ))}
              </div>
              <div>
                <p className="text-xs text-red-500 mb-1">Most Expensive</p>
                {Object.entries(statePrices)
                  .sort(([, a], [, b]) => b - a)
                  .slice(0, 3)
                  .map(([code, price]) => (
                    <div key={code} className="flex justify-between text-xs">
                      <span className="text-slate-400">{code}</span>
                      <span className="text-red-400">{price.toFixed(1)}¢</span>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

interface StateDetailPanelProps {
  selectedState: {
    name: string | null;
    code: string | null;
    avgElectricityPrice: number | null;
    solarResource: number | null;
  };
  onApplyRate: () => void;
}

function StateDetailPanel({ selectedState, onApplyRate }: StateDetailPanelProps) {
  const coords = selectedState.code ? STATE_COORDS[selectedState.code] : null;

  return (
    <Card className="bg-slate-800 border-slate-700 border-emerald-700/50">
      <CardHeader className="pb-3">
        <CardTitle className="text-white text-sm flex items-center gap-2">
          <MapPin className="h-4 w-4 text-emerald-400" />
          {selectedState.name}
          <Badge className="bg-emerald-900/40 text-emerald-300 border-emerald-700 text-xs ml-auto">
            {selectedState.code}
          </Badge>
        </CardTitle>
        <CardDescription className="text-slate-400 text-xs">
          {coords ? `${coords.lat.toFixed(1)}°N, ${Math.abs(coords.lng).toFixed(1)}°W` : ''}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 pb-4">
        <div className="space-y-3">
          <DataRow
            label="Avg Electricity Price"
            value={selectedState.avgElectricityPrice !== null ? `${selectedState.avgElectricityPrice.toFixed(2)} ¢/kWh` : 'N/A'}
            icon={<Zap className="h-3.5 w-3.5 text-yellow-400" />}
          />
          <DataRow
            label="Solar Resource"
            value={selectedState.solarResource !== null ? `${selectedState.solarResource.toFixed(2)} kWh/m²/day` : 'N/A'}
            icon={<Sun className="h-3.5 w-3.5 text-yellow-400" />}
          />
          {selectedState.solarResource && (
            <DataRow
              label="Est. Solar Capacity Factor"
              value={`${((selectedState.solarResource / 24) * 100).toFixed(1)}%`}
              icon={<Info className="h-3.5 w-3.5 text-blue-400" />}
            />
          )}
        </div>

        <Button
          className="w-full bg-emerald-700 hover:bg-emerald-600 text-white text-sm h-9"
          onClick={onApplyRate}
          disabled={selectedState.avgElectricityPrice === null}
        >
          <ArrowRight className="h-4 w-4 mr-2" />
          Use Rate in Calculator
        </Button>

        <p className="text-xs text-slate-500">
          Updates Tab 2 electricity rate and feeds into AI assistant context.
        </p>
      </CardContent>
    </Card>
  );
}

function DataRow({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-1.5 text-xs text-slate-400">
        {icon}
        {label}
      </div>
      <span className="text-xs font-medium text-slate-200">{value}</span>
    </div>
  );
}
