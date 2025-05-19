'use client';

import { Card, Table, Tag, Button, Input, message, Modal, Row, Col, Select, Space, Badge } from 'antd';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { jwtDecode } from 'jwt-decode';
import { SearchOutlined, EyeOutlined, CheckCircleOutlined } from '@ant-design/icons';

const { Option } = Select;

// 更新接口定义，添加社长相关字段
interface Club {
  id: number;
  name: string;
  description: string;
  member_count: number;
  is_joined?: boolean;
  username: string; // 新增社长用户名
}

export default function StudentClubs() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [clubs, setClubs] = useState<Club[]>([]);
  const [searchText, setSearchText] = useState('');

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
      const decoded = jwtDecode(token);
      if (decoded.exp && decoded.exp < Date.now() / 1000) {
        message.error('登录已过期，请重新登录');
        router.push('/login');
        return;
      }

      fetchClubs(token);
    } catch (error) {
      message.error('无效的登录信息，请重新登录');
      router.push('/login');
    }
  };

  const fetchClubs = async (token: string) => {
    try {
      setLoading(true);
      let url = 'http://localhost:8080/api/clubs';

      const response = await axios.get(url, {
        headers: { 'x-access-token': token }
      });

      if (response.data.success) {
        const clubsData = response.data.data;

        // 获取用户已加入的社团
        const joinsResponse = await axios.get('http://localhost:8080/api/clubs/joins', {
          headers: { 'x-access-token': token }
        });

        const joinedClubIds = joinsResponse.data.success ?
          joinsResponse.data.data.map((join: any) => join.club_id) : [];

        // 标记用户已加入的社团
        const clubsWithJoin = clubsData.map((club: Club) => ({
          ...club,
          is_joined: joinedClubIds.includes(club.id)
        }));

        setClubs(clubsWithJoin);
      }
    } catch (error) {
      console.error('获取社团列表失败:', error);
      message.error('获取社团列表失败，请检查网络连接');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    const token = localStorage.getItem('token');
    if (token) {
      fetchClubs(token);
    }
  };

  const handleJoinClub = async (clubId: number) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `http://localhost:8080/api/clubs/${clubId}/join`,
        {},
        { headers: { 'x-access-token': token } }
      );

      if (response.data.success) {
        message.success('加入社团成功');
        // 刷新社团列表
        fetchClubs(token!);
      }
    } catch (error: any) {
      console.error('加入社团失败:', error);
      if (error.response && error.response.data.message) {
        message.error(error.response.data.message);
      } else {
        message.error('加入社团失败，请稍后再试');
      }
    }
  };

  const handleLeaveClub = async (clubId: number) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.delete(
        `http://localhost:8080/api/clubs/${clubId}/leave`,
        {
          headers: { 'x-access-token': token }
        }
      );

      if (response.data.success) {
        message.success('退出社团成功');
        // 刷新社团列表
        fetchClubs(token!);
      }
    } catch (error: any) {
      console.error('退出社团失败:', error);
      if (error.response && error.response.data.message) {
        message.error(error.response.data.message);
      } else {
        message.error('退出社团失败，请稍后再试');
      }
    }
  };

  // 过滤社团列表
  const filteredClubs = clubs.filter(club => {
    return club.name.toLowerCase().includes(searchText.toLowerCase());
  });

  const columns = [
    {
      title: '社团名称',
      dataIndex: 'name',
      key: 'name',
      render: (text: string, record: Club) => (
        <Space>
          {record.is_joined && <Badge status="success" />}
          {text}
        </Space>
      ),
    },
    // {
    //   title: '参与人数',
    //   dataIndex: 'member_count',
    //   key: 'member_count',
    // },
    // 新增社长用户名列
    // {
    //   title: '社长',
    //   dataIndex: 'username',
    //   key: 'username',
    // },
    // 新增社长描述列
    {
      title: '社团目标',
      dataIndex: 'description',
      key: 'description',
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: Club) => (
        <Space>
          {!record.is_joined && (
            <Button
              type="link"
              icon={<CheckCircleOutlined />}
              onClick={() => handleJoinClub(record.id)}
            >
              参与
            </Button>
          )}
          {record.is_joined && (
            <Button
              type="link"
              danger
              onClick={() => handleLeaveClub(record.id)}
            >
              退出社团
            </Button>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Card
        title="社团列表"
        extra={
          <Space>
            <Input
              placeholder="搜索社团名称"
              value={searchText}
              onChange={e => setSearchText(e.target.value)}
              prefix={<SearchOutlined />}
              style={{ width: 220 }}
            />
            <Button type="primary" onClick={handleSearch}>查询</Button>
          </Space>
        }
      >
        <Table
          columns={columns}
          dataSource={filteredClubs}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 10 }}
        />
      </Card>
    </div>
  );
}