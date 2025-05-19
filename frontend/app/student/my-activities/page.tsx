'use client';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Table, Tag, Button, message, Spin, Typography, Modal } from 'antd';
import axios from 'axios';
import Link from 'next/link';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc'; // 引入 utc 插件
import timezone from 'dayjs/plugin/timezone'; // 引入时区插件

dayjs.extend(utc); // 使用 utc 插件
dayjs.extend(timezone); // 使用时区插件
dayjs.tz.setDefault(Intl.DateTimeFormat().resolvedOptions().timeZone); // 设置默认时区

interface Activity {
  id: number;
  title: string;
  location: string;
  start_time: string;
  end_time: string;
  time_status: number; // 0: 未开始, 1: 进行中, 2: 已结束
  points: number;
  club_name: string;
  organizer: string;
}

// 定义活动详情的接口
interface ActivityDetail extends Activity {
  description: string;
}

const ActivityListPage: React.FC = () => {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  // 新增状态：控制模态框显示隐藏
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  // 新增状态：存储活动详情信息
  const [activityDetail, setActivityDetail] = useState<ActivityDetail | null>(null);
  // 新增状态：模态框加载状态
  const [modalLoading, setModalLoading] = useState(false);

  useEffect(() => {
    fetchMyActivities();
  }, []);

  const fetchMyActivities = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      message.error('请先登录');
      router.push('/login');
      return;
    }

    try {
      const response = await axios.get('http://localhost:8080/api/activities/my', {
        headers: { 'x-access-token': token }
      });

      if (response.data.success) {
        setActivities(response.data.data || []);
      } else {
        message.error(response.data.message || '获取活动失败');
      }
    } catch (error) {
      console.error('获取我的活动失败:', error);
      message.error('获取活动数据失败，请检查网络连接');
    } finally {
      setLoading(false);
    }
  };

  // 根据后端返回的status字段获取状态标签
  const getStatusTag = (status: number) => {
    switch(status) {
      case 0:
        return <Tag color="gold">未开始</Tag>;
      case 1:
        return <Tag color="green">进行中</Tag>;
      case 2:
        return <Tag color="blue">已结束</Tag>;
      default:
        return <Tag color="gray">未知</Tag>;
    }
  };

  // 格式化日期显示
  const formatDateTime = (utcTime: string) => {
    return dayjs.utc(utcTime).local().format('YYYY-MM-DD HH:mm:ss');
  };

  const showActivityDetail = async (activityId: number) => {
    const token = localStorage.getItem('token');
    if (!token) {
      message.error('请先登录');
      return;
    }
    setModalLoading(true);
    try {
      const response = await axios.get(`http://localhost:8080/api/activities/${activityId}`, {
        headers: { 'x-access-token': token }
      });
      if (response.data.success) {
        setActivityDetail(response.data.data);
        setDetailModalVisible(true);
      } else {
        message.error(response.data.message || '获取活动详情失败');
      }
    } catch (error) {
      console.error('获取活动详情失败:', error);
      message.error('获取活动详情失败，请检查网络连接');
    } finally {
      setModalLoading(false);
    }
  };

  const columns = [
    {
      title: '活动名称',
      dataIndex: 'title',
      key: 'title',
      render: (text: string, record: Activity) => (
        <Link href={`/student/activities/${record.id}`}>{text}</Link>
      )
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
    },
    {
      title: '开始时间',
      dataIndex: 'start_time',
      key: 'start_time',
      render: (text: string) => formatDateTime(text)
    },
    {
      title: '结束时间',
      dataIndex: 'end_time',
      key: 'end_time',
      render: (text: string) => formatDateTime(text)
    },
    {
      title: '状态',
      dataIndex: 'time_status', 
      key: 'time_status',
      render: (time_status: number) => getStatusTag(time_status)
    },
    {
      title: '积分',
      dataIndex: 'points',
      key: 'points',
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: Activity) => (
        <Button type="link" onClick={() => showActivityDetail(record.id)}>
          查看详情
        </Button>
      ),
    },
  ];

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <Typography.Title level={3} className="mb-6 text-2xl font-bold text-gray-800">我的活动</Typography.Title>
        
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <Table 
            columns={columns} 
            dataSource={activities} 
            rowKey="id" 
            pagination={{ pageSize: 10 }}
            locale={{ emptyText: '暂无活动数据' }}
            loading={loading}
            className="min-w-full"
          />
        </div>
        
        {/* 活动详情弹窗 */}
        <Modal
          title={activityDetail?.title || '活动详情'}
          open={detailModalVisible}
          onCancel={() => setDetailModalVisible(false)}
          footer={[
            <Button key="back" onClick={() => setDetailModalVisible(false)}>
              关闭
            </Button>
          ]}
          width={700}
          loading={modalLoading}
        >
          {activityDetail && (
            <div className="space-y-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-lg font-semibold text-gray-800">{activityDetail.title}</p>
                <p className="text-gray-600">{activityDetail.description}</p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">举办社团</p>
                  <p className="font-medium">{activityDetail.club_name}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">组织者</p>
                  <p className="font-medium">{activityDetail.organizer}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">活动地点</p>
                  <p className="font-medium">{activityDetail.location}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">积分</p>
                  <p className="font-medium">{activityDetail.points}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">开始时间</p>
                  <p className="font-medium">{formatDateTime(activityDetail.start_time)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">结束时间</p>
                  <p className="font-medium">{formatDateTime(activityDetail.end_time)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">活动状态</p>
                  <p className="font-medium">{getStatusTag(activityDetail.time_status)}</p>
                </div>
              </div>
            </div>
          )}
        </Modal>
      </div>
    </div>
  );
};

export default ActivityListPage;