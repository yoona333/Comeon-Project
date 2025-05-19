'use client';

import { Card, Table, Tag, Button, Input, message, Modal, Row, Col, Select, Space, Badge, Typography, Divider, Avatar, Dropdown, Menu, Tooltip, theme, List, Empty } from 'antd';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { jwtDecode, JwtPayload } from 'jwt-decode';
import { 
  SearchOutlined, 
  EyeOutlined, 
  PlusOutlined, 
  HeartOutlined, 
  HeartTwoTone, 
  MessageOutlined, 
  DeleteOutlined, 
  CommentOutlined,
  UpOutlined,
  DownOutlined,
  MoreOutlined,
  EllipsisOutlined,
  UserOutlined,
  ClockCircleOutlined,
  LikeOutlined,
  FileTextOutlined
} from '@ant-design/icons';

const { Option } = Select;
const { TextArea } = Input;
const { Title, Text, Paragraph } = Typography;
const { useToken } = theme;

// 自定义JWT接口
interface CustomJwtPayload extends JwtPayload {
  userId: number;
  role: number;
}

// 板块接口
interface ForumSection {
  category_id: number;
  category_name: string;
  description: string;
}

// 帖子接口
interface Post {
  post_id: number;
  title: string;
  content: string;
  authorId: number;
  sectionId: number;
  createdAt: string;
  isDeleted: boolean;
  likes: number;
  is_liked: number;
}

// 评论接口
interface Comment {
  comment_id: number;
  content: string;
  authorId: number;
  postId: number;
  parent_comment_id?: number;
  createdAt: string;
  isDeleted: boolean;
  likes: number;
  is_liked: number;
}

