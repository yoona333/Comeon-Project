'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Table, Tag, Button, Modal, Form, Input, Checkbox, Space, Card, App, Popconfirm, Tooltip, Select } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, KeyOutlined } from '@ant-design/icons';
import { jwtDecode } from 'jwt-decode';

const { TextArea } = Input;

interface CustomJwtPayload {
  exp?: number;
  role: number;
  userId: number;
}

interface User {
  id: number;
  username: string;
  bio: string;
  role: number;
  created_at: string;
  updated_at: string;
}

interface Role {
  id: number;
  name: string;
  description: string;
  permissions: string[];
  created_at: string;
  role?: number;
}

// 定义 roleOptions
const roleOptions = [
  { value: 0, label: '管理员' },
  { value: 1, label: '学生' },
  { value: 2, label: '社长' }
];

// 系统权限列表
const permissionOptions = [
  { label: '用户管理', value: 'user:manage', group: '用户权限' },
  { label: '用户查看', value: 'user:view', group: '用户权限' },
  { label: '角色管理', value: 'role:manage', group: '用户权限' },
  { label: '社团管理', value: 'club:manage', group: '社团权限' },
  { label: '社团查看', value: 'club:view', group: '社团权限' },
  { label: '活动创建', value: 'activity:create', group: '活动权限' },
  { label: '活动编辑', value: 'activity:edit', group: '活动权限' },
  { label: '活动审批', value: 'activity:approve', group: '活动权限' },
  { label: '活动查看', value: 'activity:view', group: '活动权限' },
  { label: '系统设置', value: 'system:settings', group: '系统权限' },
  { label: '数据统计', value: 'stats:view', group: '系统权限' },
];

// 按组分类权限
const permissionGroups = permissionOptions.reduce((groups: any, item) => {
  const group = groups[item.group] || [];
  group.push(item);
  groups[item.group] = group;
  return groups;
}, {});

