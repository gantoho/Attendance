import { useState, useEffect, useMemo } from 'react';
import { Button, Spinner, Chip, Card, CardBody, Avatar } from '@heroui/react';
import { MapPin, CheckCircle2, XCircle, LogOut, History, RefreshCcw, Sunrise, Sunset } from 'lucide-react';
import { commands } from '../api';
import { useAuthStore } from '../store/authStore';
import { useNavigate } from 'react-router-dom';
import type { AttendanceRecord, Location } from '../types';
import dayjs from 'dayjs';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import MobileLayout from '../components/MobileLayout';
import ThemeToggle from '../components/ThemeToggle';
import './UserDashboard.css';
import { getPrecisePosition } from '../utils/geolocation';
import { wgs84ToGcj02, haversine } from '../utils/coord';
import { notify } from '../utils/notify';

function getCssVar(name: string, fallback: string): string {
  try {
    const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    return v || fallback;
  } catch {
    return fallback;
  }
}

type CheckState = 'in' | 'out' | 'done';

export default function UserDashboard() {
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [checkingIn, setCheckingIn] = useState(false);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [assignedLocation, setAssignedLocation] = useState<Location | null>(null);
  const [map, setMap] = useState<L.Map | null>(null);
  const [currentMarker, setCurrentMarker] = useState<L.Marker | null>(null);
  const [accuracyCircle, setAccuracyCircle] = useState<L.Circle | null>(null);
  const [locationAccuracy, setLocationAccuracy] = useState<number | null>(null);
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

  // 今日打卡状态机：0 次成功 → 上班卡，1 次成功 → 下班卡，2 次成功 → 已完成
  const todayRecords = useMemo(
    () =>
      records
        .filter((r) => dayjs(r.timestamp * 1000).isSame(dayjs(), 'day'))
        .sort((a, b) => a.timestamp - b.timestamp),
    [records]
  );
  const successToday = useMemo(() => todayRecords.filter((r) => r.status === 'success'), [todayRecords]);
  const morningRecord = successToday[0] ?? null;
  const eveningRecord = successToday[1] ?? null;
  const checkState: CheckState = successToday.length === 0 ? 'in' : successToday.length === 1 ? 'out' : 'done';

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

    const currentGcj = wgs84ToGcj02(location.latitude, location.longitude);
    const assignedGcj = wgs84ToGcj02(assignedLocation.latitude, assignedLocation.longitude);

    const primaryColor = getCssVar('--primary-color', '#007AFF');
    const successColor = getCssVar('--success-color', '#34C759');

    const mapInstance = L.map('user-map', {
      center: [currentGcj[0], currentGcj[1]],
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
      html: `<div style="background-color: ${primaryColor}; width: 20px; height: 20px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>`,
      iconSize: [20, 20],
      iconAnchor: [10, 10],
    });

    const currentMarkerInstance = L.marker([currentGcj[0], currentGcj[1]], { icon: currentIcon })
      .addTo(mapInstance)
      .bindPopup('当前位置');

    const locationIcon = L.divIcon({
      className: 'location-marker',
      html: `<div style="background-color: ${successColor}; width: 24px; height: 24px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>`,
      iconSize: [24, 24],
      iconAnchor: [12, 12],
    });

    L.marker([assignedGcj[0], assignedGcj[1]], { icon: locationIcon })
      .addTo(mapInstance)
      .bindPopup(`打卡位置: ${assignedLocation.name}`);

    L.circle([assignedGcj[0], assignedGcj[1]], {
      radius: assignedLocation.radius,
      color: successColor,
      fillColor: successColor,
      fillOpacity: 0.2,
    }).addTo(mapInstance);

    if (locationAccuracy && Number.isFinite(locationAccuracy)) {
      const accCircle = L.circle([currentGcj[0], currentGcj[1]], {
        radius: Math.max(locationAccuracy, 5),
        color: primaryColor,
        fillColor: primaryColor,
        fillOpacity: 0.1,
        weight: 1,
        dashArray: '4,4',
      }).addTo(mapInstance);
      setAccuracyCircle(accCircle);
    }

    const bounds = L.latLngBounds([[currentGcj[0], currentGcj[1]], [assignedGcj[0], assignedGcj[1]]]);
    mapInstance.fitBounds(bounds, { padding: [50, 50] });

    setMap(mapInstance);
    setCurrentMarker(currentMarkerInstance);
  };

  const getCurrentLocation = async () => {
    setLoading(true);
    try {
      const pos = await getPrecisePosition({ minSamples: 2, maxSamples: 6, desiredAccuracy: 25, timeoutMs: 15000 });
      const newLocation = { latitude: pos.latitude, longitude: pos.longitude };
      setLocationAccuracy(pos.accuracy);
      setLocation(newLocation);
      if (currentMarker) {
        const gcj = wgs84ToGcj02(newLocation.latitude, newLocation.longitude);
        currentMarker.setLatLng([gcj[0], gcj[1]]);
      }
      if (map) {
        const gcj = wgs84ToGcj02(newLocation.latitude, newLocation.longitude);
        const primaryColor = getCssVar('--primary-color', '#007AFF');
        if (accuracyCircle) {
          accuracyCircle.setLatLng([gcj[0], gcj[1]]);
          accuracyCircle.setRadius(Math.max(pos.accuracy, 5));
        } else {
          const circle = L.circle([gcj[0], gcj[1]], {
            radius: Math.max(pos.accuracy, 5),
            color: primaryColor,
            fillColor: primaryColor,
            fillOpacity: 0.1,
            weight: 1,
            dashArray: '4,4',
          }).addTo(map);
          setAccuracyCircle(circle);
        }
      }
    } catch (error: any) {
      const errorMessage = error?.message || error || '获取位置失败';
      notify.error(`${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const loadRecords = async () => {
    if (!user) return;
    try {
      const data = await commands.getAttendanceRecords(user.id);
      const sorted = [...data].sort((a, b) => b.timestamp - a.timestamp);
      setRecords(sorted.slice(0, 10)); // 只显示最近10条
    } catch (error: any) {
      const errorMessage = error?.message || error || '加载打卡记录失败';
      notify.error(errorMessage);
      console.error(error);
    }
  };

  const handleCheckIn = async () => {
    if (!user || !location) return;
    if (checkState === 'done') return;

    setCheckingIn(true);
    try {
      const response = await commands.checkIn({
        user_id: user.id,
        latitude: location.latitude,
        longitude: location.longitude,
      });

      if (response.success) {
        notify.success(response.message || '打卡成功');
        loadRecords();
      } else {
        notify.error(response.message || '打卡失败');
      }
    } catch (error: any) {
      const errorMessage = error?.message || error || '打卡失败，请重试';
      notify.error(errorMessage);
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
    const distance = haversine(location.latitude, location.longitude, assignedLocation.latitude, assignedLocation.longitude);
    return distance <= assignedLocation.radius;
  };

  if (!user) {
    return null;
  }

  return (
    <MobileLayout
      title="工作台"
      headerExtra={
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <ThemeToggle />
          <Button
            size="md"
            radius="lg"
            variant="light"
            startContent={<LogOut />}
            onPress={handleLogout}
            className="text-[var(--text-secondary)]"
          >
            退出
          </Button>
        </div>
      }
    >
      <Card className="mb-3" radius="lg" shadow="sm">
        <CardBody className="flex flex-row items-center gap-3">
          <Avatar name={user.username.substring(0, 1).toUpperCase()} color="primary" isBordered size="md" />
          <div className="user-details">
            <h3>{user.username}</h3>
            <p>{user.role === 'admin' ? '管理员' : '普通员工'}</p>
          </div>
        </CardBody>
      </Card>

      {!assignedLocation ? (
        <Card className="mb-3" radius="lg" shadow="sm">
          <CardBody className="flex flex-col items-center gap-3 py-10">
            <Chip color="warning" variant="flat">未分配打卡位置</Chip>
            <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>请联系管理员为您分配打卡位置</div>
          </CardBody>
        </Card>
      ) : (
        <>
          <div className="map-container-wrapper">
            <div id="user-map"></div>
            {locationAccuracy !== null && (
              <div style={{ position: 'absolute', left: 12, top: 12, background: 'var(--card-bg)', border: '1px solid var(--glass-border)', padding: '6px 10px', borderRadius: 8, fontSize: 12, color: 'var(--text-main)', zIndex: 1100 }}>
                精度: {Math.round(locationAccuracy)} 米
              </div>
            )}
            <Button
              size="md"
              radius="lg"
              color="primary"
              startContent={<RefreshCcw />}
              onPress={getCurrentLocation}
              isLoading={loading}
              style={{ position: 'absolute', right: 12, top: 12, zIndex: 1100 }}
              title="重新定位"
            >
              刷新定位
            </Button>
            {loading && (
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--card-bg)', zIndex: 1000 }}>
                <Spinner label="定位中..." />
              </div>
            )}
          </div>

          <Card className="check-in-card mb-3" radius="lg" shadow="sm">
            <CardBody>
              <div className="card-header">
                <h3>今日打卡</h3>
                <span className="current-date">{currentTime.format('YYYY年MM月DD日')}</span>
              </div>

              <div className="daily-status">
                <div className={`daily-chip ${morningRecord ? 'done' : ''}`}>
                  <Sunrise size={14} />
                  <span>上班卡</span>
                  <em>{morningRecord ? dayjs(morningRecord.timestamp * 1000).format('HH:mm') : '未打卡'}</em>
                </div>
                <div className={`daily-chip ${eveningRecord ? 'done' : ''}`}>
                  <Sunset size={14} />
                  <span>下班卡</span>
                  <em>{eveningRecord ? dayjs(eveningRecord.timestamp * 1000).format('HH:mm') : '未打卡'}</em>
                </div>
              </div>

              <div className="clock-display">
                <div className="time">{currentTime.format('HH:mm:ss')}</div>
                <div className="location-info">
                  <MapPin size={16} /> {assignedLocation.name}
                </div>
              </div>

              <div className="action-area">
                <button
                  type="button"
                  className={`check-in-button ${checkingIn ? 'loading' : ''} ${checkState === 'done' ? 'done' : ''} ${!isWithinRange() && checkState !== 'done' ? 'disabled' : ''}`}
                  disabled={checkingIn || checkState === 'done' || !isWithinRange()}
                  onClick={handleCheckIn}
                >
                  {checkingIn ? (
                    <span className="button-spinner" />
                  ) : (
                    <>
                      <span className="button-text">{checkState === 'done' ? '已完成' : checkState === 'out' ? '下班打卡' : '上班打卡'}</span>
                      <span className="button-sub">{checkState === 'done' ? '明天再见~' : checkState === 'out' ? '打完卡就可以下班啦' : '点击开始上班'}</span>
                    </>
                  )}
                </button>

                {checkState === 'done' && (
                  <div className="range-warning" style={{ color: 'var(--success-color)' }}>
                    <CheckCircle2 size={16} /> 今日上下班卡均已打卡成功
                  </div>
                )}
                {checkState !== 'done' && !isWithinRange() && (
                  <div className="range-warning">
                    <XCircle size={16} /> 您不在打卡范围内
                  </div>
                )}
                {locationAccuracy !== null && locationAccuracy > 50 && checkState !== 'done' && (
                  <div className="range-warning" style={{ marginTop: 8 }}>
                    <XCircle size={16} /> 当前定位精度较低（约 {Math.round(locationAccuracy)} 米），建议移动到空旷处或稍候再定位
                  </div>
                )}
              </div>
            </CardBody>
          </Card>

          <Card className="mb-3" radius="lg" shadow="sm">
            <CardBody>
              <div className="card-header">
                <h3>打卡记录</h3>
                <History size={18} style={{ color: 'var(--text-secondary)' }} />
              </div>
              <div className="records-list">
                {records.length > 0 ? (
                  records.map((record) => {
                    const isSuccess = record.status === 'success';
                    const typeLabel = record.checkType === 'out' ? '下班卡' : record.checkType === 'in' ? '上班卡' : isSuccess ? '打卡' : '异常';
                    return (
                      <div key={record.id} className="record-item">
                        <div className="record-time">
                          {dayjs(record.timestamp * 1000).format('HH:mm')}
                        </div>
                        <div className="record-info">
                          <div className="record-status">
                            {isSuccess ? (
                              <CheckCircle2 size={16} style={{ color: 'var(--success-color)' }} />
                            ) : (
                              <XCircle size={16} style={{ color: 'var(--error-color)' }} />
                            )}
                            <span>{isSuccess ? '打卡成功' : '打卡失败'}</span>
                            <Chip size="sm" color={isSuccess ? (record.checkType === 'out' ? 'warning' : 'success') : 'danger'} variant="flat" className="ml-1">
                              {typeLabel}
                            </Chip>
                          </div>
                          <div className="record-loc">
                            {dayjs(record.timestamp * 1000).format('MM月DD日')} · {assignedLocation.name}
                          </div>
                          {!isSuccess && record.errorMessage && (
                            <div className="record-error">{record.errorMessage}</div>
                          )}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="empty-records">今日暂无打卡记录</div>
                )}
              </div>
            </CardBody>
          </Card>
        </>
      )}
    </MobileLayout>
  );
}
