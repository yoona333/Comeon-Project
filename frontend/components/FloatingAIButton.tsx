'use client';

import React, { useEffect, useState, useRef } from 'react';
import { RobotOutlined, MessageOutlined, CloseOutlined, SettingOutlined, InfoCircleOutlined, QuestionCircleOutlined } from '@ant-design/icons';
import { usePathname } from 'next/navigation';
import { Tooltip, Input, Button, Avatar, Spin, message, Select, Drawer, Radio, Tabs, Modal, Typography, Space, Divider } from 'antd';
import { createPortal } from 'react-dom';

// 定义知识库类型
interface KnowledgeBaseType {
  [category: string]: {
    [item: string]: string;
  };
}

// 知识库数据
const defaultKnowledge: KnowledgeBaseType = {
  '积分活动': {
    '志愿服务': '参与校内外志愿服务活动可获得积分奖励，根据服务时长和贡献度评定。一般志愿者服务每小时可获得1-3积分，担任志愿者组长可获得额外积分。',
    '学术讲座': '参加学术讲座并提交心得体会可获得积分，每场讲座基础分为2分。如果提交的心得被评为优秀，可以额外获得1-3分。',
    '社团活动': '参与校级社团组织的活动可获得1-5不等的积分奖励。积分多少取决于活动的规模、你的参与度以及贡献。',
    '文艺比赛': '参加校园歌唱比赛、舞蹈比赛等文艺活动可获得基础积分5分，获奖者可额外获得3-10分不等的奖励积分。',
    '体育比赛': '参加校内体育赛事可获得基础积分3分，代表学校参加校外比赛可获得5分，获奖可额外获得相应奖励积分。',
    '科技创新': '参与程序设计大赛、创新创业比赛等科技类活动基础积分为5分，获奖者根据比赛级别和获奖等级可获得5-20分的奖励。'
  },
  '积分兑换': {
    '奖学金加分': '积分可作为奖学金评定的加分项，100积分可兑换1分加分。校级奖学金评定中，积分在总评分中占比为10%。',
    '实习推荐': '高积分学生可优先获得实习推荐机会。积分排名前10%的学生将获得校企合作单位的优先面试资格。',
    '证书认证': '达到一定积分可获得学校颁发的社会实践证书。社会实践一星证书需要30积分，二星证书需要60积分，三星证书需要100积分。',
    '物质奖励': '积分可兑换校园纪念品、文具、书籍等物品。基础文具每10积分可兑换一件，精美纪念品需要30-50积分不等。',
    '活动优先': '高积分学生在热门活动报名时具有优先权。如果是名额有限的活动，会优先考虑积分较高的学生。'
  },
  '积分规则': {
    '基本规则': '积分按学期统计，每学期初始积分为0。学期结束时积分将记入总积分，但不会重置，累计计算。',
    '加分项目': '志愿服务、学术活动、社团活动、竞赛获奖等均可获得积分。不同类型活动的积分标准由学校统一制定。',
    '积分上限': '单个活动类型积分有上限，防止积分过度集中。每学期每类活动获取的积分上限为30分。',
    '积分审核': '所有积分都需要经过相关负责人审核。活动组织者负责提交活动积分申请，学生可在系统中查询自己的积分明细。',
    '申诉机制': '如对积分有异议，可在积分公示后的一周内提出申诉。申诉需提供相关证明材料，由学生处最终裁定。'
  },
  '热门活动': {
    '校园歌唱比赛': '每年春季举办的校园歌唱大赛，分为初赛、复赛和决赛三个阶段。参与可获得5积分，获奖可额外获得3-10分。地点通常在大礼堂举行。',
    '志愿者服务日': '每月第一个周末举办的志愿服务活动，包括校园清洁、社区服务、敬老院慰问等内容。每次参与可获得3-5积分。',
    '程序设计大赛': '计算机学院每学期举办的编程比赛，题目涵盖算法、数据结构和实际应用开发。参与可获得5积分，获奖最高可得20积分。',
    '社团文化节': '每年秋季举办的社团展示活动，为期一周。各社团设置展台并组织特色活动。参与组织工作可获得5-10积分。',
    '学术论坛': '各学院定期举办的学术讲座和论坛，邀请知名学者和专业人士分享最新研究成果和行业动态。参与并提交心得可获得2积分。'
  },
  '积分上链': {
    '基本介绍': '积分上链是将学生积分数据永久记录在区块链上的功能，确保数据安全、透明且不可篡改。',
    '技术细节': '使用以太坊Sepolia测试网络，通过智能合约实现积分数据的存储和管理，需要MetaMask钱包连接。',
    '操作权限': '仅合约所有者有权限进行添加和修改操作，普通用户可以查看但不能修改数据。',
    '数据追溯': '所有积分变更都有完整的链上记录，可通过区块链浏览器查询每一笔交易的详细信息。',
    '使用流程': '连接钱包 → 查看待上链数据 → 选择记录上链 → 确认交易 → 查看区块链记录。'
  }
};

// 在import声明后添加OpenAI库的类型声明
declare global {
  interface Window {
    OpenAI: any;
  }
}

