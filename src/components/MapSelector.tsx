import { useEffect, useState, useRef } from 'react';
import { Button, Spinner } from '@heroui/react';
import { notify } from '../utils/notify';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { getPrecisePosition } from '../utils/geolocation';
import { wgs84ToGcj02, gcj02ToWgs84 } from '../utils/coord';

interface MapSelectorProps {
  center?: [number, number];
  onChange: (lat: number, lng: number) => void;
  lazyInit?: boolean;
  onReady?: () => void;
  overlayVisible?: boolean;
  overlayText?: string;
}

export default function MapSelector({ center, onChange, lazyInit, onReady, overlayVisible, overlayText }: MapSelectorProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const accuracyCircleRef = useRef<L.Circle | null>(null);
  const [position, setPosition] = useState<[number, number]>(center || [39.9042, 116.4074]);
  const [zoom, setZoom] = useState(16);
  const [isLocating, setIsLocating] = useState(false);
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [isReady, setIsReady] = useState(false);

  const markerColor = (() => {
    try {
      return getComputedStyle(document.documentElement).getPropertyValue('--primary-color').trim() || '#007AFF';
    } catch {
      return '#007AFF';
    }
  })();

  const getCurrentPosition = async (): Promise<{ lat: number; lng: number; acc: number }> => {
    const p = await getPrecisePosition({ minSamples: 2, maxSamples: 6, desiredAccuracy: 25, timeoutMs: 15000 });
    return { lat: p.latitude, lng: p.longitude, acc: p.accuracy };
  };

  useEffect(() => {
    const initMap = async () => {
      if (!mapRef.current) {
        console.log('地图容器未就绪');
        return;
      }

      console.log('初始化地图...');

      try {
        let initPosition = position;
        
        if (!center) {
          setIsLocating(true);
          try {
            const pos = await getCurrentPosition();
            initPosition = [pos.lat, pos.lng];
            setPosition(initPosition);
            setAccuracy(pos.acc);
            onChange(initPosition[0], initPosition[1]);
            notify.success('已定位到当前位置');
          } catch (error) {
            console.error('获取当前位置失败:', error);
            notify.warning('无法获取当前位置，使用默认位置');
          } finally {
            setIsLocating(false);
          }
        }

        const gcjCenter = wgs84ToGcj02(initPosition[0], initPosition[1]);
        const map = L.map(mapRef.current, {
          center: gcjCenter,
          zoom: zoom,
          zoomControl: false,
        });

        const tile = L.tileLayer('https://webrd02.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=8&x={x}&y={y}&z={z}', {
          attribution: '&copy; 高德地图',
          maxZoom: 18,
          minZoom: 3,
        }).addTo(map);
        tile.on('load', () => {
          if (!isReady) {
            setIsReady(true);
            try { onReady && onReady(); } catch {}
          }
        });

        mapInstanceRef.current = map;

        const icon = L.divIcon({
          className: 'custom-marker',
          html: `<div style="background-color: ${markerColor}; width: 24px; height: 24px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>`,
          iconSize: [24, 24],
          iconAnchor: [12, 12],
        });

        const marker = L.marker(gcjCenter, { icon }).addTo(map);

        markerRef.current = marker;
        if (accuracy && Number.isFinite(accuracy)) {
          accuracyCircleRef.current = L.circle(gcjCenter, {
            radius: Math.max(accuracy, 5),
            color: markerColor,
            fillColor: markerColor,
            fillOpacity: 0.08,
            weight: 1,
            dashArray: '4,4',
          }).addTo(map);
        }

        map.on('click', (e: any) => {
          // treat clicked latlng as GCJ-02 for Amap tiles, convert back to WGS84 for storage
          const gcjPos: [number, number] = [e.latlng.lat, e.latlng.lng];
          const wgsPos = gcj02ToWgs84(gcjPos[0], gcjPos[1]);
          const newPos: [number, number] = [gcjPos[0], gcjPos[1]];
          console.log('地图点击:', newPos);
          setPosition([wgsPos[0], wgsPos[1]]);
          onChange(wgsPos[0], wgsPos[1]);
          
          if (markerRef.current) {
            markerRef.current.setLatLng(newPos);
          }
          if (accuracyCircleRef.current) {
            accuracyCircleRef.current.setLatLng(newPos);
          }
        });

        console.log('地图初始化完成');
      } catch (error) {
        console.error('地图初始化错误:', error);
        notify.error('地图初始化失败');
      }
    };

    let timer: number | undefined;
    if (lazyInit) {
      timer = window.setTimeout(() => {
        initMap();
      }, 50);
    } else {
      initMap();
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
      if (timer !== undefined) {
        window.clearTimeout(timer);
      }
    };
  }, [lazyInit]);

  useEffect(() => {
    if (center && mapInstanceRef.current) {
      console.log('更新地图中心:', center);
      const gcj = wgs84ToGcj02(center[0], center[1]);
      setPosition(center);
      mapInstanceRef.current.setView(gcj, zoom);
      if (markerRef.current) {
        markerRef.current.setLatLng(gcj);
      }
    }
  }, [center]);

  const handleZoomIn = () => {
    if (mapInstanceRef.current && zoom < 18) {
      const newZoom = zoom + 1;
      console.log('放大到:', newZoom);
      mapInstanceRef.current.setZoom(newZoom);
      setZoom(newZoom);
    }
  };

  const handleZoomOut = () => {
    if (mapInstanceRef.current && zoom > 3) {
      const newZoom = zoom - 1;
      console.log('缩小到:', newZoom);
      mapInstanceRef.current.setZoom(newZoom);
      setZoom(newZoom);
    }
  };

  const handleLocate = async () => {
    setIsLocating(true);
    try {
      const currentPos = await getCurrentPosition();
      console.log('定位到当前位置:', [currentPos.lat, currentPos.lng], 'acc', currentPos.acc);
      
      setPosition([currentPos.lat, currentPos.lng]);
      setAccuracy(currentPos.acc);
      
      if (mapInstanceRef.current) {
        const gcj = wgs84ToGcj02(currentPos.lat, currentPos.lng);
        mapInstanceRef.current.setView(gcj, 16);
      }
      
      if (markerRef.current) {
        const gcj = wgs84ToGcj02(currentPos.lat, currentPos.lng);
        markerRef.current.setLatLng(gcj);
      }
      if (mapInstanceRef.current) {
        const gcj = wgs84ToGcj02(currentPos.lat, currentPos.lng);
        if (accuracyCircleRef.current) {
          accuracyCircleRef.current.setLatLng(gcj);
          accuracyCircleRef.current.setRadius(Math.max(currentPos.acc, 5));
        } else {
          accuracyCircleRef.current = L.circle(gcj, {
            radius: Math.max(currentPos.acc, 5),
            color: markerColor,
            fillColor: markerColor,
            fillOpacity: 0.08,
            weight: 1,
            dashArray: '4,4',
          }).addTo(mapInstanceRef.current);
        }
      }
      
      onChange(currentPos.lat, currentPos.lng);
      notify.success('已定位到当前位置');
    } catch (error) {
      console.error('定位失败:', error);
      notify.error('定位失败，请检查定位权限');
    } finally {
      setIsLocating(false);
    }
  };

  return (
    <div style={{ position: 'relative' }}>
      <div 
        ref={mapRef} 
        style={{ height: '240px', width: '100%', borderRadius: '8px', overflow: 'hidden' }} 
        className="map-selector"
      />
      {(!isReady || overlayVisible) && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'var(--card-bg)',
            color: 'var(--text-secondary)',
            fontSize: 12,
            pointerEvents: 'none',
            zIndex: 1100,
          }}
        >
          <div style={{ pointerEvents: 'none' }}>
            <Spinner label={overlayText || '地图加载中…'} />
          </div>
        </div>
      )}
      <div style={{ 
        position: 'absolute', 
        top: '10px', 
        right: '10px', 
        display: 'flex', 
        flexDirection: 'column', 
        gap: '8px',
        zIndex: 1000
      }}>
        <Button 
          size="sm" 
          radius="lg"
          onClick={handleLocate}
          isLoading={isLocating}
          title="定位到当前位置"
        >
          📍
        </Button>
        <Button 
          size="sm"
          radius="lg"
          onClick={handleZoomIn}
          title="放大"
        >
          +
        </Button>
        <Button 
          size="sm"
          radius="lg"
          onClick={handleZoomOut}
          title="缩小"
        >
          -
        </Button>
      </div>
      <div style={{ 
        position: 'absolute', 
        bottom: '10px', 
        left: '10px', 
        background: 'var(--card-bg)',
        border: '1px solid var(--glass-border)',
        padding: '8px 12px',
        borderRadius: '8px',
        fontSize: '12px',
        color: 'var(--text-main)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        boxShadow: 'var(--shadow-sm)',
        zIndex: 1000
      }}>
        <div style={{ fontWeight: 600 }}>点击地图选择位置</div>
        <div style={{ color: 'var(--text-secondary)', marginTop: '4px' }}>
          当前: {position[0].toFixed(6)}, {position[1].toFixed(6)}
        </div>
        {accuracy !== null && (
          <div style={{ color: 'var(--text-secondary)', marginTop: '4px' }}>
            精度: {Math.round(accuracy)} 米
          </div>
        )}
      </div>
    </div>
  );
}
