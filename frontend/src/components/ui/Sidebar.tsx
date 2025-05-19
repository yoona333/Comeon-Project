'use client';

import { Layout, Menu, theme } from 'antd';
import type { MenuProps } from 'antd';
import { 
  DashboardOutlined,
  AppstoreOutlined,
  CalendarOutlined,
  TrophyOutlined,
  UserOutlined,
  CrownOutlined,
  TeamOutlined,
  SettingOutlined,
  KeyOutlined,
  AuditOutlined
} from '@ant-design/icons';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import styles from '../../styles/Sidebar.module.scss';

const { Sider } = Layout;

interface SidebarProps {
  collapsed: boolean;
}

export default function Sidebar({ collapsed }: SidebarProps) {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [role, setRole] = useState<number | null>(null);
  const [homeRole, setHomeRole] = useState<string>('/');
  const [openKeys, setOpenKeys] = useState<string[]>([]);
  const [firstClubId, setFirstClubId] = useState<number | null>(null);
  const { token } = theme.useToken();
  
  useEffect(() => {
    setMounted(true);
    
    // 检查使用的是哪种存储方式（localStorage或sessionStorage）
    const authMode = sessionStorage.getItem('auth_mode');
    const storage = authMode === 'session' ? sessionStorage : localStorage;
    
    // 每次渲染时直接从storage读取最新的角色信息
    const storedRole = storage.getItem('role');
    const parsedRole = storedRole ? parseInt(storedRole) : null;
    setRole(parsedRole);
    
    if (parsedRole === 0) {
      setHomeRole('/admin');
      // 获取第一个社团ID
      fetchFirstClubId();
    } else if (parsedRole === 1 || parsedRole === 2) {
      setHomeRole('/student');
    }
    
    // 根据当前路径设置默认打开的子菜单
    const pathParts = pathname.split('/');
    if (pathParts.length > 2) {
      setOpenKeys([pathParts[2]]);
    }
  }, [pathname, collapsed]);
  
  // 更新fetchFirstClubId函数，支持从sessionStorage获取token
  const fetchFirstClubId = async () => {
    // 检查使用的是哪种存储方式
    const authMode = sessionStorage.getItem('auth_mode');
    const storage = authMode === 'session' ? sessionStorage : localStorage;
    const token = storage.getItem('token');
    
    if (!token) return;
    
    try {
      const response = await fetch('http://localhost:8080/api/clubs', {
        headers: {
          'x-access-token': token
        }
      });
      
      if (!response.ok) return;
      
      const data = await response.json();
      if (data.success && Array.isArray(data.data) && data.data.length > 0) {
        setFirstClubId(data.data[0].id);
      }
    } catch (error) {
      console.error('获取社团列表失败:', error);
    }
  };
  
  // 获取当前选中的菜单项
  const getSelectedKey = () => {
    const pathParts = pathname.split('/');
    
    if (pathParts.length <= 2) return 'dashboard';
    
    // 管理员特殊路径映射
    if (pathParts[1] === 'admin') {
      // 活动管理相关路径
      if (pathParts[2] === 'activities') {
        if (pathParts.length <= 3) {
          // 纯 /admin/activities 路径
          return 'all-activities';
        }
        
        // 子页面
        if (pathParts[3] === 'pending') return 'pending-activities';
        if (pathParts[3] === 'stats') return 'activity-stats';
        return 'all-activities'; // 其他活动子页面
      }
      
      // 社团管理相关路径
      if (pathParts[2] === 'clubs') {
        if (pathParts.length <= 3) return 'club-list';
        if (pathParts[3] === 'members') return 'club-members';
        return 'club-list';
      }
      
      // 用户管理相关路径
      if (pathParts[2] === 'users') {
        if (pathParts.length <= 3) return 'user-list';
        if (pathParts[3] === 'roles') return 'user-roles';
        return 'user-list';
      }
      
      // 系统设置相关路径
      if (pathParts[2] === 'settings') {
        if (pathParts.length <= 3) return 'system-settings';
        if (pathParts[3] === 'password') return 'change-password';
        return 'system-settings';
      }
    }
    
    // 学生/社长特殊路径处理
    // ...此处可以添加更多的路径处理逻辑
    
    // 默认情况
    return pathParts[2];
  };
  
  const selectedKey = getSelectedKey();
  
  // 处理子菜单展开状态变化
  const handleOpenChange = (keys: string[]) => {
    setOpenKeys(keys);
  };
  
  // 创建基础菜单项
  const baseMenuItems: MenuProps['items'] = [
    {
      key: 'dashboard',
      icon: <DashboardOutlined />,
      label: <Link href={homeRole}>控制台</Link>,
    }
  ];

  // 根据角色创建不同的菜单项
  let menuItems: MenuProps['items'] = [...baseMenuItems];

  if (role === 0) { // 管理员
    menuItems = [
      ...baseMenuItems,
      {
        key: 'activities',
        icon: <AppstoreOutlined />,
        label: <>活动管理</>,
        children: [
          {
            key: 'all-activities',
            label: <Link href={`${homeRole}/activities`}>活动列表</Link>,
          },
          {
            key: 'pending-activities',
            label: <Link href={`${homeRole}/activities/pending`}>待审核活动</Link>,
          },
          {
            key: 'activity-stats',
            label: <Link href={`${homeRole}/activities/stats`}>活动统计</Link>,
          }
        ]
      },
      {
        key: 'clubs',
        icon: <TeamOutlined />,
        label: <>社团管理</>,
        children: [
          {
            key: 'club-list',
            label: <Link href={`${homeRole}/clubs`}>社团列表</Link>,
          },
          {
            key: 'club-members',
            label: <Link href={`${homeRole}/clubs`}>成员管理</Link>,
          }
        ]
      },
      {
        key: 'users',
        icon: <UserOutlined />,
        label: <>用户管理</>,
        children: [
          {
            key: 'user-list',
            label: <Link href={`${homeRole}/users`}>用户列表</Link>,
          },
          // {
          //   key: 'user-roles',
          //   label: <Link href={`${homeRole}/users/roles`}>角色管理</Link>,
          // }
        ]
      },
      {
        key: 'settings',
        icon: <SettingOutlined />,
        label: <>系统设置</>,
        children: [
          // {
          //   key: 'system-settings',
          //   label: <Link href={`${homeRole}/settings`}>基本设置</Link>,
          // },
          {
            key: 'change-password',
            label: <Link href={`${homeRole}/change-password`}>修改密码</Link>,
          }
        ]
      },
      // 为管理员添加社团积分列表菜单项
      {
        key: 'club-points',
        icon: <KeyOutlined />,
        label: <Link href={`${homeRole}/club-points`}>社团积分论坛</Link>,
      },
      {
        key: 'points-management',
        icon: <TrophyOutlined />,
        label: <>积分管理</>,
        children: [
          {
            key: 'points-onchain',
            label: <Link href={`${homeRole}/points/blockchain`}>积分上链</Link>,
          }
        ]
      }
    ];
  } else if (role === 1 || role === 2) { // 学生或社长
    menuItems = [
      ...baseMenuItems,
      {
        key: 'activities',
        icon: <AppstoreOutlined />,
        label: <Link href={`${homeRole}/activities`}>活动列表</Link>,
      },
      
      {
        key: 'my-activities',
        icon: <CalendarOutlined />,
        label: <Link href={`${homeRole}/my-activities`}>我的活动</Link>,
      },
      {
        // 新增活动预约菜单项
        key: 'activity-booking',
        icon: <AuditOutlined />, // 可以根据需求更换图标
        label: <Link href={`${homeRole}/activity-booking`}>活动预约</Link>,
      },
      {
        key: 'points',
        icon: <TrophyOutlined />,
        label: <Link href={`${homeRole}/points`}>我的积分</Link>,
      },
      {
        key: 'profile',
        icon: <UserOutlined />,
        label: <Link href={`${homeRole}/profile`}>个人信息</Link>,
      },
      // 为学生和社长添加社团积分列表菜单项
      {
        key: 'club-points',
        icon: <KeyOutlined />,
        label: <Link href={`${homeRole}/club-points`}>社团积分论坛</Link>,
      }
    ];

    if (role === 2) { // 社长
      menuItems.push({
        key: 'club-management',
        icon: <CrownOutlined />,
        label: <>社长功能</>,
        children: [
          {
            key: 'create-activity',
            label: <Link href={`${homeRole}/create-activity`}>创建活动</Link>,
          },
          {
            key: 'manage-members',
            label: <Link href={`${homeRole}/manage-members`}>管理成员</Link>,
          },
          {
            key: 'activity-stats',
            label: <Link href={`${homeRole}/activity-stats`}>活动统计</Link>,
          }
        ]
      });
    }
  }

  // 在客户端渲染之前返回一个空的侧边栏
  if (!mounted) {
    return (
      <Sider 
        trigger={null} 
        collapsible 
        collapsed={collapsed}
        className={styles.sidebar}
        width={220}
      >
        <div style={{ display: 'none' }} />
      </Sider>
    );
  }

  return (
    <Sider 
      trigger={null} 
      collapsible 
      collapsed={collapsed}
      className={styles.sidebar}
      width={220}
      theme="light"
    >
      <Menu
        mode="inline"
        selectedKeys={[selectedKey]}
        openKeys={!collapsed ? openKeys : []}
        onOpenChange={handleOpenChange}
        items={menuItems}
        className={styles.sideMenu}
        style={{ 
          height: '100%', 
          borderRight: 0,
          background: token.colorBgContainer
        }}
      />
    </Sider>
  );
}