import { useState, useEffect } from 'react';
import { Card, Button, Descriptions, Tag, Space, message, Spin, Result } from 'antd';
import { EnvironmentOutlined, CheckCircleOutlined, CloseCircleOutlined, LogoutOutlined, HistoryOutlined } from '@ant-design/icons';
import { commands } from '../api/tauri';
import { useAuthStore } from '../store/authStore';
import { useNavigate } from 'react-router-dom';
import type { AttendanceRecord, Location } from '../types';
import dayjs from 'dayjs';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './UserDashboard.css';

export default function UserDashboard() {
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [checkingIn, setCheckingIn] = useState(false);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [lastRecord, setLastRecord] = useState<AttendanceRecord | null>(null);
  const [assignedLocation, setAssignedLocation] = useState<Location | null>(null);
  const [map, setMap] = useState<L.Map | null>(null);
  const [currentMarker, setCurrentMarker] = useState<L.Marker | null>(null);
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const navigate = useNavigate();

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
      setRecords(data);
      if (data.length > 0) {
        setLastRecord(data[0]);
      }
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
        if (response.record) {
          setLastRecord(response.record);
        }
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

  if (!user) {
    return null;
  }

  return (
    <div className="user-dashboard">
      <Card className="dashboard-card">
        <div className="dashboard-header">
          <h2>欢迎，{user.username}</h2>
          <Button icon={<LogoutOutlined />} onClick={handleLogout}>
            退出登录
          </Button>
        </div>

        {!assignedLocation ? (
          <Card className="warning-card">
            <Result
              status="warning"
              title="未分配打卡位置"
              subTitle="请联系管理员为您分配打卡位置"
            />
          </Card>
        ) : (
          <Spin spinning={loading}>
            <Card className="location-card" title={<><EnvironmentOutlined /> 当前位置</>}>
              {location ? (
                <Descriptions column={1}>
                  <Descriptions.Item label="纬度">{location.latitude.toFixed(6)}</Descriptions.Item>
                  <Descriptions.Item label="经度">{location.longitude.toFixed(6)}</Descriptions.Item>
                </Descriptions>
              ) : (
                <p>正在获取位置...</p>
              )}
              <Button onClick={getCurrentLocation} style={{ marginTop: 10 }}>
                刷新位置
              </Button>
            </Card>

            <Card className="map-card" title="位置地图">
              <div id="user-map" style={{ height: '400px', width: '100%', borderRadius: '8px' }}></div>
              <div style={{ marginTop: '10px', fontSize: '12px', color: '#666' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#1890ff' }}></div>
                  <span>当前位置</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#52c41a' }}></div>
                  <span>打卡位置 (半径: {assignedLocation.radius}米)</span>
                </div>
              </div>
            </Card>

            <Card className="checkin-card">
              <Button
                type="primary"
                size="large"
                icon={<CheckCircleOutlined />}
                onClick={handleCheckIn}
                loading={checkingIn}
                disabled={!location}
                block
                className="checkin-button"
              >
                立即打卡
              </Button>
            </Card>

            {lastRecord && (
              <Card className="last-record-card" title={<><HistoryOutlined /> 最近打卡记录</>}>
                <Descriptions column={1}>
                  <Descriptions.Item label="时间">
                    {dayjs(lastRecord.timestamp * 1000).format('YYYY-MM-DD HH:mm:ss')}
                  </Descriptions.Item>
                  <Descriptions.Item label="状态">
                    {lastRecord.status === 'success' ? (
                      <Tag icon={<CheckCircleOutlined />} color="success">
                        打卡成功
                      </Tag>
                    ) : (
                      <Tag icon={<CloseCircleOutlined />} color="error">
                        打卡失败
                      </Tag>
                    )}
                  </Descriptions.Item>
                  <Descriptions.Item label="位置">
                    {lastRecord.latitude.toFixed(6)}, {lastRecord.longitude.toFixed(6)}
                  </Descriptions.Item>
                  {lastRecord.errorMessage && (
                    <Descriptions.Item label="失败原因">
                      {lastRecord.errorMessage}
                    </Descriptions.Item>
                  )}
                </Descriptions>
              </Card>
            )}

            <Card className="history-card" title="打卡历史">
              {records.length === 0 ? (
                <Result status="info" title="暂无打卡记录" />
              ) : (
                <Space direction="vertical" style={{ width: '100%' }} size="middle">
                  {records.map((record) => (
                    <Card key={record.id} size="small">
                      <Descriptions column={2} size="small">
                        <Descriptions.Item label="时间" span={2}>
                          {dayjs(record.timestamp * 1000).format('YYYY-MM-DD HH:mm:ss')}
                        </Descriptions.Item>
                        <Descriptions.Item label="状态">
                          {record.status === 'success' ? (
                            <Tag icon={<CheckCircleOutlined />} color="success">
                              成功
                            </Tag>
                          ) : (
                            <Tag icon={<CloseCircleOutlined />} color="error">
                              失败
                            </Tag>
                          )}
                        </Descriptions.Item>
                        <Descriptions.Item label="位置">
                          {record.latitude.toFixed(4)}, {record.longitude.toFixed(4)}
                        </Descriptions.Item>
                        {record.errorMessage && (
                          <Descriptions.Item label="原因" span={2}>
                            {record.errorMessage}
                          </Descriptions.Item>
                        )}
                      </Descriptions>
                    </Card>
                  ))}
                </Space>
              )}
            </Card>
          </Spin>
        )}
      </Card>
    </div>
  );
}
