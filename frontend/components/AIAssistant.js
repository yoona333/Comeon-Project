import React, { useState } from 'react';
import { Input, Button, Card, List, Typography, Space, message } from 'antd';
import { SendOutlined, RobotOutlined } from '@ant-design/icons';

const { TextArea } = Input;
const { Title, Text } = Typography;

const AIAssistant = () => {
    const [question, setQuestion] = useState('');
    const [loading, setLoading] = useState(false);
    const [chatHistory, setChatHistory] = useState([]);

    const handleAsk = async () => {
        if (!question.trim()) {
            message.warning('请输入问题');
            return;
        }

        setLoading(true);
        try {
            const response = await fetch('/api/ai/query', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ question }),
            });

            const data = await response.json();
            
            // 添加用户问题和AI回答到聊天历史
            setChatHistory(prev => [...prev, 
                { type: 'user', content: question },
                { type: 'ai', content: formatResponse(data) }
            ]);
            
            setQuestion('');
        } catch (error) {
            message.error('查询失败，请稍后重试');
            console.error('AI查询错误:', error);
        } finally {
            setLoading(false);
        }
    };

    const formatResponse = (data) => {
        if (data.error) {
            return data.error;
        }

        switch (data.type) {
            case 'user_points':
                return `${data.username} 的总积分为 ${data.total_points} 分`;
            
            case 'activity_info':
                return `活动信息：\n` +
                       `名称：${data.activity.title}\n` +
                       `主办社团：${data.activity.club_name}\n` +
                       `时间：${new Date(data.activity.start_time).toLocaleString()} - ${new Date(data.activity.end_time).toLocaleString()}\n` +
                       `地点：${data.activity.location}\n` +
                       `最大参与人数：${data.activity.max_participants}`;
            
            case 'club_info':
                return `社团信息：\n` +
                       `名称：${data.club.name}\n` +
                       `社长：${data.club.leader_name}\n` +
                       `描述：${data.club.description}`;
            
            case 'statistics':
                if (data.most_active_club) {
                    return `最活跃的社团是 ${data.most_active_club.name}，共举办了 ${data.most_active_club.activity_count} 场活动`;
                }
                if (data.top_user) {
                    return `积分最高的用户是 ${data.top_user.username}，总积分为 ${data.top_user.total_points} 分`;
                }
                return '暂无统计数据';
            
            default:
                return '抱歉，我暂时无法理解您的问题';
        }
    };

    return (
        <Card 
            title={
                <Space>
                    <RobotOutlined />
                    <Title level={4} style={{ margin: 0 }}>AI助手</Title>
                </Space>
            }
            style={{ maxWidth: 800, margin: '20px auto' }}
        >
            <List
                dataSource={chatHistory}
                renderItem={item => (
                    <List.Item>
                        <Card 
                            style={{ 
                                width: '100%',
                                backgroundColor: item.type === 'ai' ? '#f0f2f5' : '#e6f7ff'
                            }}
                        >
                            <Space>
                                {item.type === 'ai' ? <RobotOutlined /> : null}
                                <Text>{item.content}</Text>
                            </Space>
                        </Card>
                    </List.Item>
                )}
            />
            
            <div style={{ marginTop: 20 }}>
                <TextArea
                    value={question}
                    onChange={e => setQuestion(e.target.value)}
                    placeholder="请输入您的问题，例如：'张三的积分是多少？' 或 '最活跃的社团是哪个？'"
                    autoSize={{ minRows: 2, maxRows: 6 }}
                    onPressEnter={e => {
                        if (!e.shiftKey) {
                            e.preventDefault();
                            handleAsk();
                        }
                    }}
                />
                <Button
                    type="primary"
                    icon={<SendOutlined />}
                    onClick={handleAsk}
                    loading={loading}
                    style={{ marginTop: 10 }}
                >
                    发送
                </Button>
            </div>
        </Card>
    );
};

export default AIAssistant; 