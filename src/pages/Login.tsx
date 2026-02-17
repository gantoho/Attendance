import { useState } from 'react';
import { Form, Input, Button, Card, message } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { commands } from '../api/tauri';
import { useAuthStore } from '../store/authStore';
import { useNavigate } from 'react-router-dom';
import './Login.css';

export default function Login() {
  const [loading, setLoading] = useState(false);
  const login = useAuthStore((state) => state.login);
  const navigate = useNavigate();

  const getCurrentPosition = () =>
    new Promise<GeolocationPosition>((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('您的设备不支持地理位置功能'));
        return;
        }
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve(pos),
        (err) => reject(err),
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    });

  const haversineDistance = (
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ) => {
    const toRad = (v: number) => (v * Math.PI) / 180;
    const R = 6371000; // meters
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) *
        Math.cos(toRad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const onFinish = async (values: { username: string; password: string }) => {
    setLoading(true);
    try {
      const response = await commands.login({
        username: values.username,
        password: values.password,
      });

      if (response.success && response.user) {
        const user = response.user;
        if (user.role === 'admin') {
          login(user);
          message.success('登录成功');
          navigate('/admin');
          return;
        }

        try {
          const assigned = await commands.getUserLocation(user.id);
          if (!assigned) {
            message.error('未分配打卡位置，无法登录，请联系管理员');
            return;
          }

          const pos = await getCurrentPosition();
          const distance = haversineDistance(
            pos.coords.latitude,
            pos.coords.longitude,
            assigned.latitude,
            assigned.longitude
          );

          if (distance > assigned.radius) {
            message.error(
              `不在打卡范围内（距离约${distance.toFixed(0)}米），无法登录`
            );
            return;
          }

          login(user);
          message.success('登录成功');
          navigate('/user');
        } catch (e: any) {
          const msg =
            e?.message || '获取当前位置失败，无法校验登录地点';
          message.error(msg);
        }
      } else {
        message.error(response.message || '登录失败');
      }
    } catch (error) {
      message.error('登录失败，请重试');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-header">
        <h1>考勤打卡</h1>
        <p>欢迎回来，请登录您的账号</p>
      </div>
      <Card className="login-card" variant="borderless">
        <Form
          name="login"
          onFinish={onFinish}
          autoComplete="off"
          size="large"
          className="login-form"
        >
          <Form.Item
            name="username"
            rules={[{ required: true, message: '请输入用户名' }]}
          >
            <Input prefix={<UserOutlined style={{ color: '#bfbfbf' }} />} placeholder="用户名" />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[{ required: true, message: '请输入密码' }]}
          >
            <Input.Password prefix={<LockOutlined style={{ color: '#bfbfbf' }} />} placeholder="密码" />
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" loading={loading} block className="login-submit-btn">
              登录
            </Button>
          </Form.Item>
        </Form>
        <div className="login-tips">
          <p>默认管理员账号: admin / admin123</p>
        </div>
      </Card>
    </div>
  );
}
