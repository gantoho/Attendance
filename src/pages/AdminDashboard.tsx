import { useState, useEffect } from 'react';
import {
  Button,
  Modal,
  Form,
  Input,
  InputNumber,
  Select,
  message,
  Tag,
  Popconfirm,
} from 'antd';
import {
  UserOutlined,
  EnvironmentOutlined,
  HistoryOutlined,
  LogoutOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
} from '@ant-design/icons';
import { commands } from '../api/tauri';
import { useAuthStore } from '../store/authStore';
import { useNavigate } from 'react-router-dom';
import type { User, Location, AttendanceRecord } from '../types';
import dayjs from 'dayjs';
import MapSelector from '../components/MapSelector';
import MobileLayout from '../components/MobileLayout';
import './AdminDashboard.css';

export default function AdminDashboard() {
  const [selectedMenu, setSelectedMenu] = useState('users');
  const [users, setUsers] = useState<User[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [userModalVisible, setUserModalVisible] = useState(false);
  const [locationModalVisible, setLocationModalVisible] = useState(false);
  const [editingLocation, setEditingLocation] = useState<Location | null>(null);
  const [mapPosition, setMapPosition] = useState<[number, number]>([39.9042, 116.4074]);
  const [assignLocationModalVisible, setAssignLocationModalVisible] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [form] = Form.useForm();
  const [locationForm] = Form.useForm();
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user, selectedMenu]);

  const loadData = async () => {
    if (!user) return;
    
    try {
      // 无论当前在哪个菜单，如果 locations 为空，都加载一次 locations
      // 这样可以确保在“用户管理”菜单下也能正确显示用户的打卡位置名称，以及在分配位置时有数据
      if (locations.length === 0 || selectedMenu === 'locations') {
        const locationData = await commands.getLocationsByAdmin(user.id);
        setLocations(locationData);
      }

      if (selectedMenu === 'users') {
        const data = await commands.getUsersByAdmin(user.id);
        setUsers(data);
      } else if (selectedMenu === 'records') {
        const data = await commands.getAttendanceRecordsByAdmin(user.id);
        setRecords(data);
      }
    } catch (error) {
      message.error('加载数据失败');
      console.error(error);
    }
  };

  const handleCreateUser = async (values: any) => {
    if (!user) return;
    
    try {
      await commands.createUser({
        username: values.username,
        password: values.password,
        role: 'user',
        adminId: user.id,
      });
      message.success('创建用户成功');
      setUserModalVisible(false);
      form.resetFields();
      loadData();
    } catch (error: any) {
      const errorMessage = error?.message || error || '创建用户失败';
      message.error(errorMessage);
      console.error(error);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    try {
      await commands.deleteUser(userId);
      message.success('删除用户成功');
      loadData();
    } catch (error: any) {
      const errorMessage = error?.message || error || '删除用户失败';
      message.error(errorMessage);
      console.error(error);
    }
  };

  const handleCreateLocation = async (values: any) => {
    if (!user) return;
    
    try {
      await commands.createLocation({
        name: values.name,
        latitude: values.latitude,
        longitude: values.longitude,
        radius: values.radius,
        adminId: user.id,
      });
      message.success('创建位置成功');
      setLocationModalVisible(false);
      locationForm.resetFields();
      loadData();
    } catch (error: any) {
      const errorMessage = error?.message || error || '创建位置失败';
      message.error(errorMessage);
      console.error(error);
    }
  };

  const handleUpdateLocation = async (values: any) => {
    if (!editingLocation) return;
    
    try {
      await commands.updateLocation(editingLocation.id, {
        name: values.name,
        latitude: values.latitude,
        longitude: values.longitude,
        radius: values.radius,
      });
      message.success('更新位置成功');
      setLocationModalVisible(false);
      setEditingLocation(null);
      locationForm.resetFields();
      loadData();
    } catch (error: any) {
      const errorMessage = error?.message || error || '更新位置失败';
      message.error(errorMessage);
      console.error(error);
    }
  };

  const handleDeleteLocation = async (locationId: string) => {
    try {
      await commands.deleteLocation(locationId);
      message.success('删除位置成功');
      loadData();
    } catch (error: any) {
      const errorMessage = error?.message || error || '删除位置失败';
      message.error(errorMessage);
      console.error(error);
    }
  };

  const handleEditLocation = (location: Location) => {
    setEditingLocation(location);
    locationForm.setFieldsValue(location);
    setMapPosition([location.latitude, location.longitude]);
    setLocationModalVisible(true);
  };

  const handleAssignLocation = (user: User) => {
    setSelectedUser(user);
    setAssignLocationModalVisible(true);
  };

  const handleAssignLocationSubmit = async (values: any) => {
    if (!selectedUser) return;
    
    try {
      await commands.updateUserLocation(selectedUser.id, values.locationId);
      message.success('分配位置成功');
      setAssignLocationModalVisible(false);
      setSelectedUser(null);
      // 分配成功后，手动更新本地状态，避免重新加载整个列表
      setUsers(prevUsers => prevUsers.map(u => 
        u.id === selectedUser.id ? { ...u, locationId: values.locationId } : u
      ));
    } catch (error: any) {
      const errorMessage = error?.message || error || '分配位置失败';
      message.error(errorMessage);
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
          <div className="admin-card">
            <div className="card-header">
              <h3>员工管理</h3>
              <Button type="primary" icon={<PlusOutlined />} onClick={() => setUserModalVisible(true)}>
                添加
              </Button>
            </div>
            <div className="admin-list">
              {users.map(u => (
                <div key={u.id} className="admin-list-item">
                  <div className="list-item-title">{u.username}</div>
                  <div className="list-item-sub">
                    {u.locationId ? (
                      <>
                        <EnvironmentOutlined />
                        {locations.find(l => l.id === u.locationId)?.name || '未知位置'}
                      </>
                    ) : (
                      <span style={{ color: 'var(--error-color)' }}>未分配位置</span>
                    )}
                  </div>
                  <div className="list-item-actions">
                    <Button 
                      type="primary"
                      ghost
                      size="small" 
                      icon={<EnvironmentOutlined />} 
                      onClick={() => handleAssignLocation(u)}
                    >
                      分配
                    </Button>
                    <Popconfirm title="确定删除吗？" onConfirm={() => handleDeleteUser(u.id)}>
                      <Button size="small" danger ghost icon={<DeleteOutlined />}>
                        删除
                      </Button>
                    </Popconfirm>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      case 'locations':
        return (
          <div className="admin-card">
            <div className="card-header">
              <h3>考勤点管理</h3>
              <Button type="primary" icon={<PlusOutlined />} onClick={() => {
                setEditingLocation(null);
                locationForm.resetFields();
                setLocationModalVisible(true);
              }}>
                添加
              </Button>
            </div>
            <div className="admin-list">
              {locations.map(l => (
                <div key={l.id} className="admin-list-item">
                  <div className="list-item-title">{l.name}</div>
                  <div className="list-item-sub">
                    <EnvironmentOutlined />
                    半径: {l.radius}米 | {l.latitude.toFixed(4)}, {l.longitude.toFixed(4)}
                  </div>
                  <div className="list-item-actions">
                    <Button 
                      type="primary"
                      ghost
                      size="small" 
                      icon={<EditOutlined />} 
                      onClick={() => handleEditLocation(l)}
                    >
                      编辑
                    </Button>
                    <Popconfirm title="确定删除吗？" onConfirm={() => handleDeleteLocation(l.id)}>
                      <Button size="small" danger ghost icon={<DeleteOutlined />}>
                        删除
                      </Button>
                    </Popconfirm>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      case 'records':
        return (
          <div className="admin-card">
            <div className="card-header">
              <h3>考勤记录</h3>
            </div>
            <div className="admin-list">
              {records.map(r => {
                const userName = users.find(u => u.id === r.userId)?.username || '未知员工';
                const locationName = locations.find(l => l.id === r.locationId)?.name || '未知地点';
                return (
                  <div key={r.id} className="admin-list-item">
                    <div className="list-item-title">{userName}</div>
                    <div className="list-item-sub">
                      <EnvironmentOutlined />
                      {locationName}
                    </div>
                    <div className="list-item-sub">
                      <HistoryOutlined />
                      {dayjs(r.timestamp * 1000).format('YYYY-MM-DD HH:mm:ss')}
                    </div>
                    <div className="list-item-actions" style={{ borderTop: 'none', marginTop: '8px', paddingTop: 0 }}>
                      <Tag color={r.status === 'success' ? 'success' : 'error'} style={{ borderRadius: '6px', margin: 0 }}>
                        {r.status === 'success' ? '打卡正常' : '打卡异常'}
                      </Tag>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <MobileLayout
      title="管理后台"
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
      bottomNav={
        <div className="admin-bottom-nav">
          <div 
            className={`nav-item ${selectedMenu === 'users' ? 'active' : ''}`}
            onClick={() => setSelectedMenu('users')}
          >
            <UserOutlined />
            <span>员工</span>
          </div>
          <div 
            className={`nav-item ${selectedMenu === 'locations' ? 'active' : ''}`}
            onClick={() => setSelectedMenu('locations')}
          >
            <EnvironmentOutlined />
            <span>网点</span>
          </div>
          <div 
            className={`nav-item ${selectedMenu === 'records' ? 'active' : ''}`}
            onClick={() => setSelectedMenu('records')}
          >
            <HistoryOutlined />
            <span>记录</span>
          </div>
        </div>
      }
    >
      <div className="admin-content-wrapper">
        {renderContent()}
      </div>

      {/* Modals remain the same but can be styled via CSS */}
      <Modal
        title="添加员工"
        open={userModalVisible}
        onCancel={() => setUserModalVisible(false)}
        onOk={() => form.submit()}
        destroyOnClose
      >
        <Form form={form} layout="vertical" onFinish={handleCreateUser}>
          <Form.Item
            name="username"
            label="用户名"
            rules={[{ required: true, message: '请输入用户名' }]}
          >
            <Input placeholder="请输入用户名" />
          </Form.Item>
          <Form.Item
            name="password"
            label="密码"
            rules={[{ required: true, message: '请输入密码' }]}
          >
            <Input.Password placeholder="请输入密码" />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={editingLocation ? '编辑打卡位置' : '添加打卡位置'}
        open={locationModalVisible}
        onCancel={() => {
          setLocationModalVisible(false);
          setEditingLocation(null);
          locationForm.resetFields();
        }}
        onOk={() => locationForm.submit()}
        width={600}
        destroyOnClose
      >
        <Form form={locationForm} layout="vertical" onFinish={editingLocation ? handleUpdateLocation : handleCreateLocation}>
          <Form.Item
            name="name"
            label="位置名称"
            rules={[{ required: true, message: '请输入位置名称' }]}
          >
            <Input placeholder="例如：软件园办公区" />
          </Form.Item>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <Form.Item
              name="latitude"
              label="纬度"
              rules={[{ required: true, message: '请在地图上选择位置' }]}
            >
              <InputNumber style={{ width: '100%' }} readOnly />
            </Form.Item>
            <Form.Item
              name="longitude"
              label="经度"
              rules={[{ required: true, message: '请在地图上选择位置' }]}
            >
              <InputNumber style={{ width: '100%' }} readOnly />
            </Form.Item>
          </div>
          <Form.Item
            name="radius"
            label="允许打卡半径 (米)"
            initialValue={200}
            rules={[{ required: true, message: '请输入半径' }]}
          >
            <InputNumber style={{ width: '100%' }} min={50} max={5000} />
          </Form.Item>
          
          <div style={{ height: '300px', marginBottom: '24px' }}>
            <label style={{ display: 'block', marginBottom: '8px' }}>选择位置:</label>
            <MapSelector 
              center={mapPosition} 
              onChange={(lat: number, lng: number) => {
                locationForm.setFieldsValue({ latitude: lat, longitude: lng });
              }} 
            />
          </div>
        </Form>
      </Modal>

      <Modal
        title="分配打卡位置"
        open={assignLocationModalVisible}
        onCancel={() => setAssignLocationModalVisible(false)}
        onOk={() => {
          const locationId = locationForm.getFieldValue('locationId');
          handleAssignLocationSubmit({ locationId });
        }}
        destroyOnClose
      >
        <Form form={locationForm} layout="vertical">
          <p>正在为员工 <strong>{selectedUser?.username}</strong> 分配打卡位置</p>
          <Form.Item
            name="locationId"
            label="选择网点"
            rules={[{ required: true, message: '请选择位置' }]}
          >
            <Select placeholder="请选择位置">
              {locations.map(loc => (
                <Select.Option key={loc.id} value={loc.id}>
                  {loc.name}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </MobileLayout>
  );
}
