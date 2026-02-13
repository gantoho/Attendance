import { useState, useEffect } from 'react';
import {
  Layout,
  Menu,
  Card,
  Table,
  Button,
  Modal,
  Form,
  Input,
  InputNumber,
  Select,
  message,
  Space,
  Tag,
  Popconfirm,
  Divider,
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
import './AdminDashboard.css';

const { Header, Content, Sider } = Layout;

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
      loadData();
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

  if (!user) {
    return null;
  }

  const userColumns = [
    { title: '用户名', dataIndex: 'username', key: 'username' },
    { title: '角色', dataIndex: 'role', key: 'role', render: (role: string) => <Tag>{role}</Tag> },
    {
      title: '打卡位置',
      key: 'location',
      render: (_: any, record: User) => {
        const location = locations.find(l => l.id === record.locationId);
        return location ? (
          <Tag color="blue">{location.name}</Tag>
        ) : (
          <Tag color="default">未分配</Tag>
        );
      },
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: User) => (
        <Space>
          <Button type="link" icon={<EnvironmentOutlined />} onClick={() => handleAssignLocation(record)}>
            分配位置
          </Button>
          <Popconfirm
            title="确定要删除这个用户吗？"
            onConfirm={() => handleDeleteUser(record.id)}
            okText="确定"
            cancelText="取消"
          >
            <Button type="link" danger icon={<DeleteOutlined />}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const locationColumns = [
    { title: '名称', dataIndex: 'name', key: 'name' },
    {
      title: '位置',
      key: 'location',
      render: (_: any, record: Location) => (
        <span>
          {record.latitude.toFixed(6)}, {record.longitude.toFixed(6)}
        </span>
      ),
    },
    { title: '半径(米)', dataIndex: 'radius', key: 'radius' },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: Location) => (
        <Space>
          <Button type="link" icon={<EditOutlined />} onClick={() => handleEditLocation(record)}>
            编辑
          </Button>
          <Popconfirm
            title="确定要删除这个位置吗？"
            onConfirm={() => handleDeleteLocation(record.id)}
            okText="确定"
            cancelText="取消"
          >
            <Button type="link" danger icon={<DeleteOutlined />}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const recordColumns = [
    { title: '用户ID', dataIndex: 'user_id', key: 'user_id' },
    {
      title: '时间',
      dataIndex: 'timestamp',
      key: 'timestamp',
      render: (timestamp: number) => dayjs(timestamp * 1000).format('YYYY-MM-DD HH:mm:ss'),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color={status === 'success' ? 'success' : 'error'}>
          {status === 'success' ? '成功' : '失败'}
        </Tag>
      ),
    },
    {
      title: '位置',
      key: 'location',
      render: (_: any, record: AttendanceRecord) => (
        <span>
          {record.latitude.toFixed(6)}, {record.longitude.toFixed(6)}
        </span>
      ),
    },
    {
      title: '失败原因',
      dataIndex: 'error_message',
      key: 'error_message',
      render: (msg: string | null) => msg || '-',
    },
  ];

  return (
    <Layout className="admin-dashboard">
      <Header className="dashboard-header">
        <div className="header-title">打卡管理系统 - 管理员</div>
        <Button icon={<LogoutOutlined />} onClick={handleLogout}>
          退出登录
        </Button>
      </Header>
      <Layout>
        <Sider width={200} className="dashboard-sider">
          <Menu
            mode="inline"
            selectedKeys={[selectedMenu]}
            onClick={({ key }) => setSelectedMenu(key)}
            items={[
              { key: 'users', icon: <UserOutlined />, label: '用户管理' },
              { key: 'locations', icon: <EnvironmentOutlined />, label: '位置管理' },
              { key: 'records', icon: <HistoryOutlined />, label: '打卡记录' },
            ]}
          />
        </Sider>
        <Content className="dashboard-content">
          {selectedMenu === 'users' && (
            <Card title="用户管理" extra={<Button type="primary" icon={<PlusOutlined />} onClick={() => setUserModalVisible(true)}>添加用户</Button>}>
              <Table dataSource={users} columns={userColumns} rowKey="id" />
            </Card>
          )}

          {selectedMenu === 'locations' && (
            <Card title="位置管理" extra={<Button type="primary" icon={<PlusOutlined />} onClick={() => { setEditingLocation(null); locationForm.resetFields(); setLocationModalVisible(true); }}>添加位置</Button>}>
              <Table dataSource={locations} columns={locationColumns} rowKey="id" />
            </Card>
          )}

          {selectedMenu === 'records' && (
            <Card title="打卡记录">
              <Table dataSource={records} columns={recordColumns} rowKey="id" />
            </Card>
          )}
        </Content>
      </Layout>

      <Modal
        title="添加用户"
        open={userModalVisible}
        onCancel={() => { setUserModalVisible(false); form.resetFields(); }}
        footer={null}
      >
        <Form form={form} onFinish={handleCreateUser} layout="vertical">
          <Form.Item name="username" label="用户名" rules={[{ required: true, message: '请输入用户名' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="password" label="密码" rules={[{ required: true, message: '请输入密码' }]}>
            <Input.Password />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" block>
              创建
            </Button>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={editingLocation ? '编辑位置' : '添加位置'}
        open={locationModalVisible}
        onCancel={() => { setLocationModalVisible(false); setEditingLocation(null); locationForm.resetFields(); setMapPosition([39.9042, 116.4074]); }}
        footer={null}
        width={700}
      >
        <Form
          form={locationForm}
          onFinish={editingLocation ? handleUpdateLocation : handleCreateLocation}
          layout="vertical"
          initialValues={{ radius: 100 }}
        >
          <Form.Item name="name" label="位置名称" rules={[{ required: true, message: '请输入位置名称' }]}>
            <Input />
          </Form.Item>
          
          <Divider>地图选择</Divider>
          
          <div style={{ marginBottom: '16px' }}>
            <MapSelector 
              center={mapPosition} 
              onChange={(lat, lng) => {
                setMapPosition([lat, lng]);
                locationForm.setFieldsValue({ latitude: lat, longitude: lng });
              }} 
            />
          </div>
          
          <Form.Item name="latitude" label="纬度" rules={[{ required: true, message: '请选择位置' }]}>
            <InputNumber style={{ width: '100%' }} precision={6} readOnly />
          </Form.Item>
          <Form.Item name="longitude" label="经度" rules={[{ required: true, message: '请选择位置' }]}>
            <InputNumber style={{ width: '100%' }} precision={6} readOnly />
          </Form.Item>
          <Form.Item name="radius" label="打卡半径(米)" rules={[{ required: true, message: '请输入打卡半径' }]}>
            <InputNumber style={{ width: '100%' }} min={1} />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" block>
              {editingLocation ? '更新' : '创建'}
            </Button>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="分配打卡位置"
        open={assignLocationModalVisible}
        onCancel={() => { setAssignLocationModalVisible(false); setSelectedUser(null); }}
        footer={null}
      >
        <Form form={locationForm} onFinish={handleAssignLocationSubmit} layout="vertical">
          <Form.Item label="用户">
            <Input value={selectedUser?.username} readOnly />
          </Form.Item>
          <Form.Item name="locationId" label="打卡位置" rules={[{ required: true, message: '请选择打卡位置' }]}>
            <Select placeholder="请选择打卡位置">
              {locations.map(location => (
                <Select.Option key={location.id} value={location.id}>
                  {location.name} ({location.latitude.toFixed(6)}, {location.longitude.toFixed(6)})
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" block>
              分配
            </Button>
          </Form.Item>
        </Form>
      </Modal>
    </Layout>
  );
}
