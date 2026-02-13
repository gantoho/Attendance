import React from 'react';
import { Button } from 'antd';
import { LeftOutlined } from '@ant-design/icons';
import './MobileLayout.css';

interface MobileLayoutProps {
  title: string;
  children: React.ReactNode;
  showBack?: boolean;
  onBack?: () => void;
  headerExtra?: React.ReactNode;
  bottomNav?: React.ReactNode;
}

const MobileLayout: React.FC<MobileLayoutProps> = ({
  title,
  children,
  showBack = false,
  onBack,
  headerExtra,
  bottomNav,
}) => {
  return (
    <div className="mobile-layout">
      <header className="mobile-header">
        <div className="header-left">
          {showBack && (
            <Button 
              type="text" 
              icon={<LeftOutlined />} 
              onClick={onBack}
              className="back-button"
            />
          )}
          <h1 className="header-title">{title}</h1>
        </div>
        <div className="header-right">
          {headerExtra}
        </div>
      </header>
      
      <main className="mobile-content page-enter">
        {children}
      </main>

      {bottomNav && (
        <footer className="mobile-footer">
          {bottomNav}
        </footer>
      )}
    </div>
  );
};

export default MobileLayout;
