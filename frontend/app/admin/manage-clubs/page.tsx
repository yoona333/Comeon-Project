'use client';

import { Table, Tag, Button, message, Modal, Form, Input, Select, Space, Card, Popconfirm } from 'antd';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { jwtDecode } from 'jwt-decode';
import { SearchOutlined, PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';

// 自定义JWT接口
interface CustomJwtPayload {
  exp?: number;
  role: number;
}

const { TextArea } = Input;

interface Club {
  id: number;
  name: string;
  description: string;
  leader_id: number;
  leader_name: string;
  created_at: string;
}

export default function ManageClubs() {
  const router = useRouter();
  const [clubs, setClubs] = useState<Club[]>([]);
  const [loading, setLoading] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingClub, setEditingClub] = useState<Club | null>(null);
  const [users, setUsers] = useState<{id: number, username: string}[]>([]);
  const [form] = Form.useForm();

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
        router.push('/login');
        return;
      }

      fetchClubs(token);
      fetchUsers(token);
    } catch (error) {
      message.error('无效的登录信息，请重新登录');
      router.push('/login');
    }
  };

  const fetchUsers = async (token: string) => {
    try {
      const response = await axios.get('http://localhost:8080/api/users', {
        headers: { 'x-access-token': token }
      });
      setUsers(response.data.data);
    } catch (error) {
      console.error('获取用户列表失败:', error);
      message.error('获取用户列表失败');
    }
  };

  const fetchClubs = async (token: string) => {
    try {
      setLoading(true);
      const response = await axios.get('http://localhost:8080/api/clubs', {
        headers: { 'x-access-token': token }
      });
      setClubs(response.data.data);
    } catch (error) {
      console.error('获取社团列表失败:', error);
      message.error('获取社团列表失败');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`http://localhost:8080/api/clubs/${id}`, {
        headers: { 'x-access-token': token }
      });
      message.success('社团已删除');
      fetchClubs(token!);
    } catch (error) {
      console.error('删除社团失败:', error);
      message.error('删除社团失败');
    }
  };

  const showModal = (club?: Club) => {
    if (club) {
      setEditingClub(club);
      form.setFieldsValue({
        ...club
      });
    } else {
      setEditingClub(null);
      form.resetFields();
    }
    setIsModalVisible(true);
  };

  const handleCancel = () => {
    setIsModalVisible(false);
    form.resetFields();
    setEditingClub(null);
  };

  const handleSubmit = async (values: any) => {
    try {
      const token = localStorage.getItem('token');
      if (editingClub) {
        await axios.put(`http://localhost:8080/api/clubs/${editingClub.id}`, 
          values,
          { headers: { 'x-access-token': token } }
        );
        message.success('社团更新成功');
      } else {
        await axios.post('http://localhost:8080/api/clubs', 
          values,
          { headers: { 'x-access-token': token } }
        );
        message.success('社团创建成功');
      }
      
      setIsModalVisible(false);
      form.resetFields();
      setEditingClub(null);
      fetchClubs(token!);
    } catch (error) {
      console.error('保存社团失败:', error);
      message.error('保存社团失败');
    }
  };

  const columns = [
    {
      title: '社团名称',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: '社团描述',
      dataIndex: 'description',
      key: 'description',
    },
    {
      title: '负责人',
      dataIndex: 'leader_name',
      key: 'leader_name',
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (text: string) => new Date(text).toLocaleString(),
    },
    {
      title: '操作',
      key: 'action',
      render: (_: unknown, record: Club) => (
        <Space>
          <Button type="link" icon={<EditOutlined />} onClick={() => showModal(record)}>
            编辑
          </Button>
          <Popconfirm
            title="确定要删除这个社团吗？"
            onConfirm={() => handleDelete(record.id)}
            okText="确定"
            cancelText="取消"
          >
            <Button type="link" danger icon={<DeleteOutlined />}>删除</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Card>
        <div style={{ marginBottom: 16 }}>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => showModal()}>
            创建社团
          </Button>
        </div>

        <Table
          columns={columns}
          dataSource={clubs}
          rowKey="id"
          loading={loading}
        />
      </Card>

      <Modal
        title={editingClub ? '编辑社团' : '创建社团'}
        open={isModalVisible}
        onCancel={handleCancel}
        footer={null}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
        >
          <Form.Item
            name="name"
            label="社团名称"
            rules={[{ required: true, message: '请输入社团名称' }]}
          >
            <Input />
          </Form.Item>

          <Form.Item
            name="description"
            label="社团描述"
            rules={[{ required: true, message: '请输入社团描述' }]}
          >
            <TextArea rows={4} />
          </Form.Item>

          <Form.Item
            name="leader_id"
            label="负责人"
            rules={[{ required: true, message: '请选择负责人' }]}
          >
            <Select
              placeholder="请选择负责人"
              allowClear
            >
              {users.map(user => (
                <Select.Option key={user.id} value={user.id}>
                  {user.username}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit">
              {editingClub ? '更新' : '创建'}
            </Button>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
} 