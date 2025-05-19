'use client';

import { useState, useEffect } from 'react';
import { Alert, Button, Modal, Space, Tag } from 'antd';
import { InfoCircleOutlined, UserOutlined, CrownOutlined, SafetyCertificateOutlined } from '@ant-design/icons';

interface MultiLoginTipsProps {
  position?: 'top' | 'bottom';
  forPage?: string;
}

export default function MultiLoginTips({ position = 'top', forPage }: MultiLoginTipsProps) {
  const [visible, setVisible] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [storage, setStorage] = useState<'local' | 'session' | 'none'>('none');
  const [role, setRole] = useState<string | null>(null);
  
  useEffect(() => {
    // 检测当前使用的存储方式和角色
    if (sessionStorage.getItem('auth_mode') === 'session') {
      setStorage('session');
      setRole(sessionStorage.getItem('role'));
    } else if (localStorage.getItem('token')) {
      setStorage('local');
      setRole(localStorage.getItem('role'));
    }
  }, []);
  
  // 如果没有登录信息，则不显示
  if (storage === 'none') {
    return null;
  }
  
  // 角色标签颜色映射
  const getRoleInfo = () => {
    switch (role) {
      case '0':
        return { text: '管理员', color: '#f50', icon: <SafetyCertificateOutlined /> };
      case '1':
        return { text: '学生', color: '#108ee9', icon: <UserOutlined /> };
      case '2':
        return { text: '社长', color: '#87d068', icon: <CrownOutlined /> };
      default:
        return { text: '未知角色', color: '#999', icon: <UserOutlined /> };
    }
  };
  
  const roleInfo = getRoleInfo();
  
  // 判断当前登录方式
  const getLoginMethodInfo = () => {
    if (storage === 'session') {
      return { 
        text: '会话登录', 
        description: '使用会话存储(sessionStorage)，关闭标签页后自动退出登录',
        alert: '您正在使用【社长专用】的会话登录模式，关闭标签页后将退出登录'
      };
    } else {
      return { 
        text: '长期登录', 
        description: '使用本地存储(localStorage)，关闭浏览器后仍保持登录状态',
        alert: role === '1' ? '您正在使用学生账号，建议使用隐身窗口登录以避免角色冲突' : '您已登录系统'
      };
    }
  };
  
  const loginInfo = getLoginMethodInfo();
  
  // 打开详细说明弹窗
  const showLoginInfoModal = () => {
    setModalVisible(true);
  };
  
  return (
    <>
      {visible && (
        <Alert
          message={
            <Space>
              {roleInfo.icon} <span>{loginInfo.alert}</span>
              <Tag color={roleInfo.color} style={{ marginLeft: 8 }}>{roleInfo.text}</Tag>
              <Tag color={storage === 'session' ? '#87d068' : '#2db7f5'}>
                {loginInfo.text}
              </Tag>
            </Space>
          }
          type={storage === 'session' ? "success" : (role === '1' ? "warning" : "info")}
          showIcon={false}
          closable
          onClose={() => setVisible(false)}
          style={{ 
            marginBottom: position === 'top' ? 16 : 0,
            marginTop: position === 'bottom' ? 16 : 0
          }}
          action={
            <Button size="small" type="link" onClick={showLoginInfoModal}>
              查看多账号登录提示
            </Button>
          }
        />
      )}
      
      <Modal
        title="多角色登录最佳实践"
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setModalVisible(false)}>
            关闭
          </Button>
        ]}
        width={600}
      >
        <div style={{ marginBottom: 20 }}>
          <h3>不同角色的推荐登录方式：</h3>
          <ul>
            <li style={{ margin: '10px 0' }}>
              <Tag color="#f50" icon={<SafetyCertificateOutlined />} style={{ marginRight: 8 }}>管理员</Tag>
              <strong>普通登录</strong> (localStorage) - 长期保持登录状态
            </li>
            <li style={{ margin: '10px 0' }}>
              <Tag color="#87d068" icon={<CrownOutlined />} style={{ marginRight: 8 }}>社长</Tag>
              <strong>会话登录</strong> (sessionStorage) - 关闭标签页自动退出，适合频繁操作
            </li>
            <li style={{ margin: '10px 0' }}>
              <Tag color="#108ee9" icon={<UserOutlined />} style={{ marginRight: 8 }}>学生</Tag>
              <strong>隐身窗口</strong> - 独立的浏览环境，避免与其他角色冲突
            </li>
          </ul>
          
          <h3 style={{ marginTop: 20 }}>为什么要这样设计？</h3>
          <p>
            由于浏览器本地存储(localStorage)的特性，同一浏览器中所有标签页共享同一个存储空间，这会导致不同角色登录时发生冲突。
            我们采用以下策略解决此问题：
          </p>
          <ul>
            <li>管理员：使用普通登录，适合长期使用系统的场景</li>
            <li>社长：使用会话存储，关闭标签页后自动退出，可与其他角色并存</li>
            <li>学生：建议使用隐身窗口，完全隔离的环境，避免任何冲突</li>
          </ul>
          
          <Alert
            message="系统已经根据您的角色自动选择最佳存储方式"
            description="登录时无需手动选择，系统会智能判断您的角色并应用适当的登录模式。"
            type="success"
            showIcon
            style={{ marginTop: 20 }}
          />
        </div>
      </Modal>
    </>
  );
} 