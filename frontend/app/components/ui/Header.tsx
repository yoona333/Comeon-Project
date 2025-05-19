'use client';

import { useState, useEffect } from 'react';
import { Layout, Menu, Button, Dropdown, Avatar, Badge, Typography } from 'antd';
import type { MenuProps } from 'antd';
import { 
  MenuUnfoldOutlined, 
  MenuFoldOutlined, 
  UserOutlined, 
  BellOutlined, 
  LogoutOutlined,
  DashboardOutlined,
  CalendarOutlined,
  TeamOutlined,
  TrophyOutlined,
  SettingOutlined
} from '@ant-design/icons';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const { Header } = Layout;
const { Text } = Typography;

interface HeaderProps {
  role: 'student' | 'admin';
  userName: string;
  collapsed: boolean;
  toggleCollapsed: () => void;
  userAvatar?: string;
}

export default function AppHeader({ role, userName, collapsed, toggleCollapsed, userAvatar }: HeaderProps) {
  const pathname = usePathname();
  const [notifications, setNotifications] = useState<any[]>([]);
  
  // 模拟获取通知
  useEffect(() => {
    // 这里应该从API获取通知数据
    setNotifications([
      { id: 1, title: '新活动发布：校园歌唱比赛', read: false },
      { id: 2, title: '您的活动申请已通过', read: false },
      { id: 3, title: '您获得了5积分奖励', read: true },
    ]);
  }, []);

  const unreadCount = notifications.filter(n => !n.read).length;

  const notificationItems: MenuProps['items'] = notifications.map(notification => ({
    key: notification.id.toString(),
    label: (
      <div className="notification-item">
        <Text strong={!notification.read}>{notification.title}</Text>
        {!notification.read && <Badge status="processing" />}
      </div>
    ),
  }));

  const userItems: MenuProps['items'] = [
    {
      key: '1',
      icon: <UserOutlined />,
      label: <Link href={`/${role}/profile`}>个人信息</Link>,
    },
    // {
    //   key: '2',
    //   icon: <SettingOutlined />,
    //   label: <Link href={`/${role}/settings`}>设置</Link>,
    // },
    {
      type: 'divider',
    },
    {
      key: '3',
      icon: <LogoutOutlined />,
      label: '退出登录',
      danger: true,
    },
  ];

  return (
    <Header className="app-header">
      <div className="header-left">
        <Button
          type="text"
          icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
          onClick={toggleCollapsed}
          className="trigger"
        />
        <div className="logo">
          <Link href={`/${role}`}>
            <img src="/images/logo.png" alt="攒劲Π" height={32} />
            <span className="logo-text">攒劲Π</span>
          </Link>
        </div>
      </div>
      
      <div className="header-right">
        <Dropdown menu={{ items: notificationItems }} placement="bottomRight" arrow>
          <Badge count={unreadCount} className="notification-badge">
            <Button type="text" icon={<BellOutlined />} className="icon-button" />
          </Badge>
        </Dropdown>
        
        <Dropdown menu={{ items: userItems }} placement="bottomRight" arrow>
          <div className="user-info">
            <Avatar icon={<UserOutlined />} className="avatar" />
            <span className="user-name">{userName}</span>
          </div>
        </Dropdown>
      </div>
    </Header>
  );
} 