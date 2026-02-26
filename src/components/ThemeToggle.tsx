import { Switch, Tooltip } from '@heroui/react';
import { Sun } from 'lucide-react';
import { useUIStore } from '../store/uiStore';

export default function ThemeToggle() {
  const theme = useUIStore((s) => s.theme);
  const toggleTheme = useUIStore((s) => s.toggleTheme);
  const checked = theme === 'dark';
  return (
    <Tooltip content={checked ? '切换到浅色' : '切换到深色'}>
      <Switch isSelected={checked} onValueChange={toggleTheme} className="mr-2">
        <Sun size={18} />
      </Switch>
    </Tooltip>
  );
}
