'use client';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { message, Form, Input, DatePicker, InputNumber, Button, Card, Divider, Select, Row, Col, Spin } from 'antd';
import { CalendarOutlined, EnvironmentOutlined, TeamOutlined, TagsOutlined, PhoneOutlined } from '@ant-design/icons';
import { jwtDecode } from 'jwt-decode';
import moment from 'moment';
import styles from './activity-list.module.scss';

const { TextArea } = Input;
const { Option } = Select;
const { RangePicker } = DatePicker;

interface JwtPayload {
  userId: number;
  role: number;
  exp: number;
}

interface Club {
  id: number;
  name: string;
  leader_id: number;
}

const CreateActivityPage: React.FC = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [leaderClubs, setLeaderClubs] = useState<Club[]>([]);
  const [userId, setUserId] = useState<number | null>(null);
  const router = useRouter();

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      message.error('请先登录');
      router.push('/login');
      return;
    }

    try {
      const decoded = jwtDecode<JwtPayload>(token);
      if (decoded.exp < Date.now() / 1000) {
        message.error('登录已过期，请重新登录');
        router.push('/login');
        return;
      }

      // 保存用户ID，不再检查role
      setUserId(decoded.userId);
      
      // 获取该用户领导的社团
      const userLeaderClubs = await fetchLeaderClubs(token, decoded.userId);
      
      // 如果用户不是任何社团的社长，则没有权限
      if (userLeaderClubs.length === 0) {
        message.error('您不是任何社团的社长，无法创建活动');
        setTimeout(() => router.push('/student'), 2000);
        return;
      }
    } catch (error) {
      message.error('无效的登录信息，请重新登录');
      router.push('/login');
    }
  };

  const fetchLeaderClubs = async (token: string, userId: number) => {
    try {
      setLoading(true);
      
      // 获取所有社团
      const response = await fetch('http://localhost:8080/api/clubs', {
        headers: {
          'x-access-token': token
        }
      });

      if (!response.ok) {
        throw new Error('获取社团列表失败');
      }

      const data = await response.json();
      if (data.success && Array.isArray(data.data)) {
        // 过滤出用户是社长的社团 - 核心修改，使用leader_id判断
        const userLeaderClubs = data.data.filter((club: Club) => club.leader_id === userId);
        setLeaderClubs(userLeaderClubs);
        
        // 如果只有一个社团，自动选择
        if (userLeaderClubs.length === 1) {
          form.setFieldsValue({ club_id: userLeaderClubs[0].id });
        }
        
        return userLeaderClubs;
      }
      
      return [];
    } catch (error) {
      console.error('获取社团列表失败:', error);
      message.error('获取社团列表失败');
      return [];
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (values: any) => {
    setSubmitting(true);
    
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        router.push('/login');
        return;
      }
      
      // 验证选择的社团是否是用户领导的社团
      const isLeaderOfClub = leaderClubs.some(club => club.id === values.club_id);
      if (!isLeaderOfClub) {
        message.error('您不是该社团的社长，无法为此社团创建活动');
        setSubmitting(false);
        return;
      }

      // 格式化日期时间
      const startTime = values.timeRange[0].format('YYYY-MM-DD HH:mm:ss');
      const endTime = values.timeRange[1].format('YYYY-MM-DD HH:mm:ss');
      const registrationTime = values.registrationTime?.format('YYYY-MM-DD HH:mm:ss'); // 格式化报名时间
      
      const response = await fetch('http://localhost:8080/api/activities', {
        method: 'POST',
        headers: {
          'x-access-token': token,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title: values.title,
          description: values.description,
          club_id: values.club_id,
          start_time: startTime,
          end_time: endTime,
          location: values.location,
          max_participants: values.max_participants,
          status: 0, // 默认为待审批
          points: values.points || 0,
          tags: values.tags || '',
          contact: values.contact || '',
          registration_time: registrationTime // 新增报名时间字段
        })
      });

      const data = await response.json();
      
      if (!response.ok || !data.success) {
        throw new Error(data.message || '创建活动失败');
      }

      message.success('活动创建成功！等待管理员审核');
      form.resetFields();
      
      // 创建成功后跳转到活动列表
      setTimeout(() => {
        router.push('/student/my-activities');
      }, 1500);
    } catch (err) {
      if (err instanceof Error) {
        message.error(err.message);
      } else {
        message.error('创建活动时发生错误');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const fetchActivities = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      
      // 获取活动列表的代码
      const response = await fetch('http://localhost:8080/api/activities', {
        headers: {
          'x-access-token': token
        }
      });
      
      // 处理响应...
    } catch (error) {
      console.error('获取活动列表失败:', error);
    }
  };

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <Spin size="large" tip="加载中..." />
      </div>
    );
  }

  return (
    <div className={styles.activityListContainer}>
      <h1 className={styles.title}>创建社团活动</h1>
      
      <Card className={styles.formCard}>
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          initialValues={{
            max_participants: 30,
            points: 5
          }}
        >
          <Form.Item
            name="title"
            label="活动标题"
            rules={[{ required: true, message: '请输入活动标题' }]}
          >
            <Input placeholder="请输入活动标题" maxLength={200} showCount />
          </Form.Item>
          
          <Form.Item
            name="description"
            label="活动描述"
            rules={[{ required: true, message: '请输入活动描述' }]}
          >
            <TextArea 
              placeholder="请详细描述活动内容、目的和意义" 
              autoSize={{ minRows: 4, maxRows: 8 }}
              maxLength={2000} 
              showCount
            />
          </Form.Item>
          
          <Form.Item
            name="club_id"
            label="所属社团"
            rules={[{ required: true, message: '请选择社团' }]}
          >
            <Select placeholder="请选择您担任社长的社团">
              {leaderClubs.map(club => (
                <Option key={club.id} value={club.id}>{club.name}</Option>
              ))}
            </Select>
          </Form.Item>

                    {/* 新增报名时间字段 */}
                    <Form.Item
            name="registrationTime"
            label="活动报名时间"
            rules={[{ required: true, message: '请选择活动报名时间' }]}
          >
            <DatePicker 
              showTime 
              style={{ width: '100%' }} 
              placeholder="请选择活动报名时间"
              format="YYYY-MM-DD HH:mm"
            />
          </Form.Item>
          
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="timeRange"
                label="活动时间"
                rules={[{ required: true, message: '请选择活动时间范围' }]}
              >
                <RangePicker 
                  showTime 
                  style={{ width: '100%' }} 
                  placeholder={['开始时间', '结束时间']}
                  format="YYYY-MM-DD HH:mm"
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="location"
                label="活动地点"
                rules={[{ required: true, message: '请输入活动地点' }]}
              >
                <Input 
                  placeholder="请输入活动地点" 
                  prefix={<EnvironmentOutlined />}
                  maxLength={200}
                />
              </Form.Item>
            </Col>
          </Row>
          
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="max_participants"
                label="最大参与人数"
                rules={[{ required: true, message: '请输入最大参与人数' }]}
              >
                <InputNumber 
                  min={1} 
                  max={1000}
                  style={{ width: '100%' }} 
                  placeholder="最大参与人数"
                  prefix={<TeamOutlined />}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="points"
                label="活动积分"
                rules={[{ required: true, message: '请输入积分' }]}
              >
                <InputNumber 
                  min={0} 
                  max={100}
                  style={{ width: '100%' }} 
                  placeholder="参与者可获得的积分"
                />
              </Form.Item>
            </Col>
          </Row>
          
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="contact"
                label="联系方式"
              >
                <Input 
                  placeholder="联系人电话或邮箱" 
                  prefix={<PhoneOutlined />}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="tags"
                label="活动标签"
                help="多个标签用逗号分隔"
              >
                <Input 
                  placeholder="例如：志愿服务,户外活动,文化交流" 
                  prefix={<TagsOutlined />}
                />
              </Form.Item>
            </Col>
          </Row>


          
          <Divider />
          
          <Form.Item className={styles.buttonContainer}>
            <Button 
              type="default" 
              onClick={() => router.back()}
              style={{ marginRight: 16 }}
            >
              取消
            </Button>
            <Button 
              type="primary" 
              htmlType="submit" 
              loading={submitting}
              className={styles.submitButton}
            >
              提交活动
            </Button>
          </Form.Item>
        </Form>
      </Card>
      
      {/* 添加一些提示信息 */}
      <Card title="活动创建说明" className={styles.tipsCard}>
        <ul>
          <li>您只能为自己担任社长的社团创建活动</li>
          <li>创建的活动需要经过管理员审核后才能发布</li>
          <li>请确保活动信息真实准确，尤其是时间和地点</li>
          <li>活动积分将作为参与者完成活动后获得的奖励</li>
          <li>您可以在&quot;我的活动&quot;中查看已创建活动的审核状态</li>
        </ul>
      </Card>
    </div>
  );
};

export default CreateActivityPage;