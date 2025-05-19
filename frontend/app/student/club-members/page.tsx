'use client';

import React, { useState, useEffect } from 'react';
import { Card, Table, Tag, Button, Space, Typography, message, Modal, Form, Input, Select } from 'antd';
import { UserOutlined, PlusOutlined, ReloadOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { jwtDecode } from 'jwt-decode';
import styles from '../../../src/styles/Student.module.scss';

// 自定义JWT接口
interface CustomJwtPayload {
  exp?: number;
  role: number;
}

const { Title } = Typography;
const { Option } = Select;

interface ClubMember {
  id: number;
  username: string;
  role: number;
  status: number;
  created_at: string;
}

export default function ClubMembers() {
  const [members, setMembers] = useState<ClubMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingMember, setEditingMember] = useState<ClubMember | null>(null);
  const [form] = Form.useForm();
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

      // 检查是否为社长
      if (decoded.role !== 2) {
        message.error('您没有社长权限');
        router.push('/student');
        return;
      }

      fetchClubMembers(token);
    } catch (error) {
      message.error('无效的登录信息，请重新登录');
      router.push('/login');
    }
  };

  const fetchClubMembers = async (token: string) => {
    try {
      setLoading(true);
      const response = await axios.get('http://localhost:8080/api/club-members', {
        headers: { 'x-access-token': token }
      });
      setMembers(response.data.data);
    } catch (error) {
      console.error('获取社团成员失败:', error);
      message.error('获取社团成员失败');
    } finally {
      setLoading(false);
    }
  };

  const handleAddMember = () => {
    setEditingMember(null);
    form.resetFields();
    setIsModalVisible(true);
  };

  const handleEditMember = (member: ClubMember) => {
    setEditingMember(member);
    form.setFieldsValue({
      username: member.username,
      role: member.role
    });
    setIsModalVisible(true);
  };

  const handleDeleteMember = async (member: ClubMember) => {
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`http://localhost:8080/api/club-members/${member.id}`, {
        headers: { 'x-access-token': token }
      });
      
      message.success('删除成功');
      fetchClubMembers(token!);
    } catch (error) {
      console.error('删除成员失败:', error);
      message.error('删除成员失败');
    }
  };

  const handleModalCancel = () => {
    setIsModalVisible(false);
    setEditingMember(null);
    form.resetFields();
  };

  const handleModalSubmit = async () => {
    try {
      const values = await form.validateFields();
      const token = localStorage.getItem('token');
      
      if (editingMember) {
        // 编辑现有成员
        await axios.put(`http://localhost:8080/api/club-members/${editingMember.id}`, {
          username: values.username,
          role: values.role
        }, {
          headers: { 'x-access-token': token }
        });
        
        message.success('更新成功');
      } else {
        // 添加新成员
        await axios.post('http://localhost:8080/api/club-members', {
          username: values.username,
          role: values.role
        }, {
          headers: { 'x-access-token': token }
        });
        
        message.success('添加成功');
      }
      
      setIsModalVisible(false);
      form.resetFields();
      fetchClubMembers(token!);
    } catch (error) {
      console.error('保存成员失败:', error);
      message.error('保存成员失败');
    }
  };

  const refreshMembers = () => {
    const token = localStorage.getItem('token');
    if (token) {
      fetchClubMembers(token);
    }
  };

  const columns = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
    },
    {
      title: '用户名',
      dataIndex: 'username',
      key: 'username',
      render: (username: string) => (
        <span><UserOutlined style={{ marginRight: 8 }} />{username}</span>
      )
    },
    {
      title: '角色',
      dataIndex: 'role',
      key: 'role',
      render: (role: number) => (
        <Tag color={role === 2 ? 'purple' : 'blue'}>
          {role === 2 ? '社长' : '普通成员'}
        </Tag>
      )
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: number) => (
        <Tag color={status === 1 ? 'green' : 'red'}>
          {status === 1 ? '正常' : '已退出'}
        </Tag>
      )
    },
    {
      title: '加入时间',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (date: string) => new Date(date).toLocaleString()
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: ClubMember) => (
        <Space size="middle">
          <Button 
            type="primary" 
            icon={<EditOutlined />} 
            onClick={() => handleEditMember(record)}
          >
            编辑
          </Button>
          <Button 
            type="primary" 
            danger 
            icon={<DeleteOutlined />} 
            onClick={() => handleDeleteMember(record)}
          >
            删除
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div className={styles.container}>
      <Card 
        title={<Title level={4}>社团成员管理</Title>}
        extra={
          <Space>
            <Button 
              type="primary" 
              icon={<PlusOutlined />} 
              onClick={handleAddMember}
            >
              添加成员
            </Button>
            <Button 
              icon={<ReloadOutlined />} 
              onClick={refreshMembers}
            >
              刷新
            </Button>
          </Space>
        }
      >
        <Table 
          rowKey="id"
          columns={columns} 
          dataSource={members} 
          loading={loading}
          pagination={{ pageSize: 10 }}
          locale={{ emptyText: "暂无社团成员" }}
        />
      </Card>

      <Modal
        title={editingMember ? "编辑成员" : "添加成员"}
        open={isModalVisible}
        onOk={handleModalSubmit}
        onCancel={handleModalCancel}
        okText="保存"
        cancelText="取消"
      >
        <Form
          form={form}
          layout="vertical"
        >
          <Form.Item
            name="username"
            label="用户名"
            rules={[{ required: true, message: '请输入用户名!' }]}
          >
            <Input placeholder="请输入用户名" />
          </Form.Item>
          
          <Form.Item
            name="role"
            label="角色"
            rules={[{ required: true, message: '请选择角色!' }]}
          >
            <Select placeholder="请选择角色">
              <Option value={1}>普通成员</Option>
              <Option value={2}>社长</Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
} 