const UserRolesPage: React.FC = () => {
  const router = useRouter();
  const [users, setUserRoles] = useState<User[]>([]); // 修改为 users
  const [loading, setLoading] = useState(true);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [form] = Form.useForm();
  const { message: messageApi, notification } = App.useApp();

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = () => {
    const token = localStorage.getItem('token');
    if (!token) {
      messageApi.error('请先登录');
      router.push('/login');
      return;
    }

    try {
      const decoded = jwtDecode<CustomJwtPayload>(token);
      if (decoded.exp && decoded.exp < Date.now() / 1000) {
        messageApi.error('登录已过期，请重新登录');
        router.push('/login');
        return;
      }

      // 只有管理员可以访问
      if (decoded.role !== 0) {
        messageApi.error('您没有管理员权限');
        router.push('/login');
        return;
      }

      fetchUserRoles(token);
    } catch (error) {
      messageApi.error('无效的登录信息，请重新登录');
      router.push('/login');
    }
  };

  const fetchUserRoles = async (token: string) => {
    try {
      setLoading(true);
      const response = await fetch('http://localhost:8080/api/roles', {
        headers: {
          'x-access-token': token
        },
      });

      if (!response.ok) {
        throw new Error('获取用户角色列表失败');
      }

      const data = await response.json();
      if (data.success && Array.isArray(data.data)) {
        setUserRoles(data.data);
      } else {
        console.error('数据格式错误:', data);
        notification.error({
          message: '获取用户角色列表失败',
          description: '数据格式不符合预期',
          duration: 4
        });
      }
    } catch (err) {
      console.error('获取用户角色列表失败:', err);
      notification.error({
        message: '获取用户角色列表失败',
        description: err instanceof Error ? err.message : '未知错误',
        duration: 4
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    const token = localStorage.getItem('token');
    // 检查 token 是否存在
    if (!token) {
      messageApi.error('请先登录才能进行删除操作');
      return;
    }

    try {
      // 验证 token 权限
      const decoded = jwtDecode<CustomJwtPayload>(token);
      if (decoded.role !== 0) {
        messageApi.error('您没有管理员权限，无法删除用户');
        return;
      }

      messageApi.loading('正在删除用户...');

      const response = await fetch(`http://localhost:8080/api/users/${id}`, {
        method: 'DELETE',
        headers: {
          'x-access-token': token
        }
      });

      if (!response.ok) {
        // 尝试解析错误响应
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.message || `删除用户失败，状态码: ${response.status}`;
        throw new Error(errorMessage);
      }

      messageApi.success('用户已删除');
      // 重新获取用户列表
      // 原代码中使用的 fetchUsers 未定义，根据上下文推测应使用 fetchUserRoles 方法
      await fetchUserRoles(token);
    } catch (error) {
      console.error('删除用户失败:', error);
      const errorMessage = error instanceof Error ? error.message : '删除用户时发生未知错误';
      notification.error({
        message: '删除用户失败',
        description: errorMessage,
        duration: 4
      });
    }
  };

  const showModal = (user?: User) => {
    if (user) {
      setEditingRole({
        id: user.id,
        name: user.username,
        description: user.bio,
        permissions: [],
        created_at: user.created_at
      });
      form.setFieldsValue({
        username: user.username,
        bio: user.bio,
        role: user.role,
        permissions: []
      });
    } else {
      setEditingRole(null);
      form.resetFields();
      form.setFieldsValue({ permissions: [] });
    }
    setIsModalVisible(true);
  };

  const handleCancel = () => {
    setIsModalVisible(false);
    setEditingRole(null);
    form.resetFields();
  };

  const handleSubmit = async (values: any) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const roleData = {
        ...values,
        permissions: values.permissions || [],
      };

      const user = editingRole;
      if (user) {
        const currentRole = user.role as number;
        if (currentRole === 2 && roleData.role === 1) {
          // 社长转学生，需要选择新社长
          const newLeaderId = await showNewLeaderSelectionModal();
          if (!newLeaderId) {
            return;
          }
          roleData.newLeaderId = newLeaderId;
        } else if (currentRole === 1 && roleData.role === 2) {
          // 学生转社长，需要选择社团
          const newClubId = await showClubSelectionModal();
          if (!newClubId) {
            return;
          }
          roleData.newClubId = newClubId;
        }
      }

      messageApi.loading(editingRole ? '正在更新角色...' : '正在创建角色...');

      if (editingRole) {
        const response = await fetch(`http://localhost:8080/api/roles/${editingRole.id}`, {
          method: 'PUT',
          headers: {
            'x-access-token': token,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(roleData)
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.message || '更新角色失败');
        }

        messageApi.success('角色更新成功');
      } else {
        const response = await fetch('http://localhost:8080/api/roles', {
          method: 'POST',
          headers: {
            'x-access-token': token,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(roleData)
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.message || '创建角色失败');
        }

        messageApi.success('角色创建成功');
      }

      setIsModalVisible(false);
      form.resetFields();
      setEditingRole(null);
      fetchUserRoles(token);
    } catch (error) {
      console.error('保存角色失败:', error);
      notification.error({
        message: '保存角色失败',
        description: error instanceof Error ? error.message : '未知错误',
        duration: 4
      });
    }
  };

  // 模拟显示选择新社长的模态框
  const showNewLeaderSelectionModal = async () => {
    return new Promise<number | null>((resolve) => {
      Modal.confirm({
        title: '请选择新的社长',
        content: (
          <Select
            options={users.filter(user => user.role === 1).map(user => ({
              value: user.id,
              label: user.username
            }))}
          />
        ),
        onOk: (value) => resolve(value),
        onCancel: () => resolve(null),
      });
    });
  };

  // 模拟显示选择社团的模态框
  const showClubSelectionModal = async () => {
    // 这里需要从后端获取社团列表
    try {
      const response = await fetch('http://localhost:8080/api/clubs');
      if (!response.ok) {
        throw new Error('获取社团列表失败');
      }
      const data = await response.json();
      return new Promise<number | null>((resolve) => {
        Modal.confirm({
          title: '请选择要担任社长的社团',
          content: (
            <Select
              options={data.data.map((club: any) => ({
                value: club.id,
                label: club.name
              }))}
            />
          ),
          onOk: (value) => resolve(value),
          onCancel: () => resolve(null),
        });
      });
    } catch (error) {
      console.error('获取社团列表失败:', error);
      messageApi.error('获取社团列表失败，请稍后再试');
      return null;
    }
  };

  const columns = [
    {
      title: '用户名',
      dataIndex: 'username',
      key: 'username',
    },
    {
      title: '个人简介',
      dataIndex: 'bio',
      key: 'bio',
      ellipsis: {
        showTitle: false,
      },
      render: (bio: string) => (
        <Tooltip placement="topLeft" title={bio}>
          {bio}
        </Tooltip>
      ),
    },
    {
      title: '角色',
      dataIndex: 'role',
      key: 'role',
      render: (role: number) => {
        const roleObj = roleOptions.find(option => option.value === role);
        return roleObj ? <Tag color="blue">{roleObj.label}</Tag> : null;
      },
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (text: string) => new Date(text).toLocaleString(),
      sorter: (a: User, b: User) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
    },
    {
      title: '更新时间',
      dataIndex: 'updated_at',
      key: 'updated_at',
      render: (text: string) => new Date(text).toLocaleString(),
      sorter: (a: User, b: User) => new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime(),
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: User) => (
        <Space>
          <Button type="primary" size="small" icon={<EditOutlined />} onClick={() => showModal(record)}>
            编辑
          </Button>
          <Popconfirm
            title="确定要删除这个用户角色吗？"
            description="此操作将删除该用户角色。"
            onConfirm={() => handleDelete(record.id)}
            okText="确定"
            cancelText="取消"
          >
            <Button type="primary" danger size="small" icon={<DeleteOutlined />}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: '24px' }}>
      <Card title="用户角色管理" >
        <Table columns={columns} dataSource={users} rowKey="id" loading={loading} pagination={{ pageSize: 10 }} />
      </Card>

      {/* 角色创建/编辑表单 */}
      <Modal
        title={editingRole ? '编辑角色' : '创建角色'}
        open={isModalVisible}
        onCancel={handleCancel}
        footer={null}
        width={700}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item
            name="username"
            label="用户名"
            rules={[{ required: true, message: '请输入用户名' }]}
          >
            <Input placeholder="请输入用户名" />
          </Form.Item>

          <Form.Item
            name="bio"
            label="个人简介"
            rules={[{ required: true, message: '请输入个人简介' }]}
          >
            <TextArea rows={2} placeholder="请输入个人简介" />
          </Form.Item>

          <Form.Item
            name="role"
            label="角色"
            rules={[{ required: true, message: '请选择角色' }]}
          >
            <Select options={roleOptions} />
          </Form.Item>

          <Form.Item>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <Button onClick={handleCancel} style={{ marginRight: 8 }}>
                取消
              </Button>
              <Button type="primary" htmlType="submit">
                {editingRole ? '更新' : '创建'}
              </Button>
            </div>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default UserRolesPage;