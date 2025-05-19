'use client';

import { useState, useRef, useEffect } from 'react';
import { Card, Table, Tag, Button, Space, Input, Form, Row, Col, Select, DatePicker, Modal, message, Popconfirm, Switch, Avatar, Upload } from 'antd';
import { SearchOutlined, PlusOutlined, EditOutlined, DeleteOutlined, ExclamationCircleOutlined, UserOutlined, LockOutlined, UnlockOutlined, UploadOutlined, CameraOutlined } from '@ant-design/icons';
import type { InputRef } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import styles from '../../../src/styles/Admin.module.scss';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { jwtDecode } from 'jwt-decode';

const { Option } = Select;
const { RangePicker } = DatePicker;
const { confirm } = Modal;
const { TextArea } = Input;

interface User {
  key: string;
  id: string;
  name: string;
  email: string;
  phone: string;
  department: string;
  role: 'student' | 'club_admin' | 'admin';
  status: 'active' | 'inactive';
  registerDate: string;
  lastLogin: string;
  points: number;
  avatar?: string;
}

// 定义JWT负载接口
interface CustomJwtPayload {
  exp?: number;
  role: number;
  userId: number;
}

export default function ManageUsers() {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [form] = Form.useForm();
  const searchInput = useRef<InputRef>(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [clubs, setClubs] = useState<{id: number, name: string}[]>([]);

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

      fetchUsers(token);
      fetchClubs(token);
    } catch (error) {
      message.error('无效的登录信息，请重新登录');
      router.push('/login');
    }
  };

  const fetchClubs = async (token: string) => {
    try {
      const response = await axios.get('http://localhost:8080/api/clubs', {
        headers: { 'x-access-token': token }
      });
      setClubs(response.data.data);
    } catch (error) {
      console.error('获取社团列表失败:', error);
      message.error('获取社团列表失败');
    }
  };

  const fetchUsers = async (token: string) => {
    try {
      setLoading(true);
      const response = await axios.get('http://localhost:8080/api/users', {
        headers: { 'x-access-token': token }
      });
      setUsers(response.data.data);
    } catch (error) {
      console.error('获取用户列表失败:', error);
      message.error('获取用户列表失败');
    } finally {
      setLoading(false);
    }
  };

  // 表格列定义
  const columns: ColumnsType<User> = [
    {
      title: '头像',
      dataIndex: 'avatar',
      key: 'avatar',
      width: 80,
      render: (avatar, record) => (
        <Avatar 
          size={40} 
          src={avatar} 
          icon={<UserOutlined />}
          style={{ backgroundColor: !avatar ? '#1890ff' : undefined }}
        >
          {!avatar && record.name ? record.name.charAt(0) : null}
        </Avatar>
      ),
    },
    {
      title: '学号/工号',
      dataIndex: 'id',
      key: 'id',
      sorter: (a, b) => a.id.localeCompare(b.id),
    },
    {
      title: '姓名',
      dataIndex: 'name',
      key: 'name',
      render: (text, record) => (
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <a onClick={() => handleViewProfile(record)}>{text}</a>
        </div>
      ),
    },
    {
      title: '邮箱',
      dataIndex: 'email',
      key: 'email',
    },
    {
      title: '手机号',
      dataIndex: 'phone',
      key: 'phone',
    },
    {
      title: '院系',
      dataIndex: 'department',
      key: 'department',
    },
    {
      title: '角色',
      dataIndex: 'role',
      key: 'role',
      render: (role) => {
        let color = '';
        let text = '';
        
        switch(role) {
          case 'student':
            color = 'blue';
            text = '学生';
            break;
          case 'club_admin':
            color = 'purple';
            text = '社团管理员';
            break;
          case 'admin':
            color = 'gold';
            text = '系统管理员';
            break;
        }
        
        return <Tag color={color}>{text}</Tag>;
      },
      filters: [
        { text: '学生', value: 'student' },
        { text: '社团管理员', value: 'club_admin' },
        { text: '系统管理员', value: 'admin' },
      ],
      onFilter: (value, record) => record.role === value,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status, record) => (
        <Switch 
          checkedChildren="启用" 
          unCheckedChildren="禁用" 
          checked={status === 'active'} 
          onChange={(checked) => handleStatusChange(record.id, checked)}
        />
      ),
    },
    {
      title: '积分',
      dataIndex: 'points',
      key: 'points',
      sorter: (a, b) => a.points - b.points,
    },
    {
      title: '注册时间',
      dataIndex: 'registerDate',
      key: 'registerDate',
      sorter: (a, b) => new Date(a.registerDate).getTime() - new Date(b.registerDate).getTime(),
    },
    {
      title: '最后登录',
      dataIndex: 'lastLogin',
      key: 'lastLogin',
      sorter: (a, b) => new Date(a.lastLogin).getTime() - new Date(b.lastLogin).getTime(),
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record) => (
        <div className={styles.actionColumn}>
          <Button 
            type="primary" 
            size="small" 
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          >
            编辑
          </Button>
          <Button 
            size="small" 
            icon={<LockOutlined />}
            onClick={() => handleResetPassword(record)}
          >
            重置密码
          </Button>
          <Popconfirm
            title="删除用户"
            description="确定要删除这个用户吗？"
            onConfirm={() => handleDelete(record)}
            okText="确定"
            cancelText="取消"
          >
            <Button 
              danger 
              size="small" 
              icon={<DeleteOutlined />}
            >
              删除
            </Button>
          </Popconfirm>
        </div>
      ),
    },
  ];
  
  // 处理搜索
  const handleSearch = (values: any) => {
    setLoading(true);
    console.log('搜索参数:', values);
    
    // 模拟API调用
    setTimeout(() => {
      message.success('搜索完成');
      setLoading(false);
    }, 1000);
  };
  
  // 重置搜索表单
  const handleReset = () => {
    form.resetFields();
  };
  
  // 处理添加用户
  const handleAdd = () => {
    message.info('添加用户功能正在开发中...');
  };
  
  // 处理编辑用户
  const handleEdit = (record: User) => {
    message.info(`编辑用户: ${record.name}`);
  };
  
  // 处理删除用户
  const handleDelete = async (record: User) => {
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`http://localhost:8080/api/users/${record.id}`, {
        headers: { 'x-access-token': token }
      });
      message.success(`已删除用户：${record.name}`);
      fetchUsers(token!);
    } catch (error) {
      console.error('删除用户失败:', error);
      message.error('删除用户失败');
    }
  };
  
  // 处理重置密码
  const handleResetPassword = (record: User) => {
    confirm({
      title: '重置密码',
      icon: <ExclamationCircleOutlined />,
      content: `确定要重置 ${record.name} 的密码吗？`,
      okText: '确认',
      cancelText: '取消',
      onOk() {
        message.success(`已重置 ${record.name} 的密码`);
        // 实际应用中应该调用API重置密码
      },
    });
  };
  
  // 处理用户状态变更
  const handleStatusChange = (userId: string, checked: boolean) => {
    const status = checked ? 'active' : 'inactive';
    message.success(`用户 ${userId} 状态已更改为 ${checked ? '启用' : '禁用'}`);
    // 实际应用中应该调用API更新用户状态
  };
  
  // 批量删除
  const handleBatchDelete = () => {
    confirm({
      title: '批量删除',
      icon: <ExclamationCircleOutlined />,
      content: `确定要删除选中的 ${selectedRowKeys.length} 个用户吗？此操作不可恢复。`,
      okText: '确认',
      okType: 'danger',
      cancelText: '取消',
      onOk() {
        message.success(`已删除 ${selectedRowKeys.length} 个用户`);
        setSelectedRowKeys([]);
        // 实际应用中应该调用API批量删除数据
      },
    });
  };
  
  // 批量启用
  const handleBatchEnable = () => {
    message.success(`已启用 ${selectedRowKeys.length} 个用户`);
    setSelectedRowKeys([]);
    // 实际应用中应该调用API批量更新数据
  };
  
  // 批量禁用
  const handleBatchDisable = () => {
    message.success(`已禁用 ${selectedRowKeys.length} 个用户`);
    setSelectedRowKeys([]);
    // 实际应用中应该调用API批量更新数据
  };
  
  // 处理表格选择变化
  const onSelectChange = (newSelectedRowKeys: React.Key[]) => {
    setSelectedRowKeys(newSelectedRowKeys);
  };

  const rowSelection = {
    selectedRowKeys,
    onChange: onSelectChange,
  };
  
  const showModal = (user?: User) => {
    if (user) {
      setEditingUser(user);
      setTimeout(() => {
        form.setFieldsValue({
          username: user.name,
          email: user.email,
          phone: user.phone,
          department: user.department,
          role: user.role,
        });
      }, 0);
    } else {
      setEditingUser(null);
      form.resetFields();
    }
    setIsModalVisible(true);
  };

  const handleCancel = () => {
    setIsModalVisible(false);
    form.resetFields();
    setEditingUser(null);
  };

  const handleSubmit = async (values: any) => {
    try {
      const token = localStorage.getItem('token');
      const data = {
        ...values,
        password: values.password || undefined
      };

      if (editingUser) {
        await axios.put(`http://localhost:8080/api/users/${editingUser.id}`, 
          data,
          { headers: { 'x-access-token': token } }
        );
        message.success('用户更新成功');
      } else {
        await axios.post('http://localhost:8080/api/users', 
          data,
          { headers: { 'x-access-token': token } }
        );
        message.success('用户创建成功');
      }
      
      setIsModalVisible(false);
      form.resetFields();
      setEditingUser(null);
      fetchUsers(token!);
    } catch (error) {
      console.error('保存用户失败:', error);
      message.error('保存用户失败');
    }
  };

  // 查看用户详细信息
  const handleViewProfile = (record: User) => {
    message.info(`查看用户: ${record.name} 的个人信息`);
  };

  // 处理头像上传
  const uploadProps = {
    name: 'avatar',
    action: 'http://localhost:8080/api/upload',
    headers: {
      authorization: localStorage.getItem('token') || '',
    },
    showUploadList: false,
    onChange(info: any) {
      if (info.file.status === 'done') {
        message.success(`${info.file.name} 上传成功`);
        form.setFieldsValue({ avatar: info.file.response.url });
      } else if (info.file.status === 'error') {
        message.error(`${info.file.name} 上传失败`);
      }
    },
  };

  return (
    <div className={styles.adminPage}>
      <h2>用户管理</h2>
      
      <Card className={styles.searchForm}>
        <Form
          form={form}
          layout="horizontal"
          onFinish={handleSearch}
        >
          <Row gutter={16}>
            <Col xs={24} sm={12} md={8}>
              <Form.Item name="id" label="学号/工号">
                <Input placeholder="请输入学号或工号" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={8}>
              <Form.Item name="name" label="姓名">
                <Input placeholder="请输入姓名" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={8}>
              <Form.Item name="department" label="院系">
                <Input placeholder="请输入院系" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={8}>
              <Form.Item name="role" label="角色">
                <Select placeholder="请选择角色" allowClear>
                  <Option value="student">学生</Option>
                  <Option value="club_admin">社团管理员</Option>
                  <Option value="admin">系统管理员</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={8}>
              <Form.Item name="status" label="状态">
                <Select placeholder="请选择状态" allowClear>
                  <Option value="active">启用</Option>
                  <Option value="inactive">禁用</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={8}>
              <Form.Item name="registerDateRange" label="注册时间">
                <RangePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>
          <Row>
            <Col span={24} className={styles.buttons}>
              <Button onClick={handleReset}>重置</Button>
              <Button type="primary" htmlType="submit" loading={loading} icon={<SearchOutlined />}>
                搜索
              </Button>
            </Col>
          </Row>
        </Form>
      </Card>
      
      <div className={styles.batchActions}>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => showModal()}>
          添加用户
        </Button>
        <div>
          {selectedRowKeys.length > 0 && (
            <>
              <Button 
                type="primary" 
                onClick={handleBatchEnable}
                style={{ marginRight: 8 }}
              >
                批量启用
              </Button>
              <Button 
                onClick={handleBatchDisable}
                style={{ marginRight: 8 }}
              >
                批量禁用
              </Button>
              <Button 
                danger 
                onClick={handleBatchDelete}
              >
                批量删除
              </Button>
            </>
          )}
        </div>
      </div>
      
      <Card className={styles.tableCard}>
        <Table 
          rowSelection={rowSelection}
          columns={columns} 
          dataSource={users} 
          rowKey="key"
          loading={loading}
          pagination={{
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 条记录`,
          }}
          scroll={{ x: 1300 }}
        />
      </Card>

      <Modal
        title={editingUser ? '编辑用户' : '创建用户'}
        open={isModalVisible}
        onCancel={handleCancel}
        footer={null}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
        >
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <Form.Item name="avatar" noStyle>
              <Input type="hidden" />
            </Form.Item>
            <Avatar 
              size={80} 
              src={form.getFieldValue('avatar')} 
              icon={<UserOutlined />}
              style={{ 
                backgroundColor: '#1890ff',
                marginBottom: 16
              }}
            />
            <div>
              <Upload {...uploadProps}>
                <Button icon={<UploadOutlined />}>上传头像</Button>
              </Upload>
            </div>
          </div>

          <Form.Item
            name="username"
            label="用户名"
            rules={[{ required: true, message: '请输入用户名' }]}
          >
            <Input />
          </Form.Item>

          <Form.Item
            name="email"
            label="邮箱"
            rules={[
              { type: 'email', message: '请输入有效的邮箱地址' },
              { required: true, message: '请输入邮箱' }
            ]}
          >
            <Input />
          </Form.Item>

          <Form.Item
            name="phone"
            label="手机号"
          >
            <Input />
          </Form.Item>

          <Form.Item
            name="department"
            label="院系"
          >
            <Input />
          </Form.Item>

          {!editingUser && (
            <Form.Item
              name="password"
              label="密码"
              rules={[{ required: true, message: '请输入密码' }]}
            >
              <Input.Password />
            </Form.Item>
          )}

          <Form.Item
            name="role"
            label="角色"
            rules={[{ required: true, message: '请选择角色' }]}
          >
            <Select>
              <Select.Option value="student">学生</Select.Option>
              <Select.Option value="club_admin">社团管理员</Select.Option>
              <Select.Option value="admin">系统管理员</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit">
              {editingUser ? '更新' : '创建'}
            </Button>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
} 