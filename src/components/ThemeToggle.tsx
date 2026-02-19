import { Switch, Tooltip } from 'antd';
import { BulbOutlined } from '@ant-design/icons';
import { useUIStore } from '../store/uiStore';

export default function ThemeToggle() {
  const theme = useUIStore((s) => s.theme);
  const toggleTheme = useUIStore((s) => s.toggleTheme);
  const checked = theme === 'dark';
  return (
    <Tooltip title={checked ? '切换到浅色' : '切换到深色'}>
      <Switch
        checked={checked}
        onChange={toggleTheme}
        checkedChildren={<BulbOutlined />}
        unCheckedChildren={<BulbOutlined />}
        style={{ marginRight: 8 }}
      />
    </Tooltip>
  );
}
