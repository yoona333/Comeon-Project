'use client';

import { useState, useEffect } from 'react';
import { Card, Table, Tag, Button, Space, Input, Modal, message, Popconfirm, Switch, Typography, Form, Select } from 'antd';
import { SearchOutlined, PlusOutlined, EditOutlined, DeleteOutlined, ReloadOutlined } from '@ant-design/icons';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { jwtDecode } from 'jwt-decode';
import styles from '../../../src/styles/Admin.module.scss';

// 定义JWT负载接口
interface CustomJwtPayload {
  exp?: number;
  role: number;
  userId: number;
}

const { Title } = Typography;
const { Option } = Select;

interface Student {
  id: number;
  username: string;
  role: number;
  created_at: string;
  club_names: string | null;
}

export default function ManageStudents() {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [clubs, setClubs] = useState<{id: number, name: string}[]>([]);
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

      if (decoded.role !== 0) {
        message.error('您没有管理员权限');
        router.push('/student');
        return;
      }

      fetchStudents(token);
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

  const fetchStudents = async (token: string) => {
    try {
      setLoading(true);
      const response = await axios.get('http://localhost:8080/api/users', {
        headers: { 'x-access-token': token }
      });
      
      // 只过滤出学生用户（role === 1）
      const studentUsers = response.data.data.filter((user: any) => user.role === 1);
      setStudents(studentUsers);
    } catch (error) {
      console.error('获取学生列表失败:', error);
      message.error('获取学生列表失败');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (student: Student) => {
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`http://localhost:8080/api/users/${student.id}`, {
        headers: { 'x-access-token': token }
      });
      
      message.success('删除成功');
      fetchStudents(token!);
    } catch (error) {
      console.error('删除学生失败:', error);
      message.error('删除学生失败');
    }
  };

  const handleEdit = (student: Student) => {
    setEditingStudent(student);
    form.setFieldsValue({
      username: student.username,
      club_id: student.club_names ? getClubIdByName(student.club_names.split(',')[0]) : undefined
    });
    setIsModalVisible(true);
  };

  const getClubIdByName = (clubName: string) => {
    const club = clubs.find(c => c.name === clubName);
    return club ? club.id : undefined;
  };

  const handleModalCancel = () => {
    setIsModalVisible(false);
    setEditingStudent(null);
    form.resetFields();
  };

  const handleModalSubmit = async () => {
    try {
      const values = await form.validateFields();
      const token = localStorage.getItem('token');
      
      if (editingStudent) {
        // 编辑现有学生
        await axios.put(`http://localhost:8080/api/users/${editingStudent.id}`, {
          username: values.username,
          role: 1, // 学生角色
          club_id: values.club_id
        }, {
          headers: { 'x-access-token': token }
        });
        
        message.success('更新成功');
      } else {
        // 创建新学生
        await axios.post('http://localhost:8080/api/users', {
          username: values.username,
          password: '123456', // 默认密码
          role: 1, // 学生角色
          club_id: values.club_id
        }, {
          headers: { 'x-access-token': token }
        });
        
        message.success('创建成功');
      }
      
      setIsModalVisible(false);
      form.resetFields();
      fetchStudents(token!);
    } catch (error) {
      console.error('保存学生失败:', error);
      message.error('保存学生失败');
    }
  };

  const refreshStudents = () => {
    const token = localStorage.getItem('token');
    if (token) {
      fetchStudents(token);
    }
  };

  const handleAddStudent = () => {
    setEditingStudent(null);
    form.resetFields();
    setIsModalVisible(true);
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
    },
    {
      title: '社团',
      dataIndex: 'club_names',
      key: 'club_names',
      render: (clubs: string | null) => {
        if (!clubs) return <Tag color="default">未加入社团</Tag>;
        return clubs.split(',').map((club, index) => (
          <Tag color="blue" key={index}>{club}</Tag>
        ));
      }
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
      render: (_: any, record: Student) => (
        <Space size="middle">
          <Button 
            type="primary" 
            icon={<EditOutlined />} 
            onClick={() => handleEdit(record)}
          >
            编辑
          </Button>
          <Popconfirm
            title="确定要删除这个学生账号吗？"
            description="此操作不可撤销！"
            onConfirm={() => handleDelete(record)}
            okText="确定"
            cancelText="取消"
          >
            <Button type="primary" danger icon={<DeleteOutlined />}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div className={styles.container}>
      <Card 
        title={<Title level={4}>学生管理</Title>}
        extra={
          <Space>
            <Button 
              type="primary" 
              icon={<PlusOutlined />} 
              onClick={handleAddStudent}
            >
              添加学生
            </Button>
            <Button 
              icon={<ReloadOutlined />} 
              onClick={refreshStudents}
            >
              刷新
            </Button>
          </Space>
        }
      >
        <Table 
          rowKey="id"
          columns={columns} 
          dataSource={students} 
          loading={loading}
          pagination={{ pageSize: 10 }}
          locale={{ emptyText: "暂无学生数据" }}
        />
      </Card>

      <Modal
        title={editingStudent ? "编辑学生" : "添加学生"}
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
          
          {!editingStudent && (
            <Form.Item
              label="初始密码"
              tooltip="新建学生账号默认密码为123456"
            >
              <Input disabled defaultValue="123456" />
            </Form.Item>
          )}
          
          <Form.Item
            name="club_id"
            label="所属社团"
          >
            <Select placeholder="请选择社团" allowClear>
              {clubs.map(club => (
                <Option key={club.id} value={club.id}>{club.name}</Option>
              ))}
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
} 