import { useEffect } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet.heat';

interface HeatmapLayerProps {
  points: Array<[number, number, number]>;
  visible: boolean;
}

export function HeatmapLayer({ points, visible }: HeatmapLayerProps) {
  const map = useMap();

  useEffect(() => {
    if (!visible || points.length === 0) return;

    const layer = L.heatLayer(points, {
      radius: 45,
      blur: 35,
      maxZoom: 2,
      max: 1,
      minOpacity: 0.25,
      gradient: { 0.2: '#1baf7a', 0.5: '#eda100', 0.75: '#ec835a', 1.0: '#d03b3b' },
    });
    layer.addTo(map);

    return () => {
      map.removeLayer(layer);
    };
  }, [map, points, visible]);

  return null;
}
