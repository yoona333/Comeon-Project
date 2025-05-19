'use client';

import { useState, useRef, useEffect } from 'react';
import { Card, Table, Tag, Button, Space, Input, Form, Row, Col, Select, DatePicker, Modal, message, Popconfirm, InputNumber } from 'antd';
import { SearchOutlined, PlusOutlined, EditOutlined, DeleteOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import type { InputRef } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import styles from '../../../src/styles/Admin.module.scss';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { jwtDecode } from 'jwt-decode';
import dayjs from 'dayjs';

const { Option } = Select;
const { RangePicker } = DatePicker;
const { confirm } = Modal;
const { TextArea } = Input;

interface Activity {
  key: string;
  id: number;
  title: string;
  date: string;
  location: string;
  organizer: string;
  status: 'pending' | 'approved' | 'rejected' | 'completed';
  points: number;
  maxParticipants: number;
  currentParticipants: number;
}

// 自定义JWT接口
interface CustomJwtPayload {
  exp?: number;
  role: number;
}

export default function ManageActivities() {
  const router = useRouter();
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [form] = Form.useForm();
  const searchInput = useRef<InputRef>(null);
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null);
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
      const response = await axios.get('http://localhost:8080/api/activities', {
        headers: { 'x-access-token': token }
      });
      setActivities(response.data.data);
    } catch (error) {
      console.error('获取活动列表失败:', error);
      message.error('获取活动列表失败');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id: number) => {
    try {
      const token = localStorage.getItem('token');
      await axios.post(`http://localhost:8080/api/activities/${id}/approve`, 
        { status: 1 },
        { headers: { 'x-access-token': token } }
      );
      message.success('活动已批准');
      fetchActivities(token!);
    } catch (error) {
      console.error('批准活动失败:', error);
      message.error('批准活动失败');
    }
  };

  const handleReject = async (id: number) => {
    try {
      const token = localStorage.getItem('token');
      await axios.post(`http://localhost:8080/api/activities/${id}/approve`, 
        { status: 2 },
        { headers: { 'x-access-token': token } }
      );
      message.error('活动已拒绝');
      fetchActivities(token!);
    } catch (error) {
      console.error('拒绝活动失败:', error);
      message.error('拒绝活动失败');
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

  // 表格列定义
  const columns: ColumnsType<Activity> = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      sorter: (a, b) => a.id - b.id,
    },
    {
      title: '活动名称',
      dataIndex: 'title',
      key: 'title',
      render: (text) => <a>{text}</a>,
    },
    {
      title: '组织者',
      dataIndex: 'organizer',
      key: 'organizer',
    },
    {
      title: '时间',
      dataIndex: 'date',
      key: 'date',
      sorter: (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
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
      render: (status) => {
        let color = '';
        let text = '';
        
        switch(status) {
          case 'pending':
            color = 'warning';
            text = '待审批';
            break;
          case 'approved':
            color = 'success';
            text = '已批准';
            break;
          case 'rejected':
            color = 'error';
            text = '已拒绝';
            break;
          case 'completed':
            color = 'default';
            text = '已完成';
            break;
        }
        
        return <Tag color={color}>{text}</Tag>;
      },
      filters: [
        { text: '待审批', value: 'pending' },
        { text: '已批准', value: 'approved' },
        { text: '已拒绝', value: 'rejected' },
        { text: '已完成', value: 'completed' },
      ],
      onFilter: (value, record) => record.status === value,
    },
    {
      title: '积分',
      dataIndex: 'points',
      key: 'points',
      sorter: (a, b) => a.points - b.points,
    },
    {
      title: '参与人数',
      key: 'participants',
      render: (_, record) => (
        <span>{record.currentParticipants}/{record.maxParticipants}</span>
      ),
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record) => (
        <div className={styles.actionColumn}>
          {record.status === 'pending' && (
            <>
              <Button 
                type="primary" 
                size="small" 
                icon={<EditOutlined />}
                onClick={() => handleApprove(record.id)}
              >
                批准
              </Button>
              <Button 
                type="link" 
                danger 
                size="small" 
                onClick={() => handleReject(record.id)}
              >
                拒绝
              </Button>
            </>
          )}
          <Popconfirm
            title="删除活动"
            description="确定要删除这个活动吗？"
            onConfirm={() => handleDelete(record.id)}
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
  
  // 处理添加活动
  const handleAdd = () => {
    setIsModalVisible(true);
  };
  
  // 处理编辑活动
  const handleEdit = (record: Activity) => {
    message.info(`编辑活动: ${record.title}`);
  };
  
  // 批量删除
  const handleBatchDelete = () => {
    confirm({
      title: '批量删除',
      icon: <ExclamationCircleOutlined />,
      content: `确定要删除选中的 ${selectedRowKeys.length} 个活动吗？此操作不可恢复。`,
      okText: '确认',
      okType: 'danger',
      cancelText: '取消',
      onOk() {
        message.success(`已删除 ${selectedRowKeys.length} 个活动`);
        setSelectedRowKeys([]);
        // 实际应用中应该调用API批量删除数据
      },
    });
  };
  
  // 批量批准
  const handleBatchApprove = () => {
    message.success(`已批准 ${selectedRowKeys.length} 个活动`);
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
  
  const showModal = (activity?: Activity) => {
    if (activity) {
      setEditingActivity(activity);
      form.setFieldsValue({
        ...activity,
        start_time: dayjs(activity.date),
        end_time: dayjs(activity.date)
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
  
  return (
    <div className={styles.adminPage}>
      <h2>活动管理</h2>
      
      <Card className={styles.searchForm}>
        <Form
          form={form}
          layout="horizontal"
          onFinish={handleSearch}
        >
          <Row gutter={16}>
            <Col xs={24} sm={12} md={8}>
              <Form.Item name="title" label="活动名称">
                <Input placeholder="请输入活动名称" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={8}>
              <Form.Item name="organizer" label="组织者">
                <Input placeholder="请输入组织者名称" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={8}>
              <Form.Item name="status" label="状态">
                <Select placeholder="请选择状态" allowClear>
                  <Option value="pending">待审批</Option>
                  <Option value="approved">已批准</Option>
                  <Option value="rejected">已拒绝</Option>
                  <Option value="completed">已完成</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={12}>
              <Form.Item name="dateRange" label="活动时间范围">
                <RangePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={12}>
              <Form.Item name="pointsRange" label="积分范围">
                <Input.Group compact>
                  <Form.Item name={['pointsRange', 'min']} noStyle>
                    <Input style={{ width: 100, textAlign: 'center' }} placeholder="最小值" />
                  </Form.Item>
                  <Input
                    style={{ width: 30, borderLeft: 0, borderRight: 0, pointerEvents: 'none', backgroundColor: '#fff' }}
                    placeholder="~"
                    disabled
                  />
                  <Form.Item name={['pointsRange', 'max']} noStyle>
                    <Input style={{ width: 100, textAlign: 'center' }} placeholder="最大值" />
                  </Form.Item>
                </Input.Group>
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
        <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
          添加活动
        </Button>
        <div>
          {selectedRowKeys.length > 0 && (
            <>
              <Button 
                type="primary" 
                onClick={handleBatchApprove}
                style={{ marginRight: 8 }}
              >
                批量批准
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
          dataSource={activities} 
          rowKey="key"
          loading={loading}
          pagination={{
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 条记录`,
          }}
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
            label="社团ID"
            rules={[{ required: true, message: '请输入社团ID' }]}
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
            <InputNumber style={{ width: '100%' }} />
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