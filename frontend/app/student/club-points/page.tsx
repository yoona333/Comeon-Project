'use client';

import { Card, Table, Tag, Button, Input, message, Modal, Row, Col, Select, Space, Badge, Typography, Avatar, Empty } from 'antd';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { jwtDecode } from 'jwt-decode';
import { SearchOutlined, EyeOutlined, PlusOutlined, HeartOutlined, HeartTwoTone, MessageOutlined, DeleteOutlined, CommentOutlined, UpOutlined, DownOutlined, UserOutlined, ClockCircleOutlined, LikeOutlined, FileTextOutlined } from '@ant-design/icons';
import { JwtPayload } from 'jwt-decode';

const { Option } = Select;
const { TextArea } = Input;
const { Title, Text, Paragraph } = Typography;

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
  user_id: number;
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
  const [loading, setLoading] = useState(true);  //控制加载状态
  const [sections, setSections] = useState<ForumSection[]>([]);  //存储板块列表
  const [posts, setPosts] = useState<Post[]>([]);  //存储帖子列表
  const [comments, setComments] = useState<Comment[]>([]);  //存储评论列表
  const [selectedSection, setSelectedSection] = useState<ForumSection | null>(null);  //存储当前选中的板块
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);  //存储当前选中的帖子
  const [selectedComment, setSelectedComment] = useState<Comment | null>(null); //存储当前选中的评论
  const [createPostModalVisible, setCreatePostModalVisible] = useState(false);  //控制创建帖子模态框的显示
  const [createCommentModalVisible, setCreateCommentModalVisible] = useState(false);  //控制创建评论模态框的显示
  const [newPostTitle, setNewPostTitle] = useState('');  //存储新帖子的标题
  const [newPostContent, setNewPostContent] = useState('');  //存储新帖子的内容
  const [newCommentContent, setNewCommentContent] = useState('');  //存储新评论的内容
  const [searchText, setSearchText] = useState('');  //存储搜索关键字
  const [expandedComments, setExpandedComments] = useState<Set<number>>(new Set());  //存储展开的评论

  // 添加一个状态来存储当前登录用户的信息
  const [currentUser, setCurrentUser] = useState<{ userId: number; role: number } | null>(null);  //存储当前登录用户的信息

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

      // 保存用户信息到状态
      setCurrentUser({
        userId: decoded.userId,
        role: decoded.role
      });

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

  // 获取帖子列表
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

  // 获取评论列表
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

  // 创建帖子
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

  // 创建评论
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

  // 软删除帖子 
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

  // 软删除评论 
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

  // 点赞
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

  // 板块列表的列定义
  const sectionColumns = [
    {
      title: '板块名称',
      dataIndex: 'category_name',
      key: 'category_name',
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
    },
    {
      title: '操作',
      key: 'action',
      render: (_: unknown, record: ForumSection) => (
        <Button 
          type="link" 
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
  // 帖子列表的列定义
  const postColumns = [
    {
      title: '标题',
      dataIndex: 'title',
      key: 'title',
    },
    {
      title: '内容',
      dataIndex: 'content',
      key: 'content',
    },
    {
      title: '点赞数',
      dataIndex: 'likes',
      key: 'likes',
      render: (text: number) => (
        <Badge count={text} />
      ),
    },
    {
      title: '操作',
      key: 'action',
      render: (_: unknown, record: Post) => {
        // 判断是否显示删除按钮
        const showDeleteButton = currentUser && (
          currentUser.role === 0 || // 管理员可以直接删除
          currentUser.userId === record.user_id // 帖子的发布者可以删除
        );

        return (
          <Space>
            <Button 
              type="link" 
              icon={<EyeOutlined />} 
              onClick={() => {
                setSelectedPost(record);
                const token = localStorage.getItem('token');
                if (token) {
                  fetchComments(record.post_id, token);
                }
              }}
            >
              查看评论
            </Button>
            {showDeleteButton && (
              <Button 
                type="link" 
                danger
                onClick={() => handleSoftDeletePost(record.post_id)}
              >
                删除
              </Button>
            )}
            <Button
              type="link"
              icon={record.is_liked ? <HeartTwoTone twoToneColor="#eb2f96" /> : <HeartOutlined />}
              onClick={() => handleLike(record.post_id, 'post')}
            >
              {record.is_liked ? '取消点赞' : '点赞'}
            </Button>
          </Space>
        );
      },
    },
  ];
  // 评论列表的列定义
  const commentColumns = [
    {
      title: '评论内容',
      dataIndex: 'content',
      key: 'content',
    },
    {
      title: '点赞数',
      dataIndex: 'likes',
      key: 'likes',
      render: (text: number) => (
        <Badge count={text} />
      ),
    },
    {
      title: '操作',
      key: 'action',
      render: (_: unknown, record: Comment) => {
        // 判断是否显示删除按钮
        const showDeleteButton = currentUser && (
          currentUser.role === 0 || // 管理员可以直接删除
          currentUser.userId === record.authorId // 评论的发布者可以删除
        );

        return (
          <Space>
            <Button 
              type="link" 
              onClick={() => {
                setSelectedComment(record);
                setCreateCommentModalVisible(true);
              }}
            >
              回复
            </Button>
            {showDeleteButton && (
              <Button 
                type="link" 
                danger
                onClick={() => handleSoftDeleteComment(record.comment_id)}
              >
                删除
              </Button>
            )}
            <Button
              type="link"
              icon={record.is_liked ? <HeartTwoTone twoToneColor="#eb2f96" /> : <HeartOutlined />}
              onClick={() => handleLike(record.comment_id, 'comment')}
            >
              {record.is_liked ? '取消点赞' : '点赞'}
            </Button>
            {record.comment_id && getChildComments(record.comment_id).length > 0 && (
              <Button 
                type="link" 
                onClick={() => toggleCommentExpansion(record.comment_id)}
              >
                {expandedComments.has(record.comment_id) ? '收起子评论' : '展开子评论'}
              </Button>
            )}
          </Space>
        );
      },
    },
  ];

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
          color: '#1677ff',
          fontWeight: 'bold',
          textShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
          社团积分论坛
        </Title>
        <Card 
          title={<Title level={4} style={{ margin: 0, color: '#1677ff' }}>论坛板块</Title>}
          headStyle={{ borderBottom: '1px solid #f0f0f0', padding: '16px 24px' }}
          bodyStyle={{ padding: '24px' }}
          style={cardStyle}
        >
          {/* 渲染板块列表 */}   <Table
            {...customTableProps}
            columns={sectionColumns}
            dataSource={sections}
            rowKey="category_id"
          />
        </Card>
        {/* 渲染选中的板块 */}
        {selectedSection && (
          <Card 
            title={<Space size={16} align="center"><Title level={4} style={{ margin: 0, color: '#1677ff' }}>{selectedSection.category_name}</Title><Tag color="blue">板块</Tag></Space>}
            headStyle={{ borderBottom: '1px solid #f0f0f0', padding: '16px 24px' }}
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
        {/* 渲染选中的帖子 */}
        {selectedPost && (
          <Card 
            title={<div><Title level={4} style={{ margin: 0, color: '#1677ff' }}>{selectedPost.title}</Title><div style={{ margin: '12px 0', padding: '12px', backgroundColor: '#f9f9f9', borderRadius: '8px' }}><Paragraph style={{ margin: 0 }}>{selectedPost.content}</Paragraph></div></div>}
            headStyle={{ borderBottom: '1px solid #f0f0f0', padding: '16px 24px' }}
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
                  title={<Space align="center"><Text strong>回复评论</Text><Tag color="green">子评论</Tag></Space>}
                  style={{ marginLeft: 40, marginTop: 16, marginBottom: 16, backgroundColor: '#f9fcff', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}
                  size="small"
                  headStyle={{ padding: '12px 16px' }}
                  bodyStyle={{ padding: '0' }}
                  bordered={false}
                >
                  <div style={{ padding: '12px 16px', backgroundColor: 'rgba(24, 144, 255, 0.05)', borderRadius: '4px', margin: '0 16px 16px' }}>
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
            <div style={{ marginBottom: 16, padding: 16, backgroundColor: 'rgba(24, 144, 255, 0.05)', borderRadius: '8px', border: '1px solid rgba(24, 144, 255, 0.1)' }}>
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
      </div>
    </div>
  );
}