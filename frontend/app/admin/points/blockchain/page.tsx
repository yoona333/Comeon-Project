'use client';

import { useState, useEffect } from 'react';
import { Card, Table, Button, Input, message, Space, Spin, Tooltip, Modal, Form, InputNumber, Alert, Select } from 'antd';
import { SearchOutlined, SyncOutlined, UploadOutlined, WalletOutlined, PlusOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { StudentPointsContractInterface } from './contract-interface';

// 合约地址
const contractAddress = '0x99Ea85fB39A228a2D4312039411d6E830f81f46c';

interface PointsData {
  id: number;            // 表格数据ID
  username: string;      // 对应合约中的 username 
  studentId: string;     // 对应合约中的 id
  major: string;         // 对应合约中的 major
  grade: string;         // 对应合约中的 grade
  class: string;         // 对应合约中的 class
  points: number;        // 对应合约中的 points
  createdAt: string;     // 创建时间
  onBlockchain: boolean; // 标记是否已上链
}

export default function PointsBlockchainPage() {
  const [loading, setLoading] = useState<boolean>(false);
  const [data, setData] = useState<PointsData[]>([]);
  const [searchText, setSearchText] = useState<string>('');
  const [uploadingIds, setUploadingIds] = useState<number[]>([]);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [account, setAccount] = useState<string>('');
  const [contractInterface, setContractInterface] = useState<StudentPointsContractInterface | null>(null);
  const [isModalVisible, setIsModalVisible] = useState<boolean>(false);
  const [currentStudent, setCurrentStudent] = useState<PointsData | null>(null);
  const [isMetaMaskInstalled, setIsMetaMaskInstalled] = useState<boolean>(false);
  const [isOwner, setIsOwner] = useState<boolean>(false);
  const [form] = Form.useForm();
  const [isEdit, setIsEdit] = useState<boolean>(false);

  // 检测MetaMask是否已安装
  useEffect(() => {
    const checkMetaMask = async () => {
      if (typeof window !== 'undefined') {
        const isInstalled = typeof (window as any).ethereum !== 'undefined';
        setIsMetaMaskInstalled(isInstalled);
      }
    };
    
    checkMetaMask();
  }, []);

  // 初始化合约接口
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const contract = new StudentPointsContractInterface();
      setContractInterface(contract);
    }
  }, []);

  const handleSearch = (value: string) => {
    setSearchText(value);
  };

  const filteredData = data.filter(item => 
    item.username.toLowerCase().includes(searchText.toLowerCase()) || 
    item.studentId.toLowerCase().includes(searchText.toLowerCase()) 
  );

  // 连接MetaMask钱包
  const connectWallet = async () => {
    try {
      if (!contractInterface) {
        message.error('合约接口未初始化');
        return;
      }
      
      // 添加加载状态
      setLoading(true);
      
      // 检查是否安装了MetaMask
      if (typeof window !== 'undefined' && !(window as any).ethereum) {
        Modal.error({
          title: '未检测到MetaMask',
          content: (
            <div>
              <p>请安装MetaMask插件或使用支持以太坊的浏览器。</p>
              <p>您可以从 <a href="https://metamask.io/download/" target="_blank" rel="noopener noreferrer">MetaMask官网</a> 下载安装。</p>
            </div>
          ),
        });
        setLoading(false);
        return;
      }

      // 显示连接中的提示
      message.loading({
        content: '正在连接MetaMask，请留意浏览器弹出的MetaMask窗口...',
        duration: 0,
        key: 'metamask-connect'
      });
      
      const connectedAccount = await contractInterface.connect();
      
      // 关闭连接中的提示
      message.destroy('metamask-connect');
      
      setAccount(connectedAccount);
      setIsConnected(true);
      
      // 检查用户是否是合约所有者
      const ownerStatus = await contractInterface.isContractOwner();
      setIsOwner(ownerStatus);
      
      message.success('钱包连接成功');
      
      if (!ownerStatus) {
        message.warning('您不是合约所有者，只能查看数据，无法修改');
      }
    } catch (error: any) {
      console.error('连接钱包失败:', error);
      
      // 关闭连接中的提示
      message.destroy('metamask-connect');
      
      // 更详细的错误处理
      if (error.code === 4001) {
        message.error('您拒绝了连接请求');
      } else if (error.message?.includes('wallet_switchEthereumChain')) {
        Modal.error({
          title: '切换网络失败',
          content: (
            <div>
              <p>无法自动切换到Sepolia测试网。请按照以下步骤手动切换：</p>
              <ol>
                <li>打开MetaMask插件</li>
                <li>点击顶部的网络选择下拉菜单</li>
                <li>选择&ldquo;Sepolia测试网&rdquo;</li>
                <li>如果没有Sepolia选项，请点击&ldquo;添加网络&rdquo;</li>
                <li>在设置中添加Sepolia测试网</li>
              </ol>
              <p>完成后请刷新页面重试。</p>
            </div>
          )
        });
      } else if (error.message?.includes('MetaMask未安装')) {
        Modal.error({
          title: '无法连接钱包',
          content: (
            <div>
              <p>请确保已安装MetaMask插件，并在浏览器中启用。</p>
              <p>您可以从 <a href="https://metamask.io/download/" target="_blank" rel="noopener noreferrer">MetaMask官网</a> 下载安装。</p>
            </div>
          ),
        });
      } else if (error.message?.includes('timeout') || error.message?.includes('超时')) {
        Modal.error({
          title: '连接超时',
          content: (
            <div>
              <p>连接MetaMask时超时。请检查：</p>
              <ol>
                <li>确认MetaMask插件已打开且解锁</li>
                <li>检查MetaMask是否有待处理的请求需要确认</li>
                <li>尝试刷新MetaMask（点击插件图标 → 设置 → 高级 → 重置账户）</li>
                <li>刷新页面后重试</li>
              </ol>
            </div>
          )
        });
      } else if (error.message?.includes('already pending')) {
        Modal.error({
          title: '有待处理的请求',
          content: (
            <div>
              <p>MetaMask中有一个待处理的请求需要您确认。</p>
              <p>请打开MetaMask插件，查看并处理待处理的请求，然后重试。</p>
            </div>
          )
        });
      } else {
        Modal.error({
          title: '连接钱包失败',
          content: (
            <div>
              <p>错误信息: {error.message || '未知错误'}</p>
              <p>请尝试以下步骤：</p>
              <ol>
                <li>确认MetaMask已解锁</li>
                <li>刷新页面后重试</li>
                <li>重启浏览器</li>
                <li>检查MetaMask是否需要更新</li>
              </ol>
            </div>
          )
        });
      }
    } finally {
      setLoading(false);
    }
  };

  // 打开添加学生模态框
  const showAddModal = () => {
    if (!isConnected) {
      message.warning('请先连接MetaMask钱包');
      return;
    }
    
    if (!isOwner) {
      message.error('只有合约所有者才能添加学生数据');
      return;
    }
    
    setIsEdit(false);
    setCurrentStudent(null);
    form.resetFields();
    setIsModalVisible(true);
  };

  // 打开上链确认模态框
  const showEditModal = (record: PointsData) => {
    if (!isConnected) {
      message.warning('请先连接MetaMask钱包');
      return;
    }
    
    if (!isOwner) {
      message.error('只有合约所有者才能设置积分');
      return;
    }
    
    setIsEdit(true);
    setCurrentStudent(record);
    form.setFieldsValue({
      id: record.studentId,        // 对应合约中的 id
      username: record.username,   // 对应合约中的 username 
      major: record.major,         // 对应合约中的 major
      grade: record.grade,         // 对应合约中的 grade
      class: record.class,         // 对应合约中的 class
      points: record.points,       // 对应合约中的 point
      description: ''              // 积分来源说明，前端记录用
    });
    setIsModalVisible(true);
  };

  // 获取合约实例
  const getContract = async () => {
    if (!contractInterface || !isConnected) {
      throw new Error('请先连接MetaMask钱包');
    }
    return contractInterface;
  };

  // 提交学生表单（用于添加或更新）
  const handleSubmitForm = async () => {
    try {
      // 表单验证
      await form.validateFields();
      const values = form.getFieldsValue();
      
      if (!contractInterface || !isConnected) {
        message.warning('请先连接MetaMask钱包');
        return;
      }
      
      setLoading(true);
      message.loading('正在提交到区块链...', 0);
      
      try {
        // 调用合约方法，传入所有学生字段参数
        await contractInterface.setStudentPoints(
          parseInt(values.id),                // 对应合约中的 id
          values.username || 'Unknown Student', // 对应合约中的 username
          values.major || 'Not provided',      // 对应合约中的 major
          values.grade || 'Not provided',      // 对应合约中的 grade
          values.class || 'Not provided',      // 对应合约中的 class
          values.points                       // 对应合约中的 points
        );
        
        // 操作成功
        message.destroy();
        message.success(isEdit ? '积分已成功更新到区块链' : '学生数据添加并上链成功');
        
        // 关闭模态框并刷新数据
        setIsModalVisible(false);
        form.resetFields();
        
        // 更新数据显示
        if (isEdit && currentStudent) {
          // 更新现有数据
          setData(prev => 
            prev.map(item => 
              item.studentId === values.id ? {
                ...item,
                username: values.username,
                major: values.major,
                grade: values.grade,
                class: values.class,
                points: values.points,
                onBlockchain: true
              } : item
            )
          );
        } else {
          // 添加新数据
          setData(prev => [...prev, {
            id: prev.length + 1,                // 前端数据的ID，用于表格显示
            username: values.username,          // 对应合约中的 username
            studentId: values.id,               // 对应合约中的 id
            major: values.major,                // 对应合约中的 major
            grade: values.grade,                // 对应合约中的 grade
            class: values.class,                // 对应合约中的 class
            points: values.points,              // 对应合约中的 points
            createdAt: new Date().toISOString().split('T')[0], // 创建时间
            onBlockchain: true                  // 标记是否已上链
          }]);
        }
      } catch (error: any) {
        message.destroy();
        console.error('区块链交易失败:', error);
        message.error(`操作失败: ${error.message || '未知错误'}`);
      } finally {
        setLoading(false);
      }
    } catch (error) {
      console.error('表单验证失败:', error);
    }
  };

  // 查看区块链记录
  const viewBlockchainRecord = async (record: PointsData) => {
    if (!contractInterface) {
      message.error('合约接口未初始化');
      return;
    }
    
    try {
      const studentInfo = await contractInterface.getStudentInfo(parseInt(record.studentId));
      Modal.info({
        title: '区块链积分记录',
        content: (
          <div>
            <p>学生ID: {studentInfo.id}</p>
            <p>学生姓名: {studentInfo.username}</p>
            <p>专业: {studentInfo.major}</p>
            <p>年级: {studentInfo.grade}</p>
            <p>班级: {studentInfo.class}</p>
            <p>当前积分: {studentInfo.points}</p>
            <p>上链时间: {new Date(studentInfo.created_at * 1000).toLocaleString()}</p>
            <p>区块链浏览器: <a href={`https://sepolia.etherscan.io/address/${contractAddress}`} target="_blank" rel="noopener noreferrer">查看合约</a></p>
          </div>
        ),
        width: 500,
      });
    } catch (error) {
      console.error('获取区块链记录失败:', error);
      message.error('获取区块链记录失败');
    }
  };

  const columns: ColumnsType<PointsData> = [
    {
      title: '学生姓名',
      dataIndex: 'username',
      key: 'username',
    },
    {
      title: '学号',
      dataIndex: 'studentId',
      key: 'studentId',
    },
    {
      title: '专业',
      dataIndex: 'major',
      key: 'major',
    },
    {
      title: '年级',
      dataIndex: 'grade',
      key: 'grade',
    },
    {
      title: '班级',
      dataIndex: 'class',
      key: 'class',
    },
    {
      title: '积分',
      dataIndex: 'points',
      key: 'points',
      sorter: (a, b) => a.points - b.points,
    },
    {
      title: '获得时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      sorter: (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    },
    {
      title: '上链状态',
      key: 'onBlockchain',
      render: (_, record) => (
        <span style={{ color: record.onBlockchain ? '#52c41a' : '#f5222d' }}>
          {record.onBlockchain ? '已上链' : '未上链'}
        </span>
      ),
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record: PointsData) => (
        <Space>
          {!record.onBlockchain && (
            <Button 
              type="primary" 
              icon={<UploadOutlined />} 
              loading={uploadingIds.includes(record.id)}
              onClick={() => showEditModal(record)}
              disabled={!isConnected || !isOwner}
            >
              上链
            </Button>
          )}
          {record.onBlockchain && (
            <Space>
              <Tooltip title="查看区块链记录">
                <Button 
                  icon={<SyncOutlined />}
                  onClick={() => viewBlockchainRecord(record)}
                >
                  查看
                </Button>
              </Tooltip>
              <Button
                type="primary"
                onClick={() => showEditModal(record)}
                disabled={!isConnected || !isOwner}
              >
                编辑
              </Button>
            </Space>
          )}
        </Space>
      ),
    },
  ];

  return (
    <>
      <Card 
        title="积分上链管理"
        extra={
          <Space>
            <Input
              placeholder="搜索学生姓名/学号/来源"
              prefix={<SearchOutlined />}
              onChange={e => handleSearch(e.target.value)}
              style={{ width: 250 }}
            />
            <Button 
              type={isConnected ? 'default' : 'primary'} 
              icon={<WalletOutlined />} 
              onClick={connectWallet}
              loading={loading && !isConnected}
              disabled={(loading && !isConnected) || !isMetaMaskInstalled}
            >
              {isConnected 
                ? `已连接: ${account.substring(0, 6)}...${account.substring(account.length - 4)}` 
                : loading ? '连接中...' : '连接钱包'}
            </Button>
          </Space>
        }
      >
        <div style={{ marginBottom: 16 }}>
          <Alert
            message="使用Sepolia测试网"
            description="本系统使用以太坊Sepolia测试网络，请确保您的MetaMask已切换到Sepolia测试网络并有足够的测试币。"
            type="info"
            showIcon
          />
        </div>
        
        {isConnected && (
          <div style={{ marginBottom: 16 }}>
            <Alert
              message={isOwner ? "您是合约所有者" : "您不是合约所有者"}
              description={isOwner 
                ? "您有权限添加和修改学生积分数据。" 
                : "您只能查看数据，无法添加或修改学生积分。如需修改，请使用合约所有者账户登录。"
              }
              type={isOwner ? "success" : "warning"}
              showIcon
            />
          </div>
        )}
        
        {!isMetaMaskInstalled && (
          <div style={{ marginBottom: 16 }}>
            <Alert
              message="MetaMask未安装"
              description={
                <div>
                  <p>您需要安装MetaMask插件才能使用此功能。</p>
                  <p>请从 <a href="https://metamask.io/download/" target="_blank" rel="noopener noreferrer">MetaMask官网</a> 下载并安装，然后刷新页面。</p>
                </div>
              }
              type="error"
              showIcon
            />
          </div>
        )}
        
        <div style={{ marginBottom: 16, textAlign: 'right' }}>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={showAddModal}
            disabled={!isConnected || !isOwner}
            loading={loading}
          >
            添加学生数据
          </Button>
        </div>
        
        <Table 
          columns={columns}
          dataSource={filteredData} 
          loading={loading}
          rowKey="id"
          pagination={{ pageSize: 10 }}
          locale={{ emptyText: '暂无数据，请点击"添加学生数据"按钮添加' }}
        />
      </Card>
      
      {/* 统一的学生数据表单（新增/编辑） */}
      <Modal
        title={isEdit ? "编辑学生积分" : "添加学生数据并上链"}
        open={isModalVisible}
        onOk={handleSubmitForm}
        onCancel={() => setIsModalVisible(false)}
        confirmLoading={loading}
        width={700}
      >
        <Alert
          message={isEdit ? "编辑提示" : "添加提示"}
          description={isEdit 
            ? "该操作将更新学生在区块链上的数据。请确保信息准确无误。" 
            : "该操作将直接把学生数据注册到区块链，并设置初始积分。请确保信息准确无误。"
          }
          type="info"
          showIcon
          style={{ marginBottom: '20px' }}
        />
        
        <Form
          form={form}
          layout="vertical"
        >
          <div style={{ display: 'flex', gap: '20px' }}>
            <div style={{ flex: 1 }}>
              <Form.Item 
                name="username" 
                label="学生姓名" 
                rules={[{ required: true, message: '请输入学生姓名' }]}
                tooltip="对应合约中的 username 字段，将完整保存到区块链"
              >
                <Input placeholder="请输入学生姓名" />
              </Form.Item>
              
              <Form.Item 
                name="id" 
                label="ID/学号" 
                rules={[
                  { required: true, message: '请输入ID/学号' },
                  { pattern: /^\d+$/, message: 'ID/学号必须为数字' }
                ]}
                tooltip="作为区块链上的唯一标识ID，对应合约中的 id 字段"
              >
                <Input placeholder="请输入ID或学号（仅数字）" disabled={isEdit} />
              </Form.Item>
            </div>
            
            <div style={{ flex: 1 }}>
              <Form.Item 
                name="major" 
                label="专业" 
                tooltip="对应合约中的 major 字段，将完整保存到区块链"
              >
                <Input placeholder="请输入专业" />
              </Form.Item>
              
              <Form.Item 
                name="grade" 
                label="年级" 
                tooltip="对应合约中的 grade 字段，将完整保存到区块链"
              >
                <Input placeholder="请输入年级" />
              </Form.Item>
            </div>
          </div>
          
          <div style={{ display: 'flex', gap: '20px' }}>
            <Form.Item 
              name="class" 
              label="班级" 
              tooltip="对应合约中的 class 字段，将完整保存到区块链"
              style={{ flex: 1 }}
            >
              <Input placeholder="请输入班级" />
            </Form.Item>
            
            <Form.Item 
              name="points" 
              label="积分数量" 
              rules={[{ required: true, message: '请输入积分数量' }]}
              tooltip="对应合约中的 points 字段，将完整保存到区块链"
              style={{ flex: 1 }}
            >
              <InputNumber style={{ width: '100%' }} min={1} placeholder="请输入积分数量" />
            </Form.Item>
          </div>
          

        </Form>
      </Modal>
    </>
  );
}