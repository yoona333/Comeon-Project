"use client";

// // HomePage.tsx
import React, { useEffect } from 'react';
import styles from '../app/css/HomePage.module.css'; // 假设你使用CSS模块
import { useRouter } from 'next/navigation';
import AIAssistant from '../components/AIAssistant';

const HomePage: React.FC = () => {
  const router = useRouter();
  
  useEffect(() => {
    // 重定向到登录页面
    router.push('/login');
  }, [router]);
  
  // 同时渲染 AI 助手
  return (
    <div>
      <AIAssistant />
    </div>
  );
};

export default HomePage;