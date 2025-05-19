'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Table, Tag, Button, message, Modal, Form, Input, Space, Card, App, Row, Col, Alert } from 'antd';
import { CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';
import { jwtDecode } from 'jwt-decode';

const { TextArea } = Input;

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
}

const PendingActivitiesPage: React.FC = () => {
  const router = useRouter();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRejectModalVisible, setIsRejectModalVisible] = useState(false);
  const [rejectingActivityId, setRejectingActivityId] = useState<number | null>(null);
  const [rejectReason, setRejectReason] = useState('');
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

      fetchPendingActivities(token);
    } catch (error) {
      messageApi.error('无效的登录信息，请重新登录');
      router.push('/login');
    }
  };

  const fetchPendingActivities = async (token: string) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('http://localhost:8080/api/activities/pending', {
        headers: {
          'x-access-token': token
        },
      });

      if (!response.ok) {
        if (response.status === 500) {
          throw new Error('服务器内部错误，请联系管理员');
        } else {
          throw new Error('获取待审批活动失败');
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
        message: '获取待审批活动失败',
        description: err instanceof Error ? err.message : '未知错误',
        duration: 4,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id: number) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await fetch(`http://localhost:8080/api/activities/${id}/approve`, {
        method: 'POST',
        headers: {
          'x-access-token': token,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: 1 })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || '审批失败');
      }

      messageApi.success('活动已审批通过');
      fetchPendingActivities(token);
    } catch (error) {
      console.error('审批失败:', error);
      notification.error({
        message: '审批失败',
        description: error instanceof Error ? error.message : '未知错误',
        duration: 4,
      });
    }
  };

  const showRejectModal = (id: number) => {
    setRejectingActivityId(id);
    setRejectReason('');
    setIsRejectModalVisible(true);
  };

  const handleRejectCancel = () => {
    setIsRejectModalVisible(false);
    setRejectingActivityId(null);
    setRejectReason('');
  };

  const handleRejectConfirm = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token || !rejectingActivityId) return;

      const response = await fetch(`http://localhost:8080/api/activities/${rejectingActivityId}/approve`, {
        method: 'POST',
        headers: {
          'x-access-token': token,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          status: 2,
          reason: rejectReason 
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || '拒绝失败');
      }

      messageApi.success('已拒绝该活动');
      setIsRejectModalVisible(false);
      fetchPendingActivities(token);
    } catch (error) {
      console.error('拒绝失败:', error);
      notification.error({
        message: '拒绝失败',
        description: error instanceof Error ? error.message : '未知错误',
        duration: 4,
      });
    }
  };

  const columns = [
    {
      title: '活动名称',
      dataIndex: 'title',
      key: 'title',
      render: (text: string, record: Activity) => (
        <div>
          <div>{text}</div>
          <div style={{ fontSize: '12px', color: '#888' }}>
            {record.description && record.description.length > 50
              ? `${record.description.substring(0, 50)}...`
              : record.description}
          </div>
        </div>
      ),
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
      render: (_: any, record: Activity) => (
        <>
          {record.start_time && record.end_time ? 
            `${new Date(record.start_time).toLocaleString()} 至 ${new Date(record.end_time).toLocaleString()}` : 
            '暂无时间信息'}
        </>
      ),
    },
    {
      title: '参与人数上限',
      dataIndex: 'max_participants',
      key: 'max_participants',
    },
    {
      title: '发起人',
      dataIndex: 'organizer_name',
      key: 'organizer_name',
    },
    {
      title: '申请时间',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (text: string) => new Date(text).toLocaleString(),
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: Activity) => (
        <Space>
          <Button 
            type="primary" 
            icon={<CheckCircleOutlined />} 
            onClick={() => handleApprove(record.id)}
          >
            通过
          </Button>
          <Button 
            danger 
            icon={<CloseCircleOutlined />} 
            onClick={() => showRejectModal(record.id)}
          >
            拒绝
          </Button>
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
        
        <Card title="待审批活动">
          <Table
            columns={columns}
            dataSource={activities}
            rowKey="id"
            loading={loading}
            pagination={{ pageSize: 10 }}
            expandable={{
              expandedRowRender: (record) => (
                <div style={{ padding: '20px' }}>
                  <Row gutter={[16, 16]}>
                    <Col span={24}>
                      <h3>活动详情</h3>
                      <p>{record.description}</p>
                    </Col>
                    {record.tags && (
                      <Col span={12}>
                        <strong>活动标签：</strong> {record.tags}
                      </Col>
                    )}
                    {record.points !== undefined && (
                      <Col span={12}>
                        <strong>积分：</strong> {record.points}
                      </Col>
                    )}
                    {record.contact && (
                      <Col span={12}>
                        <strong>联系方式：</strong> {record.contact}
                      </Col>
                    )}
                  </Row>
                </div>
              ),
            }}
          />
        </Card>

        <Modal
          title="拒绝原因"
          open={isRejectModalVisible}
          onOk={handleRejectConfirm}
          onCancel={handleRejectCancel}
          okText="确认拒绝"
          cancelText="取消"
        >
          <Form layout="vertical">
            <Form.Item
              label="请输入拒绝原因"
              rules={[{ required: true, message: '请输入拒绝原因' }]}
            >
              <TextArea
                rows={4}
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="请输入拒绝该活动的原因，此信息将发送给活动发起人"
              />
            </Form.Item>
          </Form>
        </Modal>
      </div>
    </App>
  );
};

export default PendingActivitiesPage; 