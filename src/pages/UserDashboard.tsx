import { useState, useEffect } from 'react';
import { Button, message, Spin, Result } from 'antd';
import { EnvironmentOutlined, CheckCircleOutlined, CloseCircleOutlined, LogoutOutlined, HistoryOutlined } from '@ant-design/icons';
import { commands } from '../api/tauri';
import { useAuthStore } from '../store/authStore';
import { useNavigate } from 'react-router-dom';
import type { AttendanceRecord, Location } from '../types';
import dayjs from 'dayjs';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import MobileLayout from '../components/MobileLayout';
import './UserDashboard.css';

export default function UserDashboard() {
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [checkingIn, setCheckingIn] = useState(false);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [assignedLocation, setAssignedLocation] = useState<Location | null>(null);
  const [map, setMap] = useState<L.Map | null>(null);
  const [currentMarker, setCurrentMarker] = useState<L.Marker | null>(null);
  const [currentTime, setCurrentTime] = useState(dayjs());
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(dayjs());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (user) {
      loadRecords();
      loadAssignedLocation();
      getCurrentLocation();
    }
  }, [user]);

  useEffect(() => {
    if (location && assignedLocation && !map) {
      initMap();
    }
  }, [location, assignedLocation, map]);

  const loadAssignedLocation = async () => {
    if (!user) return;
    try {
      const loc = await commands.getUserLocation(user.id);
      setAssignedLocation(loc);
    } catch (error: any) {
      console.error('加载打卡位置失败:', error);
    }
  };

  const initMap = () => {
    if (!location || !assignedLocation) return;

    const mapElement = document.getElementById('user-map');
    if (!mapElement) return;

    const mapInstance = L.map('user-map', {
      center: [location.latitude, location.longitude],
      zoom: 16,
      zoomControl: false,
    });

    L.tileLayer('https://webrd02.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=8&x={x}&y={y}&z={z}', {
      attribution: '&copy; 高德地图',
      maxZoom: 18,
      minZoom: 3,
    }).addTo(mapInstance);

    const currentIcon = L.divIcon({
      className: 'current-marker',
      html: '<div style="background-color: #1890ff; width: 20px; height: 20px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>',
      iconSize: [20, 20],
      iconAnchor: [10, 10],
    });

    const currentMarkerInstance = L.marker([location.latitude, location.longitude], { icon: currentIcon })
      .addTo(mapInstance)
      .bindPopup('当前位置');

    const locationIcon = L.divIcon({
      className: 'location-marker',
      html: '<div style="background-color: #52c41a; width: 24px; height: 24px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>',
      iconSize: [24, 24],
      iconAnchor: [12, 12],
    });

    L.marker([assignedLocation.latitude, assignedLocation.longitude], { icon: locationIcon })
      .addTo(mapInstance)
      .bindPopup(`打卡位置: ${assignedLocation.name}`);

    L.circle([assignedLocation.latitude, assignedLocation.longitude], {
      radius: assignedLocation.radius,
      color: '#52c41a',
      fillColor: '#52c41a',
      fillOpacity: 0.2,
    }).addTo(mapInstance);

    const bounds = L.latLngBounds([
      [location.latitude, location.longitude],
      [assignedLocation.latitude, assignedLocation.longitude],
    ]);
    mapInstance.fitBounds(bounds, { padding: [50, 50] });

    setMap(mapInstance);
    setCurrentMarker(currentMarkerInstance);
  };

  const getCurrentLocation = () => {
    setLoading(true);
    if (!navigator.geolocation) {
      message.error('您的浏览器不支持地理位置功能');
      setLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const newLocation = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        };
        setLocation(newLocation);
        
        if (currentMarker) {
          currentMarker.setLatLng([newLocation.latitude, newLocation.longitude]);
        }
        
        setLoading(false);
      },
      (error) => {
        message.error(`获取位置失败: ${error.message}`);
        console.error(error);
        setLoading(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  };

  const loadRecords = async () => {
    if (!user) return;
    try {
      const data = await commands.getAttendanceRecords(user.id);
      setRecords(data.slice(0, 10)); // 只显示最近10条
    } catch (error: any) {
      const errorMessage = error?.message || error || '加载打卡记录失败';
      message.error(errorMessage);
      console.error(error);
    }
  };

  const handleCheckIn = async () => {
    if (!user || !location) return;

    setCheckingIn(true);
    try {
      const response = await commands.checkIn({
        user_id: user.id,
        latitude: location.latitude,
        longitude: location.longitude,
      });

      if (response.success) {
        message.success(response.message || '打卡成功');
        loadRecords();
      } else {
        message.error(response.message || '打卡失败');
      }
    } catch (error: any) {
      const errorMessage = error?.message || error || '打卡失败，请重试';
      message.error(errorMessage);
      console.error(error);
    } finally {
      setCheckingIn(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isWithinRange = () => {
    if (!location || !assignedLocation) return false;
    const from = L.latLng(location.latitude, location.longitude);
    const to = L.latLng(assignedLocation.latitude, assignedLocation.longitude);
    const distance = from.distanceTo(to);
    return distance <= assignedLocation.radius;
  };

  if (!user) {
    return null;
  }

  return (
    <MobileLayout
      title="工作台"
      headerExtra={
        <Button 
          type="text" 
          icon={<LogoutOutlined />} 
          onClick={handleLogout}
          style={{ color: 'var(--text-secondary)' }}
        >
          退出
        </Button>
      }
    >
      <div className="user-info-bar">
        <div className="user-avatar">
          {user.username.substring(0, 1).toUpperCase()}
        </div>
        <div className="user-details">
          <h3>{user.username}</h3>
          <p>{user.role === 'admin' ? '管理员' : '普通员工'}</p>
        </div>
      </div>

      {!assignedLocation ? (
        <div className="app-card" style={{ textAlign: 'center', padding: '40px 20px' }}>
          <Result
            status="warning"
            title="未分配打卡位置"
            subTitle="请联系管理员为您分配打卡位置"
          />
        </div>
      ) : (
        <>
          <div className="map-container-wrapper">
            <div id="user-map"></div>
            {loading && (
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.7)', zIndex: 1000 }}>
                <Spin tip="定位中..." />
              </div>
            )}
          </div>

          <div className="app-card check-in-card">
            <div className="card-header">
              <h3>打卡上报</h3>
              <span className="current-date">{currentTime.format('YYYY年MM月DD日')}</span>
            </div>
            
            <div className="clock-display">
              <div className="time">{currentTime.format('HH:mm:ss')}</div>
              <div className="location-info">
                <EnvironmentOutlined /> {assignedLocation.name}
              </div>
            </div>

            <div className="action-area">
              <button 
                className={`check-in-button ${!isWithinRange() ? 'disabled' : ''} ${checkingIn ? 'loading' : ''}`}
                onClick={handleCheckIn}
                disabled={checkingIn || !isWithinRange()}
              >
                <div className="button-content">
                  <span className="button-text">{checkingIn ? '打卡中' : '上班打卡'}</span>
                </div>
              </button>
              
              {!isWithinRange() && (
                <div className="range-warning">
                  <CloseCircleOutlined /> 您不在打卡范围内
                </div>
              )}
            </div>
          </div>

          <div className="app-card">
            <div className="card-header">
              <h3>打卡记录</h3>
              <HistoryOutlined />
            </div>
            <div className="records-list">
              {records.length > 0 ? (
                records.map((record) => (
                  <div key={record.id} className="record-item">
                    <div className="record-time">
                      {dayjs(record.timestamp * 1000).format('HH:mm')}
                    </div>
                    <div className="record-info">
                      <div className="record-status">
                        <CheckCircleOutlined style={{ color: 'var(--success-color)' }} />
                        <span>打卡成功</span>
                      </div>
                      <div className="record-loc">
                        {assignedLocation.name}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="empty-records">今日暂无打卡记录</div>
              )}
            </div>
          </div>
        </>
      )}
    </MobileLayout>
  );
}
