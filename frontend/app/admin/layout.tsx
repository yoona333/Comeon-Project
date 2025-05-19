'use client';

import { useState, useEffect } from 'react';
import { Layout } from 'antd';
import Header from '../../src/components/ui/Header';
import Sidebar from '../../src/components/ui/Sidebar';
import styles from '../../src/styles/Layout.module.scss';
import { useRouter } from 'next/navigation';
import axios from 'axios';

const { Content } = Layout;

interface SidebarProps {
  collapsed: boolean;
  role?: string;
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [adminInfo, setAdminInfo] = useState({ name: '管理员', avatar: '' });
  const router = useRouter();
  
  useEffect(() => {
    setMounted(true);
    // 获取用户信息
    fetchUserInfo();
  }, []);
  
  const fetchUserInfo = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }
    
    try {
      // 假设有一个获取当前用户信息的接口
      const response = await axios.get('http://localhost:8080/api/user/profile', {
        headers: { 'x-access-token': token }
      });
      
      if (response.data.success) {
        const userInfo = response.data.data;
        setAdminInfo({
          name: userInfo.name || '管理员',
          avatar: userInfo.avatar || ''
        });
      }
    } catch (error) {
      console.error('获取用户信息失败:', error);
      // 如果获取失败，继续使用默认值
    }
  };
  
  const toggleCollapsed = () => {
    setCollapsed(!collapsed);
  };
  
  // 在客户端渲染之前返回一个空的布局
  if (!mounted) {
    return (
      <Layout className={styles.appLayout}>
        <div style={{ display: 'none' }} />
      </Layout>
    );
  }
  
  return (
    <Layout className={styles.appLayout}>
      <Header 
        role="admin" 
        userName={adminInfo.name} 
        collapsed={collapsed} 
        toggleCollapsed={toggleCollapsed} 
        userAvatar={adminInfo.avatar}
      />
      <Layout>
        <Sidebar 
          collapsed={collapsed} 
        />
        <Content className={`${styles.content} ${collapsed ? styles.contentCollapsed : ''}`}>
          <div className={styles.contentWrapper}>
            {children}
          </div>
        </Content>
      </Layout>
    </Layout>
  );
} 