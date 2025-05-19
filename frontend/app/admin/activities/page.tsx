'use client';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Table, Tag, Button, Modal, Form, Input, DatePicker, Select, Space, Card, Popconfirm, App, Alert, Row, Col } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, SearchOutlined, ReloadOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { jwtDecode } from 'jwt-decode';

const { RangePicker } = DatePicker;
const { TextArea } = Input;
const { Option } = Select;

interface CustomJwtPayload {
  exp?: number;
  role: number;
  userId: number;
}

interface Activity {
  id: number;
  title: string;
  description: string;
  location: string;
  start_time: string;
  end_time: string;
  status: number;
  club_id: number;
  club_name: string;
  organizer_name?: string;
  participant_count: number;
  max_participants: number;
  created_at: string;
  tags?: string;
  points?: number;
  contact?: string;
  // 添加报名时间字段
  registration_time?: string; 
}

interface Club {
  id: number;
  name: string;
}

const ActivityListPage: React.FC = () => {
  const router = useRouter();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [clubs, setClubs] = useState<Club[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null);
  const [form] = Form.useForm();
  const [searchForm] = Form.useForm();
  const { message: messageApi, notification } = App.useApp();
  
  // 筛选和搜索状态
  const [searchTitle, setSearchTitle] = useState<string>('');
  const [searchStatus, setSearchStatus] = useState<number | null>(null);
  const [searchClubId, setSearchClubId] = useState<number | null>(null);
  const [searchDateRange, setSearchDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>(null);
  // 新增搜索报名时间范围
  // const [searchRegistrationDateRange, setSearchRegistrationDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>(null); 

  useEffect(() => {
    checkAuth();
  }, [router]);

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

      fetchActivities(token);
      fetchClubs(token);
    } catch (error) {
      messageApi.error('无效的登录信息，请重新登录');
      router.push('/login');
    }
  };

  const fetchActivities = async (token: string) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('http://localhost:8080/api/activities', {
        headers: {
          'x-access-token': token
        },
      });

      if (!response.ok) {
        if (response.status === 500) {
          throw new Error('服务器内部错误，请联系管理员');
        } else {
          throw new Error('获取活动列表失败');
        }
      }

      const data = await response.json();
      if (data.success && Array.isArray(data.data)) {
        setActivities(data.data);
      } else {
        console.error('数据格式错误:', data);
        setError('数据格式不符合预期');
      }
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      }
      notification.error({
        message: '获取活动列表失败',
        description: err instanceof Error ? err.message : '未知错误',
        duration: 4,
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchClubs = async (token: string) => {
    try {
      const response = await fetch('http://localhost:8080/api/clubs', {
        headers: {
          'x-access-token': token
        },
      });

      if (!response.ok) {
        throw new Error('获取社团列表失败');
      }

      const data = await response.json();
      if (data.success && Array.isArray(data.data)) {
        setClubs(data.data);
      }
    } catch (error) {
      console.error('获取社团列表失败:', error);
      notification.error({
        message: '获取社团列表失败',
        description: error instanceof Error ? error.message : '未知错误',
        duration: 4,
      });
    }
  };

  const handleDelete = async (id: number) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:8080/api/activities/${id}`, {
        method: 'DELETE',
        headers: {
          'x-access-token': token!
        }
      });

      if (!response.ok) {
        throw new Error('删除活动失败');
      }

      messageApi.success('活动已删除');
      fetchActivities(token!);
    } catch (error) {
      console.error('删除活动失败:', error);
      messageApi.error('删除活动失败');
    }
  };

  const showModal = (activity?: Activity) => {
    if (activity) {
      setEditingActivity(activity);
      form.setFieldsValue({
        ...activity,
        time: [
          activity.start_time ? dayjs(activity.start_time) : null, 
          activity.end_time ? dayjs(activity.end_time) : null
        ],
        // 设置报名时间
        registration_time: activity.registration_time ? dayjs(activity.registration_time) : null 
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
      const [start_time, end_time] = values.time;
      const registrationTime = values.registration_time;
      
      const activityData = {
        title: values.title,
        description: values.description,
        location: values.location,
        start_time: start_time.toISOString(),
        end_time: end_time.toISOString(),
        club_id: values.club_id,
        max_participants: values.max_participants,
        status: values.status || 0,
        points: values.points || 0,
        tags: values.tags || '',
        contact: values.contact || '',
        // 添加报名时间到数据中
        registration_time: registrationTime ? registrationTime.toISOString() : null 
      };
      
      if (editingActivity) {
        // 更新活动
        messageApi.loading('正在更新活动...');
        
        try {
          // 设置超时控制
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 10000); // 10秒超时
          
          const response = await fetch(`http://localhost:8080/api/activities/${editingActivity.id}`, {
            method: 'PUT',
            headers: { 
              'x-access-token': token!,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(activityData),
            signal: controller.signal
          });
          
          clearTimeout(timeoutId);
          
          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || '更新活动失败');
          }
          
          messageApi.success('活动更新成功');
        } catch (error) {
          if (error instanceof Error && error.name === 'AbortError') {
            throw new Error('请求超时，请检查网络连接');
          }
          throw error;
        }
      } else {
        // 创建活动
        messageApi.loading('正在创建活动...');
        
        try {
          // 设置超时控制
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 10000); // 10秒超时
          
          const response = await fetch('http://localhost:8080/api/activities', {
            method: 'POST',
            headers: { 
              'x-access-token': token!,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(activityData),
            signal: controller.signal
          });
          
          clearTimeout(timeoutId);
          
          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || '创建活动失败');
          }
          
          messageApi.success('活动创建成功');
        } catch (error) {
          if (error instanceof Error && error.name === 'AbortError') {
            throw new Error('请求超时，请检查网络连接');
          }
          throw error;
        }
      }
      
      setIsModalVisible(false);
      form.resetFields();
      setEditingActivity(null);
      fetchActivities(token!);
    } catch (error) {
      console.error('保存活动失败:', error);
      notification.error({
        message: '保存活动失败',
        description: error instanceof Error ? error.message : '未知错误',
        duration: 4,
      });
    }
  };

  const handleSearch = (values: any) => {
    setSearchTitle(values.title || '');
    setSearchStatus(values.status !== undefined ? values.status : null);
    setSearchClubId(values.club_id !== undefined ? values.club_id : null);
    setSearchDateRange(values.time || null);
    // 设置搜索报名时间范围
    // setSearchRegistrationDateRange(values.registration_time || null); 
  };

  const handleReset = () => {
    searchForm.resetFields();
    setSearchTitle('');
    setSearchStatus(null);
    setSearchClubId(null);
    setSearchDateRange(null);
    // 重置搜索报名时间范围
    // setSearchRegistrationDateRange(null); 
  };

  const getStatusTag = (status: number) => {
    switch (status) {
      case 0:
        return <Tag color="orange">待审核</Tag>;
      case 1:
        return <Tag color="green">已通过</Tag>;
      case 2:
        return <Tag color="red">已拒绝</Tag>;
      case 3:
        return <Tag color="blue">已完成</Tag>;
      case 4:
        return <Tag color="gray">已取消</Tag>;
      default:
        return <Tag color="default">未知</Tag>;
    }
  };

  // 筛选活动数据
  const filteredActivities = activities.filter(activity => {
    // 标题匹配
    if (searchTitle && !activity.title.toLowerCase().includes(searchTitle.toLowerCase())) {
      return false;
    }
    
    // 状态匹配
    if (searchStatus !== null && activity.status !== searchStatus) {
      return false;
    }
    
    // 社团匹配
    if (searchClubId !== null && activity.club_id !== searchClubId) {
      return false;
    }
    
    // 日期范围匹配
    if (searchDateRange && searchDateRange[0] && searchDateRange[1]) {
      const startDate = dayjs(activity.start_time);
      const endDate = dayjs(activity.end_time);
      const searchStart = searchDateRange[0].startOf('day');
      const searchEnd = searchDateRange[1].endOf('day');
      
      if (!((startDate.isAfter(searchStart) || startDate.isSame(searchStart)) && 
            (endDate.isBefore(searchEnd) || endDate.isSame(searchEnd)))) {
        return false;
      }
    }

    // 报名时间范围匹配
    // if (searchRegistrationDateRange && searchRegistrationDateRange[0] && searchRegistrationDateRange[1] && activity.registration_time) {
    //   const registrationDate = dayjs(activity.registration_time);
    //   const searchStart = searchRegistrationDateRange[0].startOf('day');
    //   const searchEnd = searchRegistrationDateRange[1].endOf('day');
      
    //   if (!(registrationDate.isAfter(searchStart) || registrationDate.isSame(searchStart)) || 
    //       !(registrationDate.isBefore(searchEnd) || registrationDate.isSame(searchEnd))) {
    //     return false;
    //   }
    // }
    
    return true;
  });

  const columns = [
    {
      title: '活动名称',
      dataIndex: 'title',
      key: 'title',
      render: (text: string, record: Activity) => <a onClick={() => showModal(record)}>{text}</a>,
    },
    {
      title: '社团',
      dataIndex: 'club_name',
      key: 'club_name',
    },
    {
      title: '地点',
      dataIndex: 'location',
      key: 'location',
      ellipsis: true,
    },
    {
      title: '时间',
      key: 'time',
      render: (_: unknown, record: Activity) => (
        <>
          {record.start_time && record.end_time ? 
            `${new Date(record.start_time).toLocaleString()} 至 ${new Date(record.end_time).toLocaleString()}` : 
            '时间待定'}
        </>
      ),
    },
    // 添加报名时间列
    {
      title: '报名时间',
      key: 'registration_time',
      render: (_: unknown, record: Activity) => (
        <>
          {record.registration_time ? new Date(record.registration_time).toLocaleString() : '暂无报名时间'}
        </>
      ),
    },
    {
      title: '参与人数',
      key: 'participants',
      render: (_: unknown, record: Activity) => (
        <>
          {record.participant_count}/{record.max_participants || 0}
        </>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: number) => getStatusTag(status),
    },
    {
      title: '操作',
      key: 'action',
      render: (_: unknown, record: Activity) => (
        <Space>
          <Button type="primary" size="small" icon={<EditOutlined />} onClick={() => showModal(record)}>
            编辑
          </Button>
          <Popconfirm
            title="确定要删除这个活动吗？"
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
    <App>
      <div style={{ padding: '24px' }}>
        {error && (
          <Alert
            message="错误"
            description={error}
            type="error"
            showIcon
            closable
            style={{ marginBottom: 16 }}
          />
        )}
        
        <Card title="活动管理" style={{ marginBottom: 16 }}>
          <Form
            form={searchForm}
            layout="horizontal"
            onFinish={handleSearch}
            style={{ marginBottom: 16 }}
          >
            <Row gutter={16}>
              <Col span={6}>
                <Form.Item name="title" label="活动名称">
                  <Input placeholder="请输入活动名称" allowClear />
                </Form.Item>
              </Col>
              <Col span={6}>
                <Form.Item name="club_id" label="社团">
                  <Select placeholder="请选择社团" allowClear>
                    {clubs.map(club => (
                      <Option key={club.id} value={club.id}>{club.name}</Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
              <Col span={6}>
                <Form.Item name="status" label="状态">
                  <Select placeholder="请选择状态" allowClear>
                    <Option value={0}>待审核</Option>
                    <Option value={1}>已通过</Option>
                    <Option value={2}>已拒绝</Option>
                    <Option value={3}>已完成</Option>
                    <Option value={4}>已取消</Option>
                  </Select>
                </Form.Item>
              </Col>
              <Col span={6}>
                <Form.Item name="time" label="时间范围">
                  <RangePicker />
                </Form.Item>
              </Col>
              {/* 添加搜索报名时间范围
              <Col span={6}>
                <Form.Item name="registration_time" label="报名时间范围">
                  <RangePicker />
                </Form.Item>
              </Col> */}
            </Row>
            <Row>
              <Col span={24} style={{ textAlign: 'right' }}>
                <Button type="primary" htmlType="submit" icon={<SearchOutlined />} style={{ marginRight: 8 }}>
                  查询
                </Button>
                <Button onClick={handleReset} icon={<ReloadOutlined />}>
                  重置
                </Button>
              </Col>
            </Row>
          </Form>
        </Card>

        <Card title="活动列表">
          <div style={{ marginBottom: 16, textAlign: 'right' }}>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => showModal()}>
              创建活动
            </Button>
          </div>
          
          <Table
            columns={columns}
            dataSource={filteredActivities}
            rowKey="id"
            loading={loading}
            pagination={{ pageSize: 10 }}
          />
        </Card>

        <Modal
          title={editingActivity ? '编辑活动' : '创建活动'}
          open={isModalVisible}
          onCancel={handleCancel}
          footer={null}
          width={700}
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
              <Input placeholder="请输入活动名称" />
            </Form.Item>

            <Form.Item
              name="club_id"
              label="所属社团"
              rules={[{ required: true, message: '请选择所属社团' }]}
            >
              <Select placeholder="请选择所属社团">
                {clubs.map(club => (
                  <Option key={club.id} value={club.id}>{club.name}</Option>
                ))}
              </Select>
            </Form.Item>

            <Form.Item
              name="description"
              label="活动描述"
              rules={[{ required: true, message: '请输入活动描述' }]}
            >
              <TextArea rows={4} placeholder="请输入活动描述" />
            </Form.Item>

            <Form.Item
              name="location"
              label="活动地点"
              rules={[{ required: true, message: '请输入活动地点' }]}
            >
              <Input placeholder="请输入活动地点" />
            </Form.Item>

            <Form.Item
  name="time"
  label="活动时间"
  rules={[{ required: true, message: '请选择活动时间' }]}
>
  <RangePicker 
    showTime
    format="YYYY-MM-DD HH:mm:ss"
    placeholder={['开始时间', '结束时间']}
    disabledDate={(current) => {
      // 获取报名时间
      const registrationTime = form.getFieldValue('registration_time');
      if (!registrationTime) {
        // 如果没有选择报名时间，禁用所有日期
        return true;
      }
      // 禁止选择小于报名时间加2小时的时间
      const minTime = dayjs(registrationTime).add(2, 'hour').valueOf();
      return current && current.valueOf() < minTime;
    }}
  />
</Form.Item>

            <Form.Item
  name="registration_time"
  label="报名时间"
  rules={[{ required: true, message: '请选择报名时间' }]}
>
  <DatePicker
    showTime
    format="YYYY-MM-DD HH:mm:ss"
    placeholder="请选择报名时间"
    disabledDate={(current) => {
      // 禁止选择当前时间之前的时间
      return current && current.valueOf() < Date.now();
    }}
    onChange={(value) => {
      // 当报名时间改变时，重置活动时间
      form.setFieldsValue({ time: null });
    }}
  />
</Form.Item>

            <Form.Item
              name="max_participants"
              label="最大参与人数"
              rules={[{ required: true, message: '请输入最大参与人数' }]}
            >
              <Input type="number" min="1" placeholder="请输入最大参与人数" />
            </Form.Item>

            <Form.Item
              name="points"
              label="活动积分"
            >
              <Input type="number" min="0" placeholder="参与活动可获得的积分" />
            </Form.Item>

            <Form.Item
              name="tags"
              label="活动标签"
            >
              <Input placeholder="多个标签请用逗号分隔" />
            </Form.Item>

            <Form.Item
              name="contact"
              label="联系方式"
            >
              <Input placeholder="请输入联系方式" />
            </Form.Item>

            <Form.Item
              name="status"
              label="活动状态"
            >
              <Select placeholder="请选择活动状态">
                <Option value={0}>待审核</Option>
                <Option value={1}>已通过</Option>
                <Option value={2}>已拒绝</Option>
                <Option value={3}>已完成</Option>
                <Option value={4}>已取消</Option>
              </Select>
            </Form.Item>

            <Form.Item>
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <Button onClick={handleCancel} style={{ marginRight: 8 }}>
                  取消
                </Button>
                <Button type="primary" htmlType="submit">
                  {editingActivity ? '更新' : '创建'}
                </Button>
              </div>
            </Form.Item>
          </Form>
        </Modal>
      </div>
    </App>
  );
};

export default ActivityListPage;