const FloatingAIButton: React.FC = () => {
  const pathname = usePathname();
  const [isVisible, setIsVisible] = useState(true);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [position, setPosition] = useState({ x: -1, y: -1 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [messages, setMessages] = useState<{ text: string; isUser: boolean }[]>([
    { text: '你好！我是你的积分活动助手，有什么可以帮助你的吗？', isUser: false }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [knowledgeBase, setKnowledgeBase] = useState<KnowledgeBaseType>(defaultKnowledge);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [selectedModel, setSelectedModel] = useState('deepseek-r1:7b');
  const [serviceType, setServiceType] = useState<'local' | 'cloud'>('local');
  const [apiKey, setApiKey] = useState('');
  const [cloudProvider, setCloudProvider] = useState<'openai' | 'kimi' | 'moonshot' | 'baidu' | 'zhipu'>('openai');
  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);
  const [chatHistory, setChatHistory] = useState<{role: string; content: string}[]>([]);
  const [isLoadingScript, setIsLoadingScript] = useState(false);
  
  const availableModels = [
    { value: 'deepseek-r1:7b', label: 'DeepSeek-R1 (7B)' },
    { value: 'llama3:latest', label: 'Llama 3 (Latest)' },
    { value: 'llama2:latest', label: 'Llama 2 (Latest)' },
    { value: 'qwen:latest', label: 'Qwen (Latest)' },
    { value: 'gemma:latest', label: 'Gemma (Latest)' }
  ];
  
  const cloudModels: Record<string, { value: string; label: string }[]> = {
    openai: [
      { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo' },
      { value: 'gpt-4', label: 'GPT-4' },
      { value: 'gpt-4-turbo', label: 'GPT-4 Turbo' },
      { value: 'gpt-4o', label: 'GPT-4o' }
    ],
    kimi: [
      { value: 'moonshot-v1-8k', label: 'Kimi Moonshot V1' },
      { value: 'moonshot-v1-32k', label: 'Kimi Moonshot V1 (32K)' },
      { value: 'moonshot-v1-128k', label: 'Kimi Moonshot V1 (128K)' }
    ],
    moonshot: [
      { value: 'moonshot-v1-8k', label: 'Moonshot V1' },
      { value: 'moonshot-v1-32k', label: 'Moonshot V1 (32K)' },
      { value: 'moonshot-v1-128k', label: 'Moonshot V1 (128K)' }
    ],
    baidu: [
      { value: 'ernie-bot-4', label: '文心一言 ERNIE Bot 4.0' },
      { value: 'ernie-bot', label: '文心一言 ERNIE Bot' },
      { value: 'ernie-bot-8k', label: '文心一言 ERNIE Bot (8K)' }
    ],
    zhipu: [
      { value: 'glm-4', label: '智谱 GLM-4' },
      { value: 'glm-3-turbo', label: '智谱 GLM-3 Turbo' }
    ]
  };
  
  const buttonRef = useRef<HTMLDivElement>(null);
  const chatWindowRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // 在AI聊天页面不显示按钮
  useEffect(() => {
    if (pathname === '/ai-chat') {
      setIsVisible(false);
    } else {
      setIsVisible(true);
    }
  }, [pathname]);

  // 初始化按钮位置（右下角）
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setPosition({
        x: window.innerWidth - 90,
        y: window.innerHeight - 90
      });
      
      // 尝试从localStorage加载知识库和模型选择
      try {
        const savedKnowledge = localStorage.getItem('pointsKnowledgeBase');
        if (savedKnowledge) {
          setKnowledgeBase(JSON.parse(savedKnowledge));
        }
        
        const savedModel = localStorage.getItem('selectedAIModel');
        if (savedModel) {
          setSelectedModel(savedModel);
        }
        
        const savedServiceType = localStorage.getItem('aiServiceType');
        if (savedServiceType) {
          setServiceType(savedServiceType as 'local' | 'cloud');
        }
        
        const savedApiKey = localStorage.getItem('aiApiKey');
        if (savedApiKey) {
          setApiKey(savedApiKey);
        }
        
        const savedProvider = localStorage.getItem('cloudProvider');
        if (savedProvider) {
          setCloudProvider(savedProvider as any);
        }
      } catch (error) {
        console.error('加载保存的设置失败:', error);
      }
    }
  }, []);

  // 自动滚动到最新消息
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // 处理拖动相关事件的监听器
  useEffect(() => {
    const handleDragMove = (e: MouseEvent) => {
      if (isDragging) {
        setPosition({
          x: e.clientX - dragOffset.x,
          y: e.clientY - dragOffset.y
        });
      }
    };
    
    const handleDragStop = () => {
      setIsDragging(false);
    };
    
    if (isDragging) {
      window.addEventListener('mousemove', handleDragMove);
      window.addEventListener('mouseup', handleDragStop);
    }
    
    return () => {
      window.removeEventListener('mousemove', handleDragMove);
      window.removeEventListener('mouseup', handleDragStop);
    };
  }, [isDragging, dragOffset]);

  // 处理拖动开始
  const handleDragStart = (e: React.MouseEvent<HTMLDivElement>) => {
    if (buttonRef.current) {
      setIsDragging(true);
      const rect = buttonRef.current.getBoundingClientRect();
      setDragOffset({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      });
    }
  };

  // 格式化知识库为文本
  const formatKnowledgeBase = () => {
    let formattedText = '';
    for (const [category, items] of Object.entries(knowledgeBase)) {
      formattedText += `\n【${category}】\n`;
      for (const [item, desc] of Object.entries(items)) {
        formattedText += `- ${item}: ${desc}\n`;
      }
    }
    return formattedText;
  };

  // 在第一次加载时，预加载OpenAI客户端库
  useEffect(() => {
    // 检查是否已加载
    if (typeof window !== 'undefined' && !window.OpenAI && !isLoadingScript) {
      setIsLoadingScript(true);
      
      // 优先使用ESM方式加载
      try {
        const script = document.createElement('script');
        script.src = 'https://unpkg.com/openai@4.20.1/dist/index.global.js';
        script.async = true;
        script.onload = () => {
          console.log('OpenAI客户端库加载成功');
          setIsLoadingScript(false);
        };
        script.onerror = (e) => {
          console.error('OpenAI客户端库加载失败:', e);
          setIsLoadingScript(false);
          
          // 尝试备用CDN
          const backupScript = document.createElement('script');
          backupScript.src = 'https://cdn.jsdelivr.net/npm/openai@4.20.1/dist/index.js';
          backupScript.async = true;
          backupScript.onload = () => {
            console.log('OpenAI客户端库(备用)加载成功');
            setIsLoadingScript(false);
          };
          backupScript.onerror = () => {
            console.error('OpenAI客户端库(备用)加载失败');
            setIsLoadingScript(false);
          };
          document.body.appendChild(backupScript);
        };
        document.body.appendChild(script);
      } catch (error) {
        console.error('加载OpenAI客户端库出错:', error);
        setIsLoadingScript(false);
      }
    }
  }, [isLoadingScript]);

  // 发送消息到API
  const callAIAPI = async (userMessage: string) => {
    try {
      // 构建提示信息
      let prompt = `你是一个专业的积分活动规划专家，请基于以下知识回答用户的问题。
如果问题可以用知识库中的内容回答，请直接使用知识库内容。
如果需要补充其他信息，请明确指出"补充信息："。

知识库内容：
${formatKnowledgeBase()}

当前问题：${userMessage}

请基于以上知识回答问题，回答要有条理，要引用具体的信息来源。`;

      console.log(`调用AI, 服务类型: ${serviceType}, 提供商: ${cloudProvider}, API密钥: ${apiKey ? '已设置' : '未设置'}`);

      // 优先使用云端服务（如果设置了云服务且有API密钥）
      if (serviceType === 'cloud' && apiKey) {
        try {
          console.log('使用云端服务回答问题');
          const response = await callCloudAPI(prompt);
          console.log('云端API响应:', response.substring(0, 50) + '...');
          
          // 检查响应是否有效（不含错误信息）
          if (!response.includes('API密钥') && 
              !response.includes('API Key') && 
              !response.includes('错误') &&
              !response.includes('Error') &&
              !(response.includes('调用') && response.includes('出错'))) {
            return response;
          } else {
            console.warn('云端API返回了错误信息:', response);
            message.error('云服务响应出错，正在使用本地回答');
            // 使用更智能的本地回答作为备选
            return generateEnhancedLocalResponse(userMessage);
          }
        } catch (cloudError) {
          console.error('云端服务调用失败:', cloudError);
          message.error('云服务调用失败，已切换到本地回答');
          return generateEnhancedLocalResponse(userMessage);
        }
      }
      // 本地服务模式
      else if (serviceType === 'local') {
        try {
          console.log('使用本地Ollama API');
          // 使用本地Ollama API
          const response = await fetch('http://localhost:11434/api/generate', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              model: selectedModel,
              prompt: prompt,
              stream: false,
              options: {
                temperature: 0.7,
                top_p: 0.9
              }
            })
          });

          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }

          const data = await response.json();
          return data.response || '抱歉，我无法理解你的问题。';
        } catch (error) {
          console.error(`调用本地API (${selectedModel})失败:`, error);
          
          // 如果本地API失败并且有API密钥，尝试云端API
          if (apiKey) {
            message.info('本地服务不可用，正在尝试使用云端服务...');
            try {
              return await callCloudAPI(prompt);
            } catch (cloudError) {
              console.error('云端服务调用也失败:', cloudError);
              // 都失败了，使用本地逻辑生成回复
              return generateEnhancedLocalResponse(userMessage);
            }
          } else {
            // 没有API密钥，只能使用本地逻辑
            console.log('使用本地知识库生成回复');
            return generateEnhancedLocalResponse(userMessage);
          }
        }
      }
      // 没有API密钥的云服务模式
      else {
        message.warning('未设置API密钥，使用本地知识库回答');
        console.log('未设置API密钥，使用本地知识库回答');
        return generateEnhancedLocalResponse(userMessage);
      }
    } catch (error) {
      console.error('处理消息失败:', error);
      return '抱歉，处理你的问题时出现了错误。';
    }
  };
  
  // 调用云端API
  const callCloudAPI = async (prompt: string) => {
    if (!apiKey) {
      console.error('缺少API密钥');
      return `请在设置中配置${getProviderName(cloudProvider)} API密钥后再使用云端服务。`;
    }
    
    try {
      console.log(`正在调用${getProviderName(cloudProvider)} API...`);
      const cloudModel = serviceType === 'cloud' ? selectedModel : 'gpt-3.5-turbo';
      
      let response;
      switch (cloudProvider) {
        case 'openai':
          response = await callOpenAIApi(cloudModel, prompt);
          break;
        case 'kimi':
        case 'moonshot':
          // Kimi和Moonshot使用同一个API端点，区别主要在UI上
          response = await callKimiApi(cloudModel, prompt);
          break;
        case 'baidu':
          response = await callBaiduApi(cloudModel, prompt);
          break;
        case 'zhipu':
          response = await callZhipuApi(cloudModel, prompt);
          break;
        default:
          throw new Error('未知的云端服务提供商');
      }
      
      console.log(`${getProviderName(cloudProvider)} API响应:`, response.substring(0, 100) + '...');
      return response;
    } catch (error) {
      console.error(`调用${getProviderName(cloudProvider)} API失败:`, error);
      
      // 如果云端API也失败了，使用本地逻辑
      console.warn('回退到本地逻辑生成回复');
      return generateLocalResponse(prompt.split('当前问题：')[1] || '');
    }
  };
  
  // 调用OpenAI API
  const callOpenAIApi = async (model: string, prompt: string) => {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: model,
        messages: [
          { role: 'system', content: '你是一个专业的积分活动规划专家，请提供准确、有帮助的回答。' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 1000
      })
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`OpenAI API错误: ${errorData.error?.message || response.statusText}`);
    }
    
    const data = await response.json();
    return data.choices[0]?.message?.content || '抱歉，我无法理解你的问题。';
  };
  
  // 调用Kimi API
  const callKimiApi = async (model: string, prompt: string) => {
    try {
      console.log('正在调用Kimi API...');
      // 系统消息
      const systemMessages = [
        {
          role: "system",
          content: "你是一个专业的积分活动规划专家，请基于以下知识回答用户的问题。" +
                  "如果问题可以用知识库中的内容回答，请直接使用知识库内容。" +
                  "如果需要补充其他信息，请明确指出\"补充信息：\"。" +
                  "\n\n积分上链知识：" +
                  "\n积分上链是将学生积分数据永久记录在区块链上的功能，确保数据安全、透明且不可篡改。" +
                  "\n- 使用以太坊Sepolia测试网络" +
                  "\n- 需要连接MetaMask钱包才能操作" +
                  "\n- 支持添加新学生数据到区块链" +
                  "\n- 支持更新已上链的学生积分" +
                  "\n- 支持查看区块链上的积分记录" +
                  "\n- 仅合约所有者有权限进行添加和修改操作" +
                  "\n- 所有积分变更都有完整的链上记录可追溯"
        }
      ];
      
      // 添加用户消息
      const userMessage = {
        role: "user",
        content: prompt
      };
      
      // 更新对话历史
      const newChatHistory = [...chatHistory, userMessage];
      setChatHistory(newChatHistory);
      
      // 构建完整消息列表
      const messages = [...systemMessages, ...newChatHistory.slice(-100)]; // 保留最近100条消息
      
      // 方法1：使用OpenAI客户端库
      if (typeof window !== 'undefined' && window.OpenAI) {
        console.log('使用OpenAI客户端库调用Kimi API');
        try {
          const client = new window.OpenAI({
            apiKey: apiKey,
            baseURL: "https://api.kimi.ai/v1", // 从moonshot改为kimi.ai
            dangerouslyAllowBrowser: true // 允许在浏览器环境使用
          });
          
          const completion = await client.chat.completions.create({
            model: model,
            messages: messages,
            temperature: 0.7,
          });
          
          const assistantMessage = completion.choices[0].message;
          
          // 更新对话历史
          setChatHistory([...newChatHistory, {
            role: "assistant",
            content: assistantMessage.content
          }]);
          
          return assistantMessage.content;
        } catch (clientError) {
          console.error('OpenAI客户端调用Kimi API失败:', clientError);
          // 失败后尝试方法2
        }
      }
      
      // 方法2：使用fetch API
      console.log('使用fetch API调用Kimi API');
      const response = await fetch('https://api.kimi.ai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: model,
          messages: messages,
          temperature: 0.7
        })
      });
      
      console.log('Kimi API响应状态:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Kimi API错误响应:', errorText);
        try {
          const errorData = JSON.parse(errorText);
          throw new Error(`Kimi API错误: ${errorData.error?.message || response.statusText}`);
        } catch (e) {
          throw new Error(`Kimi API错误: ${response.statusText} (${response.status})`);
        }
      }
      
      const data = await response.json();
      console.log('Kimi API响应数据:', data);
      
      const content = data.choices[0]?.message?.content || '抱歉，我无法理解你的问题。';
      
      // 更新对话历史
      setChatHistory([...newChatHistory, {
        role: "assistant",
        content: content
      }]);
      
      return content;
    } catch (error) {
      console.error('调用Kimi API最终失败:', error);
      return `调用Kimi API时出错: ${(error as Error).message}。请检查API密钥是否正确，以及网络连接是否正常。`;
    }
  };
  
  // 调用百度文心一言 API
  const callBaiduApi = async (model: string, prompt: string) => {
    const access_token = await getBaiduAccessToken();
    
    const response = await fetch(`https://aip.baidubce.com/rpc/2.0/ai_custom/v1/wenxinworkshop/chat/${model}?access_token=${access_token}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messages: [
          { role: 'system', content: '你是一个专业的积分活动规划专家，请提供准确、有帮助的回答。' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7
      })
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`百度文心一言API错误: ${errorData.error_msg || response.statusText}`);
    }
    
    const data = await response.json();
    return data.result || '抱歉，我无法理解你的问题。';
  };
  
  // 获取百度API访问令牌
  const getBaiduAccessToken = async () => {
    // API Key和Secret Key是从设置中的apiKey字段获取，格式为"API_KEY:SECRET_KEY"
    const [baiduApiKey, secretKey] = apiKey.split(':');
    
    const response = await fetch(`https://aip.baidubce.com/oauth/2.0/token?grant_type=client_credentials&client_id=${baiduApiKey}&client_secret=${secretKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error('获取百度API访问令牌失败');
    }
    
    const data = await response.json();
    return data.access_token;
  };
  
  // 调用智谱GLM API
  const callZhipuApi = async (model: string, prompt: string) => {
    const response = await fetch('https://open.bigmodel.cn/api/paas/v4/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: model,
        messages: [
          { role: 'system', content: '你是一个专业的积分活动规划专家，请提供准确、有帮助的回答。' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7
      })
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`智谱API错误: ${errorData.error?.message || response.statusText}`);
    }
    
    const data = await response.json();
    return data.choices[0]?.message?.content || '抱歉，我无法理解你的问题。';
  };
  
  // 获取提供商名称
  const getProviderName = (provider: string) => {
    switch (provider) {
      case 'openai': return 'OpenAI';
      case 'kimi': return 'Kimi';
      case 'moonshot': return 'Moonshot';
      case 'baidu': return '百度文心一言';
      case 'zhipu': return '智谱 GLM';
      default: return provider;
    }
  };
  
  // 获取当前选择的模型选项
  const getCurrentModelOptions = () => {
    if (serviceType === 'local') {
      return availableModels;
    } else {
      return cloudModels[cloudProvider as keyof typeof cloudModels] || cloudModels.openai;
    }
  };

  // 本地生成回复（当API调用失败时作为备选）
  const generateLocalResponse = (userMessage: string) => {
    const lowerCaseMessage = userMessage.toLowerCase();
    
    // 检查是否是问候语
    if (lowerCaseMessage.match(/^(你好|您好|早上好|下午好|晚上好|嗨|hi|hello).*/i)) {
      return '你好！我是你的积分活动助手，很高兴为你服务。你可以向我咨询关于校园活动、积分规则、积分兑换等问题，或者告诉我你的兴趣，我可以为你推荐相关活动。';
    }
    
    // 检查用户是否在询问某类活动
    for (const category in knowledgeBase) {
      if (lowerCaseMessage.includes(category.toLowerCase())) {
        // 用户询问了某个类别
        let response = `关于"${category}"，我可以告诉你以下信息：\n\n`;
        
        for (const [item, desc] of Object.entries(knowledgeBase[category])) {
          response += `【${item}】: ${desc}\n\n`;
        }
        
        return response;
      }
      
      // 检查用户是否在询问类别中的具体项目
      for (const item in knowledgeBase[category]) {
        if (lowerCaseMessage.includes(item.toLowerCase())) {
          let response = `【${item}】: ${knowledgeBase[category][item]}\n\n`;
          
          // 添加相关信息，增强回答
          if (category === '热门活动') {
            // 添加对应的积分规则
            if (item === '校园歌唱比赛') {
              response += `积分规则：${knowledgeBase['积分活动']['文艺比赛']}\n\n`;
            } else if (item === '志愿者服务日') {
              response += `积分规则：${knowledgeBase['积分活动']['志愿服务']}\n\n`;
            } else if (item === '程序设计大赛') {
              response += `积分规则：${knowledgeBase['积分活动']['科技创新']}\n\n`;
            } else if (item === '学术论坛') {
              response += `积分规则：${knowledgeBase['积分活动']['学术讲座']}\n\n`;
            } else if (item === '社团文化节') {
              response += `积分规则：${knowledgeBase['积分活动']['社团活动']}\n\n`;
            }
            
            response += "你想参加这个活动吗？如果需要更多信息，请告诉我。";
          } else if (category === '积分活动') {
            // 添加相关的热门活动
            if (item === '志愿服务' && '志愿者服务日' in knowledgeBase['热门活动']) {
              response += `相关活动推荐：\n【志愿者服务日】: ${knowledgeBase['热门活动']['志愿者服务日']}\n\n`;
            } else if (item === '文艺比赛' && '校园歌唱比赛' in knowledgeBase['热门活动']) {
              response += `相关活动推荐：\n【校园歌唱比赛】: ${knowledgeBase['热门活动']['校园歌唱比赛']}\n\n`;
            } else if (item === '科技创新' && '程序设计大赛' in knowledgeBase['热门活动']) {
              response += `相关活动推荐：\n【程序设计大赛】: ${knowledgeBase['热门活动']['程序设计大赛']}\n\n`;
            } else if (item === '学术讲座' && '学术论坛' in knowledgeBase['热门活动']) {
              response += `相关活动推荐：\n【学术论坛】: ${knowledgeBase['热门活动']['学术论坛']}\n\n`;
            } else if (item === '社团活动' && '社团文化节' in knowledgeBase['热门活动']) {
              response += `相关活动推荐：\n【社团文化节】: ${knowledgeBase['热门活动']['社团文化节']}\n\n`;
            }
            
            response += "参加这类活动可以丰富校园生活，同时获得积分奖励。";
          }
          
          return response;
        }
      }
    }
    
    // 关键词匹配
    if (lowerCaseMessage.includes('志愿') || lowerCaseMessage.includes('服务')) {
      let response = '关于志愿服务活动的积分规则：\n\n';
      response += knowledgeBase['积分活动']['志愿服务'] + '\n\n';
      
      if ('志愿者服务日' in knowledgeBase['热门活动']) {
        response += '我们有定期的志愿者活动：\n';
        response += `【志愿者服务日】: ${knowledgeBase['热门活动']['志愿者服务日']}`;
      }
      
      return response;
    } 
    else if (lowerCaseMessage.includes('讲座') || lowerCaseMessage.includes('学术')) {
      let response = '关于学术讲座的积分规则：\n\n';
      response += knowledgeBase['积分活动']['学术讲座'] + '\n\n';
      
      if ('学术论坛' in knowledgeBase['热门活动']) {
        response += '相关活动信息：\n';
        response += `【学术论坛】: ${knowledgeBase['热门活动']['学术论坛']}`;
      }
      
      return response;
    } 
    else if (lowerCaseMessage.includes('社团')) {
      let response = '关于社团活动的积分规则：\n\n';
      response += knowledgeBase['积分活动']['社团活动'] + '\n\n';
      
      if ('社团文化节' in knowledgeBase['热门活动']) {
        response += '相关活动信息：\n';
        response += `【社团文化节】: ${knowledgeBase['热门活动']['社团文化节']}`;
      }
      
      return response;
    } 
    else if (lowerCaseMessage.includes('兑换') || lowerCaseMessage.includes('换取') || lowerCaseMessage.includes('奖品')) {
      let response = '积分可以兑换以下物品：\n\n';
      
      Object.entries(knowledgeBase['积分兑换']).forEach(([item, description]) => {
        response += `【${item}】: ${description}\n\n`;
      });
      
      return response;
    } 
    else if (lowerCaseMessage.includes('规则') || lowerCaseMessage.includes('介绍') || lowerCaseMessage.includes('说明')) {
      let response = '积分规则说明：\n\n';
      
      if ('基本规则' in knowledgeBase['积分规则']) {
        response += knowledgeBase['积分规则']['基本规则'] + '\n\n';
      }
      
      if ('详细说明' in knowledgeBase['积分规则']) {
        response += knowledgeBase['积分规则']['详细说明'];
      }
      
      return response;
    }
    else if (lowerCaseMessage.includes('比赛') || lowerCaseMessage.includes('大赛') || 
            lowerCaseMessage.includes('竞赛')) {
      let response = '我们有以下比赛活动：\n\n';
      
      if (lowerCaseMessage.includes('歌') || lowerCaseMessage.includes('唱') || lowerCaseMessage.includes('文艺')) {
        if ('文艺比赛' in knowledgeBase['积分活动']) {
          response += `【文艺比赛】: ${knowledgeBase['积分活动']['文艺比赛']}\n\n`;
        }
        if ('校园歌唱比赛' in knowledgeBase['热门活动']) {
          response += `【校园歌唱比赛】: ${knowledgeBase['热门活动']['校园歌唱比赛']}\n\n`;
        }
      } 
      else if (lowerCaseMessage.includes('程序') || lowerCaseMessage.includes('编程') || lowerCaseMessage.includes('设计')) {
        if ('科技创新' in knowledgeBase['积分活动']) {
          response += `【科技创新】: ${knowledgeBase['积分活动']['科技创新']}\n\n`;
        }
        if ('程序设计大赛' in knowledgeBase['热门活动']) {
          response += `【程序设计大赛】: ${knowledgeBase['热门活动']['程序设计大赛']}\n\n`;
        }
      }
      else if (lowerCaseMessage.includes('体育') || lowerCaseMessage.includes('运动')) {
        if ('体育比赛' in knowledgeBase['积分活动']) {
          response += `【体育比赛】: ${knowledgeBase['积分活动']['体育比赛']}\n\n`;
        }
      }
      else {
        // 列出所有比赛活动
        if ('文艺比赛' in knowledgeBase['积分活动']) {
          response += `【文艺比赛】: ${knowledgeBase['积分活动']['文艺比赛']}\n\n`;
        }
        if ('体育比赛' in knowledgeBase['积分活动']) {
          response += `【体育比赛】: ${knowledgeBase['积分活动']['体育比赛']}\n\n`;
        }
        if ('科技创新' in knowledgeBase['积分活动']) {
          response += `【科技创新】: ${knowledgeBase['积分活动']['科技创新']}\n\n`;
        }
        if ('校园歌唱比赛' in knowledgeBase['热门活动']) {
          response += `【校园歌唱比赛】: ${knowledgeBase['热门活动']['校园歌唱比赛']}\n\n`;
        }
        if ('程序设计大赛' in knowledgeBase['热门活动']) {
          response += `【程序设计大赛】: ${knowledgeBase['热门活动']['程序设计大赛']}\n\n`;
        }
      }
      
      return response;
    }
    else if (lowerCaseMessage.includes('热门') || lowerCaseMessage.includes('活动')) {
      let response = '近期热门活动：\n\n';
      
      Object.entries(knowledgeBase['热门活动']).forEach(([item, description]) => {
        response += `【${item}】: ${description}\n\n`;
      });
      
      return response;
    }
    else if (lowerCaseMessage.includes('上链') || lowerCaseMessage.includes('区块链') || 
            lowerCaseMessage.includes('blockchain')) {
      // 处理积分上链相关问题
      let response = '关于积分上链的信息：\n\n';
      response += '积分上链是将学生积分数据永久记录在区块链上的功能，确保数据安全、透明且不可篡改。具体包括：\n\n';
      response += '1. 使用以太坊Sepolia测试网络\n';
      response += '2. 需要连接MetaMask钱包才能操作\n';
      response += '3. 支持添加新学生数据到区块链\n';
      response += '4. 支持更新已上链的学生积分\n';
      response += '5. 支持查看区块链上的积分记录\n';
      response += '6. 仅合约所有者有权限进行添加和修改操作\n';
      response += '7. 所有积分变更都有完整的链上记录可追溯\n\n';
      
      if (lowerCaseMessage.includes('演示') || lowerCaseMessage.includes('怎么用')) {
        response += '积分上链演示步骤：\n';
        response += '1. 连接MetaMask钱包（点击"连接钱包"按钮）\n';
        response += '2. 查看待上链积分数据（表格中的"上链状态"列）\n';
        response += '3. 选择记录点击"上链"按钮\n';
        response += '4. 确认信息并提交到区块链\n';
        response += '5. 交易确认后，可点击"查看"按钮查看区块链记录\n';
      }
      
      return response;
    }
    else {
      return '关于"' + userMessage + '"，我没有找到直接相关的信息。你可以询问关于：\n\n' +
        '1. 积分活动（志愿服务、学术讲座、社团活动、文艺比赛、体育比赛、科技创新）\n' +
        '2. 积分兑换（奖学金加分、实习推荐、证书认证、物质奖励、活动优先）\n' +
        '3. 积分规则（基本规则、加分项目、积分上限等）\n' +
        '4. 热门活动（校园歌唱比赛、志愿者服务日、程序设计大赛等）\n\n' +
        '你也可以直接告诉我你的兴趣爱好，我可以为你推荐相关活动。';
    }
  };

  // 增强版本的本地回答生成
  const generateEnhancedLocalResponse = (userMessage: string) => {
    const lowerCaseMessage = userMessage.toLowerCase();
    
    // 分析查询意图和主题
    const categories: string[] = [];
    const specificItems: string[] = [];
    
    // 检测意图类别
    if (lowerCaseMessage.includes('积分') || lowerCaseMessage.includes('活动') || 
        lowerCaseMessage.includes('参与') || lowerCaseMessage.includes('获得')) {
      categories.push('积分活动');
    }
    
    if (lowerCaseMessage.includes('兑换') || lowerCaseMessage.includes('换取') || 
        lowerCaseMessage.includes('使用积分') || lowerCaseMessage.includes('奖励')) {
      categories.push('积分兑换');
    }
    
    if (lowerCaseMessage.includes('规则') || lowerCaseMessage.includes('怎么算') || 
        lowerCaseMessage.includes('如何计算') || lowerCaseMessage.includes('上限')) {
      categories.push('积分规则');
    }
    
    if (lowerCaseMessage.includes('最近') || lowerCaseMessage.includes('推荐') || 
        lowerCaseMessage.includes('热门') || lowerCaseMessage.includes('什么活动')) {
      categories.push('热门活动');
    }
    
    if (lowerCaseMessage.includes('上链') || lowerCaseMessage.includes('区块链') || 
        lowerCaseMessage.includes('blockchain') || lowerCaseMessage.includes('链上')) {
      categories.push('积分上链');
      
      if (lowerCaseMessage.includes('怎么') || lowerCaseMessage.includes('如何') || 
          lowerCaseMessage.includes('流程') || lowerCaseMessage.includes('步骤') ||
          lowerCaseMessage.includes('演示')) {
        specificItems.push('使用流程');
      }
      
      if (lowerCaseMessage.includes('权限') || lowerCaseMessage.includes('谁能') || 
          lowerCaseMessage.includes('能不能') || lowerCaseMessage.includes('所有者')) {
        specificItems.push('操作权限');
      }
      
      if (lowerCaseMessage.includes('技术') || lowerCaseMessage.includes('实现') || 
          lowerCaseMessage.includes('metamask') || lowerCaseMessage.includes('钱包')) {
        specificItems.push('技术细节');
      }
      
      if (lowerCaseMessage.includes('记录') || lowerCaseMessage.includes('追溯') || 
          lowerCaseMessage.includes('查询') || lowerCaseMessage.includes('历史')) {
        specificItems.push('数据追溯');
      }
    }
    
    // 检查是否是问候语
    if (lowerCaseMessage.match(/^(你好|您好|早上好|下午好|晚上好|嗨|hi|hello).*/i)) {
      return '你好！我是你的积分活动助手，很高兴为你服务。你可以向我咨询关于校园活动、积分规则、积分兑换、积分上链等问题，或者告诉我你的兴趣，我可以为你推荐相关活动。';
    }
    
    // 兴趣相关关键词
    const interestKeywords = {
      '文艺': ['歌', '唱', '音乐', '艺术', '文艺', '表演', '舞蹈', '乐器', '吉他', '钢琴', 'ktv', '才艺'],
      '志愿服务': ['志愿', '服务', '公益', '社区', '帮助', '敬老', '支教', '环保', '助学'],
      '科技': ['程序', '编程', '代码', '开发', '设计', '技术', '计算机', '软件', '编码', 'python', 'java', 'ai', '人工智能'],
      '体育': ['体育', '运动', '球', '跑步', '健身', '篮球', '足球', '羽毛球', '乒乓球', '游泳', '锻炼', '马拉松'],
      '学术': ['学术', '讲座', '论坛', '研讨', '科研', '学习', '研究', '知识', '学问', '专业', '报告'],
      '社团': ['社团', '组织', '团体', '学生会', '俱乐部', '协会', '社交']
    };
    
    // 如果专门询问了积分上链相关内容
    if (categories.includes('积分上链') && 
        (lowerCaseMessage.includes('什么是') || lowerCaseMessage.includes('是什么') || 
        lowerCaseMessage.includes('介绍') || lowerCaseMessage.includes('说明'))) {
      let response = '关于积分上链的信息：\n\n';
      
      // 基本介绍
      if ('基本介绍' in knowledgeBase['积分上链']) {
        response += knowledgeBase['积分上链']['基本介绍'] + '\n\n';
      }
      
      // 添加特定请求的信息
      for (const item of specificItems) {
        if (item in knowledgeBase['积分上链']) {
          response += `【${item}】: ${knowledgeBase['积分上链'][item]}\n\n`;
        }
      }
      
      // 如果没有特定请求项，添加所有信息
      if (specificItems.length === 0) {
        for (const [key, value] of Object.entries(knowledgeBase['积分上链'])) {
          if (key !== '基本介绍') {
            response += `【${key}】: ${value}\n\n`;
          }
        }
      }
      
      if (lowerCaseMessage.includes('演示') || lowerCaseMessage.includes('怎么用')) {
        response += '积分上链演示步骤：\n';
        response += '1. 连接MetaMask钱包（点击"连接钱包"按钮）\n';
        response += '2. 查看待上链积分数据（表格中的"上链状态"列）\n';
        response += '3. 选择记录点击"上链"按钮\n';
        response += '4. 确认信息并提交到区块链\n';
        response += '5. 交易确认后，可点击"查看"按钮查看区块链记录\n';
      }
      
      return response;
    }
    
    // 分析用户兴趣
    let detectedInterests: string[] = [];
    for (const [interest, keywords] of Object.entries(interestKeywords)) {
      for (const keyword of keywords) {
        if (lowerCaseMessage.includes(keyword)) {
          if (!detectedInterests.includes(interest)) {
            detectedInterests.push(interest);
          }
          break;
        }
      }
    }
    
    // 检查是否在请求推荐活动
    const askingForRecommendation = lowerCaseMessage.includes('推荐') || 
        lowerCaseMessage.includes('建议') || 
        lowerCaseMessage.includes('什么活动') || 
        lowerCaseMessage.includes('有什么') || 
        lowerCaseMessage.includes('哪些活动') ||
        lowerCaseMessage.includes('活动有') ||
        (lowerCaseMessage.includes('喜欢') && lowerCaseMessage.includes('活动'));
    
    // 如果用户在询问推荐或者表达了兴趣，提供活动推荐
    if (askingForRecommendation || detectedInterests.length > 0) {
      // 如果没有检测到兴趣但在请求推荐
      if (detectedInterests.length === 0 && askingForRecommendation) {
        return `看起来你想了解校园活动推荐。请告诉我你感兴趣的领域，比如：
        
【文艺类】：音乐、舞蹈、表演等
【志愿服务类】：社区服务、敬老院慰问等
【科技类】：编程、人工智能、软件开发等
【体育类】：各种体育比赛、运动活动
【学术类】：讲座、论坛、研讨会等
【社团类】：各种学生社团活动

这样我可以根据你的兴趣提供更精准的活动推荐。`;      }
      
      // 基于兴趣进行推荐
      let response = '';
      
      if (detectedInterests.length === 1) {
        response = `根据你对${detectedInterests[0]}的兴趣，我向你推荐以下活动：\n\n`;
      } else {
        response = `根据你对${detectedInterests.join('、')}的兴趣，我向你推荐以下活动：\n\n`;
      }
      
      // 基于兴趣添加相关活动
      interface RecommendedActivity {
        name: string;
        desc: string;
        points: string;
      }
      
      let recommendedActivities: RecommendedActivity[] = [];
      
      for (const interest of detectedInterests) {
        switch (interest) {
          case '文艺':
            if ('文艺比赛' in knowledgeBase['积分活动']) {
              recommendedActivities.push({
                name: '校园歌唱比赛',
                desc: knowledgeBase['热门活动']['校园歌唱比赛'],
                points: knowledgeBase['积分活动']['文艺比赛']
              });
            }
            break;
          case '志愿服务':
            if ('志愿服务' in knowledgeBase['积分活动']) {
              recommendedActivities.push({
                name: '志愿者服务日',
                desc: knowledgeBase['热门活动']['志愿者服务日'],
                points: knowledgeBase['积分活动']['志愿服务']
              });
            }
            break;
          case '科技':
            if ('科技创新' in knowledgeBase['积分活动']) {
              recommendedActivities.push({
                name: '程序设计大赛',
                desc: knowledgeBase['热门活动']['程序设计大赛'],
                points: knowledgeBase['积分活动']['科技创新']
              });
            }
            break;
          case '体育':
            if ('体育比赛' in knowledgeBase['积分活动']) {
              recommendedActivities.push({
                name: '校园体育比赛',
                desc: '校内定期举办的各类体育赛事，包括篮球、足球、羽毛球等多种比赛项目',
                points: knowledgeBase['积分活动']['体育比赛']
              });
            }
            break;
          case '学术':
            if ('学术讲座' in knowledgeBase['积分活动']) {
              recommendedActivities.push({
                name: '学术论坛',
                desc: knowledgeBase['热门活动']['学术论坛'],
                points: knowledgeBase['积分活动']['学术讲座']
              });
            }
            break;
          case '社团':
            if ('社团活动' in knowledgeBase['积分活动']) {
              recommendedActivities.push({
                name: '社团文化节',
                desc: knowledgeBase['热门活动']['社团文化节'],
                points: knowledgeBase['积分活动']['社团活动']
              });
            }
            break;
        }
      }
      
      // 确保至少推荐一个活动，如果没有匹配到，提供一个通用推荐
      if (recommendedActivities.length === 0) {
        response = `虽然我没有找到完全匹配你兴趣的活动，但这里有一些可能你会喜欢的活动：\n\n`;
        
        if ('校园歌唱比赛' in knowledgeBase['热门活动']) {
          response += `【校园歌唱比赛】: ${knowledgeBase['热门活动']['校园歌唱比赛']}\n积分规则: ${knowledgeBase['积分活动']['文艺比赛']}\n\n`;
        }
        
        if ('程序设计大赛' in knowledgeBase['热门活动']) {
          response += `【程序设计大赛】: ${knowledgeBase['热门活动']['程序设计大赛']}\n积分规则: ${knowledgeBase['积分活动']['科技创新']}\n\n`;
        }
      } else {
        // 格式化推荐活动列表
        for (const activity of recommendedActivities) {
          response += `【${activity.name}】: ${activity.desc}\n积分规则: ${activity.points}\n\n`;
        }
      }
      
      response += '参与这些活动不仅能获得积分，还能丰富你的校园生活。如果你需要了解更多细节，可以具体咨询某个活动。';
      
      return response;
    }
    
    // 如果不是请求推荐，使用原有的响应逻辑
    return generateLocalResponse(userMessage);
  };

  // 尝试获取API KEY示例文本
  const getAPIKeyExample = () => {
    switch(cloudProvider) {
      case 'openai': return 'sk-xxxxxxxxxxxxxxxx';
      case 'kimi': return 'sk-xxxxxxxxxxxxxxxx';
      case 'moonshot': return 'sk-xxxxxxxxxxxxxxxx';
      case 'baidu': return 'API_KEY:SECRET_KEY';
      case 'zhipu': return 'xxxxxxxxxxxxxxxx';
      default: return 'YOUR_API_KEY';
    }
  };

  // 测试API连接
  const testAPIConnection = async () => {
    if (!apiKey) {
      message.error(`请先设置${getProviderName(cloudProvider)} API密钥`);
      return;
    }
    
    console.log(`测试${getProviderName(cloudProvider)}连接，密钥前几位: ${apiKey.substring(0, 5)}...`);
    message.loading({
      content: `正在测试${getProviderName(cloudProvider)}连接...`, 
      key: 'apiTest',
      duration: 0
    });
    
    try {
      const testPrompt = "你好，这是一条测试消息，请简短回复「你好，我已连接成功」";
      let response;
      
      console.log(`使用${cloudProvider}提供商测试连接`);
      switch(cloudProvider) {
        case 'openai':
          response = await callOpenAIApi(selectedModel, testPrompt);
          break;
        case 'kimi':
        case 'moonshot':
          response = await callKimiApi(selectedModel, testPrompt);
          break;
        case 'baidu':
          response = await callBaiduApi(selectedModel, testPrompt);
          break;
        case 'zhipu':
          response = await callZhipuApi(selectedModel, testPrompt);
          break;
      }
      
      console.log('API测试响应:', response);
      message.destroy('apiTest');
      
      if (response && !response.includes('错误') && !response.includes('失败')) {
        message.success({
          content: '连接成功！API工作正常',
          key: 'apiTest'
        });
        localStorage.setItem('lastTestedProvider', cloudProvider);
        localStorage.setItem('apiConnected', 'true');
        setServiceType('cloud'); // 确保切换到云服务
      } else {
        message.error({
          content: `连接失败: ${response}`,
          key: 'apiTest'
        });
      }
    } catch (error) {
      console.error('API连接测试失败:', error);
      message.destroy('apiTest');
      message.error({
        content: `连接测试失败: ${(error as Error).message}`,
        key: 'apiTest'
      });
    }
  };

  // 发送消息
  const sendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;
    
    // 添加用户消息
    const userMessage = inputValue.trim();
    setMessages(prev => [...prev, { text: userMessage, isUser: true }]);
    setInputValue('');
    setIsLoading(true);
    
    // 清除旧的对话历史，如果是一个新的对话
    if (messages.length <= 1) {
      setChatHistory([]);
    }
    
    console.log(`正在处理用户消息，服务类型: ${serviceType}, 提供商: ${cloudProvider}`);
    
    try {
      // 调用API获取回复
      const aiResponse = await callAIAPI(userMessage);
      setMessages(prev => [...prev, { text: aiResponse, isUser: false }]);
    } catch (error) {
      console.error('发送消息失败:', error);
      setMessages(prev => [...prev, { text: '抱歉，出现了一些问题，请稍后再试。', isUser: false }]);
    } finally {
      setIsLoading(false);
    }
  };

  // 点击按钮切换聊天窗口显示状态
  const toggleChat = () => {
    setIsChatOpen(!isChatOpen);
  };
  
  // 打开设置抽屉
  const openSettings = () => {
    setIsSettingsOpen(true);
  };

  // 关闭设置抽屉
  const closeSettings = () => {
    setIsSettingsOpen(false);
  };

  // 更改服务类型
  const handleServiceTypeChange = (e: any) => {
    const newType = e.target.value;
    setServiceType(newType);
    localStorage.setItem('aiServiceType', newType);
    
    // 如果切换到云端服务，但没有API密钥，提示用户
    if (newType === 'cloud' && !apiKey) {
      message.warning(`请设置${getProviderName(cloudProvider)} API密钥以使用云端服务`);
    } else if (newType === 'cloud' && apiKey) {
      // 如果有API密钥，自动测试连接
      setTimeout(() => {
        testAPIConnection();
      }, 500);
    }
    
    // 切换服务类型时，重置为默认模型
    if (newType === 'local') {
      setSelectedModel('deepseek-r1:7b');
    } else {
      setSelectedModel(cloudModels[cloudProvider as keyof typeof cloudModels][0].value);
    }
    localStorage.setItem('selectedAIModel', selectedModel);
  };

  // 更改API密钥
  const handleApiKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newKey = e.target.value;
    setApiKey(newKey);
    localStorage.setItem('aiApiKey', newKey);
  };
  
  // 更改云端提供商
  const handleProviderChange = (value: any) => {
    setCloudProvider(value);
    localStorage.setItem('cloudProvider', value);
    
    // 切换提供商时，更新为新提供商的默认模型
    const defaultModel = cloudModels[value as keyof typeof cloudModels][0].value;
    setSelectedModel(defaultModel);
    localStorage.setItem('selectedAIModel', defaultModel);
    
    message.info(`已切换至${getProviderName(value)}服务`);
    
    // 如果有API密钥，自动测试连接
    if (apiKey) {
      setTimeout(() => {
        testAPIConnection();
      }, 500);
    }
  };
  
  // 打开帮助指南
  const openHelpModal = () => {
    setIsHelpModalOpen(true);
  };
  
  // 关闭帮助指南
  const closeHelpModal = () => {
    setIsHelpModalOpen(false);
  };

  // 重置对话按钮的处理函数
  const handleResetChat = () => {
    setMessages([{ text: '你好！我是你的积分活动助手，有什么可以帮助你的吗？', isUser: false }]);
    setChatHistory([]);
    message.success('对话已重置');
  };

  // 如果不可见，不渲染任何内容
  if (!isVisible) return null;

  return (
    <>
      <div 
        ref={buttonRef}
        style={{
          position: 'fixed',
          top: `${position.y}px`,
          left: `${position.x}px`,
          width: '60px',
          height: '60px',
          backgroundColor: '#1890ff',
          borderRadius: '50%',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
          cursor: isDragging ? 'grabbing' : 'grab',
          zIndex: 1000,
          transition: isDragging ? 'none' : 'all 0.3s'
        }}
        onMouseDown={handleDragStart}
        onMouseOver={(e) => {
          if (!isDragging) {
            e.currentTarget.style.transform = 'scale(1.1)';
            e.currentTarget.style.boxShadow = '0 6px 16px rgba(0, 0, 0, 0.2)';
          }
        }}
        onMouseOut={(e) => {
          if (!isDragging) {
            e.currentTarget.style.transform = 'scale(1)';
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
          }
        }}
        onClick={toggleChat}
      >
        {isChatOpen ? (
          <CloseOutlined style={{ fontSize: '24px', color: '#fff' }} />
        ) : (
          <MessageOutlined style={{ fontSize: '24px', color: '#fff' }} />
        )}
      </div>

      {isChatOpen && typeof window !== 'undefined' && createPortal(
        <div 
          ref={chatWindowRef}
          style={{
            position: 'fixed',
            bottom: '100px',
            right: '30px',
            width: '350px',
            height: '500px',
            backgroundColor: '#fff',
            borderRadius: '12px',
            boxShadow: '0 6px 24px rgba(0, 0, 0, 0.12)',
            zIndex: 999,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden'
          }}
        >
          {/* 聊天窗口头部 */}
          <div style={{
            padding: '16px',
            borderBottom: '1px solid #f0f0f0',
            display: 'flex',
            alignItems: 'center',
            backgroundColor: '#1890ff',
            color: 'white'
          }}>
            <Avatar style={{ backgroundColor: '#fff', color: '#1890ff', marginRight: '8px' }}>
              <RobotOutlined />
            </Avatar>
            <div style={{ flex: 1 }}>
              <h3 style={{ margin: 0, fontSize: '16px' }}>积分活动助手</h3>
              <div style={{ fontSize: '12px' }}>
                {serviceType === 'local' ? '本地服务' : getProviderName(cloudProvider)}: 
                {serviceType === 'local' 
                  ? availableModels.find(model => model.value === selectedModel)?.label 
                  : cloudModels[cloudProvider as keyof typeof cloudModels]?.find(model => model.value === selectedModel)?.label || selectedModel}
              </div>
            </div>
            <Button 
              type="text" 
              icon={<SettingOutlined style={{ color: '#fff' }} />} 
              onClick={(e) => {
                e.stopPropagation();
                openSettings();
              }}
            />
          </div>
          
          {/* 聊天消息区域 */}
          <div style={{
            flex: 1,
            padding: '16px',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            backgroundColor: '#f5f5f5'
          }}>
            {messages.map((msg, index) => (
              <div 
                key={index}
                style={{
                  alignSelf: msg.isUser ? 'flex-end' : 'flex-start',
                  maxWidth: '80%',
                  padding: '10px 14px',
                  backgroundColor: msg.isUser ? '#1890ff' : '#fff',
                  color: msg.isUser ? '#fff' : '#333',
                  borderRadius: msg.isUser ? '18px 18px 0 18px' : '18px 18px 18px 0',
                  boxShadow: '0 2px 6px rgba(0, 0, 0, 0.05)',
                }}
              >
                {msg.text}
              </div>
            ))}
            
            {isLoading && (
              <div style={{
                alignSelf: 'flex-start',
                padding: '12px 16px',
                backgroundColor: '#fff',
                borderRadius: '18px 18px 18px 0',
                boxShadow: '0 2px 6px rgba(0, 0, 0, 0.05)',
              }}>
                <Spin size="small" />
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>
          
          {/* 聊天输入区域 */}
          <div style={{
            borderTop: '1px solid #f0f0f0',
            padding: '12px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <Input 
                value={inputValue}
                onChange={e => setInputValue(e.target.value)}
                onPressEnter={sendMessage}
                placeholder="输入你的问题..."
                disabled={isLoading}
                style={{ flex: 1 }}
                autoFocus
              />
              <Button 
                type="primary" 
                onClick={sendMessage}
                disabled={!inputValue.trim() || isLoading}
              >
                发送
              </Button>
            </div>
            
            <div style={{
              display: 'flex',
              justifyContent: 'flex-end'
            }}>
              <Button 
                type="text" 
                size="small" 
                onClick={handleResetChat}
              >
                重置对话
              </Button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* 设置抽屉 */}
      <Drawer
        title="聊天设置"
        placement="right"
        onClose={closeSettings}
        open={isSettingsOpen}
        width={350}
        extra={
          <Button 
            type="text" 
            icon={<QuestionCircleOutlined />} 
            onClick={(e) => {
              e.stopPropagation();
              openHelpModal();
            }}
          />
        }
      >
        <div style={{ marginBottom: '20px' }}>
          <h4 style={{ marginBottom: '8px' }}>选择服务类型</h4>
          <Radio.Group 
            value={serviceType} 
            onChange={handleServiceTypeChange}
            style={{ width: '100%' }}
          >
            <Radio.Button value="local">本地服务</Radio.Button>
            <Radio.Button value="cloud">云端服务</Radio.Button>
          </Radio.Group>
          <div style={{ marginTop: '8px', fontSize: '12px', color: '#999' }}>
            本地服务需要在本地运行Ollama，云端服务可以在任何环境运行
          </div>
        </div>

        {serviceType === 'local' ? (
          <div style={{ marginBottom: '20px' }}>
            <h4 style={{ marginBottom: '8px' }}>选择本地模型</h4>
            <Select
              style={{ width: '100%' }}
              value={selectedModel}
              onChange={value => {
                setSelectedModel(value);
                localStorage.setItem('selectedAIModel', value);
              }}
              options={availableModels}
            />
            <div style={{ marginTop: '8px', fontSize: '12px', color: '#999' }}>
              需要在本地安装并启动Ollama服务
            </div>
          </div>
        ) : (
          <>
            <div style={{ marginBottom: '20px' }}>
              <h4 style={{ marginBottom: '8px' }}>选择云服务提供商</h4>
              <Select
                style={{ width: '100%' }}
                value={cloudProvider}
                onChange={handleProviderChange}
                options={[
                  { value: 'openai', label: 'OpenAI' },
                  { value: 'kimi', label: 'Kimi' },
                  { value: 'moonshot', label: 'Moonshot' },
                  { value: 'baidu', label: '百度文心一言' },
                  { value: 'zhipu', label: '智谱 GLM' }
                ]}
              />
            </div>
            
            <div style={{ marginBottom: '20px' }}>
              <h4 style={{ marginBottom: '8px' }}>选择云端模型</h4>
              <Select
                style={{ width: '100%' }}
                value={selectedModel}
                onChange={value => {
                  setSelectedModel(value);
                  localStorage.setItem('selectedAIModel', value);
                }}
                options={getCurrentModelOptions()}
              />
            </div>
            
            <div style={{ marginBottom: '20px' }}>
              <h4 style={{ marginBottom: '8px', display: 'flex', alignItems: 'center' }}>
                {getProviderName(cloudProvider)} API密钥
                <Tooltip title="点击右上角的问号图标查看获取API密钥的方法">
                  <InfoCircleOutlined style={{ marginLeft: '8px', fontSize: '14px', color: '#1890ff' }} />
                </Tooltip>
              </h4>
              <Input.Password
                value={apiKey}
                onChange={handleApiKeyChange}
                placeholder={`请输入${getProviderName(cloudProvider)} API密钥，例如${getAPIKeyExample()}`}
                style={{ width: '100%' }}
              />
              <div style={{ marginTop: '8px', fontSize: '12px', color: '#999' }}>
                {cloudProvider === 'baidu' ? 
                  'API密钥格式为"API_KEY:SECRET_KEY"' : 
                  'API密钥仅保存在本地，不会上传到服务器'}
              </div>
              
              <Button 
                type="primary"
                size="small"
                onClick={testAPIConnection}
                style={{ marginTop: '8px' }}
                disabled={!apiKey}
              >
                测试连接
              </Button>
            </div>
          </>
        )}

        {serviceType === 'cloud' && cloudProvider === 'kimi' && (
          <div style={{ marginTop: '20px', padding: '10px', backgroundColor: '#f0f8ff', borderRadius: '8px' }}>
            <Typography.Text type="secondary" style={{ fontSize: '12px' }}>
              注意：Kimi API使用与OpenAI兼容的接口，但需要将baseURL设置为&quot;https://api.kimi.ai/v1&quot;。
              本组件已经自动完成了这些配置，您只需填入API密钥即可使用。
            </Typography.Text>
          </div>
        )}
      </Drawer>
      
      {/* API密钥获取帮助指南 */}
      <Modal
        title="如何获取API密钥"
        open={isHelpModalOpen}
        onCancel={closeHelpModal}
        footer={[
          <Button key="close" onClick={closeHelpModal}>
            关闭
          </Button>
        ]}
        width={600}
      >
        <Tabs defaultActiveKey="openai">
          <Tabs.TabPane tab="OpenAI" key="openai">
            <Typography.Paragraph>
              获取OpenAI API密钥的步骤：
            </Typography.Paragraph>
            <Typography.Paragraph>
              1. 访问 <Typography.Link href="https://platform.openai.com" target="_blank">https://platform.openai.com</Typography.Link>
            </Typography.Paragraph>
            <Typography.Paragraph>
              2. 登录您的OpenAI账户（如果没有账户，需要先注册）
            </Typography.Paragraph>
            <Typography.Paragraph>
              3. 点击右上角头像，选择&quot;View API keys&quot;
            </Typography.Paragraph>
            <Typography.Paragraph>
              4. 点击&quot;Create new secret key&quot;按钮创建新的API密钥
            </Typography.Paragraph>
            <Typography.Paragraph>
              5. 复制生成的密钥（注意：密钥只会显示一次，请务必保存）
            </Typography.Paragraph>
            <Typography.Paragraph>
              6. 将复制的密钥粘贴到设置面板的&quot;OpenAI API密钥&quot;输入框中
            </Typography.Paragraph>
            <Typography.Paragraph type="warning">
              注意：使用OpenAI API需要进行付费，详细的收费标准请参考OpenAI官方文档。
            </Typography.Paragraph>
          </Tabs.TabPane>
          
          <Tabs.TabPane tab="Kimi" key="kimi">
            <Typography.Paragraph>
              获取Kimi API密钥的步骤：
            </Typography.Paragraph>
            <Typography.Paragraph>
              1. 访问 <Typography.Link href="https://kimi.ai" target="_blank">https://kimi.ai</Typography.Link> 或 
              <Typography.Link href="https://platform.moonshot.cn/" target="_blank"> https://platform.moonshot.cn/</Typography.Link>
            </Typography.Paragraph>
            <Typography.Paragraph>
              2. 登录或注册Kimi账户
            </Typography.Paragraph>
            <Typography.Paragraph>
              3. 点击右上角头像，选择&quot;API Keys&quot;
            </Typography.Paragraph>
            <Typography.Paragraph>
              4. 点击&quot;创建API Key&quot;按钮
            </Typography.Paragraph>
            <Typography.Paragraph>
              5. 输入名称并创建Key（格式类似：sk-xxxxxxxxxxxxxxxx）
            </Typography.Paragraph>
            <Typography.Paragraph>
              6. 复制生成的API Key，将其粘贴到设置面板中
            </Typography.Paragraph>
            <Typography.Paragraph type="warning">
              注意：Kimi API密钥格式通常为&quot;sk-&quot;开头的字符串。请妥善保管您的API密钥，不要在公开场合分享。
            </Typography.Paragraph>
          </Tabs.TabPane>
          
          <Tabs.TabPane tab="Moonshot" key="moonshot">
            <Typography.Paragraph>
              获取Moonshot API密钥的步骤：
            </Typography.Paragraph>
            <Typography.Paragraph>
              1. 访问 <Typography.Link href="https://www.moonshot.cn" target="_blank">https://www.moonshot.cn</Typography.Link>
            </Typography.Paragraph>
            <Typography.Paragraph>
              2. 注册或登录Moonshot账户
            </Typography.Paragraph>
            <Typography.Paragraph>
              3. 进入API管理页面
            </Typography.Paragraph>
            <Typography.Paragraph>
              4. 点击创建API密钥按钮
            </Typography.Paragraph>
            <Typography.Paragraph>
              5. 复制生成的API密钥
            </Typography.Paragraph>
            <Typography.Paragraph>
              6. 将复制的密钥粘贴到设置面板的&quot;Moonshot API密钥&quot;输入框中
            </Typography.Paragraph>
          </Tabs.TabPane>
          
          <Tabs.TabPane tab="百度文心一言" key="baidu">
            <Typography.Paragraph>
              获取百度文心一言API密钥的步骤：
            </Typography.Paragraph>
            <Typography.Paragraph>
              1. 访问 <Typography.Link href="https://cloud.baidu.com/product/wenxinworkshop" target="_blank">百度智能云文心一言</Typography.Link>
            </Typography.Paragraph>
            <Typography.Paragraph>
              2. 注册或登录百度智能云账户
            </Typography.Paragraph>
            <Typography.Paragraph>
              3. 开通文心一言服务
            </Typography.Paragraph>
            <Typography.Paragraph>
              4. 进入控制台，找到&quot;应用接入&quot;选项
            </Typography.Paragraph>
            <Typography.Paragraph>
              5. 创建应用并获取API Key和Secret Key
            </Typography.Paragraph>
            <Typography.Paragraph>
              6. 将API Key和Secret Key按格式 &quot;API_KEY:SECRET_KEY&quot; 填入设置中
            </Typography.Paragraph>
            <Typography.Paragraph type="warning">
              注意：百度文心一言API密钥格式需要同时包含API Key和Secret Key，用冒号分隔
            </Typography.Paragraph>
          </Tabs.TabPane>
          
          <Tabs.TabPane tab="智谱GLM" key="zhipu">
            <Typography.Paragraph>
              获取智谱GLM API密钥的步骤：
            </Typography.Paragraph>
            <Typography.Paragraph>
              1. 访问 <Typography.Link href="https://open.bigmodel.cn" target="_blank">https://open.bigmodel.cn</Typography.Link>
            </Typography.Paragraph>
            <Typography.Paragraph>
              2. 注册或登录智谱AI账户
            </Typography.Paragraph>
            <Typography.Paragraph>
              3. 进入控制台
            </Typography.Paragraph>
            <Typography.Paragraph>
              4. 在&quot;API Key管理&quot;中创建新的API Key
            </Typography.Paragraph>
            <Typography.Paragraph>
              5. 复制生成的API Key
            </Typography.Paragraph>
            <Typography.Paragraph>
              6. 将复制的API Key粘贴到设置面板的&quot;智谱GLM API密钥&quot;输入框中
            </Typography.Paragraph>
          </Tabs.TabPane>
        </Tabs>
        
        <Divider />
        
        <Typography.Paragraph type="secondary">
          提示：大多数API服务都提供免费试用额度，但长期使用可能需要付费。请仔细阅读各服务提供商的计费规则和使用条款。
        </Typography.Paragraph>
      </Modal>
    </>
  );
};

export default FloatingAIButton; 
