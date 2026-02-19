import { useEffect, useState, useRef } from 'react';
import { message, Button } from 'antd';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface MapSelectorProps {
  center?: [number, number];
  onChange: (lat: number, lng: number) => void;
}

export default function MapSelector({ center, onChange }: MapSelectorProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const [position, setPosition] = useState<[number, number]>(center || [39.9042, 116.4074]);
  const [zoom, setZoom] = useState(16);
  const [isLocating, setIsLocating] = useState(false);

  const getCurrentPosition = (): Promise<[number, number]> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('浏览器不支持地理位置'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const { latitude, longitude } = pos.coords;
          console.log('获取到当前位置:', latitude, longitude);
          resolve([latitude, longitude]);
        },
        (err) => {
          console.error('获取位置失败:', err);
          reject(err);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        }
      );
    });
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
            initPosition = await getCurrentPosition();
            setPosition(initPosition);
            onChange(initPosition[0], initPosition[1]);
            message.success('已定位到当前位置');
          } catch (error) {
            console.error('获取当前位置失败:', error);
            message.warning('无法获取当前位置，使用默认位置');
          } finally {
            setIsLocating(false);
          }
        }

        const map = L.map(mapRef.current, {
          center: initPosition,
          zoom: zoom,
          zoomControl: false,
        });

        L.tileLayer('https://webrd02.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=8&x={x}&y={y}&z={z}', {
          attribution: '&copy; 高德地图',
          maxZoom: 18,
          minZoom: 3,
        }).addTo(map);

        mapInstanceRef.current = map;

        const icon = L.divIcon({
          className: 'custom-marker',
          html: '<div style="background-color: #ff4444; width: 24px; height: 24px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>',
          iconSize: [24, 24],
          iconAnchor: [12, 12],
        });

        const marker = L.marker(initPosition, { icon }).addTo(map);

        markerRef.current = marker;

        map.on('click', (e: any) => {
          const newPos: [number, number] = [e.latlng.lat, e.latlng.lng];
          console.log('地图点击:', newPos);
          setPosition(newPos);
          onChange(newPos[0], newPos[1]);
          
          if (markerRef.current) {
            markerRef.current.setLatLng(newPos);
          }
        });

        console.log('地图初始化完成');
      } catch (error) {
        console.error('地图初始化错误:', error);
        message.error('地图初始化失败');
      }
    };

    initMap();

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (center && mapInstanceRef.current) {
      console.log('更新地图中心:', center);
      setPosition(center);
      mapInstanceRef.current.setView(center, zoom);
      if (markerRef.current) {
        markerRef.current.setLatLng(center);
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
      console.log('定位到当前位置:', currentPos);
      
      setPosition(currentPos);
      
      if (mapInstanceRef.current) {
        mapInstanceRef.current.setView(currentPos, 16);
      }
      
      if (markerRef.current) {
        markerRef.current.setLatLng(currentPos);
      }
      
      onChange(currentPos[0], currentPos[1]);
      
      message.success('已定位到当前位置');
    } catch (error) {
      console.error('定位失败:', error);
      message.error('定位失败，请检查定位权限');
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
          size="small" 
          onClick={handleLocate}
          loading={isLocating}
          style={{ borderRadius: '4px' }}
          title="定位到当前位置"
        >
          📍
        </Button>
        <Button 
          size="small" 
          onClick={handleZoomIn}
          style={{ borderRadius: '4px' }}
          title="放大"
        >
          +
        </Button>
        <Button 
          size="small" 
          onClick={handleZoomOut}
          style={{ borderRadius: '4px' }}
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
      </div>
    </div>
  );
}
