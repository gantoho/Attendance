import { useEffect, useState } from 'react';
import { Button, Modal, ModalBody, ModalContent, ModalFooter, ModalHeader, Input, Select, SelectItem, Spinner, Chip, Card, CardBody } from '@heroui/react';
import { User as UserIcon, MapPin, History, LogOut, Plus, Edit, Trash2 } from 'lucide-react';
import dayjs from 'dayjs';
import { useNavigate } from 'react-router-dom';
import { commands } from '../api';
import { useAuthStore } from '../store/authStore';
import { useAdminDataStore } from '../store/adminDataStore';
import type { User, Location } from '../types';
import MapSelector from '../components/MapSelector';
import MobileLayout from '../components/MobileLayout';
import ThemeToggle from '../components/ThemeToggle';
import './AdminDashboard.css';
import { getPrecisePosition } from '../utils/geolocation';
import { notify } from '../utils/notify';

export default function AdminDashboard() {
  const [selectedMenu, setSelectedMenu] = useState<'users' | 'locations' | 'records'>('users');
  const [userModalVisible, setUserModalVisible] = useState(false);
  const [locationModalVisible, setLocationModalVisible] = useState(false);
  const [editingLocation, setEditingLocation] = useState<Location | null>(null);
  const [mapPosition, setMapPosition] = useState<[number, number]>([39.9042, 116.4074]);
  const [assignLocationModalVisible, setAssignLocationModalVisible] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [locationMapReady, setLocationMapReady] = useState(false);
  const [latLngSelected, setLatLngSelected] = useState(false);
  const [userFormState, setUserFormState] = useState<{ username: string; password: string }>({ username: '', password: '' });
  const [locFormState, setLocFormState] = useState<{ name: string; latitude?: number; longitude?: number; radius: number }>({ name: '', radius: 200 });
  const [assignLocId, setAssignLocId] = useState<string | null>(null);

  const users = useAdminDataStore((s) => s.users);
  const locations = useAdminDataStore((s) => s.locations);
  const records = useAdminDataStore((s) => s.records);
  const loadingUsers = useAdminDataStore((s) => s.loading.users);
  const loadingLocations = useAdminDataStore((s) => s.loading.locations);
  const loadingRecords = useAdminDataStore((s) => s.loading.records);
  const setAdmin = useAdminDataStore((s) => s.setAdmin);
  const loadUsers = useAdminDataStore((s) => s.loadUsers);
  const loadLocations = useAdminDataStore((s) => s.loadLocations);
  const loadRecords = useAdminDataStore((s) => s.loadRecords);
  const refreshUsers = useAdminDataStore((s) => s.refreshUsers);
  const refreshLocations = useAdminDataStore((s) => s.refreshLocations);

  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const navigate = useNavigate();

  const getCurrentPosition = async () => {
    const p = await getPrecisePosition({ minSamples: 2, maxSamples: 6, desiredAccuracy: 25, timeoutMs: 15000 });
    return p;
  };

  useEffect(() => {
    if (!user) return;
    setAdmin(user.id);
    const needLocations = selectedMenu === 'users' || selectedMenu === 'locations' || selectedMenu === 'records';
    if (needLocations) {
      loadLocations();
    }
    if (selectedMenu === 'users') {
      loadUsers();
    } else if (selectedMenu === 'records') {
      loadRecords();
    }
  }, [user, selectedMenu]);

  const handleCreateUser = async (values: { username: string; password: string }) => {
    if (!user) return;
    try {
      await commands.createUser({
        username: values.username,
        password: values.password,
        role: 'user',
        adminId: user.id,
      });
      notify.success('创建用户成功');
      setUserModalVisible(false);
      setUserFormState({ username: '', password: '' });
      await refreshUsers();
    } catch (error: any) {
      const errorMessage = error?.message || error || '创建用户失败';
      notify.error(errorMessage);
      console.error(error);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    try {
      await commands.deleteUser(userId);
      notify.success('删除用户成功');
      await refreshUsers();
    } catch (error: any) {
      const errorMessage = error?.message || error || '删除用户失败';
      notify.error(errorMessage);
      console.error(error);
    }
  };

  const handleCreateLocation = async (values: { name: string; latitude: number; longitude: number; radius: number }) => {
    if (!user) return;
    try {
      await commands.createLocation({
        name: values.name,
        latitude: values.latitude,
        longitude: values.longitude,
        radius: values.radius,
        adminId: user.id,
      });
      notify.success('创建位置成功');
      setLocationModalVisible(false);
      setLocFormState({ name: '', radius: 200, latitude: undefined, longitude: undefined });
      await refreshLocations();
    } catch (error: any) {
      const errorMessage = error?.message || error || '创建位置失败';
      notify.error(errorMessage);
      console.error(error);
    }
  };

  const handleUpdateLocation = async (values: { name: string; latitude: number; longitude: number; radius: number }) => {
    if (!editingLocation) return;
    try {
      await commands.updateLocation(editingLocation.id, {
        name: values.name,
        latitude: values.latitude,
        longitude: values.longitude,
        radius: values.radius,
      });
      notify.success('更新位置成功');
      setLocationModalVisible(false);
      setEditingLocation(null);
      setLocFormState({ name: '', radius: 200, latitude: undefined, longitude: undefined });
      await refreshLocations();
    } catch (error: any) {
      const errorMessage = error?.message || error || '更新位置失败';
      notify.error(errorMessage);
      console.error(error);
    }
  };

  const handleDeleteLocation = async (locationId: string) => {
    try {
      await commands.deleteLocation(locationId);
      notify.success('删除位置成功');
      await refreshLocations();
    } catch (error: any) {
      const errorMessage = error?.message || error || '删除位置失败';
      notify.error(errorMessage);
      console.error(error);
    }
  };

  const handleEditLocation = (location: Location) => {
    setEditingLocation(location);
    setLocFormState({ name: location.name, latitude: location.latitude, longitude: location.longitude, radius: location.radius });
    setMapPosition([location.latitude, location.longitude]);
    setLatLngSelected(true);
    setLocationMapReady(false);
    setLocationModalVisible(true);
  };

  const handleAssignLocation = (user: User) => {
    setSelectedUser(user);
    setAssignLocId(user.locationId || null);
    setAssignLocationModalVisible(true);
  };

  const handleAssignLocationSubmit = async (values: { locationId: string }) => {
    if (!selectedUser) return;
    try {
      await commands.updateUserLocation(selectedUser.id, values.locationId);
      notify.success('分配位置成功');
      setAssignLocationModalVisible(false);
      setSelectedUser(null);
      await refreshUsers();
    } catch (error: any) {
      const errorMessage = error?.message || error || '分配位置失败';
      notify.error(errorMessage);
      console.error(error);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const renderContent = () => {
    switch (selectedMenu) {
      case 'users':
        return (
          <Card className="mb-3" radius="lg" shadow="sm">
            <CardBody>
            <div className="card-header">
              <h3>员工管理</h3>
              <Button size="md" radius="lg" color="primary" variant="solid" startContent={<Plus />} onPress={() => setUserModalVisible(true)}>
                添加
              </Button>
            </div>
            {loadingUsers || loadingLocations ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: 16 }}>
                <Spinner label="加载中..." />
              </div>
            ) : (
              <div className="admin-list">
                {users.map(u => (
                  <div key={u.id} className="admin-list-item">
                    <div className="list-item-title">
                      {u.username}
                      <span style={{ marginLeft: 8 }}>
                        <Chip size="sm" color={u.role === 'admin' ? 'primary' : 'default'} variant="flat">
                          {u.role === 'admin' ? '管理员' : '员工'}
                        </Chip>
                      </span>
                    </div>
                    <div className="list-item-sub">
                      {u.locationId ? (
                        <>
                          <MapPin size={16} />
                          {locations.find(l => l.id === u.locationId)?.name || '未知位置'}
                        </>
                      ) : (
                        <span style={{ color: 'var(--error-color)' }}>未分配位置</span>
                      )}
                      <span style={{ marginLeft: 12, color: 'var(--text-secondary)' }}>
                        创建时间：{u.createTime ? dayjs(u.createTime).format('YYYY-MM-DD HH:mm') : '未设置'}
                      </span>
                    </div>
                    <div className="list-item-actions">
                      <Button 
                        color="primary"
                        variant="bordered"
                        size="sm" 
                        radius="lg"
                        startContent={<MapPin size={16} />} 
                        onPress={() => handleAssignLocation(u)}
                      >
                        分配
                      </Button>
                      <Button size="sm" radius="lg" color="danger" variant="bordered" startContent={<Trash2 />} onPress={async () => {
                        if (window.confirm('确定删除吗？')) {
                          await handleDeleteUser(u.id);
                        }
                      }}>
                        删除
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            </CardBody>
          </Card>
        );
      case 'locations':
        return (
          <Card className="mb-3" radius="lg" shadow="sm">
            <CardBody>
            <div className="card-header">
              <h3>考勤点管理</h3>
              <Button size="md" radius="lg" color="primary" variant="solid" startContent={<Plus />} onPress={async () => {
                setEditingLocation(null);
                setLocFormState({ name: '', radius: 200, latitude: undefined, longitude: undefined });
                setLatLngSelected(false);
                setLocationMapReady(false);
                setLocationModalVisible(true);
                (async () => {
                  try {
                    const pos = await getCurrentPosition();
                    const lat = pos.latitude;
                    const lng = pos.longitude;
                    setMapPosition([lat, lng]);
                    setLocFormState((s) => ({ ...s, latitude: lat, longitude: lng }));
                    setLatLngSelected(true);
                  } catch {
                  }
                })();
              }}>
                添加
              </Button>
            </div>
            {loadingLocations ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: 16 }}>
                <Spinner label="加载中..." />
              </div>
            ) : (
              <div className="admin-list">
                {locations.map(l => (
                  <div key={l.id} className="admin-list-item">
                    <div className="list-item-title">{l.name}</div>
                    <div className="list-item-sub">
                      <MapPin size={16} />
                      半径: {l.radius}米 | {l.latitude.toFixed(4)}, {l.longitude.toFixed(4)}
                    </div>
                    <div className="list-item-actions">
                      <Button 
                        color="primary"
                        variant="bordered"
                        size="sm" 
                        radius="lg"
                        startContent={<Edit />} 
                        onPress={() => handleEditLocation(l)}
                      >
                        编辑
                      </Button>
                      <Button size="sm" radius="lg" color="danger" variant="bordered" startContent={<Trash2 />} onPress={async () => {
                        if (window.confirm('确定删除吗？')) {
                          await handleDeleteLocation(l.id);
                        }
                      }}>
                        删除
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            </CardBody>
          </Card>
        );
      case 'records':
        return (
          <Card className="mb-3" radius="lg" shadow="sm">
            <CardBody>
            <div className="card-header">
              <h3>考勤记录</h3>
            </div>
            {loadingRecords || loadingLocations ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: 16 }}>
                <Spinner label="加载中..." />
              </div>
            ) : (
              <div className="admin-list">
                {records.map(r => {
                  const userName = users.find(u => u.id === r.userId)?.username || '未知员工';
                  const locationName = locations.find(l => l.id === r.locationId)?.name || '未知地点';
                  return (
                    <div key={r.id} className="admin-list-item">
                      <div className="list-item-title">{userName}</div>
                      <div className="list-item-sub">
                        <MapPin size={16} />
                        {locationName}
                      </div>
                      <div className="list-item-sub">
                        <History size={16} />
                        {dayjs(r.timestamp * 1000).format('YYYY-MM-DD HH:mm:ss')}
                      </div>
                      <div className="list-item-actions" style={{ borderTop: 'none', marginTop: '8px', paddingTop: 0 }}>
                        <Chip color={r.status === 'success' ? 'success' : 'danger'} variant="flat" className="rounded-md">
                          {r.status === 'success' ? '打卡正常' : '打卡异常'}
                        </Chip>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            </CardBody>
          </Card>
        );
      default:
        return null;
    }
  };

  return (
    <MobileLayout
      title="管理后台"
      headerExtra={
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <ThemeToggle />
          <Button size="md" radius="lg" variant="light" startContent={<LogOut />} onPress={handleLogout} className="text-[var(--text-secondary)]">
            退出
          </Button>
        </div>
      }
      bottomNav={
        <div className="admin-bottom-nav">
          <div 
            className={`nav-item ${selectedMenu === 'users' ? 'active' : ''}`}
            onClick={() => setSelectedMenu('users')}
          >
            <UserIcon size={18} />
            <span>员工</span>
          </div>
          <div 
            className={`nav-item ${selectedMenu === 'locations' ? 'active' : ''}`}
            onClick={() => setSelectedMenu('locations')}
          >
            <MapPin size={18} />
            <span>网点</span>
          </div>
          <div 
            className={`nav-item ${selectedMenu === 'records' ? 'active' : ''}`}
            onClick={() => setSelectedMenu('records')}
          >
            <History size={18} />
            <span>记录</span>
          </div>
        </div>
      }
    >
      <div className="admin-content-wrapper">
        {renderContent()}
      </div>

      <Modal isOpen={userModalVisible} onOpenChange={setUserModalVisible}>
        <ModalContent>
          <ModalHeader>添加员工</ModalHeader>
          <ModalBody>
            <div className="flex flex-col gap-3">
              <Input
                size="md"
                radius="lg"
                label="用户名"
                placeholder="请输入用户名"
                value={userFormState.username}
                onChange={(e) => setUserFormState((s) => ({ ...s, username: e.target.value }))}
              />
              <Input
                size="md"
                radius="lg"
                label="密码"
                type="password"
                placeholder="请输入密码"
                value={userFormState.password}
                onChange={(e) => setUserFormState((s) => ({ ...s, password: e.target.value }))}
              />
            </div>
          </ModalBody>
          <ModalFooter>
            <Button size="md" radius="lg" variant="light" onPress={() => setUserModalVisible(false)}>取消</Button>
            <Button size="md" radius="lg" color="primary" onPress={() => handleCreateUser(userFormState)}>保存</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      <Modal isOpen={locationModalVisible} onOpenChange={(open) => {
        setLocationModalVisible(!!open);
        if (!open) {
          setEditingLocation(null);
          setLocFormState({ name: '', radius: 200, latitude: undefined, longitude: undefined });
        }
      }}>
        <ModalContent>
          <ModalHeader>{editingLocation ? '编辑打卡位置' : '添加打卡位置'}</ModalHeader>
          <ModalBody>
            <div className="flex flex-col gap-3">
              <Input
                size="md"
                radius="lg"
                label="位置名称"
                placeholder="例如：软件园办公区"
                value={locFormState.name}
                onChange={(e) => setLocFormState((s) => ({ ...s, name: e.target.value }))}
              />
              <div className="grid grid-cols-2 gap-2">
                <Input size="md" radius="lg" label="纬度" readOnly value={locFormState.latitude != null ? String(locFormState.latitude) : ''} />
                <Input size="md" radius="lg" label="经度" readOnly value={locFormState.longitude != null ? String(locFormState.longitude) : ''} />
              </div>
              <Input
                size="md"
                radius="lg"
                label="允许打卡半径 (米)"
                type="number"
                min={50}
                max={5000}
                value={String(locFormState.radius)}
                onChange={(e) => setLocFormState((s) => ({ ...s, radius: Math.max(50, Math.min(5000, Number(e.target.value) || 0)) }))}
              />
              <div style={{ marginBottom: 8, position: 'relative', zIndex: 1 }}>
                <label style={{ display: 'block', marginBottom: 8 }}>选择位置:</label>
                <MapSelector 
                  center={mapPosition} 
                  lazyInit
                  onReady={() => setLocationMapReady(true)}
                  overlayVisible={!latLngSelected && !editingLocation}
                  overlayText="正在获取位置信息…"
                  onChange={(lat: number, lng: number) => {
                    setLocFormState((s) => ({ ...s, latitude: lat, longitude: lng }));
                    setLatLngSelected(true);
                  }} 
                />
              </div>
            </div>
          </ModalBody>
          <ModalFooter>
            <Button size="md" radius="lg" variant="light" onPress={() => {
              setLocationModalVisible(false);
              setEditingLocation(null);
              setLocFormState({ name: '', radius: 200, latitude: undefined, longitude: undefined });
            }}>取消</Button>
            <Button size="md" radius="lg" color="primary" isDisabled={!locationMapReady || !latLngSelected} onPress={async () => {
              const values = { 
                name: locFormState.name, 
                latitude: locFormState.latitude!, 
                longitude: locFormState.longitude!, 
                radius: locFormState.radius 
              };
              if (editingLocation) {
                await handleUpdateLocation(values);
              } else {
                await handleCreateLocation(values);
              }
            }}>保存</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      <Modal isOpen={assignLocationModalVisible} onOpenChange={setAssignLocationModalVisible}>
        <ModalContent>
          <ModalHeader>分配打卡位置</ModalHeader>
          <ModalBody>
            <p>正在为员工 <strong>{selectedUser?.username}</strong> 分配打卡位置</p>
            <Select
              size="md"
              radius="lg"
              label="选择网点"
              placeholder="请选择位置"
              selectedKeys={assignLocId ? new Set([assignLocId]) : new Set([])}
              onSelectionChange={(keys) => {
                const first = Array.from(keys as Set<string>)[0];
                setAssignLocId(first ?? null);
              }}
            >
              {locations.map((loc) => (
                <SelectItem key={loc.id}>
                  {loc.name}
                </SelectItem>
              ))}
            </Select>
          </ModalBody>
          <ModalFooter>
            <Button variant="light" onPress={() => setAssignLocationModalVisible(false)}>取消</Button>
            <Button 
              color="primary" 
              isDisabled={!assignLocId || !selectedUser}
              onPress={() => handleAssignLocationSubmit({ locationId: assignLocId! })}
            >
              保存
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </MobileLayout>
  );
}
