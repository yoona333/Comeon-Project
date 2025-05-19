'use client';

import { useState, useEffect } from 'react';
import { Card, Table, Button, message, Popconfirm, Typography } from 'antd';
import axios from 'axios';
import { useRouter } from 'next/navigation';
import { UserOutlined, LockOutlined, ReloadOutlined } from '@ant-design/icons';
import { jwtDecode } from 'jwt-decode';
import styles from '../../../src/styles/Admin.module.scss';

// 自定义JWT接口
interface CustomJwtPayload {
  exp?: number;
  role: number;
}

const { Title } = Typography;

interface PasswordRequest {
  username: string;
}

export default function PasswordRequests() {
  const [requests, setRequests] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = () => {
    const token = localStorage.getItem('token');
    if (!token) {
      message.error('请先登录');
      router.push('/login');
      return;
    }

    try {
      const decoded = jwtDecode<CustomJwtPayload>(token);
      if (decoded.exp && decoded.exp < Date.now() / 1000) {
        message.error('登录已过期，请重新登录');
        router.push('/login');
        return;
      }

      if (decoded.role !== 0) {
        message.error('您没有管理员权限');
        router.push('/student');
        return;
      }

      fetchPasswordRequests(token);
    } catch (error) {
      message.error('无效的登录信息，请重新登录');
      router.push('/login');
    }
  };

  const fetchPasswordRequests = async (token: string) => {
    try {
      setLoading(true);
      const response = await axios.get('http://localhost:8080/ischange/password', {
        headers: { 'x-access-token': token }
      });
      setRequests(response.data);
    } catch (error) {
      console.error('获取密码重置请求失败:', error);
      message.error('获取密码重置请求失败');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (username: string) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post('http://localhost:8080/ischange/password', 
        { username },
        { headers: { 'x-access-token': token } }
      );
      
      message.success(response.data.message);
      
      // 刷新请求列表
      fetchPasswordRequests(token!);
    } catch (error) {
      console.error('处理密码重置请求失败:', error);
      message.error('处理密码重置请求失败');
    }
  };

  const refreshRequests = () => {
    const token = localStorage.getItem('token');
    if (token) {
      fetchPasswordRequests(token);
    }
  };

  const columns = [
    {
      title: '用户名',
      dataIndex: 'username',
      key: 'username',
      render: (username: string) => (
        <span><UserOutlined style={{ marginRight: 8 }} />{username}</span>
      )
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: { username: string; key: string }) => (
        <Popconfirm
          title="确定要重置该用户的密码吗？"
          description="密码将被重置为随机密码，用户将收到新密码。"
          onConfirm={() => handleResetPassword(record.username)}
          okText="确定"
          cancelText="取消"
        >
          <Button type="primary" icon={<LockOutlined />}>
            重置密码
          </Button>
        </Popconfirm>
      ),
    },
  ];

  // 将字符串数组转换为对象数组，以适应Table组件的要求
  const dataSource = requests.map((username) => ({
    username,
    key: username,
  }));

  return (
    <div className={styles.container}>
      <Card 
        title={<Title level={4}>密码重置请求管理</Title>}
        extra={
          <Button 
            type="primary" 
            icon={<ReloadOutlined />} 
            onClick={refreshRequests}
          >
            刷新
          </Button>
        }
      >
        <Table 
          columns={columns} 
          dataSource={dataSource} 
          loading={loading}
          pagination={false}
          locale={{ emptyText: "暂无密码重置请求" }}
        />
      </Card>
    </div>
  );
} 