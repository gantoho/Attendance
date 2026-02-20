import { useState } from 'react';
import { Form, Input, Button, Card, message, Modal, Space, Typography } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { commands } from '../api';
import { useAuthStore } from '../store/authStore';
import { useNavigate } from 'react-router-dom';
import './Login.css';

export default function Login() {
  const [loading, setLoading] = useState(false);
  const [serverVisible, setServerVisible] = useState(false);
  const [serverUrl, setServerUrl] = useState<string>(() => localStorage.getItem('server_base_url') || '');
  const login = useAuthStore((state) => state.login);
  const navigate = useNavigate();

  const onFinish = async (values: { username: string; password: string }) => {
    setLoading(true);
    try {
      const response = await commands.login({
        username: values.username,
        password: values.password,
      });

      if (response.success && response.user) {
        const user = response.user;
        login(user);
        message.success('登录成功');
        navigate(user.role === 'admin' ? '/admin' : '/user');
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

  const onOpenServer = () => setServerVisible(true);
  const onCancelServer = () => {
    setServerUrl(localStorage.getItem('server_base_url') || '');
    setServerVisible(false);
  };
  const onSaveServer = () => {
    if (serverUrl) {
      try {
        // 标准化去掉尾部斜杠
        const normalized = serverUrl.replace(/\/+$/, '');
        localStorage.setItem('server_base_url', normalized);
        message.success('服务器地址已保存');
        setServerVisible(false);
      } catch {
        message.error('保存服务器地址失败');
      }
    } else {
      localStorage.removeItem('server_base_url');
      message.success('已切换为本地数据库模式');
      setServerVisible(false);
    }
  };
  const onTestServer = async () => {
    if (!serverUrl) {
      message.warning('请输入服务器地址');
      return;
    }
    const base = serverUrl.replace(/\/+$/, '');
    try {
      const res = await fetch(`${base}/users`, { method: 'GET' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      await res.json();
      message.success('连通性正常');
    } catch (e) {
      console.error(e);
      message.error('无法连接到服务器，请检查地址或服务是否已启动');
    }
  };

  return (
    <div className="login-container">
      <div className="login-header">
        <h1>考勤打卡</h1>
        <p>欢迎回来，请登录您的账号</p>
        <Button size="small" type="link" onClick={onOpenServer}>
          服务器设置
        </Button>
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
      <Modal
        title="服务器设置"
        open={serverVisible}
        onOk={onSaveServer}
        onCancel={onCancelServer}
        okText="保存"
        cancelText="取消"
      >
        <Space direction="vertical" style={{ width: '100%' }}>
          <Typography.Text type="secondary">
            留空表示使用本地数据库（设备内存储）。填写例如：https://your-domain.com
          </Typography.Text>
          <Input
            placeholder="服务器地址，如 https://your-domain.com"
            value={serverUrl}
            onChange={(e) => setServerUrl(e.target.value)}
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button onClick={onTestServer}>测试连接</Button>
          </div>
          {localStorage.getItem('server_base_url') ? (
            <Typography.Text>
              当前：{localStorage.getItem('server_base_url')}
            </Typography.Text>
          ) : (
            <Typography.Text>当前：本地数据库模式</Typography.Text>
          )}
        </Space>
      </Modal>
    </div>
  );
}
