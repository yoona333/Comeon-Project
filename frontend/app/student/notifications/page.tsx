'use client';

import { Card, Table, message, Modal } from 'antd';
import { MailOutlined } from '@ant-design/icons';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { jwtDecode } from 'jwt-decode';

// 定义 Reservation 接口，添加 activities 表的重要字段
interface Reservation {
  id: number;
  title: string;
  description: string;
  start_time: string;
  end_time: string;
  location: string;
  max_participants: number;
  status: number;
  is_read: number;
  // 其他字段...
}

export default function StudentReservations() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

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
      const decoded = jwtDecode(token);
      if (decoded.exp && decoded.exp < Date.now() / 1000) {
        message.error('登录已过期，请重新登录');
        router.push('/login');
        return;
      }

      fetchReservations(token);
    } catch (error) {
      message.error('无效的登录信息，请重新登录');
      router.push('/login');
    }
  };

  const fetchReservations = async (token: string) => {
    try {
      setLoading(true);
      const url = 'http://localhost:8080/api/reservations/all';
      const response = await axios.get(url, {
        headers: { 'x-access-token': token }
      });
  
      if (response.data.success) {
        let reservationsData = response.data.data;
        // 对预约数据进行排序，未读的排在前面，已读的排在后面
        reservationsData.sort((a: Reservation, b: Reservation) => {
          if (a.is_read === 0 && b.is_read === 1) {
            return -1;
          } else if (a.is_read === 1 && b.is_read === 0) {
            return 1;
          }
          return 0;
        });
        setReservations(reservationsData);
      }
    } catch (error) {
      console.error('获取预约列表失败:', error);
      message.error('获取预约列表失败，请检查网络连接');
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetail = async (reservation: Reservation) => {
    setSelectedReservation(reservation);
    setModalVisible(true);

    try {
      const token = localStorage.getItem('token');
      if (token) {
        const url = `http://localhost:8080/api/reservations/${reservation.id}/mark-read`;
        await axios.put(url, {}, {
          headers: { 'x-access-token': token }
        });
        // 更新本地状态
        setReservations(reservations.map(item => 
          item.id === reservation.id ? { ...item, is_read: 1 } : item
        ));
      }
    } catch (error) {
      console.error('标记为已读失败:', error);
      message.error('标记为已读失败，请稍后重试');
    }
  };

  const handleModalClose = () => {
    setModalVisible(false);
    // 刷新页面
    router.refresh();
  };

  // 简略信息列，确保显示 title，start_time，end_time 和查看详情按钮
  const columns = [
    {
      title: '状态',
      key: 'status',
      render: (_, record: Reservation) => (
        record.is_read === 1 ? (
          <MailOutlined style={{ color: 'green', fontSize: '18px' }} title="已读" />
        ) : (
          <MailOutlined style={{ color: 'red', fontSize: '18px' }} title="未读" />
        )
      ),
    },
    {
      title: '活动标题',
      dataIndex: 'title',
      key: 'title',
    },
    {
      title: '开始时间',
      dataIndex: 'start_time',
      key: 'start_time',
    },
    {
      title: '结束时间',
      dataIndex: 'end_time',
      key: 'end_time',
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record: Reservation) => (
        <button onClick={() => handleViewDetail(record)}>查看详情</button>
      ),
    },
  ];

  return (
    <div>
      <Card title="所有预约记录">
        <Table
          columns={columns}
          dataSource={reservations}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 10 }}
        />
      </Card>
      <Modal
        title="预约详情"
        visible={modalVisible}
        onCancel={handleModalClose}
        footer={null}
      >
        {selectedReservation && (
          <>
            <p>ID: {selectedReservation.id}</p>
            <p>活动标题: {selectedReservation.title}</p>
            <p>活动描述: {selectedReservation.description}</p>
            <p>开始时间: {selectedReservation.start_time}</p>
            <p>结束时间: {selectedReservation.end_time}</p>
            <p>活动地点: {selectedReservation.location}</p>
            <p>最大参与人数: {selectedReservation.max_participants}</p>
            <p>状态: {(() => {
              switch (selectedReservation.status) {
                case 0:
                  return '待审批';
                case 1:
                  return '已通过';
                case 2:
                  return '已拒绝';
                default:
                  return '未知状态';
              }
            })()}</p>
          </>
        )}
      </Modal>
    </div>
  );
}