export default function ForumPage() {
  const router = useRouter();
  const { token: themeToken } = useToken();
  const [loading, setLoading] = useState(true);
  const [sections, setSections] = useState<ForumSection[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [selectedSection, setSelectedSection] = useState<ForumSection | null>(null);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [selectedComment, setSelectedComment] = useState<Comment | null>(null);
  const [createPostModalVisible, setCreatePostModalVisible] = useState(false);
  const [createCommentModalVisible, setCreateCommentModalVisible] = useState(false);
  const [newPostTitle, setNewPostTitle] = useState('');
  const [newPostContent, setNewPostContent] = useState('');
  const [newCommentContent, setNewCommentContent] = useState('');
  const [searchText, setSearchText] = useState('');
  const [expandedComments, setExpandedComments] = useState<Set<number>>(new Set());
  const [commentPreviewVisible, setCommentPreviewVisible] = useState(false);
  const [previewPost, setPreviewPost] = useState<Post | null>(null);
  const [previewComments, setPreviewComments] = useState<Comment[]>([]);

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

      fetchSections(token);
    } catch (error) {
      message.error('无效的登录信息，请重新登录');
      router.push('/login');
    }
  };

  const fetchSections = async (token: string) => {
    try {
      setLoading(true);
      const response = await axios.get('http://localhost:8080/api/categories', {
        headers: { 'x-access-token': token }
      });

      if (response.data.success) {
        setSections(response.data.data);
      }
    } catch (error) {
      console.error('获取板块列表失败:', error);
      message.error('获取板块列表失败，请检查网络连接');
    } finally {
      setLoading(false);
    }
  };

  const fetchPosts = async (sectionId: number, token: string) => {
    try {
      setLoading(true);
      const response = await axios.get(`http://localhost:8080/api/categories/${sectionId}/posts`, {
        headers: { 'x-access-token': token }
      });

      if (response.data.success) {
        setPosts(response.data.data);
      }
    } catch (error) {
      console.error('获取帖子列表失败:', error);
      message.error('获取帖子列表失败，请检查网络连接');
    } finally {
      setLoading(false);
    }
  };

  const fetchComments = async (postId: number, token: string) => {
    try {
      setLoading(true);
      const response = await axios.get(`http://localhost:8080/api/posts/${postId}/comments`, {
        headers: { 'x-access-token': token }
      });

      if (response.data.success) {
        setComments(response.data.data);
      }
    } catch (error) {
      console.error('获取评论列表失败:', error);
      message.error('获取评论列表失败，请检查网络连接');
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePost = async () => {
    try {
      const token = localStorage.getItem('token');
      if (token && selectedSection) {
        const response = await axios.post('http://localhost:8080/api/posts', {
          title: newPostTitle,
          content: newPostContent,
          category_id: selectedSection.category_id
        }, {
          headers: { 'x-access-token': token }
        });

        if (response.data.success) {
          message.success('帖子创建成功');
          setCreatePostModalVisible(false);
          setNewPostTitle('');
          setNewPostContent('');
          fetchPosts(selectedSection.category_id, token);
        }
      }
    } catch (error) {
      console.error('创建帖子失败:', error);
      message.error('创建帖子失败，请稍后再试');
    }
  };

  const handleCreateComment = async () => {
    try {
      const token = localStorage.getItem('token');
      if (token && selectedPost) {
        const postId = selectedPost.post_id;
        const { content, parent_comment_id } = {
          content: newCommentContent,
          parent_comment_id: selectedComment?.comment_id
        };

        const requestData = {
          comment: {
            content,
            parent_comment_id
          }
        };

        const response = await axios.post(`http://localhost:8080/api/posts/${postId}/comments`, requestData, {
          headers: { 'x-access-token': token }
        });

        if (response.data.success) {
          message.success('评论创建成功');
          setCreateCommentModalVisible(false);
          setNewCommentContent('');
          await fetchComments(postId, token);
        }
      }
    } catch (error) {
      console.error('创建评论失败:', error);
      message.error('创建评论失败，请稍后再试');
    }
  };

  const handleSoftDeletePost = async (postId: number) => {
    try {
      const token = localStorage.getItem('token');
      if (token) {
        const response = await axios.put(`http://localhost:8080/api/posts/${postId}`, {}, {
          headers: { 'x-access-token': token }
        });

        if (response.data.success) {
          message.success('帖子已软删除');
          if (selectedSection) {
            fetchPosts(selectedSection.category_id, token);
          }
        }
      }
    } catch (error) {
      console.error('软删除帖子失败:', error);
      message.error('软删除帖子失败，请稍后再试');
    }
  };

  const handleSoftDeleteComment = async (commentId: number) => {
    try {
      const token = localStorage.getItem('token');
      if (token && selectedPost) {
        const response = await axios.put(`http://localhost:8080/api/comments/${commentId}`, {}, {
          headers: { 'x-access-token': token }
        });

        if (response.data.success) {
          message.success('评论已软删除');
          fetchComments(selectedPost.post_id, token);
        }
      }
    } catch (error) {
      console.error('软删除评论失败:', error);
      message.error('软删除评论失败，请稍后再试');
    }
  };

  const handleLike = async (id: number, type: 'post' | 'comment') => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await axios.post('http://localhost:8080/api/likes', { [type === 'post' ? 'postId' : 'commentId']: id }, {
        headers: { 'x-access-token': token }
      });

      if (response.data.success) {
        message.success(response.data.message);
        if (type === 'post') {
          setPosts(prevPosts => prevPosts.map(post => 
            post.post_id === id ? { 
              ...post, 
              likes: response.data.data.isLike ? post.likes + 1 : post.likes - 1,
              is_liked: response.data.data.isLike ? 1 : 0
            } : post
          ));
        } else {
          setComments(prevComments => prevComments.map(comment => 
            comment.comment_id === id ? { 
              ...comment, 
              likes: response.data.data.isLike ? comment.likes + 1 : comment.likes - 1,
              is_liked: response.data.data.isLike ? 1 : 0
            } : comment
          ));
        }
      }
    } catch (error) {
      console.error('点赞失败:', error);
      message.error('点赞失败，请稍后再试');
    }
  };

  // 获取顶级评论（parent_comment_id 为 NULL 的评论）
  const getTopLevelComments = () => {
    return comments.filter(comment => comment.parent_comment_id === null);
  };

  // 获取子评论
  const getChildComments = (parentId: number) => {
    return comments.filter(comment => comment.parent_comment_id === parentId);
  };

  // 切换评论展开状态
  const toggleCommentExpansion = (commentId: number) => {
    const newExpandedComments = new Set(expandedComments);
    if (newExpandedComments.has(commentId)) {
      newExpandedComments.delete(commentId);
    } else {
      newExpandedComments.add(commentId);
    }
    setExpandedComments(newExpandedComments);
  };

  // 获取父评论内容
  const getParentComment = (parentId: number) => {
    return comments.find(comment => comment.comment_id === parentId);
  };

  // 自定义卡片样式
  const cardStyle = {
    borderRadius: '12px',
    boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
    marginBottom: '24px',
    overflow: 'hidden',
    border: 'none'
  };

  // 自定义表格样式
  const tableStyle = {
    borderRadius: '8px',
    overflow: 'hidden',
  };

  // 自定义表格组件样式
  const customTableProps = {
    loading,
    bordered: false,
    style: tableStyle,
    rowClassName: () => 'custom-table-row',
    pagination: { 
      pageSize: 10,
      showSizeChanger: true,
      showQuickJumper: true,
      showTotal: (total: number) => `共 ${total} 条`,
      size: 'default' as const
    }
  };

  // 格式化日期时间
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('zh-CN');
  };

  // 帖子操作菜单
  const getPostActionMenu = (record: Post) => {
    return [
      {
        key: 'view',
        label: '查看评论',
        icon: <CommentOutlined />,
        onClick: () => {
          setSelectedPost(record);
          const token = localStorage.getItem('token');
          if (token) {
            fetchComments(record.post_id, token);
          }
        }
      },
      {
        key: 'like',
        label: record.is_liked ? '取消点赞' : '点赞',
        icon: record.is_liked ? <HeartTwoTone twoToneColor="#eb2f96" /> : <HeartOutlined />,
        onClick: () => handleLike(record.post_id, 'post')
      },
      {
        key: 'delete',
        label: '删除',
        icon: <DeleteOutlined />,
        danger: true,
        onClick: () => handleSoftDeletePost(record.post_id)
      }
    ];
  };

  // 评论操作菜单
  const getCommentActionMenu = (record: Comment) => {
    const items = [
      {
        key: 'reply',
        label: '回复',
        icon: <MessageOutlined />,
        onClick: () => {
          setSelectedComment(record);
          setCreateCommentModalVisible(true);
        }
      },
      {
        key: 'like',
        label: record.is_liked ? '取消点赞' : '点赞',
        icon: record.is_liked ? <HeartTwoTone twoToneColor="#eb2f96" /> : <HeartOutlined />,
        onClick: () => handleLike(record.comment_id, 'comment')
      },
      {
        key: 'delete',
        label: '删除',
        icon: <DeleteOutlined />,
        danger: true,
        onClick: () => handleSoftDeleteComment(record.comment_id)
      }
    ];

    if (record.comment_id && getChildComments(record.comment_id).length > 0) {
      items.push({
        key: 'expand',
        label: expandedComments.has(record.comment_id) ? '收起子评论' : '展开子评论',
        icon: expandedComments.has(record.comment_id) ? <UpOutlined /> : <DownOutlined />,
        onClick: () => toggleCommentExpansion(record.comment_id)
      });
    }

    return items;
  };

  // 添加预览评论的处理函数
  const handlePreviewComments = async (post: Post) => {
    setPreviewPost(post);
    setCommentPreviewVisible(true);
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const response = await axios.get(`http://localhost:8080/api/posts/${post.post_id}/comments`, {
          headers: { 'x-access-token': token }
        });
        if (response.data.success) {
          setPreviewComments(response.data.data);
        }
      } catch (error) {
        console.error('获取评论列表失败:', error);
        message.error('获取评论列表失败，请检查网络连接');
      }
    }
  };

  const sectionColumns = [
    {
      title: <Text strong style={{ fontSize: '16px' }}>板块名称</Text>,
      dataIndex: 'category_name',
      key: 'category_name',
      render: (text: string) => (
        <Text strong style={{ fontSize: '16px', color: themeToken.colorPrimary }}>{text}</Text>
      )
    },
    {
      title: <Text strong style={{ fontSize: '16px' }}>描述</Text>,
      dataIndex: 'description',
      key: 'description',
      render: (text: string) => (
        <Paragraph ellipsis={{ rows: 2 }} style={{ margin: 0 }}>{text}</Paragraph>
      )
    },
    {
      title: <Text strong style={{ fontSize: '16px' }}>操作</Text>,
      key: 'action',
      render: (_: unknown, record: ForumSection) => (
        <Button 
          type="primary" 
          shape="round"
          icon={<EyeOutlined />} 
          onClick={() => {
            setSelectedSection(record);
            const token = localStorage.getItem('token');
            if (token) {
              fetchPosts(record.category_id, token);
            }
          }}
        >
          查看板块
        </Button>
      ),
    },
  ];

  const postColumns = [
    {
      title: <Text strong style={{ fontSize: '16px' }}>标题</Text>,
      dataIndex: 'title',
      key: 'title',
      render: (text: string, record: Post) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Avatar style={{ backgroundColor: themeToken.colorPrimary, color: '#fff' }} icon={<FileTextOutlined />} />
          <div>
            <Text strong style={{ fontSize: '16px', display: 'block' }}>{text}</Text>
            <Text type="secondary" style={{ fontSize: '12px' }}>
              <UserOutlined style={{ marginRight: '5px' }} />
              用户ID: {record.authorId}
              <ClockCircleOutlined style={{ marginLeft: '10px', marginRight: '5px' }} />
              {record.createdAt ? formatDate(record.createdAt) : '未知时间'}
            </Text>
          </div>
        </div>
      )
    },
    {
      title: <Text strong style={{ fontSize: '16px' }}>内容</Text>,
      dataIndex: 'content',
      key: 'content',
      render: (text: string) => (
        <Paragraph 
          ellipsis={{ rows: 2 }} 
          style={{ margin: 0, maxWidth: '400px' }}
        >
          {text}
        </Paragraph>
      )
    },
    {
      title: <Text strong style={{ fontSize: '16px' }}>点赞数</Text>,
      dataIndex: 'likes',
      key: 'likes',
      width: 100,
      render: (text: number) => (
        <Space>
          <LikeOutlined style={{ color: '#1890ff' }} />
          <Text style={{ color: '#1890ff', fontWeight: 'bold' }}>{text}</Text>
        </Space>
      ),
    },
    {
      title: <Text strong style={{ fontSize: '16px' }}>操作</Text>,
      key: 'action',
      width: 200,
      render: (_: unknown, record: Post) => (
        <Space size="small">
          <Button 
            type="text" 
            icon={<CommentOutlined />}
            onClick={() => handlePreviewComments(record)}
            title="查看评论"
          />
          <Button
            type="text"
            icon={record.is_liked ? <HeartTwoTone twoToneColor="#eb2f96" /> : <HeartOutlined />}
            onClick={() => handleLike(record.post_id, 'post')}
            title={record.is_liked ? '取消点赞' : '点赞'}
          />
          <Button
            type="text"
            danger
            icon={<DeleteOutlined />}
            onClick={() => handleSoftDeletePost(record.post_id)}
            title="删除"
          />
        </Space>
      ),
    },
  ];

  const commentColumns = [
    {
      title: <Text strong style={{ fontSize: '16px' }}>评论内容</Text>,
      dataIndex: 'content',
      key: 'content',
      render: (text: string, record: Comment) => (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <Avatar size="small" icon={<UserOutlined />} style={{ backgroundColor: '#87d068' }} />
            <Text type="secondary" style={{ fontSize: '12px' }}>
              用户ID: {record.authorId}
              {record.createdAt && (
                <span style={{ marginLeft: '8px' }}>
                  <ClockCircleOutlined style={{ marginRight: '5px' }} />
                  {formatDate(record.createdAt)}
                </span>
              )}
            </Text>
          </div>
          <Paragraph style={{ margin: 0, paddingLeft: '28px' }}>{text}</Paragraph>
        </div>
      )
    },
    {
      title: <Text strong style={{ fontSize: '16px' }}>点赞数</Text>,
      dataIndex: 'likes',
      key: 'likes',
      width: 100,
      render: (text: number) => (
        <Space>
          <LikeOutlined style={{ color: '#52c41a' }} />
          <Text style={{ color: '#52c41a', fontWeight: 'bold' }}>{text}</Text>
        </Space>
      ),
    },
    {
      title: <Text strong style={{ fontSize: '16px' }}>操作</Text>,
      key: 'action',
      width: 200,
      render: (_: unknown, record: Comment) => (
        <Space size="small">
          <Button 
            type="text"
            icon={<MessageOutlined />}
            onClick={() => {
              setSelectedComment(record);
              setCreateCommentModalVisible(true);
            }}
            title="回复"
          />
          <Button
            type="text"
            icon={record.is_liked ? <HeartTwoTone twoToneColor="#eb2f96" /> : <HeartOutlined />}
            onClick={() => handleLike(record.comment_id, 'comment')}
            title={record.is_liked ? '取消点赞' : '点赞'}
          />
          <Button
            type="text"
            danger
            icon={<DeleteOutlined />}
            onClick={() => handleSoftDeleteComment(record.comment_id)}
            title="删除"
          />
          {record.comment_id && getChildComments(record.comment_id).length > 0 && (
            <Button 
              type="text"
              icon={expandedComments.has(record.comment_id) ? <UpOutlined /> : <DownOutlined />}
              onClick={() => toggleCommentExpansion(record.comment_id)}
              title={expandedComments.has(record.comment_id) ? '收起子评论' : '展开子评论'}
            />
          )}
        </Space>
      ),
    },
  ];

  return (
    <div style={{ 
      padding: '30px', 
      background: 'linear-gradient(to bottom, #f7faff, #f0f5ff)', 
      minHeight: '100vh' 
    }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <Title level={2} style={{ 
          textAlign: 'center', 
          marginBottom: '40px', 
          color: themeToken.colorPrimary,
          fontWeight: 'bold',
          textShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
          社团积分论坛
        </Title>
        
        <Card 
          title={
            <Title level={4} style={{ margin: 0, color: themeToken.colorPrimary }}>
              论坛板块
            </Title>
          }
          headStyle={{ 
            borderBottom: '1px solid #f0f0f0',
            padding: '16px 24px'
          }}
          bodyStyle={{ padding: '24px' }}
          style={cardStyle}
        >
          <Table
            {...customTableProps}
            columns={sectionColumns}
            dataSource={sections}
            rowKey="category_id"
          />
        </Card>

        {selectedSection && (
          <Card 
            title={
              <Space size={16} align="center">
                <Title level={4} style={{ margin: 0, color: themeToken.colorPrimary }}>
                  {selectedSection.category_name} 
                </Title>
                <Tag color="blue">板块</Tag>
              </Space>
            }
            headStyle={{ 
              borderBottom: '1px solid #f0f0f0',
              padding: '16px 24px'
            }}
            bodyStyle={{ padding: '24px' }}
            extra={(
              <Space size="middle">
                <Input.Search
                  placeholder="搜索帖子"
                  onSearch={(value) => setSearchText(value)}
                  style={{ width: 220 }}
                  allowClear
                />
                <Button 
                  type="primary" 
                  shape="round"
                  icon={<PlusOutlined />} 
                  onClick={() => setCreatePostModalVisible(true)}
                >
                  创建帖子
                </Button>
              </Space>
            )}
            style={cardStyle}
          >
            <Table
              {...customTableProps}
              columns={postColumns}
              dataSource={posts.filter(post => 
                searchText === '' || 
                post.title.includes(searchText) ||
                post.content.includes(searchText)
              )}
              rowKey="post_id"
            />
          </Card>
        )}

        {selectedPost && (
          <Card 
            title={
              <div>
                <Title level={4} style={{ margin: 0, color: themeToken.colorPrimary }}>{selectedPost.title}</Title>
                <div style={{ margin: '12px 0', padding: '12px', backgroundColor: '#f9f9f9', borderRadius: '8px' }}>
                  <Paragraph style={{ margin: 0 }}>{selectedPost.content}</Paragraph>
                </div>
              </div>
            }
            headStyle={{ 
              borderBottom: '1px solid #f0f0f0',
              padding: '16px 24px'
            }}
            bodyStyle={{ padding: '24px' }}
            extra={(
              <Space size="middle">
                <Input.Search
                  placeholder="搜索评论"
                  onSearch={(value) => setSearchText(value)}
                  style={{ width: 220 }}
                  allowClear
                />
                <Button 
                  type="primary" 
                  shape="round"
                  icon={<PlusOutlined />} 
                  onClick={() => {
                    setSelectedComment(null);
                    setCreateCommentModalVisible(true);
                  }}
                >
                  回复帖子
                </Button>
              </Space>
            )}
            style={cardStyle}
          >
            <Table
              {...customTableProps}
              columns={commentColumns}
              dataSource={getTopLevelComments()}
              rowKey="comment_id"
            />
            
            {/* 渲染展开的子评论 */}
            {Array.from(expandedComments).map(parentId => {
              const parentComment = getParentComment(parentId);
              const childComments = getChildComments(parentId);

              return (
                <Card
                  key={parentId}
                  title={
                    <Space align="center">
                      <Text strong>回复评论</Text>
                      <Tag color="green">子评论</Tag>
                    </Space>
                  }
                  style={{ 
                    marginLeft: 40, 
                    marginTop: 16, 
                    marginBottom: 16, 
                    backgroundColor: '#f9fcff',
                    borderRadius: '8px',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
                  }}
                  size="small"
                  headStyle={{ padding: '12px 16px' }}
                  bodyStyle={{ padding: '0' }}
                  bordered={false}
                >
                  <div style={{ 
                    padding: '12px 16px',
                    backgroundColor: 'rgba(24, 144, 255, 0.05)',
                    borderRadius: '4px',
                    margin: '0 16px 16px'
                  }}>
                    <Text type="secondary">原评论: </Text>
                    <Text strong>{parentComment?.content || '已删除的评论'}</Text>
                  </div>
                  <Table
                    {...customTableProps}
                    columns={commentColumns}
                    dataSource={childComments}
                    rowKey="comment_id"
                    pagination={false}
                    style={{ backgroundColor: 'transparent' }}
                  />
                </Card>
              );
            })}
          </Card>
        )}

        <Modal
          title={<Title level={4} style={{ margin: 0 }}>创建帖子</Title>}
          open={createPostModalVisible}
          onCancel={() => setCreatePostModalVisible(false)}
          onOk={handleCreatePost}
          width={700}
          centered
          bodyStyle={{ padding: '24px' }}
        >
          <Input
            placeholder="帖子标题"
            value={newPostTitle}
            onChange={e => setNewPostTitle(e.target.value)}
            size="large"
            style={{ marginBottom: 16 }}
            prefix={<FileTextOutlined style={{ color: '#bfbfbf' }} />}
          />
          <TextArea
            placeholder="帖子内容"
            value={newPostContent}
            onChange={e => setNewPostContent(e.target.value)}
            rows={8}
            style={{ marginTop: 16 }}
          />
        </Modal>

        <Modal
          title={<Title level={4} style={{ margin: 0 }}>{selectedComment ? '回复评论' : '回复帖子'}</Title>}
          open={createCommentModalVisible}
          onCancel={() => setCreateCommentModalVisible(false)}
          onOk={handleCreateComment}
          width={700}
          centered
          bodyStyle={{ padding: '24px' }}
        >
          {selectedComment && (
            <div style={{ 
              marginBottom: 16, 
              padding: 16, 
              backgroundColor: 'rgba(24, 144, 255, 0.05)', 
              borderRadius: '8px',
              border: '1px solid rgba(24, 144, 255, 0.1)'
            }}>
              <Text strong style={{ display: 'block', marginBottom: '8px' }}>回复内容:</Text>
              <Paragraph style={{ margin: 0 }}>{selectedComment.content}</Paragraph>
            </div>
          )}
          <TextArea
            placeholder={selectedComment ? '请输入回复内容' : '请输入评论内容'}
            value={newCommentContent}
            onChange={e => setNewCommentContent(e.target.value)}
            rows={8}
            showCount
            maxLength={500}
          />
        </Modal>

        {/* 添加评论预览抽屉 */}
        <Modal
          title={
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <CommentOutlined style={{ color: themeToken.colorPrimary }} />
              <span>评论预览</span>
              {previewPost && (
                <Tag color="blue" style={{ marginLeft: '8px' }}>
                  {previewPost.title}
                </Tag>
              )}
            </div>
          }
          open={commentPreviewVisible}
          onCancel={() => {
            setCommentPreviewVisible(false);
            setPreviewPost(null);
            setPreviewComments([]);
          }}
          width={800}
          footer={null}
          bodyStyle={{ 
            padding: '24px',
            maxHeight: '70vh',
            overflow: 'auto'
          }}
        >
          {previewPost && (
            <div style={{ marginBottom: '24px' }}>
              <Card 
                style={{ 
                  backgroundColor: '#f9f9f9',
                  borderRadius: '8px',
                  marginBottom: '16px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                  <Avatar icon={<UserOutlined />} style={{ backgroundColor: themeToken.colorPrimary }} />
                  <div>
                    <Text strong>用户ID: {previewPost.authorId}</Text>
                    <br />
                    <Text type="secondary" style={{ fontSize: '12px' }}>
                      <ClockCircleOutlined style={{ marginRight: '4px' }} />
                      {formatDate(previewPost.createdAt)}
                    </Text>
                  </div>
                </div>
                <Paragraph style={{ margin: 0 }}>{previewPost.content}</Paragraph>
              </Card>

              <div style={{ marginTop: '16px' }}>
                <Space style={{ marginBottom: '16px' }}>
                  <Button 
                    type="primary" 
                    icon={<PlusOutlined />}
                    onClick={() => {
                      setSelectedPost(previewPost);
                      setCreateCommentModalVisible(true);
                    }}
                  >
                    添加评论
                  </Button>
                </Space>

                {previewComments.length > 0 ? (
                  <List
                    dataSource={previewComments}
                    renderItem={(comment) => (
                      <div
                        style={{ 
                          padding: '12px',
                          borderBottom: '1px solid #f0f0f0',
                          backgroundColor: '#fff',
                          transition: 'all 0.3s'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = '#fafafa';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = '#fff';
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                          <Avatar size="small" icon={<UserOutlined />} style={{ backgroundColor: '#87d068', flexShrink: 0 }} />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                              <Text strong style={{ fontSize: '14px' }}>用户ID: {comment.authorId}</Text>
                              <Text type="secondary" style={{ fontSize: '12px' }}>
                                <ClockCircleOutlined style={{ marginRight: '4px' }} />
                                {formatDate(comment.createdAt)}
                              </Text>
                            </div>
                            <Paragraph style={{ margin: 0, fontSize: '14px' }}>{comment.content}</Paragraph>
                            <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '16px' }}>
                              <Button
                                type="text"
                                size="small"
                                icon={comment.is_liked ? <HeartTwoTone twoToneColor="#eb2f96" /> : <HeartOutlined />}
                                onClick={() => handleLike(comment.comment_id, 'comment')}
                                style={{ padding: '0 8px' }}
                              >
                                <span style={{ marginLeft: '4px' }}>{comment.likes}</span>
                              </Button>
                              <Button
                                type="text"
                                size="small"
                                icon={<MessageOutlined />}
                                onClick={() => {
                                  setSelectedComment(comment);
                                  setCreateCommentModalVisible(true);
                                }}
                                style={{ padding: '0 8px' }}
                              >
                                回复
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                    style={{
                      maxHeight: '400px',
                      overflowY: 'auto',
                      border: '1px solid #f0f0f0',
                      borderRadius: '8px',
                      backgroundColor: '#fff'
                    }}
                  />
                ) : (
                  <Empty 
                    description="暂无评论" 
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                    style={{ margin: '32px 0' }}
                  />
                )}
              </div>
            </div>
          )}
        </Modal>
      </div>
    </div>
  );
}