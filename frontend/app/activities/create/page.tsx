"use client";

import React, { useState } from 'react';
import axios from 'axios';
import Sidebar from '../../components/ui/Sidebar'; // 引入Sidebar组件
import withAuthentication from '../../api/jwt'; // 复用现有认证组件
import styles from '../../css/add.module.css'; // 复用现有样式
import { useRouter } from 'next/navigation';

// 定义表单项接口
interface ActivityForm {
  title: string;
  description: string;
  date: string;
  location: string;
  points: number;
  club_id: number;
}

const CreateActivity: React.FC = () => {
  const [formData, setFormData] = useState<ActivityForm>({
    title: '',
    description: '',
    date: '',
    location: '',
    points: 0,
    club_id: 1, // 默认社团ID
  });
  
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);
  const router = useRouter();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prevState => ({
      ...prevState,
      [name]: name === 'points' ? parseInt(value) : value
    }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
  
    if (!token) {
      window.location.href = '/login';
      return;
    }
  
    try {
      const response = await axios.post('http://localhost:3001/activities', formData, {
        headers: {
          'Content-Type': 'application/json',
          'x-access-token': token
        }
      });
  
      if (response.data.success) {
        setSuccess(true);
        setError(null);
        // 重置表单
        setFormData({
          title: '',
          description: '',
          date: '',
          location: '',
          points: 0,
          club_id: 1,
        });
        setTimeout(() => {
          window.location.href = '/activities';
        }, 2000);
      } else {
        setError(response.data.message || '创建活动失败');
      }
    } catch (error: any) {
      console.error('创建活动时出错:', error);
      setError(error.response?.data?.message || '创建活动时发生错误');
    }
  };

  const handleLoginSuccess = (userData: { role: number }) => {
    const role = userData.role;
    
    if (role === 0) {
      router.push('/admin');
    } else if (role === 1 || role === 2) {
      router.push('/student');
    } else {
      router.push('/login'); // 角色不明确时返回登录页
    }
  };

  return (
    <div className={styles.container}>
      <Sidebar role="student" collapsed={false} />
      <div className={styles.content}>
        <h1>创建新活动</h1>
        {success && <div className={styles.successMessage}>活动创建成功！正在跳转...</div>}
        {error && <div className={styles.errorMessage}>{error}</div>}
        
        <form onSubmit={handleSubmit} className={styles.form}>
          <input
            type="text"
            name="title"
            placeholder="活动标题"
            value={formData.title}
            onChange={handleChange}
            className={styles.inputField}
            required
          />
          
          <textarea
            name="description"
            placeholder="活动描述"
            value={formData.description}
            onChange={handleChange}
            className={styles.textareaField}
            required
          />
          
          <input
            type="datetime-local"
            name="date"
            placeholder="活动日期时间"
            value={formData.date}
            onChange={handleChange}
            className={styles.inputField}
            required
          />
          
          <input
            type="text"
            name="location"
            placeholder="活动地点"
            value={formData.location}
            onChange={handleChange}
            className={styles.inputField}
            required
          />
          
          <input
            type="number"
            name="points"
            placeholder="活动积分"
            value={formData.points}
            onChange={handleChange}
            className={styles.inputField}
            min="0"
            required
          />
          
          <button type="submit" className={styles.submitButton}>
            创建活动
          </button>
        </form>
      </div>
    </div>
  );
};

export default withAuthentication(CreateActivity); 