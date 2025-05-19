'use client';

import { Card, Table, Tag, Button, Input, Modal, Form, Select, message, Row, Col, Space } from 'antd';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { jwtDecode } from 'jwt-decode';
import { UserOutlined, SearchOutlined, EditOutlined, DeleteOutlined, UserAddOutlined } from '@ant-design/icons';

interface CustomJwtPayload {
  exp?: number;
  role: number;
  userId: number;
}

interface User {
  id: number;
  username: string;
  role: number;
  club_names: string;
  created_at: string;
  updated_at: string;
}

export default function ManageMembers() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<User[]>([]);
  const [clubs, setClubs] = useState<any[]>([]);
  const [form] = Form.useForm();
  const [modalVisible, setModalVisible] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
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
      const decoded = jwtDecode<CustomJwtPayload>(token);
      if (decoded.exp && decoded.exp < Date.now() / 1000) {
        message.error('登录已过期，请重新登录');
        router.push('/login');
        return;
      }

      // 只有管理员可以访问
      if (decoded.role !== 0) {
        message.error('您没有管理员权限');
        router.push('/login');
        return;
      }

      fetchData(token);
    } catch (error) {
      message.error('无效的登录信息，请重新登录');
      router.push('/login');
    }
  };

  const fetchData = async (token: string) => {
    try {
      setLoading(true);
      const [usersResponse, clubsResponse] = await Promise.all([
        axios.get('http://localhost:8080/api/users', {
          headers: { 'x-access-token': token }
        }),
        axios.get('http://localhost:8080/api/clubs', {
          headers: { 'x-access-token': token }
        })
      ]);

      if (usersResponse.data.success) {
        setUsers(usersResponse.data.data);
      }

      if (clubsResponse.data.success) {
        setClubs(clubsResponse.data.data);
      }
    } catch (error) {
      console.error('获取数据失败:', error);
      message.error('获取数据失败，请检查网络连接');
    } finally {
      setLoading(false);
    }
  };

  const showCreateModal = () => {
    form.resetFields();
    setEditingUser(null);
    setModalVisible(true);
  };

  const handleEdit = (record: User) => {
    setEditingUser(record);
    form.setFieldsValue({
      username: record.username,
      role: record.role,
    });
    setModalVisible(true);
  };

  const handleDelete = async (id: number) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.delete(`http://localhost:8080/api/users/${id}`, {
        headers: { 'x-access-token': token }
      });

      if (response.data.success) {
        message.success('成员删除成功');
        fetchData(token!);
      }
    } catch (error) {
      console.error('删除成员失败:', error);
      message.error('删除成员失败');
    }
  };

  const handleModalOk = async () => {
    try {
      const values = await form.validateFields();
      const token = localStorage.getItem('token');
      
      if (editingUser) {
        // 更新用户
        const response = await axios.put(
          `http://localhost:8080/api/users/${editingUser.id}`,
          values,
          { headers: { 'x-access-token': token } }
        );
        
        if (response.data.success) {
          message.success('成员信息更新成功');
          setModalVisible(false);
          fetchData(token!);
        }
      } else {
        // 创建用户
        const response = await axios.post(
          'http://localhost:8080/api/users',
          values,
          { headers: { 'x-access-token': token } }
        );
        
        if (response.data.success) {
          message.success('成员创建成功');
          setModalVisible(false);
          fetchData(token!);
        }
      }
    } catch (error) {
      console.error('保存成员信息失败:', error);
      message.error('保存成员信息失败');
    }
  };

  const getRoleTag = (role: number) => {
    switch (role) {
      case 0:
        return <Tag color="red">管理员</Tag>;
      case 1:
        return <Tag color="blue">学生</Tag>;
      case 2:
        return <Tag color="green">社长</Tag>;
      default:
        return <Tag color="default">未知</Tag>;
    }
  };

  const filteredUsers = users.filter(user => 
    user.username.toLowerCase().includes(searchText.toLowerCase()) ||
    (user.club_names && user.club_names.toLowerCase().includes(searchText.toLowerCase()))
  );

  const columns = [
    {
      title: '用户名',
      dataIndex: 'username',
      key: 'username',
    },
    {
      title: '角色',
      dataIndex: 'role',
      key: 'role',
      render: (role: number) => {
        const roleMap = {
          0: { text: '管理员', color: 'red' },
          1: { text: '学生', color: 'blue' },
          2: { text: '社长', color: 'green' }
        };
        const roleInfo = roleMap[role as keyof typeof roleMap];
        return <Tag color={roleInfo.color}>{roleInfo.text}</Tag>;
      }
    },
    {
      title: '所属社团',
      dataIndex: 'club_names',
      key: 'club_names',
      render: (club_names: string) => club_names ? club_names.split(',').map((name: string) => (
        <Tag key={name} color="purple">{name}</Tag>
      )) : '-'
    },
    {
      title: '注册时间',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (date: string) => new Date(date).toLocaleString()
    },
    {
      title: '操作',
      key: 'action',
      render: (_: unknown, record: User) => (
        <Space>
          <Button 
            type="primary" 
            icon={<EditOutlined />} 
            onClick={() => handleEdit(record)}
          >
            编辑
          </Button>
          <Button 
            danger 
            icon={<DeleteOutlined />} 
            onClick={() => handleDelete(record.id)}
          >
            删除
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Card title="成员管理" extra={
        <Row gutter={16}>
          <Col>
            <Input
              placeholder="搜索用户名或社团"
              value={searchText}
              onChange={e => setSearchText(e.target.value)}
              prefix={<SearchOutlined />}
              style={{ width: 200 }}
            />
          </Col>
          <Col>
            <Button 
              type="primary" 
              icon={<UserAddOutlined />}
              onClick={showCreateModal}
            >
              添加成员
            </Button>
          </Col>
        </Row>
      }>
        <Table
          columns={columns}
          dataSource={filteredUsers}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 10 }}
        />
      </Card>

      <Modal
        title={editingUser ? '编辑成员' : '添加成员'}
        open={modalVisible}
        onOk={handleModalOk}
        onCancel={() => setModalVisible(false)}
        okText={editingUser ? '保存' : '创建'}
        cancelText="取消"
        maskClosable={false}
      >
        <Form
          form={form}
          layout="vertical"
        >
          <Form.Item
            name="username"
            label="用户名"
            rules={[{ required: true, message: '请输入用户名' }]}
          >
            <Input prefix={<UserOutlined />} placeholder="请输入用户名" />
          </Form.Item>

          {!editingUser && (
            <Form.Item
              name="password"
              label="密码"
              rules={[{ required: true, message: '请输入密码' }]}
            >
              <Input.Password placeholder="请输入密码" />
            </Form.Item>
          )}

          <Form.Item
            name="role"
            label="角色"
            rules={[{ required: true, message: '请选择角色' }]}
          >
            <Select placeholder="请选择角色">
              <Select.Option value={0}>管理员</Select.Option>
              <Select.Option value={1}>学生</Select.Option>
              <Select.Option value={2}>社长</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="club_id"
            label="所属社团"
          >
            <Select placeholder="请选择社团" allowClear>
              {clubs.map(club => (
                <Select.Option key={club.id} value={club.id}>
                  {club.name}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
} 