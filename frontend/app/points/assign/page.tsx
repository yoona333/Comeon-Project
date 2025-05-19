"use client";

import React, { useState, useEffect } from 'react';
import axios from 'axios';
// import Home from '../../homedaohan/page';
import withAuthentication from '../../api/jwt';
import styles from '../../css/add.module.css'; // 复用现有样式

interface User {
  id: number;
  username: string;
}

interface Activity {
  id: number;
  title: string;
}

const AssignPoints: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [formData, setFormData] = useState({
    user_id: '',
    activity_id: '',
    points: 0,
    description: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);

  useEffect(() => {
    fetchUsers();
    fetchActivities();
  }, []);

  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:3001/users', {
        headers: { 'x-access-token': token }
      });
      setUsers(response.data.data);
    } catch (error) {
      console.error('获取用户列表失败:', error);
    }
  };

  const fetchActivities = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:3001/activities', {
        headers: { 'x-access-token': token }
      });
      setActivities(response.data.data);
    } catch (error) {
      console.error('获取活动列表失败:', error);
    }
  };

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
      const response = await axios.post('http://localhost:3001/points/assign', formData, {
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
          user_id: '',
          activity_id: '',
          points: 0,
          description: '',
        });
        setTimeout(() => {
          setSuccess(false);
        }, 3000);
      } else {
        setError(response.data.message || '分配积分失败');
      }
    } catch (error: any) {
      console.error('分配积分时出错:', error);
      setError(error.response?.data?.message || '分配积分时发生错误');
    }
  };

  return (
    <div className={styles.container}>
      {/* <Home /> */}
      <div className={styles.content}>
        <h1>积分分配</h1>
        {success && <div className={styles.successMessage}>积分分配成功！</div>}
        {error && <div className={styles.errorMessage}>{error}</div>}
        
        <form onSubmit={handleSubmit} className={styles.form}>
          <select
            name="user_id"
            value={formData.user_id}
            onChange={handleChange}
            className={styles.inputField}
            required
          >
            <option value={``}>选择用户</option>
            {users.map(user => (
              <option key={user.id} value={user.id}>{user.username}</option>
            ))}
          </select>
          
          <select
            name="activity_id"
            value={formData.activity_id}
            onChange={handleChange}
            className={styles.inputField}
            required
          >
            <option value={``}>选择活动</option>
            {activities.map(activity => (
              <option key={activity.id} value={activity.id}>{activity.title}</option>
            ))}
          </select>
          
          <input
            type="number"
            name="points"
            placeholder="积分数量"
            value={formData.points}
            onChange={handleChange}
            className={styles.inputField}
            min="0"
            required
          />
          
          <textarea
            name="description"
            placeholder="积分说明"
            value={formData.description}
            onChange={handleChange}
            className={styles.textareaField}
          />
          
          <button type="submit" className={styles.submitButton}>
            分配积分
          </button>
        </form>
      </div>
    </div>
  );
};

export default withAuthentication(AssignPoints); 