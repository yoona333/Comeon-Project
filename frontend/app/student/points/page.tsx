'use client';

import { useState, useEffect } from 'react';
import { Card, Row, Col, Statistic, List, Tag, Progress, Divider, DatePicker, Button, Empty, Modal, message } from 'antd';
import { TrophyOutlined, RiseOutlined, HistoryOutlined, CalendarOutlined, GiftOutlined, UnorderedListOutlined } from '@ant-design/icons';
import styles from '../../../src/styles/Points.module.scss';
import axios from 'axios';
import { jwtDecode } from 'jwt-decode';

const { RangePicker } = DatePicker;

export default function PointsPage() {
  const [loading, setLoading] = useState(true);
  const [redeemModalVisible, setRedeemModalVisible] = useState(false);
  const [selectedReward, setSelectedReward] = useState<any>(null);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [pointsData, setPointsData] = useState({
    total: 0,
    rank: 0,
    totalStudents: 0,
    percentile: 0,
    thisMonth: 0, // 初始化为 0
    lastMonth: 0, // 初始化为 0
    growth: 0,
    target: 200,
    progress: 78,
  });

  const [pointsHistory, setPointsHistory] = useState<any[]>([]);
  const [redeemOptions, setRedeemOptions] = useState<any[]>([]);
  const [leaderboardModalVisible, setLeaderboardModalVisible] = useState(false);
  const [leaderboardData, setLeaderboardData] = useState<any[]>([]);

  // 获取积分排行榜和当前用户排名
  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('token');
        console.log('获取到的 token:', token); // 打印 token 检查是否正确获取
        if (!token) {
          console.error('未获取到 token');
          message.error('请先登录');
          return;
        }
        const response = await axios.get('http://localhost:8080/api/points-ranking', {
          headers: {
            'x-access-token': token,
          },
        });
        console.log('积分排行榜响应数据:', response.data); // 打印响应数据检查是否正确
        const { ranking, userRank, userRemainingPoints } = response.data.data;
        setLeaderboardData(ranking);
        const totalStudents = ranking.length;
        const percentile = totalStudents > 0 ? Math.round((1 - userRank / totalStudents) * 100) : 0;
        setPointsData((prev) => ({
          ...prev,
          total: userRemainingPoints,
          rank: userRank,
          totalStudents: totalStudents,
          percentile: percentile,
        }));
      } catch (error) {
        console.error('获取积分排行榜失败:', error);
        if (axios.isAxiosError(error)) {
          console.error('Axios 错误信息:', error.response?.data); // 打印 Axios 错误响应数据
        }
        message.error('获取积分排行榜失败，请稍后重试');
      } finally {
        setLoading(false);
      }
    };

    fetchLeaderboard();
  }, []);

  // 获取奖品数据
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('token');
        const response = await axios.get('http://localhost:8080/api/products', {
          headers: {
            'x-access-token': token,
          },
        });
        const products = response.data.data.map((product: any) => ({
          id: product.id,
          name: product.product_name,
          points: product.points_required,
          description: product.product_info,
          stock: product.remaining_quantity,
        }));
        setRedeemOptions(products);
      } catch (error) {
        console.error('获取奖品数据失败:', error);
        message.error('获取奖品数据失败，请稍后重试');
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, []);

  // 获取积分历史记录
  useEffect(() => {
    const fetchPointsHistory = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('token');
        const response = await axios.get('http://localhost:8080/api/user/points-history', {
          headers: {
            'x-access-token': token,
          },
        });
        setPointsHistory(response.data.data);
      } catch (error) {
        console.error('获取积分历史记录失败:', error);
        message.error('获取积分历史记录失败，请稍后重试');
      } finally {
        setLoading(false);
      }
    };

    fetchPointsHistory();
  }, []);

  // 获取本月和上月积分
  useEffect(() => {
    const fetchMonthlyPoints = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('token');
        const response = await axios.get('http://localhost:8080/api/user/monthly-points', {
          headers: {
            'x-access-token': token,
          },
        });
        const { thisMonth, lastMonth } = response.data.data;
        const growth = lastMonth > 0 ? Math.round(((thisMonth - lastMonth) / lastMonth) * 100) : 0;
        setPointsData((prev) => ({
          ...prev,
          thisMonth,
          lastMonth,
          growth,
        }));
      } catch (error) {
        console.error('获取本月和上月积分失败:', error);
        message.error('获取本月和上月积分失败，请稍后重试');
      } finally {
        setLoading(false);
      }
    };

    fetchMonthlyPoints();
  }, []);

  // 处理日期范围变化
  const handleDateRangeChange = (dates: any) => {
    if (dates && dates.length === 2) {
      setLoading(true);
      // 模拟API调用
      setTimeout(() => {
        message.success('已更新积分历史记录');
        setLoading(false);
      }, 1000);
    }
  };

  // 处理兑换
  const handleRedeem = (option: any) => {
    if (pointsData.total < option.points) {
      message.error('积分不足，无法兑换');
      return;
    }

    setSelectedReward(option);
    setRedeemModalVisible(true);
  };

  // 确认兑换
  const confirmRedeem = async () => {
    setConfirmLoading(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        message.error('请先登录');
        return;
      }
      const decoded = jwtDecode(token);
      const userId = decoded.userId;

      const response = await axios.post('http://localhost:8080/api/points/exchange', {
        product_id: selectedReward.id,
        points: selectedReward.points,
        description: `兑换${selectedReward.name}`,
      }, {
        headers: {
          'x-access-token': token,
        },
      });

      if (response.data.success) {
        const newRecord = {
          id: Date.now(),
          activity: `兑换${selectedReward.name}`,
          date: new Date().toISOString().split('T')[0],
          points: -selectedReward.points,
        };

        setPointsHistory([newRecord, ...pointsHistory]);

        setRedeemOptions(redeemOptions.map((option) => {
          if (option.id === selectedReward.id) {
            return { ...option, stock: option.stock - 1 };
          }
          return option;
        }));

        setPointsData((prev) => ({
          ...prev,
          total: prev.total - selectedReward.points,
        }));

        message.success(`成功兑换 ${selectedReward.name}`);
      } else {
        message.error(response.data.message || '兑换失败，请稍后重试');
      }
    } catch (error) {
      console.error('兑换失败:', error);
      message.error('兑换失败，请稍后重试');
    } finally {
      setRedeemModalVisible(false);
      setConfirmLoading(false);
    }
  };

  // 处理点击排行榜框
  const handleLeaderboardClick = () => {
    setLeaderboardModalVisible(true);
  };

  return (
    <div className={styles.pointsPage}>
      <h2>我的积分</h2>

      <Row gutter={16} className={styles.statsRow}>
        <Col xs={24} sm={12} md={6}>
          <Card loading={loading}>
            <Statistic
              title="总积分"
              value={pointsData.total}
              prefix={<TrophyOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card loading={loading} onClick={handleLeaderboardClick}>
            <Statistic
              title={<span>排名 <UnorderedListOutlined /></span>}
              value={pointsData.rank}
              suffix={`/ ${pointsData.totalStudents}`}
              valueStyle={{ color: '#52c41a' }}
            />
            <div className={styles.percentile}>
              超过了 {pointsData.percentile}% 的同学
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card loading={loading}>
            <Statistic
              title="本月获得"
              value={pointsData.thisMonth}
              valueStyle={{ color: '#722ed1' }}
            />
            <div className={styles.monthGrowth}>
              {pointsData.growth >= 0 ? <RiseOutlined /> : <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" fill="currentColor" className="anticon" viewBox="0 0 1024 1024"><path d="M512 64C264.6 64 64 264.6 64 512s200.6 448 448 448 448-200.6 448-448S759.4 64 512 64zm204.2 473.8c3.2 3.2 3.2 8.4 0 11.6l-141 141c-1.5 1.6-3.5 2.3-5.8 2.3s-4.3-.7-5.8-2.3l-141-141c-3.2-3.2-3.2-8.4 0-11.6 3.2-3.2 8.4-3.2 11.6 0L480 598.4V264c0-4.4 3.6-8 8-8h48c4.4 0 8 3.6 8 8v334.4l70.2-70.2c3.1-3.1 8.2-3.1 11.4 0z"/></svg>}
              {pointsData.growth >= 0 ? `比上月增长 ${pointsData.growth}%` : `比上月减少 ${Math.abs(pointsData.growth)}%`}
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card loading={loading}>
            <Statistic
              title="目标进度"
              value={pointsData.progress}
              suffix="%"
              valueStyle={{ color: '#fa8c16' }}
            />
            <Progress
              percent={pointsData.progress}
              showInfo={false}
              status="active"
              strokeColor={{ '0%': '#108ee9', '100%': '#87d068' }}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={16} className={styles.contentRow}>
        <Col xs={24} md={16}>
          <Card
            title={(
              <div className={styles.historyTitle}>
                <span><HistoryOutlined /> 积分历史</span>
                <RangePicker
                  style={{ marginLeft: 16 }}
                  onChange={handleDateRangeChange}
                />
              </div>
            )}
            className={styles.historyCard}
            loading={loading}
          >
            {pointsHistory.length > 0 ? (
              <List
                itemLayout="horizontal"
                dataSource={pointsHistory}
                renderItem={(item) => (
                  <List.Item
                    extra={(
                      <span className={item.points > 0 ? styles.pointsEarned : styles.pointsSpent}>
                        {item.points > 0 ? '+' : ''}{item.points}
                      </span>
                    )}
                  >
                    <List.Item.Meta
                      title={item.activity}
                      description={(
                        <div>
                          <CalendarOutlined /> {item.date.split('T')[0]}
                          <Tag
                            color={item.points > 0 ? 'green' : 'red'}
                            style={{ marginLeft: 8 }}
                          >
                            {item.points > 0 ? '获得' : '支出'}
                          </Tag>
                        </div>
                      )}
                    />
                  </List.Item>
                )}
              />
            ) : (
              <Empty />
            )}
          </Card>
        </Col>

        <Col xs={24} md={8}>
          <Card title="积分兑换" className={styles.redeemCard} loading={loading}>
            {redeemOptions.map((option) => (
              <Card.Grid key={option.id} className={styles.redeemOption}>
                <div className={styles.redeemName}>{option.name}</div>
                <div className={styles.redeemPoints}>{option.points} 积分</div>
                <div className={styles.redeemDescription}>
                  {option.description}
                  <div className={styles.redeemStock}>库存: {option.stock}</div>
                </div>
                <Button
                  type="primary"
                  disabled={pointsData.total < option.points || option.stock <= 0}
                  onClick={() => handleRedeem(option)}
                  icon={<GiftOutlined />}
                  block
                >
                  {option.stock <= 0 ? '已售罄' : '立即兑换'}
                </Button>
              </Card.Grid>
            ))}
          </Card>
        </Col>
      </Row>

      {/* 兑换模态框 */}
      <Modal
        title={`确认兑换 ${selectedReward?.name}`}
        visible={redeemModalVisible}
        onCancel={() => setRedeemModalVisible(false)}
        footer={[
          <Button key="cancel" onClick={() => setRedeemModalVisible(false)}>
            取消
          </Button>,
          <Button
            key="confirm"
            type="primary"
            loading={confirmLoading}
            onClick={confirmRedeem}
          >
            确认兑换
          </Button>,
        ]}
      >
        <p>确认使用 {selectedReward?.points} 积分兑换 {selectedReward?.name} 吗？</p>
      </Modal>

      {/* 排行榜模态框 */}
      <Modal
        title="积分排行榜"
        visible={leaderboardModalVisible}
        onCancel={() => setLeaderboardModalVisible(false)}
      >
        <List
          itemLayout="horizontal"
          dataSource={leaderboardData}
          renderItem={(item, index) => (
            <List.Item
              extra={(
                <>
                  <Statistic value={item.remainingPoints} suffix=" 积分" />
                </>
              )}
            >
              <List.Item.Meta
                title={`第 ${index + 1} 名`}
                description={item.username}
              />
            </List.Item>
          )}
        />
      </Modal>
    </div>
  );
}