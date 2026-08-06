import { useState } from 'react';
import { Button, Input, Divider, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from '@heroui/react';
import { ClipboardCheck, User, Lock, Server } from 'lucide-react';
import { commands } from '../api';
import { useAuthStore } from '../store/authStore';
import { useNavigate } from 'react-router-dom';
import './Login.css';
import { notify } from '../utils/notify';

export default function Login() {
  const [loading, setLoading] = useState(false);
  const [serverVisible, setServerVisible] = useState(false);
  const [serverUrl, setServerUrl] = useState<string>(() => localStorage.getItem('server_base_url') || '');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const login = useAuthStore((state) => state.login);
  const navigate = useNavigate();

  const handleLogin = async () => {
    if (!username || !password) {
      notify.warning('请输入用户名和密码');
      return;
    }
    setLoading(true);
    try {
      const response = await commands.login({ username, password });
      if (response.success && response.user) {
        if (response.token) {
          try {
            localStorage.setItem('auth_token', response.token);
          } catch {}
        }
        login(response.user);
        notify.success('登录成功');
        navigate(response.user.role === 'admin' ? '/admin' : '/user');
      } else {
        notify.error(response.message || '登录失败');
      }
    } catch (error) {
      notify.error('登录失败，请重试');
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
        const normalized = serverUrl.replace(/\/+$/, '');
        localStorage.setItem('server_base_url', normalized);
        notify.success('服务器地址已保存');
        setServerVisible(false);
      } catch {
        notify.error('保存服务器地址失败');
      }
    } else {
      localStorage.removeItem('server_base_url');
      notify.success('已切换为本地数据库模式');
      setServerVisible(false);
    }
  };
  const onTestServer = async () => {
    if (!serverUrl) {
      notify.warning('请输入服务器地址');
      return;
    }
    const ua = (typeof navigator !== 'undefined' ? navigator.userAgent : '') || '';
    const emulatorGateway = localStorage.getItem('emulator_gateway') || '10.0.2.2';
    const normalize = (raw: string) => {
      const trimmed = raw.trim().replace(/\/+$/, '');
      const withProto = /^https?:\/\//i.test(trimmed) ? trimmed : `http://${trimmed}`;
      try {
        const u = new URL(withProto);
        const isLocal = ['localhost', '127.0.0.1', '::1'].includes(u.hostname);
        const isAndroid = /Android/i.test(ua);
        if (isAndroid && isLocal) {
          u.hostname = emulatorGateway;
          return u.toString().replace(/\/+$/, '');
        }
        return u.toString().replace(/\/+$/, '');
      } catch {
        if (/Android/i.test(ua) && /(localhost|127\.0\.0\.1)/i.test(withProto)) {
          return withProto.replace(/localhost|127\.0\.0\.1/i, emulatorGateway).replace(/\/+$/, '');
        }
        return withProto;
      }
    };
    const base = normalize(serverUrl);
    const target = (() => {
      try {
        const u = new URL(base);
        const p = u.pathname || '/';
        if (p === '/' || p === '') {
          return `${base}/api/v1/health`;
        }
        if (/\/api\/v1\/health\/?$/i.test(p)) {
          return base;
        }
        return `${base}/api/v1/health`;
      } catch {
        return /\/api\/v1\/health\/?$/i.test(base) ? base : `${base}/api/v1/health`;
      }
    })();
    try {
      const res = await fetch(target, { method: 'GET' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json().catch(() => ({}));
      notify.success(`连通性正常：${data?.status || 'ok'}`);
    } catch (e: any) {
      console.error(e);
      const isAndroid = /Android/i.test(ua);
      const tipForEmulator =
        isAndroid && /^(http:\/\/)?(localhost|127\.0\.0\.1)(:\d+)?$/i.test(base)
          ? '（安卓模拟器请使用 http://10.0.2.2:端口 访问您电脑上的后端）'
          : '';
      const reason = e?.message ? `；原因：${e.message}` : '';
      notify.error(`无法连接到服务器，请检查地址或服务是否已启动${reason} ${tipForEmulator}`.trim());
    }
  };

  return (
    <div className="login-container">
      <div className="login-header">
        <div className="login-logo">
          <ClipboardCheck size={36} />
        </div>
        <h1>Attendance</h1>
        <p>欢迎回来，请登录您的账号</p>
      </div>
      <div className="login-content">
        <div className="login-card">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleLogin();
            }}
            className="login-form"
          >
            <Input
              startContent={<User size={18} style={{ color: '#bfbfbf' }} />}
              placeholder="用户名"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              size="lg"
              radius="lg"
              variant="bordered"
            />
            <Input
              startContent={<Lock size={18} style={{ color: '#bfbfbf' }} />}
              placeholder="密码"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              size="lg"
              radius="lg"
              variant="bordered"
            />
            <Button
              size="lg"
              radius="lg"
              color="primary"
              type="submit"
              isLoading={loading}
              fullWidth
              className="login-submit-btn"
            >
              登录
            </Button>
          </form>
          <Divider className="my-4" />
          <Button
            size="sm"
            radius="lg"
            variant="light"
            fullWidth
            startContent={<Server size={16} />}
            onPress={onOpenServer}
            style={{ color: 'var(--text-secondary)' }}
          >
            服务器设置
          </Button>
        </div>
      </div>
      <div className="login-footer">Attendance v0.1.0</div>
      <Modal isOpen={serverVisible} onOpenChange={setServerVisible}>
        <ModalContent>
          <ModalHeader>服务器设置</ModalHeader>
          <ModalBody>
            <p style={{ color: 'var(--text-secondary)' }}>
              留空表示使用本地数据库（设备内存储）。填写例如：https://your-domain.com
            </p>
            <Input
              placeholder="服务器地址，如 https://your-domain.com"
              value={serverUrl}
              onChange={(e) => setServerUrl(e.target.value)}
              size="md"
              radius="lg"
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <Button size="md" radius="lg" onPress={onTestServer}>测试连接</Button>
            </div>
            <p>
              当前：{localStorage.getItem('server_base_url') || '本地数据库模式'}
            </p>
          </ModalBody>
          <ModalFooter>
            <Button size="md" radius="lg" variant="light" onPress={onCancelServer}>取消</Button>
            <Button size="md" radius="lg" color="primary" onPress={onSaveServer}>保存</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  );
}
