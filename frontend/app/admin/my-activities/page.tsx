'use client';

import { Table, Tag, Button, message, Modal, Form, Input, DatePicker, Space, Card, Select, InputNumber } from 'antd';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { jwtDecode } from 'jwt-decode';
import { SearchOutlined, PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';

const { TextArea } = Input;
const { RangePicker } = DatePicker;

interface Activity {
  id: number;
  title: string;
  description: string;
  club_id: number;
  club_name: string;
  start_time: string;
  end_time: string;
  location: string;
  max_participants: number;
  status: number;
  created_at: string;
}

// 自定义JWT接口
interface CustomJwtPayload {
  exp?: number;
  role: number;
}

export default function MyActivities() {
  const router = useRouter();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null);
  const [clubs, setClubs] = useState<{id: number, name: string}[]>([]);
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

      fetchActivities(token);
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

  const fetchActivities = async (token: string) => {
    try {
      setLoading(true);
      const response = await axios.get('http://localhost:8080/api/activities/my', {
        headers: { 'x-access-token': token }
      });
      if (response.data.success) {
        setActivities(response.data.data);
      } else {
        message.error(response.data.message || '获取活动列表失败');
      }
    } catch (error) {
      console.error('获取活动列表失败:', error);
      message.error('获取活动列表失败，请检查网络连接');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`http://localhost:8080/api/activities/${id}`, {
        headers: { 'x-access-token': token }
      });
      message.success('活动已删除');
      fetchActivities(token!);
    } catch (error) {
      console.error('删除活动失败:', error);
      message.error('删除活动失败');
    }
  };

  const showModal = (activity?: Activity) => {
    if (activity) {
      setEditingActivity(activity);
      form.setFieldsValue({
        ...activity,
        start_time: dayjs(activity.start_time),
        end_time: dayjs(activity.end_time)
      });
    } else {
      setEditingActivity(null);
      form.resetFields();
    }
    setIsModalVisible(true);
  };

  const handleCancel = () => {
    setIsModalVisible(false);
    form.resetFields();
    setEditingActivity(null);
  };

  const handleSubmit = async (values: any) => {
    try {
      const token = localStorage.getItem('token');
      const data = {
        ...values,
        start_time: values.start_time.format('YYYY-MM-DD HH:mm:ss'),
        end_time: values.end_time.format('YYYY-MM-DD HH:mm:ss')
      };

      if (editingActivity) {
        await axios.put(`http://localhost:8080/api/activities/${editingActivity.id}`, 
          data,
          { headers: { 'x-access-token': token } }
        );
        message.success('活动更新成功');
      } else {
        await axios.post('http://localhost:8080/api/activities', 
          data,
          { headers: { 'x-access-token': token } }
        );
        message.success('活动创建成功');
      }
      
      setIsModalVisible(false);
      form.resetFields();
      setEditingActivity(null);
      fetchActivities(token!);
    } catch (error) {
      console.error('保存活动失败:', error);
      message.error('保存活动失败');
    }
  };

  const columns = [
    {
      title: '活动名称',
      dataIndex: 'title',
      key: 'title',
    },
    {
      title: '社团',
      dataIndex: 'club_name',
      key: 'club_name',
    },
    {
      title: '开始时间',
      dataIndex: 'start_time',
      key: 'start_time',
      render: (text: string) => new Date(text).toLocaleString(),
    },
    {
      title: '结束时间',
      dataIndex: 'end_time',
      key: 'end_time',
      render: (text: string) => new Date(text).toLocaleString(),
    },
    {
      title: '地点',
      dataIndex: 'location',
      key: 'location',
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: number) => {
        const statusMap: Record<number, { text: string; color: string }> = {
          0: { text: '待审批', color: 'warning' },
          1: { text: '已通过', color: 'success' },
          2: { text: '已拒绝', color: 'error' },
        };
        return <Tag color={statusMap[status].color}>{statusMap[status].text}</Tag>;
      },
    },
    {
      title: '操作',
      key: 'action',
      render: (_: unknown, record: Activity) => (
        <Space>
          <Button type="link" icon={<EditOutlined />} onClick={() => showModal(record)}>
            编辑
          </Button>
          <Button type="link" danger icon={<DeleteOutlined />} onClick={() => handleDelete(record.id)}>
            删除
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Card>
        <div style={{ marginBottom: 16 }}>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => showModal()}>
            创建活动
          </Button>
        </div>

        <Table
          columns={columns}
          dataSource={activities}
          rowKey="id"
          loading={loading}
        />
      </Card>

      <Modal
        title={editingActivity ? '编辑活动' : '创建活动'}
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
            name="title"
            label="活动名称"
            rules={[{ required: true, message: '请输入活动名称' }]}
          >
            <Input />
          </Form.Item>

          <Form.Item
            name="description"
            label="活动描述"
            rules={[{ required: true, message: '请输入活动描述' }]}
          >
            <TextArea rows={4} />
          </Form.Item>

          <Form.Item
            name="club_id"
            label="社团"
            rules={[{ required: true, message: '请选择社团' }]}
          >
            <Select
              placeholder="请选择社团"
              allowClear
            >
              {clubs.map(club => (
                <Select.Option key={club.id} value={club.id}>
                  {club.name}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="start_time"
            label="开始时间"
            rules={[{ required: true, message: '请选择开始时间' }]}
          >
            <DatePicker showTime style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item
            name="end_time"
            label="结束时间"
            rules={[{ required: true, message: '请选择结束时间' }]}
          >
            <DatePicker showTime style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item
            name="location"
            label="活动地点"
            rules={[{ required: true, message: '请输入活动地点' }]}
          >
            <Input />
          </Form.Item>

          <Form.Item
            name="max_participants"
            label="最大参与人数"
            rules={[{ required: true, message: '请输入最大参与人数' }]}
          >
            <InputNumber style={{ width: '100%' }} min={1} />
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit">
              {editingActivity ? '更新' : '创建'}
            </Button>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}